import type { ButtonHTMLAttributes, ReactNode } from "react";

type Tone = "neutral" | "brand" | "danger";
type Size = "sm" | "md";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: Tone;
  size?: Size;
  children: ReactNode;
}

const BASE =
  "inline-grid place-items-center rounded-lg border transition " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2 " +
  "disabled:cursor-not-allowed disabled:opacity-50";

const TONES: Record<Tone, string> = {
  neutral:
    "border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-brand-800 dark:hover:bg-slate-700 dark:hover:text-brand-200",
  brand:
    "border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-200 dark:hover:bg-brand-900/50",
  danger:
    "border-transparent bg-transparent text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20 dark:hover:text-rose-300",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
};

export function IconButton({
  tone = "neutral",
  size = "md",
  className = "",
  type = "button",
  children,
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={`${BASE} ${TONES[tone]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
