(function attachAiPromptTopicUtils(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  root.LinkedInChatterScanAiPromptTopicUtils = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, () => {
  const AI_PROMPT_TOPICS_KEY = "linkedinChatterScanAiPromptTopics";

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

  function buildAiPromptTopicPrompt(topic, postText) {
    return [
      `Evaluate this post and determine if it appears to be a post from a LinkedIn member which matches the statement "${normalizeTopic(topic)}".`,
      'Answer with exactly "yes" or "no".',
      "",
      "Post:",
      truncatePostText(postText)
    ].join("\n");
  }

  function isAffirmativeAiResponse(response) {
    return /^yes\b/i.test(String(response || "").trim());
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
    getTopicKey,
    isAffirmativeAiResponse,
    normalizeAiPromptTopics,
    removeAiPromptTopic
  };
});
