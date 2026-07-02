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
    includePostsWithPulseArticles: true,
    includePostsWithoutLinks: false,
    includeLinkedInContentLinks: true
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
      includePostsWithPulseArticles: settings.includePostsWithPulseArticles !== false,
      includePostsWithoutLinks: Boolean(settings.includePostsWithoutLinks),
      includeLinkedInContentLinks: settings.includeLinkedInContentLinks !== false
    };
  }

  return {
    DEFAULT_SETTINGS,
    normalizeSettings
  };
});
