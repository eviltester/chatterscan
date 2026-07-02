(function attachLinkUtils(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  root.LinkedInChatterScanLinkUtils = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, () => {
  function normalizeLinkUrl(href, baseHref) {
    try {
      const url = new URL(href, baseHref);
      if (!["http:", "https:"].includes(url.protocol)) {
        return null;
      }

      return unwrapLinkedInSafetyUrl(url, baseHref) || url;
    } catch (_error) {
      return null;
    }
  }

  function unwrapLinkedInSafetyUrl(url, baseHref) {
    if (!isLinkedInHost(url.hostname) || !url.pathname.startsWith("/safety/go")) {
      return null;
    }

    const target = url.searchParams.get("url");
    if (!target) {
      return null;
    }

    try {
      const targetUrl = new URL(target, baseHref || url.href);
      return ["http:", "https:"].includes(targetUrl.protocol) ? targetUrl : null;
    } catch (_error) {
      return null;
    }
  }

  function isLinkedInHost(hostname) {
    return hostname === "linkedin.com" || hostname.endsWith(".linkedin.com");
  }

  return {
    normalizeLinkUrl,
    unwrapLinkedInSafetyUrl
  };
});
