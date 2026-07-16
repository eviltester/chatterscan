const DISMISSED_POSTS_KEY = "linkedinChatterScanDismissedPosts";
const LEGACY_STATE_KEY = "linkedinChatterScanReaderState";
const SIDEPANEL_PATH = "src/sidepanel.html";
const LINKEDIN_ORIGIN = "https://www.linkedin.com";
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

if (chrome.sidePanel?.setOptions) {
  refreshSidePanelForExistingTabs();

  chrome.runtime.onInstalled.addListener(refreshSidePanelForExistingTabs);
  chrome.runtime.onStartup?.addListener(refreshSidePanelForExistingTabs);

  chrome.tabs?.onActivated?.addListener(({ tabId }) => {
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError) {
        return;
      }

      updateSidePanelForTab(tabId, tab.url);
    });
  });

  chrome.tabs?.onUpdated?.addListener((tabId, changeInfo, tab) => {
    if (!("url" in changeInfo) && changeInfo.status !== "complete") {
      return;
    }

    updateSidePanelForTab(tabId, tab.url || changeInfo.url);
  });
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

  if (message?.type === "linkedinChatterScanDismissPosts") {
    const keysToDismiss = normalizeDismissedPostKeys(message.keys || []);
    if (keysToDismiss.length === 0) {
      sendResponse({ keys: fallbackDismissedPostKeys });
      return false;
    }

    addDismissedPostKeys(keysToDismiss)
      .then((keys) => {
        notifyDismissedPostsChanged(keys, sender.tab?.id);
        sendResponse({ keys });
      })
      .catch((error) => {
        console.error("[ChatterScan] Failed to dismiss posts", error);
        sendResponse({ keys: fallbackDismissedPostKeys });
      });
    return true;
  }

  if (message?.type === "linkedinChatterScanClearDismissedPosts") {
    clearDismissedPostKeys()
      .then((keys) => {
        notifyDismissedPostsChanged(keys, sender.tab?.id);
        sendResponse({ keys });
      })
      .catch((error) => {
        console.error("[ChatterScan] Failed to clear dismissed posts", error);
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
    fallbackDismissedPostKeys = normalizeDismissedPostKeys(fallbackDismissedPostKeys);
    return fallbackDismissedPostKeys;
  }

  const items = await chrome.storage.session.get({ [DISMISSED_POSTS_KEY]: [] });
  const originalKeys = Array.isArray(items[DISMISSED_POSTS_KEY])
    ? items[DISMISSED_POSTS_KEY]
    : [];
  fallbackDismissedPostKeys = normalizeDismissedPostKeys(originalKeys);

  if (fallbackDismissedPostKeys.length !== originalKeys.length) {
    await chrome.storage.session.set({ [DISMISSED_POSTS_KEY]: fallbackDismissedPostKeys });
  }

  return fallbackDismissedPostKeys;
}

async function addDismissedPostKey(key) {
  return addDismissedPostKeys([key]);
}

async function addDismissedPostKeys(keysToAdd) {
  const keys = new Set(await getDismissedPostKeys());
  for (const key of normalizeDismissedPostKeys(keysToAdd)) {
    keys.add(key);
  }
  fallbackDismissedPostKeys = Array.from(keys);

  if (chrome.storage?.session) {
    await chrome.storage.session.set({ [DISMISSED_POSTS_KEY]: fallbackDismissedPostKeys });
  }

  return fallbackDismissedPostKeys;
}

async function clearDismissedPostKeys() {
  fallbackDismissedPostKeys = [];

  if (chrome.storage?.session) {
    await chrome.storage.session.set({ [DISMISSED_POSTS_KEY]: [] });
  }

  return fallbackDismissedPostKeys;
}

function normalizeDismissedPostKeys(keys) {
  return (Array.isArray(keys) ? keys : [])
    .map((key) => String(key || ""))
    .filter((key) => key && !isLegacyFallbackDismissKey(key));
}

function isLegacyFallbackDismissKey(key) {
  return key.startsWith("fingerprint::");
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
  if (typeof tabId !== "number" || !chrome.tabs?.getZoom) {
    return 1;
  }

  return chrome.tabs.getZoom(tabId);
}

function refreshSidePanelForExistingTabs() {
  chrome.tabs?.query({}, (tabs) => {
    if (chrome.runtime.lastError) {
      return;
    }

    for (const tab of tabs || []) {
      updateSidePanelForTab(tab.id, tab.url);
    }
  });
}

function updateSidePanelForTab(tabId, url) {
  if (typeof tabId !== "number" || !chrome.sidePanel?.setOptions) {
    return;
  }

  const options = isSupportedLinkedInUrl(url)
    ? { tabId, path: SIDEPANEL_PATH, enabled: true }
    : { tabId, enabled: false };

  chrome.sidePanel
    .setOptions(options)
    .catch((error) => console.error("[ChatterScan] Failed to update side panel availability", error));
}

function isSupportedLinkedInUrl(url) {
  if (!url) {
    return false;
  }

  try {
    const parsedUrl = new URL(url);
    return (
      parsedUrl.origin === LINKEDIN_ORIGIN &&
      (parsedUrl.pathname === "/feed" ||
        parsedUrl.pathname === "/feed/" ||
        parsedUrl.pathname === "/search/results/all/" ||
        parsedUrl.pathname === "/search/results/content/")
    );
  } catch (_error) {
    return false;
  }
}
