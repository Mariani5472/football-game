import { useState } from "react";

import {
  Tabs,
} from "../../../../../shared/components";

import type {
  DataTableColumn,
} from "../../../../../shared/components";

import {
  DataTable,
} from "../../../../../shared/components";

import {
  languages,
  languageFamilies,
  languageGroups,
  languageSubgroups,
} from "../../../data/world.data";

import type {
  Language,
} from "../../../types";

import { LanguageHierarchy } from "../components/LanguageHierarchy";

export function LanguagesPage() {
  const [activeTab, setActiveTab] =
    useState<
      "languages" | "hierarchy"
    >("languages");

  const [selected, setSelected] =
    useState<Language | null>(null);

  const columns: DataTableColumn<Language>[] =
    [
      {
        key: "name",
        header: "Language",
        render: (row) => (
          <span className="font-medium text-white">
            {row.name}
          </span>
        ),
      },

      {
        key: "family",
        header: "Family",
        render: (row) =>
          languageFamilies.find(
            (family) =>
              family.id ===
              row.familyId,
          )?.name ?? "—",
      },

      {
        key: "group",
        header: "Group",
        render: (row) =>
          languageGroups.find(
            (group) =>
              group.id ===
              row.groupId,
          )?.name ?? "—",
      },

      {
        key: "subgroup",
        header: "Subgroup",
        render: (row) =>
          languageSubgroups.find(
            (subgroup) =>
              subgroup.id ===
              row.subgroupId,
          )?.name ?? "—",
      },
    ];

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
          WORLD
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Languages
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Manage language definitions and their hierarchy.
        </p>
      </div>

      <Tabs
        activeTab={activeTab}
        onChange={setActiveTab}
        items={[
          {
            id: "languages",
            label: "Languages",
            content: (
              <DataTable
                columns={columns}
                rows={languages}
                onRowClick={setSelected}
              />
            ),
          },

          {
            id: "hierarchy",
            label: "Hierarchy",
            content: (
              <LanguageHierarchy
                families={
                  languageFamilies
                }
                groups={
                  languageGroups
                }
                subgroups={
                  languageSubgroups
                }
                languages={
                  languages
                }
                onSelectLanguage={
                  setSelected
                }
              />
            ),
          },
        ]}
      />

      {selected && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
            SELECTED LANGUAGE
          </div>

          <div className="mt-3 text-lg font-semibold text-white">
            {selected.name}
          </div>

          <div className="mt-1 text-sm text-slate-500">
            {languageFamilies.find(
              (family) =>
                family.id ===
                selected.familyId,
            )?.name}
            {" · "}
            {languageGroups.find(
              (group) =>
                group.id ===
                selected.groupId,
            )?.name}
            {" · "}
            {languageSubgroups.find(
              (subgroup) =>
                subgroup.id ===
                selected.subgroupId,
            )?.name}
          </div>
        </div>
      )}
    </div>
  );
}