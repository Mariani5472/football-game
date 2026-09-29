import { useMemo, useState } from "react";
import { EntityForm, EntityPicker, Tabs } from "../../../shared/components";
import type { DataTableColumn, EntityFormField } from "../../../shared/components";
import { WorldEntityListPage } from "../components/WorldEntityListPage";
import {
  cities,
  climates,
  continents,
  countries,
  languages,
  regions,
} from "../data/world.data";
import type { City, Climate, Continent, Country, Language, Region } from "../types";

interface EditPanelProps<T extends { id: number; name: string }> {
  title: string;
  entity: T;
  fields: EntityFormField[];
  values: Record<string, string | number | undefined>;
  onChange: (name: string, value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
}

function EditPanel<T extends { id: number; name: string }>({
  title,
  entity,
  fields,
  values,
  onChange,
  onSubmit,
  onCancel,
  children,
}: EditPanelProps<T>) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
      <div className="mb-6 flex items-start justify-between gap-6">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
            EDIT
          </div>
          <h2 className="mt-2 text-lg font-semibold text-white">
            {title}: {entity.name}
          </h2>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-400 hover:bg-white/[0.04]"
        >
          Back
        </button>
      </div>

      <EntityForm
        fields={fields}
        values={values}
        onChange={onChange}
        onSubmit={onSubmit}
        submitLabel="Save changes"
      >
        {children}
      </EntityForm>
    </div>
  );
}

function useMockEdit<T extends { id: number; name: string }>(entity: T) {
  const [values, setValues] = useState<Record<string, string | number | undefined>>({
    name: entity.name,
    shortName: entity.shortName ?? "",
  });

  const setValue = (name: string, value: string) =>
    setValues((current) => ({ ...current, [name]: value }));

  return { values, setValue };
}

export function ContinentsPage() {
  const [selected, setSelected] = useState<Continent | null>(null);
  const { values, setValue } = useMockEdit(selected ?? continents[0]);

  const columns: DataTableColumn<Continent>[] = [
    { key: "name", header: "Name", render: (row) => <span className="font-medium text-white">{row.name}</span> },
    { key: "shortName", header: "Short Name", render: (row) => row.shortName ?? "—" },
  ];

  if (selected) {
    return (
      <EditPanel
        title="Continent"
        entity={selected}
        fields={[
          { name: "name", label: "Name", required: true },
          { name: "shortName", label: "Short Name" },
          { name: "continentalName", label: "Continental Name" },
        ]}
        values={values}
        onChange={setValue}
        onSubmit={() => setSelected({ ...selected, name: String(values.name), shortName: String(values.shortName || "") })}
        onCancel={() => setSelected(null)}
      />
    );
  }

  return (
    <WorldEntityListPage
      title="Continents"
      description="Manage the geographic roots of the world."
      rows={continents}
      columns={columns}
      onRowClick={setSelected}
    />
  );
}

export function CountriesPage() {
  const [selected, setSelected] = useState<Country | null>(null);
  const { values, setValue } = useMockEdit(selected ?? countries[0]);

  const columns: DataTableColumn<Country>[] = [
    { key: "name", header: "Name", render: (row) => <span className="font-medium text-white">{row.name}</span> },
    { key: "shortName", header: "Short Name", render: (row) => row.shortName ?? "—" },
    { key: "continent", header: "Continent", render: (row) => continents.find((item) => item.id === row.continentId)?.name ?? "—" },
  ];

  if (selected) {
    return (
      <EditPanel
        title="Country"
        entity={selected}
        fields={[
          { name: "name", label: "Name", required: true },
          { name: "shortName", label: "Short Name" },
        ]}
        values={values}
        onChange={setValue}
        onSubmit={() => setSelected({ ...selected, name: String(values.name), shortName: String(values.shortName || "") })}
        onCancel={() => setSelected(null)}
      >
        <div className="grid gap-5 md:grid-cols-2">
          <EntityPicker
            label="Continent"
            value={selected.continentId ?? ""}
            options={continents.map((item) => ({ id: item.id, label: item.name }))}
            onChange={(value) => setSelected({ ...selected, continentId: Number(value) })}
          />
        </div>
      </EditPanel>
    );
  }

  return (
    <WorldEntityListPage
      title="Countries"
      description="Countries are domain screens, not isolated database tables."
      rows={countries}
      columns={columns}
      onRowClick={setSelected}
    />
  );
}

export function RegionsPage() {
  const [selected, setSelected] = useState<Region | null>(null);
  const columns: DataTableColumn<Region>[] = [
    { key: "name", header: "Name", render: (row) => <span className="font-medium text-white">{row.name}</span> },
    { key: "shortName", header: "Short Name", render: (row) => row.shortName ?? "—" },
    { key: "country", header: "Country", render: (row) => countries.find((item) => item.id === row.countryId)?.name ?? "—" },
  ];

  return (
    <WorldEntityListPage
      title="Regions"
      description="Organize the world into regional structures used by cities and rules."
      rows={regions}
      columns={columns}
      onRowClick={setSelected}
    />
  );
}

export function LanguagesPage() {
  const [selectedTab, setSelectedTab] = useState<"languages" | "families">("languages");
  const [selected, setSelected] = useState<Language | null>(null);
  const columns: DataTableColumn<Language>[] = [
    { key: "name", header: "Name", render: (row) => <span className="font-medium text-white">{row.name}</span> },
    { key: "shortName", header: "Short Name", render: (row) => row.shortName ?? "—" },
  ];

  return (
    <div className="space-y-6">
      <Tabs
        activeTab={selectedTab}
        onChange={setSelectedTab}
        items={[
          {
            id: "languages",
            label: "Languages",
            content: (
              <WorldEntityListPage
                title="Languages"
                description="Languages belong to the world model and are reused by nations, regions and cities."
                rows={languages}
                columns={columns}
                onRowClick={setSelected}
              />
            ),
          },
          {
            id: "families",
            label: "Families",
            content: (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-sm text-slate-500">
                Language families can be added here when their editor domain is introduced.
              </div>
            ),
          },
        ]}
      />
      {selected && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-sm text-slate-300">
          Selected language: <strong className="text-white">{selected.name}</strong>
        </div>
      )}
    </div>
  );
}

export function ClimatesPage() {
  const columns: DataTableColumn<Climate>[] = [
    { key: "name", header: "Name", render: (row) => <span className="font-medium text-white">{row.name}</span> },
    { key: "shortName", header: "Short Name", render: (row) => row.shortName ?? "—" },
  ];

  return (
    <WorldEntityListPage
      title="Climates"
      description="Define climate types referenced by regions and cities."
      rows={climates}
      columns={columns}
    />
  );
}

export function CitiesPage() {
  const columns: DataTableColumn<City>[] = [
    { key: "name", header: "Name", render: (row) => <span className="font-medium text-white">{row.name}</span> },
    { key: "country", header: "Country", render: (row) => countries.find((item) => item.id === row.countryId)?.name ?? "—" },
    { key: "region", header: "Region", render: (row) => regions.find((item) => item.id === row.regionId)?.name ?? "—" },
    { key: "climate", header: "Climate", render: (row) => climates.find((item) => item.id === row.climateId)?.name ?? "—" },
  ];

  return (
    <WorldEntityListPage
      title="Cities"
      description="Cities combine geography, region, climate and language relationships."
      rows={cities}
      columns={columns}
    />
  );
}

void useMemo;
