import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { DataTable, type DataTableColumn } from "../../../shared/components";
import { FormationEditor } from "../components/FormationEditor";
import { formations } from "../data/formations.data";
import type { Formation } from "../types";

export function FormationsPage() {
  const [selectedFormation, setSelectedFormation] = useState<Formation | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const columns = useMemo<DataTableColumn<Formation>[]>(() => [
    { key: "name", header: "Formation", render: row => <span className="font-medium text-white">{row.name}</span> },
    { key: "positions", header: "Positions", render: row => row.positions.map(position => position.label).join(" · ") },
    { key: "description", header: "Description", render: row => row.description ?? "—" },
  ], []);

  if (selectedFormation) {
    return <FormationEditor formation={selectedFormation} onBack={() => setSelectedFormation(null)} />;
  }

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-6">
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">TACTICS</div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Formations</h1>
          <p className="mt-2 text-sm text-slate-500">Build tactical shapes and define the role and duty assigned to every position.</p>
        </div>
        <button type="button" onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-lg bg-emerald-400/10 px-3.5 py-2.5 text-sm font-medium text-emerald-200"><Plus size={15} />Create Formation</button>
      </header>

      <DataTable columns={columns} rows={formations} onRowClick={setSelectedFormation} />
      {showCreate && <div className="rounded-2xl border border-white/10 bg-[#121820] p-6"><FormationEditor onBack={() => setShowCreate(false)} /></div>}
    </div>
  );
}
