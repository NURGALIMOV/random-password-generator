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

/**
 * Криптостойкая генерация случайного целого числа в диапазоне [0, max)
 * @param {number} max - Верхняя граница (не включительно)
 * @returns {number} Случайное число
 */
export function getCryptoRandomInt(max) {
  if (window.crypto && typeof window.crypto.getRandomValues === 'function') {
    if (max <= 0 || max > Number.MAX_SAFE_INTEGER) throw new Error('Invalid max value');
    const array = new Uint32Array(1);
    let rand;
    do {
      window.crypto.getRandomValues(array);
      rand = array[0] & 0x7fffffff; // только положительные числа
    } while (rand >= Math.floor(0x7fffffff / max) * max);
    return rand % max;
  } else {
    // fallback на Math.random (не рекомендуется)
    return Math.floor(Math.random() * max);
  }
}

// Можно добавить другие утилиты по мере необходимости
