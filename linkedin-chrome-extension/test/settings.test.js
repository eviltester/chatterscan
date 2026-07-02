const assert = require("node:assert/strict");
const test = require("node:test");

const { DEFAULT_SETTINGS, normalizeSettings } = require("../src/settings");

test("defaults include posts with detected useful link sources", () => {
  assert.deepEqual(normalizeSettings(), {
    includeAds: false,
    includePostsWithLinks: true,
    includePostsWithCommentLinks: true,
    includePostsWithPulseArticles: false,
    includePostsWithEmbeddedVideos: false,
    includePostsWithoutLinks: false,
    includeLinkedInContentLinks: true
  });
  assert.equal(DEFAULT_SETTINGS.includePostsWithLinks, true);
});

test("old hide settings migrate to include settings", () => {
  assert.deepEqual(
    normalizeSettings({
      hideAds: true,
      hidePostsWithoutLinks: true,
      includeLinkedInContentLinks: false
    }),
    {
      includeAds: false,
      includePostsWithLinks: true,
      includePostsWithCommentLinks: true,
      includePostsWithPulseArticles: false,
      includePostsWithEmbeddedVideos: false,
      includePostsWithoutLinks: false,
      includeLinkedInContentLinks: false
    }
  );

  assert.deepEqual(
    normalizeSettings({
      hideAds: false,
      hidePostsWithoutLinks: false
    }),
    {
      includeAds: true,
      includePostsWithLinks: true,
      includePostsWithCommentLinks: true,
      includePostsWithPulseArticles: false,
      includePostsWithEmbeddedVideos: false,
      includePostsWithoutLinks: true,
      includeLinkedInContentLinks: true
    }
  );
});

test("new include settings are preserved", () => {
  assert.deepEqual(
    normalizeSettings({
      includeAds: true,
      includePostsWithLinks: false,
      includePostsWithCommentLinks: false,
      includePostsWithPulseArticles: false,
      includePostsWithEmbeddedVideos: true,
      includePostsWithoutLinks: true
    }),
    {
      includeAds: true,
      includePostsWithLinks: false,
      includePostsWithCommentLinks: false,
      includePostsWithPulseArticles: false,
      includePostsWithEmbeddedVideos: true,
      includePostsWithoutLinks: true,
      includeLinkedInContentLinks: true
    }
  );
});
