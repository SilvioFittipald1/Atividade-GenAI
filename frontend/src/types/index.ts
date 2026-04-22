export interface AskRequest {
  question: string;
  conversation_id: string;
}

export interface AskResponse {
  sql: string;
  columns: string[];
  rows: Array<Record<string, unknown>>;
  explanation: string;
  row_count: number;
  suggestions: string[];
  cached: boolean;
  messages_json: string;
  /** RAG: tabelas que o retriever selecionou para compor o system prompt. */
  retrieved_tables?: string[];
  /** RAG: true quando o retriever caiu no fallback (schema completo). */
  used_full_schema?: boolean;
  /** RAG: estimativa de tokens economizados no system prompt. */
  tokens_saved_estimate?: number;
}

export interface UserMessage {
  id: string;
  role: "user";
  content: string;
}

export interface AssistantMessage {
  id: string;
  role: "assistant";
  content?: string;
  response?: AskResponse;
  error?: string;
  loading?: boolean;
  manuallyEdited?: boolean;
  /** Latência aproximada da resposta (cliente), em milissegundos. */
  durationMs?: number;
}

export type Message = UserMessage | AssistantMessage;

export interface ConversationRecord {
  id: string;
  title: string;
  /** Se o usuário renomeou, o título automático do próximo send não substitui. */
  titleOverride?: boolean;
  createdAt: number;
  messages: Message[];
  messagesJson: string;
}

export interface ExecuteSqlResponse {
  sql: string;
  columns: string[];
  rows: Array<Record<string, unknown>>;
  row_count: number;
}

export interface ExampleCategory {
  label: string;
  questions: string[];
}

export interface ColumnInfo {
  name: string;
  type: string;
  notnull: boolean;
  pk: boolean;
  /** Top-K valores por frequência (quando a coluna é categórica). */
  top_values?: Array<{ value: unknown; count: number }> | null;
  /** Min/max/avg para colunas numéricas. */
  stats?: { min?: number | null; max?: number | null; avg?: number | null } | null;
}

export interface LogicalFk {
  from_col: string;
  to_table: string;
  to_col: string;
}

export interface TableInfo {
  name: string;
  row_count: number;
  columns: ColumnInfo[];
  samples: Array<Record<string, unknown>>;
  logical_fks: LogicalFk[];
}

export interface SchemaSnapshot {
  tables: TableInfo[];
  generated_at: string;
  schema_hash: string;
}

export interface HealthResponse {
  ok: boolean;
  model: string;
  /** Opcional: backends antigos podem não enviar. */
  tables?: string[];
  conversations_in_memory: number;
  total_messages_in_memory: number;
  /** Snapshot introspectado do SQLite; alimenta o Schema Explorer. */
  schema?: SchemaSnapshot | null;
}
