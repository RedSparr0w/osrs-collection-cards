export default class SaveController {
  private static SAVESTATE_STORAGE_KEY = 'game-state';
  private static SETTINGS_STORAGE_KEY = 'game-settings';
  private static CURRENT_USERNAME_KEY = 'current-username';

  constructor() {}

  saveState(username: string, state: any): void {
    try {
      const serializedState = JSON.stringify(state);
      localStorage.setItem(`${SaveController.SAVESTATE_STORAGE_KEY}:${username}`, serializedState);
    } catch (error) {
      console.error('Error saving state:', error);
    }
  }

  loadState(username: string): any | null {
    try {
      const serializedState = localStorage.getItem(`${SaveController.SAVESTATE_STORAGE_KEY}:${username}`);
      if (serializedState === null) return null;
      return JSON.parse(serializedState);
    } catch (error) {
      console.error('Error loading state:', error);
      return null;
    }
  }
  
  clearState(username: string): void {
    try {
      localStorage.removeItem(`${SaveController.SAVESTATE_STORAGE_KEY}:${username}`);
    } catch (error) {
      console.error('Error clearing state:', error);
    }
  }

  getSettings(username: string): any | null {
    try {
      const serializedSettings = localStorage.getItem(`${SaveController.SETTINGS_STORAGE_KEY}:${username}`);
      if (serializedSettings === null) return null;
      return JSON.parse(serializedSettings);
    } catch (error) {
      console.error('Error loading settings:', error);
      return null;
    }
  }

  saveSettings(username: string, settings: any): void {
    try {
      const serializedSettings = JSON.stringify(settings);
      localStorage.setItem(`${SaveController.SETTINGS_STORAGE_KEY}:${username}`, serializedSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }

  setCurrentUsername(username: string): void {
    try {
      localStorage.setItem(SaveController.CURRENT_USERNAME_KEY, username);
    } catch (error) {
      console.error('Error setting current username:', error);
    }
  }

  getCurrentUsername(): string | null {
    try {
      return localStorage.getItem(SaveController.CURRENT_USERNAME_KEY);
    } catch (error) {
      console.error('Error getting current username:', error);
      return null;
    }
  }
}