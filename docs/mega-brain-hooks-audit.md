# Mega Brain Hooks Audit

**Story:** 3.1 - Audit Hooks for Compatibility
**Date:** 2026-01-23
**Source:** `C:\Users\thiag\OneDrive\Documentos\Mega Brain\.claude\hooks\`
**Total Hooks:** 35 (excluding backups and cache)

---

## Summary

| Category | Count | Description |
|----------|-------|-------------|
| Direct Migration | 5 | Compatible as-is, copy directly |
| Adapt | 12 | Needs modification for AIOS |
| Skip | 8 | Not needed or Mega Brain specific |
| Convert to Task | 6 | Better as AIOS task/workflow |
| Evaluate Later | 4 | Needs deeper analysis |

---

## Hook Catalog

### 1. Session/Lifecycle Hooks

| # | Hook | Size | Trigger | Purpose | Category | Priority | Notes |
|---|------|------|---------|---------|----------|----------|-------|
| 1 | session_start.py | 35KB | SessionStart | Initialize JARVIS, load context | **Adapt** | P0 | Core - needs JARVIS mode integration |
| 2 | session_end.py | 6KB | SessionEnd | Cleanup, save state | **Adapt** | P1 | Modify for AIOS memory patterns |
| 3 | session_autosave_v2.py | 36KB | PostToolUse | Auto-save conversation | **Adapt** | P1 | Large - evaluate necessity in AIOS |

### 2. Tool/Action Hooks

| # | Hook | Size | Trigger | Purpose | Category | Priority | Notes |
|---|------|------|---------|---------|----------|----------|-------|
| 4 | post_tool_use.py | 4KB | PostToolUse | Generic post-tool handler | **Direct** | P1 | Simple, likely compatible |
| 5 | post_write_validator.py | 7KB | PostToolUse:Write | Validate file writes | **Adapt** | P2 | Adapt validation rules for AIOS |
| 6 | post_output_validator.py | 14KB | PostToolUse | Validate command output | **Adapt** | P2 | May conflict with AIOS patterns |
| 7 | user_prompt_submit.py | 7KB | UserPromptSubmit | Process user input | **Direct** | P1 | Entry point hook |

### 3. Skill/Command Routing

| # | Hook | Size | Trigger | Purpose | Category | Priority | Notes |
|---|------|------|---------|---------|----------|----------|-------|
| 8 | skill_router.py | 11KB | UserPromptSubmit | Route skills/commands | **Adapt** | P0 | Critical - map to AIOS commands |
| 9 | skill_indexer.py | 2KB | SessionStart | Index available skills | **Skip** | - | AIOS has own command discovery |

### 4. Quality & Validation

| # | Hook | Size | Trigger | Purpose | Category | Priority | Notes |
|---|------|------|---------|---------|----------|----------|-------|
| 10 | quality_watchdog.py | 12KB | PostToolUse | Monitor code quality | **Adapt** | P1 | Merge with @qa agent capabilities |
| 11 | creation_validator.py | 13KB | PostToolUse:Write | Validate file creation | **Adapt** | P2 | May overlap with AIOS patterns |
| 12 | stop_hook_completeness.py | 5KB | PreToolUse | Ensure hook completeness | **Skip** | - | Mega Brain specific meta-hook |

### 5. JARVIS/Briefing

| # | Hook | Size | Trigger | Purpose | Category | Priority | Notes |
|---|------|------|---------|---------|----------|----------|-------|
| 13 | jarvis_briefing.py | 28KB | PostToolUse | Status briefings | **Adapt** | P1 | Core JARVIS feature - integrate with mode |
| 14 | agent_doctor.py | 17KB | SessionStart | Agent health check | **Adapt** | P2 | Useful for AIOS health monitoring |

### 6. Token/Resource Management

| # | Hook | Size | Trigger | Purpose | Category | Priority | Notes |
|---|------|------|---------|---------|----------|----------|-------|
| 15 | token_checkpoint.py | 21KB | PostToolUse | Token usage tracking | **Direct** | P1 | Useful for AIOS cost monitoring |
| 16 | token_monitor.py | 14KB | PostToolUse | Real-time token alerts | **Direct** | P2 | Complement to checkpoint |
| 17 | checkpoint_writer.py | 7KB | PostToolUse | Write checkpoints | **Evaluate** | P2 | May overlap with session autosave |

### 7. Memory & State

| # | Hook | Size | Trigger | Purpose | Category | Priority | Notes |
|---|------|------|---------|---------|----------|----------|-------|
| 18 | memory_updater.py | 6KB | SessionEnd | Update memory layer | **Adapt** | P1 | Adapt for AIOS memory patterns |
| 19 | ledger_updater.py | 9KB | PostToolUse | Update activity ledger | **Convert** | P2 | Better as AIOS task |
| 20 | pattern_analyzer.py | 21KB | SessionEnd | Analyze usage patterns | **Convert** | P3 | Complex - better as periodic task |

### 8. Multi-Agent/Tracking

| # | Hook | Size | Trigger | Purpose | Category | Priority | Notes |
|---|------|------|---------|---------|----------|----------|-------|
| 21 | multi_agent_hook.py | 17KB | Multiple | Multi-agent coordination | **Evaluate** | P2 | AIOS has own agent system |
| 22 | subagent_tracker.py | 5KB | PostToolUse | Track subagent calls | **Adapt** | P2 | Useful for AIOS debugging |
| 23 | pending_tracker.py | 7KB | PostToolUse | Track pending tasks | **Skip** | - | AIOS has TodoWrite tool |

### 9. Content Processing

| # | Hook | Size | Trigger | Purpose | Category | Priority | Notes |
|---|------|------|---------|---------|----------|----------|-------|
| 24 | post_batch_cascading.py | 59KB | PostToolUse | Batch content processing | **Convert** | P1 | Large - better as workflow |
| 25 | inbox_age_alert.py | 13KB | SessionStart | Alert old inbox items | **Convert** | P2 | Better as scheduled task |
| 26 | session-source-sync.py | 7KB | SessionStart | Sync source files | **Skip** | - | Mega Brain specific |

### 10. Formatting & Validation

| # | Hook | Size | Trigger | Purpose | Category | Priority | Notes |
|---|------|------|---------|---------|----------|----------|-------|
| 27 | auto_formatter.py | 4KB | PostToolUse:Write | Auto-format files | **Direct** | P2 | Simple, useful |
| 28 | enforce_dual_location.py | 16KB | PostToolUse | Enforce file locations | **Skip** | - | Mega Brain specific rule |
| 29 | enforce_plan_mode.py | 7KB | UserPromptSubmit | Force plan mode | **Skip** | - | AIOS has own planning |

### 11. Notifications & Status

| # | Hook | Size | Trigger | Purpose | Category | Priority | Notes |
|---|------|------|---------|---------|----------|----------|-------|
| 30 | notification_system.py | 4KB | Multiple | System notifications | **Skip** | - | Simple, may not be needed |
| 31 | status_line.py | 6KB | Multiple | Status line updates | **Evaluate** | P2 | Check AIOS status patterns |

### 12. Special Purpose

| # | Hook | Size | Trigger | Purpose | Category | Priority | Notes |
|---|------|------|---------|---------|----------|----------|-------|
| 32 | ralph_wiggum.py | 10KB | PostToolUse | Error detection (humorous) | **Evaluate** | P3 | Quirky - evaluate value |

---

## Migration Priority Order

### Phase 1 (P0 - Critical Path)

1. **session_start.py** → Adapt for JARVIS mode toggle
2. **skill_router.py** → Adapt for AIOS command routing

### Phase 2 (P1 - High Priority)

3. **jarvis_briefing.py** → Adapt for JARVIS mode
4. **quality_watchdog.py** → Merge with @qa patterns
5. **token_checkpoint.py** → Direct migration
6. **post_tool_use.py** → Direct migration
7. **user_prompt_submit.py** → Direct migration
8. **memory_updater.py** → Adapt for AIOS memory
9. **session_end.py** → Adapt for AIOS cleanup

### Phase 3 (P2 - Medium Priority)

10. **token_monitor.py** → Direct migration
11. **auto_formatter.py** → Direct migration
12. **session_autosave_v2.py** → Adapt (evaluate necessity)
13. **subagent_tracker.py** → Adapt for AIOS
14. **agent_doctor.py** → Adapt for health checks
15. **post_write_validator.py** → Adapt validations
16. **post_output_validator.py** → Adapt validations
17. **creation_validator.py** → Adapt validations

### Phase 4 (P3 - Convert to Tasks/Workflows)

18. **post_batch_cascading.py** → Convert to ingest-knowledge workflow
19. **inbox_age_alert.py** → Convert to scheduled task
20. **ledger_updater.py** → Convert to logging task
21. **pattern_analyzer.py** → Convert to analytics task

### Skip (Not Needed)

- skill_indexer.py (AIOS command discovery)
- stop_hook_completeness.py (Mega Brain meta)
- pending_tracker.py (AIOS TodoWrite)
- session-source-sync.py (Mega Brain specific)
- enforce_dual_location.py (Mega Brain specific)
- enforce_plan_mode.py (AIOS planning)
- notification_system.py (evaluate later)

---

## Dependencies Identified

### Shared Modules

Several hooks import from these shared locations:
- `checkpoint_writer.py` used by multiple hooks
- Common utility functions (need to identify)

### Potential Conflicts

1. **session_autosave_v2 vs checkpoint_writer** - overlapping functionality
2. **quality_watchdog vs post_output_validator** - both validate output
3. **token_checkpoint vs token_monitor** - both track tokens

### Required Adaptations

1. **JARVIS Identity** - session_start, jarvis_briefing need mode awareness
2. **Skill Routing** - skill_router needs mapping to AIOS *commands
3. **File Paths** - Many hooks reference Mega Brain paths
4. **Memory Layer** - Memory hooks need AIOS integration patterns

---

## Migration Status (Updated 2026-01-23)

### ✅ Migrated Hooks (17 total)

#### Story 6.1 - Direct Migration (PR #23)
| Hook | Status |
|------|--------|
| auto_formatter.py | ✅ Migrated |
| post_tool_use.py | ✅ Migrated |
| token_checkpoint.py | ✅ Migrated |
| token_monitor.py | ✅ Migrated |
| user_prompt_submit.py | ✅ Migrated |

#### Story 6.2 - P0-P1 Critical (PR #24)
| Hook | Status |
|------|--------|
| session_start.py | ✅ Migrated (needs adaptation) |
| skill_router.py | ✅ Migrated (needs adaptation) |
| jarvis_briefing.py | ✅ Migrated (needs adaptation) |
| quality_watchdog.py | ✅ Migrated (needs adaptation) |
| memory_updater.py | ✅ Migrated (needs adaptation) |
| session_end.py | ✅ Migrated (needs adaptation) |
| session_autosave_v2.py | ✅ Migrated (needs adaptation) |

#### Story 6.3 - P2 Secondary (PR #25)
| Hook | Status |
|------|--------|
| agent_doctor.py | ✅ Migrated (needs adaptation) |
| creation_validator.py | ✅ Migrated (needs adaptation) |
| post_output_validator.py | ✅ Migrated (needs adaptation) |
| post_write_validator.py | ✅ Migrated (needs adaptation) |
| subagent_tracker.py | ✅ Migrated (needs adaptation) |

### 📋 Convert to AIOS Tasks (6 hooks)

These hooks are better suited as AIOS tasks/workflows:

| Hook | New Location | Reason |
|------|--------------|--------|
| post_batch_cascading.py | `workflows/ingest-knowledge.yaml` | Large (59KB), better as workflow |
| inbox_age_alert.py | `tasks/inbox-monitor.md` | Scheduled task pattern |
| ledger_updater.py | `tasks/activity-logger.md` | Logging task pattern |
| pattern_analyzer.py | `tasks/analytics-report.md` | Complex analytics |
| checkpoint_writer.py | Merged with token_checkpoint | Overlapping functionality |
| status_line.py | Evaluate with AIOS status | May integrate with AIOS |

### ❌ Skipped Hooks (8 hooks)

These hooks are not needed in AIOS:

| Hook | Reason |
|------|--------|
| skill_indexer.py | AIOS has own command discovery |
| stop_hook_completeness.py | Mega Brain meta-hook |
| pending_tracker.py | AIOS uses TodoWrite tool |
| session-source-sync.py | Mega Brain specific sync |
| enforce_dual_location.py | Mega Brain file rules |
| enforce_plan_mode.py | AIOS has own planning |
| notification_system.py | Simple, not needed |
| ralph_wiggum.py | Quirky error detection, low value |

### 📝 Remaining Work

1. **Path Adaptation** - Update migrated hooks for AIOS structure
2. **settings.json** - Configure hooks in AIOS settings
3. **Task Creation** - Create AIOS tasks for converted hooks
4. **Testing** - Validate all hooks work with AIOS

---

*Migration completed by Orion - Epic 6 (PRs #23-26)*
