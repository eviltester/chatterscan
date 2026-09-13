(function attachLinkedInUrlUtils(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  root.LinkedInChatterScanUrlUtils = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, () => {
  const LINKEDIN_ORIGIN = "https://www.linkedin.com";

  function isSupportedLinkedInUrl(url) {
    if (!url) {
      return false;
    }

    try {
      const parsedUrl = new URL(url);
      return (
        parsedUrl.origin === LINKEDIN_ORIGIN &&
        (isSupportedFeedPath(parsedUrl.pathname) ||
          parsedUrl.pathname === "/search/results/all/" ||
          parsedUrl.pathname === "/search/results/content/")
      );
    } catch (_error) {
      return false;
    }
  }

  function isSupportedFeedPath(pathname) {
    return pathname === "/feed" || pathname === "/feed/" || pathname === "/feed/foryou/";
  }

  function isAllowedSavedSearchUrl(url) {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.origin === LINKEDIN_ORIGIN && parsedUrl.pathname === "/search/results/content/";
    } catch (_error) {
      return false;
    }
  }

  return {
    LINKEDIN_ORIGIN,
    isAllowedSavedSearchUrl,
    isSupportedFeedPath,
    isSupportedLinkedInUrl
  };
});
