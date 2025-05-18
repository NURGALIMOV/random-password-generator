// themeStorage.js - theme management for password generator

const THEME_KEY = "theme";

export async function saveTheme(theme) {
  try {
    await chrome.storage.local.set({ [THEME_KEY]: theme });
  } catch (error) {
    console.error("Error saving theme:", error);
  }
}

export async function getTheme() {
  try {
    const data = await chrome.storage.local.get(THEME_KEY);
    return data[THEME_KEY] || "system";
  } catch (error) {
    console.error("Error retrieving theme:", error);
    return "system";
  }
}
