import { TOAST_MESSAGES } from "./constants.js";
import { copyToClipboard } from "./helpers.js";
import { t } from "./i18n.js";
// events.js — обработчики событий для popup

/**
 * Инициализирует обработчики событий для UI
 * @param {Object} params - Все необходимые зависимости и элементы
 * @param {HTMLElement} params.generateButton
 * @param {Function} params.generatePassword
 * @param {HTMLElement} params.copyButton
 * @param {HTMLInputElement} params.passwordOutput
 * @param {Function} params.showToast
 * @param {HTMLInputElement} params.passwordLengthInput
 * @param {HTMLElement} params.lengthValue
 * @param {Function} params.saveSettings
 * @param {HTMLElement[]} params.checkboxes
 * @param {HTMLElement[]} params.tabButtons
 * @param {Function} params.switchTab
 * @param {HTMLElement} params.clearHistoryButton
 * @param {Function} params.showConfirmDialog
 * @param {Object} params.passwordStorage
 * @param {HTMLElement} params.historyList
 * @param {Function} params.createHistoryItem
 * @param {Function} params.applyVisibilityState
 * @param {boolean} params.isHistoryVisible
 * @param {Function} params.loadPasswordHistory
 */
export function initEventHandlers({
  generateButton,
  generatePassword,
  copyButton,
  passwordOutput,
  showToast,
  passwordLengthInput,
  lengthValue,
  saveSettings,
  checkboxes,
  tabButtons,
  switchTab,
  showConfirmDialog,
  passwordStorage,
  historyList,
  createHistoryItem,
  applyVisibilityState,
  isHistoryVisible,
  loadPasswordHistory,
}) {
  generateButton.addEventListener("click", generatePassword);

  copyButton.addEventListener("click", () => {
    if (passwordOutput.value) {
      copyToClipboard(passwordOutput.value);
      showToast(TOAST_MESSAGES.passwordCopied);
    }
  });

  passwordLengthInput.addEventListener("input", () => {
    lengthValue.textContent = passwordLengthInput.value;
    saveSettings();
  });

  checkboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", saveSettings);
  });

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      switchTab(button.dataset.tab);
    });
  });
}
