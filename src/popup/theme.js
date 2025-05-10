// theme.js — функции для управления темой

/**
 * Применяет тему к документу
 * @param {string} theme - Название темы ('light', 'dark', 'system')
 * @param {HTMLElement} themeButton - Кнопка выбора темы
 * @param {NodeList} themeOptions - Список опций тем
 * @returns {Promise<void>}
 */
export async function applyTheme(theme, themeButton, themeOptions) {
  if (theme === "system") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.setAttribute("data-theme", prefersDark ? "dark" : "light");
  } else {
    document.documentElement.setAttribute("data-theme", theme);
  }

  // Update active state in row
  themeOptions.forEach((option) => {
    option.classList.toggle("active", option.dataset.theme === theme);
  });

  // Если themeButton есть, меняем иконку (для обратной совместимости)
  if (themeButton) {
    const mainButtonIcon = themeButton.querySelector("svg");
    const selectedOption = Array.from(themeOptions).find((option) => option.dataset.theme === theme);
    if (selectedOption) {
      const selectedIcon = selectedOption.querySelector("svg").cloneNode(true);
      mainButtonIcon.replaceWith(selectedIcon);
    }
  }
}

/**
 * Обрабатывает смену темы
 * @param {string} theme - Новая тема
 * @param {Object} passwordStorage - Хранилище настроек
 * @param {HTMLElement} themeButton - Кнопка выбора темы
 * @param {NodeList} themeOptions - Список опций тем
 * @returns {Promise<void>}
 */
export async function handleThemeChange(theme, passwordStorage, themeButton, themeOptions) {
  await passwordStorage.saveTheme(theme);
  await applyTheme(theme, themeButton, themeOptions);
}

/**
 * Инициализирует тему при загрузке
 * @param {Object} passwordStorage - Хранилище настроек
 * @param {HTMLElement} themeButton - Кнопка выбора темы
 * @param {NodeList} themeOptions - Список опций тем
 * @returns {Promise<void>}
 */
export async function initializeTheme(passwordStorage, themeButton, themeOptions) {
  const savedTheme = await passwordStorage.getTheme();
  await applyTheme(savedTheme, themeButton, themeOptions);
}
