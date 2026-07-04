(function attachForbiddenPhraseUtils(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  root.LinkedInChatterScanForbiddenPhraseUtils = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, () => {
  const FORBIDDEN_PHRASES_KEY = "linkedinChatterScanForbiddenPhrases";

  function normalizeForbiddenPhrases(value) {
    if (!Array.isArray(value)) {
      return [];
    }

    const phrases = [];
    const seen = new Set();

    for (const item of value) {
      const phrase = normalizePhrase(item);
      const key = getPhraseKey(phrase);
      if (!phrase || seen.has(key)) {
        continue;
      }

      seen.add(key);
      phrases.push(phrase);
    }

    return phrases.sort((a, b) => a.localeCompare(b));
  }

  function getForbiddenPhraseMatches(text, phrases) {
    const haystack = String(text || "").toLowerCase();
    if (!haystack) {
      return [];
    }

    return normalizeForbiddenPhrases(phrases).filter((phrase) =>
      haystack.includes(phrase.toLowerCase())
    );
  }

  function removeForbiddenPhrase(phrases, phraseToRemove) {
    const keyToRemove = getPhraseKey(phraseToRemove);
    return normalizeForbiddenPhrases(phrases).filter((phrase) => getPhraseKey(phrase) !== keyToRemove);
  }

  function normalizePhrase(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function getPhraseKey(value) {
    return normalizePhrase(value).toLowerCase();
  }

  return {
    FORBIDDEN_PHRASES_KEY,
    getForbiddenPhraseMatches,
    normalizeForbiddenPhrases,
    removeForbiddenPhrase
  };
});
