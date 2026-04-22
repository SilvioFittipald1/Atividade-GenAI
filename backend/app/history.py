"""Armazenamento em memoria de historico e cache por conversation_id.

MVP: dicts simples protegidos por `Lock` para thread-safety. O estado e perdido
quando o processo uvicorn reinicia. Para producao, trocar por Redis ou uma
tabela SQLite dedicada.
"""
from __future__ import annotations

from threading import Lock
from typing import TYPE_CHECKING

from .models import AskResponse

if TYPE_CHECKING:
    from pydantic_ai.messages import ModelMessage


class HistoryStore:
    """Store de `ModelMessage` e de respostas cacheadas por `conversation_id`.

    O cache de respostas e indexado por `(conv_id, pergunta_normalizada)` e
    ignora propositalmente o historico atual: se o usuario refizer a mesma
    pergunta exata dentro da mesma conversa, a resposta anterior e reutilizada
    para economizar tokens. Follow-ups com textos diferentes (ex: "e em SP?")
    nao batem no cache.
    """

    def __init__(self) -> None:
        self._store: dict[str, list["ModelMessage"]] = {}
        self._cache: dict[str, dict[str, AskResponse]] = {}
        self._lock = Lock()

    @staticmethod
    def _norm_question(question: str) -> str:
        return " ".join(question.lower().split())

    def get(self, conversation_id: str) -> list["ModelMessage"]:
        with self._lock:
            return list(self._store.get(conversation_id, []))

    def set(self, conversation_id: str, messages: list["ModelMessage"]) -> None:
        with self._lock:
            self._store[conversation_id] = list(messages)

    def rehydrate(self, conv_id: str, messages: list["ModelMessage"]) -> None:
        """Repopula o historico sem passar pelo Gemini. Sobrescreve o estado atual."""
        with self._lock:
            self._store[conv_id] = list(messages)

    def cache_get(self, conv_id: str, question: str) -> AskResponse | None:
        key = self._norm_question(question)
        with self._lock:
            return self._cache.get(conv_id, {}).get(key)

    def cache_set(self, conv_id: str, question: str, resp: AskResponse) -> None:
        key = self._norm_question(question)
        with self._lock:
            self._cache.setdefault(conv_id, {})[key] = resp

    def reset(self, conversation_id: str) -> bool:
        """Remove historico e cache da conversa. Retorna True se existia historico."""
        with self._lock:
            self._cache.pop(conversation_id, None)
            return self._store.pop(conversation_id, None) is not None

    def count(self) -> int:
        with self._lock:
            return len(self._store)

    def total_messages(self) -> int:
        with self._lock:
            return sum(len(msgs) for msgs in self._store.values())


store = HistoryStore()
