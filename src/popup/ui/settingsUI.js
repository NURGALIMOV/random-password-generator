import { t } from "../i18n.js";
import { handleThemeChange } from "../theme.js"; // For theme changes
import PasswordStorage from "../../js/storage.js"; // Needed for handleThemeChange

// DOM Elements
let themeOptions;
let enableEncryptionToggle; // Added encryption toggle
// Add language selector elements if they are part of general settings in future
// let languageSelector;

// Callback for when a setting that needs to be saved globally is changed
// let onSettingsChanged = null; // Not strictly needed if theme saves itself

// PasswordStorage instance - needed by handleThemeChange
// This is a bit awkward. Ideally, handleThemeChange wouldn't directly interact with storage,
// or storage interaction would be passed as a callback to it.
// For now, to match existing handleThemeChange signature, we'll instantiate it here.
// This implies settingsUI is somewhat coupled to how themes are stored.
let passwordStorage = null; 

function getElements() {
  themeOptions = document.querySelectorAll(".theme-options-row .theme-option");
  enableEncryptionToggle = document.getElementById("enableEncryptionToggle"); // Get toggle
  // languageSelector = document.getElementById("languageSelector");
}

function setupEventListeners() {
  if (themeOptions) {
    themeOptions.forEach(option => {
      option.addEventListener("click", async () => {
        if (!passwordStorage) passwordStorage = new PasswordStorage();
        // handleThemeChange expects the clicked option, storage, currentMasterPassword (null if not relevant), and all themeOptions
        // For theme changes from UI, currentMasterPassword isn't directly relevant for the theme logic itself.
        await handleThemeChange(option.dataset.theme, passwordStorage, null, themeOptions);
        // Theme changes are saved by handleThemeChange itself, so no need to call a general onSettingsChanged callback for this.
      });
    });
  }

  // if (languageSelector) {
  //   languageSelector.addEventListener("change", async (event) => {
  //     const newLang = event.target.value;
  //     // Logic to set language (e.g., calling setLang from i18n.js)
  //     // Logic to save language preference (e.g., via onSettingsChanged or directly)
  //     // May need to call localizeAll() from popup.js or pass it as a callback.
  //     if (onSettingsChanged) onSettingsChanged(); 
  //   });
  // }
}

export function initSettingsUI(storageInstance, initialSettings = {}, settingsChangedCallback) {
  getElements();
  // onSettingsChanged = settingsChangedCallback; // Store callback if general settings need it
  
  if(storageInstance) {
    passwordStorage = storageInstance; // Use the instance from popup.js
  } else {
    // Fallback, though ideally storageInstance is always provided
    passwordStorage = new PasswordStorage(); 
    console.warn("PasswordStorage instance not provided to initSettingsUI, creating new one.")
  }

  // Initialize UI elements based on initialSettings if needed
  // For themes, the main `initializeTheme` in popup.js handles initial load.
  // This module mainly handles user interactions for changing themes.
  // If language selector were present:
  // if (languageSelector && initialSettings.language) {
  //   languageSelector.value = initialSettings.language;
  // }

  setupEventListeners();
}

export function getEnableEncryptionToggleState() {
  if (!enableEncryptionToggle) getElements(); // Ensure elements are loaded
  return enableEncryptionToggle ? enableEncryptionToggle.checked : false;
}

export function updateEnableEncryptionToggle(isEnabled) {
  if (!enableEncryptionToggle) getElements(); // Ensure elements are loaded
  if (enableEncryptionToggle) enableEncryptionToggle.checked = isEnabled;
}

// No getSettings function needed from this module if settings like theme save themselves directly. 