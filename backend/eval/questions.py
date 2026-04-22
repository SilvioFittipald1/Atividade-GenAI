"""Perguntas canonicas do enunciado da atividade.

Usadas em `eval/run_eval.py` e espelhadas no frontend (ExampleQuestions.tsx).
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class EvalQuestion:
    id: str
    category: str
    question: str
    expects_nonempty: bool = True


QUESTIONS: list[EvalQuestion] = [
    EvalQuestion("VR1", "Vendas e Receita", "Top 10 produtos mais vendidos"),
    EvalQuestion("VR2", "Vendas e Receita", "Receita total por categoria de produto"),
    EvalQuestion("EL1", "Entrega e Logistica", "Quantidade de pedidos por status"),
    EvalQuestion(
        "EL2",
        "Entrega e Logistica",
        "Percentual de pedidos entregues no prazo por estado dos consumidores",
    ),
    EvalQuestion("SA1", "Satisfacao", "Qual a media de avaliacao geral dos pedidos?"),
    EvalQuestion("SA2", "Satisfacao", "Top 10 vendedores por media de avaliacao"),
    EvalQuestion(
        "CO1",
        "Consumidores",
        "Estados com maior volume de pedidos e maior ticket medio",
    ),
    EvalQuestion("CO2", "Consumidores", "Estados com maior atraso nas entregas"),
    EvalQuestion(
        "VP1", "Vendedores e Produtos", "Top 5 produtos mais vendidos por estado"
    ),
    EvalQuestion(
        "VP2",
        "Vendedores e Produtos",
        "Categorias com maior taxa de avaliacao negativa",
    ),
]
