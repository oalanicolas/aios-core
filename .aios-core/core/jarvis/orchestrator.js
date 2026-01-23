/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                        JARVIS ORCHESTRATOR                                     ║
 * ║                                                                                ║
 * ║  O cerebro de decisao do sistema multi-agente.                                ║
 * ║  Analisa tarefas e decide quando/como usar sub-agentes.                       ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * RESPONSABILIDADES:
 * 1. Analisar complexidade de tarefas
 * 2. Decidir se precisa de sub-agentes
 * 3. Selecionar agentes apropriados
 * 4. Definir estrategia de execucao
 * 5. Coordenar sintese de resultados
 *
 * ADAPTADO DE: jarvis_orchestrator.py (Mega Brain)
 * PARA: AIOS Core (aios-bilhon)
 *
 * CRIADO: 2026-01-23
 * AUTOR: JARVIS Migration System
 */

import { json, log } from './config.js';
import { randomUUID } from 'crypto';

// ============================================================================
// ENUMS E TIPOS
// ============================================================================

/**
 * Niveis de complexidade de tarefa.
 */
export const TaskComplexity = Object.freeze({
  TRIVIAL: 1,    // Resposta direta, sem agentes
  SIMPLE: 2,     // Um agente pode resolver
  MODERATE: 3,   // 2-3 agentes colaborando
  COMPLEX: 4,    // Multiplos agentes + sintese
  CRITICAL: 5,   // War Room - todos os recursos
});

/**
 * Tipos de agentes disponiveis.
 */
export const AgentType = Object.freeze({
  // Agentes de Analise
  RESEARCHER: 'researcher',
  ANALYST: 'analyst',

  // Agentes de Dominio
  SALES_EXPERT: 'sales_expert',
  MARKETING_EXPERT: 'marketing_expert',
  OPERATIONS_EXPERT: 'operations_expert',
  FINANCE_EXPERT: 'finance_expert',

  // Agentes Tecnicos
  ARCHITECT: 'architect',
  DEVELOPER: 'developer',
  QA: 'qa',
  DEVOPS: 'devops',

  // Agentes de Conteudo
  WRITER: 'writer',
  EDITOR: 'editor',

  // Meta-Agentes
  CRITIC: 'critic',
  SYNTHESIZER: 'synthesizer',
  DEVILS_ADVOCATE: 'devils_advocate',
});

/**
 * Estrategias de execucao.
 */
export const ExecutionStrategy = Object.freeze({
  DIRECT: 'direct',             // JARVIS responde direto
  SINGLE_AGENT: 'single',       // Um agente resolve
  SEQUENTIAL: 'sequential',     // Agentes em sequencia
  PARALLEL: 'parallel',         // Agentes em paralelo
  HIERARCHICAL: 'hierarchical', // Agente supervisor + workers
  WAR_ROOM: 'war_room',         // Debate entre multiplos agentes
});

// ============================================================================
// PADROES DE DETECCAO
// ============================================================================

/**
 * Padroes que indicam necessidade de diferentes tipos de agentes.
 */
const AGENT_TRIGGERS = {
  [AgentType.RESEARCHER]: [
    /\b(pesquis|busca|encontr|localiz|investig)\w*\b/i,
    /\b(fonte|referencia|dado|informacao)\w*\b/i,
    /\bquais?\s+(sao|existe|ha)\b/i,
    /\b(me\s+)?(mostr|list|enum)\w*\b/i,
  ],
  [AgentType.ANALYST]: [
    /\b(analis|examin|avali|compar)\w*\b/i,
    /\b(padrao|tendencia|insight|diagnostico)\w*\b/i,
    /\b(por\s*que|como|qual\s+a?\s+razao)\b/i,
    /\b(metricas?|kpis?|indicador)\w*\b/i,
  ],
  [AgentType.SALES_EXPERT]: [
    /\b(vend|closer|prospect|lead|funil)\w*\b/i,
    /\b(comiss|compensacao|ote|salario)\w*\b/i,
    /\b(objec|fechamento|negoci|cliente)\w*\b/i,
    /\b(high.?ticket|b2b|saas)\b/i,
  ],
  [AgentType.MARKETING_EXPERT]: [
    /\b(marketing|branding|posicionamento)\w*\b/i,
    /\b(campanha|anuncio|trafego|conversao)\w*\b/i,
    /\b(icp|persona|publico.?alvo)\w*\b/i,
    /\b(copy|headline|cta)\w*\b/i,
  ],
  [AgentType.OPERATIONS_EXPERT]: [
    /\b(operac|processo|fluxo|workflow)\w*\b/i,
    /\b(eficiencia|otimiz|automat)\w*\b/i,
    /\b(sop|procedimento|rotina)\w*\b/i,
    /\b(escala|gargalo|bottleneck)\w*\b/i,
  ],
  [AgentType.FINANCE_EXPERT]: [
    /\b(financ|custo|receita|lucro|margem)\w*\b/i,
    /\b(roi|cac|ltv|mrr|arr)\b/i,
    /\b(orcamento|budget|investimento)\w*\b/i,
    /\b(unit\s*economics|payback)\b/i,
  ],
  [AgentType.ARCHITECT]: [
    /\b(arquitetur|estrutur|design|model)\w*\b/i,
    /\b(sistema|integra|api|banco)\w*\b/i,
    /\b(escalab|performan|infraestrutura)\w*\b/i,
  ],
  [AgentType.DEVELOPER]: [
    /\b(codigo|script|programa|desenvolv)\w*\b/i,
    /\b(python|javascript|sql|api)\b/i,
    /\b(bug|erro|fix|implementa)\w*\b/i,
    /\b(funcao|classe|metodo|modulo)\w*\b/i,
  ],
  [AgentType.WRITER]: [
    /\b(escrev|redigi|criar?\s+texto|document)\w*\b/i,
    /\b(artigo|post|email|mensagem)\w*\b/i,
    /\b(tom|estilo|narrativa)\w*\b/i,
  ],
  [AgentType.CRITIC]: [
    /\b(critic|revis|avali|feedback)\w*\b/i,
    /\b(problem|falha|risco|fraqueza)\w*\b/i,
    /\b(melhora|sugest|recomend)\w*\b/i,
  ],
};

/**
 * Padroes de complexidade.
 */
const COMPLEXITY_INDICATORS = {
  [TaskComplexity.TRIVIAL]: [
    /^(oi|ola|bom\s*dia|boa\s*tarde|boa\s*noite)\b/i,
    /\b(obrigado|valeu|thanks)\b/i,
    /^(sim|nao|ok|entendi)\b/i,
  ],
  [TaskComplexity.SIMPLE]: [
    /\b(o\s+que\s+e|defina?|explique?)\b/i,
    /\b(qual\s+(e|sao))\b/i,
    /\b(me\s+diga|me\s+fale)\b/i,
  ],
  [TaskComplexity.MODERATE]: [
    /\b(como\s+(fazer|criar|implement))\b/i,
    /\b(analis[ea]|compar[ea]|avali[ea])\b/i,
    /\b(passo.?a.?passo|tutorial|guia)\b/i,
  ],
  [TaskComplexity.COMPLEX]: [
    /\b(estrategia|plano|roadmap)\b/i,
    /\b(completo|detalhado|profundo)\b/i,
    /\b(multip|vari|divers)\w*\s+(perspectiva|fonte|angulo)\b/i,
  ],
  [TaskComplexity.CRITICAL]: [
    /\b(war\s*room|debate|conselho)\b/i,
    /\b(decisao\s+critica|urgente|importante)\b/i,
    /\b(todos?\s+os?\s+agentes?|forca\s+total)\b/i,
  ],
};

/**
 * Palavras que aumentam complexidade.
 */
const COMPLEXITY_BOOSTERS = [
  /\be\s+tambem\b/i,
  /\balem\s+disso\b/i,
  /\bpor\s+outro\s+lado\b/i,
  /\bcomparando\b/i,
  /\bversus\b/i,
  /\bvs\.?\b/i,
  /\bpros?\s+e\s+contras?\b/i,
];

/**
 * Stopwords em portugues para extracao de keywords.
 */
const STOPWORDS = new Set([
  'o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas',
  'de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na',
  'por', 'para', 'com', 'sem', 'que', 'qual', 'como',
  'e', 'sao', 'foi', 'eram', 'ser', 'estar', 'ter',
  'me', 'te', 'se', 'nos', 'vos', 'lhe', 'lhes',
  'eu', 'tu', 'ele', 'ela', 'nos', 'eles', 'elas',
  'este', 'esta', 'esse', 'essa', 'aquele', 'aquela',
  'isso', 'isto', 'aquilo', 'e', 'ou', 'mas', 'porem',
]);

/**
 * Keywords por dominio.
 */
const DOMAIN_KEYWORDS = {
  sales: ['venda', 'closer', 'prospect', 'lead', 'cliente', 'negociacao'],
  marketing: ['marketing', 'campanha', 'trafego', 'conversao', 'copy'],
  operations: ['operacao', 'processo', 'fluxo', 'eficiencia', 'sop'],
  finance: ['financeiro', 'custo', 'receita', 'roi', 'margem'],
  product: ['produto', 'feature', 'roadmap', 'mvp', 'usuario'],
  hr: ['contratacao', 'time', 'equipe', 'cultura', 'onboarding'],
  tech: ['codigo', 'sistema', 'api', 'banco', 'arquitetura'],
};

// ============================================================================
// DATA CLASSES
// ============================================================================

/**
 * Resultado da analise de uma tarefa.
 */
export class TaskAnalysis {
  constructor({
    originalInput,
    complexity,
    requiresAgents,
    recommendedAgents,
    strategy,
    reasoning,
    keywords = [],
    domain = null,
    estimatedTime = null,
    confidence = 0.0,
  }) {
    this.originalInput = originalInput;
    this.complexity = complexity;
    this.requiresAgents = requiresAgents;
    this.recommendedAgents = recommendedAgents;
    this.strategy = strategy;
    this.reasoning = reasoning;
    this.keywords = keywords;
    this.domain = domain;
    this.estimatedTime = estimatedTime;
    this.confidence = confidence;
  }

  toDict() {
    return {
      originalInput: this.originalInput,
      complexity: this.getComplexityName(),
      requiresAgents: this.requiresAgents,
      recommendedAgents: this.recommendedAgents,
      strategy: this.strategy,
      reasoning: this.reasoning,
      keywords: this.keywords,
      domain: this.domain,
      estimatedTime: this.estimatedTime,
      confidence: this.confidence,
    };
  }

  getComplexityName() {
    const names = {
      [TaskComplexity.TRIVIAL]: 'TRIVIAL',
      [TaskComplexity.SIMPLE]: 'SIMPLE',
      [TaskComplexity.MODERATE]: 'MODERATE',
      [TaskComplexity.COMPLEX]: 'COMPLEX',
      [TaskComplexity.CRITICAL]: 'CRITICAL',
    };
    return names[this.complexity] || 'UNKNOWN';
  }
}

/**
 * Plano de orquestracao para uma tarefa.
 */
export class OrchestrationPlan {
  constructor({
    taskId,
    analysis,
    agentsToActivate,
    executionOrder,
    synthesisStrategy,
    fallbackPlan = null,
    createdAt = new Date().toISOString(),
  }) {
    this.taskId = taskId;
    this.analysis = analysis;
    this.agentsToActivate = agentsToActivate;
    this.executionOrder = executionOrder;
    this.synthesisStrategy = synthesisStrategy;
    this.fallbackPlan = fallbackPlan;
    this.createdAt = createdAt;
  }

  toDict() {
    return {
      taskId: this.taskId,
      analysis: this.analysis.toDict(),
      agentsToActivate: this.agentsToActivate,
      executionOrder: this.executionOrder,
      synthesisStrategy: this.synthesisStrategy,
      fallbackPlan: this.fallbackPlan,
      createdAt: this.createdAt,
    };
  }
}

// ============================================================================
// ORCHESTRATOR
// ============================================================================

/**
 * Orquestrador principal do sistema multi-agente JARVIS.
 *
 * Analisa tarefas e decide a melhor estrategia de execucao,
 * incluindo quais agentes ativar e como coordena-los.
 */
export class JarvisOrchestrator {
  /**
   * Inicializa o orquestrador.
   *
   * @param {Object} config - Configuracao do orquestrador (opcional)
   */
  constructor(config = {}) {
    this.config = {
      minConfidenceThreshold: 0.6,
      maxAgentsPerTask: 5,
      enableWarRoom: true,
      defaultSynthesisStrategy: 'weighted_merge',
      logDecisions: true,
      ...config,
    };
    this.activeAgents = {};
    this.taskHistory = [];
  }

  /**
   * Analisa uma tarefa do usuario e determina sua complexidade
   * e necessidades de agentes.
   *
   * @param {string} userInput - Texto da tarefa/pergunta do usuario
   * @returns {TaskAnalysis} Analise com todos os detalhes
   */
  analyzeTask(userInput) {
    const inputLower = userInput.toLowerCase();

    // 1. Detectar complexidade base
    let complexity = this._detectComplexity(inputLower);

    // 2. Detectar agentes necessarios
    const detectedAgents = this._detectNeededAgents(inputLower);

    // 3. Extrair keywords e dominio
    const keywords = this._extractKeywords(inputLower);
    const domain = this._detectDomain(keywords);

    // 4. Ajustar complexidade baseado em agentes detectados
    if (detectedAgents.length >= 3) {
      complexity = Math.max(complexity, TaskComplexity.COMPLEX);
    } else if (detectedAgents.length >= 2) {
      complexity = Math.max(complexity, TaskComplexity.MODERATE);
    }

    // 5. Verificar boosters de complexidade
    const boosterCount = COMPLEXITY_BOOSTERS.filter((pattern) =>
      pattern.test(inputLower)
    ).length;
    if (boosterCount >= 2) {
      complexity = Math.min(complexity + 1, TaskComplexity.CRITICAL);
    }

    // 6. Determinar estrategia
    const strategy = this._determineStrategy(complexity, detectedAgents);

    // 7. Calcular confianca
    const confidence = this._calculateConfidence(complexity, detectedAgents, keywords);

    // 8. Gerar reasoning
    const reasoning = this._generateReasoning(complexity, detectedAgents, strategy, confidence);

    // 9. Criar analise
    const analysis = new TaskAnalysis({
      originalInput: userInput,
      complexity,
      requiresAgents: complexity >= TaskComplexity.SIMPLE && detectedAgents.length > 0,
      recommendedAgents: detectedAgents,
      strategy,
      reasoning,
      keywords,
      domain,
      estimatedTime: this._estimateTime(complexity, detectedAgents.length),
      confidence,
    });

    // Registrar no historico
    this.taskHistory.push(analysis);

    if (this.config.logDecisions) {
      log.debug(`Task analyzed: complexity=${analysis.getComplexityName()}, agents=${detectedAgents.length}`);
    }

    return analysis;
  }

  /**
   * Detecta complexidade base da tarefa.
   * @private
   */
  _detectComplexity(text) {
    // Verificar em ordem reversa (mais complexo primeiro)
    const complexities = [
      TaskComplexity.CRITICAL,
      TaskComplexity.COMPLEX,
      TaskComplexity.MODERATE,
      TaskComplexity.SIMPLE,
      TaskComplexity.TRIVIAL,
    ];

    for (const complexity of complexities) {
      const patterns = COMPLEXITY_INDICATORS[complexity] || [];
      for (const pattern of patterns) {
        if (pattern.test(text)) {
          return complexity;
        }
      }
    }

    // Default baseado no tamanho
    if (text.length < 20) return TaskComplexity.TRIVIAL;
    if (text.length < 100) return TaskComplexity.SIMPLE;
    return TaskComplexity.MODERATE;
  }

  /**
   * Detecta quais agentes sao necessarios baseado no texto.
   * @private
   */
  _detectNeededAgents(text) {
    const scores = {};

    for (const [agentType, patterns] of Object.entries(AGENT_TRIGGERS)) {
      let score = 0;
      for (const pattern of patterns) {
        const matches = text.match(new RegExp(pattern, 'gi'));
        if (matches) score += matches.length;
      }
      if (score > 0) {
        scores[agentType] = score;
      }
    }

    // Ordenar por score
    const sortedAgents = Object.entries(scores).sort((a, b) => b[1] - a[1]);

    // Pegar agentes com score significativo
    const maxScore = sortedAgents[0]?.[1] || 0;
    const threshold = maxScore * 0.5;

    const detected = [];
    for (const [agentType, score] of sortedAgents) {
      if (score >= threshold || score >= 2) {
        detected.push(agentType);
        if (detected.length >= this.config.maxAgentsPerTask) break;
      }
    }

    return detected;
  }

  /**
   * Extrai palavras-chave relevantes do texto.
   * @private
   */
  _extractKeywords(text) {
    // Tokenizar (palavras com 3+ caracteres)
    const words = text.match(/\b[a-záéíóúâêîôûãõç]{3,}\b/gi) || [];

    // Filtrar stopwords e remover duplicatas
    const seen = new Set();
    const keywords = [];

    for (const word of words) {
      const w = word.toLowerCase();
      if (!STOPWORDS.has(w) && !seen.has(w)) {
        seen.add(w);
        keywords.push(w);
      }
    }

    return keywords.slice(0, 15);
  }

  /**
   * Detecta o dominio principal da tarefa.
   * @private
   */
  _detectDomain(keywords) {
    const scores = {};

    for (const keyword of keywords) {
      for (const [domain, domainWords] of Object.entries(DOMAIN_KEYWORDS)) {
        for (const dw of domainWords) {
          if (dw.includes(keyword) || keyword.includes(dw)) {
            scores[domain] = (scores[domain] || 0) + 1;
          }
        }
      }
    }

    const maxDomain = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
    return maxDomain && maxDomain[1] > 0 ? maxDomain[0] : null;
  }

  /**
   * Determina a melhor estrategia de execucao.
   * @private
   */
  _determineStrategy(complexity, agents) {
    if (complexity === TaskComplexity.TRIVIAL) {
      return ExecutionStrategy.DIRECT;
    }

    if (complexity === TaskComplexity.SIMPLE) {
      if (agents.length <= 1) {
        return agents.length ? ExecutionStrategy.SINGLE_AGENT : ExecutionStrategy.DIRECT;
      }
      return ExecutionStrategy.SEQUENTIAL;
    }

    if (complexity === TaskComplexity.MODERATE) {
      if (agents.length <= 2) return ExecutionStrategy.SEQUENTIAL;
      return ExecutionStrategy.PARALLEL;
    }

    if (complexity === TaskComplexity.COMPLEX) {
      return ExecutionStrategy.HIERARCHICAL;
    }

    if (complexity === TaskComplexity.CRITICAL) {
      return ExecutionStrategy.WAR_ROOM;
    }

    return ExecutionStrategy.DIRECT;
  }

  /**
   * Calcula nivel de confianca na analise.
   * @private
   */
  _calculateConfidence(complexity, agents, keywords) {
    let confidence = 0.5; // Base

    // Mais keywords = mais confianca
    confidence += Math.min(keywords.length * 0.03, 0.2);

    // Agentes detectados = mais confianca
    confidence += Math.min(agents.length * 0.1, 0.2);

    // Extremos sao mais faceis de detectar
    if (complexity === TaskComplexity.TRIVIAL || complexity === TaskComplexity.CRITICAL) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Estima tempo de execucao.
   * @private
   */
  _estimateTime(complexity, numAgents) {
    const baseTimes = {
      [TaskComplexity.TRIVIAL]: '< 5 segundos',
      [TaskComplexity.SIMPLE]: '10-30 segundos',
      [TaskComplexity.MODERATE]: '1-2 minutos',
      [TaskComplexity.COMPLEX]: '3-5 minutos',
      [TaskComplexity.CRITICAL]: '5-10 minutos',
    };
    return baseTimes[complexity] || 'indeterminado';
  }

  /**
   * Gera explicacao do raciocinio da analise.
   * @private
   */
  _generateReasoning(complexity, agents, strategy, confidence) {
    const parts = [];

    // Complexidade
    const complexityReasons = {
      [TaskComplexity.TRIVIAL]: 'Tarefa trivial - resposta direta sem necessidade de especialistas.',
      [TaskComplexity.SIMPLE]: 'Tarefa simples - um especialista pode resolver adequadamente.',
      [TaskComplexity.MODERATE]: 'Tarefa moderada - requer colaboracao entre especialistas.',
      [TaskComplexity.COMPLEX]: 'Tarefa complexa - multiplas perspectivas necessarias.',
      [TaskComplexity.CRITICAL]: 'Tarefa critica - War Room recomendado para decisao robusta.',
    };
    parts.push(complexityReasons[complexity]);

    // Agentes
    if (agents.length > 0) {
      const agentNames = agents.map((a) =>
        a.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
      );
      parts.push(`Especialistas recomendados: ${agentNames.join(', ')}.`);
    }

    // Estrategia
    const strategyReasons = {
      [ExecutionStrategy.DIRECT]: 'Execucao direta pelo JARVIS.',
      [ExecutionStrategy.SINGLE_AGENT]: 'Delegacao para um especialista.',
      [ExecutionStrategy.SEQUENTIAL]: 'Execucao sequencial - cada agente complementa o anterior.',
      [ExecutionStrategy.PARALLEL]: 'Execucao paralela - agentes trabalham simultaneamente.',
      [ExecutionStrategy.HIERARCHICAL]: 'Execucao hierarquica - agente supervisor coordena workers.',
      [ExecutionStrategy.WAR_ROOM]: 'War Room - debate estruturado entre todos os especialistas.',
    };
    parts.push(strategyReasons[strategy]);

    // Confianca
    if (confidence >= 0.8) {
      parts.push('Alta confianca na analise.');
    } else if (confidence >= 0.6) {
      parts.push('Confianca moderada na analise.');
    } else {
      parts.push('Baixa confianca - considere fornecer mais contexto.');
    }

    return parts.join(' ');
  }

  /**
   * Cria um plano detalhado de orquestracao baseado na analise.
   *
   * @param {TaskAnalysis} analysis - Analise da tarefa
   * @returns {OrchestrationPlan} Plano com todos os detalhes de execucao
   */
  createOrchestrationPlan(analysis) {
    const taskId = randomUUID().slice(0, 8);

    // Preparar agentes para ativacao
    const agentsToActivate = analysis.recommendedAgents.map((agentType) => ({
      type: agentType,
      instanceId: `${agentType}_${taskId}`,
      context: {
        task: analysis.originalInput,
        domain: analysis.domain,
        keywords: analysis.keywords,
      },
      priority: 'normal',
    }));

    // Determinar ordem de execucao
    const executionOrder = this._planExecutionOrder(analysis.strategy, agentsToActivate);

    // Estrategia de sintese
    const synthesisStrategy = this._determineSynthesisStrategy(analysis);

    // Plano de fallback
    const fallbackPlan = this._createFallbackPlan(analysis);

    return new OrchestrationPlan({
      taskId,
      analysis,
      agentsToActivate,
      executionOrder,
      synthesisStrategy,
      fallbackPlan,
    });
  }

  /**
   * Planeja ordem de execucao dos agentes.
   * @private
   */
  _planExecutionOrder(strategy, agents) {
    if (strategy === ExecutionStrategy.DIRECT) {
      return ['jarvis_direct'];
    }

    if (strategy === ExecutionStrategy.SINGLE_AGENT || strategy === ExecutionStrategy.SEQUENTIAL) {
      return agents.map((a) => a.instanceId);
    }

    if (strategy === ExecutionStrategy.PARALLEL) {
      const parallelGroup = agents.map((a) => a.instanceId);
      return [`parallel:${parallelGroup.join(',')}`, 'synthesizer'];
    }

    if (strategy === ExecutionStrategy.HIERARCHICAL) {
      if (agents.length > 0) {
        const supervisor = agents[0].instanceId;
        const workers = agents.slice(1).map((a) => a.instanceId);
        return [`supervisor:${supervisor}`, `workers:${workers.join(',')}`, 'synthesizer'];
      }
    }

    if (strategy === ExecutionStrategy.WAR_ROOM) {
      const allAgents = agents.map((a) => a.instanceId);
      return [
        `war_room_setup:${allAgents.join(',')}`,
        'opening_statements',
        'debate_round_1',
        'debate_round_2',
        'synthesis',
        'final_verdict',
      ];
    }

    return ['jarvis_direct'];
  }

  /**
   * Determina como sintetizar resultados dos agentes.
   * @private
   */
  _determineSynthesisStrategy(analysis) {
    if (analysis.strategy === ExecutionStrategy.WAR_ROOM) {
      return 'consensus_building';
    }

    if (analysis.strategy === ExecutionStrategy.HIERARCHICAL) {
      return 'supervisor_review';
    }

    if (analysis.complexity >= TaskComplexity.COMPLEX) {
      return 'weighted_merge_with_critic';
    }

    if (analysis.recommendedAgents.length >= 2) {
      return 'weighted_merge';
    }

    return 'direct_pass';
  }

  /**
   * Cria plano de fallback caso a estrategia principal falhe.
   * @private
   */
  _createFallbackPlan(analysis) {
    if (analysis.complexity >= TaskComplexity.COMPLEX) {
      return 'reduce_to_sequential_execution';
    }

    if (analysis.recommendedAgents.length > 1) {
      return 'reduce_to_single_best_agent';
    }

    return 'jarvis_direct_response';
  }

  /**
   * Gera o prompt para JARVIS executar o plano de orquestracao.
   *
   * @param {OrchestrationPlan} plan - Plano de orquestracao
   * @returns {string} Prompt formatado para execucao
   */
  getOrchestrationPrompt(plan) {
    const parts = [];

    // Header
    parts.push(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║  JARVIS ORCHESTRATION PLAN - Task #${plan.taskId}
╚═══════════════════════════════════════════════════════════════════════════════╝

TAREFA ORIGINAL:
${plan.analysis.originalInput}

ANALISE:
- Complexidade: ${plan.analysis.getComplexityName()}
- Dominio: ${plan.analysis.domain || 'Geral'}
- Confianca: ${(plan.analysis.confidence * 100).toFixed(0)}%
- Estrategia: ${plan.analysis.strategy}

RACIOCINIO:
${plan.analysis.reasoning}
`);

    // Agentes
    if (plan.agentsToActivate.length > 0) {
      parts.push('\nAGENTES A ATIVAR:');
      for (const agent of plan.agentsToActivate) {
        parts.push(`  - ${agent.type.toUpperCase()} (ID: ${agent.instanceId})`);
      }
    }

    // Ordem de execucao
    parts.push('\nORDEM DE EXECUCAO:');
    plan.executionOrder.forEach((step, i) => {
      parts.push(`  ${i + 1}. ${step}`);
    });

    // Sintese
    parts.push(`\nESTRATEGIA DE SINTESE: ${plan.synthesisStrategy}`);

    // Fallback
    parts.push(`PLANO DE FALLBACK: ${plan.fallbackPlan}`);

    // Instrucoes
    parts.push(`
═══════════════════════════════════════════════════════════════════════════════

INSTRUCOES PARA EXECUCAO:

1. Ative os agentes na ordem especificada
2. Passe o contexto da tarefa para cada agente
3. Colete os outputs de cada agente
4. Aplique a estrategia de sintese
5. Se falhar, execute o plano de fallback
6. Retorne resposta consolidada ao usuario

FORMATO DE RESPOSTA AO USUARIO:

"Senhor, [resumo da analise].

[Se usou agentes]: Consultei [lista de especialistas] para esta tarefa.

[Resposta principal consolidada]

[Se relevante]: Pontos adicionais a considerar: [insights dos agentes]"
`);

    return parts.join('\n');
  }
}

// ============================================================================
// FUNCOES UTILITARIAS
// ============================================================================

/**
 * Funcao de conveniencia para analise rapida.
 *
 * @param {string} userInput - Texto do usuario
 * @returns {Object} Analise simplificada
 */
export function quickAnalyze(userInput) {
  const orchestrator = new JarvisOrchestrator();
  const analysis = orchestrator.analyzeTask(userInput);
  return analysis.toDict();
}

/**
 * Cria plano completo de orquestracao.
 *
 * @param {string} userInput - Texto do usuario
 * @returns {Object} { plan, prompt }
 */
export function createPlan(userInput) {
  const orchestrator = new JarvisOrchestrator();
  const analysis = orchestrator.analyzeTask(userInput);
  const plan = orchestrator.createOrchestrationPlan(analysis);
  const prompt = orchestrator.getOrchestrationPrompt(plan);
  return { plan, prompt };
}

// ============================================================================
// CLI
// ============================================================================

/**
 * CLI para testar o orquestrador.
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
JARVIS Orchestrator

Usage:
  node orchestrator.js [input]           Analyze input
  node orchestrator.js -i                Interactive mode
  node orchestrator.js --json [input]    Output as JSON

Options:
  -i, --interactive    Interactive mode
  --json               Output in JSON format
  -h, --help           Show this help
`);
    return;
  }

  const orchestrator = new JarvisOrchestrator();

  if (args.includes('-i') || args.includes('--interactive')) {
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log('JARVIS Orchestrator - Modo Interativo');
    console.log("Digite 'sair' para encerrar.\n");

    const prompt = () => {
      rl.question('Voce: ', (input) => {
        if (['sair', 'exit', 'quit'].includes(input.toLowerCase().trim())) {
          console.log('\nAte logo, senhor.');
          rl.close();
          return;
        }

        if (input.trim()) {
          const analysis = orchestrator.analyzeTask(input);
          const plan = orchestrator.createOrchestrationPlan(analysis);
          console.log(orchestrator.getOrchestrationPrompt(plan));
        }

        prompt();
      });
    };

    prompt();
  } else {
    const jsonMode = args.includes('--json');
    const input = args.filter((a) => !a.startsWith('-')).join(' ');

    if (!input) {
      console.log('Usage: node orchestrator.js [input]');
      console.log('       node orchestrator.js -i  (interactive mode)');
      return;
    }

    const analysis = orchestrator.analyzeTask(input);
    const plan = orchestrator.createOrchestrationPlan(analysis);

    if (jsonMode) {
      console.log(JSON.stringify(plan.toDict(), null, 2));
    } else {
      console.log(orchestrator.getOrchestrationPrompt(plan));
    }
  }
}

// Detecta se esta sendo executado diretamente
const isMainModule = process.argv[1]?.endsWith('orchestrator.js');
if (isMainModule) {
  main();
}

// ============================================================================
// EXPORTACOES DEFAULT
// ============================================================================

export default {
  TaskComplexity,
  AgentType,
  ExecutionStrategy,
  TaskAnalysis,
  OrchestrationPlan,
  JarvisOrchestrator,
  quickAnalyze,
  createPlan,
};
