(function attachAutoScrollRecovery(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  root.LinkedInChatterScanAutoScrollRecovery = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, () => {
  const DEFAULT_STALL_THRESHOLD = 5;
  const RECOVERY_STAGES = {
    GENTLE: "gentle",
    LONG: "long"
  };

  function createAutoScrollRecoveryController(options = {}) {
    const stallThreshold = normalizeStallThreshold(options.stallThreshold);
    let consecutiveNoNewScans = 0;
    let nextRecoveryStage = RECOVERY_STAGES.GENTLE;

    function recordScan(addedCount) {
      if (Number(addedCount) > 0) {
        reset();
        return {
          shouldRecover: false,
          stage: null,
          consecutiveNoNewScans
        };
      }

      consecutiveNoNewScans += 1;

      if (consecutiveNoNewScans < stallThreshold) {
        return {
          shouldRecover: false,
          stage: null,
          consecutiveNoNewScans
        };
      }

      const stage = nextRecoveryStage;
      consecutiveNoNewScans = 0;
      if (stage === RECOVERY_STAGES.GENTLE) {
        nextRecoveryStage = RECOVERY_STAGES.LONG;
      }

      return {
        shouldRecover: true,
        stage,
        consecutiveNoNewScans
      };
    }

    function reset() {
      consecutiveNoNewScans = 0;
      nextRecoveryStage = RECOVERY_STAGES.GENTLE;
    }

    function getState() {
      return {
        consecutiveNoNewScans,
        nextRecoveryStage,
        stallThreshold
      };
    }

    return {
      getState,
      recordScan,
      reset
    };
  }

  function normalizeStallThreshold(value) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_STALL_THRESHOLD;
  }

  return {
    DEFAULT_STALL_THRESHOLD,
    RECOVERY_STAGES,
    createAutoScrollRecoveryController
  };
});
