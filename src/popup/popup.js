console.log('POPUP.JS SCRIPT EXECUTION STARTED');

import PasswordGenerator from "../js/passwordGenerator.js";
import PasswordStorage from "../js/storage.js";
import { calculateStrength } from "../js/passwordStrength.js";
import { STRENGTH_COLORS } from "./ui.js";
import { applyTheme, initializeTheme } from "./theme.js";
import { getCachedHistory, invalidateHistoryCache } from "./history.js";
import { copyToClipboard } from "./helpers.js";
import { t, setLang, getCurrentLang } from "./i18n.js";
import { logEvent, logError } from "./logger.js";
import { initMnemonicUI, getMnemonicSettings, updateMnemonicUI as updateMnemonicUICallback } from "./ui/mnemonicUI.js";
import * as passwordGenerationUI from "./ui/passwordGenerationUI.js";
import * as masterPasswordUI from "./ui/masterPasswordUI.js";
import * as settingsUI from "./ui/settingsUI.js";
import { initHistoryUI, refreshHistoryDisplay } from "./ui/historyUI.js";
import { initTabsUI, switchToTab as switchToTabFromTabsUI } from "./ui/tabsUI.js";
import * as MasterPasswordService from './services/masterPasswordService.js';
import * as PasswordService from './services/passwordService.js';
import * as SettingsService from './services/settingsService.js';
import * as ImportExportService from './services/importExportService.js';

document.addEventListener("DOMContentLoaded", async () => {
  // --- Service and Helper Initialization ---
  const passwordGenerator = new PasswordGenerator();
  const passwordStorage = new PasswordStorage(chrome.storage.local);

  // --- DOM Element Declarations ---
  let passwordOutput, copyButton, generateButton, strengthIndicator, strengthText,
      strengthDetailsToggle, strengthDetailsContent, strengthWarningsList, strengthSuggestionsList,
      enableEncryptionToggle, togglePasswordButton, eyeIcon, eyeOffIcon,
      themeButton, themeOptions, importSettingsBtn, exportSettingsBtn, importSettingsInput,
      importPasswordsBtn, exportPasswordsBtn,
      addPasswordButton;

  // --- Function Declarations ---

  function getDOMElements() {
    passwordOutput = document.getElementById("passwordOutput");
    copyButton = document.getElementById("copyButton");
    generateButton = document.getElementById("generateButton");
    strengthIndicator = document.getElementById("strengthIndicator");
    strengthText = document.getElementById("strengthText");
    strengthDetailsToggle = document.getElementById("strengthDetailsToggle");
    strengthDetailsContent = document.getElementById("strengthDetailsContent");
    strengthWarningsList = document.querySelector("#strengthWarnings ul");
    strengthSuggestionsList = document.querySelector("#strengthSuggestions ul");
    enableEncryptionToggle = document.getElementById("enableEncryptionToggle");
    togglePasswordButton = document.getElementById("togglePasswordButton");
    eyeIcon = togglePasswordButton ? togglePasswordButton.querySelector(".eye-icon") : null;
    eyeOffIcon = togglePasswordButton ? togglePasswordButton.querySelector(".eye-off-icon") : null;
    themeButton = document.getElementById("themeButton");
    themeOptions = document.getElementById("themeOptions");
    importSettingsBtn = document.getElementById('importSettingsBtn');
    exportSettingsBtn = document.getElementById('exportSettingsBtn');
    importSettingsInput = document.getElementById('importSettingsInput');
    importPasswordsBtn = document.getElementById('importPasswordsBtn');
    exportPasswordsBtn = document.getElementById('exportPasswordsBtn');
    addPasswordButton = document.getElementById('addPasswordButton');
  }

  function setupEventListeners() {
    generateButton?.addEventListener("click", PasswordService.generatePasswordAndSave);

    copyButton?.addEventListener("click", () => {
      if (passwordOutput?.value) {
        copyToClipboard(passwordOutput.value);
        showToast(t("passwordCopied"));
        logEvent('password_copied', { length: passwordOutput.value.length });
      }
    });

    passwordOutput?.addEventListener('click', () => {
      if (passwordOutput.value && passwordOutput.value !== (t("passwordPlaceholder"))) {
        copyToClipboard(passwordOutput.value);
        showToast(t("passwordCopied"));
      }
    });

    passwordOutput?.addEventListener('input', () => {
      const password = passwordOutput.value;
      updateStrengthMeterUI(password);
      if (addPasswordButton) {
        addPasswordButton.style.display = password ? 'inline-block' : 'none';
      }
    });

    addPasswordButton?.addEventListener('click', async () => {
      const password = passwordOutput.value;
      if (password) {
        await PasswordService.savePasswordToHistory(password);
        showToast(t('passwordSaved'));
        addPasswordButton.style.display = 'none';
      }
    });

    togglePasswordButton?.addEventListener("click", () => {
      const type = passwordOutput.getAttribute("type") === "password" ? "text" : "password";
      passwordOutput.setAttribute("type", type);
      if(eyeIcon) eyeIcon.style.display = type === "password" ? "block" : "none";
      if(eyeOffIcon) eyeOffIcon.style.display = type === "password" ? "none" : "block";
    });

    strengthDetailsToggle?.addEventListener('click', () => {
        const isOpen = strengthDetailsToggle.classList.toggle('open');
        strengthDetailsContent.style.display = isOpen ? 'flex' : 'none';
    });

    enableEncryptionToggle?.addEventListener("change", (event) => {
      handleEncryptionToggleChange(settingsUI.getEnableEncryptionToggleState(), event);
    });

    exportSettingsBtn?.addEventListener('click', handleExportSettings);
    importSettingsBtn?.addEventListener('click', () => importSettingsInput.click());
    importSettingsInput?.addEventListener('change', handleImportSettings);

    exportPasswordsBtn?.addEventListener('click', () => ImportExportService.handleExportPasswords(passwordStorage, MasterPasswordService, showToast));
    importPasswordsBtn?.addEventListener('click', () => {
        const importPasswordsInput = document.getElementById('importPasswordsInput');
        if (importPasswordsInput) {
            importPasswordsInput.click();
        }
    });
    const importPasswordsInput = document.getElementById('importPasswordsInput');
    if (importPasswordsInput) {
        importPasswordsInput.addEventListener('change', (event) => ImportExportService.handleImportPasswords(event, passwordStorage, MasterPasswordService, showToast));
    }

    const darkModeMatcher = window.matchMedia("(prefers-color-scheme: dark)");
    const systemThemeChangeHandler = async () => {
      const savedTheme = await passwordStorage.getTheme();
      if (savedTheme === "system") await applyTheme("system", document.querySelectorAll(".theme-options-row .theme-option"));
    };
    darkModeMatcher.addEventListener('change', systemThemeChangeHandler);
  }

  function showToast(messageKeyOrText, type = 'success', duration = 3000) {
      const toastContainer = document.getElementById('toastContainer');
      if (!toastContainer) {
          console.error("Toast container not found!");
          return;
      }

      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      toast.textContent = t(messageKeyOrText) || messageKeyOrText;

      toastContainer.appendChild(toast);
      
      setTimeout(() => {
          toast.classList.add('show');
      }, 10);

      if (duration > 0) {
          setTimeout(() => {
              toast.classList.remove('show');
              toast.addEventListener('transitionend', () => toast.remove());
          }, duration);
      }
  }

  function showConfirmDialog(messageKeyOrText, onConfirm) {
    const dialog = document.getElementById("confirmDialog");
    const messageEl = document.getElementById("confirmMessage");
    const yesBtn = document.getElementById("confirmYes");
    const noBtn = document.getElementById("confirmNo");

    if (!dialog || !messageEl || !yesBtn || !noBtn) {
      console.error("Confirmation dialog elements not found.");
      return;
    }

    messageEl.textContent = t(messageKeyOrText) || messageKeyOrText;
    yesBtn.textContent = t("yes") || "Yes";
    noBtn.textContent = t("no") || "No";
    dialog.classList.add("show");

    const cleanup = () => {
      dialog.classList.remove("show");
      yesBtn.removeEventListener('click', yesHandler);
      noBtn.removeEventListener('click', noHandler);
    };

    const yesHandler = async () => {
      try {
        if (typeof onConfirm === 'function') {
          await onConfirm();
        }
      } catch (error) {
        logError(error, 'onConfirm callback in showConfirmDialog');
      } finally {
        cleanup();
      }
    };

    const noHandler = () => {
      cleanup();
    };

    yesBtn.addEventListener('click', yesHandler);
    noBtn.addEventListener('click', noHandler);
  }

  async function handleExportSettings() {
    try {
      const settings = await passwordStorage.getSettings();
      const settingsToExport = {
        generationOptions: settings.generationOptions,
        mnemonic: settings.mnemonic,
        uiSettings: settings.uiSettings,
      };

      const settingsString = JSON.stringify(settingsToExport, null, 2);
      const blob = new Blob([settingsString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'password-generator-settings.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      logError(error, 'handleExportSettings');
      showToast(t('exportError'), 'error');
    }
  }

  async function handleImportSettings(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target.result;
        const importedSettings = JSON.parse(text);

        if (!importedSettings || typeof importedSettings.generationOptions === 'undefined') {
          throw new Error("Invalid settings file format.");
        }

        const currentSettings = await passwordStorage.getSettings() || {};

        const newSettings = {
            ...currentSettings,
            ...importedSettings
        };
        
        await passwordStorage.saveSettings(newSettings);
        // Reload everything to reflect imported settings
        await SettingsService.loadSettingsAndApply();
        const newLang = newSettings.uiSettings?.lang || 'en';
        await setLang(newLang);
        localizeAll();
        await initializeTheme(passwordStorage, null, document.querySelectorAll(".theme-options-row .theme-option"));
        
        showToast(t('importSuccess'));
      } catch (error) {
        logError(error, 'handleImportSettings');
        showToast(t('importError'), 'error');
      } finally {
        if(importSettingsInput) importSettingsInput.value = '';
      }
    };
    reader.onerror = (error) => {
        logError(error, 'FileReader error');
        showToast(t('importError'), 'error');
        if(importSettingsInput) importSettingsInput.value = '';
    };
    reader.readAsText(file);
  }

  function updateStrengthMeterUI(password) {
    if (!strengthText || !strengthIndicator || !strengthDetailsContent) return;
  
    if (!password) {
      strengthText.textContent = "";
      strengthIndicator.style.width = "0%";
      strengthIndicator.style.backgroundColor = "transparent";
      strengthDetailsToggle.style.display = 'none';
      strengthDetailsContent.style.display = 'none';
      return;
    }
  
    const strength = calculateStrength(password);
    strengthText.textContent = t(strength.label) || strength.label;
    strengthIndicator.style.width = `${strength.score}%`;
    
    strengthIndicator.style.backgroundColor = STRENGTH_COLORS[strength.level] || STRENGTH_COLORS.default;
  
    const { warnings, suggestions } = strength.feedback;
    if (strengthWarningsList) strengthWarningsList.innerHTML = '';
    if (strengthSuggestionsList) strengthSuggestionsList.innerHTML = '';
  
    if ((warnings?.length > 0) || (suggestions?.length > 0)) {
        strengthDetailsToggle.style.display = 'flex';
    } else {
        strengthDetailsToggle.style.display = 'none';
        strengthDetailsContent.style.display = 'none';
        strengthDetailsToggle.classList.remove('open');
        return;
    }

    const warningsSection = document.getElementById('strengthWarnings');
    if (warnings?.length > 0) {
      warnings.forEach(w => {
        const li = document.createElement('li');
        li.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg> <span>${t(w.key) || w.message}</span>`;
        strengthWarningsList.appendChild(li);
      });
      warningsSection.style.display = 'block';
    } else {
      warningsSection.style.display = 'none';
    }
  
    const suggestionsSection = document.getElementById('strengthSuggestions');
    if (suggestions?.length > 0) {
      suggestions.forEach(s => {
        const li = document.createElement('li');
        li.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> <span>${t(s.key) || s.message}</span>`;
        strengthSuggestionsList.appendChild(li);
      });
      suggestionsSection.style.display = 'block';
    } else {
      suggestionsSection.style.display = 'none';
    }
  }
  
  async function handleTabSwitched(tabId, isActiveAndExpanded) {
    if (tabId === 'history' && isActiveAndExpanded) {
      await refreshHistoryDisplay(); 
    }
    logEvent("tab_switched", { tab: tabId, expanded: isActiveAndExpanded });
  }

  function localizeAll() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key && t(key)) {
        if (key.startsWith('templateHelp')) {
          el.innerHTML = t(key);
        } else {
          el.textContent = t(key);
        }
      }
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key && t(key)) el.setAttribute('placeholder', t(key));
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      if (key && t(key)) el.setAttribute('title', t(key));
    });
  }
  
  async function handleDisableEncryption(masterPasswordToUse, originalEvent = null) {
    let success = await SettingsService.disableEncryption(masterPasswordToUse);
    if (success) {
      showToast(t('disableEncryptionSuccess'));
    } else {
      if (originalEvent?.target) originalEvent.target.checked = true;
    }
    MasterPasswordService.setAwaitingMPForEncryptionDisable(false, null);
  }

  async function handleEncryptionToggleChange(isEnabled, event = null) {
    if (isEnabled) {
      showToast(t('encryptionEnabledMessage'), 'info');
      MasterPasswordService.prepareForInitialSetup();
      settingsUI.updateEnableEncryptionToggle(true);
      await MasterPasswordService.triggerMasterPasswordUIVisibilityUpdate();
      switchToTabFromTabsUI('settings');
      masterPasswordUI.focusSetupForm?.('new');
    } else {
      if (MasterPasswordService.isInitialSetupIntentActive()) {
        MasterPasswordService.cancelInitialSetupIntent();
        settingsUI.updateEnableEncryptionToggle(false);
        masterPasswordUI.hideAllMasterPasswordSections();
      } else {
        const settings = await passwordStorage.getSettings();
        if (settings.masterPasswordPreviouslySet && !MasterPasswordService.getCurrentMasterPassword()) {
          MasterPasswordService.setAwaitingMPForEncryptionDisable(true, event);
          masterPasswordUI.showPrompt({ reason: 'disableEncryption' });
          switchToTabFromTabsUI('settings');

          masterPasswordUI.focusPrompt?.();
          if (event?.target) event.target.checked = true;
          return;
        }
        await handleDisableEncryption(MasterPasswordService.getCurrentMasterPassword(), event);
      }
    }
  }

  function handlePasswordLoadFromHistory(passwordValue) {
    if (passwordOutput) {
      passwordOutput.value = passwordValue;
      updateStrengthMeterUI(passwordValue);
      showToast(t("passwordLoadedFromHistory"));
      switchToTabFromTabsUI("generator");
    }
  }

  // --- Initial Load Sequence ---
  async function main() {
    try {
      getDOMElements();

      // Init services
      MasterPasswordService.initMasterPasswordService({
        passwordStorage, t, showToast,
        uiCallbacks: {
          showMasterPasswordSetupError: masterPasswordUI.showSetupError,
          clearMasterPasswordForms: masterPasswordUI.clearPasswordsAndErrors,
          hideAllMasterPasswordSections: masterPasswordUI.hideAllMasterPasswordSections,
          focusMasterPasswordPrompt: masterPasswordUI.focusPrompt,
          updateMasterPasswordUIVisibility: masterPasswordUI.updateMasterPasswordVisibility,
          onMasterPasswordSet: async () => {
            settingsUI.updateEnableEncryptionToggle(true);
            await refreshHistoryDisplay();
          },
          onMasterPasswordChange: () => refreshHistoryDisplay(),
          onMasterPasswordRemoved: async () => {
            settingsUI.updateEnableEncryptionToggle(false);
            await refreshHistoryDisplay();
          },
          onMasterPasswordPromptSuccess: async (masterPassword) => {
            if (MasterPasswordService.isAwaitingMPForEncryptionDisable()) {
              await handleDisableEncryption(masterPassword, MasterPasswordService.getPendingDisableEncryptionEvent());
            } else {
              await refreshHistoryDisplay();
            }
          }
        }
      });

      PasswordService.initPasswordService({
        passwordGenerator, passwordStorage, MasterPasswordService, t, logEvent, logError,
        uiStateProviders: {
            getGenerationOptions: passwordGenerationUI.getGenerationOptions,
            getMnemonicSettings: getMnemonicSettings
        },
        uiUpdaters: {
            updatePasswordOutput: passwordGenerationUI.updatePasswordOutputValue,
            updateStrengthMeter: updateStrengthMeterUI,
            showToast: showToast,
            copyToClipboard: copyToClipboard,
            showMasterPasswordPrompt: masterPasswordUI.showPrompt,
            focusMasterPasswordPrompt: masterPasswordUI.focusPrompt
        },
        historyUpdaters: {
            invalidateHistoryCache,
            refreshHistoryDisplay
        }
      });
      
      SettingsService.initSettingsService({
        passwordStorage, MasterPasswordService, t,
        uiStateProviders: {
          getGenerationOptions: passwordGenerationUI.getGenerationOptions,
          getMnemonicSettings: getMnemonicSettings,
          getEnableEncryptionToggleState: settingsUI.getEnableEncryptionToggleState
        },
        uiUpdaters: {
          updatePasswordGenerationUI: passwordGenerationUI.updatePasswordGenerationUI,
          updateMnemonicUI: updateMnemonicUICallback,
          updateEnableEncryptionToggle: settingsUI.updateEnableEncryptionToggle,
          showToast
        }
      });

      // Init UI modules
      passwordGenerationUI.initPasswordGenerationUI(SettingsService.saveSettings);
      initMnemonicUI(SettingsService.saveSettings);
      masterPasswordUI.initMasterPasswordUI({
          onSetMasterPasswordAttempt: MasterPasswordService.attemptSetMasterPassword,
          onChangeMasterPasswordAttempt: MasterPasswordService.attemptChangeMasterPassword,
          onSubmitPromptedPassword: MasterPasswordService.handleSubmitPromptedMasterPassword,
          onBeginChangeMasterPassword: MasterPasswordService.prepareForChange,
          validateMasterPassword: MasterPasswordService.validateMasterPassword,
          isChangingProvider: MasterPasswordService.isChanging,
          t
      });

      const initialSettings = await SettingsService.loadSettingsAndApply();
      settingsUI.initSettingsUI(passwordStorage, initialSettings, SettingsService.saveSettings);
      initTabsUI(handleTabSwitched);
      
      await initHistoryUI({
        passwordStorageInstance: passwordStorage,
        masterPasswordProviderFunc: MasterPasswordService.getCurrentMasterPassword,
        callbacksObj: { showConfirmDialog, getLocalizedText: t, showToast, onPasswordLoad: handlePasswordLoadFromHistory, showMasterPasswordPrompt: masterPasswordUI.showPrompt, focusMasterPasswordPrompt: masterPasswordUI.focusPrompt },
        utilsObj: { getCachedHistory, invalidateHistoryCache, logError, logEvent, copyToClipboard }
      });
      
      const initialLang = (initialSettings.uiSettings?.lang) || await passwordStorage.getLanguage() || 'en';
      await setLang(initialLang);
      localizeAll();

      await initializeTheme(passwordStorage, null, document.querySelectorAll(".theme-options-row .theme-option"));
      
      setupEventListeners();

      if (!passwordOutput.value) {
        await PasswordService.generatePasswordAndSave();
      }
      updateStrengthMeterUI(passwordOutput.value);

      await MasterPasswordService.triggerMasterPasswordUIVisibilityUpdate();
      
      logEvent('popup_initialized_successfully');

    } catch (error) {
      logError(error, "popup_initialization_failed");
      showToast('Error initializing extension', 'error');
    }
  }

  main();
});
