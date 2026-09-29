import { useState } from "react";
import { Plus } from "lucide-react";
import { DataTable } from "../../../shared/components";
import type { DataTableColumn } from "../../../shared/components";
import { cities } from "../../world/data/world.data";
import { teams } from "../../teams/data/teams.data";
import { stadiums } from "../data/stadiums.data";
import { StadiumEditor } from "../components/StadiumEditor";
import type { Stadium } from "../types";

export function StadiumsPage() {
  const [selected, setSelected] = useState<Stadium | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const columns: DataTableColumn<Stadium>[] = [
    { key: "name", header: "Name", render: (row) => <span className="font-medium text-white">{row.name}</span> },
    { key: "city", header: "City", render: (row) => cities.find((city) => city.id === row.cityId)?.name ?? "—" },
    { key: "capacity", header: "Capacity", render: (row) => row.capacity?.toLocaleString() ?? "—" },
    { key: "owner", header: "Owner", render: (row) => teams.find((team) => team.id === row.ownerClubId)?.name ?? "—" },
  ];

  if (selected) {
    return <StadiumEditor stadium={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-6">
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">STADIUMS</div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Stadiums</h1>
          <p className="mt-2 text-sm text-slate-500">Manage stadiums and their match-day infrastructure.</p>
        </div>
        <button type="button" onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-lg bg-emerald-400/10 px-3.5 py-2.5 text-sm font-medium text-emerald-200 hover:bg-emerald-400/15">
          <Plus size={15} /> Create Stadium
        </button>
      </div>

      <DataTable columns={columns} rows={stadiums} onRowClick={setSelected} />

      {showCreate && (
        <div className="rounded-2xl border border-white/10 bg-[#121820] p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">New Stadium</h2>
            <button type="button" onClick={() => setShowCreate(false)} className="text-xs text-slate-500 hover:text-slate-300">Cancel</button>
          </div>
          <p className="text-sm text-slate-500">
            The same StadiumEditor will be used for creation once persistence is connected.
          </p>
        </div>
      )}
    </div>
  );
}