/**
 * Module for managing password history and settings
 */
import { generateId } from "../popup/helpers.js";

/**
 * Класс для управления историей паролей и настройками
 */
class PasswordStorage {
  constructor() {
    this.HISTORY_KEY = "password_history";
    this.SETTINGS_KEY = "password_settings";
    this.THEME_KEY = "theme";
    this.MAX_HISTORY = 50;
  }

  /**
   * Сохраняет пароль в истории
   * @param {string} password - Пароль для сохранения
   * @returns {Promise<void>}
   */
  async savePassword(password) {
    try {
      const history = await this.getHistory();

      const isDuplicate = history.some((item) => item.password === password);

      if (!isDuplicate) {
        const newEntry = {
          id: generateId(),
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
   * Получает историю паролей
   * @returns {Promise<Array>} Массив объектов истории
   */
  async getHistory() {
    try {
      const data = await chrome.storage.local.get(this.HISTORY_KEY);
      let history = data[this.HISTORY_KEY] || [];
      let changed = false;
      history = history.map(item => {
        if (!item.id) {
          changed = true;
          return { ...item, id: generateId() };
        }
        return item;
      });
      if (changed) {
        await chrome.storage.local.set({ [this.HISTORY_KEY]: history });
      }
      return history;
    } catch (error) {
      console.error("Error retrieving history:", error);
      return [];
    }
  }

  /**
   * Удаляет пароль из истории по ID
   * @param {string} id - ID пароля
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
   * Очищает всю историю паролей
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
   * Сохраняет настройки генератора паролей
   * @param {Object} settings - Настройки
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
   * Получает сохранённые настройки генератора паролей
   * @returns {Promise<Object>} Объект настроек
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
   * Сохраняет тему
   * @param {string} theme - Тема ('light', 'dark', 'system')
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
   * Получает сохранённую тему
   * @returns {Promise<string>} Тема
   */
  async getTheme() {
    try {
      const data = await chrome.storage.local.get(this.THEME_KEY);
      return data[this.THEME_KEY] || "system";
    } catch (error) {
      console.error("Error retrieving theme:", error);
      return "system";
    }
  }

  /**
   * Получает настройки по умолчанию
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
      maxLength: 64,
    };
  }
}

export default PasswordStorage;
