"""Avalia o agente E-commerce contra as 10 perguntas canonicas.

Consome ~20 requisicoes ao Gemini (10 perguntas x 2 chamadas cada). Executa
em batches de 2 perguntas com 60s entre batches para respeitar o limite de
5 RPM do free tier.

Pre-requisito: backend rodando em http://127.0.0.1:8000.

Uso:
    .\\venv\\Scripts\\python.exe -m eval.run_eval

Saida: `backend/eval/eval_report.md`.
"""
from __future__ import annotations

import re
import time
import uuid
from dataclasses import dataclass
from pathlib import Path

import requests

from .questions import QUESTIONS, EvalQuestion

BASE_URL = "http://127.0.0.1:8000"
REPORT_PATH = Path(__file__).parent / "eval_report.md"
TIMEOUT = 120

BATCH_SIZE = 2
SLEEP_BETWEEN_BATCHES = 60


@dataclass
class AskResult:
    question: str
    status: int
    sql: str
    columns: list[str]
    row_count: int
    explanation: str
    error: str | None
    elapsed_seconds: float

    @property
    def passed(self) -> bool:
        """Criterio de sucesso: HTTP 200 + SQL SELECT/WITH nao vazia + >= 1 linha."""
        if self.status != 200 or self.error:
            return False
        if not self.sql.strip():
            return False
        if self.row_count < 1:
            return False
        if not re.match(r"^\s*(SELECT|WITH)\b", self.sql, re.IGNORECASE):
            return False
        return True


def ask_once(question: str, conversation_id: str) -> AskResult:
    t0 = time.monotonic()
    try:
        res = requests.post(
            f"{BASE_URL}/ask",
            json={"question": question, "conversation_id": conversation_id},
            timeout=TIMEOUT,
        )
        elapsed = time.monotonic() - t0
        if res.status_code != 200:
            try:
                detail = res.json().get("detail", "")
            except Exception:
                detail = res.text[:300]
            return AskResult(
                question=question,
                status=res.status_code,
                sql="",
                columns=[],
                row_count=0,
                explanation="",
                error=detail,
                elapsed_seconds=elapsed,
            )
        data = res.json()
        return AskResult(
            question=question,
            status=200,
            sql=data.get("sql", ""),
            columns=data.get("columns", []),
            row_count=int(data.get("row_count", 0)),
            explanation=data.get("explanation", ""),
            error=None,
            elapsed_seconds=elapsed,
        )
    except requests.RequestException as e:
        return AskResult(
            question=question,
            status=0,
            sql="",
            columns=[],
            row_count=0,
            explanation="",
            error=f"RequestException: {e}",
            elapsed_seconds=time.monotonic() - t0,
        )


def _short(sql: str, max_len: int = 800) -> str:
    s = sql.strip()
    if len(s) <= max_len:
        return s
    return s[:max_len] + "\n-- (truncado) --"


def _format_columns(columns: list[str]) -> str:
    if not columns:
        return "(nenhuma coluna)"
    return ", ".join(f"`{c}`" for c in columns)


def run_single_questions() -> list[tuple[EvalQuestion, AskResult]]:
    results: list[tuple[EvalQuestion, AskResult]] = []
    total = len(QUESTIONS)
    total_batches = (total + BATCH_SIZE - 1) // BATCH_SIZE

    for batch_idx in range(total_batches):
        start = batch_idx * BATCH_SIZE
        end = min(start + BATCH_SIZE, total)
        batch = QUESTIONS[start:end]

        print(
            f"\n--- Batch {batch_idx + 1}/{total_batches} ({len(batch)} perguntas) ---"
        )
        for q in batch:
            conv = str(uuid.uuid4())
            print(f"[{q.id}] {q.category}: {q.question}")
            r = ask_once(q.question, conv)
            status = "OK " if r.passed else "FAIL"
            print(
                f"   -> {status} status={r.status} rows={r.row_count} ({r.elapsed_seconds:.1f}s)"
            )
            if r.error:
                print(f"   erro: {r.error[:200]}")
            results.append((q, r))

        if batch_idx < total_batches - 1:
            print(
                f"\n[aguardando {SLEEP_BETWEEN_BATCHES}s antes do proximo batch para respeitar 5 RPM...]"
            )
            time.sleep(SLEEP_BETWEEN_BATCHES)
    return results


def write_report(singles: list[tuple[EvalQuestion, AskResult]]) -> None:
    passed_count = sum(1 for _, r in singles if r.passed)
    total = len(singles)
    pass_rate = (passed_count / total * 100) if total else 0
    total_time = sum(r.elapsed_seconds for _, r in singles)

    lines: list[str] = []
    lines.append("# Relatorio de Avaliacao - Agente E-commerce")
    lines.append("")
    lines.append(f"Data: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append("")
    lines.append("## Resumo")
    lines.append("")
    lines.append(f"- Perguntas avaliadas: **{total}**")
    lines.append(f"- Sucessos: **{passed_count}**")
    lines.append(f"- Falhas: **{total - passed_count}**")
    lines.append(f"- Taxa de sucesso: **{pass_rate:.1f}%**")
    lines.append(f"- Tempo total: {total_time:.1f}s")
    lines.append("")
    lines.append(
        "Criterio de sucesso: HTTP 200 + SQL comecando com SELECT/WITH + >= 1 linha retornada."
    )
    lines.append("")

    lines.append("## Cobertura por categoria da atividade")
    lines.append("")
    by_cat: dict[str, list[tuple[EvalQuestion, AskResult]]] = {}
    for q, r in singles:
        by_cat.setdefault(q.category, []).append((q, r))
    lines.append("| Categoria | Aprovadas | Total |")
    lines.append("|---|---|---|")
    for cat, items in by_cat.items():
        cat_passed = sum(1 for _, r in items if r.passed)
        lines.append(f"| {cat} | {cat_passed} | {len(items)} |")
    lines.append("")

    lines.append("## Detalhes por pergunta")
    lines.append("")
    for q, r in singles:
        status = "OK" if r.passed else "FAIL"
        lines.append(f"### [{q.id}] {q.category} - {status}")
        lines.append("")
        lines.append(f"**Pergunta:** {q.question}")
        lines.append("")
        lines.append(f"- HTTP status: `{r.status}`")
        lines.append(f"- Linhas retornadas: `{r.row_count}`")
        lines.append(f"- Colunas: {_format_columns(r.columns)}")
        lines.append(f"- Tempo: `{r.elapsed_seconds:.2f}s`")
        if r.error:
            lines.append(f"- Erro: `{r.error[:400]}`")
        if r.explanation:
            lines.append(f"- Explicacao do agente: {r.explanation}")
        if r.sql:
            lines.append("")
            lines.append("```sql")
            lines.append(_short(r.sql))
            lines.append("```")
        lines.append("")

    REPORT_PATH.write_text("\n".join(lines), encoding="utf-8")
    print(f"\nRelatorio salvo em: {REPORT_PATH}")
    print(f"Taxa de sucesso: {passed_count}/{total} ({pass_rate:.1f}%)")


def main() -> None:
    print(f"Iniciando avaliacao contra {BASE_URL}")
    print("Budget: 20 requisicoes ao Gemini (10 perguntas x 2 chamadas cada)")
    print(
        f"Rate limit: {BATCH_SIZE} perguntas a cada {SLEEP_BETWEEN_BATCHES}s (entre batches)"
    )
    print("=" * 80)
    singles = run_single_questions()
    print("\n" + "=" * 80)
    print("Gerando relatorio")
    print("=" * 80)
    write_report(singles)


if __name__ == "__main__":
    main()
