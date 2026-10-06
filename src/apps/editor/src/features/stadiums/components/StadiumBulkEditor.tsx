import { useEffect, useState } from "react";
import { CircleAlert, Pencil, RotateCcw } from "lucide-react";
import { editorApi, type EntityRow, type Scalar } from "../../../shared/api/editorApi";
import { ConfirmDialog, EntityForm, type EntityFormValue } from "../../../shared/components";

type BulkField = {
  name: string;
  label: string;
  type?: "number" | "boolean";
  min?: number;
  max?: number;
};

const BULK_FIELDS: BulkField[] = [
  { name: "quality_state_id", label: "Quality", type: "number", min: 1 },
  { name: "environment_quality_id", label: "Environment Quality", type: "number", min: 1 },
  { name: "field_condition", label: "Field Condition", type: "number", min: 0 },
  { name: "grass_recovery_level", label: "Grass Recovery Level", type: "number", min: 0 },
  { name: "has_cover", label: "Cover", type: "boolean" },
  { name: "has_retractable_roof", label: "Retractable Roof", type: "boolean" },
  { name: "has_underfloor_heating", label: "Underfloor Heating", type: "boolean" },
  { name: "has_digital_advertising", label: "Digital Advertising", type: "boolean" },
  { name: "has_capacity_change", label: "Capacity Change", type: "boolean" },
  { name: "used_by_national_team", label: "Used By National Team", type: "boolean" },
  { name: "banned_from_continental_final", label: "Banned From Continental Final", type: "boolean" },
  { name: "extinct", label: "Extinct", type: "boolean" },
];

export function StadiumBulkEditor({ rows, onSaved }: { rows: EntityRow[]; onSaved: () => Promise<void> }) {
  const [field, setField] = useState(BULK_FIELDS[0].name);
  const [value, setValue] = useState<EntityFormValue>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedField = BULK_FIELDS.find(item => item.name === field) ?? BULK_FIELDS[0];

  useEffect(() => {
    setValue(selectedField.type === "boolean" ? true : null);
  }, [selectedField.name, selectedField.type]);

  async function save() {
    if (!rows.length || value === null || value === "" || value === undefined) {
      setError("Choose a value before applying the bulk change.");
      return;
    }

    const normalized: Scalar = selectedField.type === "number" ? Number(value) : Boolean(value);
    if (selectedField.type === "number" && (!Number.isFinite(normalized as number) || (selectedField.min != null && Number(normalized) < selectedField.min) || (selectedField.max != null && Number(normalized) > selectedField.max))) {
      setError(`Value for ${selectedField.label} is invalid.`);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await Promise.all(rows.map(row => editorApi.entity.update("stadium", Number(row.id), { [field]: normalized })));
      setConfirmOpen(false);
      await onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.03] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-white"><Pencil size={15} /> Bulk edit</div>
          <p className="mt-1 text-xs text-slate-500">Apply one safe attribute change to {rows.length} selected stadium{rows.length === 1 ? "" : "s"}.</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-xs text-slate-400">
          <span>Field</span>
          <select value={field} onChange={event => setField(event.target.value)} className="w-full rounded-xl border border-white/10 bg-[#10161d] px-3 py-2.5 text-sm text-slate-200">
            {BULK_FIELDS.map(item => <option key={item.name} value={item.name}>{item.label}</option>)}
          </select>
        </label>
        <EntityForm fields={[{ name: "value", label: "New value", type: selectedField.type ?? "number", min: selectedField.min, max: selectedField.max }]} values={{ value }} onChange={(_, next) => setValue(next)} onSubmit={() => void save()} submitLabel={saving ? "Applying..." : "Apply"} submitting={saving} error={null} />
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        {error ? <div className="flex items-center gap-2 text-xs text-red-300"><CircleAlert size={14} />{error}</div> : <span className="text-xs text-slate-600">Only the selected field will change.</span>}
        <button type="button" onClick={() => setConfirmOpen(true)} disabled={saving} className="rounded-xl bg-emerald-400/10 px-4 py-2.5 text-sm font-medium text-emerald-200 disabled:opacity-50">Apply to {rows.length}</button>
        <ConfirmDialog open={confirmOpen} title="Apply bulk change" description={`This changes ${selectedField.label} on ${rows.length} selected stadium(s).`} confirmLabel="Apply changes" onConfirm={() => void save()} onClose={() => { if (!saving) setConfirmOpen(false); }} />
      </div>
    </section>
  );
}

export function StadiumBulkSelectionHint({ onClear }: { onClear: () => void }) {
  return <button type="button" onClick={onClear} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-400 hover:text-white"><RotateCcw size={13} /> Clear selection</button>;
}