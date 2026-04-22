"""Execucao de SQL validado pelos guardrails.

Separado de `agent.py` para permitir reutilizacao pelo endpoint `/execute-sql`
e para manter a superficie de teste desacoplada do Pydantic AI.
"""
from __future__ import annotations

import sqlite3
from typing import Any

from .db import get_ro_connection
from .guardrails import MAX_ROWS, validate_and_sanitize


def run_query(query: str) -> tuple[str, list[str], list[dict[str, Any]]]:
    """Valida, sanitiza e executa uma SQL de leitura.

    Returns:
        (sanitized_sql, columns, rows). `rows` e lista de dicts coluna->valor,
        truncada em `MAX_ROWS`.

    Raises:
        GuardrailError: SQL viola as regras de seguranca.
        sqlite3.Error: erro na execucao.
    """
    sanitized_sql = validate_and_sanitize(query)

    with get_ro_connection() as conn:
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute(sanitized_sql)
        rows_raw = cur.fetchmany(MAX_ROWS)
        columns = (
            list(rows_raw[0].keys())
            if rows_raw
            else [d[0] for d in (cur.description or [])]
        )
        rows = [dict(r) for r in rows_raw]

    return sanitized_sql, columns, rows
