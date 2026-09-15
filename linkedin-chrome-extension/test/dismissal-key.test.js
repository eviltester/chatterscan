const assert = require("node:assert/strict");
const test = require("node:test");

const {
  FALLBACK_DISMISSAL_PREFIX,
  getDismissalKey,
  hashString,
  normalizeFingerprintPart
} = require("../src/dismissal-key");

function createFallbackPost(overrides = {}) {
  return {
    key: "dom-card:1",
    authorName: "Carrie Warner",
    authorProfileUrl: "https://www.linkedin.com/in/carrie-warner/",
    text: "A useful LinkedIn post about testing tools and automation.",
    links: [{ href: "https://example.com/testing", label: "Testing" }],
    ...overrides
  };
}

test("LinkedIn URN-backed posts use the URN as the dismissal key", () => {
  assert.equal(
    getDismissalKey(createFallbackPost({ key: "urn:li:activity:12345" })),
    "urn:li:activity:12345"
  );
  assert.equal(
    getDismissalKey(createFallbackPost({ key: "urn:li:ugcPost:67890" })),
    "urn:li:ugcPost:67890"
  );
});

test("fallback dismissal keys ignore temporary DOM card keys", () => {
  const firstKey = getDismissalKey(createFallbackPost({ key: "dom-card:1" }));
  const secondKey = getDismissalKey(createFallbackPost({ key: "dom-card:25" }));

  assert.equal(firstKey, secondKey);
  assert.match(firstKey, new RegExp(`^${FALLBACK_DISMISSAL_PREFIX}::[a-z0-9]+::[a-z0-9]+$`));
});

test("fallback dismissal keys change for different authors with the same content", () => {
  const firstKey = getDismissalKey(createFallbackPost({ authorName: "Carrie Warner" }));
  const secondKey = getDismissalKey(createFallbackPost({ authorName: "Sam Rivera" }));

  assert.notEqual(firstKey, secondKey);
});

test("fallback dismissal keys change for meaningfully different content", () => {
  const firstKey = getDismissalKey(createFallbackPost({
    text: "A useful LinkedIn post about testing tools and automation."
  }));
  const secondKey = getDismissalKey(createFallbackPost({
    text: "A different LinkedIn post about product dashboards and reporting."
  }));

  assert.notEqual(firstKey, secondKey);
});

test("fallback dismissal keys normalize whitespace and case", () => {
  const firstKey = getDismissalKey(createFallbackPost({
    authorName: "Carrie Warner",
    text: "A useful LinkedIn post about testing tools and automation."
  }));
  const secondKey = getDismissalKey(createFallbackPost({
    authorName: "  carrie   WARNER  ",
    text: "a useful linkedin   post about testing tools and automation."
  }));

  assert.equal(firstKey, secondKey);
});

test("string hashing is deterministic and compact", () => {
  assert.equal(hashString("same input"), hashString("same input"));
  assert.notEqual(hashString("same input"), hashString("different input"));
  assert.match(hashString("same input"), /^[a-z0-9]+$/);
});

test("fingerprint normalization trims and collapses whitespace", () => {
  assert.equal(normalizeFingerprintPart("  Hello\n  WORLD  "), "hello world");
});
