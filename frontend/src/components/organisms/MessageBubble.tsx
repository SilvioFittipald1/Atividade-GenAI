import type { ExecuteSqlResponse, Message } from "../../types";
import { Badge } from "../atoms/Badge";
import { ErrorBanner } from "../molecules/ErrorBanner";
import { LoadingDots } from "../molecules/LoadingDots";
import { SchemaMiniMap } from "../molecules/SchemaMiniMap";
import { SuggestionChips } from "../molecules/SuggestionChips";
import { ChartPanel } from "./ChartPanel";
import { ResultTable } from "./ResultTable";
import { SQLBlock } from "./SQLBlock";

interface MessageBubbleProps {
  message: Message;
  onPickSuggestion?: (q: string) => void;
  onReexecuteSql?: (messageId: string, result: ExecuteSqlResponse) => void;
  onInspectTable?: (name: string) => void;
}

function AssistantAvatar() {
  return (
    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm shadow-brand-700/20 ring-1 ring-white/20">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
        aria-hidden="true"
      >
        <path d="M12 2a7 7 0 0 0-7 7c0 3 2 5 2 7v2a3 3 0 0 0 3 3h4a3 3 0 0 0 3-3v-2c0-2 2-4 2-7a7 7 0 0 0-7-7z" />
        <path d="M9 16h6" />
      </svg>
    </div>
  );
}

export function MessageBubble({
  message,
  onPickSuggestion,
  onReexecuteSql,
  onInspectTable,
}: MessageBubbleProps) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end animate-fade-in">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-gradient-to-br from-brand-600 to-brand-700 px-4 py-2.5 text-sm text-white shadow-sm shadow-brand-600/20 dark:from-brand-500 dark:to-brand-800">
          {message.content}
        </div>
      </div>
    );
  }

  const { loading, error, response, content, manuallyEdited, id, durationMs } =
    message;

  return (
    <div className="flex justify-start gap-3 animate-fade-in">
      <AssistantAvatar />
      <div className="min-w-0 flex-1">
        <div className="rounded-2xl rounded-tl-md border border-brand-100 bg-white/95 px-4 py-3 shadow-soft backdrop-blur dark:border-brand-900/40 dark:bg-slate-900/95">
          {(response?.cached || manuallyEdited || durationMs != null) && (
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {response?.cached && <Badge tone="brand">Em cache</Badge>}
              {manuallyEdited && (
                <Badge tone="amber">SQL reexecutada manualmente</Badge>
              )}
              {durationMs != null && (
                <Badge tone="neutral">
                  {(durationMs / 1000).toFixed(1)}s
                </Badge>
              )}
            </div>
          )}
          {!loading &&
            response &&
            ((response.retrieved_tables &&
              response.retrieved_tables.length > 0) ||
              response.used_full_schema) && (
              <SchemaMiniMap
                retrievedTables={response.retrieved_tables ?? []}
                usedFullSchema={response.used_full_schema ?? false}
                tokensSavedEstimate={response.tokens_saved_estimate}
                onInspectTable={onInspectTable}
              />
            )}
          {loading && <LoadingDots />}
          {error && <ErrorBanner message={error} />}
          {!loading && !error && content && (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800 dark:text-slate-100">
              {content}
            </p>
          )}
          {!loading && response && response.sql && (
            <SQLBlock
              sql={response.sql}
              onReexecute={
                onReexecuteSql ? (r) => onReexecuteSql(id, r) : undefined
              }
            />
          )}
          {!loading && response && (
            <ResultTable
              columns={response.columns}
              rows={response.rows}
              rowCount={response.row_count}
            />
          )}
          {!loading && response && (
            <ChartPanel columns={response.columns} rows={response.rows} />
          )}
          {!loading && response && onPickSuggestion && (
            <SuggestionChips
              items={response.suggestions ?? []}
              onPick={onPickSuggestion}
            />
          )}
        </div>
      </div>
    </div>
  );
}
