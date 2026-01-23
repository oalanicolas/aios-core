/**
 * ============================================================================
 *                         JARVIS - Entry Point
 * ============================================================================
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
 *         │                             │                             │
 *         └─────────────────────────────┼─────────────────────────────┘
 *                                       │
 *                              ┌────────▼────────┐
 *                              │   SPECIALIST    │
 *                              │     AGENTS      │
 *                              └─────────────────┘
 *
 * MODULOS INTEGRADOS:
 * - config.js: Configuracao centralizada, paths, utilities
 * - orchestrator.js: Motor de decisao multi-agente
 * - memory.js: Sistema de memoria total persistente
 * - core.js: Nucleo autonomo integrando tudo
 * - agents.js: Agentes especialistas
 * - self-improvement.js: Motor de auto-evolucao
 *
 * USO:
 * ```javascript
 * import JARVIS from './.aios-core/core/jarvis/index.js';
 *
 * // Iniciar sistema completo
 * const jarvis = JARVIS.initialize();
 * jarvis.startSession();
 *
 * // Ou usar componentes individuais
 * const { getMemory, getJarvisCore, getAgentsSystem } = JARVIS;
 * ```
 *
 * CRIADO: 2026-01-23
 * AUTOR: JARVIS Migration System
 */

// ============================================================================
// RE-EXPORTS FROM CONFIG
// ============================================================================

export {
  PATHS,
  PROJECT_ROOT,
  json,
  log,
  getTimestamp,
  getIsoTimestamp,
  ensureDirectory,
  fileExists,
} from './config.js';

// ============================================================================
// RE-EXPORTS FROM ORCHESTRATOR
// ============================================================================

export {
  TaskComplexity,
  AgentType,
  ExecutionStrategy,
  TaskAnalysis,
  OrchestrationPlan,
  JarvisOrchestrator,
  quickAnalyze,
  createPlan,
  getOrchestrationPrompt,
} from './orchestrator.js';

// ============================================================================
// RE-EXPORTS FROM MEMORY
// ============================================================================

export {
  MemoryType,
  ImportanceLevel,
  MemoryEntry,
  DecisionMemory,
  CodeChangeMemory,
  IntentionMemory,
  JarvisTotalMemory,
  getMemory,
} from './memory.js';

// ============================================================================
// RE-EXPORTS FROM CORE
// ============================================================================

export { JarvisAutonomousState, JarvisAutonomousCore, getJarvisCore } from './core.js';

// ============================================================================
// RE-EXPORTS FROM AGENTS
// ============================================================================

export {
  AgentRole,
  InterventionType,
  DecisionImportance,
  AgentIntervention,
  AgentProfile,
  AGENT_PROFILES,
  JarvisSpecialistAgents,
  getAgentForCodeReview,
  getAgentForArchitecture,
  getDevilAdvocate,
  shouldAgentsReview,
  getAgentInfo,
  listAgents,
  getAgentsSystem,
} from './agents.js';

// ============================================================================
// RE-EXPORTS FROM SELF-IMPROVEMENT
// ============================================================================

export {
  ImprovementType,
  ProposalStatus,
  DetectionSource,
  Gap,
  CodeProposal,
  LearningRecord,
  PatternDetector,
  BestPracticeChecker,
  RepetitionDetector,
  JarvisSelfImprovement,
  getSelfImprovement,
} from './self-improvement.js';

// ============================================================================
// UNIFIED JARVIS INTERFACE
// ============================================================================

import { PATHS, log } from './config.js';
import { JarvisOrchestrator } from './orchestrator.js';
import { JarvisTotalMemory, getMemory } from './memory.js';
import { JarvisAutonomousCore, getJarvisCore } from './core.js';
import { JarvisSpecialistAgents, getAgentsSystem } from './agents.js';
import { JarvisSelfImprovement, getSelfImprovement } from './self-improvement.js';

/**
 * Interface unificada do JARVIS.
 *
 * Fornece acesso conveniente a todos os subsistemas.
 */
export class JARVIS {
  constructor() {
    this._initialized = false;
    this._core = null;
    this._memory = null;
    this._orchestrator = null;
    this._agents = null;
    this._selfImprovement = null;
  }

  /**
   * Inicializa todos os subsistemas do JARVIS.
   *
   * @returns {JARVIS} Instancia inicializada
   */
  initialize() {
    if (this._initialized) {
      return this;
    }

    log.info('Inicializando JARVIS completo...');

    // Inicializar em ordem de dependencia
    this._memory = getMemory();
    this._orchestrator = new JarvisOrchestrator();
    this._agents = getAgentsSystem({ memorySystem: this._memory });
    this._selfImprovement = getSelfImprovement({ memorySystem: this._memory });
    this._core = getJarvisCore();

    this._initialized = true;
    log.success('JARVIS inicializado com sucesso.');

    return this;
  }

  /**
   * Retorna o sistema de memoria.
   * @returns {JarvisTotalMemory}
   */
  get memory() {
    if (!this._initialized) this.initialize();
    return this._memory;
  }

  /**
   * Retorna o orquestrador.
   * @returns {JarvisOrchestrator}
   */
  get orchestrator() {
    if (!this._initialized) this.initialize();
    return this._orchestrator;
  }

  /**
   * Retorna o sistema de agentes.
   * @returns {JarvisSpecialistAgents}
   */
  get agents() {
    if (!this._initialized) this.initialize();
    return this._agents;
  }

  /**
   * Retorna o motor de self-improvement.
   * @returns {JarvisSelfImprovement}
   */
  get selfImprovement() {
    if (!this._initialized) this.initialize();
    return this._selfImprovement;
  }

  /**
   * Retorna o core autonomo.
   * @returns {JarvisAutonomousCore}
   */
  get core() {
    if (!this._initialized) this.initialize();
    return this._core;
  }

  // ========================================================================
  // LIFECYCLE SHORTCUTS
  // ========================================================================

  /**
   * Inicia uma sessao JARVIS.
   * @returns {Object} Resultado do inicio de sessao
   */
  startSession() {
    return this.core.startSession();
  }

  /**
   * Encerra a sessao atual.
   * @param {Object} [summary] - Resumo opcional
   * @returns {Object} Resultado do encerramento
   */
  endSession(summary = null) {
    return this.core.endSession(summary);
  }

  /**
   * Processa input do usuario.
   * @param {string} input - Input do usuario
   * @returns {Object} Contexto enriquecido
   */
  processInput(input) {
    return this.core.processInput(input);
  }

  // ========================================================================
  // MEMORY SHORTCUTS
  // ========================================================================

  /**
   * Lembra algo.
   * @param {string} content - Conteudo
   * @param {string} [type] - Tipo de memoria
   * @param {Object} [options] - Opcoes
   * @returns {string} ID da memoria
   */
  remember(content, type, options) {
    return this.memory.remember(content, type, options);
  }

  /**
   * Busca memorias.
   * @param {string} query - Query de busca
   * @param {Object} [options] - Opcoes
   * @returns {Array} Memorias encontradas
   */
  recall(query, options) {
    return this.memory.recall(query, options);
  }

  /**
   * Registra uma decisao.
   */
  rememberDecision(params) {
    return this.memory.rememberDecision(params);
  }

  // ========================================================================
  // ORCHESTRATION SHORTCUTS
  // ========================================================================

  /**
   * Analisa uma tarefa.
   * @param {string} input - Input do usuario
   * @returns {Object} Analise da tarefa
   */
  analyzeTask(input) {
    return this.orchestrator.analyzeTask(input);
  }

  /**
   * Cria plano de orquestracao.
   * @param {Object} analysis - Analise da tarefa
   * @returns {Object} Plano de orquestracao
   */
  createPlan(analysis) {
    return this.orchestrator.createOrchestrationPlan(analysis);
  }

  // ========================================================================
  // AGENTS SHORTCUTS
  // ========================================================================

  /**
   * Detecta agentes relevantes.
   * @param {string} content - Conteudo
   * @returns {string[]} Lista de roles de agentes
   */
  detectAgents(content) {
    return this.agents.detectRelevantAgents(content);
  }

  /**
   * Obtem prompt de um agente.
   * @param {string} role - Role do agente
   * @param {string} content - Conteudo para analisar
   * @param {Object} [context] - Contexto adicional
   * @returns {string} Prompt formatado
   */
  getAgentPrompt(role, content, context) {
    return this.agents.getAgentPrompt(role, content, context);
  }

  // ========================================================================
  // SELF-IMPROVEMENT SHORTCUTS
  // ========================================================================

  /**
   * Escaneia arquivo por oportunidades de melhoria.
   * @param {string} filePath - Caminho do arquivo
   * @returns {Array} Gaps encontrados
   */
  scanFile(filePath) {
    return this.selfImprovement.scanFile(filePath);
  }

  /**
   * Escaneia diretorio.
   * @param {string} directory - Diretorio
   * @param {string[]} [extensions] - Extensoes
   * @returns {Array} Gaps encontrados
   */
  scanDirectory(directory, extensions) {
    return this.selfImprovement.scanDirectory(directory, extensions);
  }

  // ========================================================================
  // STATUS & REPORTS
  // ========================================================================

  /**
   * Retorna status completo do sistema.
   * @returns {Object}
   */
  getStatus() {
    return {
      initialized: this._initialized,
      core: this._initialized ? this.core.getStatus() : null,
      memory: this._initialized ? this.memory.getStatistics() : null,
      agents: this._initialized ? this.agents.getStatistics() : null,
      selfImprovement: this._initialized ? this.selfImprovement.getStatusReport() : null,
    };
  }

  /**
   * Gera contexto completo para prompt.
   * @param {string} [query] - Query opcional
   * @returns {string} Contexto formatado
   */
  getContextForPrompt(query = '') {
    const parts = [];

    // Memoria
    if (this._memory) {
      const memoryContext = this.memory.getFullContextForPrompt(query);
      if (memoryContext) {
        parts.push(memoryContext);
      }
    }

    // Learnings
    if (this._selfImprovement) {
      const learnings = this.selfImprovement.getLearningsForContext();
      if (learnings) {
        parts.push(learnings);
      }
    }

    return parts.join('\n\n');
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let _jarvisInstance = null;

/**
 * Retorna instancia singleton do JARVIS.
 * @returns {JARVIS}
 */
export function getJARVIS() {
  if (_jarvisInstance === null) {
    _jarvisInstance = new JARVIS();
  }
  return _jarvisInstance;
}

// ============================================================================
// QUICK START FUNCTIONS
// ============================================================================

/**
 * Inicializa e retorna JARVIS pronto para uso.
 * @returns {JARVIS}
 */
export function initializeJARVIS() {
  return getJARVIS().initialize();
}

/**
 * Inicia sessao JARVIS rapidamente.
 * @returns {Object} Resultado do inicio
 */
export function quickStart() {
  const jarvis = initializeJARVIS();
  return jarvis.startSession();
}

// ============================================================================
// CLI
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
JARVIS - Integrated AI Assistant System

Usage:
  node index.js start          Start JARVIS session
  node index.js status         Show system status
  node index.js interactive    Interactive mode
  node index.js info           Show module information

Options:
  -h, --help     Show this help
`);
    return;
  }

  const jarvis = initializeJARVIS();
  const command = args[0];

  if (command === 'start') {
    const result = jarvis.startSession();
    console.log(result.greeting);
    if (result.memoryContext) {
      console.log('\n' + result.memoryContext);
    }
  } else if (command === 'status') {
    const status = jarvis.getStatus();
    console.log(JSON.stringify(status, null, 2));
  } else if (command === 'info') {
    console.log(`
JARVIS - Just A Rather Very Intelligent System

Modules:
  - config.js          Configuration and utilities
  - orchestrator.js    Multi-agent decision engine
  - memory.js          Total memory system
  - core.js            Autonomous core
  - agents.js          Specialist agents (6 agents)
  - self-improvement.js  Auto-evolution engine

Version: 1.0.0 (AIOS Port)
Origin: Mega Brain (Python) -> AIOS Core (JavaScript)
`);
  } else if (command === 'interactive') {
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log('JARVIS - Modo Interativo');
    console.log("Digite 'sair' para encerrar.\n");

    const startResult = jarvis.startSession();
    console.log(startResult.greeting);

    const prompt = () => {
      rl.question('\nSenhor: ', (input) => {
        if (['sair', 'exit', 'quit'].includes(input.toLowerCase().trim())) {
          const endResult = jarvis.endSession();
          console.log(endResult.farewell);
          rl.close();
          return;
        }

        if (input.trim()) {
          const result = jarvis.processInput(input);
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
    console.log('JARVIS - Sistema Integrado');
    console.log('');
    console.log('Usage: node index.js [start|status|info|interactive]');
    console.log('       node index.js --help for more info');
  }
}

// Detecta se esta sendo executado diretamente
const isMainModule = process.argv[1]?.endsWith('index.js');
if (isMainModule) {
  main();
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  // Main class
  JARVIS,
  getJARVIS,
  initializeJARVIS,
  quickStart,

  // Shortcuts to singleton getters
  getMemory,
  getJarvisCore,
  getAgentsSystem,
  getSelfImprovement,

  // Paths and config
  PATHS,
};
