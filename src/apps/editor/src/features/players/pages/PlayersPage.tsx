import { useState } from "react";
import { Plus } from "lucide-react";

import { DataTable, type DataTableColumn } from "../../../shared/components";
import { people } from "../../people/data/people.data";
import { PlayerEditor } from "../components/PlayerEditor";
import { players } from "../data/players.data";
import type { Player } from "../types";

export function PlayersPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  const positionNames: Record<number, string> = {
    1: "Goalkeeper",
    2: "Centre Back",
    3: "Full Back",
    4: "Defensive Midfielder",
    5: "Central Midfielder",
    6: "Attacking Midfielder",
    7: "Winger",
    8: "Striker",
  };

  const columns: DataTableColumn<Player>[] = [
    {
      key: "name",
      header: "Name",
      render: (row) => (
        <span className="font-medium text-white">
          {people.find((person) => person.id === row.personId)?.fullName ?? "Person #" + row.personId}
        </span>
      ),
    },
    {
      key: "positions",
      header: "Positions",
      render: (row) => row.positionIds.map((id) => positionNames[id] ?? "Position #" + id).join(", "),
    },
    {
      key: "value",
      header: "Estimated Value",
      render: (row) => row.estimatedValue ? "€" + row.estimatedValue.toLocaleString("en-US") : "—",
    },
  ];

  if (selectedPlayer) {
    return <PlayerEditor player={selectedPlayer} onBack={() => setSelectedPlayer(null)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-6">
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">PLAYERS</div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Players</h1>
          <p className="mt-2 text-sm text-slate-500">
            Player data is a specialization of Person, linked by person_id.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-400/10 px-3.5 py-2.5 text-sm font-medium text-emerald-200 hover:bg-emerald-400/15"
        >
          <Plus size={15} />
          Create Player
        </button>
      </div>

      <DataTable columns={columns} rows={players} onRowClick={setSelectedPlayer} />

      {showCreate && (
        <div className="rounded-2xl border border-white/10 bg-[#121820] p-6">
          <PlayerEditor onBack={() => setShowCreate(false)} />
        </div>
      )}
    </div>
  );
}
