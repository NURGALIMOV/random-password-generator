// DOM Elements
let tabButtons = [];
let tabContents = [];
let onTabSwitchCallback = null;

function getElements() {
  tabButtons = document.querySelectorAll(".tab-button");
  tabContents = document.querySelectorAll(".tab-content");
}

function handleTabClick(event) {
  const clickedButton = event.currentTarget;
  const targetTabId = clickedButton.dataset.tab;
  const targetContent = document.getElementById(targetTabId);

  if (!targetContent) return;

  const isActive = clickedButton.classList.contains('active');
  const isContentCollapsed = targetContent.classList.contains('collapsed');
  let nowActiveAndExpanded;

  // First, deactivate all other tabs/content if we are activating a new one or toggling an active one.
  tabButtons.forEach((button) => {
    if (button !== clickedButton) {
      button.classList.remove('active');
      const otherContentId = button.dataset.tab;
      const otherContent = document.getElementById(otherContentId);
      if (otherContent) {
        otherContent.classList.remove('active');
        otherContent.classList.add('collapsed');
      }
    }
  });

  if (isActive) {
    // Clicked on already active tab: toggle its content visibility
    if (isContentCollapsed) {
      targetContent.classList.remove('collapsed');
      targetContent.classList.add('active');
      clickedButton.classList.add('active'); // Ensure button stays active
      nowActiveAndExpanded = true;
    } else {
      targetContent.classList.add('collapsed');
      targetContent.classList.remove('active');
      clickedButton.classList.remove('active'); // Button becomes inactive if content is collapsed
      nowActiveAndExpanded = false;
    }
  } else {
    // Clicked on an inactive tab: activate it and expand content
    clickedButton.classList.add('active');
    targetContent.classList.add('active');
    targetContent.classList.remove('collapsed');
    nowActiveAndExpanded = true;
  }

  if (onTabSwitchCallback) {
    onTabSwitchCallback(targetTabId, nowActiveAndExpanded);
  }
}

function setupEventListeners() {
  tabButtons.forEach(button => {
    button.addEventListener("click", handleTabClick);
  });
}
export function initTabsUI(callback) {
  onTabSwitchCallback = callback;
  getElements();
  setupEventListeners();

  // Ensure all tabs start collapsed and inactive
  tabButtons.forEach(button => {
    button.classList.remove('active');
    const contentId = button.dataset.tab;
    const content = document.getElementById(contentId);
    if (content) {
      content.classList.add('collapsed');
      content.classList.remove('active');
    }
  });

  // No tab is active initially, so no need to call onTabSwitchCallback here
  // If a specific tab needs to be opened by default in some scenarios,
  // that should be handled by a separate call to switchToTab after initialization.
}

// Function to programmatically switch to a tab (e.g., after loading password from history)
export function switchToTab(tabId) {
    const targetButton = Array.from(tabButtons).find(btn => btn.dataset.tab === tabId);
    if (targetButton) {
        // Simulate a click or directly call handleTabClick's logic
        // To ensure all logic (including callback) is fired, we can simulate a click
        // if it's not already active and expanded.
        const targetContent = document.getElementById(tabId);
        if (!targetButton.classList.contains('active') || (targetContent && targetContent.classList.contains('collapsed'))) {
            targetButton.click(); // This will trigger handleTabClick and thus the callback
        } else if (onTabSwitchCallback) {
            // If it's already active and expanded, but we were asked to switch, still call the callback
            // This might be useful if other state needs to be refreshed.
            onTabSwitchCallback(tabId, true);
        }
    }
} 