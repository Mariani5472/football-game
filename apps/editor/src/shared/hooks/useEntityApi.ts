import { useCallback, useEffect, useState } from "react";
import { editorApi, type EntityRow, type ListOptions, type ListResult } from "../api/editorApi";

export function useEntityQuery<T extends EntityRow = EntityRow>(
  table: string,
  options: ListOptions = {},
) {
  const [result, setResult] = useState<ListResult<T>>({
    rows: [],
    total: 0,
    page: options.page ?? 1,
    pageSize: options.pageSize ?? 25,
    pageCount: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setResult(await editorApi.list<T>(table, options));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }, [table, options.page, options.pageSize, options.search, options.orderBy, options.orderDirection]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { ...result, loading, error, reload };
}

export function useEntityMutation(table: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(values: Record<string, string | number | boolean | null>) {
    setLoading(true);
    setError(null);
    try {
      return await editorApi.create(table, values);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }

  async function update(
    id: string | number,
    values: Record<string, string | number | boolean | null>,
  ) {
    setLoading(true);
    setError(null);
    try {
      return await editorApi.update(table, id, values);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: string | number) {
    setLoading(true);
    setError(null);
    try {
      return await editorApi.remove(table, id);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }

  return { create, update, remove, loading, error };
}