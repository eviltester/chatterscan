const assert = require("node:assert/strict");
const test = require("node:test");

const { countFeedPostHeadings, findFeedArticleRoot } = require("../src/feed-boundary");

class Element {
  constructor(tagName, text = "", attributes = {}) {
    this.tagName = tagName.toLowerCase();
    this.text = text;
    this.attributes = attributes;
    this.parentElement = null;
    this.children = [];
  }

  append(...children) {
    for (const child of children) {
      child.parentElement = this;
      this.children.push(child);
    }
  }

  closest(selector) {
    let current = this;
    while (current) {
      if (current.matches(selector)) {
        return current;
      }

      current = current.parentElement;
    }

    return null;
  }

  matches(selector) {
    const trimmed = selector.trim();
    if (trimmed === this.tagName) {
      return true;
    }

    if (trimmed === "[role='listitem'][componentkey*='FeedType_']") {
      return (
        this.getAttribute("role") === "listitem" &&
        this.getAttribute("componentkey").includes("FeedType_")
      );
    }

    if (trimmed === "[role='listitem']") {
      return this.getAttribute("role") === "listitem";
    }

    return false;
  }

  querySelectorAll(selector) {
    const matches = [];
    for (const child of this.children) {
      if (child.matches(selector)) {
        matches.push(child);
      }

      matches.push(...child.querySelectorAll(selector));
    }

    return matches;
  }

  getAttribute(name) {
    return this.attributes[name] || "";
  }
}

function getText(element) {
  return element.text;
}

test("counts feed post headings inside a root", () => {
  const root = new Element("div");
  root.append(new Element("h2", "Feed post"), new Element("h2", "Not a feed post"));

  assert.equal(countFeedPostHeadings(root, getText), 1);
});

test("finds the single feed article root instead of the multi-post container", () => {
  const main = new Element("main");
  const feed = new Element("div");
  const firstArticle = new Element("div");
  const secondArticle = new Element("div");
  const firstHeading = new Element("h2", "Feed post");
  const secondHeading = new Element("h2", "Feed post");
  const firstBody = new Element("div", "First body");

  main.append(feed);
  feed.append(firstArticle, secondArticle);
  firstArticle.append(firstHeading, firstBody);
  secondArticle.append(secondHeading);

  assert.equal(countFeedPostHeadings(feed, getText), 2);
  assert.equal(findFeedArticleRoot(firstBody, getText), firstArticle);
  assert.notEqual(findFeedArticleRoot(firstBody, getText), feed);
});

test("prefers a modern FeedType listitem root even when it is the only rendered post", () => {
  const main = new Element("main");
  const feed = new Element("div");
  const listItem = new Element("div", "", {
    role: "listitem",
    componentkey: "expandedExampleFeedType_MAIN_FEED_RELEVANCE"
  });
  const shell = new Element("div");
  const heading = new Element("h2", "Feed post");
  const body = new Element("div", "Post body");

  main.append(feed);
  feed.append(listItem);
  listItem.append(shell);
  shell.append(heading, body);

  assert.equal(findFeedArticleRoot(body, getText), listItem);
  assert.notEqual(findFeedArticleRoot(body, getText), feed);
});

test("returns null outside the main feed area", () => {
  const wrapper = new Element("div");
  const heading = new Element("h2", "Feed post");
  wrapper.append(heading);

  assert.equal(findFeedArticleRoot(heading, getText), null);
});
