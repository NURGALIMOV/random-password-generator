// DOM Elements
let historyListElement;
let historyContainerElement; // For virtualization
let clearHistoryButtonElement;
let toggleHistoryVisibilityButtonElement;
let historyEyeIconElement;
let historyEyeOffIconElement;
let tagFilterInputElement;

// State
let isHistoryVisible = true; // Default, will be overwritten by loadSettings
let passwordStorageInstance;
let masterPasswordProviderFunc;
let callbacksObj;
let utilsObj;

// Virtualization State
const ITEM_HEIGHT = 90; // The fixed height of a history item in pixels. Must match CSS.
const OVERSCAN_COUNT = 5; // Number of items to render above and below the visible area.
let allHistoryItems = [];
let isRendering = false;
let animationFrameId = null;

function getElements() {
  historyListElement = document.getElementById("historyList");
  historyContainerElement = document.getElementById("historyContainer"); // For virtualization
  clearHistoryButtonElement = document.getElementById("clearHistoryButton");
  toggleHistoryVisibilityButtonElement = document.getElementById("toggleHistoryVisibilityButton");
  tagFilterInputElement = document.getElementById("tagFilterInput");
  if (toggleHistoryVisibilityButtonElement) {
    historyEyeIconElement = toggleHistoryVisibilityButtonElement.querySelector(".eye-off-icon"); // eye-off when visible
    historyEyeOffIconElement = toggleHistoryVisibilityButtonElement.querySelector(".eye-icon"); // eye when not visible
  }
}

function applyVisibilityState(visible) {
  if (!historyListElement) return;
  const historyPasswords = historyListElement.querySelectorAll(".history-password");
  historyPasswords.forEach((password) => {
    if (visible) {
      password.classList.remove("masked");
    } else {
      password.classList.add("masked");
    }
  });
}

function updateVisibilityToggleIcons() {
  if (historyEyeIconElement) historyEyeIconElement.style.display = isHistoryVisible ? "block" : "none";
  if (historyEyeOffIconElement) historyEyeOffIconElement.style.display = isHistoryVisible ? "none" : "block";
}

async function loadInitialVisibilityState() {
  if (!passwordStorageInstance) return;
  const settings = await passwordStorageInstance.getSettings();
  isHistoryVisible = settings.historyVisible !== false; // default to true if not set
  updateVisibilityToggleIcons();
  applyVisibilityState(isHistoryVisible); // Apply to any existing items if list is pre-loaded (though typically not)
}

async function handleToggleVisibility() {
  isHistoryVisible = !isHistoryVisible;
  applyVisibilityState(isHistoryVisible);
  updateVisibilityToggleIcons();
  if (passwordStorageInstance) {
    const settings = await passwordStorageInstance.getSettings();
    settings.historyVisible = isHistoryVisible;
    await passwordStorageInstance.saveSettings(settings);
  }
}

function _findItemElement(itemId) {
  if (!historyListElement) return null;
  // This is tricky with virtualization. The element might not be in the DOM.
  // For now, we'll assume it is, as confirmation is a user interaction on a visible item.
  // A better approach might be to query for the specific item if this proves unreliable.
  return historyListElement.querySelector(`[data-password-data*='"id":"${itemId}"']`);
}

async function handleClearHistory() {
  if (!callbacksObj || !callbacksObj.showConfirmDialog || !passwordStorageInstance || !utilsObj || !utilsObj.invalidateHistoryCache) return;

  callbacksObj.showConfirmDialog("clearAllHistoryConfirm", async () => {
    try {
      await passwordStorageInstance.clearHistory();
      utilsObj.invalidateHistoryCache();
      await refreshHistoryDisplay({ force: true });
      callbacksObj.showToast("historyCleared", "success");
    } catch (e) {
      utilsObj.logError(e, "clear history");
      callbacksObj.showToast("clearHistoryFailed", "error");
    }
  });
}

function renderVisibleItems() {
  if (!historyContainerElement || !historyListElement || isRendering) {
    return;
  }

  isRendering = true;

  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }

  animationFrameId = requestAnimationFrame(() => {
    const { scrollTop, clientHeight } = historyContainerElement;
    
    const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN_COUNT);
    const endIndex = Math.min(allHistoryItems.length - 1, Math.ceil((scrollTop + clientHeight) / ITEM_HEIGHT) + OVERSCAN_COUNT);

    const visibleItems = allHistoryItems.slice(startIndex, endIndex + 1);

    let itemsHtml = '';
    visibleItems.forEach((item, index) => {
      const itemIndexInFullList = startIndex + index;
      const topPosition = itemIndexInFullList * ITEM_HEIGHT;

      // This is a simplified version of createHistoryItemHTML
      // It now includes the positioning style.
      const passwordData = JSON.stringify(item).replace(/'/g, "&apos;");
      const passwordDisplay = item.password || (item.encryptionStatus === 'encrypted' ? (callbacksObj.getLocalizedText("encryptedPassword") || 'Encrypted') : (callbacksObj.getLocalizedText("decryptionFailed") || 'Decryption Failed'));
      const isMasked = !isHistoryVisible ? 'masked' : '';
      const itemClasses = ['history-item'];
      if(item.encryptionStatus && item.encryptionStatus !== 'plaintext' && item.encryptionStatus !== 'decrypted') {
        itemClasses.push(item.encryptionStatus === 'encrypted' ? 'history-item-encrypted' : 'history-item-error');
      }

      const tagsHtml = item.tags && item.tags.length > 0
        ? item.tags.map(tag => `<div class="tag-chip" data-tag="${tag}">${tag}<button class="delete-tag" title="${callbacksObj.getLocalizedText("removeTag") || 'Remove Tag'}">&times;</button></div>`).join('')
        : `<span class="no-tags-placeholder">${callbacksObj.getLocalizedText("noTags") || 'No tags'}</span>`;

      const actionsHtml = `
          <button class="history-copy" title="${callbacksObj.getLocalizedText("copyPassword") || 'Copy'}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          </button>
          <button class="history-delete" title="${callbacksObj.getLocalizedText("deletePassword") || 'Delete'}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        `;

      itemsHtml += `
        <div class="${itemClasses.join(' ')}" style="top: ${topPosition}px; height: ${ITEM_HEIGHT}px;" data-password-data='${passwordData}'>
          <div class="history-item-inner">
            <div class="history-item-main">
              <span class="history-password ${isMasked}">${passwordDisplay}</span>
              <div class="history-actions">
                ${actionsHtml}
              </div>
            </div>
            <div class="tags-container">
              <div class="tags-list">${tagsHtml}</div>
              <button class="add-tag-btn" title="${callbacksObj.getLocalizedText("addTag") || 'Add Tag'}">+</button>
              <div class="add-tag-form" style="display: none;">
                <input type="text" class="new-tag-input" placeholder="${callbacksObj.getLocalizedText("addTagPlaceholder") || "New tag..."}" />
                <button class="cancel-add-tag" title="${callbacksObj.getLocalizedText("cancelAddTag") || "Cancel"}">&times;</button>
              </div>
            </div>
          </div>
        </div>
      `;
    });

    historyListElement.innerHTML = itemsHtml;
    
    isRendering = false;
  });
}

async function handleHistoryListClick(event) {
  if (!historyListElement || !callbacksObj || !utilsObj) return;

  const itemElement = event.target.closest(".history-item");
  if (!itemElement || !itemElement.dataset.passwordData) return;

  const passwordData = JSON.parse(itemElement.dataset.passwordData);
  const { id, password: passwordValue, encryptionStatus } = passwordData;

  const action = event.target.closest('[data-action]')?.dataset.action;

  if (action === 'confirm-delete') {
    try {
      await passwordStorageInstance.deletePassword(id);
      utilsObj.invalidateHistoryCache();
      await refreshHistoryDisplay({ force: true });
      callbacksObj.showToast("passwordDeleted", "success");
    } catch (err) {
      callbacksObj.showToast("deleteFailed", "error");
      utilsObj.logError(err, "del_hist_err_historyUI");
    }
    return;
  }

  if (action === 'cancel-delete') {
    itemElement.classList.remove("is-confirming");
    renderVisibleItems(); // Re-render to restore buttons
    return;
  }

  if (event.target.closest(".add-tag-btn")) {
    const addTagBtn = event.target.closest(".add-tag-btn");
    const tagsContainer = itemElement.querySelector('.tags-container');
    const addTagForm = tagsContainer.querySelector('.add-tag-form');
    const newTagInput = tagsContainer.querySelector('.new-tag-input');
    
    addTagBtn.style.display = 'none';
    addTagForm.style.display = 'flex';
    newTagInput.focus();
    return;
  }
  
  if (event.target.closest(".cancel-add-tag")) {
    const cancelBtn = event.target.closest(".cancel-add-tag");
    const tagsContainer = itemElement.querySelector('.tags-container');
    const addTagForm = tagsContainer.querySelector('.add-tag-form');
    const addTagBtn = tagsContainer.querySelector('.add-tag-btn');
    
    addTagForm.style.display = 'none';
    addTagBtn.style.display = 'flex';
    return;
  }

  if (event.target.closest(".delete-tag")) {
    const tagChip = event.target.closest(".tag-chip");
    if (tagChip && tagChip.dataset.tag) {
      const tagToRemove = tagChip.dataset.tag;
      try {
        const removed = await passwordStorageInstance.removeTagFromPassword(id, tagToRemove);
        if (removed) {
          utilsObj.invalidateHistoryCache();
          await refreshHistoryDisplay({ force: true });
          if (callbacksObj.showToast) callbacksObj.showToast(callbacksObj.getLocalizedText("tagRemoved") || "Tag removed");
        }
      } catch (err) {
        if (callbacksObj.showToast) callbacksObj.showToast(callbacksObj.getLocalizedText("tagRemoveFailed") || "Failed to remove tag", "error");
        if (utilsObj.logError) utilsObj.logError(err, "remove_tag_error_historyUI");
      }
    }
    return;
  }

  if (event.target.closest(".history-copy")) {
    if (encryptionStatus && encryptionStatus !== "decrypted" && encryptionStatus !== "plaintext") {
      if (callbacksObj.showToast) callbacksObj.showToast(callbacksObj.getLocalizedText("cannotCopyEncrypted") || "Cannot copy: Password is encrypted and not decrypted.", "warning");
      return;
    }
    if (!passwordValue) {
      if (callbacksObj.showToast) callbacksObj.showToast(callbacksObj.getLocalizedText("passwordCopyFailed") || "Password copy failed: No value.", "error");
      return;
    }
    try {
      await utilsObj.copyToClipboard(passwordValue);
      if (callbacksObj.showToast) callbacksObj.showToast(callbacksObj.getLocalizedText("passwordCopied") || "Password copied to clipboard!");
      if (utilsObj.logEvent) utilsObj.logEvent("password_copied_from_history_historyUI");
    } catch (err) {
      if (callbacksObj.showToast) callbacksObj.showToast(callbacksObj.getLocalizedText("passwordCopyFailed") || "Password copy failed.", "error");
      if (utilsObj.logError) utilsObj.logError(err, "copy_hist_err_historyUI");
    }
  } else if (event.target.closest(".history-delete")) {
    callbacksObj.showConfirmDialog("deleteConfirm", async () => {
      try {
        await passwordStorageInstance.deletePassword(id);
        utilsObj.invalidateHistoryCache();
        await refreshHistoryDisplay({ force: true });
        callbacksObj.showToast("passwordDeleted", "success");
      } catch (err) {
        callbacksObj.showToast("deleteFailed", "error");
        utilsObj.logError(err, "del_hist_err_historyUI");
      }
    });
  } else if (!event.target.closest('.history-actions')) { // Click on the item itself to load
    if (passwordValue && (encryptionStatus === "decrypted" || encryptionStatus === "plaintext")) {
      if (callbacksObj.onPasswordLoad) callbacksObj.onPasswordLoad(passwordValue);
      if (callbacksObj.showToast) callbacksObj.showToast(callbacksObj.getLocalizedText("passwordLoadedFromHistory") || "Password loaded from history.");
    } else if (encryptionStatus && encryptionStatus !== "decrypted" && encryptionStatus !== "plaintext") {
      if (callbacksObj.showToast) callbacksObj.showToast(callbacksObj.getLocalizedText("cannotLoadEncryptedPasswordNeedsMaster") || "Password is encrypted. Please enter Master Password.", "warning");
      // Optionally, trigger master password prompt if conditions are right (e.g., history tab active)
      // This might be better handled by popup.js based on the active tab and this toast.
      const settings = await passwordStorageInstance.getSettings();
      if (settings.encryptionEnabled && !masterPasswordProviderFunc()) {
          if(callbacksObj.showMasterPasswordPrompt) callbacksObj.showMasterPasswordPrompt({ reason: 'loadHistoryItemAttempt' });
          if(callbacksObj.focusMasterPasswordPrompt) callbacksObj.focusMasterPasswordPrompt();
      }
    } else {
      if (callbacksObj.showToast) callbacksObj.showToast(callbacksObj.getLocalizedText("cannotLoadPasswordFromHistory") || "Cannot load this password from history.", "warning");
    }
  }
}

function handleFilterChange() {
  if (!tagFilterInputElement || !historyListElement) return;
  refreshHistoryDisplay({ force: true, filter: tagFilterInputElement.value });
}

async function handleNewTagKeyup(event) {
  if (event.key !== 'Enter') return;
  
  const inputElement = event.target;
  if (!inputElement.classList.contains('new-tag-input')) return;

  const itemElement = inputElement.closest(".history-item");
  if (!itemElement || !itemElement.dataset.passwordData) return;

  const passwordData = JSON.parse(itemElement.dataset.passwordData);
  const { id } = passwordData;
  const newTag = inputElement.value.trim();

  if (newTag) {
    try {
      const added = await passwordStorageInstance.addTagToPassword(id, newTag);
      if (added) {
        utilsObj.invalidateHistoryCache();
        await refreshHistoryDisplay({ force: true });
        if (callbacksObj.showToast) callbacksObj.showToast(callbacksObj.getLocalizedText("tagAdded") || "Tag added");
      }
    } catch (err) {
      if (callbacksObj.showToast) callbacksObj.showToast(callbacksObj.getLocalizedText("tagAddFailed") || "Failed to add tag", "error");
      if (utilsObj.logError) utilsObj.logError(err, "add_tag_error_enter_key_historyUI");
    }
  } else {
    // If user presses enter on empty, just close the input
    const tagsContainer = itemElement.querySelector('.tags-container');
    const addTagForm = tagsContainer.querySelector('.add-tag-form');
    const addTagBtn = tagsContainer.querySelector('.add-tag-btn');
    addTagForm.style.display = 'none';
    addTagBtn.style.display = 'flex';
  }
}

function setupEventListeners() {
  if (clearHistoryButtonElement) {
    clearHistoryButtonElement.addEventListener("click", handleClearHistory);
  }
  if (toggleHistoryVisibilityButtonElement) {
    toggleHistoryVisibilityButtonElement.addEventListener("click", handleToggleVisibility);
  }
  if (historyListElement) {
    historyListElement.addEventListener("click", handleHistoryListClick);
    historyListElement.addEventListener("keyup", handleNewTagKeyup);
  }
  if (tagFilterInputElement) {
    tagFilterInputElement.addEventListener("input", handleFilterChange);
  }
  if (historyContainerElement) {
    historyContainerElement.addEventListener("scroll", renderVisibleItems, { passive: true });
  }
}

/**
 * Initializes the History UI components, assigns dependencies, and sets up event listeners.
 * @param {object} dependencies - The objects required by the History UI.
 * @param {object} dependencies.passwordStorageInstance - The storage service instance.
 * @param {function} dependencies.masterPasswordProviderFunc - A function to get the current master password.
 * @param {object} dependencies.callbacksObj - An object with callback functions for UI interactions.
 * @param {object} dependencies.utilsObj - An object with utility functions.
 */
export async function initHistoryUI(dependencies) {
  // 1. Assign dependencies FIRST
  passwordStorageInstance = dependencies.passwordStorageInstance;
  masterPasswordProviderFunc = dependencies.masterPasswordProviderFunc;
  callbacksObj = dependencies.callbacksObj;
  utilsObj = dependencies.utilsObj;

  // 2. Get DOM elements
  getElements();

  // 3. Setup event listeners
  setupEventListeners();

  // 4. Load initial state
  await loadInitialVisibilityState();

  // 5. Perform initial render AFTER everything is set up
  await refreshHistoryDisplay({ force: true });
}

/**
 * @param {object} [options] - Options for refreshing.
 * @param {boolean} [options.force=false] - Whether to force a refresh even if data exists.
 */
export async function refreshHistoryDisplay(options = {}) {
  const { force = false, filter: filterFromOptions } = options;

  if (allHistoryItems.length > 0 && !force) {
    // Already have items, maybe just re-render
    renderVisibleItems();
    return;
  }
  
  if (!utilsObj || !masterPasswordProviderFunc) {
    console.error("History UI not initialized with necessary utils.");
    return;
  }

  try {
    const masterPassword = masterPasswordProviderFunc(); // Get current MP if available
    const filter = typeof filterFromOptions === 'string' ? filterFromOptions : (tagFilterInputElement ? tagFilterInputElement.value : '');
    allHistoryItems = await utilsObj.getCachedHistory(passwordStorageInstance, masterPassword, filter) || [];

    if (historyContainerElement && historyListElement) {
        if (allHistoryItems.length === 0) {
            historyListElement.innerHTML = `<div class="empty-state">${callbacksObj.getLocalizedText("noHistory")}</div>`;
            historyListElement.style.height = 'auto'; // Let the empty state define its own height
        } else {
            // *** THIS IS THE FIX ***
            // Set the total height of the list element to enable scrolling
            historyListElement.style.height = `${allHistoryItems.length * ITEM_HEIGHT}px`;
            renderVisibleItems();
        }
    }

    if (utilsObj.logEvent) utilsObj.logEvent('history_refreshed_historyUI', { itemCount: allHistoryItems.length });
  } catch (error) {
    if (utilsObj.logError) utilsObj.logError(error, "refresh_history_error_historyUI");
    if (historyListElement) {
      historyListElement.innerHTML = `<div class="empty-state error">${callbacksObj.getLocalizedText("historyLoadError")}</div>`;
    }
  }
}

// No need to export getHistoryVisibilityState if popup.js doesn't need it directly
// and visibility is managed and applied internally. 