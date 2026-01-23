#!/usr/bin/env python3
"""
ORGANIZE INBOX TO KNOWLEDGE
============================
Move arquivos tagueados do INBOX para estrutura definitiva em 02-KNOWLEDGE.

Regra #7 do CLAUDE.md: INBOX é temporário, não pode acumular.

MAPEAMENTO DE TAGS:
- JM-XXXX     → JEREMY-MINER
- JH-XX-XXXX  → JEREMY-HAYNES (WK=Weekly, IC=Inner Circle, ST=Sales Training)
- CG-XXXX    → COLE-GORDON
- AH-XXXX    → ALEX-HORMOZI
- G4-XXXX    → G4-EDUCACAO
- FSS-XXXX   → FULL-SALES-SYSTEM
- TSC-XXXX   → THE-SCALABLE-COMPANY
- PAF-XXXX   → PAF (A Definir)
- EDC-XXXX   → EAD-CLOSER
- AOBA-XXXX  → AOBA (A Definir)
- CA-XXXX    → CLIENT-ACCELERATOR
- UHTC-XXXX  → UHTC (A Definir)
- STA-XXXX   → STA (A Definir)
- LYFC-XXXX  → LYFC (A Definir)
- MMM-XXXX   → MMM (A Definir)
- PCVP-XXXX  → PCVP (A Definir)
- GS-XXXX    → GRUPO-SILVA
- 30DC-XXXX  → 30-DAY-CHALLENGE

Autor: JARVIS
Data: 2026-01-11
"""

import os
import re
import json
import shutil
from datetime import datetime
from pathlib import Path
from collections import defaultdict

# Configuração
MEGA_BRAIN = Path("/Users/thiagofinch/Documents/Mega Brain")
INBOX = MEGA_BRAIN / "00-INBOX"
KNOWLEDGE = MEGA_BRAIN / "02-KNOWLEDGE"
LOGS_DIR = MEGA_BRAIN / "06-LOGS"

# Mapeamento TAG PREFIX -> NOME DA PASTA
TAG_TO_FOLDER = {
    # Pessoas principais
    "JM": "JEREMY-MINER",
    "JH": "JEREMY-HAYNES",
    "CG": "COLE-GORDON",
    "AH": "ALEX-HORMOZI",

    # Cursos/Fontes G4/FSS
    "G4": "G4-EDUCACAO",
    "FSS": "FULL-SALES-SYSTEM",
    "EDC": "EAD-CLOSER",
    "PAF": "FULL-SALES-SYSTEM",  # PAF = Parte do Full Sales System

    # The Scalable Company
    "TSC": "THE-SCALABLE-COMPANY",

    # Client Accelerator
    "CA": "CLIENT-ACCELERATOR",
    "PCVP": "CLIENT-ACCELERATOR",  # PCVP = Power of Cold Video Prospecting (Client Accelerator)

    # Jeremy Haynes - Cursos específicos
    "AOBA": "JEREMY-HAYNES",  # AOBA = Agency Owner Black Academy
    "UHTC": "JEREMY-HAYNES",  # UHTC = Ultimate High Ticket Closing
    "STA": "JEREMY-HAYNES",   # STA = Sales Training Academy
    "LYFC": "JEREMY-HAYNES",  # LYFC = Lead Your First Client
    "MMM": "JEREMY-HAYNES",   # MMM = Million Money Mindset

    # Outras fontes
    "GS": "GRUPO-SILVA",
    "30DC": "30-DAY-CHALLENGE",
}

# Sub-categorias do Jeremy Haynes
JH_SUBCATEGORIES = {
    "WK": "WEEKLY-CALLS",
    "IC": "INNER-CIRCLE",
    "ST": "SALES-TRAINING",
}

# Cursos específicos que vão para subpastas
COURSE_PREFIXES = {
    "AOBA": "AOBA-AGENCY-OWNER-BLACK-ACADEMY",
    "UHTC": "UHTC-ULTIMATE-HIGH-TICKET-CLOSING",
    "STA": "STA-SALES-TRAINING-ACADEMY",
    "LYFC": "LYFC-LEAD-YOUR-FIRST-CLIENT",
    "MMM": "MMM-MILLION-MONEY-MINDSET",
    "PCVP": "PCVP-POWER-COLD-VIDEO-PROSPECTING",
}

# Regex para extrair tag
TAG_PATTERN = re.compile(r'\[([A-Z0-9]+(?:-[A-Z]+)?-\d+)\]')


def extract_tag_info(filename: str) -> tuple:
    """
    Extrai informações da tag do nome do arquivo.

    Returns:
        tuple: (tag_completa, prefixo_base, subcategoria, numero)
        Exemplo: ("[JH-WK-0035]", "JH", "WK", "0035")
    """
    match = TAG_PATTERN.search(filename)
    if not match:
        return None, None, None, None

    full_tag = match.group(1)
    parts = full_tag.split("-")

    if len(parts) == 2:
        # Formato: XX-NNNN (ex: JM-0001)
        return full_tag, parts[0], None, parts[1]
    elif len(parts) == 3:
        # Formato: XX-YY-NNNN (ex: JH-WK-0035)
        return full_tag, parts[0], parts[1], parts[2]
    else:
        return full_tag, parts[0], None, "-".join(parts[1:])


def get_destination_folder(prefix: str, subcategory: str = None) -> Path:
    """
    Determina a pasta de destino baseado no prefixo da tag.

    Estrutura de destino:
    02-KNOWLEDGE/
    └── SOURCES/
        └── {NOME-FONTE}/
            └── RAW/
                └── [SUBCATEGORIA/] (opcional)
    """
    if prefix not in TAG_TO_FOLDER:
        return None

    folder_name = TAG_TO_FOLDER[prefix]
    base_path = KNOWLEDGE / "SOURCES" / folder_name / "RAW"

    # Jeremy Haynes tem subcategorias (JH-WK, JH-IC, JH-ST)
    if prefix == "JH" and subcategory and subcategory in JH_SUBCATEGORIES:
        base_path = base_path / JH_SUBCATEGORIES[subcategory]

    # Cursos específicos vão para subpastas próprias
    elif prefix in COURSE_PREFIXES:
        base_path = base_path / COURSE_PREFIXES[prefix]

    return base_path


def scan_inbox() -> dict:
    """
    Escaneia o INBOX e retorna estatísticas dos arquivos tagueados.

    Returns:
        dict com:
        - files: lista de dicts com info de cada arquivo
        - stats: estatísticas por prefixo
        - errors: arquivos com problemas
    """
    result = {
        "files": [],
        "stats": defaultdict(int),
        "by_prefix": defaultdict(list),
        "errors": [],
        "no_tag": [],
    }

    # Pastas a ignorar (backup, temp, etc)
    ignore_prefixes = ("_", ".")

    for root, dirs, files in os.walk(INBOX):
        # Ignorar pastas de backup/temp
        dirs[:] = [d for d in dirs if not d.startswith(ignore_prefixes)]

        for filename in files:
            if not filename.endswith(".txt"):
                continue

            filepath = Path(root) / filename
            relative_path = filepath.relative_to(INBOX)

            full_tag, prefix, subcat, number = extract_tag_info(filename)

            if not full_tag:
                result["no_tag"].append(str(relative_path))
                continue

            dest_folder = get_destination_folder(prefix, subcat)

            file_info = {
                "source": str(filepath),
                "relative": str(relative_path),
                "filename": filename,
                "tag": full_tag,
                "prefix": prefix,
                "subcategory": subcat,
                "number": number,
                "destination": str(dest_folder) if dest_folder else None,
                "can_move": dest_folder is not None,
            }

            result["files"].append(file_info)
            result["stats"][prefix] += 1
            result["by_prefix"][prefix].append(file_info)

            if not dest_folder:
                result["errors"].append({
                    "file": str(relative_path),
                    "reason": f"Prefixo desconhecido: {prefix}"
                })

    return result


def create_destination_structure():
    """
    Cria a estrutura de pastas de destino se não existir.
    """
    created = []

    for prefix, folder_name in TAG_TO_FOLDER.items():
        base_path = KNOWLEDGE / "SOURCES" / folder_name / "RAW"

        if not base_path.exists():
            base_path.mkdir(parents=True, exist_ok=True)
            created.append(str(base_path))

        # Subcategorias para Jeremy Haynes
        if prefix == "JH":
            for subcat_name in JH_SUBCATEGORIES.values():
                subpath = base_path / subcat_name
                if not subpath.exists():
                    subpath.mkdir(parents=True, exist_ok=True)
                    created.append(str(subpath))

    return created


def move_files(files: list, dry_run: bool = True) -> dict:
    """
    Move arquivos para suas pastas de destino.

    Args:
        files: Lista de file_info dicts do scan_inbox()
        dry_run: Se True, apenas simula (não move de verdade)

    Returns:
        dict com resultados da movimentação
    """
    result = {
        "moved": [],
        "skipped": [],
        "errors": [],
        "dry_run": dry_run,
    }

    for file_info in files:
        if not file_info["can_move"]:
            result["skipped"].append({
                "file": file_info["relative"],
                "reason": "Sem destino definido"
            })
            continue

        src = Path(file_info["source"])
        dest_folder = Path(file_info["destination"])
        dest = dest_folder / file_info["filename"]

        # Verificar se destino já existe
        if dest.exists():
            result["skipped"].append({
                "file": file_info["relative"],
                "reason": "Já existe no destino"
            })
            continue

        try:
            if not dry_run:
                dest_folder.mkdir(parents=True, exist_ok=True)
                shutil.move(str(src), str(dest))

            result["moved"].append({
                "from": file_info["relative"],
                "to": str(dest.relative_to(MEGA_BRAIN)),
                "tag": file_info["tag"],
            })
        except Exception as e:
            result["errors"].append({
                "file": file_info["relative"],
                "error": str(e)
            })

    return result


def generate_report(scan_result: dict, move_result: dict = None) -> str:
    """
    Gera relatório visual do plano de migração.
    """
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    report = f"""
╔══════════════════════════════════════════════════════════════════════════════╗
║            PLANO DE MIGRAÇÃO: INBOX → 02-KNOWLEDGE                           ║
║                      REGRA #7 - INBOX É TEMPORÁRIO                           ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Data: {timestamp:<62} ║
╚══════════════════════════════════════════════════════════════════════════════╝

┌──────────────────────────────────────────────────────────────────────────────┐
│                           RESUMO DO SCAN                                     │
├──────────────────────────────────────────────────────────────────────────────┤
│  📁 Total de arquivos tagueados:     {len(scan_result['files']):<36} │
│  ❌ Arquivos sem tag:                {len(scan_result['no_tag']):<36} │
│  ⚠️  Prefixos desconhecidos:          {len(scan_result['errors']):<36} │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                        DISTRIBUIÇÃO POR PREFIXO                              │
├───────────────┬──────────┬───────────────────────────────────────────────────┤
│  PREFIXO      │  QTD     │  DESTINO                                          │
├───────────────┼──────────┼───────────────────────────────────────────────────┤
"""

    # Ordenar por quantidade
    sorted_prefixes = sorted(scan_result['stats'].items(), key=lambda x: -x[1])

    for prefix, count in sorted_prefixes:
        folder = TAG_TO_FOLDER.get(prefix, "❓ NÃO MAPEADO")
        report += f"│  {prefix:<12} │  {count:>6}  │  {folder:<49} │\n"

    report += "└───────────────┴──────────┴───────────────────────────────────────────────────┘\n"

    # Se tiver resultado de movimentação
    if move_result:
        mode = "SIMULAÇÃO (DRY RUN)" if move_result["dry_run"] else "EXECUÇÃO REAL"
        report += f"""
┌──────────────────────────────────────────────────────────────────────────────┐
│                        RESULTADO DA MOVIMENTAÇÃO                             │
│                              [{mode}]                              │
├──────────────────────────────────────────────────────────────────────────────┤
│  ✅ Movidos:                         {len(move_result['moved']):<36} │
│  ⏭️  Pulados:                         {len(move_result['skipped']):<36} │
│  ❌ Erros:                           {len(move_result['errors']):<36} │
└──────────────────────────────────────────────────────────────────────────────┘
"""

    # Mapeamento de destinos
    report += """
┌──────────────────────────────────────────────────────────────────────────────┐
│                        MAPEAMENTO DE DESTINOS                                │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  INBOX/                                                                      │
│  └── [TAG-XXXX] arquivo.txt                                                  │
│         │                                                                    │
│         ▼                                                                    │
│  02-KNOWLEDGE/SOURCES/{FONTE}/RAW/                                          │
│  └── [TAG-XXXX] arquivo.txt                                                  │
│                                                                              │
│  SUBCATEGORIAS (Jeremy Haynes):                                              │
│  └── JH-WK-XXXX → .../JEREMY-HAYNES/RAW/WEEKLY-CALLS/                       │
│  └── JH-IC-XXXX → .../JEREMY-HAYNES/RAW/INNER-CIRCLE/                       │
│  └── JH-ST-XXXX → .../JEREMY-HAYNES/RAW/SALES-TRAINING/                     │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                           PRÓXIMOS PASSOS                                    │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. Revisar mapeamento de prefixos desconhecidos:                           │
│     - PAF, AOBA, UHTC, STA, LYFC, MMM, PCVP                                │
│                                                                              │
│  2. Aprovar plano de migração                                               │
│                                                                              │
│  3. Executar migração:                                                       │
│     python3 SCRIPTS/organize_inbox_to_knowledge.py --execute                │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
"""

    return report


def save_migration_log(scan_result: dict, move_result: dict):
    """
    Salva log detalhado da migração em JSON.
    """
    log_file = LOGS_DIR / "MIGRATIONS" / f"INBOX-TO-KNOWLEDGE-{datetime.now().strftime('%Y%m%d-%H%M%S')}.json"
    log_file.parent.mkdir(parents=True, exist_ok=True)

    log_data = {
        "timestamp": datetime.now().isoformat(),
        "scan": {
            "total_files": len(scan_result["files"]),
            "stats": dict(scan_result["stats"]),
            "no_tag_count": len(scan_result["no_tag"]),
            "error_count": len(scan_result["errors"]),
        },
        "move": move_result,
    }

    with open(log_file, "w", encoding="utf-8") as f:
        json.dump(log_data, f, indent=2, ensure_ascii=False)

    return log_file


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Migrar arquivos do INBOX para 02-KNOWLEDGE")
    parser.add_argument("--scan", action="store_true", help="Apenas escanear (default)")
    parser.add_argument("--dry-run", action="store_true", help="Simular movimentação")
    parser.add_argument("--execute", action="store_true", help="Executar movimentação real")
    parser.add_argument("--create-structure", action="store_true", help="Criar estrutura de pastas")

    args = parser.parse_args()

    print("\n🔍 Escaneando INBOX...")
    scan_result = scan_inbox()

    if args.create_structure:
        print("\n📁 Criando estrutura de pastas...")
        created = create_destination_structure()
        print(f"   Criadas {len(created)} pastas")
        for p in created:
            print(f"   └── {p}")

    move_result = None

    if args.dry_run:
        print("\n🧪 Simulando movimentação (dry-run)...")
        move_result = move_files(scan_result["files"], dry_run=True)
    elif args.execute:
        print("\n🚀 Executando movimentação real...")
        move_result = move_files(scan_result["files"], dry_run=False)
        log_file = save_migration_log(scan_result, move_result)
        print(f"\n📝 Log salvo em: {log_file}")

    # Gerar e exibir relatório
    report = generate_report(scan_result, move_result)
    print(report)


if __name__ == "__main__":
    main()
