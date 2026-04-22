interface ModelBadgeProps {
  model: string | null;
  loading?: boolean;
  className?: string;
}

function formatModel(slug: string): string {
  const parts = slug.split(":");
  return parts.length > 1 ? parts.slice(1).join(":") : slug;
}

export function ModelBadge({
  model,
  loading = false,
  className = "",
}: ModelBadgeProps) {
  if (loading) {
    return (
      <span
        className={`hidden items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-500 md:inline-flex ${className}`}
      >
        <span className="h-2 w-2 animate-pulse rounded-full bg-slate-300" />
        Verificando modelo…
      </span>
    );
  }

  if (!model) {
    return (
      <span
        className={`hidden items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-medium text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-200 md:inline-flex ${className}`}
        title="Backend offline ou inacessivel"
      >
        <span className="h-2 w-2 rounded-full bg-rose-500" />
        Backend offline
      </span>
    );
  }

  const pretty = formatModel(model);

  return (
    <span
      className={`hidden items-center gap-1.5 rounded-full border border-brand-200 bg-gradient-to-r from-brand-50 to-white px-2.5 py-1 text-[11px] font-semibold text-brand-800 shadow-sm dark:border-brand-800 dark:from-brand-950/40 dark:to-slate-900 dark:text-brand-200 md:inline-flex ${className}`}
      title={`Modelo em uso: ${model}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-3 w-3 text-brand-600"
        aria-hidden="true"
      >
        <polygon points="12 2 15 9 22 9.5 16.5 14.5 18.5 21.5 12 17.5 5.5 21.5 7.5 14.5 2 9.5 9 9 12 2" />
      </svg>
      <span className="font-mono tracking-tight">{pretty}</span>
    </span>
  );
}
