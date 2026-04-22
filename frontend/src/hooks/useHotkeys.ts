import { useEffect, useRef } from "react";

function isFormFieldTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target instanceof HTMLInputElement) return true;
  if (target instanceof HTMLTextAreaElement) return true;
  if (target instanceof HTMLSelectElement) return true;
  if (target instanceof HTMLElement && target.isContentEditable) return true;
  return false;
}

export type HotkeyMap = {
  "mod+b"?: () => void;
  "mod+/"?: () => void;
  "mod+k"?: () => void;
  "?"?: () => void;
  Escape?: () => void;
};

/**
 * Registra atalhos globais. Ignora o disparo vindo de input/textarea/select/contentEditable,
 * exceto `Escape`, que sempre é tratado.
 */
export function useHotkeys(handlers: HotkeyMap) {
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const h = ref.current;
      if (e.key === "Escape") {
        h.Escape?.();
        return;
      }
      if (isFormFieldTarget(e.target)) {
        return;
      }
      const mod = e.ctrlKey || e.metaKey;
      if (mod && (e.key === "b" || e.key === "B") && h["mod+b"]) {
        e.preventDefault();
        h["mod+b"]();
        return;
      }
      if (mod && e.key === "/" && h["mod+/"]) {
        e.preventDefault();
        h["mod+/"]();
        return;
      }
      if (mod && (e.key === "k" || e.key === "K") && h["mod+k"]) {
        e.preventDefault();
        h["mod+k"]();
        return;
      }
      if (e.key === "?" && h["?"]) {
        h["?"]();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
