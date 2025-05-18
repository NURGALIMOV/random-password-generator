/**
 * Module for managing password history and settings
 */
import { generateId } from "../popup/helpers.js";
import { EncryptionService } from "./encryptionService.js";
import { HistoryEncryptionManager } from "./historyEncryptionManager.js";

/**
 * Класс для управления историей паролей и настройками
 */
class PasswordStorage {
  constructor() {
    this.HISTORY_KEY = "password_history";
    this.SETTINGS_KEY = "password_settings";
    this.THEME_KEY = "theme";
    this.LANGUAGE_KEY = "language_settings";
    this.MAX_HISTORY = 10000;
    this.ENCRYPTION_SERVICE_SALT_KEY = "encryption_salt";
    this.MASTER_PASSWORD_VERIFIER_KEY = "master_password_verifier";
    this.MASTER_PASSWORD_VERIFIER_TEXT = "master_password_ok";

    this.encryptionService = new EncryptionService(chrome.storage.local, this.ENCRYPTION_SERVICE_SALT_KEY);
    this.historyEncryptionManager = new HistoryEncryptionManager(chrome.storage.local, this.encryptionService);
  }

  /**
   * Сохраняет пароль в истории
   * @param {string} password - Пароль для сохранения
   * @param {string} [masterPassword] - Опциональный мастер-пароль для шифрования
   * @param {object} [options] - Дополнительные параметры для импорта
   * @param {number} [options.timestamp] - Временная метка для импортируемого пароля
   * @param {string[]} [options.tags] - Теги для импортируемого пароля
   * @returns {Promise<void>}
   */
  async savePassword(password, masterPassword, options = {}) {
    try {
      const settings = await this.getSettings();
      const encryptionEnabled = settings.encryptionEnabled === true;

      const rawHistoryData = await chrome.storage.local.get(this.HISTORY_KEY);
      let currentRawHistory = rawHistoryData[this.HISTORY_KEY] || [];

      // Check for duplicates by attempting to decrypt if necessary
      let isDuplicate = false;
      for (const item of currentRawHistory) {
        let itemPassword = null;
        if (item.isEncrypted && item.encryptedPassword && item.iv) {
          if (masterPassword) { // Only attempt decryption if MP is available
            try {
                itemPassword = await this.encryptionService.decryptData(item.encryptedPassword, item.iv, masterPassword);
            } catch (e) { /* ignore decryption error for duplicate check */ }
          }
          // If no MP or decryption fails, we can't compare this encrypted item to the new plaintext password.
          // It will be treated as not a duplicate in this path.
        } else if (!item.isEncrypted && typeof item.password === 'string') {
          itemPassword = item.password;
        }

        if (itemPassword === password) {
          isDuplicate = true;
          break;
        }
      }

      if (!isDuplicate) {
        const newEntry = {
          id: generateId(),
          timestamp: options.timestamp || Date.now(),
          isEncrypted: false,
          tags: options.tags || [],
        };

        if (encryptionEnabled && masterPassword) {
          const encrypted = await this.encryptionService.encryptData(password, masterPassword);
          if (encrypted && encrypted.cipherText && encrypted.iv) {
            newEntry.encryptedPassword = encrypted.cipherText;
            newEntry.iv = encrypted.iv;
            newEntry.isEncrypted = true;
          } else {
            console.error("Failed to encrypt password. Saving as plaintext.");
            newEntry.password = password; // Fallback to plaintext
            newEntry.isEncrypted = false;
          }
        } else {
          newEntry.password = password; // Plaintext if encryption not enabled or no master pass
          newEntry.isEncrypted = false;
        }

        currentRawHistory.unshift(newEntry);
        if (currentRawHistory.length > this.MAX_HISTORY) {
          currentRawHistory = currentRawHistory.slice(0, this.MAX_HISTORY);
        }
        await chrome.storage.local.set({ [this.HISTORY_KEY]: currentRawHistory });
      }
    } catch (error) {
      console.error("Error saving password:", error);
      // Consider re-throwing or specific error handling if needed by UI
    }
  }

  /**
   * Получает историю паролей
   * @param {string} [masterPassword] - Опциональный мастер-пароль для расшифровки
   * @//param {boolean} [rawForSave=false] - If true, returns history items with encrypted fields for saving (not used anymore)
   * @returns {Promise<Array<object>>} - Массив объектов истории
   */
  async getHistory(masterPassword) {
    try {
      const data = await chrome.storage.local.get(this.HISTORY_KEY);
      const history = data[this.HISTORY_KEY] || [];
      const processedHistory = [];

      for (const item of history) {
        const processedItem = { ...item }; 

        if (item.isEncrypted && item.encryptedPassword && item.iv) {
          if (masterPassword) {
            try {
                const decryptedPassword = await this.encryptionService.decryptData(
                item.encryptedPassword,
                item.iv,
                masterPassword
                );
                if (decryptedPassword !== null) {
                processedItem.password = decryptedPassword;
                processedItem.encryptionStatus = "decrypted";
                } else {
                // This case (decryptedPassword === null) suggests an issue with decryption logic itself or key.
                processedItem.password = "[Encrypted - Decryption Failed]";
                processedItem.decryptionError = true;
                processedItem.encryptionStatus = "decryption_failed";
                }
            } catch (decryptionError) {
                // Catching actual error from decryptData, e.g. bad MAC, wrong key
                console.warn(`Failed to decrypt history item ID: ${item.id} during getHistory.`, decryptionError.message);
                processedItem.password = "[Encrypted - Decryption Error]";
                processedItem.decryptionError = true;
                processedItem.encryptionStatus = "decryption_error";
            }
          } else {
            processedItem.password = "[Encrypted]"; 
            processedItem.encryptionStatus = "encrypted_no_mp";
          }
        } else if (!item.isEncrypted && typeof item.password === 'string') {
            processedItem.encryptionStatus = "plaintext";
        } else {
            // Catch-all for items that don't fit the expected structure (e.g. missing password and not encrypted)
            processedItem.password = "[Invalid Data]";
            processedItem.encryptionStatus = "invalid_data";
        }
        processedHistory.push(processedItem);
      }
      return processedHistory;
    } catch (error) {
      console.error("Error getting history:", error);
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
      const data = await chrome.storage.local.get(this.HISTORY_KEY);
      let currentRawHistory = data[this.HISTORY_KEY] || [];
      const filteredHistory = currentRawHistory.filter((item) => item.id !== id);
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
      const currentStoredSettings = await this.getSettings();
      const newSettingsToSave = {
          ...currentStoredSettings,
          ...settings,
          // Explicitly carry over masterPasswordPreviouslySet if not in incoming settings
          // or if it is, ensure it's a boolean.
          masterPasswordPreviouslySet: typeof settings.masterPasswordPreviouslySet === 'boolean' 
                                        ? settings.masterPasswordPreviouslySet 
                                        : currentStoredSettings.masterPasswordPreviouslySet
      };
      await chrome.storage.local.set({ [this.SETTINGS_KEY]: newSettingsToSave });
    } catch (error) {
      console.error("Error saving settings:", error);
    }
  }
  
  async updateSettings(settingsUpdate) {
      try {
          const currentSettings = await this.getSettings();
          const newSettings = { ...currentSettings, ...settingsUpdate };
          await this.saveSettings(newSettings); // Use the main saveSettings to ensure consistency
      } catch (error) { 
          console.error("Error updating settings subset:", error);
      }
  }

  /**
   * Получает сохранённые настройки генератора паролей
   * @returns {Promise<Object>} Объект настроек
   */
  async getSettings() {
    try {
      const data = await chrome.storage.local.get(this.SETTINGS_KEY);
      const defaults = this._getDefaultSettings();
      const storedSettings = data[this.SETTINGS_KEY] || {};
      const finalSettings = { 
          ...defaults, 
          ...storedSettings, 
          encryptionEnabled: storedSettings.encryptionEnabled === true,
          masterPasswordPreviouslySet: storedSettings.masterPasswordPreviouslySet === true,
          historyVisible: storedSettings.historyVisible !== false, // default true
          autoCopyToClipboard: storedSettings.autoCopyToClipboard === true,
          saveHistory: storedSettings.saveHistory !== false // default true
      };
      return finalSettings;
    } catch (error) {
      console.error("Error retrieving settings:", error);
      return this._getDefaultSettings();
    }
  }
  
  async getMasterPasswordPreviouslySet() {
      const settings = await this.getSettings();
      return settings.masterPasswordPreviouslySet;
  }

  async setMasterPasswordPreviouslySet(value) {
      // This should be called by MasterPasswordService or when MP is successfully set/removed.
      // It implies that the actual encryption/decryption of history has been handled.
      await this.updateSettings({ masterPasswordPreviouslySet: !!value });
  }
  
  async saveLanguage(lang) {
      try {
          await chrome.storage.local.set({ [this.LANGUAGE_KEY]: lang });
      } catch (error) {
          console.error("Error saving language:", error);
      }
  }

  async getLanguage() {
      try {
          const data = await chrome.storage.local.get(this.LANGUAGE_KEY);
          return data[this.LANGUAGE_KEY] || this._getDefaultSettings().language;
      } catch (error) {
          console.error("Error retrieving language:", error);
          return this._getDefaultSettings().language;
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
      return data[this.THEME_KEY] || this._getDefaultSettings().theme;
    } catch (error) {
      console.error("Error retrieving theme:", error);
      return this._getDefaultSettings().theme;
    }
  }

  /**
   * Получает настройки по умолчанию
   * @private
   * @returns {Object} Default settings
   */
  _getDefaultSettings() {
    // Return a new object each time to prevent modification of a shared default object
    return {
      length: 16,
      lowercase: true,
      uppercase: true,
      numbers: true,
      special: true,
      excludeSimilar: false,
      excludeAmbiguous: false,
      template: "",
      autoCopyToClipboard: false, // default false
      saveHistory: true, // default true
      encryptionEnabled: true,
      masterPasswordPreviouslySet: false,
      historyVisible: true,
      theme: "system", 
      language: "en" 
    };
  }

  // Delegated methods to HistoryEncryptionManager
  async encryptExistingHistory(masterPassword) {
    return this.historyEncryptionManager.encryptExistingHistory(masterPassword);
  }

  async reEncryptHistory(oldMasterPassword, newMasterPassword) {
    return this.historyEncryptionManager.reEncryptHistory(oldMasterPassword, newMasterPassword);
  }

  async decryptExistingHistory(masterPassword) {
    return this.historyEncryptionManager.decryptExistingHistory(masterPassword);
  }

  /**
   * Stores an encrypted verifier for the master password.
   * @param {string} masterPassword - The master password to set the verifier for.
   * @returns {Promise<boolean>} True if successful, false otherwise.
   */
  async setMasterPasswordVerifier(masterPassword) {
    if (!masterPassword) {
      console.error("setMasterPasswordVerifier: Master password cannot be empty.");
      return false;
    }
    try {
      const encryptedVerifier = await this.encryptionService.encryptData(
        this.MASTER_PASSWORD_VERIFIER_TEXT,
        masterPassword
      );
      if (encryptedVerifier && encryptedVerifier.cipherText && encryptedVerifier.iv) {
        await chrome.storage.local.set({ [this.MASTER_PASSWORD_VERIFIER_KEY]: encryptedVerifier });
        return true;
      } else {
        console.error("Failed to encrypt master password verifier.");
        return false;
      }
    } catch (error) {
      console.error("Error setting master password verifier:", error);
      return false;
    }
  }

  /**
   * Verifies the provided master password against the stored verifier.
   * @param {string} masterPassword - The master password to verify.
   * @returns {Promise<boolean>} True if the master password is correct, false otherwise.
   */
  async verifyMasterPassword(masterPassword) {
    if (!masterPassword) {
      return false;
    }
    try {
      const data = await chrome.storage.local.get(this.MASTER_PASSWORD_VERIFIER_KEY);
      const storedEncryptedVerifier = data[this.MASTER_PASSWORD_VERIFIER_KEY];

      if (!storedEncryptedVerifier || !storedEncryptedVerifier.cipherText || !storedEncryptedVerifier.iv) {
        // This case means a master password was likely never set, or verifier is corrupted/missing.
        // If masterPasswordPreviouslySet is true, this would be an anomaly.
        // console.warn("Master password verifier not found in storage. Has a master password been set?");
        // Depending on UX, this might be treated as "incorrect" or a special state.
        // For simple verification, if no verifier exists, it can't be verified.
        // However, if a master password was *previously* set, we should expect a verifier.
        // Let's check the 'masterPasswordPreviouslySet' flag from settings.
        const settings = await this.getSettings();
        if (settings.masterPasswordPreviouslySet) {
            console.warn("Master password verifier not found, but master password was previously set. This indicates a potential issue.");
            return false; // Treat as incorrect if MP was set but verifier is gone.
        } else {
            // No MP ever set, so technically, any password 'fails' verification against a non-existent one.
            // Or, this could mean it's the first time, and verification is not applicable yet.
            // For the purpose of "is this password correct for an *existing* setup", this is false.
            return false; 
        }
      }

      const decryptedVerifier = await this.encryptionService.decryptData(
        storedEncryptedVerifier.cipherText,
        storedEncryptedVerifier.iv,
        masterPassword
      );

      if (decryptedVerifier === null) {
        return false; // Decryption failed, likely wrong password
      }

      const isValid = decryptedVerifier === this.MASTER_PASSWORD_VERIFIER_TEXT;
      return isValid;

    } catch (error) {
      console.error("Error verifying master password:", error);
      return false; // Error during verification process
    }
  }

  /**
   * Adds a tag to a password entry.
   * @param {string} id - The ID of the password entry.
   * @param {string} tag - The tag to add.
   * @returns {Promise<boolean>} - True if successful, false otherwise.
   */
  async addTagToPassword(id, tag) {
    if (!tag || typeof tag !== "string" || tag.trim() === "") {
      return false;
    }
    try {
      const data = await chrome.storage.local.get(this.HISTORY_KEY);
      let currentRawHistory = data[this.HISTORY_KEY] || [];
      let entryUpdated = false;

      const updatedHistory = currentRawHistory.map((item) => {
        if (item.id === id) {
          if (!item.tags) {
            item.tags = [];
          }
          if (!item.tags.includes(tag.trim())) {
            item.tags.push(tag.trim());
            entryUpdated = true;
          }
        }
        return item;
      });

      if (entryUpdated) {
        await chrome.storage.local.set({ [this.HISTORY_KEY]: updatedHistory });
      }
      return entryUpdated;
    } catch (error) {
      console.error("Error adding tag to password:", error);
      return false;
    }
  }

  /**
   * Removes a tag from a password entry.
   * @param {string} id - The ID of the password entry.
   * @param {string} tag - The tag to remove.
   * @returns {Promise<boolean>} - True if successful, false otherwise.
   */
  async removeTagFromPassword(id, tag) {
    try {
      const data = await chrome.storage.local.get(this.HISTORY_KEY);
      let currentRawHistory = data[this.HISTORY_KEY] || [];
      let entryUpdated = false;

      const updatedHistory = currentRawHistory.map((item) => {
        if (item.id === id && item.tags && item.tags.includes(tag)) {
          item.tags = item.tags.filter((t) => t !== tag);
          entryUpdated = true;
        }
        return item;
      });

      if (entryUpdated) {
        await chrome.storage.local.set({ [this.HISTORY_KEY]: updatedHistory });
      }
      return entryUpdated;
    } catch (error) {
      console.error("Error removing tag from password:", error);
      return false;
    }
  }
}

export default PasswordStorage;
