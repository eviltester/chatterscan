(function attachFeedBoundary(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  root.LinkedInChatterScanFeedBoundary = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, () => {
  function findFeedArticleRoot(node, getText) {
    const main = node.closest?.("main");
    if (!main) {
      return null;
    }

    const explicitRoot = findExplicitFeedRoot(node, main, getText);
    if (explicitRoot) {
      return explicitRoot;
    }

    let current = node;
    while (current && current !== main) {
      const parent = current.parentElement;
      if (!parent || parent === main || countFeedPostHeadings(parent, getText) > 1) {
        return current.matches?.("h2") ? current.parentElement : current;
      }

      current = parent;
    }

    return null;
  }

  function findExplicitFeedRoot(node, main, getText) {
    let current = node;
    while (current && current !== main) {
      if (isExplicitFeedRoot(current) && countFeedPostHeadings(current, getText) === 1) {
        return current;
      }

      current = current.parentElement;
    }

    return null;
  }

  function isExplicitFeedRoot(element) {
    const role = element.getAttribute?.("role") || "";
    const componentKey = element.getAttribute?.("componentkey") || "";
    return role.toLowerCase() === "listitem" && /FeedType_/i.test(componentKey);
  }

  function countFeedPostHeadings(root, getText) {
    return Array.from(root.querySelectorAll?.("h2") || []).filter((heading) => {
      return /^feed post$/i.test(getText(heading));
    }).length;
  }

  return {
    countFeedPostHeadings,
    findExplicitFeedRoot,
    findFeedArticleRoot,
    isExplicitFeedRoot
  };
});
