import { app, shell, BrowserWindow, ipcMain, globalShortcut } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { autoUpdater } from 'electron-updater'
import icon from '../../resources/icon.png?asset'
import { ConfigManager } from "./config";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { spawn } from 'child_process';

class MainApp {
  private appFolder: string;
  private uploadsFolder: string;
  private config: ConfigManager;
  private mainWindow: BrowserWindow | null = null;

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

  private setupAutoUpdater() {
    // Configure auto updater
    autoUpdater.logger = console;
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    // Auto updater events
    autoUpdater.on('checking-for-update', () => {
      console.log('Checking for updates...');
    });

    autoUpdater.on('update-available', (info) => {
      console.log('Update available:', info);
      if (this.mainWindow) {
        this.mainWindow.webContents.send('update-available', info);
      }
    });

    autoUpdater.on('update-not-available', (info) => {
      console.log('Update not available:', info);
    });

    autoUpdater.on('download-progress', (progressObj) => {
      console.log(`Download progress: ${progressObj.percent}%`);
      if (this.mainWindow) {
        this.mainWindow.webContents.send('update-progress', progressObj);
      }
    });

    autoUpdater.on('update-downloaded', (info) => {
      console.log('Update downloaded:', info);
      if (this.mainWindow) {
        this.mainWindow.webContents.send('update-downloaded', info);
      }
    });

    autoUpdater.on('error', (error) => {
      console.error('Auto updater error:', error);
    });

    // Check for updates
    if (!is.dev) {
      setTimeout(() => {
        autoUpdater.checkForUpdates();
      }, 3000); // Check after 3 seconds to ensure app is fully loaded
    }
  }

  private createWindow(): void {
    this.initializeConfig();
    this.mainWindow = new BrowserWindow({
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

    this.mainWindow.on('ready-to-show', () => {
      this.mainWindow?.show();
    });

    this.mainWindow.webContents.setWindowOpenHandler((details) => {
      // Get config for chrome path and args
      const chromePath = this.config.get('chromeExecutablePath');
      const chromeArgsRaw = this.config.get('chromeArgs') || '';
      const chromeArgs = chromeArgsRaw.split(' ').filter(Boolean);
      if (chromePath) {
        // Launch Chrome as a child process
        const child = spawn(chromePath, [...chromeArgs, details.url], { detached: true, stdio: 'ignore' });
        child.unref();
        child.on('close', () => {
          if (this.mainWindow) {
            this.mainWindow.show();
            this.mainWindow.focus();
            this.mainWindow.setFullScreen(true);
          }
        });
      } else {
        // Fallback to default browser
        shell.openExternal(details.url);
      }
      return { action: 'deny' };
    });

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      this.mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
    } else {
      this.mainWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: '/' });
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
      app.setLoginItemSettings({
        openAtLogin: true,
        path: app.getPath('exe'),
      });
      electronApp.setAppUserModelId('fr.polarisdev');
      app.on('browser-window-created', (_, window) => {
        optimizer.watchWindowShortcuts(window);
      });
      this.createWindow();
      this.setupAutoUpdater();
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
