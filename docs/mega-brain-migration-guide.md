# Mega Brain → AIOS Core Migration Guide

> **Version:** 3.0 | **Date:** 2025-01 | **Plan:** iridescent-enchanting-hoare.md

## Overview

This document describes the complete migration of the Mega Brain AI system into AIOS Core. The migration involved 39 stories across 9 epics, bringing 36 agents, 33 hooks, 14 JARVIS modules, and 1,113 knowledge files into the AIOS architecture.

## Migration Summary

| Component | Source | Destination | Files |
|-----------|--------|-------------|-------|
| **C-LEVEL Agents** | Mega Brain AGENTS/ | .aios-core/development/agents/mega-brain/c-level/ | 4 agents |
| **Sales Squad** | Mega Brain AGENTS/ | .aios-core/development/agents/mega-brain/sales-squad.md | 9 agents (1 file) |
| **PERSONS** | Mega Brain AGENTS/ | .aios-core/development/agents/mega-brain/personas/ | 7 personas |
| **Council** | Mega Brain AGENTS/ | .aios-core/development/agents/mega-brain/council/ | 3 members |
| **Hooks** | Mega Brain .claude/hooks/ | .claude/hooks/ | 17 Python files |
| **JARVIS Core** | Mega Brain scripts/ | .aios-core/core/jarvis/ | 7 JS modules |
| **RAG System** | Mega Brain infrastructure/ | .aios-core/infrastructure/scripts/rag/ | 13 files |
| **Processing** | Mega Brain infrastructure/ | .aios-core/infrastructure/scripts/processing/ | 7 files |
| **Workflows** | New | .aios-core/development/workflows/ | 1 file |

## Directory Structure

```
aios-core/
├── .aios-core/
│   ├── core/
│   │   └── jarvis/                    # JARVIS rewritten in JS
│   │       ├── config.js
│   │       ├── orchestrator.js
│   │       ├── memory.js
│   │       ├── core.js
│   │       ├── agents.js
│   │       ├── self-improvement.js
│   │       └── index.js
│   │
│   ├── development/
│   │   ├── agents/
│   │   │   └── mega-brain/
│   │   │       ├── c-level/           # CFO, CMO, COO, CRO
│   │   │       ├── personas/          # 7 expert personas
│   │   │       ├── council/           # 3 council members
│   │   │       └── sales-squad.md     # 9 sales agents
│   │   └── workflows/
│   │       └── ingest-knowledge.yaml  # 5-stage pipeline
│   │
│   ├── data/
│   │   └── knowledge/                 # Knowledge base structure
│   │       ├── dna/
│   │       ├── dossiers/
│   │       └── playbooks/
│   │
│   └── infrastructure/
│       └── scripts/
│           ├── rag/                   # RAG system (13 files)
│           └── processing/            # Batch processing (7 files)
│
├── .claude/
│   └── hooks/                         # Python hooks (17 files)
│
└── tests/
    ├── integration/
    │   ├── hooks/                     # Hook tests
    │   ├── jarvis/                    # JARVIS tests
    │   ├── rag/                       # RAG tests
    │   └── processing/                # Processing tests
    └── e2e/
        └── mega-brain/                # E2E pipeline tests
```

## Epic Breakdown

### Epic 1: Foundation (Stories 1.1-1.5)
Set up the base directory structure and migrated foundational data.

- **Story 1.1:** Knowledge structure directories
- **Story 1.2:** BASE-CONSTITUTION migration
- **Story 1.3:** Agent index for Mega Brain
- **Story 1.4:** DNA migration (7 personas)
- **Story 1.5:** Dossiers and playbooks

### Epic 2: C-LEVEL Agents (Stories 2.1-2.4)
Migrated executive-level AI agents with complete AIOS activation headers.

| Agent | Description | Lines |
|-------|-------------|-------|
| **CFO** | Financial strategy, ROI analysis | ~1,900 |
| **CMO** | Marketing strategy, brand positioning | ~1,730 |
| **COO** | Operations, process optimization | ~1,824 |
| **CRO** | Revenue operations, sales alignment | ~1,064 |

Each agent includes:
- AIOS activation header (YAML)
- Core AGENT.md with persona
- SOUL.md with deeper identity
- DNA-CONFIG.yaml with parameters

### Epic 3: Sales Squad (Stories 3.1-3.2)
Consolidated 9 sales agents into a single squad file.

**Agents in sales-squad.md:**
1. BDR (Business Development Representative)
2. CLOSER (Deal Closing Specialist)
3. SDS (Sales Development Specialist)
4. LNS (Lead Nurturing Specialist)
5. CUSTOMER-SUCCESS
6. SALES-COORDINATOR
7. SALES-LEAD
8. SALES-MANAGER
9. NEPQ-SPECIALIST (Neuro-Emotional Persuasion)

### Epic 4: PERSONS (Stories 4.1-4.7)
Expert personas with 100% faithful DNA to their source.

| Persona | Type | Source |
|---------|------|--------|
| **Alex Hormozi** | Business/Sales | $100M Offers methodology |
| **Cole Gordon** | Sales Training | Remote closing expertise |
| **Jeremy Miner** | NEPQ | Sales questioning framework |
| **Jeremy Haynes** | Marketing | Digital marketing strategy |
| **G4 Educação** | Framework | Brazilian business education |
| **Full Sales System** | System | Complete sales methodology |
| **The Scalable Company** | System | Scaling frameworks |

### Epic 5: Council (Stories 5.1-5.3)
Decision-making council for critical choices.

| Member | Role |
|--------|------|
| **Advogado do Diabo** | Attacks decisions, finds weaknesses |
| **Crítico Metodológico** | Validates methodology, ensures rigor |
| **Sintetizador** | Synthesizes input, provides recommendations |

### Epic 6: Hooks Migration (Stories 6.1-6.4)
Python hooks adapted for AIOS environment.

**Direct Migration (PR #23):**
- auto_formatter.py
- post_tool_use.py
- token_checkpoint.py
- token_monitor.py
- user_prompt_submit.py

**P0-P1 Critical (PR #24):**
- session_start.py
- skill_router.py
- jarvis_briefing.py
- quality_watchdog.py
- memory_updater.py
- session_end.py
- session_autosave_v2.py

**P2 Secondary (PR #25):**
- agent_doctor.py
- creation_validator.py
- post_output_validator.py
- post_write_validator.py
- subagent_tracker.py

### Epic 7: JARVIS Rewrite (Stories 7.1-7.7)
Complete rewrite from Python to JavaScript.

| Module | Python Source | JS Target |
|--------|--------------|-----------|
| jarvis_config.py | 21KB | config.js |
| jarvis_orchestrator.py | 31KB | orchestrator.js |
| jarvis_total_memory.py | 36KB | memory.js |
| jarvis_autonomous_core.py | 31KB | core.js |
| jarvis_specialist_agents.py | 30KB | agents.js |
| jarvis_self_improvement.py | 34KB | self-improvement.js |
| (integration) | - | index.js |

### Epic 8: RAG & Processing (Stories 8.1-8.3)

**RAG System (Story 8.1):**
```
.aios-core/infrastructure/scripts/rag/
├── __init__.py
├── config.py          # ChromaDB configuration
├── chunker.py         # Document chunking
├── embeddings.py      # Text embeddings
├── indexer.py         # Vector indexing
├── retriever.py       # Semantic search
├── vectorstore.py     # ChromaDB interface
├── utils.py           # Utilities
├── rag_index.py       # CLI: Index documents
├── rag_query.py       # CLI: Query index
└── rag_status.py      # CLI: Check status
```

**Processing Scripts (Story 8.2):**
- auto_organize_inbox.py
- classify_unknown.py
- file_registry.py
- inbox_auto_organize.py
- organize_inbox_to_knowledge.py
- validate_batch_cascading.py
- validate_batch_logs.py

**Ingest Workflow (Story 8.3):**
5-stage pipeline: Intake → Classify → Process → Index → Validate

### Epic 9: Tests & Documentation (Stories 9.1-9.4)

| Story | Coverage |
|-------|----------|
| 9.1 | Hooks integration tests |
| 9.2 | JARVIS + RAG integration tests |
| 9.3 | E2E pipeline tests |
| 9.4 | This documentation |

## Usage Guide

### Activating Mega Brain Agents

```bash
# C-LEVEL
@cfo    # Financial analysis
@cmo    # Marketing strategy
@coo    # Operations
@cro    # Revenue operations

# Sales Squad
@sales-squad           # Full squad
@sales-squad:bdr       # Specific agent
@sales-squad:closer

# Personas
@alex-hormozi          # Business strategy
@jeremy-miner          # NEPQ sales
@cole-gordon           # Remote closing

# Council
@council               # Full council deliberation
@advogado-do-diabo     # Individual member
```

### Using the RAG System

```bash
# Index new documents
python .aios-core/infrastructure/scripts/rag/rag_index.py \
  --path ./docs/new-content/ \
  --collection knowledge

# Query the index
python .aios-core/infrastructure/scripts/rag/rag_query.py \
  --query "How does Alex Hormozi structure offers?" \
  --top-k 5

# Check status
python .aios-core/infrastructure/scripts/rag/rag_status.py
```

### Running the Ingest Pipeline

```bash
# Using AIOS workflow
*workflow ingest-knowledge

# Or directly
python .aios-core/infrastructure/scripts/processing/organize_inbox_to_knowledge.py
```

### JARVIS Integration

```javascript
// Import JARVIS
const JARVIS = require('./.aios-core/core/jarvis');

// Initialize
await JARVIS.initialize();

// Use orchestrator
const result = await JARVIS.orchestrate({
  task: 'analyze-market',
  agents: ['cfo', 'cmo'],
});

// Shutdown
await JARVIS.shutdown();
```

## Testing

```bash
# Run all Mega Brain tests
npm test -- --grep "Mega Brain"

# Specific test suites
npm test tests/integration/hooks/mega-brain-hooks.test.js
npm test tests/integration/jarvis/mega-brain-jarvis.test.js
npm test tests/integration/rag/mega-brain-rag.test.js
npm test tests/e2e/mega-brain/migration-pipeline.test.js
```

## Pull Requests

| PR | Story | Description |
|----|-------|-------------|
| #8-22 | Epic 1-5 | Foundation + Agents |
| #23 | 6.1 | Direct hooks migration |
| #24 | 6.2 | P0-P1 critical hooks |
| #25 | 6.3 | P2 secondary hooks |
| #26 | 6.4 | Hooks documentation |
| #27 | 8.1 | RAG system |
| #28 | 8.2 | Batch processor |
| #29 | 8.3 | Ingest workflow |
| #30 | 9.1 | Hooks tests |
| #31 | 9.2 | JARVIS/RAG tests |
| #32 | 9.3 | E2E tests |
| #33 | 9.4 | This documentation |

## Migration Notes

### Key Decisions

1. **Git Strategy:** 1 branch per story (39 branches total)
2. **JARVIS:** Rewritten in JavaScript for AIOS compatibility
3. **Agents Format:** Hybrid (squads for SALES/TECH, individual for PERSONS/C-LEVEL/COUNCIL)
4. **Knowledge Data:** Inside AIOS (.aios-core/data/knowledge/)

### Known Issues

- Hooks use `os.environ.get('CLAUDE_PROJECT_DIR')` for path resolution
- Some Mega Brain paths may need adaptation (06-LOGS references)
- RAG requires ChromaDB and sentence-transformers dependencies

### Dependencies Added

```
# Python (for RAG/hooks)
chromadb>=0.4.0
sentence-transformers>=2.0.0
python-dotenv>=1.0.0
pyyaml>=6.0

# Node.js (for JARVIS)
# No new dependencies - uses existing AIOS packages
```

## Conclusion

The Mega Brain migration brings advanced AI capabilities to AIOS Core:
- 36 specialized agents across 4 categories
- 17 production-ready hooks
- Complete RAG system for knowledge retrieval
- JARVIS orchestration rewritten for Node.js
- Comprehensive test coverage

For questions or issues, see the test files or create an issue in the repository.

---

*👑 Orion — AIOS Migration Documentation v3.0*
