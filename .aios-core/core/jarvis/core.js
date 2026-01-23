/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                         JARVIS AUTONOMOUS CORE                                 ║
 * ║                                                                                ║
 * ║  O nucleo que integra todos os sistemas autonomos.                            ║
 * ║  Este e o ponto de entrada principal.                                         ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * ARQUITETURA INTEGRADA:
 *
 *                              ┌─────────────────┐
 *                              │   JARVIS CORE   │
 *                              │                 │
 *                              │  Orquestrador   │
 *                              │  Principal      │
 *                              └────────┬────────┘
 *                                       │
 *         ┌─────────────────────────────┼─────────────────────────────┐
 *         │                             │                             │
 *         ▼                             ▼                             ▼
 * ┌─────────────────┐          ┌─────────────────┐          ┌─────────────────┐
 * │  TOTAL MEMORY   │          │   ORCHESTRATOR  │          │  SELF-IMPROVE   │
 * │     SYSTEM      │◀────────▶│                 │◀────────▶│     ENGINE      │
 * └─────────────────┘          └─────────────────┘          └─────────────────┘
 *
 * CAPACIDADES:
 * 1. Memoria total e persistente
 * 2. Orquestracao multi-agente
 * 3. Sessao e lifecycle management
 * 4. Processamento de input enriquecido
 * 5. Status e relatorios
 *
 * ADAPTADO DE: jarvis_autonomous_core.py (Mega Brain)
 * PARA: AIOS Core - integrando modulos JARVIS reescritos
 *
 * CRIADO: 2026-01-23
 * AUTOR: JARVIS Migration System
 */

import { PATHS, json, log } from './config.js';
import { JarvisOrchestrator, quickAnalyze, TaskComplexity, ExecutionStrategy } from './orchestrator.js';
import { JarvisTotalMemory, getMemory, MemoryType, ImportanceLevel } from './memory.js';
import { randomUUID } from 'crypto';
import { join } from 'path';

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

/**
 * Estado autonomo do JARVIS.
 */
export class JarvisAutonomousState {
  constructor() {
    this.sessionActive = false;
    this.currentSessionId = null;
    this.sessionsCompleted = 0;
    this.activeIntentions = [];
    this.recentDecisions = [];
    this.pendingProposals = [];
    this.proposalsMade = 0;
    this.proposalsApproved = 0;
    this.proposalsRejected = 0;
    this.lastUpdated = new Date().toISOString();
  }

  static statePath = join(PATHS.AIOS_CORE, 'data', 'jarvis_state.json');

  /**
   * Carrega estado do arquivo.
   */
  static load() {
    const data = json.load(JarvisAutonomousState.statePath, null, { logErrors: false });
    if (data) {
      const state = new JarvisAutonomousState();
      Object.assign(state, data);
      return state;
    }
    return new JarvisAutonomousState();
  }

  /**
   * Salva estado no arquivo.
   */
  save() {
    this.lastUpdated = new Date().toISOString();
    json.save(JarvisAutonomousState.statePath, this.toDict());
  }

  toDict() {
    return {
      sessionActive: this.sessionActive,
      currentSessionId: this.currentSessionId,
      sessionsCompleted: this.sessionsCompleted,
      activeIntentions: this.activeIntentions,
      recentDecisions: this.recentDecisions,
      pendingProposals: this.pendingProposals,
      proposalsMade: this.proposalsMade,
      proposalsApproved: this.proposalsApproved,
      proposalsRejected: this.proposalsRejected,
      lastUpdated: this.lastUpdated,
    };
  }
}

// ============================================================================
// JARVIS CORE
// ============================================================================

/**
 * Nucleo do sistema JARVIS Autonomo.
 *
 * Integra e coordena todos os subsistemas:
 * - Memoria Total
 * - Orquestrador Multi-Agente
 * - Motor de Auto-Melhoria (futuro)
 * - Operacao Continua
 */
export class JarvisAutonomousCore {
  constructor() {
    log.info('Inicializando JARVIS Autonomous Core...');

    // Inicializar subsistemas
    this.memory = new JarvisTotalMemory();
    this.orchestrator = new JarvisOrchestrator();
    this.state = JarvisAutonomousState.load();

    // Session tracking
    this.sessionActive = false;
    this.sessionId = null;

    log.success('JARVIS Autonomous Core pronto.');
  }

  // ========================================================================
  // LIFECYCLE
  // ========================================================================

  /**
   * Inicia uma nova sessao.
   *
   * @returns {Object} Greeting, contexto, e instrucoes
   */
  startSession() {
    const sessionId = this._generateSessionId();

    this.sessionActive = true;
    this.sessionId = sessionId;
    this.state.sessionActive = true;
    this.state.currentSessionId = sessionId;
    this.state.save();

    // Registrar na memoria
    this.memory.remember('Sessao iniciada: ' + sessionId, MemoryType.CONTEXT, {
      importance: ImportanceLevel.LOW,
      tags: ['session', 'start'],
    });

    // Buscar contexto recente
    const recentMemories = this.memory.recallRecent({ hours: 24, limit: 5 });
    const activeIntentions = this.memory.recallIntentions('active').slice(0, 3);
    const recentDecisions = this.memory.recallDecisions({ limit: 3 });

    // Construir greeting
    const greeting = this._buildGreeting(recentMemories, activeIntentions, recentDecisions);

    // Construir contexto
    const memoryContext = this.memory.getFullContextForPrompt('sessao anterior');

    const response = {
      greeting,
      context: {
        previousSession: recentMemories.length > 0,
        activeIntentions: activeIntentions.length,
        pendingDecisions: recentDecisions.length,
      },
      memoryContext,
      pendingProposals: this.state.pendingProposals.length,
      sessionId,
    };

    // Se ha propostas pendentes, adicionar lembrete
    if (this.state.pendingProposals.length > 0) {
      response.reminder = `Propostas pendentes de aprovacao: ${this.state.pendingProposals.length}`;
    }

    this._log('session_start', response);

    return response;
  }

  /**
   * Encerra a sessao atual.
   *
   * @param {Object} summary - Resumo opcional da sessao
   * @returns {Object} Handoff e recomendacoes
   */
  endSession(summary = null) {
    if (!this.sessionActive) {
      return { error: 'Nenhuma sessao ativa' };
    }

    // Registrar na memoria
    this.memory.remember('Sessao encerrada: ' + this.sessionId, MemoryType.CONTEXT, {
      importance: ImportanceLevel.LOW,
      tags: ['session', 'end'],
      metadata: summary ? { summary } : {},
    });

    // Atualizar estado
    this.state.sessionActive = false;
    this.state.sessionsCompleted += 1;
    this.state.save();

    this.sessionActive = false;

    // Construir handoff
    const handoff = this._buildHandoff(summary);
    const farewell = 'A disposicao, senhor. JARVIS em standby.';

    const response = {
      handoff,
      farewell,
      sessionDuration: this._calculateSessionDuration(),
      memoriesCreated: this.memory.sessionMemories.length,
    };

    this._log('session_end', response);

    return response;
  }

  // ========================================================================
  // PROCESSAMENTO DE INPUT
  // ========================================================================

  /**
   * Processa input do usuario atraves de todo o sistema.
   *
   * Este e o metodo principal que:
   * 1. Analisa o input com orquestrador
   * 2. Enriquece com memoria
   * 3. Detecta se precisa de agentes
   * 4. Gera contexto para resposta
   *
   * @param {string} userInput - Texto do usuario
   * @returns {Object} Contexto enriquecido e recomendacoes
   */
  processInput(userInput) {
    // 1. Registrar na memoria
    this.memory.rememberConversationTurn('user', userInput);

    // 2. Analisar com orquestrador
    const analysis = this.orchestrator.analyzeTask(userInput);

    // 3. Buscar memoria relevante
    const relevantMemories = this.memory.recall(userInput, { limit: 5 });

    // 4. Verificar intencoes ativas
    const activeIntentions = this.memory.recallIntentions('active').slice(0, 3);

    // 5. Construir contexto enriquecido
    const contextParts = [];

    // Contexto de memoria
    if (relevantMemories.length > 0) {
      contextParts.push(this._formatMemoryContext(relevantMemories));
    }

    // Contexto de intencoes
    if (activeIntentions.length > 0) {
      contextParts.push(this._formatIntentionsContext(activeIntentions));
    }

    // Contexto de orquestracao (se necessario)
    if (analysis.requiresAgents) {
      contextParts.push(this._formatOrchestrationContext(analysis));
    }

    // 6. Verificar comandos especiais
    const specialResponse = this._handleSpecialCommands(userInput);
    if (specialResponse) {
      return specialResponse;
    }

    // 7. Montar resposta
    const response = {
      contextInjection: contextParts.length > 0 ? contextParts.join('\n\n') : null,
      relevantMemories: relevantMemories.length,
      agentsRecommended: analysis.recommendedAgents,
      shouldConsultAgents: analysis.requiresAgents,
      complexity: analysis.getComplexityName(),
      strategy: analysis.strategy,
      reasoning: analysis.reasoning,
      activeIntentions: activeIntentions.map((i) => i.intention),
    };

    this._log('process_input', {
      inputPreview: userInput.slice(0, 100),
      memoriesFound: response.relevantMemories,
      agents: response.agentsRecommended,
    });

    return response;
  }

  /**
   * Registra resposta do JARVIS na memoria.
   *
   * @param {string} response - Texto da resposta
   * @param {Object} metadata - Metadados opcionais
   */
  recordResponse(response, metadata = {}) {
    this.memory.rememberConversationTurn('jarvis', response);

    // Detectar se resposta contem decisao
    const decisionKeywords = ['decidi', 'recomendo', 'sugiro', 'vou', 'optei'];
    if (decisionKeywords.some((kw) => response.toLowerCase().includes(kw))) {
      this.memory.remember('Resposta com recomendacao: ' + response.slice(0, 200) + '...', MemoryType.INSIGHT, {
        importance: ImportanceLevel.MEDIUM,
        tags: ['response', 'recommendation'],
        metadata,
      });
    }
  }

  // ========================================================================
  // MEMORIA E INTENCOES
  // ========================================================================

  /**
   * Registra uma intencao do usuario.
   *
   * @param {string} intention - A intencao expressa
   * @param {string} context - Contexto adicional
   * @returns {string} ID da intencao
   */
  rememberIntention(intention, context = '') {
    const intentionId = this.memory.rememberIntention(intention, context);

    // Adicionar as intencoes ativas
    if (!this.state.activeIntentions.includes(intention)) {
      this.state.activeIntentions.push(intention);
      this.state.activeIntentions = this.state.activeIntentions.slice(-10); // Keep last 10
      this.state.save();
    }

    return intentionId;
  }

  /**
   * Registra uma decisao tomada.
   *
   * @returns {string} ID da decisao
   */
  rememberDecision({ decision, reasoning, alternatives = [], impact = '' }) {
    const decisionId = this.memory.rememberDecision({
      decision,
      reasoning,
      alternatives,
      chosenBecause: reasoning,
      context: '',
      impact,
      madeBy: 'jarvis',
    });

    // Adicionar as decisoes recentes
    this.state.recentDecisions.push({
      id: decisionId,
      decision,
      timestamp: new Date().toISOString(),
    });
    this.state.recentDecisions = this.state.recentDecisions.slice(-20);
    this.state.save();

    return decisionId;
  }

  /**
   * Busca memorias relevantes.
   *
   * @param {string} query - Query de busca
   * @param {number} limit - Maximo de resultados
   * @returns {Array} Lista de memorias
   */
  recall(query, limit = 10) {
    const memories = this.memory.recall(query, { limit });
    return memories.map((m) => m.toDict());
  }

  // ========================================================================
  // COMANDOS ESPECIAIS
  // ========================================================================

  /**
   * Processa comandos especiais do usuario.
   * @private
   */
  _handleSpecialCommands(userInput) {
    const input = userInput.toLowerCase().trim();

    // Status
    if (input === 'status' || input === 'jarvis status') {
      const status = this.getStatus();
      return {
        specialResponse: true,
        type: 'status',
        data: status,
        formatted: this._formatStatus(status),
      };
    }

    // Memory stats
    if (input === 'memoria' || input === 'memory') {
      const stats = this.memory.getStatistics();
      return {
        specialResponse: true,
        type: 'memory_stats',
        data: stats,
        formatted: this._formatMemoryStats(stats),
      };
    }

    // Recent memories
    if (input.startsWith('lembrar') || input.startsWith('recall')) {
      const query = input.replace(/^(lembrar|recall)\s*/i, '') || 'recente';
      const memories = this.recall(query, 5);
      return {
        specialResponse: true,
        type: 'recall',
        data: memories,
        formatted: this._formatRecalledMemories(memories),
      };
    }

    return null;
  }

  // ========================================================================
  // STATUS E RELATORIOS
  // ========================================================================

  /**
   * Retorna status completo do sistema.
   */
  getStatus() {
    return {
      core: {
        sessionActive: this.sessionActive,
        sessionId: this.sessionId,
      },
      memory: this.memory.getStatistics(),
      state: this.state.toDict(),
      orchestrator: {
        taskHistoryCount: this.orchestrator.taskHistory.length,
        activeAgents: Object.keys(this.orchestrator.activeAgents).length,
      },
    };
  }

  // ========================================================================
  // FORMATACAO
  // ========================================================================

  /**
   * Constroi greeting de inicio de sessao.
   * @private
   */
  _buildGreeting(recentMemories, activeIntentions, recentDecisions) {
    const parts = ['Senhor. JARVIS online.'];

    if (recentMemories.length > 0) {
      parts.push(`Tenho ${recentMemories.length} memorias recentes da ultima sessao.`);
    }

    if (activeIntentions.length > 0) {
      parts.push(`Ha ${activeIntentions.length} intencoes ativas registradas.`);
    }

    if (recentDecisions.length > 0) {
      parts.push(`${recentDecisions.length} decisoes recentes para referencia.`);
    }

    parts.push('\nO que fazemos?');

    return parts.join('\n');
  }

  /**
   * Constroi handoff de fim de sessao.
   * @private
   */
  _buildHandoff(summary) {
    const parts = ['## HANDOFF DE SESSAO'];

    parts.push(`\n**Sessao:** ${this.sessionId}`);
    parts.push(`**Memorias criadas:** ${this.memory.sessionMemories.length}`);

    if (summary) {
      parts.push(`\n**Resumo:** ${JSON.stringify(summary)}`);
    }

    const recentDecisions = this.state.recentDecisions.slice(-3);
    if (recentDecisions.length > 0) {
      parts.push('\n**Decisoes desta sessao:**');
      for (const d of recentDecisions) {
        parts.push(`- ${d.decision}`);
      }
    }

    return parts.join('\n');
  }

  /**
   * Formata memorias para contexto.
   * @private
   */
  _formatMemoryContext(memories) {
    const parts = ['## MEMORIA JARVIS - Contexto Relevante'];
    for (const m of memories.slice(0, 5)) {
      parts.push(`- [${m.type}] ${m.content.slice(0, 150)}...`);
    }
    return parts.join('\n');
  }

  /**
   * Formata intencoes para contexto.
   * @private
   */
  _formatIntentionsContext(intentions) {
    const parts = ['## INTENCOES ATIVAS DO SENHOR'];
    for (const i of intentions) {
      parts.push(`- ${i.intention}`);
    }
    return parts.join('\n');
  }

  /**
   * Formata contexto de orquestracao.
   * @private
   */
  _formatOrchestrationContext(analysis) {
    const parts = ['## ORQUESTRACAO RECOMENDADA'];
    parts.push(`- Complexidade: ${analysis.getComplexityName()}`);
    parts.push(`- Estrategia: ${analysis.strategy}`);
    if (analysis.recommendedAgents.length > 0) {
      parts.push(`- Agentes: ${analysis.recommendedAgents.join(', ')}`);
    }
    parts.push(`- Raciocinio: ${analysis.reasoning}`);
    return parts.join('\n');
  }

  /**
   * Formata status do sistema.
   * @private
   */
  _formatStatus(status) {
    const parts = ['# JARVIS Status\n'];

    parts.push('## Sessao');
    parts.push(`- Ativa: ${status.core.sessionActive}`);
    parts.push(`- ID: ${status.core.sessionId || 'N/A'}`);
    parts.push('');

    parts.push('## Memoria');
    const mem = status.memory;
    parts.push(`- Total de memorias: ${mem.totalMemories || 0}`);
    parts.push(`- Decisoes: ${mem.totalDecisions || 0}`);
    parts.push(`- Mudancas de codigo: ${mem.totalCodeChanges || 0}`);
    parts.push('');

    parts.push('## Estado');
    const st = status.state;
    parts.push(`- Sessoes completadas: ${st.sessionsCompleted}`);
    parts.push(`- Intencoes ativas: ${st.activeIntentions.length}`);
    parts.push(`- Decisoes recentes: ${st.recentDecisions.length}`);

    return parts.join('\n');
  }

  /**
   * Formata estatisticas de memoria.
   * @private
   */
  _formatMemoryStats(stats) {
    const parts = ['# Estatisticas de Memoria\n'];
    parts.push(`- Total: ${stats.totalMemories}`);
    parts.push(`- Decisoes: ${stats.totalDecisions}`);
    parts.push(`- Codigo: ${stats.totalCodeChanges}`);
    parts.push(`- Intencoes ativas: ${stats.activeIntentions}`);
    parts.push(`\n## Por Tipo:`);
    for (const [type, count] of Object.entries(stats.byType || {})) {
      parts.push(`- ${type}: ${count}`);
    }
    return parts.join('\n');
  }

  /**
   * Formata memorias recuperadas.
   * @private
   */
  _formatRecalledMemories(memories) {
    if (memories.length === 0) {
      return 'Nenhuma memoria encontrada.';
    }
    const parts = [`# ${memories.length} Memorias Encontradas\n`];
    for (const m of memories) {
      parts.push(`## [${m.type}] ${m.createdAt}`);
      parts.push(m.content.slice(0, 300));
      parts.push('');
    }
    return parts.join('\n');
  }

  /**
   * Calcula duracao da sessao.
   * @private
   */
  _calculateSessionDuration() {
    // Simplificado - retorna tempo desde inicio da sessao
    return 'N/A';
  }

  /**
   * Gera ID de sessao.
   * @private
   */
  _generateSessionId() {
    const date = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '');
    return `session_${date}_${randomUUID().slice(0, 6)}`;
  }

  /**
   * Registra evento no log.
   * @private
   */
  _log(event, data) {
    const entry = {
      event,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      data,
    };
    json.append(PATHS.CORE_LOG, entry);
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let _coreInstance = null;

/**
 * Retorna instancia singleton do JARVIS Core.
 */
export function getJarvisCore() {
  if (_coreInstance === null) {
    _coreInstance = new JarvisAutonomousCore();
  }
  return _coreInstance;
}

// ============================================================================
// CLI
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
JARVIS Autonomous Core

Usage:
  node core.js start         Start session
  node core.js end           End session
  node core.js status        Show status
  node core.js process <text> Process input
  node core.js interactive   Interactive mode

Options:
  -h, --help     Show this help
`);
    return;
  }

  const core = getJarvisCore();
  const command = args[0];

  if (command === 'start') {
    const result = core.startSession();
    console.log(result.greeting);
    if (result.memoryContext) {
      console.log('\n' + result.memoryContext);
    }
  } else if (command === 'end') {
    const result = core.endSession();
    console.log(result.handoff);
    console.log('\n' + result.farewell);
  } else if (command === 'status') {
    const status = core.getStatus();
    console.log(core._formatStatus(status));
  } else if (command === 'process') {
    const input = args.slice(1).join(' ');
    if (!input) {
      console.log('Error: Input required');
      return;
    }
    const result = core.processInput(input);
    console.log(JSON.stringify(result, null, 2));
  } else if (command === 'interactive') {
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log('JARVIS Autonomous Core - Modo Interativo');
    console.log("Digite 'sair' para encerrar.\n");

    const startResult = core.startSession();
    console.log(startResult.greeting);

    const prompt = () => {
      rl.question('\nSenhor: ', (input) => {
        if (['sair', 'exit', 'quit'].includes(input.toLowerCase().trim())) {
          const endResult = core.endSession();
          console.log(endResult.farewell);
          rl.close();
          return;
        }

        if (input.trim()) {
          const result = core.processInput(input);
          if (result.contextInjection) {
            console.log('\n' + result.contextInjection);
          }
          console.log(
            `\n[Memorias: ${result.relevantMemories} | Agentes: ${result.agentsRecommended.join(', ') || 'nenhum'} | Complexidade: ${result.complexity}]`
          );
        }

        prompt();
      });
    };

    prompt();
  } else {
    console.log('Usage: node core.js [start|end|status|process|interactive]');
    console.log('       node core.js --help for more info');
  }
}

// Detecta se esta sendo executado diretamente
const isMainModule = process.argv[1]?.endsWith('core.js');
if (isMainModule) {
  main();
}

// ============================================================================
// EXPORTACOES DEFAULT
// ============================================================================

export default {
  JarvisAutonomousState,
  JarvisAutonomousCore,
  getJarvisCore,
};
