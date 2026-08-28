const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildLinkedInSearchKeywords,
  buildLinkedInSearchUrl,
  createSavedSearchRecord,
  normalizeExcludedWords,
  normalizeSavedSearches
} = require("../src/saved-search-utils");

test("builds LinkedIn content search URLs with absolute phrases, exclusions, and latest sorting", () => {
  const url = buildLinkedInSearchUrl({
    id: "search-1",
    phrase: "Software Testing",
    absolute: true,
    excludedWords: ["career", "job", "\"hiring\""],
    latest: true
  });

  assert.equal(
    url,
    "https://www.linkedin.com/search/results/content/?keywords=%22Software%20Testing%22%20-%22career%22%20-%22job%22%20-%22hiring%22&origin=GLOBAL_SEARCH_HEADER&sortBy=%5B%22date_posted%22%5D"
  );
});

test("does not double quote an already quoted absolute phrase", () => {
  assert.equal(
    buildLinkedInSearchKeywords({
      id: "search-1",
      phrase: "\"software testing\"",
      absolute: true,
      excludedWords: ["career"],
      latest: false
    }),
    "\"software testing\" -\"career\""
  );
});

test("plain saved search phrases are not quoted", () => {
  assert.equal(
    buildLinkedInSearchKeywords({
      id: "search-1",
      phrase: "software testing",
      absolute: false,
      excludedWords: ["career"],
      latest: false
    }),
    "software testing -\"career\""
  );
});

test("excluded words are normalized from comma or line separated input and deduped", () => {
  assert.deepEqual(
    normalizeExcludedWords(" career, job\n\"hiring\" ; Job "),
    ["career", "job", "hiring"]
  );
});

test("saved searches preserve editable fields and discard invalid records", () => {
  assert.deepEqual(
    normalizeSavedSearches([
      {
        id: "search-1",
        phrase: "software testing",
        absolute: true,
        excludedWords: "career, job",
        latest: true,
        createdAt: 10,
        updatedAt: 20
      },
      {
        id: "empty",
        phrase: " "
      }
    ]),
    [
      {
        id: "search-1",
        phrase: "software testing",
        absolute: true,
        excludedWords: ["career", "job"],
        latest: true,
        createdAt: 10,
        updatedAt: 20
      }
    ]
  );
});

test("creates saved search records while preserving existing ids during edit", () => {
  const record = createSavedSearchRecord(
    {
      phrase: "software testing",
      absolute: true,
      excludedWords: "career, job",
      latest: true
    },
    {
      id: "search-1",
      createdAt: 10
    }
  );

  assert.equal(record.id, "search-1");
  assert.equal(record.createdAt, 10);
  assert.equal(record.phrase, "software testing");
  assert.equal(record.absolute, true);
  assert.deepEqual(record.excludedWords, ["career", "job"]);
  assert.equal(record.latest, true);
  assert.ok(record.updatedAt >= 10);
});
