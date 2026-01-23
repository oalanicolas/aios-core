"""
RAG Utilities Module

Shared utility functions for the Mega Brain RAG system.
"""

import logging
import re
from pathlib import Path
from typing import List, Dict, Optional, Generator
from datetime import datetime

import tiktoken

from .config import CHUNKING, FILE_PATTERNS, THEME_PATTERNS, SOURCE_PATTERNS, PATHS


def setup_logging(level: str = "INFO") -> logging.Logger:
    """
    Set up logging for RAG operations.

    Args:
        level: Logging level (DEBUG, INFO, WARNING, ERROR)

    Returns:
        Configured logger instance
    """
    logger = logging.getLogger("mega_brain_rag")
    logger.setLevel(getattr(logging, level.upper()))

    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setLevel(getattr(logging, level.upper()))
        formatter = logging.Formatter(
            "%(asctime)s | %(levelname)s | %(message)s",
            datefmt="%H:%M:%S"
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)

    return logger


# Initialize tokenizer for token counting
_tokenizer = None

def get_tokenizer():
    """Get or initialize the tokenizer."""
    global _tokenizer
    if _tokenizer is None:
        _tokenizer = tiktoken.get_encoding(CHUNKING["encoding"])
    return _tokenizer


def count_tokens(text: str) -> int:
    """
    Count tokens in text using tiktoken.

    Args:
        text: Text to count tokens for

    Returns:
        Number of tokens
    """
    tokenizer = get_tokenizer()
    return len(tokenizer.encode(text))


def tokenize(text: str) -> List[int]:
    """
    Tokenize text to token IDs.

    Args:
        text: Text to tokenize

    Returns:
        List of token IDs
    """
    tokenizer = get_tokenizer()
    return tokenizer.encode(text)


def detokenize(tokens: List[int]) -> str:
    """
    Convert token IDs back to text.

    Args:
        tokens: List of token IDs

    Returns:
        Decoded text
    """
    tokenizer = get_tokenizer()
    return tokenizer.decode(tokens)


def discover_files(
    source_type: str = "all",
    extensions: Optional[List[str]] = None
) -> Generator[Path, None, None]:
    """
    Discover files to index based on configuration.

    Args:
        source_type: "knowledge", "inbox", or "all"
        extensions: Optional list of extensions to filter by

    Yields:
        Path objects for each discovered file
    """
    patterns = FILE_PATTERNS

    if source_type == "all":
        sources = ["knowledge", "inbox"]
    else:
        sources = [source_type]

    for source in sources:
        if source not in patterns:
            continue

        config = patterns[source]
        base_path = config["path"]
        file_extensions = extensions or config["extensions"]
        exclude_patterns = config.get("exclude_patterns", [])

        if not base_path.exists():
            continue

        # Get all files recursively or not
        if config.get("recursive", True):
            files = base_path.rglob("*")
        else:
            files = base_path.glob("*")

        for file_path in files:
            # Skip directories
            if file_path.is_dir():
                continue

            # Check extension
            if file_path.suffix.lower() not in file_extensions:
                continue

            # Check exclusions
            skip = False
            for pattern in exclude_patterns:
                if pattern in str(file_path):
                    skip = True
                    break

            if not skip:
                yield file_path


def detect_theme(file_path: Path) -> str:
    """
    Detect theme from file path.

    Args:
        file_path: Path to the file

    Returns:
        Theme code (e.g., "02-PROCESSO-VENDAS") or "99-SECUNDARIO"
    """
    path_str = str(file_path).lower()

    # Check if path contains a theme folder
    for theme_code in THEME_PATTERNS:
        if theme_code.lower() in path_str:
            return theme_code

    # Try to detect from keywords
    for theme_code, keywords in THEME_PATTERNS.items():
        for keyword in keywords:
            if keyword.lower() in path_str:
                return theme_code

    return "99-SECUNDARIO"


def detect_source(file_path: Path) -> Dict[str, str]:
    """
    Detect source information from file path.

    Args:
        file_path: Path to the file

    Returns:
        Dict with source_id, source_person, source_company
    """
    path_str = str(file_path).upper()

    for source_name, info in SOURCE_PATTERNS.items():
        if source_name.upper() in path_str:
            return {
                "source_person": source_name,
                "source_company": info["company"],
                "id_prefix": info["id_prefix"],
            }

    return {
        "source_person": "Unknown",
        "source_company": "Unknown",
        "id_prefix": "UNK",
    }


def generate_source_id(file_path: Path, chunk_index: int = 0) -> str:
    """
    Generate a unique source ID for a chunk.

    Args:
        file_path: Path to the source file
        chunk_index: Index of the chunk within the file

    Returns:
        Source ID like "AH001_C03" (Alex Hormozi file 1, chunk 3)
    """
    source_info = detect_source(file_path)
    prefix = source_info["id_prefix"]

    # Create a simple hash from file name
    file_hash = abs(hash(file_path.stem)) % 1000

    return f"{prefix}{file_hash:03d}_C{chunk_index:02d}"


def generate_chunk_id(file_path: Path, chunk_index: int) -> str:
    """
    Generate a unique ID for a chunk.

    Args:
        file_path: Path to the source file
        chunk_index: Index of the chunk

    Returns:
        Unique chunk ID
    """
    # Use relative path from MEGA_BRAIN_ROOT for consistency
    try:
        relative = file_path.relative_to(PATHS["MEGA_BRAIN_ROOT"])
    except ValueError:
        relative = file_path

    # Create deterministic ID from path and index
    path_hash = abs(hash(str(relative))) % 10000000
    return f"{path_hash:07d}_{chunk_index:04d}"


def extract_markdown_headers(content: str) -> List[Dict[str, str]]:
    """
    Extract markdown headers and their positions.

    Args:
        content: Markdown content

    Returns:
        List of dicts with header level, text, and position
    """
    headers = []
    pattern = r'^(#{1,6})\s+(.+)$'

    for match in re.finditer(pattern, content, re.MULTILINE):
        headers.append({
            "level": len(match.group(1)),
            "text": match.group(2).strip(),
            "start": match.start(),
            "end": match.end(),
        })

    return headers


def split_by_headers(content: str, min_level: int = 2) -> List[Dict[str, str]]:
    """
    Split content by markdown headers.

    Args:
        content: Markdown content
        min_level: Minimum header level to split on (2 = ##)

    Returns:
        List of sections with header and content
    """
    headers = extract_markdown_headers(content)

    # Filter by level
    split_headers = [h for h in headers if h["level"] >= min_level]

    if not split_headers:
        return [{"header": "", "content": content}]

    sections = []

    for i, header in enumerate(split_headers):
        start = header["start"]

        # End is start of next header or end of content
        if i + 1 < len(split_headers):
            end = split_headers[i + 1]["start"]
        else:
            end = len(content)

        section_content = content[header["end"]:end].strip()
        header_text = "#" * header["level"] + " " + header["text"]

        sections.append({
            "header": header_text,
            "content": section_content,
        })

    # Add any content before first header
    if split_headers[0]["start"] > 0:
        pre_content = content[:split_headers[0]["start"]].strip()
        if pre_content:
            sections.insert(0, {"header": "", "content": pre_content})

    return sections


def get_file_metadata(file_path: Path) -> Dict:
    """
    Get metadata for a file.

    Args:
        file_path: Path to the file

    Returns:
        Dict with file metadata
    """
    stat = file_path.stat()
    source_info = detect_source(file_path)

    return {
        "file_path": str(file_path),
        "file_name": file_path.name,
        "file_stem": file_path.stem,
        "extension": file_path.suffix,
        "size_bytes": stat.st_size,
        "modified_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
        "theme": detect_theme(file_path),
        "source_type": "knowledge" if "02-KNOWLEDGE" in str(file_path) else "transcript",
        **source_info,
    }


def format_duration(seconds: float) -> str:
    """Format duration in human-readable format."""
    if seconds < 60:
        return f"{seconds:.1f}s"
    elif seconds < 3600:
        minutes = int(seconds // 60)
        secs = int(seconds % 60)
        return f"{minutes}m {secs}s"
    else:
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        return f"{hours}h {minutes}m"


def batch_iterator(items: List, batch_size: int) -> Generator[List, None, None]:
    """
    Iterate over items in batches.

    Args:
        items: List of items
        batch_size: Size of each batch

    Yields:
        Batches of items
    """
    for i in range(0, len(items), batch_size):
        yield items[i:i + batch_size]


if __name__ == "__main__":
    # Quick test when run directly
    print("=" * 60)
    print("MEGA BRAIN RAG UTILITIES TEST")
    print("=" * 60)

    # Test file discovery
    print("\nDiscovering files...")
    files = list(discover_files("all"))
    print(f"Found {len(files)} files")

    # Test token counting
    test_text = "Este é um texto de teste para contar tokens."
    tokens = count_tokens(test_text)
    print(f"\nToken count for test text: {tokens}")

    # Show first few files
    print("\nFirst 5 files:")
    for f in files[:5]:
        meta = get_file_metadata(f)
        print(f"  {f.name} | Theme: {meta['theme']} | Source: {meta['source_person']}")
