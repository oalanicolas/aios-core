/**
 * Capture Hook Integration Tests
 *
 * Tests for pattern capture on task completion.
 *
 * @module tests/integration/hooks/capture-hook.test.js
 * @story 6.1 - Hook Integration Tests
 */

const {
  onTaskComplete,
  markSessionFailed,
  clearSession,
  isEnabled,
  reset,
} = require('../../../.aios-core/workflow-intelligence/learning/capture-hook');

// Mock the pattern-capture dependencies
jest.mock('../../../.aios-core/workflow-intelligence/learning/pattern-capture', () => ({
  createPatternCapture: jest.fn(() => ({
    onTaskComplete: jest.fn(async (taskName, context) => {
      // Simulate capture logic
      if (taskName === 'develop' && context.agentId) {
        return {
          captured: true,
          pattern: {
            id: `pattern-${Date.now()}`,
            taskName,
            agentId: context.agentId,
            timestamp: Date.now(),
          },
        };
      }
      return { captured: false, reason: 'no_pattern_detected' };
    }),
    markSessionFailed: jest.fn(),
    clearSession: jest.fn(),
  })),
}));

jest.mock('../../../.aios-core/workflow-intelligence/learning/pattern-validator', () => ({
  createPatternValidator: jest.fn(() => ({
    validate: jest.fn((pattern) => {
      // Simulate validation
      if (pattern && pattern.id && pattern.taskName) {
        return { valid: true, errors: [] };
      }
      return { valid: false, errors: ['Missing required fields'] };
    }),
  })),
}));

jest.mock('../../../.aios-core/workflow-intelligence/learning/pattern-store', () => ({
  createPatternStore: jest.fn(() => ({
    save: jest.fn((pattern) => {
      return { success: true, id: pattern.id };
    }),
  })),
}));

describe('Capture Hook', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    reset(); // Reset singleton instances
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('isEnabled()', () => {
    it('should return true by default', () => {
      delete process.env.AIOS_PATTERN_CAPTURE;
      expect(isEnabled()).toBe(true);
    });

    it('should return false when AIOS_PATTERN_CAPTURE is false', () => {
      process.env.AIOS_PATTERN_CAPTURE = 'false';
      expect(isEnabled()).toBe(false);
    });

    it('should return true for any other value', () => {
      process.env.AIOS_PATTERN_CAPTURE = 'true';
      expect(isEnabled()).toBe(true);

      process.env.AIOS_PATTERN_CAPTURE = 'enabled';
      expect(isEnabled()).toBe(true);
    });
  });

  describe('onTaskComplete()', () => {
    it('should return disabled result when pattern capture is disabled', async () => {
      process.env.AIOS_PATTERN_CAPTURE = 'false';

      const result = await onTaskComplete('develop', { agentId: '@dev' });

      expect(result).toEqual({
        success: false,
        reason: 'disabled',
      });
    });

    it('should capture and store valid patterns', async () => {
      delete process.env.AIOS_PATTERN_CAPTURE;

      const result = await onTaskComplete('develop', {
        sessionId: 'abc123',
        agentId: '@dev',
      });

      expect(result.success).toBe(true);
      expect(result.action).toBe('stored');
      expect(result.patternId).toBeDefined();
    });

    it('should return not_captured when no pattern is detected', async () => {
      delete process.env.AIOS_PATTERN_CAPTURE;

      const result = await onTaskComplete('unknown-task', {});

      expect(result.success).toBe(false);
      expect(result.reason).toBe('no_pattern_detected');
    });

    it('should handle empty context', async () => {
      delete process.env.AIOS_PATTERN_CAPTURE;

      const result = await onTaskComplete('develop');

      // Should not throw, should return not_captured or validation_failed
      expect(result).toHaveProperty('success');
    });

    it('should validate patterns before storing', async () => {
      // The mock validator requires id and taskName
      delete process.env.AIOS_PATTERN_CAPTURE;

      const result = await onTaskComplete('develop', { agentId: '@dev' });

      expect(result.success).toBe(true);
    });
  });

  describe('markSessionFailed()', () => {
    it('should not throw when called', () => {
      delete process.env.AIOS_PATTERN_CAPTURE;

      expect(() => {
        markSessionFailed('session-123');
      }).not.toThrow();
    });

    it('should do nothing when disabled', () => {
      process.env.AIOS_PATTERN_CAPTURE = 'false';

      // Should not throw
      expect(() => {
        markSessionFailed('session-123');
      }).not.toThrow();
    });
  });

  describe('clearSession()', () => {
    it('should not throw when called', () => {
      delete process.env.AIOS_PATTERN_CAPTURE;

      expect(() => {
        clearSession('session-123');
      }).not.toThrow();
    });

    it('should handle no session ID', () => {
      delete process.env.AIOS_PATTERN_CAPTURE;

      expect(() => {
        clearSession();
      }).not.toThrow();
    });

    it('should do nothing when disabled', () => {
      process.env.AIOS_PATTERN_CAPTURE = 'false';

      expect(() => {
        clearSession('session-123');
      }).not.toThrow();
    });
  });

  describe('reset()', () => {
    it('should reset singleton instances', async () => {
      delete process.env.AIOS_PATTERN_CAPTURE;

      // First call creates instances
      await onTaskComplete('develop', { agentId: '@dev' });

      // Reset
      reset();

      // Should work again without issues
      const result = await onTaskComplete('develop', { agentId: '@dev' });
      expect(result).toHaveProperty('success');
    });
  });

  describe('Error Handling', () => {
    it('should handle capture errors gracefully', async () => {
      delete process.env.AIOS_PATTERN_CAPTURE;

      // Force an error by mocking
      const { createPatternCapture } = require('../../../.aios-core/workflow-intelligence/learning/pattern-capture');
      createPatternCapture.mockImplementationOnce(() => ({
        onTaskComplete: jest.fn(async () => {
          throw new Error('Capture failed');
        }),
      }));

      reset(); // Reset to pick up new mock

      const result = await onTaskComplete('develop', { agentId: '@dev' });

      expect(result.success).toBe(false);
      expect(result.reason).toBe('error');
      expect(result.error).toBe('Capture failed');
    });

    it('should log errors in debug mode', async () => {
      process.env.AIOS_DEBUG = 'true';
      delete process.env.AIOS_PATTERN_CAPTURE;

      const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();

      const { createPatternCapture } = require('../../../.aios-core/workflow-intelligence/learning/pattern-capture');
      createPatternCapture.mockImplementationOnce(() => ({
        onTaskComplete: jest.fn(async () => {
          throw new Error('Debug test error');
        }),
      }));

      reset();

      await onTaskComplete('develop', { agentId: '@dev' });

      expect(consoleSpy).toHaveBeenCalledWith(
        '[PatternCapture] Hook failed:',
        'Debug test error',
      );

      consoleSpy.mockRestore();
    });

    it('should not log errors when not in debug mode', async () => {
      delete process.env.AIOS_DEBUG;
      delete process.env.AIOS_PATTERN_CAPTURE;

      const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();

      const { createPatternCapture } = require('../../../.aios-core/workflow-intelligence/learning/pattern-capture');
      createPatternCapture.mockImplementationOnce(() => ({
        onTaskComplete: jest.fn(async () => {
          throw new Error('Silent error');
        }),
      }));

      reset();

      await onTaskComplete('develop', { agentId: '@dev' });

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete task lifecycle', async () => {
      delete process.env.AIOS_PATTERN_CAPTURE;
      reset();

      // Start session
      clearSession('session-001');

      // Complete task successfully
      const result = await onTaskComplete('develop', {
        sessionId: 'session-001',
        agentId: '@dev',
      });

      expect(result.success).toBe(true);

      // Clear session at end
      clearSession('session-001');
    });

    it('should handle failed session', async () => {
      delete process.env.AIOS_PATTERN_CAPTURE;
      reset();

      // Mark as failed
      markSessionFailed('session-002');

      // Should still be able to complete tasks
      const result = await onTaskComplete('develop', {
        sessionId: 'session-002',
        agentId: '@dev',
      });

      expect(result).toHaveProperty('success');
    });
  });
});
