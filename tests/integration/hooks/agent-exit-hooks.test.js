/**
 * Agent Exit Hooks Integration Tests
 *
 * Tests for workflow context persistence on command completion.
 *
 * @module tests/integration/hooks/agent-exit-hooks.test.js
 * @story 6.1 - Hook Integration Tests
 */

const path = require('path');
const fs = require('fs').promises;
const {
  onCommandComplete,
  registerHook,
  detectWorkflowState,
} = require('../../../.aios-core/development/scripts/agent-exit-hooks');

// Mock ContextDetector
jest.mock('../../../.aios-core/core/session/context-detector', () => {
  return jest.fn().mockImplementation(() => ({
    updateSessionState: jest.fn(),
  }));
});

const ContextDetector = require('../../../.aios-core/core/session/context-detector');

describe('Agent Exit Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('onCommandComplete()', () => {
    it('should save state for successful commands', () => {
      const agent = 'dev';
      const command = 'develop';
      const result = { success: true };
      const context = {
        story_path: 'docs/stories/1.1.my-story.md',
        branch: 'feature/story-1.1',
        epic: 'Epic 1',
      };

      onCommandComplete(agent, command, result, context);

      expect(ContextDetector).toHaveBeenCalled();
      const mockInstance = ContextDetector.mock.results[0].value;
      expect(mockInstance.updateSessionState).toHaveBeenCalled();
    });

    it('should not save state for failed commands', () => {
      const agent = 'dev';
      const command = 'develop';
      const result = { success: false, error: 'Build failed' };
      const context = { story_path: 'docs/stories/1.1.my-story.md' };

      onCommandComplete(agent, command, result, context);

      // ContextDetector should not be called for failed commands
      expect(ContextDetector.mock.results.length).toBe(0);
    });

    it('should not save state when result is null', () => {
      const agent = 'qa';
      const command = 'review';
      const result = null;
      const context = {};

      onCommandComplete(agent, command, result, context);

      expect(ContextDetector.mock.results.length).toBe(0);
    });

    it('should handle missing context gracefully', () => {
      const agent = 'po';
      const command = 'validate-story-draft';
      const result = { success: true };
      const context = {}; // Empty context

      // Should not throw
      expect(() => {
        onCommandComplete(agent, command, result, context);
      }).not.toThrow();

      const mockInstance = ContextDetector.mock.results[0].value;
      expect(mockInstance.updateSessionState).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            story_path: '',
            branch: '',
            epic: '',
          }),
        }),
        expect.any(String),
      );
    });

    it('should include workflow state when command maps to workflow', () => {
      const agent = 'po';
      const command = 'validate-story-draft';
      const result = { success: true };
      const context = { story_path: 'docs/stories/test.md' };

      onCommandComplete(agent, command, result, context);

      const mockInstance = ContextDetector.mock.results[0].value;
      expect(mockInstance.updateSessionState).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowActive: 'story_development',
        }),
        expect.any(String),
      );
    });

    it('should track agent and command in state', () => {
      const agent = 'pm';
      const command = 'create-epic';
      const result = { success: true };
      const context = { epic: 'Epic 2' };

      onCommandComplete(agent, command, result, context);

      const mockInstance = ContextDetector.mock.results[0].value;
      expect(mockInstance.updateSessionState).toHaveBeenCalledWith(
        expect.objectContaining({
          lastCommands: ['create-epic'],
          agentSequence: ['pm'],
          context: expect.objectContaining({
            lastCommand: 'create-epic',
            lastAgent: 'pm',
          }),
        }),
        expect.any(String),
      );
    });
  });

  describe('detectWorkflowState()', () => {
    it('should return story_development workflow for validate-story-draft', () => {
      const result = detectWorkflowState('validate-story-draft', { success: true });

      expect(result).toEqual({
        workflow: 'story_development',
        state: 'validated',
      });
    });

    it('should return story_development workflow for develop command', () => {
      const result = detectWorkflowState('develop', { success: true });

      expect(result).toEqual({
        workflow: 'story_development',
        state: 'in_development',
      });
    });

    it('should return story_development workflow for review-qa', () => {
      const result = detectWorkflowState('review-qa', { success: true });

      expect(result).toEqual({
        workflow: 'story_development',
        state: 'qa_reviewed',
      });
    });

    it('should return epic_creation workflow for create-epic', () => {
      const result = detectWorkflowState('create-epic', { success: true });

      expect(result).toEqual({
        workflow: 'epic_creation',
        state: 'epic_created',
      });
    });

    it('should return null for unknown commands', () => {
      const result = detectWorkflowState('unknown-command', { success: true });

      expect(result).toBeNull();
    });

    it('should return null for empty command', () => {
      const result = detectWorkflowState('', { success: true });

      expect(result).toBeNull();
    });
  });

  describe('registerHook()', () => {
    it('should register hook with framework that supports hooks', () => {
      const mockFramework = {
        registerCommandHook: jest.fn(),
      };

      const result = registerHook(mockFramework);

      expect(result).toBe(true);
      expect(mockFramework.registerCommandHook).toHaveBeenCalledWith(
        'onComplete',
        onCommandComplete,
      );
    });

    it('should return false when framework is null', () => {
      const result = registerHook(null);

      expect(result).toBe(false);
    });

    it('should return false when framework does not support hooks', () => {
      const mockFramework = {}; // No registerCommandHook method

      const result = registerHook(mockFramework);

      expect(result).toBe(false);
    });

    it('should log warning when framework does not support hooks', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const mockFramework = {};

      registerHook(mockFramework);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[AgentExitHooks] Framework does not support hooks',
      );
      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should handle ContextDetector errors gracefully', () => {
      // Make ContextDetector throw an error
      ContextDetector.mockImplementationOnce(() => {
        throw new Error('ContextDetector initialization failed');
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Should not throw
      expect(() => {
        onCommandComplete('dev', 'develop', { success: true }, {});
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        '[AgentExitHooks] Hook failed:',
        expect.any(String),
      );

      consoleSpy.mockRestore();
    });

    it('should handle updateSessionState errors gracefully', () => {
      ContextDetector.mockImplementationOnce(() => ({
        updateSessionState: jest.fn(() => {
          throw new Error('Failed to update session');
        }),
      }));

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      expect(() => {
        onCommandComplete('qa', 'review-qa', { success: true }, {});
      }).not.toThrow();

      consoleSpy.mockRestore();
    });
  });
});
