"""
Minimal standalone script to test the `match_document_chunks` Supabase RPC.

Usage:
  SUPABASE_URL=... SUPABASE_ANON_KEY=... python scripts/test_match_document_chunks.py \
      --topic training --match-count 5

Optional:
  --embed-file path/to/embedding.json   # JSON list of 1536 floats to use instead of a zero vector
"""

import argparse
import json
import os
import sys
from typing import List, Optional

from supabase import Client, create_client

# Minimal, standalone re-rank helper (avoids importing app code)
_cross_encoder = None


def get_cross_encoder():
    """
    Lazy-load the CrossEncoder model for reranking.
    Uses a lightweight CPU-safe configuration.
    """
    global _cross_encoder
    if _cross_encoder is not None:
        return _cross_encoder

    try:
        from sentence_transformers import CrossEncoder

        _cross_encoder = CrossEncoder(
            "BAAI/bge-reranker-base",
            trust_remote_code=False,
            device="cpu",  # default to CPU for safety in test script
        )
        return _cross_encoder
    except Exception as e:
        print(f"Failed to load CrossEncoder: {e}", file=sys.stderr)
        return None


def load_embedding(path: Optional[str]) -> List[float]:
    if not path:
        # Deterministic small non-zero vector (safer than all zeros for distance)
        return [0.001] * 1536
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, list):
        raise ValueError("Embedding file must contain a JSON list")
    if len(data) != 1536:
        raise ValueError(f"Embedding must have length 1536, got {len(data)}")
    return [float(x) for x in data]


def get_client() -> Client:
    url = "https://fdiaqlotrgnotvyaswlq.supabase.co"
    key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkaWFxbG90cmdub3R2eWFzd2xxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNTg1MDcsImV4cCI6MjA3NDYzNDUwN30.peS754sQ5mBM7Trq6MBDtrBM8_pRX4d8bmy77JQTn70"
    if not url or not key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_ANON_KEY must be set")
    return create_client(url, key)


def main():
    parser = argparse.ArgumentParser(description="Test match_document_chunks RPC")
    parser.add_argument("--topic", default=None, help="Topic filter (optional)")
    parser.add_argument("--match-count", type=int, default=5, help="Number of rows to return")
    parser.add_argument(
        "--embed-file",
        default=None,
        help="Path to JSON file containing a 1536-length embedding list",
    )
    parser.add_argument(
        "--rerank",
        action="store_true",
        help="Also run CrossEncoder re-ranking on returned rows",
    )
    parser.add_argument(
        "--rerank-query",
        default="test query",
        help="Query text to use for reranking (default: 'test query')",
    )
    args = parser.parse_args()

    try:
        embedding = load_embedding(args.embed_file)
    except Exception as e:
        print(f"Failed to load embedding: {e}", file=sys.stderr)
        sys.exit(1)

    try:
        client = get_client()
    except Exception as e:
        print(f"Failed to init Supabase client: {e}", file=sys.stderr)
        sys.exit(1)

    # Parameter names must match the SQL function signature:
    # match_document_chunks(query_embedding vector, match_count int, p_topic text)
    payload = {
        "query_embedding": embedding,
        "match_count": args.match_count,
        "p_topic": args.topic,  # can be None
    }

    try:
        resp = client.rpc("match_document_chunks", payload).execute()
    except Exception as e:
        print(f"RPC call failed: {e}", file=sys.stderr)
        sys.exit(1)

    print("RPC result:")
    if not resp.data:
        print("(no rows returned)")
        return

    docs = []
    for i, row in enumerate(resp.data, start=1):
        doc_id = row.get("document_id")
        chunk_idx = row.get("chunk_index")
        sim = row.get("similarity")
        title = row.get("document_title")
        print(f"{i}. doc_id={doc_id} chunk={chunk_idx} sim={sim:.4f} title={title}")
        docs.append(
            {
                "chunk_text": row.get("chunk_text", ""),
                "chunk_index": chunk_idx,
                "document_title": title,
                "document_keywords": row.get("document_keywords", []),
                "relevance_score": float(sim) if sim is not None else 0.0,
                "document_id": doc_id,
            }
        )

    if args.rerank and docs:
        print("\nRe-ranking with CrossEncoder...")
        model = get_cross_encoder()
        if not model:
            print("Skipping rerank because CrossEncoder failed to load.", file=sys.stderr)
            return

        pairs = [(args.rerank_query, d.get("chunk_text", "")) for d in docs]
        try:
            scores = model.predict(pairs)
            # Flatten potential numpy arrays
            try:
                import numpy as np

                scores = np.asarray(scores).reshape(-1).tolist()
            except Exception:
                if not isinstance(scores, (list, tuple)):
                    scores = [scores]

            for doc, score in zip(docs, scores):
                doc["rerank_score"] = float(score)

            ranked = sorted(docs, key=lambda x: x.get("rerank_score", 0), reverse=True)[
                : min(len(docs), args.match_count)
            ]

            for i, row in enumerate(ranked, start=1):
                rscore = row.get("rerank_score", 0.0)
                title = row.get("document_title")
                print(
                    f"{i}. doc_id={row.get('document_id')} chunk={row.get('chunk_index')} "
                    f"rerank_score={rscore:.4f} title={title}"
                )
        except Exception as e:
            print(f"Rerank failed: {e}", file=sys.stderr)


if __name__ == "__main__":
    main()
