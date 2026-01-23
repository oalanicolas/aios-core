#!/usr/bin/env python3
"""
Mega Brain RAG Indexer CLI

Index documents from the knowledge base and inbox for RAG retrieval.

Usage:
    python rag_index.py --full           # Index everything
    python rag_index.py --incremental    # Index only new files
    python rag_index.py --force          # Clear and rebuild index
    python rag_index.py --dry-run        # Show what would be indexed
"""

import argparse
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from rag.config import Config, PATHS
from rag.indexer import Indexer
from rag.utils import discover_files, format_duration, setup_logging


def print_header():
    """Print CLI header."""
    print("=" * 70)
    print("MEGA BRAIN RAG INDEXER")
    print("=" * 70)
    print()


def print_footer(result):
    """Print result footer."""
    print()
    print("=" * 70)
    print("INDEXING COMPLETE" if result.success else "INDEXING COMPLETED WITH ERRORS")
    print("=" * 70)
    print(f"Files processed:      {result.files_processed}")
    print(f"Chunks created:       {result.chunks_created}")
    print(f"Embeddings generated: {result.embeddings_generated}")
    print(f"Time elapsed:         {format_duration(result.duration_seconds)}")

    if result.errors:
        print(f"Errors:               {len(result.errors)}")
        for error in result.errors[:5]:
            print(f"  - {error}")
        if len(result.errors) > 5:
            print(f"  ... and {len(result.errors) - 5} more")

    print("=" * 70)


def progress_callback(current: int, total: int, filename: str):
    """Progress callback for indexing."""
    # Calculate progress bar (ASCII compatible)
    bar_length = 30
    progress = current / total
    filled = int(bar_length * progress)
    bar = "#" * filled + "-" * (bar_length - filled)

    # Truncate filename if too long and sanitize for Windows console
    if len(filename) > 30:
        filename = filename[:27] + "..."
    # Replace any problematic characters
    filename = filename.encode('ascii', 'replace').decode('ascii')

    print(f"\r  [{bar}] {current}/{total} - {filename:<30}", end="", flush=True)

    if current == total:
        print()  # New line at end


def dry_run(source_type: str):
    """Show what would be indexed without actually indexing."""
    print_header()
    print("DRY RUN MODE - No files will be indexed")
    print()

    files = list(discover_files(source_type))

    print(f"Found {len(files)} files to index:")
    print()

    # Group by source type
    knowledge_files = [f for f in files if "02-KNOWLEDGE" in str(f)]
    inbox_files = [f for f in files if "00-INBOX" in str(f)]

    if knowledge_files:
        print(f"[KNOWLEDGE] Knowledge Base ({len(knowledge_files)} files):")
        for f in knowledge_files[:10]:
            print(f"   - {f.relative_to(PATHS['MEGA_BRAIN_ROOT'])}")
        if len(knowledge_files) > 10:
            print(f"   ... and {len(knowledge_files) - 10} more")
        print()

    if inbox_files:
        print(f"[INBOX] Inbox/Transcripts ({len(inbox_files)} files):")
        for f in inbox_files[:10]:
            print(f"   - {f.relative_to(PATHS['MEGA_BRAIN_ROOT'])}")
        if len(inbox_files) > 10:
            print(f"   ... and {len(inbox_files) - 10} more")
        print()

    print("=" * 70)
    print("Run without --dry-run to index these files")
    print("=" * 70)


def main():
    parser = argparse.ArgumentParser(
        description="Index documents for Mega Brain RAG system",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python rag_index.py --full              # Index all documents
  python rag_index.py --knowledge         # Index only knowledge base
  python rag_index.py --inbox             # Index only inbox/transcripts
  python rag_index.py --force             # Clear and rebuild index
  python rag_index.py --dry-run           # Show what would be indexed
        """
    )

    # Mode arguments (mutually exclusive)
    mode_group = parser.add_mutually_exclusive_group()
    mode_group.add_argument(
        "--full",
        action="store_true",
        help="Index all documents (knowledge + inbox)"
    )
    mode_group.add_argument(
        "--incremental",
        action="store_true",
        help="Index only new/modified documents"
    )
    mode_group.add_argument(
        "--knowledge",
        action="store_true",
        help="Index only knowledge base (02-KNOWLEDGE/)"
    )
    mode_group.add_argument(
        "--inbox",
        action="store_true",
        help="Index only inbox documents (00-INBOX/)"
    )

    # Options
    parser.add_argument(
        "--force",
        action="store_true",
        help="Clear existing index and rebuild"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be indexed without indexing"
    )
    parser.add_argument(
        "--mock",
        action="store_true",
        help="Use mock embeddings (for testing without API)"
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Show detailed output"
    )

    args = parser.parse_args()

    # Determine source type
    if args.knowledge:
        source_type = "knowledge"
    elif args.inbox:
        source_type = "inbox"
    else:
        source_type = "all"

    # Handle dry run
    if args.dry_run:
        dry_run(source_type)
        return 0

    # Validate configuration
    if not args.mock and not Config.validate():
        print("\n[ERROR] Configuration validation failed.")
        print("Please check your .env file and ensure VOYAGE_API_KEY is set.")
        print("\nTo test without API, use --mock flag")
        return 1

    # Set up logging
    log_level = "DEBUG" if args.verbose else "INFO"
    setup_logging(log_level)

    # Print header
    print_header()
    print(f"Mode: {'Force Rebuild' if args.force else 'Full Index'}")
    print(f"Target: {source_type}")
    if args.mock:
        print("Using MOCK embeddings (no API calls)")
    print()

    # Ensure directories exist
    Config.ensure_directories()

    # Create indexer
    print("[SCAN] Scanning directories...")
    indexer = Indexer(mock_embeddings=args.mock)

    # Count files
    files = list(discover_files(source_type))
    print(f"   Found {len(files)} files to process")
    print()

    if not files:
        print("No files found to index.")
        return 0

    # Run indexing
    print("[INDEX] Processing files...")
    result = indexer.index_directory(
        source_type=source_type,
        force=args.force,
        progress_callback=progress_callback if not args.verbose else None,
    )

    # Print footer
    print_footer(result)

    return 0 if result.success else 1


if __name__ == "__main__":
    sys.exit(main())
