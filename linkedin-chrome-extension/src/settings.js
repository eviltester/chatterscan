(function attachSettings(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  root.LinkedInChatterScanSettings = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, () => {
  const DEFAULT_SETTINGS = {
    includeAds: false,
    includePostsWithLinks: true,
    includePostsWithCommentLinks: true,
    includePostsWithPulseArticles: false,
    includePostsWithEmbeddedVideos: false,
    includePostsWithoutLinks: false,
    includeLinkedInContentLinks: true,
    autoScrollOverlayEnabled: true,
    autoScrollOverlayOpacity: 0.9,
    autoScrollOverlayColor: "#f6f8fa"
  };

  function normalizeSettings(rawSettings = {}) {
    const settings = { ...DEFAULT_SETTINGS, ...rawSettings };

    if (Object.prototype.hasOwnProperty.call(rawSettings, "hideAds")) {
      settings.includeAds = !rawSettings.hideAds;
    }

    if (Object.prototype.hasOwnProperty.call(rawSettings, "hidePostsWithoutLinks")) {
      settings.includePostsWithoutLinks = !rawSettings.hidePostsWithoutLinks;
    }

    return {
      includeAds: Boolean(settings.includeAds),
      includePostsWithLinks: settings.includePostsWithLinks !== false,
      includePostsWithCommentLinks: settings.includePostsWithCommentLinks !== false,
      includePostsWithPulseArticles: Boolean(settings.includePostsWithPulseArticles),
      includePostsWithEmbeddedVideos: Boolean(settings.includePostsWithEmbeddedVideos),
      includePostsWithoutLinks: Boolean(settings.includePostsWithoutLinks),
      includeLinkedInContentLinks: settings.includeLinkedInContentLinks !== false,
      autoScrollOverlayEnabled: settings.autoScrollOverlayEnabled !== false,
      autoScrollOverlayOpacity: normalizeOverlayOpacity(settings.autoScrollOverlayOpacity),
      autoScrollOverlayColor: normalizeOverlayColor(settings.autoScrollOverlayColor)
    };
  }

  function normalizeOverlayOpacity(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return DEFAULT_SETTINGS.autoScrollOverlayOpacity;
    }

    return Math.min(Math.max(parsed, 0), 1);
  }

  function normalizeOverlayColor(value) {
    const text = String(value || "").trim();
    return /^#[0-9a-f]{6}$/i.test(text) ? text.toLowerCase() : DEFAULT_SETTINGS.autoScrollOverlayColor;
  }

  return {
    DEFAULT_SETTINGS,
    normalizeSettings,
    normalizeOverlayColor,
    normalizeOverlayOpacity
  };
});
