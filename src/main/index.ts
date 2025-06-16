import { app, shell, BrowserWindow, ipcMain, globalShortcut, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { autoUpdater } from 'electron-updater'
import icon from '../../resources/icon.png?asset'
import { ConfigManager, HermesConfig } from './config'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { writeFile, readFile } from 'node:fs/promises'
import { spawn } from 'child_process'
import * as path from 'path'

class MainApp {
  private appFolder: string
  private uploadsFolder: string
  private config: ConfigManager
  private mainWindow: BrowserWindow | null = null

  constructor() {
    this.appFolder = app.getPath('userData')
    this.uploadsFolder = join(this.appFolder, 'uploads')
    this.config = new ConfigManager(this.appFolder, 'config.json')
    this.registerIpcHandlers()
  }

  private async initializeConfig(): Promise<void> {
    try {
      await this.config.init()
      console.log('Config initialized successfully')
    } catch (error) {
      console.error('Failed to initialize config:', error)
    }
  }

  private setupAutoUpdater(): void {
    // Configure auto updater
    autoUpdater.logger = console
    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true

    // Auto updater events
    autoUpdater.on('checking-for-update', () => {
      console.log('Checking for updates...')
    })

    autoUpdater.on('update-available', (info) => {
      console.log('Update available:', info)
      if (this.mainWindow) {
        this.mainWindow.webContents.send('update-available', info)
      }
    })

    autoUpdater.on('update-not-available', (info) => {
      console.log('Update not available:', info)
    })

    autoUpdater.on('download-progress', (progressObj) => {
      console.log(`Download progress: ${progressObj.percent}%`)
      if (this.mainWindow) {
        this.mainWindow.webContents.send('update-progress', progressObj)
      }
    })

    autoUpdater.on('update-downloaded', (info) => {
      console.log('Update downloaded:', info)
      if (this.mainWindow) {
        this.mainWindow.webContents.send('update-downloaded', info)
      }
    })

    autoUpdater.on('error', (error) => {
      console.error('Auto updater error:', error)
    })

    // Check for updates
    if (!is.dev) {
      setTimeout(() => {
        autoUpdater.checkForUpdates().catch(err => {
          console.error('Failed to check for updates:', err)
        })
      }, 3000) // Check after 3 seconds to ensure app is fully loaded
    }
  }

  private async createWindow(): Promise<void> {
    await this.initializeConfig()

    const windowWidth = this.config.get('windowWidth', 800)
    const windowHeight = this.config.get('windowHeight', 600)
    const fullscreen = this.config.get('fullscreen', false)

    this.mainWindow = new BrowserWindow({
      width: windowWidth,
      height: windowHeight,
      show: false,
      fullscreen,
      autoHideMenuBar: true,
      ...(process.platform === 'linux' ? { icon } : {}),
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: true,
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false
      }
    })

    this.mainWindow.on('ready-to-show', () => {
      this.mainWindow?.show()
    })

    this.mainWindow.webContents.setWindowOpenHandler((details) => {
      try {
        // Get config for chrome path and args
        const chromePath = this.config.get('chromeExecutablePath', '')
        const chromeArgsRaw = this.config.get('chromeArgs', '')
        const chromeArgs = chromeArgsRaw.split(' ').filter(Boolean)

        if (chromePath) {
          // Launch Chrome as a child process
          const child = spawn(chromePath, [...chromeArgs, details.url], { detached: true, stdio: 'ignore' })
          child.unref()
          child.on('error', (err) => {
            console.error('Failed to spawn Chrome:', err)
            shell.openExternal(details.url)
          })
          child.on('close', () => {
            if (this.mainWindow) {
              this.mainWindow.show()
              this.mainWindow.focus()
              this.mainWindow.setFullScreen(!!this.config.get('fullscreen', false))
            }
          })
        } else {
          // Fallback to default browser
          shell.openExternal(details.url)
        }
      } catch (error) {
        console.error('Error opening URL:', error)
        // Fallback to default browser if anything fails
        shell.openExternal(details.url)
      }
      return { action: 'deny' }
    })

    try {
      if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        await this.mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
      } else {
        await this.mainWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: '/' })
      }
    } catch (error) {
      console.error('Failed to load renderer:', error)
    }
  }

  private registerIpcHandlers(): void {
    ipcMain.on('ping', () => console.log('pong'))

    ipcMain.handle('save-config', async (_event, config: HermesConfig) => {
      try {
        if (!existsSync(this.appFolder)) {
          mkdirSync(this.appFolder, { recursive: true })
        }
        const configPath = join(this.appFolder, 'config.json')
        writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')
        return true
      } catch (error) {
        console.error('Failed to save config:', error)
        return false
      }
    })

    ipcMain.handle('get-config', async () => {
      try {
        await this.config.init()
        return this.config.getConfig()
      } catch (error) {
        console.error('Failed to get config:', error)
        return {}
      }
    })

    ipcMain.handle('save-image', async (_event, fileName: string, buffer: number[]) => {
      try {
        if (!existsSync(this.uploadsFolder)) {
          mkdirSync(this.uploadsFolder, { recursive: true })
        }
        const filePath = join(this.uploadsFolder, fileName)
        await writeFile(filePath, Buffer.from(buffer))
        return filePath
      } catch (error) {
        console.error('Failed to save image:', error)
        return ''
      }
    })

    ipcMain.handle('read-image-as-data-url', async (_event, filePath: string) => {
      try {
        if (!filePath || !existsSync(filePath)) {
          throw new Error(`File does not exist: ${filePath}`)
        }

        const ext = path.extname(filePath).slice(1)
        const data = await readFile(filePath)
        const base64 = data.toString('base64')
        const dataUrl = `data:image/${ext};base64,${base64}`
        return dataUrl
      } catch (error) {
        console.error('Failed to read image:', error)
        return ''
      }
    })

    ipcMain.handle('select-file', async (_event, options) => {
      try {
        const result = await dialog.showOpenDialog(options)
        if (result.canceled || !result.filePaths.length) return null
        return result.filePaths[0]
      } catch (error) {
        console.error('Failed to select file:', error)
        return null
      }
    })
  }

  private registerShortcuts(): void {
    globalShortcut.register('CommandOrControl+I', () => {
      try {
        const allWindows = BrowserWindow.getAllWindows()
        if (allWindows.length > 0) {
          allWindows[0].webContents.send('navigate-to-config')
        }
      } catch (error) {
        console.error('Error navigating to config:', error)
      }
    })
  }

  public async run(): Promise<void> {
    try {
      await app.whenReady()

      app.setLoginItemSettings({
        openAtLogin: true,
        path: app.getPath('exe'),
      })

      electronApp.setAppUserModelId('fr.polarisdev')

      app.on('browser-window-created', (_, window) => {
        optimizer.watchWindowShortcuts(window)
      })

      await this.createWindow()
      this.setupAutoUpdater()
      this.registerShortcuts()

      app.on('activate', async () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          await this.createWindow()
        }
      })

      app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
          app.quit()
        }
      })
    } catch (error) {
      console.error('Failed to start application:', error)
      app.quit()
    }
  }
}

new MainApp().run().catch(err => {
  console.error('Unhandled error in application:', err)
  app.quit()
})
