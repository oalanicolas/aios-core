#!/usr/bin/env python3
"""
File Registry - OPT-001 & OPT-002 Implementation

Manages file tracking with:
- MD5 hashes for integrity verification
- Timestamps for temporal tracking
- Automatic change detection

Usage:
    python file_registry.py --scan          # Scan all files and update registry
    python file_registry.py --check FILE    # Check if file changed
    python file_registry.py --status        # Show registry status
    python file_registry.py --export        # Export to markdown
"""

import argparse
import hashlib
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

# Base paths
MEGA_BRAIN_ROOT = Path("/Users/thiagofinch/Documents/Mega Brain")
INBOX_PATH = MEGA_BRAIN_ROOT / "00-INBOX"
KNOWLEDGE_PATH = MEGA_BRAIN_ROOT / "02-KNOWLEDGE"
REGISTRY_PATH = MEGA_BRAIN_ROOT / "04-SYSTEM" / "REGISTRY"
REGISTRY_JSON = REGISTRY_PATH / "file-registry.json"
REGISTRY_MD = REGISTRY_PATH / "processed-files.md"


def calculate_md5(file_path: Path) -> str:
    """Calculate MD5 hash of a file."""
    hash_md5 = hashlib.md5()
    try:
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_md5.update(chunk)
        return hash_md5.hexdigest()
    except Exception as e:
        return f"ERROR: {e}"


def get_file_info(file_path: Path) -> Dict:
    """Get comprehensive file information."""
    stat = file_path.stat()
    return {
        "path": str(file_path.relative_to(MEGA_BRAIN_ROOT)),
        "name": file_path.name,
        "md5": calculate_md5(file_path),
        "size_bytes": stat.st_size,
        "size_human": format_size(stat.st_size),
        "modified_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
        "extension": file_path.suffix.lower(),
    }


def format_size(size_bytes: int) -> str:
    """Format bytes to human readable."""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size_bytes < 1024:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024
    return f"{size_bytes:.1f} TB"


def load_registry() -> Dict:
    """Load existing registry from JSON."""
    if REGISTRY_JSON.exists():
        with open(REGISTRY_JSON, "r", encoding="utf-8") as f:
            return json.load(f)
    return {
        "version": "1.0.0",
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
        "files": {}
    }


def save_registry(registry: Dict):
    """Save registry to JSON."""
    registry["updated_at"] = datetime.now().isoformat()
    REGISTRY_PATH.mkdir(parents=True, exist_ok=True)
    with open(REGISTRY_JSON, "w", encoding="utf-8") as f:
        json.dump(registry, f, indent=2, ensure_ascii=False)


def register_file(registry: Dict, file_path: Path, status: str = "indexed",
                  legacy_id: Optional[str] = None, notes: Optional[str] = None) -> Dict:
    """Register or update a file in the registry."""
    file_info = get_file_info(file_path)
    file_key = file_info["path"]

    now = datetime.now().isoformat()

    if file_key in registry["files"]:
        # Update existing entry
        existing = registry["files"][file_key]
        old_md5 = existing.get("md5")

        entry = {
            **existing,
            **file_info,
            "status": status,
            "updated_at": now,
            "change_detected": old_md5 != file_info["md5"] if old_md5 else False,
        }

        if entry["change_detected"]:
            entry["previous_md5"] = old_md5
            entry["change_detected_at"] = now
    else:
        # New entry
        entry = {
            **file_info,
            "status": status,
            "registered_at": now,
            "updated_at": now,
            "change_detected": False,
        }

    # Add optional fields
    if legacy_id:
        entry["legacy_id"] = legacy_id
    if notes:
        entry["notes"] = notes

    registry["files"][file_key] = entry
    return entry


def scan_directory(directory: Path, extensions: List[str] = None) -> List[Path]:
    """Scan directory for files."""
    files = []
    for file_path in directory.rglob("*"):
        if file_path.is_file():
            if extensions is None or file_path.suffix.lower() in extensions:
                # Skip hidden files and system files
                if not any(part.startswith('.') for part in file_path.parts):
                    files.append(file_path)
    return sorted(files)


def scan_all_files(registry: Dict) -> Dict:
    """Scan all relevant directories and update registry."""
    print("Scanning INBOX...")
    inbox_files = scan_directory(INBOX_PATH, ['.txt', '.md', '.pdf'])

    print("Scanning KNOWLEDGE...")
    knowledge_files = scan_directory(KNOWLEDGE_PATH, ['.md'])

    all_files = inbox_files + knowledge_files

    print(f"\nFound {len(all_files)} files to process...")

    new_count = 0
    changed_count = 0

    for i, file_path in enumerate(all_files):
        if (i + 1) % 20 == 0:
            print(f"  Processing {i + 1}/{len(all_files)}...")

        file_key = str(file_path.relative_to(MEGA_BRAIN_ROOT))
        was_registered = file_key in registry["files"]

        entry = register_file(registry, file_path)

        if not was_registered:
            new_count += 1
        elif entry.get("change_detected"):
            changed_count += 1

    print(f"\nResults:")
    print(f"  New files: {new_count}")
    print(f"  Changed files: {changed_count}")
    print(f"  Total tracked: {len(registry['files'])}")

    return registry


def export_to_markdown(registry: Dict) -> str:
    """Export registry to markdown format."""
    lines = [
        "# File Registry - Mega Brain",
        "",
        f"> **Gerado em:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        f"> **Total de arquivos:** {len(registry['files'])}",
        "",
        "---",
        "",
    ]

    # Group by directory
    by_directory = {}
    for path, info in registry["files"].items():
        parts = Path(path).parts
        if len(parts) > 1:
            dir_name = parts[0]
        else:
            dir_name = "ROOT"

        if dir_name not in by_directory:
            by_directory[dir_name] = []
        by_directory[dir_name].append((path, info))

    # Generate sections
    for dir_name in sorted(by_directory.keys()):
        files = by_directory[dir_name]
        lines.append(f"## {dir_name}")
        lines.append("")
        lines.append("| Arquivo | MD5 (8 chars) | Tamanho | Registrado | Status |")
        lines.append("|---------|---------------|---------|------------|--------|")

        for path, info in sorted(files, key=lambda x: x[0]):
            name = info.get("name", Path(path).name)
            md5_short = info.get("md5", "N/A")[:8]
            size = info.get("size_human", "N/A")
            registered = info.get("registered_at", "N/A")[:10]
            status = info.get("status", "unknown")

            # Add change indicator
            if info.get("change_detected"):
                status = f"{status} **(CHANGED)**"

            # Truncate long names
            if len(name) > 40:
                name = name[:37] + "..."

            lines.append(f"| {name} | `{md5_short}` | {size} | {registered} | {status} |")

        lines.append("")

    # Add legend
    lines.extend([
        "---",
        "",
        "## Legenda",
        "",
        "| Status | Significado |",
        "|--------|-------------|",
        "| indexed | Arquivo indexado no RAG |",
        "| processed | Conhecimento extraído |",
        "| pending | Aguardando processamento |",
        "| **(CHANGED)** | Hash MD5 diferente da última vez |",
        "",
        "---",
        "",
        f"*Registry version: {registry.get('version', '1.0.0')}*",
    ])

    return "\n".join(lines)


def check_file(registry: Dict, file_path: Path) -> Dict:
    """Check if a file has changed since last registration."""
    file_key = str(file_path.relative_to(MEGA_BRAIN_ROOT))

    if file_key not in registry["files"]:
        return {
            "status": "not_registered",
            "message": f"File not in registry: {file_path.name}"
        }

    stored = registry["files"][file_key]
    current_md5 = calculate_md5(file_path)
    stored_md5 = stored.get("md5", "")

    if current_md5 == stored_md5:
        return {
            "status": "unchanged",
            "message": f"File unchanged: {file_path.name}",
            "md5": current_md5,
            "registered_at": stored.get("registered_at"),
        }
    else:
        return {
            "status": "changed",
            "message": f"FILE CHANGED: {file_path.name}",
            "old_md5": stored_md5,
            "new_md5": current_md5,
            "registered_at": stored.get("registered_at"),
        }


def show_status(registry: Dict):
    """Show registry status summary."""
    files = registry.get("files", {})

    print("=" * 60)
    print("FILE REGISTRY STATUS")
    print("=" * 60)
    print(f"\nVersion: {registry.get('version', 'N/A')}")
    print(f"Created: {registry.get('created_at', 'N/A')[:19]}")
    print(f"Updated: {registry.get('updated_at', 'N/A')[:19]}")
    print(f"\nTotal files tracked: {len(files)}")

    # Count by status
    by_status = {}
    by_extension = {}
    total_size = 0
    changed_count = 0

    for path, info in files.items():
        status = info.get("status", "unknown")
        by_status[status] = by_status.get(status, 0) + 1

        ext = info.get("extension", "other")
        by_extension[ext] = by_extension.get(ext, 0) + 1

        total_size += info.get("size_bytes", 0)

        if info.get("change_detected"):
            changed_count += 1

    print(f"\nBy Status:")
    for status, count in sorted(by_status.items()):
        print(f"  {status}: {count}")

    print(f"\nBy Extension:")
    for ext, count in sorted(by_extension.items(), key=lambda x: -x[1]):
        print(f"  {ext}: {count}")

    print(f"\nTotal size: {format_size(total_size)}")

    if changed_count > 0:
        print(f"\n⚠️  Files with detected changes: {changed_count}")

    print("=" * 60)


def main():
    parser = argparse.ArgumentParser(description="File Registry Manager")
    parser.add_argument("--scan", action="store_true", help="Scan all files and update registry")
    parser.add_argument("--check", type=str, help="Check if specific file changed")
    parser.add_argument("--status", action="store_true", help="Show registry status")
    parser.add_argument("--export", action="store_true", help="Export to markdown")

    args = parser.parse_args()

    registry = load_registry()

    if args.scan:
        registry = scan_all_files(registry)
        save_registry(registry)
        print("\nRegistry saved!")

        # Also export to markdown
        md_content = export_to_markdown(registry)
        with open(REGISTRY_MD, "w", encoding="utf-8") as f:
            f.write(md_content)
        print(f"Markdown exported to: {REGISTRY_MD}")

    elif args.check:
        file_path = Path(args.check)
        if not file_path.is_absolute():
            file_path = MEGA_BRAIN_ROOT / file_path

        result = check_file(registry, file_path)
        print(f"\nStatus: {result['status']}")
        print(f"Message: {result['message']}")
        if "md5" in result:
            print(f"MD5: {result['md5']}")
        if "old_md5" in result:
            print(f"Old MD5: {result['old_md5']}")
            print(f"New MD5: {result['new_md5']}")

    elif args.status:
        show_status(registry)

    elif args.export:
        md_content = export_to_markdown(registry)
        with open(REGISTRY_MD, "w", encoding="utf-8") as f:
            f.write(md_content)
        print(f"Exported to: {REGISTRY_MD}")

    else:
        parser.print_help()


if __name__ == "__main__":
    main()
