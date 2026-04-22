import { useEffect, useRef } from "react";
import { Button } from "../atoms/Button";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (question: string) => void;
  loading: boolean;
}

export function ChatInput({ value, onChange, onSend, loading }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  const handleSubmit = () => {
    const q = value.trim();
    if (!q || loading) return;
    onSend(q);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="sticky bottom-0 border-t border-brand-100 bg-white/85 px-4 py-4 backdrop-blur-md dark:border-brand-900/50 dark:bg-slate-900/90 sm:px-6">
      <div className="mx-auto flex max-w-4xl flex-col gap-2">
        <div className="flex items-end gap-2 rounded-2xl border border-brand-100 bg-white p-2 shadow-soft transition focus-within:border-brand-400 focus-within:shadow-glow dark:border-brand-800 dark:bg-slate-800">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Faça uma pergunta sobre vendas, pedidos, avaliações… (Enter para enviar, Shift+Enter para nova linha)"
            rows={1}
            disabled={loading}
            className="scrollbar-soft max-h-52 flex-1 resize-none border-0 bg-transparent px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
          <Button
            onClick={handleSubmit}
            disabled={loading || !value.trim()}
            loading={loading}
            variant="primary"
            size="md"
            rightIcon={
              !loading ? (
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
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              ) : undefined
            }
          >
            {loading ? "Consultando" : "Enviar"}
          </Button>
        </div>
        <p className="text-center text-[11px] text-slate-400 dark:text-slate-500">
          O agente gera SQL, executa no banco e explica o resultado. Verifique
          sempre os números antes de compartilhar.
        </p>
      </div>
    </div>
  );
}
