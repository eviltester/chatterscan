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
    includeLinkedInContentLinks: true,
    autoScrollOverlayEnabled: true,
    autoScrollOverlayOpacity: 0.9,
    autoScrollOverlayColor: "#f6f8fa"
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
      includeLinkedInContentLinks: false,
      autoScrollOverlayEnabled: true,
      autoScrollOverlayOpacity: 0.9,
      autoScrollOverlayColor: "#f6f8fa"
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
      includeLinkedInContentLinks: true,
      autoScrollOverlayEnabled: true,
      autoScrollOverlayOpacity: 0.9,
      autoScrollOverlayColor: "#f6f8fa"
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
      includeLinkedInContentLinks: true,
      autoScrollOverlayEnabled: true,
      autoScrollOverlayOpacity: 0.9,
      autoScrollOverlayColor: "#f6f8fa"
    }
  );
});

test("auto scroll overlay settings are normalized and preserved", () => {
  assert.deepEqual(
    normalizeSettings({
      autoScrollOverlayEnabled: false,
      autoScrollOverlayOpacity: 0.42,
      autoScrollOverlayColor: "#ABCDEF"
    }),
    {
      includeAds: false,
      includePostsWithLinks: true,
      includePostsWithCommentLinks: true,
      includePostsWithPulseArticles: false,
      includePostsWithEmbeddedVideos: false,
      includePostsWithoutLinks: false,
      includeLinkedInContentLinks: true,
      autoScrollOverlayEnabled: false,
      autoScrollOverlayOpacity: 0.42,
      autoScrollOverlayColor: "#abcdef"
    }
  );
});

test("auto scroll overlay settings fall back to safe defaults", () => {
  assert.deepEqual(
    normalizeSettings({
      autoScrollOverlayOpacity: -2,
      autoScrollOverlayColor: "blue"
    }),
    {
      includeAds: false,
      includePostsWithLinks: true,
      includePostsWithCommentLinks: true,
      includePostsWithPulseArticles: false,
      includePostsWithEmbeddedVideos: false,
      includePostsWithoutLinks: false,
      includeLinkedInContentLinks: true,
      autoScrollOverlayEnabled: true,
      autoScrollOverlayOpacity: 0,
      autoScrollOverlayColor: "#f6f8fa"
    }
  );
});
