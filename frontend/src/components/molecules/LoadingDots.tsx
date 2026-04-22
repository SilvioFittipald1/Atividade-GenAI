import { useEffect, useState } from "react";

const STEPS = [
  "Analisando a pergunta…",
  "Gerando consulta SQL…",
  "Executando no banco…",
  "Formatando resposta…",
] as const;

const INTERVAL_MS = 1400;

export function LoadingDots() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setStep((s) => (s + 1) % STEPS.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      className="flex items-center gap-2 py-1"
      role="status"
      aria-label="Consultando agente"
    >
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 animate-bounce rounded-full bg-brand-400 [animation-delay:-0.3s] dark:bg-brand-300" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-brand-500 [animation-delay:-0.15s] dark:bg-brand-400" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-brand-600 dark:bg-brand-500" />
      </div>
      <p
        key={step}
        className="animate-fade-in text-xs text-slate-500 dark:text-slate-400"
      >
        {STEPS[step]}
      </p>
    </div>
  );
}
