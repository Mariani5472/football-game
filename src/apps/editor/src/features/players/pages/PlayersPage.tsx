import { useMemo, useState } from "react";
import { DataTable, Pagination, SearchInput } from "../../../shared/components";
import type { DataTableColumn } from "../../../shared/components";
import { useEntityQuery } from "../../../shared/hooks/useEntityApi";
import { editorApi, type EntityRow } from "../../../shared/api/editorApi";
import { PlayerEditor } from "../components/PlayerEditor";

export function PlayersPage() {
  const [selectedId, setSelectedId] = useState<number | undefined>();
  const [creating, setCreating] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const options = useMemo(() => ({
    page,
    pageSize: 15,
    search,
    searchColumns: ["person_id"],
    orderBy: "person_id",
    orderDirection: "ASC" as const,
  }), [page, search]);

  const list = useEntityQuery("player", options);

  if (creating || selectedId !== undefined) {
    return (
      <PlayerEditor
        playerId={selectedId}
        onBack={() => { setCreating(false); setSelectedId(undefined); }}
        onSaved={id => { setCreating(false); setSelectedId(id); void list.reload(); }}
      />
    );
  }

  const columns: DataTableColumn<EntityRow>[] = [
    { key: "person_id", header: "Person", render: row => String(row.person_id ?? "—") },
    { key: "potential", header: "Potential", render: row => String(row.potential ?? "—") },
    { key: "estimated_value", header: "Estimated Value", render: row => String(row.estimated_value ?? "—") },
    { key: "left_foot", header: "Left Foot", render: row => String(row.left_foot ?? "—") },
    { key: "right_foot", header: "Right Foot", render: row => String(row.right_foot ?? "—") },
  ];

  async function remove(row: EntityRow) {
    if (!window.confirm("Delete this player? The player extension will be removed; the Person remains available.")) return;
    await editorApi.remove("player", Number(row.person_id));
    await list.reload();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-6">
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">PEOPLE / PLAYER</div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Players</h1>
          <p className="mt-2 text-sm text-slate-500">Player is an extension of Person. Open a player to edit core data, positions, ratings, roles, attributes, contracts, movement, history and relationships.</p>
        </div>
        <button type="button" onClick={() => setCreating(true)} className="rounded-lg bg-emerald-400/10 px-3.5 py-2.5 text-sm font-medium text-emerald-200">+ New Player</button>
      </div>

      <SearchInput value={search} onChange={value => { setSearch(value); setPage(1); }} placeholder="Search players by person id..." />

      <DataTable
        rows={list.rows}
        columns={columns}
        loading={list.loading}
        error={list.error}
        onEdit={row => setSelectedId(Number(row.person_id))}
        onDelete={row => void remove(row)}
        emptyMessage="No players found."
      />

      {!list.loading && !list.error && (
        <Pagination page={list.page} pageCount={list.pageCount} onPageChange={setPage} />
      )}
    </div>
  );
}
