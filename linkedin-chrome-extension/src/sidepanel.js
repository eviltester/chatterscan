const SETTINGS_KEY = "linkedinChatterScanSettings";
const STATE_KEY = "linkedinChatterScanReaderState";
const { DEFAULT_SETTINGS, normalizeSettings } = window.LinkedInChatterScanSettings;

const controls = {
  includeAds: document.getElementById("includeAds"),
  includePostsWithLinks: document.getElementById("includePostsWithLinks"),
  includePostsWithCommentLinks: document.getElementById("includePostsWithCommentLinks"),
  includePostsWithPulseArticles: document.getElementById("includePostsWithPulseArticles"),
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
  excludedNoLinks: document.querySelector("[data-stat='excludedNoLinks']")
};

const postList = document.getElementById("postList");
const logElement = document.getElementById("log");
const sourceStatus = document.getElementById("sourceStatus");
const settingsSummary = document.getElementById("settingsSummary");
const statsSummary = document.getElementById("statsSummary");
let settings = { ...DEFAULT_SETTINGS };
let latestState = null;
let dismissedPostKeys = new Set();
let saveTimer = null;

chrome.storage.local.get({ [SETTINGS_KEY]: DEFAULT_SETTINGS }, (localItems) => {
  settings = normalizeSettings(localItems[SETTINGS_KEY]);
  renderSettings();

  chrome.storage.session.get({ [STATE_KEY]: null }, (sessionItems) => {
    latestState = sessionItems[STATE_KEY];
    loadDismissedPostKeys(() => renderState(latestState));
  });
});

for (const input of Object.values(controls)) {
  input.addEventListener("change", scheduleSave);
}

document.getElementById("openOptions").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes[SETTINGS_KEY]) {
    settings = normalizeSettings(changes[SETTINGS_KEY].newValue);
    renderSettings();
    return;
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
  const visiblePosts = posts.filter((post) => !isDismissedPost(post));
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
  renderPosts(posts);
}

function renderPosts(posts) {
  const visiblePosts = posts.filter((post) => !isDismissedPost(post));
  postList.replaceChildren();

  if (visiblePosts.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "No matching posts collected yet. Open LinkedIn and scroll manually to scan more.";
    postList.append(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const post of visiblePosts) {
    fragment.append(createPostElement(post));
  }
  postList.append(fragment);
}

function applyPostTextScale(pageZoomFactor) {
  const parsed = Number(pageZoomFactor);
  const scale = Number.isFinite(parsed) && parsed > 0 ? Math.min(Math.max(parsed, 0.5), 3) : 1;
  document.documentElement.style.setProperty("--post-text-scale", scale.toFixed(2));
}

function createPostElement(post) {
  const article = document.createElement("article");
  article.className = "card";
  article.dataset.linkedinChatterscanId = post.key;

  const dismissButton = document.createElement("button");
  dismissButton.className = "dismiss-post";
  dismissButton.type = "button";
  dismissButton.textContent = "[x]";
  dismissButton.setAttribute(
    "aria-label",
    `Remove ${post.author?.name || "post"} from ChatterScan reader`
  );
  dismissButton.addEventListener("click", () => dismissPost(post));
  article.append(dismissButton);

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

    article.append(meta);
  }

  const body = document.createElement("p");
  body.textContent = post.text || "";
  article.append(body);

  if (post.links?.length > 0) {
    const label = document.createElement("div");
    label.className = "links-label";
    label.textContent = getLinksLabel(post.links);
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

function isDismissedPost(post) {
  return dismissedPostKeys.has(getDismissPostKey(post));
}

function getDismissPostKey(post) {
  return post?.dismissalKey || post?.key || "";
}

function loadDismissedPostKeys(callback) {
  chrome.runtime.sendMessage({ type: "linkedinChatterScanGetDismissedPosts" }, (response) => {
    if (!chrome.runtime.lastError && response?.keys) {
      dismissedPostKeys = new Set(response.keys);
    }

    callback();
  });
}
