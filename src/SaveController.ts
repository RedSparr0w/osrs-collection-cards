import { LOCAL_STORAGE_BASE_KEY } from "./Constants";
import GameManager from "./GameManager";
import { formatUsername } from "./helpers";

export type SaveState = {
  hand: string[]; // Array of task IDs in the player's hand
  completedTaskIds: string[];
  completionDetectionInitialized: boolean;
  // Add other game state properties as needed
};

export type Settings = {
  background: string;
};

export default class SaveController {
  private static SAVESTATE_KEY = `${LOCAL_STORAGE_BASE_KEY}:game_state`;
  private static SETTINGS_KEY = `${LOCAL_STORAGE_BASE_KEY}:game_settings`;
  private static CURRENT_USERNAME_KEY = `${LOCAL_STORAGE_BASE_KEY}:current_username`;
  private gameManager: GameManager;
  private defaultState: SaveState = {
    hand: [],
    completedTaskIds: [],
    completionDetectionInitialized: false,
    // Initialize other default state properties as needed
  }
  username: string | null = null;
  state: SaveState = this.defaultState;

  constructor(gameManager: GameManager) {
    this.gameManager = gameManager;
  }

  saveState(): void {
    if (!this.username) return;
    try {
      this.state.hand = this.gameManager.getHand().map(task => task.id);
      this.state.completedTaskIds = this.gameManager.taskManager.getCompletedTasks().map(task => task.id);
      const serializedState = JSON.stringify(this.state);
      localStorage.setItem(`${SaveController.SAVESTATE_KEY}:${formatUsername(this.username)}`, serializedState);
    } catch (error) {
      console.error('Error saving state:', error);
    }
  }

  loadState(): SaveState {
    if (!this.username) return this.defaultState;
    try {
      const serializedState = localStorage.getItem(`${SaveController.SAVESTATE_KEY}:${formatUsername(this.username)}`);
      if (serializedState === null) return this.defaultState;
      this.state = { ...this.defaultState, ...JSON.parse(serializedState) as SaveState };
      return this.state;
    } catch (error) {
      console.error('Error loading state:', error);
      return this.state;
    }
  }

  setCompletionDetectionInitialized(value: boolean): void {
    this.state.completionDetectionInitialized = value;
  }
  
  deleteProfile(): void {
    if (!this.username) return;
    try {
      localStorage.removeItem(`${SaveController.SAVESTATE_KEY}:${formatUsername(this.username)}`);
      localStorage.removeItem(`${SaveController.SETTINGS_KEY}:${formatUsername(this.username)}`);
      localStorage.removeItem(`${SaveController.CURRENT_USERNAME_KEY}`);
    } catch (error) {
      console.error('Error deleting profile:', error);
    }
  }

  getSettings(): Settings {
    const defaultSettings: Settings = {
      background: './images/backgrounds/Yama.png',
    };
    if (!this.username) return defaultSettings;
    try {
      const serializedSettings = localStorage.getItem(`${SaveController.SETTINGS_KEY}:${formatUsername(this.username)}`);
      if (serializedSettings === null) return defaultSettings;
      return JSON.parse(serializedSettings) as Settings;
    } catch (error) {
      console.error('Error loading settings:', error);
      return defaultSettings;
    }
  }

  saveSettings(settings: Partial<Settings>): void {
    if (!this.username) return;
    try {
      const currentSettings = this.getSettings() || {};
      const mergedSettings = { ...currentSettings, ...settings };
      const serializedSettings = JSON.stringify(mergedSettings);
      localStorage.setItem(`${SaveController.SETTINGS_KEY}:${formatUsername(this.username)}`, serializedSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }

  setCurrentUsername(username: string): void {
    try {
      this.username = username;
      localStorage.setItem(SaveController.CURRENT_USERNAME_KEY, username);
    } catch (error) {
      console.error('Error setting current username:', error);
    }
  }

  getCurrentUsername(): string | null {
    if (this.username) return this.username;
    try {
      this.username = localStorage.getItem(SaveController.CURRENT_USERNAME_KEY);
      return this.username;
    } catch (error) {
      console.error('Error getting current username:', error);
      return null;
    }
  }
}