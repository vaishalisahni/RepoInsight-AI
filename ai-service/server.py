import os
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

from src.pipeline.ingest_pipeline import run_ingest
from src.pipeline.query_pipeline import query, query_stream, explain, trace, impact, generate_summary

app = Flask(__name__)
CORS(app)

# ── Routes ────────────────────────────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


@app.route("/ingest", methods=["POST"])
def ingest():
    data = request.get_json()
    local_path     = data.get("localPath")
    faiss_index_id = data.get("faissIndexId")
    repo_url       = data.get("repoUrl")
    branch         = data.get("branch", "main")
    github_token   = data.get("githubToken")

    if not faiss_index_id:
        return jsonify({"error": "faissIndexId required"}), 400
    if not local_path and not repo_url:
        return jsonify({"error": "localPath or repoUrl required"}), 400
    try:
        result = run_ingest(local_path, faiss_index_id, repo_url, branch, github_token)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/query", methods=["POST"])
def query_route():
    data = request.get_json()
    try:
        result = query(data)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/query/stream", methods=["POST"])
def query_stream_route():
    data = request.get_json()
    return Response(
        query_stream(data),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@app.route("/explain", methods=["POST"])
def explain_route():
    data = request.get_json()
    try:
        result = explain(data)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/trace", methods=["POST"])
def trace_route():
    data = request.get_json()
    try:
        result = trace(data)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/impact", methods=["POST"])
def impact_route():
    data = request.get_json()
    try:
        result = impact(data)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)