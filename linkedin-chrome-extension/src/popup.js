const SETTINGS_KEY = "linkedinChatterScanSettings";
const { DEFAULT_SETTINGS, normalizeSettings } = window.LinkedInChatterScanSettings;

const controls = {
  includeAds: document.getElementById("includeAds"),
  includePostsWithLinks: document.getElementById("includePostsWithLinks"),
  includePostsWithoutLinks: document.getElementById("includePostsWithoutLinks")
};

const statusElement = document.getElementById("status");
let settings = { ...DEFAULT_SETTINGS };
let saveTimer = null;

chrome.storage.local.get({ [SETTINGS_KEY]: DEFAULT_SETTINGS }, (items) => {
  settings = normalizeSettings(items[SETTINGS_KEY]);

  for (const [key, input] of Object.entries(controls)) {
    input.checked = Boolean(settings[key]);
    input.addEventListener("change", scheduleSave);
  }
});

document.getElementById("openOptions").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

function scheduleSave() {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(save, 100);
}

function save() {
  for (const [key, input] of Object.entries(controls)) {
    settings[key] = input.checked;
  }

  chrome.storage.local.set({ [SETTINGS_KEY]: settings }, () => {
    statusElement.textContent = "Saved";
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      statusElement.textContent = "";
    }, 1200);
  });
}
