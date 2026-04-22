"""Agente Pydantic AI que converte perguntas em PT-BR para SQL e responde com insights.

Uso CLI (para testes):
    .\\venv\\Scripts\\python.exe -m app.agent "Top 10 produtos mais vendidos"
"""
from __future__ import annotations

import os
import sqlite3

from pydantic_ai import Agent, RunContext

from . import db  # noqa: F401  (importado por efeito colateral: carrega .env via load_dotenv)
from .guardrails import GuardrailError
from .models import AgentDeps, AgentOutput
from .schema import build_schema_section
from .tools import run_query

_api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
if _api_key:
    os.environ["GOOGLE_API_KEY"] = _api_key
    os.environ["GEMINI_API_KEY"] = _api_key

MODEL_SLUG = os.getenv("MODEL", "google-gla:gemini-2.5-flash")


SYSTEM_PROMPT = """Voce e um assistente de analise de dados para um sistema de e-commerce brasileiro.
Seu papel e converter perguntas em portugues em queries SQL SQLite e responder ao usuario de forma clara.

## Regras obrigatorias

1. SEMPRE chame a ferramenta `execute_sql`. NUNCA responda ao usuario sem antes executar uma query.
2. NAO peca clarificacao ao usuario. Se a pergunta tiver alguma ambiguidade, adote a
   interpretacao mais razoavel usando as "Convencoes padrao" abaixo, execute a query, e
   mencione brevemente sua suposicao na explicacao final.
3. Escreva SQL valido no dialeto SQLite. Use apenas SELECT ou WITH.
4. Sempre inclua LIMIT adequado (ex: LIMIT 10 para top N, LIMIT 100 para listagens).
5. Faca os joins corretos usando os relacionamentos e os "Caminhos para..." documentados
   no schema. Prefira copiar um desses caminhos quando a pergunta casar com algum deles.
6. Considere o historico da conversa ao interpretar follow-ups (ex: "e no estado de SP?"
   apos uma pergunta sobre produtos significa refazer a query anterior adicionando o
   filtro de estado).
7. Se a ferramenta retornar erro, analise a mensagem e corrija a query. Tente no maximo
   2 vezes. Nao use alias definido no SELECT dentro de WHERE ou HAVING do mesmo nivel de
   consulta; use subquery/CTE se precisar referenciar.
8. Sua resposta textual final deve ser uma EXPLICACAO CURTA (1-3 frases) em portugues
   descrevendo o que foi consultado e um insight do resultado (qual item aparece no topo,
   valor maximo, etc).
9. NAO repita o SQL nem liste todas as linhas na resposta textual; o sistema mostra a SQL
   e a tabela separadamente ao usuario.
10. Alem da explicacao, gere entre 0 e 3 sugestoes de perguntas de follow-up
    uteis e naturais (em PT-BR, curtas, max 80 caracteres por sugestao). Devem ampliar ou
    refinar a analise atual (ex: "E em 2018?", "E filtrando por SP?",
    "Mostre o top 20"). Se nao houver follow-up obvio, retorne lista vazia.

## Convencoes padrao (use quando a pergunta for ambigua)

- "Avaliacao negativa" = nota 1 ou 2. "Positiva" = 4 ou 5. "Neutra" = 3.
- "Atraso" ou "pedidos atrasados" = `entrega_no_prazo = 'Não'` (com til) ou
  `diferenca_entrega_dias > 0`.
- "Top N" sem especificar metrica = COUNT(*) (volume) quando a pergunta fala de vendas,
  AVG(avaliacao) quando fala de satisfacao.
- "Receita" = SUM(preco_BRL) de fat_itens_pedidos OU SUM(valor_total_pago_brl) de
  fat_pedido_total (ambos servem; prefira o primeiro quando agrupar por produto/categoria
  e o segundo quando agrupar por consumidor/estado).
- "Ticket medio" = AVG(valor_total_pago_brl) de fat_pedido_total.
- "Estado" = UF de 2 letras vinda de dim_consumidores (nao confundir com dim_vendedores).
- Ao perguntar algo sobre "vendedores e avaliacao", LEMBRE que fat_avaliacoes_pedidos
  NAO tem id_vendedor direto; use fat_itens_pedidos como ponte.
- Quando aplicar filtro temporal "em 2018" use `substr(data_pedido, 1, 4) = '2018'`
  ou `data_pedido >= '2018-01-01' AND data_pedido <= '2018-12-31'`.

## Dicas praticas
- Para "produtos mais vendidos" use COUNT(*) em fat_itens_pedidos agrupando por id_produto
  e juntando com dim_produtos para pegar o nome.
- Para "receita por categoria" use SUM(preco_BRL) em fat_itens_pedidos juntando com dim_produtos.
- Para "% entregue no prazo por estado" filtre fat_pedidos.entrega_no_prazo (valores com acento:
  'Sim', 'Nao', 'Nao Entregue'). Use CAST(SUM(CASE WHEN ... THEN 1.0 ELSE 0 END) AS REAL) / COUNT(*) * 100.
- Para "ticket medio por estado" use AVG(valor_total_pago_brl) de fat_pedido_total juntado com dim_consumidores.
- Para "avaliacao negativa" considere nota <= 2 (convencao do projeto).
"""


agent = Agent(
    MODEL_SLUG,
    deps_type=AgentDeps,
    output_type=AgentOutput,
    system_prompt=SYSTEM_PROMPT,
)


@agent.system_prompt
def dynamic_schema_prompt(ctx: RunContext[AgentDeps]) -> str:
    """Injeta o schema no system prompt em runtime.

    Se o retriever RAG preencheu `ctx.deps.schema_section`, usa essa versao
    reduzida (apenas as tabelas relevantes). Caso contrario, cai no
    SCHEMA_STR completo para garantir correcao.
    """
    section = ctx.deps.schema_section or build_schema_section(None)
    return f"## Schema do banco\n\n{section}"


@agent.tool
def execute_sql(ctx: RunContext[AgentDeps], query: str) -> dict:
    """Executa uma query SELECT no banco SQLite do e-commerce.

    Args:
        query: SQL SELECT ou WITH em SQLite. O sistema valida, adiciona LIMIT 1000 se faltar
               e bloqueia qualquer comando de modificacao.

    Returns:
        dict com: executed_sql, columns, row_count, preview_rows (ate 10).
        Em caso de erro, retorna dict com chave `error` explicando o problema.
    """
    try:
        sanitized_sql, columns, rows = run_query(query)
    except GuardrailError as e:
        ctx.deps.last_error = str(e)
        return {
            "error": f"Guardrail violado: {e}",
            "hint": "Revise a query: apenas SELECT/WITH, sem ponto-e-virgula adicional, sem DDL.",
        }
    except sqlite3.Error as e:
        ctx.deps.last_error = str(e)
        return {
            "error": f"Erro de execucao SQL: {e}",
            "hint": "Verifique nomes de tabelas/colunas no schema e tente novamente.",
        }

    ctx.deps.last_sql = sanitized_sql
    ctx.deps.last_columns = columns
    ctx.deps.last_rows = rows
    ctx.deps.last_error = None

    return {
        "executed_sql": sanitized_sql,
        "columns": columns,
        "row_count": len(rows),
        "preview_rows": rows[:10],
        "note": (
            "O sistema ja capturou todas as linhas para exibir ao usuario. "
            "Use este preview apenas para formular sua explicacao."
        ),
    }


def _format_cli(
    question: str, explanation: str, suggestions: list[str], deps: AgentDeps
) -> str:
    lines = []
    sep = "=" * 80
    lines.append(sep)
    lines.append(f"Pergunta: {question}")
    lines.append(sep)
    lines.append("SQL executada:")
    lines.append(deps.last_sql or "(nenhuma SQL foi executada)")
    lines.append(sep)
    lines.append("Explicacao do agente:")
    lines.append(explanation)
    if suggestions:
        lines.append(sep)
        lines.append("Sugestoes de follow-up:")
        for s in suggestions:
            lines.append(f"  - {s}")
    lines.append(sep)
    lines.append(f"Linhas retornadas: {len(deps.last_rows)}")
    if deps.last_rows:
        lines.append(f"Colunas: {deps.last_columns}")
        lines.append("Primeiras 5 linhas:")
        for row in deps.last_rows[:5]:
            lines.append(f"  {row}")
    if deps.last_error:
        lines.append(f"Ultimo erro registrado: {deps.last_error}")
    lines.append(sep)
    return "\n".join(lines)


def _cli() -> None:
    import asyncio
    import sys

    if len(sys.argv) < 2:
        print('Uso: python -m app.agent "<pergunta>"')
        sys.exit(1)

    question = " ".join(sys.argv[1:])

    async def main() -> None:
        deps = AgentDeps()
        result = await agent.run(question, deps=deps)
        out = result.output
        print(_format_cli(question, out.explanation, out.suggestions, deps))

    asyncio.run(main())


if __name__ == "__main__":
    _cli()
