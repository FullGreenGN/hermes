import { app, shell, BrowserWindow, ipcMain, globalShortcut } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { ConfigManager } from "./config";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { spawn } from 'child_process';

class MainApp {
  private appFolder: string;
  private uploadsFolder: string;
  private config: ConfigManager;

  constructor() {
    this.appFolder = app.getPath('userData');
    this.uploadsFolder = join(this.appFolder, 'uploads');
    this.config = new ConfigManager(this.appFolder, 'config.json');
    this.registerIpcHandlers();
  }

  private async initializeConfig() {
    try {
      await this.config.init();
      console.log('Config initialized:', this.config.getConfig());
    } catch (error) {
      console.error('Failed to initialize config:', error);
    }
  }

  private createWindow(): void {
    this.initializeConfig();
    const mainWindow = new BrowserWindow({
      width: this.config.get('windowWidth'),
      height: this.config.get('windowHeight'),
      show: false,
      fullscreen: this.config.get('fullscreen'),
      autoHideMenuBar: true,
      ...(process.platform === 'linux' ? { icon } : {}),
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: true,
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false
      }
    });

    mainWindow.on('ready-to-show', () => {
      mainWindow.show();
    });

    mainWindow.webContents.setWindowOpenHandler((details) => {
      // Get config for chrome path and args
      const chromePath = this.config.get('chromeExecutablePath');
      const chromeArgsRaw = this.config.get('chromeArgs') || '';
      const chromeArgs = chromeArgsRaw.split(' ').filter(Boolean);
      if (chromePath) {
        // Launch Chrome as a child process
        const child = spawn(chromePath, [...chromeArgs, details.url], { detached: true, stdio: 'ignore' });
        child.unref();
        child.on('close', () => {
          mainWindow.show();
          mainWindow.focus();
          mainWindow.setFullScreen(true);
        });
      } else {
        // Fallback to default browser
        shell.openExternal(details.url);
      }
      return { action: 'deny' };
    });

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
    } else {
      mainWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: '/' });
    }
  }

  private registerIpcHandlers() {
    ipcMain.on('ping', () => console.log('pong'));
    ipcMain.on('', () => null);
    ipcMain.handle('save-config', async (_event, config) => {
      if (!existsSync(this.appFolder)) {
        mkdirSync(this.appFolder, { recursive: true });
      }
      const configPath = join(this.appFolder, 'config.json');
      writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
      return true;
    });
    ipcMain.handle('get-config', async () => {
      await this.config.init();
      return this.config.getConfig();
    });
    ipcMain.handle('save-image', async (_event, fileName: string, buffer: number[]) => {
      if (!existsSync(this.uploadsFolder )) {
        mkdirSync(this.uploadsFolder, { recursive: true });
      }
      const filePath = join(this.uploadsFolder, fileName);
      await writeFile(filePath, Buffer.from(buffer));
      return filePath;
    });
    ipcMain.handle('read-image-as-data-url', async (_event, filePath: string) => {
      try {
        const fs = await import('fs/promises');
        const path = await import('path');
        const ext = path.extname(filePath).slice(1);
        const data = await fs.readFile(filePath);
        const base64 = data.toString('base64');
        const dataUrl = `data:image/${ext};base64,${base64}`;
        return dataUrl;
      } catch (e) {
        return '';
      }
    });
    ipcMain.handle('select-file', async (_event, options) => {
      const { dialog } = require('electron');
      const result = await dialog.showOpenDialog(options);
      if (result.canceled || !result.filePaths.length) return null;
      return result.filePaths[0];
    });
  }

  private registerShortcuts() {
    globalShortcut.register('CommandOrControl+I', () => {
      const allWindows = BrowserWindow.getAllWindows();
      if (allWindows.length > 0) {
        allWindows[0].webContents.send('navigate-to-config');
      }
    })
  }

  public run() {
    app.whenReady().then(() => {
      electronApp.setAppUserModelId('com.electron');
      app.on('browser-window-created', (_, window) => {
        optimizer.watchWindowShortcuts(window);
      });
      this.createWindow();
      this.registerShortcuts();
      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) this.createWindow();
      });
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });
  }
}

new MainApp().run();
