/**
 * Command Execution Hook Integration Tests
 *
 * Tests for session state management and command tracking.
 *
 * @module tests/integration/hooks/command-execution-hook.test.js
 * @story 6.1 - Hook Integration Tests
 */

const path = require('path');
const fs = require('fs').promises;
const {
  updateSessionAfterCommand,
  getCurrentSession,
  clearSession,
} = require('../../../.aios-core/scripts/command-execution-hook');

// Test directory setup
const SESSION_DIR = path.join(process.cwd(), '.aios-core', '.session');
const SESSION_FILE = path.join(SESSION_DIR, 'current-session.json');

describe('Command Execution Hook', () => {
  beforeEach(async () => {
    // Clear session before each test
    await clearSession();
  });

  afterAll(async () => {
    // Cleanup after all tests
    await clearSession();
  });

  describe('updateSessionAfterCommand()', () => {
    it('should create new session on first command', async () => {
      const result = await updateSessionAfterCommand('dev', 'develop');

      expect(result).toHaveProperty('sessionType');
      expect(result).toHaveProperty('currentAgent', 'dev');
      expect(result).toHaveProperty('commandHistory');
      expect(result.commandHistory).toHaveLength(1);
      expect(result.commandHistory[0]).toMatchObject({
        command: 'develop',
        agent: 'dev',
        success: true,
      });
    });

    it('should update session type to existing after first command', async () => {
      await updateSessionAfterCommand('dev', 'develop');
      const result = await updateSessionAfterCommand('dev', 'test');

      expect(result.sessionType).toBe('existing');
      expect(result.commandHistory).toHaveLength(2);
    });

    it('should update session type to workflow after 3+ commands', async () => {
      await updateSessionAfterCommand('dev', 'develop');
      await updateSessionAfterCommand('dev', 'test');
      const result = await updateSessionAfterCommand('dev', 'build');

      expect(result.sessionType).toBe('workflow');
      expect(result.commandHistory).toHaveLength(3);
    });

    it('should track agent transitions', async () => {
      await updateSessionAfterCommand('po', 'validate-story-draft');
      const result = await updateSessionAfterCommand('dev', 'develop', {
        previousAgent: 'po',
      });

      expect(result.previousAgent).toBe('po');
      expect(result.agentTransitions).toHaveLength(1);
      expect(result.agentTransitions[0]).toMatchObject({
        from: 'po',
        to: 'dev',
      });
    });

    it('should not track transition when agent is the same', async () => {
      await updateSessionAfterCommand('dev', 'develop');
      const result = await updateSessionAfterCommand('dev', 'test', {
        previousAgent: 'dev',
      });

      expect(result.agentTransitions).toBeUndefined();
    });

    it('should update current agent', async () => {
      await updateSessionAfterCommand('po', 'validate');
      const result = await updateSessionAfterCommand('dev', 'develop');

      expect(result.currentAgent).toBe('dev');
    });

    it('should include timestamp in command entry', async () => {
      const before = Date.now();
      const result = await updateSessionAfterCommand('qa', 'review');
      const after = Date.now();

      expect(result.commandHistory[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(result.commandHistory[0].timestamp).toBeLessThanOrEqual(after);
    });

    it('should record command success/failure based on result', async () => {
      const successResult = await updateSessionAfterCommand('dev', 'build', {
        result: { output: 'Build successful' },
      });
      expect(successResult.commandHistory[0].success).toBe(true);

      const failResult = await updateSessionAfterCommand('dev', 'test', {
        result: { error: 'Test failed' },
      });
      expect(failResult.commandHistory[1].success).toBe(false);
    });

    it('should limit command history to MAX_HISTORY_LENGTH', async () => {
      // Execute 15 commands
      for (let i = 0; i < 15; i++) {
        await updateSessionAfterCommand('dev', `command-${i}`);
      }

      const session = await getCurrentSession();

      // Should only keep last 10 commands
      expect(session.commandHistory.length).toBeLessThanOrEqual(10);
      expect(session.commandHistory[session.commandHistory.length - 1].command).toBe(
        'command-14',
      );
    });

    it('should update lastUpdated timestamp', async () => {
      const before = Date.now();
      const result = await updateSessionAfterCommand('sm', 'create-story');
      const after = Date.now();

      expect(result.lastUpdated).toBeGreaterThanOrEqual(before);
      expect(result.lastUpdated).toBeLessThanOrEqual(after);
    });
  });

  describe('getCurrentSession()', () => {
    it('should return new session when no session exists', async () => {
      await clearSession();
      const session = await getCurrentSession();

      expect(session.sessionType).toBe('new');
      expect(session.commandHistory).toEqual([]);
    });

    it('should return existing session data', async () => {
      await updateSessionAfterCommand('dev', 'develop');
      await updateSessionAfterCommand('qa', 'review');

      const session = await getCurrentSession();

      expect(session.currentAgent).toBe('qa');
      expect(session.commandHistory).toHaveLength(2);
    });

    it('should handle corrupted session file gracefully', async () => {
      // Write corrupted JSON
      await fs.mkdir(SESSION_DIR, { recursive: true });
      await fs.writeFile(SESSION_FILE, 'not valid json', 'utf8');

      // Should not throw
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const session = await getCurrentSession();
      consoleSpy.mockRestore();

      expect(session).toHaveProperty('sessionType', 'new');
    });
  });

  describe('clearSession()', () => {
    it('should remove session file', async () => {
      await updateSessionAfterCommand('dev', 'test');

      // Verify session exists
      let session = await getCurrentSession();
      expect(session.commandHistory.length).toBeGreaterThan(0);

      // Clear session
      await clearSession();

      // Verify session is cleared
      session = await getCurrentSession();
      expect(session.sessionType).toBe('new');
      expect(session.commandHistory).toEqual([]);
    });

    it('should not throw when session file does not exist', async () => {
      await clearSession(); // First clear
      await expect(clearSession()).resolves.not.toThrow(); // Second clear
    });
  });

  describe('Session Type Determination', () => {
    it('should return "new" for empty history', async () => {
      const session = await getCurrentSession();
      expect(session.sessionType).toBe('new');
    });

    it('should return "existing" for 1-2 commands', async () => {
      await updateSessionAfterCommand('dev', 'cmd1');
      let session = await getCurrentSession();
      expect(session.sessionType).toBe('existing');

      await updateSessionAfterCommand('dev', 'cmd2');
      session = await getCurrentSession();
      expect(session.sessionType).toBe('existing');
    });

    it('should return "workflow" for 3+ commands', async () => {
      await updateSessionAfterCommand('dev', 'cmd1');
      await updateSessionAfterCommand('dev', 'cmd2');
      await updateSessionAfterCommand('dev', 'cmd3');

      const session = await getCurrentSession();
      expect(session.sessionType).toBe('workflow');
    });
  });

  describe('Error Handling', () => {
    it('should return default session on file system errors', async () => {
      // Mock fs to throw error
      const originalReadFile = fs.readFile;
      jest.spyOn(fs, 'readFile').mockRejectedValueOnce(new Error('Permission denied'));

      const session = await getCurrentSession();

      expect(session.sessionType).toBe('new');
      expect(session.commandHistory).toEqual([]);

      // Restore
      fs.readFile = originalReadFile;
    });

    it('should return non-blocking result on save errors', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Mock mkdir to fail
      const originalMkdir = fs.mkdir;
      jest.spyOn(fs, 'mkdir').mockRejectedValueOnce(new Error('Cannot create dir'));

      const result = await updateSessionAfterCommand('dev', 'test');

      // Should return a valid session object despite error
      expect(result).toHaveProperty('sessionType');
      expect(result).toHaveProperty('currentAgent', 'dev');

      consoleSpy.mockRestore();
      fs.mkdir = originalMkdir;
    });
  });

  describe('Integration Scenarios', () => {
    it('should track complete PO → Dev → QA workflow', async () => {
      // PO validates story
      await updateSessionAfterCommand('po', 'validate-story-draft');

      // Dev implements
      await updateSessionAfterCommand('dev', 'develop', { previousAgent: 'po' });
      await updateSessionAfterCommand('dev', 'test');

      // QA reviews
      const result = await updateSessionAfterCommand('qa', 'review', {
        previousAgent: 'dev',
      });

      expect(result.sessionType).toBe('workflow');
      expect(result.commandHistory).toHaveLength(4);
      expect(result.agentTransitions).toHaveLength(2);
      expect(result.agentTransitions[0]).toMatchObject({ from: 'po', to: 'dev' });
      expect(result.agentTransitions[1]).toMatchObject({ from: 'dev', to: 'qa' });
    });
  });
});
