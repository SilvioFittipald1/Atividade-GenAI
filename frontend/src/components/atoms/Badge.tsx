import type { ReactNode } from "react";

type Tone = "neutral" | "brand" | "amber" | "rose";

interface BadgeProps {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}

const TONES: Record<Tone, string> = {
  neutral:
    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200",
  brand:
    "bg-brand-100 text-brand-800 dark:bg-brand-900/50 dark:text-brand-200",
  amber:
    "bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200",
  rose: "bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-200",
};

export function Badge({ tone = "neutral", children, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
