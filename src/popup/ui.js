// ui.js — вспомогательные функции для работы с UI

import { t } from "./i18n.js";

let lastToastMessage = null;
let lastConfirmDialog = null;

// Цвета для индикатора силы пароля
export const STRENGTH_COLORS = {
  veryWeak: "#ff4040",
  weak: "#ff8040",
  medium: "#ffbf40",
  strong: "#80c040",
  veryStrong: "#40a040",
  default: "#ddd"
};

/**
 * Показывает всплывающее уведомление (toast)
 * @param {string} messageKeyOrText - Ключ или текст сообщения
 */
export function showToast(messageKeyOrText) {
  const existingToast = document.querySelector(".success-message");
  if (existingToast) {
    existingToast.remove();
  }

  // messageKeyOrText может быть ключом или текстом
  let message = t(messageKeyOrText) || messageKeyOrText;
  lastToastMessage = messageKeyOrText;

  const toast = document.createElement("div");
  toast.className = "success-message";
  toast.textContent = message;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("show");
  }, 10);

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => {
      toast.remove();
      lastToastMessage = null;
    }, 300);
  }, 2000);
}

/**
 * Показывает диалог подтверждения с кнопками Да/Нет
 * @param {string} messageKeyOrText - Ключ или текст сообщения
 * @param {Function} onConfirm - Колбэк при подтверждении
 */
export function showConfirmDialog(messageKeyOrText, onConfirm) {
  const existingToast = document.querySelector(".success-message");
  if (existingToast) {
    existingToast.remove();
  }

  let message = t(messageKeyOrText) || messageKeyOrText;
  lastConfirmDialog = { messageKeyOrText, onConfirm };

  const toast = document.createElement("div");
  toast.className = "success-message";
  toast.innerHTML = `
    <div>${message}</div>
    <div class="confirm-buttons">
      <button class="confirm-yes">${t("yes") || "Yes"}</button>
      <button class="confirm-no">${t("no") || "No"}</button>
    </div>
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("show");
  }, 10);

  const yesButton = toast.querySelector(".confirm-yes");
  const noButton = toast.querySelector(".confirm-no");

  yesButton.addEventListener("click", () => {
    toast.classList.remove("show");
    setTimeout(() => {
      toast.remove();
      if (onConfirm) onConfirm();
      lastConfirmDialog = null;
    }, 300);
  });

  noButton.addEventListener("click", () => {
    toast.classList.remove("show");
    setTimeout(() => {
      toast.remove();
      lastConfirmDialog = null;
    }, 300);
  });
}

export function updateToastsLang() {
  // Переводим активный toast
  const toast = document.querySelector(".success-message");
  if (toast && lastToastMessage) {
    toast.textContent = t(lastToastMessage) || lastToastMessage;
  }
  // Переводим активный confirm dialog
  if (toast && lastConfirmDialog) {
    toast.innerHTML = `
      <div>${t(lastConfirmDialog.messageKeyOrText) || lastConfirmDialog.messageKeyOrText}</div>
      <div class="confirm-buttons">
        <button class="confirm-yes">${t("yes") || "Yes"}</button>
        <button class="confirm-no">${t("no") || "No"}</button>
      </div>
    `;
    // Повторно навешиваем обработчики
    const yesButton = toast.querySelector(".confirm-yes");
    const noButton = toast.querySelector(".confirm-no");
    yesButton.onclick = () => {
      toast.classList.remove("show");
      setTimeout(() => {
        toast.remove();
        if (lastConfirmDialog.onConfirm) lastConfirmDialog.onConfirm();
        lastConfirmDialog = null;
      }, 300);
    };
    noButton.onclick = () => {
      toast.classList.remove("show");
      setTimeout(() => {
        toast.remove();
        lastConfirmDialog = null;
      }, 300);
    };
  }
}

/**
 * Создаёт элемент истории пароля
 * @param {Object} item - Объект истории {id, password, encryptionStatus?, isEncrypted?, decryptionError?}
 * @returns {HTMLElement} DOM-элемент истории
 */
export function createHistoryItem(item) {
  const el = document.createElement("div");
  el.className = "history-item";
  el.dataset.id = item.id;
  // Store all item data, including tags, for filtering and interaction
  el.dataset.passwordData = JSON.stringify(item); 
  
  const passwordWrapper = document.createElement('div');
  passwordWrapper.className = 'history-item-main';

  const passwordSpan = document.createElement("span");
  passwordSpan.className = "history-password";

  let displayPassword = item.password;
  let titleText = item.password;

  // Handle display based on encryption status
  switch (item.encryptionStatus) {
    case "decrypted":
      // Password is plain text, use as is
      break;
    case "plaintext":
      // Password is plain text, use as is
      break;
    case "decryption_failed":
      displayPassword = t("historyDecryptionFailed") || "[Decryption Failed]";
      titleText = t("historyDecryptionFailedTitle") || "Could not decrypt this password. Master password may be incorrect.";
      el.classList.add("history-item-error");
      break;
    case "encrypted_placeholder":
      displayPassword = t("historyEncryptedPlaceholder") || "[Encrypted]";
      titleText = t("historyEncryptedPlaceholderTitle") || "This password is encrypted. Enter master password to view.";
      el.classList.add("history-item-encrypted");
      break;
    case "encryption_data_missing":
      displayPassword = t("historyEncryptionDataMissing") || "[Encryption Data Missing]";
      titleText = t("historyEncryptionDataMissingTitle") || "Encryption data for this password is an item is missing or corrupted.";
      el.classList.add("history-item-error");
      break;
    case "unknown_state":
    default:
      displayPassword = t("historyUnknownState") || "[Unknown State]";
      titleText = t("historyUnknownStateTitle") || "The state of this password entry is unknown.";
      el.classList.add("history-item-error");
      break;
  }

  passwordSpan.textContent = displayPassword;
  passwordSpan.title = titleText; // Provide more detailed tooltip

  const actions = document.createElement("div");
  actions.className = "history-actions";

  const copyButton = document.createElement("button");
  copyButton.className = "history-copy";
  copyButton.title = t("copyPassword") || "Copy password";
  copyButton.setAttribute('data-i18n-title', 'copyPassword');
  copyButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
  `;

  const deleteButton = document.createElement("button");
  deleteButton.className = "history-delete";
  deleteButton.title = t("deleteConfirm") || "Delete password";
  deleteButton.setAttribute('data-i18n-title', 'deleteConfirm');
  deleteButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
  `;

  actions.appendChild(copyButton);
  actions.appendChild(deleteButton);

  passwordWrapper.appendChild(passwordSpan);
  passwordWrapper.appendChild(actions);
  el.appendChild(passwordWrapper);

  // Tags section
  const tagsContainer = document.createElement("div");
  tagsContainer.className = "tags-container";
  
  const tagsList = document.createElement("div");
  tagsList.className = "tags-list";

  if (item.tags && item.tags.length > 0) {
    item.tags.forEach(tag => {
      const tagEl = document.createElement("span");
      tagEl.className = "tag-chip";
      tagEl.textContent = tag;
      tagEl.dataset.tag = tag;
      
      const deleteTagBtn = document.createElement("button");
      deleteTagBtn.className = "delete-tag";
      deleteTagBtn.innerHTML = "&times;";
      deleteTagBtn.title = `Remove tag: ${tag}`;
      tagEl.appendChild(deleteTagBtn);

      tagsList.appendChild(tagEl);
    });
  } else {
      const noTagsSpan = document.createElement('span');
      noTagsSpan.className = 'no-tags-placeholder';
      noTagsSpan.textContent = t('noTags') || 'No tags yet';
      tagsList.appendChild(noTagsSpan);
  }

  tagsContainer.appendChild(tagsList);
  
  const addTagBtn = document.createElement("button");
  addTagBtn.className = "add-tag-btn";
  addTagBtn.title = t("addTag") || "Add Tag";
  addTagBtn.setAttribute('data-i18n-title', 'addTag');
  addTagBtn.innerHTML = `
    <svg class="plus-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
    <svg class="close-icon" style="display:none;" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  `;
  tagsContainer.appendChild(addTagBtn);

  el.appendChild(tagsContainer);

  return el;
}
