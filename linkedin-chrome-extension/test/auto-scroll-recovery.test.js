const assert = require("node:assert/strict");
const test = require("node:test");

const {
  RECOVERY_STAGES,
  createAutoScrollRecoveryController
} = require("../src/auto-scroll-recovery");

test("does not request recovery before the fifth no-new scan", () => {
  const controller = createAutoScrollRecoveryController();
  let decision = null;

  for (let index = 0; index < 4; index += 1) {
    decision = controller.recordScan(0);
    assert.equal(decision.shouldRecover, false);
  }

  assert.equal(decision.consecutiveNoNewScans, 4);
  assert.equal(controller.getState().nextRecoveryStage, RECOVERY_STAGES.GENTLE);
});

test("requests gentle recovery after five no-new scans", () => {
  const controller = createAutoScrollRecoveryController();
  let decision = null;

  for (let index = 0; index < 5; index += 1) {
    decision = controller.recordScan(0);
  }

  assert.deepEqual(decision, {
    shouldRecover: true,
    stage: RECOVERY_STAGES.GENTLE,
    consecutiveNoNewScans: 0
  });
  assert.equal(controller.getState().nextRecoveryStage, RECOVERY_STAGES.LONG);
});

test("added posts reset the no-new count and next recovery stage", () => {
  const controller = createAutoScrollRecoveryController();

  for (let index = 0; index < 5; index += 1) {
    controller.recordScan(0);
  }

  const decision = controller.recordScan(2);

  assert.equal(decision.shouldRecover, false);
  assert.equal(decision.consecutiveNoNewScans, 0);
  assert.equal(controller.getState().nextRecoveryStage, RECOVERY_STAGES.GENTLE);
});

test("requests long recovery on the next stall after gentle recovery", () => {
  const controller = createAutoScrollRecoveryController();

  for (let index = 0; index < 5; index += 1) {
    controller.recordScan(0);
  }

  let decision = null;
  for (let index = 0; index < 5; index += 1) {
    decision = controller.recordScan(0);
  }

  assert.deepEqual(decision, {
    shouldRecover: true,
    stage: RECOVERY_STAGES.LONG,
    consecutiveNoNewScans: 0
  });
  assert.equal(controller.getState().nextRecoveryStage, RECOVERY_STAGES.LONG);
});

test("long recovery stage resets to gentle after new posts are added", () => {
  const controller = createAutoScrollRecoveryController();

  for (let index = 0; index < 10; index += 1) {
    controller.recordScan(0);
  }

  assert.equal(controller.getState().nextRecoveryStage, RECOVERY_STAGES.LONG);

  controller.recordScan(1);

  assert.equal(controller.getState().nextRecoveryStage, RECOVERY_STAGES.GENTLE);
  assert.equal(controller.getState().consecutiveNoNewScans, 0);
});
