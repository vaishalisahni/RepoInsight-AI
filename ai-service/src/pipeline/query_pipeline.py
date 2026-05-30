"""
query_pipeline.py
Handles all LLM interactions: query, stream, explain, trace, impact, summary.
Uses Groq API (free tier: ~14,400 requests/day).
"""

import os
import json
from groq import Groq
from src.embeddings.embedder import embed_single
from src.embeddings.faiss_store import search, search_meta
from src.pipeline.prompts import (
    query_prompt, explain_prompt, trace_prompt,
    summary_prompt, impact_prompt,
)

# ── Groq client ───────────────────────────────────────────────────────────────
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
MODEL  = os.environ.get("CHAT_MODEL", "llama-3.3-70b-versatile")
TOP_K  = int(os.environ.get("TOP_K_RESULTS", "8"))


def _llm(system: str, user: str, history: list[dict] = None) -> str:
    """Call Groq and return the response text."""
    messages = [{"role": "system", "content": system}]
    if history:
        messages.extend(history[-10:])
    messages.append({"role": "user", "content": user})

    response = client.chat.completions.create(
        model=MODEL,
        messages=messages,
        temperature=0.2,
        max_tokens=int(os.environ.get("MAX_TOKENS", "4096")),
    )
    return response.choices[0].message.content


def _retrieve(faiss_index_id: str, question: str) -> list[dict]:
    """Embed the question and fetch top-K matching chunks."""
    vec    = embed_single(question)
    labels = search(faiss_index_id, vec, TOP_K)
    return search_meta(faiss_index_id, labels)


def _build_context(chunks: list[dict]) -> str:
    parts = []
    for c in chunks:
        loc  = f" (lines {c['startLine']}-{c['endLine']})" if c.get("startLine") else ""
        lang = f" [{c['language']}]" if c.get("language") else ""
        parts.append(f"// {c['filePath']}{loc}{lang}\n{c['content']}")
    return "\n\n---\n\n".join(parts)


# ── Public functions ──────────────────────────────────────────────────────────

def query(data: dict) -> dict:
    faiss_index_id = data["faissIndexId"]
    question       = data["question"]
    history        = data.get("history", [])
    repo_name      = data.get("repoName", "repo")

    chunks  = _retrieve(faiss_index_id, question)
    context = _build_context(chunks)

    answer = _llm(
        f'You are an expert code assistant for "{repo_name}". Always cite file paths and line numbers.',
        query_prompt(repo_name, question, context),
        history,
    )

    sources = [
        {
            "filePath":  c["filePath"],
            "startLine": c.get("startLine"),
            "endLine":   c.get("endLine"),
            "language":  c.get("language"),
            "snippet":   c["content"][:1500],
        }
        for c in chunks
    ]
    return {"answer": answer, "sources": sources}


def query_stream(data: dict):
    """Generator that yields SSE events for streaming responses."""
    faiss_index_id = data["faissIndexId"]
    question       = data["question"]
    history        = data.get("history", [])
    repo_name      = data.get("repoName", "repo")

    try:
        chunks  = _retrieve(faiss_index_id, question)
        context = _build_context(chunks)

        messages = [
            {"role": "system",
             "content": f'You are an expert code assistant for "{repo_name}". Always cite file paths.'},
        ]
        if history:
            messages.extend(history[-10:])
        messages.append({"role": "user", "content": query_prompt(repo_name, question, context)})

        stream = client.chat.completions.create(
            model=MODEL,
            messages=messages,
            temperature=0.2,
            max_tokens=int(os.environ.get("MAX_TOKENS", "4096")),
            stream=True,
        )

        for chunk in stream:
            token = chunk.choices[0].delta.content or ""
            if token:
                yield f"data: {json.dumps({'token': token})}\n\n"

        sources = [
            {"filePath": c["filePath"], "startLine": c.get("startLine"),
             "endLine": c.get("endLine"), "language": c.get("language"),
             "snippet": c["content"][:1500]}
            for c in chunks
        ]
        yield f"data: {json.dumps({'done': True, 'sources': sources})}\n\n"

    except Exception as e:
        yield f"data: {json.dumps({'error': str(e)})}\n\n"


def explain(data: dict) -> dict:
    file_path      = data["filePath"]
    chunks         = data.get("chunks", [])
    faiss_index_id = data.get("faissIndexId")
    selection      = data.get("selection", {})

    code = selection.get("code") or "\n\n".join(c["content"] for c in chunks)

    related = []
    if faiss_index_id:
        related = _retrieve(faiss_index_id, f"explain {file_path}")
        related = [c for c in related if c["filePath"] != file_path][:3]

    rel_ctx = "\n\n".join(
        f"// {c['filePath']}\n{c['content'][:300]}" for c in related
    )

    explanation = _llm(
        "You are a senior engineer explaining code clearly and concisely.",
        explain_prompt(file_path, code[:4000], rel_ctx),
    )
    return {
        "explanation":  explanation,
        "filePath":     file_path,
        "relatedFiles": [c["filePath"] for c in related],
    }


def trace(data: dict) -> dict:
    faiss_index_id = data["faissIndexId"]
    entry_point    = data["entryPoint"]
    function_name  = data.get("functionName", "")

    chunks  = _retrieve(faiss_index_id, f"flow {entry_point} {function_name}")
    context = "\n---\n".join(
        f"// {c['filePath']}\n{c['content'][:500]}" for c in chunks
    )

    result = _llm(
        "You are a senior engineer tracing execution flows. Always end with a Mermaid sequence diagram.",
        trace_prompt(entry_point, function_name, context),
    )
    return {"trace": result, "sources": [c["filePath"] for c in chunks]}


def impact(data: dict) -> dict:
    faiss_index_id = data["faissIndexId"]
    file_path      = data["filePath"]

    chunks  = _retrieve(faiss_index_id, f"imports {file_path}")
    context = "\n\n".join(
        f"// {c['filePath']}\n{c['content'][:400]}" for c in chunks
    )

    result = _llm(
        "You are a senior architect performing change impact analysis.",
        impact_prompt(file_path, context),
    )
    return {"analysis": result, "relatedFiles": [c["filePath"] for c in chunks]}


def generate_summary(context: str, tech_stack: dict, languages: dict) -> str:
    frameworks = tech_stack.get("frameworks", [])
    stack_info = "Detected: " + ", ".join(f["name"] for f in frameworks) if frameworks else ""
    lang_info  = ", ".join(f"{l}({n})" for l, n in languages.items()) if languages else ""
    return _llm(
        "You are a senior technical writer creating concise developer summaries.",
        summary_prompt(context[:6000], stack_info, lang_info),
    )