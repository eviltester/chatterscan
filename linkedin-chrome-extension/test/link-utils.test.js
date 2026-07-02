const assert = require("node:assert/strict");
const test = require("node:test");

const { normalizeLinkUrl, unwrapLinkedInSafetyUrl } = require("../src/link-utils");

test("unwraps LinkedIn safety redirect URLs to the useful external target", () => {
  const url = new URL(
    "https://www.linkedin.com/safety/go/?url=https%3A%2F%2Flnkd%2Ein%2FexZc84xE&urlhash=meE0&isSdui=true"
  );

  assert.equal(
    unwrapLinkedInSafetyUrl(url, "https://www.linkedin.com/feed/").href,
    "https://lnkd.in/exZc84xE"
  );
});

test("normalizes safety redirect URLs before useful-link filtering sees them", () => {
  assert.equal(
    normalizeLinkUrl(
      "https://www.linkedin.com/safety/go/?url=https%3A%2F%2Fwww%2Esecureflag%2Ecom%2Fowasp&urlhash=Y8RE",
      "https://www.linkedin.com/feed/"
    ).href,
    "https://www.secureflag.com/owasp"
  );
});

test("keeps ordinary URLs unchanged", () => {
  assert.equal(
    normalizeLinkUrl("https://www.linkedin.com/company/owasp/posts/", "https://www.linkedin.com/feed/").href,
    "https://www.linkedin.com/company/owasp/posts/"
  );
});
