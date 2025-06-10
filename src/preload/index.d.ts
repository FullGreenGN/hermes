import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      saveConfig: (config: any) => Promise<any>;
      getConfig: () => Promise<any>;
      saveImage: (filePath: string, data: any) => Promise<string>;
      readImageAsDataUrl: (filePath: string) => Promise<string>;
    }
  }
}
