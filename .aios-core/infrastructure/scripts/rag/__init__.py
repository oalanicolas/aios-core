"""
Mega Brain RAG Module

Retrieval-Augmented Generation system for the B2B Sales Knowledge Base.
Uses ChromaDB for vector storage and Voyage AI for embeddings.
"""

__version__ = "1.0.0"
__author__ = "Mega Brain"

from .config import Config, PATHS, CHUNKING, EMBEDDING, RETRIEVAL
from .utils import count_tokens, discover_files, setup_logging
from .chunker import chunk_document, Chunk
from .embeddings import EmbeddingClient
from .vectorstore import VectorStore
from .indexer import Indexer
from .retriever import Retriever

__all__ = [
    "Config",
    "PATHS",
    "CHUNKING",
    "EMBEDDING",
    "RETRIEVAL",
    "count_tokens",
    "discover_files",
    "setup_logging",
    "chunk_document",
    "Chunk",
    "EmbeddingClient",
    "VectorStore",
    "Indexer",
    "Retriever",
]
