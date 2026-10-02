import { useCallback, useEffect, useState } from "react";
import { editorApi, type EntityKey, type EntityRow, type ListOptions, type ListResult } from "../api/editorApi";

export function useEntityQuery<T extends EntityRow = EntityRow>(table: string, options: ListOptions = {}) {
  const [result, setResult] = useState<ListResult<T>>({
    rows: [], total: 0, page: options.page ?? 1, pageSize: options.pageSize ?? 25, pageCount: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try { setResult(await editorApi.list<T>(table, options)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setLoading(false); }
  }, [table, options.page, options.pageSize, options.search, options.searchColumns?.join(","), options.orderBy, options.orderDirection]);

  useEffect(() => { void reload(); }, [reload]);
  return { ...result, loading, error, reload };
}

export function useEntityMutation(table: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run<T>(action: () => Promise<T>) {
    setLoading(true);
    setError(null);
    try { return await action(); }
    catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setError(message);
      throw new Error(message);
    } finally { setLoading(false); }
  }

  return {
    create: (values: Record<string, string | number | boolean | null>) => run(() => editorApi.create(table, values)),
    update: (id: EntityKey, values: Record<string, string | number | boolean | null>) => run(() => editorApi.update(table, id, values)),
    remove: (id: EntityKey) => run(() => editorApi.remove(table, id)),
    loading,
    error,
  };
}