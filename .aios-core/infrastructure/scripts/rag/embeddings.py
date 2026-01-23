"""
RAG Embeddings Module

Handles embedding generation using Voyage AI for the Mega Brain RAG system.
"""

import os
from typing import List, Optional
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from .config import Config, EMBEDDING
from .utils import setup_logging, batch_iterator

# Initialize logger
logger = setup_logging()


class VoyageAPIError(Exception):
    """Custom exception for Voyage AI API errors."""
    pass


class EmbeddingClient:
    """
    Client for generating embeddings using Voyage AI.

    Supports both document and query embeddings with automatic batching
    and retry logic.
    """

    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the embedding client.

        Args:
            api_key: Voyage AI API key (defaults to env variable)
        """
        self.api_key = api_key or Config.get_voyage_api_key()
        self.model = EMBEDDING["model"]
        self.batch_size = EMBEDDING["batch_size"]
        self.dimension = EMBEDDING["dimension"]

        # Lazy import to avoid issues if package not installed
        try:
            import voyageai
            self.client = voyageai.Client(api_key=self.api_key)
        except ImportError:
            raise ImportError(
                "voyageai package not installed. Run: pip install voyageai"
            )

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=60),
        retry=retry_if_exception_type((Exception,)),
        before_sleep=lambda retry_state: logger.warning(
            f"Retry {retry_state.attempt_number} after error: {retry_state.outcome.exception()}"
        )
    )
    def _embed_batch(
        self,
        texts: List[str],
        input_type: str = "document"
    ) -> List[List[float]]:
        """
        Embed a batch of texts with retry logic.

        Args:
            texts: List of texts to embed
            input_type: "document" for indexing, "query" for retrieval

        Returns:
            List of embedding vectors
        """
        try:
            response = self.client.embed(
                texts=texts,
                model=self.model,
                input_type=input_type
            )
            return response.embeddings
        except Exception as e:
            logger.error(f"Embedding API error: {e}")
            raise VoyageAPIError(f"Failed to generate embeddings: {e}")

    def embed_documents(
        self,
        texts: List[str],
        show_progress: bool = True
    ) -> List[List[float]]:
        """
        Generate embeddings for documents (for indexing).

        Args:
            texts: List of document texts
            show_progress: Whether to show progress

        Returns:
            List of embedding vectors
        """
        if not texts:
            return []

        embeddings = []
        total_batches = (len(texts) + self.batch_size - 1) // self.batch_size

        for i, batch in enumerate(batch_iterator(texts, self.batch_size)):
            if show_progress:
                logger.info(f"Embedding batch {i + 1}/{total_batches} ({len(batch)} texts)")

            batch_embeddings = self._embed_batch(batch, input_type="document")
            embeddings.extend(batch_embeddings)

        return embeddings

    def embed_query(self, query: str) -> List[float]:
        """
        Generate embedding for a query (for retrieval).

        Args:
            query: Query text

        Returns:
            Embedding vector
        """
        embeddings = self._embed_batch([query], input_type="query")
        return embeddings[0]

    def embed_queries(self, queries: List[str]) -> List[List[float]]:
        """
        Generate embeddings for multiple queries.

        Args:
            queries: List of query texts

        Returns:
            List of embedding vectors
        """
        return [self.embed_query(q) for q in queries]


class MockEmbeddingClient:
    """
    Mock embedding client for testing without API calls.
    """

    def __init__(self, dimension: int = 1024):
        self.dimension = dimension

    def embed_documents(
        self,
        texts: List[str],
        show_progress: bool = True
    ) -> List[List[float]]:
        """Generate mock embeddings for documents."""
        import random
        return [[random.random() for _ in range(self.dimension)] for _ in texts]

    def embed_query(self, query: str) -> List[float]:
        """Generate mock embedding for a query."""
        import random
        return [random.random() for _ in range(self.dimension)]


def get_embedding_client(mock: bool = False) -> EmbeddingClient:
    """
    Factory function to get embedding client.

    Args:
        mock: Whether to use mock client for testing

    Returns:
        Embedding client instance
    """
    if mock:
        return MockEmbeddingClient()

    # Check if API key is available
    api_key = os.getenv("VOYAGE_API_KEY")
    if not api_key:
        logger.warning("VOYAGE_API_KEY not set, using mock embeddings")
        return MockEmbeddingClient()

    return EmbeddingClient(api_key)


if __name__ == "__main__":
    print("=" * 60)
    print("MEGA BRAIN EMBEDDINGS TEST")
    print("=" * 60)

    # Test with mock client
    print("\nTesting mock client...")
    mock_client = MockEmbeddingClient()

    test_docs = [
        "Este é um documento sobre vendas B2B.",
        "O framework CLOSER ajuda a fechar mais negócios.",
        "Métricas de conversão são importantes para o time de vendas.",
    ]

    embeddings = mock_client.embed_documents(test_docs)
    print(f"Generated {len(embeddings)} embeddings")
    print(f"Embedding dimension: {len(embeddings[0])}")

    # Test query embedding
    query = "Como melhorar taxa de conversão?"
    query_embedding = mock_client.embed_query(query)
    print(f"\nQuery embedding dimension: {len(query_embedding)}")

    # Try real client if API key is set
    api_key = os.getenv("VOYAGE_API_KEY")
    if api_key:
        print("\n" + "=" * 60)
        print("Testing real Voyage AI client...")

        try:
            real_client = EmbeddingClient()
            real_embeddings = real_client.embed_documents(test_docs[:1])
            print(f"Real embedding dimension: {len(real_embeddings[0])}")
            print("Voyage AI connection successful!")
        except Exception as e:
            print(f"Error testing real client: {e}")
    else:
        print("\nVOYAGE_API_KEY not set, skipping real client test")
