import { ElectronAPI } from '@electron-toolkit/preload'
import { HermesConfig } from '../main/config'

/**
 * Update information interface
 */
interface UpdateInfo {
  version: string;
  releaseDate?: string;
  [key: string]: any;
}

/**
 * Update progress information interface
 */
interface ProgressInfo {
  percent: number;
  bytesPerSecond?: number;
  total?: number;
  transferred?: number;
}

/**
 * File selection options interface
 */
interface FileSelectionOptions {
  title?: string;
  defaultPath?: string;
  buttonLabel?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
  properties?: Array<string>;
  message?: string;
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      /**
       * Save configuration to disk
       */
      saveConfig: (config: HermesConfig) => Promise<boolean>;

      /**
       * Get current configuration
       */
      getConfig: () => Promise<HermesConfig>;

      /**
       * Save an image to disk
       */
      saveImage: (fileName: string, buffer: number[]) => Promise<string>;

      /**
       * Read an image as a data URL
       */
      readImageAsDataUrl: (filePath: string) => Promise<string>;

      /**
       * Open a file selection dialog
       */
      selectFile: (options: FileSelectionOptions) => Promise<string | null>;

      /**
       * Register a callback for when an update is available
       */
      onUpdateAvailable: (callback: (info: UpdateInfo) => void) => void;

      /**
       * Register a callback for update download progress
       */
      onUpdateProgress: (callback: (progressObj: ProgressInfo) => void) => void;

      /**
       * Register a callback for when an update has been downloaded
       */
      onUpdateDownloaded: (callback: (info: UpdateInfo) => void) => void;

      /**
       * Clean up event listeners when they're no longer needed
       */
      removeUpdateListeners: () => void;
    }
  }
}
