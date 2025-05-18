/**
 * Module for generating random passwords with configurable options
 */
import { t } from "../popup/i18n.js";
import { getCryptoRandomInt, mnemonicWordList } from "../popup/helpers.js";

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
   * @param {string} options.template - Шаблон для генерации пароля
   * @returns {string} Сгенерированный пароль
   */
  generatePassword(options) {
    const {
      length = 16,
      lowercase = true,
      uppercase = true,
      numbers = true,
      special = true,
      template = ""
    } = options;

    if (!lowercase && !uppercase && !numbers && !special && !(template && template.trim().length > 0) ) {
      throw new Error(t("errorNoCharSetSelected") || "At least one character set must be selected or a template provided.");
    }

    // Length validation applies primarily to non-template, but template output also implicitly has a length.
    if (!(template && template.trim().length > 0) && (length < 4 || length > 64)) {
      throw new Error(t("errorInvalidPasswordLength") || "Password length must be between 4 and 64 characters for non-template mode.");
    }

    const charSets = this._buildCharacterSets(options);

    if (!charSets.allAllowed && !(template && template.trim().length > 0 && options.templateAllowsLiterals === true /* hypothetical future option */ )) {
        // If not even literals are allowed in template, and all charsets are empty, then error.
        // The check for charSets.allAllowed inside _generateFromTemplate handles cases where specific template chars (L,U,l etc) have no pool.
        // This top-level check is for when *nothing* is available for generation.
        if (!template || template.trim().length === 0 || !this._templateContainsOnlyPlaceholders(template, charSets)) {
            throw new Error(t("errorNoAvailableChars") || "No available characters for password generation after applying exclusions. Check your settings.");
        }
    }
    
    if (template && template.trim().length > 0) {
      return this._generateFromTemplate(template.trim(), charSets);
    } else {
      return this._generateStandard(options, charSets);
    }
  }

  _generateFromTemplate(template, charSets) {
    let result = "";
    if (!charSets.allAllowed) {
      throw new Error(t("errorNoCharsForTemplate") || "No available characters for template-based generation. Check your settings.");
    }
    for (let i = 0; i < template.length; i++) {
      const c = template[i];
      if (c === "L") {
        if (!charSets.allLetters) throw new Error(t("errorNoLettersForTemplateL") || "No letters available for 'L' in template.");
        result += this._getRandomChar(charSets.allLetters);
      } else if (c === "U") {
        if (!charSets.uppercase) throw new Error(t("errorNoUppercaseForTemplateU") || "No uppercase letters available for 'U' in template.");
        result += this._getRandomChar(charSets.uppercase);
      } else if (c === "l") {
        if (!charSets.lowercase) throw new Error(t("errorNoLowercaseForTemplatel") || "No lowercase letters available for 'l' in template.");
        result += this._getRandomChar(charSets.lowercase);
      } else if (c === "#") {
        if (!charSets.numbers) throw new Error(t("errorNoDigitsForTemplateHash") || "No digits available for '#' in template.");
        result += this._getRandomChar(charSets.numbers);
      } else if (c === "@") {
        if (!charSets.special) throw new Error(t("errorNoSpecialForTemplateAt") || "No special characters available for '@' in template.");
        result += this._getRandomChar(charSets.special);
      } else if (c === "*") {
        result += this._getRandomChar(charSets.allAllowed);
      } else {
        result += c; // Insert literal character
      }
    }
    return result;
  }

  _generateStandard(options, charSets) {
    const { length } = options;
    let password = "";
    let requiredChars = [];

    if (options.lowercase && charSets.lowercase) {
      requiredChars.push(this._getRandomChar(charSets.lowercase));
    }
    if (options.uppercase && charSets.uppercase) {
      requiredChars.push(this._getRandomChar(charSets.uppercase));
    }
    if (options.numbers && charSets.numbers) {
      requiredChars.push(this._getRandomChar(charSets.numbers));
    }
    if (options.special && charSets.special) {
      requiredChars.push(this._getRandomChar(charSets.special));
    }

    if (requiredChars.length > length) {
        // This case should be rare if length validation (min 4) is done before, 
        // but if all types are required and length is too small, we prioritize filling length.
        this._shuffleArray(requiredChars);
        password = requiredChars.slice(0, length).join('');
        return this._shuffleString(password); // Ensure final shuffle
    }

    if (requiredChars.length > 0) {
      this._shuffleArray(requiredChars);
      password = requiredChars.join("");
    }

    const remainingLength = length - password.length;
    for (let i = 0; i < remainingLength; i++) {
      if (!charSets.allAllowed) break; // Should have been caught earlier by allAllowed check
      password += this._getRandomChar(charSets.allAllowed);
    }
    
    return this._shuffleString(password);
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

  /**
   * Генерирует мнемонический пароль с расширенными опциями
   * @param {Object} options
   * @returns {string} Мнемонический пароль
   */
  generateMnemonicPassword(options) {
    let {
      wordCount = 4,
      separator = "-",
      caseType = "lower",
      mnemonicCustomWordsArray = [],
      useOnlyCustom = false,
      minWordLen,
      maxWordLen,
      noRepeats = false,
      prefix = "",
      suffix = "",
      randomCase = false,
      leet = false,
      addYear = false,
      yearPos = "none",
      shuffle = false,
      insertBetween = false,
      insertInside = false
    } = options;

    // Parse custom words - Now directly use mnemonicCustomWordsArray if it's an array
    let userWords = [];
    if (Array.isArray(mnemonicCustomWordsArray)) {
      userWords = mnemonicCustomWordsArray.map(w => String(w).trim()).filter(Boolean);
    }
    
    let baseWordList = useOnlyCustom ? userWords : [...mnemonicWordList, ...userWords];

    // Filter by min/max word length
    if (minWordLen) baseWordList = baseWordList.filter(w => w.length >= parseInt(minWordLen));
    if (maxWordLen) baseWordList = baseWordList.filter(w => w.length <= parseInt(maxWordLen));
    if (baseWordList.length === 0) baseWordList = [...mnemonicWordList]; // fallback

    // Shuffle word list if needed
    let wordList = [...baseWordList];
    if (shuffle) this._shuffleArray(wordList);

    // Pick words
    let chosen = [];
    let used = new Set();
    for (let i = 0; i < wordCount; i++) {
      let pool = noRepeats ? wordList.filter(w => !used.has(w)) : wordList;
      if (pool.length === 0) pool = [...baseWordList];
      let word = pool[getCryptoRandomInt(pool.length)];
      if (noRepeats) used.add(word);
      chosen.push(word);
    }

    // Apply case
    chosen = chosen.map(word => {
      if (randomCase) {
        const r = getCryptoRandomInt(3);
        if (r === 0) return word.toLowerCase();
        if (r === 1) return word.toUpperCase();
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      } else if (caseType === "upper") return word.toUpperCase();
      else if (caseType === "capitalized") return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      else return word.toLowerCase();
    });

    // Leet substitutions
    if (leet) {
      const leetMap = { a: "@", o: "0", e: "3", i: "1", s: "$", l: "1", t: "+", b: "8", g: "9" };
      chosen = chosen.map(word => word.replace(/[aoeisl tbg]/gi, c => leetMap[c.toLowerCase()] || c));
    }

    // Insert number/symbol between words
    if (insertBetween) {
      const symbols = "0123456789!@#$%^&*";
      let withInserts = [];
      for (let i = 0; i < chosen.length; i++) {
        withInserts.push(chosen[i]);
        if (i < chosen.length - 1) {
          withInserts.push(symbols[getCryptoRandomInt(symbols.length)]);
        }
      }
      chosen = withInserts;
    }

    // Insert number/symbol inside words
    if (insertInside) {
      const symbols = "0123456789!@#$%^&*";
      chosen = chosen.map(word => {
        if (word.length < 2) return word;
        const pos = getCryptoRandomInt(word.length + 1);
        const sym = symbols[getCryptoRandomInt(symbols.length)];
        return word.slice(0, pos) + sym + word.slice(pos);
      });
    }

    // Add year/date
    let yearStr = "";
    if (addYear) {
      const now = new Date();
      yearStr = now.getFullYear().toString();
    }

    // Add prefix/suffix
    let result = chosen.join(separator);
    if (prefix) result = prefix + (separator || '') + result;
    if (suffix) result = result + (separator || '') + suffix;
    if (addYear && yearPos === "start") result = yearStr + (separator || '') + result;
    if (addYear && yearPos === "end") result = result + (separator || '') + yearStr;

    return result;
  }

  _buildCharacterSets(options) {
    const {
      lowercase = true,
      uppercase = true,
      numbers = true,
      special = true,
      excludeSimilar = false,
      excludeAmbiguous = false,
    } = options;

    let localLowercaseChars = lowercase ? this.lowercaseChars : "";
    let localUppercaseChars = uppercase ? this.uppercaseChars : "";
    let localNumberChars = numbers ? this.numberChars : "";
    let localSpecialChars = special ? this.specialChars : "";

    if (excludeSimilar) {
      const similarRegex = new RegExp(`[${this.similarChars}]`, "g");
      if (localLowercaseChars) localLowercaseChars = localLowercaseChars.replace(similarRegex, "");
      if (localUppercaseChars) localUppercaseChars = localUppercaseChars.replace(similarRegex, "");
      if (localNumberChars) localNumberChars = localNumberChars.replace(similarRegex, "");
      // Special characters are less likely to be 'similar' in the iIlL1oO0 sense, but consider if needed
      // if (localSpecialChars) localSpecialChars = localSpecialChars.replace(similarRegex, ""); 
    }

    if (excludeAmbiguous) {
      // Escape ambiguous characters for use in RegExp, as they might include regex special chars
      const ambiguousRegex = new RegExp(`[${this.ambiguousChars.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}]`, "g");
      if (localLowercaseChars) localLowercaseChars = localLowercaseChars.replace(ambiguousRegex, "");
      if (localUppercaseChars) localUppercaseChars = localUppercaseChars.replace(ambiguousRegex, "");
      if (localNumberChars) localNumberChars = localNumberChars.replace(ambiguousRegex, "");
      if (localSpecialChars) localSpecialChars = localSpecialChars.replace(ambiguousRegex, "");
    }

    const allLetters = localLowercaseChars + localUppercaseChars;
    let allAllowed = "";
    if (localLowercaseChars) allAllowed += localLowercaseChars;
    if (localUppercaseChars) allAllowed += localUppercaseChars;
    if (localNumberChars) allAllowed += localNumberChars;
    if (localSpecialChars) allAllowed += localSpecialChars;

    return {
      lowercase: localLowercaseChars,
      uppercase: localUppercaseChars,
      numbers: localNumberChars,
      special: localSpecialChars,
      allLetters: allLetters,
      allAllowed: allAllowed,
    };
  }

  // Helper to check if template can still generate if all charsets are empty (e.g. template is just "-!-")
  _templateContainsOnlyPlaceholders(template, charSets) {
    for (const char of template) {
        if (['L', 'U', 'l', '#', '@', '*'].includes(char)) {
            // If any placeholder is present, it requires a character set
            if (char === 'L' && !charSets.allLetters) return false;
            if (char === 'U' && !charSets.uppercase) return false;
            if (char === 'l' && !charSets.lowercase) return false;
            if (char === '#' && !charSets.numbers) return false;
            if (char === '@' && !charSets.special) return false;
            if (char === '*' && !charSets.allAllowed) return false;
        }
    }
    return true; // Contains no placeholders or all placeholders have available chars
  }
}

export default PasswordGenerator;
