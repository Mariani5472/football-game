import { useMemo, useState } from "react";
import { DataTable, Pagination, SearchInput, type DataTableColumn } from "../../../shared/components";
import { editorApi, type EntityRow } from "../../../shared/api/editorApi";
import { useEntityQuery } from "../../../shared/hooks/useEntityApi";
import { ClubEditor } from "../components/ClubEditor";

export function TeamsPage() {
  const [selectedId, setSelectedId] = useState<number | undefined>();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const options = useMemo(() => ({ page, pageSize: 15, search, searchColumns: ["name", "short_name", "three_letter_name", "nickname"], orderBy: "name", orderDirection: "ASC" as const }), [page, search]);
  const list = useEntityQuery("team", options);
  if (selectedId !== undefined) return <ClubEditor clubId={selectedId} onBack={() => { setSelectedId(undefined); void list.reload(); }} />;
  const columns: DataTableColumn<EntityRow>[] = [
    { key: "id", header: "ID", render: row => String(row.id ?? "—") },
    { key: "name", header: "Name", render: row => String(row.name ?? "—") },
    { key: "short_name", header: "Short Name", render: row => String(row.short_name ?? "—") },
    { key: "three_letter_name", header: "Code", render: row => String(row.three_letter_name ?? "—") },
    { key: "reputation", header: "Reputation", render: row => String(row.reputation ?? "—") },
  ];
  async function remove(row: EntityRow) {
    const id = Number(row.id);
    if (!Number.isFinite(id) || !window.confirm("Delete this team? Club data is linked to the team and may cascade.")) return;
    await editorApi.entity.remove("team", id); await list.reload();
  }
  return <div className="space-y-6">
    <header><div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">WORLD DB / CLUBS</div><h1 className="text-2xl font-semibold tracking-tight text-white">Clubs</h1><p className="mt-2 max-w-3xl text-sm text-slate-500">Club workspace with shared team identity and complete club-domain data.</p></header>
    <SearchInput value={search} onChange={value => { setSearch(value); setPage(1); }} placeholder="Search clubs by name, short name or code..." />
    <DataTable rows={list.rows} columns={columns} loading={list.loading} error={list.error} onEdit={row => setSelectedId(Number(row.id))} onDelete={row => void remove(row)} emptyMessage="No clubs found." />
    {!list.loading && !list.error && <Pagination page={list.page} pageCount={list.pageCount} onPageChange={setPage} />}
  </div>;
}