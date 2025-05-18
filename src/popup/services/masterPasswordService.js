// src/popup/services/masterPasswordService.js

// Dependencies will be injected
let _passwordStorage;
let _t; // localization function
let _showToast;
let _uiCallbacks = {
    showMasterPasswordSetupError: () => {},
    clearMasterPasswordForms: () => {},
    hideAllMasterPasswordSections: () => {},
    focusMasterPasswordPrompt: () => {},
    onMasterPasswordSet: () => {},
    onMasterPasswordChange: () => {},
    onMasterPasswordRemoved: () => {},
    onMasterPasswordPromptSuccess: () => {},
    updateMasterPasswordUIVisibility: (state) => {}
};

let currentMasterPassword = null;
let isChangingMasterPassword = false;
let masterPasswordJustSubmitted = false;
let isDisablingEncryptionAwaitingMP = false;
let pendingDisableEncryptionEvent = null;
let initialSetupIntent = false;

export function validateMasterPassword(password, tFunc) {
    const resolvedT = tFunc || _t || (key => key); // Use injected t, fallback to internal, then key
    const errors = [];
    if (password.length < 8) {
        errors.push(resolvedT("masterPasswordMinLengthError") || "Minimum 8 characters required.");
    }
    if (!/[a-z]/.test(password)) {
        errors.push(resolvedT("masterPasswordLowercaseError") || "Requires at least one lowercase letter (a-z).");
    }
    if (!/[A-Z]/.test(password)) {
        errors.push(resolvedT("masterPasswordUppercaseError") || "Requires at least one uppercase letter (A-Z).");
    }
    if (!/[0-9]/.test(password)) {
        errors.push(resolvedT("masterPasswordDigitError") || "Requires at least one digit (0-9).");
    }
    return errors;
}

export function initMasterPasswordService(dependencies) {
    _passwordStorage = dependencies.passwordStorage;
    _t = dependencies.t;
    _showToast = dependencies.showToast;
    if (dependencies.uiCallbacks) {
        _uiCallbacks = { ..._uiCallbacks, ...dependencies.uiCallbacks };
    }
    // Immediately update visibility on init, if settings are available
    // This might need to be called from popup.js after service and settings are loaded
    // triggerMasterPasswordUIVisibilityUpdate(); 
}

export function getCurrentMasterPassword() {
    return currentMasterPassword;
}

export function setMasterPasswordInMemory(password) {
    currentMasterPassword = password;
    masterPasswordJustSubmitted = true;
}

export function clearMasterPasswordInMemory() {
    currentMasterPassword = null;
}

export function isChanging() {
    return isChangingMasterPassword;
}

export function setChanging(isChanging) {
    isChangingMasterPassword = isChanging;
}

export function wasMasterPasswordJustSubmitted() {
    return masterPasswordJustSubmitted;
}

export function setMasterPasswordJustSubmitted(value) {
    masterPasswordJustSubmitted = value;
}

export function isInitialSetupIntentActive() {
    return initialSetupIntent;
}

export function prepareForInitialSetup() {
    isChangingMasterPassword = false;
    initialSetupIntent = true;
    // We don't trigger UI update from here, the caller (popup.js) will do it.
}

export function cancelInitialSetupIntent() {
    initialSetupIntent = false;
}

export function isAwaitingMPForEncryptionDisable() {
    return isDisablingEncryptionAwaitingMP;
}

export function setAwaitingMPForEncryptionDisable(value, event = null) {
    isDisablingEncryptionAwaitingMP = value;
    pendingDisableEncryptionEvent = event;
}

export function getPendingDisableEncryptionEvent() {    
    const event = pendingDisableEncryptionEvent;
    pendingDisableEncryptionEvent = null; // Clear after retrieving
    return event;
}

export async function attemptSetMasterPassword(newPassword, confirmPassword) {
    if (newPassword !== confirmPassword) {
        _uiCallbacks.showMasterPasswordSetupError?.('mismatch', _t('masterPasswordMismatchError') || 'Passwords do not match.');
        return false;
    }
    const errors = validateMasterPassword(newPassword, _t);
    if (errors.length > 0) {
        _uiCallbacks.showMasterPasswordSetupError?.('strength', errors.join(' '));
        return false;
    }

    try {
        let currentSettings = await _passwordStorage.getSettings() || {};
        
        if (!currentSettings.encryptionEnabled || initialSetupIntent) {
            const encryptionSuccess = await _passwordStorage.encryptExistingHistory(newPassword);
            if (!encryptionSuccess) {
                _showToast?.(_t('encryptionFailedHistoryNotEncrypted') || 'Failed to encrypt history. Master password not set.', 'error');
                return false;
            }
        }

        currentMasterPassword = newPassword;
        masterPasswordJustSubmitted = true;
        setChanging(false);
        initialSetupIntent = false;

        const newSettings = {
            ...currentSettings,
            encryptionEnabled: true,
            masterPasswordPreviouslySet: true
        };
        await _passwordStorage.saveSettings(newSettings);
        await _passwordStorage.setMasterPasswordVerifier(newPassword);

        _showToast?.(_t('masterPasswordSetSuccess') || 'Master password set successfully!', 'success');
        _uiCallbacks.onMasterPasswordSet?.(newPassword);
        return true;
    } catch (error) {
        console.error("Error setting master password:", error);
        _showToast?.(_t('masterPasswordSetFailed') || 'Failed to set master password.', 'error');
        _uiCallbacks.showMasterPasswordSetupError?.('general', _t('masterPasswordSetFailedError') || 'An unexpected error occurred.');
        return false;
    }
}

export async function attemptChangeMasterPassword(currentPass, newPassword, confirmPassword) {
    if (newPassword !== confirmPassword) {
        _uiCallbacks.showMasterPasswordSetupError?.('mismatch', _t('masterPasswordMismatchError') || 'New passwords do not match.');
        return false;
    }
    const errors = validateMasterPassword(newPassword, _t);
    if (errors.length > 0) {
        _uiCallbacks.showMasterPasswordSetupError?.('strength', errors.join(' '));
        return false;
    }

    const isValidCurrent = await _passwordStorage.verifyMasterPassword(currentPass);
    if (!isValidCurrent) {
        _uiCallbacks.showMasterPasswordSetupError?.('current', _t('currentMasterPasswordIncorrectError') || 'Current master password incorrect.');
        return false;
    }

    try {
        const reEncryptResult = await _passwordStorage.reEncryptHistory(currentPass, newPassword);

        // Check if the re-encryption critically failed.
        // If not critical, but items failed (e.g. due to old salt), we still allow MP change,
        // though those items remain undecryptable.
        if (reEncryptResult.critical) {
            _showToast?.(_t('reEncryptionFailedError') || 'Failed to re-encrypt history. Master password not changed.', 'error');
            if (reEncryptResult.error) {
                console.error("Critical re-encryption failure:", reEncryptResult.error);
            }
            return false;
        }

        // Log if some items failed non-critically
        if (reEncryptResult.failed > 0) {
            console.warn(`Re-encryption attempt: ${reEncryptResult.succeeded} succeeded, ${reEncryptResult.failed} failed. Proceeding with master password change.`);
        }

        currentMasterPassword = newPassword;
        masterPasswordJustSubmitted = true;
        
        const verifierSetSuccess = await _passwordStorage.setMasterPasswordVerifier(newPassword);
        if (!verifierSetSuccess) {
            _showToast?.(_t('masterPasswordSetVerifierFailedError') || 'Failed to set the new master password verifier. Password not changed.', 'error');
            // Optional: Consider reverting currentMasterPassword or other state if critical
            return false;
        }

        setChanging(false);
        initialSetupIntent = false;

        _showToast?.(_t('reEncryptSuccess') || 'Password history re-encrypted successfully with the new master password.', 'success');
        _uiCallbacks.onMasterPasswordChange?.(newPassword);
        return true;
    } catch (error) {
        console.error("Error changing master password:", error);
        _showToast?.(_t('masterPasswordChangeFailed') || 'Failed to change master password.', 'error');
        _uiCallbacks.showMasterPasswordSetupError?.('general', _t('masterPasswordChangeFailedError') || 'An unexpected error occurred while changing the master password.');
        return false;
    }
}

export async function handleSubmitPromptedMasterPassword(enteredPassword) {
    const isValid = await _passwordStorage.verifyMasterPassword(enteredPassword);
    if (isValid) {
        currentMasterPassword = enteredPassword;
        masterPasswordJustSubmitted = false; 
        _uiCallbacks.onMasterPasswordPromptSuccess?.(enteredPassword);
        return true;
    } else {
        _showToast?.(_t('masterPasswordIncorrectError') || 'Master password incorrect.', 'error');
        _uiCallbacks.focusMasterPasswordPrompt?.();
        return false;
    }
}

export async function verifyMasterPasswordAgainstStorage(password) {
    if (!_passwordStorage) {
        console.error("[MasterPasswordService] PasswordStorage not available for verification.");
        return false;
    }
    return await _passwordStorage.verifyMasterPassword(password);
}

export async function triggerMasterPasswordUIVisibilityUpdate() {
    if (!_passwordStorage || !_uiCallbacks || !_uiCallbacks.updateMasterPasswordUIVisibility) {
        console.warn("[MasterPasswordService] Attempted to trigger UI update without full initialization.");
        return;
    }

    try {
        const settings = await _passwordStorage.getSettings() || {};
        const masterPasswordIsCurrentlySet = !!currentMasterPassword;
        
        let showSetup = false;
        let showPrompt = false;
        let showChangeButton = false;
        let showRemoveButton = false;

        if (initialSetupIntent) {
            showSetup = true;
        } else if (settings && settings.encryptionEnabled) {
            if (!settings.masterPasswordPreviouslySet) {
                if (!isChangingMasterPassword) { 
                  showSetup = true;
                }
            } else if (settings.masterPasswordPreviouslySet && !masterPasswordIsCurrentlySet) {
                showPrompt = true;
            } else if (settings.masterPasswordPreviouslySet && masterPasswordIsCurrentlySet) {
                showChangeButton = true;
                showRemoveButton = true;
            }
        }
        const effectiveIsChanging = initialSetupIntent ? false : isChangingMasterPassword;

        _uiCallbacks.updateMasterPasswordUIVisibility?.({
            encryptionEnabled: settings.encryptionEnabled || initialSetupIntent,
            masterPasswordIsSet: settings.masterPasswordPreviouslySet || false,
            masterPasswordInSession: masterPasswordIsCurrentlySet,
            isPromptVisible: showPrompt && !initialSetupIntent,
            isSetupVisible: showSetup,
            isChangeButtonVisible: showChangeButton && !initialSetupIntent,
            isRemoveButtonVisible: showRemoveButton && !initialSetupIntent,
            isChanging: effectiveIsChanging
        });
    } catch (error) {
        console.error("[MasterPasswordService] Error in triggerMasterPasswordUIVisibilityUpdate:", error);
    }
}

export function handleEncryptionDisabled() {
    clearMasterPasswordInMemory();
    setChanging(false);
    initialSetupIntent = false;
    _uiCallbacks.onMasterPasswordRemoved?.();
}

// Placeholder for other functions if needed 