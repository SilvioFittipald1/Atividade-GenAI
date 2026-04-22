import type { ReactNode } from "react";
import type { ExampleCategory } from "../../types";
import { CategoryCard } from "../molecules/CategoryCard";

interface CategoryWithIcon extends ExampleCategory {
  icon: ReactNode;
}

const CATEGORIES: CategoryWithIcon[] = [
  {
    label: "Vendas e Receita",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
        aria-hidden="true"
      >
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
    questions: [
      "Top 10 produtos mais vendidos",
      "Receita total por categoria de produto",
    ],
  },
  {
    label: "Entrega e Logística",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
        aria-hidden="true"
      >
        <rect x="1" y="3" width="15" height="13" />
        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
    questions: [
      "Quantidade de pedidos por status",
      "Percentual de pedidos entregues no prazo por estado dos consumidores",
    ],
  },
  {
    label: "Satisfação e Avaliações",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
        aria-hidden="true"
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
    questions: [
      "Qual a média de avaliação geral dos pedidos?",
      "Top 10 vendedores por média de avaliação",
    ],
  },
  {
    label: "Consumidores",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
        aria-hidden="true"
      >
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    questions: [
      "Estados com maior volume de pedidos e maior ticket médio",
      "Estados com maior atraso nas entregas",
    ],
  },
  {
    label: "Vendedores e Produtos",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
        aria-hidden="true"
      >
        <path d="M20.59 13.41L13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
        <line x1="7" y1="7" x2="7.01" y2="7" />
      </svg>
    ),
    questions: [
      "Top 5 produtos mais vendidos por estado",
      "Categorias com maior taxa de avaliação negativa",
    ],
  },
];

interface ExampleQuestionsProps {
  onPick: (question: string) => void;
}

export function ExampleQuestions({ onPick }: ExampleQuestionsProps) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6">
      <div className="text-center">
        <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand-700 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-200">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3 w-3"
            aria-hidden="true"
          >
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          Agente de dados
        </span>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
          O que você quer{" "}
          <span className="bg-gradient-to-r from-brand-600 to-brand-800 bg-clip-text text-transparent dark:from-brand-400 dark:to-brand-600">
            descobrir?
          </span>
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500 dark:text-slate-400 sm:text-base">
          Clique em uma pergunta de exemplo ou digite a sua própria embaixo. O
          agente gera a consulta SQL, executa e explica o resultado.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CATEGORIES.map((cat) => (
          <CategoryCard
            key={cat.label}
            label={cat.label}
            icon={cat.icon}
            questions={cat.questions}
            onPick={onPick}
          />
        ))}
      </div>
    </div>
  );
}
