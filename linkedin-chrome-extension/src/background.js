const DISMISSED_POSTS_KEY = "linkedinChatterScanDismissedPosts";
const LEGACY_STATE_KEY = "linkedinChatterScanReaderState";
let fallbackDismissedPostKeys = [];

chrome.storage.local.remove(LEGACY_STATE_KEY);

if (chrome.storage.session?.setAccessLevel) {
  chrome.storage.session
    .setAccessLevel({ accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS" })
    .catch((error) => console.error("[ChatterScan] Failed to expose session storage", error));
}

if (chrome.sidePanel?.setPanelBehavior) {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error("[ChatterScan] Failed to configure side panel", error));
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "linkedinChatterScanGetDismissedPosts") {
    getDismissedPostKeys()
      .then((keys) => sendResponse({ keys }))
      .catch((error) => {
        console.error("[ChatterScan] Failed to read dismissed posts", error);
        sendResponse({ keys: fallbackDismissedPostKeys });
      });
    return true;
  }

  if (message?.type === "linkedinChatterScanDismissPost") {
    const key = String(message.key || "");
    if (!key) {
      sendResponse({ keys: fallbackDismissedPostKeys });
      return false;
    }

    addDismissedPostKey(key)
      .then((keys) => {
        notifyDismissedPostsChanged(keys, sender.tab?.id);
        sendResponse({ keys });
      })
      .catch((error) => {
        console.error("[ChatterScan] Failed to dismiss post", error);
        sendResponse({ keys: fallbackDismissedPostKeys });
      });
    return true;
  }

  if (message?.type === "linkedinChatterScanGetPageZoom") {
    getPageZoom(sender.tab?.id)
      .then((zoomFactor) => sendResponse({ zoomFactor }))
      .catch((error) => {
        console.error("[ChatterScan] Failed to read page zoom", error);
        sendResponse({ zoomFactor: 1 });
      });
    return true;
  }

  return false;
});

chrome.tabs?.onZoomChange?.addListener((zoomChangeInfo) => {
  chrome.tabs.get(zoomChangeInfo.tabId, (tab) => {
    if (chrome.runtime.lastError || !tab.url?.startsWith("https://www.linkedin.com/")) {
      return;
    }

    chrome.tabs.sendMessage(
      zoomChangeInfo.tabId,
      {
        type: "linkedinChatterScanPageZoomChanged",
        zoomFactor: zoomChangeInfo.newZoomFactor
      },
      () => void chrome.runtime.lastError
    );
  });
});

async function getDismissedPostKeys() {
  if (!chrome.storage?.session) {
    return fallbackDismissedPostKeys;
  }

  const items = await chrome.storage.session.get({ [DISMISSED_POSTS_KEY]: [] });
  fallbackDismissedPostKeys = Array.isArray(items[DISMISSED_POSTS_KEY])
    ? items[DISMISSED_POSTS_KEY]
    : [];
  return fallbackDismissedPostKeys;
}

async function addDismissedPostKey(key) {
  const keys = new Set(await getDismissedPostKeys());
  keys.add(key);
  fallbackDismissedPostKeys = Array.from(keys);

  if (chrome.storage?.session) {
    await chrome.storage.session.set({ [DISMISSED_POSTS_KEY]: fallbackDismissedPostKeys });
  }

  return fallbackDismissedPostKeys;
}

function notifyDismissedPostsChanged(keys, senderTabId) {
  chrome.runtime
    .sendMessage({ type: "linkedinChatterScanDismissedPostsChanged", keys })
    .catch(() => {});

  chrome.tabs?.query({ url: "https://www.linkedin.com/*" }, (tabs) => {
    for (const tab of tabs || []) {
      if (!tab.id || tab.id === senderTabId) {
        continue;
      }

      chrome.tabs.sendMessage(
        tab.id,
        { type: "linkedinChatterScanDismissedPostsChanged", keys },
        () => void chrome.runtime.lastError
      );
    }
  });
}

async function getPageZoom(tabId) {
  if (!tabId || !chrome.tabs?.getZoom) {
    return 1;
  }

  return chrome.tabs.getZoom(tabId);
}
