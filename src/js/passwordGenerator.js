/**
 * Module for generating random passwords with configurable options
 */
import { t } from "../popup/i18n.js";
import { getCryptoRandomInt } from "../popup/helpers.js";

const LOWERCASE_CHARS = "abcdefghijklmnopqrstuvwxyz";
const UPPERCASE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const NUMBER_CHARS = "0123456789";
const SPECIAL_CHARS = "!@#$%^&*()_+-=[]{}|;:,.<>?";
const SIMILAR_CHARS = "iIlL1oO0";
const AMBIGUOUS_CHARS = "{}[]()/'\"~,;:.<>";

/**
 * Генератор паролей с поддержкой различных опций
 */
class PasswordGenerator {
  constructor() {
    this.lowercaseChars = LOWERCASE_CHARS;
    this.uppercaseChars = UPPERCASE_CHARS;
    this.numberChars = NUMBER_CHARS;
    this.specialChars = SPECIAL_CHARS;
    this.similarChars = SIMILAR_CHARS;
    this.ambiguousChars = AMBIGUOUS_CHARS;
  }

  /**
   * Генерирует случайный пароль по заданным настройкам
   * @param {Object} options - Опции генерации
   * @param {number} options.length - Длина пароля
   * @param {boolean} options.lowercase - Использовать строчные буквы
   * @param {boolean} options.uppercase - Использовать заглавные буквы
   * @param {boolean} options.numbers - Использовать цифры
   * @param {boolean} options.special - Использовать спецсимволы
   * @param {boolean} options.excludeSimilar - Исключить похожие символы
   * @param {boolean} options.excludeAmbiguous - Исключить неоднозначные символы
   * @returns {string} Сгенерированный пароль
   */
  generatePassword(options) {
    const {
      length = 16,
      lowercase = true,
      uppercase = true,
      numbers = true,
      special = true,
      excludeSimilar = false,
      excludeAmbiguous = false,
    } = options;

    if (!lowercase && !uppercase && !numbers && !special) {
      throw new Error("At least one character set must be selected");
    }

    if (length < 4 || length > 64) {
      throw new Error("Password length must be between 4 and 64 characters");
    }

    let availableChars = "";
    let requiredChars = [];

    if (lowercase) {
      availableChars += this.lowercaseChars;
      requiredChars.push(this._getRandomChar(this.lowercaseChars));
    }

    if (uppercase) {
      availableChars += this.uppercaseChars;
      requiredChars.push(this._getRandomChar(this.uppercaseChars));
    }

    if (numbers) {
      availableChars += this.numberChars;
      requiredChars.push(this._getRandomChar(this.numberChars));
    }

    if (special) {
      availableChars += this.specialChars;
      requiredChars.push(this._getRandomChar(this.specialChars));
    }

    if (excludeSimilar) {
      for (const char of this.similarChars) {
        availableChars = availableChars.replace(new RegExp(char, "g"), "");
      }
    }

    if (excludeAmbiguous) {
      for (const char of this.ambiguousChars) {
        const escapedChar = char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        availableChars = availableChars.replace(new RegExp(escapedChar, "g"), "");
      }
    }

    if (!availableChars) {
      throw new Error("Нет доступных символов для генерации пароля. Проверьте настройки.");
    }

    let password = "";

    if (requiredChars.length > 0) {
      this._shuffleArray(requiredChars);
      password = requiredChars.join("");
    }

    while (password.length < length) {
      password += this._getRandomChar(availableChars);
    }

    return this._shuffleString(password);
  }

  /**
   * Оценивает силу пароля
   * @param {string} password - Пароль для оценки
   * @returns {{score: number, label: string}} Результат оценки
   */
  calculateStrength(password) {
    if (!password) return { score: 0, label: "None" };

    let score = 0;
    const length = password.length;

    score += Math.min(length * 4, 40);

    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[^a-zA-Z0-9]/.test(password);

    const typesCount = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
    score += typesCount * 10;

    if (hasLower && hasUpper) score += 5;
    if ((hasLower || hasUpper) && hasNumber) score += 5;
    if ((hasLower || hasUpper || hasNumber) && hasSpecial) score += 5;

    let repeats = 0;
    const chars = {};

    for (const char of password) {
      chars[char] = (chars[char] || 0) + 1;
    }

    for (const char in chars) {
      if (chars[char] > 1) {
        repeats += chars[char] - 1;
      }
    }

    score -= repeats * 2;

    let sequenceCount = 0;
    for (let i = 0; i < password.length - 2; i++) {
      const c1 = password.charCodeAt(i);
      const c2 = password.charCodeAt(i + 1);
      const c3 = password.charCodeAt(i + 2);

      if ((c1 + 1 === c2 && c2 + 1 === c3) || (c1 - 1 === c2 && c2 - 1 === c3)) {
        sequenceCount++;
      }
    }
    score -= sequenceCount * 3;

    const commonWords = ["password", "123456", "qwerty", "admin", "welcome", "letmein"];
    for (const word of commonWords) {
      if (password.toLowerCase().includes(word)) {
        score -= 10;
        break;
      }
    }

    score = Math.max(0, Math.min(score, 100));

    let label;
    if (score <= 40) label = t("veryWeak");
    else if (score < 50) label = t("weak");
    else if (score < 65) label = t("medium");
    else if (score < 80) label = t("strong");
    else label = t("veryStrong");

    return { score, label };
  }

  /**
   * Get random character from string
   *
   * @private
   * @param {string} chars - String with available characters
   * @returns {string} One random character
   */
  _getRandomChar(chars) {
    return chars.charAt(getCryptoRandomInt(chars.length));
  }

  /**
   * Shuffle array using Fisher-Yates algorithm
   *
   * @private
   * @param {Array} array - Array to shuffle
   */
  _shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = getCryptoRandomInt(i + 1);
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  /**
   * Shuffle string
   *
   * @private
   * @param {string} str - String to shuffle
   * @returns {string} Shuffled string
   */
  _shuffleString(str) {
    const array = str.split("");
    this._shuffleArray(array);
    return array.join("");
  }
}

export default PasswordGenerator;
