"""Introspeccao do banco SQLite para o Schema Explorer.

Roda UMA VEZ no startup (ver `lifespan` em main.py). Usa uma conexao
read-only direta (sem passar por guardrails/run_query) porque e codigo
interno que nunca recebe SQL do LLM. Gera um `SchemaSnapshot` com contagens,
colunas, amostras, top-values de categoricas e estatisticas de numericas.
"""
from __future__ import annotations

import hashlib
import logging
import sqlite3
from datetime import datetime, timezone
from typing import Any

from .db import DB_PATH
from .models import ColumnInfo, LogicalFk, SchemaSnapshot, TableInfo
from .schema import SCHEMA_STR, TABLE_NAMES

logger = logging.getLogger(__name__)


LOGICAL_FKS: dict[str, list[LogicalFk]] = {
    "fat_pedidos": [
        LogicalFk(
            from_col="id_consumidor",
            to_table="dim_consumidores",
            to_col="id_consumidor",
        ),
    ],
    "fat_pedido_total": [
        LogicalFk(
            from_col="id_pedido",
            to_table="fat_pedidos",
            to_col="id_pedido",
        ),
        LogicalFk(
            from_col="id_consumidor",
            to_table="dim_consumidores",
            to_col="id_consumidor",
        ),
    ],
    "fat_itens_pedidos": [
        LogicalFk(
            from_col="id_pedido",
            to_table="fat_pedidos",
            to_col="id_pedido",
        ),
        LogicalFk(
            from_col="id_produto",
            to_table="dim_produtos",
            to_col="id_produto",
        ),
        LogicalFk(
            from_col="id_vendedor",
            to_table="dim_vendedores",
            to_col="id_vendedor",
        ),
    ],
    "fat_avaliacoes_pedidos": [
        LogicalFk(
            from_col="id_pedido",
            to_table="fat_pedidos",
            to_col="id_pedido",
        ),
    ],
}


MAX_CATEGORICAL = 50
CATEGORICAL_SAMPLE = 10000
SAMPLE_ROWS = 3
TOP_K = 5


def _is_text_type(t: str) -> bool:
    return "TEXT" in t.upper() or "CHAR" in t.upper() or t == ""


def _is_numeric_type(t: str) -> bool:
    up = t.upper()
    return any(k in up for k in ("INT", "REAL", "NUM", "FLOAT", "DOUBLE", "DEC"))


def _quote(identifier: str) -> str:
    safe = identifier.replace('"', '""')
    return f'"{safe}"'


def _fetch_columns(conn: sqlite3.Connection, table: str) -> list[dict[str, Any]]:
    cur = conn.execute(f"PRAGMA table_info({_quote(table)})")
    return [
        {
            "cid": row[0],
            "name": row[1],
            "type": row[2] or "",
            "notnull": bool(row[3]),
            "pk": bool(row[5]),
        }
        for row in cur.fetchall()
    ]


def _row_count(conn: sqlite3.Connection, table: str) -> int:
    try:
        cur = conn.execute(f"SELECT COUNT(*) FROM {_quote(table)}")
        row = cur.fetchone()
        return int(row[0]) if row else 0
    except sqlite3.Error as e:
        logger.warning("row_count falhou em %s: %s", table, e)
        return 0


def _sample_rows(
    conn: sqlite3.Connection, table: str, limit: int = SAMPLE_ROWS
) -> list[dict[str, Any]]:
    try:
        cur = conn.execute(f"SELECT * FROM {_quote(table)} LIMIT {int(limit)}")
        cols = [d[0] for d in cur.description] if cur.description else []
        return [dict(zip(cols, row)) for row in cur.fetchall()]
    except sqlite3.Error as e:
        logger.warning("sample_rows falhou em %s: %s", table, e)
        return []


def _top_values(
    conn: sqlite3.Connection, table: str, column: str
) -> list[dict[str, Any]] | None:
    """Retorna top-K por frequencia se a coluna tiver <= MAX_CATEGORICAL
    distintos na amostra. Retorna None quando nao se qualifica como categorica.
    """
    try:
        sample_sql = (
            f"SELECT COUNT(DISTINCT {_quote(column)}) FROM "
            f"(SELECT {_quote(column)} FROM {_quote(table)} LIMIT {CATEGORICAL_SAMPLE})"
        )
        cur = conn.execute(sample_sql)
        row = cur.fetchone()
        distinct_est = int(row[0]) if row else 0
        if distinct_est == 0 or distinct_est > MAX_CATEGORICAL:
            return None

        top_sql = (
            f"SELECT {_quote(column)} AS value, COUNT(*) AS cnt "
            f"FROM {_quote(table)} GROUP BY {_quote(column)} "
            f"ORDER BY cnt DESC LIMIT {TOP_K}"
        )
        cur = conn.execute(top_sql)
        return [
            {"value": r[0], "count": int(r[1])} for r in cur.fetchall()
        ]
    except sqlite3.Error as e:
        logger.warning("top_values falhou em %s.%s: %s", table, column, e)
        return None


def _numeric_stats(
    conn: sqlite3.Connection, table: str, column: str
) -> dict[str, Any] | None:
    try:
        cur = conn.execute(
            f"SELECT MIN({_quote(column)}), MAX({_quote(column)}), AVG({_quote(column)}) "
            f"FROM {_quote(table)}"
        )
        row = cur.fetchone()
        if not row:
            return None
        mn, mx, avg = row
        if mn is None and mx is None and avg is None:
            return None
        return {
            "min": mn,
            "max": mx,
            "avg": round(avg, 2) if isinstance(avg, (int, float)) else avg,
        }
    except sqlite3.Error as e:
        logger.warning("numeric_stats falhou em %s.%s: %s", table, column, e)
        return None


def _inspect_table(conn: sqlite3.Connection, name: str) -> TableInfo:
    raw_cols = _fetch_columns(conn, name)
    row_count = _row_count(conn, name)
    samples = _sample_rows(conn, name)

    columns: list[ColumnInfo] = []
    for c in raw_cols:
        col_type = c["type"] or ""
        top_values: list[dict[str, Any]] | None = None
        stats: dict[str, Any] | None = None

        if row_count > 0:
            if _is_numeric_type(col_type):
                stats = _numeric_stats(conn, name, c["name"])
            if _is_text_type(col_type) and not c["name"].startswith("id_"):
                top_values = _top_values(conn, name, c["name"])

        columns.append(
            ColumnInfo(
                name=c["name"],
                type=col_type,
                notnull=c["notnull"],
                pk=c["pk"],
                top_values=top_values,
                stats=stats,
            )
        )

    return TableInfo(
        name=name,
        row_count=row_count,
        columns=columns,
        samples=samples,
        logical_fks=LOGICAL_FKS.get(name, []),
    )


def inspect_database() -> SchemaSnapshot:
    """Gera o snapshot completo. Abre uma conexao read-only diretamente
    (bypass dos guardrails — e codigo interno, nunca recebe SQL do LLM).
    """
    if not DB_PATH.exists():
        logger.warning(
            "Banco nao encontrado em %s; gerando snapshot vazio.", DB_PATH
        )
        return SchemaSnapshot(
            tables=[],
            generated_at=datetime.now(timezone.utc).isoformat(),
            schema_hash=_schema_hash(),
        )

    uri = f"file:{DB_PATH.as_posix()}?mode=ro"
    tables: list[TableInfo] = []
    with sqlite3.connect(uri, uri=True, timeout=10) as conn:
        conn.row_factory = None
        for name in TABLE_NAMES:
            try:
                tables.append(_inspect_table(conn, name))
            except Exception:
                logger.exception("Falha inspecionando tabela %s", name)

    return SchemaSnapshot(
        tables=tables,
        generated_at=datetime.now(timezone.utc).isoformat(),
        schema_hash=_schema_hash(),
    )


def _schema_hash() -> str:
    return hashlib.sha256(SCHEMA_STR.encode("utf-8")).hexdigest()[:16]
