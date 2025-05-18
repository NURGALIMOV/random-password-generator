import { t } from "../i18n.js"; // For potential future use in this module

// DOM Elements
let passwordLengthInput,
  lengthValue,
  lowercaseCheckbox,
  uppercaseCheckbox,
  numbersCheckbox,
  specialCheckbox,
  excludeSimilarCheckbox,
  excludeAmbiguousCheckbox,
  passwordTemplateInput,
  templateDropdown,
  enablePopularTemplates,
  passwordTemplateOptions,
  templateHelpToggle,
  templateHelpBlock,
  passwordOutputEl,
  generationModeRadios;

// Callback for when settings change
let onSettingsChanged = null;

function getElements() {
  passwordLengthInput = document.getElementById("passwordLength");
  lengthValue = document.getElementById("lengthValue");
  lowercaseCheckbox = document.getElementById("lowercase");
  uppercaseCheckbox = document.getElementById("uppercase");
  numbersCheckbox = document.getElementById("numbers");
  specialCheckbox = document.getElementById("special");
  excludeSimilarCheckbox = document.getElementById("excludeSimilar");
  excludeAmbiguousCheckbox = document.getElementById("excludeAmbiguous");
  passwordTemplateInput = document.getElementById("passwordTemplate");
  templateDropdown = document.getElementById("templateDropdown");
  enablePopularTemplates = document.getElementById("enablePopularTemplates");
  passwordTemplateOptions = document.getElementById("passwordTemplateOptions");
  templateHelpToggle = document.getElementById("templateHelpToggle");
  templateHelpBlock = document.getElementById("templateHelpBlock");
  passwordOutputEl = document.getElementById("passwordOutput");
  generationModeRadios = document.querySelectorAll("input[name='generationMode']");
}

function setupEventListeners() {
  if (passwordLengthInput) {
    passwordLengthInput.addEventListener("input", () => {
      if (lengthValue) lengthValue.textContent = passwordLengthInput.value;
      if (onSettingsChanged) onSettingsChanged();
    });
  }

  const checkboxes = [
    lowercaseCheckbox,
    uppercaseCheckbox,
    numbersCheckbox,
    specialCheckbox,
    excludeSimilarCheckbox,
    excludeAmbiguousCheckbox,
  ].filter(Boolean);

  checkboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      if (onSettingsChanged) onSettingsChanged();
    });
  });

  if (passwordTemplateInput) {
    passwordTemplateInput.addEventListener("input", () => {
      // Update dropdown if value matches one of its options
      if (templateDropdown) {
        let matched = false;
        for (let i = 0; i < templateDropdown.options.length; i++) {
          if (templateDropdown.options[i].value === passwordTemplateInput.value) {
            templateDropdown.selectedIndex = i;
            matched = true;
            break;
          }
        }
        if (!matched && templateDropdown.value !== "") { // If user types custom template not in dropdown
            // templateDropdown.value = ""; // Or set to a "custom" placeholder if it exists
        }
      }
      if (onSettingsChanged) onSettingsChanged();
    });
  }

  if (templateDropdown) {
    templateDropdown.addEventListener("change", function () {
      if (passwordTemplateInput && this.value) {
        passwordTemplateInput.value = this.value;
        if (onSettingsChanged) onSettingsChanged();
      } else if (passwordTemplateInput && !this.value) {
        // If "Select a template" or empty value is chosen
        // passwordTemplateInput.value = ""; // Optionally clear the input
        if (onSettingsChanged) onSettingsChanged();
      }
    });
  }

  if (enablePopularTemplates) {
    enablePopularTemplates.addEventListener("change", function () {
      if (passwordTemplateOptions) {
        passwordTemplateOptions.style.display = this.checked ? "" : "none";
      }
      if (onSettingsChanged) onSettingsChanged();
    });
  }

  if (templateHelpToggle && templateHelpBlock) {
    templateHelpToggle.addEventListener("click", function (e) {
      e.preventDefault();
      const isHidden = templateHelpBlock.style.display === "none" || !templateHelpBlock.style.display;
      templateHelpBlock.style.display = isHidden ? "block" : "none";
      templateHelpToggle.textContent = isHidden ? (t("hideInstructions") || "Hide instructions") : (t("showInstructions") || "Show instructions");
      // This UI toggle does not change a saved setting, so no callback.
    });
  }

  generationModeRadios.forEach(radio => {
    radio.addEventListener("change", () => {
      // Logic to show/hide sections based on mode
      const mode = radio.value;
      const passwordTab = document.querySelector('.tab-content[data-tab="password"]');
      if (passwordTab) {
          passwordTab.querySelectorAll('.generation-mode-section').forEach(section => {
              section.style.display = 'none';
          });
          const activeSection = passwordTab.querySelector(`.${mode}-generation-section`);
          if (activeSection) {
              activeSection.style.display = 'block';
          }
      }
      if (onSettingsChanged) onSettingsChanged();
    });
  });
}

export function initPasswordGenerationUI(initialSettings = {}, settingsChangedCallback) {
  getElements();
  onSettingsChanged = settingsChangedCallback;

  if (passwordLengthInput) passwordLengthInput.value = initialSettings.length || 16;
  if (lengthValue) lengthValue.textContent = passwordLengthInput ? passwordLengthInput.value : (initialSettings.length || 16);
  if (lowercaseCheckbox) lowercaseCheckbox.checked = initialSettings.lowercase !== undefined ? initialSettings.lowercase : true;
  if (uppercaseCheckbox) uppercaseCheckbox.checked = initialSettings.uppercase !== undefined ? initialSettings.uppercase : true;
  if (numbersCheckbox) numbersCheckbox.checked = initialSettings.numbers !== undefined ? initialSettings.numbers : true;
  if (specialCheckbox) specialCheckbox.checked = initialSettings.special !== undefined ? initialSettings.special : false;
  if (excludeSimilarCheckbox) excludeSimilarCheckbox.checked = initialSettings.excludeSimilar || false;
  if (excludeAmbiguousCheckbox) excludeAmbiguousCheckbox.checked = initialSettings.excludeAmbiguous || false;
  
  if (passwordTemplateInput) passwordTemplateInput.value = initialSettings.template || "";
  
  if (enablePopularTemplates) {
    enablePopularTemplates.checked = initialSettings.enablePopularTemplates !== undefined ? initialSettings.enablePopularTemplates : false;
  }
  if (passwordTemplateOptions) {
     passwordTemplateOptions.style.display = enablePopularTemplates && enablePopularTemplates.checked ? "" : "none";
  }
   // Set dropdown initial value based on template
  if (templateDropdown && initialSettings.template) {
    for (let i = 0; i < templateDropdown.options.length; i++) {
        if (templateDropdown.options[i].value === initialSettings.template) {
            templateDropdown.selectedIndex = i;
            break;
        }
    }
  }

  if (templateHelpBlock) { // Default state for help block
    templateHelpBlock.style.display = "none";
    if (templateHelpToggle) templateHelpToggle.textContent = t("showInstructions") || "Show instructions";
  }
  
  // Set generation mode
  const mode = initialSettings.generationMode || 'random';
  const radio = document.querySelector(`input[name="generationMode"][value="${mode}"]`);
  if (radio) {
    radio.checked = true;
  }

  // Show/hide sections based on initial mode
  const passwordTab = document.querySelector('.tab-content[data-tab="password"]');
  if (passwordTab) {
    passwordTab.querySelectorAll('.generation-mode-section').forEach(section => {
      section.style.display = 'none';
    });
    const activeSection = passwordTab.querySelector(`.${mode}-generation-section`);
    if (activeSection) {
      activeSection.style.display = 'block';
    }
  }

  setupEventListeners();
}

export function getGenerationOptions() {
  if (!passwordLengthInput) { // Basic check if UI is initialized
    // console.warn("Password Generation UI not fully initialized, returning defaults or empty.");
    return {
      length: 16,
      lowercase: true,
      uppercase: true,
      numbers: true,
      special: false,
      excludeSimilar: false,
      excludeAmbiguous: false,
      template: "",
      enablePopularTemplates: false,
      generationMode: "random",
    };
  }
  
  const options = {
    length: passwordLengthInput ? parseInt(passwordLengthInput.value, 10) : 16,
    lowercase: lowercaseCheckbox ? lowercaseCheckbox.checked : true,
    uppercase: uppercaseCheckbox ? uppercaseCheckbox.checked : true,
    numbers: numbersCheckbox ? numbersCheckbox.checked : true,
    special: specialCheckbox ? specialCheckbox.checked : false,
    excludeSimilar: excludeSimilarCheckbox ? excludeSimilarCheckbox.checked : false,
    excludeAmbiguous: excludeAmbiguousCheckbox ? excludeAmbiguousCheckbox.checked : false,
    template: passwordTemplateInput ? passwordTemplateInput.value : "",
    enablePopularTemplates: enablePopularTemplates ? enablePopularTemplates.checked : false,
    generationMode: document.querySelector("input[name='generationMode']:checked")?.value || "random",
  };
  
  return options;
}

export function updatePasswordGenerationUI(settings) {
  if (!passwordLengthInput) {
    console.error("PG UI Elements not initialized");
    return;
  }

  if(passwordLengthInput) passwordLengthInput.value = settings.length;
  if(lengthValue) lengthValue.textContent = settings.length;
  if(lowercaseCheckbox) lowercaseCheckbox.checked = settings.lowercase;
  if(uppercaseCheckbox) uppercaseCheckbox.checked = settings.uppercase;
  if(numbersCheckbox) numbersCheckbox.checked = settings.numbers;
  if(specialCheckbox) specialCheckbox.checked = settings.special;
  if(excludeSimilarCheckbox) excludeSimilarCheckbox.checked = settings.excludeSimilar;
  if(excludeAmbiguousCheckbox) excludeAmbiguousCheckbox.checked = settings.excludeAmbiguous;
  if(passwordTemplateInput) passwordTemplateInput.value = settings.template || "";
  if(enablePopularTemplates) enablePopularTemplates.checked = settings.enablePopularTemplates !== undefined ? settings.enablePopularTemplates : false;
  if (passwordTemplateOptions) {
      passwordTemplateOptions.style.display = enablePopularTemplates && enablePopularTemplates.checked ? "" : "none";
  }
  if (templateDropdown && settings.template) {
    for (let i = 0; i < templateDropdown.options.length; i++) {
        if (templateDropdown.options[i].value === settings.template) {
            templateDropdown.selectedIndex = i;
            break;
        }
    }
  }

  // Set generation mode
  const mode = settings.generationMode || 'random';
  const radio = document.querySelector(`input[name="generationMode"][value="${mode}"]`);
  if (radio) {
    radio.checked = true;
  }
  // Show/hide sections based on mode
  const passwordTab = document.querySelector('.tab-content[data-tab="password"]');
  if (passwordTab) {
    passwordTab.querySelectorAll('.generation-mode-section').forEach(section => {
      section.style.display = 'none';
    });
    const activeSection = passwordTab.querySelector(`.${mode}-generation-section`);
    if (activeSection) {
      activeSection.style.display = 'block';
    }
  }
}

// New exported function to update the password output field
export function updatePasswordOutputValue(newPassword) {
  if (!passwordOutputEl) getElements(); // Ensure elements are loaded, though typically init would do this
  if (passwordOutputEl) passwordOutputEl.value = newPassword;
} 