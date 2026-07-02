(function attachMediaUtils(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  root.LinkedInChatterScanMedia = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, () => {
  const EMBEDDED_VIDEO_SELECTOR = [
    "video",
    "[data-vjs-player]",
    ".video-js",
    "button[aria-label*='Play video' i]"
  ].join(",");

  function hasEmbeddedVideo(card) {
    return Boolean(card?.querySelector?.(EMBEDDED_VIDEO_SELECTOR));
  }

  return {
    EMBEDDED_VIDEO_SELECTOR,
    hasEmbeddedVideo
  };
});
