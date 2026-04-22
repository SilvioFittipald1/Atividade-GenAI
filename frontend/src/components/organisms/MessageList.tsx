import { useEffect, useRef } from "react";
import type { ExecuteSqlResponse, Message } from "../../types";
import { ExampleQuestions } from "./ExampleQuestions";
import { MessageBubble } from "./MessageBubble";

interface MessageListProps {
  messages: Message[];
  onExamplePick: (question: string) => void;
  onPickSuggestion?: (q: string) => void;
  onReexecuteSql?: (messageId: string, result: ExecuteSqlResponse) => void;
  onInspectTable?: (name: string) => void;
}

export function MessageList({
  messages,
  onExamplePick,
  onPickSuggestion,
  onReexecuteSql,
  onInspectTable,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="scrollbar-soft flex-1 overflow-y-auto">
        <ExampleQuestions onPick={onExamplePick} />
      </div>
    );
  }

  return (
    <div className="scrollbar-soft flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-4xl flex-col gap-5 px-4 py-6 sm:px-6">
        {messages.map((m) => (
          <MessageBubble
            key={m.id}
            message={m}
            onPickSuggestion={onPickSuggestion}
            onReexecuteSql={onReexecuteSql}
            onInspectTable={onInspectTable}
          />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
