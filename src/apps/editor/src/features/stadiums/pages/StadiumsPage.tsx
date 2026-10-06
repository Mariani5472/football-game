import { useState } from "react";
import { Building2, Database, ImagePlus, Link2, ShieldCheck } from "lucide-react";
import { CrudEntityPage, Tabs } from "../../../shared/components";
import {
  alternativeStadiumConfig,
  stadiumChangeConfig,
  stadiumConfig,
} from "../config/stadiumConfig";
import { StadiumCatalog } from "../components/StadiumCatalog";
import { StadiumImagesPanel } from "../components/StadiumImagesPanel";
import { StadiumUsagePanel } from "../components/StadiumUsagePanel";
import { StadiumValidationPanel } from "../components/StadiumValidationPanel";
import { editorApi, type EntityRow } from "../../../shared/api/editorApi";

export function StadiumsPage() {
  const [tab, setTab] = useState("stadiums");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);

  function openStadium(row: EntityRow) {
    const id = Number(row.id);
    if (!Number.isInteger(id) || id <= 0) return;
    setSelectedId(id);
    setSelectedName(String(row.name ?? `Stadium #${id}`));
    setTab("workspace");
  }

  return (
    <div className="space-y-6">
      <header>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">WORLD DB</div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Stadiums</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-500">Manage stadium identity, infrastructure, history, usage, imagery and data quality without leaving the stadium module.</p>
      </header>

      <Tabs
        activeTab={tab}
        onChange={setTab}
        items={[
          { id: "stadiums", label: "Stadiums", icon: Building2, content: <StadiumListWithOpen onOpen={openStadium} /> },
          { id: "workspace", label: selectedName ? `Workspace · ${selectedName}` : "Stadium Workspace", icon: Link2, content: selectedId ? <StadiumWorkspace stadiumId={selectedId} /> : <WorkspaceEmpty /> },
          { id: "changes", label: "Stadium Changes", icon: Database, content: <CrudEntityPage config={stadiumChangeConfig} /> },
          { id: "alternatives", label: "Alternative Stadiums", icon: Database, content: <CrudEntityPage config={alternativeStadiumConfig} /> },
        ]}
      />
    </div>
  );
}

function StadiumListWithOpen({ onOpen }: { onOpen: (row: EntityRow) => void }) {
  return <StadiumCatalog onOpen={onOpen} />;
}

function StadiumWorkspace({ stadiumId }: { stadiumId: number }) {
  const [row, setRow] = useState<EntityRow | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    try {
      const result = await editorApi.entity.get("stadium", stadiumId);
      setRow(result);
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!row) return;
    setSaving(true); setError(null);
    const form = new FormData(event.currentTarget);
    const numeric = ["capacity", "seated_capacity", "expansion_capacity", "seats_in_use", "field_condition", "grass_recovery_level"];
    const payload: Record<string, string | number | boolean | null> = {};
    for (const [key, value] of form.entries()) {
      payload[key] = numeric.includes(key) ? (value === "" ? null : Number(value)) : value === "" ? null : String(value);
    }
    ["is_training_ground", "used_by_national_team", "banned_from_continental_final", "extinct", "has_cover", "has_retractable_roof", "has_underfloor_heating", "has_digital_advertising", "has_capacity_change"].forEach(key => { payload[key] = form.get(key) === "on"; });
    try { await editorApi.entity.update("stadium", stadiumId, payload); setEditing(false); await reload(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setSaving(false); }
  }

  if (!row) void reload();

  return <div className="space-y-5">
    {error && <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-200">{error}</div>}
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><div className="text-[10px] uppercase tracking-[0.14em] text-slate-600">Stadium</div><h2 className="mt-2 text-xl font-semibold text-white">{String(row?.name ?? `Stadium #${stadiumId}`)}</h2></div>
        <button type="button" onClick={() => setEditing(value => !value)} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300">{editing ? "Cancel" : "Quick edit"}</button>
      </div>
      {editing && row ? <StadiumQuickForm row={row} saving={saving} onSubmit={save} /> : <StadiumOverview row={row} /> }
    </section>
    <StadiumValidationPanel stadiumId={stadiumId} />
    <StadiumImagesPanel stadiumId={stadiumId} />
    <StadiumUsagePanel stadiumId={stadiumId} />
  </div>;
}

function StadiumQuickForm({ row, saving, onSubmit }: { row: EntityRow; saving: boolean; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }) {
  const booleanFields = ["is_training_ground", "used_by_national_team", "banned_from_continental_final", "extinct", "has_cover", "has_retractable_roof", "has_underfloor_heating", "has_digital_advertising", "has_capacity_change"];
  const numericFields = ["capacity", "seated_capacity", "expansion_capacity", "seats_in_use", "field_condition", "grass_recovery_level"];
  return <form onSubmit={onSubmit} className="mt-5 grid gap-4 md:grid-cols-2">
    {["name", ...numericFields].map(field => <label key={field} className="space-y-1 text-xs text-slate-500">{field}<input name={field} defaultValue={String(row[field] ?? "")} type={field === "name" ? "text" : "number"} className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white" /></label>)}
    {booleanFields.map(field => <label key={field} className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-400"><input name={field} type="checkbox" defaultChecked={Number(row[field]) === 1} />{field.replaceAll("_", " ")}</label>)}
    <div className="md:col-span-2 flex justify-end"><button type="submit" disabled={saving} className="rounded-lg bg-emerald-400/10 px-4 py-2 text-sm text-emerald-200 disabled:opacity-50">{saving ? "Saving..." : "Save changes"}</button></div>
  </form>;
}

function StadiumOverview({ row }: { row: EntityRow | null }) {
  if (!row) return <div className="mt-5 text-sm text-slate-600">Loading stadium...</div>;
  return <div className="mt-5 grid gap-3 md:grid-cols-3">{
    [["Capacity", row.capacity == null ? "—" : Number(row.capacity).toLocaleString()], ["Seated", row.seated_capacity == null ? "—" : Number(row.seated_capacity).toLocaleString()], ["Training ground", Number(row.is_training_ground) === 1 ? "Yes" : "No"], ["Coordinates", row.latitude == null || row.longitude == null ? "—" : `${row.latitude}, ${row.longitude}`], ["Pitch condition", row.field_condition == null ? "—" : String(row.field_condition)], ["State", Number(row.extinct) === 1 ? "Extinct" : "Active"]].map(([label, value]) => <div key={label} className="rounded-xl border border-white/5 bg-black/10 p-3"><div className="text-[10px] uppercase tracking-[0.14em] text-slate-600">{label}</div><div className="mt-1 text-sm font-medium text-white">{value}</div></div>)
  }</div>;
}

function WorkspaceEmpty() {
  return <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center"><ShieldCheck className="mx-auto text-slate-600" size={24} /><h2 className="mt-3 text-sm font-semibold text-white">Select a stadium</h2><p className="mt-1 text-xs text-slate-600">Open a row in Stadiums to inspect relationships, images and validation results.</p></div>;
}