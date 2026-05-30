import os
import json
import numpy as np
import faiss

BASE = os.environ.get("FAISS_INDEX_PATH", "./data/faiss_index")
DIM = int(os.environ.get("EMBEDDINGS_DIM", "384"))


def _paths(ns: str) -> tuple[str, str]:
    """Return (index_path, meta_path) for a namespace."""
    directory = os.path.join(BASE, ns)
    os.makedirs(directory, exist_ok=True)
    return (
        os.path.join(directory, "index.faiss"),
        os.path.join(directory, "meta.json"),
    )


def _load_or_create(ns: str) -> faiss.IndexFlatL2:
    idx_path, _ = _paths(ns)
    if os.path.exists(idx_path):
        try:
            return faiss.read_index(idx_path)
        except Exception:
            pass
    return faiss.IndexFlatL2(DIM)


def add_vectors(ns: str, vectors: list[list[float]]) -> int:
    """Add vectors to the index. Returns the starting ID."""
    index = _load_or_create(ns)
    start_id = index.ntotal
    arr = np.array(vectors, dtype=np.float32)
    index.add(arr)
    idx_path, _ = _paths(ns)
    faiss.write_index(index, idx_path)
    return start_id


def search(ns: str, query_vec: list[float], top_k: int = 8) -> list[int]:
    """Search and return list of faiss IDs."""
    idx_path, _ = _paths(ns)
    if not os.path.exists(idx_path):
        return []
    index = faiss.read_index(idx_path)
    if index.ntotal == 0:
        return []
    k = min(top_k, index.ntotal)
    arr = np.array([query_vec], dtype=np.float32)
    _, labels = index.search(arr, k)
    return [int(l) for l in labels[0] if l >= 0]


def save_meta(ns: str, meta: list[dict]) -> None:
    """Append metadata entries to the meta file."""
    _, meta_path = _paths(ns)
    existing = []
    if os.path.exists(meta_path):
        with open(meta_path, "r") as f:
            existing = json.load(f)
    with open(meta_path, "w") as f:
        json.dump(existing + meta, f)


def load_meta(ns: str) -> list[dict]:
    _, meta_path = _paths(ns)
    if not os.path.exists(meta_path):
        return []
    with open(meta_path, "r") as f:
        return json.load(f)


def search_meta(ns: str, faiss_labels: list[int]) -> list[dict]:
    """Map faiss labels back to metadata entries using stored faissId."""
    meta = load_meta(ns)
    by_id = {entry["faissId"]: entry for entry in meta}
    return [by_id[l] for l in faiss_labels if l in by_id]


def clear_index(ns: str) -> None:
    """Delete the FAISS index and meta for a namespace."""
    idx_path, meta_path = _paths(ns)
    for path in (idx_path, meta_path):
        if os.path.exists(path):
            os.remove(path)