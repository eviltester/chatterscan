(function attachPostStore(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  root.LinkedInChatterScanCore = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, () => {
  function createPostStore() {
    const postsByKey = new Map();
    const fallbackCardKeys = new WeakMap();
    let nextFallbackCardId = 1;

    function getPostKey(card) {
      return getActivityId(card) || getFallbackCardKey(card);
    }

    function getFallbackCardKey(card) {
      if (!fallbackCardKeys.has(card)) {
        fallbackCardKeys.set(card, `dom-card:${nextFallbackCardId}`);
        nextFallbackCardId += 1;
      }

      return fallbackCardKeys.get(card);
    }

    function tagCard(card, key) {
      if (!card.dataset) {
        card.dataset = {};
      }

      card.dataset.linkedinChatterscanId = key;
    }

    function upsertPost(post) {
      if (postsByKey.has(post.key)) {
        return "unchanged";
      }

      postsByKey.set(post.key, {
        ...post,
        seenAt: Date.now()
      });
      return "added";
    }

    return {
      postsByKey,
      getActivityId,
      getPostUrlFromKey,
      getPostKey,
      tagCard,
      upsertPost
    };
  }

  function getActivityId(card) {
    const directActivityId =
      getPostIdFromValue(card.getAttribute?.("data-urn")) ||
      getPostIdFromValue(card.getAttribute?.("data-id")) ||
      getPostIdFromValue(card.getAttribute?.("data-entity-urn")) ||
      getPostIdFromValue(card.getAttribute?.("data-chameleon-result-urn")) ||
      getPostIdFromValue(card.id);

    if (directActivityId) {
      return directActivityId;
    }

    const activityNode = card.querySelector?.(
      [
        "[data-urn^='urn:li:activity']",
        "[data-id^='urn:li:activity']",
        "[data-entity-urn^='urn:li:activity']",
        "[data-chameleon-result-urn*='urn:li:activity']",
        "[data-urn^='urn:li:ugcPost']",
        "[data-id^='urn:li:ugcPost']",
        "[data-entity-urn^='urn:li:ugcPost']",
        "[data-chameleon-result-urn*='urn:li:ugcPost']"
      ].join(",")
    );

    if (activityNode) {
      const nestedActivityId =
        getPostIdFromValue(activityNode.getAttribute?.("data-urn")) ||
        getPostIdFromValue(activityNode.getAttribute?.("data-id")) ||
        getPostIdFromValue(activityNode.getAttribute?.("data-entity-urn")) ||
        getPostIdFromValue(activityNode.getAttribute?.("data-chameleon-result-urn"));

      if (nestedActivityId) {
        return nestedActivityId;
      }
    }

    return "";
  }

  function getPostIdFromValue(value) {
    if (!value) {
      return "";
    }

    const text = String(value);
    const urnMatch = text.match(/urn:li:(?:activity|ugcPost):\d+/);
    if (urnMatch) {
      return urnMatch[0];
    }

    try {
      const url = new URL(text, "https://www.linkedin.com");
      const decoded = decodeURIComponent(`${url.pathname}${url.search}`);
      const urlMatch = decoded.match(/urn:li:(?:activity|ugcPost):\d+/);
      return urlMatch ? urlMatch[0] : "";
    } catch (_error) {
      return "";
    }
  }

  function getPostUrlFromKey(key) {
    if (!/^urn:li:(?:activity|ugcPost):\d+$/.test(key || "")) {
      return "";
    }

    return `https://www.linkedin.com/feed/update/${key}/`;
  }

  return {
    createPostStore,
    getActivityId,
    getPostIdFromValue,
    getPostUrlFromKey
  };
});
