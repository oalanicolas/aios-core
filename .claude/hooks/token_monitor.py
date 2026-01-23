#!/usr/bin/env python3
"""
JARVIS Token Monitor Hook v1.0.0
================================
Integração com ccusage para monitoramento de tokens e custos.

PRD: PRD-MEGA-BRAIN-TOOLS-2026
LOOP: LOOP-001 (ccusage - Monitoring Integration)
Assigned Agent: DEVOPS

Funções:
- register_session_start(): Registra início da sessão
- register_session_end(): Registra fim e calcula custos via ccusage
- check_threshold(): Alerta se custo > $5/sessão
- update_dashboard(): Atualiza COST-DASHBOARD.md
"""

import json
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional

# =============================================================================
# CONFIGURAÇÃO
# =============================================================================

THRESHOLD_USD = 5.0  # Alerta se sessão > $5
MAX_SESSIONS_DISPLAY = 20  # Sessões no dashboard

def get_project_dir() -> Path:
    """Retorna diretório do projeto."""
    return Path(os.environ.get('CLAUDE_PROJECT_DIR', os.getcwd()))

def get_monitoring_dir() -> Path:
    """Retorna diretório de monitoramento."""
    return get_project_dir() / '.claude' / 'monitoring'

def get_session_costs_path() -> Path:
    """Retorna path do arquivo de custos."""
    return get_monitoring_dir() / 'session-costs.jsonl'

def get_dashboard_path() -> Path:
    """Retorna path do dashboard."""
    return get_monitoring_dir() / 'COST-DASHBOARD.md'

def get_alerts_path() -> Path:
    """Retorna path dos alertas."""
    return get_monitoring_dir() / 'alerts.jsonl'

# =============================================================================
# UTILITÁRIOS
# =============================================================================

def generate_session_id() -> str:
    """Gera ID único para a sessão."""
    now = datetime.now()
    return f"SESSION-{now.strftime('%Y%m%d-%H%M%S')}"

def save_to_jsonl(path: Path, data: Dict[str, Any]) -> bool:
    """Salva dados em arquivo JSONL (append)."""
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, 'a', encoding='utf-8') as f:
            f.write(json.dumps(data, ensure_ascii=False) + '\n')
        return True
    except Exception as e:
        print(f"Erro ao salvar JSONL: {e}", file=sys.stderr)
        return False

def load_jsonl(path: Path) -> list:
    """Carrega todas as linhas de um arquivo JSONL."""
    entries = []
    if path.exists():
        try:
            with open(path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line:
                        entries.append(json.loads(line))
        except Exception as e:
            print(f"Erro ao carregar JSONL: {e}", file=sys.stderr)
    return entries

def check_ccusage_installed() -> bool:
    """Verifica se ccusage está instalado."""
    try:
        result = subprocess.run(
            ['ccusage', '--version'],
            capture_output=True,
            text=True,
            timeout=10
        )
        return result.returncode == 0
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return False

def get_ccusage_metrics() -> Optional[Dict[str, Any]]:
    """Obtém métricas do ccusage."""
    try:
        result = subprocess.run(
            ['ccusage', '--json'],
            capture_output=True,
            text=True,
            timeout=30
        )
        if result.returncode == 0 and result.stdout.strip():
            return json.loads(result.stdout)
        return None
    except (subprocess.TimeoutExpired, FileNotFoundError, json.JSONDecodeError) as e:
        print(f"Erro ao obter métricas ccusage: {e}", file=sys.stderr)
        return None

# =============================================================================
# FUNÇÕES PRINCIPAIS
# =============================================================================

def register_session_start(session_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Registra início da sessão para monitoramento.

    Returns:
        Dict com dados da sessão iniciada
    """
    if session_id is None:
        session_id = generate_session_id()

    session_data = {
        "session_id": session_id,
        "event": "start",
        "started_at": datetime.now().isoformat(),
        "initial_tokens": 0,
        "initial_cost": 0.0,
        "ccusage_available": check_ccusage_installed()
    }

    # Salvar no histórico
    save_to_jsonl(get_session_costs_path(), session_data)

    return session_data

def register_session_end(session_id: str, started_at: Optional[str] = None) -> Dict[str, Any]:
    """
    Registra fim da sessão e calcula custos.

    Args:
        session_id: ID da sessão a encerrar
        started_at: Timestamp de início (para cálculo de duração)

    Returns:
        Dict com dados finais da sessão
    """
    ended_at = datetime.now()

    # Obter métricas do ccusage
    metrics = get_ccusage_metrics()

    if metrics:
        total_tokens = metrics.get('tokens', metrics.get('total_tokens', 0))
        total_cost = metrics.get('cost', metrics.get('total_cost', 0.0))
    else:
        total_tokens = 0
        total_cost = 0.0

    # Calcular duração
    duration_minutes = 0
    if started_at:
        try:
            start_dt = datetime.fromisoformat(started_at)
            duration_minutes = (ended_at - start_dt).total_seconds() / 60
        except ValueError:
            pass

    session_data = {
        "session_id": session_id,
        "event": "end",
        "ended_at": ended_at.isoformat(),
        "total_tokens": total_tokens,
        "total_cost": total_cost,
        "duration_minutes": round(duration_minutes, 2),
        "threshold_exceeded": total_cost > THRESHOLD_USD
    }

    # Salvar no histórico
    save_to_jsonl(get_session_costs_path(), session_data)

    # Verificar threshold e alertar se necessário
    if total_cost > THRESHOLD_USD:
        alert_data = {
            "timestamp": ended_at.isoformat(),
            "session_id": session_id,
            "cost": total_cost,
            "threshold": THRESHOLD_USD,
            "message": f"⚠️ ALERTA: Sessão custou ${total_cost:.2f} (threshold: ${THRESHOLD_USD:.2f})"
        }
        save_to_jsonl(get_alerts_path(), alert_data)
        print(f"\n⚠️ ALERTA DE CUSTO: Sessão {session_id} custou ${total_cost:.2f}")

    # Atualizar dashboard
    update_dashboard()

    return session_data

def update_dashboard() -> bool:
    """
    Atualiza o COST-DASHBOARD.md com dados recentes.

    Returns:
        True se atualizado com sucesso
    """
    try:
        # Carregar histórico
        entries = load_jsonl(get_session_costs_path())

        # Filtrar apenas eventos de "end" com custos
        sessions = [e for e in entries if e.get('event') == 'end']

        # Calcular métricas
        total_cost = sum(s.get('total_cost', 0) for s in sessions)
        total_tokens = sum(s.get('total_tokens', 0) for s in sessions)
        total_sessions = len(sessions)

        avg_cost = total_cost / total_sessions if total_sessions > 0 else 0
        avg_tokens = total_tokens / total_sessions if total_sessions > 0 else 0

        # Alertas recentes
        alerts = load_jsonl(get_alerts_path())
        recent_alerts = alerts[-5:] if alerts else []

        # Últimas sessões
        recent_sessions = sessions[-MAX_SESSIONS_DISPLAY:]
        recent_sessions.reverse()  # Mais recentes primeiro

        # Gerar dashboard
        now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        dashboard = f"""# 📊 COST DASHBOARD - JARVIS MONITORING

> **Última atualização:** {now}
> **Powered by:** ccusage + JARVIS Token Monitor v1.0.0

---

## 📈 MÉTRICAS GLOBAIS

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  MÉTRICA                    │  VALOR                                        │
├─────────────────────────────┼───────────────────────────────────────────────┤
│  Total de Sessões           │  {total_sessions:,}                                         │
│  Custo Total                │  ${total_cost:,.2f}                                      │
│  Tokens Total               │  {total_tokens:,}                                      │
│  Custo Médio/Sessão         │  ${avg_cost:,.2f}                                       │
│  Tokens Médio/Sessão        │  {avg_tokens:,.0f}                                       │
│  Threshold de Alerta        │  ${THRESHOLD_USD:.2f}                                        │
└─────────────────────────────┴───────────────────────────────────────────────┘
```

---

## ⚠️ ALERTAS RECENTES

"""

        if recent_alerts:
            for alert in reversed(recent_alerts):
                dashboard += f"- **{alert.get('timestamp', 'N/A')}**: {alert.get('message', 'Alerta')}\n"
        else:
            dashboard += "_Nenhum alerta recente._\n"

        dashboard += """
---

## 📋 SESSÕES RECENTES

| Session ID | Data/Hora | Tokens | Custo | Duração |
|------------|-----------|--------|-------|---------|
"""

        for s in recent_sessions:
            sid = s.get('session_id', 'N/A')[:25]
            ended = s.get('ended_at', 'N/A')[:19]
            tokens = f"{s.get('total_tokens', 0):,}"
            cost = f"${s.get('total_cost', 0):.2f}"
            duration = f"{s.get('duration_minutes', 0):.1f}min"
            exceeded = " ⚠️" if s.get('threshold_exceeded') else ""
            dashboard += f"| {sid} | {ended} | {tokens} | {cost}{exceeded} | {duration} |\n"

        if not recent_sessions:
            dashboard += "| _Nenhuma sessão registrada_ | - | - | - | - |\n"

        dashboard += """
---

## 📁 ARQUIVOS DO SISTEMA

```
/.claude/monitoring/
├── COST-DASHBOARD.md           ← Este arquivo
├── session-costs.jsonl         ← Histórico de sessões
├── daily-summary.jsonl         ← Resumo diário (TODO)
└── alerts.jsonl                ← Alertas disparados
```

---

## 🔧 COMANDOS DISPONÍVEIS

| Comando | Descrição |
|---------|-----------|
| `/costs` | Mostrar custos da sessão atual |
| `/costs week` | Mostrar custos da última semana |
| `/costs month` | Mostrar custos do mês |

---

*Dashboard gerado automaticamente pelo JARVIS Token Monitor.*
"""

        # Salvar dashboard
        dashboard_path = get_dashboard_path()
        dashboard_path.parent.mkdir(parents=True, exist_ok=True)
        with open(dashboard_path, 'w', encoding='utf-8') as f:
            f.write(dashboard)

        return True

    except Exception as e:
        print(f"Erro ao atualizar dashboard: {e}", file=sys.stderr)
        return False

def get_session_summary() -> Dict[str, Any]:
    """
    Retorna resumo das sessões para exibição rápida.
    """
    entries = load_jsonl(get_session_costs_path())
    sessions = [e for e in entries if e.get('event') == 'end']

    total_cost = sum(s.get('total_cost', 0) for s in sessions)
    total_tokens = sum(s.get('total_tokens', 0) for s in sessions)

    return {
        "total_sessions": len(sessions),
        "total_cost": total_cost,
        "total_tokens": total_tokens,
        "ccusage_available": check_ccusage_installed()
    }

# =============================================================================
# CLI INTERFACE
# =============================================================================

def main():
    """Ponto de entrada para uso como script."""
    import argparse

    parser = argparse.ArgumentParser(description='JARVIS Token Monitor')
    parser.add_argument('command', choices=['start', 'end', 'summary', 'dashboard', 'check'],
                        help='Comando a executar')
    parser.add_argument('--session-id', help='ID da sessão')
    parser.add_argument('--started-at', help='Timestamp de início (para end)')

    args = parser.parse_args()

    if args.command == 'start':
        result = register_session_start(args.session_id)
        print(json.dumps(result, indent=2))

    elif args.command == 'end':
        if not args.session_id:
            print("Erro: --session-id é obrigatório para 'end'", file=sys.stderr)
            sys.exit(1)
        result = register_session_end(args.session_id, args.started_at)
        print(json.dumps(result, indent=2))

    elif args.command == 'summary':
        result = get_session_summary()
        print(json.dumps(result, indent=2))

    elif args.command == 'dashboard':
        if update_dashboard():
            print("Dashboard atualizado com sucesso.")
        else:
            print("Erro ao atualizar dashboard.", file=sys.stderr)
            sys.exit(1)

    elif args.command == 'check':
        if check_ccusage_installed():
            print("✅ ccusage está instalado e disponível.")
        else:
            print("❌ ccusage NÃO está instalado. Execute: npm install -g ccusage")
            sys.exit(1)

if __name__ == '__main__':
    main()
