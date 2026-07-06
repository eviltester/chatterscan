const assert = require("node:assert/strict");
const test = require("node:test");

const { DEFAULT_SETTINGS } = require("../src/settings");
const { getPostFilterDecision } = require("../src/post-filter");

function createPost(overrides = {}) {
  return {
    links: [],
    linkSourceCounts: {},
    hasEmbeddedVideo: false,
    isAd: false,
    forbiddenPhraseMatches: [],
    includedPhraseMatches: [],
    ...overrides
  };
}

test("excludes no-link posts by default", () => {
  assert.deepEqual(
    getPostFilterDecision(createPost(), DEFAULT_SETTINGS),
    { include: false, excludedStat: "excludedNoLinks" }
  );
});

test("includes no-link posts when an included phrase matches", () => {
  assert.deepEqual(
    getPostFilterDecision(createPost({ includedPhraseMatches: ["launch guide"] }), DEFAULT_SETTINGS),
    { include: true, includedByPhrase: true }
  );
});

test("included phrases override disabled source filters and ads", () => {
  const settings = {
    ...DEFAULT_SETTINGS,
    includeAds: false,
    includePostsWithLinks: false,
    includePostsWithCommentLinks: false,
    includePostsWithPulseArticles: false,
    includePostsWithEmbeddedVideos: false,
    includePostsWithoutLinks: false
  };

  assert.deepEqual(
    getPostFilterDecision(
      createPost({
        isAd: true,
        linkSourceCounts: { body: 1, comment: 1, pulse: 1 },
        hasEmbeddedVideo: true,
        includedPhraseMatches: ["must read"]
      }),
      settings
    ),
    { include: true, includedByPhrase: true }
  );
});

test("forbidden phrases override included phrases", () => {
  assert.deepEqual(
    getPostFilterDecision(
      createPost({
        forbiddenPhraseMatches: ["blocked"],
        includedPhraseMatches: ["must read"]
      }),
      DEFAULT_SETTINGS
    ),
    { include: false, excludedStat: "excludedForbiddenPhrases" }
  );
});

test("keeps existing link-based inclusion behavior", () => {
  assert.deepEqual(
    getPostFilterDecision(
      createPost({
        links: [{ href: "https://example.com", label: "Example", source: "body" }],
        linkSourceCounts: { body: 1 }
      }),
      DEFAULT_SETTINGS
    ),
    { include: true, includedByPhrase: false }
  );
});
