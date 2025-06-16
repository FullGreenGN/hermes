import { promises as fs } from "node:fs";
import * as path from "node:path";

// Define a type for the configuration
export interface HermesConfig {
  buttons?: Array<{
    img: string;
    link: string;
    label: string;
  }>;
  backgroundImage?: string;
  fullscreen?: boolean;
  windowWidth?: number;
  windowHeight?: number;
  chromeExecutablePath?: string;
  chromeArgs?: string;
}

export class ConfigManager {
  private confDir: string;
  private confFile: string;
  private config: HermesConfig = {};

  constructor(confDir: string, confFile: string) {
    this.confDir = confDir;
    this.confFile = confFile;
  }

  /**
   * Initializes the config manager by loading the config file or creating it if missing.
   */
  async init(): Promise<void> {
    try {
      await this.ensureConfigDir();
      await this.loadConfig();
    } catch (error) {
      console.error('Failed to initialize config:', error);
      // Create default config if loading fails
      this.config = this.getDefaultConfig();
    }
  }

  /**
   * Returns the current config object.
   */
  getConfig(): HermesConfig {
    return this.config;
  }

  /**
   * Returns the full path to the config file.
   */
  private get configPath(): string {
    return path.join(this.confDir, this.confFile);
  }

  /**
   * Ensures the config directory exists.
   */
  private async ensureConfigDir(): Promise<void> {
    try {
      await fs.mkdir(this.confDir, { recursive: true });
    } catch (error) {
      // Directory may already exist
      console.log('Config directory already exists or cannot be created');
    }
  }

  /**
   * Returns default configuration values
   */
  private getDefaultConfig(): HermesConfig {
    return {
      buttons: [],
      fullscreen: false,
      windowWidth: 800,
      windowHeight: 600,
      chromeArgs: ''
    };
  }

  /**
   * Loads the config from file, or creates a new one if missing.
   */
  private async loadConfig(): Promise<void> {
    try {
      const data = await fs.readFile(this.configPath, "utf-8");
      this.config = JSON.parse(data);
    } catch (error: any) {
      // If file doesn't exist, create it with default config
      if (error.code === 'ENOENT') {
        this.config = this.getDefaultConfig();
        await this.saveConfig();
      } else {
        console.error('Error parsing config file:', error);
        throw error;
      }
    }
  }

  /**
   * Gets a value from the config.
   * @param key The configuration key to retrieve
   * @param defaultValue Optional default value if the key doesn't exist
   */
  get<K extends keyof HermesConfig>(key: K, defaultValue?: HermesConfig[K]): HermesConfig[K] {
    return this.config[key] !== undefined ? this.config[key] : defaultValue;
  }

  /**
   * Sets a value in the config and saves it.
   */
  async set<K extends keyof HermesConfig>(key: K, value: HermesConfig[K]): Promise<void> {
    this.config[key] = value;
    await this.saveConfig();
  }

  /**
   * Saves the current config to file.
   */
  private async saveConfig(): Promise<void> {
    try {
      await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2), "utf-8");
    } catch (error) {
      console.error('Failed to save config file:', error);
      throw error;
    }
  }
}
