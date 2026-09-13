const assert = require("node:assert/strict");
const test = require("node:test");

const {
  isAllowedSavedSearchUrl,
  isSupportedLinkedInUrl
} = require("../src/linkedin-url-utils");

test("supports current LinkedIn feed and content search pages", () => {
  assert.equal(isSupportedLinkedInUrl("https://www.linkedin.com/feed/"), true);
  assert.equal(isSupportedLinkedInUrl("https://www.linkedin.com/feed/foryou/"), true);
  assert.equal(isSupportedLinkedInUrl("https://www.linkedin.com/search/results/all/"), true);
  assert.equal(isSupportedLinkedInUrl("https://www.linkedin.com/search/results/content/"), true);
});

test("does not enable the side panel on unrelated LinkedIn pages", () => {
  assert.equal(isSupportedLinkedInUrl("https://www.linkedin.com/in/example/"), false);
  assert.equal(isSupportedLinkedInUrl("https://www.linkedin.com/feed/update/urn:li:activity:123/"), false);
  assert.equal(isSupportedLinkedInUrl("https://example.com/feed/foryou/"), false);
});

test("saved searches only open LinkedIn content search URLs", () => {
  assert.equal(
    isAllowedSavedSearchUrl("https://www.linkedin.com/search/results/content/?keywords=test"),
    true
  );
  assert.equal(isAllowedSavedSearchUrl("https://www.linkedin.com/feed/foryou/"), false);
  assert.equal(isAllowedSavedSearchUrl("https://example.com/search/results/content/"), false);
});
