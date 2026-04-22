import type { AskResponse, ExecuteSqlResponse, HealthResponse } from "../types";

export const API_BASE: string =
  (import.meta.env.VITE_API_BASE as string | undefined) ??
  "http://127.0.0.1:8000";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function parseDetail(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { detail?: unknown };
    if (typeof body.detail === "string") return body.detail;
    return `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

export async function askQuestion(
  question: string,
  conversationId: string,
  signal?: AbortSignal,
): Promise<AskResponse> {
  const res = await fetch(`${API_BASE}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, conversation_id: conversationId }),
    signal,
  });
  if (!res.ok) {
    throw new ApiError(res.status, await parseDetail(res));
  }
  return (await res.json()) as AskResponse;
}

export async function resetConversation(conversationId: string): Promise<void> {
  await fetch(`${API_BASE}/reset/${encodeURIComponent(conversationId)}`, {
    method: "POST",
  });
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

export async function getHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) {
    throw new ApiError(res.status, await parseDetail(res));
  }
  return (await res.json()) as HealthResponse;
}

export async function executeSql(sql: string): Promise<ExecuteSqlResponse> {
  const res = await fetch(`${API_BASE}/execute-sql`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sql }),
  });
  if (!res.ok) {
    throw new ApiError(res.status, await parseDetail(res));
  }
  return (await res.json()) as ExecuteSqlResponse;
}

export async function rehydrateConversation(
  conversationId: string,
  messagesJson: string,
): Promise<void> {
  if (!messagesJson || !messagesJson.trim()) return;
  const res = await fetch(`${API_BASE}/rehydrate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      conversation_id: conversationId,
      messages_json: messagesJson,
    }),
  });
  if (!res.ok) {
    throw new ApiError(res.status, await parseDetail(res));
  }
}
