import type { EntityFormField } from "../../../shared/components";

type PlayerRelationField = EntityFormField & { relation?: { table: string; labelColumn?: string } };
import type { EntityRow } from "../../../shared/api/editorApi";

export interface PlayerRelationConfig {
  id: string;
  title: string;
  table: string;
  columns: { key: string; label: string }[];
  fields: PlayerRelationField[];
  primaryKey: string[];
  playerField?: string;
  loadRows?: (playerId: number) => Promise<EntityRow[]>;
  defaults?: Record<string, string | number | boolean | null>;
}

const listAll = async (table: string) =>
  (await import("../../../shared/api/editorApi")).editorApi.entity.list(table, {
    page: 1,
    pageSize: 1000,
  });

const scoped = (table: string, field: string) =>
  async (playerId: number) => {
    const result = await listAll(table);
    return result.rows.filter(row => Number(row[field]) === playerId);
  };

export const playerRelationConfigs: PlayerRelationConfig[] = [
  {
    id: "club-periods", title: "Club Periods", table: "player_club_period",
    columns: [{ key: "club_id", label: "Club" }, { key: "start_date", label: "Start" }, { key: "end_date", label: "End" }],
    fields: [
      { name: "club_id", label: "Club", required: true, relation: { table: "team", labelColumn: "name" } },
      { name: "start_date", label: "Start Date", type: "date" }, { name: "end_date", label: "End Date", type: "date" },
    ],
    primaryKey: ["id"], loadRows: scoped("player_club_period", "player_id"),
  },
  {
    id: "national-team-periods", title: "National Team Periods", table: "player_national_team_period",
    columns: [{ key: "national_team_id", label: "National Team" }, { key: "start_date", label: "Start" }, { key: "end_date", label: "End" }],
    fields: [
      { name: "national_team_id", label: "National Team", required: true, relation: { table: "team", labelColumn: "name" } },
      { name: "start_date", label: "Start Date", type: "date" }, { name: "end_date", label: "End Date", type: "date" },
    ],
    primaryKey: ["id"], loadRows: scoped("player_national_team_period", "player_id"),
  },
  {
    id: "injuries", title: "Injuries", table: "player_injury",
    columns: [{ key: "injury_id", label: "Injury" }, { key: "start_date", label: "Start" }, { key: "end_date", label: "End" }, { key: "severity", label: "Severity" }],
    fields: [
      { name: "injury_id", label: "Injury", required: true, relation: { table: "injury", labelColumn: "name" } },
      { name: "start_date", label: "Start Date", required: true, type: "date" }, { name: "end_date", label: "End Date", type: "date" },
      { name: "future", label: "Future", type: "boolean" }, { name: "permanent", label: "Permanent", type: "boolean" },
      { name: "severity", label: "Severity", type: "number" }, { name: "side", label: "Side" }, { name: "prevents_training", label: "Prevents Training", type: "boolean" },
    ],
    primaryKey: ["id"], loadRows: scoped("player_injury", "player_id"),
    defaults: { future: false, permanent: false, prevents_training: false },
  },
  {
    id: "contracts", title: "Contracts", table: "person_contract",
    columns: [{ key: "club_id", label: "Club" }, { key: "start_date", label: "Start" }, { key: "end_date", label: "End" }, { key: "salary", label: "Salary" }, { key: "squad_number", label: "Squad #" }],
    fields: [
      { name: "club_id", label: "Club", required: true, relation: { table: "team", labelColumn: "name" } },
      { name: "employment_id", label: "Employment", relation: { table: "employment" } },
      { name: "start_date", label: "Start Date", type: "date" }, { name: "end_date", label: "End Date", type: "date" },
      { name: "contract_type", label: "Contract Type" }, { name: "salary", label: "Salary", type: "number" }, { name: "squad_number", label: "Squad Number", type: "number" },
    ],
    primaryKey: ["id"], playerField: "person_id",
    loadRows: async playerId => (await listAll("person_contract")).rows.filter(row => Number(row.person_id) === playerId),
  },
  {
    id: "clauses", title: "Contract Clauses", table: "player_contract_clause",
    columns: [{ key: "contract_id", label: "Contract" }, { key: "clause_type_id", label: "Type" }, { key: "value", label: "Value" }, { key: "percentage", label: "%" }],
    fields: [
      { name: "contract_id", label: "Contract", required: true, relation: { table: "person_contract" } },
      { name: "clause_type_id", label: "Clause Type", required: true, relation: { table: "contract_clause_type" } },
      { name: "value", label: "Value", type: "number" }, { name: "percentage", label: "Percentage", type: "number" },
      { name: "target_club_id", label: "Target Club", relation: { table: "team", labelColumn: "name" } },
      { name: "condition_id", label: "Condition", relation: { table: "clause_condition" } }, { name: "target_quantity", label: "Target Quantity", type: "number" },
    ],
    primaryKey: ["id"],
    loadRows: async playerId => {
      const [contracts, clauses] = await Promise.all([listAll("person_contract"), listAll("player_contract_clause")]);
      const ids = new Set(contracts.rows.filter(row => Number(row.person_id) === playerId).map(row => Number(row.id)));
      return clauses.rows.filter(row => ids.has(Number(row.contract_id)));
    },
  },
  {
    id: "transfers", title: "Transfers", table: "player_transfer",
    columns: [{ key: "origin_club_id", label: "From" }, { key: "destination_club_id", label: "To" }, { key: "transfer_date", label: "Date" }, { key: "fee", label: "Fee" }, { key: "permanent", label: "Permanent" }],
    fields: [
      { name: "origin_club_id", label: "Origin Club", relation: { table: "team", labelColumn: "name" } },
      { name: "destination_club_id", label: "Destination Club", relation: { table: "team", labelColumn: "name" } },
      { name: "transfer_type_id", label: "Transfer Type", relation: { table: "transfer_type" } },
      { name: "transfer_status_id", label: "Status", relation: { table: "transfer_status" } },
      { name: "transfer_window_id", label: "Transfer Window", relation: { table: "transfer_window" } },
      { name: "transfer_date", label: "Transfer Date", type: "date" }, { name: "fee", label: "Fee", type: "number" },
      { name: "currency_id", label: "Currency", relation: { table: "currency" } }, { name: "permanent", label: "Permanent", type: "boolean" },
    ],
    primaryKey: ["id"], loadRows: scoped("player_transfer", "player_id"), defaults: { permanent: true },
  },
  {
    id: "legacy-transfers", title: "Transfer Records", table: "transfer",
    columns: [{ key: "origin_club_id", label: "From" }, { key: "target_club_id", label: "To" }, { key: "transfer_date", label: "Date" }, { key: "transfer_value", label: "Value" }],
    fields: [
      { name: "origin_club_id", label: "Origin Club", relation: { table: "team", labelColumn: "name" } },
      { name: "target_club_id", label: "Target Club", relation: { table: "team", labelColumn: "name" } },
      { name: "transfer_date", label: "Transfer Date", type: "date" }, { name: "transfer_value", label: "Transfer Value", type: "number" },
    ],
    primaryKey: ["id"], loadRows: scoped("transfer", "player_id"),
  },
  {
    id: "loans", title: "Loans", table: "loaned_player",
    columns: [{ key: "root_club_id", label: "Root Club" }, { key: "target_club_id", label: "Loan Club" }, { key: "start_date", label: "Start" }, { key: "end_date", label: "End" }, { key: "is_foreign", label: "Foreign" }],
    fields: [
      { name: "root_club_id", label: "Root Club", required: true, relation: { table: "team", labelColumn: "name" } },
      { name: "target_club_id", label: "Loan Club", required: true, relation: { table: "team", labelColumn: "name" } },
      { name: "start_date", label: "Start Date", type: "date" }, { name: "end_date", label: "End Date", type: "date" }, { name: "is_foreign", label: "Foreign", type: "boolean" },
    ],
    primaryKey: ["id"], loadRows: scoped("loaned_player", "player_id"), defaults: { is_foreign: false },
  },
  {
    id: "career", title: "Career History", table: "player_career_history",
    columns: [{ key: "year", label: "Year" }, { key: "club_id", label: "Club" }, { key: "matches", label: "Matches" }, { key: "goals", label: "Goals" }, { key: "loan", label: "Loan" }, { key: "youth", label: "Youth" }],
    fields: [
      { name: "year", label: "Year", required: true, type: "number" }, { name: "order_number", label: "Order", type: "number" },
      { name: "club_id", label: "Club", relation: { table: "team", labelColumn: "name" } }, { name: "division_id", label: "Division", relation: { table: "division" } },
      { name: "start_date", label: "Start Date", type: "date" }, { name: "end_date", label: "End Date", type: "date" }, { name: "loan", label: "Loan", type: "boolean" }, { name: "youth", label: "Youth", type: "boolean" },
      { name: "matches", label: "Matches", type: "number" }, { name: "goals", label: "Goals", type: "number" }, { name: "transfer_value", label: "Transfer Value", type: "number" },
    ],
    primaryKey: ["id"], loadRows: scoped("player_career_history", "player_id"), defaults: { loan: false, youth: false },
  },
  {
    id: "achievements", title: "Achievements", table: "player_achievement",
    columns: [{ key: "team_id", label: "Team" }, { key: "competition_id", label: "Competition" }, { key: "achievement_type_id", label: "Type" }],
    fields: [
      { name: "team_id", label: "Team", relation: { table: "team", labelColumn: "name" } }, { name: "competition_id", label: "Competition", relation: { table: "competition" } },
      { name: "achievement_type_id", label: "Achievement Type", required: true, relation: { table: "player_achievement_type" } },
    ],
    primaryKey: ["id"], loadRows: scoped("player_achievement", "player_id"),
  },
  {
    id: "titles", title: "Titles", table: "person_title",
    columns: [{ key: "club_id", label: "Club" }, { key: "competition_id", label: "Competition" }, { key: "placement_id", label: "Placement" }],
    fields: [
      { name: "club_id", label: "Club", relation: { table: "team", labelColumn: "name" } }, { name: "competition_id", label: "Competition", relation: { table: "competition" } },
      { name: "placement_id", label: "Placement", relation: { table: "placement" } }, { name: "employment_id", label: "Employment", relation: { table: "employment" } },
    ],
    primaryKey: ["id"], playerField: "person_id", loadRows: async playerId => (await listAll("person_title")).rows.filter(row => Number(row.person_id) === playerId),
  },
  {
    id: "suspensions", title: "Suspensions", table: "person_suspension",
    columns: [{ key: "suspension_id", label: "Suspension" }, { key: "competition_id", label: "Competition" }, { key: "start_date", label: "Start" }, { key: "end_date", label: "End" }, { key: "number_of_matches", label: "Matches" }],
    fields: [
      { name: "suspension_id", label: "Suspension", required: true, relation: { table: "suspension" } },
      { name: "competition_id", label: "Competition", relation: { table: "competition" } },
      { name: "start_date", label: "Start Date", type: "date" }, { name: "end_date", label: "End Date", type: "date" }, { name: "number_of_matches", label: "Matches", type: "number" },
    ],
    primaryKey: ["id"], playerField: "person_id",
    loadRows: async playerId => (await listAll("person_suspension")).rows.filter(row => Number(row.person_id) === playerId),
  },
  {
    id: "relationships", title: "Person Relationships", table: "person_person_relationship",
    columns: [{ key: "person_id_1", label: "Person 1" }, { key: "person_id_2", label: "Person 2" }, { key: "level", label: "Level" }, { key: "is_positive", label: "Positive" }],
    fields: [
      { name: "person_id_1", label: "Person 1", required: true, relation: { table: "person", labelColumn: "full_name" } }, { name: "person_id_2", label: "Person 2", required: true, relation: { table: "person", labelColumn: "full_name" } },
      { name: "level", label: "Level", type: "number" }, { name: "reason_id", label: "Reason", relation: { table: "person_person_relationship_reason" } },
      { name: "is_permanent", label: "Permanent", type: "boolean" }, { name: "is_positive", label: "Positive", type: "boolean" },
    ],
    primaryKey: ["id"], loadRows: async playerId => (await listAll("person_person_relationship")).rows.filter(row => Number(row.person_id_1) === playerId || Number(row.person_id_2) === playerId),
    defaults: { is_permanent: false, is_positive: true },
  },
];

export const playerRelationGroups = [
  { id: "contracts", label: "Contracts", relationIds: ["contracts", "clauses"] },
  { id: "movement", label: "Movement", relationIds: ["club-periods", "national-team-periods", "transfers", "legacy-transfers", "loans"] },
  { id: "history", label: "History", relationIds: ["career", "achievements", "titles"] },
  { id: "health", label: "Health", relationIds: ["injuries"] },
  { id: "relationships", label: "Relationships", relationIds: ["relationships"] },
];
