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
  const themeButton = document.getElementById('themeButton');
  const themeDropdown = document.getElementById('themeDropdown');
  const themeOptions = document.querySelectorAll('.theme-option');

  // Password visibility toggle
  const togglePasswordButton = document.getElementById('togglePasswordButton');
  const eyeIcon = togglePasswordButton.querySelector('.eye-icon');
  const eyeOffIcon = togglePasswordButton.querySelector('.eye-off-icon');

  togglePasswordButton.addEventListener('click', () => {
    const type = passwordOutput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordOutput.setAttribute('type', type);
    
    // Toggle icons
    eyeIcon.style.display = type === 'password' ? 'block' : 'none';
    eyeOffIcon.style.display = type === 'password' ? 'none' : 'block';
  });

  const toggleHistoryVisibilityButton = document.getElementById('toggleHistoryVisibilityButton');
  const historyEyeIcon = toggleHistoryVisibilityButton.querySelector('.eye-off-icon');
  const historyEyeOffIcon = toggleHistoryVisibilityButton.querySelector('.eye-icon');

  let isHistoryVisible = true;

  // Load saved visibility state
  async function loadVisibilityState() {
    const settings = await passwordStorage.getSettings();
    isHistoryVisible = settings.historyVisible !== false; // default to true if not set
    
    // Update icons
    historyEyeIcon.style.display = isHistoryVisible ? 'block' : 'none';
    historyEyeOffIcon.style.display = isHistoryVisible ? 'none' : 'block';
  }

  // Apply visibility state to passwords
  function applyVisibilityState() {
    const historyPasswords = document.querySelectorAll('.history-password');
    historyPasswords.forEach(password => {
      if (isHistoryVisible) {
        password.classList.remove('masked');
      } else {
        password.classList.add('masked');
      }
    });
  }

  toggleHistoryVisibilityButton.addEventListener('click', async () => {
    isHistoryVisible = !isHistoryVisible;
    applyVisibilityState();

    // Toggle icons - show crossed eye when password is visible
    historyEyeIcon.style.display = isHistoryVisible ? 'block' : 'none';
    historyEyeOffIcon.style.display = isHistoryVisible ? 'none' : 'block';

    // Save visibility state
    const settings = await passwordStorage.getSettings();
    settings.historyVisible = isHistoryVisible;
    await passwordStorage.saveSettings(settings);
  });

  // Load visibility state on startup
  await loadVisibilityState();

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

  function generatePassword() {
    try {
      if (
        !lowercaseCheckbox.checked &&
        !uppercaseCheckbox.checked &&
        !numbersCheckbox.checked &&
        !specialCheckbox.checked
      ) {
        showToast("Please select at least one character type");
        return;
      }

      const settings = getCurrentSettings();
      const newPassword = passwordGenerator.generatePassword(settings);

      passwordOutput.value = newPassword;
      updateStrengthMeter(newPassword);

      passwordStorage.savePassword(newPassword);

      const historyTab = document.getElementById("history");
      if (historyTab.classList.contains("active")) {
        loadPasswordHistory();
      }
    } catch (error) {
      showToast(error.message);
    }
  }

  /**
   * Update the strength meter for the current password
   */
  function updateStrengthMeter(password) {
    if (!password) {
      strengthIndicator.style.width = "0%";
      strengthIndicator.style.backgroundColor = "#ddd";
      strengthText.textContent = "None";
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

  /**
   * Load password history and display in UI
   */
  async function loadPasswordHistory() {
    const history = await passwordStorage.getHistory();

    historyList.innerHTML = "";

    if (history.length === 0) {
      const emptyState = document.createElement("div");
      emptyState.className = "empty-state";
      emptyState.textContent = "No password history yet";
      historyList.appendChild(emptyState);
      return;
    }

    history.forEach((item) => {
      const historyItem = createHistoryItem(item.password);
      historyList.appendChild(historyItem);
    });

    // Apply visibility state after history is loaded
    applyVisibilityState();
  }

  function copyToClipboard(text) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        showToast("Password copied to clipboard");
      })
      .catch((err) => {
        console.error("Could not copy text: ", err);
        showToast("Failed to copy password");
      });
  }

  function showToast(message) {
    const existingToast = document.querySelector(".success-message");
    if (existingToast) {
      existingToast.remove();
    }

    const toast = document.createElement("div");
    toast.className = "success-message";
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("show");
    }, 10);

    setTimeout(() => {
      toast.classList.remove("show");

      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 2000);
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
          loadPasswordHistory();
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

  clearHistoryButton.addEventListener("click", async () => {
    if (confirm("Are you sure you want to clear all password history?")) {
      await passwordStorage.clearHistory();
      loadPasswordHistory();
    }
  });

  // Function to apply theme
  async function applyTheme(theme) {
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
    
    // Update active state in dropdown
    themeOptions.forEach(option => {
      option.classList.toggle('active', option.dataset.theme === theme);
    });

    // Update main button icon
    const mainButtonIcon = themeButton.querySelector('svg');
    const selectedOption = Array.from(themeOptions).find(option => option.dataset.theme === theme);
    if (selectedOption) {
      const selectedIcon = selectedOption.querySelector('svg').cloneNode(true);
      mainButtonIcon.replaceWith(selectedIcon);
    }
  }

  // Function to handle theme change
  async function handleThemeChange(theme) {
    await passwordStorage.saveTheme(theme);
    await applyTheme(theme);
  }

  // Initialize theme
  async function initializeTheme() {
    const savedTheme = await passwordStorage.getTheme();
    await applyTheme(savedTheme);
  }

  // Toggle dropdown
  themeButton.addEventListener('click', () => {
    themeDropdown.classList.toggle('show');
  });

  // Handle theme option clicks
  themeOptions.forEach(option => {
    option.addEventListener('click', async () => {
      const theme = option.dataset.theme;
      await handleThemeChange(theme);
      themeDropdown.classList.remove('show');
    });
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.theme-switcher')) {
      themeDropdown.classList.remove('show');
    }
  });

  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', async (e) => {
    const savedTheme = await passwordStorage.getTheme();
    if (savedTheme === 'system') {
      await applyTheme('system');
    }
  });

  // Initialize theme on load
  initializeTheme();

  await loadSettings();
  generatePassword();
});

// Function to create history item
function createHistoryItem(password) {
  const item = document.createElement('div');
  item.className = 'history-item';
  
  const passwordSpan = document.createElement('span');
  passwordSpan.className = 'history-password';
  passwordSpan.textContent = password;
  
  const actions = document.createElement('div');
  actions.className = 'history-actions';
  
  const copyButton = document.createElement('button');
  copyButton.className = 'history-copy';
  copyButton.title = 'Copy password';
  copyButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
  `;
  
  const deleteButton = document.createElement('button');
  deleteButton.className = 'history-delete';
  deleteButton.title = 'Delete password';
  deleteButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
  `;
  
  actions.appendChild(copyButton);
  actions.appendChild(deleteButton);
  
  item.appendChild(passwordSpan);
  item.appendChild(actions);
  
  return item;
}
