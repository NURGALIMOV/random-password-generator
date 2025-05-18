import { t } from "../i18n.js"; // For localization
import { validateMasterPassword } from "../services/masterPasswordService.js"; // Added import

// DOM Elements
let masterPasswordSetupSection,
  currentMasterPasswordGroup,
  currentMasterPasswordInput,
  currentMasterPasswordError,
  newMasterPasswordGroup,
  newMasterPasswordInput,
  masterPasswordStrengthError,
  confirmNewMasterPasswordGroup,
  confirmNewMasterPasswordInput,
  masterPasswordMismatchError,
  setMasterPasswordBtn,
  changeMasterPasswordBtn,
  masterPasswordPromptSection,
  promptedMasterPasswordInput,
  promptedMasterPasswordError, // Added for prompt errors
  submitPromptedMasterPasswordBtn,
  masterPasswordRequirements;

// Callbacks to popup.js
let onSetMasterPasswordAttempt = null;
let onChangeMasterPasswordAttempt = null;
let onSubmitPromptedPassword = null;
let onBeginChangeMasterPassword = null; // When user clicks "Change Master Password" button

// Internal state
let currentModeIsChanging = false; // true if changing, false if initial setup

function getElements() {
  masterPasswordSetupSection = document.getElementById("masterPasswordSetupSection");
  currentMasterPasswordGroup = document.getElementById("currentMasterPasswordGroup");
  currentMasterPasswordInput = document.getElementById("currentMasterPasswordInput");
  currentMasterPasswordError = document.getElementById("currentMasterPasswordError");
  newMasterPasswordGroup = document.getElementById("newMasterPasswordGroup");
  newMasterPasswordInput = document.getElementById("newMasterPasswordInput");
  masterPasswordStrengthError = document.getElementById("masterPasswordStrengthError");
  confirmNewMasterPasswordGroup = document.getElementById("confirmNewMasterPasswordGroup");
  confirmNewMasterPasswordInput = document.getElementById("confirmNewMasterPasswordInput");
  masterPasswordMismatchError = document.getElementById("masterPasswordMismatchError");
  setMasterPasswordBtn = document.getElementById("setMasterPasswordBtn");
  changeMasterPasswordBtn = document.getElementById("changeMasterPasswordBtn");
  masterPasswordPromptSection = document.getElementById("masterPasswordPromptSection");
  promptedMasterPasswordInput = document.getElementById("promptedMasterPasswordInput");
  promptedMasterPasswordError = document.getElementById("promptedMasterPasswordError"); // Get new element
  submitPromptedMasterPasswordBtn = document.getElementById("submitPromptedMasterPasswordBtn");
  masterPasswordRequirements = document.getElementById("masterPasswordRequirements");
}

function clearSetupFormErrors() {
  if (currentMasterPasswordError) currentMasterPasswordError.style.display = "none";
  if (masterPasswordStrengthError) masterPasswordStrengthError.style.display = "none";
  if (masterPasswordMismatchError) masterPasswordMismatchError.style.display = "none";
}

function clearSetupFormInputs() {
  if (currentMasterPasswordInput) currentMasterPasswordInput.value = "";
  if (newMasterPasswordInput) newMasterPasswordInput.value = "";
  if (confirmNewMasterPasswordInput) confirmNewMasterPasswordInput.value = "";
}

function clearPromptForm() {
    if (promptedMasterPasswordInput) promptedMasterPasswordInput.value = "";
    if (promptedMasterPasswordError) promptedMasterPasswordError.style.display = "none";
}

// Helper from popup.js, adapted for local elements
function setupEnterKeyListener(inputElement, buttonElement) {
  if (inputElement && buttonElement) {
    inputElement.addEventListener("keypress", function (event) {
      if (event.key === "Enter" || event.keyCode === 13) {
        event.preventDefault();
        const buttonStyle = window.getComputedStyle(buttonElement);
        if (buttonStyle.display !== "none" && !buttonElement.disabled) {
          buttonElement.click();
        }
      }
    });
  }
}

function setupEventListeners() {
  if (setMasterPasswordBtn) {
    setMasterPasswordBtn.addEventListener("click", () => {
      clearSetupFormErrors();
      const newPassword = newMasterPasswordInput ? newMasterPasswordInput.value : "";
      const confirmPassword = confirmNewMasterPasswordInput ? confirmNewMasterPasswordInput.value : "";

      if (currentModeIsChanging) {
        const currentPass = currentMasterPasswordInput ? currentMasterPasswordInput.value : "";
        if (!currentPass) {
          if (currentMasterPasswordError) {
            currentMasterPasswordError.textContent = t("currentMasterPasswordRequiredError") || "Current master password is required.";
            currentMasterPasswordError.style.display = "block";
          }
          return;
        }
        if (!newPassword || !confirmPassword) {
          if (masterPasswordMismatchError) {
            masterPasswordMismatchError.textContent = t("masterPasswordCannotBeEmpty") || "New password fields cannot be empty.";
            masterPasswordMismatchError.style.display = "block";
          }
          return;
        }
        if (newPassword !== confirmPassword) {
          if (masterPasswordMismatchError) {
            masterPasswordMismatchError.textContent = t("masterPasswordMismatch") || "New passwords do not match.";
            masterPasswordMismatchError.style.display = "block";
          }
          return;
        }
        const strengthValidationErrors = validateMasterPassword(newPassword);
        if (strengthValidationErrors.length > 0) {
          if (masterPasswordStrengthError) {
            masterPasswordStrengthError.innerHTML = strengthValidationErrors.join("<br>");
            masterPasswordStrengthError.style.display = "block";
          }
          return;
        }
        if (onChangeMasterPasswordAttempt) {
          onChangeMasterPasswordAttempt(currentPass, newPassword, confirmPassword);
        }
      } else { // Initial Setup Flow
        if (!newPassword || !confirmPassword) {
          if (masterPasswordMismatchError) {
            masterPasswordMismatchError.textContent = t("masterPasswordCannotBeEmpty") || "Master password fields cannot be empty.";
            masterPasswordMismatchError.style.display = "block";
          }
          return;
        }
        if (newPassword !== confirmPassword) {
          if (masterPasswordMismatchError) {
            masterPasswordMismatchError.textContent = t("masterPasswordMismatch") || "Passwords do not match.";
            masterPasswordMismatchError.style.display = "block";
          }
          return;
        }
        const strengthValidationErrors = validateMasterPassword(newPassword);
        if (strengthValidationErrors.length > 0) {
          if (masterPasswordStrengthError) {
            masterPasswordStrengthError.innerHTML = strengthValidationErrors.join("<br>");
            masterPasswordStrengthError.style.display = "block";
          }
          return;
        }
        if (onSetMasterPasswordAttempt) {
          onSetMasterPasswordAttempt(newPassword, confirmPassword);
        }
      }
    });
  }

  if (changeMasterPasswordBtn) {
    changeMasterPasswordBtn.addEventListener("click", () => {
      if (onBeginChangeMasterPassword) onBeginChangeMasterPassword();
      // Actual UI update to show form will be handled by showSetupForm(true)
    });
  }

  if (submitPromptedMasterPasswordBtn) {
    submitPromptedMasterPasswordBtn.addEventListener("click", () => {
      if (promptedMasterPasswordError) promptedMasterPasswordError.style.display = "none";
      const enteredPassword = promptedMasterPasswordInput ? promptedMasterPasswordInput.value : "";
      if (!enteredPassword) {
        // No need for a toast here, popup.js can show it based on its logic
        if (promptedMasterPasswordError) {
            promptedMasterPasswordError.textContent = t("pleaseEnterMasterPassword") || "Please enter Master Password.";
            promptedMasterPasswordError.style.display = "block";
        }
        if (promptedMasterPasswordInput) promptedMasterPasswordInput.focus();
        return;
      }
      if (onSubmitPromptedPassword) {
        onSubmitPromptedPassword(enteredPassword);
      }
    });
  }
  // Setup Enter key listeners
  setupEnterKeyListener(currentMasterPasswordInput, setMasterPasswordBtn);
  setupEnterKeyListener(newMasterPasswordInput, setMasterPasswordBtn);
  setupEnterKeyListener(confirmNewMasterPasswordInput, setMasterPasswordBtn);
  setupEnterKeyListener(promptedMasterPasswordInput, submitPromptedMasterPasswordBtn);
}

export function initMasterPasswordUI(callbacks) {
  getElements();
  onSetMasterPasswordAttempt = callbacks.onSetMasterPasswordAttempt;
  onChangeMasterPasswordAttempt = callbacks.onChangeMasterPasswordAttempt;
  onSubmitPromptedPassword = callbacks.onSubmitPromptedPassword;
  onBeginChangeMasterPassword = callbacks.onBeginChangeMasterPassword;
  setupEventListeners();
  // Initial state is hidden, popup.js will call updateMasterPasswordVisibility
  hideAllMasterPasswordSections(); 
}

export function showSetupForm(isChangingMode) {
  currentModeIsChanging = isChangingMode;
  hideAllMasterPasswordSections();
  clearSetupFormErrors();
  clearSetupFormInputs();

  if (masterPasswordSetupSection) {
    const newMasterPassLabel = newMasterPasswordGroup ? newMasterPasswordGroup.querySelector('label') : null;
    const confirmNewMasterPassLabel = confirmNewMasterPasswordGroup ? confirmNewMasterPasswordGroup.querySelector('label') : null;

    if (isChangingMode) {
      if (currentMasterPasswordGroup) currentMasterPasswordGroup.style.display = "block";
      if (newMasterPassLabel) newMasterPassLabel.textContent = t("newMasterPasswordLabel") || "New Master Password";
      if (confirmNewMasterPassLabel) confirmNewMasterPassLabel.textContent = t("confirmNewMasterPasswordLabel") || "Confirm New Master Password";
      if (setMasterPasswordBtn) setMasterPasswordBtn.textContent = t("setMasterPasswordBtnTextChange") || "Change Master Password";
      if (currentMasterPasswordInput) currentMasterPasswordInput.focus();
    } else { // Initial setup
      if (currentMasterPasswordGroup) currentMasterPasswordGroup.style.display = "none";
      if (newMasterPassLabel) newMasterPassLabel.textContent = t("masterPasswordLabel") || "Master Password";
      if (confirmNewMasterPassLabel) confirmNewMasterPassLabel.textContent = t("confirmMasterPasswordLabel") || "Confirm Master Password";
      if (setMasterPasswordBtn) setMasterPasswordBtn.textContent = t("setMasterPasswordBtnTextInitial") || "Set Master Password";
      if (newMasterPasswordInput) newMasterPasswordInput.focus();
    }
    masterPasswordSetupSection.style.display = "block";
  }
  if (changeMasterPasswordBtn) changeMasterPasswordBtn.style.display = 'none'; // Hide change button when setup form is active
}

export function showPrompt(config = {}) {
  // config: { reason: 'unlockHistory' | 'manageSettings' | 'disableEncryption', errorMsg: null | string }
  hideAllMasterPasswordSections();
  clearPromptForm();
  if (masterPasswordPromptSection) {
    const promptHeader = masterPasswordPromptSection.querySelector('h4');
    const promptSubmitBtn = masterPasswordPromptSection.querySelector('#submitPromptedMasterPasswordBtn'); 
    
    if (promptHeader) {
        if (config.reason === 'manageSettings') {
            promptHeader.textContent = t('masterPasswordPromptSettingsAccess') || 'Enter Master Password to manage settings';
        } else if (config.reason === 'disableEncryption') {
            promptHeader.textContent = t('masterPasswordPromptDisableEncryption') || 'Enter Master Password to decrypt and disable encryption:';
        } else { // Default or 'unlockHistory'
            promptHeader.textContent = t('masterPasswordPrompt') || 'Please enter your Master Password to view encrypted history:';
        }
    }
    if (promptSubmitBtn) {
        if (config.reason === 'manageSettings') {
            promptSubmitBtn.textContent = t('submitMasterPasswordBtnSettingsAccess') || 'Unlock Settings';
        } else if (config.reason === 'disableEncryption') {
            promptSubmitBtn.textContent = t('submitMasterPasswordBtnDisableEncryption') || 'Decrypt & Disable';
        } else { // Default or 'unlockHistory'
            promptSubmitBtn.textContent = t('submitMasterPasswordBtn') || 'Unlock History';
        }
    }
    if (config.errorMsg && promptedMasterPasswordError) {
        promptedMasterPasswordError.textContent = config.errorMsg;
        promptedMasterPasswordError.style.display = "block";
    }

    masterPasswordPromptSection.style.display = "block";
    if (promptedMasterPasswordInput) promptedMasterPasswordInput.focus();
  }
}

export function hideAllMasterPasswordSections() {
  if (masterPasswordSetupSection) masterPasswordSetupSection.style.display = "none";
  if (masterPasswordPromptSection) masterPasswordPromptSection.style.display = "none";
  // changeMasterPasswordBtn visibility is handled by updateMasterPasswordVisibility
}

export function updateMasterPasswordVisibility(state) {
  // state = { encryptionEnabled, masterPasswordIsSet, masterPasswordInSession, isPromptVisible, isSetupVisible, isChangeButtonVisible, isRemoveButtonVisible, isChanging }
  
  hideAllMasterPasswordSections(); 

  if (!state.encryptionEnabled) {
    // If encryption is globally disabled, hide all MP sections, enable encryption toggle is relevant
    if (masterPasswordSetupSection) masterPasswordSetupSection.style.display = "none";
    if (masterPasswordPromptSection) masterPasswordPromptSection.style.display = "none";
    if (changeMasterPasswordBtn) changeMasterPasswordBtn.style.display = "none";
    // The main encryption toggle switch itself is handled by settingsUI
    return;
  }

  // Encryption is ON
  if (state.isChanging) { // This means user clicked "Change Master Password" button
    showSetupForm(true); // Show the setup form in "change" mode (with current password field)
  } else if (state.isSetupVisible) { // MP never set, show setup form for initial creation
    showSetupForm(false);
  } else if (state.isPromptVisible) { // MP set but not in session, prompt for it
    showPrompt(); 
  } else if (state.masterPasswordInSession) { // MP set AND in session
    if (changeMasterPasswordBtn && state.isChangeButtonVisible) changeMasterPasswordBtn.style.display = "block";
    if (changeMasterPasswordBtn && state.isRemoveButtonVisible) changeMasterPasswordBtn.style.display = "block"; // Should be removeButton
  }
  
  // If no other section is visible but encryption is on, and MP is set (but in session),
  // it means we should show change/remove buttons (handled above).
  // If MP is NOT set (masterPasswordIsSet is false), then setup form should have been triggered by isSetupVisible.
}


export function showSetupError(type, message) {
    clearSetupFormErrors();
    if (type === "current" && currentMasterPasswordError) {
        currentMasterPasswordError.textContent = message;
        currentMasterPasswordError.style.display = "block";
        if (currentMasterPasswordInput) currentMasterPasswordInput.focus();
    } else if (type === "strength" && masterPasswordStrengthError) {
        masterPasswordStrengthError.innerHTML = message; // Allow HTML for multiple errors
        masterPasswordStrengthError.style.display = "block";
        if (newMasterPasswordInput) newMasterPasswordInput.focus();
    } else if (type === "mismatch" && masterPasswordMismatchError) {
        masterPasswordMismatchError.textContent = message;
        masterPasswordMismatchError.style.display = "block";
        if (newMasterPasswordInput) newMasterPasswordInput.focus();
    }
}

export function focusPrompt() {
    if(promptedMasterPasswordInput) promptedMasterPasswordInput.focus();
}

export function focusSetupForm(field = 'new') { // 'current', 'new', 'confirm'
    if (field === 'current' && currentMasterPasswordInput) currentMasterPasswordInput.focus();
    else if (field === 'new' && newMasterPasswordInput) newMasterPasswordInput.focus();
    else if (field === 'confirm' && confirmNewMasterPasswordInput) confirmNewMasterPasswordInput.focus();
}

export function clearPasswordsAndErrors() {
    clearSetupFormInputs();
    clearSetupFormErrors();
    clearPromptForm();
} 