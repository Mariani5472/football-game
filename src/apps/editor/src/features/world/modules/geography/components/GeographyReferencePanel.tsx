import { CrudEntityPage, type CrudEntityConfig } from "../../../../../shared/components/crud/CrudEntityPage";

export type GeographyReferenceKey =
  | "currency"
  | "nationality_method"
  | "nation_development_state"
  | "language_family"
  | "language_group"
  | "language_subgroup"
  | "language"
  | "climate"
  | "weekday";

const configs: Record<GeographyReferenceKey, CrudEntityConfig> = {
  currency: {
    table: "currency",
    title: "Currencies",
    description: "Reference currencies used by nations.",
    searchColumns: ["name"],
    columns: [
      { key: "name", header: "Name" },
      { key: "exchange_rate", header: "Exchange Rate" },
    ],
    fields: [
      { name: "name", label: "Name", required: true },
      { name: "exchange_rate", label: "Exchange Rate", type: "number" },
    ],
  },
  nationality_method: {
    table: "nationality_method",
    title: "Nationality Methods",
    description: "Rules used to grant nationality.",
    searchColumns: ["name"],
    columns: [{ key: "name", header: "Name" }],
    fields: [{ name: "name", label: "Name", required: true }],
  },
  nation_development_state: {
    table: "nation_development_state",
    title: "Development States",
    description: "Development classifications for nations.",
    searchColumns: ["name"],
    columns: [
      { key: "name", header: "Name" },
      { key: "index_value", header: "Index" },
    ],
    fields: [
      { name: "name", label: "Name", required: true },
      { name: "index_value", label: "Index", type: "number" },
    ],
  },
  language_family: {
    table: "language_family",
    title: "Language Families",
    description: "Top-level language families.",
    searchColumns: ["name"],
    columns: [{ key: "name", header: "Name" }],
    fields: [{ name: "name", label: "Name", required: true }],
  },
  language_group: {
    table: "language_group",
    title: "Language Groups",
    description: "Language groups nested under families.",
    searchColumns: ["name"],
    columns: [{ key: "name", header: "Name" }],
    fields: [
      { name: "family_id", label: "Family", relation: { table: "language_family" } },
      { name: "name", label: "Name", required: true },
    ],
  },
  language_subgroup: {
    table: "language_subgroup",
    title: "Language Subgroups",
    description: "Language subgroups nested under groups.",
    searchColumns: ["name"],
    columns: [{ key: "name", header: "Name" }],
    fields: [
      { name: "group_id", label: "Group", relation: { table: "language_group" } },
      { name: "name", label: "Name", required: true },
    ],
  },
  language: {
    table: "language",
    title: "Languages",
    description: "World language definitions.",
    searchColumns: ["name"],
    columns: [{ key: "name", header: "Name" }],
    fields: [
      { name: "name", label: "Name", required: true },
      { name: "influence", label: "Influence", type: "number" },
      { name: "learning_difficulty", label: "Learning Difficulty", type: "number" },
      { name: "family_id", label: "Family", relation: { table: "language_family" } },
      { name: "group_id", label: "Group", relation: { table: "language_group" } },
      { name: "subgroup_id", label: "Subgroup", relation: { table: "language_subgroup" } },
    ],
  },
  climate: {
    table: "climate",
    title: "Climates",
    description: "Climate definitions used by cities and regions.",
    searchColumns: ["name"],
    columns: [
      { key: "name", header: "Name" },
      { key: "short_name", header: "Short Name" },
    ],
    fields: [
      { name: "name", label: "Name", required: true },
      { name: "short_name", label: "Short Name" },
    ],
  },
  weekday: {
    table: "weekday",
    title: "Weekdays",
    description: "Weekday reference data.",
    searchColumns: ["name"],
    columns: [
      { key: "name", header: "Name" },
      { key: "index_value", header: "Index" },
      { key: "is_weekend", header: "Weekend" },
    ],
    fields: [
      { name: "name", label: "Name", required: true },
      { name: "index_value", label: "Index", type: "number", required: true },
      { name: "is_weekend", label: "Weekend", type: "boolean", required: true },
    ],
  },
};

export const geographyReferenceConfigs = configs;

export function GeographyReferencePanel({
  table,
  onTableChange,
}: {
  table: GeographyReferenceKey;
  onTableChange: (table: GeographyReferenceKey) => void;
}) {
  const config = configs[table];

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-600">
          Reference data
        </span>
        <select
          value={table}
          onChange={event => onTableChange(event.target.value as GeographyReferenceKey)}
          className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-200"
        >
          {(Object.entries(configs) as Array<[GeographyReferenceKey, CrudEntityConfig]>).map(([key, item]) => (
            <option key={key} value={key} className="bg-[#121820]">
              {item.title}
            </option>
          ))}
        </select>
      </div>
      <CrudEntityPage config={config} />
    </section>
  );
}
