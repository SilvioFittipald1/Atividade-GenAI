import { downloadCsv, toCsv } from "../../lib/csv";
import { Button } from "../atoms/Button";

interface ResultTableProps {
  columns: string[];
  rows: Array<Record<string, unknown>>;
  rowCount: number;
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "number") {
    if (Number.isInteger(v)) return v.toLocaleString("pt-BR");
    return v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  }
  if (typeof v === "boolean") return v ? "true" : "false";
  return String(v);
}

export function ResultTable({ columns, rows, rowCount }: ResultTableProps) {
  if (rows.length === 0) {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-xl border border-brand-100 bg-brand-50/60 p-4 text-sm text-brand-900 dark:border-brand-800 dark:bg-brand-900/20 dark:text-brand-100">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4 text-brand-600"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        Consulta retornou 0 linhas.
      </div>
    );
  }

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-brand-100 shadow-soft dark:border-brand-800">
      <div className="flex items-center justify-between gap-2 border-b border-brand-100 bg-gradient-to-r from-brand-50 to-white px-3 py-2 text-xs text-brand-900 dark:border-brand-800 dark:from-brand-950/40 dark:to-slate-900 dark:text-brand-100">
        <span>
          <strong className="text-brand-900 dark:text-brand-100">
            {rowCount.toLocaleString("pt-BR")}
          </strong>{" "}
          {rowCount === 1 ? "linha" : "linhas"}
          <span className="mx-1.5 text-brand-300 dark:text-brand-700">•</span>
          <span className="text-brand-700/80 dark:text-brand-300/90">
            {columns.length} {columns.length === 1 ? "coluna" : "colunas"}
          </span>
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => downloadCsv("resultado.csv", toCsv(columns, rows))}
          leftIcon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5"
              aria-hidden="true"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          }
        >
          Baixar CSV
        </Button>
      </div>
      <div className="scrollbar-soft max-h-96 overflow-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-brand-50/90 backdrop-blur dark:bg-slate-800/95">
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  className="border-b border-brand-100 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-brand-800 dark:border-slate-700 dark:text-brand-200"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={idx}
                className={
                  idx % 2 === 0
                    ? "bg-white transition hover:bg-brand-50/50 dark:bg-slate-900 dark:hover:bg-slate-800/80"
                    : "bg-brand-50/30 transition hover:bg-brand-50/60 dark:bg-slate-800/40 dark:hover:bg-slate-800/70"
                }
              >
                {columns.map((col) => (
                  <td
                    key={col}
                    className="border-b border-slate-100 px-3 py-2 text-slate-700 dark:border-slate-700 dark:text-slate-200"
                  >
                    {formatValue(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
