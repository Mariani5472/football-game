import { useMemo, useState } from "react";

interface EntityLike {
  id: number;
  name: string;
  shortName?: string;
}

export function useEntityList<T extends EntityLike>(
  rows: T[],
  pageSize = 10,
) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) return rows;

    return rows.filter((row) =>
      [row.name, row.shortName]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalized)),
    );
  }, [query, rows]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));

  const currentPage = Math.min(page, pageCount);

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [currentPage, filteredRows, pageSize]);

  function changeQuery(value: string) {
    setQuery(value);
    setPage(1);
  }

  return {
    query,
    setQuery: changeQuery,
    currentPage,
    setPage,
    pageCount,
    rows: paginatedRows,
    total: filteredRows.length,
  };
}