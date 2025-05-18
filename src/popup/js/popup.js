import { initPasswordGenerationUI, getGenerationOptions, updatePasswordOutputValue } from "./ui/passwordGenerationUI.js";
import { initHistoryUI, refreshHistoryDisplay } from "./ui/historyUI.js";
import { initTabsUI } from "./ui/tabsUI.js";
import { initSettingsUI } from "./ui/settingsUI.js";
import { initMasterPasswordUI, updateMasterPasswordVisibility } from "./ui/masterPasswordUI.js";
import { initMnemonicUI, getMnemonicSettings } from "./ui/mnemonicUI.js";

import * as settingsService from "./services/settingsService.js";
import * as passwordService from "./services/passwordService.js";
import * as masterPasswordService from "./services/masterPasswordService.js";
import { PasswordStorage } from "../js/storage.js";
import { t, setLang, getCurrentLang } from "./i18n.js";
import { showToast, showConfirmDialog } from "./ui.js";

async function main() {
  const passwordStorage = new PasswordStorage();
  let currentSettings = await passwordStorage.getSettings();

  const dependencies = {
    // UI Modules
    initPasswordGenerationUI,
    getGenerationOptions,
    updatePasswordOutputValue,
    initHistoryUI,
    refreshHistoryDisplay,
    initTabsUI,
    initSettingsUI,
    initMasterPasswordUI,
    updateMasterPasswordVisibility,
    initMnemonicUI,
    getMnemonicSettings,

    // Services
    settingsService,
    passwordService,
    masterPasswordService,

    // Core
    passwordStorage,
    t,
    setLang,
    getCurrentLang,
    showToast,
    showConfirmDialog,
  };

  settingsService.initSettingsService(dependencies);
  passwordService.initPasswordService(dependencies);
  masterPasswordService.initMasterPasswordService(dependencies);

  initTabsUI((tabId) => {
    if (tabId === "historyTab") {
      refreshHistoryDisplay();
    }
  });

  initPasswordGenerationUI(currentSettings, settingsService.saveSettings);
  initMnemonicUI(settingsService.saveSettings);
  initSettingsUI(passwordStorage, currentSettings, settingsService.saveSettings);
  initHistoryUI({
    passwordStorage,
    showConfirmDialog,
    showToast,
    callbacks: {
      onPasswordCopied: () => showToast(t("passwordCopied")),
      onPasswordDeleted: () => showToast(t("passwordDeleted"), "success"),
      onHistoryCleared: () => showToast(t("historyCleared"), "success"),
      onDeleteFailed: () => showToast(t("deleteFailed"), "error"),
      onClearAllFailed: () => showToast(t("clearHistoryFailed"), "error"),
      getMasterPassword: masterPasswordService.getCurrentMasterPassword,
      addTagToPassword: (id, tag) => passwordStorage.addTagToPassword(id, tag),
      removeTagFromPassword: (id, tag) => passwordStorage.removeTagFromPassword(id, tag),
    },
  });

  masterPasswordService.setMasterPasswordChangeCallback(async (newMasterPassword) => {
    currentSettings = await passwordStorage.getSettings();
    initPasswordGenerationUI(currentSettings, settingsService.saveSettings);
    initMnemonicUI(settingsService.saveSettings);
    refreshHistoryDisplay();
  });

  initMasterPasswordUI({
    onSetMasterPassword: masterPasswordService.attemptSetMasterPassword,
    onChangeMasterPassword: masterPasswordService.attemptChangeMasterPassword,
    onSubmitPromptedMasterPassword: masterPasswordService.handleSubmitPromptedMasterPassword,
    onDisableEncryption: settingsService.disableEncryption,
  });

  // Initial load
  await settingsService.loadSettingsAndApply();
  refreshHistoryDisplay();
  updateMasterPasswordVisibility();
}

document.addEventListener("DOMContentLoaded", main);
