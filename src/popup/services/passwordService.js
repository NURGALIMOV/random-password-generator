let _passwordGenerator;
let _passwordStorage;
let _MasterPasswordService; // To get currentMasterPassword
let _uiStateProviders; // e.g., { getGenerationOptions, getMnemonicSettings }
let _uiUpdaters; // e.g., { updatePasswordOutput, updateStrengthMeter, showToast, copyToClipboard }
let _historyUpdaters; // e.g., { invalidateHistoryCache, refreshHistoryDisplay }
let _t; // localization
let _logEvent;
let _logError;

export function initPasswordService(dependencies) {
    _passwordGenerator = dependencies.passwordGenerator;
    _passwordStorage = dependencies.passwordStorage;
    _MasterPasswordService = dependencies.MasterPasswordService;
    _uiStateProviders = dependencies.uiStateProviders;
    _uiUpdaters = dependencies.uiUpdaters;
    _historyUpdaters = dependencies.historyUpdaters;
    _t = dependencies.t;
    _logEvent = dependencies.logEvent;
    _logError = dependencies.logError;
}

export async function generatePasswordAndSave() {
    try {
        const generationUISettings = _uiStateProviders.getGenerationOptions();
        const mnemonicUISettings = _uiStateProviders.getMnemonicSettings();
        const settings = await _passwordStorage.getSettings(); // For encryptionEnabled flag
        const encryptionIsEnabled = settings.encryptionEnabled;
        const currentMasterPassword = _MasterPasswordService.getCurrentMasterPassword();

        // Frontend validation for template character types
        if (!mnemonicUISettings.mnemonicEnabled && generationUISettings.template && generationUISettings.template.trim().length > 0) {
            const template = generationUISettings.template.trim();
            const messages = []; // Use a more generic name like 'messages' or 'errorMessages'

            if (template.includes('#') && !generationUISettings.numbers) {
                messages.push(_t('templateValidationNumbers') || 'Numbers (for #)');
            }
            
            // Check for any letter placeholder if both lower and upper are disabled
            if ((template.includes('L') || template.includes('U') || template.includes('l')) && !generationUISettings.lowercase && !generationUISettings.uppercase) {
                messages.push(_t('templateValidationAnyLetter') || 'Letters (for L, U, l)');
            } else {
                // Specific checks if general letter check didn't trigger
                if (template.includes('L') && !generationUISettings.lowercase && !generationUISettings.uppercase) {
                     // This specific case for 'L' is redundant if the above 'AnyLetter' check is comprehensive.
                     // However, keeping it for now if specific 'L' message is desired when only one of (lower/upper) is missing.
                     // But typically 'L' implies 'any letter'. If 'L' specifically means "an uppercase or a lowercase", 
                     // then the passwordGenerator.js logic for 'L' should also be reviewed.
                     // Assuming 'L' allows either, the check should be: if (template.includes('L') && !generationUISettings.lowercase && !generationUISettings.uppercase)
                     // The current generator logic for 'L': if (!charSets.allLetters) throw new Error(...)
                     // So, if template has 'L', we need options.lowercase OR options.uppercase to be true.
                     // The condition "!generationUISettings.lowercase && !generationUISettings.uppercase" is correct.
                }
                if (template.includes('U') && !generationUISettings.uppercase) {
                    messages.push(_t('templateValidationUppercase') || 'Uppercase Letters (for U)');
                }
                if (template.includes('l') && !generationUISettings.lowercase) {
                    messages.push(_t('templateValidationLowercase') || 'Lowercase Letters (for l)');
                }
            }
            
            if (template.includes('@') && !generationUISettings.special) {
                messages.push(_t('templateValidationSpecial') || 'Special Characters (for @)');
            }

            if (messages.length > 0) {
                const messagePrefix = _t('templateValidationErrorPrefix') || 'Template generation requires the following character types to be enabled: ';
                _uiUpdaters.showToast(messagePrefix + messages.join(', '), "error");
                return;
            }
        }

        if (encryptionIsEnabled && !currentMasterPassword) {
            _uiUpdaters.showToast(_t("masterPasswordNeededForEncryption") || "Master Password is required for encryption actions.");
            // The original code showed a prompt here. This service should probably not directly show UI prompts.
            // It should indicate failure or a required action.
            // For now, we'll rely on the UI calling this to handle the prompt if needed before calling.
            // Or, this function could return a specific status indicating MP is needed.
            _uiUpdaters.showMasterPasswordPrompt?.({ reason: 'generatePassword' }); // If showMasterPasswordPrompt is provided
            _uiUpdaters.focusMasterPasswordPrompt?.();
            return; // Stop if MP needed but not available
        }

        const isMnemonic = mnemonicUISettings.mnemonicEnabled;

        if (!isMnemonic && !generationUISettings.template) {
          const { lowercase, uppercase, numbers, special } = generationUISettings;
          if (!lowercase && !uppercase && !numbers && !special) {
            _uiUpdaters.showToast(_t("errorNoCharSetSelected"), "error");
            return;
          }
        }

        let password;
        if (isMnemonic) {
            password = _passwordGenerator.generateMnemonicPassword(mnemonicUISettings);
        } else {
            const finalGenerationOptions = { ...generationUISettings };
            if (!finalGenerationOptions.enablePopularTemplates) {
                finalGenerationOptions.template = "";
            }
            password = _passwordGenerator.generatePassword(finalGenerationOptions);
        }

        _uiUpdaters.updatePasswordOutput(password);
        _uiUpdaters.updateStrengthMeter(password);

        await _passwordStorage.savePassword(password, encryptionIsEnabled ? currentMasterPassword : null);
        _logEvent?.("password_generated_and_saved", { length: password.length, encrypted: encryptionIsEnabled && !!currentMasterPassword });
        
        // Always invalidate cache and trigger a refresh.
        // The UI layer will decide if it needs to re-render.
        if (_historyUpdaters) {
          _historyUpdaters.invalidateHistoryCache();
          _historyUpdaters.refreshHistoryDisplay({ force: true });
        }

    } catch (error) {
        _uiUpdaters.showToast(error.message || _t("error"), "error");
        _logError?.(error, "generatePassword_error_service");
    }
}

export async function savePasswordToHistory(password) {
    if (!password) {
        _logError?.("savePasswordToHistory_called_with_no_password", "Validation Error");
        return; // Or throw error
    }

    try {
        const settings = await _passwordStorage.getSettings();
        const encryptionIsEnabled = settings.encryptionEnabled;
        const currentMasterPassword = _MasterPasswordService.getCurrentMasterPassword();

        if (encryptionIsEnabled && !currentMasterPassword) {
            _uiUpdaters.showToast(_t("masterPasswordNeededForEncryption") || "Master Password is required to save to encrypted history.");
            _uiUpdaters.showMasterPasswordPrompt?.({ reason: 'saveToHistory' });
            _uiUpdaters.focusMasterPasswordPrompt?.();
            return; // Stop if MP needed but not available
        }

        await _passwordStorage.savePassword(password, encryptionIsEnabled ? currentMasterPassword : null);
        _logEvent?.("password_saved_to_history_from_service", { length: password.length, encrypted: encryptionIsEnabled && !!currentMasterPassword });

        // Always invalidate cache and trigger a refresh.
        if (_historyUpdaters) {
          _historyUpdaters.invalidateHistoryCache();
          await _historyUpdaters.refreshHistoryDisplay({ force: true });
        }
         // Unlike generatePasswordAndSave, we don't update the main password output or strength meter here,
        // as this function is specifically for saving an existing password (e.g. from copy action).
        // The UI calling this should have already handled updating the output if needed.

    } catch (error) {
        _uiUpdaters.showToast(_t("errorSavingPasswordToHistory") || _t("error") || "Error saving password to history.", "error");
        _logError?.(error, "savePasswordToHistory_error_service");
    }
} 