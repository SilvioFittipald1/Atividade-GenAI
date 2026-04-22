function esc(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(
  cols: string[],
  rows: Array<Record<string, unknown>>,
): string {
  if (cols.length === 0) return "";
  const header = cols.map(esc).join(";");
  const body = rows
    .map((r) => cols.map((c) => esc(r[c])).join(";"))
    .join("\n");
  return `${header}\n${body}`;
}

export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob(["\uFEFF" + content], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
