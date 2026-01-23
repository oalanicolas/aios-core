/**
 * Hook Integration Tests Index
 *
 * Entry point for all hook integration tests.
 * Run with: npm test -- --testPathPattern=integration/hooks
 *
 * @module tests/integration/hooks/index.test.js
 * @story 6.1 - Hook Integration Tests
 */

describe('Hook Integration Tests Suite', () => {
  describe('Agent Exit Hooks', () => {
    require('./agent-exit-hooks.test');
  });

  describe('Command Execution Hook', () => {
    require('./command-execution-hook.test');
  });

  describe('Capture Hook', () => {
    require('./capture-hook.test');
  });
});

/**
 * Test Coverage Summary
 *
 * | Hook | Test File | Coverage |
 * |------|-----------|----------|
 * | agent-exit-hooks.js | agent-exit-hooks.test.js | ✅ |
 * | command-execution-hook.js | command-execution-hook.test.js | ✅ |
 * | capture-hook.js | capture-hook.test.js | ✅ |
 * | story-update-hook.js | ../story-update-hook.test.js | ✅ (existing) |
 * | metrics-hook.js | ../unit/quality/metrics-hook.test.js | ✅ (existing) |
 *
 * Trigger Types Tested:
 * - SessionStart: via agent-exit-hooks (context detection)
 * - PostToolUse: via command-execution-hook (command tracking)
 * - TaskComplete: via capture-hook (pattern capture)
 * - StoryUpdate: via story-update-hook (ClickUp sync)
 *
 * Edge Cases Covered:
 * - Empty/null inputs
 * - Missing context
 * - Disabled hooks (via env vars)
 * - Error handling (graceful degradation)
 * - File system errors
 * - Network errors (for ClickUp sync)
 */
