import PasswordGenerator from "../js/passwordGenerator.js";
import PasswordStorage from "../js/storage.js";
import { showToast, createHistoryItem } from "./ui.js";
import { applyTheme, handleThemeChange, initializeTheme } from "./theme.js";
import { loadPasswordHistory, invalidateHistoryCache } from "./history.js";
import { initEventHandlers } from "./events.js";
import { TOAST_MESSAGES } from "./constants.js";
import { copyToClipboard } from "./helpers.js";
import { t, setLang, getCurrentLang } from "./i18n.js";
import { logEvent, logError } from "./logger.js";

/**
 * UI Control for Password Generator Extension
 */
document.addEventListener("DOMContentLoaded", async function () {
  const passwordGenerator = new PasswordGenerator();
  const passwordStorage = new PasswordStorage();

  const passwordOutput = document.getElementById("passwordOutput");
  const copyButton = document.getElementById("copyButton");
  const generateButton = document.getElementById("generateButton");
  const passwordLengthInput = document.getElementById("passwordLength");
  const lengthValue = document.getElementById("lengthValue");
  const lowercaseCheckbox = document.getElementById("lowercase");
  const uppercaseCheckbox = document.getElementById("uppercase");
  const numbersCheckbox = document.getElementById("numbers");
  const specialCheckbox = document.getElementById("special");
  const excludeSimilarCheckbox = document.getElementById("excludeSimilar");
  const excludeAmbiguousCheckbox = document.getElementById("excludeAmbiguous");
  const tabButtons = document.querySelectorAll(".tab-button");
  const tabContents = document.querySelectorAll(".tab-content");
  const clearHistoryButton = document.getElementById("clearHistoryButton");
  const historyList = document.getElementById("historyList");
  const strengthIndicator = document.getElementById("strengthIndicator");
  const strengthText = document.getElementById("strengthText");

  // Theme switcher functionality
  const themeOptions = document.querySelectorAll(".theme-options-row .theme-option");

  // Password visibility toggle
  const togglePasswordButton = document.getElementById("togglePasswordButton");
  const eyeIcon = togglePasswordButton.querySelector(".eye-icon");
  const eyeOffIcon = togglePasswordButton.querySelector(".eye-off-icon");

  togglePasswordButton.addEventListener("click", () => {
    const type = passwordOutput.getAttribute("type") === "password" ? "text" : "password";
    passwordOutput.setAttribute("type", type);

    // Toggle icons
    eyeIcon.style.display = type === "password" ? "block" : "none";
    eyeOffIcon.style.display = type === "password" ? "none" : "block";
  });

  const toggleHistoryVisibilityButton = document.getElementById("toggleHistoryVisibilityButton");
  const historyEyeIcon = toggleHistoryVisibilityButton.querySelector(".eye-off-icon");
  const historyEyeOffIcon = toggleHistoryVisibilityButton.querySelector(".eye-icon");

  let isHistoryVisible = true;

  // Load saved visibility state
  async function loadVisibilityState(passwordStorage) {
    const settings = await passwordStorage.getSettings();
    isHistoryVisible = settings.historyVisible !== false; // default to true if not set

    // Update icons
    historyEyeIcon.style.display = isHistoryVisible ? "block" : "none";
    historyEyeOffIcon.style.display = isHistoryVisible ? "none" : "block";
  }

  // Apply visibility state to passwords
  function applyVisibilityState(isHistoryVisible) {
    const historyPasswords = document.querySelectorAll(".history-password");
    historyPasswords.forEach((password) => {
      if (isHistoryVisible) {
        password.classList.remove("masked");
      } else {
        password.classList.add("masked");
      }
    });
  }

  toggleHistoryVisibilityButton.addEventListener("click", async () => {
    isHistoryVisible = !isHistoryVisible;
    applyVisibilityState(isHistoryVisible);

    // Toggle icons - show crossed eye when password is visible
    historyEyeIcon.style.display = isHistoryVisible ? "block" : "none";
    historyEyeOffIcon.style.display = isHistoryVisible ? "none" : "block";

    // Save visibility state
    const settings = await passwordStorage.getSettings();
    settings.historyVisible = isHistoryVisible;
    await passwordStorage.saveSettings(settings);
  });

  // Load visibility state on startup
  await loadVisibilityState(passwordStorage);

  async function loadSettings() {
    const settings = await passwordStorage.getSettings();

    passwordLengthInput.value = settings.length;
    lengthValue.textContent = settings.length;
    lowercaseCheckbox.checked = settings.lowercase;
    uppercaseCheckbox.checked = settings.uppercase;
    numbersCheckbox.checked = settings.numbers;
    specialCheckbox.checked = settings.special;
    excludeSimilarCheckbox.checked = settings.excludeSimilar;
    excludeAmbiguousCheckbox.checked = settings.excludeAmbiguous;
  }

  async function saveSettings() {
    const settings = {
      length: parseInt(passwordLengthInput.value),
      lowercase: lowercaseCheckbox.checked,
      uppercase: uppercaseCheckbox.checked,
      numbers: numbersCheckbox.checked,
      special: specialCheckbox.checked,
      excludeSimilar: excludeSimilarCheckbox.checked,
      excludeAmbiguous: excludeAmbiguousCheckbox.checked,
    };

    await passwordStorage.saveSettings(settings);
  }

  /**
   * Get current settings from UI
   */
  function getCurrentSettings() {
    return {
      length: parseInt(passwordLengthInput.value),
      lowercase: lowercaseCheckbox.checked,
      uppercase: uppercaseCheckbox.checked,
      numbers: numbersCheckbox.checked,
      special: specialCheckbox.checked,
      excludeSimilar: excludeSimilarCheckbox.checked,
      excludeAmbiguous: excludeAmbiguousCheckbox.checked,
    };
  }

  async function generatePassword() {
    try {
      if (
        !lowercaseCheckbox.checked &&
        !uppercaseCheckbox.checked &&
        !numbersCheckbox.checked &&
        !specialCheckbox.checked
      ) {
        showToast(t("selectCharType") || TOAST_MESSAGES.pleaseSelectAtLeastOneCharacterType);
        return;
      }

      const settings = getCurrentSettings();
      const newPassword = passwordGenerator.generatePassword(settings);

      passwordOutput.value = newPassword;
      updateStrengthMeter(newPassword);

      await passwordStorage.savePassword(newPassword);

      const historyTab = document.getElementById("history");
      if (historyTab.classList.contains("active")) {
        invalidateHistoryCache();
        loadPasswordHistory(passwordStorage, historyList, createHistoryItem, (v) =>
          applyVisibilityState(isHistoryVisible),
        );
      }
    } catch (error) {
      showToast(t("error") || error.message);
    }
  }

  /**
   * Update the strength meter for the current password
   */
  function updateStrengthMeter(password) {
    if (!password) {
      strengthIndicator.style.width = "0%";
      strengthIndicator.style.backgroundColor = "#ddd";
      strengthText.textContent = t("none") || "None";
      return;
    }

    const strength = passwordGenerator.calculateStrength(password);

    strengthIndicator.style.width = `${strength.score}%`;

    if (strength.score < 20) {
      strengthIndicator.style.backgroundColor = "#ff4040";
    } else if (strength.score < 40) {
      strengthIndicator.style.backgroundColor = "#ff8040";
    } else if (strength.score < 60) {
      strengthIndicator.style.backgroundColor = "#ffbf40";
    } else if (strength.score < 80) {
      strengthIndicator.style.backgroundColor = "#80c040";
    } else {
      strengthIndicator.style.backgroundColor = "#40a040";
    }

    strengthText.textContent = strength.label;
  }

  function switchTab(targetTab) {
    tabButtons.forEach((button) => {
      if (button.dataset.tab === targetTab) {
        button.classList.add("active");
      } else {
        button.classList.remove("active");
      }
    });

    tabContents.forEach((content) => {
      if (content.id === targetTab) {
        content.classList.add("active");

        if (targetTab === "history") {
          loadPasswordHistory(passwordStorage, historyList, createHistoryItem, (v) =>
            applyVisibilityState(isHistoryVisible),
          );
        }
      } else {
        content.classList.remove("active");
      }
    });
  }

  generateButton.addEventListener("click", generatePassword);

  copyButton.addEventListener("click", () => {
    if (passwordOutput.value) {
      copyToClipboard(passwordOutput.value);
    }
  });

  passwordLengthInput.addEventListener("input", () => {
    lengthValue.textContent = passwordLengthInput.value;
    saveSettings();
  });

  const checkboxes = [
    lowercaseCheckbox,
    uppercaseCheckbox,
    numbersCheckbox,
    specialCheckbox,
    excludeSimilarCheckbox,
    excludeAmbiguousCheckbox,
  ];

  checkboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", saveSettings);
  });

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      switchTab(button.dataset.tab);
    });
  });

  function showConfirmDialog(message, onConfirm) {
    const existingToast = document.querySelector(".success-message");
    if (existingToast) {
      existingToast.remove();
    }

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
        onConfirm();
      }, 300);
    });

    noButton.addEventListener("click", () => {
      toast.classList.remove("show");
      setTimeout(() => {
        toast.remove();
      }, 300);
    });
  }

  clearHistoryButton.addEventListener("click", async () => {
    showConfirmDialog(t("clearHistoryConfirm"), async () => {
      await passwordStorage.clearHistory();
      invalidateHistoryCache();
      await loadPasswordHistory(passwordStorage, historyList, createHistoryItem, (v) =>
        applyVisibilityState(isHistoryVisible),
      );
      showToast(t("historyCleared"));
    });
  });

  // Обработка кликов по кнопкам тем
  themeOptions.forEach((option) => {
    option.addEventListener("click", async () => {
      const theme = option.dataset.theme;
      await handleThemeChange(theme, passwordStorage, null, themeOptions);
    });
  });

  // Listen for system theme changes
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", async (e) => {
    const savedTheme = await passwordStorage.getTheme();
    if (savedTheme === "system") {
      await applyTheme("system", null, themeOptions);
    }
  });

  // Initialize theme on load
  initializeTheme(passwordStorage, null, themeOptions);

  await loadSettings();
  generatePassword();

  // Call initEventHandlers after all dependencies are loaded
  initEventHandlers({
    generateButton,
    generatePassword,
    copyButton,
    passwordOutput,
    showToast,
    passwordLengthInput,
    lengthValue,
    saveSettings,
    checkboxes,
    tabButtons,
    switchTab,
    clearHistoryButton,
    showConfirmDialog,
    passwordStorage,
    historyList,
    createHistoryItem,
    applyVisibilityState,
    isHistoryVisible,
    loadPasswordHistory,
  });

  // Делегирование событий для истории паролей
  historyList.addEventListener("click", async (e) => {
    const itemEl = e.target.closest(".history-item");
    if (!itemEl) return;
    const id = itemEl.dataset.id;
    const passwordSpan = itemEl.querySelector(".history-password");
    const password = passwordSpan ? passwordSpan.textContent : "";

    if (e.target.closest(".history-copy")) {
      try {
        const ok = await copyToClipboard(password);
        showToast(ok ? t("passwordCopied") : t("passwordCopyFailed"));
        logEvent("password_copied", { length: password.length });
        // Copy message
        const copyMsg = document.getElementById("copyMessage");
        if (copyMsg) copyMsg.textContent = t("passwordCopied") || "Password copied to clipboard!";
      } catch (err) {
        showToast(t("passwordCopyFailed"));
        logError(err, "copy_password");
      }
    }

    if (e.target.closest(".history-delete")) {
      showConfirmDialog(t("deleteConfirm"), async () => {
        try {
          await passwordStorage.deletePassword(id);
          invalidateHistoryCache();
          showToast(t("passwordDeleted"));
          logEvent("password_deleted", { id });
          loadPasswordHistory(passwordStorage, historyList, createHistoryItem, () => applyVisibilityState(isHistoryVisible));
        } catch (err) {
          showToast(t("deleteFailed") || "Failed to delete password");
          logError(err, "delete_password");
        }
      });
    }
  });

  // Универсальная локализация всех элементов
  function localizeAll() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key && t(key)) el.textContent = t(key);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key && t(key)) el.setAttribute('placeholder', t(key));
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      if (key && t(key)) el.setAttribute('title', t(key));
    });
  }

  // Локализуем всё при загрузке
  localizeAll();
  updateStrengthMeter(passwordOutput.value);

  const langSelect = document.getElementById("langSelect");
  const initialLang = getCurrentLang();
  setLang(initialLang);
  if (langSelect) {
    langSelect.value = initialLang;
    langSelect.addEventListener("change", (e) => {
      setLang(e.target.value);
      localizeAll();
      updateStrengthMeter(passwordOutput.value);
      // Перерисовать все тексты на UI/UX
      document.querySelector("header h1").textContent = t("appTitle") || "Random Password Generator";
      document.querySelector(".subtitle").textContent = t("subtitle") || "Generate secure passwords instantly";
      // Вкладки
      const tabButtons = document.querySelectorAll(".tab-button");
      if (tabButtons[0]) tabButtons[0].lastChild.textContent = t("settingsTab") || "Settings";
      if (tabButtons[1]) tabButtons[1].lastChild.textContent = t("historyTab") || "History";
      // Кнопка генерации
      const genBtn = document.getElementById("generateButton");
      if (genBtn) genBtn.textContent = t("generateBtn") || "Generate New Password";
      // Плейсхолдер поля пароля
      const passOut = document.getElementById("passwordOutput");
      if (passOut) passOut.placeholder = t("passwordPlaceholder") || "Your password will appear here";
      // Кнопка очистки истории
      const clearBtn = document.getElementById("clearHistoryButton");
      if (clearBtn) clearBtn.lastChild.textContent = t("clearAll") || "Clear All";
      // Заголовок истории
      const histTitle = document.querySelector(".history-header h3");
      if (histTitle) histTitle.textContent = t("recentPasswords") || "Recent Passwords";
      // Пустое состояние истории
      const emptyState = document.querySelector(".empty-state p");
      if (emptyState) emptyState.textContent = t("noHistory") || "No password history yet";
      // Переводим значение длины пароля
      if (lengthValue) lengthValue.textContent = passwordLengthInput.value;
      // Переводим подписи для чекбоксов (on/off)
      [
        { id: "lowercase", label: "lowercase" },
        { id: "uppercase", label: "uppercase" },
        { id: "numbers", label: "numbers" },
        { id: "special", label: "special" },
        { id: "excludeSimilar", label: "excludeSimilar" },
        { id: "excludeAmbiguous", label: "excludeAmbiguous" },
      ].forEach(({ id, label }) => {
        const el = document.getElementById(id);
        if (el) {
          const parent = el.closest("label");
          if (parent) {
            const span = parent.querySelector("span");
            if (span) span.textContent = t(label);
          }
        }
      });
      loadPasswordHistory(passwordStorage, historyList, createHistoryItem, applyVisibilityState);
      // Переводим заголовок группы длины пароля
      const lengthGroupLabel = document.querySelector('.length-option label span');
      if (lengthGroupLabel) lengthGroupLabel.textContent = t('passwordLength');
      // Переводим заголовок группы Character Types
      const charTypesGroup = document.querySelectorAll('.options-group h3')[0];
      if (charTypesGroup) charTypesGroup.textContent = t('charTypes');
      // Переводим заголовок группы Exclusions
      const exclusionsGroup = document.querySelectorAll('.options-group h3')[1];
      if (exclusionsGroup) exclusionsGroup.textContent = t('exclusions');
      // Переводим заголовок Password Strength
      const strengthLabel = document.querySelector('[data-i18n="passwordStrength"]');
      if (strengthLabel) strengthLabel.textContent = t('passwordStrength');
      // Перерисовать label силы пароля
      updateStrengthMeter(passwordOutput.value);
    });
  }

  // Lazy loading для всех внутренних модулей
  async function lazyLoad(modulePath) {
    return (await import(modulePath)).default;
  }
  // Пример использования:
  // const PasswordGenerator = await lazyLoad("../js/passwordGenerator.js");
  // const PasswordStorage = await lazyLoad("../js/storage.js");
  // ... и так далее
  // В реальном коде можно заменить прямые импорты на lazyLoad при необходимости
});
