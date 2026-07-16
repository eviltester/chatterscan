const SETTINGS_KEY = "linkedinChatterScanSettings";
const STATE_KEY = "linkedinChatterScanReaderState";
const SAVED_POSTS_KEY = "linkedinChatterScanSavedPosts";
const { DEFAULT_SETTINGS, normalizeSettings } = window.LinkedInChatterScanSettings;
const {
  MUTED_PEOPLE_KEY,
  createMutedPersonRecord,
  isMutedAuthor,
  normalizeMutedPeople
} = window.LinkedInChatterScanMuteUtils;
const {
  FORBIDDEN_PHRASES_KEY,
  INCLUDED_PHRASES_KEY,
  getForbiddenPhraseMatches,
  getIncludedPhraseMatches,
  normalizeForbiddenPhrases,
  normalizeIncludedPhrases
} = window.LinkedInChatterScanForbiddenPhraseUtils;
const {
  AI_PROMPT_TOPICS_KEY,
  buildAiPromptTopicPrompt,
  buildAiPromptTopicRubricPrompt,
  getAiPromptTopicClassificationResponseSchema,
  getAiPromptTopicRubricResponseSchema,
  getTopicKey,
  normalizeAiPromptTopics,
  parseAiPromptTopicRubricResponse,
  parseAiPromptTopicMatchResponse
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

const statElements = {
  scanned: document.querySelector("[data-stat='scanned']"),
  selected: document.querySelector("[data-stat='selected']"),
  collected: document.querySelector("[data-stat='collected']"),
  excludedAds: document.querySelector("[data-stat='excludedAds']"),
  excludedWithLinks: document.querySelector("[data-stat='excludedWithLinks']"),
  excludedWithCommentLinks: document.querySelector("[data-stat='excludedWithCommentLinks']"),
  excludedWithPulseArticles: document.querySelector("[data-stat='excludedWithPulseArticles']"),
  excludedWithEmbeddedVideos: document.querySelector("[data-stat='excludedWithEmbeddedVideos']"),
  excludedMuted: document.querySelector("[data-stat='excludedMuted']"),
  excludedForbiddenPhrases: document.querySelector("[data-stat='excludedForbiddenPhrases']"),
  includedByPhrase: document.querySelector("[data-stat='includedByPhrase']"),
  excludedNoLinks: document.querySelector("[data-stat='excludedNoLinks']")
};

const postList = document.getElementById("postList");
const savedPostList = document.getElementById("savedPostList");
const forbiddenPostList = document.getElementById("forbiddenPostList");
const aiIgnoredDetails = document.getElementById("aiIgnoredDetails");
const aiIgnoredPostList = document.getElementById("aiIgnoredPostList");
const mutedPeopleList = document.getElementById("mutedPeopleList");
const logElement = document.getElementById("log");
const sourceStatus = document.getElementById("sourceStatus");
const settingsSummary = document.getElementById("settingsSummary");
const statsSummary = document.getElementById("statsSummary");
const aiCapabilitiesSummary = document.getElementById("aiCapabilitiesSummary");
const promptCapabilityMessage = document.getElementById("promptCapabilityMessage");
const summarizerCapabilityMessage = document.getElementById("summarizerCapabilityMessage");
const savedPostsSummary = document.getElementById("savedPostsSummary");
const forbiddenPostsSummary = document.getElementById("forbiddenPostsSummary");
const aiIgnoredPostsSummary = document.getElementById("aiIgnoredPostsSummary");
const mutedPeopleSummary = document.getElementById("mutedPeopleSummary");
const dismissedPostsSummary = document.getElementById("dismissedPostsSummary");
const clearDismissedPostsButton = document.getElementById("clearDismissedPosts");
const clearAllPostsButton = document.getElementById("clearAllPosts");
let settings = { ...DEFAULT_SETTINGS };
let latestState = null;
let dismissedPostKeys = new Set();
let currentFeedPosts = [];
let savedPosts = [];
let mutedPeople = [];
let forbiddenPhrases = [];
let includedPhrases = [];
let aiPromptTopics = [];
let aiPromptAvailable = false;
let aiPromptCapabilityStatus = "checking";
let aiPromptEvaluationRunning = false;
const aiPromptResults = new Map();
const aiPromptRubrics = new Map();
let summarizerAvailable = false;
let summarizerCapabilityStatus = "checking";
let summarizer = null;
let summarizerRunning = false;
const postSummaries = new Map();
let saveTimer = null;

chrome.storage.local.get(
  {
    [SETTINGS_KEY]: DEFAULT_SETTINGS,
    [SAVED_POSTS_KEY]: [],
    [MUTED_PEOPLE_KEY]: [],
    [FORBIDDEN_PHRASES_KEY]: [],
    [INCLUDED_PHRASES_KEY]: [],
    [AI_PROMPT_TOPICS_KEY]: []
  },
  (localItems) => {
    settings = normalizeSettings(localItems[SETTINGS_KEY]);
    savedPosts = normalizeSavedPosts(localItems[SAVED_POSTS_KEY]);
    mutedPeople = normalizeMutedPeople(localItems[MUTED_PEOPLE_KEY]);
    forbiddenPhrases = normalizeForbiddenPhrases(localItems[FORBIDDEN_PHRASES_KEY]);
    includedPhrases = normalizeIncludedPhrases(localItems[INCLUDED_PHRASES_KEY]);
    aiPromptTopics = normalizeAiPromptTopics(localItems[AI_PROMPT_TOPICS_KEY]);
    renderSettings();
    renderSavedPosts();
    renderMutedPeople();
    renderAiCapabilities();
    initializeAiPromptAvailability();
    initializeSummarizerAvailability();

    chrome.storage.session.get({ [STATE_KEY]: null }, (sessionItems) => {
      latestState = sessionItems[STATE_KEY];
      loadDismissedPostKeys(() => renderState(latestState));
    });
  }
);

for (const input of Object.values(controls)) {
  input.addEventListener("change", scheduleSave);
}

document.getElementById("openOptions").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

clearAllPostsButton.addEventListener("click", clearAllFeedPosts);
clearDismissedPostsButton.addEventListener("click", restoreRemovedPosts);

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local") {
    if (changes[SETTINGS_KEY]) {
      settings = normalizeSettings(changes[SETTINGS_KEY].newValue);
      renderSettings();
    }

    if (changes[SAVED_POSTS_KEY]) {
      savedPosts = normalizeSavedPosts(changes[SAVED_POSTS_KEY].newValue);
      renderSavedPosts();
      renderState(latestState);
    }

    if (changes[MUTED_PEOPLE_KEY]) {
      mutedPeople = normalizeMutedPeople(changes[MUTED_PEOPLE_KEY].newValue);
      renderMutedPeople();
      renderState(latestState);
    }

    if (changes[FORBIDDEN_PHRASES_KEY]) {
      forbiddenPhrases = normalizeForbiddenPhrases(changes[FORBIDDEN_PHRASES_KEY].newValue);
      renderState(latestState);
    }

    if (changes[INCLUDED_PHRASES_KEY]) {
      includedPhrases = normalizeIncludedPhrases(changes[INCLUDED_PHRASES_KEY].newValue);
      renderState(latestState);
    }

    if (changes[AI_PROMPT_TOPICS_KEY]) {
      aiPromptTopics = normalizeAiPromptTopics(changes[AI_PROMPT_TOPICS_KEY].newValue);
      pruneAiPromptResults();
      renderState(latestState);
    }
  }

  if (areaName === "session" && changes[STATE_KEY]) {
    latestState = changes[STATE_KEY].newValue;
    renderState(latestState);
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type !== "linkedinChatterScanDismissedPostsChanged") {
    return;
  }

  dismissedPostKeys = new Set(message.keys || []);
  renderState(latestState);
});

function renderSettings() {
  for (const [key, input] of Object.entries(controls)) {
    input.checked = Boolean(settings[key]);
  }

  updateSettingsSummary();
}

function scheduleSave() {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(save, 100);
}

function save() {
  for (const [key, input] of Object.entries(controls)) {
    settings[key] = input.checked;
  }

  chrome.storage.local.set({ [SETTINGS_KEY]: settings });
}

function renderState(state) {
  applyPostTextScale(state?.pageZoomFactor);
  const posts = state?.posts || [];
  const visiblePosts = posts.filter((post) => !isHiddenPost(post));
  const storedForbiddenPosts = visiblePosts.filter(isForbiddenPost);
  const aiPromptCandidatePosts = visiblePosts.filter((post) => !isForbiddenPost(post));
  const aiIgnoredPosts = aiPromptCandidatePosts.filter(isAiPromptIgnoredPost);
  const mainPosts = aiPromptCandidatePosts.filter((post) => !isAiPromptIgnoredPost(post));
  currentFeedPosts = mainPosts;
  const stats = {
    ...(state?.stats || {}),
    collected: aiPromptCandidatePosts.length
  };
  const forbiddenPhraseCount = stats.excludedForbiddenPhrases || storedForbiddenPosts.length;

  for (const [key, element] of Object.entries(statElements)) {
    element.textContent = String(stats[key] || 0);
  }
  updateStatsSummary(stats);

  const updatedAt = state?.updatedAt ? new Date(state.updatedAt).toLocaleTimeString() : "";
  sourceStatus.textContent = updatedAt ? `Updated ${updatedAt}` : "Open LinkedIn to start scanning";
  logElement.textContent = (state?.logLines || []).join("\n");
  updateDismissedPostsSummary();
  renderForbiddenPosts(forbiddenPhraseCount);
  renderAiIgnoredPosts(aiIgnoredPosts);
  renderPosts(mainPosts);
  queueAiPromptEvaluations(aiPromptCandidatePosts);
  queuePostSummaries(mainPosts);
}

function renderPosts(posts) {
  postList.replaceChildren();
  clearAllPostsButton.disabled = posts.length === 0;

  if (posts.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "No matching posts collected yet. Open LinkedIn and scroll manually to scan more.";
    postList.append(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const post of posts) {
    fragment.append(createPostElement(post));
  }
  postList.append(fragment);
}

function renderForbiddenPosts(count) {
  const matchCount = Number(count) || 0;
  forbiddenPostsSummary.textContent = `Forbidden phrase matches ignored: ${matchCount}`;
  forbiddenPostList.replaceChildren();

  const empty = document.createElement("p");
  empty.className = "empty forbidden-empty";
  empty.textContent = matchCount
    ? "Forbidden phrase matches are ignored before posts enter the reader."
    : "No forbidden phrase matches ignored.";
  forbiddenPostList.append(empty);
}

function renderAiIgnoredPosts(posts) {
  aiIgnoredDetails.hidden = !aiPromptAvailable;
  aiIgnoredPostsSummary.textContent = `Ignored because of prompt: ${posts.length}`;
  aiIgnoredPostList.replaceChildren();

  if (posts.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty ai-ignored-empty";
    empty.textContent = "No posts ignored because of prompt topics.";
    aiIgnoredPostList.append(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const post of posts) {
    fragment.append(createPostElement(post, {
      showAiPromptTopics: true,
      showSummary: true,
      showSummaryPlaceholder: false
    }));
  }
  aiIgnoredPostList.append(fragment);
}

function applyPostTextScale(pageZoomFactor) {
  const parsed = Number(pageZoomFactor);
  const scale = Number.isFinite(parsed) && parsed > 0 ? Math.min(Math.max(parsed, 0.5), 3) : 1;
  document.documentElement.style.setProperty("--post-text-scale", scale.toFixed(2));
}

function createPostElement(post, options = {}) {
  const article = document.createElement("article");
  article.className = "card";
  article.dataset.linkedinChatterscanId = post.key;

  article.append(createDismissButtons(post));
  appendPostDetails(article, post, "h2", {
    showMuteButton: true,
    showAiPromptTopics: Boolean(options.showAiPromptTopics),
    showSummary: options.showSummary !== false,
    showSummaryPlaceholder: options.showSummaryPlaceholder !== false
  });

  const actions = document.createElement("div");
  actions.className = "post-actions";
  actions.append(createSaveButton(post));
  article.append(actions);

  return article;
}

function appendPostDetails(container, post, headingTagName, options = {}) {
  const heading = document.createElement(headingTagName);
  if (post.author?.profileUrl) {
    const authorLink = document.createElement("a");
    authorLink.href = post.author.profileUrl;
    authorLink.target = "_blank";
    authorLink.rel = "noreferrer";
    authorLink.textContent = post.author.name;
    heading.append(authorLink);
  } else {
    heading.textContent = post.author?.name || "Unknown author";
  }
  if (options.showMuteButton) {
    heading.append(createMuteButton(post.author));
  }
  heading.append(createIncludedPhraseLabels(post));
  if (options.showAiPromptTopics) {
    heading.append(createAiPromptTopicLabels(post));
  }
  container.append(heading);

  if (post.postUrl || post.socialContext || post.dateText) {
    const meta = document.createElement("div");
    meta.className = "card-meta";

    if (post.socialContext) {
      const context = document.createElement("span");
      context.textContent = `${post.socialContext.verb} by `;

      const contextLink = document.createElement("a");
      contextLink.textContent = post.socialContext.person.name;

      if (post.socialContext.person.profileUrl) {
        contextLink.href = post.socialContext.person.profileUrl;
        contextLink.target = "_blank";
        contextLink.rel = "noreferrer";
      }

      context.append(contextLink);
      meta.append(context);
    }

    if (post.dateText) {
      const date = document.createElement("span");
      date.textContent = post.dateText;
      meta.append(date);
    }

    if (post.postUrl) {
      const postLink = document.createElement("a");
      postLink.href = post.postUrl;
      postLink.target = "_blank";
      postLink.rel = "noreferrer";
      postLink.textContent = "Open LinkedIn post";
      meta.append(postLink);
    }

    container.append(meta);
  }

  if (options.showSummary !== false) {
    const summary = getPostSummaryDisplay(post, {
      showPlaceholder: options.showSummaryPlaceholder !== false
    });
    if (summary.text) {
      const summaryElement = document.createElement("p");
      summaryElement.className = summary.pending ? "post-summary post-summary-pending" : "post-summary";
      summaryElement.textContent = summary.text;
      container.append(summaryElement);
    }
  }

  const body = document.createElement("p");
  body.textContent = post.text || "";
  container.append(body);

  if (post.links?.length > 0) {
    const label = document.createElement("div");
    label.className = "links-label";
    label.textContent = getLinksLabel(post.links);
    container.append(label);

    const list = document.createElement("ul");
    for (const link of post.links) {
      const item = document.createElement("li");
      const anchor = document.createElement("a");
      anchor.href = link.href;
      anchor.target = "_blank";
      anchor.rel = "noreferrer";
      anchor.textContent = link.label;
      item.append(anchor);
      list.append(item);
    }
    container.append(list);
  }

  if (post.hasEmbeddedVideo) {
    const videoNote = document.createElement("div");
    videoNote.className = "media-label";
    videoNote.textContent = "Embedded video detected";
    container.append(videoNote);
  }
}

function createDismissButton(post, className, position = "") {
  const dismissButton = document.createElement("button");
  dismissButton.className = className;
  dismissButton.type = "button";
  dismissButton.textContent = "[x]";
  const positionText = position ? ` from the ${position} corner` : "";
  dismissButton.setAttribute(
    "aria-label",
    `Remove ${post.author?.name || "post"} from ChatterScan reader${positionText}`
  );
  dismissButton.addEventListener("click", () => dismissPost(post));
  return dismissButton;
}

function createDismissButtons(post) {
  const fragment = document.createDocumentFragment();
  const positions = [
    ["dismiss-post dismiss-post-top-left", "top left"],
    ["dismiss-post dismiss-post-top-right", "top right"],
    ["dismiss-post dismiss-post-bottom-left", "bottom left"],
    ["dismiss-post dismiss-post-bottom-right", "bottom right"]
  ];

  for (const [className, position] of positions) {
    fragment.append(createDismissButton(post, className, position));
  }

  return fragment;
}

function createSaveButton(post) {
  const saveButton = document.createElement("button");
  const isSaved = isSavedPost(post);
  saveButton.className = "save-post";
  saveButton.type = "button";
  saveButton.textContent = isSaved ? "[saved]" : "[save]";
  saveButton.disabled = isSaved;
  saveButton.setAttribute(
    "aria-label",
    `${isSaved ? "Saved" : "Save"} ${post.author?.name || "post"} to local storage`
  );
  saveButton.addEventListener("click", () => savePost(post));
  return saveButton;
}

function createMuteButton(author) {
  const muteButton = document.createElement("button");
  const isMuted = isMutedAuthor(mutedPeople, author);
  muteButton.className = "mute-person";
  muteButton.type = "button";
  muteButton.textContent = isMuted ? "[muted]" : "[mute]";
  muteButton.disabled = isMuted;
  muteButton.setAttribute(
    "aria-label",
    `${isMuted ? "Muted" : "Mute"} ${author?.name || "author"}`
  );
  muteButton.addEventListener("click", () => mutePerson(author));
  return muteButton;
}

function createAiPromptTopicLabels(post) {
  const fragment = document.createDocumentFragment();
  for (const topic of getAiPromptIgnoredTopics(post)) {
    const label = document.createElement("span");
    label.className = "ai-prompt-topic-label";
    label.textContent = `ignored: ${topic}`;
    fragment.append(label);
  }
  return fragment;
}

function createIncludedPhraseLabels(post) {
  const fragment = document.createDocumentFragment();
  for (const phrase of getPostIncludedPhraseMatches(post)) {
    const label = document.createElement("span");
    label.className = "included-phrase-label";
    label.textContent = `included: "${phrase}"`;
    fragment.append(label);
  }
  return fragment;
}

function getLinksLabel(links) {
  const sources = [];
  const hasBodyLinks = links.some((link) => !link.source || link.source === "body");
  const hasCommentLinks = links.some((link) => link.source === "comment");
  const hasPulseLinks = links.some((link) => link.source === "pulse");

  if (hasBodyLinks) {
    sources.push("post");
  }

  if (hasCommentLinks) {
    sources.push("comments");
  }

  if (hasPulseLinks) {
    sources.push("Pulse articles");
  }

  if (sources.length === 1 && sources[0] === "Pulse articles") {
    return "Pulse articles:";
  }

  return `Links in ${joinLabels(sources)}:`;
}

function updateSettingsSummary() {
  const included = [];

  if (settings.includePostsWithLinks) {
    included.push("post links");
  }

  if (settings.includePostsWithCommentLinks) {
    included.push("comment links");
  }

  if (settings.includePostsWithPulseArticles) {
    included.push("Pulse");
  }

  if (settings.includePostsWithEmbeddedVideos) {
    included.push("video");
  }

  if (settings.includePostsWithoutLinks) {
    included.push("no-link posts");
  }

  if (settings.includeAds) {
    included.push("ads");
  }

  const contentLinks = settings.includeLinkedInContentLinks ? "LinkedIn content on" : "LinkedIn content off";
  const includedText = included.length > 0 ? joinLabels(included) : "none";
  settingsSummary.textContent = `Filters: ${includedText}; ${contentLinks}`;
}

function updateStatsSummary(stats) {
  const excluded =
    (stats.excludedAds || 0) +
    (stats.excludedWithLinks || 0) +
    (stats.excludedWithCommentLinks || 0) +
    (stats.excludedWithPulseArticles || 0) +
    (stats.excludedWithEmbeddedVideos || 0) +
    (stats.excludedMuted || 0) +
    (stats.excludedForbiddenPhrases || 0) +
    (stats.excludedNoLinks || 0);

  statsSummary.textContent =
    `Stats: ${stats.scanned || 0} scanned, ${stats.selected || 0} selected, ` +
    `${stats.collected || 0} collected, ${excluded} out`;
}

function renderAiCapabilities() {
  const promptText = getCapabilityStatusText(
    "Prompt API",
    aiPromptCapabilityStatus,
    "AI topic filtering enabled"
  );
  const summarizerText = getCapabilityStatusText(
    "Summarizer API",
    summarizerCapabilityStatus,
    "generating summaries for included posts"
  );
  promptCapabilityMessage.textContent = promptText;
  summarizerCapabilityMessage.textContent = summarizerText;
  aiCapabilitiesSummary.textContent = `AI: ${getShortCapabilityStatus("Prompt", aiPromptCapabilityStatus)}, ${getShortCapabilityStatus("Summarizer", summarizerCapabilityStatus)}`;
}

function getCapabilityStatusText(label, status, availableMessage = "available") {
  const messages = {
    available: `${label}: available; ${availableMessage}`,
    readily: `${label}: available; ${availableMessage}`,
    downloadable: `${label}: model download required`,
    downloading: `${label}: model downloading`,
    unavailable: `${label}: unavailable`,
    "not-supported": `${label}: not supported in this Chrome profile`,
    error: `${label}: unavailable after capability check`,
    checking: `${label}: checking...`
  };

  return messages[status] || `${label}: ${status}`;
}

function getShortCapabilityStatus(label, status) {
  const states = {
    available: "available",
    readily: "available",
    downloadable: "download needed",
    downloading: "downloading",
    unavailable: "unavailable",
    "not-supported": "not supported",
    error: "unavailable",
    checking: "checking"
  };

  return `${label} ${states[status] || status}`;
}

function getAvailabilityStatus(availability) {
  return String(availability || "unavailable");
}

function joinLabels(labels) {
  if (labels.length <= 1) {
    return labels[0] || "post";
  }

  if (labels.length === 2) {
    return `${labels[0]} and ${labels[1]}`;
  }

  return `${labels.slice(0, -1).join(", ")}, and ${labels.at(-1)}`;
}

function dismissPost(post) {
  const key = getDismissPostKey(post);
  if (!key) {
    return;
  }

  dismissedPostKeys.add(key);
  renderState(latestState);
  chrome.runtime.sendMessage({ type: "linkedinChatterScanDismissPost", key }, (response) => {
    if (chrome.runtime.lastError) {
      return;
    }

    if (response?.keys) {
      dismissedPostKeys = new Set(response.keys);
      renderState(latestState);
    }
  });
}

function clearAllFeedPosts() {
  const keys = currentFeedPosts.map(getDismissPostKey).filter(Boolean);
  if (keys.length === 0) {
    return;
  }

  for (const key of keys) {
    dismissedPostKeys.add(key);
  }
  renderState(latestState);
  chrome.runtime.sendMessage({ type: "linkedinChatterScanDismissPosts", keys }, (response) => {
    if (chrome.runtime.lastError) {
      return;
    }

    if (response?.keys) {
      dismissedPostKeys = new Set(response.keys);
      renderState(latestState);
    }
  });
}

function restoreRemovedPosts() {
  chrome.runtime.sendMessage({ type: "linkedinChatterScanClearDismissedPosts" }, (response) => {
    if (!chrome.runtime.lastError && response?.keys) {
      dismissedPostKeys = new Set(response.keys);
      renderState(latestState);
    }
  });
}

function isDismissedPost(post) {
  return dismissedPostKeys.has(getDismissPostKey(post));
}

function isHiddenPost(post) {
  return isDismissedPost(post) || isMutedAuthor(mutedPeople, post?.author);
}

function isForbiddenPost(post) {
  return getPostForbiddenPhraseMatches(post).length > 0;
}

function getPostForbiddenPhraseMatches(post) {
  return getForbiddenPhraseMatches(post?.text || "", forbiddenPhrases);
}

function getPostIncludedPhraseMatches(post) {
  return getIncludedPhraseMatches(post?.text || "", includedPhrases);
}

function isAiPromptIgnoredPost(post) {
  return getAiPromptIgnoredTopics(post).length > 0;
}

function getAiPromptIgnoredTopics(post) {
  if (!aiPromptAvailable) {
    return [];
  }

  return aiPromptTopics.filter((topic) => aiPromptResults.get(getAiPromptResultKey(post, topic)) === "yes");
}

function getDismissPostKey(post) {
  return post?.dismissalKey || post?.key || "";
}

function loadDismissedPostKeys(callback) {
  chrome.runtime.sendMessage({ type: "linkedinChatterScanGetDismissedPosts" }, (response) => {
    if (!chrome.runtime.lastError && response?.keys) {
      dismissedPostKeys = new Set(response.keys);
    }

    updateDismissedPostsSummary();
    callback();
  });
}

function updateDismissedPostsSummary() {
  dismissedPostsSummary.textContent = `Removed this session: ${dismissedPostKeys.size}`;
  clearDismissedPostsButton.disabled = dismissedPostKeys.size === 0;
}

function renderMutedPeople() {
  mutedPeopleSummary.textContent = `Muted: ${mutedPeople.length}`;
  mutedPeopleList.replaceChildren();

  if (mutedPeople.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty muted-empty";
    empty.textContent = "No muted people yet.";
    mutedPeopleList.append(empty);
    return;
  }

  const list = document.createElement("ul");
  list.className = "muted-people";
  for (const person of mutedPeople) {
    list.append(createMutedPersonElement(person));
  }
  mutedPeopleList.append(list);
}

function createMutedPersonElement(person) {
  const item = document.createElement("li");

  const name = person.profileUrl ? document.createElement("a") : document.createElement("span");
  name.textContent = person.name;
  if (person.profileUrl) {
    name.href = person.profileUrl;
    name.target = "_blank";
    name.rel = "noreferrer";
  }
  item.append(name);

  const unmuteButton = document.createElement("button");
  unmuteButton.className = "unmute-person";
  unmuteButton.type = "button";
  unmuteButton.textContent = "[unmute]";
  unmuteButton.setAttribute("aria-label", `Unmute ${person.name}`);
  unmuteButton.addEventListener("click", () => unmutePerson(person.id));
  item.append(unmuteButton);

  return item;
}

function renderSavedPosts() {
  savedPostsSummary.textContent = `Saved posts: ${savedPosts.length}`;
  savedPostList.replaceChildren();

  if (savedPosts.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty saved-empty";
    empty.textContent = "No saved posts yet.";
    savedPostList.append(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const post of savedPosts) {
    fragment.append(createSavedPostElement(post));
  }
  savedPostList.append(fragment);
}

function createSavedPostElement(post) {
  const details = document.createElement("details");
  details.className = "saved-card";
  details.dataset.linkedinChatterscanSavedId = post.id;

  const summary = document.createElement("summary");
  summary.textContent = getSavedPostSummary(post);
  details.append(summary);

  const body = document.createElement("div");
  body.className = "saved-card-body";
  appendPostDetails(body, post, "h2", { showSummary: false });

  const actions = document.createElement("div");
  actions.className = "post-actions";
  actions.append(createDeleteSavedPostButton(post));
  body.append(actions);

  details.append(body);
  return details;
}

function createDeleteSavedPostButton(post) {
  const deleteButton = document.createElement("button");
  deleteButton.className = "delete-saved-post";
  deleteButton.type = "button";
  deleteButton.textContent = "[delete]";
  deleteButton.setAttribute(
    "aria-label",
    `Delete saved ${post.author?.name || "post"} from local storage`
  );
  deleteButton.addEventListener("click", () => deleteSavedPost(post.id));
  return deleteButton;
}

function getSavedPostSummary(post) {
  const titleParts = [post.author?.name, post.dateText].filter(Boolean);
  const fallbackText = post.hasEmbeddedVideo ? "Embedded video detected" : "Saved post";
  const text = post.text || post.links?.[0]?.label || fallbackText;
  const title = titleParts.join(" - ");
  const summary = truncate(text.replace(/\s+/g, " ").trim(), 90);
  return title ? `${title}: ${summary}` : summary;
}

function savePost(post) {
  const record = createSavedPostRecord(post);
  if (!record) {
    return;
  }

  const nextPosts = [record, ...savedPosts.filter((savedPost) => savedPost.id !== record.id)];
  setSavedPosts(nextPosts);
}

function mutePerson(author) {
  const record = createMutedPersonRecord(author);
  if (!record) {
    return;
  }

  const nextPeople = [
    record,
    ...mutedPeople.filter((person) => person.id !== record.id && person.nameKey !== record.nameKey)
  ];
  setMutedPeople(nextPeople);
}

function unmutePerson(id) {
  if (!id) {
    return;
  }

  setMutedPeople(mutedPeople.filter((person) => person.id !== id));
}

function deleteSavedPost(id) {
  if (!id) {
    return;
  }

  setSavedPosts(savedPosts.filter((post) => post.id !== id));
}

function setSavedPosts(nextPosts) {
  savedPosts = normalizeSavedPosts(nextPosts);
  renderSavedPosts();
  renderState(latestState);
  chrome.storage.local.set({ [SAVED_POSTS_KEY]: savedPosts });
}

function setMutedPeople(nextPeople) {
  mutedPeople = normalizeMutedPeople(nextPeople);
  renderMutedPeople();
  renderState(latestState);
  chrome.storage.local.set({ [MUTED_PEOPLE_KEY]: mutedPeople });
}

async function initializeAiPromptAvailability() {
  const availability = await getPromptApiAvailability();
  aiPromptAvailable = availability === "available";
  aiPromptCapabilityStatus = getAvailabilityStatus(availability);
  aiIgnoredDetails.hidden = !aiPromptAvailable;
  renderAiCapabilities();
  renderState(latestState);
}

async function initializeSummarizerAvailability() {
  const availability = await getSummarizerAvailabilityStatus();
  summarizerAvailable = availability === "available" || availability === "readily";
  summarizerCapabilityStatus = getAvailabilityStatus(availability);
  renderAiCapabilities();
  renderState(latestState);
}

async function getSummarizerAvailabilityStatus() {
  if (!globalThis.Summarizer?.availability) {
    return "not-supported";
  }

  try {
    return await getSummarizerAvailability();
  } catch (_error) {
    return "error";
  }
}

async function getSummarizerAvailability() {
  try {
    return await Summarizer.availability(getSummarizerOptions());
  } catch (_error) {
    return Summarizer.availability();
  }
}

function queuePostSummaries(posts) {
  if (!summarizerAvailable || posts.length === 0) {
    return;
  }

  for (const post of posts) {
    if (!getSummarizablePostText(post)) {
      continue;
    }

    const key = getPostSummaryKey(post);
    if (!postSummaries.has(key)) {
      postSummaries.set(key, { status: "queued" });
    }
  }

  void runPostSummaryQueue();
}

async function runPostSummaryQueue() {
  if (summarizerRunning) {
    return;
  }

  summarizerRunning = true;
  try {
    while (true) {
      const next = getNextQueuedPostSummary();
      if (!next) {
        return;
      }

      await summarizePost(next.post, next.key);
    }
  } finally {
    summarizerRunning = false;
  }
}

function getNextQueuedPostSummary() {
  for (const post of getCurrentMainPosts()) {
    const key = getPostSummaryKey(post);
    if (postSummaries.get(key)?.status === "queued") {
      return { post, key };
    }
  }

  return null;
}

async function summarizePost(post, key) {
  postSummaries.set(key, { status: "running" });
  try {
    const summary = await (await getSummarizer()).summarize(getSummarizablePostText(post), {
      context: "Summarize this LinkedIn post for a reader scanning a curated feed."
    });
    const text = normalizeSummaryText(summary);
    postSummaries.set(key, text ? { status: "ready", summary: text } : { status: "error" });
  } catch (_error) {
    postSummaries.set(key, { status: "error" });
  }

  renderState(latestState);
}

async function getSummarizer() {
  if (summarizer) {
    return summarizer;
  }

  summarizer = await Summarizer.create(getSummarizerOptions());
  return summarizer;
}

function getSummarizerOptions() {
  return {
    type: "tldr",
    format: "plain-text",
    length: "short",
    sharedContext: "LinkedIn feed posts shown in a curated reader."
  };
}

function getCurrentMainPosts() {
  const posts = latestState?.posts || [];
  const visiblePosts = posts.filter((post) => !isHiddenPost(post));
  const aiPromptCandidatePosts = visiblePosts.filter((post) => !isForbiddenPost(post));
  return aiPromptCandidatePosts.filter((post) => !isAiPromptIgnoredPost(post));
}

function getPostSummaryDisplay(post, options = {}) {
  if (!summarizerAvailable || !getSummarizablePostText(post)) {
    return { text: "", pending: false };
  }

  const summary = postSummaries.get(getPostSummaryKey(post));
  if (summary?.status === "ready" && summary.summary) {
    return { text: summary.summary, pending: false };
  }

  if (summary?.status === "error") {
    return { text: "", pending: false };
  }

  if (options.showPlaceholder === false) {
    return { text: "", pending: false };
  }

  return { text: "Generating summary for post...", pending: true };
}

function getPostSummaryKey(post) {
  return JSON.stringify([post?.dismissalKey || post?.key || "", createPostTextSignature(post)]);
}

function createPostTextSignature(post) {
  const text = getSummarizablePostText(post);
  return `${text.length}:${text.slice(0, 500)}`;
}

function getSummarizablePostText(post) {
  return String(post?.text || "").replace(/\s+/g, " ").trim();
}

function normalizeSummaryText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

async function isPromptApiAvailable() {
  return (await getPromptApiAvailability()) === "available";
}

async function getPromptApiAvailability() {
  if (!globalThis.LanguageModel?.availability) {
    return "not-supported";
  }

  try {
    return await LanguageModel.availability(getLanguageModelOptions());
  } catch (_error) {
    return "error";
  }
}

function getLanguageModelOptions() {
  return {
    expectedInputs: [{ type: "text", languages: ["en"] }],
    expectedOutputs: [{ type: "text", languages: ["en"] }]
  };
}

function queueAiPromptEvaluations(posts) {
  if (!aiPromptAvailable || aiPromptTopics.length === 0 || posts.length === 0) {
    return;
  }

  for (const post of posts) {
    for (const topic of aiPromptTopics) {
      const key = getAiPromptResultKey(post, topic);
      if (!aiPromptResults.has(key)) {
        aiPromptResults.set(key, "queued");
      }
    }
  }

  void runAiPromptEvaluationQueue();
}

async function runAiPromptEvaluationQueue() {
  if (aiPromptEvaluationRunning) {
    return;
  }

  aiPromptEvaluationRunning = true;
  try {
    while (true) {
      const next = getNextQueuedAiPromptEvaluation();
      if (!next) {
        return;
      }

      await evaluatePostAgainstAiPromptTopic(next.post, next.topic, next.key);
    }
  } finally {
    aiPromptEvaluationRunning = false;
  }
}

function getNextQueuedAiPromptEvaluation() {
  const posts = latestState?.posts || [];
  for (const post of posts) {
    if (isHiddenPost(post) || isForbiddenPost(post)) {
      continue;
    }

    for (const topic of aiPromptTopics) {
      const key = getAiPromptResultKey(post, topic);
      if (aiPromptResults.get(key) === "queued") {
        return { post, topic, key };
      }
    }
  }

  return null;
}

async function evaluatePostAgainstAiPromptTopic(post, topic, key) {
  aiPromptResults.set(key, "running");
  let session = null;
  try {
    const rubric = await getAiPromptRubric(topic);
    session = await createAiPromptClassificationSession();
    const response = await session.prompt(
      buildAiPromptTopicPrompt(rubric, post.text),
      getAiPromptClassificationRequestOptions()
    );
    aiPromptResults.set(key, parseAiPromptTopicMatchResponse(response) ? "yes" : "no");
  } catch (_error) {
    aiPromptResults.set(key, "error");
  } finally {
    session?.destroy?.();
  }

  renderState(latestState);
}

async function getAiPromptRubric(topic) {
  const topicKey = getTopicKey(topic);
  const existing = aiPromptRubrics.get(topicKey);
  if (existing?.status === "ready") {
    return existing.rubric;
  }
  if (existing?.status === "running") {
    return existing.promise;
  }

  const promise = generateAiPromptRubric(topic);
  aiPromptRubrics.set(topicKey, { status: "running", promise });
  try {
    const rubric = await promise;
    aiPromptRubrics.set(topicKey, { status: "ready", rubric });
    return rubric;
  } catch (error) {
    aiPromptRubrics.set(topicKey, { status: "error" });
    throw error;
  }
}

async function generateAiPromptRubric(topic) {
  let session = null;
  try {
    session = await createAiPromptRubricSession();
    const response = await session.prompt(
      buildAiPromptTopicRubricPrompt(topic),
      getAiPromptRubricRequestOptions()
    );
    return parseAiPromptTopicRubricResponse(response, topic);
  } finally {
    session?.destroy?.();
  }
}

async function createAiPromptRubricSession() {
  return createAiPromptSession([
    "You convert short user ignore instructions into strict LinkedIn filtering rubrics.",
    "The rubric must be narrow, evidence-driven, and useful for avoiding overmatching."
  ].join(" "));
}

async function createAiPromptClassificationSession() {
  return createAiPromptSession([
    "You are a conservative LinkedIn post classifier.",
    "You evaluate one post against one rubric.",
    "Return matches true only with high confidence and exact evidence quoted from the post."
  ].join(" "));
}

async function createAiPromptSession(systemContent) {
  return LanguageModel.create({
    ...getLanguageModelOptions(),
    initialPrompts: [
      {
        role: "system",
        content: systemContent
      }
    ]
  });
}

function getAiPromptRubricRequestOptions() {
  return getAiPromptRequestOptions(getAiPromptTopicRubricResponseSchema());
}

function getAiPromptClassificationRequestOptions() {
  return getAiPromptRequestOptions(getAiPromptTopicClassificationResponseSchema());
}

function getAiPromptRequestOptions(responseConstraint) {
  const options = {
    responseConstraint
  };

  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    options.signal = AbortSignal.timeout(45000);
  }

  return options;
}

function getAiPromptResultKey(post, topic) {
  return JSON.stringify([post?.dismissalKey || post?.key || "", getTopicKey(topic)]);
}

function pruneAiPromptResults() {
  const topicKeys = new Set(aiPromptTopics.map(getTopicKey));
  for (const key of aiPromptResults.keys()) {
    const topicKey = getTopicKeyFromAiPromptResultKey(key);
    if (!topicKeys.has(topicKey)) {
      aiPromptResults.delete(key);
    }
  }

  for (const key of aiPromptRubrics.keys()) {
    if (!topicKeys.has(key)) {
      aiPromptRubrics.delete(key);
    }
  }
}

function getTopicKeyFromAiPromptResultKey(key) {
  try {
    const parsed = JSON.parse(key);
    return Array.isArray(parsed) ? parsed[1] || "" : "";
  } catch (_error) {
    return "";
  }
}

function isSavedPost(post) {
  const id = getSavedPostId(post);
  return Boolean(id && savedPosts.some((savedPost) => savedPost.id === id));
}

function createSavedPostRecord(post) {
  const id = getSavedPostId(post);
  if (!id) {
    return null;
  }

  return normalizeSavedPost({
    id,
    savedAt: Date.now(),
    key: post.key,
    dismissalKey: post.dismissalKey,
    author: normalizePerson(post.author),
    socialContext: normalizeSocialContext(post.socialContext),
    dateText: post.dateText,
    text: post.text,
    postUrl: getHttpUrl(post.postUrl),
    links: normalizeSavedLinks(post.links),
    hasEmbeddedVideo: Boolean(post.hasEmbeddedVideo)
  });
}

function normalizeSavedPosts(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(normalizeSavedPost).filter(Boolean);
}

function normalizeSavedPost(post) {
  if (!post || typeof post !== "object") {
    return null;
  }

  const id = String(post.id || post.dismissalKey || post.key || "").trim();
  if (!id) {
    return null;
  }

  return {
    id,
    savedAt: Number(post.savedAt) || Date.now(),
    key: String(post.key || ""),
    dismissalKey: String(post.dismissalKey || ""),
    author: normalizePerson(post.author),
    socialContext: normalizeSocialContext(post.socialContext),
    dateText: String(post.dateText || ""),
    text: String(post.text || ""),
    postUrl: getHttpUrl(post.postUrl),
    links: normalizeSavedLinks(post.links),
    hasEmbeddedVideo: Boolean(post.hasEmbeddedVideo)
  };
}

function normalizePerson(person) {
  if (!person || typeof person !== "object") {
    return null;
  }

  return {
    name: String(person.name || ""),
    profileUrl: getHttpUrl(person.profileUrl)
  };
}

function normalizeSocialContext(context) {
  if (!context || typeof context !== "object") {
    return null;
  }

  const person = normalizePerson(context.person);
  if (!person?.name) {
    return null;
  }

  return {
    verb: String(context.verb || "shared"),
    person
  };
}

function normalizeSavedLinks(links) {
  if (!Array.isArray(links)) {
    return [];
  }

  return links
    .map((link) => {
      const href = getHttpUrl(link?.href);
      if (!href) {
        return null;
      }

      return {
        href,
        label: String(link.label || href),
        source: String(link.source || "body")
      };
    })
    .filter(Boolean);
}

function getSavedPostId(post) {
  return String(post?.dismissalKey || post?.key || "").trim();
}

function getHttpUrl(value) {
  if (!value) {
    return "";
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

function truncate(value, length) {
  if (value.length <= length) {
    return value;
  }

  return `${value.slice(0, Math.max(0, length - 1)).trim()}...`;
}
