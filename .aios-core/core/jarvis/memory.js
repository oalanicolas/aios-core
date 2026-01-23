/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                    JARVIS TOTAL MEMORY SYSTEM                                  ║
 * ║                                                                                ║
 * ║  Sistema de memoria persistente total.                                        ║
 * ║  Lembra TUDO: conversas, decisoes, codigo, intencoes.                         ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * PRINCIPIOS:
 * 1. NADA e esquecido - cada interacao e registrada
 * 2. CONTEXTO e rei - memoria inclui o "porque"
 * 3. RECUPERACAO inteligente - busca semantica e temporal
 * 4. EVOLUCAO continua - memoria cresce e se organiza
 *
 * ESTRUTURA DE MEMORIA:
 * ├── memories.json      # Memorias gerais
 * ├── decisions.json     # Decisoes arquiteturais e de negocio
 * ├── code_changes.json  # Cada modificacao de codigo
 * ├── intentions.json    # O "porque" por tras das acoes
 * └── index.json         # Indices para busca rapida
 *
 * ADAPTADO DE: jarvis_total_memory.py (Mega Brain)
 * PARA: AIOS Core - usando JSON files ao inves de SQLite para portabilidade
 *
 * CRIADO: 2026-01-23
 * AUTOR: JARVIS Migration System
 */

import { PATHS, json, log } from './config.js';
import { randomUUID } from 'crypto';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

// ============================================================================
// TIPOS DE MEMORIA
// ============================================================================

/**
 * Tipos de memoria.
 */
export const MemoryType = Object.freeze({
  CONVERSATION: 'conversation',
  DECISION: 'decision',
  CODE_CHANGE: 'code_change',
  INTENTION: 'intention',
  LEARNING: 'learning',
  ERROR: 'error',
  SUCCESS: 'success',
  INSIGHT: 'insight',
  QUESTION: 'question',
  CONTEXT: 'context',
});

/**
 * Niveis de importancia.
 */
export const ImportanceLevel = Object.freeze({
  TRIVIAL: 1,
  LOW: 2,
  MEDIUM: 3,
  HIGH: 4,
  CRITICAL: 5,
});

// ============================================================================
// DATA CLASSES
// ============================================================================

/**
 * Uma entrada de memoria.
 */
export class MemoryEntry {
  constructor({
    id,
    type,
    content,
    context = {},
    importance = ImportanceLevel.MEDIUM,
    tags = [],
    relatedIds = [],
    createdAt = new Date().toISOString(),
    sessionId = null,
    sourceFile = null,
    metadata = {},
  }) {
    this.id = id;
    this.type = type;
    this.content = content;
    this.context = context;
    this.importance = importance;
    this.tags = tags;
    this.relatedIds = relatedIds;
    this.createdAt = createdAt;
    this.sessionId = sessionId;
    this.sourceFile = sourceFile;
    this.metadata = metadata;
  }

  toDict() {
    return {
      id: this.id,
      type: this.type,
      content: this.content,
      context: this.context,
      importance: this.importance,
      tags: this.tags,
      relatedIds: this.relatedIds,
      createdAt: this.createdAt,
      sessionId: this.sessionId,
      sourceFile: this.sourceFile,
      metadata: this.metadata,
    };
  }

  static fromDict(data) {
    return new MemoryEntry(data);
  }
}

/**
 * Memoria de uma decisao.
 */
export class DecisionMemory {
  constructor({
    id,
    decision,
    reasoning,
    alternativesConsidered = [],
    chosenBecause,
    context,
    impact,
    reversible = true,
    madeAt = new Date().toISOString(),
    madeBy = 'jarvis',
    relatedDecisions = [],
    outcome = null,
  }) {
    this.id = id;
    this.decision = decision;
    this.reasoning = reasoning;
    this.alternativesConsidered = alternativesConsidered;
    this.chosenBecause = chosenBecause;
    this.context = context;
    this.impact = impact;
    this.reversible = reversible;
    this.madeAt = madeAt;
    this.madeBy = madeBy;
    this.relatedDecisions = relatedDecisions;
    this.outcome = outcome;
  }

  toDict() {
    return { ...this };
  }
}

/**
 * Memoria de uma mudanca de codigo.
 */
export class CodeChangeMemory {
  constructor({
    id,
    filePath,
    changeType,
    before = null,
    after,
    intention,
    requestedBy = 'user',
    implementedBy = 'jarvis',
    reviewedBy = null,
    timestamp = new Date().toISOString(),
    relatedChanges = [],
    testsPassed = null,
  }) {
    this.id = id;
    this.filePath = filePath;
    this.changeType = changeType;
    this.before = before;
    this.after = after;
    this.intention = intention;
    this.requestedBy = requestedBy;
    this.implementedBy = implementedBy;
    this.reviewedBy = reviewedBy;
    this.timestamp = timestamp;
    this.relatedChanges = relatedChanges;
    this.testsPassed = testsPassed;
  }

  toDict() {
    return { ...this };
  }
}

/**
 * Memoria de uma intencao/objetivo.
 */
export class IntentionMemory {
  constructor({
    id,
    intention,
    expressedAt = new Date().toISOString(),
    expressedBy = 'user',
    context,
    relatedGoals = [],
    status = 'active',
    progress = 0.0,
    milestones = [],
  }) {
    this.id = id;
    this.intention = intention;
    this.expressedAt = expressedAt;
    this.expressedBy = expressedBy;
    this.context = context;
    this.relatedGoals = relatedGoals;
    this.status = status;
    this.progress = progress;
    this.milestones = milestones;
  }

  toDict() {
    return { ...this };
  }
}

// ============================================================================
// MEMORY STORE
// ============================================================================

/**
 * Gerencia armazenamento de memoria em JSON files.
 */
class MemoryStore {
  constructor(memoryRoot = null) {
    this.memoryRoot = memoryRoot || join(PATHS.AIOS_CORE, 'data', 'memory');
    this._ensureDirectories();
  }

  _ensureDirectories() {
    if (!existsSync(this.memoryRoot)) {
      mkdirSync(this.memoryRoot, { recursive: true });
    }
  }

  _getPath(filename) {
    return join(this.memoryRoot, filename);
  }

  /**
   * Carrega dados de um arquivo JSON.
   */
  load(filename, defaultValue = []) {
    return json.load(this._getPath(filename), defaultValue, { logErrors: false });
  }

  /**
   * Salva dados em um arquivo JSON.
   */
  save(filename, data) {
    return json.save(this._getPath(filename), data, { createDirs: true });
  }

  /**
   * Adiciona item a uma colecao.
   */
  append(filename, item) {
    const data = this.load(filename, []);
    data.push(item);
    return this.save(filename, data);
  }

  /**
   * Atualiza item em uma colecao por ID.
   */
  update(filename, id, updates) {
    const data = this.load(filename, []);
    const index = data.findIndex((item) => item.id === id);
    if (index !== -1) {
      data[index] = { ...data[index], ...updates };
      return this.save(filename, data);
    }
    return false;
  }
}

// ============================================================================
// TOTAL MEMORY SYSTEM
// ============================================================================

/**
 * Sistema de memoria total do JARVIS.
 *
 * Lembra TUDO: conversas, decisoes, codigo, intencoes.
 * Fornece recuperacao inteligente por contexto, tempo, relevancia.
 */
export class JarvisTotalMemory {
  constructor(memoryRoot = null) {
    this.store = new MemoryStore(memoryRoot);
    this.currentSessionId = this._generateSessionId();
    this.sessionMemories = [];
  }

  _generateSessionId() {
    const date = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '');
    return `session_${date}_${randomUUID().slice(0, 6)}`;
  }

  _generateMemoryId(type) {
    const date = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '');
    return `${type}_${date}_${randomUUID().slice(0, 8)}`;
  }

  // ========================================================================
  // METODOS DE REGISTRO
  // ========================================================================

  /**
   * Registra uma memoria.
   * Esta e a funcao principal de registro. TUDO passa por aqui.
   *
   * @param {string} content - Conteudo da memoria
   * @param {string} type - Tipo de memoria (MemoryType)
   * @param {Object} options - Opcoes adicionais
   * @returns {string} ID da memoria criada
   */
  remember(content, type, options = {}) {
    const {
      context = {},
      importance = ImportanceLevel.MEDIUM,
      tags = [],
      relatedIds = [],
      sourceFile = null,
      metadata = {},
    } = options;

    const memoryId = this._generateMemoryId(type);

    const entry = new MemoryEntry({
      id: memoryId,
      type,
      content,
      context,
      importance,
      tags,
      relatedIds,
      createdAt: new Date().toISOString(),
      sessionId: this.currentSessionId,
      sourceFile,
      metadata,
    });

    // Salvar no store
    this.store.append('memories.json', entry.toDict());

    // Manter em memoria de sessao
    this.sessionMemories.push(entry);

    log.debug(`Memory recorded: ${memoryId}`);

    return memoryId;
  }

  /**
   * Registra um turno de conversa.
   */
  rememberConversationTurn(role, content, conversationId = null) {
    return this.remember(content, MemoryType.CONVERSATION, {
      context: {
        role,
        conversationId: conversationId || this.currentSessionId,
      },
      importance: ImportanceLevel.MEDIUM,
      tags: ['conversation', role],
    });
  }

  /**
   * Registra uma decisao.
   */
  rememberDecision({
    decision,
    reasoning,
    alternatives = [],
    chosenBecause,
    context,
    impact,
    madeBy = 'jarvis',
    reversible = true,
  }) {
    const decisionId = `decision_${randomUUID().slice(0, 8)}`;

    const decisionMemory = new DecisionMemory({
      id: decisionId,
      decision,
      reasoning,
      alternativesConsidered: alternatives,
      chosenBecause,
      context,
      impact,
      reversible,
      madeBy,
    });

    this.store.append('decisions.json', decisionMemory.toDict());

    // Tambem registrar como memoria geral
    this.remember(`DECISAO: ${decision}\nRAZAO: ${chosenBecause}`, MemoryType.DECISION, {
      context: { decisionId },
      importance: ImportanceLevel.HIGH,
      tags: ['decision', madeBy],
    });

    return decisionId;
  }

  /**
   * Registra uma mudanca de codigo.
   */
  rememberCodeChange({
    filePath,
    changeType,
    after,
    intention,
    before = null,
    requestedBy = 'user',
    implementedBy = 'jarvis',
  }) {
    const changeId = `code_${randomUUID().slice(0, 8)}`;

    const changeMemory = new CodeChangeMemory({
      id: changeId,
      filePath,
      changeType,
      before,
      after,
      intention,
      requestedBy,
      implementedBy,
    });

    this.store.append('code_changes.json', changeMemory.toDict());

    // Tambem registrar como memoria geral
    const ext = filePath.split('.').pop() || 'unknown';
    this.remember(`CODIGO [${changeType}]: ${filePath}\nINTENCAO: ${intention}`, MemoryType.CODE_CHANGE, {
      context: { changeId, file: filePath },
      importance: ImportanceLevel.HIGH,
      tags: ['code', changeType, `.${ext}`],
      sourceFile: filePath,
    });

    return changeId;
  }

  /**
   * Registra uma intencao/objetivo.
   */
  rememberIntention(intention, context, expressedBy = 'user') {
    const intentionId = `intention_${randomUUID().slice(0, 8)}`;

    const intentionMemory = new IntentionMemory({
      id: intentionId,
      intention,
      context,
      expressedBy,
    });

    this.store.append('intentions.json', intentionMemory.toDict());

    // Tambem registrar como memoria geral
    this.remember(`INTENCAO: ${intention}\nCONTEXTO: ${context}`, MemoryType.INTENTION, {
      context: { intentionId },
      importance: ImportanceLevel.HIGH,
      tags: ['intention', expressedBy],
    });

    return intentionId;
  }

  /**
   * Registra um aprendizado.
   */
  rememberLearning(learning, context, source) {
    return this.remember(`APRENDIZADO: ${learning}\nFONTE: ${source}`, MemoryType.LEARNING, {
      context: { source, learningContext: context },
      importance: ImportanceLevel.HIGH,
      tags: ['learning', source],
    });
  }

  /**
   * Registra um erro para aprendizado.
   */
  rememberError(error, context, resolution = null) {
    return this.remember(
      `ERRO: ${error}\nCONTEXTO: ${context}\nRESOLUCAO: ${resolution || 'Pendente'}`,
      MemoryType.ERROR,
      {
        context: { errorType: typeof error },
        importance: ImportanceLevel.HIGH,
        tags: ['error', 'learning'],
      }
    );
  }

  // ========================================================================
  // METODOS DE RECUPERACAO
  // ========================================================================

  /**
   * Recupera memorias relevantes para uma query.
   *
   * @param {string} query - Texto de busca
   * @param {Object} options - Opcoes de filtro
   * @returns {MemoryEntry[]} Memorias encontradas
   */
  recall(query, options = {}) {
    const { typeFilter = null, limit = 10, minImportance = ImportanceLevel.TRIVIAL } = options;

    const memories = this.store.load('memories.json', []);
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/);

    // Filtrar e pontuar
    const scored = memories
      .filter((m) => {
        if (typeFilter && m.type !== typeFilter) return false;
        if (m.importance < minImportance) return false;
        return true;
      })
      .map((m) => {
        const contentLower = m.content.toLowerCase();
        const contextStr = JSON.stringify(m.context || {}).toLowerCase();
        const tagsStr = (m.tags || []).join(' ').toLowerCase();

        // Calcular score baseado em matches
        let score = 0;
        for (const word of queryWords) {
          if (contentLower.includes(word)) score += 2;
          if (contextStr.includes(word)) score += 1;
          if (tagsStr.includes(word)) score += 1;
        }

        // Boost por importancia
        score += (m.importance || 3) * 0.5;

        return { memory: m, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return scored.map((item) => MemoryEntry.fromDict(item.memory));
  }

  /**
   * Recupera memorias recentes.
   */
  recallRecent(options = {}) {
    const { hours = 24, typeFilter = null, limit = 50 } = options;

    const memories = this.store.load('memories.json', []);
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const filtered = memories
      .filter((m) => {
        if (m.createdAt < cutoff) return false;
        if (typeFilter && m.type !== typeFilter) return false;
        return true;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);

    return filtered.map((m) => MemoryEntry.fromDict(m));
  }

  /**
   * Recupera todas as memorias relacionadas a um arquivo.
   */
  recallByFile(filePath) {
    const codeChanges = this.store.load('code_changes.json', []).filter((c) => c.filePath === filePath);

    const memories = this.store
      .load('memories.json', [])
      .filter((m) => m.sourceFile === filePath)
      .map((m) => MemoryEntry.fromDict(m));

    return {
      codeChanges,
      memories,
    };
  }

  /**
   * Recupera decisoes.
   */
  recallDecisions(options = {}) {
    const { limit = 20, madeBy = null } = options;

    let decisions = this.store.load('decisions.json', []);

    if (madeBy) {
      decisions = decisions.filter((d) => d.madeBy === madeBy);
    }

    return decisions.sort((a, b) => new Date(b.madeAt) - new Date(a.madeAt)).slice(0, limit);
  }

  /**
   * Recupera intencoes/objetivos.
   */
  recallIntentions(status = null) {
    let intentions = this.store.load('intentions.json', []);

    if (status) {
      intentions = intentions.filter((i) => i.status === status);
    }

    return intentions.sort((a, b) => new Date(b.expressedAt) - new Date(a.expressedAt));
  }

  /**
   * Atualiza status de uma intencao.
   */
  updateIntentionStatus(intentionId, status, progress = null) {
    const updates = { status };
    if (progress !== null) updates.progress = progress;
    return this.store.update('intentions.json', intentionId, updates);
  }

  /**
   * Retorna contexto da sessao atual para injecao em prompts.
   */
  getSessionContext() {
    const recent = this.recallRecent({ hours: 1, limit: 10 });
    const decisions = this.recallDecisions({ limit: 5 });
    const intentions = this.recallIntentions('active');

    return {
      sessionId: this.currentSessionId,
      recentMemories: recent.map((m) => m.toDict()),
      recentDecisions: decisions.slice(0, 5),
      activeIntentions: intentions.slice(0, 5),
      sessionMemoryCount: this.sessionMemories.length,
    };
  }

  /**
   * Gera contexto completo de memoria para injetar em prompt.
   */
  getFullContextForPrompt(query) {
    const relevant = this.recall(query, { limit: 5 });
    const recent = this.recallRecent({ hours: 2, limit: 5 });
    const decisions = this.recallDecisions({ limit: 3 });
    const intentions = this.recallIntentions('active');

    const parts = [];

    parts.push('╔═══════════════════════════════════════════════════════════════════════════════╗');
    parts.push('║  JARVIS MEMORY CONTEXT                                                        ║');
    parts.push('╚═══════════════════════════════════════════════════════════════════════════════╝');

    if (relevant.length > 0) {
      parts.push('\n## MEMORIAS RELEVANTES');
      for (const m of relevant.slice(0, 3)) {
        parts.push(`- [${m.type}] ${m.content.slice(0, 200)}...`);
      }
    }

    if (decisions.length > 0) {
      parts.push('\n## DECISOES RECENTES');
      for (const d of decisions.slice(0, 3)) {
        parts.push(`- ${d.decision}`);
      }
    }

    if (intentions.length > 0) {
      parts.push('\n## INTENCOES ATIVAS DO SENHOR');
      for (const i of intentions.slice(0, 3)) {
        parts.push(`- ${i.intention}`);
      }
    }

    parts.push('\n═══════════════════════════════════════════════════════════════════════════════');

    return parts.join('\n');
  }

  // ========================================================================
  // METODOS DE ANALISE
  // ========================================================================

  /**
   * Retorna estatisticas da memoria.
   */
  getStatistics() {
    const memories = this.store.load('memories.json', []);
    const decisions = this.store.load('decisions.json', []);
    const codeChanges = this.store.load('code_changes.json', []);
    const intentions = this.store.load('intentions.json', []);

    // Contar por tipo
    const byType = {};
    for (const m of memories) {
      byType[m.type] = (byType[m.type] || 0) + 1;
    }

    return {
      totalMemories: memories.length,
      byType,
      totalDecisions: decisions.length,
      totalCodeChanges: codeChanges.length,
      activeIntentions: intentions.filter((i) => i.status === 'active').length,
      currentSessionMemories: this.sessionMemories.length,
    };
  }

  /**
   * Exporta toda a memoria para JSON.
   */
  exportAll(outputPath) {
    const exportData = {
      exportedAt: new Date().toISOString(),
      statistics: this.getStatistics(),
      memories: this.store.load('memories.json', []),
      decisions: this.store.load('decisions.json', []),
      codeChanges: this.store.load('code_changes.json', []),
      intentions: this.store.load('intentions.json', []),
    };

    return json.save(outputPath, exportData);
  }

  /**
   * Limpa memorias mais antigas que N dias.
   */
  cleanup(daysToKeep = 30) {
    const cutoff = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000).toISOString();

    const memories = this.store.load('memories.json', []);
    const filtered = memories.filter((m) => m.createdAt >= cutoff);

    const removed = memories.length - filtered.length;
    this.store.save('memories.json', filtered);

    log.info(`Memory cleanup: removed ${removed} old entries`);
    return removed;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let _memoryInstance = null;

/**
 * Retorna instancia singleton da memoria.
 */
export function getMemory() {
  if (_memoryInstance === null) {
    _memoryInstance = new JarvisTotalMemory();
  }
  return _memoryInstance;
}

// ============================================================================
// CLI
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
JARVIS Total Memory System

Usage:
  node memory.js stats              Show statistics
  node memory.js remember <text>    Remember something
  node memory.js recall <query>     Search memories
  node memory.js export [file]      Export all memory

Options:
  -h, --help     Show this help
  --type <type>  Memory type (for remember)
  --limit <n>    Limit results (for recall)
`);
    return;
  }

  const memory = getMemory();
  const command = args[0];

  if (command === 'stats') {
    const stats = memory.getStatistics();
    console.log(JSON.stringify(stats, null, 2));
  } else if (command === 'remember') {
    const content = args.slice(1).join(' ');
    if (!content) {
      console.log('Error: Content required');
      return;
    }
    const typeArg = args.find((a, i) => args[i - 1] === '--type') || 'insight';
    const memoryId = memory.remember(content, typeArg);
    console.log(`Memory recorded: ${memoryId}`);
  } else if (command === 'recall') {
    const query = args.slice(1).filter((a) => !a.startsWith('--')).join(' ');
    if (!query) {
      console.log('Error: Query required');
      return;
    }
    const limitArg = args.find((a, i) => args[i - 1] === '--limit');
    const limit = limitArg ? parseInt(limitArg) : 10;

    const results = memory.recall(query, { limit });
    console.log(`\n${results.length} memories found:\n`);
    for (const m of results) {
      console.log(`[${m.type}] ${m.content.slice(0, 100)}...`);
      console.log(`   Importance: ${m.importance} | ${m.createdAt}\n`);
    }
  } else if (command === 'export') {
    const outputFile = args[1] || 'memory_export.json';
    memory.exportAll(outputFile);
    console.log(`Memory exported to: ${outputFile}`);
  } else {
    console.log('Usage: node memory.js [stats|remember|recall|export]');
    console.log('       node memory.js --help for more info');
  }
}

// Detecta se esta sendo executado diretamente
const isMainModule = process.argv[1]?.endsWith('memory.js');
if (isMainModule) {
  main();
}

// ============================================================================
// EXPORTACOES DEFAULT
// ============================================================================

export default {
  MemoryType,
  ImportanceLevel,
  MemoryEntry,
  DecisionMemory,
  CodeChangeMemory,
  IntentionMemory,
  JarvisTotalMemory,
  getMemory,
};
