const SETTINGS_KEY = "linkedinChatterScanSettings";
const { DEFAULT_SETTINGS, normalizeSettings } = window.LinkedInChatterScanSettings;
const {
  FORBIDDEN_PHRASES_KEY,
  normalizeForbiddenPhrases,
  removeForbiddenPhrase
} = window.LinkedInChatterScanForbiddenPhraseUtils;
const {
  AI_PROMPT_TOPICS_KEY,
  normalizeAiPromptTopics,
  removeAiPromptTopic
} = window.LinkedInChatterScanAiPromptTopicUtils;

const controls = {
  includeAds: document.getElementById("includeAds"),
  includePostsWithLinks: document.getElementById("includePostsWithLinks"),
  includePostsWithCommentLinks: document.getElementById("includePostsWithCommentLinks"),
  includePostsWithPulseArticles: document.getElementById("includePostsWithPulseArticles"),
  includePostsWithEmbeddedVideos: document.getElementById("includePostsWithEmbeddedVideos"),
  includePostsWithoutLinks: document.getElementById("includePostsWithoutLinks"),
  includeLinkedInContentLinks: document.getElementById("includeLinkedInContentLinks")
};

const statusElement = document.getElementById("status");
const localStorageBytesElement = document.getElementById("localStorageBytes");
const clearLocalStorageButton = document.getElementById("clearLocalStorage");
const forbiddenPhraseForm = document.getElementById("forbiddenPhraseForm");
const forbiddenPhraseInput = document.getElementById("forbiddenPhraseInput");
const forbiddenPhraseList = document.getElementById("forbiddenPhraseList");
const aiPromptTopicPanel = document.getElementById("aiPromptTopicPanel");
const aiPromptTopicForm = document.getElementById("aiPromptTopicForm");
const aiPromptTopicInput = document.getElementById("aiPromptTopicInput");
const aiPromptTopicList = document.getElementById("aiPromptTopicList");
let forbiddenPhrases = [];
let aiPromptTopics = [];
let saveTimer = null;

chrome.storage.local.get(
  { [SETTINGS_KEY]: DEFAULT_SETTINGS, [FORBIDDEN_PHRASES_KEY]: [], [AI_PROMPT_TOPICS_KEY]: [] },
  (items) => {
    const settings = normalizeSettings(items[SETTINGS_KEY]);
    forbiddenPhrases = normalizeForbiddenPhrases(items[FORBIDDEN_PHRASES_KEY]);
    aiPromptTopics = normalizeAiPromptTopics(items[AI_PROMPT_TOPICS_KEY]);
    renderSettings(settings);
    renderForbiddenPhrases();
    renderAiPromptTopics();

    for (const input of Object.values(controls)) {
      input.addEventListener("change", scheduleSave);
    }

    updateAiPromptTopicVisibility();
    refreshLocalStorageUsage();
  }
);

clearLocalStorageButton.addEventListener("click", clearLocalStorage);
forbiddenPhraseForm.addEventListener("submit", addForbiddenPhrase);
aiPromptTopicForm.addEventListener("submit", addAiPromptTopic);

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local") {
    if (changes[FORBIDDEN_PHRASES_KEY]) {
      forbiddenPhrases = normalizeForbiddenPhrases(changes[FORBIDDEN_PHRASES_KEY].newValue);
      renderForbiddenPhrases();
    }

    if (changes[AI_PROMPT_TOPICS_KEY]) {
      aiPromptTopics = normalizeAiPromptTopics(changes[AI_PROMPT_TOPICS_KEY].newValue);
      renderAiPromptTopics();
    }

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

function renderForbiddenPhrases() {
  forbiddenPhraseList.replaceChildren();

  if (forbiddenPhrases.length === 0) {
    const empty = document.createElement("li");
    empty.className = "phrase-empty";
    empty.textContent = "No forbidden phrases yet.";
    forbiddenPhraseList.append(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const phrase of forbiddenPhrases) {
    fragment.append(createForbiddenPhraseElement(phrase));
  }
  forbiddenPhraseList.append(fragment);
}

function createForbiddenPhraseElement(phrase) {
  const item = document.createElement("li");

  const text = document.createElement("span");
  text.textContent = phrase;
  item.append(text);

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.textContent = "Remove";
  removeButton.setAttribute("aria-label", `Remove forbidden phrase ${phrase}`);
  removeButton.addEventListener("click", () => setForbiddenPhrases(removeForbiddenPhrase(forbiddenPhrases, phrase)));
  item.append(removeButton);

  return item;
}

function renderAiPromptTopics() {
  aiPromptTopicList.replaceChildren();

  if (aiPromptTopics.length === 0) {
    const empty = document.createElement("li");
    empty.className = "phrase-empty";
    empty.textContent = "No AI prompt topics yet.";
    aiPromptTopicList.append(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const topic of aiPromptTopics) {
    fragment.append(createAiPromptTopicElement(topic));
  }
  aiPromptTopicList.append(fragment);
}

function createAiPromptTopicElement(topic) {
  const item = document.createElement("li");

  const text = document.createElement("span");
  text.textContent = topic;
  item.append(text);

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.textContent = "Remove";
  removeButton.setAttribute("aria-label", `Remove AI prompt topic ${topic}`);
  removeButton.addEventListener("click", () => setAiPromptTopics(removeAiPromptTopic(aiPromptTopics, topic)));
  item.append(removeButton);

  return item;
}

function addForbiddenPhrase(event) {
  event.preventDefault();
  const phrase = forbiddenPhraseInput.value;
  const nextPhrases = normalizeForbiddenPhrases([...forbiddenPhrases, phrase]);
  setForbiddenPhrases(nextPhrases);
  forbiddenPhraseInput.value = "";
}

function addAiPromptTopic(event) {
  event.preventDefault();
  const nextTopics = normalizeAiPromptTopics([...aiPromptTopics, aiPromptTopicInput.value]);
  setAiPromptTopics(nextTopics);
  aiPromptTopicInput.value = "";
}

function setForbiddenPhrases(nextPhrases) {
  forbiddenPhrases = normalizeForbiddenPhrases(nextPhrases);
  renderForbiddenPhrases();
  chrome.storage.local.set({ [FORBIDDEN_PHRASES_KEY]: forbiddenPhrases }, () => {
    statusElement.textContent = "Forbidden phrases saved.";
    refreshLocalStorageUsage();
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      statusElement.textContent = "";
    }, 1800);
  });
}

function setAiPromptTopics(nextTopics) {
  aiPromptTopics = normalizeAiPromptTopics(nextTopics);
  renderAiPromptTopics();
  chrome.storage.local.set({ [AI_PROMPT_TOPICS_KEY]: aiPromptTopics }, () => {
    statusElement.textContent = "AI prompt topics saved.";
    refreshLocalStorageUsage();
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      statusElement.textContent = "";
    }, 1800);
  });
}

async function updateAiPromptTopicVisibility() {
  aiPromptTopicPanel.hidden = !(await isPromptApiAvailable());
}

async function isPromptApiAvailable() {
  if (!globalThis.LanguageModel?.availability) {
    return false;
  }

  try {
    return (await LanguageModel.availability(getLanguageModelOptions())) === "available";
  } catch (_error) {
    return false;
  }
}

function getLanguageModelOptions() {
  return {
    expectedInputs: [{ type: "text", languages: ["en"] }],
    expectedOutputs: [{ type: "text", languages: ["en"] }]
  };
}

function clearLocalStorage() {
  chrome.storage.local.clear(() => {
    renderSettings(DEFAULT_SETTINGS);
    forbiddenPhrases = [];
    aiPromptTopics = [];
    renderForbiddenPhrases();
    renderAiPromptTopics();
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
