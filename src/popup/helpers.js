// helpers.js — вспомогательные функции для приложения

/**
 * Копирует текст в буфер обмена
 * @param {string} text - Текст для копирования
 * @returns {Promise<boolean>} true, если успешно, иначе false
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error("Could not copy text: ", err);
    return false;
  }
}

/**
 * Генерирует уникальный id (например, для истории)
 * @returns {string} Уникальный идентификатор
 */
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Можно добавить другие утилиты по мере необходимости
