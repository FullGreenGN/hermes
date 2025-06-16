import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      saveConfig: (config: any) => Promise<any>;
      getConfig: () => Promise<any>;
      saveImage: (filePath: string, data: any) => Promise<string>;
      readImageAsDataUrl: (filePath: string) => Promise<string>;
      selectFile: (options: any) => Promise<string | null>;
      // Auto update listeners
      onUpdateAvailable: (callback: (info: any) => void) => void;
      onUpdateProgress: (callback: (progressObj: any) => void) => void;
      onUpdateDownloaded: (callback: (info: any) => void) => void;
    }
  }
}
