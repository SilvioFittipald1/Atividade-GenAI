"""FastAPI do Agente E-commerce. Rode com `uvicorn app.main:app --port 8000`."""
from __future__ import annotations

import logging
import sqlite3
import time
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic_ai.exceptions import ModelHTTPError
from pydantic_ai.messages import ModelMessagesTypeAdapter

from .agent import MODEL_SLUG, agent
from .guardrails import GuardrailError
from .history import store
from .models import (
    AgentDeps,
    AskRequest,
    AskResponse,
    ExecuteSqlRequest,
    ExecuteSqlResponse,
    RehydrateRequest,
    SchemaSnapshot,
)
from .retriever import get_retriever
from .schema import SCHEMA_STR, TABLE_NAMES, build_schema_section
from .schema_inspector import inspect_database
from .tools import run_query

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s - %(message)s",
)
logger = logging.getLogger(__name__)


_schema_snapshot: SchemaSnapshot | None = None


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """Pre-computa recursos pesados no startup: snapshot do schema e retriever RAG."""
    global _schema_snapshot
    t0 = time.monotonic()
    try:
        _schema_snapshot = inspect_database()
        logger.info(
            "Schema snapshot gerado em %.2fs (%d tabelas)",
            time.monotonic() - t0,
            len(_schema_snapshot.tables),
        )
    except Exception:
        logger.exception("Falha ao gerar schema snapshot; /health devolvera schema vazio.")
        _schema_snapshot = SchemaSnapshot(
            tables=[],
            generated_at="",
            schema_hash="",
        )

    try:
        t1 = time.monotonic()
        get_retriever()
        logger.info("Retriever RAG inicializado em %.2fs", time.monotonic() - t1)
    except Exception:
        logger.exception("Retriever RAG indisponivel; /ask usara schema completo.")

    yield


app = FastAPI(
    title="Agente E-commerce GenAI",
    description=(
        "Text-to-SQL conversacional. Recebe perguntas em portugues, gera SQL, "
        "executa no banco SQLite (read-only) e devolve dados + explicacao."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root() -> dict:
    return {
        "service": "Agente E-commerce GenAI",
        "version": "0.1.0",
        "endpoints": [
            "/ask",
            "/execute-sql",
            "/rehydrate",
            "/schema",
            "/health",
            "/reset/{conversation_id}",
        ],
    }


@app.get("/health")
def health() -> dict:
    schema_payload = (
        _schema_snapshot.model_dump() if _schema_snapshot is not None else None
    )
    return {
        "ok": True,
        "model": MODEL_SLUG,
        "tables": TABLE_NAMES,
        "conversations_in_memory": store.count(),
        "total_messages_in_memory": store.total_messages(),
        "schema": schema_payload,
    }


@app.get("/schema")
def schema_endpoint() -> dict:
    return {"schema": SCHEMA_STR}


@app.post("/ask", response_model=AskResponse)
async def ask(req: AskRequest) -> AskResponse:
    cached = store.cache_get(req.conversation_id, req.question)
    if cached is not None:
        logger.info(
            "Ask CACHE HIT conv=%s question=%r",
            req.conversation_id,
            req.question[:120],
        )
        return cached.model_copy(update={"cached": True})

    try:
        retrieval = get_retriever().retrieve(req.question)
        schema_section = build_schema_section(
            None if retrieval.used_full_schema else retrieval.tables
        )
    except Exception:
        logger.exception("RAG: erro ao recuperar; usando schema completo.")
        retrieval = None
        schema_section = build_schema_section(None)

    deps = AgentDeps(
        schema_section=schema_section,
        retrieved_tables=list(retrieval.tables) if retrieval else list(TABLE_NAMES),
    )
    history = store.get(req.conversation_id)

    logger.info(
        "Ask conv=%s history_size=%d rag_tables=%s full_schema=%s question=%r",
        req.conversation_id,
        len(history),
        retrieval.tables if retrieval else TABLE_NAMES,
        retrieval.used_full_schema if retrieval else True,
        req.question[:120],
    )

    try:
        result = await agent.run(
            req.question,
            deps=deps,
            message_history=history,
        )
    except ModelHTTPError as e:
        upstream_status = getattr(e, "status_code", None)
        upstream_body = getattr(e, "body", None)
        logger.warning(
            "LLM indisponivel (upstream_status=%s model=%s body=%r) err=%s",
            upstream_status,
            getattr(e, "model_name", "?"),
            str(upstream_body)[:300] if upstream_body else None,
            e,
        )
        raise HTTPException(
            status_code=503,
            detail=(
                "O modelo Gemini esta temporariamente indisponivel "
                "(alta demanda). Tente novamente em alguns segundos. "
                "Se persistir, verifique sua quota em "
                "https://aistudio.google.com/apikey e o status em "
                "https://status.cloud.google.com/."
            ),
        ) from e
    except Exception as e:
        logger.exception("Falha ao executar o agente")
        raise HTTPException(
            status_code=500,
            detail=f"Falha interna do agente: {type(e).__name__}: {e}",
        ) from e

    all_msgs = list(result.all_messages())
    store.set(req.conversation_id, all_msgs)

    out = result.output
    messages_json = ModelMessagesTypeAdapter.dump_json(all_msgs).decode("utf-8")

    response = AskResponse(
        sql=deps.last_sql or "",
        columns=deps.last_columns,
        rows=deps.last_rows,
        explanation=out.explanation,
        row_count=len(deps.last_rows),
        suggestions=out.suggestions,
        cached=False,
        messages_json=messages_json,
        retrieved_tables=list(retrieval.tables) if retrieval else list(TABLE_NAMES),
        used_full_schema=retrieval.used_full_schema if retrieval else True,
        tokens_saved_estimate=(
            retrieval.tokens_saved_estimate if retrieval else 0
        ),
    )
    store.cache_set(req.conversation_id, req.question, response)
    return response


@app.post("/execute-sql", response_model=ExecuteSqlResponse)
def execute_sql_endpoint(req: ExecuteSqlRequest) -> ExecuteSqlResponse:
    try:
        sanitized, cols, rows = run_query(req.sql)
    except GuardrailError as e:
        raise HTTPException(status_code=400, detail=f"SQL bloqueado: {e}") from e
    except sqlite3.Error as e:
        raise HTTPException(status_code=400, detail=f"Erro SQL: {e}") from e
    return ExecuteSqlResponse(
        sql=sanitized, columns=cols, rows=rows, row_count=len(rows)
    )


@app.post("/rehydrate")
def rehydrate_endpoint(req: RehydrateRequest) -> dict:
    if not req.messages_json or not req.messages_json.strip():
        raise HTTPException(
            status_code=400,
            detail="messages_json vazio; nada para reidratar.",
        )
    try:
        msgs = ModelMessagesTypeAdapter.validate_json(req.messages_json)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"messages_json invalido: {type(e).__name__}: {e}",
        ) from e
    store.rehydrate(req.conversation_id, msgs)
    logger.info(
        "Rehydrated conversation %s com %d mensagens",
        req.conversation_id,
        len(msgs),
    )
    return {
        "ok": True,
        "conversation_id": req.conversation_id,
        "messages": len(msgs),
    }


@app.post("/reset/{conversation_id}")
def reset(conversation_id: str) -> dict:
    existed = store.reset(conversation_id)
    return {"ok": True, "existed": existed, "conversation_id": conversation_id}
