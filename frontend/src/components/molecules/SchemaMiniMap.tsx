import { useEffect, useState } from "react";

const CANONICAL_TABLES = [
  "dim_consumidores",
  "dim_produtos",
  "dim_vendedores",
  "fat_pedidos",
  "fat_pedido_total",
  "fat_itens_pedidos",
  "fat_avaliacoes_pedidos",
];

interface SchemaMiniMapProps {
  retrievedTables: string[];
  usedFullSchema: boolean;
  tokensSavedEstimate?: number;
  onInspectTable?: (name: string) => void;
}

export function SchemaMiniMap({
  retrievedTables,
  usedFullSchema,
  tokensSavedEstimate,
  onInspectTable,
}: SchemaMiniMapProps) {
  const [pulsing, setPulsing] = useState(true);
  useEffect(() => {
    const id = window.setTimeout(() => setPulsing(false), 2000);
    return () => window.clearTimeout(id);
  }, []);

  const retrievedSet = new Set(retrievedTables);
  const total = CANONICAL_TABLES.length;
  const picked = usedFullSchema ? total : retrievedTables.length;
  const pct =
    usedFullSchema || total === 0
      ? 0
      : Math.round(((total - picked) / total) * 100);

  return (
    <div
      className="mb-2 flex flex-col gap-1.5 rounded-xl border border-brand-100 bg-brand-50/40 p-2 dark:border-brand-900/40 dark:bg-brand-950/30"
      aria-label="RAG: tabelas selecionadas"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300">
          RAG
        </span>
        {usedFullSchema ? (
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-200">
            Schema completo (pergunta ampla)
          </span>
        ) : (
          <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-medium text-brand-800 dark:bg-brand-900/50 dark:text-brand-200">
            {picked} de {total} tabelas
            {tokensSavedEstimate && tokensSavedEstimate > 0
              ? ` · -${pct}% tokens (~${tokensSavedEstimate})`
              : ""}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        {CANONICAL_TABLES.map((t) => {
          const active = usedFullSchema || retrievedSet.has(t);
          const base =
            "rounded-full px-2 py-0.5 text-[10px] font-mono transition";
          const activeCls =
            "bg-brand-500 text-white shadow-sm dark:bg-brand-600";
          const inactiveCls =
            "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500";
          const pulseCls = active && pulsing ? "animate-pulse" : "";
          const cursorCls = onInspectTable ? "cursor-pointer hover:ring-2 hover:ring-brand-400/40" : "";
          return (
            <button
              key={t}
              type="button"
              onClick={() => onInspectTable?.(t)}
              disabled={!onInspectTable}
              title={
                onInspectTable
                  ? `Inspecionar ${t} no Schema Explorer`
                  : t
              }
              className={`${base} ${active ? activeCls : inactiveCls} ${pulseCls} ${cursorCls}`}
            >
              {t}
            </button>
          );
        })}
      </div>
    </div>
  );
}
