const assert = require("node:assert/strict");
const test = require("node:test");

const { createPostStore, getPostIdFromValue, getPostUrlFromKey } = require("../src/post-store");

function createCard(attributes = {}, children = []) {
  return {
    id: attributes.id || "",
    dataset: {},
    attributes: Object.entries(attributes)
      .filter(([name]) => name !== "id")
      .map(([name, value]) => ({ name, value })),
    getAttribute(name) {
      return attributes[name] || "";
    },
    querySelector() {
      return children[0] || null;
    },
    querySelectorAll() {
      return children;
    }
  };
}

function createPost(key, overrides = {}) {
  return {
    key,
    author: { name: "Carrie Warner", profileUrl: "" },
    socialContext: null,
    dateText: "",
    text: "A useful LinkedIn post with enough text to be collected by the reader.",
    postUrl: "",
    links: [],
    isAd: false,
    ...overrides
  };
}

test("idless DOM cards get separate fallback keys and do not merge by post URL", () => {
  const store = createPostStore();
  const firstCard = createCard();
  const secondCard = createCard();

  const firstKey = store.getPostKey(firstCard);
  const secondKey = store.getPostKey(secondCard);

  assert.notEqual(firstKey, secondKey);
  assert.equal(store.upsertPost(createPost(firstKey, {
    postUrl: "https://www.linkedin.com/posts/example-current-page",
    links: [{ href: "https://example.com/a", label: "A" }]
  })), "added");
  assert.equal(store.upsertPost(createPost(secondKey, {
    postUrl: "https://www.linkedin.com/posts/example-current-page",
    links: [{ href: "https://example.com/b", label: "B" }]
  })), "added");

  assert.equal(store.postsByKey.size, 2);
  assert.deepEqual(
    Array.from(store.postsByKey.values()).map((post) => post.links.map((link) => link.href)),
    [["https://example.com/a"], ["https://example.com/b"]]
  );
});

test("same LinkedIn activity id keeps the first collected post unchanged", () => {
  const store = createPostStore();
  const firstCard = createCard({ "data-urn": "urn:li:activity:12345" });
  const secondCard = createCard({ "data-urn": "urn:li:activity:12345" });

  const key = store.getPostKey(firstCard);

  assert.equal(key, "urn:li:activity:12345");
  assert.equal(store.getPostKey(secondCard), key);
  assert.equal(store.upsertPost(createPost(key, {
    links: [{ href: "https://example.com/a", label: "A" }]
  })), "added");
  assert.equal(store.upsertPost(createPost(key, {
    postUrl: "https://www.linkedin.com/feed/update/urn:li:activity:12345/",
    links: [
      { href: "https://example.com/a", label: "A" },
      { href: "https://example.com/b", label: "B" }
    ]
  })), "unchanged");

  const [post] = store.postsByKey.values();
  assert.equal(store.postsByKey.size, 1);
  assert.equal(post.postUrl, "");
  assert.deepEqual(post.links.map((link) => link.href), ["https://example.com/a"]);
});

test("post ids are parsed from nested card attributes", () => {
  const store = createPostStore();
  const child = createCard({
    "data-entity-urn": "urn:li:ugcPost:7463272080281858048"
  });
  const card = createCard({}, [child]);

  assert.equal(store.getPostKey(card), "urn:li:ugcPost:7463272080281858048");
});

test("plain /posts/ display URLs are not treated as identity ids", () => {
  assert.equal(
    getPostIdFromValue("https://www.linkedin.com/posts/carriewarner_example-ugcPost-7463272080281858048-rD83"),
    ""
  );
});

test("post URLs are built from the exact collected post key", () => {
  assert.equal(
    getPostUrlFromKey("urn:li:activity:12345"),
    "https://www.linkedin.com/feed/update/urn:li:activity:12345/"
  );
  assert.equal(
    getPostUrlFromKey("urn:li:ugcPost:7463272080281858048"),
    "https://www.linkedin.com/feed/update/urn:li:ugcPost:7463272080281858048/"
  );
  assert.equal(getPostUrlFromKey("dom-card:1"), "");
});

test("arbitrary descendant attributes are not used as card identity", () => {
  const store = createPostStore();
  const child = createCard({
    href: "https://www.linkedin.com/feed/update/urn:li:activity:12345/"
  });
  const firstCard = createCard({}, [child]);
  const secondCard = createCard({}, [child]);

  assert.match(store.getPostKey(firstCard), /^dom-card:/);
  assert.match(store.getPostKey(secondCard), /^dom-card:/);
  assert.notEqual(store.getPostKey(firstCard), store.getPostKey(secondCard));
});

test("highlighted update links are not used as feed card identity", () => {
  const store = createPostStore();
  const child = createCard({
    href: "https://www.linkedin.com/feed/?highlightedUpdateUrn=urn%3Ali%3Aactivity%3A7478415637783146496"
  });
  const card = createCard({}, [child]);

  assert.match(store.getPostKey(card), /^dom-card:/);
});

test("feed cards can be tagged with the same id used by the reader card", () => {
  const store = createPostStore();
  const card = createCard({ "data-id": "urn:li:activity:67890" });
  const key = store.getPostKey(card);

  store.tagCard(card, key);

  assert.equal(card.dataset.linkedinChatterscanId, "urn:li:activity:67890");
});
