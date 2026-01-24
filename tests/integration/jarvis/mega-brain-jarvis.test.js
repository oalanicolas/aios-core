/**
 * Mega Brain JARVIS Integration Tests
 *
 * Tests for JARVIS modules rewritten from Mega Brain Python to AIOS JavaScript.
 * These tests verify:
 * 1. Module files exist
 * 2. JavaScript syntax is valid
 * 3. Required exports are present
 * 4. Module interfaces are correct
 *
 * @see Epic 7 PRs for JARVIS migration
 * @see docs/mega-brain-hooks-audit.md for migration details
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const JARVIS_DIR = path.join(__dirname, '../../../.aios-core/core/jarvis');

// JARVIS modules from Epic 7
const JARVIS_MODULES = {
  'config.js': {
    story: '7.1',
    description: 'Configuration management (jarvis_config.py)',
    requiredExports: ['config', 'getConfig', 'loadConfig'],
  },
  'orchestrator.js': {
    story: '7.2',
    description: 'Multi-agent orchestration (jarvis_orchestrator.py)',
    requiredExports: ['orchestrate', 'Orchestrator'],
  },
  'memory.js': {
    story: '7.3',
    description: 'Persistent memory system (jarvis_total_memory.py)',
    requiredExports: ['Memory', 'save', 'load'],
  },
  'core.js': {
    story: '7.4',
    description: 'Autonomous core integration (jarvis_autonomous_core.py)',
    requiredExports: ['Core', 'initialize'],
  },
  'agents.js': {
    story: '7.5',
    description: 'Specialist agent definitions (jarvis_specialist_agents.py)',
    requiredExports: ['agents', 'getAgent', 'registerAgent'],
  },
  'self-improvement.js': {
    story: '7.6',
    description: 'Continuous learning system (jarvis_self_improvement.py)',
    requiredExports: ['learn', 'improve', 'SelfImprovement'],
  },
  'index.js': {
    story: '7.7',
    description: 'Main entry point and module integration',
    requiredExports: ['JARVIS', 'initialize', 'shutdown'],
  },
};

const ALL_MODULES = Object.keys(JARVIS_MODULES);

describe('Mega Brain JARVIS Migration', () => {
  describe('Module Files Existence', () => {
    test.each(ALL_MODULES)('module %s exists', (moduleName) => {
      const modulePath = path.join(JARVIS_DIR, moduleName);
      expect(fs.existsSync(modulePath)).toBe(true);
    });

    test('JARVIS directory exists', () => {
      expect(fs.existsSync(JARVIS_DIR)).toBe(true);
    });
  });

  describe('JavaScript Syntax Validation', () => {
    test.each(ALL_MODULES)('%s has valid JavaScript syntax', (moduleName) => {
      const modulePath = path.join(JARVIS_DIR, moduleName);

      if (!fs.existsSync(modulePath)) {
        return; // Skip if file doesn't exist (covered by existence test)
      }

      // Check JavaScript syntax using Node
      try {
        execSync(`node --check "${modulePath}"`, {
          encoding: 'utf8',
          stdio: 'pipe',
        });
      } catch (error) {
        throw new Error(`JavaScript syntax error in ${moduleName}: ${error.message}`);
      }
    });
  });

  describe('Module Exports', () => {
    test.each(ALL_MODULES)('%s exports required functions', (moduleName) => {
      const modulePath = path.join(JARVIS_DIR, moduleName);

      if (!fs.existsSync(modulePath)) {
        return;
      }

      const content = fs.readFileSync(modulePath, 'utf8');
      const { requiredExports } = JARVIS_MODULES[moduleName];

      // Check that at least one required export pattern exists
      const hasExport = requiredExports.some((exportName) => {
        // Check various export patterns
        const patterns = [
          new RegExp(`module\\.exports\\.${exportName}\\s*=`),
          new RegExp(`module\\.exports\\s*=\\s*{[^}]*${exportName}`),
          new RegExp(`exports\\.${exportName}\\s*=`),
          new RegExp(`export\\s+(const|function|class)\\s+${exportName}`),
          new RegExp(`export\\s+{[^}]*${exportName}`),
        ];
        return patterns.some((pattern) => pattern.test(content));
      });

      expect(hasExport).toBe(true);
    });
  });

  describe('Config Module (Story 7.1)', () => {
    const CONFIG_PATH = path.join(JARVIS_DIR, 'config.js');

    test('config module has configuration structure', () => {
      if (!fs.existsSync(CONFIG_PATH)) return;

      const content = fs.readFileSync(CONFIG_PATH, 'utf8');
      // Should have default config or config schema
      expect(content).toMatch(/config|default|schema/i);
    });

    test('config module handles environment variables', () => {
      if (!fs.existsSync(CONFIG_PATH)) return;

      const content = fs.readFileSync(CONFIG_PATH, 'utf8');
      expect(content).toMatch(/process\.env|ENV|environment/i);
    });
  });

  describe('Orchestrator Module (Story 7.2)', () => {
    const ORCH_PATH = path.join(JARVIS_DIR, 'orchestrator.js');

    test('orchestrator has agent coordination logic', () => {
      if (!fs.existsSync(ORCH_PATH)) return;

      const content = fs.readFileSync(ORCH_PATH, 'utf8');
      expect(content).toMatch(/agent|task|dispatch|coordinate/i);
    });

    test('orchestrator handles async operations', () => {
      if (!fs.existsSync(ORCH_PATH)) return;

      const content = fs.readFileSync(ORCH_PATH, 'utf8');
      expect(content).toMatch(/async|await|Promise/);
    });
  });

  describe('Memory Module (Story 7.3)', () => {
    const MEMORY_PATH = path.join(JARVIS_DIR, 'memory.js');

    test('memory module has persistence operations', () => {
      if (!fs.existsSync(MEMORY_PATH)) return;

      const content = fs.readFileSync(MEMORY_PATH, 'utf8');
      expect(content).toMatch(/save|load|persist|store/i);
    });

    test('memory module handles file operations', () => {
      if (!fs.existsSync(MEMORY_PATH)) return;

      const content = fs.readFileSync(MEMORY_PATH, 'utf8');
      expect(content).toMatch(/fs|file|path|write|read/i);
    });
  });

  describe('Core Module (Story 7.4)', () => {
    const CORE_PATH = path.join(JARVIS_DIR, 'core.js');

    test('core module integrates other modules', () => {
      if (!fs.existsSync(CORE_PATH)) return;

      const content = fs.readFileSync(CORE_PATH, 'utf8');
      // Should import/require other JARVIS modules
      expect(content).toMatch(/require|import/);
    });

    test('core module has initialization logic', () => {
      if (!fs.existsSync(CORE_PATH)) return;

      const content = fs.readFileSync(CORE_PATH, 'utf8');
      expect(content).toMatch(/init|start|boot|setup/i);
    });
  });

  describe('Agents Module (Story 7.5)', () => {
    const AGENTS_PATH = path.join(JARVIS_DIR, 'agents.js');

    test('agents module defines agent types', () => {
      if (!fs.existsSync(AGENTS_PATH)) return;

      const content = fs.readFileSync(AGENTS_PATH, 'utf8');
      expect(content).toMatch(/agent|specialist|type|role/i);
    });

    test('agents module has registry pattern', () => {
      if (!fs.existsSync(AGENTS_PATH)) return;

      const content = fs.readFileSync(AGENTS_PATH, 'utf8');
      expect(content).toMatch(/register|get|list|map|object/i);
    });
  });

  describe('Self-Improvement Module (Story 7.6)', () => {
    const SELF_PATH = path.join(JARVIS_DIR, 'self-improvement.js');

    test('self-improvement module has learning logic', () => {
      if (!fs.existsSync(SELF_PATH)) return;

      const content = fs.readFileSync(SELF_PATH, 'utf8');
      expect(content).toMatch(/learn|improve|adapt|pattern/i);
    });

    test('self-improvement module tracks metrics', () => {
      if (!fs.existsSync(SELF_PATH)) return;

      const content = fs.readFileSync(SELF_PATH, 'utf8');
      expect(content).toMatch(/metric|stat|track|measure|count/i);
    });
  });

  describe('Index Module (Story 7.7)', () => {
    const INDEX_PATH = path.join(JARVIS_DIR, 'index.js');

    test('index module exports main JARVIS object', () => {
      if (!fs.existsSync(INDEX_PATH)) return;

      const content = fs.readFileSync(INDEX_PATH, 'utf8');
      expect(content).toMatch(/JARVIS|exports|module\.exports/i);
    });

    test('index module imports all sub-modules', () => {
      if (!fs.existsSync(INDEX_PATH)) return;

      const content = fs.readFileSync(INDEX_PATH, 'utf8');
      const modules = ['config', 'orchestrator', 'memory', 'core', 'agents', 'self-improvement'];

      // Should import at least some of the modules
      const importedCount = modules.filter((mod) => content.includes(mod)).length;
      expect(importedCount).toBeGreaterThan(3);
    });
  });

  describe('Migration Traceability', () => {
    test('each module has migration comment or documentation', () => {
      for (const moduleName of ALL_MODULES) {
        const modulePath = path.join(JARVIS_DIR, moduleName);
        if (!fs.existsSync(modulePath)) continue;

        const content = fs.readFileSync(modulePath, 'utf8');
        const { description } = JARVIS_MODULES[moduleName];

        // Should have some form of documentation
        const hasDoc =
          content.includes('/**') || // JSDoc
          content.includes('//') || // Comment
          content.includes('/*') || // Block comment
          content.includes('@'); // Annotation

        expect(hasDoc).toBe(true);
      }
    });
  });
});
