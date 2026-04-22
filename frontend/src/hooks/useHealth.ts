import { useEffect, useState } from "react";
import { getHealth } from "../services/api";
import type { SchemaSnapshot } from "../types";

interface UseHealthResult {
  model: string | null;
  online: boolean;
  loading: boolean;
  tables: string[];
  schema: SchemaSnapshot | null;
}

export function useHealth(): UseHealthResult {
  const [model, setModel] = useState<string | null>(null);
  const [online, setOnline] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [tables, setTables] = useState<string[]>([]);
  const [schema, setSchema] = useState<SchemaSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const h = await getHealth();
        if (cancelled) return;
        setModel(h.model);
        setOnline(Boolean(h.ok));
        setTables(h.tables ?? []);
        setSchema(h.schema ?? null);
      } catch {
        if (!cancelled) {
          setModel(null);
          setOnline(false);
          setTables([]);
          setSchema(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { model, online, loading, tables, schema };
}
