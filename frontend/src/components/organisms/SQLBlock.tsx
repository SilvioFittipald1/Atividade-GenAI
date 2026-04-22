import { useState } from "react";
import { ApiError, executeSql } from "../../services/api";
import type { ExecuteSqlResponse } from "../../types";
import { Button } from "../atoms/Button";

interface SQLBlockProps {
  sql: string;
  onReexecute?: (result: ExecuteSqlResponse) => void;
}

export function SQLBlock({ sql, onReexecute }: SQLBlockProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editedSql, setEditedSql] = useState(sql);
  const [executing, setExecuting] = useState(false);
  const [execError, setExecError] = useState<string | null>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard pode falhar em contextos inseguros (http://); ignorar silenciosamente
    }
  };

  if (!sql) return null;

  const startEdit = () => {
    setEditedSql(sql);
    setExecError(null);
    setOpen(true);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setExecError(null);
  };

  const runEdited = async () => {
    if (!onReexecute) return;
    setExecuting(true);
    setExecError(null);
    try {
      const r = await executeSql(editedSql);
      onReexecute(r);
      setEditing(false);
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Falha ao executar SQL.";
      setExecError(msg);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-brand-100 shadow-soft">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between bg-gradient-to-r from-brand-50 to-white px-3 py-2 text-left text-xs font-semibold text-brand-800 transition hover:bg-brand-100"
        aria-expanded={open}
      >
        <span className="inline-flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-90" : ""}`}
            aria-hidden="true"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span className="inline-flex items-center gap-1.5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5 text-brand-600"
              aria-hidden="true"
            >
              <ellipse cx="12" cy="5" rx="9" ry="3" />
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
            </svg>
            Consulta SQL gerada
          </span>
        </span>
        <span className="text-[10px] uppercase tracking-wider text-brand-700/70">
          {open ? "Ocultar" : "Ver detalhes"}
        </span>
      </button>
      {open && (
        <div className="relative bg-slate-950">
          <div className="absolute right-2 top-2 z-10 flex flex-wrap items-center justify-end gap-1.5">
            {onReexecute && !editing && (
              <button
                type="button"
                onClick={startEdit}
                className="inline-flex items-center gap-1 rounded-md bg-slate-800/80 px-2 py-1 text-xs text-slate-200 backdrop-blur transition hover:bg-slate-700"
              >
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
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                Editar
              </button>
            )}
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 rounded-md bg-slate-800/80 px-2 py-1 text-xs text-slate-200 backdrop-blur transition hover:bg-slate-700"
            >
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
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              {copied ? "Copiado!" : "Copiar"}
            </button>
          </div>
          {editing ? (
            <div className="p-3 pt-12">
              <textarea
                value={editedSql}
                onChange={(e) => setEditedSql(e.target.value)}
                className="scrollbar-soft min-h-40 w-full resize-y rounded-lg border border-slate-700 bg-slate-900 p-3 font-mono text-sm text-slate-100 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                spellCheck={false}
                disabled={executing}
              />
              {execError && (
                <p className="mt-2 text-xs text-rose-400">{execError}</p>
              )}
              <div className="mt-2 flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={runEdited}
                  disabled={executing}
                  loading={executing}
                >
                  {executing ? "Executando" : "Executar"}
                </Button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={executing}
                  className="inline-flex h-8 items-center rounded-xl border border-slate-600 px-3 text-xs text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <pre className="scrollbar-soft overflow-x-auto p-4 pr-24 text-sm leading-relaxed text-slate-100">
              <code>{sql}</code>
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
