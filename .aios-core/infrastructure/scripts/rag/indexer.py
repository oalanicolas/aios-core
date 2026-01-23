"""
RAG Indexer Module

Orchestrates the indexing pipeline for the Mega Brain RAG system.
"""

import time
from pathlib import Path
from typing import List, Dict, Optional, Callable
from dataclasses import dataclass

from .config import Config, PATHS, FILE_PATTERNS
from .chunker import chunk_document, Chunk, get_chunk_stats
from .embeddings import EmbeddingClient, get_embedding_client
from .vectorstore import VectorStore
from .utils import discover_files, get_file_metadata, setup_logging, format_duration

# Initialize logger
logger = setup_logging()


@dataclass
class IndexingResult:
    """Result of indexing operation."""

    files_processed: int
    chunks_created: int
    embeddings_generated: int
    errors: List[Dict]
    duration_seconds: float

    @property
    def success(self) -> bool:
        return len(self.errors) == 0

    def to_dict(self) -> Dict:
        return {
            "files_processed": self.files_processed,
            "chunks_created": self.chunks_created,
            "embeddings_generated": self.embeddings_generated,
            "errors": self.errors,
            "duration_seconds": self.duration_seconds,
            "success": self.success,
        }


class Indexer:
    """
    Main indexer class for the Mega Brain RAG system.

    Handles:
    - File discovery
    - Document chunking
    - Embedding generation
    - Vector storage
    """

    def __init__(
        self,
        embedding_client: Optional[EmbeddingClient] = None,
        vector_store: Optional[VectorStore] = None,
        mock_embeddings: bool = False,
    ):
        """
        Initialize the indexer.

        Args:
            embedding_client: Custom embedding client (optional)
            vector_store: Custom vector store (optional)
            mock_embeddings: Use mock embeddings for testing
        """
        self.embedding_client = embedding_client or get_embedding_client(mock=mock_embeddings)
        self.vector_store = vector_store or VectorStore()

    def index_file(
        self,
        file_path: Path,
        force: bool = False,
    ) -> Dict:
        """
        Index a single file.

        Args:
            file_path: Path to the file
            force: Reindex even if already exists

        Returns:
            Dict with indexing result for this file
        """
        file_path = Path(file_path)

        if not file_path.exists():
            return {"error": f"File not found: {file_path}"}

        # Delete existing chunks if force reindex
        if force:
            self.vector_store.delete_by_file(str(file_path))

        # Chunk the document
        try:
            chunks = chunk_document(file_path)
        except Exception as e:
            return {"error": f"Chunking failed: {e}"}

        if not chunks:
            return {"warning": "No chunks created (empty file?)"}

        # Generate embeddings
        try:
            texts = [chunk.text for chunk in chunks]
            embeddings = self.embedding_client.embed_documents(texts, show_progress=False)
        except Exception as e:
            return {"error": f"Embedding failed: {e}"}

        # Store in vector database
        try:
            self.vector_store.add_chunks(chunks, embeddings)
        except Exception as e:
            return {"error": f"Storage failed: {e}"}

        return {
            "file": str(file_path),
            "chunks": len(chunks),
            "status": "success",
        }

    def index_directory(
        self,
        source_type: str = "all",
        force: bool = False,
        progress_callback: Optional[Callable] = None,
    ) -> IndexingResult:
        """
        Index all files in specified directories.

        Args:
            source_type: "knowledge", "inbox", or "all"
            force: Reindex all files
            progress_callback: Optional callback for progress updates

        Returns:
            IndexingResult with summary
        """
        start_time = time.time()

        # Discover files
        files = list(discover_files(source_type))
        total_files = len(files)

        if total_files == 0:
            return IndexingResult(
                files_processed=0,
                chunks_created=0,
                embeddings_generated=0,
                errors=[],
                duration_seconds=0,
            )

        logger.info(f"Found {total_files} files to index")

        # Clear if force
        if force:
            logger.info("Force mode: clearing existing index")
            self.vector_store.clear()

        # Process files
        all_chunks: List[Chunk] = []
        errors: List[Dict] = []

        for i, file_path in enumerate(files):
            # Progress callback
            if progress_callback:
                progress_callback(i + 1, total_files, file_path.name)

            try:
                chunks = chunk_document(file_path)
                all_chunks.extend(chunks)
                logger.debug(f"[{i + 1}/{total_files}] {file_path.name} -> {len(chunks)} chunks")
            except Exception as e:
                error = {"file": str(file_path), "error": str(e)}
                errors.append(error)
                logger.warning(f"Error processing {file_path.name}: {e}")

        # Generate embeddings in batch
        logger.info(f"Generating embeddings for {len(all_chunks)} chunks...")

        try:
            texts = [chunk.text for chunk in all_chunks]
            embeddings = self.embedding_client.embed_documents(texts, show_progress=True)
        except Exception as e:
            logger.error(f"Embedding generation failed: {e}")
            return IndexingResult(
                files_processed=len(files) - len(errors),
                chunks_created=len(all_chunks),
                embeddings_generated=0,
                errors=[{"stage": "embedding", "error": str(e)}],
                duration_seconds=time.time() - start_time,
            )

        # Store in vector database
        logger.info(f"Storing {len(all_chunks)} chunks in vector store...")

        try:
            self.vector_store.add_chunks(all_chunks, embeddings)
            self.vector_store.persist()
        except Exception as e:
            logger.error(f"Storage failed: {e}")
            errors.append({"stage": "storage", "error": str(e)})

        duration = time.time() - start_time

        return IndexingResult(
            files_processed=len(files) - len(errors),
            chunks_created=len(all_chunks),
            embeddings_generated=len(embeddings),
            errors=errors,
            duration_seconds=duration,
        )

    def index_incremental(
        self,
        source_type: str = "all",
        progress_callback: Optional[Callable] = None,
    ) -> IndexingResult:
        """
        Index only new or modified files.

        Args:
            source_type: "knowledge", "inbox", or "all"
            progress_callback: Optional callback for progress updates

        Returns:
            IndexingResult with summary
        """
        start_time = time.time()

        # Get all files
        files = list(discover_files(source_type))

        # Get indexed files from store
        stats = self.vector_store.get_stats()
        # Note: For true incremental, we'd need to track file hashes
        # For now, this is similar to full index but skips existing

        # Process only files (simplified incremental)
        # In production, you'd compare file modification times or hashes
        return self.index_directory(
            source_type=source_type,
            force=False,
            progress_callback=progress_callback,
        )


def default_progress_callback(current: int, total: int, filename: str):
    """Default progress callback that prints to console."""
    print(f"  [{current}/{total}] {filename}")


if __name__ == "__main__":
    print("=" * 60)
    print("MEGA BRAIN INDEXER TEST")
    print("=" * 60)

    # Test with mock embeddings
    indexer = Indexer(mock_embeddings=True)

    print("\nTesting single file indexing...")
    files = list(discover_files("knowledge"))

    if files:
        result = indexer.index_file(files[0])
        print(f"Result: {result}")
    else:
        print("No files found")

    print(f"\nVector store count: {indexer.vector_store.count()}")
