// ui.js — вспомогательные функции для работы с UI

import { t } from "./i18n.js";

let lastToastMessage = null;
let lastConfirmDialog = null;

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
 * @param {Object} item - Объект истории {id, password}
 * @returns {HTMLElement} DOM-элемент истории
 */
export function createHistoryItem(item) {
  const el = document.createElement("div");
  el.className = "history-item";
  el.dataset.id = item.id;

  const passwordSpan = document.createElement("span");
  passwordSpan.className = "history-password";
  passwordSpan.textContent = item.password;
  passwordSpan.title = item.password;

  const actions = document.createElement("div");
  actions.className = "history-actions";

  const copyButton = document.createElement("button");
  copyButton.className = "history-copy";
  copyButton.title = "Copy password";
  copyButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
  `;

  const deleteButton = document.createElement("button");
  deleteButton.className = "history-delete";
  deleteButton.title = "Delete password";
  deleteButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
  `;

  actions.appendChild(copyButton);
  actions.appendChild(deleteButton);

  el.appendChild(passwordSpan);
  el.appendChild(actions);

  return el;
}
