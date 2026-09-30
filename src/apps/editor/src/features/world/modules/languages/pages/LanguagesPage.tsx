import { useMemo, useState } from "react";
import { DataTable, CrudEntityPage, Tabs, EntityPicker, type DataTableColumn } from "../../../../../shared/components";
import { useEntityQuery } from "../../../../../shared/hooks/useEntityApi";
import type { EntityRow } from "../../../../../shared/api/editorApi";
import { LanguageHierarchy } from "../components/LanguageHierarchy";

export function LanguagesPage() {
  const [activeTab, setActiveTab] = useState<"languages" | "hierarchy">("languages");
  const [selected, setSelected] = useState<EntityRow | null>(null);

  const languages = useEntityQuery("language", { page: 1, pageSize: 100, orderBy: "name", orderDirection: "ASC" });
  const families = useEntityQuery("language_family", { page: 1, pageSize: 100, orderBy: "name", orderDirection: "ASC" });
  const groups = useEntityQuery("language_group", { page: 1, pageSize: 100, orderBy: "name", orderDirection: "ASC" });
  const subgroups = useEntityQuery("language_subgroup", { page: 1, pageSize: 100, orderBy: "name", orderDirection: "ASC" });

  const columns = useMemo<DataTableColumn<EntityRow>[]>(() => [
    { key: "name", header: "Language", render: row => <span className="font-medium text-white">{String(row.name ?? "—")}</span> },
    { key: "family_id", header: "Family", render: row => String(row.family_name ?? row.family_id ?? "—") },
    { key: "group_id", header: "Group", render: row => String(row.group_name ?? row.group_id ?? "—") },
    { key: "subgroup_id", header: "Subgroup", render: row => String(row.subgroup_name ?? row.subgroup_id ?? "—") },
    { key: "influence", header: "Influence", render: row => String(row.influence ?? "—") },
    { key: "learning_difficulty", header: "Difficulty", render: row => String(row.learning_difficulty ?? "—") },
  ], []);

  const rows = useMemo(() => {
    const familyMap = new Map(families.rows.map(row => [String(row.id), String(row.name ?? row.id)]));
    const groupMap = new Map(groups.rows.map(row => [String(row.id), String(row.name ?? row.id)]));
    const subgroupMap = new Map(subgroups.rows.map(row => [String(row.id), String(row.name ?? row.id)]));
    return languages.rows.map(row => ({
      ...row,
      family_name: familyMap.get(String(row.family_id)),
      group_name: groupMap.get(String(row.group_id)),
      subgroup_name: subgroupMap.get(String(row.subgroup_id)),
    }));
  }, [languages.rows, families.rows, groups.rows, subgroups.rows]);

  return (
    <Tabs
      activeTab={activeTab}
      onChange={setActiveTab}
      items={[
        {
          id: "languages",
          label: "Languages",
          content: (
            <div className="space-y-5">
              <div>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">WORLD</div>
                <h1 className="text-2xl font-semibold tracking-tight text-white">Languages</h1>
                <p className="mt-2 text-sm text-slate-500">Manage language definitions from world.db.</p>
              </div>
              <DataTable
                columns={columns}
                rows={rows}
                loading={languages.loading || families.loading || groups.loading || subgroups.loading}
                error={languages.error ?? families.error ?? groups.error ?? subgroups.error}
                onRowClick={setSelected}
              />
              {selected && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">SELECTED LANGUAGE</div>
                  <div className="mt-3 text-lg font-semibold text-white">{String(selected.name)}</div>
                  <div className="mt-1 text-sm text-slate-500">
                    {String(selected.family_name ?? "—")} · {String(selected.group_name ?? "—")} · {String(selected.subgroup_name ?? "—")}
                  </div>
                </div>
              )}
              <CrudEntityPage config={{
                table: "language",
                title: "Language CRUD",
                description: "Create, edit and delete language records.",
                searchColumns: ["name"],
                columns: [{ key: "name", header: "Language" }],
                fields: [
                  { name: "name", label: "Name", required: true },
                  { name: "influence", label: "Influence", type: "number" },
                  { name: "learning_difficulty", label: "Learning Difficulty", type: "number" },
                  { name: "family_id", label: "Family", relation: { table: "language_family" } },
                  { name: "group_id", label: "Group", relation: { table: "language_group" } },
                  { name: "subgroup_id", label: "Subgroup", relation: { table: "language_subgroup" } },
                ],
              }} />
            </div>
          ),
        },
        {
          id: "hierarchy",
          label: "Hierarchy",
          content: (
            <LanguageHierarchy
              families={families.rows.map(row => ({ id: Number(row.id), name: String(row.name ?? row.id) }))}
              groups={groups.rows.map(row => ({ id: Number(row.id), name: String(row.name ?? row.id), familyId: Number(row.family_id) }))}
              subgroups={subgroups.rows.map(row => ({ id: Number(row.id), name: String(row.name ?? row.id), groupId: Number(row.group_id) }))}
              languages={languages.rows.map(row => ({
                id: Number(row.id),
                name: String(row.name ?? row.id),
                familyId: row.family_id == null ? undefined : Number(row.family_id),
                groupId: row.group_id == null ? undefined : Number(row.group_id),
                subgroupId: row.subgroup_id == null ? undefined : Number(row.subgroup_id),
              }))}
              onSelectLanguage={setSelected}
            />
          ),
        },
      ]}
    />
  );
}
