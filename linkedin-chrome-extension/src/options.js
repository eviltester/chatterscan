const SETTINGS_KEY = "linkedinChatterScanSettings";
const { DEFAULT_SETTINGS, normalizeSettings } = window.LinkedInChatterScanSettings;

const controls = {
  includeAds: document.getElementById("includeAds"),
  includePostsWithLinks: document.getElementById("includePostsWithLinks"),
  includePostsWithCommentLinks: document.getElementById("includePostsWithCommentLinks"),
  includePostsWithPulseArticles: document.getElementById("includePostsWithPulseArticles"),
  includePostsWithoutLinks: document.getElementById("includePostsWithoutLinks"),
  includeLinkedInContentLinks: document.getElementById("includeLinkedInContentLinks")
};

const statusElement = document.getElementById("status");
const localStorageBytesElement = document.getElementById("localStorageBytes");
const clearLocalStorageButton = document.getElementById("clearLocalStorage");
let saveTimer = null;

chrome.storage.local.get({ [SETTINGS_KEY]: DEFAULT_SETTINGS }, (items) => {
  const settings = normalizeSettings(items[SETTINGS_KEY]);
  renderSettings(settings);

  for (const input of Object.values(controls)) {
    input.addEventListener("change", scheduleSave);
  }

  refreshLocalStorageUsage();
});

clearLocalStorageButton.addEventListener("click", clearLocalStorage);

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local") {
    refreshLocalStorageUsage();
  }
});

function renderSettings(settings) {
  for (const [key, input] of Object.entries(controls)) {
    input.checked = Boolean(settings[key]);
  }
}

function scheduleSave() {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(save, 100);
}

function save() {
  const settings = {};

  for (const [key, input] of Object.entries(controls)) {
    settings[key] = input.checked;
  }

  chrome.storage.local.set({ [SETTINGS_KEY]: settings }, () => {
    statusElement.textContent = "Saved. Open LinkedIn tabs update automatically.";
    refreshLocalStorageUsage();
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      statusElement.textContent = "";
    }, 1800);
  });
}

function refreshLocalStorageUsage() {
  chrome.storage.local.getBytesInUse(null, (bytes) => {
    localStorageBytesElement.textContent = formatBytes(bytes);
  });
}

function clearLocalStorage() {
  chrome.storage.local.clear(() => {
    renderSettings(DEFAULT_SETTINGS);
    refreshLocalStorageUsage();
    statusElement.textContent = "Local storage cleared. Settings reset to defaults.";
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      statusElement.textContent = "";
    }, 2400);
  });
}

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  return `${(bytes / 1024).toFixed(1)} KB`;
}
