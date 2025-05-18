// settings.js - password generator settings management

const SETTINGS_KEY = "password_settings";

export async function saveSettings(settings) {
  try {
    await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
  } catch (error) {
    console.error("Error saving settings:", error);
  }
}

export async function getSettings() {
  try {
    const data = await chrome.storage.local.get(SETTINGS_KEY);
    const defaults = getDefaultSettings();
    return {
      ...defaults,
      ...data[SETTINGS_KEY],
      encryptionEnabled: data[SETTINGS_KEY]?.encryptionEnabled === true,
    };
  } catch (error) {
    console.error("Error retrieving settings:", error);
    return getDefaultSettings();
  }
}

export function getDefaultSettings() {
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
    encryptionEnabled: false,
    historyVisible: true,
    masterPasswordPreviouslySet: false,
    template: "",
  };
}
