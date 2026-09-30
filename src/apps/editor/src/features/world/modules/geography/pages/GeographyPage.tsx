import { useMemo, useState } from "react";
import { Plus, RefreshCw, Search } from "lucide-react";
import {
  DataTable,
  DeleteDialog,
  EntityForm,
  EntityPicker,
  type DataTableColumn,
  type EntityFormValue,
} from "../../../../../shared/components";
import { editorApi, type EntityRow } from "../../../../../shared/api/editorApi";
import { useEntityQuery } from "../../../../../shared/hooks/useEntityApi";
import { GeographyBreadcrumb } from "../components/GeographyBreadcrumb";
import { GeographyTree } from "../components/GeographyTree";
import { useGeography } from "../hooks/useGeography";
import { LanguageRelationshipEditor, RelationList } from "../components/GeographyRelations";
import type { GeographyTreeNode, GeographyEntityKind } from "../types";

type Field = {
  name: string;
  label: string;
  type?: "text" | "number" | "boolean";
  required?: boolean;
  min?: number;
  max?: number;
  step?: number | string;
  relation?: string;
};

type Spec = { table: string; label: string; fields: Field[] };

const specs: Record<GeographyEntityKind, Spec> = {
  federation: { table: "federation", label: "Federation", fields: [
    { name: "name", label: "Name", required: true },
    { name: "short_name", label: "Short Name" },
    { name: "regional_strength", label: "Regional Strength", type: "number", min: 0 },
    { name: "primary_color", label: "Primary Color" },
    { name: "secondary_color", label: "Secondary Color" },
    { name: "tertiary_color", label: "Tertiary Color" },
  ]},
  continent: { table: "continent", label: "Continent", fields: [
    { name: "name", label: "Name", required: true },
    { name: "short_name", label: "Short Name" },
    { name: "continental_name", label: "Continental Name" },
    { name: "federation_id", label: "Federation", relation: "federation" },
  ]},
  "continent-region": { table: "continent_region", label: "Continent Region", fields: [
    { name: "continent_id", label: "Continent", relation: "continent", required: true },
    { name: "name", label: "Name", required: true },
    { name: "short_name", label: "Short Name" },
  ]},
  country: { table: "nation", label: "Country", fields: [
    { name: "name", label: "Name", required: true },
    { name: "short_name", label: "Short Name" },
    { name: "continent_region_id", label: "Continent Region", relation: "continent_region", required: true },
    { name: "currency_id", label: "Currency", relation: "currency" },
    { name: "national_stadium_id", label: "National Stadium", type: "number", min: 1 },
    { name: "economic_factor", label: "Economic Factor", type: "number", step: "0.01" },
    { name: "years_to_naturalization", label: "Years to Naturalization", type: "number", min: 0 },
    { name: "nationality_method_id", label: "Nationality Method", relation: "nationality_method" },
    { name: "development_state_id", label: "Development State", relation: "nation_development_state" },
  ]},
  "nation-region": { table: "nation_region", label: "Nation Region", fields: [
    { name: "nation_id", label: "Country", relation: "nation", required: true },
    { name: "name", label: "Name", required: true },
    { name: "short_name", label: "Short Name" },
    { name: "population", label: "Population", type: "number", min: 0 },
  ]},
  city: { table: "city", label: "City", fields: [
    { name: "nation_id", label: "Country", relation: "nation", required: true },
    { name: "nation_region_id", label: "Nation Region", relation: "nation_region" },
    { name: "name", label: "Name", required: true },
    { name: "attraction", label: "Attraction", type: "number", min: 0 },
    { name: "population", label: "Population", type: "number", min: 0 },
    { name: "latitude", label: "Latitude", type: "number", min: -90, max: 90, step: "0.000001" },
    { name: "longitude", label: "Longitude", type: "number", min: -180, max: 180, step: "0.000001" },
    { name: "altitude", label: "Altitude", type: "number" },
    { name: "climate_id", label: "Climate", relation: "climate" },
  ]},
};

const childKind: Partial<Record<GeographyEntityKind, GeographyEntityKind>> = {
  federation: "continent", continent: "continent-region", "continent-region": "country",
  country: "nation-region", "nation-region": "city",
};

const filterItems: Array<[string, GeographyEntityKind | "all"]> = [
  ["All", "all"], ["Federations", "federation"], ["Continents", "continent"],
  ["Continent Regions", "continent-region"], ["Countries", "country"],
  ["Nation Regions", "nation-region"], ["Cities", "city"],
];

function normalize(value: EntityFormValue, field: Field) {
  if (value === "" || value === undefined) return null;
  if (field.type === "number") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (field.type === "boolean") return Boolean(value);
  return value;
}

function initialValues(spec: Spec, parent?: GeographyTreeNode) {
  const values: Record<string, EntityFormValue> = {};
  for (const field of spec.fields) values[field.name] = null;
  if (!parent) return values;
  if (spec.table === "continent") values.federation_id = parent.entityId;
  if (spec.table === "continent_region") values.continent_id = parent.entityId;
  if (spec.table === "nation") values.continent_region_id = parent.entityId;
  if (spec.table === "nation_region") values.nation_id = parent.entityId;
  if (spec.table === "city") {
    values.nation_id = parent.row.nation_id ?? null;
    values.nation_region_id = parent.entityId;
  }
  return values;
}

export function GeographyPage() {
  const geography = useGeography();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<GeographyEntityKind | "all">("all");
  const [editing, setEditing] = useState<GeographyTreeNode | null>(null);
  const [creating, setCreating] = useState<{ kind: GeographyEntityKind; parent?: GeographyTreeNode } | null>(null);
  const [values, setValues] = useState<Record<string, EntityFormValue>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<GeographyTreeNode | null>(null);

  const selectedNode = geography.selectedNode;
  const formKind = editing?.kind ?? creating?.kind;
  const formSpec = formKind ? specs[formKind] : null;

  const relationTable =
    selectedNode?.kind === "country" ? "nation_language" :
    selectedNode?.kind === "nation-region" ? "nation_region_language" :
    selectedNode?.kind === "city" ? "city_language" : null;
  const relationOwner =
    selectedNode?.kind === "country" ? "nation_id" :
    selectedNode?.kind === "nation-region" ? "nation_region_id" : "city_id";

  const relationQuery = useEntityQuery(relationTable ?? "nation_language", { page: 1, pageSize: 100, orderBy: "id", orderDirection: "ASC" });
  const languageQuery = useEntityQuery("language", { page: 1, pageSize: 100, orderBy: "name", orderDirection: "ASC" });
  const climateQuery = useEntityQuery("climate", { page: 1, pageSize: 100, orderBy: "name", orderDirection: "ASC" });
  const altNameQuery = useEntityQuery("continent_alt_name", { page: 1, pageSize: 100, orderBy: "name", orderDirection: "ASC" });
  const nativeTreatmentQuery = useEntityQuery("nation_native_treatment", { page: 1, pageSize: 100, orderBy: "id", orderDirection: "ASC" });
  const regionClimateQuery = useEntityQuery("climate_nation_region", { page: 1, pageSize: 100, orderBy: "id", orderDirection: "ASC" });

  const allRows = useMemo(() => {
    const rows: GeographyTreeNode[] = [];
    const walk = (node: GeographyTreeNode) => { rows.push(node); node.children.forEach(walk); };
    geography.tree.forEach(walk);
    return rows;
  }, [geography.tree]);

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase();
    return allRows.filter(node => {
      const matchesType = filter === "all" || node.kind === filter;
      const matchesSearch = !search || node.label.toLowerCase().includes(search) || String(node.row.short_name ?? "").toLowerCase().includes(search);
      return matchesType && matchesSearch;
    });
  }, [allRows, filter, query]);

  const relationRows = useMemo(
    () => selectedNode ? relationQuery.rows.filter(row => Number(row[relationOwner]) === Number(selectedNode.entityId)) : [],
    [relationQuery.rows, relationOwner, selectedNode?.entityId],
  );
  const altNames = useMemo(() => selectedNode?.kind === "continent" ? altNameQuery.rows.filter(row => Number(row.continent_id) === Number(selectedNode.entityId)) : [], [altNameQuery.rows, selectedNode?.entityId, selectedNode?.kind]);
  const nativeTreatments = useMemo(() => selectedNode?.kind === "country" ? nativeTreatmentQuery.rows.filter(row => Number(row.root_nation_id) === Number(selectedNode.entityId)) : [], [nativeTreatmentQuery.rows, selectedNode?.entityId, selectedNode?.kind]);
  const regionalClimates = useMemo(() => selectedNode?.kind === "nation-region" ? regionClimateQuery.rows.filter(row => Number(row.nation_region_id) === Number(selectedNode.entityId)) : [], [regionClimateQuery.rows, selectedNode?.entityId, selectedNode?.kind]);

  const referenceQueries = {
    currency: useEntityQuery("currency", { page: 1, pageSize: 100, orderBy: "name", orderDirection: "ASC" }),
    nationality_method: useEntityQuery("nationality_method", { page: 1, pageSize: 100, orderBy: "name", orderDirection: "ASC" }),
    nation_development_state: useEntityQuery("nation_development_state", { page: 1, pageSize: 100, orderBy: "name", orderDirection: "ASC" }),
    language_family: useEntityQuery("language_family", { page: 1, pageSize: 100, orderBy: "name", orderDirection: "ASC" }),
    language_group: useEntityQuery("language_group", { page: 1, pageSize: 100, orderBy: "name", orderDirection: "ASC" }),
    language_subgroup: useEntityQuery("language_subgroup", { page: 1, pageSize: 100, orderBy: "name", orderDirection: "ASC" }),
    language: languageQuery,
    climate: climateQuery,
    weekday: useEntityQuery("weekday", { page: 1, pageSize: 100, orderBy: "index_value", orderDirection: "ASC" }),
  };

  const referenceDefs: Record<string, { title: string; fields: Field[]; columns: DataTableColumn<EntityRow>[] }> = {
    currency: { title: "Currencies", fields: [{ name: "name", label: "Name", required: true }, { name: "exchange_rate", label: "Exchange Rate", type: "number" }], columns: [{ key: "name", header: "Name", render: row => String(row.name ?? "—") }, { key: "exchange_rate", header: "Rate", render: row => String(row.exchange_rate ?? "—") }] },
    nationality_method: { title: "Nationality Methods", fields: [{ name: "name", label: "Name", required: true }], columns: [{ key: "name", header: "Name", render: row => String(row.name ?? "—") }] },
    nation_development_state: { title: "Development States", fields: [{ name: "name", label: "Name", required: true }, { name: "index_value", label: "Index", type: "number" }], columns: [{ key: "name", header: "Name", render: row => String(row.name ?? "—") }, { key: "index_value", header: "Index", render: row => String(row.index_value ?? "—") }] },
    language_family: { title: "Language Families", fields: [{ name: "name", label: "Name", required: true }], columns: [{ key: "name", header: "Name", render: row => String(row.name ?? "—") }] },
    language_group: { title: "Language Groups", fields: [{ name: "family_id", label: "Family", relation: "language_family" }, { name: "name", label: "Name", required: true }], columns: [{ key: "name", header: "Name", render: row => String(row.name ?? "—") }] },
    language_subgroup: { title: "Language Subgroups", fields: [{ name: "group_id", label: "Group", relation: "language_group" }, { name: "name", label: "Name", required: true }], columns: [{ key: "name", header: "Name", render: row => String(row.name ?? "—") }] },
    language: { title: "Languages", fields: [{ name: "name", label: "Name", required: true }, { name: "influence", label: "Influence", type: "number" }, { name: "learning_difficulty", label: "Learning Difficulty", type: "number" }, { name: "family_id", label: "Family", relation: "language_family" }, { name: "group_id", label: "Group", relation: "language_group" }, { name: "subgroup_id", label: "Subgroup", relation: "language_subgroup" }], columns: [{ key: "name", header: "Name", render: row => String(row.name ?? "—") }] },
    climate: { title: "Climates", fields: [{ name: "name", label: "Name", required: true }, { name: "short_name", label: "Short Name" }], columns: [{ key: "name", header: "Name", render: row => String(row.name ?? "—") }, { key: "short_name", header: "Short", render: row => String(row.short_name ?? "—") }] },
    weekday: { title: "Weekdays", fields: [{ name: "name", label: "Name", required: true }, { name: "index_value", label: "Index", type: "number", required: true }, { name: "is_weekend", label: "Weekend", type: "boolean", required: true }], columns: [{ key: "name", header: "Name", render: row => String(row.name ?? "—") }, { key: "index_value", header: "Index", render: row => String(row.index_value ?? "—") }, { key: "is_weekend", header: "Weekend", render: row => Number(row.is_weekend) === 1 ? "Yes" : "No" }] },
  };

  const [referenceTable, setReferenceTable] = useState<keyof typeof referenceDefs>("currency");
  const [referenceMode, setReferenceMode] = useState<"list" | "create" | "edit">("list");
  const [referenceEditing, setReferenceEditing] = useState<EntityRow | null>(null);
  const [referenceValues, setReferenceValues] = useState<Record<string, EntityFormValue>>({});
  const [referenceSaving, setReferenceSaving] = useState(false);
  const [referenceError, setReferenceError] = useState<string | null>(null);

  const reference = referenceDefs[referenceTable];
  const referenceState = referenceQueries[referenceTable];

  function startEdit(node: GeographyTreeNode) {
    setEditing(node);
    setCreating(null);
    setValues(Object.fromEntries(specs[node.kind].fields.map(field => [field.name, node.row[field.name]])));
    setError(null);
  }

  function startCreate(kind: GeographyEntityKind, parent?: GeographyTreeNode) {
    setEditing(null);
    setCreating({ kind, parent });
    setValues(initialValues(specs[kind], parent));
    setError(null);
  }

  async function saveEntity() {
    if (!formSpec) return;
    setSaving(true); setError(null);
    try {
      const payload = Object.fromEntries(formSpec.fields.map(field => [field.name, normalize(values[field.name], field)]));
      if (editing) await editorApi.update(formSpec.table, editing.entityId, payload);
      else await editorApi.create(formSpec.table, payload);
      setEditing(null); setCreating(null); setNotice(editing ? "Entity updated." : "Entity created.");
      await geography.reload();
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setSaving(false); }
  }

  async function removeEntity() {
    if (!deleting) return;
    setSaving(true); setError(null);
    try {
      await editorApi.remove(deleting.table, deleting.entityId);
      setDeleting(null); setNotice("Entity deleted."); await geography.reload();
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setSaving(false); }
  }

  async function addLanguage() {
    if (!selectedNode || !relationTable) return;
    const language = languageQuery.rows.find(item => !relationRows.some(row => Number(row.language_id) === Number(item.id)));
    if (!language) return;
    try {
      await editorApi.create(relationTable, { [relationOwner]: selectedNode.entityId, language_id: language.id, percentage: 0 });
      await relationQuery.reload();
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  }

  async function updateLanguage(row: EntityRow, percentage: number) {
    if (!relationTable) return;
    try {
      await editorApi.update(relationTable, row.id as number, { percentage: Math.min(100, Math.max(0, percentage)) });
      await relationQuery.reload();
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  }

  async function removeLanguage(row: EntityRow) {
    if (!relationTable) return;
    try { await editorApi.remove(relationTable, row.id as number); await relationQuery.reload(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  }

  async function addAlternativeName() {
    if (!selectedNode || selectedNode.kind !== "continent") return;
    const name = window.prompt("Alternative continent name");
    if (!name?.trim()) return;
    try { await editorApi.create("continent_alt_name", { continent_id: selectedNode.entityId, name: name.trim() }); await altNameQuery.reload(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  }

  async function removeAlternativeName(row: EntityRow) {
    try { await editorApi.remove("continent_alt_name", row.id as number); await altNameQuery.reload(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  }

  async function addNativeTreatment() {
    if (!selectedNode || selectedNode.kind !== "country") return;
    const target = allRows.find(node => node.kind === "country" && node.entityId !== selectedNode.entityId && !nativeTreatments.some(row => Number(row.target_nation_id) === node.entityId));
    if (!target) return;
    try { await editorApi.create("nation_native_treatment", { root_nation_id: selectedNode.entityId, target_nation_id: target.entityId }); await nativeTreatmentQuery.reload(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  }

  async function removeNativeTreatment(row: EntityRow) {
    try { await editorApi.remove("nation_native_treatment", row.id as number); await nativeTreatmentQuery.reload(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  }

  async function addRegionalClimate() {
    if (!selectedNode || selectedNode.kind !== "nation-region") return;
    const climate = climateQuery.rows.find(item => !regionalClimates.some(row => Number(row.climate_id) === Number(item.id)));
    if (!climate) return;
    try { await editorApi.create("climate_nation_region", { nation_region_id: selectedNode.entityId, climate_id: climate.id }); await regionClimateQuery.reload(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  }

  async function removeRegionalClimate(row: EntityRow) {
    try { await editorApi.remove("climate_nation_region", row.id as number); await regionClimateQuery.reload(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  }

  async function saveReference() {
    setReferenceSaving(true); setReferenceError(null);
    try {
      const payload = Object.fromEntries(reference.fields.map(field => [field.name, normalize(referenceValues[field.name], field)]));
      if (referenceEditing) await editorApi.update(referenceTable, referenceEditing.id as number, payload);
      else await editorApi.create(referenceTable, payload);
      setReferenceMode("list"); setReferenceEditing(null); await referenceState.reload();
      setNotice(referenceEditing ? "Reference updated." : "Reference created.");
    } catch (cause) { setReferenceError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setReferenceSaving(false); }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div><div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">WORLD DB</div><h1 className="text-2xl font-semibold tracking-tight text-white">Geography</h1><p className="mt-2 text-sm text-slate-500">Federation → Continent → Continent Region → Country → Nation Region → City</p></div>
        <div className="flex gap-2"><button type="button" onClick={() => void geography.reload()} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2.5 text-sm text-slate-400"><RefreshCw size={14}/>Reload</button><button type="button" onClick={() => startCreate("federation")} className="inline-flex items-center gap-2 rounded-lg bg-emerald-400/10 px-3.5 py-2.5 text-sm font-medium text-emerald-200"><Plus size={14}/>New Federation</button></div>
      </header>

      {notice && <div className="rounded-xl border border-emerald-400/10 bg-emerald-400/5 px-4 py-3 text-sm text-emerald-200">{notice}</div>}
      {error && <div className="rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-200">{error}</div>}

      <section className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {([["Federations","federation"],["Continents","continent"],["Continent Regions","continent-region"],["Countries","country"],["Nation Regions","nation-region"],["Cities","city"]] as const).map(([label,kind]) => <button key={kind} type="button" onClick={() => setFilter(kind)} className={["rounded-xl border px-4 py-3 text-left",filter===kind?"border-emerald-400/20 bg-emerald-400/5":"border-white/10 bg-white/[0.02]"].join(" ")}><div className="text-[10px] uppercase tracking-[0.15em] text-slate-600">{label}</div><div className="mt-1 text-xl font-semibold text-white">{allRows.filter(node=>node.kind===kind).length}</div></button>)}
      </section>

      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <div className="space-y-3"><div className="relative"><Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search geography..." className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-9 pr-3 text-sm text-slate-200 outline-none placeholder:text-slate-600"/></div><div className="flex flex-wrap gap-1">{filterItems.map(([label,type])=><button key={type} type="button" onClick={()=>setFilter(type)} className={["rounded-lg px-2.5 py-1.5 text-xs",filter===type?"bg-emerald-400/10 text-emerald-200":"text-slate-500"].join(" ")}>{label}</button>)}</div><GeographyTree nodes={geography.tree} selectedId={geography.selectedId} onSelect={node=>geography.setSelectedId(node.id)} search={query}/></div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4"><GeographyBreadcrumb selection={geography.selection}/></div>

          {selectedNode && <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><div className="text-[10px] uppercase tracking-[0.16em] text-slate-600">{formSpec?.label ?? selectedNode.kind}</div><h2 className="mt-2 text-xl font-semibold text-white">{selectedNode.label}</h2><p className="mt-1 text-xs text-slate-600">ID {selectedNode.entityId}</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={()=>startEdit(selectedNode)} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300">Edit</button>{childKind[selectedNode.kind] && <button type="button" onClick={()=>startCreate(childKind[selectedNode.kind]!,selectedNode)} className="rounded-lg bg-emerald-400/10 px-3 py-2 text-xs text-emerald-200">Add child</button>}<button type="button" onClick={()=>setDeleting(selectedNode)} className="rounded-lg border border-red-400/20 px-3 py-2 text-xs text-red-200">Delete</button></div></div></section>}

          {formSpec && (editing || creating) && <section className="rounded-2xl border border-white/10 bg-[#121820] p-6"><div className="mb-5 flex items-start justify-between"><div><div className="text-[10px] uppercase tracking-[0.16em] text-slate-600">{editing?"EDIT":"CREATE"}</div><h2 className="mt-2 text-lg font-semibold text-white">{editing?.label ?? `New ${formSpec.label}`}</h2>{creating?.parent && <p className="mt-1 text-xs text-slate-500">Child of {creating.parent.label}</p>}</div><button type="button" onClick={()=>{setEditing(null);setCreating(null)}} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-400">Back</button></div><EntityForm fields={formSpec.fields.filter(field=>!field.relation).map(field=>({name:field.name,label:field.label,type:field.type,required:field.required,min:field.min,max:field.max,step:field.step}))} values={values} onChange={(name,value)=>setValues(current=>({...current,[name]:value}))} onSubmit={()=>void saveEntity()} submitLabel={editing?"Save changes":"Create"} submitting={saving} error={error}>{formSpec.fields.filter(field=>field.relation).map(field=><EntityPicker key={field.name} label={field.label} table={field.relation} value={values[field.name]==null?"":String(values[field.name])} onChange={value=>setValues(current=>({...current,[field.name]:value}))}/>)}</EntityForm></section>}

          {selectedNode && relationTable && <LanguageRelationshipEditor
            title="Languages"
            table={relationTable}
            ownerColumn={relationOwner}
            ownerId={selectedNode.entityId}
            rows={relationRows}
            languages={languageQuery.rows}
            loading={relationQuery.loading || languageQuery.loading}
            error={relationQuery.error ?? languageQuery.error}
            onSave={async items => {
              const next = new Map(items.map(item => [String(item.targetId), item]));
              for (const row of relationRows) {
                const item = next.get(String(row.language_id));
                if (!item) await editorApi.remove(relationTable, row.id as number);
                else await editorApi.update(relationTable, row.id as number, item.values);
              }
              for (const item of items) {
                if (!relationRows.some(row => String(row.language_id) === String(item.targetId))) {
                  await editorApi.create(relationTable, {
                    [relationOwner]: selectedNode.entityId,
                    language_id: item.targetId,
                    percentage: item.values.percentage ?? 0,
                  });
                }
              }
              await relationQuery.reload();
            }}
          />
          {selectedNode?.kind === "continent" && <RelationList title="Alternative names" rows={altNames} labels={new Map()} targetKey="name" loading={altNameQuery.loading} error={altNameQuery.error} onAdd={()=>void addAlternativeName()} onRemove={row=>void removeAlternativeName(row)} action="Add name"/>}
          {selectedNode?.kind === "country" && <RelationList title="Native treatment targets" rows={nativeTreatments} labels={new Map(allRows.filter(n=>n.kind==="country").map(n=>[String(n.entityId),n.label]))} targetKey="target_nation_id" loading={nativeTreatmentQuery.loading} error={nativeTreatmentQuery.error} onAdd={()=>void addNativeTreatment()} onRemove={row=>void removeNativeTreatment(row)} action="Add target"/>}
          {selectedNode?.kind === "nation-region" && <RelationList title="Regional climates" rows={regionalClimates} labels={new Map(climateQuery.rows.map(row=>[String(row.id),String(row.name ?? row.id)]))} targetKey="climate_id" loading={regionClimateQuery.loading || climateQuery.loading} error={regionClimateQuery.error ?? climateQuery.error} onAdd={()=>void addRegionalClimate()} onRemove={row=>void removeRegionalClimate(row)} action="Add climate"/>}
          {selectedNode?.kind === "city" && <EntityPicker label="Climate" table="climate" value={String(selectedNode.row.climate_id ?? "")} loading={climateQuery.loading} error={climateQuery.error} onChange={async value=>{try{await editorApi.update("city",selectedNode.entityId,{climate_id:value===""?null:Number(value)});await geography.reload();}catch(cause){setError(cause instanceof Error?cause.message:String(cause));}}}/>}

          <ReferenceEditor
            table={referenceTable}
            config={reference}
            state={referenceState}
            mode={referenceMode}
            editing={referenceEditing}
            values={referenceValues}
            saving={referenceSaving}
            error={referenceError}
            onTableChange={table=>{setReferenceTable(table);setReferenceMode("list");setReferenceEditing(null)}}
            onCreate={()=>{setReferenceMode("create");setReferenceEditing(null);setReferenceValues(Object.fromEntries(reference.fields.map(field=>[field.name,field.type==="boolean"?false:null])))}}
            onEdit={row=>{setReferenceMode("edit");setReferenceEditing(row);setReferenceValues(Object.fromEntries(reference.fields.map(field=>[field.name,row[field.name]])))}}
            onSave={()=>void saveReference()}
            onChange={(name,value)=>setReferenceValues(current=>({...current,[name]:value}))}
          />

          <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"><div className="mb-4 flex items-center justify-between"><h3 className="text-base font-semibold text-white">Filtered geography</h3><span className="text-xs text-slate-600">{filteredRows.length} records</span></div><DataTable rows={filteredRows} columns={[{key:"name",header:"Name",render:row=><span className="font-medium text-white">{row.label}</span>},{key:"short_name",header:"Short",render:row=>String(row.row.short_name??"—")},{key:"kind",header:"Type",render:row=>row.kind},{key:"children",header:"Children",render:row=>String(row.children.length)}]} loading={geography.loading} error={geography.error} onRowClick={node=>geography.setSelectedId(node.id)} onEdit={startEdit} onDelete={setDeleting} emptyMessage="No geography records found."/></section>
        </div>
      </div>

      <DeleteDialog open={Boolean(deleting)} entityName={String(deleting?.label ?? "")} onConfirm={()=>void removeEntity()} onClose={()=>{if(!saving)setDeleting(null)}}/>
    </div>
  );
}

function ReferenceEditor({
  table, config, state, mode, editing, values, saving, error, onTableChange, onCreate, onEdit, onSave, onChange,
}: {
  table: keyof typeof referenceConfigs;
  config: { title: string; fields: Field[]; columns: DataTableColumn<EntityRow>[] };
  state: { rows: EntityRow[]; loading: boolean; error: string | null; reload: () => Promise<void> };
  mode: "list" | "create" | "edit";
  editing: EntityRow | null;
  values: Record<string, EntityFormValue>;
  saving: boolean;
  error: string | null;
  onTableChange: (table: keyof typeof referenceConfigs) => void;
  onCreate: () => void;
  onEdit: (row: EntityRow) => void;
  onSave: () => void;
  onChange: (name: string, value: EntityFormValue) => void;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-center justify-between gap-4">
        <div><div className="text-[10px] uppercase tracking-[0.16em] text-slate-600">REFERENCE DATA</div><h3 className="mt-1 text-base font-semibold text-white">{config.title}</h3></div>
        <div className="flex gap-2"><select value={table} onChange={event=>onTableChange(event.target.value as keyof typeof referenceConfigs)} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-200">{Object.entries(referenceConfigs).map(([key,item])=><option key={key} value={key} className="bg-[#121820]">{item.title}</option>)}</select><button type="button" onClick={onCreate} className="inline-flex items-center gap-2 rounded-lg bg-emerald-400/10 px-3 py-2 text-xs text-emerald-200"><Plus size={13}/>New</button></div>
      </div>
      {mode === "list" ? <div className="mt-4"><DataTable rows={state.rows} columns={config.columns} onEdit={onEdit} loading={state.loading} error={state.error} emptyMessage={`No ${config.title.toLowerCase()} found.`}/></div> : <div className="mt-4 rounded-xl border border-white/10 bg-[#121820] p-5"><EntityForm fields={config.fields.filter(field=>!field.relation).map(field=>({name:field.name,label:field.label,type:field.type,required:field.required}))} values={values} onChange={onChange} onSubmit={onSave} submitting={saving} error={error} submitLabel={mode==="edit"?"Save changes":"Create"}>{config.fields.filter(field=>field.relation).map(field=><EntityPicker key={field.name} label={field.label} table={field.relation} value={values[field.name]==null?"":String(values[field.name])} onChange={value=>onChange(field.name,value)}/>)}</EntityForm></div>}
    </section>
  );
}

const referenceConfigs = {
  currency: { title: "Currencies", fields: [{name:"name",label:"Name",required:true},{name:"exchange_rate",label:"Exchange Rate",type:"number" as const}], columns: [{key:"name",header:"Name",render:(row:EntityRow)=>String(row.name??"—")},{key:"exchange_rate",header:"Rate",render:(row:EntityRow)=>String(row.exchange_rate??"—")}]},
  nationality_method: { title: "Nationality Methods", fields: [{name:"name",label:"Name",required:true}], columns: [{key:"name",header:"Name",render:(row:EntityRow)=>String(row.name??"—")}]},
  nation_development_state: { title: "Development States", fields: [{name:"name",label:"Name",required:true},{name:"index_value",label:"Index",type:"number" as const}], columns: [{key:"name",header:"Name",render:(row:EntityRow)=>String(row.name??"—")},{key:"index_value",header:"Index",render:(row:EntityRow)=>String(row.index_value??"—")}]},
  language_family: { title: "Language Families", fields: [{name:"name",label:"Name",required:true}], columns: [{key:"name",header:"Name",render:(row:EntityRow)=>String(row.name??"—")}]},
  language_group: { title: "Language Groups", fields: [{name:"family_id",label:"Family",relation:"language_family"},{name:"name",label:"Name",required:true}], columns: [{key:"name",header:"Name",render:(row:EntityRow)=>String(row.name??"—")}]},
  language_subgroup: { title: "Language Subgroups", fields: [{name:"group_id",label:"Group",relation:"language_group"},{name:"name",label:"Name",required:true}], columns: [{key:"name",header:"Name",render:(row:EntityRow)=>String(row.name??"—")}]},
  language: { title: "Languages", fields: [{name:"name",label:"Name",required:true},{name:"influence",label:"Influence",type:"number" as const},{name:"learning_difficulty",label:"Learning Difficulty",type:"number" as const},{name:"family_id",label:"Family",relation:"language_family"},{name:"group_id",label:"Group",relation:"language_group"},{name:"subgroup_id",label:"Subgroup",relation:"language_subgroup"}], columns: [{key:"name",header:"Name",render:(row:EntityRow)=>String(row.name??"—")}]},
  climate: { title: "Climates", fields: [{name:"name",label:"Name",required:true},{name:"short_name",label:"Short Name"}], columns: [{key:"name",header:"Name",render:(row:EntityRow)=>String(row.name??"—")},{key:"short_name",header:"Short",render:(row:EntityRow)=>String(row.short_name??"—")}]},
  weekday: { title: "Weekdays", fields: [{name:"name",label:"Name",required:true},{name:"index_value",label:"Index",type:"number" as const,required:true},{name:"is_weekend",label:"Weekend",type:"boolean" as const,required:true}], columns: [{key:"name",header:"Name",render:(row:EntityRow)=>String(row.name??"—")},{key:"index_value",header:"Index",render:(row:EntityRow)=>String(row.index_value??"—")},{key:"is_weekend",header:"Weekend",render:(row:EntityRow)=>Number(row.is_weekend)===1?"Yes":"No"}]},
} as const;

type ReferenceDefs = typeof referenceConfigs;
