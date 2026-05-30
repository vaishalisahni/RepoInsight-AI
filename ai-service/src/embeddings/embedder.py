import os
import numpy as np
from sentence_transformers import SentenceTransformer

# Model loads ONCE when this module is first imported
# Subsequent calls reuse the loaded model — no re-downloading
MODEL_NAME = os.environ.get("EMBEDDINGS_MODEL", "all-MiniLM-L6-v2")
_model = None


def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        print(f"[embedder] Loading {MODEL_NAME}...")
        cache_dir = os.environ.get("MODEL_CACHE_DIR", "./data/models")
        _model = SentenceTransformer(MODEL_NAME, cache_folder=cache_dir)
        print("[embedder] Model ready ✓")
    return _model


def embed_texts(texts: list[str]) -> list[list[float]]:
    """Embed a list of texts, returns list of float vectors."""
    model = get_model()
    # sentence-transformers handles batching internally
    embeddings = model.encode(texts, batch_size=16, normalize_embeddings=True, show_progress_bar=True)
    return embeddings.tolist()


def embed_single(text: str) -> list[float]:
    """Embed a single text string."""
    return embed_texts([text])[0]