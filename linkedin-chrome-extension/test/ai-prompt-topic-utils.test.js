const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildAiPromptTopicPrompt,
  isAffirmativeAiResponse,
  normalizeAiPromptTopics,
  removeAiPromptTopic
} = require("../src/ai-prompt-topic-utils");

test("normalizes AI prompt topics by trimming and deduping case-insensitively", () => {
  assert.deepEqual(
    normalizeAiPromptTopics(["  looks like a job post  ", "Looks   like a job post", "", "Hiring pitch"]),
    ["Hiring pitch", "looks like a job post"]
  );
});

test("removes an AI prompt topic case-insensitively", () => {
  assert.deepEqual(removeAiPromptTopic(["Hiring pitch", "looks like a job post"], "LOOKS LIKE A JOB POST"), [
    "Hiring pitch"
  ]);
});

test("builds a yes/no Prompt API question with topic and post text", () => {
  const prompt = buildAiPromptTopicPrompt("looks like a job post", "We are hiring a senior tester.");

  assert.match(prompt, /matches the statement "looks like a job post"/);
  assert.match(prompt, /Answer with exactly "yes" or "no"\./);
  assert.match(prompt, /We are hiring a senior tester\./);
});

test("recognizes yes responses only", () => {
  assert.equal(isAffirmativeAiResponse("yes"), true);
  assert.equal(isAffirmativeAiResponse("Yes, this matches."), true);
  assert.equal(isAffirmativeAiResponse("no"), false);
  assert.equal(isAffirmativeAiResponse("yesterday is not an answer"), false);
});
