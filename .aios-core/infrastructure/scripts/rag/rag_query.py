#!/usr/bin/env python3
"""
Mega Brain RAG Query CLI

Search the knowledge base using semantic search.

Usage:
    python rag_query.py "your question here"
    python rag_query.py "métricas" --theme "05-METRICAS"
    python rag_query.py "CLOSER framework" --source "Hormozi"
    python rag_query.py "objeções" --json
"""

import argparse
import json
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from rag.retriever import Retriever, format_results_for_display, format_results_for_json
from rag.utils import setup_logging


def main():
    parser = argparse.ArgumentParser(
        description="Query the Mega Brain knowledge base",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python rag_query.py "Como estruturar comissionamento?"
  python rag_query.py "métricas de conversão" --top-k 5
  python rag_query.py "CLOSER framework" --theme "02-PROCESSO-VENDAS"
  python rag_query.py "coaching" --source "Cole Gordon"
  python rag_query.py "objeções" --json
  python rag_query.py "farm system" --sources-only
        """
    )

    # Query argument
    parser.add_argument(
        "query",
        type=str,
        help="Natural language question or search query"
    )

    # Options
    parser.add_argument(
        "--top-k", "-k",
        type=int,
        default=10,
        help="Number of results to return (default: 10)"
    )
    parser.add_argument(
        "--threshold", "-t",
        type=float,
        default=0.7,
        help="Minimum similarity score 0-1 (default: 0.7)"
    )
    parser.add_argument(
        "--theme",
        type=str,
        help="Filter by theme (e.g., '02-PROCESSO-VENDAS')"
    )
    parser.add_argument(
        "--source",
        type=str,
        help="Filter by source person (e.g., 'Alex Hormozi')"
    )
    parser.add_argument(
        "--type",
        type=str,
        choices=["knowledge", "transcript"],
        help="Filter by source type"
    )

    # Output options
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output as JSON"
    )
    parser.add_argument(
        "--sources-only",
        action="store_true",
        help="Show only source citations, not content"
    )
    parser.add_argument(
        "--context",
        action="store_true",
        help="Output just the combined text (for LLM context)"
    )
    parser.add_argument(
        "--mock",
        action="store_true",
        help="Use mock embeddings (for testing)"
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Show detailed output"
    )

    args = parser.parse_args()

    # Set up logging
    log_level = "DEBUG" if args.verbose else "WARNING"
    setup_logging(log_level)

    # Build filters
    filters = {}
    if args.theme:
        filters["theme"] = args.theme
    if args.source:
        filters["source_person"] = args.source
    if args.type:
        filters["source_type"] = args.type

    # Create retriever
    retriever = Retriever(mock_embeddings=args.mock)

    # Check if index exists
    if retriever.vector_store.count() == 0:
        print("Error: No documents indexed yet.")
        print("Run 'python rag_index.py --full' first.")
        return 1

    # Execute query
    result = retriever.query(
        question=args.query,
        top_k=args.top_k,
        similarity_threshold=args.threshold,
        filters=filters if filters else None,
    )

    # Handle no results
    if result.total_results == 0:
        if args.json:
            print(json.dumps({"query": args.query, "results": [], "message": "No results found"}))
        else:
            print(f"No results found for: {args.query}")
            print(f"Try lowering --threshold (current: {args.threshold})")
        return 0

    # Output based on format
    if args.json:
        output = format_results_for_json(result)
        print(json.dumps(output, indent=2, ensure_ascii=False))

    elif args.sources_only:
        print("=" * 70)
        print("SOURCES FOR QUERY")
        print("=" * 70)
        print(f'Query: "{args.query}"')
        print(f"Results: {result.total_results}")
        print()
        for i, r in enumerate(result.results, 1):
            print(f"[{i}] Score: {r.score:.2f}")
            print(f"    {r.to_citation()}")
            print(f"    Path: {r.file_path}")
            print()
        print("=" * 70)

    elif args.context:
        # Output just the text for LLM context injection
        print(result.get_context())

    else:
        # Full display format
        print(format_results_for_display(result))

    return 0


if __name__ == "__main__":
    sys.exit(main())
