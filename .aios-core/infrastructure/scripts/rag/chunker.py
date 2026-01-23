"""
RAG Chunker Module

Handles text chunking with metadata preservation for the Mega Brain RAG system.
Implements semantic chunking that preserves markdown structure.
"""

from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Dict, Optional
from datetime import datetime

from .config import CHUNKING
from .utils import (
    count_tokens,
    tokenize,
    detokenize,
    split_by_headers,
    get_file_metadata,
    generate_chunk_id,
    detect_theme,
    detect_source,
)


@dataclass
class Chunk:
    """Represents a text chunk with metadata."""

    id: str
    text: str
    metadata: Dict = field(default_factory=dict)

    @property
    def token_count(self) -> int:
        """Get token count for this chunk."""
        return count_tokens(self.text)

    def to_dict(self) -> Dict:
        """Convert to dictionary for storage."""
        return {
            "id": self.id,
            "text": self.text,
            "token_count": self.token_count,
            **self.metadata,
        }


def chunk_by_tokens(
    text: str,
    chunk_size: int = None,
    chunk_overlap: int = None,
    min_chunk_size: int = None,
) -> List[str]:
    """
    Split text into chunks based on token count.

    Args:
        text: Text to chunk
        chunk_size: Maximum tokens per chunk
        chunk_overlap: Token overlap between chunks
        min_chunk_size: Minimum tokens to keep a chunk

    Returns:
        List of text chunks
    """
    chunk_size = chunk_size or CHUNKING["chunk_size"]
    chunk_overlap = chunk_overlap or CHUNKING["chunk_overlap"]
    min_chunk_size = min_chunk_size or CHUNKING["min_chunk_size"]

    tokens = tokenize(text)

    if len(tokens) <= chunk_size:
        return [text]

    chunks = []
    start = 0

    while start < len(tokens):
        # Get chunk tokens
        end = min(start + chunk_size, len(tokens))
        chunk_tokens = tokens[start:end]

        # Convert back to text
        chunk_text = detokenize(chunk_tokens)

        # Only add if meets minimum size
        if len(chunk_tokens) >= min_chunk_size:
            chunks.append(chunk_text)

        # Move start with overlap
        start = end - chunk_overlap

        # Prevent infinite loop
        if start >= len(tokens) - min_chunk_size:
            break

    return chunks


def chunk_markdown(
    content: str,
    file_path: Path,
    chunk_size: int = None,
    chunk_overlap: int = None,
) -> List[Chunk]:
    """
    Chunk markdown content preserving header structure.

    Args:
        content: Markdown content
        file_path: Path to source file
        chunk_size: Maximum tokens per chunk
        chunk_overlap: Token overlap between chunks

    Returns:
        List of Chunk objects with metadata
    """
    chunk_size = chunk_size or CHUNKING["chunk_size"]
    chunk_overlap = chunk_overlap or CHUNKING["chunk_overlap"]

    chunks = []
    file_meta = get_file_metadata(file_path)

    # Split by headers first
    sections = split_by_headers(content, min_level=2)

    chunk_index = 0

    for section in sections:
        header = section["header"]
        section_content = section["content"]

        # Skip empty sections
        if not section_content.strip():
            continue

        # If section fits in one chunk
        if count_tokens(section_content) <= chunk_size:
            text = f"{header}\n\n{section_content}" if header else section_content

            chunks.append(Chunk(
                id=generate_chunk_id(file_path, chunk_index),
                text=text.strip(),
                metadata={
                    **file_meta,
                    "chunk_index": chunk_index,
                    "section_header": header,
                    "indexed_at": datetime.now().isoformat(),
                }
            ))
            chunk_index += 1

        else:
            # Split section into smaller chunks
            sub_chunks = chunk_by_tokens(section_content, chunk_size, chunk_overlap)

            for sub_chunk in sub_chunks:
                # Prepend header to each sub-chunk
                text = f"{header}\n\n{sub_chunk}" if header else sub_chunk

                chunks.append(Chunk(
                    id=generate_chunk_id(file_path, chunk_index),
                    text=text.strip(),
                    metadata={
                        **file_meta,
                        "chunk_index": chunk_index,
                        "section_header": header,
                        "indexed_at": datetime.now().isoformat(),
                    }
                ))
                chunk_index += 1

    return chunks


def chunk_plaintext(
    content: str,
    file_path: Path,
    chunk_size: int = None,
    chunk_overlap: int = None,
) -> List[Chunk]:
    """
    Chunk plain text content.

    Args:
        content: Plain text content
        file_path: Path to source file
        chunk_size: Maximum tokens per chunk
        chunk_overlap: Token overlap between chunks

    Returns:
        List of Chunk objects with metadata
    """
    chunk_size = chunk_size or CHUNKING["chunk_size"]
    chunk_overlap = chunk_overlap or CHUNKING["chunk_overlap"]

    file_meta = get_file_metadata(file_path)
    text_chunks = chunk_by_tokens(content, chunk_size, chunk_overlap)

    chunks = []
    for i, text in enumerate(text_chunks):
        chunks.append(Chunk(
            id=generate_chunk_id(file_path, i),
            text=text.strip(),
            metadata={
                **file_meta,
                "chunk_index": i,
                "section_header": "",
                "indexed_at": datetime.now().isoformat(),
            }
        ))

    return chunks


def chunk_document(
    file_path: Path,
    chunk_size: int = None,
    chunk_overlap: int = None,
) -> List[Chunk]:
    """
    Chunk a document file based on its type.

    Args:
        file_path: Path to the document
        chunk_size: Maximum tokens per chunk
        chunk_overlap: Token overlap between chunks

    Returns:
        List of Chunk objects with metadata
    """
    # Read file content
    try:
        content = file_path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        # Try latin-1 as fallback
        try:
            content = file_path.read_text(encoding="latin-1")
        except Exception as e:
            raise ValueError(f"Cannot read file {file_path}: {e}")

    # Skip empty files
    if not content.strip():
        return []

    # Choose chunking strategy based on file type
    if file_path.suffix.lower() == ".md":
        return chunk_markdown(content, file_path, chunk_size, chunk_overlap)
    else:
        return chunk_plaintext(content, file_path, chunk_size, chunk_overlap)


def get_chunk_stats(chunks: List[Chunk]) -> Dict:
    """
    Get statistics about chunks.

    Args:
        chunks: List of chunks

    Returns:
        Dict with statistics
    """
    if not chunks:
        return {
            "total_chunks": 0,
            "total_tokens": 0,
            "avg_tokens": 0,
            "min_tokens": 0,
            "max_tokens": 0,
        }

    token_counts = [chunk.token_count for chunk in chunks]

    return {
        "total_chunks": len(chunks),
        "total_tokens": sum(token_counts),
        "avg_tokens": sum(token_counts) / len(token_counts),
        "min_tokens": min(token_counts),
        "max_tokens": max(token_counts),
    }


if __name__ == "__main__":
    from .utils import discover_files

    print("=" * 60)
    print("MEGA BRAIN CHUNKER TEST")
    print("=" * 60)

    # Find a sample file
    files = list(discover_files("knowledge"))

    if files:
        sample_file = files[0]
        print(f"\nChunking: {sample_file.name}")

        chunks = chunk_document(sample_file)
        stats = get_chunk_stats(chunks)

        print(f"\nStats: {stats}")
        print(f"\nFirst chunk preview:")
        if chunks:
            print(f"  ID: {chunks[0].id}")
            print(f"  Tokens: {chunks[0].token_count}")
            print(f"  Header: {chunks[0].metadata.get('section_header', 'N/A')}")
            print(f"  Text: {chunks[0].text[:200]}...")
    else:
        print("No files found to test")
