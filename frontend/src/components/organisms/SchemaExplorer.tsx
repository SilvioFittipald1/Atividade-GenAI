import { useEffect, useMemo, useRef, useState } from "react";
import type { ColumnInfo, SchemaSnapshot, TableInfo } from "../../types";
import { Badge } from "../atoms/Badge";
import { Button } from "../atoms/Button";

interface SchemaExplorerProps {
  open: boolean;
  onClose: () => void;
  schema: SchemaSnapshot | null;
  focusTable?: string | null;
  onInsertExample?: (text: string) => void;
}

function formatCount(n: number): string {
  return n.toLocaleString("pt-BR");
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "number") {
    if (Number.isInteger(v)) return v.toLocaleString("pt-BR");
    return v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  }
  return String(v);
}

function renderStat(label: string, value: unknown): string {
  if (value === null || value === undefined) return `${label}: —`;
  if (typeof value === "number") {
    return `${label}: ${value.toLocaleString("pt-BR", {
      maximumFractionDigits: 2,
    })}`;
  }
  return `${label}: ${String(value)}`;
}

function CategoricalBars({
  values,
}: {
  values: NonNullable<ColumnInfo["top_values"]>;
}) {
  const max = Math.max(1, ...values.map((v) => v.count));
  return (
    <ul className="flex flex-col gap-1">
      {values.map((v, idx) => {
        const pct = (v.count / max) * 100;
        return (
          <li
            key={idx}
            className="grid grid-cols-[1fr_auto] items-center gap-2 text-[11px]"
          >
            <div className="min-w-0">
              <div className="truncate text-slate-700 dark:text-slate-200">
                {String(v.value ?? "(vazio)")}
              </div>
              <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-brand-500 dark:bg-brand-400"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
            <span className="text-[10px] tabular-nums text-slate-500 dark:text-slate-400">
              {formatCount(v.count)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function ColumnRow({ col }: { col: ColumnInfo }) {
  return (
    <li className="rounded-lg border border-slate-100 bg-white px-2.5 py-2 dark:border-slate-700 dark:bg-slate-800/60">
      <div className="flex flex-wrap items-center gap-1.5">
        <code className="text-[12px] font-semibold text-brand-800 dark:text-brand-200">
          {col.name}
        </code>
        <span className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
          {col.type || "?"}
        </span>
        {col.pk && <Badge tone="brand">PK</Badge>}
        {col.notnull && <Badge tone="neutral">NOT NULL</Badge>}
      </div>
      {col.stats && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          <Badge tone="neutral">{renderStat("min", col.stats.min)}</Badge>
          <Badge tone="neutral">{renderStat("avg", col.stats.avg)}</Badge>
          <Badge tone="neutral">{renderStat("max", col.stats.max)}</Badge>
        </div>
      )}
      {col.top_values && col.top_values.length > 0 && (
        <div className="mt-2">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Top valores
          </p>
          <CategoricalBars values={col.top_values} />
        </div>
      )}
    </li>
  );
}

function SampleTable({
  columns,
  rows,
}: {
  columns: ColumnInfo[];
  rows: Array<Record<string, unknown>>;
}) {
  if (!rows || rows.length === 0) {
    return (
      <p className="text-[11px] text-slate-500 dark:text-slate-400">
        Sem amostras disponíveis.
      </p>
    );
  }
  return (
    <div className="scrollbar-soft max-h-40 overflow-auto rounded-lg border border-slate-100 dark:border-slate-700">
      <table className="min-w-full text-[11px]">
        <thead className="bg-brand-50/80 text-brand-800 dark:bg-slate-800 dark:text-brand-200">
          <tr>
            {columns.map((c) => (
              <th
                key={c.name}
                className="px-2 py-1 text-left font-semibold uppercase tracking-wide"
              >
                {c.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className={
                i % 2 === 0
                  ? "bg-white dark:bg-slate-900"
                  : "bg-brand-50/30 dark:bg-slate-800/40"
              }
            >
              {columns.map((c) => (
                <td
                  key={c.name}
                  className="whitespace-nowrap px-2 py-1 text-slate-700 dark:text-slate-200"
                >
                  {formatCell(row[c.name])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TablePanel({
  table,
  expanded,
  onToggle,
  onFkJump,
  onInsertExample,
  tableRef,
}: {
  table: TableInfo;
  expanded: boolean;
  onToggle: () => void;
  onFkJump: (name: string) => void;
  onInsertExample?: (text: string) => void;
  tableRef?: (el: HTMLDivElement | null) => void;
}) {
  const firstCategorical = useMemo(
    () =>
      table.columns.find(
        (c) => c.top_values && c.top_values.length > 0,
      )?.name,
    [table.columns],
  );
  return (
    <div
      ref={tableRef}
      className="rounded-xl border border-brand-100 bg-white shadow-soft dark:border-brand-900/50 dark:bg-slate-900"
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
        aria-expanded={expanded}
      >
        <div className="flex min-w-0 items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`h-3.5 w-3.5 shrink-0 transition-transform text-brand-600 dark:text-brand-300 ${
              expanded ? "rotate-90" : ""
            }`}
            aria-hidden
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <code className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
            {table.name}
          </code>
        </div>
        <Badge tone="brand">{formatCount(table.row_count)} linhas</Badge>
      </button>
      {expanded && (
        <div className="flex flex-col gap-3 border-t border-brand-100 px-3 py-3 dark:border-brand-900/40">
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300">
              Colunas ({table.columns.length})
            </p>
            <ul className="flex flex-col gap-1.5">
              {table.columns.map((c) => (
                <ColumnRow key={c.name} col={c} />
              ))}
            </ul>
          </div>
          {table.logical_fks.length > 0 && (
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300">
                Relações (FKs lógicas)
              </p>
              <ul className="flex flex-col gap-1">
                {table.logical_fks.map((fk, i) => (
                  <li key={i} className="text-[11px]">
                    <button
                      type="button"
                      onClick={() => onFkJump(fk.to_table)}
                      className="inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-brand-700 transition hover:bg-brand-50 hover:underline dark:text-brand-300 dark:hover:bg-slate-800"
                    >
                      <code>{fk.from_col}</code>
                      <span aria-hidden>→</span>
                      <code>
                        {fk.to_table}.{fk.to_col}
                      </code>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300">
              Amostra ({table.samples.length} linhas)
            </p>
            <SampleTable columns={table.columns} rows={table.samples} />
          </div>
          {onInsertExample && firstCategorical && (
            <div className="flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  onInsertExample(
                    `Mostre a distribuição de ${firstCategorical} em ${table.name}`,
                  )
                }
                type="button"
              >
                Inserir exemplo
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function SchemaExplorer({
  open,
  onClose,
  schema,
  focusTable,
  onInsertExample,
}: SchemaExplorerProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const refs = useRef<Map<string, HTMLDivElement | null>>(new Map());

  useEffect(() => {
    if (!open || !focusTable) return;
    setExpanded((prev) => {
      if (prev.has(focusTable)) return prev;
      const next = new Set(prev);
      next.add(focusTable);
      return next;
    });
    const timer = window.setTimeout(() => {
      const el = refs.current.get(focusTable);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [open, focusTable]);

  const toggle = (name: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleFkJump = (name: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.add(name);
      return next;
    });
    window.setTimeout(() => {
      const el = refs.current.get(name);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  };

  const tables = schema?.tables ?? [];

  return (
    <>
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm animate-fade-in dark:bg-black/50"
          onClick={onClose}
          aria-label="Fechar Schema Explorer"
        />
      )}
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-[22rem] flex-col border-l border-brand-100 bg-white shadow-2xl transition-transform duration-200 ease-out dark:border-brand-900/50 dark:bg-slate-900 md:w-[26rem] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!open}
      >
        <div className="flex items-start justify-between gap-2 border-b border-brand-100 bg-gradient-to-r from-brand-50 to-white px-4 py-4 dark:border-brand-900/50 dark:from-brand-950/40 dark:to-slate-900">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-brand-900 dark:text-brand-100">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden
              >
                <ellipse cx="12" cy="5" rx="9" ry="3" />
                <path d="M3 5v6c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
                <path d="M3 11v6c0 1.66 4.03 3 9 3s9-1.34 9-3v-6" />
              </svg>
              Explorar banco
            </h2>
            <p className="text-[11px] text-brand-700/80 dark:text-brand-300/90">
              {tables.length > 0
                ? `${tables.length} tabelas · snapshot gerado em ${
                    schema?.generated_at
                      ? new Date(schema.generated_at).toLocaleString("pt-BR")
                      : "—"
                  }`
                : "Aguardando snapshot do backend…"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-slate-800 dark:hover:text-brand-200"
            aria-label="Fechar"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
              aria-hidden
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="scrollbar-soft flex-1 overflow-y-auto p-3">
          {tables.length === 0 ? (
            <p className="px-2 pt-6 text-center text-xs text-slate-500 dark:text-slate-400">
              Sem dados — inicie o backend para ver as tabelas reais do SQLite.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {tables.map((t) => (
                <TablePanel
                  key={t.name}
                  table={t}
                  expanded={expanded.has(t.name)}
                  onToggle={() => toggle(t.name)}
                  onFkJump={handleFkJump}
                  onInsertExample={
                    onInsertExample
                      ? (text) => {
                          onInsertExample(text);
                          onClose();
                        }
                      : undefined
                  }
                  tableRef={(el) => {
                    refs.current.set(t.name, el);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
