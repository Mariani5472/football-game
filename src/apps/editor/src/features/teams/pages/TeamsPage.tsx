import { useState } from "react";
import { Plus } from "lucide-react";



import { countries, cities } from "../../world/data/world.data";
import { teams } from "../data/teams.data";
import { ClubEditor } from "../components/ClubEditor";
import { TeamTypeSelector } from "../components/TeamTypeSelector";
import { useTeamEditor } from "../hooks/useTeamEditor";
import type { Team, TeamKind } from "../types";
import { DataTable, DataTableColumn, EntityForm } from "../../../shared/components";

export function TeamsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedClub, setSelectedClub] = useState<Team | null>(null);

  const columns: DataTableColumn<Team>[] = [
    {
      key: "name",
      header: "Name",
      render: (row) => (
        <span className="font-medium text-white">
          {row.name}
        </span>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (row) =>
        row.name === "Brazil"
          ? "National Team"
          : "Club",
    },
    {
      key: "nation",
      header: "Nation",
      render: (row) =>
        countries.find(
          (country) => country.id === row.nationId,
        )?.name ?? "—",
    },
  ];

  if (selectedClub) {
    return (
      <ClubEditor
        teamName={selectedClub.name}
        onBack={() => setSelectedClub(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-6">
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
            TEAMS
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Teams
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Teams share a common identity and can be clubs or national teams.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-400/10 px-3.5 py-2.5 text-sm font-medium text-emerald-200 hover:bg-emerald-400/15"
        >
          <Plus size={15} />
          Create Team
        </button>
      </div>

      <DataTable
        columns={columns}
        rows={teams}
        onRowClick={(row) => {
          if (row.name !== "Brazil") {
            setSelectedClub(row);
          }
        }}
      />

      {showCreate && (
        <CreateTeamPanel
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}

function CreateTeamPanel({
  onClose,
}: {
  onClose: () => void;
}) {
  const editor = useTeamEditor();

  const fields = [
    {
      name: "name",
      label: "Name",
      required: true,
    },
    {
      name: "shortName",
      label: "Short Name",
      required: true,
    },
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-[#121820] p-6">
      <div className="mb-6 flex items-start justify-between gap-6">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
            CREATE TEAM
          </div>

          <h2 className="mt-2 text-lg font-semibold text-white">
            New Team
          </h2>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-400 hover:bg-white/[0.04]"
        >
          Cancel
        </button>
      </div>

      <div className="space-y-6">
        <TeamTypeSelector
          value={editor.kind}
          onChange={editor.setKind}
        />

        <EntityForm
          fields={fields}
          values={{
            name: editor.draft.name,
            shortName: editor.draft.shortName,
          }}
          onChange={(name, value) => {
            if (name === "name" || name === "shortName") {
              editor.setValue(name, value);
            }
          }}
          onSubmit={onClose}
          submitLabel={
            editor.kind === "CLUB"
              ? "Create Club"
              : "Create National Team"
          }
        />
      </div>
    </div>
  );
}

export function TeamEditorPreview({
  team,
}: {
  team: Team;
}) {
  return team.name === "Brazil" ? (
    <NationalTeamEditor
      teamName={team.name}
    />
  ) : (
    <ClubEditor
      teamName={team.name}
      onBack={() => undefined}
    />
  );
}

function NationalTeamEditor({
  teamName,
}: {
  teamName: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
        TEAM / NATIONAL TEAM
      </div>
      <h2 className="mt-2 text-xl font-semibold text-white">
        {teamName}
      </h2>
      <p className="mt-2 text-sm text-slate-500">
        National team editor will follow the same team identity boundary.
      </p>
    </div>
  );
}