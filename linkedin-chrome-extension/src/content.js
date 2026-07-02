(() => {
  const SETTINGS_KEY = "linkedinChatterScanSettings";
  const STATE_KEY = "linkedinChatterScanReaderState";
  const PANEL_ID = "linkedin-chatterscan-panel";

  const DEFAULT_SETTINGS = window.LinkedInChatterScanSettings.DEFAULT_SETTINGS;
  const { MUTED_PEOPLE_KEY, isMutedAuthor, normalizeMutedPeople } = window.LinkedInChatterScanMuteUtils;

  const CARD_SELECTOR = [
    "div.feed-shared-update-v2",
    "div.occludable-update",
    "article",
    "[role='listitem'][componentkey*='FeedType_']",
    "[data-urn^='urn:li:activity']",
    "[data-id^='urn:li:activity']"
  ].join(",");

  const CARD_ROOT_SELECTOR = [
    "div.feed-shared-update-v2",
    "div.occludable-update",
    "article",
    "[role='listitem'][componentkey*='FeedType_']"
  ].join(",");

  const USEFUL_LINK_PATHS = [
    "/advice/",
    "/events/",
    "/learning/",
    "/newsletter/",
    "/posts/",
    "/pulse/"
  ];

  const POST_BODY_SELECTORS = [
    "[componentkey^='feed-commentary_'] [data-testid='expandable-text-box']",
    "[componentkey^='feed-commentary_']",
    "[componentkey^='feed-commentary'] [data-testid='expandable-text-box']",
    "[componentkey^='feed-commentary']",
    "[data-testid='expandable-text-box']",
    ".feed-shared-update-v2__description",
    ".feed-shared-inline-show-more-text",
    ".update-components-text"
  ];

  const COMMENT_LINK_SELECTORS = [
    "[componentkey^='comment-commentary'] [data-testid='expandable-text-box']",
    "[componentkey^='comment-commentary']",
    ".comments-comment-item__main-content",
    ".comments-comment-item-content-body",
    ".comments-comment-item__comment-content",
    ".comments-comment-text"
  ];

  let settings = { ...DEFAULT_SETTINGS };
  let observer = null;
  let scanTimer = null;
  let lastStats = null;
  let lastRenderedSignature = null;
  let panelElements = null;
  let latestStats = null;
  let pageZoomFactor = 1;
  let dismissedPostKeys = new Set();
  let mutedPeople = [];
  const logLines = [];
  const postStore = window.LinkedInChatterScanCore.createPostStore();
  const postsByKey = postStore.postsByKey;

  log("Content scanner loaded. LinkedIn feed is untouched.");
  start();

  function start() {
    chrome.storage.local.remove(STATE_KEY);

    chrome.storage.local.get(
      { [SETTINGS_KEY]: DEFAULT_SETTINGS, [MUTED_PEOPLE_KEY]: [] },
      (items) => {
        settings = window.LinkedInChatterScanSettings.normalizeSettings(items[SETTINGS_KEY]);
        mutedPeople = normalizeMutedPeople(items[MUTED_PEOPLE_KEY]);
        log("Settings loaded.");
        loadDismissedPostKeys(() => {
          loadPageZoom(() => {
            scan();
            observeFeed();
          });
        });
      }
    );

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local") {
        return;
      }

      if (changes[SETTINGS_KEY]) {
        settings = window.LinkedInChatterScanSettings.normalizeSettings(changes[SETTINGS_KEY].newValue);
        log("Settings changed.");
        scan();
      }

      if (changes[MUTED_PEOPLE_KEY]) {
        mutedPeople = normalizeMutedPeople(changes[MUTED_PEOPLE_KEY].newValue);
        pruneMutedPosts();
        log("Muted people changed.");
        scan();
      }
    });

    chrome.runtime.onMessage.addListener((message) => {
      if (message?.type === "linkedinChatterScanDismissedPostsChanged") {
        applyDismissedPostKeys(message.keys || []);
        return;
      }

      if (message?.type === "linkedinChatterScanPageZoomChanged") {
        setPageZoomFactor(message.zoomFactor);
        publishState();
      }
    });
  }

  function observeFeed() {
    if (observer) {
      observer.disconnect();
    }

    observer = new MutationObserver(scheduleScan);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  function scheduleScan() {
    window.clearTimeout(scanTimer);
    scanTimer = window.setTimeout(scan, 150);
  }

  function scan() {
    let cards = [];
    try {
      cards = getFeedCards();
    } catch (error) {
      logError("Scan failed while finding feed cards", error);
      return;
    }

    const stats = {
      scanned: cards.length,
      selected: 0,
      excludedAds: 0,
      excludedNoLinks: 0,
      excludedWithLinks: 0,
      excludedWithCommentLinks: 0,
      excludedWithPulseArticles: 0,
      excludedWithEmbeddedVideos: 0,
      excludedMuted: 0,
      added: 0,
      errors: 0,
      collected: postsByKey.size
    };

    for (const card of cards) {
      let post = null;
      try {
        post = extractPost(card);
      } catch (error) {
        stats.errors += 1;
        logError("Skipped a feed card after parser error", error);
        continue;
      }

      if (!post) {
        continue;
      }

      if (isMutedPost(post)) {
        postsByKey.delete(post.key);
        stats.excludedMuted += 1;
        continue;
      }

      if (isDismissedPost(post)) {
        postsByKey.delete(post.key);
        continue;
      }

      const hasBodyLinks = post.linkSourceCounts?.body > 0;
      const hasCommentLinks = post.linkSourceCounts?.comment > 0;
      const hasPulseLinks = post.linkSourceCounts?.pulse > 0;
      const hasEmbeddedVideo = Boolean(post.hasEmbeddedVideo);
      const hasIncludedLinks = post.links.length > 0;
      const hasIncludedVideo = hasEmbeddedVideo && settings.includePostsWithEmbeddedVideos;
      const hasIncludedContent = hasIncludedLinks || hasIncludedVideo;

      if (!settings.includeAds && post.isAd) {
        stats.excludedAds += 1;
        continue;
      }

      if (!hasIncludedContent && hasBodyLinks && !settings.includePostsWithLinks) {
        stats.excludedWithLinks += 1;
        continue;
      }

      if (!hasIncludedContent && hasCommentLinks && !settings.includePostsWithCommentLinks) {
        stats.excludedWithCommentLinks += 1;
        continue;
      }

      if (!hasIncludedContent && hasPulseLinks && !settings.includePostsWithPulseArticles) {
        stats.excludedWithPulseArticles += 1;
        continue;
      }

      if (!hasIncludedContent && hasEmbeddedVideo && !settings.includePostsWithEmbeddedVideos) {
        stats.excludedWithEmbeddedVideos += 1;
        continue;
      }

      if (!hasIncludedContent && !settings.includePostsWithoutLinks) {
        stats.excludedNoLinks += 1;
        continue;
      }

      stats.selected += 1;
      const result = upsertPost(post);
      if (result === "added") {
        stats.added += 1;
        if (post.postUrlMissingReason) {
          log(`Added ${post.author.name} without a verified LinkedIn post link.`);
        }
      }
    }

    stats.collected = getVisiblePosts().length;
    logStatsChange(stats);
    publishState(stats);
  }

  function getFeedCards() {
    const cards = new Set();

    for (const node of document.querySelectorAll(CARD_SELECTOR)) {
      const card = resolveCardRoot(node);

      if (isLikelyFeedCard(card)) {
        cards.add(card);
      }
    }

    for (const heading of document.querySelectorAll("h2")) {
      if (!/^feed post$/i.test(getText(heading))) {
        continue;
      }

      const card = resolveCardRoot(heading);
      if (isLikelyFeedCard(card)) {
        cards.add(card);
      }
    }

    return dedupeFeedCards(Array.from(cards));
  }

  function resolveCardRoot(node) {
    const explicitRoot = findExplicitFeedRoot(node);
    if (explicitRoot) {
      return explicitRoot;
    }

    const classicRoot = node.closest(CARD_ROOT_SELECTOR);
    if (classicRoot) {
      return classicRoot;
    }

    const feedArticleRoot = findFeedArticleRoot(node);
    if (feedArticleRoot) {
      return feedArticleRoot;
    }

    return node;
  }

  function dedupeFeedCards(cards) {
    return cards.filter((card) => {
      const cardIsExplicit = isExplicitFeedRoot(card);

      return !cards.some((other) => {
        if (other === card) {
          return false;
        }

        const otherIsExplicit = isExplicitFeedRoot(other);

        if (other.contains(card)) {
          return otherIsExplicit;
        }

        if (card.contains(other)) {
          return !cardIsExplicit && !otherIsExplicit;
        }

        return false;
      });
    });
  }

  function findExplicitFeedRoot(node) {
    const main = node.closest?.("main");
    if (!main) {
      return null;
    }

    return window.LinkedInChatterScanFeedBoundary.findExplicitFeedRoot(node, main, getText);
  }

  function findFeedArticleRoot(node) {
    return window.LinkedInChatterScanFeedBoundary.findFeedArticleRoot(node, getText);
  }

  function countFeedPostHeadings(root) {
    return window.LinkedInChatterScanFeedBoundary.countFeedPostHeadings(root, getText);
  }

  function isExplicitFeedRoot(card) {
    return window.LinkedInChatterScanFeedBoundary.isExplicitFeedRoot(card);
  }

  function isLikelyFeedCard(card) {
    if (!card || !card.isConnected) {
      return false;
    }

    const text = getText(card);
    if (text.length < 20) {
      return false;
    }

    const inMain = card.closest("main");
    if (!inMain) {
      return false;
    }

    if (countFeedPostHeadings(card) > 1) {
      return false;
    }

    return Boolean(
      card.matches(
        "div.feed-shared-update-v2, div.occludable-update, article, [role='listitem'][componentkey*='FeedType_']"
      ) ||
        /^feed post$/i.test(getText(card.querySelector("h2"))) ||
        card.querySelector("[data-urn^='urn:li:activity'], [data-id^='urn:li:activity']") ||
        card.querySelector("button[aria-label*='Like' i], button[aria-label*='Comment' i]") ||
        card.querySelector("button[aria-label*='Open control menu for post' i]")
    );
  }

  function extractPost(card) {
    const text = getPostContent(card) || cleanPostText(getText(card));
    if (!text || text.length < 20) {
      return null;
    }

    const linkGroups = getUsefulLinks(card);
    const author = getAuthor(card);
    const socialContext = getSocialContext(card, author.name);
    const dateText = getPostDateText(card);
    const key = getStablePostKey(card);
    postStore.tagCard(card, key);
    const detectedPostUrl = getPostUrl(card, key);
    const postUrl = detectedPostUrl || getCurrentPostPageUrl(card, key);
    const hasEmbeddedVideo = window.LinkedInChatterScanMedia.hasEmbeddedVideo(card);

    return {
      key,
      dismissalKey: getDismissalKey({
        key,
        authorName: author.name,
        dateText,
        text,
        postUrl,
        links: linkGroups.links
      }),
      author,
      socialContext,
      dateText,
      text,
      postUrl,
      postUrlMissingReason: postUrl ? "" : getPostUrlMissingReason(card, key),
      links: linkGroups.links,
      linkSourceCounts: linkGroups.counts,
      hasEmbeddedVideo,
      isAd: looksLikeAd(card)
    };
  }

  function getAuthor(card) {
    const controlButton = card.querySelector("[aria-label*='Open control menu for post by' i]");
    const controlLabel = controlButton?.getAttribute("aria-label") || "";
    const controlMatch = controlLabel.match(/post by\s+(.+)$/i);
    if (controlMatch) {
      return buildPerson(card, controlMatch[1]);
    }

    const hideButton = card.querySelector("[aria-label*='Hide post by' i]");
    const hideLabel = hideButton?.getAttribute("aria-label") || "";
    const hideMatch = hideLabel.match(/post by\s+(.+)$/i);
    if (hideMatch) {
      return buildPerson(card, hideMatch[1]);
    }

    const verifiedLabel = card.querySelector("[aria-label*='Verified Profile' i]");
    const verifiedMatch = verifiedLabel?.getAttribute("aria-label")?.match(/^(.+?)\s+Verified Profile/i);
    if (verifiedMatch) {
      return buildPerson(card, verifiedMatch[1]);
    }

    const profileImage = card.querySelector(
      "img[alt*='profile' i], svg[aria-label*='profile' i], [aria-label*='profile' i]"
    );
    const profileLabel =
      profileImage?.getAttribute("alt") || profileImage?.getAttribute("aria-label") || "";
    const profileMatch = profileLabel.match(/^View\s+(.+?)(?:'s|’s)\s+profile$/i);
    if (profileMatch) {
      return buildPerson(card, profileMatch[1]);
    }

    const profileLink = card.querySelector("a[href*='/in/'], a[href*='/company/']");
    const profileText = getText(profileLink);
    if (profileText) {
      const name = cleanAuthor(profileText);
      return {
        name,
        profileUrl: normalizeUrl(profileLink.getAttribute("href"))?.href || ""
      };
    }

    const followButton = card.querySelector("[aria-label^='Follow ' i]");
    const followLabel = followButton?.getAttribute("aria-label") || "";
    const followMatch = followLabel.match(/^Follow\s+(.+)$/i);
    return followMatch ? buildPerson(card, followMatch[1]) : { name: "Unknown author", profileUrl: "" };
  }

  function buildPerson(card, rawName) {
    const name = cleanAuthor(rawName);
    return {
      name,
      profileUrl: getProfileUrlForName(card, name)
    };
  }

  function getProfileUrlForName(card, name) {
    const normalizedName = normalizeName(name);
    if (!normalizedName) {
      return "";
    }

    for (const anchor of card.querySelectorAll("a[href*='/in/'], a[href*='/company/']")) {
      const href = anchor.getAttribute("href");
      const visible = normalizeName(getText(anchor));
      const labelled = normalizeName(
        [
          anchor.getAttribute("aria-label"),
          anchor.querySelector("[aria-label]")?.getAttribute("aria-label"),
          anchor.querySelector("img[alt]")?.getAttribute("alt"),
          anchor.querySelector("svg[aria-label]")?.getAttribute("aria-label")
        ]
          .filter(Boolean)
          .join(" ")
      );

      if (visible.includes(normalizedName) || labelled.includes(normalizedName)) {
        return normalizeUrl(href)?.href || "";
      }
    }

    return "";
  }

  function cleanAuthor(value) {
    return truncate(
      value
        .replace(/\s+Verified Profile.*$/i, "")
        .replace(/\s+View profile.*$/i, "")
        .replace(/\s+•.*$/i, "")
        .replace(/\s+(commented|reposted|liked|shared)$/i, "")
        .replace(/\s+/g, " ")
        .trim(),
      90
    );
  }

  function normalizeName(value) {
    return (value || "")
      .replace(/View\s+/gi, "")
      .replace(/(?:'s|’s)\s+profile/gi, "")
      .replace(/Verified Profile/gi, "")
      .replace(/\b(1st|2nd|3rd\+?|commented|reposted|liked|shared)\b/gi, "")
      .replace(/[^a-z0-9]+/gi, " ")
      .trim()
      .toLowerCase();
  }

  function getSocialContext(card, authorName) {
    const verbs = ["commented", "reposted", "shared", "liked"];
    const authorNormalized = normalizeName(authorName);

    for (const container of getSocialContextContainers(card)) {
      const contextText = getText(container);
      const verb = verbs.find((candidate) => new RegExp(`\\b${candidate}\\b`, "i").test(contextText));
      if (!verb) {
        continue;
      }

      const anchor = container.querySelector("a[href*='/in/'], a[href*='/company/']");
      if (!anchor) {
        continue;
      }

      const name = cleanAuthor(getText(anchor));
      if (!name || normalizeName(name) === authorNormalized) {
        continue;
      }

      return {
        verb,
        person: {
          name,
          profileUrl: normalizeUrl(anchor.getAttribute("href"))?.href || ""
        }
      };
    }

    return null;
  }

  function getSocialContextContainers(card) {
    const containers = [];
    const headerEnd = card.querySelector(
      "[aria-label*='Open control menu for post by' i], [aria-label*='Hide post by' i]"
    );
    const bodyStart = card.querySelector(
      "[componentkey^='feed-commentary'], [data-testid='expandable-text-box']"
    );

    for (const paragraph of card.querySelectorAll("p")) {
      if (isInsidePostBody(paragraph)) {
        continue;
      }

      if (headerEnd && isAfter(paragraph, headerEnd)) {
        continue;
      }

      if (bodyStart && isAfter(paragraph, bodyStart)) {
        continue;
      }

      const text = getText(paragraph);
      if (!text || text.length > 180) {
        continue;
      }

      containers.push(paragraph);
      if (containers.length >= 8) {
        break;
      }
    }

    return containers;
  }

  function isInsidePostBody(element) {
    return Boolean(
      element.closest(
        "[componentkey^='feed-commentary'], [componentkey^='comment-commentary'], [data-testid='expandable-text-box']"
      )
    );
  }

  function isAfter(element, reference) {
    return Boolean(reference.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING);
  }

  function getPostDateText(card) {
    const candidates = Array.from(card.querySelectorAll("p, span"))
      .map((element) => getText(element))
      .filter(Boolean);

    for (const text of candidates) {
      const match = text.match(
        /\b(\d+\s*(?:m|h|d|w|mo|yr|yrs)|\d+\s+(?:minutes?|hours?|days?|weeks?|months?|years?)|yesterday)\b(?:\s*•\s*Edited)?/i
      );
      if (match) {
        return match[0].replace(/\s+/g, " ").trim();
      }
    }

    return "";
  }

  function getPostContent(card) {
    for (const selector of POST_BODY_SELECTORS) {
      const element = card.querySelector(selector);
      const text = getReadableText(element);
      if (text && text.length >= 20) {
        return text;
      }
    }

    return "";
  }

  function getReadableText(element) {
    if (!element) {
      return "";
    }

    const clone = element.cloneNode(true);
    for (const removable of clone.querySelectorAll("button, [aria-hidden='true']")) {
      removable.remove();
    }

    return extractTextWithBreaks(clone)
      .replace(/\r/g, "")
      .replace(/\u200b/g, "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\s*…\s*more\s*$/i, "")
      .trim();
  }

  function extractTextWithBreaks(root) {
    const parts = [];
    appendReadableNode(root, parts);
    return parts.join("");
  }

  function appendReadableNode(node, parts) {
    if (node.nodeType === Node.TEXT_NODE) {
      parts.push(node.nodeValue || "");
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    const tagName = node.tagName.toLowerCase();
    if (tagName === "br") {
      parts.push("\n");
      return;
    }

    const startsParagraph = isParagraphBoundary(tagName);
    if (startsParagraph) {
      appendNewline(parts);
    }

    for (const child of node.childNodes) {
      appendReadableNode(child, parts);
    }

    if (startsParagraph) {
      appendNewline(parts);
    }
  }

  function isParagraphBoundary(tagName) {
    return [
      "blockquote",
      "div",
      "li",
      "ol",
      "p",
      "section",
      "ul"
    ].includes(tagName);
  }

  function appendNewline(parts) {
    const text = parts.join("");
    if (!text || text.endsWith("\n")) {
      return;
    }

    parts.push("\n");
  }

  function getUsefulLinks(card) {
    const bodyLinks = collectUsefulLinks(getPostBodyElements(card), "body");
    const commentLinks = collectUsefulLinks(getCommentLinkElements(card), "comment");
    const pulseLinks = collectPulseArticleLinks(card);
    const includedLinks = dedupeLinks([
      ...(settings.includePostsWithLinks ? bodyLinks : []),
      ...(settings.includePostsWithCommentLinks ? commentLinks : []),
      ...(settings.includePostsWithPulseArticles ? pulseLinks : [])
    ]).slice(0, 6);

    return {
      links: includedLinks,
      counts: {
        body: bodyLinks.length,
        comment: commentLinks.length,
        pulse: pulseLinks.length
      }
    };
  }

  function getPostBodyElements(card) {
    const element = getPostBodyElement(card);
    return element ? [element] : [];
  }

  function getPostBodyElement(card) {
    for (const selector of POST_BODY_SELECTORS) {
      const element = card.querySelector(selector);
      if (element) {
        return element;
      }
    }

    return null;
  }

  function getCommentLinkElements(card) {
    const roots = [];

    for (const selector of COMMENT_LINK_SELECTORS) {
      for (const element of card.querySelectorAll(selector)) {
        addDistinctRoot(roots, element);
      }
    }

    return roots.filter((root) => !getPostBodyElement(card)?.contains(root));
  }

  function addDistinctRoot(roots, element) {
    if (!element || element.closest("[contenteditable='true'], textarea, input")) {
      return;
    }

    const containedByExisting = roots.some((root) => root.contains(element));
    if (containedByExisting) {
      return;
    }

    for (let index = roots.length - 1; index >= 0; index -= 1) {
      if (element.contains(roots[index])) {
        roots.splice(index, 1);
      }
    }

    roots.push(element);
  }

  function collectUsefulLinks(roots, source) {
    const links = [];
    const seen = new Set();

    for (const root of roots) {
      const plainUrls = getReadableText(root).match(/\bhttps?:\/\/[^\s<>"')]+/gi) || [];

      for (const plainUrl of plainUrls) {
        addUsefulLink(links, seen, plainUrl, plainUrl, source);
      }

      for (const anchor of root.querySelectorAll("a[href]")) {
        if (!isUsefulAnchor(anchor)) {
          continue;
        }

        const href = anchor.getAttribute("href");
        const label = getText(anchor) || getDisplayUrl(href);
        addUsefulLink(links, seen, href, label, source);
      }
    }

    return links;
  }

  function collectPulseArticleLinks(card) {
    const links = [];
    const seen = new Set();
    const bodyElement = getPostBodyElement(card);

    for (const anchor of card.querySelectorAll("a[href]")) {
      if (bodyElement?.contains(anchor) || anchor.closest("[componentkey^='comment-commentary']")) {
        continue;
      }

      const url = normalizeUrl(anchor.getAttribute("href"));
      if (!isLinkedInPulseUrl(url)) {
        continue;
      }

      const label = getPulseArticleLabel(anchor) || getText(anchor) || getDisplayUrl(url.href);
      addUsefulLink(links, seen, url.href, label, "pulse");
    }

    return links;
  }

  function getPulseArticleLabel(anchor) {
    const imageLabel = anchor.querySelector("img[alt]")?.getAttribute("alt") || "";
    if (imageLabel) {
      return imageLabel;
    }

    const preview = anchor.closest("div");
    const previewText = preview ? getText(preview) : "";
    return previewText.length > 8 ? previewText : "";
  }

  function dedupeLinks(links) {
    const deduped = [];
    const seen = new Set();

    for (const link of links) {
      if (seen.has(link.href)) {
        continue;
      }

      seen.add(link.href);
      deduped.push(link);
    }

    return deduped;
  }

  function addUsefulLink(links, seen, href, label, source) {
    const url = normalizeUrl(href);
    if (!url || seen.has(url.href)) {
      return;
    }

    seen.add(url.href);
    links.push({
      href: url.href,
      label: truncate(label.replace(/\s+/g, " ").trim() || url.hostname, 90),
      source
    });
  }

  function normalizeUrl(href) {
    return window.LinkedInChatterScanLinkUtils.normalizeLinkUrl(href, window.location.href);
  }

  function getDisplayUrl(href) {
    const url = normalizeUrl(href);
    return url ? url.hostname.replace(/^www\./, "") : href;
  }

  function getPostUrl(card, key) {
    const canonicalPostUrl = findCanonicalPostUrl(card, key);
    if (canonicalPostUrl) {
      return canonicalPostUrl;
    }

    const highlightedUrl = findHighlightedPostUrl(card, key);
    if (highlightedUrl) {
      return highlightedUrl;
    }

    const feedUpdateUrl = findFeedUpdatePostUrl(card, key);
    if (feedUpdateUrl) {
      return feedUpdateUrl;
    }

    return postStore.getPostUrlFromKey(key);
  }

  function getPostUrlMissingReason(card, key) {
    return window.LinkedInChatterScanPostLink.getMissingPostUrlReason({
      key,
      hasHighlightedUpdateUrn: hasHighlightedUpdateUrn(card),
      hasUnverifiedPostUrl: hasUnverifiedPostUrl(card, key)
    });
  }

  function getStablePostKey(card) {
    return postStore.getPostKey(card);
  }

  function getDismissalKey({ key, authorName, dateText, text, postUrl, links }) {
    if (!window.LinkedInChatterScanPostLink.isFallbackPostKey(key)) {
      return key;
    }

    const linkHrefs = (links || []).map((link) => link.href).slice(0, 3).join("|");
    return [
      "fingerprint-v2",
      normalizeFingerprintPart(key),
      normalizeFingerprintPart(authorName),
      normalizeFingerprintPart(dateText),
      normalizeFingerprintPart(postUrl),
      normalizeFingerprintPart(text).slice(0, 500),
      normalizeFingerprintPart(linkHrefs)
    ].join("::");
  }

  function normalizeFingerprintPart(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function getCurrentPostPageUrl(card, key) {
    if (!window.location.pathname.startsWith("/posts/")) {
      return "";
    }

    if (
      window.LinkedInChatterScanPostLink.isLinkedInPostKey(key) &&
      !window.LinkedInChatterScanPostLink.postKeyMatchesUrl(key, window.location.href)
    ) {
      return "";
    }

    const main = card.closest("main");
    if (!main) {
      return "";
    }

    const firstCard = getFeedCards().find((candidate) => candidate.closest("main") === main);
    if (firstCard !== card) {
      return "";
    }

    return normalizeUrl(window.location.href)?.href || "";
  }

  function findCanonicalPostUrl(card, key) {
    for (const value of getAttributeValues(card)) {
      const url = normalizeUrl(value);
      if (
        url &&
        isLinkedInHost(url.hostname) &&
        url.pathname.startsWith("/posts/") &&
        window.LinkedInChatterScanPostLink.postUrlBelongsToKey(key, url.href)
      ) {
        return url.href;
      }

      const match = value.match(/(?:https:\/\/www\.linkedin\.com)?\/posts\/[^"'<\s]+/);
      if (match && window.LinkedInChatterScanPostLink.postUrlBelongsToKey(key, match[0])) {
        return normalizeUrl(match[0])?.href || "";
      }
    }

    return "";
  }

  function findFeedUpdatePostUrl(card, key) {
    for (const anchor of card.querySelectorAll("a[href]")) {
      const url = normalizeUrl(anchor.getAttribute("href"));
      if (
        url &&
        isLinkedInHost(url.hostname) &&
        url.pathname.startsWith("/feed/update/") &&
        window.LinkedInChatterScanPostLink.postUrlBelongsToKey(key, url.href)
      ) {
        return url.href;
      }
    }

    for (const value of getAttributeValues(card)) {
      const url = normalizeUrl(value);
      if (
        url &&
        isLinkedInHost(url.hostname) &&
        url.pathname.startsWith("/feed/update/") &&
        window.LinkedInChatterScanPostLink.postUrlBelongsToKey(key, url.href)
      ) {
        return url.href;
      }

      const match = value.match(/(?:https:\/\/www\.linkedin\.com)?\/feed\/update\/[^"'<\s]+/);
      if (match && window.LinkedInChatterScanPostLink.postUrlBelongsToKey(key, match[0])) {
        return normalizeUrl(match[0])?.href || "";
      }
    }

    return "";
  }

  function hasUnverifiedPostUrl(card, key) {
    for (const value of getAttributeValues(card)) {
      const url = normalizeUrl(value);
      if (
        url &&
        isLinkedInHost(url.hostname) &&
        (url.pathname.startsWith("/posts/") || url.pathname.startsWith("/feed/update/")) &&
        !window.LinkedInChatterScanPostLink.postUrlBelongsToKey(key, url.href)
      ) {
        return true;
      }

      const match = value.match(
        /(?:https:\/\/www\.linkedin\.com)?\/(?:posts|feed\/update)\/[^"'<\s]+/
      );
      if (match && !window.LinkedInChatterScanPostLink.postUrlBelongsToKey(key, match[0])) {
        return true;
      }
    }

    return false;
  }

  function findHighlightedPostUrl(card, key) {
    for (const anchor of card.querySelectorAll("a[href]")) {
      const url = normalizeUrl(anchor.getAttribute("href"));
      const highlightedUrn = getHighlightedUpdateUrnFromUrl(url);
      const highlightedUrl = highlightedUrn
        ? `https://www.linkedin.com/feed/update/${highlightedUrn}/`
        : "";
      if (
        highlightedUrl &&
        window.LinkedInChatterScanPostLink.postUrlBelongsToKey(key, highlightedUrl)
      ) {
        return highlightedUrl;
      }
    }

    for (const value of getAttributeValues(card)) {
      const match = value.match(/highlightedUpdateUrn=([^&"'\s]+)/);
      if (!match) {
        continue;
      }

      const highlightedUrn = decodeURIComponent(match[1]);
      const highlightedUrl = `https://www.linkedin.com/feed/update/${highlightedUrn}/`;
      if (window.LinkedInChatterScanPostLink.postUrlBelongsToKey(key, highlightedUrl)) {
        return highlightedUrl;
      }
    }

    return "";
  }

  function hasHighlightedUpdateUrn(card) {
    for (const anchor of card.querySelectorAll("a[href]")) {
      const url = normalizeUrl(anchor.getAttribute("href"));
      if (getHighlightedUpdateUrnFromUrl(url)) {
        return true;
      }
    }

    return getAttributeValues(card).some((value) =>
      /highlightedUpdateUrn=urn%3Ali%3Aactivity%3A\d+/i.test(value)
    );
  }

  function getHighlightedUpdateUrnFromUrl(url) {
    const highlightedUrn = url?.searchParams.get("highlightedUpdateUrn") || "";
    return /^urn:li:activity:\d+$/.test(highlightedUrn) ? highlightedUrn : "";
  }

  function getActivityId(card) {
    return postStore.getActivityId(card);
  }

  function getAttributeValues(card) {
    const values = [];
    const nodes = [card, ...card.querySelectorAll("*")];

    for (const node of nodes) {
      for (const attribute of node.attributes || []) {
        values.push(attribute.value);
      }
    }

    return values;
  }

  function upsertPost(post) {
    return postStore.upsertPost(post);
  }

  function cleanPostText(text) {
    return text
      .replace(/\b(Like|Comment|Repost|Send|Follow|Connect)\b\s*/gi, " ")
      .replace(/\b\d+\s+(reactions?|comments?|reposts?)\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function looksLikeAd(card) {
    const adText = getVisibleTextLines(card).some((line) => {
      return /^(promoted|sponsored|advertisement|ad)$/i.test(line);
    });

    if (adText) {
      return true;
    }

    if (/\b(promoted|sponsored)\b/i.test(getText(card))) {
      return true;
    }

    return Boolean(
      card.querySelector("[aria-label*='Promoted' i], [aria-label*='Sponsored' i]") ||
        card.querySelector("[data-test-id*='promoted' i], [data-test-id*='sponsored' i]")
    );
  }

  function isUsefulAnchor(anchor) {
    const rawHref = anchor.getAttribute("href");
    if (!rawHref || rawHref.startsWith("#")) {
      return false;
    }

    const url = normalizeUrl(rawHref);
    if (!url) {
      return false;
    }

    if (isLinkedInChromeLink(url, anchor)) {
      return false;
    }

    if (!isLinkedInHost(url.hostname)) {
      return true;
    }

    return Boolean(
      settings.includeLinkedInContentLinks &&
        USEFUL_LINK_PATHS.some((path) => url.pathname.startsWith(path))
    );
  }

  function isLinkedInPulseUrl(url) {
    return Boolean(url && isLinkedInHost(url.hostname) && url.pathname.startsWith("/pulse/"));
  }

  function isLinkedInChromeLink(url, anchor) {
    if (!isLinkedInHost(url.hostname)) {
      return false;
    }

    const path = url.pathname;
    const text = getText(anchor);

    if (path.startsWith("/in/") || path.startsWith("/company/") || path.startsWith("/school/")) {
      return true;
    }

    if (
      path.startsWith("/feed/update/") ||
      path.startsWith("/feed/") ||
      path.startsWith("/notifications/") ||
      path.startsWith("/messaging/") ||
      path.startsWith("/mynetwork/") ||
      path.startsWith("/jobs/") ||
      path.startsWith("/search/")
    ) {
      return true;
    }

    if (/^(like|comment|repost|send|view|follow|connect|more)$/i.test(text)) {
      return true;
    }

    return false;
  }

  function isLinkedInHost(hostname) {
    return hostname === "linkedin.com" || hostname.endsWith(".linkedin.com");
  }

  function getVisibleTextLines(root) {
    const lines = [];
    const elements = root.querySelectorAll("span, div, a, button");

    for (const element of elements) {
      if (!isVisible(element)) {
        continue;
      }

      const text = getText(element);
      if (text && text.length <= 80) {
        lines.push(text);
      }
    }

    return lines;
  }

  function isVisible(element) {
    const style = window.getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) {
      return false;
    }

    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function getText(element) {
    if (!element) {
      return "";
    }

    return (element.innerText || element.textContent || "").replace(/\s+/g, " ").trim();
  }

  function injectStyles() {
    const style = document.createElement("style");
    style.id = "linkedin-chatterscan-styles";
    style.textContent = `
      #${PANEL_ID} {
        position: fixed;
        inset-block: 0;
        inset-inline-end: 0;
        z-index: 2147483647;
        display: flex;
        flex-direction: column;
        width: min(50vw, 760px);
        min-width: 420px;
        box-sizing: border-box;
        border-inline-start: 1px solid rgba(10, 102, 194, 0.24);
        background: #ffffff;
        color: #1f2328;
        box-shadow: -12px 0 32px rgba(0, 0, 0, 0.18);
        font-family: Arial, Helvetica, sans-serif;
        font-size: 14px;
        line-height: 1.45;
      }

      #${PANEL_ID} * {
        box-sizing: border-box;
      }

      #${PANEL_ID} a {
        color: #0a66c2;
        text-decoration: none;
      }

      #${PANEL_ID} a:hover {
        text-decoration: underline;
      }

      .linkedin-chatterscan-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 14px 18px;
        background: #0a66c2;
        color: #ffffff;
      }

      .linkedin-chatterscan-title {
        display: grid;
        gap: 2px;
      }

      .linkedin-chatterscan-title strong {
        font-size: 16px;
      }

      .linkedin-chatterscan-title span {
        color: rgba(255, 255, 255, 0.82);
        font-size: 12px;
      }

      #${PANEL_ID} button {
        border: 0;
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.18);
        color: #ffffff;
        cursor: pointer;
        font: inherit;
        padding: 5px 9px;
      }

      #${PANEL_ID}.${PANEL_ID}--collapsed {
        width: auto;
        min-width: 0;
      }

      #${PANEL_ID}.${PANEL_ID}--collapsed .linkedin-chatterscan-body {
        display: none;
      }

      .linkedin-chatterscan-body {
        display: flex;
        min-height: 0;
        flex: 1;
        flex-direction: column;
      }

      .linkedin-chatterscan-details {
        border-bottom: 1px solid #d0d7de;
        background: #ffffff;
      }

      .linkedin-chatterscan-details summary {
        padding: 10px 14px;
        color: #24292f;
        cursor: pointer;
        font-size: 13px;
        font-weight: 700;
      }

      .linkedin-chatterscan-details summary:hover,
      .linkedin-chatterscan-details summary:focus {
        background: #f6f8fa;
      }

      .linkedin-chatterscan-stats {
        display: grid;
        grid-template-columns: repeat(9, minmax(0, 1fr));
        gap: 1px;
        margin: 0;
        background: #d8e7f3;
      }

      .linkedin-chatterscan-stats div {
        display: grid;
        gap: 2px;
        padding: 10px;
        background: #f7fbff;
      }

      .linkedin-chatterscan-stats dt {
        color: #57606a;
        font-size: 11px;
        text-transform: uppercase;
      }

      .linkedin-chatterscan-stats dd {
        margin: 0;
        color: #1f2328;
        font-size: 18px;
        font-weight: 700;
      }

      .linkedin-chatterscan-list {
        flex: 1;
        min-height: 0;
        margin: 0;
        padding: 16px;
        overflow: auto;
        background: #f6f8fa;
      }

      .linkedin-chatterscan-card {
        position: relative;
        margin-bottom: 12px;
        padding: 42px 48px;
        border: 1px solid #d0d7de;
        border-radius: 8px;
        background: #ffffff;
      }

      .linkedin-chatterscan-card h3 {
        margin: 0 0 8px;
        color: #24292f;
        font-size: 15px;
      }

      #${PANEL_ID} .linkedin-chatterscan-dismiss-post {
        position: absolute;
        width: 32px;
        height: 26px;
        padding: 0;
        border: 1px solid #d0d7de;
        border-radius: 4px;
        background: #ffffff;
        color: #57606a;
        line-height: 1;
      }

      #${PANEL_ID} .linkedin-chatterscan-dismiss-post-top-left {
        top: 8px;
        left: 8px;
      }

      #${PANEL_ID} .linkedin-chatterscan-dismiss-post-top-right {
        top: 8px;
        right: 8px;
      }

      #${PANEL_ID} .linkedin-chatterscan-dismiss-post-bottom-left {
        bottom: 8px;
        left: 8px;
      }

      #${PANEL_ID} .linkedin-chatterscan-dismiss-post-bottom-right {
        right: 8px;
        bottom: 8px;
      }

      #${PANEL_ID} .linkedin-chatterscan-dismiss-post:hover,
      #${PANEL_ID} .linkedin-chatterscan-dismiss-post:focus {
        background: #f6f8fa;
        color: #24292f;
      }

      .linkedin-chatterscan-card p {
        margin: 0 0 10px;
        color: #24292f;
        white-space: pre-wrap;
      }

      .linkedin-chatterscan-card-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 10px;
        font-size: 12px;
      }

      .linkedin-chatterscan-links-label {
        margin: 10px 0 6px;
        color: #57606a;
        font-size: 12px;
        font-weight: 700;
      }

      .linkedin-chatterscan-media-label {
        margin: 10px 0 0;
        color: #57606a;
        font-size: 12px;
        font-weight: 700;
      }

      .linkedin-chatterscan-card ul {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin: 0;
        padding: 0;
        list-style: none;
      }

      .linkedin-chatterscan-card li a {
        display: inline-block;
        max-width: 240px;
        overflow: hidden;
        padding: 4px 7px;
        border-radius: 999px;
        background: #e7f3ff;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .linkedin-chatterscan-empty {
        margin: 24px 0 0;
        color: #57606a;
        text-align: center;
      }

      .linkedin-chatterscan-log {
        max-height: 108px;
        margin: 0;
        padding: 10px 14px;
        border-top: 1px solid #d0d7de;
        background: #ffffff;
        color: #57606a;
        overflow: auto;
        white-space: pre-wrap;
        font-family: Consolas, "Courier New", monospace;
        font-size: 12px;
      }

      @media (max-width: 900px) {
        #${PANEL_ID} {
          width: 100vw;
          min-width: 0;
        }

        .linkedin-chatterscan-stats {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
    `;
    document.documentElement.append(style);
  }

  function createPanel() {
    if (document.getElementById(PANEL_ID)) {
      return;
    }

    const panel = document.createElement("aside");
    panel.id = PANEL_ID;
    panel.setAttribute("aria-label", "LinkedIn ChatterScan reader");
    panel.innerHTML = `
      <header class="linkedin-chatterscan-header">
        <span class="linkedin-chatterscan-title">
          <strong>ChatterScan Reader</strong>
          <span>LinkedIn feed is untouched</span>
        </span>
        <button type="button" aria-label="Collapse ChatterScan reader">Hide</button>
      </header>
      <div class="linkedin-chatterscan-body">
        <details class="linkedin-chatterscan-details">
          <summary><span data-stats-summary>Stats: 0 scanned, 0 selected, 0 collected</span></summary>
          <dl class="linkedin-chatterscan-stats">
            <div><dt>Scanned</dt><dd data-stat="scanned">0</dd></div>
            <div><dt>Selected</dt><dd data-stat="selected">0</dd></div>
            <div><dt>Collected</dt><dd data-stat="collected">0</dd></div>
            <div><dt>Ads out</dt><dd data-stat="excludedAds">0</dd></div>
            <div><dt>Link posts out</dt><dd data-stat="excludedWithLinks">0</dd></div>
            <div><dt>Comment-link out</dt><dd data-stat="excludedWithCommentLinks">0</dd></div>
            <div><dt>Pulse out</dt><dd data-stat="excludedWithPulseArticles">0</dd></div>
            <div><dt>Video out</dt><dd data-stat="excludedWithEmbeddedVideos">0</dd></div>
            <div><dt>Muted out</dt><dd data-stat="excludedMuted">0</dd></div>
            <div><dt>No-link out</dt><dd data-stat="excludedNoLinks">0</dd></div>
          </dl>
        </details>
        <div class="linkedin-chatterscan-list" aria-label="Selected posts"></div>
        <pre class="linkedin-chatterscan-log" aria-label="Recent log messages"></pre>
      </div>
    `;

    const button = panel.querySelector("button");
    button.addEventListener("click", () => {
      const isCollapsed = panel.classList.toggle(`${PANEL_ID}--collapsed`);
      button.textContent = isCollapsed ? "Show" : "Hide";
      button.setAttribute(
        "aria-label",
        isCollapsed ? "Expand ChatterScan reader" : "Collapse ChatterScan reader"
      );
    });

    document.documentElement.append(panel);

    panelElements = {
      panel,
      list: panel.querySelector(".linkedin-chatterscan-list"),
      log: panel.querySelector(".linkedin-chatterscan-log"),
      statsSummary: panel.querySelector("[data-stats-summary]"),
      stats: {
        scanned: panel.querySelector("[data-stat='scanned']"),
        selected: panel.querySelector("[data-stat='selected']"),
        collected: panel.querySelector("[data-stat='collected']"),
        excludedAds: panel.querySelector("[data-stat='excludedAds']"),
        excludedWithLinks: panel.querySelector("[data-stat='excludedWithLinks']"),
        excludedWithCommentLinks: panel.querySelector("[data-stat='excludedWithCommentLinks']"),
        excludedWithPulseArticles: panel.querySelector("[data-stat='excludedWithPulseArticles']"),
        excludedWithEmbeddedVideos: panel.querySelector("[data-stat='excludedWithEmbeddedVideos']"),
        excludedMuted: panel.querySelector("[data-stat='excludedMuted']"),
        excludedNoLinks: panel.querySelector("[data-stat='excludedNoLinks']")
      }
    };
  }

  function logStatsChange(stats) {
    if (!lastStats) {
      log(`Scanner ready. ${stats.collected} matching posts collected.`);
    } else if (stats.added) {
      log(`Reader updated: ${stats.added} new, ${stats.collected} collected.`);
    } else if (stats.errors) {
      log(`Reader saw ${stats.errors} parser errors while scanning.`);
    }

    lastStats = { ...stats };
  }

  function publishState(stats = latestStats) {
    latestStats = stats ? { ...stats } : latestStats;
    if (latestStats) {
      latestStats.collected = getVisiblePosts().length;
    }
    const posts = getVisiblePosts();

    chrome.storage.session.set({
      [STATE_KEY]: {
        posts,
        stats: latestStats,
        logLines,
        sourceUrl: window.location.href,
        pageZoomFactor,
        updatedAt: Date.now()
      }
    });
  }

  function updatePanel(stats) {
    if (!panelElements) {
      return;
    }

    for (const [key, value] of Object.entries(stats)) {
      if (panelElements.stats[key]) {
        panelElements.stats[key].textContent = String(value);
      }
    }
    panelElements.statsSummary.textContent = getStatsSummary(stats);

    renderPosts();
    panelElements.log.textContent = logLines.join("\n");
  }

  function renderPosts() {
    if (!panelElements) {
      return;
    }

    const posts = getVisiblePosts();
    const signature = posts.map(getPostSignature).join("\n");

    if (signature === lastRenderedSignature) {
      return;
    }

    lastRenderedSignature = signature;

    panelElements.list.replaceChildren();

    if (posts.length === 0) {
      const empty = document.createElement("p");
      empty.className = "linkedin-chatterscan-empty";
      empty.textContent = "No matching posts collected yet. Scroll LinkedIn manually to scan more.";
      panelElements.list.append(empty);
      return;
    }

    const fragment = document.createDocumentFragment();
    for (const post of posts) {
      fragment.append(createPostElement(post));
    }

    panelElements.list.append(fragment);
  }

  function createPostElement(post) {
    const article = document.createElement("article");
    article.className = "linkedin-chatterscan-card";
    article.dataset.linkedinChatterscanId = post.key;

    article.append(createDismissButtons(post));

    const heading = document.createElement("h3");
    if (post.author.profileUrl) {
      const authorLink = document.createElement("a");
      authorLink.href = post.author.profileUrl;
      authorLink.target = "_blank";
      authorLink.rel = "noreferrer";
      authorLink.textContent = post.author.name;
      heading.append(authorLink);
    } else {
      heading.textContent = post.author.name;
    }
    article.append(heading);

    if (post.postUrl || post.socialContext || post.dateText) {
      const meta = document.createElement("div");
      meta.className = "linkedin-chatterscan-card-meta";

      if (post.socialContext) {
        const context = document.createElement("span");
        context.textContent = `${post.socialContext.verb} by `;

        const contextLink = document.createElement("a");
        contextLink.textContent = post.socialContext.person.name;

        if (post.socialContext.person.profileUrl) {
          contextLink.href = post.socialContext.person.profileUrl;
          contextLink.target = "_blank";
          contextLink.rel = "noreferrer";
        }

        context.append(contextLink);
        meta.append(context);
      }

      if (post.dateText) {
        const date = document.createElement("span");
        date.textContent = post.dateText;
        meta.append(date);
      }

      if (post.postUrl) {
        const postLink = document.createElement("a");
        postLink.href = post.postUrl;
        postLink.target = "_blank";
        postLink.rel = "noreferrer";
        postLink.textContent = "Open LinkedIn post";
        meta.append(postLink);
      }

      article.append(meta);
    }

    const body = document.createElement("p");
    body.textContent = post.text;
    article.append(body);

    if (post.links.length > 0) {
      const label = document.createElement("div");
      label.className = "linkedin-chatterscan-links-label";
      label.textContent = getLinksLabel(post.links);
      article.append(label);

      const list = document.createElement("ul");
      for (const link of post.links) {
        const item = document.createElement("li");
        const anchor = document.createElement("a");
        anchor.href = link.href;
        anchor.target = "_blank";
        anchor.rel = "noreferrer";
        anchor.textContent = link.label;
        item.append(anchor);
        list.append(item);
      }
      article.append(list);
    }

    if (post.hasEmbeddedVideo) {
      const videoNote = document.createElement("div");
      videoNote.className = "linkedin-chatterscan-media-label";
      videoNote.textContent = "Embedded video detected";
      article.append(videoNote);
    }

    return article;
  }

  function createDismissButton(post, className, position = "") {
    const dismissButton = document.createElement("button");
    dismissButton.className = className;
    dismissButton.type = "button";
    dismissButton.textContent = "[x]";
    const positionText = position ? ` from the ${position} corner` : "";
    dismissButton.setAttribute(
      "aria-label",
      `Remove ${post.author?.name || "post"} from ChatterScan reader${positionText}`
    );
    dismissButton.addEventListener("click", () => dismissPost(post));
    return dismissButton;
  }

  function createDismissButtons(post) {
    const fragment = document.createDocumentFragment();
    const positions = [
      ["linkedin-chatterscan-dismiss-post linkedin-chatterscan-dismiss-post-top-left", "top left"],
      ["linkedin-chatterscan-dismiss-post linkedin-chatterscan-dismiss-post-top-right", "top right"],
      ["linkedin-chatterscan-dismiss-post linkedin-chatterscan-dismiss-post-bottom-left", "bottom left"],
      ["linkedin-chatterscan-dismiss-post linkedin-chatterscan-dismiss-post-bottom-right", "bottom right"]
    ];

    for (const [className, position] of positions) {
      fragment.append(createDismissButton(post, className, position));
    }

    return fragment;
  }

  function getPostSignature(post) {
    return [
      post.key,
      post.dismissalKey || "",
      post.author.name,
      post.author.profileUrl,
      post.socialContext?.verb || "",
      post.socialContext?.person?.name || "",
      post.socialContext?.person?.profileUrl || "",
      post.dateText,
      post.text,
      post.postUrl,
      post.postUrlMissingReason,
      post.hasEmbeddedVideo ? "video" : "",
      pageZoomFactor,
      post.links.map((link) => `${link.source || "body"}:${link.label}:${link.href}`).join("|")
    ].join("::");
  }

  function getLinksLabel(links) {
    const sources = [];
    const hasBodyLinks = links.some((link) => !link.source || link.source === "body");
    const hasCommentLinks = links.some((link) => link.source === "comment");
    const hasPulseLinks = links.some((link) => link.source === "pulse");

    if (hasBodyLinks) {
      sources.push("post");
    }

    if (hasCommentLinks) {
      sources.push("comments");
    }

    if (hasPulseLinks) {
      sources.push("Pulse articles");
    }

    if (sources.length === 1 && sources[0] === "Pulse articles") {
      return "Pulse articles:";
    }

    return `Links in ${joinLabels(sources)}:`;
  }

  function joinLabels(labels) {
    if (labels.length <= 1) {
      return labels[0] || "post";
    }

    if (labels.length === 2) {
      return `${labels[0]} and ${labels[1]}`;
    }

    return `${labels.slice(0, -1).join(", ")}, and ${labels.at(-1)}`;
  }

  function getStatsSummary(stats) {
    const excluded =
      (stats.excludedAds || 0) +
      (stats.excludedWithLinks || 0) +
      (stats.excludedWithCommentLinks || 0) +
      (stats.excludedWithPulseArticles || 0) +
      (stats.excludedWithEmbeddedVideos || 0) +
      (stats.excludedMuted || 0) +
      (stats.excludedNoLinks || 0);

    return (
      `Stats: ${stats.scanned || 0} scanned, ${stats.selected || 0} selected, ` +
      `${stats.collected || 0} collected, ${excluded} out`
    );
  }

  function getVisiblePosts() {
    return Array.from(postsByKey.values())
      .filter((post) => !isMutedPost(post))
      .filter((post) => !isDismissedPost(post))
      .sort((a, b) => b.seenAt - a.seenAt)
      .slice(0, 80);
  }

  function isMutedPost(post) {
    return isMutedAuthor(mutedPeople, post?.author);
  }

  function pruneMutedPosts() {
    for (const [key, post] of postsByKey.entries()) {
      if (isMutedPost(post)) {
        postsByKey.delete(key);
      }
    }

    lastRenderedSignature = null;
    if (latestStats) {
      latestStats.collected = getVisiblePosts().length;
    }
    publishState();
  }

  function isDismissedPost(post) {
    return dismissedPostKeys.has(getDismissPostKey(post));
  }

  function getDismissPostKey(post) {
    return post?.dismissalKey || post?.key || "";
  }

  function dismissPost(post) {
    const key = getDismissPostKey(post);
    if (!key) {
      return;
    }

    dismissedPostKeys.add(key);
    postsByKey.delete(post.key);
    lastRenderedSignature = null;
    renderPosts();

    if (latestStats) {
      latestStats.collected = getVisiblePosts().length;
    }
    publishState();
    saveDismissedPostKey(key);
  }

  function loadDismissedPostKeys(callback) {
    sendRuntimeMessage({ type: "linkedinChatterScanGetDismissedPosts" }, (response) => {
      dismissedPostKeys = new Set(response?.keys || []);
      callback();
    });
  }

  function saveDismissedPostKey(key) {
    sendRuntimeMessage({ type: "linkedinChatterScanDismissPost", key }, (response) => {
      if (response?.keys) {
        applyDismissedPostKeys(response.keys);
      }
    });
  }

  function loadPageZoom(callback) {
    sendRuntimeMessage({ type: "linkedinChatterScanGetPageZoom" }, (response) => {
      setPageZoomFactor(response?.zoomFactor);
      callback();
    });
  }

  function applyDismissedPostKeys(keys) {
    dismissedPostKeys = new Set(keys);

    for (const [key, post] of postsByKey.entries()) {
      if (isDismissedPost(post)) {
        postsByKey.delete(key);
      }
    }

    lastRenderedSignature = null;
    if (panelElements) {
      renderPosts();
    }
    if (latestStats) {
      latestStats.collected = getVisiblePosts().length;
    }
    publishState();
    scheduleScan();
  }

  function setPageZoomFactor(zoomFactor) {
    const parsed = Number(zoomFactor);
    pageZoomFactor = Number.isFinite(parsed) && parsed > 0 ? Math.min(Math.max(parsed, 0.5), 3) : 1;
  }

  function sendRuntimeMessage(message, callback) {
    try {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          callback(null);
          return;
        }

        callback(response);
      });
    } catch (_error) {
      callback(null);
    }
  }

  function log(message) {
    const time = new Date().toLocaleTimeString();
    const line = `[${time}] ${message}`;
    logLines.unshift(line);
    logLines.splice(8);

    console.info(`[ChatterScan] ${message}`);

    if (panelElements) {
      panelElements.log.textContent = logLines.join("\n");
    }

    publishState();
  }

  function logError(message, error) {
    const detail = error?.message || String(error);
    console.error(`[ChatterScan] ${message}`, error);
    log(`${message}: ${detail}`);
  }

  function truncate(value, length) {
    return value.length > length ? `${value.slice(0, length - 1).trim()}...` : value;
  }
})();
