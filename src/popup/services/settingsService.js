// src/popup/services/settingsService.js

let _passwordStorage;
let _MasterPasswordService; // For clearing in-memory MP on encryption disable
let _uiStateProviders; // e.g., { getGenerationOptions, getMnemonicSettings, getEnableEncryptionToggleState }
let _uiUpdaters; // e.g., { updatePasswordGenerationUI, updateEnableEncryptionToggle, showToast, updateMasterPasswordVisibilityState }
let _t;

export function initSettingsService(dependencies) {
    _passwordStorage = dependencies.passwordStorage;
    _MasterPasswordService = dependencies.MasterPasswordService;
    _uiStateProviders = dependencies.uiStateProviders;
    _uiUpdaters = dependencies.uiUpdaters;
    _t = dependencies.t;
}

export async function loadSettingsAndApply() {
    const settings = await _passwordStorage.getSettings() || {}; // Ensure defaults if settings are empty
    
    let generationOptions = settings.generationOptions || {};
    const mnemonicSettings = settings.mnemonic || {};
    const encryptionEnabled = settings.encryptionEnabled || false;

    // Apply default character types if they are not set (e.g., first run)
    const defaultCharTypes = {
        lowercase: true,
        uppercase: true,
        numbers: true,
        special: true // Changed from false to true for default
    };

    let applyDefaultGenerationOptions = false;
    if (Object.keys(generationOptions).length === 0) { // If generationOptions is completely empty
        applyDefaultGenerationOptions = true;
    } else {
        // Or if any of the core char type flags are missing (robustness for partial old settings)
        if (generationOptions.lowercase === undefined || 
            generationOptions.uppercase === undefined || 
            generationOptions.numbers === undefined || 
            generationOptions.special === undefined) {
            applyDefaultGenerationOptions = true;
        }
    }

    if (applyDefaultGenerationOptions) {
        generationOptions = { ...defaultCharTypes, ...generationOptions }; // Defaults first, then existing non-char-type settings
        // Ensure length and other non-char-type defaults are also considered if generationOptions was empty
        if (generationOptions.length === undefined) generationOptions.length = 16;
        if (generationOptions.excludeSimilar === undefined) generationOptions.excludeSimilar = false;
        if (generationOptions.excludeAmbiguous === undefined) generationOptions.excludeAmbiguous = false;
        if (generationOptions.template === undefined) generationOptions.template = "";
        if (generationOptions.enablePopularTemplates === undefined) generationOptions.enablePopularTemplates = false;
    }

    _uiUpdaters.updatePasswordGenerationUI(generationOptions);
    if (_uiUpdaters.updateMnemonicUI) { // Check if the updater function exists
        _uiUpdaters.updateMnemonicUI(mnemonicSettings);
    }
    _uiUpdaters.updateEnableEncryptionToggle(encryptionEnabled);

    // Master password visibility depends on these settings
    if (_MasterPasswordService && typeof _MasterPasswordService.triggerMasterPasswordUIVisibilityUpdate === 'function') {
        await _MasterPasswordService.triggerMasterPasswordUIVisibilityUpdate();
    }
    
    return settings;
}

export async function saveSettings() {
    const currentSettingsFromStorage = await _passwordStorage.getSettings() || {}; // Ensure it's an object
    const generationOptions = _uiStateProviders.getGenerationOptions();
    const mnemonicSettings = _uiStateProviders.getMnemonicSettings();
    // Get encryptionEnabled state from the toggle in UI, not just what's in storage,
    // because this function might be called when user clicks a general "Save Settings" button,
    // and we want to capture their intent from the UI accurately.
    const encryptionEnabledFromUI = _uiStateProviders.getEnableEncryptionToggleState ? _uiStateProviders.getEnableEncryptionToggleState() : currentSettingsFromStorage.encryptionEnabled;

    const uiSettings = currentSettingsFromStorage.uiSettings || {};
    const masterPasswordPreviouslySet = currentSettingsFromStorage.masterPasswordPreviouslySet || false;

    const newSettings = {
        generationOptions: generationOptions,
        mnemonic: mnemonicSettings,
        encryptionEnabled: encryptionEnabledFromUI, // Use the UI state for this save operation
        uiSettings: uiSettings, 
        masterPasswordPreviouslySet: masterPasswordPreviouslySet 
    };

    await _passwordStorage.saveSettings(newSettings);

    // If the user just turned encryption OFF via the toggle AND a general save button,
    // but didn't go through the master password prompt flow for disabling,
    // this might lead to an inconsistent state if history wasn't decrypted.
    // The primary flow for disabling encryption should be via handleEncryptionToggleChange in popup.js,
    // which calls the new SettingsService.disableEncryption.
    // This saveSettings function should primarily sync other settings.
    // However, if encryption state IS changed here, update MP UI visibility.
    if (currentSettingsFromStorage.encryptionEnabled !== newSettings.encryptionEnabled) {
        if (_MasterPasswordService && typeof _MasterPasswordService.triggerMasterPasswordUIVisibilityUpdate === 'function') {
            await _MasterPasswordService.triggerMasterPasswordUIVisibilityUpdate();
        }
        if (!newSettings.encryptionEnabled && currentSettingsFromStorage.encryptionEnabled) {
             // If encryption was turned off here by a general save (not recommended pathway for disabling)
             // We should still try to clear the in-memory MP.
            _MasterPasswordService?.clearMasterPasswordInMemory();
            // And ensure the UI reflects that MP is no longer relevant for now.
            // The callback onMasterPasswordRemoved in popup.js should handle UI toggle update.
            _MasterPasswordService?.handleEncryptionDisabled?.(); // This should trigger the onMasterPasswordRemoved callback
        }
    }

    _uiUpdaters.showToast(_t("settingsSaved") || "Settings saved!");
}

// New function to handle disabling encryption explicitly
export async function disableEncryption(masterPasswordToUse) {
    try {
        const currentSettings = await _passwordStorage.getSettings() || {};
        if (!currentSettings.encryptionEnabled) {
            // Already disabled
            return true; 
        }

        if (currentSettings.masterPasswordPreviouslySet) {
            if (!masterPasswordToUse) {
                _uiUpdaters.showToast(_t("masterPasswordRequiredToDisableEncryption") || "Master password required.", "error");
                return false; // Cannot disable without password if it was set
            }
            const isValid = await _MasterPasswordService.verifyMasterPasswordAgainstStorage(masterPasswordToUse);
            if (!isValid) {
                _uiUpdaters.showToast(_t("masterPasswordIncorrectError") || "Master password incorrect.", "error");
                return false;
            }
            // If password is valid, decrypt history
            const decryptSuccess = await _passwordStorage.decryptExistingHistory(masterPasswordToUse);
            if (!decryptSuccess) {
                _uiUpdaters.showToast(_t("decryptionFailedCannotDisable") || "History decryption failed. Cannot disable encryption.", "error");
                return false;
            }
        }
        // If we are here, either MP was never set, or it was set and history decrypted successfully.
        const newSettings = {
            ...currentSettings,
            encryptionEnabled: false,
            masterPasswordPreviouslySet: false // Explicitly set to false
        };
        await _passwordStorage.saveSettings(newSettings);
        
        _MasterPasswordService?.clearMasterPasswordInMemory();
        _MasterPasswordService?.handleEncryptionDisabled?.(); // This should call onMasterPasswordRemoved callback in popup.js
                                                          // which in turn calls settingsUI.updateEnableEncryptionToggle(false)

        // Toast is shown by handleDisableEncryption in popup.js after this returns true
        return true;
    } catch (error) {
        console.error("Error in SettingsService.disableEncryption:", error);
        _uiUpdaters.showToast(_t("encryptionDisableFailedError") || "Error disabling encryption.", "error");
        return false;
    }
} 