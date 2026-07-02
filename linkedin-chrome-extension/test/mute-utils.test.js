const assert = require("node:assert/strict");
const test = require("node:test");

const {
  createMutedPersonRecord,
  isMutedAuthor,
  normalizeMutedPeople
} = require("../src/mute-utils");

test("creates muted people from LinkedIn profile authors", () => {
  const muted = createMutedPersonRecord({
    name: "  Carrie Warner  ",
    profileUrl: "https://www.linkedin.com/in/carrie-warner/?miniProfileUrn=abc"
  });

  assert.equal(muted.name, "Carrie Warner");
  assert.equal(muted.profileUrl, "https://www.linkedin.com/in/carrie-warner");
  assert.equal(muted.id, "profile:https://www.linkedin.com/in/carrie-warner");
});

test("matches muted authors by profile or normalized name", () => {
  const mutedPeople = normalizeMutedPeople([
    createMutedPersonRecord({
      name: "Carrie Warner",
      profileUrl: "https://www.linkedin.com/in/carrie-warner/"
    })
  ]);

  assert.equal(
    isMutedAuthor(mutedPeople, {
      name: "Different Display",
      profileUrl: "https://www.linkedin.com/in/carrie-warner?trackingId=123"
    }),
    true
  );
  assert.equal(isMutedAuthor(mutedPeople, { name: "Carrie   Warner", profileUrl: "" }), true);
  assert.equal(isMutedAuthor(mutedPeople, { name: "Casey Warner", profileUrl: "" }), false);
});

test("dedupes normalized muted people", () => {
  const people = normalizeMutedPeople([
    { name: "Carrie Warner", profileUrl: "https://www.linkedin.com/in/carrie-warner" },
    { name: "Carrie Warner", profileUrl: "https://www.linkedin.com/in/carrie-warner/" }
  ]);

  assert.equal(people.length, 1);
});
