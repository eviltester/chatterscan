const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildAiPromptTopicPrompt,
  buildAiPromptTopicRubricPrompt,
  createFallbackAiPromptRubric,
  getAiPromptTopicClassificationResponseSchema,
  getAiPromptTopicRubricResponseSchema,
  isAffirmativeAiResponse,
  normalizeAiPromptRubric,
  normalizeAiPromptTopics,
  parseAiPromptTopicRubricResponse,
  parseAiPromptTopicMatchResponse,
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

test("builds a rubric compiler prompt from a simple user instruction", () => {
  const prompt = buildAiPromptTopicRubricPrompt("ignore all posts related to cows");

  assert.match(prompt, /User ignore instruction:/);
  assert.match(prompt, /ignore all posts related to cows/);
  assert.match(prompt, /positiveEvidence/);
  assert.match(prompt, /negativeEvidence/);
});

test("builds a post classifier prompt from a generated rubric", () => {
  const rubric = {
    name: "Job adverts",
    matchDefinition: "Posts primarily advertising a specific open role.",
    positiveEvidence: ["hiring language", "application instructions"],
    negativeEvidence: ["generic career advice"],
    decisionRule: "Return true only with exact evidence."
  };
  const prompt = buildAiPromptTopicPrompt(rubric, "We are hiring a senior tester.");

  assert.match(prompt, /Filtering rubric:/);
  assert.match(prompt, /Posts primarily advertising a specific open role/);
  assert.match(prompt, /If the post is weakly related/);
  assert.match(prompt, /We are hiring a senior tester\./);
});

test("exposes response schemas for rubric and classification prompts", () => {
  assert.equal(getAiPromptTopicRubricResponseSchema().properties.matchDefinition.type, "string");
  assert.equal(getAiPromptTopicClassificationResponseSchema().properties.matches.type, "boolean");
  assert.deepEqual(getAiPromptTopicClassificationResponseSchema().properties.confidence.enum, [
    "low",
    "medium",
    "high"
  ]);
});

test("recognizes affirmative fallback responses only", () => {
  assert.equal(isAffirmativeAiResponse("true"), true);
  assert.equal(isAffirmativeAiResponse("yes"), true);
  assert.equal(isAffirmativeAiResponse("Yes, this matches."), true);
  assert.equal(isAffirmativeAiResponse("false"), false);
  assert.equal(isAffirmativeAiResponse("no"), false);
  assert.equal(isAffirmativeAiResponse("yesterday is not an answer"), false);
});

test("normalizes generated rubrics with fallback guidance", () => {
  assert.deepEqual(
    normalizeAiPromptRubric(
      {
        name: "  Cows  ",
        matchDefinition: "  Posts about cattle  ",
        positiveEvidence: [" cows ", ""],
        negativeEvidence: [" cash cow metaphor "],
        decisionRule: " quote evidence "
      },
      "ignore cows"
    ),
    {
      name: "Cows",
      matchDefinition: "Posts about cattle",
      positiveEvidence: ["cows"],
      negativeEvidence: ["cash cow metaphor"],
      decisionRule: "quote evidence"
    }
  );
});

test("parses rubric JSON and falls back when the model returns invalid JSON", () => {
  assert.equal(
    parseAiPromptTopicRubricResponse(
      JSON.stringify({
        name: "Cow posts",
        matchDefinition: "Posts directly about cows.",
        positiveEvidence: ["mentions cows or cattle"],
        negativeEvidence: ["cash cow metaphor"],
        decisionRule: "true only with direct evidence"
      }),
      "ignore cows"
    ).name,
    "Cow posts"
  );

  assert.deepEqual(
    parseAiPromptTopicRubricResponse("not json", "ignore cows"),
    createFallbackAiPromptRubric("ignore cows")
  );
});

test("parses classification JSON conservatively", () => {
  assert.equal(
    parseAiPromptTopicMatchResponse(
      JSON.stringify({
        matches: true,
        confidence: "high",
        evidence: ["We're hiring a Senior QA Engineer"],
        reason: "Specific open role"
      })
    ),
    true
  );
  assert.equal(
    parseAiPromptTopicMatchResponse(
      JSON.stringify({
        matches: true,
        confidence: "medium",
        evidence: ["dashboard"],
        reason: "Weakly related"
      })
    ),
    false
  );
  assert.equal(
    parseAiPromptTopicMatchResponse(
      JSON.stringify({
        matches: true,
        confidence: "high",
        evidence: [],
        reason: "No quote"
      })
    ),
    false
  );
  assert.equal(parseAiPromptTopicMatchResponse("yes"), false);
});
