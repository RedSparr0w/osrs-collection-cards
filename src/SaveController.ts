import { LOCAL_STORAGE_BASE_KEY } from "./Constants";

export type SaveState = {
  hand: string[]; // Array of task IDs in the player's hand
  // Add other game state properties as needed
};

export default class SaveController {
  private static SAVESTATE_KEY = `${LOCAL_STORAGE_BASE_KEY}:game_state`;
  private static SETTINGS_KEY = `${LOCAL_STORAGE_BASE_KEY}:game_settings`;
  private static CURRENT_USERNAME_KEY = `${LOCAL_STORAGE_BASE_KEY}:current_username`;
  private defaultState: SaveState = {
    hand: [],
    // Initialize other default state properties as needed
  }
  username: string | null = null;
  state: SaveState = this.defaultState;

  constructor() {}

  saveState(): void {
    if (!this.username) return;
    try {
      const serializedState = JSON.stringify(this.state);
      localStorage.setItem(`${SaveController.SAVESTATE_KEY}:${this.username}`, serializedState);
    } catch (error) {
      console.error('Error saving state:', error);
    }
  }

  loadState(): SaveState {
    if (!this.username) return this.defaultState;
    try {
      const serializedState = localStorage.getItem(`${SaveController.SAVESTATE_KEY}:${this.username}`);
      if (serializedState === null) return this.defaultState;
      this.state = { ...this.defaultState, ...JSON.parse(serializedState) as SaveState };
      return this.state;
    } catch (error) {
      console.error('Error loading state:', error);
      return this.state;
    }
  }
  
  clearState(): void {
    if (!this.username) return;
    try {
      localStorage.removeItem(`${SaveController.SAVESTATE_KEY}:${this.username}`);
    } catch (error) {
      console.error('Error clearing state:', error);
    }
  }

  getSettings(): any | null {
    if (!this.username) return null;
    try {
      const serializedSettings = localStorage.getItem(`${SaveController.SETTINGS_KEY}:${this.username}`);
      if (serializedSettings === null) return null;
      return JSON.parse(serializedSettings);
    } catch (error) {
      console.error('Error loading settings:', error);
      return null;
    }
  }

  saveSettings(settings: any): void {
    if (!this.username) return;
    try {
      const serializedSettings = JSON.stringify(settings);
      localStorage.setItem(`${SaveController.SETTINGS_KEY}:${this.username}`, serializedSettings);
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