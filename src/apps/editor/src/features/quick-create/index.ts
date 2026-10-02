import { useState } from "react";
import { editorApi, type Scalar } from "../../shared/api/editorApi";

export type QuickCreatePreset =
  | "federation" | "continent" | "region" | "nation" | "city"
  | "person" | "player" | "staff"
  | "team" | "club" | "national-team"
  | "stadium"
  | "competition" | "season" | "league" | "group-stage" | "knockout-stage"
  | "formation" | "role"
  | "new-league" | "new-club" | "new-player";

type Preset = {
  id: QuickCreatePreset;
  title: string;
  group: string;
  table?: string;
  fields: string[];
};

const presets: Preset[] = [
  { id: "federation", title: "Federation", group: "Geography", table: "federation", fields: ["name","short_name"] },
  { id: "continent", title: "Continent", group: "Geography", table: "continent", fields: ["name","short_name","federation_id"] },
  { id: "region", title: "Region", group: "Geography", table: "continent_region", fields: ["continent_id","name","short_name"] },
  { id: "nation", title: "Nation", group: "Geography", table: "nation", fields: ["name","short_name","continent_region_id"] },
  { id: "city", title: "City", group: "Geography", table: "city", fields: ["nation_id","nation_region_id","name","population"] },
  { id: "person", title: "Person", group: "People", table: "person", fields: ["full_name","common_name","birth_date","nationality_id","person_type_id","gender_id"] },
  { id: "player", title: "Player", group: "People", table: "player", fields: ["person_id"] },
  { id: "staff", title: "Staff", group: "People", table: "team_person_relationship", fields: ["team_id","person_id","level","reason"] },
  { id: "team", title: "Team", group: "Teams", table: "team", fields: ["name","short_name","nation_id","gender_id"] },
  { id: "club", title: "Club", group: "Teams", table: "club", fields: ["team_id","city_id","base_nation_id"] },
  { id: "national-team", title: "National Team", group: "Teams", table: "national_team", fields: ["team_id","nation_id"] },
  { id: "stadium", title: "Stadium", group: "Stadium", table: "stadium", fields: ["city_id","name","capacity"] },
  { id: "competition", title: "Competition", group: "Competitions", table: "competition", fields: ["name","nation_id","type_id","level"] },
  { id: "season", title: "Season", group: "Competitions", table: "competition_season", fields: ["competition_id","year","start_date","end_date"] },
  { id: "league", title: "League", group: "Competitions", table: "competition_stage", fields: ["competition_season_id","name","stage_order"] },
  { id: "group-stage", title: "Group Stage", group: "Competitions", table: "competition_stage", fields: ["competition_season_id","name","stage_order"] },
  { id: "knockout-stage", title: "Knockout Stage", group: "Competitions", table: "competition_stage", fields: ["competition_season_id","name","stage_order"] },
  { id: "formation", title: "Formation", group: "Tactics", table: "formation", fields: ["name","description"] },
  { id: "role", title: "Role", group: "Tactics", table: "player_role", fields: ["position_id","name","description"] },
  { id: "new-league", title: "New League", group: "Composite", fields: ["name","country_id","team_ids","year","turns","win_points","draw_points","loss_points","start_date","end_date"] },
  { id: "new-club", title: "New Club", group: "Composite", fields: ["name","short_name","nation_id","city_id","stadium_name"] },
  { id: "new-player", title: "New Player", group: "Composite", fields: ["full_name","common_name","birth_date","nationality_id","person_type_id","position_id","position_rating"] },
];

function label(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, char => char.toUpperCase());
}

function defaults(fields: string[]): Record<string, Scalar> {
  return Object.fromEntries(fields.map(field => [field, null]));
}

export function QuickCreateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [selected, setSelected] = useState<Preset | null>(null);
  const [values, setValues] = useState<Record<string, Scalar>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
      if (selected.id === "new-league") {
        const teamIds = String(values.team_ids ?? "")
          .split(",")
          .map(value => Number(value.trim()))
          .filter(Number.isInteger);

        if (!String(values.name ?? "").trim()) throw new Error("League name is required.");
        if (!Number(values.country_id)) throw new Error("Country is required.");
        if (teamIds.length < 2) throw new Error("Provide at least two team IDs.");
        if (!String(values.start_date ?? "") || !String(values.end_date ?? "")) {
          throw new Error("Start and end dates are required.");
        }

        const competition = await editorApi.create("competition", {
          name: String(values.name).trim(),
          nation_id: Number(values.country_id),
        });
        const season = await editorApi.create("competition_season", {
          competition_id: Number(competition.id),
          year: Number(values.year),
          start_date: String(values.start_date),
          end_date: String(values.end_date),
        });
        const stage = await editorApi.create("competition_stage", {
          competition_season_id: Number(season.id),
          name: "League",
          stage_order: 1,
        });
        const stageId = Number(stage.id);

        await editorApi.create("stage_participant_rule", {
          stage_id: stageId,
          participant_type: "TEAM",
          min_participants: teamIds.length,
          max_participants: teamIds.length,
        });
        await editorApi.create("stage_format", {
          stage_id: stageId,
          format_type: "LEAGUE",
          participant_count: teamIds.length,
          legs: Math.max(1, Number(values.turns ?? 2)),
          home_away: Number(values.turns ?? 2) > 1 ? 1 : 0,
        });
        await editorApi.create("stage_points_rule", {
          stage_id: stageId,
          win_points: Number(values.win_points ?? 3),
          draw_points: Number(values.draw_points ?? 1),
          loss_points: Number(values.loss_points ?? 0),
        });
        await editorApi.create("schedule_profile", {
          stage_id: stageId,
          scheduling_type: "ROUND_ROBIN",
          start_date: String(values.start_date),
          end_date: String(values.end_date),
          interval_days: 7,
          home_away_balanced: 1,
        });

        setSuccess(
          `Created: Competition #${competition.id} → Season #${season.id} → Stage #${stage.id} → Rules → Schedule.`,
        );
        return;
      }

      if (selected.id === "new-club") {
        const team = await editorApi.create("team", {
          name: String(values.name ?? "").trim(),
          short_name: String(values.short_name ?? "").trim() || null,
          nation_id: values.nation_id == null || values.nation_id === "" ? null : Number(values.nation_id),
        });

        const club = await editorApi.create("club", {
          team_id: Number(team.id),
          city_id: values.city_id == null || values.city_id === "" ? null : Number(values.city_id),
          base_nation_id: values.nation_id == null || values.nation_id === "" ? null : Number(values.nation_id),
        });

        if (String(values.stadium_name ?? "").trim() && values.city_id) {
          await editorApi.create("stadium", {
            city_id: Number(values.city_id),
            name: String(values.stadium_name).trim(),
            owner_club_id: Number(team.id),
          });
        }

        setSuccess(`Created: Team #${team.id} → Club #${club.team_id}${values.stadium_name ? " → Stadium" : ""}.`);
        return;
      }

      if (selected.id === "new-player") {
        const person = await editorApi.create("person", {
          full_name: String(values.full_name ?? "").trim(),
          common_name: String(values.common_name ?? "").trim() || null,
          birth_date: String(values.birth_date ?? "") || null,
          nationality_id: values.nationality_id == null || values.nationality_id === "" ? null : Number(values.nationality_id),
          person_type_id: values.person_type_id == null || values.person_type_id === "" ? null : Number(values.person_type_id),
        });

        await editorApi.create("player", { person_id: Number(person.id) });

        if (values.position_id) {
          await editorApi.create("player_position", {
            player_id: Number(person.id),
            position_id: Number(values.position_id),
            rating: Number(values.position_rating ?? 10),
          });
        }

        setSuccess(`Created: Person #${person.id} → Player #${person.id}${values.position_id ? " → Position" : ""}.`);
        return;
      }

      if (!selected.table) throw new Error("Invalid preset.");

      const payload = Object.fromEntries(
        Object.entries(values).filter(([, value]) => value !== "" && value != null),
      );

      await editorApi.create(selected.table, payload);
      setSuccess(`${selected.title} created.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  }

  const groups = ["Geography", "People", "Teams", "Stadium", "Competitions", "Tactics", "Composite"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
      <div className="w-full max-w-5xl rounded-2xl border border-white/10 bg-[#0f141b] p-6 shadow-2xl">
        <div className="mb-6 flex items-start justify-between gap-6">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">QUICK CREATE</div>
            <h2 className="mt-2 text-xl font-semibold text-white">{selected?.title ?? "Create"}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-400">Close</button>
        </div>

        {!selected ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {groups.map(group => (
              <section key={group}>
                <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">{group}</div>
                <div className="space-y-2">
                  {presets.filter(item => item.group === group).map(item => (
                    <button key={item.id} type="button" onClick={() => choose(item)} className="w-full rounded-xl border border-white/10 bg-white/[0.02] p-3 text-left hover:bg-white/[0.04]">
                      <div className="text-sm font-medium text-white">{item.title}</div>
                      <div className="mt-1 text-xs text-slate-500">{item.table ?? "Composite preset"}</div>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              {selected.fields.map(field => (
                <label key={field} className="space-y-2">
                  <span className="block text-xs text-slate-500">{label(field)}</span>
                  <input
                    value={String(values[field] ?? "")}
                    onChange={event => setValues(current => ({ ...current, [field]: event.target.value }))}
                    className="w-full rounded-lg border border-white/10 bg-[#121820] px-3 py-2 text-sm text-slate-200 outline-none"
                    placeholder={field === "team_ids" ? "1,2,3,4" : ""}
                  />
                </label>
              ))}
            </div>

            {error && <div className="rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-200">{error}</div>}
            {success && <div className="rounded-xl border border-emerald-400/10 bg-emerald-400/5 px-4 py-3 text-sm text-emerald-200">{success}</div>}

            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setSelected(null)} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-400">Back</button>
              <button type="button" onClick={() => void create()} disabled={saving} className="rounded-lg bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-200 disabled:opacity-50">
                {saving ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
