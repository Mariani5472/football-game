
import type { CrudEntityConfig, CrudField } from "../../../shared/components";
import {
  clubConfig,
  clubConfig as _clubConfig,
  ownershipConfig,
  reserveTeamConfig,
  financeConfig,
  embargoConfig,
  revenueConfig,
  debtConfig,
  ffpConfig,
  fanProfileConfig,
  objectivesConfig,
  equipmentConfig,
  teamPersonConfig,
  captainConfig,
  partnershipConfig,
  retiredNumberConfig,
  affiliationConfig,
  rivalryConfig,
  derbyConfig,
  competitionHistoryConfig,
  regionalCompetitionConfig,
  expectationConfig,
  coefficientConfig,
  tacticalProfileConfig,
} from "./teamConfig";

export type ClubEditorTabId =
  | "identity"
  | "location"
  | "stadium"
  | "ownership"
  | "finances"
  | "staff"
  | "players"
  | "affiliations"
  | "rivals"
  | "supporters"
  | "competitions"
  | "tactics"
  | "kits"
  | "history"
  | "records";

export interface ClubEditorTabDefinition {
  id: ClubEditorTabId;
  label: string;
  description: string;
  configs: ClubRelationConfig[];
}

export interface ClubRelationConfig {
  id: string;
  title: string;
  description: string;
  table: string;
  fields: CrudField[];
  columns: { key: string; label: string }[];
  primaryKey: string[];
  scope: ClubScope;
  createDefaults?: Record<string, string | number | boolean | null>;
  normalizeCreate?: (clubId: number, values: Record<string, unknown>) => Record<string, unknown>;
  emptyMessage?: string;
}

export type ClubScope =
  | { type: "club"; field: string }
  | { type: "team"; field: string }
  | { type: "either"; fields: string[] };

const c = (
  config: CrudEntityConfig,
  scope: ClubScope,
  id: string,
  primaryKey: string[] = ["id"],
): ClubRelationConfig => ({
  id,
  title: config.title,
  description: config.description,
  table: config.table,
  fields: config.fields.filter(field => field.name !== "club_id" && field.name !== "team_id"),
  columns: config.columns.map(column => ({ key: column.key, label: column.header })),
  primaryKey,
  scope,
});

export const clubEditorRelations = {
  ownership: c(ownershipConfig, { type: "club", field: "club_id" }, "ownership", ["club_id"]),
  finance: c(financeConfig, { type: "club", field: "club_id" }, "finance", ["club_id"]),
  fanProfile: c(fanProfileConfig, { type: "club", field: "club_id" }, "fan-profile", ["club_id"]),
  tacticalProfile: c(tacticalProfileConfig, { type: "team", field: "team_id" }, "tactical-profile", ["team_id"]),
  reserve: c(reserveTeamConfig, { type: "club", field: "club_id" }, "reserve", ["id"]),
  embargo: c(embargoConfig, { type: "club", field: "club_id" }, "embargo", ["club_id", "embargo_type_id"]),
  revenue: c(revenueConfig, { type: "club", field: "club_id" }, "revenue", ["id"]),
  debt: c(debtConfig, { type: "club", field: "club_id" }, "debt", ["id"]),
  ffp: c(ffpConfig, { type: "club", field: "club_id" }, "ffp", ["id"]),
  objectives: c(objectivesConfig, { type: "club", field: "club_id" }, "objectives", ["id"]),
  equipment: c(equipmentConfig, { type: "team", field: "team_id" }, "kits", ["id"]),
  staff: c(teamPersonConfig, { type: "team", field: "team_id" }, "staff", ["id"]),
  captain: c(captainConfig, { type: "team", field: "team_id" }, "captains", ["id"]),
  partnership: c(partnershipConfig, { type: "team", field: "team_id" }, "partnerships", ["id"]),
  retiredNumber: c(retiredNumberConfig, { type: "team", field: "team_id" }, "retired-numbers", ["id"]),
  affiliation: c(affiliationConfig, { type: "either", fields: ["root_club_id", "target_club_id"] }, "affiliations", ["id"]),
  rivalry: c(rivalryConfig, { type: "either", fields: ["team_id_1", "team_id_2"] }, "rivals", ["id"]),
  derby: c(derbyConfig, { type: "either", fields: ["club_id_1", "club_id_2"] }, "derbies", ["id"]),
  competitionHistory: c(competitionHistoryConfig, { type: "club", field: "club_id" }, "competition-history", ["id"]),
  regionalCompetition: c(regionalCompetitionConfig, { type: "club", field: "club_id" }, "regional-competitions", ["id"]),
  expectation: c(expectationConfig, { type: "club", field: "club_id" }, "expectations", ["id"]),
  coefficient: c(coefficientConfig, { type: "club", field: "club_id" }, "coefficients", ["id"]),
  record: {
    id: "records",
    title: "Records",
    description: "Club records across matches, players, attendance and transfers.",
    table: "club_record",
    fields: [
      { name: "record_type_id", label: "Record Type", relation: { table: "record_type", labelColumn: "name" } },
      { name: "date", label: "Date", type: "date" },
      { name: "opponent_club_id", label: "Opponent Club", relation: { table: "club", labelColumn: "team_id" } },
      { name: "team_goals", label: "Team Goals", type: "number" },
      { name: "opponent_goals", label: "Opponent Goals", type: "number" },
      { name: "competition_id", label: "Competition", relation: { table: "competition" } },
      { name: "attendance", label: "Attendance", type: "number" },
      { name: "matches", label: "Matches", type: "number" },
      { name: "start_date", label: "Start Date", type: "date" },
      { name: "end_date", label: "End Date", type: "date" },
      { name: "player_id", label: "Player", relation: { table: "player", labelColumn: "person_id" } },
      { name: "goals", label: "Goals", type: "number" },
      { name: "assists", label: "Assists", type: "number" },
      { name: "transfer_value", label: "Transfer Value", type: "number" },
      { name: "seconds", label: "Seconds", type: "number" },
    ],
    columns: [
      { key: "record_type_id", label: "Record Type" },
      { key: "date", label: "Date" },
      { key: "opponent_club_id", label: "Opponent" },
      { key: "competition_id", label: "Competition" },
      { key: "attendance", label: "Attendance" },
      { key: "matches", label: "Matches" },
    ],
    primaryKey: ["id"],
    scope: { type: "club", field: "club_id" },
  },
  stadiumChanges: {
    id: "stadium-changes",
    title: "Stadium Changes",
    description: "Historical home-stadium changes and their effective periods.",
    table: "stadium_change",
    fields: [
      { name: "change_type_id", label: "Change Type", relation: { table: "stadium_change_type" } },
      { name: "new_stadium_id", label: "New Stadium", relation: { table: "stadium" } },
      { name: "old_stadium_id", label: "Old Stadium", relation: { table: "stadium" } },
      { name: "start_date", label: "Start Date", type: "date" },
      { name: "end_date", label: "End Date", type: "date" },
    ],
    columns: [
      { key: "change_type_id", label: "Change Type" },
      { key: "new_stadium_id", label: "New Stadium" },
      { key: "old_stadium_id", label: "Old Stadium" },
      { key: "start_date", label: "Start Date" },
    ],
    primaryKey: ["id"],
    scope: { type: "club", field: "club_id" },
  },
  alternativeStadium: {
    id: "alternative-stadium",
    title: "Alternative Stadiums",
    description: "Competition-specific alternative venues used by the club.",
    table: "alternative_stadium",
    fields: [
      { name: "competition_id", label: "Competition", relation: { table: "competition" } },
      { name: "stadium_id", label: "Stadium", relation: { table: "stadium" } },
      { name: "year", label: "Year", type: "number" },
      { name: "stage_type_id", label: "Stage Type", relation: { table: "competition_stage_type" } },
      { name: "start_date", label: "Start Date", type: "date" },
      { name: "end_date", label: "End Date", type: "date" },
    ],
    columns: [
      { key: "competition_id", label: "Competition" },
      { key: "stadium_id", label: "Stadium" },
      { key: "year", label: "Year" },
      { key: "start_date", label: "Start Date" },
    ],
    primaryKey: ["id"],
    scope: { type: "club", field: "club_id" },
  },
  playerPeriods: c({
    ...clubConfig,
    table: "player_club_period",
    title: "Players",
    description: "Players associated with this club over time.",
    fields: [
      { name: "player_id", label: "Player", relation: { table: "player", labelColumn: "person_id" } },
      { name: "club_id", label: "Club", relation: { table: "club" } },
      { name: "start_date", label: "Start Date", type: "date" },
      { name: "end_date", label: "End Date", type: "date" },
    ],
    columns: [
      { key: "player_id", header: "Player" },
      { key: "start_date", header: "Start Date" },
      { key: "end_date", header: "End Date" },
    ],
  } as CrudEntityConfig, { type: "club", field: "club_id" }, "players", ["id"]),
} as const;

export const clubEditorTabs: ClubEditorTabDefinition[] = [
  {
    id: "identity",
    label: "Identity",
    description: "Shared team identity and club subtype.",
    configs: [],
  },
  {
    id: "location",
    label: "Location",
    description: "City, operating nation and international competition base.",
    configs: [],
  },
  {
    id: "stadium",
    label: "Stadium",
    description: "Owned stadiums, stadium changes and alternative venues.",
    configs: [clubEditorRelations.stadiumChanges, clubEditorRelations.alternativeStadium],
  },
  {
    id: "ownership",
    label: "Ownership",
    description: "Ownership model, elections, promises and restrictions.",
    configs: [clubEditorRelations.ownership],
  },
  {
    id: "finances",
    label: "Finances",
    description: "Balances, budgets, ticketing, revenues, debts, embargoes and FFP.",
    configs: [clubEditorRelations.finance, clubEditorRelations.embargo, clubEditorRelations.revenue, clubEditorRelations.debt, clubEditorRelations.ffp],
  },
  {
    id: "staff",
    label: "Staff",
    description: "People connected to the club, legends and permanent relationships.",
    configs: [clubEditorRelations.staff],
  },
  {
    id: "players",
    label: "Players",
    description: "Squad periods, captaincy, player partnerships and retired numbers.",
    configs: [clubEditorRelations.playerPeriods, clubEditorRelations.captain, clubEditorRelations.partnership, clubEditorRelations.retiredNumber],
  },
  {
    id: "affiliations",
    label: "Affiliations",
    description: "Parent and affiliate clubs.",
    configs: [clubEditorRelations.affiliation],
  },
  {
    id: "rivals",
    label: "Rivals",
    description: "Team rivalries and named derbies.",
    configs: [clubEditorRelations.rivalry, clubEditorRelations.derby],
  },
  {
    id: "supporters",
    label: "Supporters",
    description: "Supporter profile and fan objectives.",
    configs: [clubEditorRelations.fanProfile, clubEditorRelations.objectives],
  },
  {
    id: "competitions",
    label: "Competitions",
    description: "Competition history, regional participation, expectations and coefficients.",
    configs: [clubEditorRelations.competitionHistory, clubEditorRelations.regionalCompetition, clubEditorRelations.expectation, clubEditorRelations.coefficient],
  },
  {
    id: "tactics",
    label: "Tactics",
    description: "Preferred, offensive and defensive tactical profiles.",
    configs: [clubEditorRelations.tacticalProfile],
  },
  {
    id: "kits",
    label: "Kits",
    description: "Competition and season-specific team equipment.",
    configs: [clubEditorRelations.equipment],
  },
  {
    id: "history",
    label: "History",
    description: "Longitudinal competition participation and legacy context.",
    configs: [clubEditorRelations.competitionHistory, clubEditorRelations.regionalCompetition],
  },
  {
    id: "records",
    label: "Records",
    description: "Historical club records and notable statistical marks.",
    configs: [clubEditorRelations.record],
  },
];

export const clubEditorIdentityConfigs = [teamConfig, clubConfig];
