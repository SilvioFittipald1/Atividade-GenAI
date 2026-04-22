import type { ReactNode } from "react";

interface ChatLayoutProps {
  sidebar: ReactNode;
  header: ReactNode;
  messages: ReactNode;
  input: ReactNode;
}

export function ChatLayout({
  sidebar,
  header,
  messages,
  input,
}: ChatLayoutProps) {
  return (
    <div className="relative flex h-screen flex-col overflow-hidden">
      {sidebar}
      <div className="flex min-h-0 flex-1 flex-col">
        {header}
        {messages}
        {input}
      </div>
    </div>
  );
}
