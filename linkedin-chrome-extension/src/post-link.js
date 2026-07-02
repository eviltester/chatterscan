(function attachPostLink(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  root.LinkedInChatterScanPostLink = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, () => {
  function postUrlBelongsToKey(key, href) {
    return postKeyMatchesUrl(key, href);
  }

  function getMissingPostUrlReason({
    key = "",
    hasHighlightedUpdateUrn = false,
    hasUnverifiedPostUrl = false
  } = {}) {
    if (hasUnverifiedPostUrl) {
      return "LinkedIn rendered a post URL, but it did not match this card's verified post id.";
    }

    if (hasHighlightedUpdateUrn) {
      return "LinkedIn only exposed a highlighted context URL, not a verified post URL.";
    }

    if (isFallbackPostKey(key)) {
      return "LinkedIn did not render a verified post id or canonical post URL for this card.";
    }

    return "LinkedIn did not render a verified post URL for this card.";
  }

  function postKeyMatchesUrl(key, href) {
    const postId = getPostNumericId(key);
    if (!postId) {
      return false;
    }

    return decodeURIComponent(href).includes(postId);
  }

  function isFallbackPostKey(key) {
    return /^dom-card:\d+$/.test(key || "");
  }

  function isLinkedInPostKey(key) {
    return /^urn:li:(?:activity|ugcPost):\d+$/.test(key || "");
  }

  function getPostNumericId(key) {
    const match = (key || "").match(/^urn:li:(?:activity|ugcPost):(\d+)$/);
    return match ? match[1] : "";
  }

  return {
    getMissingPostUrlReason,
    getPostNumericId,
    isFallbackPostKey,
    isLinkedInPostKey,
    postKeyMatchesUrl,
    postUrlBelongsToKey
  };
});
