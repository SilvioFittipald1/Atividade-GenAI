import { useCallback, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  ApiError,
  askQuestion,
  rehydrateConversation,
  resetConversation,
} from "../services/api";
import {
  deleteConversation as deleteConversationStorage,
  listConversations,
  saveConversation,
} from "../services/storage";
import type {
  AssistantMessage,
  ConversationRecord,
  ExecuteSqlResponse,
  Message,
  UserMessage,
} from "../types";

function conversationTitle(msgs: Message[]): string {
  const first = msgs.find((m): m is UserMessage => m.role === "user");
  if (!first) return "Conversa";
  const t = first.content.trim();
  return t.length > 60 ? `${t.slice(0, 57)}...` : t;
}

interface UseChatOptions {
  onConversationsChanged: () => void;
}

export function useChat({ onConversationsChanged }: UseChatOptions) {
  const [conversationId, setConversationId] = useState<string>(() => uuidv4());
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const send = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed || loading) return;

      const userMsg: UserMessage = {
        id: uuidv4(),
        role: "user",
        content: trimmed,
      };
      const assistantId = uuidv4();
      const assistantPlaceholder: AssistantMessage = {
        id: assistantId,
        role: "assistant",
        loading: true,
      };

      setMessages((prev) => [...prev, userMsg, assistantPlaceholder]);
      setInput("");
      setLoading(true);

      try {
        const t0 = performance.now();
        const response = await askQuestion(trimmed, conversationId);
        const durationMs = Math.round(performance.now() - t0);
        setMessages((prev) => {
          const next: Message[] = prev.map((m) =>
            m.id === assistantId && m.role === "assistant"
              ? {
                  ...m,
                  loading: false,
                  durationMs,
                  content: response.explanation,
                  response: {
                    ...response,
                    suggestions: response.suggestions ?? [],
                    cached: response.cached ?? false,
                    messages_json: response.messages_json ?? "",
                  },
                }
              : m,
          );
          const existing = listConversations().find(
            (c) => c.id === conversationId,
          );
          const title = existing?.titleOverride
            ? existing.title
            : conversationTitle(next);
          saveConversation({
            id: conversationId,
            title,
            titleOverride: existing?.titleOverride,
            createdAt: existing?.createdAt ?? Date.now(),
            messages: next,
            messagesJson: response.messages_json ?? "",
          });
          onConversationsChanged();
          return next;
        });
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Erro desconhecido ao consultar o agente.";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId && m.role === "assistant"
              ? { ...m, loading: false, error: message }
              : m,
          ),
        );
      } finally {
        setLoading(false);
      }
    },
    [conversationId, loading, onConversationsChanged],
  );

  const reset = useCallback(async () => {
    try {
      await resetConversation(conversationId);
    } catch {
      // backend pode estar offline; a conversa local e recriada de todo jeito
    }
    setConversationId(uuidv4());
    setMessages([]);
    setInput("");
  }, [conversationId]);

  const resetLocal = useCallback(() => {
    setConversationId(uuidv4());
    setMessages([]);
    setInput("");
  }, []);

  const reexecuteSql = useCallback(
    (messageId: string, result: ExecuteSqlResponse) => {
      setMessages((prev) => {
        const next = prev.map((m) =>
          m.id === messageId && m.role === "assistant" && m.response
            ? {
                ...m,
                manuallyEdited: true,
                response: {
                  ...m.response,
                  sql: result.sql,
                  columns: result.columns,
                  rows: result.rows,
                  row_count: result.row_count,
                },
              }
            : m,
        );
        const rec = listConversations().find((c) => c.id === conversationId);
        if (rec) {
          saveConversation({
            ...rec,
            messages: next,
            title: rec.titleOverride ? rec.title : conversationTitle(next),
          });
          onConversationsChanged();
        }
        return next;
      });
    },
    [conversationId, onConversationsChanged],
  );

  const renameConversation = useCallback(
    (id: string, newTitle: string) => {
      const rec = listConversations().find((c) => c.id === id);
      if (!rec) return;
      saveConversation({
        ...rec,
        title: newTitle.trim() || rec.title,
        titleOverride: true,
      });
      onConversationsChanged();
    },
    [onConversationsChanged],
  );

  const openConversation = useCallback((rec: ConversationRecord) => {
    setConversationId(rec.id);
    setMessages(rec.messages);
    setInput("");
    void rehydrateConversation(rec.id, rec.messagesJson).catch((e) => {
      console.warn("Rehydrate falhou; follow-up pode perder contexto:", e);
    });
  }, []);

  const removeConversation = useCallback(
    (id: string) => {
      if (id === conversationId) {
        void resetConversation(id);
        setConversationId(uuidv4());
        setMessages([]);
        setInput("");
      }
      deleteConversationStorage(id);
      onConversationsChanged();
    },
    [conversationId, onConversationsChanged],
  );

  return {
    conversationId,
    messages,
    input,
    loading,
    setInput,
    send,
    reset,
    resetLocal,
    reexecuteSql,
    openConversation,
    removeConversation,
    renameConversation,
  };
}
