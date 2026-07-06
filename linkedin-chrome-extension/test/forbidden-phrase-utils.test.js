const assert = require("node:assert/strict");
const test = require("node:test");

const {
  getForbiddenPhraseMatches,
  getIncludedPhraseMatches,
  normalizeForbiddenPhrases,
  normalizeIncludedPhrases,
  removeForbiddenPhrase,
  removeIncludedPhrase
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

test("normalizes included phrases by trimming and deduping case-insensitively", () => {
  assert.deepEqual(
    normalizeIncludedPhrases(["  launch guide  ", "Launch   Guide", "", "Workshop"]),
    ["launch guide", "Workshop"]
  );
});

test("matches included phrases as literal case-insensitive text", () => {
  assert.deepEqual(
    getIncludedPhraseMatches("This post mentions a Launch Guide, not a regex.", ["launch guide", "launch.*"]),
    ["launch guide"]
  );
});

test("removes an included phrase case-insensitively", () => {
  assert.deepEqual(removeIncludedPhrase(["Launch Guide", "Workshop"], "launch guide"), ["Workshop"]);
});
