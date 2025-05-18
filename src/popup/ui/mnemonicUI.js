import { t } from "../i18n.js";

// DOM Elements
let mnemonicToggle,
  mnemonicOptions,
  mnemonicWordCount,
  mnemonicWordCountValue,
  mnemonicSeparator,
  mnemonicCase,
  mnemonicUseOnlyCustom,
  mnemonicMinWordLen,
  mnemonicMinWordLenValue,
  mnemonicMaxWordLen,
  mnemonicMaxWordLenValue,
  mnemonicNoRepeats,
  mnemonicPrefix,
  mnemonicSuffix,
  mnemonicLeet,
  mnemonicShuffle,
  mnemonicInsertBetween,
  mnemonicInsertInside,
  mnemonicCustomWordInput,
  mnemonicCustomWordsListDisplay;

let customWordsArray = [];
let _settingsChangedCallbackMnemonic;

function getElements() {
  mnemonicToggle = document.getElementById("mnemonicToggle");
  mnemonicOptions = document.getElementById("mnemonicOptions");
  mnemonicWordCount = document.getElementById("mnemonicWordCount");
  mnemonicWordCountValue = document.getElementById("mnemonicWordCountValue");
  mnemonicSeparator = document.getElementById("mnemonicSeparator");
  mnemonicCase = document.getElementById("mnemonicCase");
  mnemonicUseOnlyCustom = document.getElementById("mnemonicUseOnlyCustom");
  mnemonicMinWordLen = document.getElementById("mnemonicMinWordLen");
  mnemonicMinWordLenValue = document.getElementById("mnemonicMinWordLenValue");
  mnemonicMaxWordLen = document.getElementById("mnemonicMaxWordLen");
  mnemonicMaxWordLenValue = document.getElementById("mnemonicMaxWordLenValue");
  mnemonicNoRepeats = document.getElementById("mnemonicNoRepeats");
  mnemonicPrefix = document.getElementById("mnemonicPrefix");
  mnemonicSuffix = document.getElementById("mnemonicSuffix");
  mnemonicLeet = document.getElementById("mnemonicLeet");
  mnemonicShuffle = document.getElementById("mnemonicShuffle");
  mnemonicInsertBetween = document.getElementById("mnemonicInsertBetween");
  mnemonicInsertInside = document.getElementById("mnemonicInsertInside");
  mnemonicCustomWordInput = document.getElementById("mnemonicCustomWordInput");
  mnemonicCustomWordsListDisplay = document.getElementById("mnemonicCustomWordsList");
}

function renderCustomWords(wordsArray) {
  if (!mnemonicCustomWordsListDisplay) return;
  mnemonicCustomWordsListDisplay.innerHTML = ""; // Clear existing words
  wordsArray.forEach((word, index) => {
    const wordDiv = document.createElement("div");
    wordDiv.className = "custom-word-chip";
    wordDiv.textContent = word;
    const removeBtn = document.createElement("button");
    removeBtn.className = "chip-delete";
    removeBtn.innerHTML = "&times;";
    removeBtn.title = t("removeTag") || "Remove";
    removeBtn.onclick = () => {
      customWordsArray.splice(index, 1);
      renderCustomWords(customWordsArray);
      if (_settingsChangedCallbackMnemonic) _settingsChangedCallbackMnemonic();
    };
    wordDiv.appendChild(removeBtn);
    mnemonicCustomWordsListDisplay.appendChild(wordDiv);
  });
}

function addCustomWord(word) {
  word = word.trim().toLowerCase();
  if (word && !customWordsArray.includes(word)) {
    customWordsArray.push(word);
    renderCustomWords(customWordsArray);
    if (_settingsChangedCallbackMnemonic) _settingsChangedCallbackMnemonic();
  }
}

function setupMnemonicEventListeners() {
  if (!mnemonicToggle) return;

  mnemonicToggle.addEventListener("change", () => {
    if (mnemonicOptions) {
      mnemonicOptions.style.display = mnemonicToggle.checked ? "block" : "none";
    }
    if (_settingsChangedCallbackMnemonic) _settingsChangedCallbackMnemonic();
  });

  const allControls = [
    mnemonicWordCount,
    mnemonicSeparator,
    mnemonicCase,
    mnemonicUseOnlyCustom,
    mnemonicMinWordLen,
    mnemonicMaxWordLen,
    mnemonicNoRepeats,
    mnemonicPrefix,
    mnemonicSuffix,
    mnemonicLeet,
    mnemonicShuffle,
    mnemonicInsertBetween,
    mnemonicInsertInside,
  ];

  allControls.forEach(element => {
    if (element) {
      const eventType = element.type === 'checkbox' || element.type === 'select-one' ? "change" : "input";
      element.addEventListener(eventType, () => {
        if (_settingsChangedCallbackMnemonic) _settingsChangedCallbackMnemonic();
      });
    }
  });

  if (mnemonicWordCount) {
    mnemonicWordCount.addEventListener("input", () => {
      if(mnemonicWordCountValue) mnemonicWordCountValue.textContent = mnemonicWordCount.value;
    });
  }

  if (mnemonicMinWordLen) {
    mnemonicMinWordLen.addEventListener("input", () => {
      if(mnemonicMinWordLenValue) mnemonicMinWordLenValue.textContent = mnemonicMinWordLen.value;
      if (parseInt(mnemonicMinWordLen.value) > parseInt(mnemonicMaxWordLen.value)) {
        mnemonicMaxWordLen.value = mnemonicMinWordLen.value;
        if(mnemonicMaxWordLenValue) mnemonicMaxWordLenValue.textContent = mnemonicMinWordLen.value;
      }
    });
  }

  if (mnemonicMaxWordLen) {
    mnemonicMaxWordLen.addEventListener("input", () => {
      if(mnemonicMaxWordLenValue) mnemonicMaxWordLenValue.textContent = mnemonicMaxWordLen.value;
      if (parseInt(mnemonicMaxWordLen.value) < parseInt(mnemonicMinWordLen.value)) {
        mnemonicMinWordLen.value = mnemonicMaxWordLen.value;
        if(mnemonicMinWordLenValue) mnemonicMinWordLenValue.textContent = mnemonicMaxWordLen.value;
      }
    });
  }
  
  if (mnemonicCustomWordInput) {
    mnemonicCustomWordInput.addEventListener("keypress", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        addCustomWord(mnemonicCustomWordInput.value);
        mnemonicCustomWordInput.value = "";
      }
    });
  }
}

export function updateMnemonicUI(settings = {}) {
  if (!mnemonicToggle) getElements();
  if (!mnemonicToggle) return;

  mnemonicToggle.checked = settings.mnemonicEnabled || false;
  if (mnemonicOptions) {
    mnemonicOptions.style.display = mnemonicToggle.checked ? "block" : "none";
  }
  
  if (mnemonicWordCount) {
    mnemonicWordCount.value = settings.wordCount || 4;
    if(mnemonicWordCountValue) mnemonicWordCountValue.textContent = mnemonicWordCount.value;
  }
  if(mnemonicSeparator) mnemonicSeparator.value = settings.separator || "-";
  if(mnemonicCase) mnemonicCase.value = settings.caseType || "lower";
  
  customWordsArray = settings.mnemonicCustomWordsArray ? [...settings.mnemonicCustomWordsArray] : [];
  renderCustomWords(customWordsArray);
  
  if(mnemonicUseOnlyCustom) mnemonicUseOnlyCustom.checked = settings.useOnlyCustom || false;
  if(mnemonicMinWordLen){
    mnemonicMinWordLen.value = settings.minWordLen || 3;
    if(mnemonicMinWordLenValue) mnemonicMinWordLenValue.textContent = mnemonicMinWordLen.value;
  }
  if(mnemonicMaxWordLen){
    mnemonicMaxWordLen.value = settings.maxWordLen || 12;
    if(mnemonicMaxWordLenValue) mnemonicMaxWordLenValue.textContent = mnemonicMaxWordLen.value;
  }
  if(mnemonicNoRepeats) mnemonicNoRepeats.checked = settings.noRepeats || false;
  if(mnemonicPrefix) mnemonicPrefix.value = settings.prefix || "";
  if(mnemonicSuffix) mnemonicSuffix.value = settings.suffix || "";
  if(mnemonicLeet) mnemonicLeet.checked = settings.leet || false;
  if(mnemonicShuffle) mnemonicShuffle.checked = settings.shuffle || false;
  if(mnemonicInsertBetween) mnemonicInsertBetween.checked = settings.insertBetween || false;
  if(mnemonicInsertInside) mnemonicInsertInside.checked = settings.insertInside || false;
}

export function initMnemonicUI(settingsChangedCallback) {
  getElements();
  _settingsChangedCallbackMnemonic = settingsChangedCallback;
  setupMnemonicEventListeners();
}

export function getMnemonicSettings() {
  if (!mnemonicToggle) {
      return { mnemonicEnabled: false }; 
  }
  
  return {
    mnemonicEnabled: mnemonicToggle.checked,
    wordCount: mnemonicWordCount ? parseInt(mnemonicWordCount.value, 10) : 4,
    separator: mnemonicSeparator ? mnemonicSeparator.value : '-',
    caseType: mnemonicCase ? mnemonicCase.value : 'lower',
    mnemonicCustomWordsArray: [...customWordsArray],
    useOnlyCustom: mnemonicUseOnlyCustom ? mnemonicUseOnlyCustom.checked : false,
    minWordLen: mnemonicMinWordLen ? parseInt(mnemonicMinWordLen.value, 10) : 3,
    maxWordLen: mnemonicMaxWordLen ? parseInt(mnemonicMaxWordLen.value, 10) : 12,
    noRepeats: mnemonicNoRepeats ? mnemonicNoRepeats.checked : false,
    prefix: mnemonicPrefix ? mnemonicPrefix.value : "",
    suffix: mnemonicSuffix ? mnemonicSuffix.value : "",
    leet: mnemonicLeet ? mnemonicLeet.checked : false,
    shuffle: mnemonicShuffle ? mnemonicShuffle.checked : false,
    insertBetween: mnemonicInsertBetween ? mnemonicInsertBetween.checked : false,
    insertInside: mnemonicInsertInside ? mnemonicInsertInside.checked : false,
  };
}

// Note: The actual `mnemonicWordList` is imported but not directly used in these UI functions.
// It would be used by the PasswordGenerator's `generateMnemonicPassword` method,
// which might receive `customWordsArray` and `useOnlyCustom` from these settings.
// If PasswordGenerator needs the default list, it should import it itself or be passed it.
// For now, this module only manages the UI and settings for mnemonics. 