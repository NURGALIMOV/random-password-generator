// helpers.js — вспомогательные функции для приложения

/**
 * Копирует текст в буфер обмена
 * @param {string} text - Текст для копирования
 * @returns {Promise<boolean>} true, если успешно, иначе false
 */
export async function copyToClipboard(text) {
  if (!navigator.clipboard || !navigator.clipboard.writeText) {
    console.error("Clipboard API not available.");
    throw new Error("Clipboard API not available.");
  }
  if (typeof text !== 'string' || text.length === 0) {
    console.error("Text to copy is invalid or empty.");
    // Optionally, you could throw an error here or handle it as a non-critical failure
    // For now, let's throw to ensure the calling code knows it failed.
    throw new Error("Text to copy is invalid or empty.");
  }
  try {
    await navigator.clipboard.writeText(text);
    // No explicit return true needed if we rely on absence of error
  } catch (err) {
    console.error("Could not copy text: ", err);
    // Re-throw the error so the caller can handle it
    throw err;
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

// Small English word list for mnemonic password generation (expand as needed)
export const mnemonicWordList = [
  "apple", "river", "table", "cloud", "stone", "forest", "light", "dream", "music", "ocean",
  "mountain", "shadow", "flower", "window", "sun", "moon", "star", "tree", "field", "sky",
  "fire", "water", "earth", "wind", "bird", "wolf", "fox", "bear", "lion", "tiger",
  "rose", "leaf", "grass", "rain", "snow", "storm", "wave", "sand", "rock", "hill",
  "book", "pen", "paper", "glass", "door", "road", "car", "train", "plane", "ship",
  "fish", "horse", "dog", "cat", "mouse", "frog", "bee", "ant", "snake", "spider",
  "king", "queen", "prince", "knight", "castle", "sword", "shield", "crown", "ring", "coin",
  "milk", "bread", "cheese", "fruit", "cake", "sugar", "salt", "honey", "butter", "egg",
  "red", "blue", "green", "yellow", "white", "black", "orange", "purple", "pink", "gray",
  "happy", "sad", "brave", "calm", "kind", "smart", "strong", "quick", "wise", "funny",
  "quiet", "loud", "soft", "hard", "warm", "cold", "sweet", "bitter", "fresh", "old",
  "young", "fast", "slow", "deep", "high", "low", "long", "short", "wide", "narrow",
  "round", "square", "sharp", "flat", "thick", "thin", "clean", "dirty", "rich", "poor",
  "north", "south", "east", "west", "center", "left", "right", "top", "bottom", "middle",
  "open", "close", "start", "end", "first", "last", "early", "late", "new", "old",
  "day", "night", "week", "month", "year", "hour", "minute", "second", "time", "clock",
  "city", "village", "town", "street", "house", "room", "wall", "floor", "roof", "gate",
  "school", "class", "lesson", "teacher", "student", "child", "parent", "friend", "enemy", "guest",
  "work", "rest", "play", "game", "sport", "run", "walk", "jump", "swim", "ride",
  "love", "hate", "hope", "fear", "wish", "plan", "dream", "goal", "luck", "chance"
];

// Можно добавить другие утилиты по мере необходимости
