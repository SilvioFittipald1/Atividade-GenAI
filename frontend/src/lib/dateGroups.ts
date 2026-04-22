import type { ConversationRecord } from "../types";

export interface DateGroup {
  label: string;
  items: ConversationRecord[];
}

function startOfDay(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

function dayDiffFromToday(createdAt: number, todayStart: number): number {
  const t = startOfDay(new Date(createdAt));
  return Math.floor((todayStart - t) / (24 * 60 * 60 * 1000));
}

/**
 * Agrupa conversas (já ordenadas por createdAt desc) em rótulos de calendário.
 */
export function groupByDate(items: ConversationRecord[]): DateGroup[] {
  if (items.length === 0) return [];

  const now = new Date();
  const todayStart = startOfDay(now);
  const buckets: Map<string, ConversationRecord[]> = new Map();
  const order: string[] = [];

  for (const c of items) {
    const diff = dayDiffFromToday(c.createdAt, todayStart);
    let label: string;
    if (diff === 0) label = "Hoje";
    else if (diff === 1) label = "Ontem";
    else if (diff < 7) label = "Últimos 7 dias";
    else if (diff < 30) label = "Últimos 30 dias";
    else label = "Mais antigas";

    if (!buckets.has(label)) {
      buckets.set(label, []);
      order.push(label);
    }
    buckets.get(label)!.push(c);
  }

  return order.map((label) => ({
    label,
    items: buckets.get(label) ?? [],
  }));
}
