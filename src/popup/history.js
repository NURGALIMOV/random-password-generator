// history.js — функции для работы с историей паролей

import { t } from "./i18n.js";
import { logEvent, logError } from "./logger.js";

let cachedHistory = null;

/**
 * Загружает историю паролей и отображает в UI
 * @param {Object} passwordStorage - Хранилище паролей
 * @param {HTMLElement} historyList - Контейнер для истории
 * @param {Function} createHistoryItem - Функция создания DOM-элемента истории
 * @param {Function} applyVisibilityState - Функция применения видимости
 * @returns {Promise<void>}
 */
export async function loadPasswordHistory(
  passwordStorage,
  historyList,
  createHistoryItem,
  applyVisibilityState,
) {
  try {
    // Кэширование истории
    if (!cachedHistory) {
      cachedHistory = await passwordStorage.getHistory();
    }
    const history = cachedHistory;
    historyList.innerHTML = "";
    if (history.length === 0) {
      const emptyState = document.createElement("div");
      emptyState.className = "empty-state";
      emptyState.textContent = t("noHistory");
      historyList.appendChild(emptyState);
      return;
    }
    const fragment = document.createDocumentFragment();
    history.forEach((item) => {
      const historyItem = createHistoryItem(item);
      fragment.appendChild(historyItem);
    });
    historyList.appendChild(fragment);
    applyVisibilityState();
    logEvent("history_rendered", { count: history.length });
  } catch (e) {
    logError(e, "loadPasswordHistory");
  }
}

function updateHistory(passwordStorage, historyList, createHistoryItem, applyVisibilityState) {
  loadPasswordHistory(passwordStorage, historyList, createHistoryItem, applyVisibilityState);
}

/**
 * Загружает состояние видимости истории паролей
 * @param {Object} passwordStorage - Хранилище паролей
 * @returns {Promise<boolean>} true, если история видима
 */
export async function loadVisibilityState(passwordStorage) {
  const settings = await passwordStorage.getSettings();
  return settings.historyVisible !== false; // default to true if not set
}

/**
 * Применяет состояние видимости к паролям в истории
 * @param {boolean} isHistoryVisible - Видимость истории
 */
export function applyVisibilityState(isHistoryVisible) {
  const historyPasswords = document.querySelectorAll(".history-password");
  historyPasswords.forEach((password) => {
    if (isHistoryVisible) {
      password.classList.remove("masked");
    } else {
      password.classList.add("masked");
    }
  });
}

export function invalidateHistoryCache() {
  cachedHistory = null;
}
