import { useEffect, useState } from "react";
import { editorApi, type Scalar } from "../api/editorApi";

export function useTableOptions(table: string, foreignKeyTarget?: string) {
  const [options, setOptions] = useState<Array<{ id: number | string; label: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!foreignKeyTarget) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    void editorApi.list(foreignKeyTarget, {
      page: 1,
      pageSize: 100,
      orderBy: "name",
    }).then((result) => {
      if (cancelled) return;
      setOptions(
        result.rows.map((row) => ({
          id: (row.id as Scalar) ?? "",
          label: String(row.name ?? row.short_name ?? row.id ?? ""),
        })),
      );
    }).catch((cause) => {
      if (cancelled) return;
      setError(cause instanceof Error ? cause.message : String(cause));
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [foreignKeyTarget, table]);

  return { options, loading, error };
}