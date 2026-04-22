import type {
  AssistantMessage,
  ConversationRecord,
  Message,
  UserMessage,
} from "../types";

const TABLE_PREVIEW = 20;

function isUser(m: Message): m is UserMessage {
  return m.role === "user";
}

function isAssistant(m: Message): m is AssistantMessage {
  return m.role === "assistant";
}

function mdEscapeCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return s.replace(/\|/g, "\\|");
}

function tableToMarkdown(
  columns: string[],
  rows: Array<Record<string, unknown>>,
  cap: number,
): string {
  if (columns.length === 0) return "";
  const slice = rows.slice(0, cap);
  const header = `| ${columns.map(mdEscapeCell).join(" | ")} |`;
  const sep = `| ${columns.map(() => "---").join(" | ")} |`;
  const body = slice
    .map((r) => `| ${columns.map((c) => mdEscapeCell(r[c])).join(" | ")} |`)
    .join("\n");
  return `${header}\n${sep}\n${body}`;
}

function assistantToBlocks(
  msg: AssistantMessage,
  index: number,
  userQ: string,
): string {
  const parts: string[] = [];
  parts.push(`## ${index}. ${userQ.replace(/\n/g, " ")}`);
  if (msg.error) {
    parts.push(`**Erro:** ${msg.error}`);
    return parts.join("\n\n");
  }
  if (msg.content) {
    parts.push(`**Resposta:** ${msg.content}`);
  }
  const r = msg.response;
  if (r) {
    parts.push("```sql\n" + (r.sql ?? "") + "\n```");
    if (r.columns.length && (r.rows?.length ?? 0) > 0) {
      const shown = Math.min(TABLE_PREVIEW, r.rows.length);
      parts.push(
        tableToMarkdown(
          r.columns,
          r.rows as Array<Record<string, unknown>>,
          shown,
        ),
      );
      parts.push(
        `_Linhas retornadas: ${r.row_count} (exibindo as primeiras ${shown})_`,
      );
      if (r.row_count > shown) {
        parts.push(
          "_Para tabela completa, use **Baixar CSV** no painel de resultados._",
        );
      }
    } else {
      parts.push(`_Nenhum resultado em tabela (row_count: ${r.row_count})._`);
    }
  }
  return parts.join("\n\n");
}

export function toMarkdown(conv: ConversationRecord): string {
  const title = conv.title || "Conversa";
  const header = `# ${title}\n\n_Exportado em ${new Date().toLocaleString("pt-BR")}_\n\n`;

  const lines: string[] = [header];
  const msgs = conv.messages;
  let blockIdx = 0;

  for (let i = 0; i < msgs.length; i++) {
    const m = msgs[i]!;
    if (!isUser(m)) continue;
    const userQ = m.content;
    const next = msgs[i + 1];
    if (next && isAssistant(next)) {
      blockIdx += 1;
      lines.push(assistantToBlocks(next, blockIdx, userQ));
      lines.push("");
    } else {
      blockIdx += 1;
      lines.push(`## ${blockIdx}. ${userQ.replace(/\n/g, " ")}`);
      lines.push("_(Resposta pendente ou ausente.)_");
      lines.push("");
    }
  }

  if (blockIdx === 0 && conv.messagesJson) {
    try {
      const raw = JSON.parse(conv.messagesJson) as unknown;
      if (raw && typeof raw === "object" && "messages" in (raw as object)) {
        return `${header}_Exportação: histórico bruto no JSON; abra a conversa no app para reexportar com detalhe._\n`;
      }
    } catch {
      // messagesJson pode nao ser JSON valido; cai na saida padrao abaixo
    }
  }

  return lines.join("\n").trimEnd() + "\n";
}

export function downloadMarkdown(filename: string, content: string): void {
  const blob = new Blob([content], {
    type: "text/markdown;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".md") ? filename : `${filename}.md`;
  a.click();
  URL.revokeObjectURL(url);
}
