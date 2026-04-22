import { Button } from "../atoms/Button";

interface ShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

const ROWS: { keys: string[]; label: string }[] = [
  { keys: ["Ctrl", "B"], label: "Abrir ou fechar o histórico" },
  { keys: ["Ctrl", "/"], label: "Nova conversa" },
  { keys: ["Ctrl", "K"], label: "Abrir Schema Explorer" },
  { keys: ["?"], label: "Abrir este painel" },
  { keys: ["Esc"], label: "Fechar modal / histórico" },
];

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="inline-flex min-w-[1.5rem] items-center justify-center rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-700 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
      {children}
    </kbd>
  );
}

export function ShortcutsModal({ open, onClose }: ShortcutsModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-brand-100 bg-white p-5 shadow-2xl dark:border-brand-900/50 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2
              id="shortcuts-title"
              className="text-lg font-semibold text-slate-900 dark:text-slate-100"
            >
              Atalhos de teclado
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              No Mac, use <Kbd>⌘</Kbd> no lugar de <Kbd>Ctrl</Kbd>.
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={onClose} type="button">
            Fechar
          </Button>
        </div>
        <ul className="space-y-3 text-sm text-slate-800 dark:text-slate-200">
          {ROWS.map((row) => (
            <li key={row.label} className="flex items-center justify-between gap-2">
              <span className="text-slate-600 dark:text-slate-300">{row.label}</span>
              <span className="flex flex-wrap items-center justify-end gap-1">
                {row.keys.map((k, i) => (
                  <span key={`${row.label}-${k}-${i}`} className="flex items-center gap-1">
                    {i > 0 && (
                      <span className="text-xs text-slate-400" aria-hidden>
                        +
                      </span>
                    )}
                    <Kbd>{k}</Kbd>
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
