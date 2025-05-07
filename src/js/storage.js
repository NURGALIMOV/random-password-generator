/**
 * Module for managing password history and settings
 */
class PasswordStorage {
  constructor() {
    this.HISTORY_KEY = "password_history";
    this.SETTINGS_KEY = "password_settings";
    this.THEME_KEY = "theme";
    this.MAX_HISTORY = 50;
  }

  /**
   * Save password to history
   *
   * @param {string} password - Password to save
   * @returns {Promise<void>}
   */
  async savePassword(password) {
    try {
      const history = await this.getHistory();

      const isDuplicate = history.some((item) => item.password === password);

      if (!isDuplicate) {
        const newEntry = {
          id: this._generateId(),
          password,
          timestamp: Date.now(),
        };

        history.unshift(newEntry);

        if (history.length > this.MAX_HISTORY) {
          history.pop();
        }

        await chrome.storage.local.set({ [this.HISTORY_KEY]: history });
      }
    } catch (error) {
      console.error("Error saving password:", error);
    }
  }

  /**
   * Get password history
   *
   * @returns {Promise<Array>} Array of password history objects
   */
  async getHistory() {
    try {
      const data = await chrome.storage.local.get(this.HISTORY_KEY);
      return data[this.HISTORY_KEY] || [];
    } catch (error) {
      console.error("Error retrieving history:", error);
      return [];
    }
  }

  /**
   * Delete one password from history by ID
   *
   * @param {string} id - ID of password to delete
   * @returns {Promise<void>}
   */
  async deletePassword(id) {
    try {
      const history = await this.getHistory();
      const filteredHistory = history.filter((item) => item.id !== id);
      await chrome.storage.local.set({ [this.HISTORY_KEY]: filteredHistory });
    } catch (error) {
      console.error("Error deleting password:", error);
    }
  }

  /**
   * Clear all password history
   *
   * @returns {Promise<void>}
   */
  async clearHistory() {
    try {
      await chrome.storage.local.set({ [this.HISTORY_KEY]: [] });
    } catch (error) {
      console.error("Error clearing history:", error);
    }
  }

  /**
   * Save password generator settings
   *
   * @param {Object} settings - Settings to save
   * @returns {Promise<void>}
   */
  async saveSettings(settings) {
    try {
      await chrome.storage.local.set({ [this.SETTINGS_KEY]: settings });
    } catch (error) {
      console.error("Error saving settings:", error);
    }
  }

  /**
   * Get saved password generator settings
   *
   * @returns {Promise<Object>} Settings object
   */
  async getSettings() {
    try {
      const data = await chrome.storage.local.get(this.SETTINGS_KEY);
      return data[this.SETTINGS_KEY] || this._getDefaultSettings();
    } catch (error) {
      console.error("Error retrieving settings:", error);
      return this._getDefaultSettings();
    }
  }

  /**
   * Save theme preference
   * 
   * @param {string} theme - Theme to save ('light', 'dark', or 'system')
   * @returns {Promise<void>}
   */
  async saveTheme(theme) {
    try {
      await chrome.storage.local.set({ [this.THEME_KEY]: theme });
    } catch (error) {
      console.error("Error saving theme:", error);
    }
  }

  /**
   * Get saved theme preference
   * 
   * @returns {Promise<string>} Theme preference
   */
  async getTheme() {
    try {
      const data = await chrome.storage.local.get(this.THEME_KEY);
      return data[this.THEME_KEY] || 'system';
    } catch (error) {
      console.error("Error retrieving theme:", error);
      return 'system';
    }
  }

  /**
   * Generate unique ID
   *
   * @private
   * @returns {string} Unique ID
   */
  _generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  /**
   * Get default settings
   *
   * @private
   * @returns {Object} Default settings
   */
  _getDefaultSettings() {
    return {
      length: 16,
      lowercase: true,
      uppercase: true,
      numbers: true,
      special: true,
      excludeSimilar: false,
      excludeAmbiguous: false,
      minLength: 4,
      maxLength: 64
    };
  }
}

window.PasswordStorage = PasswordStorage;
