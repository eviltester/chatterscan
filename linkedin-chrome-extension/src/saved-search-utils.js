(function attachSavedSearchUtils(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  root.LinkedInChatterScanSavedSearchUtils = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, () => {
  const SAVED_SEARCHES_KEY = "linkedinChatterScanSavedSearches";
  const LINKEDIN_CONTENT_SEARCH_URL = "https://www.linkedin.com/search/results/content/";

  function createSavedSearchRecord(input, existingSearch) {
    const phrase = normalizeText(input?.phrase);
    if (!phrase) {
      return null;
    }

    const now = Date.now();
    return {
      id: existingSearch?.id || createSearchId(),
      phrase,
      absolute: Boolean(input?.absolute),
      excludedWords: normalizeExcludedWords(input?.excludedWords),
      latest: Boolean(input?.latest),
      createdAt: Number(existingSearch?.createdAt) || now,
      updatedAt: now
    };
  }

  function normalizeSavedSearches(value) {
    if (!Array.isArray(value)) {
      return [];
    }

    const searches = [];
    const seen = new Set();

    for (const item of value) {
      const search = normalizeSavedSearch(item);
      if (!search || seen.has(search.id)) {
        continue;
      }

      seen.add(search.id);
      searches.push(search);
    }

    return searches;
  }

  function normalizeSavedSearch(item) {
    if (!item || typeof item !== "object") {
      return null;
    }

    const phrase = normalizeText(item.phrase);
    if (!phrase) {
      return null;
    }

    return {
      id: normalizeText(item.id) || createStableSearchId(item),
      phrase,
      absolute: Boolean(item.absolute),
      excludedWords: normalizeExcludedWords(item.excludedWords),
      latest: Boolean(item.latest),
      createdAt: Number(item.createdAt) || Date.now(),
      updatedAt: Number(item.updatedAt) || Number(item.createdAt) || Date.now()
    };
  }

  function buildLinkedInSearchUrl(searchInput) {
    const search = normalizeSavedSearch(searchInput);
    if (!search) {
      return "";
    }

    const url = new URL(LINKEDIN_CONTENT_SEARCH_URL);
    const keywords = buildLinkedInSearchKeywords(search);
    url.searchParams.set("keywords", keywords);
    url.searchParams.set("origin", "GLOBAL_SEARCH_HEADER");

    if (search.latest) {
      url.searchParams.set("sortBy", JSON.stringify(["date_posted"]));
    }

    return url.href.replace(/\+/g, "%20");
  }

  function buildLinkedInSearchKeywords(searchInput) {
    const search = normalizeSavedSearch(searchInput);
    if (!search) {
      return "";
    }

    const terms = [
      search.absolute ? ensureQuoted(search.phrase) : search.phrase,
      ...search.excludedWords.map((word) => `-${ensureQuoted(word)}`)
    ];

    return terms.join(" ");
  }

  function normalizeExcludedWords(value) {
    const rawItems = Array.isArray(value)
      ? value
      : String(value || "").split(/[\n,;]+/);
    const words = [];
    const seen = new Set();

    for (const item of rawItems) {
      const word = stripWrappingQuotes(normalizeText(item));
      const key = word.toLowerCase();
      if (!word || seen.has(key)) {
        continue;
      }

      seen.add(key);
      words.push(word);
    }

    return words;
  }

  function ensureQuoted(value) {
    const text = normalizeText(value);
    return isWrappedInQuotes(text) ? text : `"${stripWrappingQuotes(text)}"`;
  }

  function stripWrappingQuotes(value) {
    const text = normalizeText(value);
    return isWrappedInQuotes(text) ? text.slice(1, -1).trim() : text;
  }

  function isWrappedInQuotes(value) {
    return /^".*"$/.test(normalizeText(value));
  }

  function normalizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function createSearchId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }

    return `search:${Date.now()}:${Math.random().toString(16).slice(2)}`;
  }

  function createStableSearchId(search) {
    const key = [
      normalizeText(search?.phrase).toLowerCase(),
      Boolean(search?.absolute) ? "absolute" : "loose",
      normalizeExcludedWords(search?.excludedWords).join("|").toLowerCase(),
      Boolean(search?.latest) ? "latest" : "relevance"
    ].join(":");

    return `search:${key}`;
  }

  return {
    SAVED_SEARCHES_KEY,
    buildLinkedInSearchKeywords,
    buildLinkedInSearchUrl,
    createSavedSearchRecord,
    normalizeExcludedWords,
    normalizeSavedSearches
  };
});
