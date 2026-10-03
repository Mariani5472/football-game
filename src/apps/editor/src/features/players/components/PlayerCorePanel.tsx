import { EntityPicker } from "../../../shared/components";
import type { EntityRow } from "../../../shared/api";

const fields = [
  ["potential_capacity", "Potential Capacity"],
  ["potential", "Potential"],
  ["estimated_value", "Estimated Value"],
  ["left_foot", "Left Foot"],
  ["right_foot", "Right Foot"],
] as const;

export function PlayerCorePanel(props: {
  player: EntityRow | null;
  values: Record<string, string>;
  personId: string;
  saving: boolean;
  onPersonChange: (value: string) => void;
  onFieldChange: (name: string, value: string) => void;
  onSave: () => void;
}) {
  return (
    <section className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
      <div className="grid gap-5 md:grid-cols-2">
        <EntityPicker
          label="Person"
          table="person"
          labelColumn="full_name"
          value={props.personId}
          onChange={value => props.onPersonChange(String(value))}
        />
        {fields.map(([name, label]) => (
          <label key={name} className="space-y-1.5">
            <span className="block text-xs font-medium text-slate-400">{label}</span>
            <input
              type="number"
              value={props.values[name] ?? (props.player?.[name] == null ? "" : String(props.player[name]))}
              onChange={event => props.onFieldChange(name, event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-slate-200 outline-none"
            />
          </label>
        ))}
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          disabled={props.saving || !props.personId}
          onClick={props.onSave}
          className="rounded-lg bg-emerald-400/10 px-4 py-2.5 text-sm font-medium text-emerald-200 disabled:opacity-50"
        >
          {props.saving ? "Saving..." : "Save Player"}
        </button>
      </div>
    </section>
  );
}
