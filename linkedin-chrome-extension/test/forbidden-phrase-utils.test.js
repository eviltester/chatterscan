const assert = require("node:assert/strict");
const test = require("node:test");

const {
  getForbiddenPhraseMatches,
  normalizeForbiddenPhrases,
  removeForbiddenPhrase
} = require("../src/forbidden-phrase-utils");

test("normalizes forbidden phrases by trimming and deduping case-insensitively", () => {
  assert.deepEqual(
    normalizeForbiddenPhrases(["  AI slop  ", "ai   slop", "", "Launch"]),
    ["AI slop", "Launch"]
  );
});

test("matches forbidden phrases as literal case-insensitive text", () => {
  assert.deepEqual(
    getForbiddenPhraseMatches("This post contains ai slop, not a regex.", ["AI slop", "ai.*regex"]),
    ["AI slop"]
  );
});

test("removes a forbidden phrase case-insensitively", () => {
  assert.deepEqual(removeForbiddenPhrase(["AI slop", "Launch"], "ai SLOP"), ["Launch"]);
});
