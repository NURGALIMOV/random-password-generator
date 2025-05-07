// constants.js — основные константы для приложения

/**
 * Сообщения для всплывающих уведомлений (toast)
 * @type {{passwordCopied: string, passwordCopyFailed: string, historyCleared: string, selectCharType: string}}
 */
export const TOAST_MESSAGES = {
  passwordCopied: "Password copied to clipboard",
  passwordCopyFailed: "Failed to copy password",
  passwordDeleted: "Password deleted",
  historyCleared: "Password history cleared",
  selectCharType: "Please select at least one character type",
  deleteConfirm: "Delete this password?",
};

/**
 * Диапазоны и значения по умолчанию для длины пароля
 * @type {{min: number, max: number, default: number}}
 */
export const PASSWORD_LENGTH = {
  min: 4,
  max: 64,
  default: 16,
};

/**
 * Список часто используемых (слабых) паролей
 * @type {string[]}
 */
export const COMMON_WORDS = ["password", "123456", "qwerty", "admin", "welcome", "letmein"];

// Можно добавить другие константы по мере необходимости
