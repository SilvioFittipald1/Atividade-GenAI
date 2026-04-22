import { Button } from "../atoms/Button";
import { IconButton } from "../atoms/IconButton";
import { Logo } from "../atoms/Logo";
import { ModelBadge } from "../atoms/ModelBadge";
import { ThemeToggle } from "../atoms/ThemeToggle";

interface HeaderProps {
  onReset: () => void;
  onToggleSidebar: () => void;
  onExportMarkdown?: () => void;
  onShowShortcuts?: () => void;
  onOpenSchemaExplorer?: () => void;
  hasConversation: boolean;
  model: string | null;
  modelLoading: boolean;
  online: boolean;
}

export function Header({
  onReset,
  onToggleSidebar,
  onExportMarkdown,
  onShowShortcuts,
  onOpenSchemaExplorer,
  hasConversation,
  model,
  modelLoading,
  online,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-brand-100/70 bg-white/80 px-4 py-3 shadow-soft backdrop-blur-md dark:border-brand-900/50 dark:bg-slate-900/85 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <IconButton
          onClick={onToggleSidebar}
          aria-label="Abrir histórico de conversas"
          title="Histórico de conversas"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="18" x2="20" y2="18" />
          </svg>
        </IconButton>
        <Logo size="md" />
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold leading-tight text-slate-900 dark:text-slate-100 sm:text-lg">
            Agente E-commerce
          </h1>
          <p className="hidden text-xs text-slate-500 dark:text-slate-400 sm:block">
            Consultas em linguagem natural sobre o banco de dados
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2">
        <ModelBadge model={model} loading={modelLoading} />
        {onOpenSchemaExplorer && (
          <IconButton
            type="button"
            onClick={onOpenSchemaExplorer}
            size="md"
            tone="neutral"
            title="Explorar banco (Ctrl+K)"
            aria-label="Abrir Schema Explorer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <ellipse cx="12" cy="5" rx="9" ry="3" />
              <path d="M3 5v6c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
              <path d="M3 11v6c0 1.66 4.03 3 9 3s9-1.34 9-3v-6" />
            </svg>
          </IconButton>
        )}
        <ThemeToggle />
        {onShowShortcuts && (
          <IconButton
            type="button"
            onClick={onShowShortcuts}
            size="md"
            tone="neutral"
            title="Atalhos (?)"
            aria-label="Atalhos de teclado"
            className="hidden sm:inline-grid"
          >
            <span className="text-sm font-semibold" aria-hidden>
              ?
            </span>
          </IconButton>
        )}
        <span
          className={`hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium sm:inline-flex ${
            online
              ? "border-brand-200 bg-brand-50 text-brand-800 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-200"
              : "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
          }`}
          title={online ? "Backend conectado" : "Backend inacessível"}
        >
          <span className="relative flex h-2 w-2">
            {online && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
            )}
            <span
              className={`relative inline-flex h-2 w-2 rounded-full ${
                online ? "bg-brand-500" : "bg-slate-400"
              }`}
            />
          </span>
          {online ? "Online" : "Offline"}
        </span>
        {onExportMarkdown && (
          <Button
            variant="secondary"
            size="md"
            onClick={onExportMarkdown}
            disabled={!hasConversation}
            className="hidden md:inline-flex"
            type="button"
          >
            <span>Exportar .md</span>
          </Button>
        )}
        <Button
          variant="secondary"
          size="md"
          onClick={onReset}
          disabled={!hasConversation}
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
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
          }
        >
          <span className="hidden sm:inline">Nova conversa</span>
        </Button>
      </div>
    </header>
  );
}
