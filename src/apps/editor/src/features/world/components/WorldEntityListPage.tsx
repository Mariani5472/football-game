import type { ReactNode } from "react";
import { Plus } from "lucide-react";

import {
  DataTable,
  Pagination,
  SearchInput,
} from "../../../shared/components";
import type { DataTableColumn } from "../../../shared/components";
import { useEntityList } from "../hooks/useEntityList";
import type { EntitySummary } from "../types";

interface WorldEntityListPageProps<T extends EntitySummary> {
  title: string;
  description: string;
  rows: T[];
  columns: DataTableColumn<T>[];
  createLabel?: string;
  onCreate?: () => void;
  onRowClick?: (row: T) => void;
  actions?: ReactNode;
  emptyMessage?: string;
}

export function WorldEntityListPage<T extends EntitySummary>({
  title,
  description,
  rows,
  columns,
  createLabel = "New",
  onCreate,
  onRowClick,
  actions,
  emptyMessage,
}: WorldEntityListPageProps<T>) {
  const list = useEntityList(rows);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-6">
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
            WORLD
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            {title}
          </h1>
          <p className="mt-2 text-sm text-slate-500">{description}</p>
        </div>

        <div className="flex items-center gap-2">
          {actions}
          {onCreate && (
            <button
              type="button"
              onClick={onCreate}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-400/10 px-3.5 py-2.5 text-sm font-medium text-emerald-200 hover:bg-emerald-400/15"
            >
              <Plus size={15} />
              {createLabel}
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="w-full max-w-sm">
          <SearchInput
            value={list.query}
            onChange={list.setQuery}
            placeholder={`Search ${title.toLowerCase()}...`}
          />
        </div>

        <span className="text-xs text-slate-600">
          {list.total} {list.total === 1 ? "record" : "records"}
        </span>
      </div>

      <DataTable
        columns={columns}
        rows={list.rows}
        onRowClick={onRowClick}
        emptyMessage={emptyMessage}
      />

      <Pagination
        page={list.currentPage}
        pageCount={list.pageCount}
        onPageChange={list.setPage}
      />
    </div>
  );
}