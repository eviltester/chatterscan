const assert = require("node:assert/strict");
const test = require("node:test");

const { EMBEDDED_VIDEO_SELECTOR, hasEmbeddedVideo } = require("../src/media-utils");

function createCard(matchSelector = "") {
  return {
    querySelector(selector) {
      return selector === matchSelector ? {} : null;
    }
  };
}

test("detects rendered LinkedIn embedded video markers", () => {
  assert.equal(hasEmbeddedVideo(createCard(EMBEDDED_VIDEO_SELECTOR)), true);
});

test("ignores cards without embedded video markers", () => {
  assert.equal(hasEmbeddedVideo(createCard()), false);
  assert.equal(hasEmbeddedVideo(null), false);
});
