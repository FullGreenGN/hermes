import { promises as fs } from "node:fs";
import * as path from "node:path";

export class ConfigManager {
  private confDir: string;
  private confFile: string;
  private config: Record<string, any> = {};

  constructor(confDir: string, confFile: string) {
    this.confDir = confDir;
    this.confFile = confFile;
  }

  /**
   * Initializes the config manager by loading the config file or creating it if missing.
   */
  async init(): Promise<void> {
    await this.ensureConfigDir();
    await this.loadConfig();
  }

  /**
   * Returns the current config object.
   */
  getConfig(): Record<string, any> {
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
    }
  }

  /**
   * Loads the config from file, or creates a new one if missing.
   */
  private async loadConfig(): Promise<void> {
    try {
      const data = await fs.readFile(this.configPath, "utf-8");
      this.config = JSON.parse(data);
    } catch (error: any) {
      // If file doesn't exist, create it
      if (error.code === 'ENOENT') {
        await this.saveConfig();
      } else {
        throw error;
      }
    }
  }

  /**
   * Gets a value from the config.
   */
  get(key: string): any {
    return this.config[key];
  }

  /**
   * Sets a value in the config and saves it.
   */
  async set(key: string, value: any): Promise<void> {
    this.config[key] = value;
    await this.saveConfig();
  }

  /**
   * Saves the current config to file.
   */
  private async saveConfig(): Promise<void> {
    await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2), "utf-8");
  }
}
