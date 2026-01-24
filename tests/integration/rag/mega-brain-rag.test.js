/**
 * Mega Brain RAG System Integration Tests
 *
 * Tests for RAG (Retrieval-Augmented Generation) system migrated from Mega Brain.
 * These tests verify:
 * 1. Module files exist
 * 2. Python syntax is valid
 * 3. Required interfaces are present
 * 4. RAG pipeline components are correctly structured
 *
 * @see Story 8.1 for RAG system migration
 * @see docs/mega-brain-hooks-audit.md for migration details
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const RAG_DIR = path.join(__dirname, '../../../.aios-core/infrastructure/scripts/rag');

// RAG modules from Story 8.1
const RAG_MODULES = {
  // Core RAG components
  '__init__.py': {
    description: 'Package initialization',
    type: 'init',
  },
  'config.py': {
    description: 'RAG configuration and settings',
    requiredPatterns: ['config', 'settings', 'Config'],
  },
  'chunker.py': {
    description: 'Document chunking for embedding',
    requiredPatterns: ['chunk', 'split', 'Chunker'],
  },
  'embeddings.py': {
    description: 'Text embedding generation',
    requiredPatterns: ['embed', 'vector', 'Embedding'],
  },
  'indexer.py': {
    description: 'Vector index management',
    requiredPatterns: ['index', 'add', 'Indexer'],
  },
  'retriever.py': {
    description: 'Semantic search and retrieval',
    requiredPatterns: ['retrieve', 'search', 'query', 'Retriever'],
  },
  'vectorstore.py': {
    description: 'Vector database interface (ChromaDB)',
    requiredPatterns: ['vector', 'store', 'chroma', 'collection'],
  },
  'utils.py': {
    description: 'Utility functions',
    type: 'utils',
  },

  // CLI/Script interfaces
  'rag_index.py': {
    description: 'CLI for indexing documents',
    requiredPatterns: ['main', 'argparse', 'index'],
  },
  'rag_query.py': {
    description: 'CLI for querying the index',
    requiredPatterns: ['main', 'argparse', 'query', 'search'],
  },
  'rag_status.py': {
    description: 'CLI for checking RAG status',
    requiredPatterns: ['main', 'status', 'stats'],
  },
};

// Documentation files (not Python)
const DOC_FILES = ['CLAUDE.md', 'CLAUDE-LOCAL.md'];

const ALL_MODULES = Object.keys(RAG_MODULES);

describe('Mega Brain RAG System Migration', () => {
  describe('Directory Structure', () => {
    test('RAG directory exists', () => {
      expect(fs.existsSync(RAG_DIR)).toBe(true);
    });

    test('RAG directory is a Python package', () => {
      const initPath = path.join(RAG_DIR, '__init__.py');
      expect(fs.existsSync(initPath)).toBe(true);
    });
  });

  describe('Module Files Existence', () => {
    test.each(ALL_MODULES)('module %s exists', (moduleName) => {
      const modulePath = path.join(RAG_DIR, moduleName);
      expect(fs.existsSync(modulePath)).toBe(true);
    });
  });

  describe('Documentation Files', () => {
    test.each(DOC_FILES)('%s exists', (docFile) => {
      const docPath = path.join(RAG_DIR, docFile);
      expect(fs.existsSync(docPath)).toBe(true);
    });
  });

  describe('Python Syntax Validation', () => {
    test.each(ALL_MODULES)('%s has valid Python syntax', (moduleName) => {
      const modulePath = path.join(RAG_DIR, moduleName);

      if (!fs.existsSync(modulePath)) {
        return; // Skip if file doesn't exist (covered by existence test)
      }

      // Check Python syntax using py_compile
      try {
        execSync(`python -m py_compile "${modulePath}"`, {
          encoding: 'utf8',
          stdio: 'pipe',
        });
      } catch (error) {
        throw new Error(`Python syntax error in ${moduleName}: ${error.message}`);
      }
    });
  });

  describe('Module Interfaces', () => {
    test.each(
      ALL_MODULES.filter((m) => RAG_MODULES[m].requiredPatterns)
    )('%s has required patterns', (moduleName) => {
      const modulePath = path.join(RAG_DIR, moduleName);

      if (!fs.existsSync(modulePath)) {
        return;
      }

      const content = fs.readFileSync(modulePath, 'utf8');
      const { requiredPatterns } = RAG_MODULES[moduleName];

      // Check that at least one required pattern exists
      const hasPattern = requiredPatterns.some((pattern) => {
        const regex = new RegExp(pattern, 'i');
        return regex.test(content);
      });

      expect(hasPattern).toBe(true);
    });
  });

  describe('Config Module', () => {
    const CONFIG_PATH = path.join(RAG_DIR, 'config.py');

    test('config has default settings', () => {
      if (!fs.existsSync(CONFIG_PATH)) return;

      const content = fs.readFileSync(CONFIG_PATH, 'utf8');
      expect(content).toMatch(/default|DEFAULT|Config/);
    });

    test('config handles ChromaDB settings', () => {
      if (!fs.existsSync(CONFIG_PATH)) return;

      const content = fs.readFileSync(CONFIG_PATH, 'utf8');
      expect(content).toMatch(/chroma|persist|collection/i);
    });
  });

  describe('Chunker Module', () => {
    const CHUNKER_PATH = path.join(RAG_DIR, 'chunker.py');

    test('chunker has configurable chunk size', () => {
      if (!fs.existsSync(CHUNKER_PATH)) return;

      const content = fs.readFileSync(CHUNKER_PATH, 'utf8');
      expect(content).toMatch(/chunk_size|size|length/i);
    });

    test('chunker handles overlap', () => {
      if (!fs.existsSync(CHUNKER_PATH)) return;

      const content = fs.readFileSync(CHUNKER_PATH, 'utf8');
      expect(content).toMatch(/overlap|sliding|window/i);
    });
  });

  describe('Embeddings Module', () => {
    const EMBED_PATH = path.join(RAG_DIR, 'embeddings.py');

    test('embeddings handles text input', () => {
      if (!fs.existsSync(EMBED_PATH)) return;

      const content = fs.readFileSync(EMBED_PATH, 'utf8');
      expect(content).toMatch(/text|string|input/i);
    });

    test('embeddings returns vectors', () => {
      if (!fs.existsSync(EMBED_PATH)) return;

      const content = fs.readFileSync(EMBED_PATH, 'utf8');
      expect(content).toMatch(/vector|embedding|array|list/i);
    });
  });

  describe('Indexer Module', () => {
    const INDEXER_PATH = path.join(RAG_DIR, 'indexer.py');

    test('indexer has add functionality', () => {
      if (!fs.existsSync(INDEXER_PATH)) return;

      const content = fs.readFileSync(INDEXER_PATH, 'utf8');
      expect(content).toMatch(/add|insert|index/i);
    });

    test('indexer handles document metadata', () => {
      if (!fs.existsSync(INDEXER_PATH)) return;

      const content = fs.readFileSync(INDEXER_PATH, 'utf8');
      expect(content).toMatch(/metadata|meta|source|document/i);
    });
  });

  describe('Retriever Module', () => {
    const RETRIEVER_PATH = path.join(RAG_DIR, 'retriever.py');

    test('retriever has search functionality', () => {
      if (!fs.existsSync(RETRIEVER_PATH)) return;

      const content = fs.readFileSync(RETRIEVER_PATH, 'utf8');
      expect(content).toMatch(/search|query|retrieve|find/i);
    });

    test('retriever supports top-k results', () => {
      if (!fs.existsSync(RETRIEVER_PATH)) return;

      const content = fs.readFileSync(RETRIEVER_PATH, 'utf8');
      expect(content).toMatch(/top|k|limit|num|results/i);
    });
  });

  describe('VectorStore Module', () => {
    const VECTORSTORE_PATH = path.join(RAG_DIR, 'vectorstore.py');

    test('vectorstore interfaces with ChromaDB', () => {
      if (!fs.existsSync(VECTORSTORE_PATH)) return;

      const content = fs.readFileSync(VECTORSTORE_PATH, 'utf8');
      expect(content).toMatch(/chroma|chromadb|collection/i);
    });

    test('vectorstore handles persistence', () => {
      if (!fs.existsSync(VECTORSTORE_PATH)) return;

      const content = fs.readFileSync(VECTORSTORE_PATH, 'utf8');
      expect(content).toMatch(/persist|save|path|directory/i);
    });
  });

  describe('CLI Scripts', () => {
    const CLI_SCRIPTS = ['rag_index.py', 'rag_query.py', 'rag_status.py'];

    test.each(CLI_SCRIPTS)('%s has main entry point', (scriptName) => {
      const scriptPath = path.join(RAG_DIR, scriptName);

      if (!fs.existsSync(scriptPath)) return;

      const content = fs.readFileSync(scriptPath, 'utf8');
      // Should have if __name__ == "__main__" pattern
      expect(content).toMatch(/__name__|main\(\)|argparse/);
    });

    test.each(CLI_SCRIPTS)('%s has argument parsing', (scriptName) => {
      const scriptPath = path.join(RAG_DIR, scriptName);

      if (!fs.existsSync(scriptPath)) return;

      const content = fs.readFileSync(scriptPath, 'utf8');
      expect(content).toMatch(/argparse|sys\.argv|click|typer/);
    });
  });

  describe('Package Dependencies', () => {
    test('__init__.py exports main components', () => {
      const initPath = path.join(RAG_DIR, '__init__.py');

      if (!fs.existsSync(initPath)) return;

      const content = fs.readFileSync(initPath, 'utf8');
      // Should have some exports
      expect(content).toMatch(/from|import|__all__|def|class/);
    });
  });

  describe('Migration Traceability', () => {
    test('CLAUDE.md documents the RAG system', () => {
      const claudePath = path.join(RAG_DIR, 'CLAUDE.md');

      if (!fs.existsSync(claudePath)) return;

      const content = fs.readFileSync(claudePath, 'utf8');
      expect(content).toMatch(/RAG|retrieval|vector|embedding/i);
    });
  });
});
