interface SuggestionChipsProps {
  items: string[];
  onPick: (q: string) => void;
}

export function SuggestionChips({ items, onPick }: SuggestionChipsProps) {
  if (!items || items.length === 0) return null;
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <span className="mr-1 self-center text-[10px] font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
        Continue explorando
      </span>
      {items.map((q, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onPick(q)}
          className="group inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-left text-xs font-medium text-brand-800 transition hover:-translate-y-0.5 hover:border-brand-300 hover:bg-brand-100 hover:shadow-sm dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-200 dark:hover:bg-brand-900/50"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3 w-3 text-brand-600 transition group-hover:translate-x-0.5"
            aria-hidden="true"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
          {q}
        </button>
      ))}
    </div>
  );
}
