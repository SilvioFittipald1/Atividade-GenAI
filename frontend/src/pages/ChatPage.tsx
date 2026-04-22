import { useCallback, useRef, useState } from "react";
import { ShortcutsModal } from "../components/molecules/ShortcutsModal";
import { ChatInput } from "../components/organisms/ChatInput";
import { Header } from "../components/organisms/Header";
import { MessageList } from "../components/organisms/MessageList";
import { SchemaExplorer } from "../components/organisms/SchemaExplorer";
import { Sidebar } from "../components/organisms/Sidebar";
import { ChatLayout } from "../components/templates/ChatLayout";
import { useChat } from "../hooks/useChat";
import { useConversations } from "../hooks/useConversations";
import { useHealth } from "../hooks/useHealth";
import { useHotkeys } from "../hooks/useHotkeys";
import { downloadMarkdown, toMarkdown } from "../lib/markdown";
import { listConversations } from "../services/storage";
import type { ConversationRecord } from "../types";

function safeExportFilename(title: string): string {
  const t = title
    .trim()
    .replace(/[<>:"/\\|?*]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 48);
  return t || "conversa";
}

export function ChatPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [schemaOpen, setSchemaOpen] = useState(false);
  const [schemaFocusTable, setSchemaFocusTable] = useState<string | null>(null);
  const showShortcutsRef = useRef(false);
  const sidebarOpenRef = useRef(false);
  const schemaOpenRef = useRef(false);
  showShortcutsRef.current = showShortcuts;
  sidebarOpenRef.current = sidebarOpen;
  schemaOpenRef.current = schemaOpen;

  const { conversations, refresh, clearAll } = useConversations();
  const { model, online, loading: healthLoading, tables, schema } = useHealth();
  const {
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
  } = useChat({ onConversationsChanged: refresh });

  const handleEscape = useCallback(() => {
    if (showShortcutsRef.current) {
      setShowShortcuts(false);
      return;
    }
    if (schemaOpenRef.current) {
      setSchemaOpen(false);
      return;
    }
    if (sidebarOpenRef.current) {
      setSidebarOpen(false);
    }
  }, []);

  const openSchemaExplorer = useCallback((table?: string) => {
    if (table) setSchemaFocusTable(table);
    else setSchemaFocusTable(null);
    setSchemaOpen(true);
  }, []);

  useHotkeys({
    "mod+b": () => setSidebarOpen((v) => !v),
    "mod+/": () => {
      void reset();
    },
    "mod+k": () => {
      setSchemaFocusTable(null);
      setSchemaOpen((v) => !v);
    },
    "?": () => setShowShortcuts(true),
    Escape: handleEscape,
  });

  const handleExport = useCallback(() => {
    const rec = listConversations().find((c) => c.id === conversationId);
    const conv: ConversationRecord = {
      id: conversationId,
      title: rec?.title ?? "Conversa",
      titleOverride: rec?.titleOverride,
      createdAt: rec?.createdAt ?? Date.now(),
      messages,
      messagesJson: rec?.messagesJson ?? "",
    };
    const md = toMarkdown(conv);
    const name = safeExportFilename(conv.title);
    downloadMarkdown(`${name}.md`, md);
  }, [conversationId, messages]);

  const handleClearAll = useCallback(() => {
    clearAll();
    resetLocal();
  }, [clearAll, resetLocal]);

  return (
    <>
      <ChatLayout
        sidebar={
          <Sidebar
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            conversations={conversations}
            currentId={conversationId}
            onPick={openConversation}
            onNew={reset}
            onDelete={removeConversation}
            onRename={renameConversation}
            onClearAll={handleClearAll}
            tables={tables}
          />
        }
        header={
          <Header
            onReset={reset}
            onToggleSidebar={() => setSidebarOpen((v) => !v)}
            onExportMarkdown={handleExport}
            onShowShortcuts={() => setShowShortcuts(true)}
            onOpenSchemaExplorer={() => openSchemaExplorer()}
            hasConversation={messages.length > 0}
            model={model}
            modelLoading={healthLoading}
            online={online}
          />
        }
        messages={
          <MessageList
            messages={messages}
            onExamplePick={setInput}
            onPickSuggestion={(q) => void send(q)}
            onReexecuteSql={reexecuteSql}
            onInspectTable={(name) => openSchemaExplorer(name)}
          />
        }
        input={
          <ChatInput
            value={input}
            onChange={setInput}
            onSend={send}
            loading={loading}
          />
        }
      />
      <ShortcutsModal
        open={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />
      <SchemaExplorer
        open={schemaOpen}
        onClose={() => setSchemaOpen(false)}
        schema={schema}
        focusTable={schemaFocusTable}
        onInsertExample={(text) => {
          setInput(text);
          setSchemaOpen(false);
        }}
      />
    </>
  );
}
