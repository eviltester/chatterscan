(function attachAiPromptTopicUtils(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  root.LinkedInChatterScanAiPromptTopicUtils = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, () => {
  const AI_PROMPT_TOPICS_KEY = "linkedinChatterScanAiPromptTopics";
  const AI_PROMPT_TOPIC_RUBRIC_RESPONSE_SCHEMA = {
    type: "object",
    properties: {
      name: { type: "string" },
      matchDefinition: { type: "string" },
      positiveEvidence: { type: "array", items: { type: "string" } },
      negativeEvidence: { type: "array", items: { type: "string" } },
      decisionRule: { type: "string" }
    },
    required: ["name", "matchDefinition", "positiveEvidence", "negativeEvidence", "decisionRule"],
    additionalProperties: false
  };
  const AI_PROMPT_TOPIC_CLASSIFICATION_RESPONSE_SCHEMA = {
    type: "object",
    properties: {
      matches: { type: "boolean" },
      confidence: { type: "string", enum: ["low", "medium", "high"] },
      evidence: { type: "array", items: { type: "string" } },
      reason: { type: "string" }
    },
    required: ["matches", "confidence", "evidence", "reason"],
    additionalProperties: false
  };

  function normalizeAiPromptTopics(value) {
    if (!Array.isArray(value)) {
      return [];
    }

    const topics = [];
    const seen = new Set();

    for (const item of value) {
      const topic = normalizeTopic(item);
      const key = getTopicKey(topic);
      if (!topic || seen.has(key)) {
        continue;
      }

      seen.add(key);
      topics.push(topic);
    }

    return topics.sort((a, b) => a.localeCompare(b));
  }

  function removeAiPromptTopic(topics, topicToRemove) {
    const keyToRemove = getTopicKey(topicToRemove);
    return normalizeAiPromptTopics(topics).filter((topic) => getTopicKey(topic) !== keyToRemove);
  }

  function getTopicKey(topic) {
    return normalizeTopic(topic).toLowerCase();
  }

  function buildAiPromptTopicRubricPrompt(instruction) {
    return [
      "Convert one user ignore instruction into a strict LinkedIn post filtering rubric.",
      "The user may write a short phrase such as 'ignore job adverts' or 'ignore all posts related to cows'.",
      "Infer a narrow, practical meaning from the instruction without adding unrelated categories.",
      "The rubric must help a later classifier avoid weak associations, metaphors, adjacent topics, and generic professional content.",
      "Evidence guidance must be general enough to fit the instruction, not copied from a fixed example.",
      "",
      "User ignore instruction:",
      JSON.stringify(normalizeTopic(instruction)),
      "",
      "Return JSON only with:",
      "- name: a short label",
      "- matchDefinition: what a matching post is primarily and directly about",
      "- positiveEvidence: types of exact textual evidence that would support a match",
      "- negativeEvidence: nearby, ambiguous, metaphorical, or weakly-related cases that should not match",
      "- decisionRule: when a post should be ignored versus kept"
    ].join("\n");
  }

  function buildAiPromptTopicPrompt(rubric, postText) {
    const normalizedRubric = normalizeAiPromptRubric(rubric);
    return [
      "You are a strict LinkedIn post filter.",
      "Classify one post using only the filtering rubric below.",
      "Match only when the post clearly satisfies the rubric matchDefinition.",
      "Use positiveEvidence as guidance, not as a complete required list.",
      "Use negativeEvidence to avoid overmatching.",
      "If the post is weakly related, adjacent, metaphorical, generic, or ambiguous, set matches to false.",
      "If matches is true, evidence must contain short exact quote(s) copied from the post text that prove the match.",
      "Do not invent evidence. If you cannot quote clear evidence, set matches to false.",
      "",
      "Filtering rubric:",
      JSON.stringify(normalizedRubric),
      "",
      "LinkedIn post:",
      '"""',
      truncatePostText(postText),
      '"""',
      "",
      "Return JSON only."
    ].join("\n");
  }

  function parseAiPromptTopicRubricResponse(response, instruction) {
    try {
      return normalizeAiPromptRubric(JSON.parse(String(response || "").trim()), instruction);
    } catch (_error) {
      return createFallbackAiPromptRubric(instruction);
    }
  }

  function parseAiPromptTopicMatchResponse(response) {
    try {
      const parsed = JSON.parse(String(response || "").trim());
      return (
        parsed?.matches === true &&
        parsed.confidence === "high" &&
        Array.isArray(parsed.evidence) &&
        parsed.evidence.some((item) => normalizeTopic(item))
      );
    } catch (_error) {
      return false;
    }
  }

  function getAiPromptTopicRubricResponseSchema() {
    return AI_PROMPT_TOPIC_RUBRIC_RESPONSE_SCHEMA;
  }

  function getAiPromptTopicClassificationResponseSchema() {
    return AI_PROMPT_TOPIC_CLASSIFICATION_RESPONSE_SCHEMA;
  }

  function isAffirmativeAiResponse(response) {
    return [
      /^true$/i,
      /^yes\b/i
    ].some((pattern) => pattern.test(String(response || "").trim()));
  }

  function normalizeAiPromptRubric(value, instruction = "") {
    const source = value && typeof value === "object" ? value : {};
    const fallback = createFallbackAiPromptRubric(instruction || source.name || "");
    return {
      name: normalizeTopic(source.name) || fallback.name,
      matchDefinition: normalizeTopic(source.matchDefinition) || fallback.matchDefinition,
      positiveEvidence: normalizeStringArray(source.positiveEvidence, fallback.positiveEvidence),
      negativeEvidence: normalizeStringArray(source.negativeEvidence, fallback.negativeEvidence),
      decisionRule: normalizeTopic(source.decisionRule) || fallback.decisionRule
    };
  }

  function createFallbackAiPromptRubric(instruction) {
    const normalizedInstruction = normalizeTopic(instruction) || "ignore instruction";
    return {
      name: normalizedInstruction,
      matchDefinition: `Posts whose primary purpose directly satisfies this user instruction: ${normalizedInstruction}`,
      positiveEvidence: [
        "direct exact wording in the post that clearly supports the instruction",
        "specific details showing the post is primarily about the instruction"
      ],
      negativeEvidence: [
        "weak associations or adjacent topics",
        "metaphors, jokes, or incidental mentions",
        "generic professional or business content without direct evidence"
      ],
      decisionRule: "Return true only when short exact quotes from the post clearly prove the post primarily matches the instruction; otherwise return false."
    };
  }

  function normalizeStringArray(value, fallback) {
    if (!Array.isArray(value)) {
      return fallback;
    }

    const normalized = value.map(normalizeTopic).filter(Boolean);
    return normalized.length > 0 ? normalized : fallback;
  }

  function normalizeTopic(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function truncatePostText(value) {
    const text = String(value || "").trim();
    if (text.length <= 4000) {
      return text;
    }

    return `${text.slice(0, 3997).trim()}...`;
  }

  return {
    AI_PROMPT_TOPICS_KEY,
    buildAiPromptTopicPrompt,
    buildAiPromptTopicRubricPrompt,
    createFallbackAiPromptRubric,
    getAiPromptTopicClassificationResponseSchema,
    getAiPromptTopicRubricResponseSchema,
    getTopicKey,
    isAffirmativeAiResponse,
    normalizeAiPromptRubric,
    normalizeAiPromptTopics,
    parseAiPromptTopicRubricResponse,
    parseAiPromptTopicMatchResponse,
    removeAiPromptTopic
  };
});
