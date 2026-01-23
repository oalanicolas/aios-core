/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                         JARVIS CONFIGURATION                                   ║
 * ║                                                                                ║
 * ║  Configuracao centralizada do AIOS Core                                       ║
 * ║  Importar em todos os modulos para paths, JSON, e logging unificados          ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * USO:
 *    import { PATHS, json, log } from './config.js';
 *
 * ADAPTADO DE: jarvis_config.py (Mega Brain)
 * PARA: AIOS Core (aios-bilhon)
 *
 * CRIADO: 2026-01-23
 * AUTOR: JARVIS Migration System
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync, copyFileSync, statSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

// ============================================================================
// DETECCAO AUTOMATICA DO PROJECT ROOT
// ============================================================================

/**
 * Detecta o root do projeto de forma robusta.
 *
 * Ordem de prioridade:
 * 1. Variavel de ambiente CLAUDE_PROJECT_DIR (Claude Code)
 * 2. Variavel de ambiente AIOS_CORE_ROOT (custom)
 * 3. Subir ate encontrar CLAUDE.md ou .aios-core
 * 4. Fallback para diretorio atual
 *
 * @returns {string} Path para o root do projeto
 */
function detectProjectRoot() {
  // 1. Variavel de ambiente do Claude Code
  if (process.env.CLAUDE_PROJECT_DIR) {
    return process.env.CLAUDE_PROJECT_DIR;
  }

  // 2. Variavel de ambiente customizada
  if (process.env.AIOS_CORE_ROOT) {
    return process.env.AIOS_CORE_ROOT;
  }

  // 3. Subir ate encontrar CLAUDE.md ou .aios-core (marcadores do projeto)
  const __filename = fileURLToPath(import.meta.url);
  let current = dirname(__filename);

  for (let i = 0; i < 10; i++) {
    if (existsSync(join(current, 'CLAUDE.md')) || existsSync(join(current, '.aios-core'))) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }

  // 4. Fallback para diretorio atual
  return process.cwd();
}

// ============================================================================
// PATHS GLOBAIS CENTRALIZADOS
// ============================================================================

const PROJECT_ROOT = detectProjectRoot();

/**
 * Todos os paths do projeto centralizados.
 *
 * Uso:
 *    import { PATHS } from './config.js';
 *
 *    const arquivo = join(PATHS.INBOX, 'meu_arquivo.txt');
 *    PATHS.ensureAll();  // Cria todas as pastas
 */
const PATHS = {
  ROOT: PROJECT_ROOT,

  // ========== PASTAS PRINCIPAIS AIOS ==========
  AIOS_CORE: join(PROJECT_ROOT, '.aios-core'),
  CLAUDE: join(PROJECT_ROOT, '.claude'),
  SRC: join(PROJECT_ROOT, 'src'),
  TESTS: join(PROJECT_ROOT, 'tests'),
  DOCS: join(PROJECT_ROOT, 'docs'),

  // ========== ESTRUTURA DATA ==========
  DATA: join(PROJECT_ROOT, '.aios-core', 'data'),
  INBOX: join(PROJECT_ROOT, '.aios-core', 'data', 'inbox'),
  PROCESSING: join(PROJECT_ROOT, '.aios-core', 'data', 'processing'),
  KNOWLEDGE: join(PROJECT_ROOT, '.aios-core', 'data', 'knowledge'),

  // ========== SUBPASTAS KNOWLEDGE ==========
  DNA: join(PROJECT_ROOT, '.aios-core', 'data', 'knowledge', 'dna'),
  DOSSIERS: join(PROJECT_ROOT, '.aios-core', 'data', 'knowledge', 'dossiers'),
  PLAYBOOKS: join(PROJECT_ROOT, '.aios-core', 'data', 'knowledge', 'playbooks'),

  // ========== ESTRUTURA DEVELOPMENT ==========
  DEVELOPMENT: join(PROJECT_ROOT, '.aios-core', 'development'),
  AGENTS: join(PROJECT_ROOT, '.aios-core', 'development', 'agents'),
  MEGA_BRAIN_AGENTS: join(PROJECT_ROOT, '.aios-core', 'development', 'agents', 'mega-brain'),
  WORKFLOWS: join(PROJECT_ROOT, '.aios-core', 'development', 'workflows'),

  // ========== ESTRUTURA CORE ==========
  CORE: join(PROJECT_ROOT, '.aios-core', 'core'),
  PROTOCOLS: join(PROJECT_ROOT, '.aios-core', 'core', 'protocols'),
  JARVIS: join(PROJECT_ROOT, '.aios-core', 'core', 'jarvis'),

  // ========== ESTRUTURA INFRASTRUCTURE ==========
  INFRASTRUCTURE: join(PROJECT_ROOT, '.aios-core', 'infrastructure'),
  SCRIPTS: join(PROJECT_ROOT, '.aios-core', 'infrastructure', 'scripts'),
  RAG: join(PROJECT_ROOT, '.aios-core', 'infrastructure', 'scripts', 'rag'),

  // ========== CLAUDE FOLDERS ==========
  HOOKS: join(PROJECT_ROOT, '.claude', 'hooks'),
  COMMANDS: join(PROJECT_ROOT, '.claude', 'commands'),
  SESSIONS: join(PROJECT_ROOT, '.claude', 'sessions'),

  // ========== LOGS ==========
  LOGS: join(PROJECT_ROOT, 'logs'),

  // ========== ARQUIVOS DE ESTADO ==========
  JARVIS_STATE: join(PROJECT_ROOT, '.aios-core', 'core', 'jarvis', 'state.json'),
  CONSTITUTION: join(PROJECT_ROOT, '.aios-core', 'core', 'protocols', 'constitution.yaml'),
  AGENT_INDEX: join(PROJECT_ROOT, '.aios-core', 'core', 'protocols', 'agent-index.yaml'),

  // ========== ARQUIVOS DE LOG ==========
  PROMPTS_LOG: join(PROJECT_ROOT, 'logs', 'prompts.jsonl'),
  DECISIONS_LOG: join(PROJECT_ROOT, 'logs', 'agent_decisions.jsonl'),
  CORE_LOG: join(PROJECT_ROOT, 'logs', 'jarvis_core.jsonl'),

  /**
   * Cria todas as pastas necessarias se nao existirem.
   * Util para setup inicial ou quando rodar em novo ambiente.
   */
  ensureAll() {
    const folders = [
      this.DATA,
      this.INBOX,
      this.PROCESSING,
      this.KNOWLEDGE,
      this.DNA,
      this.DOSSIERS,
      this.PLAYBOOKS,
      this.DEVELOPMENT,
      this.AGENTS,
      this.MEGA_BRAIN_AGENTS,
      this.WORKFLOWS,
      this.CORE,
      this.PROTOCOLS,
      this.JARVIS,
      this.INFRASTRUCTURE,
      this.SCRIPTS,
      this.RAG,
      this.HOOKS,
      this.COMMANDS,
      this.SESSIONS,
      this.LOGS,
    ];

    for (const folder of folders) {
      if (!existsSync(folder)) {
        mkdirSync(folder, { recursive: true });
      }
    }
  },

  /**
   * Retorna path do DNA de uma persona especifica.
   * @param {string} personaName - Nome da persona
   * @returns {string} Path do DNA
   */
  getDnaPath(personaName) {
    return join(this.DNA, personaName);
  },

  /**
   * Retorna path de um agente Mega Brain especifico.
   * @param {string} category - Categoria (c-level, personas, council)
   * @param {string} name - Nome do agente
   * @returns {string} Path do agente
   */
  getAgentPath(category, name) {
    return join(this.MEGA_BRAIN_AGENTS, category, `${name}.md`);
  },

  /**
   * Retorna path do log diario.
   * @param {string} prefix - Prefixo do arquivo (default: jarvis)
   * @returns {string} Path do log
   */
  getDailyLog(prefix = 'jarvis') {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return join(this.LOGS, `${prefix}_${date}.log`);
  },
};

// ============================================================================
// UTILITARIOS JSON SEGUROS
// ============================================================================

/**
 * Operacoes JSON seguras com logging e fallback.
 *
 * Uso:
 *    import { json } from './config.js';
 *
 *    // Carregar com fallback
 *    const data = json.load('config.json', {});
 *
 *    // Salvar com backup automatico
 *    json.save('config.json', data, { backup: true });
 *
 *    // Append para JSONL
 *    json.append('log.jsonl', { event: 'teste' });
 */
const json = {
  /**
   * Carrega JSON com tratamento de erro robusto.
   *
   * @param {string} path - Caminho do arquivo
   * @param {*} defaultValue - Valor retornado se falhar (default: null)
   * @param {Object} options - Opcoes
   * @param {string} options.encoding - Encoding do arquivo (default: utf-8)
   * @param {boolean} options.logErrors - Se deve logar erros no console (default: true)
   * @returns {*} Dados do JSON ou valor default se falhar
   */
  load(path, defaultValue = null, options = {}) {
    const { encoding = 'utf-8', logErrors = true } = options;

    // Arquivo nao existe
    if (!existsSync(path)) {
      if (logErrors) {
        console.log(`[JSON] Arquivo nao encontrado: ${path}`);
      }
      return defaultValue;
    }

    // Arquivo vazio
    try {
      const stats = statSync(path);
      if (stats.size === 0) {
        if (logErrors) {
          console.log(`[JSON] Arquivo vazio: ${path}`);
        }
        return defaultValue;
      }
    } catch (e) {
      // Ignora erro de stat
    }

    try {
      const content = readFileSync(path, encoding);
      return JSON.parse(content);
    } catch (e) {
      if (logErrors) {
        if (e instanceof SyntaxError) {
          console.log(`[JSON] Erro de parse em ${path}: ${e.message}`);
        } else {
          console.log(`[JSON] Erro ao ler ${path}: ${e.name}: ${e.message}`);
        }
      }
      return defaultValue;
    }
  },

  /**
   * Salva JSON com tratamento de erro e opcoes avancadas.
   *
   * @param {string} path - Caminho do arquivo
   * @param {*} data - Dados a salvar (deve ser serializavel)
   * @param {Object} options - Opcoes
   * @param {number} options.indent - Indentacao (default: 2)
   * @param {string} options.encoding - Encoding (default: utf-8)
   * @param {boolean} options.backup - Se deve criar backup .bak antes (default: false)
   * @param {boolean} options.createDirs - Se deve criar diretorios pai (default: true)
   * @returns {boolean} True se sucesso, False se falhou
   */
  save(path, data, options = {}) {
    const { indent = 2, encoding = 'utf-8', backup = false, createDirs = true } = options;

    // Criar diretorios se necessario
    if (createDirs) {
      const dir = dirname(path);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    }

    // Backup opcional
    if (backup && existsSync(path)) {
      const backupPath = path.replace(/\.json$/, '.json.bak');
      try {
        copyFileSync(path, backupPath);
      } catch (e) {
        console.log(`[JSON] Aviso: Nao foi possivel criar backup: ${e.message}`);
      }
    }

    try {
      const content = JSON.stringify(data, null, indent);
      writeFileSync(path, content, encoding);
      return true;
    } catch (e) {
      if (e instanceof TypeError) {
        console.log(`[JSON] Dados nao serializaveis para ${path}: ${e.message}`);
      } else {
        console.log(`[JSON] Erro ao salvar ${path}: ${e.name}: ${e.message}`);
      }
      return false;
    }
  },

  /**
   * Append para arquivos JSONL (JSON Lines - uma linha por registro).
   *
   * @param {string} path - Caminho do arquivo
   * @param {*} data - Dados a adicionar (sera uma linha)
   * @param {Object} options - Opcoes
   * @param {string} options.encoding - Encoding (default: utf-8)
   * @param {boolean} options.createDirs - Se deve criar diretorios pai (default: true)
   * @returns {boolean} True se sucesso, False se falhou
   */
  append(path, data, options = {}) {
    const { encoding = 'utf-8', createDirs = true } = options;

    if (createDirs) {
      const dir = dirname(path);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    }

    try {
      const line = JSON.stringify(data) + '\n';
      appendFileSync(path, line, encoding);
      return true;
    } catch (e) {
      if (e instanceof TypeError) {
        console.log(`[JSON] Dados nao serializaveis para ${path}: ${e.message}`);
      } else {
        console.log(`[JSON] Erro ao append em ${path}: ${e.name}: ${e.message}`);
      }
      return false;
    }
  },

  /**
   * Le arquivo JSONL (JSON Lines) e retorna lista de objetos.
   *
   * @param {string} path - Caminho do arquivo
   * @param {Object} options - Opcoes
   * @param {string} options.encoding - Encoding (default: utf-8)
   * @param {boolean} options.skipErrors - Se deve pular linhas com erro (default: true)
   * @returns {Array} Lista de objetos, um por linha
   */
  readLines(path, options = {}) {
    const { encoding = 'utf-8', skipErrors = true } = options;
    const results = [];

    if (!existsSync(path)) {
      return results;
    }

    try {
      const content = readFileSync(path, encoding);
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        try {
          results.push(JSON.parse(line));
        } catch (e) {
          if (!skipErrors) throw e;
          console.log(`[JSON] Erro na linha ${i + 1}: ${e.message}`);
        }
      }
    } catch (e) {
      console.log(`[JSON] Erro ao ler JSONL ${path}: ${e.message}`);
    }

    return results;
  },
};

// ============================================================================
// SISTEMA DE LOGGING UNIFICADO
// ============================================================================

/**
 * Logger unificado do JARVIS com output para console e arquivo.
 *
 * Uso:
 *    import { log } from './config.js';
 *
 *    log.info("Processando arquivo...");
 *    log.step("Etapa 1 concluida");
 *    log.success("Arquivo processado!");
 *    log.error("Falha ao processar");
 *    log.warning("Atencao: arquivo grande");
 *
 * Niveis:
 *    DEBUG < INFO < WARNING < ERROR < CRITICAL
 */
class JarvisLogger {
  constructor(name = 'JARVIS') {
    this.name = name;
    this.logFile = null;
    this.level = 'INFO';

    // Configurar arquivo de log
    try {
      if (!existsSync(PATHS.LOGS)) {
        mkdirSync(PATHS.LOGS, { recursive: true });
      }
      this.logFile = PATHS.getDailyLog();
    } catch (e) {
      console.log(`[Logger] Aviso: Nao foi possivel criar log em arquivo: ${e.message}`);
    }
  }

  /**
   * Formata timestamp para console (HH:MM:SS)
   */
  getConsoleTimestamp() {
    return new Date().toTimeString().slice(0, 8);
  }

  /**
   * Formata timestamp para arquivo (YYYY-MM-DD HH:MM:SS)
   */
  getFileTimestamp() {
    return new Date().toISOString().replace('T', ' ').slice(0, 19);
  }

  /**
   * Escreve no arquivo de log
   */
  writeToFile(level, msg) {
    if (this.logFile) {
      try {
        const line = `${this.getFileTimestamp()} | ${level.padEnd(8)} | ${this.name} | ${msg}\n`;
        appendFileSync(this.logFile, line, 'utf-8');
      } catch (e) {
        // Ignora erros de escrita no arquivo
      }
    }
  }

  /**
   * Log para console
   */
  writeToConsole(level, msg) {
    console.log(`${this.getConsoleTimestamp()} | ${level.padEnd(8)} | ${msg}`);
  }

  // ========== METODOS PADRAO DE LOG ==========

  debug(msg) {
    this.writeToFile('DEBUG', msg);
  }

  info(msg) {
    this.writeToConsole('INFO', msg);
    this.writeToFile('INFO', msg);
  }

  warning(msg) {
    this.writeToConsole('WARNING', msg);
    this.writeToFile('WARNING', msg);
  }

  error(msg) {
    this.writeToConsole('ERROR', msg);
    this.writeToFile('ERROR', msg);
  }

  critical(msg) {
    this.writeToConsole('CRITICAL', msg);
    this.writeToFile('CRITICAL', msg);
  }

  // ========== METODOS JARVIS CUSTOMIZADOS ==========

  step(msg) {
    this.info(`-> ${msg}`);
  }

  success(msg) {
    this.info(`OK ${msg}`);
  }

  fail(msg) {
    this.error(`FAIL ${msg}`);
  }

  progress(current, total, msg = '') {
    const pct = total > 0 ? ((current / total) * 100).toFixed(1) : 0;
    this.info(`[${current}/${total}] ${pct}% ${msg}`);
  }

  section(title) {
    this.info(`\n${'='.repeat(60)}\n${title}\n${'='.repeat(60)}`);
  }

  batchStart(batchNum, source = '') {
    this.info(`\n[BATCH ${String(batchNum).padStart(3, '0')}] Iniciando ${source}`);
  }

  batchEnd(batchNum, filesProcessed) {
    this.info(`[BATCH ${String(batchNum).padStart(3, '0')}] Concluido - ${filesProcessed} arquivos`);
  }
}

// Instancia global do logger
const log = new JarvisLogger();

// ============================================================================
// FUNCOES UTILITARIAS ADICIONAIS
// ============================================================================

/**
 * Retorna timestamp formatado para logs e nomes de arquivo.
 * @returns {string} Timestamp no formato YYYYMMDD_HHMMSS
 */
function getTimestamp() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const time = now.toTimeString().slice(0, 8).replace(/:/g, '');
  return `${date}_${time}`;
}

/**
 * Retorna timestamp ISO para JSON.
 * @returns {string} Timestamp ISO
 */
function getIsoTimestamp() {
  return new Date().toISOString();
}

/**
 * Garante que toda a estrutura de pastas do projeto existe.
 * Util para setup inicial.
 */
function ensureProjectStructure() {
  PATHS.ensureAll();
  log.info('Estrutura de pastas verificada/criada');
}

// ============================================================================
// EXPORTACOES
// ============================================================================

export {
  // Paths
  PROJECT_ROOT,
  PATHS,
  // JSON
  json,
  // Logging
  JarvisLogger,
  log,
  // Utilitarios
  getTimestamp,
  getIsoTimestamp,
  ensureProjectStructure,
};

// Default export para compatibilidade
export default {
  PROJECT_ROOT,
  PATHS,
  json,
  log,
  getTimestamp,
  getIsoTimestamp,
  ensureProjectStructure,
};

// ============================================================================
// AUTO-TESTE QUANDO EXECUTADO DIRETAMENTE
// ============================================================================

// Detecta se esta sendo executado diretamente (node config.js)
const isMainModule = process.argv[1]?.endsWith('config.js');

if (isMainModule) {
  console.log('='.repeat(60));
  console.log('JARVIS CONFIG - Auto-teste');
  console.log('='.repeat(60));

  // Teste 1: Paths
  console.log(`\n[1] PROJECT_ROOT: ${PROJECT_ROOT}`);
  console.log(`    PATHS.INBOX: ${PATHS.INBOX}`);
  console.log(`    PATHS.JARVIS: ${PATHS.JARVIS}`);
  console.log(`    PATHS.JARVIS_STATE: ${PATHS.JARVIS_STATE}`);

  // Teste 2: JSON
  console.log('\n[2] Testando JSON...');
  const testData = { teste: true, timestamp: getIsoTimestamp() };
  const testFile = join(PATHS.LOGS, 'test_config.json');

  ensureProjectStructure();

  if (json.save(testFile, testData)) {
    console.log(`    Salvou: ${testFile}`);
    const loaded = json.load(testFile);
    console.log(`    Carregou: ${JSON.stringify(loaded)}`);
    // Cleanup
    try {
      const { unlinkSync } = await import('fs');
      unlinkSync(testFile);
      console.log('    Removeu arquivo de teste');
    } catch (e) {
      // Ignora
    }
  }

  // Teste 3: Logger
  console.log('\n[3] Testando Logger...');
  log.info('Teste de log INFO');
  log.step('Teste de step');
  log.success('Teste de success');
  log.progress(5, 10, 'arquivos processados');

  console.log('\n' + '='.repeat(60));
  console.log('Todos os testes passaram!');
  console.log('='.repeat(60));
}
