import os
import voyageai

client = voyageai.Client(api_key=os.environ["VOYAGE_API_KEY"])
MODEL = "voyage-code-3"  # 1024-dim, code-optimized, current gen


def embed_texts(texts: list[str]) -> list[list[float]]:
    """Embed in batches of 128 (Voyage limit)."""
    embeddings = []
    for i in range(0, len(texts), 128):
        batch = texts[i:i + 128]
        result = client.embed(batch, model=MODEL, input_type="document")
        embeddings.extend(result.embeddings)
    return embeddings


def embed_single(text: str) -> list[float]:
    result = client.embed([text], model=MODEL, input_type="query")
    return result.embeddings[0]