const SETTINGS_KEY = "linkedinChatterScanSettings";
const { DEFAULT_SETTINGS, normalizeSettings } = window.LinkedInChatterScanSettings;

const controls = {
  includeAds: document.getElementById("includeAds"),
  includePostsWithLinks: document.getElementById("includePostsWithLinks"),
  includePostsWithoutLinks: document.getElementById("includePostsWithoutLinks"),
  includeLinkedInContentLinks: document.getElementById("includeLinkedInContentLinks")
};

const statusElement = document.getElementById("status");
let saveTimer = null;

chrome.storage.local.get({ [SETTINGS_KEY]: DEFAULT_SETTINGS }, (items) => {
  const settings = normalizeSettings(items[SETTINGS_KEY]);

  for (const [key, input] of Object.entries(controls)) {
    input.checked = Boolean(settings[key]);
    input.addEventListener("change", scheduleSave);
  }
});

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
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      statusElement.textContent = "";
    }, 1800);
  });
}
