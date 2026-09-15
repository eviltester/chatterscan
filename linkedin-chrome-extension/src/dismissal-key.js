(function attachDismissalKey(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  root.LinkedInChatterScanDismissalKey = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, () => {
  const FALLBACK_DISMISSAL_PREFIX = "fallback-v3";

  function getDismissalKey({
    key = "",
    authorName = "",
    authorProfileUrl = "",
    text = "",
    links = []
  } = {}) {
    const normalizedKey = String(key || "").trim();
    if (!isFallbackPostKey(normalizedKey)) {
      return normalizedKey;
    }

    const authorHash = hashString(
      [
        normalizeFingerprintPart(authorName),
        normalizeProfileUrl(authorProfileUrl)
      ].join("|")
    );
    const contentHash = hashString(
      [
        normalizeFingerprintPart(text),
        getLinkFingerprint(links)
      ].join("|")
    );

    return `${FALLBACK_DISMISSAL_PREFIX}::${authorHash}::${contentHash}`;
  }

  function isFallbackPostKey(key) {
    return /^dom-card:\d+$/.test(key || "");
  }

  function getLinkFingerprint(links) {
    return (Array.isArray(links) ? links : [])
      .map((link) => normalizeUrl(link?.href))
      .filter(Boolean)
      .slice(0, 3)
      .join("|");
  }

  function normalizeProfileUrl(value) {
    return normalizeUrl(value) || normalizeFingerprintPart(value);
  }

  function normalizeUrl(value) {
    const text = String(value || "").trim();
    if (!text) {
      return "";
    }

    try {
      const url = new URL(text, "https://www.linkedin.com");
      url.hash = "";
      return url.href.toLowerCase();
    } catch (_error) {
      return "";
    }
  }

  function normalizeFingerprintPart(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function hashString(value) {
    let hash = 0x811c9dc5;
    const text = String(value || "");

    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193);
    }

    return (hash >>> 0).toString(36);
  }

  return {
    FALLBACK_DISMISSAL_PREFIX,
    getDismissalKey,
    hashString,
    normalizeFingerprintPart
  };
});
