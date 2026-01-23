"""
RAG Configuration Module

Centralized configuration for the Mega Brain RAG system.
Loads settings from environment variables with sensible defaults.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Find project root (where .env is located)
_SCRIPT_DIR = Path(__file__).resolve().parent  # SCRIPTS/rag/
_PROJECT_ROOT = _SCRIPT_DIR.parent.parent  # Mega Brain/

# Load environment variables from project root
load_dotenv(_PROJECT_ROOT / ".env")

# Base paths - ALWAYS use resolved project root to avoid path conversion issues
# (Git Bash on Windows converts /Users/... to C:/Program Files/Git/Users/...)
MEGA_BRAIN_ROOT = _PROJECT_ROOT

# Path configuration
PATHS = {
    "MEGA_BRAIN_ROOT": MEGA_BRAIN_ROOT,
    "KNOWLEDGE_PATH": MEGA_BRAIN_ROOT / "02-KNOWLEDGE",
    "INBOX_PATH": MEGA_BRAIN_ROOT / "00-INBOX",
    "CHROMA_PATH": MEGA_BRAIN_ROOT / ".chroma",
    "SCRIPTS_PATH": MEGA_BRAIN_ROOT / "SCRIPTS",
}

# Chunking configuration
CHUNKING = {
    "chunk_size": int(os.getenv("RAG_CHUNK_SIZE", "512")),  # tokens
    "chunk_overlap": int(os.getenv("RAG_CHUNK_OVERLAP", "100")),  # tokens
    "min_chunk_size": 50,  # minimum tokens to keep a chunk
    "encoding": "cl100k_base",  # tiktoken encoding for token counting
}

# Embedding configuration
EMBEDDING = {
    "provider": "voyage",
    "model": "voyage-3",  # Voyage AI recommended model for RAG
    "batch_size": 128,  # documents per API call
    "dimension": 1024,  # voyage-3 embedding dimension
}

# Retrieval configuration
RETRIEVAL = {
    "top_k": int(os.getenv("RAG_TOP_K", "10")),
    "similarity_threshold": float(os.getenv("RAG_SIMILARITY_THRESHOLD", "0.7")),
}

# ChromaDB configuration
CHROMA = {
    "collection_name": "mega_brain_kb",
    "persist_directory": str(PATHS["CHROMA_PATH"]),
}

# File patterns to index
FILE_PATTERNS = {
    "knowledge": {
        "path": PATHS["KNOWLEDGE_PATH"],
        "extensions": [".md"],
        "recursive": True,
    },
    "inbox": {
        "path": PATHS["INBOX_PATH"],
        "extensions": [".txt", ".md"],
        "recursive": True,
        "exclude_patterns": ["_TEMPLATES", ".DS_Store"],
    },
}

# Theme detection patterns (from path)
THEME_PATTERNS = {
    "01-ESTRUTURA-TIME": ["estrutura", "time", "org", "hierarquia"],
    "02-PROCESSO-VENDAS": ["vendas", "sales", "closer", "processo"],
    "03-CONTRATACAO": ["contratacao", "hiring", "recrutamento"],
    "04-COMISSIONAMENTO": ["comissao", "compensation", "ote"],
    "05-METRICAS": ["metricas", "kpi", "conversao"],
    "06-FUNIL-APLICACAO": ["funil", "pipeline", "aplicacao"],
    "07-PRICING": ["pricing", "preco", "ticket"],
    "08-FERRAMENTAS": ["ferramentas", "crm", "tech"],
    "09-GESTAO": ["gestao", "management", "lideranca"],
    "10-CULTURA-GAMIFICACAO": ["cultura", "gamificacao"],
    "99-SECUNDARIO": [],
}

# Source identification patterns
SOURCE_PATTERNS = {
    "ALEX HORMOZI": {"id_prefix": "AH", "company": "Acquisition.com"},
    "COLE GORDON": {"id_prefix": "CG", "company": "Closers.io"},
    "FULL SALES SYSTEM": {"id_prefix": "FSS", "company": "Full Sales System"},
    "G4 EDUCACAO": {"id_prefix": "G4", "company": "G4 Educacao"},
    "SETTERLUN": {"id_prefix": "SU", "company": "Setterlun University"},
}


class Config:
    """Configuration class for easy access to all settings."""

    paths = PATHS
    chunking = CHUNKING
    embedding = EMBEDDING
    retrieval = RETRIEVAL
    chroma = CHROMA
    file_patterns = FILE_PATTERNS
    theme_patterns = THEME_PATTERNS
    source_patterns = SOURCE_PATTERNS

    @classmethod
    def get_voyage_api_key(cls) -> str:
        """Get Voyage AI API key from environment."""
        key = os.getenv("VOYAGE_API_KEY")
        if not key:
            raise ValueError(
                "VOYAGE_API_KEY not found in environment. "
                "Please add it to your .env file."
            )
        return key

    @classmethod
    def validate(cls) -> bool:
        """Validate that all required paths and keys exist."""
        errors = []

        # Check paths
        if not PATHS["KNOWLEDGE_PATH"].exists():
            errors.append(f"Knowledge path not found: {PATHS['KNOWLEDGE_PATH']}")

        if not PATHS["INBOX_PATH"].exists():
            errors.append(f"Inbox path not found: {PATHS['INBOX_PATH']}")

        # Check API key
        if not os.getenv("VOYAGE_API_KEY"):
            errors.append("VOYAGE_API_KEY not set in environment")

        if errors:
            for error in errors:
                print(f"[CONFIG ERROR] {error}")
            return False

        return True

    @classmethod
    def ensure_directories(cls):
        """Create necessary directories if they don't exist."""
        PATHS["CHROMA_PATH"].mkdir(parents=True, exist_ok=True)


if __name__ == "__main__":
    # Quick validation when run directly
    print("=" * 60)
    print("MEGA BRAIN RAG CONFIGURATION")
    print("=" * 60)
    print(f"\nPaths:")
    for name, path in PATHS.items():
        exists = "OK" if path.exists() else "MISSING"
        print(f"  {name}: {path} [{exists}]")

    print(f"\nChunking: {CHUNKING}")
    print(f"Embedding: {EMBEDDING}")
    print(f"Retrieval: {RETRIEVAL}")

    print(f"\nValidation: {'PASSED' if Config.validate() else 'FAILED'}")
