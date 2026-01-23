#!/usr/bin/env python3
"""
Mega Brain RAG Status CLI

Show status and statistics of the RAG index.

Usage:
    python rag_status.py
    python rag_status.py --json
"""

import argparse
import json
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from rag.config import CHROMA, PATHS
from rag.vectorstore import VectorStore


def format_percentage(value: int, total: int) -> str:
    """Format as percentage string."""
    if total == 0:
        return "0.0%"
    return f"{(value / total) * 100:.1f}%"


def print_status(stats: dict, collection_name: str, persist_dir: str):
    """Print formatted status."""
    print("=" * 70)
    print("MEGA BRAIN RAG STATUS")
    print("=" * 70)
    print()
    print(f"Collection: {collection_name}")
    print(f"Location:   {persist_dir}")
    print()

    total = stats["total_chunks"]

    print("📊 INDEX STATISTICS")
    print("-" * 70)
    print(f"Total chunks: {total}")
    print()

    # By source type
    print("📁 BY SOURCE TYPE")
    print("-" * 70)
    for source_type, count in sorted(stats["by_type"].items()):
        pct = format_percentage(count, total)
        bar_len = int((count / total) * 30) if total > 0 else 0
        bar = "█" * bar_len + "░" * (30 - bar_len)
        print(f"  {source_type:<15} [{bar}] {count:>5} ({pct:>5})")
    print()

    # By theme
    print("📂 BY THEME")
    print("-" * 70)
    for theme, count in sorted(stats["by_theme"].items()):
        pct = format_percentage(count, total)
        bar_len = int((count / total) * 30) if total > 0 else 0
        bar = "█" * bar_len + "░" * (30 - bar_len)
        print(f"  {theme:<25} [{bar}] {count:>5} ({pct:>5})")
    print()

    # By source person
    print("👤 BY SOURCE PERSON")
    print("-" * 70)
    for source, count in sorted(stats["by_source"].items(), key=lambda x: -x[1]):
        pct = format_percentage(count, total)
        bar_len = int((count / total) * 30) if total > 0 else 0
        bar = "█" * bar_len + "░" * (30 - bar_len)
        print(f"  {source:<20} [{bar}] {count:>5} ({pct:>5})")

    print()
    print("=" * 70)


def main():
    parser = argparse.ArgumentParser(
        description="Show Mega Brain RAG index status",
    )

    parser.add_argument(
        "--json",
        action="store_true",
        help="Output as JSON"
    )

    args = parser.parse_args()

    # Initialize vector store
    try:
        store = VectorStore()
    except Exception as e:
        if args.json:
            print(json.dumps({"error": str(e), "status": "not_initialized"}))
        else:
            print("Error: RAG index not initialized.")
            print(f"Details: {e}")
            print("\nRun 'python rag_index.py --full' to create the index.")
        return 1

    # Check if empty
    if store.count() == 0:
        if args.json:
            print(json.dumps({
                "status": "empty",
                "total_chunks": 0,
                "message": "No documents indexed"
            }))
        else:
            print("RAG index is empty.")
            print("Run 'python rag_index.py --full' to index documents.")
        return 0

    # Get stats
    stats = store.get_stats()

    # Output
    if args.json:
        output = {
            "status": "ready",
            "collection_name": CHROMA["collection_name"],
            "persist_directory": CHROMA["persist_directory"],
            **stats
        }
        print(json.dumps(output, indent=2, ensure_ascii=False))
    else:
        print_status(
            stats,
            CHROMA["collection_name"],
            CHROMA["persist_directory"]
        )

    return 0


if __name__ == "__main__":
    sys.exit(main())
