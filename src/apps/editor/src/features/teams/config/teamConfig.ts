import type { CrudColumn, CrudEntityConfig, CrudField } from "../../../shared/components";

const rel = (table: string, labelColumn = "name") => ({ table, labelColumn });

const field = (
  name: string,
  label: string,
  options: Omit<CrudField, "name" | "label"> = {},
): CrudField => ({ name, label, ...options });

const columns = (items: Array<[string, string, CrudColumn["relation"]?]>): CrudColumn[] =>
  items.map(([key, header, relation]) => ({ key, header, ...(relation ? { relation } : {}) }));

const config = (
  table: string,
  title: string,
  description: string,
  fields: CrudField[],
  visibleColumns: Array<[string, string, CrudColumn["relation"]?]>,
  searchColumns?: string[],
): CrudEntityConfig => ({
  table,
  title,
  description,
  fields,
  columns: columns(visibleColumns),
  searchColumns,
  pageSize: 15,
});

export const teamConfig = config(
  "team",
  "Teams",
  "Shared identity used by clubs and national teams.",
  [
    field("name", "Name", { required: true }),
    field("short_name", "Short Name"),
    field("six_letter_name", "Six Letter Name"),
    field("three_letter_name", "Three Letter Name"),
    field("alternative_three_letter_name", "Alternative Three Letter Name"),
    field("nickname", "Nickname"),
    field("hashtag", "Hashtag"),
    field("gender_id", "Gender", { relation: rel("gender") }),
    field("nation_id", "Nation", { relation: rel("nation") }),
    field("extinct", "Extinct", { type: "boolean" }),
    field("reputation", "Reputation", { type: "number" }),
    field("primary_color", "Primary Color"),
    field("secondary_color", "Secondary Color"),
    field("tertiary_color", "Tertiary Color"),
  ],
  [
    ["name", "Name"],
    ["short_name", "Short Name"],
    ["gender_id", "Gender", rel("gender")],
    ["nation_id", "Nation", rel("nation")],
    ["reputation", "Reputation"],
    ["extinct", "Extinct"],
  ],
  ["name", "short_name", "three_letter_name", "nickname"],
);

export const clubConfig = config(
  "club",
  "Club",
  "Club subtype and competitive restrictions for the selected team.",
  [
    field("team_id", "Team", { relation: rel("team") }),
    field("city_id", "City", { relation: rel("city") }),
    field("base_nation_id", "Base Nation", { relation: rel("nation") }),
    field("international_competition_nation_id", "International Competition Nation", { relation: rel("nation") }),
    field("situation_id", "Status", { relation: rel("club_status") }),
    field("min_age", "Minimum Age", { type: "number", min: 0 }),
    field("max_age", "Maximum Age", { type: "number", min: 0 }),
    field("morale", "Morale", { type: "number" }),
    field("is_institute", "Institute", { type: "boolean" }),
    field("is_all_star", "All-Star", { type: "boolean" }),
    field("observation_package_id", "Observation", { relation: rel("club_observation") }),
    field("has_extra_designated_player_slot", "Extra Designated Player Slot", { type: "boolean" }),
  ],
  [
    ["team_id", "Team", rel("team")],
    ["city_id", "City", rel("city")],
    ["base_nation_id", "Base Nation", rel("nation")],
    ["situation_id", "Status", rel("club_status")],
    ["morale", "Morale"],
    ["is_all_star", "All-Star"],
  ],
);

export const nationalTeamInfoConfig = config(
  "national_team_info",
  "National Team Info",
  "National-team-specific identity, ranking and federation data.",
  [
    field("team_id", "National Team", { relation: rel("team") }),
    field("financial_power", "Financial Power", { type: "number" }),
    field("match_importance", "Match Importance", { type: "number" }),
    field("foundation_year", "Foundation Year", { type: "number" }),
    field("ranking_points", "Ranking Points", { type: "number", step: "0.01" }),
    field("foreign_coach_probability", "Foreign Coach Probability", { type: "number", step: "0.01", min: 0, max: 1 }),
    field("federation_power", "Federation Power", { type: "number" }),
    field("youth_ranking", "Youth Ranking", { type: "number" }),
  ],
  [
    ["team_id", "Team", rel("team")],
    ["financial_power", "Financial Power"],
    ["ranking_points", "Ranking Points"],
    ["federation_power", "Federation Power"],
    ["youth_ranking", "Youth Ranking"],
  ],
);

export const nationalTeamCoefficientConfig = config(
  "national_team_coefficient",
  "National Team Coefficients",
  "Historical national-team coefficients by season offset.",
  [
    field("national_team_id", "National Team", { relation: rel("national_team") }),
    field("season_offset", "Season Offset", { type: "number", min: -10, max: -1 }),
    field("coefficient", "Coefficient", { type: "number", step: "0.01" }),
  ],
  [
    ["national_team_id", "National Team", rel("national_team")],
    ["season_offset", "Season Offset"],
    ["coefficient", "Coefficient"],
  ],
);

export const ownershipConfig = config(
  "club_ownership",
  "Ownership",
  "Ownership structure, election rules and financial conditions.",
  [
    field("club_id", "Club", { relation: rel("club") }),
    field("president_title_id", "President Title", { relation: rel("president_title") }),
    field("ownership_type_id", "Ownership Type", { relation: rel("ownership_type") }),
    field("election_date", "Election Date", { type: "date" }),
    field("promise_id", "Promise", { relation: rel("ownership_promise") }),
    field("max_term_duration", "Max Term Duration", { type: "number" }),
    field("max_conditions", "Max Conditions", { type: "number" }),
    field("min_revenue", "Minimum Revenue", { type: "number" }),
    field("max_attendance", "Maximum Attendance", { type: "number" }),
    field("prevent_external_acquisition", "Prevent External Acquisition", { type: "boolean" }),
  ],
  [
    ["club_id", "Club", rel("club")],
    ["ownership_type_id", "Ownership Type", rel("ownership_type")],
    ["election_date", "Election Date"],
    ["promise_id", "Promise", rel("ownership_promise")],
    ["prevent_external_acquisition", "External Acquisition Blocked"],
  ],
);

export const reserveTeamConfig = config(
  "reserve_team",
  "Reserve Teams",
  "Reserve-team identity and match-day configuration.",
  [
    field("club_id", "Parent Club", { relation: rel("club") }),
    field("team_id", "Reserve Team", { relation: rel("team") }),
    field("situation_id", "Status", { relation: rel("club_status") }),
    field("competition_id", "Competition", { relation: rel("competition") }),
    field("stadium_id", "Stadium", { relation: rel("stadium") }),
    field("home_weekday_id", "Home Weekday", { relation: rel("weekday") }),
    field("home_weekend_weekday_id", "Home Weekend Weekday", { relation: rel("weekday") }),
    field("average_attendance", "Average Attendance", { type: "number" }),
    field("minimum_attendance", "Minimum Attendance", { type: "number" }),
    field("maximum_attendance", "Maximum Attendance", { type: "number" }),
  ],
  [
    ["club_id", "Club", rel("club")],
    ["team_id", "Team", rel("team")],
    ["competition_id", "Competition", rel("competition")],
    ["average_attendance", "Average Attendance"],
  ],
);

export const financeConfig = config(
  "club_finance",
  "Finance",
  "Club balance, budgets, ticketing and transfer embargo state.",
  [
    field("club_id", "Club", { relation: rel("club") }),
    field("balance", "Balance", { type: "number" }),
    field("transfer_budget", "Transfer Budget", { type: "number" }),
    field("wage_budget", "Wage Budget", { type: "number" }),
    field("monthly_wage_budget", "Monthly Wage Budget", { type: "number" }),
    field("patron_type_id", "Patron Type", { relation: rel("patron_type") }),
    field("has_transfer_embargo", "Has Transfer Embargo", { type: "boolean" }),
    field("transfer_embargo_start_date", "Embargo Start", { type: "date" }),
    field("transfer_embargo_end_date", "Embargo End", { type: "date" }),
    field("transfer_embargo_appeal_date", "Embargo Appeal Date", { type: "date" }),
    field("embargo_age_restriction", "Embargo Age Restriction", { type: "number" }),
    field("stadium_rent_year", "Stadium Rent / Year", { type: "number" }),
    field("average_match_ticket_price", "Average Match Ticket Price", { type: "number" }),
    field("average_season_ticket_price", "Average Season Ticket Price", { type: "number" }),
    field("season_tickets_sold", "Season Tickets Sold", { type: "number" }),
    field("special_season_tickets_sold", "Special Season Tickets Sold", { type: "number" }),
    field("special_season_ticket_start_date", "Special Ticket Start", { type: "date" }),
    field("special_season_ticket_end_date", "Special Ticket End", { type: "date" }),
  ],
  [
    ["club_id", "Club", rel("club")],
    ["balance", "Balance"],
    ["transfer_budget", "Transfer Budget"],
    ["wage_budget", "Wage Budget"],
    ["has_transfer_embargo", "Transfer Embargo"],
    ["season_tickets_sold", "Season Tickets"],
  ],
);

export const embargoConfig = config(
  "club_finance_embargo",
  "Embargoes",
  "Additional financial embargo types applied to a club.",
  [
    field("club_id", "Club Finance", { relation: rel("club_finance") }),
    field("embargo_type_id", "Embargo Type", { relation: rel("embargo_type") }),
  ],
  [
    ["club_id", "Club Finance", rel("club_finance")],
    ["embargo_type_id", "Embargo Type", rel("embargo_type")],
  ],
);

export const revenueConfig = config(
  "club_revenue",
  "Revenue",
  "Recurring and fixed revenue streams.",
  [
    field("club_id", "Club Finance", { relation: rel("club_finance") }),
    field("total_amount", "Total Amount", { type: "number" }),
    field("revenue_type_id", "Revenue Type", { relation: rel("revenue_type") }),
    field("start_date", "Start Date", { type: "date" }),
    field("end_date", "End Date", { type: "date" }),
    field("renewable", "Renewable", { type: "boolean" }),
    field("fixed_amount", "Fixed Amount", { type: "boolean" }),
  ],
  [
    ["club_id", "Club Finance", rel("club_finance")],
    ["revenue_type_id", "Revenue Type", rel("revenue_type")],
    ["total_amount", "Amount"],
    ["renewable", "Renewable"],
  ],
);

export const debtConfig = config(
  "club_debt",
  "Debt",
  "Club debt obligations and interest rates.",
  [
    field("club_id", "Club Finance", { relation: rel("club_finance") }),
    field("original_amount", "Original Amount", { type: "number" }),
    field("debt_source_id", "Debt Source", { relation: rel("debt_source") }),
    field("start_date", "Start Date", { type: "date" }),
    field("end_date", "End Date", { type: "date" }),
    field("interest_rate", "Interest Rate", { type: "number", step: "0.01" }),
  ],
  [
    ["club_id", "Club Finance", rel("club_finance")],
    ["debt_source_id", "Debt Source", rel("debt_source")],
    ["original_amount", "Original Amount"],
    ["interest_rate", "Interest Rate"],
  ],
);

export const ffpConfig = config(
  "financial_fair_play_record",
  "Financial Fair Play",
  "Financial fair-play records by competition and season.",
  [
    field("club_id", "Club Finance", { relation: rel("club_finance") }),
    field("amount", "Amount", { type: "number" }),
    field("year", "Year", { type: "number" }),
    field("competition_id", "Competition", { relation: rel("competition") }),
  ],
  [
    ["club_id", "Club Finance", rel("club_finance")],
    ["year", "Year"],
    ["competition_id", "Competition", rel("competition")],
    ["amount", "Amount"],
  ],
);

export const fanProfileConfig = config(
  "fan_profile",
  "Fan Profile",
  "Fan loyalty, passion, patience, attendance and expectations.",
  [
    field("club_id", "Club", { relation: rel("club") }),
    field("loyalty", "Loyalty", { type: "number" }),
    field("passion", "Passion", { type: "number" }),
    field("patience", "Patience", { type: "number" }),
    field("attendance", "Attendance", { type: "number" }),
    field("temperament", "Temperament", { type: "number" }),
    field("expectations", "Expectations", { type: "number" }),
  ],
  [
    ["club_id", "Club", rel("club")],
    ["loyalty", "Loyalty"],
    ["passion", "Passion"],
    ["patience", "Patience"],
    ["attendance", "Attendance"],
    ["expectations", "Expectations"],
  ],
);

export const objectivesConfig = config(
  "fan_objective",
  "Objectives",
  "Fan and club objectives, priorities and current vision.",
  [
    field("club_id", "Club", { relation: rel("club") }),
    field("objective_type_id", "Objective Type", { relation: rel("objective_type") }),
    field("importance", "Importance", { type: "number" }),
    field("start_year", "Start Year", { type: "number" }),
    field("end_year", "End Year", { type: "number" }),
    field("max_age", "Maximum Age", { type: "number" }),
    field("minimum_length", "Minimum Length", { type: "number" }),
    field("is_current_vision", "Current Vision", { type: "boolean" }),
    field("competition_id", "Competition", { relation: rel("competition") }),
    field("nation_id", "Nation", { relation: rel("nation") }),
  ],
  [
    ["club_id", "Club", rel("club")],
    ["objective_type_id", "Objective", rel("objective_type")],
    ["importance", "Importance"],
    ["start_year", "Start Year"],
    ["end_year", "End Year"],
    ["is_current_vision", "Current Vision"],
  ],
);

export const equipmentConfig = config(
  "team_equipment",
  "Equipment",
  "Team kits and equipment pieces by competition and season.",
  [
    field("team_id", "Team", { relation: rel("team") }),
    field("equipment_type_id", "Equipment Type", { relation: rel("equipment_type") }),
    field("equipment_piece_id", "Equipment Piece", { relation: rel("equipment_piece") }),
    field("equipment_style_id", "Equipment Style", { relation: rel("equipment_style") }),
    field("has_number_square", "Has Number Square", { type: "boolean" }),
    field("primary_color", "Primary Color"),
    field("secondary_color", "Secondary Color"),
    field("details", "Details", { type: "textarea" }),
    field("number_color", "Number Color"),
    field("number_border_color", "Number Border Color"),
    field("competition_id", "Competition", { relation: rel("competition") }),
    field("overlap_number", "Overlap Number", { type: "number", min: 0, max: 10 }),
    field("specific_year", "Specific Year", { type: "number" }),
  ],
  [
    ["team_id", "Team", rel("team")],
    ["equipment_type_id", "Type", rel("equipment_type")],
    ["equipment_piece_id", "Piece", rel("equipment_piece")],
    ["equipment_style_id", "Style", rel("equipment_style")],
    ["competition_id", "Competition", rel("competition")],
    ["specific_year", "Year"],
  ],
);

export const teamPersonConfig = config(
  "team_person_relationship",
  "Team ↔ Person",
  "Historical and current relationships between teams and people.",
  [
    field("team_id", "Team", { relation: rel("team") }),
    field("person_id", "Person", { relation: rel("person", "full_name") }),
    field("level", "Level", { type: "number" }),
    field("reason", "Reason"),
    field("permanent", "Permanent", { type: "boolean" }),
    field("stadium_name_reference", "Stadium Name Reference", { type: "boolean" }),
    field("negative", "Negative", { type: "boolean" }),
    field("legend", "Legend", { type: "boolean" }),
    field("icon", "Icon", { type: "boolean" }),
  ],
  [
    ["team_id", "Team", rel("team")],
    ["person_id", "Person", rel("person", "full_name")],
    ["level", "Level"],
    ["reason", "Reason"],
    ["legend", "Legend"],
  ],
);

export const captainConfig = config(
  "team_captain",
  "Captains",
  "Captain and vice-captain assignments.",
  [
    field("team_id", "Team", { relation: rel("team") }),
    field("player_id", "Player", { relation: rel("player", "full_name") }),
    field("role", "Role", { required: true }),
  ],
  [
    ["team_id", "Team", rel("team")],
    ["player_id", "Player", rel("player", "full_name")],
    ["role", "Role"],
  ],
);

export const partnershipConfig = config(
  "team_player_partnership",
  "Player Partnerships",
  "Player-to-player partnerships associated with a team.",
  [
    field("team_id", "Team", { relation: rel("team") }),
    field("player_id_1", "Player 1", { relation: rel("player", "full_name") }),
    field("player_id_2", "Player 2", { relation: rel("player", "full_name") }),
  ],
  [
    ["team_id", "Team", rel("team")],
    ["player_id_1", "Player 1", rel("player", "full_name")],
    ["player_id_2", "Player 2", rel("player", "full_name")],
  ],
);

export const retiredNumberConfig = config(
  "team_retired_number",
  "Retired Numbers",
  "Numbers retired by a team and their reasons.",
  [
    field("team_id", "Team", { relation: rel("team") }),
    field("player_id", "Player", { relation: rel("player", "full_name") }),
    field("number", "Number", { type: "number", required: true }),
    field("reason_id", "Reason", { relation: rel("retired_number_reason") }),
    field("transferable_between_players", "Transferable Between Players", { type: "boolean" }),
  ],
  [
    ["team_id", "Team", rel("team")],
    ["number", "Number"],
    ["player_id", "Player", rel("player", "full_name")],
    ["reason_id", "Reason", rel("retired_number_reason")],
  ],
);

export const affiliationConfig = config(
  "club_affiliation",
  "Affiliations",
  "Parent, affiliate and partner-club relationships.",
  [
    field("root_club_id", "Root Club", { relation: rel("club") }),
    field("target_club_id", "Target Club", { relation: rel("club") }),
    field("start_date", "Start Date", { type: "date" }),
    field("end_date", "End Date", { type: "date" }),
    field("root_is_parent", "Root Is Parent", { type: "boolean" }),
    field("affiliation_type_id", "Affiliation Type", { relation: rel("club_affiliation_type") }),
    field("annual_commission", "Annual Commission", { type: "number" }),
    field("annual_friendly_probability", "Annual Friendly Probability", { type: "number", step: "0.01" }),
  ],
  [
    ["root_club_id", "Root Club", rel("club")],
    ["target_club_id", "Target Club", rel("club")],
    ["affiliation_type_id", "Type", rel("club_affiliation_type")],
    ["root_is_parent", "Root Is Parent"],
  ],
);

export const rivalryConfig = config(
  "team_rivalry",
  "Rivalries",
  "Team rivalries and rivalry intensity.",
  [
    field("team_id_1", "Team 1", { relation: rel("team") }),
    field("team_id_2", "Team 2", { relation: rel("team") }),
    field("level", "Level", { type: "number" }),
    field("reason", "Reason"),
  ],
  [
    ["team_id_1", "Team 1", rel("team")],
    ["team_id_2", "Team 2", rel("team")],
    ["level", "Level"],
    ["reason", "Reason"],
  ],
);

export const derbyConfig = config(
  "derby",
  "Derbies",
  "Named club derbies and their reputation.",
  [
    field("name", "Name", { required: true }),
    field("short_name", "Short Name"),
    field("club_id_1", "Club 1", { relation: rel("club") }),
    field("club_id_2", "Club 2", { relation: rel("club") }),
    field("world_reputation", "World Reputation", { type: "number" }),
    field("national_reputation", "National Reputation", { type: "number" }),
  ],
  [
    ["name", "Name"],
    ["short_name", "Short Name"],
    ["club_id_1", "Club 1", rel("club")],
    ["club_id_2", "Club 2", rel("club")],
    ["world_reputation", "World Reputation"],
    ["national_reputation", "National Reputation"],
  ],
  ["name", "short_name"],
);

export const competitionHistoryConfig = config(
  "club_competition_history",
  "Competition History",
  "Historical club participation and final standings.",
  [
    field("club_id", "Club", { relation: rel("club") }),
    field("competition_id", "Competition", { relation: rel("competition") }),
    field("year", "Year", { type: "number", required: true }),
    field("order_number", "Order Number", { type: "number" }),
    field("position", "Position", { type: "number" }),
    field("points", "Points", { type: "number" }),
    field("matches", "Matches", { type: "number" }),
    field("wins", "Wins", { type: "number" }),
    field("draws", "Draws", { type: "number" }),
    field("losses", "Losses", { type: "number" }),
    field("goals_for", "Goals For", { type: "number" }),
    field("goals_against", "Goals Against", { type: "number" }),
  ],
  [
    ["club_id", "Club", rel("club")],
    ["competition_id", "Competition", rel("competition")],
    ["year", "Year"],
    ["position", "Position"],
    ["points", "Points"],
    ["wins", "Wins"],
  ],
);

export const regionalCompetitionConfig = config(
  "club_regional_competition",
  "Regional Competitions",
  "Regional competition participation by club and year.",
  [
    field("club_id", "Club", { relation: rel("club") }),
    field("competition_id", "Competition", { relation: rel("competition") }),
    field("level", "Level", { type: "number" }),
    field("year", "Year", { type: "number" }),
  ],
  [
    ["club_id", "Club", rel("club")],
    ["competition_id", "Competition", rel("competition")],
    ["level", "Level"],
    ["year", "Year"],
  ],
);

export const expectationConfig = config(
  "club_competition_expectation",
  "Expectations",
  "Expected final positions for club competitions.",
  [
    field("club_id", "Club", { relation: rel("club") }),
    field("competition_id", "Competition", { relation: rel("competition") }),
    field("expected_final_position", "Expected Final Position", { type: "number" }),
    field("press_source_id", "Press Source", { relation: rel("press_source") }),
  ],
  [
    ["club_id", "Club", rel("club")],
    ["competition_id", "Competition", rel("competition")],
    ["expected_final_position", "Expected Position"],
    ["press_source_id", "Press Source", rel("press_source")],
  ],
);

export const coefficientConfig = config(
  "club_competition_coefficient",
  "Club Coefficients",
  "Historical coefficients for clubs in competition seasons.",
  [
    field("club_id", "Club", { relation: rel("club") }),
    field("competition_season_id", "Competition Season", { relation: rel("competition_season") }),
    field("season_offset", "Season Offset", { type: "number", min: -10, max: -1 }),
    field("coefficient", "Coefficient", { type: "number", step: "0.01" }),
  ],
  [
    ["club_id", "Club", rel("club")],
    ["competition_season_id", "Competition Season", rel("competition_season")],
    ["season_offset", "Season Offset"],
    ["coefficient", "Coefficient"],
  ],
);

export const teamDomainConfigs = {
  team: teamConfig,
  club: clubConfig,
  nationalTeamInfo: nationalTeamInfoConfig,
  nationalTeamCoefficient: nationalTeamCoefficientConfig,
  ownership: ownershipConfig,
  reserveTeam: reserveTeamConfig,
  finance: financeConfig,
  embargo: embargoConfig,
  revenue: revenueConfig,
  debt: debtConfig,
  ffp: ffpConfig,
  fanProfile: fanProfileConfig,
  objectives: objectivesConfig,
  equipment: equipmentConfig,
  teamPerson: teamPersonConfig,
  captain: captainConfig,
  partnership: partnershipConfig,
  retiredNumber: retiredNumberConfig,
  affiliation: affiliationConfig,
  rivalry: rivalryConfig,
  derby: derbyConfig,
  competitionHistory: competitionHistoryConfig,
  regionalCompetition: regionalCompetitionConfig,
  expectation: expectationConfig,
  coefficient: coefficientConfig,
} as const;
