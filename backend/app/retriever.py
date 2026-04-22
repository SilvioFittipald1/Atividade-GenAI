"""Retriever local para filtrar o schema enviado ao LLM.

Arquitetura em duas camadas:

1. Preferencia: `fastembed` (MiniLM via ONNX Runtime, ~22 MB baixado 1x,
   ~150 MB RAM). Alta qualidade semantica sem depender de torch / CUDA.
2. Fallback: BM25 puro-Python (~40 linhas). Sem downloads, sem RAM extra.
   Qualidade um pouco inferior, mas suficiente para schema de 7 tabelas com
   aliases PT-BR.

Os embeddings sao persistidos em `backend/.rag_cache/tables.pkl` com chave
igual ao hash do `SCHEMA_STR` + slug do modelo. Se o schema mudar (ou o
modelo trocar), o arquivo e regenerado automaticamente no proximo startup.

Controlado por env `RAG_BACKEND=st|bm25|off`:
- `st`    (default): usa fastembed (ONNX).
- `bm25`  : forca o fallback mesmo se o pacote estiver instalado.
- `off`   : desliga retriever; /ask usa sempre schema completo.
"""
from __future__ import annotations

import hashlib
import logging
import math
import os
import pickle
import re
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from threading import Lock

from pydantic import BaseModel

from .db import BASE_DIR
from .schema import SCHEMA_STR, TABLE_NAMES

logger = logging.getLogger(__name__)


CACHE_DIR = BASE_DIR / ".rag_cache"
MODEL_NAME_PRIMARY = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
MODEL_NAME_FALLBACK = "sentence-transformers/all-MiniLM-L6-v2"
TOP_K = 4
THRESHOLD = 0.30
FALLBACK_SCORE = THRESHOLD * 0.8
AVG_TOKENS_PER_TABLE = 600

TABLE_EXTRA_ALIASES: dict[str, list[str]] = {
    "dim_consumidores": [
        "comprador",
        "compradores",
        "cliente",
        "clientes",
        "consumidor",
        "consumidores",
        "usuario final",
    ],
    "dim_produtos": [
        "produto",
        "produtos",
        "item",
        "itens",
        "catalogo",
        "categoria",
        "categorias",
        "mercadoria",
        "sku",
    ],
    "dim_vendedores": [
        "vendedor",
        "vendedores",
        "lojista",
        "seller",
        "sellers",
        "loja",
    ],
    "fat_pedidos": [
        "pedido",
        "pedidos",
        "entrega",
        "entregas",
        "logistica",
        "prazo",
        "atraso",
        "status",
        "compra",
    ],
    "fat_pedido_total": [
        "receita",
        "faturamento",
        "ticket medio",
        "valor pago",
        "valor total",
        "financeiro",
        "pagamento",
        "pagamentos",
    ],
    "fat_itens_pedidos": [
        "itens",
        "produtos vendidos",
        "unidades",
        "quantidade",
        "preco",
        "frete",
        "venda",
        "vendas",
    ],
    "fat_avaliacoes_pedidos": [
        "avaliacao",
        "avaliacoes",
        "nota",
        "notas",
        "review",
        "reviews",
        "comentario",
        "comentarios",
        "feedback",
        "satisfacao",
    ],
}


def _normalize(text: str) -> str:
    text = text.lower().strip()
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c))
    text = re.sub(r"[^a-z0-9\s_-]", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def _extract_table_section(table: str) -> str:
    """Extrai a secao '## Tabela: <nome>' do SCHEMA_STR ate o proximo separador '---'."""
    pattern = re.compile(
        rf"^## Tabela:\s*{re.escape(table)}\b.*?(?=^---\s*$|^## )",
        re.DOTALL | re.MULTILINE,
    )
    m = pattern.search(SCHEMA_STR)
    return m.group(0).strip() if m else f"## Tabela: {table}"


def _table_text(table: str) -> str:
    section = _extract_table_section(table)
    aliases = " ".join(TABLE_EXTRA_ALIASES.get(table, []))
    return f"{table}\n{section}\n\nSinonimos: {aliases}".strip()


TABLE_BRIDGES: dict[str, list[str]] = {
    "fat_itens_pedidos": ["fat_pedidos"],
    "fat_avaliacoes_pedidos": ["fat_pedidos"],
    "fat_pedido_total": ["fat_pedidos"],
}


def _add_bridges(tables: list[str]) -> list[str]:
    """Acrescenta tabelas-ponte obrigatorias para que o LLM consiga fazer JOINs
    mesmo que o retriever nao tenha selecionado a ponte."""
    out = list(tables)
    seen = set(out)
    for t in tables:
        for bridge in TABLE_BRIDGES.get(t, []):
            if bridge not in seen:
                out.append(bridge)
                seen.add(bridge)
    return out


class RetrievalResult(BaseModel):
    tables: list[str]
    scores: dict[str, float]
    used_full_schema: bool
    tokens_saved_estimate: int
    backend: str


@dataclass
class _STCache:
    """Cache binario dos embeddings das tabelas.

    Mantido com o nome `_STCache` por compatibilidade com pickles antigos
    gerados pela versao sentence-transformers; o conteudo e agnostico ao
    backend (so guarda vetores + metadados).
    """

    table_names: list[str]
    vectors: "object"
    schema_hash: str
    model_name: str


def _cache_path() -> Path:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    return CACHE_DIR / "tables.pkl"


def _schema_fingerprint() -> str:
    return hashlib.sha256(SCHEMA_STR.encode("utf-8")).hexdigest()[:16]


def _l2_normalize(vecs):  # type: ignore[no-untyped-def]
    """Normalizacao L2 linha-a-linha para ndarrays 1D ou 2D."""
    import numpy as np  # type: ignore

    arr = np.asarray(vecs, dtype=np.float32)
    if arr.ndim == 1:
        norm = np.linalg.norm(arr)
        return arr / max(float(norm), 1e-12)
    norms = np.linalg.norm(arr, axis=1, keepdims=True)
    return arr / np.maximum(norms, 1e-12)


class _FastEmbedRetriever:
    """Retriever com fastembed (ONNX Runtime, sem torch)."""

    def __init__(self) -> None:
        from fastembed import TextEmbedding  # type: ignore

        try:
            self._model = TextEmbedding(MODEL_NAME_PRIMARY)
            self.slug = MODEL_NAME_PRIMARY
        except Exception:
            logger.warning(
                "fastembed nao suporta %s; usando %s",
                MODEL_NAME_PRIMARY,
                MODEL_NAME_FALLBACK,
            )
            self._model = TextEmbedding(MODEL_NAME_FALLBACK)
            self.slug = MODEL_NAME_FALLBACK

        self._cache = self._load_or_build_cache()

    def _embed_batch(self, texts: list[str]):  # type: ignore[no-untyped-def]
        import numpy as np  # type: ignore

        arr = np.asarray(list(self._model.embed(texts)), dtype=np.float32)
        return _l2_normalize(arr)

    def _load_or_build_cache(self) -> _STCache:
        cache_file = _cache_path()
        fp = _schema_fingerprint()
        if cache_file.exists():
            try:
                with cache_file.open("rb") as fh:
                    cached: _STCache = pickle.load(fh)
                if cached.schema_hash == fp and cached.model_name == self.slug:
                    logger.info("RAG: embeddings carregados do cache %s", cache_file)
                    return cached
                logger.info("RAG: cache desatualizado, regenerando.")
            except Exception:
                logger.exception("RAG: falha ao ler cache, regenerando.")

        import numpy as np  # type: ignore

        texts = [_table_text(t) for t in TABLE_NAMES]
        vectors = self._embed_batch(texts)
        cache = _STCache(
            table_names=list(TABLE_NAMES),
            vectors=np.asarray(vectors, dtype=np.float32),
            schema_hash=fp,
            model_name=self.slug,
        )
        try:
            with cache_file.open("wb") as fh:
                pickle.dump(cache, fh)
        except Exception:
            logger.warning("RAG: nao foi possivel persistir cache em %s", cache_file)
        return cache

    def retrieve(self, question: str) -> RetrievalResult:
        q = _normalize(question)
        qv = self._embed_batch([q])[0]
        sims = (self._cache.vectors @ qv).tolist()
        return _build_result(self._cache.table_names, sims, backend="st")


class _BM25Retriever:
    """Retriever BM25 simples (sem dependencias externas)."""

    def __init__(self) -> None:
        self._docs_tokens = [_tokenize(_table_text(t)) for t in TABLE_NAMES]
        self._doc_freq: dict[str, int] = {}
        for toks in self._docs_tokens:
            for tok in set(toks):
                self._doc_freq[tok] = self._doc_freq.get(tok, 0) + 1
        self._avgdl = sum(len(d) for d in self._docs_tokens) / max(
            1, len(self._docs_tokens)
        )
        self._N = len(self._docs_tokens)

    def retrieve(self, question: str) -> RetrievalResult:
        k1 = 1.5
        b = 0.75
        q_tokens = _tokenize(question)
        scores: list[float] = []
        for doc in self._docs_tokens:
            doc_len = len(doc)
            score = 0.0
            tf_map: dict[str, int] = {}
            for tok in doc:
                tf_map[tok] = tf_map.get(tok, 0) + 1
            for tok in q_tokens:
                if tok not in tf_map:
                    continue
                n_qi = self._doc_freq.get(tok, 0)
                idf = math.log(1 + (self._N - n_qi + 0.5) / (n_qi + 0.5))
                tf = tf_map[tok]
                denom = tf + k1 * (1 - b + b * (doc_len / max(1.0, self._avgdl)))
                score += idf * (tf * (k1 + 1)) / max(1e-6, denom)
            scores.append(score)
        mx = max(scores) if scores else 0.0
        norm = [s / mx if mx > 0 else 0.0 for s in scores]
        return _build_result(list(TABLE_NAMES), norm, backend="bm25")


def _tokenize(text: str) -> list[str]:
    t = _normalize(text)
    return [tok for tok in t.split() if len(tok) > 1]


def _build_result(
    table_names: list[str],
    scores: list[float],
    backend: str,
) -> RetrievalResult:
    paired = sorted(
        zip(table_names, scores), key=lambda x: x[1], reverse=True
    )
    best = paired[0][1] if paired else 0.0

    if best < FALLBACK_SCORE:
        return RetrievalResult(
            tables=list(TABLE_NAMES),
            scores={t: float(s) for t, s in paired},
            used_full_schema=True,
            tokens_saved_estimate=0,
            backend=backend,
        )

    picked = [t for t, s in paired[:TOP_K] if s >= THRESHOLD]
    if not picked:
        picked = [paired[0][0]]
    picked = _add_bridges(picked)

    not_used = max(0, len(TABLE_NAMES) - len(picked))
    return RetrievalResult(
        tables=picked,
        scores={t: float(s) for t, s in paired},
        used_full_schema=False,
        tokens_saved_estimate=not_used * AVG_TOKENS_PER_TABLE,
        backend=backend,
    )


class SchemaRetriever:
    """Facade publica: encapsula a escolha do backend e tolerancia a falhas."""

    def __init__(self) -> None:
        mode = os.getenv("RAG_BACKEND", "st").strip().lower() or "st"
        self.backend_name = mode
        self._impl: object | None = None

        if mode == "off":
            logger.info("RAG desligado via RAG_BACKEND=off.")
            return

        if mode == "st":
            try:
                self._impl = _FastEmbedRetriever()
                self.backend_name = "st"
                return
            except Exception:
                logger.exception(
                    "RAG: falha ao inicializar fastembed; caindo para BM25."
                )

        try:
            self._impl = _BM25Retriever()
            self.backend_name = "bm25"
        except Exception:
            logger.exception("RAG: BM25 tambem falhou; retriever ficara inoperante.")
            self._impl = None

    def retrieve(self, question: str) -> RetrievalResult:
        if self._impl is None:
            return RetrievalResult(
                tables=list(TABLE_NAMES),
                scores={t: 0.0 for t in TABLE_NAMES},
                used_full_schema=True,
                tokens_saved_estimate=0,
                backend="off",
            )
        return self._impl.retrieve(question)  # type: ignore[attr-defined]


_retriever_lock = Lock()
_retriever_singleton: SchemaRetriever | None = None


def get_retriever() -> SchemaRetriever:
    global _retriever_singleton
    if _retriever_singleton is None:
        with _retriever_lock:
            if _retriever_singleton is None:
                _retriever_singleton = SchemaRetriever()
    return _retriever_singleton
