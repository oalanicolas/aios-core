/**
 * ============================================================================
 *                    JARVIS SELF-IMPROVEMENT ENGINE
 * ============================================================================
 *
 * Motor de auto-evolucao do JARVIS.
 * Detecta gaps, propoe codigo, aprende com erros.
 *
 * PRINCIPIOS:
 * 1. DETECTAR gaps e oportunidades de melhoria automaticamente
 * 2. PROPOR codigo para aprovacao (nunca implementar sem permissao)
 * 3. APRENDER com cada erro e sucesso
 * 4. EVOLUIR continuamente baseado em padroes observados
 *
 * FLUXO:
 * DETECT (Gap) -> ANALYZE (Root) -> PROPOSE (Code) -> AWAIT APPROVAL
 *                                                           |
 *          LEARN (Record) <- EXECUTE (Apply) <--------------
 *
 * ADAPTADO DE: jarvis_self_improvement.py (Mega Brain)
 * PARA: AIOS Core
 *
 * CRIADO: 2026-01-23
 * AUTOR: JARVIS Migration System
 */

import { PATHS, json, log } from './config.js';
import { randomUUID } from 'crypto';
import { join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, readdirSync } from 'fs';

// ============================================================================
// TIPOS (Enums)
// ============================================================================

/**
 * Tipos de melhoria.
 */
export const ImprovementType = Object.freeze({
  BUG_FIX: 'bug_fix',
  OPTIMIZATION: 'optimization',
  REFACTORING: 'refactoring',
  NEW_CAPABILITY: 'new_capability',
  DOCUMENTATION: 'documentation',
  TEST: 'test',
  PATTERN_APPLICATION: 'pattern_application',
});

/**
 * Status de proposta.
 */
export const ProposalStatus = Object.freeze({
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  IMPLEMENTED: 'implemented',
  FAILED: 'failed',
});

/**
 * Fonte de deteccao.
 */
export const DetectionSource = Object.freeze({
  ERROR_PATTERN: 'error_pattern',
  CODE_ANALYSIS: 'code_analysis',
  USER_FEEDBACK: 'user_feedback',
  PERFORMANCE_METRIC: 'performance_metric',
  BEST_PRACTICE_CHECK: 'best_practice_check',
  REPETITION_DETECTION: 'repetition_detection',
});

// ============================================================================
// DATA CLASSES
// ============================================================================

/**
 * Um gap/oportunidade de melhoria detectada.
 */
export class Gap {
  constructor({ id, type, source, description, location = null, severity, evidence }) {
    this.id = id || `gap_${randomUUID().slice(0, 8)}`;
    this.type = type;
    this.source = source;
    this.description = description;
    this.location = location; // arquivo/funcao afetada
    this.severity = severity; // 1-5
    this.evidence = evidence; // dados que suportam a deteccao
    this.detectedAt = new Date().toISOString();
  }

  toDict() {
    return {
      id: this.id,
      type: this.type,
      source: this.source,
      description: this.description,
      location: this.location,
      severity: this.severity,
      evidence: this.evidence,
      detectedAt: this.detectedAt,
    };
  }
}

/**
 * Proposta de codigo para implementar.
 */
export class CodeProposal {
  constructor({
    id,
    gapId,
    title,
    description,
    rationale,
    code,
    filePath,
    changeType,
    beforeCode = null,
    testsIncluded = false,
    estimatedImpact,
    risks = [],
    alternativesConsidered = [],
  }) {
    this.id = id || `proposal_${randomUUID().slice(0, 8)}`;
    this.gapId = gapId;
    this.title = title;
    this.description = description;
    this.rationale = rationale; // Por que essa solucao?
    this.code = code;
    this.filePath = filePath;
    this.changeType = changeType; // create, modify, delete
    this.beforeCode = beforeCode; // codigo atual (se modify)
    this.testsIncluded = testsIncluded;
    this.estimatedImpact = estimatedImpact;
    this.risks = risks;
    this.alternativesConsidered = alternativesConsidered;
    this.status = ProposalStatus.PENDING;
    this.createdAt = new Date().toISOString();
    this.reviewedAt = null;
    this.reviewedBy = null;
    this.rejectionReason = null;
    this.implementationResult = null;
  }

  toDict() {
    return {
      id: this.id,
      gapId: this.gapId,
      title: this.title,
      description: this.description,
      rationale: this.rationale,
      code: this.code,
      filePath: this.filePath,
      changeType: this.changeType,
      beforeCode: this.beforeCode,
      testsIncluded: this.testsIncluded,
      estimatedImpact: this.estimatedImpact,
      risks: this.risks,
      alternativesConsidered: this.alternativesConsidered,
      status: this.status,
      createdAt: this.createdAt,
      reviewedAt: this.reviewedAt,
      reviewedBy: this.reviewedBy,
      rejectionReason: this.rejectionReason,
      implementationResult: this.implementationResult,
    };
  }
}

/**
 * Registro de aprendizado apos uma tentativa.
 */
export class LearningRecord {
  constructor({ id, proposalId, success, outcome, lessons, patternsIdentified, applyToFuture }) {
    this.id = id || `learning_${randomUUID().slice(0, 8)}`;
    this.proposalId = proposalId;
    this.success = success;
    this.outcome = outcome;
    this.lessons = lessons;
    this.patternsIdentified = patternsIdentified;
    this.applyToFuture = applyToFuture; // Acoes para aplicar no futuro
    this.recordedAt = new Date().toISOString();
  }

  toDict() {
    return {
      id: this.id,
      proposalId: this.proposalId,
      success: this.success,
      outcome: this.outcome,
      lessons: this.lessons,
      patternsIdentified: this.patternsIdentified,
      applyToFuture: this.applyToFuture,
      recordedAt: this.recordedAt,
    };
  }
}

// ============================================================================
// DETECTORS
// ============================================================================

/**
 * Detecta padroes que indicam oportunidades de melhoria.
 */
export class PatternDetector {
  constructor() {
    // Padroes de codigo problematico
    this.codeSmells = [
      {
        name: 'repeated_code',
        pattern: /(.{50,})\n.*?\1/,
        severity: 3,
        suggestion: 'Extrair para funcao reutilizavel',
      },
      {
        name: 'magic_numbers',
        pattern: /(?<![\w.])(?!0x)[1-9]\d{2,}(?![\w])/,
        severity: 2,
        suggestion: 'Extrair para constante nomeada',
      },
      {
        name: 'long_function',
        pattern: /function \w+\([^)]*\)[^{]*\{[^}]{500,}\}/,
        severity: 3,
        suggestion: 'Dividir em funcoes menores',
      },
      {
        name: 'empty_catch',
        pattern: /catch\s*\([^)]*\)\s*\{\s*\}/,
        severity: 4,
        suggestion: 'Tratar ou logar excecao capturada',
      },
      {
        name: 'todo_without_issue',
        pattern: /\/\/\s*TODO[^/\n]*$/m,
        severity: 2,
        suggestion: 'Resolver ou criar issue para TODO',
      },
      {
        name: 'hardcoded_path',
        pattern: /["\'][/\\](?:home|Users|var|etc)[/\\][^"']+["']/,
        severity: 4,
        suggestion: 'Usar caminhos relativos ou configuraveis',
      },
      {
        name: 'console_log',
        pattern: /console\.(log|debug|info)\([^)]*\)/,
        severity: 2,
        suggestion: 'Usar sistema de logging adequado',
      },
    ];

    // Padroes de erro recorrente
    this.errorPatterns = [
      {
        name: 'undefined_property',
        pattern: /Cannot read propert(?:y|ies) ['"]([\w]+)['"] of (?:undefined|null)/,
        suggestion: 'Verificar existencia antes de acessar ou usar optional chaining',
      },
      {
        name: 'type_error',
        pattern: /TypeError: .* is not a (\w+)/,
        suggestion: 'Adicionar validacao de tipos',
      },
      {
        name: 'reference_error',
        pattern: /ReferenceError: (\w+) is not defined/,
        suggestion: 'Verificar declaracao de variaveis',
      },
      {
        name: 'module_not_found',
        pattern: /Cannot find module '([^']+)'/,
        suggestion: 'Verificar instalacao de dependencias',
      },
      {
        name: 'file_not_found',
        pattern: /ENOENT: no such file or directory.*'([^']+)'/,
        suggestion: 'Verificar existencia ou criar arquivo/diretorio',
      },
    ];
  }

  /**
   * Detecta code smells em codigo.
   * @param {string} code
   * @param {string} filePath
   * @returns {Gap[]}
   */
  detectCodeSmells(code, filePath) {
    const gaps = [];

    for (const smell of this.codeSmells) {
      const matches = code.match(new RegExp(smell.pattern, 'gm'));
      if (matches && matches.length > 0) {
        gaps.push(
          new Gap({
            type: ImprovementType.REFACTORING,
            source: DetectionSource.CODE_ANALYSIS,
            description: `Code smell detectado: ${smell.name}`,
            location: filePath,
            severity: smell.severity,
            evidence: {
              smellName: smell.name,
              matchesCount: matches.length,
              suggestion: smell.suggestion,
            },
          })
        );
      }
    }

    return gaps;
  }

  /**
   * Detecta padroes de erro que indicam bugs.
   * @param {string} errorLog
   * @returns {Gap[]}
   */
  detectErrorPatterns(errorLog) {
    const gaps = [];

    for (const pattern of this.errorPatterns) {
      const matches = errorLog.match(new RegExp(pattern.pattern, 'g'));
      if (matches && matches.length > 0) {
        gaps.push(
          new Gap({
            type: ImprovementType.BUG_FIX,
            source: DetectionSource.ERROR_PATTERN,
            description: `Erro recorrente: ${pattern.name}`,
            location: null, // Precisa investigar
            severity: 4,
            evidence: {
              errorType: pattern.name,
              matches: matches.slice(0, 5), // Primeiros 5 matches
              suggestion: pattern.suggestion,
            },
          })
        );
      }
    }

    return gaps;
  }
}

/**
 * Verifica aderencia a melhores praticas.
 */
export class BestPracticeChecker {
  constructor() {
    this.practices = {
      has_jsdoc: {
        check: (code) => /\/\*\*[\s\S]*?\*\//.test(code),
        type: ImprovementType.DOCUMENTATION,
        severity: 2,
        message: 'Funcoes/classes devem ter JSDoc',
      },
      has_error_handling: {
        check: (code) => /try\s*\{/.test(code) || /\.catch\(/.test(code),
        type: ImprovementType.BUG_FIX,
        severity: 3,
        message: 'Considerar tratamento de erros',
      },
      uses_strict: {
        check: (code) => /'use strict'/.test(code) || /import\s/.test(code) || /export\s/.test(code),
        type: ImprovementType.REFACTORING,
        severity: 2,
        message: "Usar 'use strict' ou ES modules",
      },
      no_var: {
        check: (code) => !/\bvar\s/.test(code),
        type: ImprovementType.REFACTORING,
        severity: 2,
        message: 'Usar let/const em vez de var',
      },
    };
  }

  /**
   * Verifica um arquivo contra melhores praticas.
   * @param {string} code
   * @param {string} filePath
   * @returns {Gap[]}
   */
  checkFile(code, filePath) {
    const gaps = [];

    for (const [practiceName, practice] of Object.entries(this.practices)) {
      if (!practice.check(code)) {
        gaps.push(
          new Gap({
            type: practice.type,
            source: DetectionSource.BEST_PRACTICE_CHECK,
            description: practice.message,
            location: filePath,
            severity: practice.severity,
            evidence: {
              practice: practiceName,
              file: filePath,
            },
          })
        );
      }
    }

    return gaps;
  }
}

/**
 * Detecta tarefas repetitivas que podem ser automatizadas.
 */
export class RepetitionDetector {
  constructor() {
    this.actionHistory = [];
    this.patterns = {};
  }

  /**
   * Registra uma acao para analise de padroes.
   * @param {string} action
   * @param {Object} context
   */
  recordAction(action, context) {
    this.actionHistory.push({
      action,
      context,
      timestamp: new Date().toISOString(),
    });

    // Detectar repeticao
    const actionKey = `${action}:${JSON.stringify(context, Object.keys(context).sort())}`;
    this.patterns[actionKey] = (this.patterns[actionKey] || 0) + 1;
  }

  /**
   * Detecta acoes repetidas que indicam oportunidade de automacao.
   * @param {number} [threshold=3]
   * @returns {Gap[]}
   */
  detectRepetitions(threshold = 3) {
    const gaps = [];

    for (const [actionKey, count] of Object.entries(this.patterns)) {
      if (count >= threshold) {
        const colonIndex = actionKey.indexOf(':');
        const action = actionKey.slice(0, colonIndex);
        const contextStr = actionKey.slice(colonIndex + 1);

        gaps.push(
          new Gap({
            type: ImprovementType.NEW_CAPABILITY,
            source: DetectionSource.REPETITION_DETECTION,
            description: `Acao repetida ${count} vezes: ${action}`,
            location: null,
            severity: 2,
            evidence: {
              action,
              count,
              context: JSON.parse(contextStr),
            },
          })
        );
      }
    }

    return gaps;
  }
}

// ============================================================================
// SELF-IMPROVEMENT ENGINE
// ============================================================================

/**
 * Motor de auto-melhoria do JARVIS.
 *
 * Detecta gaps, analisa root causes, propoe solucoes,
 * e aprende com resultados.
 */
export class JarvisSelfImprovement {
  /**
   * @param {Object} options
   * @param {Object} [options.memorySystem] - Instancia do JarvisTotalMemory
   */
  constructor({ memorySystem = null } = {}) {
    this.memory = memorySystem;
    this.patternDetector = new PatternDetector();
    this.practiceChecker = new BestPracticeChecker();
    this.repetitionDetector = new RepetitionDetector();

    this.detectedGaps = [];
    this.proposals = [];
    this.learnings = [];

    this.proposalsDir = join(PATHS.LOGS, 'proposals');
    this.improvementsLog = join(PATHS.LOGS, 'improvements.jsonl');

    this._ensureDirs();
  }

  _ensureDirs() {
    if (!existsSync(this.proposalsDir)) {
      mkdirSync(this.proposalsDir, { recursive: true });
    }
  }

  // ========================================================================
  // DETECCAO
  // ========================================================================

  /**
   * Escaneia um arquivo em busca de oportunidades de melhoria.
   * @param {string} filePath
   * @returns {Gap[]}
   */
  scanFile(filePath) {
    if (!existsSync(filePath)) {
      return [];
    }

    let code;
    try {
      code = readFileSync(filePath, 'utf-8');
    } catch (e) {
      return [];
    }

    const gaps = [];

    // Code smells
    gaps.push(...this.patternDetector.detectCodeSmells(code, filePath));

    // Best practices
    gaps.push(...this.practiceChecker.checkFile(code, filePath));

    this.detectedGaps.push(...gaps);

    return gaps;
  }

  /**
   * Escaneia um diretorio recursivamente.
   * @param {string} directory
   * @param {string[]} [extensions=['.js']]
   * @returns {Gap[]}
   */
  scanDirectory(directory, extensions = ['.js']) {
    const allGaps = [];

    const scanRecursive = (dir) => {
      try {
        const entries = readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = join(dir, entry.name);

          // Ignorar alguns diretorios
          if (
            entry.isDirectory() &&
            ['.git', 'node_modules', '__pycache__', '.venv', 'dist', 'build'].includes(entry.name)
          ) {
            continue;
          }

          if (entry.isDirectory()) {
            scanRecursive(fullPath);
          } else if (entry.isFile()) {
            const ext = '.' + entry.name.split('.').pop();
            if (extensions.includes(ext)) {
              const gaps = this.scanFile(fullPath);
              allGaps.push(...gaps);
            }
          }
        }
      } catch (e) {
        // Ignore permission errors
      }
    };

    scanRecursive(directory);

    return allGaps;
  }

  /**
   * Analisa um erro e detecta gaps relacionados.
   * @param {string} errorMessage
   * @param {string} [traceback='']
   * @returns {Gap[]}
   */
  analyzeError(errorMessage, traceback = '') {
    const fullError = `${errorMessage}\n${traceback}`;
    const gaps = this.patternDetector.detectErrorPatterns(fullError);

    this.detectedGaps.push(...gaps);

    return gaps;
  }

  /**
   * Registra acao para deteccao de repeticoes.
   * @param {string} action
   * @param {Object} context
   */
  recordRepetition(action, context) {
    this.repetitionDetector.recordAction(action, context);
  }

  /**
   * Detecta oportunidades de automacao por repeticao.
   * @returns {Gap[]}
   */
  detectRepetitionOpportunities() {
    const gaps = this.repetitionDetector.detectRepetitions();
    this.detectedGaps.push(...gaps);
    return gaps;
  }

  // ========================================================================
  // PROPOSTA
  // ========================================================================

  /**
   * Cria uma proposta de codigo para resolver um gap.
   */
  createProposal({
    gap,
    title,
    description,
    rationale,
    code,
    filePath,
    changeType = 'modify',
    beforeCode = null,
    testsIncluded = false,
    risks = [],
    alternatives = [],
  }) {
    const proposal = new CodeProposal({
      gapId: gap.id,
      title,
      description,
      rationale,
      code,
      filePath,
      changeType,
      beforeCode,
      testsIncluded,
      estimatedImpact: this._estimateImpact(gap),
      risks,
      alternativesConsidered: alternatives,
    });

    this.proposals.push(proposal);
    this._saveProposal(proposal);

    return proposal;
  }

  _estimateImpact(gap) {
    if (gap.severity >= 4) {
      return 'ALTO - Resolve problema critico';
    } else if (gap.severity >= 3) {
      return 'MEDIO - Melhoria significativa';
    } else {
      return 'BAIXO - Melhoria incremental';
    }
  }

  _saveProposal(proposal) {
    const proposalFile = join(this.proposalsDir, `${proposal.id}.json`);
    json.save(proposalFile, proposal.toDict());
  }

  /**
   * Retorna propostas pendentes de aprovacao.
   * @returns {CodeProposal[]}
   */
  getPendingProposals() {
    return this.proposals.filter((p) => p.status === ProposalStatus.PENDING);
  }

  /**
   * Formata proposta para apresentacao ao usuario.
   * @param {CodeProposal} proposal
   * @returns {string}
   */
  formatProposalForApproval(proposal) {
    const output = [];
    output.push('======================================================================');
    output.push('  JARVIS IMPROVEMENT PROPOSAL');
    output.push('======================================================================');
    output.push('');
    output.push(`**ID:** ${proposal.id}`);
    output.push(`**Titulo:** ${proposal.title}`);
    output.push(`**Status:** ${proposal.status}`);
    output.push(`**Impacto Estimado:** ${proposal.estimatedImpact}`);
    output.push('');
    output.push('## Descricao');
    output.push(proposal.description);
    output.push('');
    output.push('## Justificativa');
    output.push(proposal.rationale);
    output.push('');
    output.push('## Codigo Proposto');
    output.push(`**Arquivo:** \`${proposal.filePath}\``);
    output.push(`**Tipo de Mudanca:** ${proposal.changeType}`);
    output.push('');

    if (proposal.beforeCode) {
      output.push('### Codigo Atual');
      output.push('```javascript');
      output.push(proposal.beforeCode.length > 500 ? proposal.beforeCode.slice(0, 500) + '...' : proposal.beforeCode);
      output.push('```');
      output.push('');
    }

    output.push('### Codigo Proposto');
    output.push('```javascript');
    output.push(proposal.code);
    output.push('```');
    output.push('');

    if (proposal.risks.length > 0) {
      output.push('## Riscos');
      for (const risk of proposal.risks) {
        output.push(`- ${risk}`);
      }
      output.push('');
    }

    if (proposal.alternativesConsidered.length > 0) {
      output.push('## Alternativas Consideradas');
      for (const alt of proposal.alternativesConsidered) {
        output.push(`- ${alt}`);
      }
      output.push('');
    }

    output.push('======================================================================');
    output.push('');
    output.push('**Senhor, aguardo sua aprovacao para implementar.**');
    output.push('');
    output.push('Comandos disponiveis:');
    output.push(`- \`aprovar ${proposal.id}\` - Implementar esta proposta`);
    output.push(`- \`rejeitar ${proposal.id} [motivo]\` - Rejeitar com feedback`);
    output.push(`- \`modificar ${proposal.id}\` - Solicitar modificacoes`);

    return output.join('\n');
  }

  // ========================================================================
  // APROVACAO E IMPLEMENTACAO
  // ========================================================================

  /**
   * Aprova uma proposta.
   * @param {string} proposalId
   * @param {string} [approvedBy='user']
   * @returns {boolean}
   */
  approveProposal(proposalId, approvedBy = 'user') {
    const proposal = this.proposals.find((p) => p.id === proposalId);
    if (proposal) {
      proposal.status = ProposalStatus.APPROVED;
      proposal.reviewedAt = new Date().toISOString();
      proposal.reviewedBy = approvedBy;
      this._saveProposal(proposal);
      return true;
    }
    return false;
  }

  /**
   * Rejeita uma proposta.
   * @param {string} proposalId
   * @param {string} reason
   * @param {string} [rejectedBy='user']
   * @returns {boolean}
   */
  rejectProposal(proposalId, reason, rejectedBy = 'user') {
    const proposal = this.proposals.find((p) => p.id === proposalId);
    if (proposal) {
      proposal.status = ProposalStatus.REJECTED;
      proposal.reviewedAt = new Date().toISOString();
      proposal.reviewedBy = rejectedBy;
      proposal.rejectionReason = reason;
      this._saveProposal(proposal);

      // Aprender com a rejeicao
      this._learnFromRejection(proposal, reason);

      return true;
    }
    return false;
  }

  /**
   * Implementa uma proposta aprovada.
   * @param {string} proposalId
   * @returns {{ success: boolean, message: string }}
   */
  implementProposal(proposalId) {
    const proposal = this.proposals.find((p) => p.id === proposalId);

    if (!proposal) {
      return { success: false, message: 'Proposta nao encontrada' };
    }

    if (proposal.status !== ProposalStatus.APPROVED) {
      return { success: false, message: 'Proposta nao esta aprovada' };
    }

    try {
      const filePath = proposal.filePath;
      const dir = join(filePath, '..');

      if (proposal.changeType === 'create') {
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }
        writeFileSync(filePath, proposal.code, 'utf-8');
      } else if (proposal.changeType === 'modify') {
        if (!existsSync(filePath)) {
          return { success: false, message: `Arquivo nao existe: ${filePath}` };
        }
        writeFileSync(filePath, proposal.code, 'utf-8');
      } else if (proposal.changeType === 'delete') {
        if (existsSync(filePath)) {
          unlinkSync(filePath);
        }
      }

      proposal.status = ProposalStatus.IMPLEMENTED;
      proposal.implementationResult = 'Sucesso';
      this._saveProposal(proposal);

      // Aprender com o sucesso
      this._learnFromSuccess(proposal);

      // Registrar na memoria
      if (this.memory) {
        this.memory.rememberCodeChange({
          filePath,
          changeType: proposal.changeType,
          after: proposal.code,
          intention: proposal.rationale,
          before: proposal.beforeCode,
          requestedBy: 'jarvis_self_improvement',
          implementedBy: 'jarvis',
        });
      }

      return { success: true, message: `Proposta ${proposalId} implementada com sucesso` };
    } catch (e) {
      proposal.status = ProposalStatus.FAILED;
      proposal.implementationResult = e.message;
      this._saveProposal(proposal);

      // Aprender com o erro
      this._learnFromFailure(proposal, e.message);

      return { success: false, message: `Erro na implementacao: ${e.message}` };
    }
  }

  // ========================================================================
  // APRENDIZADO
  // ========================================================================

  _learnFromSuccess(proposal) {
    const learning = new LearningRecord({
      proposalId: proposal.id,
      success: true,
      outcome: 'Implementacao bem-sucedida',
      lessons: [
        `Padrao de ${proposal.changeType} em ${proposal.filePath.split('.').pop()} funcionou`,
        `Abordagem para ${proposal.title} validada`,
      ],
      patternsIdentified: [`Gap tipo ${this._getGapType(proposal.gapId)} -> solucao funcional`],
      applyToFuture: ['Usar abordagem similar para gaps do mesmo tipo'],
    });

    this.learnings.push(learning);
    this._saveLearning(learning);
  }

  _learnFromFailure(proposal, error) {
    const learning = new LearningRecord({
      proposalId: proposal.id,
      success: false,
      outcome: `Falha: ${error}`,
      lessons: [`Erro ao aplicar mudanca em ${proposal.filePath}`, `Tipo de erro: ${error.split(':')[0]}`],
      patternsIdentified: [`Problema com abordagem para ${proposal.changeType}`],
      applyToFuture: ['Verificar pre-condicoes antes de implementar', 'Considerar backup antes de modificar'],
    });

    this.learnings.push(learning);
    this._saveLearning(learning);
  }

  _learnFromRejection(proposal, reason) {
    const learning = new LearningRecord({
      proposalId: proposal.id,
      success: false,
      outcome: `Rejeitado: ${reason}`,
      lessons: ['Proposta rejeitada pelo usuario', `Razao: ${reason}`],
      patternsIdentified: ['Proposta nao alinhada com expectativas do usuario'],
      applyToFuture: [`Considerar feedback: ${reason}`, 'Ajustar criterios de proposta'],
    });

    this.learnings.push(learning);
    this._saveLearning(learning);
  }

  _getGapType(gapId) {
    const gap = this.detectedGaps.find((g) => g.id === gapId);
    return gap ? gap.type : 'unknown';
  }

  _saveLearning(learning) {
    json.append(this.improvementsLog, learning.toDict());
  }

  /**
   * Gera sumario de aprendizados para injetar em contexto.
   * @returns {string}
   */
  getLearningsForContext() {
    if (this.learnings.length === 0) {
      return '';
    }

    const recent = this.learnings.slice(-10); // Ultimos 10

    const output = [];
    output.push('## JARVIS LEARNING CONTEXT');
    output.push('');
    output.push('**Aprendizados recentes:**');

    for (const learning of recent) {
      const status = learning.success ? '[OK]' : '[X]';
      output.push(`${status} ${learning.outcome}`);
      for (const lesson of learning.lessons.slice(0, 2)) {
        output.push(`   - ${lesson}`);
      }
    }

    return output.join('\n');
  }

  // ========================================================================
  // RELATORIOS
  // ========================================================================

  /**
   * Gera relatorio de status.
   * @returns {Object}
   */
  getStatusReport() {
    return {
      gapsDetected: this.detectedGaps.length,
      gapsByType: this._countByType(this.detectedGaps),
      proposalsTotal: this.proposals.length,
      proposalsPending: this.getPendingProposals().length,
      proposalsImplemented: this.proposals.filter((p) => p.status === ProposalStatus.IMPLEMENTED).length,
      learningsTotal: this.learnings.length,
      successRate: this._calculateSuccessRate(),
    };
  }

  _countByType(gaps) {
    const counts = {};
    for (const gap of gaps) {
      counts[gap.type] = (counts[gap.type] || 0) + 1;
    }
    return counts;
  }

  _calculateSuccessRate() {
    if (this.learnings.length === 0) {
      return 0.0;
    }
    const successes = this.learnings.filter((l) => l.success).length;
    return successes / this.learnings.length;
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let _improvementInstance = null;

/**
 * Retorna instancia singleton do motor de self-improvement.
 * @param {Object} [options]
 * @returns {JarvisSelfImprovement}
 */
export function getSelfImprovement(options = {}) {
  if (_improvementInstance === null) {
    _improvementInstance = new JarvisSelfImprovement(options);
  }
  return _improvementInstance;
}

// ============================================================================
// CLI
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
JARVIS Self-Improvement Engine

Usage:
  node self-improvement.js scan <path>      Scan directory for improvements
  node self-improvement.js status           Show status report
  node self-improvement.js proposals        List pending proposals

Options:
  -h, --help     Show this help
`);
    return;
  }

  const engine = new JarvisSelfImprovement();
  const command = args[0];

  if (command === 'scan' && args[1]) {
    const gaps = engine.scanDirectory(args[1]);
    console.log('\n Escaneamento concluido');
    console.log(`   Gaps detectados: ${gaps.length}`);
    for (const gap of gaps.slice(0, 10)) {
      console.log(`   - [${gap.severity}] ${gap.description}`);
    }
  } else if (command === 'status') {
    const status = engine.getStatusReport();
    console.log(JSON.stringify(status, null, 2));
  } else if (command === 'proposals') {
    const pending = engine.getPendingProposals();
    console.log(`\n Propostas pendentes: ${pending.length}`);
    for (const p of pending) {
      console.log(`   - ${p.id}: ${p.title}`);
    }
  } else {
    console.log('Usage: node self-improvement.js [scan|status|proposals]');
    console.log('       node self-improvement.js --help for more info');
  }
}

// Detecta se esta sendo executado diretamente
const isMainModule = process.argv[1]?.endsWith('self-improvement.js');
if (isMainModule) {
  main();
}

// ============================================================================
// EXPORTACOES DEFAULT
// ============================================================================

export default {
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
};
