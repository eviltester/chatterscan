(function attachPostFilter(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  root.LinkedInChatterScanPostFilter = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, () => {
  function getPostFilterDecision(post, settings) {
    const forbiddenPhraseMatches = Array.isArray(post?.forbiddenPhraseMatches)
      ? post.forbiddenPhraseMatches
      : [];
    if (forbiddenPhraseMatches.length > 0) {
      return { include: false, excludedStat: "excludedForbiddenPhrases" };
    }

    const includedPhraseMatches = Array.isArray(post?.includedPhraseMatches)
      ? post.includedPhraseMatches
      : [];
    const hasIncludedPhrase = includedPhraseMatches.length > 0;
    const hasBodyLinks = post?.linkSourceCounts?.body > 0;
    const hasCommentLinks = post?.linkSourceCounts?.comment > 0;
    const hasPulseLinks = post?.linkSourceCounts?.pulse > 0;
    const hasEmbeddedVideo = Boolean(post?.hasEmbeddedVideo);
    const hasIncludedLinks = Array.isArray(post?.links) && post.links.length > 0;
    const hasIncludedVideo = hasEmbeddedVideo && Boolean(settings?.includePostsWithEmbeddedVideos);
    const hasIncludedContent = hasIncludedLinks || hasIncludedVideo || hasIncludedPhrase;

    if (hasIncludedPhrase) {
      return { include: true, includedByPhrase: true };
    }

    if (!settings?.includeAds && post?.isAd) {
      return { include: false, excludedStat: "excludedAds" };
    }

    if (!hasIncludedContent && hasBodyLinks && !settings?.includePostsWithLinks) {
      return { include: false, excludedStat: "excludedWithLinks" };
    }

    if (!hasIncludedContent && hasCommentLinks && !settings?.includePostsWithCommentLinks) {
      return { include: false, excludedStat: "excludedWithCommentLinks" };
    }

    if (!hasIncludedContent && hasPulseLinks && !settings?.includePostsWithPulseArticles) {
      return { include: false, excludedStat: "excludedWithPulseArticles" };
    }

    if (!hasIncludedContent && hasEmbeddedVideo && !settings?.includePostsWithEmbeddedVideos) {
      return { include: false, excludedStat: "excludedWithEmbeddedVideos" };
    }

    if (!hasIncludedContent && !settings?.includePostsWithoutLinks) {
      return { include: false, excludedStat: "excludedNoLinks" };
    }

    return { include: true, includedByPhrase: false };
  }

  return {
    getPostFilterDecision
  };
});
