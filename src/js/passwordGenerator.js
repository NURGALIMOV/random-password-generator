/**
 * Module for generating random passwords with configurable options
 */
class PasswordGenerator {
  constructor() {
    this.lowercaseChars = "abcdefghijklmnopqrstuvwxyz";
    this.uppercaseChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    this.numberChars = "0123456789";
    this.specialChars = "!@#$%^&*()_+-=[]{}|;:,.<>?";
    this.similarChars = "iIlL1oO0";
    this.ambiguousChars = "{}[]()/'\"~,;:.<>";
  }

  /**
   * Generate random password based on given settings
   *
   * @param {Object} options - Password options
   * @param {number} options.length - Desired password length
   * @param {boolean} options.lowercase - Whether to include lowercase letters
   * @param {boolean} options.uppercase - Whether to include uppercase letters
   * @param {boolean} options.numbers - Whether to include numbers
   * @param {boolean} options.special - Whether to include special characters
   * @param {boolean} options.excludeSimilar - Whether to exclude similar characters
   * @param {boolean} options.excludeAmbiguous - Whether to exclude ambiguous characters
   * @returns {string} Generated password
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
        availableChars = availableChars.replace(
          new RegExp(escapedChar, "g"),
          "",
        );
      }
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
   * Calculate password strength
   *
   * @param {string} password - Password to evaluate
   * @returns {Object} Object containing score and strength label
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

    const typesCount = [hasLower, hasUpper, hasNumber, hasSpecial].filter(
      Boolean,
    ).length;
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

      if (
        (c1 + 1 === c2 && c2 + 1 === c3) ||
        (c1 - 1 === c2 && c2 - 1 === c3)
      ) {
        sequenceCount++;
      }
    }
    score -= sequenceCount * 3;

    const commonWords = [
      "password",
      "123456",
      "qwerty",
      "admin",
      "welcome",
      "letmein",
    ];
    for (const word of commonWords) {
      if (password.toLowerCase().includes(word)) {
        score -= 10;
        break;
      }
    }

    score = Math.max(0, Math.min(score, 100));

    let label;
    if (score <= 40) label = "Very Weak";
    else if (score < 50) label = "Weak";
    else if (score < 65) label = "Medium";
    else if (score < 80) label = "Strong";
    else label = "Very Strong";

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
    return chars.charAt(Math.floor(Math.random() * chars.length));
  }

  /**
   * Shuffle array using Fisher-Yates algorithm
   *
   * @private
   * @param {Array} array - Array to shuffle
   */
  _shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
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

window.PasswordGenerator = PasswordGenerator;
