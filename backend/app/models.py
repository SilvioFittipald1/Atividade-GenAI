"""Modelos Pydantic para requests/responses da API e estado interno do agente."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Optional

from pydantic import BaseModel, Field


class AskRequest(BaseModel):
    question: str = Field(min_length=1, description="Pergunta do usuario em PT-BR")
    conversation_id: str = Field(description="UUID da conversa para manter historico")


class AgentOutput(BaseModel):
    """Output estruturado que o LLM produz no mesmo turno (explicacao + sugestoes)."""

    explanation: str = Field(description="Explicacao em PT-BR, 1-3 frases")
    suggestions: list[str] = Field(
        default_factory=list,
        description="Ate 3 perguntas de follow-up relevantes em PT-BR",
        max_length=3,
    )


class ExecuteSqlRequest(BaseModel):
    sql: str = Field(min_length=1, description="SQL SELECT/WITH a executar")


class ExecuteSqlResponse(BaseModel):
    sql: str
    columns: list[str]
    rows: list[dict[str, Any]]
    row_count: int


class RehydrateRequest(BaseModel):
    """Repopula o HistoryStore a partir de JSON serializado (sem chamar Gemini)."""

    conversation_id: str
    messages_json: str = Field(
        default="",
        description="JSON de ModelMessagesTypeAdapter (result.all_messages do /ask).",
    )


class AskResponse(BaseModel):
    """Payload retornado pelo backend ao frontend apos o agente executar."""

    sql: str = Field(description="SQL efetivamente executada (apos guardrails)")
    columns: list[str] = Field(description="Nomes das colunas do resultado")
    rows: list[dict[str, Any]] = Field(description="Linhas do resultado (max 1000)")
    explanation: str = Field(description="Explicacao em PT-BR gerada pelo LLM")
    row_count: int = Field(description="Quantidade de linhas retornadas")
    suggestions: list[str] = Field(
        default_factory=list,
        description="Sugestoes de follow-up (mesma chamada do LLM, sem request extra)",
    )
    cached: bool = Field(
        default=False,
        description="True se a resposta veio do cache in-memory (sem chamar o LLM)",
    )
    messages_json: str = Field(
        default="",
        description="Serializacao de result.all_messages() para reidratacao e sidebar",
    )
    retrieved_tables: list[str] = Field(
        default_factory=list,
        description="Tabelas selecionadas pelo retriever RAG para compor o system prompt",
    )
    used_full_schema: bool = Field(
        default=False,
        description="True quando o retriever caiu no fallback e enviou o schema completo",
    )
    tokens_saved_estimate: int = Field(
        default=0,
        description="Estimativa de tokens economizados no system prompt pelo RAG",
    )


class ColumnInfo(BaseModel):
    """Metadado por coluna para o Schema Explorer."""

    name: str
    type: str
    notnull: bool = False
    pk: bool = False
    top_values: Optional[list[dict[str, Any]]] = Field(
        default=None,
        description="Lista [{value, count}] para colunas categoricas (<= 50 distintos)",
    )
    stats: Optional[dict[str, Any]] = Field(
        default=None,
        description="Min/max/avg para colunas numericas",
    )


class LogicalFk(BaseModel):
    """FK 'logica' (convencao por nome, nao declarada no DDL)."""

    from_col: str
    to_table: str
    to_col: str


class TableInfo(BaseModel):
    """Snapshot de uma tabela com dados reais do banco."""

    name: str
    row_count: int
    columns: list[ColumnInfo]
    samples: list[dict[str, Any]] = Field(default_factory=list)
    logical_fks: list[LogicalFk] = Field(default_factory=list)


class SchemaSnapshot(BaseModel):
    """Dump completo do schema introspectado (consumido pelo Schema Explorer)."""

    tables: list[TableInfo]
    generated_at: str
    schema_hash: str


@dataclass
class AgentDeps:
    """Estado mutavel compartilhado entre a tool `execute_sql` e o orquestrador.

    O LLM so precisa escrever a explicacao final; as colunas e linhas completas
    ficam aqui para montarmos a `AskResponse` sem gastar tokens transportando
    dados pelo LLM. `schema_section` e preenchido pelo retriever RAG a cada
    request (None -> fallback para SCHEMA_STR completo).
    """

    last_sql: str | None = None
    last_columns: list[str] = field(default_factory=list)
    last_rows: list[dict[str, Any]] = field(default_factory=list)
    last_error: str | None = None
    schema_section: str | None = None
    retrieved_tables: list[str] = field(default_factory=list)
