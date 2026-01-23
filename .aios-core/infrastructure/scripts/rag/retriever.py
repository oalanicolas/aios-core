"""
RAG Retriever Module

Handles query and retrieval for the Mega Brain RAG system.
"""

from typing import List, Dict, Optional
from dataclasses import dataclass

from .config import Config, RETRIEVAL
from .embeddings import EmbeddingClient, get_embedding_client
from .vectorstore import VectorStore, SearchResult
from .utils import setup_logging

# Initialize logger
logger = setup_logging()


@dataclass
class QueryResult:
    """Result of a RAG query."""

    query: str
    results: List[SearchResult]
    total_results: int

    def to_dict(self) -> Dict:
        return {
            "query": self.query,
            "total_results": self.total_results,
            "results": [r.to_dict() for r in self.results],
        }

    def get_context(self, separator: str = "\n\n---\n\n") -> str:
        """Get combined text from all results for LLM context."""
        return separator.join([r.text for r in self.results])

    def get_citations(self) -> List[str]:
        """Get list of unique citations."""
        citations = []
        seen = set()
        for r in self.results:
            citation = r.to_citation()
            if citation not in seen:
                citations.append(citation)
                seen.add(citation)
        return citations


class Retriever:
    """
    Main retriever class for the Mega Brain RAG system.

    Handles:
    - Query embedding
    - Similarity search
    - Result formatting
    """

    def __init__(
        self,
        embedding_client: Optional[EmbeddingClient] = None,
        vector_store: Optional[VectorStore] = None,
        mock_embeddings: bool = False,
    ):
        """
        Initialize the retriever.

        Args:
            embedding_client: Custom embedding client (optional)
            vector_store: Custom vector store (optional)
            mock_embeddings: Use mock embeddings for testing
        """
        self.embedding_client = embedding_client or get_embedding_client(mock=mock_embeddings)
        self.vector_store = vector_store or VectorStore()

    def query(
        self,
        question: str,
        top_k: int = None,
        similarity_threshold: float = None,
        filters: Optional[Dict] = None,
    ) -> QueryResult:
        """
        Query the knowledge base.

        Args:
            question: Natural language question
            top_k: Number of results to return
            similarity_threshold: Minimum similarity score (0-1)
            filters: Optional metadata filters

        Returns:
            QueryResult with matched documents
        """
        top_k = top_k or RETRIEVAL["top_k"]
        similarity_threshold = similarity_threshold or RETRIEVAL["similarity_threshold"]

        logger.info(f"Query: {question[:50]}...")

        # Generate query embedding
        try:
            query_embedding = self.embedding_client.embed_query(question)
        except Exception as e:
            logger.error(f"Query embedding failed: {e}")
            return QueryResult(query=question, results=[], total_results=0)

        # Search vector store
        results = self.vector_store.search(
            query_embedding=query_embedding,
            top_k=top_k,
            similarity_threshold=similarity_threshold,
            filters=filters,
        )

        logger.info(f"Found {len(results)} results (threshold: {similarity_threshold})")

        return QueryResult(
            query=question,
            results=results,
            total_results=len(results),
        )

    def query_by_theme(
        self,
        question: str,
        theme: str,
        top_k: int = None,
    ) -> QueryResult:
        """
        Query within a specific theme.

        Args:
            question: Natural language question
            theme: Theme code (e.g., "02-PROCESSO-VENDAS")
            top_k: Number of results

        Returns:
            QueryResult filtered by theme
        """
        return self.query(
            question=question,
            top_k=top_k,
            filters={"theme": theme},
        )

    def query_by_source(
        self,
        question: str,
        source_person: str,
        top_k: int = None,
    ) -> QueryResult:
        """
        Query from a specific source person.

        Args:
            question: Natural language question
            source_person: Source person name (e.g., "Alex Hormozi")
            top_k: Number of results

        Returns:
            QueryResult filtered by source
        """
        return self.query(
            question=question,
            top_k=top_k,
            filters={"source_person": source_person},
        )

    def get_similar_chunks(
        self,
        text: str,
        top_k: int = 5,
        exclude_self: bool = True,
    ) -> List[SearchResult]:
        """
        Find chunks similar to given text.

        Useful for finding related content or duplicates.

        Args:
            text: Text to find similar chunks for
            top_k: Number of results
            exclude_self: Whether to exclude exact matches

        Returns:
            List of similar SearchResults
        """
        # Get embedding for text
        embedding = self.embedding_client.embed_query(text)

        # Search
        results = self.vector_store.search(
            query_embedding=embedding,
            top_k=top_k + (1 if exclude_self else 0),
            similarity_threshold=0.0,
        )

        # Exclude self if needed
        if exclude_self and results:
            # Remove exact or near-exact matches
            results = [r for r in results if r.score < 0.99]

        return results[:top_k]


def format_results_for_display(result: QueryResult) -> str:
    """
    Format query results for terminal display.

    Args:
        result: QueryResult object

    Returns:
        Formatted string for display
    """
    lines = []
    lines.append("=" * 70)
    lines.append("MEGA BRAIN RAG QUERY")
    lines.append("=" * 70)
    lines.append("")
    lines.append(f'Query: "{result.query}"')
    lines.append(f"Results: {result.total_results} matches")
    lines.append("")

    for i, r in enumerate(result.results, 1):
        lines.append("-" * 70)
        lines.append(f"[{i}] Score: {r.score:.2f} | {r.file_name}")
        lines.append(f"    Theme: {r.theme}")
        if r.section_header:
            lines.append(f"    Section: {r.section_header}")
        lines.append("-" * 70)
        lines.append("")

        # Truncate long text
        text = r.text
        if len(text) > 500:
            text = text[:500] + "..."
        lines.append(f"> {text}")
        lines.append("")

    # Sources
    lines.append("=" * 70)
    lines.append("SOURCES REFERENCED")
    lines.append("=" * 70)
    for citation in result.get_citations():
        lines.append(f"- {citation}")

    lines.append("=" * 70)

    return "\n".join(lines)


def format_results_for_json(result: QueryResult) -> Dict:
    """
    Format query results as JSON-serializable dict.

    Args:
        result: QueryResult object

    Returns:
        Dict suitable for JSON output
    """
    return {
        "query": result.query,
        "total_results": result.total_results,
        "results": [
            {
                "rank": i + 1,
                "score": r.score,
                "text": r.text,
                "file_name": r.file_name,
                "file_path": r.file_path,
                "theme": r.theme,
                "section_header": r.section_header,
                "source_person": r.source_person,
                "citation": r.to_citation(),
            }
            for i, r in enumerate(result.results)
        ],
        "citations": result.get_citations(),
    }


if __name__ == "__main__":
    print("=" * 60)
    print("MEGA BRAIN RETRIEVER TEST")
    print("=" * 60)

    # Initialize retriever
    retriever = Retriever(mock_embeddings=True)

    # Check if there are documents
    count = retriever.vector_store.count()
    print(f"\nVector store has {count} documents")

    if count > 0:
        # Test query
        test_query = "Como estruturar comissionamento para closers?"
        result = retriever.query(test_query, top_k=3)

        print(format_results_for_display(result))
    else:
        print("\nNo documents indexed yet. Run rag_index.py first.")
