import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import {
  DataTable,
  DeleteDialog,
  type DataTableColumn,
} from "../../../shared/components";
import { editorApi } from "../../../shared/api/editorApi";
import { useEntityQuery } from "../../../shared/hooks/useEntityApi";
import { FormationEditor } from "../components/FormationEditor";
import type { Formation } from "../types";

function toFormation(row: Record<string, unknown>): Formation {
  return {
    id: Number(row.id),
    name: String(row.name ?? ""),
    description: row.description == null ? undefined : String(row.description),
    positions: [],
    instructions: [],
  };
}

export function FormationsPage() {
  const [selectedFormation, setSelectedFormation] = useState<Formation | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleting, setDeleting] = useState<Formation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const query = useEntityQuery("formation", {
    page: 1,
    pageSize: 100,
    orderBy: "name",
    orderDirection: "ASC",
  });

  const formations = useMemo(
    () => query.rows.map(row => toFormation(row)),
    [query.rows],
  );

  const columns = useMemo<DataTableColumn<Formation>[]>(
    () => [
      {
        key: "name",
        header: "Formation",
        render: row => <span className="font-medium text-white">{row.name}</span>,
      },
      {
        key: "positions",
        header: "Positions",
        render: row => row.positions.length || "Open editor",
      },
      {
        key: "description",
        header: "Description",
        render: row => row.description ?? "—",
      },
    ],
    [],
  );

  async function removeFormation() {
    if (!deleting) return;

    try {
      setError(null);
      await editorApi.remove("formation", deleting.id);
      setDeleting(null);
      await query.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  if (selectedFormation) {
    return (
      <FormationEditor
        formation={selectedFormation}
        onBack={() => setSelectedFormation(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-6">
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
            TACTICS
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Formations</h1>
          <p className="mt-2 text-sm text-slate-500">
            Build tactical shapes, persist player positions and assign role, duty and formation instructions.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-400/10 px-3.5 py-2.5 text-sm font-medium text-emerald-200"
        >
          <Plus size={15} />
          Create Formation
        </button>
      </header>

      {error && (
        <div className="rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <DataTable
        columns={columns}
        rows={formations}
        loading={query.loading}
        error={query.error}
        onRowClick={setSelectedFormation}
        onDelete={setDeleting}
        emptyMessage="No formations found."
      />

      {showCreate && (
        <div className="rounded-2xl border border-white/10 bg-[#121820] p-6">
          <FormationEditor
            onBack={() => setShowCreate(false)}
            onSaved={() => {
              setShowCreate(false);
              void query.reload();
            }}
          />
        </div>
      )}

      <DeleteDialog
        open={Boolean(deleting)}
        entityName={deleting?.name ?? ""}
        onConfirm={() => void removeFormation()}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
