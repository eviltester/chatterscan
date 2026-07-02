const assert = require("node:assert/strict");
const test = require("node:test");

const {
  getMissingPostUrlReason,
  isFallbackPostKey,
  isLinkedInPostKey,
  postKeyMatchesUrl,
  postUrlBelongsToKey
} = require("../src/post-link");

test("real LinkedIn keys only accept URLs containing the same numeric id", () => {
  assert.equal(
    postUrlBelongsToKey(
      "urn:li:ugcPost:7463272080281858048",
      "https://www.linkedin.com/posts/carriewarner_example-ugcPost-7463272080281858048-rD83"
    ),
    true
  );
  assert.equal(
    postUrlBelongsToKey(
      "urn:li:ugcPost:7463272080281858048",
      "https://www.linkedin.com/posts/someone_else_example-ugcPost-123-rD83"
    ),
    false
  );
});

test("fallback DOM-card keys do not claim post URLs", () => {
  assert.equal(
    postUrlBelongsToKey(
      "dom-card:7",
      "https://www.linkedin.com/posts/carriewarner_example-ugcPost-7463272080281858048-rD83"
    ),
    false
  );
});

test("feed update URLs are accepted when they match the current LinkedIn key", () => {
  assert.equal(
    postUrlBelongsToKey(
      "urn:li:activity:12345",
      "https://www.linkedin.com/feed/update/urn:li:activity:12345/"
    ),
    true
  );
  assert.equal(
    postUrlBelongsToKey(
      "urn:li:activity:12345",
      "https://www.linkedin.com/feed/update/urn:li:activity:99999/"
    ),
    false
  );
});

test("promoted highlighted update ids can use celebrated feed post URLs", () => {
  assert.equal(
    postUrlBelongsToKey(
      "urn:li:activity:7478415637783146496",
      "https://www.linkedin.com/feed/update/urn:li:activity:7478415637783146496/"
    ),
    true
  );
});

test("key type helpers distinguish LinkedIn ids from fallback ids", () => {
  assert.equal(isLinkedInPostKey("urn:li:activity:123"), true);
  assert.equal(isLinkedInPostKey("dom-card:1"), false);
  assert.equal(isFallbackPostKey("dom-card:1"), true);
  assert.equal(isFallbackPostKey("urn:li:activity:123"), false);
});

test("plain fallback keys do not numerically match URLs", () => {
  assert.equal(
    postKeyMatchesUrl("dom-card:1", "https://www.linkedin.com/posts/example-ugcPost-123"),
    false
  );
});

test("highlighted context URLs explain missing post links without being accepted", () => {
  assert.equal(
    postUrlBelongsToKey(
      "dom-card:1",
      "https://www.linkedin.com/feed/update/urn:li:activity:7478415637783146496/"
    ),
    false
  );
  assert.equal(
    getMissingPostUrlReason({
      key: "dom-card:1",
      hasHighlightedUpdateUrn: true
    }),
    "LinkedIn only exposed a highlighted context URL, not a verified post URL."
  );
});

test("fallback cards report missing verified identity when no post URL candidate exists", () => {
  assert.equal(
    getMissingPostUrlReason({ key: "dom-card:2" }),
    "LinkedIn did not render a verified post id or canonical post URL for this card."
  );
});
