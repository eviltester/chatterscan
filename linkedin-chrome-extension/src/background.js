try {
  importScripts("linkedin-url-utils.js");
} catch (_error) {}

const DISMISSED_POSTS_KEY = "linkedinChatterScanDismissedPosts";
const LEGACY_STATE_KEY = "linkedinChatterScanReaderState";
const SIDEPANEL_PATH = "src/sidepanel.html";
const {
  LINKEDIN_ORIGIN,
  isAllowedSavedSearchUrl,
  isSupportedLinkedInUrl
} = self.LinkedInChatterScanUrlUtils;
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
      notifyActiveTabStatusChangedIfFocused(tab);
    });
  });

  chrome.tabs?.onUpdated?.addListener((tabId, changeInfo, tab) => {
    if (!("url" in changeInfo) && changeInfo.status !== "complete") {
      return;
    }

    updateSidePanelForTab(tabId, tab.url || changeInfo.url);
    if (tab.active) {
      notifyActiveTabStatusChangedIfFocused(tab);
    }
  });

  chrome.windows?.onFocusChanged?.addListener((windowId) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
      return;
    }

    notifyFocusedWindowActiveTabStatus(windowId);
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

  if (message?.type === "linkedinChatterScanGetActiveTabStatus") {
    getActiveTab()
      .then((tab) => sendResponse(createActiveTabStatus(tab)))
      .catch((error) => {
        console.error("[ChatterScan] Failed to read active tab status", error);
        sendResponse(createActiveTabStatus(null));
      });
    return true;
  }

  if (message?.type === "linkedinChatterScanSetAutoScroll") {
    sendMessageToActiveSupportedLinkedInTab({
      type: "linkedinChatterScanSetAutoScroll",
      enabled: Boolean(message.enabled),
      intervalMs: message.intervalMs
    })
      .then((status) => sendResponse({ status }))
      .catch((error) => {
        console.error("[ChatterScan] Failed to set auto scroll", error);
        sendResponse({ error: error.message || "Unable to control the active LinkedIn tab." });
      });
    return true;
  }

  if (message?.type === "linkedinChatterScanOpenSavedSearch") {
    openSavedSearchUrl(message.url)
      .then((url) => sendResponse({ url }))
      .catch((error) => {
        console.error("[ChatterScan] Failed to open saved search", error);
        sendResponse({ error: error.message || "Could not open saved search." });
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

function notifyActiveTabStatusChanged(tab) {
  chrome.runtime
    .sendMessage({
      type: "linkedinChatterScanActiveTabChanged",
      status: createActiveTabStatus(tab)
    })
    .catch(() => {});
}

function notifyActiveTabStatusChangedIfFocused(tab) {
  if (!tab?.windowId || !chrome.windows?.get) {
    return;
  }

  chrome.windows.get(tab.windowId, (windowInfo) => {
    if (chrome.runtime.lastError || !windowInfo?.focused) {
      return;
    }

    notifyActiveTabStatusChanged(tab);
  });
}

function notifyFocusedWindowActiveTabStatus(windowId) {
  if (!chrome.tabs?.query) {
    return;
  }

  chrome.tabs.query({ active: true, windowId }, (tabs) => {
    if (chrome.runtime.lastError) {
      return;
    }

    notifyActiveTabStatusChanged((tabs || [])[0] || null);
  });
}

function createActiveTabStatus(tab) {
  const supported = Boolean(tab?.url && isSupportedLinkedInUrl(tab.url));
  return {
    supported,
    message: supported
      ? "Active on a supported LinkedIn page."
      : "ChatterScan is only active on LinkedIn feed and content search pages."
  };
}

async function getPageZoom(tabId) {
  if (typeof tabId !== "number" || !chrome.tabs?.getZoom) {
    return 1;
  }

  return chrome.tabs.getZoom(tabId);
}

async function sendMessageToActiveSupportedLinkedInTab(message) {
  const tab = await getActiveSupportedLinkedInTab();
  if (!tab?.id) {
    throw new Error("Open a supported LinkedIn tab to auto-scroll.");
  }

  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tab.id, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve(response);
    });
  });
}

async function getActiveSupportedLinkedInTab() {
  if (!chrome.tabs?.query) {
    return null;
  }

  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve((tabs || []).find((tab) => isSupportedLinkedInUrl(tab.url)) || null);
    });
  });
}

async function openSavedSearchUrl(url) {
  if (!isAllowedSavedSearchUrl(url)) {
    throw new Error("Saved searches can only open LinkedIn content search URLs.");
  }

  const tab = await getActiveTab();
  if (tab?.id && chrome.tabs?.update) {
    await chrome.tabs.update(tab.id, { url });
    return url;
  }

  if (chrome.tabs?.create) {
    await chrome.tabs.create({ url });
    return url;
  }

  throw new Error("Could not open a browser tab.");
}

async function getActiveTab() {
  if (!chrome.tabs?.query) {
    return null;
  }

  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve((tabs || [])[0] || null);
    });
  });
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
