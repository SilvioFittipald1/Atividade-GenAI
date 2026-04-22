import type { ReactNode } from "react";

interface CategoryCardProps {
  label: string;
  icon?: ReactNode;
  questions: string[];
  onPick: (q: string) => void;
}

export function CategoryCard({
  label,
  icon,
  questions,
  onPick,
}: CategoryCardProps) {
  return (
    <section className="group flex flex-col gap-3 rounded-2xl border border-brand-100 bg-white/90 p-5 shadow-soft backdrop-blur transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md dark:border-brand-800 dark:bg-slate-900/90 dark:hover:border-brand-700">
      <header className="flex items-center gap-2">
        {icon && (
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-700 ring-1 ring-brand-100 dark:bg-brand-900/40 dark:text-brand-200 dark:ring-brand-800">
            {icon}
          </div>
        )}
        <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300">
          {label}
        </h3>
      </header>
      <ul className="flex flex-col gap-2">
        {questions.map((q) => (
          <li key={q}>
            <button
              type="button"
              onClick={() => onPick(q)}
              className="flex w-full items-start gap-2 rounded-xl border border-slate-100 bg-white px-3 py-2.5 text-left text-sm text-slate-700 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-brand-600 dark:hover:bg-slate-700 dark:hover:text-brand-100"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500"
                aria-hidden="true"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
              <span>{q}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
