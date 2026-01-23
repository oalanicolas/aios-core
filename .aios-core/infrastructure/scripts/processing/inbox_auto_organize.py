#!/usr/bin/env python3
"""
INBOX Auto-Organizer v1.0.0
Organiza automaticamente arquivos no 00-INBOX seguindo o protocolo Mega Brain.

Funcionalidades:
1. Detecta fonte (pessoa/empresa) pelo nome do arquivo ou conteudo
2. Detecta tipo de conteudo (PODCASTS, MASTERMINDS, COURSES, etc.)
3. Cria estrutura de pastas automaticamente
4. Move arquivos para local correto
5. Renomeia para padrao CAIXA ALTA + link YouTube
6. Atualiza INBOX-REGISTRY.md
7. Gera relatorio de acoes

Uso:
    python inbox_auto_organize.py           # Modo dry-run (mostra o que faria)
    python inbox_auto_organize.py --execute # Executa as acoes
    python inbox_auto_organize.py --report  # Apenas gera relatorio
"""

import os
import sys
import re
import json
import shutil
import hashlib
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple, Optional

# =============================================================================
# CONFIGURACAO
# =============================================================================

MEGA_BRAIN_ROOT = Path(__file__).parent.parent
INBOX_PATH = MEGA_BRAIN_ROOT / "00-INBOX"
REGISTRY_PATH = MEGA_BRAIN_ROOT / "04-SYSTEM" / "REGISTRY" / "INBOX-REGISTRY.md"
BACKUP_PATH = MEGA_BRAIN_ROOT / "00-INBOX" / "_BACKUP_EXTRAS"

# Mapeamento de fontes conhecidas
KNOWN_SOURCES = {
    # Patterns -> (PESSOA, EMPRESA)
    "hormozi": ("ALEX HORMOZI", "ACQUISITION.COM"),
    "alex hormozi": ("ALEX HORMOZI", "ACQUISITION.COM"),
    "leila": ("LEILA HORMOZI", "ACQUISITION.COM"),
    "cole gordon": ("COLE GORDON", "CLOSERS.IO"),
    "cole": ("COLE GORDON", "CLOSERS.IO"),
    "closers": ("COLE GORDON", "CLOSERS.IO"),
    "jordan lee": ("JORDAN LEE", "AI BUSINESS"),
    "jordan": ("JORDAN LEE", "AI BUSINESS"),
    "jeremy haynes": ("JEREMY HAYNES", "JEREMY HAYNES"),
    "jeremy": ("JEREMY HAYNES", "JEREMY HAYNES"),
    "g4": ("G4 EDUCACAO", "GESTAO 4.0"),
    "gestao 4": ("G4 EDUCACAO", "GESTAO 4.0"),
    "vinicius": ("FULL SALES SYSTEM", "FULL SALES SYSTEM"),
    "full sales": ("FULL SALES SYSTEM", "FULL SALES SYSTEM"),
    "fss": ("FULL SALES SYSTEM", "FULL SALES SYSTEM"),
    "sam oven": ("SAM OVEN", "SETTERLUN UNIVERSITY"),
    "setterlun": ("SAM OVEN", "SETTERLUN UNIVERSITY"),
    "charlie johnson": ("CHARLIE JOHNSON SHOW", "CHARLIE JOHNSON SHOW"),
    "max tornow": ("MAX TORNOW PODCAST", "MAX TORNOW PODCAST"),
    "richard linder": ("RICHARD LINDER", "RICHARD LINDER"),
    "grupo silva": ("GRUPO SILVA", "GRUPO SILVA"),
    "bilhon": ("BILHON", "BILHON"),
}

# Mapeamento de tipos de conteudo
CONTENT_TYPES = {
    # Patterns -> TIPO
    "podcast": "PODCASTS",
    "episode": "PODCASTS",
    "ep.": "PODCASTS",
    "interview": "PODCASTS",
    "masterclass": "MASTERMINDS",
    "mastermind": "MASTERMINDS",
    "summit": "MASTERMINDS",
    "keynote": "MASTERMINDS",
    "blueprint": "BLUEPRINTS",
    "playbook": "BLUEPRINTS",
    "pdf": "BLUEPRINTS",
    "course": "COURSES",
    "module": "COURSES",
    "lesson": "COURSES",
    "aula": "COURSES",
    "training": "COURSES",
    "treinamento": "COURSES",
    "vsl": "VSL",
    "sales letter": "VSL",
    "script": "SCRIPTS",
    "copy": "SCRIPTS",
    "ad": "MARKETING",
    "launch": "MARKETING",
    "promo": "MARKETING",
    "youtube": "YOUTUBE",
    "vlog": "VLOGS",
    "day in": "VLOGS",
    "coaching": "COACHING",
    "sales-training": "SALES-TRAINING",
    "client-accelerator": "CLIENT-ACCELERATOR",
    "ead": "EAD-CLOSER",
}

# Extensoes suportadas
SUPPORTED_EXTENSIONS = {
    ".txt": "transcript",
    ".md": "document",
    ".mp4": "video",
    ".mp3": "audio",
    ".m4a": "audio",
    ".wav": "audio",
    ".pdf": "document",
    ".docx": "document",
    ".xlsx": "spreadsheet",
    ".json": "data",
}


# =============================================================================
# FUNCOES DE DETECCAO
# =============================================================================

def detect_source(filename: str, content: str = "") -> Tuple[str, str]:
    """Detecta a fonte (pessoa/empresa) pelo nome do arquivo ou conteudo."""
    text = (filename + " " + content[:5000]).lower()

    for pattern, (person, company) in KNOWN_SOURCES.items():
        if pattern in text:
            return (person, company)

    return ("_UNKNOWN", "_UNKNOWN")


def detect_content_type(filename: str, content: str = "") -> str:
    """Detecta o tipo de conteudo pelo nome do arquivo ou conteudo."""
    text = (filename + " " + content[:2000]).lower()

    for pattern, content_type in CONTENT_TYPES.items():
        if pattern in text:
            return content_type

    # Default baseado na extensao
    ext = Path(filename).suffix.lower()
    if ext in [".mp4", ".mp3", ".m4a"]:
        return "PODCASTS"
    elif ext == ".pdf":
        return "BLUEPRINTS"
    elif ext == ".txt":
        return "PODCASTS"  # Transcricoes geralmente sao de podcasts/videos

    return "OUTROS"


def extract_youtube_id(filename: str) -> Optional[str]:
    """Extrai ID do YouTube do nome do arquivo."""
    # Pattern: [youtube.com_watch_v=XXXXXXXXXXX]
    match = re.search(r'\[youtube\.com[_/]watch[_/]v[=_]([a-zA-Z0-9_-]+)\]', filename)
    if match:
        return match.group(1)

    # Pattern: youtube.com/watch?v=XXXXXXXXXXX
    match = re.search(r'youtube\.com/watch\?v=([a-zA-Z0-9_-]+)', filename)
    if match:
        return match.group(1)

    # Pattern: youtu.be/XXXXXXXXXXX
    match = re.search(r'youtu\.be/([a-zA-Z0-9_-]+)', filename)
    if match:
        return match.group(1)

    return None


def standardize_filename(filename: str) -> str:
    """Padroniza nome do arquivo para CAIXA ALTA + link YouTube."""
    # Remove extensao temporariamente
    path = Path(filename)
    name = path.stem
    ext = path.suffix.lower()

    # Extrai YouTube ID se existir
    yt_id = extract_youtube_id(name)

    # Remove o link YouTube existente do nome
    name = re.sub(r'\s*\[youtube\.com[_/]watch[_/]v[=_][a-zA-Z0-9_-]+\]', '', name)
    name = re.sub(r'\s*https?://[^\s]+', '', name)

    # Converte para CAIXA ALTA
    name = name.upper().strip()

    # Remove caracteres problematicos
    name = re.sub(r'[<>:"/\\|?*]', '', name)

    # Reconstroi com YouTube ID se existir
    if yt_id:
        name = f"{name} [youtube.com_watch_v={yt_id}]"

    return f"{name}{ext}"


def calculate_md5(file_path: Path) -> str:
    """Calcula hash MD5 de um arquivo."""
    hash_md5 = hashlib.md5()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hash_md5.update(chunk)
    return hash_md5.hexdigest()


# =============================================================================
# FUNCOES DE ORGANIZACAO
# =============================================================================

def scan_inbox_files() -> List[Dict]:
    """Escaneia todos os arquivos no INBOX que precisam ser organizados."""
    files_to_organize = []

    # Percorre todo o INBOX
    for item in INBOX_PATH.rglob("*"):
        # Ignora pastas e arquivos ocultos
        if item.is_dir() or item.name.startswith("."):
            continue

        # Ignora arquivos em _BACKUP ou _TEMPLATES
        if "_BACKUP" in str(item) or "_TEMPLATES" in str(item):
            continue

        # Ignora extensoes nao suportadas
        if item.suffix.lower() not in SUPPORTED_EXTENSIONS:
            continue

        # Verifica se ja esta organizado (em subpasta correta)
        relative = item.relative_to(INBOX_PATH)
        parts = relative.parts

        # Se esta na raiz do INBOX ou em pasta incorreta
        needs_organization = len(parts) <= 2  # Arquivo solto ou em pasta simples

        if needs_organization or not _is_properly_organized(item):
            files_to_organize.append({
                "path": item,
                "name": item.name,
                "extension": item.suffix.lower(),
                "size": item.stat().st_size,
                "modified": datetime.fromtimestamp(item.stat().st_mtime),
            })

    return files_to_organize


def _is_properly_organized(file_path: Path) -> bool:
    """Verifica se um arquivo esta organizado corretamente."""
    relative = file_path.relative_to(INBOX_PATH)
    parts = relative.parts

    # Estrutura correta: PESSOA (EMPRESA)/TIPO/arquivo.ext
    if len(parts) < 3:
        return False

    # Verifica se a pasta pai e um tipo conhecido
    parent_folder = parts[-2].upper()
    known_types = set(CONTENT_TYPES.values())
    known_types.add("OUTROS")

    if parent_folder not in known_types:
        return False

    # Verifica se o nome do arquivo segue a convencao UPPERCASE
    filename = file_path.stem  # Nome sem extensao
    # Remove o sufixo do YouTube ID para verificar
    name_without_yt = re.sub(r'\s*\[youtube\.com[_/]watch[_/]v[=_][a-zA-Z0-9_-]+\]', '', filename)

    # Se o nome (sem YouTube ID) nao esta em UPPERCASE, precisa ser padronizado
    if name_without_yt != name_without_yt.upper():
        return False

    return True


def determine_destination(file_info: Dict) -> Tuple[Path, str]:
    """Determina o destino correto para um arquivo."""
    file_path = file_info["path"]
    filename = file_info["name"]

    # Le conteudo se for texto
    content = ""
    if file_info["extension"] in [".txt", ".md"]:
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
        except:
            pass

    # Detecta fonte e tipo
    person, company = detect_source(filename, content)
    content_type = detect_content_type(filename, content)

    # Monta pasta destino
    if person == "_UNKNOWN":
        folder_name = "_UNKNOWN"
    else:
        folder_name = f"{person} ({company})" if company != person else person

    dest_folder = INBOX_PATH / folder_name / content_type

    # Padroniza nome do arquivo
    new_filename = standardize_filename(filename)

    return dest_folder, new_filename


def organize_file(file_info: Dict, dry_run: bool = True) -> Dict:
    """Organiza um arquivo, movendo para a pasta correta."""
    source_path = file_info["path"]
    dest_folder, new_filename = determine_destination(file_info)
    dest_path = dest_folder / new_filename

    action = {
        "source": str(source_path),
        "destination": str(dest_path),
        "folder_created": False,
        "renamed": new_filename != file_info["name"],
        "moved": str(source_path.parent) != str(dest_folder),
        "success": False,
        "error": None,
    }

    if dry_run:
        action["success"] = True
        action["dry_run"] = True
        return action

    try:
        # Cria pasta se nao existir
        if not dest_folder.exists():
            dest_folder.mkdir(parents=True, exist_ok=True)
            action["folder_created"] = True

        # Evita sobrescrever arquivo existente
        if dest_path.exists():
            # Adiciona timestamp para evitar conflito
            timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
            stem = dest_path.stem
            suffix = dest_path.suffix
            dest_path = dest_folder / f"{stem}_{timestamp}{suffix}"
            action["destination"] = str(dest_path)

        # Move o arquivo
        shutil.move(str(source_path), str(dest_path))
        action["success"] = True

    except Exception as e:
        action["error"] = str(e)

    return action


def update_registry(actions: List[Dict]) -> bool:
    """Atualiza o INBOX-REGISTRY.md com os arquivos organizados."""
    if not REGISTRY_PATH.exists():
        return False

    try:
        with open(REGISTRY_PATH, "r", encoding="utf-8") as f:
            content = f.read()

        # Adiciona entrada no changelog
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
        organized_count = len([a for a in actions if a["success"]])

        changelog_entry = f"| {timestamp} | AUTO-ORGANIZE | {organized_count} arquivos organizados automaticamente |"

        # Insere antes do ultimo "---"
        if "## CHANGELOG" in content:
            parts = content.split("## CHANGELOG")
            if len(parts) == 2:
                changelog_section = parts[1]
                lines = changelog_section.split("\n")
                # Encontra a linha da tabela para inserir
                for i, line in enumerate(lines):
                    if line.startswith("| Data"):
                        # Insere apos o header da tabela
                        lines.insert(i + 2, changelog_entry)
                        break
                parts[1] = "\n".join(lines)
                content = "## CHANGELOG".join(parts)

        with open(REGISTRY_PATH, "w", encoding="utf-8") as f:
            f.write(content)

        return True
    except Exception as e:
        print(f"Erro ao atualizar registry: {e}")
        return False


# =============================================================================
# FUNCOES DE RELATORIO
# =============================================================================

def generate_report(actions: List[Dict], dry_run: bool = True) -> str:
    """Gera relatorio das acoes de organizacao."""
    report = []
    report.append("=" * 70)
    report.append("MEGA BRAIN - INBOX AUTO-ORGANIZER")
    report.append(f"Data: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    report.append(f"Modo: {'DRY-RUN (simulacao)' if dry_run else 'EXECUCAO'}")
    report.append("=" * 70)
    report.append("")

    if not actions:
        report.append("Nenhum arquivo precisa ser organizado.")
        report.append("O INBOX ja esta organizado corretamente.")
        return "\n".join(report)

    # Agrupa por destino
    by_destination = {}
    for action in actions:
        dest_folder = str(Path(action["destination"]).parent)
        if dest_folder not in by_destination:
            by_destination[dest_folder] = []
        by_destination[dest_folder].append(action)

    # Lista acoes por pasta
    for folder, folder_actions in sorted(by_destination.items()):
        report.append(f"📁 {folder}")
        for action in folder_actions:
            status = "✅" if action["success"] else "❌"
            source_name = Path(action["source"]).name
            dest_name = Path(action["destination"]).name

            if action.get("renamed") and action.get("moved"):
                report.append(f"   {status} {source_name}")
                report.append(f"      → {dest_name}")
            elif action.get("moved"):
                report.append(f"   {status} {source_name} (movido)")
            elif action.get("renamed"):
                report.append(f"   {status} {source_name} → {dest_name}")

            if action.get("error"):
                report.append(f"      ⚠️ Erro: {action['error']}")
        report.append("")

    # Resumo
    report.append("=" * 70)
    report.append("RESUMO")
    report.append("=" * 70)

    total = len(actions)
    success = len([a for a in actions if a["success"]])
    failed = total - success
    renamed = len([a for a in actions if a.get("renamed")])
    folders_created = len(set([a["destination"] for a in actions if a.get("folder_created")]))

    report.append(f"Total de arquivos: {total}")
    report.append(f"Organizados com sucesso: {success}")
    report.append(f"Falhas: {failed}")
    report.append(f"Renomeados: {renamed}")
    report.append(f"Pastas criadas: {folders_created}")
    report.append("")

    if dry_run:
        report.append("⚠️ MODO DRY-RUN: Nenhuma acao foi executada.")
        report.append("   Execute com --execute para aplicar as mudancas.")

    report.append("=" * 70)

    return "\n".join(report)


# =============================================================================
# MAIN
# =============================================================================

def main():
    """Entry point principal."""
    import argparse

    parser = argparse.ArgumentParser(description="INBOX Auto-Organizer")
    parser.add_argument("--execute", action="store_true", help="Executa as acoes (default: dry-run)")
    parser.add_argument("--report", action="store_true", help="Apenas gera relatorio")
    parser.add_argument("--json", action="store_true", help="Output em JSON")
    args = parser.parse_args()

    dry_run = not args.execute

    if not INBOX_PATH.exists():
        print(f"Erro: INBOX nao encontrado: {INBOX_PATH}")
        sys.exit(1)

    # Escaneia arquivos
    files = scan_inbox_files()

    if not files:
        print("INBOX ja esta organizado. Nenhuma acao necessaria.")
        return

    # Determina acoes
    actions = []
    for file_info in files:
        action = organize_file(file_info, dry_run=dry_run)
        actions.append(action)

    # Atualiza registry se executou
    if not dry_run:
        update_registry(actions)

    # Output
    if args.json:
        print(json.dumps(actions, indent=2, default=str))
    else:
        report = generate_report(actions, dry_run=dry_run)
        print(report)


if __name__ == "__main__":
    main()
