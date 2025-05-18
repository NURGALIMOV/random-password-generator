// history.js — функции для работы с историей паролей

import { t } from "./i18n.js";
import { logEvent, logError } from "./logger.js";

let cachedHistory = null;

/**
 * Загружает и кеширует историю паролей, с опциональной фильтрацией.
 * @param {Object} passwordStorage - Хранилище паролей.
 * @param {string | null} [masterPassword=null] - Мастер-пароль для дешифрования.
 * @param {string} [filter=""] - Строка для фильтрации по тегам или паролям.
 * @returns {Promise<Array<object>>} - Отфильтрованный массив истории.
 */
export async function getCachedHistory(passwordStorage, masterPassword = null, filter = "") {
  console.log("[history.js getCachedHistory] Called. MasterPassword provided:", !!masterPassword, "Filter:", filter);
  try {
    // Если кеш пуст, или если предоставлен мастер-пароль (подразумевая попытку расшифровки),
    // мы должны получить данные. `invalidateHistoryCache` - основной способ принудительного обновления.
    if (cachedHistory === null) {
      console.log("[history.js getCachedHistory] Cache miss. Fetching fresh history from passwordStorage.getHistory()");
      cachedHistory = await passwordStorage.getHistory(masterPassword);
      console.log("[history.js getCachedHistory] Fetched items:", cachedHistory ? cachedHistory.length : 0);
    }
    
    let itemsToFilter = cachedHistory || [];

    if (filter) {
      const lowerCaseFilter = filter.toLowerCase().trim();
      if (lowerCaseFilter) {
        itemsToFilter = itemsToFilter.filter(item => {
          const hasTag = item.tags && item.tags.some(tag => tag.toLowerCase().includes(lowerCaseFilter));
          const isDecrypted = item.encryptionStatus === 'decrypted' || item.encryptionStatus === 'plaintext';
          const hasPasswordMatch = isDecrypted && item.password && item.password.toLowerCase().includes(lowerCaseFilter);
          return hasTag || hasPasswordMatch;
        });
      }
    }
    
    return itemsToFilter;

  } catch (e) {
    logError(e, "getCachedHistory");
    return []; // Возвращаем пустой массив в случае ошибки
  }
}

/* Commenting out unused function
function updateHistory(passwordStorage, historyList, createHistoryItem, applyVisibilityState, masterPassword = null) {
  loadPasswordHistory(passwordStorage, historyList, createHistoryItem, applyVisibilityState, masterPassword);
}
*/

/**
 * Загружает состояние видимости истории паролей
 * @param {Object} passwordStorage - Хранилище паролей
 * @returns {Promise<boolean>} true, если история видима
 */
export async function loadVisibilityState(passwordStorage) {
  const settings = await passwordStorage.getSettings();
  return settings.historyVisible !== false; // default to true if not set
}

export function invalidateHistoryCache() {
  console.log("[history.js invalidateHistoryCache] Cache invalidated.");
  cachedHistory = null;
}
