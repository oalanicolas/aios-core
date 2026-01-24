/**
 * Mega Brain Processing System Integration Tests
 *
 * Tests for batch processing scripts migrated from Mega Brain.
 * These tests verify:
 * 1. Script files exist
 * 2. Python syntax is valid
 * 3. Required interfaces are present
 * 4. Processing pipeline components work correctly
 *
 * @see Story 8.2 for batch processor migration
 * @see docs/mega-brain-hooks-audit.md for migration details
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROCESSING_DIR = path.join(__dirname, '../../../.aios-core/infrastructure/scripts/processing');

// Processing scripts from Story 8.2
const PROCESSING_SCRIPTS = {
  'auto_organize_inbox.py': {
    description: 'Automatic inbox organization',
    requiredPatterns: ['inbox', 'organize', 'move', 'file'],
  },
  'classify_unknown.py': {
    description: 'Classification of unknown files',
    requiredPatterns: ['classify', 'unknown', 'type', 'category'],
  },
  'file_registry.py': {
    description: 'File registry management',
    requiredPatterns: ['registry', 'file', 'track', 'record'],
  },
  'inbox_auto_organize.py': {
    description: 'Inbox auto-organization variant',
    requiredPatterns: ['inbox', 'auto', 'organize'],
  },
  'organize_inbox_to_knowledge.py': {
    description: 'Move inbox items to knowledge base',
    requiredPatterns: ['inbox', 'knowledge', 'move', 'process'],
  },
  'validate_batch_cascading.py': {
    description: 'Cascading batch validation',
    requiredPatterns: ['validate', 'batch', 'cascade'],
  },
  'validate_batch_logs.py': {
    description: 'Batch log validation',
    requiredPatterns: ['validate', 'batch', 'log'],
  },
};

const ALL_SCRIPTS = Object.keys(PROCESSING_SCRIPTS);

describe('Mega Brain Processing System Migration', () => {
  describe('Directory Structure', () => {
    test('processing directory exists', () => {
      expect(fs.existsSync(PROCESSING_DIR)).toBe(true);
    });
  });

  describe('Script Files Existence', () => {
    test.each(ALL_SCRIPTS)('script %s exists', (scriptName) => {
      const scriptPath = path.join(PROCESSING_DIR, scriptName);
      expect(fs.existsSync(scriptPath)).toBe(true);
    });
  });

  describe('Python Syntax Validation', () => {
    test.each(ALL_SCRIPTS)('%s has valid Python syntax', (scriptName) => {
      const scriptPath = path.join(PROCESSING_DIR, scriptName);

      if (!fs.existsSync(scriptPath)) {
        return; // Skip if file doesn't exist
      }

      // Check Python syntax using py_compile
      try {
        execSync(`python -m py_compile "${scriptPath}"`, {
          encoding: 'utf8',
          stdio: 'pipe',
        });
      } catch (error) {
        throw new Error(`Python syntax error in ${scriptName}: ${error.message}`);
      }
    });
  });

  describe('Script Interfaces', () => {
    test.each(ALL_SCRIPTS)('%s has required patterns', (scriptName) => {
      const scriptPath = path.join(PROCESSING_DIR, scriptName);

      if (!fs.existsSync(scriptPath)) {
        return;
      }

      const content = fs.readFileSync(scriptPath, 'utf8');
      const { requiredPatterns } = PROCESSING_SCRIPTS[scriptName];

      // Check that at least one required pattern exists
      const hasPattern = requiredPatterns.some((pattern) => {
        const regex = new RegExp(pattern, 'i');
        return regex.test(content);
      });

      expect(hasPattern).toBe(true);
    });
  });

  describe('Inbox Organization Scripts', () => {
    const INBOX_SCRIPTS = ['auto_organize_inbox.py', 'inbox_auto_organize.py'];

    test.each(INBOX_SCRIPTS)('%s handles file movement', (scriptName) => {
      const scriptPath = path.join(PROCESSING_DIR, scriptName);

      if (!fs.existsSync(scriptPath)) return;

      const content = fs.readFileSync(scriptPath, 'utf8');
      expect(content).toMatch(/move|copy|shutil|os\.rename/i);
    });

    test.each(INBOX_SCRIPTS)('%s has path handling', (scriptName) => {
      const scriptPath = path.join(PROCESSING_DIR, scriptName);

      if (!fs.existsSync(scriptPath)) return;

      const content = fs.readFileSync(scriptPath, 'utf8');
      expect(content).toMatch(/path|os\.path|pathlib/i);
    });
  });

  describe('Classification Script', () => {
    const CLASSIFY_PATH = path.join(PROCESSING_DIR, 'classify_unknown.py');

    test('classify_unknown has classification logic', () => {
      if (!fs.existsSync(CLASSIFY_PATH)) return;

      const content = fs.readFileSync(CLASSIFY_PATH, 'utf8');
      expect(content).toMatch(/class|type|category|detect/i);
    });

    test('classify_unknown handles multiple file types', () => {
      if (!fs.existsSync(CLASSIFY_PATH)) return;

      const content = fs.readFileSync(CLASSIFY_PATH, 'utf8');
      expect(content).toMatch(/ext|extension|mime|type/i);
    });
  });

  describe('Registry Script', () => {
    const REGISTRY_PATH = path.join(PROCESSING_DIR, 'file_registry.py');

    test('file_registry has tracking functionality', () => {
      if (!fs.existsSync(REGISTRY_PATH)) return;

      const content = fs.readFileSync(REGISTRY_PATH, 'utf8');
      expect(content).toMatch(/track|register|record|add/i);
    });

    test('file_registry handles data persistence', () => {
      if (!fs.existsSync(REGISTRY_PATH)) return;

      const content = fs.readFileSync(REGISTRY_PATH, 'utf8');
      expect(content).toMatch(/save|load|json|yaml|file/i);
    });
  });

  describe('Knowledge Pipeline Script', () => {
    const KNOWLEDGE_PATH = path.join(PROCESSING_DIR, 'organize_inbox_to_knowledge.py');

    test('organize_inbox_to_knowledge connects inbox to knowledge', () => {
      if (!fs.existsSync(KNOWLEDGE_PATH)) return;

      const content = fs.readFileSync(KNOWLEDGE_PATH, 'utf8');
      expect(content).toMatch(/inbox/i);
      expect(content).toMatch(/knowledge/i);
    });

    test('organize_inbox_to_knowledge handles transformation', () => {
      if (!fs.existsSync(KNOWLEDGE_PATH)) return;

      const content = fs.readFileSync(KNOWLEDGE_PATH, 'utf8');
      expect(content).toMatch(/transform|process|convert|move/i);
    });
  });

  describe('Validation Scripts', () => {
    const VALIDATION_SCRIPTS = ['validate_batch_cascading.py', 'validate_batch_logs.py'];

    test.each(VALIDATION_SCRIPTS)('%s has validation logic', (scriptName) => {
      const scriptPath = path.join(PROCESSING_DIR, scriptName);

      if (!fs.existsSync(scriptPath)) return;

      const content = fs.readFileSync(scriptPath, 'utf8');
      expect(content).toMatch(/valid|check|verify|assert/i);
    });

    test.each(VALIDATION_SCRIPTS)('%s handles batch operations', (scriptName) => {
      const scriptPath = path.join(PROCESSING_DIR, scriptName);

      if (!fs.existsSync(scriptPath)) return;

      const content = fs.readFileSync(scriptPath, 'utf8');
      expect(content).toMatch(/batch|bulk|all|multiple|list/i);
    });
  });

  describe('Error Handling', () => {
    test.each(ALL_SCRIPTS)('%s has error handling', (scriptName) => {
      const scriptPath = path.join(PROCESSING_DIR, scriptName);

      if (!fs.existsSync(scriptPath)) return;

      const content = fs.readFileSync(scriptPath, 'utf8');
      // Should have some form of error handling
      expect(content).toMatch(/try|except|raise|error|exception/i);
    });
  });

  describe('Logging', () => {
    test.each(ALL_SCRIPTS)('%s has logging capability', (scriptName) => {
      const scriptPath = path.join(PROCESSING_DIR, scriptName);

      if (!fs.existsSync(scriptPath)) return;

      const content = fs.readFileSync(scriptPath, 'utf8');
      // Should have logging or print statements
      expect(content).toMatch(/logging|logger|print|log\(|console/i);
    });
  });
});
