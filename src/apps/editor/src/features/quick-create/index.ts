import { useState } from "react";
import { editorApi, type Scalar } from "../../shared/api/editorApi";

export interface QuickCreatePreset {}\n\nexport type QuickCreatePreset =
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

    const team = await editorApi.create("team", {
      name,
      short_name: String(values.short_name ?? "").trim() || null,
      nation_id: values.nation_id == null || values.nation_id === "" ? null : toNumber(values.nation_id),
    });
    const teamId = Number(team.id);

    await editorApi.create("club", {
      team_id: teamId,
      city_id: values.city_id == null || values.city_id === "" ? null : toNumber(values.city_id),
      base_nation_id: values.nation_id == null || values.nation_id === "" ? null : toNumber(values.nation_id),
    });

    if (String(values.stadium_name ?? "").trim() && values.city_id) {
      await editorApi.create("stadium", {
        city_id: toNumber(values.city_id),
        name: String(values.stadium_name).trim(),
        owner_club_id: teamId,
      });
    }

    return `Team #${teamId} → Club #${teamId}`;
  }

  if (preset === "new-player") {
    const fullName = String(values.full_name ?? "").trim();
    if (!fullName) throw new Error("Full name is required.");

    const person = await editorApi.create("person", {
      full_name: fullName,
      common_name: String(values.common_name ?? "").trim() || null,
      birth_date: String(values.birth_date ?? "") || null,
      nationality_id: values.nationality_id == null || values.nationality_id === "" ? null : toNumber(values.nationality_id),
      person_type_id: values.person_type_id == null || values.person_type_id === "" ? null : toNumber(values.person_type_id),
    });
    const playerId = Number(person.id);

    await editorApi.create("player", { person_id: playerId });

    if (values.position_id) {
      await editorApi.create("player_position", {
        player_id: playerId,
        position_id: toNumber(values.position_id),
        rating: toNumber(values.position_rating, 10),
      });
    }

    return `Person #${playerId} → Player #${playerId}`;
  }

  const teamIds = parseIds(values.team_ids);
  if (teamIds.length < 2) throw new Error("Provide at least two team IDs.");

  const competition = await editorApi.create("competition", {
    name: String(values.name ?? "").trim(),
    nation_id: toNumber(values.country_id),
  });
  const competitionId = Number(competition.id);

  const season = await editorApi.create("competition_season", {
    competition_id: competitionId,
    year: toNumber(values.year, new Date().getFullYear()),
    start_date: String(values.start_date ?? ""),
    end_date: String(values.end_date ?? ""),
  });
  const seasonId = Number(season.id);

  const stage = await editorApi.create("competition_stage", {
    competition_season_id: seasonId,
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
    legs: Math.max(1, toNumber(values.turns, 2)),
    home_away: toNumber(values.turns, 2) > 1 ? 1 : 0,
  });
  await editorApi.create("stage_points_rule", {
    stage_id: stageId,
    win_points: toNumber(values.win_points, 3),
    draw_points: toNumber(values.draw_points, 1),
    loss_points: toNumber(values.loss_points, 0),
  });
  await editorApi.create("schedule_profile", {
    stage_id: stageId,
    scheduling_type: "ROUND_ROBIN",
    start_date: String(values.start_date ?? ""),
    end_date: String(values.end_date ?? ""),
    interval_days: 7,
    home_away_balanced: 1,
  });

  if (toNumber(values.turns, 2) > 0) {
    const participants = teamIds;
    const roundsPerLeg = participants.length % 2 === 0
      ? participants.length - 1
      : participants.length;
    let roundNumber = 0;

    for (let leg = 0; leg < toNumber(values.turns, 2); leg++) {
      for (let round = 0; round < roundsPerLeg; round++) {
        const createdRound = await editorApi.create("competition_round", {
          stage_id: stageId,
          round_number: ++roundNumber,
          name: `Round ${roundNumber}`,
        });

        if (participants.length < 2) continue;

        const rotation = [...participants];
        const fixed = rotation.shift()!;
        const slots = [fixed, ...rotation];

        for (let pair = 0; pair < Math.floor(slots.length / 2); pair++) {
          const home = slots[pair];
          const away = slots[slots.length - 1 - pair];
          if (home == null || away == null || home === away) continue;

          const direction = (round + leg) % 2 === 0;
          await editorApi.create("fixture", {
            round_id: Number(createdRound.id),
            home_team_id: direction ? home : away,
            away_team_id: direction ? away : home,
          });
        }

        rotation.unshift(rotation.pop()!);
      }
    }
  }

  return `Competition #${competitionId} → Season #${seasonId} → Stage #${stageId} → Rules → Schedule`;
}

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
      if (selected.id === "new-league" || selected.id === "new-club" || selected.id === "new-player") {
        const result = await createComposite(selected.id, values);
        setSuccess(`Created: ${result}.`);
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

