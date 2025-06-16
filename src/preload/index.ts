import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { HermesConfig } from '../main/config'

/**
 * Interface for update information
 */
interface UpdateInfo {
  version: string;
  releaseDate?: string;
  [key: string]: any;
}

/**
 * Interface for update progress
 */
interface ProgressInfo {
  percent: number;
  bytesPerSecond?: number;
  total?: number;
  transferred?: number;
}

/**
 * Type definition for file selection options
 */
interface FileSelectionOptions {
  title?: string;
  defaultPath?: string;
  buttonLabel?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
  properties?: Array<string>;
  message?: string;
}

// Custom APIs for renderer
const api = {
  /**
   * Save configuration to disk
   */
  saveConfig: (config: HermesConfig): Promise<boolean> =>
    ipcRenderer.invoke('save-config', config),

  /**
   * Get current configuration
   */
  getConfig: (): Promise<HermesConfig> =>
    ipcRenderer.invoke('get-config'),

  /**
   * Save an image to disk
   */
  saveImage: (fileName: string, buffer: number[]): Promise<string> =>
    ipcRenderer.invoke('save-image', fileName, buffer),

  /**
   * Read an image as a data URL
   */
  readImageAsDataUrl: (filePath: string): Promise<string> =>
    ipcRenderer.invoke('read-image-as-data-url', filePath),

  /**
   * Open a file selection dialog
   */
  selectFile: (options: FileSelectionOptions): Promise<string | null> =>
    ipcRenderer.invoke('select-file', options),

  // Auto update listeners
  /**
   * Register a callback for when an update is available
   */
  onUpdateAvailable: (callback: (info: UpdateInfo) => void): void => {
    ipcRenderer.on('update-available', (_event, info) => callback(info));
  },

  /**
   * Register a callback for update download progress
   */
  onUpdateProgress: (callback: (progressObj: ProgressInfo) => void): void => {
    ipcRenderer.on('update-progress', (_event, progressObj) => callback(progressObj));
  },

  /**
   * Register a callback for when an update has been downloaded
   */
  onUpdateDownloaded: (callback: (info: UpdateInfo) => void): void => {
    ipcRenderer.on('update-downloaded', (_event, info) => callback(info));
  },

  /**
   * Clean up event listeners when they're no longer needed
   */
  removeUpdateListeners: (): void => {
    ipcRenderer.removeAllListeners('update-available');
    ipcRenderer.removeAllListeners('update-progress');
    ipcRenderer.removeAllListeners('update-downloaded');
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error('Failed to expose API to renderer process:', error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
