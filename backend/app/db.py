"""Conexao SQLite em modo read-only.

Resolve `DB_PATH` a partir do `.env` (relativo a pasta backend/).
Este modulo e o unico ponto do backend que chama `load_dotenv`: como e
importado transitivamente por quase todos os demais modulos, basta uma
chamada aqui para popular as variaveis de ambiente do processo.
"""
from __future__ import annotations

import os
import sqlite3
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

_env_db = os.getenv("DB_PATH", "./banco.db").strip()
_candidate = Path(_env_db)
if _candidate.is_absolute():
    DB_PATH = _candidate
else:
    cleaned = _env_db[2:] if _env_db.startswith("./") or _env_db.startswith(".\\") else _env_db
    DB_PATH = (BASE_DIR / cleaned).resolve()


def get_ro_connection() -> sqlite3.Connection:
    """Abre o banco em modo somente-leitura.

    Falha rapido com `FileNotFoundError` se o arquivo nao existe, evitando que
    o SQLite crie silenciosamente um banco vazio.
    """
    if not DB_PATH.exists():
        raise FileNotFoundError(
            f"Banco nao encontrado em {DB_PATH}. "
            "Coloque o arquivo banco.db na pasta backend/."
        )
    uri = f"file:{DB_PATH.as_posix()}?mode=ro"
    return sqlite3.connect(uri, uri=True, timeout=10)
