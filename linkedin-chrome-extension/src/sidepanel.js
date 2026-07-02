const SETTINGS_KEY = "linkedinChatterScanSettings";
const STATE_KEY = "linkedinChatterScanReaderState";
const { DEFAULT_SETTINGS, normalizeSettings } = window.LinkedInChatterScanSettings;

const controls = {
  includeAds: document.getElementById("includeAds"),
  includePostsWithLinks: document.getElementById("includePostsWithLinks"),
  includePostsWithoutLinks: document.getElementById("includePostsWithoutLinks"),
  includeLinkedInContentLinks: document.getElementById("includeLinkedInContentLinks")
};

const statElements = {
  scanned: document.querySelector("[data-stat='scanned']"),
  selected: document.querySelector("[data-stat='selected']"),
  collected: document.querySelector("[data-stat='collected']"),
  excludedAds: document.querySelector("[data-stat='excludedAds']"),
  excludedWithLinks: document.querySelector("[data-stat='excludedWithLinks']"),
  excludedNoLinks: document.querySelector("[data-stat='excludedNoLinks']")
};

const postList = document.getElementById("postList");
const logElement = document.getElementById("log");
const sourceStatus = document.getElementById("sourceStatus");
let settings = { ...DEFAULT_SETTINGS };
let saveTimer = null;

chrome.storage.local.get(
  {
    [SETTINGS_KEY]: DEFAULT_SETTINGS,
    [STATE_KEY]: null
  },
  (items) => {
    settings = normalizeSettings(items[SETTINGS_KEY]);
    renderSettings();
    renderState(items[STATE_KEY]);
  }
);

for (const input of Object.values(controls)) {
  input.addEventListener("change", scheduleSave);
}

document.getElementById("openOptions").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") {
    return;
  }

  if (changes[SETTINGS_KEY]) {
    settings = normalizeSettings(changes[SETTINGS_KEY].newValue);
    renderSettings();
  }

  if (changes[STATE_KEY]) {
    renderState(changes[STATE_KEY].newValue);
  }
});

function renderSettings() {
  for (const [key, input] of Object.entries(controls)) {
    input.checked = Boolean(settings[key]);
  }
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
  const stats = state?.stats || {};

  for (const [key, element] of Object.entries(statElements)) {
    element.textContent = String(stats[key] || 0);
  }

  const updatedAt = state?.updatedAt ? new Date(state.updatedAt).toLocaleTimeString() : "";
  sourceStatus.textContent = updatedAt ? `Updated ${updatedAt}` : "Open LinkedIn to start scanning";
  logElement.textContent = (state?.logLines || []).join("\n");
  renderPosts(state?.posts || []);
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

function createPostElement(post) {
  const article = document.createElement("article");
  article.className = "card";
  article.dataset.linkedinChatterscanId = post.key;

  const heading = document.createElement("h2");
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
  article.append(heading);

  if (post.postUrl || post.postUrlMissingReason || post.socialContext || post.dateText) {
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

    if (post.postUrlMissingReason) {
      const postLinkNote = document.createElement("span");
      postLinkNote.className = "post-url-note";
      postLinkNote.textContent = `Post link unavailable: ${post.postUrlMissingReason}`;
      meta.append(postLinkNote);
    }

    article.append(meta);
  }

  const body = document.createElement("p");
  body.textContent = post.text || "";
  article.append(body);

  if (post.links?.length > 0) {
    const label = document.createElement("div");
    label.className = "links-label";
    label.textContent = "Links in post:";
    article.append(label);

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
    article.append(list);
  }

  return article;
}
