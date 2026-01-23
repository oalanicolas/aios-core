#!/usr/bin/env python3
"""
JARVIS User Prompt Submit Hook
Executado quando o usuário envia uma mensagem.

Responsabilidades:
1. Registrar prompts para análise
2. Detectar intenções especiais
3. Injetar contexto quando apropriado
4. INTEGRAR COM SISTEMA MULTI-AGENTE
"""

import json
import sys
import os
from datetime import datetime
from pathlib import Path

def get_project_dir():
    """Obtém o diretório do projeto."""
    return os.environ.get('CLAUDE_PROJECT_DIR', os.getcwd())

def detect_special_intents(prompt):
    """Detecta intenções especiais no prompt."""
    prompt_lower = prompt.lower()

    intents = []

    # Detectar pedido de status
    if any(word in prompt_lower for word in ['status', 'onde estamos', 'onde paramos']):
        intents.append('status_request')

    # Detectar pedido de ajuda
    if any(word in prompt_lower for word in ['ajuda', 'help', 'como fazer']):
        intents.append('help_request')

    # Detectar saudação
    if any(word in prompt_lower for word in ['bom dia', 'boa tarde', 'boa noite', 'olá', 'oi']):
        intents.append('greeting')

    # Detectar pedido de criação
    if any(word in prompt_lower for word in ['crie', 'criar', 'faça', 'fazer', 'gerar']):
        intents.append('creation_request')

    # Detectar pedido de análise
    if any(word in prompt_lower for word in ['analise', 'verifique', 'cheque', 'revise']):
        intents.append('analysis_request')

    # Detectar War Room explícito
    if any(phrase in prompt_lower for phrase in ['war room', 'debate sobre', 'múltiplas perspectivas', 'prós e contras']):
        intents.append('war_room_request')

    # Detectar uso explícito de agentes
    if any(phrase in prompt_lower for phrase in ['use os agentes', 'consulte especialistas', 'análise profunda']):
        intents.append('force_agents')

    return intents

def load_context_for_intents(intents):
    """Carrega contexto relevante baseado nas intenções."""
    project_dir = get_project_dir()
    context_parts = []

    if 'status_request' in intents:
        # Carregar estado do JARVIS
        state_path = Path(project_dir) / '04-SYSTEM' / 'JARVIS-STATE.json'
        if state_path.exists():
            with open(state_path, 'r', encoding='utf-8') as f:
                state = json.load(f)
                context_parts.append(f"[JARVIS Context] Estado atual carregado: Fase {state.get('current_state', {}).get('phase_name', 'IDLE')}")

    return context_parts

def try_multi_agent_analysis(prompt):
    """
    Tenta usar o sistema multi-agente para análise.
    Retorna contexto de agentes se necessário.
    """
    project_dir = get_project_dir()

    try:
        # Adicionar path do multi_agent_hook
        hooks_path = Path(project_dir) / '.claude' / 'hooks'
        sys.path.insert(0, str(hooks_path))

        from multi_agent_hook import process_user_prompt

        context, metadata = process_user_prompt(prompt)

        return context, metadata
    except Exception as e:
        return "", {"error": str(e), "decision": "multi_agent_unavailable"}


def try_skill_routing(prompt):
    """
    Tenta encontrar skills E sub-agents relevantes para o prompt.
    Retorna contexto se match encontrado.

    REGRA #27: Skills e Sub-Agents são auto-ativados quando keywords matcham no prompt.

    v2.0: Suporta tanto skills (/.claude/skills/) quanto sub-agents (/.claude/jarvis/sub-agents/)
    """
    project_dir = get_project_dir()

    try:
        hooks_path = Path(project_dir) / '.claude' / 'hooks'
        sys.path.insert(0, str(hooks_path))

        from skill_router import match_prompt, get_item_context

        matches = match_prompt(prompt)

        if not matches:
            return "", {"decision": "no_match"}

        # Pega o item de maior prioridade
        top_match = matches[0]
        item_type = top_match.get("type", "skill")
        item_name = top_match.get("name", top_match.get("skill", "unknown"))

        # Carrega contexto apropriado (skill summary ou sub-agent context)
        item_context = get_item_context(top_match["path"], item_type)

        if item_context:
            if item_type == "skill":
                context = f"""
[SKILL AUTO-ACTIVATED: {item_name}]
Keyword matched: "{top_match['matched_keyword']}"
Priority: {top_match['priority']}

Use /skill {item_name} for full instructions if needed.
"""
            else:
                context = f"""
[SUB-AGENT AUTO-ACTIVATED: {item_name}]
Type: JARVIS Subordinate
Keyword matched: "{top_match['matched_keyword']}"
Priority: {top_match['priority']}

{item_context}
"""
            return context, {
                "decision": f"{item_type}_activated",
                "name": item_name,
                "type": item_type,
                "keyword": top_match["matched_keyword"],
                "priority": top_match["priority"]
            }

        return "", {"decision": "no_instructions"}

    except Exception as e:
        return "", {"error": str(e), "decision": "skill_router_unavailable"}

def main():
    """Função principal do hook."""
    try:
        # Ler input do hook (stdin)
        input_data = sys.stdin.read()
        hook_input = json.loads(input_data) if input_data else {}

        prompt = hook_input.get('prompt', '')
        session_id = hook_input.get('session_id', 'unknown')

        # Detectar intenções
        intents = detect_special_intents(prompt)

        # Carregar contexto básico
        context_parts = load_context_for_intents(intents)

        # INTEGRAÇÃO MULTI-AGENTE
        agent_context, agent_metadata = try_multi_agent_analysis(prompt)
        if agent_context:
            context_parts.append(agent_context)

        # INTEGRAÇÃO SKILL ROUTING (REGRA #27)
        skill_context, skill_metadata = try_skill_routing(prompt)
        if skill_context:
            context_parts.append(skill_context)

        # Registrar prompt (para análise posterior)
        project_dir = get_project_dir()
        prompts_path = Path(project_dir) / '06-LOGS' / 'prompts.jsonl'
        prompts_path.parent.mkdir(parents=True, exist_ok=True)

        prompt_log = {
            'timestamp': datetime.now().isoformat(),
            'session_id': session_id,
            'prompt_length': len(prompt),
            'intents': intents,
            'multi_agent': agent_metadata.get('decision', 'not_evaluated'),
            'routing': skill_metadata.get('decision', 'not_evaluated'),
            'activated_name': skill_metadata.get('name', None),
            'activated_type': skill_metadata.get('type', None)
        }

        with open(prompts_path, 'a', encoding='utf-8') as f:
            f.write(json.dumps(prompt_log) + '\n')

        # Output
        output = {
            'continue': True,
            'feedback': '\n'.join(context_parts) if context_parts else None
        }

        print(json.dumps(output))

    except Exception as e:
        # Em caso de erro, não bloquear
        error_output = {
            'continue': True,
            'feedback': None
        }
        print(json.dumps(error_output))

if __name__ == '__main__':
    main()
