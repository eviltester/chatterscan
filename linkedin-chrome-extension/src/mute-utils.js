(function attachMuteUtils(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  root.LinkedInChatterScanMuteUtils = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, () => {
  const MUTED_PEOPLE_KEY = "linkedinChatterScanMutedPeople";

  function createMutedPersonRecord(person) {
    const name = normalizeName(person?.name);
    const profileUrl = normalizeProfileUrl(person?.profileUrl);
    const id = getPersonPrimaryKey({ name, profileUrl });

    if (!id) {
      return null;
    }

    return {
      id,
      name: name || "Unknown author",
      profileUrl,
      nameKey: getNameKey(name),
      mutedAt: Date.now()
    };
  }

  function normalizeMutedPeople(value) {
    if (!Array.isArray(value)) {
      return [];
    }

    const people = [];
    const seen = new Set();

    for (const item of value) {
      const person = normalizeMutedPerson(item);
      if (!person || seen.has(person.id)) {
        continue;
      }

      seen.add(person.id);
      people.push(person);
    }

    return people.sort((a, b) => a.name.localeCompare(b.name));
  }

  function normalizeMutedPerson(item) {
    if (!item || typeof item !== "object") {
      return null;
    }

    const name = normalizeName(item.name);
    const profileUrl = normalizeProfileUrl(item.profileUrl);
    const id = String(item.id || getPersonPrimaryKey({ name, profileUrl })).trim();

    if (!id) {
      return null;
    }

    return {
      id,
      name: name || "Unknown author",
      profileUrl,
      nameKey: getNameKey(item.name || name),
      mutedAt: Number(item.mutedAt) || Date.now()
    };
  }

  function isMutedAuthor(mutedPeople, author) {
    const keys = getPersonKeys(author);
    if (keys.length === 0) {
      return false;
    }

    return normalizeMutedPeople(mutedPeople).some((person) =>
      keys.includes(person.id) || keys.includes(person.nameKey)
    );
  }

  function getPersonPrimaryKey(person) {
    return getProfileKey(person?.profileUrl) || getNameKey(person?.name);
  }

  function getPersonKeys(person) {
    return [getProfileKey(person?.profileUrl), getNameKey(person?.name)].filter(Boolean);
  }

  function getProfileKey(profileUrl) {
    const normalized = normalizeProfileUrl(profileUrl);
    return normalized ? `profile:${normalized.toLowerCase()}` : "";
  }

  function getNameKey(name) {
    const normalized = normalizeName(name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

    return normalized ? `name:${normalized}` : "";
  }

  function normalizeName(name) {
    return String(name || "").replace(/\s+/g, " ").trim();
  }

  function normalizeProfileUrl(profileUrl) {
    if (!profileUrl) {
      return "";
    }

    try {
      const url = new URL(profileUrl, "https://www.linkedin.com");
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        return "";
      }

      url.hash = "";
      url.search = "";
      return url.href.replace(/\/$/, "");
    } catch (_error) {
      return "";
    }
  }

  return {
    MUTED_PEOPLE_KEY,
    createMutedPersonRecord,
    getPersonPrimaryKey,
    isMutedAuthor,
    normalizeMutedPeople
  };
});
