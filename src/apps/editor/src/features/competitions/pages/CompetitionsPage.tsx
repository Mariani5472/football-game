import { useEffect, useState } from "react";
import { CrudEntityPage } from "../../../shared/components";
import { editorApi, type EntityRow } from "../../../shared/api/editorApi";
import { domainApi } from "../../../shared/api/domainApi";

export function CompetitionsPage() {
  const [competitions, setCompetitions] = useState<EntityRow[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [seasons, setSeasons] = useState<EntityRow[]>([]);
  const [selectedSeason, setSelectedSeason] = useState("");
  const [seasonYear, setSeasonYear] = useState(new Date().getFullYear());
  const [seasonStart, setSeasonStart] = useState("");
  const [seasonEnd, setSeasonEnd] = useState("");
  const [teams, setTeams] = useState<EntityRow[]>([]);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [seasonTeams, setSeasonTeams] = useState<EntityRow[]>([]);
  const [stageName, setStageName] = useState("Group Stage");
  const [stageType, setStageType] = useState<"GROUP" | "KNOCKOUT" | "LEAGUE">("GROUP");
  const [groupCount, setGroupCount] = useState(4);
  const [participantsPerGroup, setParticipantsPerGroup] = useState(4);
  const [qualificationCompetition, setQualificationCompetition] = useState("");
  const [qualificationFrom, setQualificationFrom] = useState(1);
  const [qualificationTo, setQualificationTo] = useState(4);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true); setError(null);
    try {
      const rows = await editorApi.entity.list("competition", { page: 1, pageSize: 100, orderBy: "name" });
      setCompetitions(rows.rows);
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); void editorApi.entity.list("team", { page: 1, pageSize: 100, orderBy: "name" }).then(result => setTeams(result.rows)).catch(cause => setError(cause instanceof Error ? cause.message : String(cause))); }, []);
  useEffect(() => {
    if (selectedId == null) { setSeasons([]); setSelectedSeason(""); return; }
    let active = true;
    void editorApi.entity.list("competition_season", { page: 1, pageSize: 100, search: String(selectedId), searchColumns: ["competition_id"], orderBy: "year", orderDirection: "DESC" })
      .then(result => { if (active) { const own = result.rows.filter(row => Number(row.competition_id) === selectedId); setSeasons(own); setSelectedSeason(String(own[0]?.id ?? "")); } })
      .catch(cause => { if (active) setError(cause instanceof Error ? cause.message : String(cause)); });
    return () => { active = false; };
  }, [selectedId]);

  if (loading) return <div className="p-8 text-sm text-slate-500">Loading competitions…</div>;
  return <div className="space-y-6">
    {error && <div role="alert" className="rounded-xl border border-red-400/20 p-3 text-sm text-red-300">{error}</div>}
    <CrudEntityPage config={{
      table: "competition", title: "Competitions", description: "Manage competitions, then choose a saved season to edit its linked structure.",
      duplicate: true, duplicateEntity: row => domainApi.duplicateCompetition(Number(row.id)),
      searchColumns: ["name", "three_letter_name"], columns: [
        { key: "name", header: "Competition" }, { key: "three_letter_name", header: "Code" },
        { key: "nation_id", header: "Nation", relation: { table: "nation" } }, { key: "type_id", header: "Type", relation: { table: "competition_type" } },
        { key: "level", header: "Level" }, { key: "reputation", header: "Reputation" }, { key: "extinct", header: "Extinct" },
      ], fields: [
        { name: "name", label: "Name", required: true }, { name: "three_letter_name", label: "Three Letter Name" },
        { name: "nation_id", label: "Nation", relation: { table: "nation" } }, { name: "gender_id", label: "Gender", relation: { table: "gender" } },
        { name: "level", label: "Level", type: "number" }, { name: "parent_competition_id", label: "Parent Competition", relation: { table: "competition" } },
        { name: "reputation", label: "Reputation", type: "number" }, { name: "trophy_id", label: "Trophy", relation: { table: "trophy" } },
        { name: "allows_foreign_referees", label: "Foreign Referees", type: "boolean" }, { name: "requires_seated_stadiums", label: "Requires Seated Stadiums", type: "boolean" },
        { name: "extinct", label: "Extinct", type: "boolean" }, { name: "type_id", label: "Type", relation: { table: "competition_type" } },
        { name: "goal_line_tv_only", label: "Goal Line TV Only", type: "boolean" }, { name: "goal_line_from_main_stage", label: "Goal Line From Main Stage", type: "boolean" },
        { name: "goal_line_from_sub_stage", label: "Goal Line From Sub Stage", type: "boolean" }, { name: "goal_line_from_date", label: "Goal Line From Date", type: "date" },
        { name: "minimum_referee_category_id", label: "Minimum Referee Category", relation: { table: "referee_category" } },
      ], defaultValues: { allows_foreign_referees: false, requires_seated_stadiums: false, extinct: false, goal_line_tv_only: false, goal_line_from_main_stage: false, goal_line_from_sub_stage: false },
    }} />
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <h2 className="text-lg font-medium text-white">Saved seasons</h2>
      <p className="mt-1 text-sm text-slate-500">Choose a competition above by ID to load its actual seasons, or create a blank season here, then add teams and stages.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-xs text-slate-400"><span>Competition</span><select value={selectedId ?? ""} onChange={event => setSelectedId(event.target.value ? Number(event.target.value) : null)} className="w-full rounded-lg border border-white/10 bg-[#121820] px-3 py-2 text-sm text-slate-200"><option value="">Select competition</option>{competitions.map(row => <option key={String(row.id)} value={String(row.id)}>{String(row.name)} (#{String(row.id)})</option>)}</select></label>
        <label className="space-y-1 text-xs text-slate-400"><span>Season</span><select value={selectedSeason} onChange={event => setSelectedSeason(event.target.value)} disabled={!seasons.length} className="w-full rounded-lg border border-white/10 bg-[#121820] px-3 py-2 text-sm text-slate-200"><option value="">Select season</option>{seasons.map(row => <option key={String(row.id)} value={String(row.id)}>{String(row.year)} — #{String(row.id)}</option>)}</select></label>
      </div>
      {selectedId != null && <div className="mt-4 grid gap-3 border-t border-white/10 pt-4 md:grid-cols-4"><label className="text-xs text-slate-400">Year<input type="number" value={seasonYear} onChange={event => setSeasonYear(Number(event.target.value))} className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white" /></label><label className="text-xs text-slate-400">Start<input type="date" value={seasonStart} onChange={event => setSeasonStart(event.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white" /></label><label className="text-xs text-slate-400">End<input type="date" value={seasonEnd} onChange={event => setSeasonEnd(event.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white" /></label><button type="button" disabled={!selectedId} onClick={async () => { try { const created = await editorApi.entity.create("competition_season", { competition_id: selectedId, year: seasonYear, start_date: seasonStart || null, end_date: seasonEnd || null, status: "DRAFT" }); const next = { ...created, competition_id: selectedId }; setSeasons(current => [next, ...current]); setSelectedSeason(String(created.id)); setNotice(`Season ${seasonYear} created.`); setError(null); } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); } }} className="self-end rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 disabled:opacity-40">Create season</button></div>}
      {selectedSeason && <SavedSeason seasonId={Number(selectedSeason)} teams={teams} selectedTeam={selectedTeam} setSelectedTeam={setSelectedTeam} seasonTeams={seasonTeams} setSeasonTeams={setSeasonTeams} stageName={stageName} setStageName={setStageName} stageType={stageType} setStageType={setStageType} groupCount={groupCount} setGroupCount={setGroupCount} participantsPerGroup={participantsPerGroup} setParticipantsPerGroup={setParticipantsPerGroup} competitions={competitions} qualificationCompetition={qualificationCompetition} setQualificationCompetition={setQualificationCompetition} qualificationFrom={qualificationFrom} setQualificationFrom={setQualificationFrom} qualificationTo={qualificationTo} setQualificationTo={setQualificationTo} saving={saving} setSaving={setSaving} onNotice={setNotice} onError={setError} />}
      {notice && <p role="status" className="mt-3 text-sm text-emerald-300">{notice}</p>}
    </section>
  </div>;
}

function SavedSeason(props: { seasonId: number; teams: EntityRow[]; selectedTeam: string; setSelectedTeam: (value: string) => void; seasonTeams: EntityRow[]; setSeasonTeams: (rows: EntityRow[]) => void; stageName: string; setStageName: (value: string) => void; stageType: "LEAGUE" | "GROUP" | "KNOCKOUT"; setStageType: (value: "LEAGUE" | "GROUP" | "KNOCKOUT") => void; groupCount: number; setGroupCount: (value: number) => void; participantsPerGroup: number; setParticipantsPerGroup: (value: number) => void; competitions: EntityRow[]; qualificationCompetition: string; setQualificationCompetition: (value: string) => void; qualificationFrom: number; setQualificationFrom: (value: number) => void; qualificationTo: number; setQualificationTo: (value: number) => void; saving: boolean; setSaving: (value: boolean) => void; onNotice: (value: string | null) => void; onError: (value: string | null) => void }) {
  const { seasonId } = props;
  const [rows, setRows] = useState<EntityRow[]>([]);
  const [editingStageId, setEditingStageId] = useState<number | null>(null);
  const [legs, setLegs] = useState(2);
  const [homeAway, setHomeAway] = useState(true);
  const [pointsRule, setPointsRule] = useState({ win: 3, draw: 1, loss: 0 });
  const [standingRules, setStandingRules] = useState<string[]>(["POINTS", "GOAL_DIFFERENCE", "GOALS_FOR", "WINS"]);
  const [matchRules, setMatchRules] = useState<Array<{ type: string; value?: string }>>([]);
  const [qualificationRules, setQualificationRules] = useState<Array<{ positionFrom: number; positionTo: number; type: string; destinationCompetitionId?: number; destinationStageId?: number }>>([]);
  const [scheduleValues, setScheduleValues] = useState({ startDate: "", endDate: "", intervalDays: 7 });
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { void editorApi.entity.list("competition_team", { page: 1, pageSize: 100, search: String(seasonId), searchColumns: ["competition_season_id"] }).then(result => props.setSeasonTeams(result.rows.filter(row => Number(row.competition_season_id) === seasonId))).catch(cause => props.onError(cause instanceof Error ? cause.message : String(cause))); }, [seasonId]);
  useEffect(() => { void editorApi.entity.list("competition_stage", { page: 1, pageSize: 100, search: String(seasonId), searchColumns: ["competition_season_id"], orderBy: "stage_order" }).then(result => setRows(result.rows.filter(row => Number(row.competition_season_id) === seasonId))).catch(cause => setError(cause instanceof Error ? cause.message : String(cause))); }, [seasonId]);
  async function addTeam() {
    if (!props.selectedTeam || props.seasonTeams.some(row => Number(row.team_id) === Number(props.selectedTeam))) return;
    try { await editorApi.entity.create("competition_team", { competition_season_id: seasonId, team_id: Number(props.selectedTeam) }); props.setSeasonTeams([...props.seasonTeams, { id: Date.now(), competition_season_id: seasonId, team_id: Number(props.selectedTeam) }]); props.setSelectedTeam(""); props.onNotice("Team added to season."); }
    catch (cause) { props.onError(cause instanceof Error ? cause.message : String(cause)); }
  }
  async function editStage(row: EntityRow) {
    const stageId = Number(row.id);
    try {
      const [formats, points, schedules, standings, matches, qualifications] = await Promise.all([
        editorApi.entity.list("stage_format", { page: 1, pageSize: 1, search: String(stageId), searchColumns: ["stage_id"] }),
        editorApi.entity.list("stage_points_rule", { page: 1, pageSize: 1, search: String(stageId), searchColumns: ["stage_id"] }),
        editorApi.entity.list("schedule_profile", { page: 1, pageSize: 1, search: String(stageId), searchColumns: ["stage_id"] }),
        editorApi.entity.list("standing_rule", { page: 1, pageSize: 100, search: String(stageId), searchColumns: ["stage_id"], orderBy: "rule_order" }),
        editorApi.entity.list("stage_match_rule", { page: 1, pageSize: 100, search: String(stageId), searchColumns: ["stage_id"] }),
        editorApi.entity.list("qualification_rule", { page: 1, pageSize: 100, search: String(stageId), searchColumns: ["stage_id"] }),
      ]);
      const format = formats.rows.find(item => Number(item.stage_id) === stageId);
      if (!format) throw new Error("This stage has no saved format configuration.");
      props.setStageName(String(row.name ?? ""));
      props.setStageType(String(format.format_type ?? "LEAGUE").toUpperCase() as typeof props.stageType);
      props.setGroupCount(Number(format.group_count ?? 1));
      props.setParticipantsPerGroup(Number(format.participants_per_group ?? 1));
      setLegs(Number(format.legs ?? 1)); setHomeAway(Number(format.home_away) === 1);
      const savedPoints = points.rows.find(item => Number(item.stage_id) === stageId);
      if (savedPoints) setPointsRule({ win: Number(savedPoints.win_points), draw: Number(savedPoints.draw_points), loss: Number(savedPoints.loss_points) });
      const savedSchedule = schedules.rows.find(item => Number(item.stage_id) === stageId);
      setScheduleValues({ startDate: String(savedSchedule?.start_date ?? ""), endDate: String(savedSchedule?.end_date ?? ""), intervalDays: Number(savedSchedule?.interval_days ?? 7) });
      setEditingStageId(stageId);
      const savedQualificationRules = qualifications.rows.filter(item => Number(item.stage_id) === stageId).map(item => ({ positionFrom: Number(item.position_from), positionTo: Number(item.position_to), type: String(item.qualification_type ?? "QUALIFY"), destinationCompetitionId: item.destination_competition_id == null ? undefined : Number(item.destination_competition_id), destinationStageId: item.destination_stage_id == null ? undefined : Number(item.destination_stage_id) }));
      setQualificationRules(savedQualificationRules);
      const qualification = savedQualificationRules[0];
      props.setQualificationCompetition(qualification?.destinationCompetitionId == null ? "" : String(qualification.destinationCompetitionId));
      props.setQualificationFrom(qualification?.positionFrom ?? 1); props.setQualificationTo(qualification?.positionTo ?? 1);
      setStandingRules(standings.rows.filter(item => Number(item.stage_id) === stageId).sort((a, b) => Number(a.rule_order) - Number(b.rule_order)).map(item => String(item.rule_type)));
      setMatchRules(matches.rows.filter(item => Number(item.stage_id) === stageId).map(item => ({ type: String(item.rule_type), value: item.rule_value == null ? undefined : String(item.rule_value) })));
      props.onNotice(`Loaded saved rules for ${String(row.name)}.`);
      setError(null);
    } catch (cause) { props.onError(cause instanceof Error ? cause.message : String(cause)); }
  }
  async function addStage() {
    props.setSaving(true); props.onError(null); props.onNotice(null);
    try {
      const nextOrder = Math.max(0, ...rows.map(row => Number(row.stage_order))) + 1;
      const payload = { seasonId, name: props.stageName, stageOrder: editingStageId == null ? nextOrder : Number(rows.find(row => Number(row.id) === editingStageId)?.stage_order ?? nextOrder), participantRule: { type: "TEAM", minimum: props.seasonTeams.length || undefined, maximum: props.seasonTeams.length || undefined }, format: { type: props.stageType, participantCount: props.seasonTeams.length || undefined, groupCount: props.stageType === "GROUP" ? props.groupCount : undefined, participantsPerGroup: props.stageType === "GROUP" ? props.participantsPerGroup : undefined, legs: props.stageType === "KNOCKOUT" ? Math.min(legs, 2) : legs, homeAway: props.stageType !== "KNOCKOUT" && homeAway }, points: props.stageType === "KNOCKOUT" ? undefined : pointsRule, qualificationRules: editingStageId == null ? (props.qualificationCompetition ? [{ positionFrom: props.qualificationFrom, positionTo: props.qualificationTo, type: "QUALIFY", destinationCompetitionId: Number(props.qualificationCompetition) }] : []) : (props.qualificationCompetition ? [{ positionFrom: props.qualificationFrom, positionTo: props.qualificationTo, type: qualificationRules[0]?.type ?? "QUALIFY", destinationCompetitionId: Number(props.qualificationCompetition), destinationStageId: qualificationRules[0]?.destinationStageId }, ...qualificationRules.slice(1)] : []), standingRules: editingStageId == null ? (props.stageType === "KNOCKOUT" ? [] : standingRules) : standingRules, matchRules, schedule: { type: props.stageType === "KNOCKOUT" ? "KNOCKOUT" : "ROUND_ROBIN", startDate: scheduleValues.startDate || undefined, endDate: scheduleValues.endDate || undefined, intervalDays: scheduleValues.intervalDays, homeAwayBalanced: homeAway } };
      const saved = editingStageId == null ? await editorApi.domain.createCompetitionStage(payload) : await editorApi.domain.updateCompetitionStage(editingStageId, payload);
      setRows(current => editingStageId == null ? [...current, { id: saved.id, competition_season_id: seasonId, name: saved.name, stage_order: saved.stageOrder }] : current.map(row => Number(row.id) === saved.id ? { ...row, name: saved.name } : row)); props.onNotice(`Stage “${saved.name}” ${editingStageId == null ? "created" : "updated"} with its format and rules.`); setEditingStageId(null);
    } catch (cause) { props.onError(cause instanceof Error ? cause.message : String(cause)); }
    finally { props.setSaving(false); }
  }
  return <div className="mt-5 space-y-6 border-t border-white/10 pt-4"><section><h3 className="font-medium text-slate-200">Season teams ({props.seasonTeams.length})</h3><div className="mt-3 flex gap-2"><select value={props.selectedTeam} onChange={event => props.setSelectedTeam(event.target.value)} className="flex-1 rounded-lg border border-white/10 bg-[#121820] px-3 py-2 text-sm text-slate-200"><option value="">Select a team</option>{props.teams.map(team => <option key={String(team.id)} value={String(team.id)}>{String(team.name)}</option>)}</select><button type="button" onClick={() => void addTeam()} className="rounded-lg border border-white/10 px-4 text-sm text-slate-200">Add team</button></div><ul className="mt-3 flex flex-wrap gap-2">{props.seasonTeams.map(row => <li key={String(row.id)} className="rounded-md bg-white/5 px-2 py-1 text-xs text-slate-300">{String(props.teams.find(team => Number(team.id) === Number(row.team_id))?.name ?? `Team #${row.team_id}`)}</li>)}</ul></section><section><h3 className="font-medium text-slate-200">Stages</h3>{error && <p role="alert" className="mt-2 text-sm text-red-300">{error}</p>}{rows.length ? <ul className="mt-3 space-y-2">{rows.map(row => <li key={String(row.id)} className="flex items-center justify-between rounded-lg border border-white/5 px-3 py-2 text-sm"><span>{String(row.stage_order)}. {String(row.name)} <span className="text-slate-500">#{String(row.id)}</span></span><button type="button" disabled={props.saving} onClick={() => void editStage(row)} className="rounded border border-white/10 px-2 py-1 text-xs text-slate-300">Edit rules</button></li>)}</ul> : <p className="mt-2 text-sm text-slate-500">No stages saved for this season.</p>}<div className="mt-4 grid gap-3 md:grid-cols-4"><input value={props.stageName} onChange={event => props.setStageName(event.target.value)} aria-label="Stage name" className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"/><select value={props.stageType} onChange={event => props.setStageType(event.target.value as typeof props.stageType)} className="rounded-lg border border-white/10 bg-[#121820] px-3 py-2 text-sm text-white"><option value="LEAGUE">League</option><option value="GROUP">Group</option><option value="KNOCKOUT">Knockout</option></select>{props.stageType === "GROUP" && <><input type="number" min="1" value={props.groupCount} onChange={event => props.setGroupCount(Number(event.target.value))} aria-label="Group count" className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"/><input type="number" min="1" value={props.participantsPerGroup} onChange={event => props.setParticipantsPerGroup(Number(event.target.value))} aria-label="Participants per group" className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"/></>}</div><div className="mt-3 grid gap-2 md:grid-cols-3"><label className="text-xs text-slate-400">Legs<input type="number" min="1" max="4" value={legs} onChange={event => setLegs(Number(event.target.value))} className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"/></label><label className="text-xs text-slate-400">Win points<input type="number" value={pointsRule.win} onChange={event => setPointsRule({ ...pointsRule, win: Number(event.target.value) })} className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"/></label><label className="text-xs text-slate-400">Draw points<input type="number" value={pointsRule.draw} onChange={event => setPointsRule({ ...pointsRule, draw: Number(event.target.value) })} className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"/></label><label className="text-xs text-slate-400">Loss points<input type="number" value={pointsRule.loss} onChange={event => setPointsRule({ ...pointsRule, loss: Number(event.target.value) })} className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"/></label><label className="text-xs text-slate-400">Schedule start<input type="date" value={scheduleValues.startDate} onChange={event => setScheduleValues({ ...scheduleValues, startDate: event.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"/></label><label className="text-xs text-slate-400">Schedule end<input type="date" value={scheduleValues.endDate} onChange={event => setScheduleValues({ ...scheduleValues, endDate: event.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"/></label><label className="text-xs text-slate-400">Interval days<input type="number" min="1" value={scheduleValues.intervalDays} onChange={event => setScheduleValues({ ...scheduleValues, intervalDays: Number(event.target.value) })} className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"/></label><label className="flex items-center gap-2 text-xs text-slate-400"><input type="checkbox" checked={homeAway} onChange={event => setHomeAway(event.target.checked)}/>Home and away</label><select value={props.qualificationCompetition} onChange={event => props.setQualificationCompetition(event.target.value)} className="rounded-lg border border-white/10 bg-[#121820] px-3 py-2 text-sm text-white"><option value="">No qualification destination</option>{props.competitions.map(competition => <option key={String(competition.id)} value={String(competition.id)}>{String(competition.name)}</option>)}</select><input type="number" min="1" value={props.qualificationFrom} onChange={event => props.setQualificationFrom(Number(event.target.value))} aria-label="Qualification from position" className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"/><input type="number" min="1" value={props.qualificationTo} onChange={event => props.setQualificationTo(Number(event.target.value))} aria-label="Qualification to position" className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"/></div><button type="button" disabled={props.saving} onClick={() => void addStage()} className="mt-3 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-50">{props.saving ? "Saving…" : editingStageId == null ? "Create stage" : "Save stage changes"}</button></section></div>;
}