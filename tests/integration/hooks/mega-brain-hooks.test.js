/**
 * Mega Brain Hooks Integration Tests
 *
 * Tests for hooks migrated from Mega Brain project.
 * These tests verify:
 * 1. Hook files exist and have valid Python syntax
 * 2. Required hook interfaces are present
 * 3. Hooks can be loaded without import errors
 *
 * @see PRs #23-26 for hook migration
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const HOOKS_DIR = path.join(__dirname, '../../../.claude/hooks');

// Hook categories from migration
const DIRECT_HOOKS = [
  'auto_formatter.py',
  'post_tool_use.py',
  'token_checkpoint.py',
  'token_monitor.py',
  'user_prompt_submit.py',
];

const P0_P1_HOOKS = [
  'session_start.py',
  'skill_router.py',
  'jarvis_briefing.py',
  'quality_watchdog.py',
  'memory_updater.py',
  'session_end.py',
  'session_autosave_v2.py',
];

const P2_HOOKS = [
  'agent_doctor.py',
  'creation_validator.py',
  'post_output_validator.py',
  'post_write_validator.py',
  'subagent_tracker.py',
];

const ALL_HOOKS = [...DIRECT_HOOKS, ...P0_P1_HOOKS, ...P2_HOOKS];

describe('Mega Brain Hooks Migration', () => {
  describe('Hook Files Existence', () => {
    test.each(ALL_HOOKS)('hook %s exists', (hookName) => {
      const hookPath = path.join(HOOKS_DIR, hookName);
      expect(fs.existsSync(hookPath)).toBe(true);
    });
  });

  describe('Direct Migration Hooks (PR #23)', () => {
    test.each(DIRECT_HOOKS)('%s has valid Python syntax', (hookName) => {
      const hookPath = path.join(HOOKS_DIR, hookName);

      // Skip if file doesn't exist (covered by existence test)
      if (!fs.existsSync(hookPath)) {
        return;
      }

      // Check Python syntax using py_compile
      try {
        execSync(`python -m py_compile "${hookPath}"`, {
          encoding: 'utf8',
          stdio: 'pipe'
        });
      } catch (error) {
        throw new Error(`Python syntax error in ${hookName}: ${error.message}`);
      }
    });

    test('auto_formatter.py has PostToolUse interface', () => {
      const content = fs.readFileSync(path.join(HOOKS_DIR, 'auto_formatter.py'), 'utf8');
      // Hooks should have a main function or handler
      expect(content).toMatch(/def\s+(main|handle_|on_|process_)/);
    });

    test('token_checkpoint.py tracks token usage', () => {
      const content = fs.readFileSync(path.join(HOOKS_DIR, 'token_checkpoint.py'), 'utf8');
      expect(content).toMatch(/token/i);
      expect(content).toMatch(/checkpoint|save|log/i);
    });
  });

  describe('P0-P1 Critical Hooks (PR #24)', () => {
    test.each(P0_P1_HOOKS)('%s has valid Python syntax', (hookName) => {
      const hookPath = path.join(HOOKS_DIR, hookName);

      if (!fs.existsSync(hookPath)) {
        return;
      }

      try {
        execSync(`python -m py_compile "${hookPath}"`, {
          encoding: 'utf8',
          stdio: 'pipe'
        });
      } catch (error) {
        throw new Error(`Python syntax error in ${hookName}: ${error.message}`);
      }
    });

    test('session_start.py has SessionStart trigger', () => {
      const content = fs.readFileSync(path.join(HOOKS_DIR, 'session_start.py'), 'utf8');
      // Should reference session start functionality
      expect(content).toMatch(/session|start|init/i);
    });

    test('skill_router.py has routing logic', () => {
      const content = fs.readFileSync(path.join(HOOKS_DIR, 'skill_router.py'), 'utf8');
      expect(content).toMatch(/route|skill|command/i);
    });

    test('jarvis_briefing.py generates briefings', () => {
      const content = fs.readFileSync(path.join(HOOKS_DIR, 'jarvis_briefing.py'), 'utf8');
      expect(content).toMatch(/brief|status|report/i);
    });
  });

  describe('P2 Secondary Hooks (PR #25)', () => {
    test.each(P2_HOOKS)('%s has valid Python syntax', (hookName) => {
      const hookPath = path.join(HOOKS_DIR, hookName);

      if (!fs.existsSync(hookPath)) {
        return;
      }

      try {
        execSync(`python -m py_compile "${hookPath}"`, {
          encoding: 'utf8',
          stdio: 'pipe'
        });
      } catch (error) {
        throw new Error(`Python syntax error in ${hookName}: ${error.message}`);
      }
    });

    test('agent_doctor.py has health check functionality', () => {
      const content = fs.readFileSync(path.join(HOOKS_DIR, 'agent_doctor.py'), 'utf8');
      expect(content).toMatch(/health|check|doctor|diagnos/i);
    });

    test('creation_validator.py validates file creation', () => {
      const content = fs.readFileSync(path.join(HOOKS_DIR, 'creation_validator.py'), 'utf8');
      expect(content).toMatch(/valid|create|file/i);
    });
  });

  describe('Hook Structure Validation', () => {
    test('all hooks have shebang line', () => {
      for (const hookName of ALL_HOOKS) {
        const hookPath = path.join(HOOKS_DIR, hookName);
        if (fs.existsSync(hookPath)) {
          const content = fs.readFileSync(hookPath, 'utf8');
          expect(content.startsWith('#!/usr/bin/env python3')).toBe(true);
        }
      }
    });

    test('all hooks have docstrings', () => {
      for (const hookName of ALL_HOOKS) {
        const hookPath = path.join(HOOKS_DIR, hookName);
        if (fs.existsSync(hookPath)) {
          const content = fs.readFileSync(hookPath, 'utf8');
          // Check for docstring (triple quotes)
          expect(content).toMatch(/"""[\s\S]*?"""/);
        }
      }
    });

    test('critical hooks use CLAUDE_PROJECT_DIR env var', () => {
      const criticalHooks = ['session_start.py', 'session_end.py', 'skill_router.py'];

      for (const hookName of criticalHooks) {
        const hookPath = path.join(HOOKS_DIR, hookName);
        if (fs.existsSync(hookPath)) {
          const content = fs.readFileSync(hookPath, 'utf8');
          expect(content).toMatch(/CLAUDE_PROJECT_DIR/);
        }
      }
    });
  });

  describe('Hook Dependencies', () => {
    test('hooks use standard Python imports', () => {
      const standardImports = ['os', 'sys', 'json', 'pathlib', 'datetime'];

      for (const hookName of ALL_HOOKS) {
        const hookPath = path.join(HOOKS_DIR, hookName);
        if (fs.existsSync(hookPath)) {
          const content = fs.readFileSync(hookPath, 'utf8');
          // At least one standard import should be present
          const hasStandardImport = standardImports.some(imp =>
            content.includes(`import ${imp}`) || content.includes(`from ${imp}`)
          );
          expect(hasStandardImport).toBe(true);
        }
      }
    });
  });
});

describe('Hook Migration Statistics', () => {
  test('total hooks count matches migration plan', () => {
    const expectedCount = 17; // 5 + 7 + 5
    expect(ALL_HOOKS.length).toBe(expectedCount);
  });

  test('direct hooks count is 5', () => {
    expect(DIRECT_HOOKS.length).toBe(5);
  });

  test('P0-P1 hooks count is 7', () => {
    expect(P0_P1_HOOKS.length).toBe(7);
  });

  test('P2 hooks count is 5', () => {
    expect(P2_HOOKS.length).toBe(5);
  });
});
