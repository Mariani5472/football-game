import { useState } from "react";
import { Plus } from "lucide-react";

import { DataTable, type DataTableColumn } from "../../../shared/components";
import { CompetitionEditor } from "../components/CompetitionEditor";
import { competitions } from "../data/competitions.data";
import type { Competition } from "../types";

export function CompetitionsPage() {
  const [selectedCompetition, setSelectedCompetition] = useState<Competition | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const columns: DataTableColumn<Competition>[] = [
    { key: "name", header: "Competition", render: (row) => <span className="font-medium text-white">{row.name}</span> },
    { key: "type", header: "Type", render: (row) => row.type },
    { key: "seasons", header: "Seasons", render: (row) => String(row.seasons.length) },
    { key: "stages", header: "Stages", render: (row) => String(row.seasons.reduce((total, season) => total + season.stages.length, 0)) },
  ];

  if (selectedCompetition) {
    return <CompetitionEditor competition={selectedCompetition} onBack={() => setSelectedCompetition(null)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-6">
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">COMPETITIONS</div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Competitions</h1>
          <p className="mt-2 text-sm text-slate-500">Define competitions, seasons, participants and stages.</p>
        </div>
        <button type="button" onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-lg bg-emerald-400/10 px-3.5 py-2.5 text-sm font-medium text-emerald-200 hover:bg-emerald-400/15">
          <Plus size={15} /> Create Competition
        </button>
      </div>

      <DataTable columns={columns} rows={competitions} onRowClick={setSelectedCompetition} />

      {showCreate && (
        <div className="rounded-2xl border border-white/10 bg-[#121820] p-6">
          <CompetitionEditor onBack={() => setShowCreate(false)} />
        </div>
      )}
    </div>
  );
}
