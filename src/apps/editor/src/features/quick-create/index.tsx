import { useEffect, useState } from "react";
import { editorApi, type Scalar } from "../../shared/api/editorApi";

export type QuickCreatePreset =
  | "federation" | "continent" | "region" | "nation" | "city"
  | "person" | "player" | "staff"
  | "team" | "club" | "national-team"
  | "competition"
  | "stadium"
  | "formation" | "role"
  | "new-league" | "new-club" | "new-player";

type Preset = {
  id: QuickCreatePreset;
  title: string;
  group: string;
  table?: string;
  fields: string[];
  numericFields?: string[];
  dateFields?: string[];
};

const presets: Preset[] = [
  { id: "federation", title: "Federation", group: "Geography", table: "confederation", fields: ["name", "short_name"] },
  { id: "continent", title: "Continent", group: "Geography", table: "continent", fields: ["name", "short_name"] },
  { id: "nation", title: "Nation", group: "Geography", table: "nation", fields: ["continent_region_id", "name", "short_name"] },
  { id: "region", title: "Region", group: "Geography", table: "continent_region", fields: ["continent_id", "name", "short_name"] },
  { id: "city", title: "City", group: "Geography", table: "city", fields: ["nation_id", "nation_region_id", "name", "population"] },
  { id: "person", title: "Person", group: "People", table: "person", fields: ["full_name", "common_name", "birth_date", "gender_id", "person_type_id"] },
  { id: "player", title: "Player", group: "People", table: "player", fields: ["person_id", "position_id", "position_rating"] },
  { id: "staff", title: "Staff", group: "People", table: "team_person_relationship", fields: ["team_id", "person_id", "level", "reason"] },
  { id: "team", title: "Team", group: "Clubs", table: "team", fields: ["name", "short_name"] },
  { id: "club", title: "Club", group: "Clubs", table: "club", fields: ["team_id", "nation_id", "city_id", "status_id"] },
  { id: "national-team", title: "National Team", group: "Clubs", table: "national_team", fields: ["team_id", "nation_id"] },
  { id: "stadium", title: "Stadium", group: "Stadium", table: "stadium", fields: ["city_id", "name", "capacity"] },
  { id: "competition", title: "Competition", group: "Competitions", table: "competition", fields: ["name", "three_letter_name", "nation_id", "type_id"], numericFields: ["nation_id", "type_id"] },
      { id: "formation", title: "Formation", group: "Tactics", table: "formation", fields: ["name", "description"] },
  { id: "role", title: "Role", group: "Tactics", table: "player_role", fields: ["position_id", "name", "description"] },
  { id: "new-league", title: "New League", group: "Composite", fields: ["name", "short_name", "competition_type_id", "country_id", "team_ids", "year", "win_points", "draw_points", "loss_points", "interval_days", "start_date", "end_date"], numericFields: ["competition_type_id", "country_id", "year", "win_points", "draw_points", "loss_points", "interval_days"], dateFields: ["start_date", "end_date"] },
  { id: "new-club", title: "New Club", group: "Composite", fields: ["name", "short_name", "nation_id", "city_id", "stadium_name"] },
  { id: "new-player", title: "New Player", group: "Composite", fields: ["full_name", "common_name", "birth_date", "person_type_id", "position_id", "position_rating"] },
];

function toNumber(value: Scalar, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseIds(value: Scalar) {
  return String(value ?? "").split(",").map(v => Number(v.trim())).filter(Number.isInteger);
}

async function createComposite(
  preset: QuickCreatePreset,
  values: Record<string, Scalar>,
) {
  if (preset === "new-club") {
    const name = String(values.name ?? "").trim();
    if (!name) throw new Error("Club name is required.");
    const result = await editorApi.domain.createClub({
      name,
      shortName: String(values.short_name ?? "").trim() || undefined,
      nationId: values.nation_id == null || values.nation_id === "" ? undefined : toNumber(values.nation_id),
      cityId: values.city_id == null || values.city_id === "" ? undefined : toNumber(values.city_id),
      stadiumName: String(values.stadium_name ?? "").trim() || undefined,
    });
    return `Club created: ${JSON.stringify(result)}`;
  }

  if (preset === "new-player") {
    const fullName = String(values.full_name ?? "").trim();
    if (!fullName) throw new Error("Full name is required.");
    const result = await editorApi.domain.createPlayer({
      fullName,
      commonName: String(values.common_name ?? "").trim() || undefined,
      birthDate: String(values.birth_date ?? "") || undefined,
      personTypeId: toNumber(values.person_type_id),
      positionId: values.position_id == null || values.position_id === "" ? undefined : toNumber(values.position_id),
      positionRating: values.position_id ? toNumber(values.position_rating, 10) : undefined,
    });
    return `Player created: ${JSON.stringify(result)}`;
  }
  const teamIds = parseIds(values.team_ids);
  const result = await editorApi.domain.createLeague({
    name: String(values.name ?? "").trim(),
    nationId: values.country_id == null || values.country_id === "" ? undefined : toNumber(values.country_id),
    competitionTypeId: values.competition_type_id == null || values.competition_type_id === "" ? undefined : toNumber(values.competition_type_id),
    shortName: String(values.short_name ?? "").trim() || undefined,
    teamIds,
    year: toNumber(values.year, new Date().getFullYear()),
    startDate: String(values.start_date ?? ""),
    endDate: String(values.end_date ?? "") || undefined,
    intervalDays: toNumber(values.interval_days, 7),
    winPoints: toNumber(values.win_points, 3),
    drawPoints: toNumber(values.draw_points, 1),
    lossPoints: toNumber(values.loss_points, 0),
  });
  return `Competition #${result.competitionId} → Season #${result.seasonId} → Stage #${result.stageId} → ${result.fixtureCount} fixtures`;
}

function label(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, char => char.toUpperCase());
}

function defaults(fields: string[]): Record<string, Scalar> {
  return Object.fromEntries(fields.map(field => [field, null]));
}

export function QuickCreateModal({
  open,
  onClose,
  initialPreset,
}: {
  open: boolean;
  onClose: () => void;
  initialPreset?: QuickCreatePreset;
}) {
  const [selected, setSelected] = useState<Preset | null>(null);
  const [values, setValues] = useState<Record<string, Scalar>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !initialPreset) return;
    const item = presets.find(preset => preset.id === initialPreset);
    if (item) choose(item);
  }, [open, initialPreset]);

  if (!open) return null;

  function choose(item: Preset) {
    setSelected(item);
    setValues(defaults(item.fields));
    setError(null);
    setSuccess(null);
  }

  async function create() {
    if (!selected) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (selected.id === "new-league" || selected.id === "new-club" || selected.id === "new-player") {
        const result = await createComposite(selected.id, values);
        const validation = await editorApi.validation.run();
        const errors = validation.issues.filter(issue => issue.severity === "ERROR").length;
        setSuccess(`Created: ${result}.${errors ? ` Validation found ${errors} error(s).` : " Validation passed."}`);
        return;
      }

      if (!selected.table) throw new Error("Invalid preset.");
      const payload = Object.fromEntries(
        Object.entries(values).filter(([, value]) => value !== "" && value != null),
      );

      await editorApi.entity.create(selected.table, payload);
      const validation = await editorApi.validation.run();
      const errors = validation.issues.filter(issue => issue.severity === "ERROR").length;
      setSuccess(`${selected.title} created.${errors ? ` Validation found ${errors} error(s).` : " Validation passed."}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Quick Create">
      <section className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[#111820] p-6 shadow-2xl">
        <header className="mb-5 flex items-start justify-between gap-4">
          <div><h2 className="text-xl font-semibold text-white">Quick Create</h2><p className="mt-1 text-sm text-slate-400">Create an entity or a common domain object.</p></div>
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/10">Close</button>
        </header>
        {!selected ? (
          <div className="grid gap-2 sm:grid-cols-2">{presets.map(item => <button key={item.id} type="button" onClick={() => choose(item)} className="rounded-xl border border-white/10 p-3 text-left hover:border-emerald-400/40 hover:bg-white/[0.03]"><span className="block text-sm font-medium text-slate-100">{item.title}</span><span className="mt-1 block text-xs text-slate-500">{item.group}</span></button>)}</div>
        ) : (
          <form className="space-y-4" onSubmit={event => { event.preventDefault(); void create(); }}>
            <div className="flex items-center justify-between"><h3 className="font-medium text-white">{selected.title}</h3><button type="button" onClick={() => setSelected(null)} className="text-sm text-slate-400 hover:text-white">Choose another</button></div>
            <div className="grid gap-3 sm:grid-cols-2">{selected.fields.map(field => <label key={field} className="space-y-1 text-xs text-slate-400"><span>{label(field)}</span><input type={selected.numericFields?.includes(field) ? "number" : selected.dateFields?.includes(field) ? "date" : "text"} value={String(values[field] ?? "")} onChange={event => setValues(current => ({ ...current, [field]: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400/50" /></label>)}</div>
            {error && <p className="rounded-lg border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-300">{error}</p>}{success && <p className="rounded-lg border border-emerald-400/20 bg-emerald-400/5 p-3 text-sm text-emerald-300">{success}</p>}
            <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300">Cancel</button><button type="submit" disabled={saving} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-50">{saving ? "Creating…" : "Create"}</button></div>
          </form>
        )}
      </section>
    </div>
  );
}
