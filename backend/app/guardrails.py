"""Guardrails para validar SQL antes da execucao.

Garantias aplicadas pela `validate_and_sanitize`:

- Apenas statements de leitura (SELECT ou WITH).
- Nenhum DDL/DML/PRAGMA/ATTACH/DETACH/VACUUM/REINDEX.
- Apenas 1 statement por chamada (sem `;` no meio).
- LIMIT obrigatorio no nivel EXTERNO da query (se faltar, e anexado
  automaticamente com valor `MAX_ROWS`). Um LIMIT que aparece apenas dentro
  de subqueries nao conta como LIMIT externo.

Limitacao conhecida: a regex `_FORBIDDEN` bloqueia palavras reservadas
mesmo quando aparecem dentro de literais string (ex: `WHERE nome = 'DROP'`).
Isso e intencional: relaxar a checagem para "saber" o que e literal exigiria
um parser SQL completo, e o risco de uma brecha compensa o falso positivo
raro nesse dominio de e-commerce.
"""
from __future__ import annotations

import re

MAX_ROWS = 1000

_FORBIDDEN = re.compile(
    r"\b(DROP|DELETE|UPDATE|INSERT|ALTER|CREATE|ATTACH|DETACH|PRAGMA|REPLACE|VACUUM|TRUNCATE|GRANT|REVOKE|REINDEX)\b",
    re.IGNORECASE,
)
_STARTS_WITH_READ = re.compile(r"^\s*(SELECT|WITH)\b", re.IGNORECASE)
_HAS_OUTER_LIMIT = re.compile(
    r"\bLIMIT\s+\d+(\s+OFFSET\s+\d+)?\s*$",
    re.IGNORECASE,
)


class GuardrailError(ValueError):
    """Erro lancado quando a SQL viola as regras de seguranca."""


def validate_and_sanitize(sql: str) -> str:
    """Valida a SQL e retorna a versao saneada (com LIMIT externo garantido).

    Args:
        sql: query bruta proposta pelo LLM.

    Returns:
        SQL segura para executar, com LIMIT anexado se nao havia LIMIT no fim.

    Raises:
        GuardrailError: se a SQL violar qualquer regra de seguranca.
    """
    if not sql or not sql.strip():
        raise GuardrailError("Query vazia.")

    cleaned = sql.strip().rstrip(";").strip()

    if ";" in cleaned:
        raise GuardrailError(
            "Multiplos statements nao sao permitidos. Envie apenas um SELECT por vez."
        )

    if _FORBIDDEN.search(cleaned):
        raise GuardrailError(
            "Comandos de modificacao nao sao permitidos. Use apenas SELECT ou WITH."
        )

    if not _STARTS_WITH_READ.match(cleaned):
        raise GuardrailError("A query precisa comecar com SELECT ou WITH.")

    if not _HAS_OUTER_LIMIT.search(cleaned):
        cleaned = f"{cleaned}\nLIMIT {MAX_ROWS}"

    return cleaned
