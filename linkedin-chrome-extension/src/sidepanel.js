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
  getForbiddenPhraseMatches,
  normalizeForbiddenPhrases,
  removeForbiddenPhrase
} = window.LinkedInChatterScanForbiddenPhraseUtils;

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
  excludedNoLinks: document.querySelector("[data-stat='excludedNoLinks']")
};

const postList = document.getElementById("postList");
const savedPostList = document.getElementById("savedPostList");
const forbiddenPostList = document.getElementById("forbiddenPostList");
const mutedPeopleList = document.getElementById("mutedPeopleList");
const logElement = document.getElementById("log");
const sourceStatus = document.getElementById("sourceStatus");
const settingsSummary = document.getElementById("settingsSummary");
const statsSummary = document.getElementById("statsSummary");
const savedPostsSummary = document.getElementById("savedPostsSummary");
const forbiddenPostsSummary = document.getElementById("forbiddenPostsSummary");
const mutedPeopleSummary = document.getElementById("mutedPeopleSummary");
const dismissedPostsSummary = document.getElementById("dismissedPostsSummary");
const clearDismissedPostsButton = document.getElementById("clearDismissedPosts");
let settings = { ...DEFAULT_SETTINGS };
let latestState = null;
let dismissedPostKeys = new Set();
let savedPosts = [];
let mutedPeople = [];
let forbiddenPhrases = [];
let saveTimer = null;

chrome.storage.local.get(
  {
    [SETTINGS_KEY]: DEFAULT_SETTINGS,
    [SAVED_POSTS_KEY]: [],
    [MUTED_PEOPLE_KEY]: [],
    [FORBIDDEN_PHRASES_KEY]: []
  },
  (localItems) => {
    settings = normalizeSettings(localItems[SETTINGS_KEY]);
    savedPosts = normalizeSavedPosts(localItems[SAVED_POSTS_KEY]);
    mutedPeople = normalizeMutedPeople(localItems[MUTED_PEOPLE_KEY]);
    forbiddenPhrases = normalizeForbiddenPhrases(localItems[FORBIDDEN_PHRASES_KEY]);
    renderSettings();
    renderSavedPosts();
    renderMutedPeople();

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
  const mainPosts = visiblePosts.filter((post) => !isForbiddenPost(post));
  const forbiddenPosts = visiblePosts.filter(isForbiddenPost);
  const stats = {
    ...(state?.stats || {}),
    collected: visiblePosts.length
  };

  for (const [key, element] of Object.entries(statElements)) {
    element.textContent = String(stats[key] || 0);
  }
  updateStatsSummary(stats);

  const updatedAt = state?.updatedAt ? new Date(state.updatedAt).toLocaleTimeString() : "";
  sourceStatus.textContent = updatedAt ? `Updated ${updatedAt}` : "Open LinkedIn to start scanning";
  logElement.textContent = (state?.logLines || []).join("\n");
  updateDismissedPostsSummary();
  renderForbiddenPosts(forbiddenPosts);
  renderPosts(mainPosts);
}

function renderPosts(posts) {
  postList.replaceChildren();

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

function renderForbiddenPosts(posts) {
  forbiddenPostsSummary.textContent = `Forbidden phrase matches: ${posts.length}`;
  forbiddenPostList.replaceChildren();

  if (posts.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty forbidden-empty";
    empty.textContent = "No forbidden phrase matches.";
    forbiddenPostList.append(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const post of posts) {
    fragment.append(createPostElement(post, { showForbiddenIncludeButtons: true }));
  }
  forbiddenPostList.append(fragment);
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
    showForbiddenIncludeButtons: Boolean(options.showForbiddenIncludeButtons)
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
  if (options.showForbiddenIncludeButtons) {
    heading.append(createForbiddenIncludeButtons(post));
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

function createForbiddenIncludeButtons(post) {
  const fragment = document.createDocumentFragment();
  for (const phrase of getPostForbiddenPhraseMatches(post)) {
    const button = document.createElement("button");
    button.className = "include-forbidden-phrase";
    button.type = "button";
    button.textContent = `include '${phrase}'`;
    button.setAttribute("aria-label", `Include posts matching forbidden phrase ${phrase}`);
    button.addEventListener("click", () => includeForbiddenPhrase(phrase));
    fragment.append(button);
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
    (stats.excludedNoLinks || 0);

  statsSummary.textContent =
    `Stats: ${stats.scanned || 0} scanned, ${stats.selected || 0} selected, ` +
    `${stats.collected || 0} collected, ${excluded} out`;
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
  appendPostDetails(body, post, "h2");

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

function includeForbiddenPhrase(phrase) {
  setForbiddenPhrases(removeForbiddenPhrase(forbiddenPhrases, phrase));
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

function setForbiddenPhrases(nextPhrases) {
  forbiddenPhrases = normalizeForbiddenPhrases(nextPhrases);
  renderState(latestState);
  chrome.storage.local.set({ [FORBIDDEN_PHRASES_KEY]: forbiddenPhrases });
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
