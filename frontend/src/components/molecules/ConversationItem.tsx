import { useEffect, useRef, useState, type MouseEvent } from "react";
import type { ConversationRecord } from "../../types";
import { IconButton } from "../atoms/IconButton";

interface ConversationItemProps {
  record: ConversationRecord;
  active: boolean;
  onPick: (rec: ConversationRecord) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newTitle: string) => void;
}

export function ConversationItem({
  record,
  active,
  onPick,
  onDelete,
  onRename,
}: ConversationItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(record.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancellingRef = useRef(false);

  useEffect(() => {
    if (isEditing) {
      setDraft(record.title);
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing, record.title]);

  useEffect(
    () => () => {
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    },
    [],
  );

  const save = () => {
    if (cancellingRef.current) {
      cancellingRef.current = false;
      return;
    }
    const t = draft.trim() || record.title;
    if (t !== record.title) {
      onRename(record.id, t);
    }
    setIsEditing(false);
  };

  const cancel = () => {
    cancellingRef.current = true;
    setDraft(record.title);
    setIsEditing(false);
  };

  const beginEdit = () => {
    setDraft(record.title);
    setIsEditing(true);
  };

  const onRowClick = () => {
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(() => {
      onPick(record);
      clickTimerRef.current = null;
    }, 200);
  };

  const onRowDoubleClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    beginEdit();
  };

  return (
    <div
      className={`group flex items-start gap-1 rounded-xl border px-2.5 py-2 text-left text-sm transition ${
        active
          ? "border-brand-200 bg-brand-50 shadow-sm dark:border-brand-800 dark:bg-brand-950/40"
          : "border-transparent hover:border-brand-100 hover:bg-brand-50/50 dark:hover:border-brand-800/50 dark:hover:bg-slate-800/50"
      }`}
    >
      <div className="min-w-0 flex-1 text-left">
        {isEditing ? (
          <input
            ref={inputRef}
            className="w-full rounded-md border border-brand-200 bg-white px-1.5 py-0.5 text-sm text-slate-800 outline-none ring-brand-500/30 focus:ring-2 dark:border-brand-800 dark:bg-slate-900 dark:text-slate-100"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                save();
              } else if (e.key === "Escape") {
                e.preventDefault();
                cancel();
              }
            }}
            onBlur={save}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <button
            type="button"
            onClick={onRowClick}
            onDoubleClick={onRowDoubleClick}
            className="w-full text-left"
          >
            <div
              className={`truncate font-medium ${
                active ? "text-brand-900 dark:text-brand-100" : "text-slate-800 dark:text-slate-200"
              }`}
            >
              {record.title}
            </div>
            <div
              className={`text-[10px] ${
                active ? "text-brand-700 dark:text-brand-300" : "text-slate-500 dark:text-slate-400"
              }`}
            >
              {new Date(record.createdAt).toLocaleString("pt-BR", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </button>
        )}
      </div>
      {!isEditing && (
        <IconButton
          tone="neutral"
          size="sm"
          title="Renomear"
          aria-label="Renomear conversa"
          onClick={beginEdit}
          className="border-transparent bg-transparent opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
        </IconButton>
      )}
      <IconButton
        tone="danger"
        size="sm"
        title="Excluir conversa"
        aria-label="Excluir conversa"
        onClick={() => {
          if (window.confirm("Excluir esta conversa?")) {
            onDelete(record.id);
          }
        }}
        className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 6h18M8 6V4h8v2M19 6v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6" />
          <path d="M10 11v6M14 11v6" />
        </svg>
      </IconButton>
    </div>
  );
}
