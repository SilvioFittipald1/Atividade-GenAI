import { useCallback, useState } from "react";
import {
  deleteAllConversations,
  listConversations,
} from "../services/storage";
import type { ConversationRecord } from "../types";

export function useConversations() {
  const [conversations, setConversations] = useState<ConversationRecord[]>(() =>
    listConversations(),
  );

  const refresh = useCallback(() => {
    setConversations(listConversations());
  }, []);

  const clearAll = useCallback(() => {
    deleteAllConversations();
    refresh();
  }, [refresh]);

  return { conversations, refresh, clearAll };
}
