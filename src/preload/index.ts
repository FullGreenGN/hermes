import {contextBridge, ipcRenderer} from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  saveConfig: (config: any) => ipcRenderer.invoke('save-config', config),
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveImage: (fileName: string, buffer: number[]) => ipcRenderer.invoke('save-image', fileName, buffer),
  readImageAsDataUrl: (filePath: string) => ipcRenderer.invoke('read-image-as-data-url', filePath),
  selectFile: (options: any) => ipcRenderer.invoke('select-file', options),
  // Auto update listeners
  onUpdateAvailable: (callback: (info: any) => void) => {
    ipcRenderer.on('update-available', (_event, info) => callback(info));
  },
  onUpdateProgress: (callback: (progressObj: any) => void) => {
    ipcRenderer.on('update-progress', (_event, progressObj) => callback(progressObj));
  },
  onUpdateDownloaded: (callback: (info: any) => void) => {
    ipcRenderer.on('update-downloaded', (_event, info) => callback(info));
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
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
