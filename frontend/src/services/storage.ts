import type { ConversationRecord } from "../types";

const KEY = "ecom-agent-conversations";
const MAX_CONVERSATIONS = 50;

function readAll(): ConversationRecord[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as ConversationRecord[];
  } catch {
    return [];
  }
}

function writeAll(list: ConversationRecord[]): void {
  const trimmed =
    list.length > MAX_CONVERSATIONS
      ? [...list]
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(0, MAX_CONVERSATIONS)
      : list;
  localStorage.setItem(KEY, JSON.stringify(trimmed));
}

export function listConversations(): ConversationRecord[] {
  return readAll().sort((a, b) => b.createdAt - a.createdAt);
}

export function saveConversation(rec: ConversationRecord): void {
  const all = readAll();
  const idx = all.findIndex((c) => c.id === rec.id);
  if (idx >= 0) {
    all[idx] = rec;
  } else {
    all.push(rec);
  }
  writeAll(all);
}

export function deleteConversation(id: string): void {
  const all = readAll().filter((c) => c.id !== id);
  writeAll(all);
}

export function deleteAllConversations(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // localStorage pode estar desabilitado (modo privativo); silenciar
  }
}
