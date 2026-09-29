import { useState } from "react";
import { Plus } from "lucide-react";

import { DataTable, type DataTableColumn } from "../../../shared/components";
import { cities, countries, languages } from "../../world/data/world.data";
import { PersonEditor } from "../components/PersonEditor";
import { people } from "../data/people.data";
import type { Person } from "../types";

export function PeoplePage() {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);

  const columns: DataTableColumn<Person>[] = [
    {
      key: "name",
      header: "Name",
      render: (row) => <span className="font-medium text-white">{row.fullName}</span>,
    },
    { key: "birthDate", header: "Birth Date", render: (row) => row.birthDate ?? "—" },
    {
      key: "nationality",
      header: "Nationality",
      render: (row) => countries.find((country) => country.id === row.nationalityId)?.name ?? "—",
    },
    {
      key: "birthCity",
      header: "Birth City",
      render: (row) => cities.find((city) => city.id === row.birthCityId)?.name ?? "—",
    },
    {
      key: "languages",
      header: "Languages",
      render: (row) =>
        row.languageIds
          .map((id) => languages.find((language) => language.id === id)?.name)
          .filter(Boolean)
          .join(", ") || "—",
    },
  ];

  if (selectedPerson) {
    return <PersonEditor person={selectedPerson} onBack={() => setSelectedPerson(null)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-6">
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">PEOPLE</div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">People</h1>
          <p className="mt-2 text-sm text-slate-500">
            Person is the base identity shared by players and other people.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-400/10 px-3.5 py-2.5 text-sm font-medium text-emerald-200 hover:bg-emerald-400/15"
        >
          <Plus size={15} />
          Create Person
        </button>
      </div>

      <DataTable columns={columns} rows={people} onRowClick={setSelectedPerson} />

      {showCreate && (
        <div className="rounded-2xl border border-white/10 bg-[#121820] p-6">
          <PersonEditor onBack={() => setShowCreate(false)} />
        </div>
      )}
    </div>
  );
}
