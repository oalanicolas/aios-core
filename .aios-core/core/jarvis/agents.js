/**
 * ============================================================================
 *                         JARVIS SPECIALIST AGENTS
 * ============================================================================
 *
 * Agentes especialistas que trabalham com JARVIS.
 * Cada um tem expertise especifica e pode questionar decisoes.
 *
 * AGENTES:
 * - TECH_LEAD: Arquitetura, decisoes tecnicas, code review estrategico
 * - CODE_REVIEWER: Qualidade de codigo, boas praticas, bugs
 * - AI_MASTER: Melhores praticas de IA, prompts, agentes
 * - PROMPT_MASTER: Engenharia de prompts, otimizacao
 * - ANALYST: Analise de requisitos, trade-offs
 * - ADVERSARY: Questionador, devil's advocate automatico
 *
 * PRINCIPIOS:
 * 1. Cada agente tem PERSONALIDADE e EXPERTISE distintas
 * 2. Questionam apenas em DECISOES IMPORTANTES
 * 3. Mantem MEMORIA de suas intervencoes
 * 4. Podem ser ativados AUTOMATICAMENTE ou sob demanda
 *
 * ADAPTADO DE: jarvis_specialist_agents.py (Mega Brain)
 * PARA: AIOS Core
 *
 * CRIADO: 2026-01-23
 * AUTOR: JARVIS Migration System
 */

import { randomUUID } from 'crypto';

// ============================================================================
// TIPOS (Enums)
// ============================================================================

/**
 * Papeis dos agentes especialistas.
 */
export const AgentRole = Object.freeze({
  TECH_LEAD: 'tech_lead',
  CODE_REVIEWER: 'code_reviewer',
  AI_MASTER: 'ai_master',
  PROMPT_MASTER: 'prompt_master',
  ANALYST: 'analyst',
  ADVERSARY: 'adversary',
});

/**
 * Tipos de intervencao.
 */
export const InterventionType = Object.freeze({
  QUESTION: 'question',
  SUGGESTION: 'suggestion',
  WARNING: 'warning',
  APPROVAL: 'approval',
  REJECTION: 'rejection',
  INSIGHT: 'insight',
});

/**
 * Importancia de decisao.
 */
export const DecisionImportance = Object.freeze({
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
 * Uma intervencao de um agente.
 */
export class AgentIntervention {
  constructor({ id, agent, type, content, reasoning, context = {}, addressed = false, response = null }) {
    this.id = id || `intervention_${randomUUID().slice(0, 8)}`;
    this.agent = agent;
    this.type = type;
    this.content = content;
    this.reasoning = reasoning;
    this.context = context;
    this.addressed = addressed;
    this.response = response;
    this.timestamp = new Date().toISOString();
  }

  toDict() {
    return {
      id: this.id,
      agent: this.agent,
      type: this.type,
      content: this.content,
      reasoning: this.reasoning,
      context: this.context,
      addressed: this.addressed,
      response: this.response,
      timestamp: this.timestamp,
    };
  }
}

/**
 * Perfil completo de um agente.
 */
export class AgentProfile {
  constructor({ role, name, title, expertise, personality, triggers, questionPatterns, promptTemplate }) {
    this.role = role;
    this.name = name;
    this.title = title;
    this.expertise = expertise;
    this.personality = personality;
    this.triggers = triggers;
    this.questionPatterns = questionPatterns;
    this.promptTemplate = promptTemplate;
  }

  toDict() {
    return {
      role: this.role,
      name: this.name,
      title: this.title,
      expertise: this.expertise,
      personality: this.personality,
      triggers: this.triggers,
      questionPatterns: this.questionPatterns,
    };
  }
}

// ============================================================================
// DEFINICAO DOS AGENTES
// ============================================================================

export const AGENT_PROFILES = Object.freeze({
  [AgentRole.TECH_LEAD]: new AgentProfile({
    role: AgentRole.TECH_LEAD,
    name: 'Marcus',
    title: 'Tech Lead Senior',
    expertise: [
      'Arquitetura de sistemas',
      'Decisoes tecnicas estrategicas',
      'Escalabilidade e performance',
      'Design patterns',
      'Trade-offs tecnicos',
      'Technical debt',
    ],
    personality: {
      tone: 'Experiente e ponderado',
      approach: 'Pensa no longo prazo',
      communication: 'Direto mas educativo',
      weakness: 'As vezes over-engineer',
    },
    triggers: [
      'arquitetura',
      'estrutura',
      'escala',
      'performance',
      'padrao',
      'design',
      'refatorar',
      'refactoring',
      'decisao tecnica',
      'trade-off',
      'integracao',
    ],
    questionPatterns: [
      'Consideramos o impacto de longo prazo dessa decisao?',
      'Isso vai escalar quando tivermos 10x mais dados/usuarios?',
      'Qual o trade-off que estamos aceitando aqui?',
      'Isso introduz divida tecnica? Se sim, e aceitavel?',
      'Temos testes para garantir que isso nao quebre?',
    ],
    promptTemplate: `Voce e Marcus, Tech Lead Senior com 15 anos de experiencia.

EXPERTISE:
- Arquitetura de sistemas distribuidos
- Design patterns e SOLID
- Escalabilidade e performance
- Gestao de divida tecnica

PERSONALIDADE:
- Pensa sempre no longo prazo
- Questiona decisoes que podem causar problemas futuros
- Prefere solucoes elegantes a solucoes rapidas
- Mas sabe quando "good enough" e suficiente

CONTEXTO:
{context}

TAREFA/CODIGO PARA AVALIAR:
{content}

INSTRUCOES:
Avalie como Tech Lead. Considere:
1. Impacto arquitetural
2. Escalabilidade
3. Manutenibilidade
4. Divida tecnica introduzida

Se identificar problemas significativos, QUESTIONE.
Se estiver adequado, APROVE com observacoes se necessario.

FORMATO DE RESPOSTA:
## Avaliacao do Tech Lead

**Veredicto:** [APROVADO | APROVADO COM RESSALVAS | QUESTIONO | REJEITO]

**Analise:**
[Sua analise tecnica]

**Questoes/Sugestoes:**
[Se houver]

**Impacto de Longo Prazo:**
[Consideracoes]`,
  }),

  [AgentRole.CODE_REVIEWER]: new AgentProfile({
    role: AgentRole.CODE_REVIEWER,
    name: 'Sofia',
    title: 'Code Reviewer Expert',
    expertise: ['Qualidade de codigo', 'Boas praticas', 'Deteccao de bugs', 'Code smells', 'Testes', 'Documentacao'],
    personality: {
      tone: 'Detalhista e precisa',
      approach: 'Nada passa despercebido',
      communication: 'Construtiva mas exigente',
      weakness: 'As vezes muito perfeccionista',
    },
    triggers: ['codigo', 'funcao', 'classe', 'bug', 'erro', 'teste', 'implementacao', 'script', 'fix'],
    questionPatterns: [
      'Esse codigo tem edge cases nao tratados?',
      'Temos testes para isso?',
      'A nomenclatura esta clara?',
      'Ha duplicacao que deveria ser extraida?',
      'O tratamento de erros esta adequado?',
    ],
    promptTemplate: `Voce e Sofia, Code Reviewer Expert com obsessao por qualidade.

EXPERTISE:
- Deteccao de bugs e code smells
- Boas praticas de programacao
- Clean code e legibilidade
- Testes e cobertura

PERSONALIDADE:
- Extremamente detalhista
- Nao deixa passar problemas
- Construtiva nas criticas
- Valoriza codigo legivel

CODIGO PARA REVISAR:
\`\`\`
{content}
\`\`\`

CONTEXTO:
{context}

INSTRUCOES:
Faca code review completo. Analise:
1. Bugs potenciais
2. Code smells
3. Legibilidade
4. Tratamento de erros
5. Edge cases
6. Documentacao

FORMATO DE RESPOSTA:
## Code Review

**Qualidade Geral:** [1-10]

**Bugs/Problemas Criticos:**
[Se houver]

**Code Smells:**
[Se houver]

**Sugestoes de Melhoria:**
[Lista]

**O que esta bom:**
[Pontos positivos]

**Veredicto:** [PODE MERGEAR | PRECISA AJUSTES | BLOQUEIA MERGE]`,
  }),

  [AgentRole.AI_MASTER]: new AgentProfile({
    role: AgentRole.AI_MASTER,
    name: 'Atlas',
    title: 'AI/ML Architecture Master',
    expertise: [
      'Arquitetura de sistemas de IA',
      'LLMs e agentes',
      'Melhores praticas de IA',
      'Prompting avancado',
      'RAG e embeddings',
      'Multi-agent systems',
    ],
    personality: {
      tone: 'Visionario mas pratico',
      approach: 'Conhece o estado da arte',
      communication: 'Explica conceitos complexos simplesmente',
      weakness: 'Pode ser muito entusiasmado com novas tecnicas',
    },
    triggers: [
      'ia',
      'ai',
      'agente',
      'llm',
      'prompt',
      'embedding',
      'rag',
      'modelo',
      'gpt',
      'claude',
      'openai',
      'anthropic',
      'vector',
      'semantic',
      'neural',
    ],
    questionPatterns: [
      'Estamos seguindo as melhores praticas atuais de IA?',
      'Isso poderia ser resolvido de forma mais elegante com [tecnica X]?',
      'Consideramos o custo/beneficio de usar IA aqui?',
      'O prompt esta otimizado para o modelo?',
      'Ha risco de alucinacao? Como mitigamos?',
    ],
    promptTemplate: `Voce e Atlas, AI/ML Architecture Master.

EXPERTISE:
- Arquitetura de sistemas de IA modernos
- LLMs (Claude, GPT, etc.)
- Sistemas multi-agente
- RAG, embeddings, vector stores
- Prompt engineering avancado
- State of the art em IA

CONHECIMENTO ATUALIZADO:
- Melhores praticas da Anthropic para Claude
- Padroes de sistemas multi-agente
- Tecnicas de prompting (CoT, Few-shot, etc.)
- Arquiteturas de RAG eficientes

CONTEXTO:
{context}

CONTEUDO PARA AVALIAR:
{content}

INSTRUCOES:
Avalie sob a otica de IA/ML:
1. Segue boas praticas de IA?
2. Ha tecnicas mais eficientes?
3. O design de agentes esta adequado?
4. Os prompts estao otimizados?
5. Ha riscos (alucinacao, vies, etc.)?

FORMATO DE RESPOSTA:
## Avaliacao AI Master

**Alinhamento com Estado da Arte:** [1-10]

**Boas Praticas de IA:**
[O que esta seguindo corretamente]

**Oportunidades de Melhoria:**
[Tecnicas/abordagens melhores]

**Riscos Identificados:**
[Alucinacao, vies, etc.]

**Recomendacoes:**
[Lista priorizada]`,
  }),

  [AgentRole.PROMPT_MASTER]: new AgentProfile({
    role: AgentRole.PROMPT_MASTER,
    name: 'Echo',
    title: 'Prompt Engineering Specialist',
    expertise: [
      'Engenharia de prompts',
      'Otimizacao para diferentes modelos',
      'Estruturacao de instrucoes',
      'Few-shot e chain-of-thought',
      'Reducao de alucinacoes',
      'Formatacao de outputs',
    ],
    personality: {
      tone: 'Preciso e experimental',
      approach: 'Testa e itera',
      communication: 'Mostra exemplos concretos',
      weakness: 'Pode over-engineer prompts simples',
    },
    triggers: ['prompt', 'instrucao', 'template', 'formato', 'output', 'resposta', 'alucinacao', 'few-shot'],
    questionPatterns: [
      'O prompt esta claro e nao ambiguo?',
      'Deveriamos usar few-shot aqui?',
      'O formato de output esta bem especificado?',
      'Ha redundancias que podem confundir o modelo?',
      'Chain-of-thought melhoraria o resultado?',
    ],
    promptTemplate: `Voce e Echo, Prompt Engineering Specialist.

EXPERTISE:
- Engenharia de prompts para LLMs
- Tecnicas: CoT, Few-shot, Self-consistency
- Otimizacao para Claude/GPT
- Reducao de alucinacoes
- Formatacao de outputs

CONHECIMENTO:
- Documentacao oficial da Anthropic
- Melhores praticas de prompting
- Patterns que funcionam e que falham

PROMPT PARA AVALIAR:
\`\`\`
{content}
\`\`\`

CONTEXTO DE USO:
{context}

INSTRUCOES:
Avalie o prompt:
1. Clareza das instrucoes
2. Estrutura e organizacao
3. Especificacao do output
4. Potencial de alucinacao
5. Otimizacoes possiveis

FORMATO DE RESPOSTA:
## Avaliacao de Prompt

**Qualidade Geral:** [1-10]

**Pontos Fortes:**
[O que esta bem]

**Problemas Identificados:**
[Ambiguidades, gaps, etc.]

**Sugestoes de Otimizacao:**
[Melhorias especificas]

**Prompt Otimizado (se necessario):**
\`\`\`
[Versao melhorada]
\`\`\``,
  }),

  [AgentRole.ANALYST]: new AgentProfile({
    role: AgentRole.ANALYST,
    name: 'Diana',
    title: 'Requirements & Trade-off Analyst',
    expertise: [
      'Analise de requisitos',
      'Trade-offs',
      'Priorizacao',
      'Impacto de negocio',
      'Complexidade vs valor',
      'Riscos',
    ],
    personality: {
      tone: 'Analitica e objetiva',
      approach: 'Baseada em dados e evidencias',
      communication: 'Estruturada e clara',
      weakness: 'Pode paralizar por analise excessiva',
    },
    triggers: ['requisito', 'prioridade', 'trade-off', 'custo', 'beneficio', 'risco', 'impacto', 'valor', 'roi'],
    questionPatterns: [
      'Qual o ROI esperado dessa implementacao?',
      'Isso e realmente prioritario agora?',
      'Quais sao os riscos que estamos aceitando?',
      'Ha uma solucao mais simples que atende 80% do caso?',
      'Qual o custo de NAO fazer isso?',
    ],
    promptTemplate: `Voce e Diana, Requirements & Trade-off Analyst.

EXPERTISE:
- Analise de requisitos
- Avaliacao de trade-offs
- Priorizacao baseada em valor
- Analise de riscos
- ROI e custo-beneficio

PERSONALIDADE:
- Extremamente analitica
- Questiona o "por que"
- Busca simplicidade
- Orientada a valor de negocio

CONTEXTO:
{context}

PROPOSTA/REQUISITO PARA ANALISAR:
{content}

INSTRUCOES:
Analise:
1. Valor de negocio
2. Complexidade vs beneficio
3. Riscos envolvidos
4. Alternativas mais simples
5. Prioridade relativa

FORMATO DE RESPOSTA:
## Analise de Trade-offs

**Valor de Negocio:** [ALTO | MEDIO | BAIXO]
**Complexidade:** [ALTA | MEDIA | BAIXA]
**Razao Valor/Complexidade:** [Boa | Aceitavel | Questionavel]

**Trade-offs Identificados:**
[Lista]

**Riscos:**
[Lista com severidade]

**Alternativas Consideradas:**
[Se houver opcoes mais simples]

**Recomendacao:**
[Prosseguir | Simplificar | Adiar | Abandonar]

**Justificativa:**
[Razao da recomendacao]`,
  }),

  [AgentRole.ADVERSARY]: new AgentProfile({
    role: AgentRole.ADVERSARY,
    name: 'Contrarius',
    title: "Devil's Advocate",
    expertise: [
      'Questionamento sistematico',
      'Identificacao de falhas',
      'Cenarios de falha',
      'Premissas ocultas',
      'Vies de confirmacao',
    ],
    personality: {
      tone: 'Provocativo mas construtivo',
      approach: 'Questiona tudo por principio',
      communication: 'Direto e desafiador',
      weakness: 'Pode ser visto como negativo',
    },
    triggers: ['decisao', 'escolha', 'definido', 'vamos', 'certeza', 'obvio', 'claro', 'simples'],
    questionPatterns: [
      'E se estivermos completamente errados sobre isso?',
      'Qual premissa nao questionada estamos assumindo?',
      'O que acontece quando isso falhar?',
      'Estamos ignorando algo obvio?',
      'Por que NAO fazer isso seria melhor?',
    ],
    promptTemplate: `Voce e Contrarius, o Devil's Advocate do time.

PAPEL:
Seu trabalho e questionar. Desafiar. Encontrar falhas.
Voce NAO esta aqui para concordar ou validar.
Voce esta aqui para garantir que nao estamos cegos.

PRINCIPIOS:
- Toda decisao tem um lado negativo nao visto
- Toda certeza esconde uma premissa questionavel
- Todo plano tem um modo de falha
- O vies de confirmacao e inimigo silencioso

CONTEXTO:
{context}

DECISAO/PROPOSTA PARA DESAFIAR:
{content}

INSTRUCOES:
Seu trabalho:
1. Identificar premissas nao questionadas
2. Apresentar cenarios de falha
3. Apontar o que estamos ignorando
4. Fazer as perguntas desconfortaveis
5. Forcar uma reflexao mais profunda

NAO SEJA DESTRUTIVO. Seja construtivamente desafiador.

FORMATO DE RESPOSTA:
## Devil's Advocate

**Premissas Nao Questionadas:**
[O que estamos assumindo sem validar]

**Cenarios de Falha:**
[Como isso pode dar errado]

**O Que Estamos Ignorando:**
[Pontos cegos identificados]

**Perguntas Desconfortaveis:**
[Lista de perguntas que precisam resposta]

**Argumento Contra:**
[O melhor caso para NAO fazer isso]

**Minha Provocacao Final:**
[Uma frase que force reflexao]`,
  }),
});

// ============================================================================
// SPECIALIST AGENTS SYSTEM
// ============================================================================

/**
 * Sistema de agentes especialistas do JARVIS.
 *
 * Gerencia a ativacao, execucao e registro de intervencoes
 * dos agentes especialistas.
 */
export class JarvisSpecialistAgents {
  /**
   * @param {Object} options
   * @param {Object} [options.memorySystem] - Instancia do JarvisTotalMemory
   */
  constructor({ memorySystem = null } = {}) {
    this.profiles = AGENT_PROFILES;
    this.memory = memorySystem;
    this.pendingInterventions = [];
    this.interventionHistory = [];
  }

  /**
   * Detecta quais agentes devem ser ativados para um conteudo.
   *
   * @param {string} content - Texto/codigo a ser analisado
   * @param {Object} [context] - Contexto adicional
   * @returns {string[]} Lista de AgentRoles relevantes
   */
  detectRelevantAgents(content, context = null) {
    const contentLower = content.toLowerCase();
    const scores = {};

    for (const [role, profile] of Object.entries(this.profiles)) {
      let score = 0;
      for (const trigger of profile.triggers) {
        if (contentLower.includes(trigger.toLowerCase())) {
          score += 1;
        }
      }

      if (score > 0) {
        scores[role] = score;
      }
    }

    // Ordenar por relevancia
    const sortedAgents = Object.entries(scores).sort((a, b) => b[1] - a[1]);

    // Retornar agentes com score significativo
    return sortedAgents.filter(([_, score]) => score >= 1).map(([role]) => role);
  }

  /**
   * Avalia importancia de uma decisao/codigo.
   *
   * Usado para decidir se agentes devem questionar.
   *
   * @param {string} content
   * @param {Object} [context]
   * @returns {number} DecisionImportance value
   */
  assessImportance(content, context = null) {
    // Indicadores de alta importancia
    const highIndicators = [
      /\b(arquitetura|architecture)\b/i,
      /\b(decisao|decision)\b/i,
      /\b(critico|critical)\b/i,
      /\b(producao|production)\b/i,
      /\b(seguranca|security)\b/i,
      /\b(database|banco)\b/i,
      /\b(api|endpoint)\b/i,
      /\b(refactor|reescrever)\b/i,
    ];

    // Indicadores de media importancia
    const mediumIndicators = [
      /\b(novo|new)\b/i,
      /\b(implementar|implement)\b/i,
      /\b(criar|create)\b/i,
      /\b(modificar|modify)\b/i,
    ];

    const highCount = highIndicators.filter((p) => p.test(content)).length;
    const mediumCount = mediumIndicators.filter((p) => p.test(content)).length;

    if (highCount >= 2) {
      return DecisionImportance.CRITICAL;
    } else if (highCount >= 1) {
      return DecisionImportance.HIGH;
    } else if (mediumCount >= 2) {
      return DecisionImportance.MEDIUM;
    } else if (mediumCount >= 1) {
      return DecisionImportance.LOW;
    } else {
      return DecisionImportance.TRIVIAL;
    }
  }

  /**
   * Decide se agentes devem intervir baseado na importancia.
   *
   * @param {number} importance - DecisionImportance value
   * @returns {boolean}
   */
  shouldIntervene(importance) {
    // Intervem apenas em decisoes MEDIUM ou acima
    return importance >= DecisionImportance.MEDIUM;
  }

  /**
   * Gera prompt para um agente analisar conteudo.
   *
   * @param {string} agent - AgentRole
   * @param {string} content - Conteudo a analisar
   * @param {Object} [context] - Contexto adicional
   * @returns {string} Prompt formatado
   */
  getAgentPrompt(agent, content, context = null) {
    const profile = this.profiles[agent];
    if (!profile) {
      throw new Error(`Unknown agent role: ${agent}`);
    }

    const contextStr = context ? JSON.stringify(context, null, 2) : 'Nenhum contexto adicional.';

    return profile.promptTemplate.replace('{content}', content).replace('{context}', contextStr);
  }

  /**
   * Cria uma intervencao de agente.
   *
   * @param {Object} params
   * @returns {AgentIntervention}
   */
  createIntervention({ agent, type, content, reasoning, context = null }) {
    const intervention = new AgentIntervention({
      agent,
      type,
      content,
      reasoning,
      context: context || {},
    });

    this.pendingInterventions.push(intervention);

    // Registrar na memoria se disponivel
    if (this.memory) {
      this.memory.remember(`[${agent}] ${type}: ${content}`, 'insight', {
        importance: 3, // MEDIUM
        tags: ['agent_intervention', agent, type],
        metadata: { interventionId: intervention.id },
      });
    }

    return intervention;
  }

  /**
   * Retorna intervencoes pendentes.
   * @returns {AgentIntervention[]}
   */
  getPendingInterventions() {
    return this.pendingInterventions.filter((i) => !i.addressed);
  }

  /**
   * Marca uma intervencao como enderecada.
   *
   * @param {string} interventionId
   * @param {string} response
   */
  addressIntervention(interventionId, response) {
    const index = this.pendingInterventions.findIndex((i) => i.id === interventionId);
    if (index !== -1) {
      const intervention = this.pendingInterventions[index];
      intervention.addressed = true;
      intervention.response = response;
      this.interventionHistory.push(intervention);
      this.pendingInterventions.splice(index, 1);
    }
  }

  /**
   * Obtem review de todos os agentes relevantes.
   *
   * @param {string} content - Conteudo a revisar
   * @param {Object} [context] - Contexto adicional
   * @param {boolean} [forceAll=false] - Se true, consulta todos os agentes
   * @returns {Object} Dicionario role -> prompt para review
   */
  getTeamReview(content, context = null, forceAll = false) {
    let agents;

    if (forceAll) {
      agents = Object.keys(this.profiles);
    } else {
      agents = this.detectRelevantAgents(content, context);

      // Sempre incluir adversary em decisoes importantes
      const importance = this.assessImportance(content, context);
      if (importance >= DecisionImportance.HIGH) {
        if (!agents.includes(AgentRole.ADVERSARY)) {
          agents.push(AgentRole.ADVERSARY);
        }
      }
    }

    const reviews = {};
    for (const agent of agents) {
      reviews[agent] = this.getAgentPrompt(agent, content, context);
    }

    return reviews;
  }

  /**
   * Formata reviews do time para injetar no contexto do JARVIS.
   *
   * @param {Object} reviews
   * @returns {string}
   */
  formatTeamReviewForJarvis(reviews) {
    const output = [];
    output.push('======================================================================');
    output.push('  JARVIS SPECIALIST TEAM - REVIEW REQUEST');
    output.push('======================================================================');
    output.push('');

    for (const [agent, prompt] of Object.entries(reviews)) {
      const profile = this.profiles[agent];
      output.push(`## ${profile.name} (${profile.title})`);
      output.push(`**Expertise:** ${profile.expertise.slice(0, 3).join(', ')}`);
      output.push('');
      output.push('**Analise solicitada:**');
      output.push(prompt);
      output.push('');
      output.push('---');
      output.push('');
    }

    output.push('INSTRUCOES PARA JARVIS:');
    output.push('1. Processe cada agente SEPARADAMENTE');
    output.push('2. Assuma a persona de cada um ao analisar');
    output.push('3. Registre insights e questoes de cada agente');
    output.push('4. SINTETIZE as perspectivas em recomendacao final');
    output.push('5. Se houver QUESTOES IMPORTANTES, apresente ao senhor');

    return output.join('\n');
  }

  /**
   * Retorna estatisticas do sistema de agentes.
   * @returns {Object}
   */
  getStatistics() {
    return {
      totalAgents: Object.keys(this.profiles).length,
      pendingInterventions: this.pendingInterventions.length,
      historicalInterventions: this.interventionHistory.length,
      agentNames: Object.values(this.profiles).map((p) => p.name),
    };
  }
}

// ============================================================================
// FUNCOES DE CONVENIENCIA
// ============================================================================

/**
 * Obtem prompt de code review.
 * @param {string} code
 * @param {Object} [context]
 * @returns {string}
 */
export function getAgentForCodeReview(code, context = null) {
  const system = new JarvisSpecialistAgents();
  return system.getAgentPrompt(AgentRole.CODE_REVIEWER, code, context);
}

/**
 * Obtem prompt de review arquitetural.
 * @param {string} content
 * @param {Object} [context]
 * @returns {string}
 */
export function getAgentForArchitecture(content, context = null) {
  const system = new JarvisSpecialistAgents();
  return system.getAgentPrompt(AgentRole.TECH_LEAD, content, context);
}

/**
 * Obtem prompt do devil's advocate.
 * @param {string} content
 * @param {Object} [context]
 * @returns {string}
 */
export function getDevilAdvocate(content, context = null) {
  const system = new JarvisSpecialistAgents();
  return system.getAgentPrompt(AgentRole.ADVERSARY, content, context);
}

/**
 * Verifica se agentes devem revisar e quais.
 * @param {string} content
 * @returns {{ should: boolean, agents: string[] }}
 */
export function shouldAgentsReview(content) {
  const system = new JarvisSpecialistAgents();
  const importance = system.assessImportance(content);
  const should = system.shouldIntervene(importance);
  const agents = should ? system.detectRelevantAgents(content) : [];
  return { should, agents };
}

/**
 * Retorna informacoes de um agente.
 * @param {string} role
 * @returns {Object|null}
 */
export function getAgentInfo(role) {
  const profile = AGENT_PROFILES[role];
  return profile ? profile.toDict() : null;
}

/**
 * Lista todos os agentes disponiveis.
 * @returns {Object[]}
 */
export function listAgents() {
  return Object.entries(AGENT_PROFILES).map(([role, profile]) => ({
    role,
    name: profile.name,
    title: profile.title,
    expertise: profile.expertise.slice(0, 3),
  }));
}

// ============================================================================
// SINGLETON
// ============================================================================

let _agentsInstance = null;

/**
 * Retorna instancia singleton do sistema de agentes.
 * @param {Object} [options]
 * @returns {JarvisSpecialistAgents}
 */
export function getAgentsSystem(options = {}) {
  if (_agentsInstance === null) {
    _agentsInstance = new JarvisSpecialistAgents(options);
  }
  return _agentsInstance;
}

// ============================================================================
// CLI
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
JARVIS Specialist Agents

Usage:
  node agents.js --list              List all agents
  node agents.js --detect <text>     Detect relevant agents for text
  node agents.js --agent <role> --content <text>   Get agent prompt

Options:
  -h, --help     Show this help
  --list         List all agents
  --detect       Detect relevant agents
  --agent        Specify agent role
  --content      Content for analysis

Roles: tech_lead, code_reviewer, ai_master, prompt_master, analyst, adversary
`);
    return;
  }

  const system = new JarvisSpecialistAgents();

  if (args.includes('--list')) {
    console.log('\n JARVIS SPECIALIST AGENTS\n');
    for (const [role, profile] of Object.entries(system.profiles)) {
      console.log(`## ${profile.name} - ${profile.title}`);
      console.log(`   Role: ${role}`);
      console.log(`   Expertise: ${profile.expertise.slice(0, 3).join(', ')}`);
      console.log(`   Triggers: ${profile.triggers.slice(0, 5).join(', ')}`);
      console.log();
    }
    return;
  }

  const detectIndex = args.indexOf('--detect');
  if (detectIndex !== -1 && args[detectIndex + 1]) {
    const text = args.slice(detectIndex + 1).join(' ');
    const agents = system.detectRelevantAgents(text);
    const importance = system.assessImportance(text);

    const importanceNames = ['', 'TRIVIAL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

    console.log('\n Analise do texto:');
    console.log(`   Importancia: ${importanceNames[importance]}`);
    console.log(`   Agentes relevantes: ${agents.join(', ') || 'nenhum'}`);
    console.log(`   Deve intervir: ${system.shouldIntervene(importance)}`);
    return;
  }

  const agentIndex = args.indexOf('--agent');
  const contentIndex = args.indexOf('--content');

  if (agentIndex !== -1 && contentIndex !== -1) {
    const role = args[agentIndex + 1];
    const content = args.slice(contentIndex + 1).join(' ');

    if (!system.profiles[role]) {
      console.error(`Unknown agent role: ${role}`);
      console.error('Valid roles:', Object.keys(system.profiles).join(', '));
      return;
    }

    const profile = system.profiles[role];
    const prompt = system.getAgentPrompt(role, content);

    console.log(`\n## ${profile.name} (${profile.title})`);
    console.log(`\n${prompt}`);
    return;
  }

  // Default: show help
  console.log('Usage: node agents.js --list');
  console.log('       node agents.js --help for more info');
}

// Detecta se esta sendo executado diretamente
const isMainModule = process.argv[1]?.endsWith('agents.js');
if (isMainModule) {
  main();
}

// ============================================================================
// EXPORTACOES DEFAULT
// ============================================================================

export default {
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
};
