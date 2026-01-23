"""
RAG Vector Store Module

Handles ChromaDB operations for the Mega Brain RAG system.
"""

from pathlib import Path
from typing import List, Dict, Optional, Any
from dataclasses import dataclass

from .config import Config, CHROMA, PATHS
from .chunker import Chunk
from .utils import setup_logging

# Initialize logger
logger = setup_logging()


@dataclass
class SearchResult:
    """Represents a search result from the vector store."""

    id: str
    text: str
    score: float
    metadata: Dict

    @property
    def source_id(self) -> str:
        return self.metadata.get("id_prefix", "UNK") + str(self.metadata.get("chunk_index", 0))

    @property
    def file_path(self) -> str:
        return self.metadata.get("file_path", "")

    @property
    def file_name(self) -> str:
        return self.metadata.get("file_name", "")

    @property
    def theme(self) -> str:
        return self.metadata.get("theme", "")

    @property
    def section_header(self) -> str:
        return self.metadata.get("section_header", "")

    @property
    def source_person(self) -> str:
        return self.metadata.get("source_person", "Unknown")

    def to_citation(self) -> str:
        """Format as citation string."""
        header = self.section_header or self.file_name
        return f"[{self.theme}] {self.file_name} > {header}"

    def to_dict(self) -> Dict:
        """Convert to dictionary."""
        return {
            "id": self.id,
            "text": self.text,
            "score": self.score,
            "file_name": self.file_name,
            "file_path": self.file_path,
            "theme": self.theme,
            "section_header": self.section_header,
            "source_person": self.source_person,
            "citation": self.to_citation(),
        }


class VectorStore:
    """
    ChromaDB vector store for the Mega Brain knowledge base.

    Handles:
    - Collection management
    - Document upsert/delete
    - Similarity search with filters
    """

    def __init__(
        self,
        collection_name: str = None,
        persist_directory: str = None,
    ):
        """
        Initialize the vector store.

        Args:
            collection_name: Name of the ChromaDB collection
            persist_directory: Directory for persistent storage
        """
        self.collection_name = collection_name or CHROMA["collection_name"]
        self.persist_directory = persist_directory or CHROMA["persist_directory"]

        # Ensure directory exists
        Path(self.persist_directory).mkdir(parents=True, exist_ok=True)

        # Lazy import to avoid issues if package not installed
        try:
            import chromadb
        except ImportError:
            raise ImportError(
                "chromadb package not installed. Run: pip install chromadb"
            )

        # Initialize client with persistent storage (new API)
        self.client = chromadb.PersistentClient(path=self.persist_directory)

        # Get or create collection
        self.collection = self.client.get_or_create_collection(
            name=self.collection_name,
            metadata={
                "description": "Mega Brain B2B Sales Knowledge Base",
                "hnsw:space": "cosine",  # Use cosine similarity
            }
        )

        logger.info(
            f"Initialized vector store: {self.collection_name} "
            f"({self.collection.count()} documents)"
        )

    def add_chunks(
        self,
        chunks: List[Chunk],
        embeddings: List[List[float]],
    ) -> int:
        """
        Add chunks with their embeddings to the store.

        Args:
            chunks: List of Chunk objects
            embeddings: Corresponding embedding vectors

        Returns:
            Number of chunks added
        """
        if not chunks:
            return 0

        if len(chunks) != len(embeddings):
            raise ValueError(
                f"Mismatch: {len(chunks)} chunks but {len(embeddings)} embeddings"
            )

        # Prepare data for ChromaDB
        ids = [chunk.id for chunk in chunks]
        documents = [chunk.text for chunk in chunks]
        metadatas = [self._prepare_metadata(chunk.metadata) for chunk in chunks]

        # Upsert to collection
        self.collection.upsert(
            ids=ids,
            embeddings=embeddings,
            documents=documents,
            metadatas=metadatas,
        )

        logger.info(f"Added {len(chunks)} chunks to vector store")
        return len(chunks)

    def _prepare_metadata(self, metadata: Dict) -> Dict:
        """
        Prepare metadata for ChromaDB (must be string, int, float, or bool).

        Args:
            metadata: Original metadata dict

        Returns:
            Cleaned metadata dict
        """
        cleaned = {}
        for key, value in metadata.items():
            if isinstance(value, (str, int, float, bool)):
                cleaned[key] = value
            elif isinstance(value, Path):
                cleaned[key] = str(value)
            elif value is None:
                cleaned[key] = ""
            else:
                cleaned[key] = str(value)
        return cleaned

    def search(
        self,
        query_embedding: List[float],
        top_k: int = 10,
        similarity_threshold: float = 0.0,
        filters: Optional[Dict] = None,
    ) -> List[SearchResult]:
        """
        Search for similar documents.

        Args:
            query_embedding: Query embedding vector
            top_k: Number of results to return
            similarity_threshold: Minimum similarity score (0-1)
            filters: Optional metadata filters

        Returns:
            List of SearchResult objects
        """
        # Build where filter
        where_filter = self._build_filter(filters) if filters else None

        # Query collection
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            where=where_filter,
            include=["documents", "metadatas", "distances"],
        )

        # Convert to SearchResult objects
        search_results = []

        if results["ids"] and results["ids"][0]:
            for i, doc_id in enumerate(results["ids"][0]):
                # ChromaDB returns distances (lower = more similar for cosine)
                # Convert to similarity score (higher = more similar)
                distance = results["distances"][0][i]
                score = 1 - distance  # Convert distance to similarity

                # Skip if below threshold
                if score < similarity_threshold:
                    continue

                search_results.append(SearchResult(
                    id=doc_id,
                    text=results["documents"][0][i],
                    score=score,
                    metadata=results["metadatas"][0][i],
                ))

        return search_results

    def _build_filter(self, filters: Dict) -> Dict:
        """
        Build ChromaDB where filter from simple dict.

        Args:
            filters: Simple filter dict like {"theme": "02-PROCESSO-VENDAS"}

        Returns:
            ChromaDB where clause
        """
        if not filters:
            return None

        # Handle single filter
        if len(filters) == 1:
            key, value = list(filters.items())[0]
            return {key: {"$eq": value}}

        # Handle multiple filters with AND
        conditions = []
        for key, value in filters.items():
            if isinstance(value, list):
                conditions.append({key: {"$in": value}})
            else:
                conditions.append({key: {"$eq": value}})

        return {"$and": conditions}

    def delete_by_file(self, file_path: str) -> int:
        """
        Delete all chunks from a specific file.

        Args:
            file_path: Path to the file

        Returns:
            Number of chunks deleted
        """
        # Get IDs for this file
        results = self.collection.get(
            where={"file_path": {"$eq": file_path}},
            include=[],
        )

        if results["ids"]:
            self.collection.delete(ids=results["ids"])
            logger.info(f"Deleted {len(results['ids'])} chunks for {file_path}")
            return len(results["ids"])

        return 0

    def clear(self) -> int:
        """
        Clear all documents from the collection.

        Returns:
            Number of documents deleted
        """
        count = self.collection.count()
        if count > 0:
            # Get all IDs and delete
            all_ids = self.collection.get(include=[])["ids"]
            self.collection.delete(ids=all_ids)
            logger.info(f"Cleared {count} documents from collection")
        return count

    def count(self) -> int:
        """Get total document count."""
        return self.collection.count()

    def get_stats(self) -> Dict:
        """
        Get statistics about the vector store.

        Returns:
            Dict with statistics
        """
        count = self.collection.count()

        if count == 0:
            return {
                "total_chunks": 0,
                "by_theme": {},
                "by_source": {},
                "by_type": {},
            }

        # Get all metadata
        all_data = self.collection.get(include=["metadatas"])

        stats = {
            "total_chunks": count,
            "by_theme": {},
            "by_source": {},
            "by_type": {},
        }

        for metadata in all_data["metadatas"]:
            # Count by theme
            theme = metadata.get("theme", "Unknown")
            stats["by_theme"][theme] = stats["by_theme"].get(theme, 0) + 1

            # Count by source person
            source = metadata.get("source_person", "Unknown")
            stats["by_source"][source] = stats["by_source"].get(source, 0) + 1

            # Count by source type
            source_type = metadata.get("source_type", "Unknown")
            stats["by_type"][source_type] = stats["by_type"].get(source_type, 0) + 1

        return stats

    def persist(self):
        """Persist the database to disk (auto-persisted with PersistentClient)."""
        # PersistentClient auto-persists, no manual call needed
        logger.info("Vector store auto-persisted to disk")


if __name__ == "__main__":
    print("=" * 60)
    print("MEGA BRAIN VECTOR STORE TEST")
    print("=" * 60)

    # Initialize store
    store = VectorStore()

    print(f"\nCollection: {store.collection_name}")
    print(f"Persist directory: {store.persist_directory}")
    print(f"Document count: {store.count()}")

    # Get stats if there are documents
    if store.count() > 0:
        stats = store.get_stats()
        print(f"\nStats:")
        print(f"  Total chunks: {stats['total_chunks']}")
        print(f"  By theme: {stats['by_theme']}")
        print(f"  By source: {stats['by_source']}")
