import { useMemo, useState } from "react";
import { groupByDate } from "../../lib/dateGroups";
import type { ConversationRecord } from "../../types";
import { Button } from "../atoms/Button";
import { ConversationItem } from "../molecules/ConversationItem";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  conversations: ConversationRecord[];
  currentId: string;
  onPick: (rec: ConversationRecord) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onClearAll: () => void;
  tables: string[];
}

export function Sidebar({
  open,
  onClose,
  conversations,
  currentId,
  onPick,
  onNew,
  onDelete,
  onRename,
  onClearAll,
  tables,
}: SidebarProps) {
  const [query, setQuery] = useState("");

  const normalized = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!normalized) return conversations;
    return conversations.filter((c) =>
      c.title.toLowerCase().includes(normalized),
    );
  }, [conversations, normalized]);

  const groups = useMemo(() => groupByDate(filtered), [filtered]);

  return (
    <>
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm animate-fade-in dark:bg-black/50"
          onClick={onClose}
          aria-label="Fechar histórico"
        />
      )}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-80 flex-col border-r border-brand-100 bg-white shadow-2xl transition-transform duration-200 ease-out dark:border-brand-900/50 dark:bg-slate-900 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-brand-100 bg-gradient-to-r from-brand-50 to-white px-4 py-4 dark:border-brand-900/50 dark:from-brand-950/40 dark:to-slate-900">
          <div>
            <h2 className="text-sm font-semibold text-brand-900 dark:text-brand-100">
              Histórico
            </h2>
            <p className="text-[11px] text-brand-700/80 dark:text-brand-300/90">
              Suas conversas ficam salvas no navegador
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-slate-800 dark:hover:text-brand-200"
            aria-label="Fechar histórico"
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
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="border-b border-brand-100 p-3 dark:border-brand-900/50">
          <Button
            variant="primary"
            size="md"
            fullWidth
            onClick={() => {
              onNew();
              onClose();
            }}
            leftIcon={
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
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            }
          >
            Nova conversa
          </Button>
        </div>
        <div className="border-b border-brand-100 px-3 py-2 dark:border-brand-900/50">
          <label className="sr-only" htmlFor="hist-search">
            Buscar conversa por título
          </label>
          <div className="relative">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="16.5" y1="16.5" x2="21" y2="21" />
            </svg>
            <input
              id="hist-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar no histórico…"
              className="h-9 w-full rounded-lg border border-brand-100 bg-white pl-9 pr-2 text-sm text-slate-800 shadow-inner outline-none ring-brand-500/20 placeholder:text-slate-400 focus:border-brand-300 focus:ring-2 dark:border-brand-800 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>
        </div>
        <div className="scrollbar-soft flex-1 overflow-y-auto p-2">
          {conversations.length === 0 ? (
            <div className="mx-auto mt-10 max-w-[220px] px-2 text-center">
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-6 w-6"
                  aria-hidden="true"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Nenhuma conversa salva ainda. Suas conversas aparecem aqui
                automaticamente.
              </p>
            </div>
          ) : filtered.length === 0 && normalized ? (
            <p className="px-2 pt-4 text-center text-xs text-slate-500 dark:text-slate-400">
              Nenhuma conversa casa com{" "}
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {query.trim()}
              </span>
            </p>
          ) : (
            groups.map((g) => (
              <section key={g.label} className="mb-2">
                <h3 className="sticky top-0 z-10 border-b border-transparent bg-white/95 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-brand-700/80 backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/95 dark:text-brand-200/90">
                  {g.label}
                </h3>
                <ul className="flex flex-col gap-1 p-1">
                  {g.items.map((c) => (
                    <li key={c.id}>
                      <ConversationItem
                        record={c}
                        active={c.id === currentId}
                        onPick={(rec) => {
                          onPick(rec);
                          onClose();
                        }}
                        onDelete={onDelete}
                        onRename={onRename}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
        {conversations.length > 0 && (
          <div className="border-t border-brand-100 p-3 dark:border-brand-900/50">
            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    "Excluir todas as conversas do navegador?",
                  )
                ) {
                  onClearAll();
                }
              }}
              className="w-full text-center text-xs font-medium text-rose-600 transition hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
            >
              Limpar tudo
            </button>
          </div>
        )}
        {tables.length > 0 && (
          <div className="border-t border-brand-100 p-3 text-[10px] text-slate-500 dark:border-brand-900/50 dark:text-slate-400">
            <p className="mb-2 font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300">
              Tabelas do banco
            </p>
            <div className="flex flex-wrap gap-1">
              {tables.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-brand-50 px-2 py-0.5 text-brand-800 dark:bg-brand-900/40 dark:text-brand-200"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
