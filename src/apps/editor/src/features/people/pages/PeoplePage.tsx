import { useEffect, useState } from "react";
import { editorApi, type EntityRow } from "../../../shared/api/editorApi";
import { Tabs } from "../../../shared/components";
import { PersonEditor } from "../components/PersonEditor";
import { useEntityQuery } from "../../../shared/hooks/useEntityApi";
import { SearchInput, Pagination, DataTable } from "../../../shared/components";
import type { DataTableColumn } from "../../../shared/components";

export function PeoplePage() {
  const [selectedId, setSelectedId] = useState<number | undefined>();
  const [creating, setCreating] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const list = useEntityQuery("person", {
    page,
    pageSize: 15,
    search,
    searchColumns: ["full_name", "common_name"],
    orderBy: "full_name",
    orderDirection: "ASC",
  });

  if (creating || selectedId !== undefined) {
    return (
      <PersonEditor
        personId={selectedId}
        onBack={() => { setCreating(false); setSelectedId(undefined); }}
        onSaved={id => { setCreating(false); setSelectedId(id); void list.reload(); }}
      />
    );
  }

  const columns: DataTableColumn<Record<string, string | number | boolean | null>>[] = [
    { key: "full_name", header: "Name" },
    { key: "common_name", header: "Common Name" },
    { key: "birth_date", header: "Birth Date" },
    { key: "person_type_id", header: "Person Type" },
    { key: "birth_city_id", header: "Birth City" },
    { key: "sex", header: "Sex" },
  ];

  async function remove(row: Record<string, string | number | boolean | null>) {
    if (!window.confirm("Delete this person? Related records may prevent deletion.")) return;
    try {
      await editorApi.entity.remove("person", Number(row.id));
      await list.reload();
    } catch (cause) {
      window.alert(cause instanceof Error ? cause.message : String(cause));
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-6">
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">PEOPLE</div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">People</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-500">
            Shared identity layer for players, staff and other world actors. Open a person to edit the complete profile graph.
          </p>
        </div>
        <button type="button" onClick={() => setCreating(true)} className="rounded-lg bg-emerald-400/10 px-3.5 py-2.5 text-sm font-medium text-emerald-200">+ New Person</button>
      </header>

      <SearchInput value={search} onChange={value => { setSearch(value); setPage(1); }} placeholder="Search by full or common name..." />
      <DataTable
        rows={list.rows}
        columns={columns}
        loading={list.loading}
        error={list.error}
        onEdit={row => setSelectedId(Number(row.id))}
        onDelete={row => void remove(row)}
        emptyMessage="No people found."
      />
      {!list.loading && !list.error && <Pagination page={list.page} pageCount={list.pageCount} onPageChange={setPage} />}
    </div>
  );
}
