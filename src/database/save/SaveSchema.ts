export const SAVE_SCHEMA = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS save (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    current_date TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS country (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    external_id INTEGER NULL,
    alpha2 TEXT NOT NULL,
    alpha3 TEXT NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,

    UNIQUE (alpha2),
    UNIQUE (external_id)
);

CREATE TABLE IF NOT EXISTS city (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    external_id INTEGER NULL,
    country_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NULL,

    FOREIGN KEY (country_id) REFERENCES country(id),

    UNIQUE (external_id),
    UNIQUE (country_id, name)
);

CREATE TABLE IF NOT EXISTS competition (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    external_id INTEGER NULL,
    country_id INTEGER NULL,

    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    gender TEXT NULL,
    tier INTEGER NULL,

    image TEXT NULL,
    primary_color TEXT NULL,
    secondary_color TEXT NULL,

    usual_start_date TEXT NULL,
    usual_end_date TEXT NULL,

    frequency INTEGER NULL,

    FOREIGN KEY (country_id) REFERENCES country(id),

    UNIQUE (external_id)
);

CREATE TABLE IF NOT EXISTS competition_season (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    external_id INTEGER NULL,
    competition_id INTEGER NOT NULL,

    year INTEGER NOT NULL,
    number_of_competitors INTEGER NULL,

    start_date TEXT NULL,
    end_date TEXT NULL,

    is_group INTEGER NOT NULL DEFAULT 0,
    has_rounds INTEGER NOT NULL DEFAULT 0,
    has_groups INTEGER NOT NULL DEFAULT 0,
    has_playoff INTEGER NOT NULL DEFAULT 0,

    competition_type TEXT NULL,

    rounds_count INTEGER NULL,

    promoting_teams_count INTEGER NULL,
    relegating_teams_count INTEGER NULL,

    FOREIGN KEY (competition_id) REFERENCES competition(id),

    UNIQUE (competition_id, year),
    UNIQUE (external_id)
);

CREATE TABLE IF NOT EXISTS competition_stage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    competition_season_id INTEGER NOT NULL,

    name TEXT NOT NULL,
    type TEXT NOT NULL,

    stage_order INTEGER NOT NULL,

    FOREIGN KEY (competition_season_id) REFERENCES competition_season(id)
);

CREATE TABLE IF NOT EXISTS competition_round (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    stage_id INTEGER NOT NULL,

    round_number INTEGER NOT NULL,

    name TEXT NOT NULL,

    start_date TEXT,
    end_date TEXT,

    FOREIGN KEY (stage_id) REFERENCES competition_stage(id),

    UNIQUE (stage_id, round_number)
);

CREATE TABLE IF NOT EXISTS venue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    external_id INTEGER NOT NULL,

    city_id INTEGER NULL,
    country_id INTEGER NULL,

    name TEXT NOT NULL,
    slug TEXT NULL,

    capacity INTEGER NULL,

    latitude REAL NULL,
    longitude REAL NULL,

    image TEXT NULL,

    hidden INTEGER NOT NULL DEFAULT 0,

    FOREIGN KEY (city_id) REFERENCES city(id),
    FOREIGN KEY (country_id) REFERENCES country(id),

    UNIQUE (external_id)
);

CREATE TABLE IF NOT EXISTS team (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    external_id INTEGER NOT NULL,
    country_id INTEGER NULL,
    venue_id INTEGER NULL,
    name TEXT NOT NULL,
    short_name TEXT NULL,
    full_name TEXT NULL,
    slug TEXT NULL,
    name_code TEXT NULL,
    gender TEXT NULL,
    primary_color TEXT NULL,
    secondary_color TEXT NULL,
    text_color TEXT NULL,
    image TEXT NULL,
    foundation_date TEXT NULL,
    national INTEGER NOT NULL DEFAULT 0,
    disabled INTEGER NOT NULL DEFAULT 0,

    FOREIGN KEY (country_id) REFERENCES country(id),
    FOREIGN KEY (venue_id) REFERENCES venue(id),

    UNIQUE (external_id)
);

CREATE TABLE IF NOT EXISTS fixture (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    round_id INTEGER NOT NULL,

    home_team_id INTEGER NOT NULL,
    away_team_id INTEGER NOT NULL,

    scheduled_at TEXT,

    status TEXT NOT NULL DEFAULT 'SCHEDULED',

    home_score INTEGER,
    away_score INTEGER,

    FOREIGN KEY (round_id) REFERENCES competition_round(id),
    FOREIGN KEY (home_team_id) REFERENCES team(id),
    FOREIGN KEY (away_team_id) REFERENCES team(id)
);

CREATE TABLE IF NOT EXISTS standing (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    stage_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,

    played INTEGER NOT NULL DEFAULT 0,
    wins INTEGER NOT NULL DEFAULT 0,
    draws INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,

    goals_for INTEGER NOT NULL DEFAULT 0,
    goals_against INTEGER NOT NULL DEFAULT 0,

    points INTEGER NOT NULL DEFAULT 0,

    FOREIGN KEY (stage_id) REFERENCES competition_stage(id),
    FOREIGN KEY (team_id) REFERENCES team(id),

    UNIQUE (stage_id, team_id)
);

CREATE TABLE IF NOT EXISTS competition_season_host_country (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    competition_season_id INTEGER NOT NULL,
    country_id INTEGER NOT NULL,

    FOREIGN KEY (competition_season_id) REFERENCES competition_season(id),
    FOREIGN KEY (country_id) REFERENCES country(id),

    UNIQUE (competition_season_id, country_id)
);

CREATE TABLE IF NOT EXISTS competition_team (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    competition_season_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,

    FOREIGN KEY (competition_season_id) REFERENCES competition_season(id),
    FOREIGN KEY (team_id) REFERENCES team(id),

    UNIQUE (competition_season_id, team_id)
);

CREATE TABLE IF NOT EXISTS competition_winner (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    competition_season_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,

    FOREIGN KEY (competition_season_id) REFERENCES competition_season(id),
    FOREIGN KEY (team_id) REFERENCES team(id),

    UNIQUE (competition_season_id, team_id)
);

CREATE TABLE IF NOT EXISTS competition_season_newcomer_upper (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    competition_season_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,

    FOREIGN KEY (competition_season_id) REFERENCES competition_season(id),
    FOREIGN KEY (team_id) REFERENCES team(id),

    UNIQUE (competition_season_id, team_id)
);

CREATE TABLE IF NOT EXISTS competition_season_newcomer_lower (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    competition_season_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,

    FOREIGN KEY (competition_season_id) REFERENCES competition_season(id),
    FOREIGN KEY (team_id) REFERENCES team(id),

    UNIQUE (competition_season_id, team_id)
);

CREATE TABLE IF NOT EXISTS team_title (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL,
    competition_id INTEGER NOT NULL,
    competition_season_id INTEGER NULL,

    FOREIGN KEY (team_id) REFERENCES team(id),
    FOREIGN KEY (competition_id) REFERENCES competition(id),
    FOREIGN KEY (competition_season_id) REFERENCES competition_season(id),

    UNIQUE (team_id, competition_id, competition_season_id)
);

CREATE TABLE IF NOT EXISTS person (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    external_id INTEGER NOT NULL,
    country_id INTEGER NULL,
    name TEXT NOT NULL,
    short_name TEXT NULL,
    slug TEXT NULL,
    birth_date TEXT NULL,
    deceased INTEGER NOT NULL DEFAULT 0,
    image TEXT NULL,

    FOREIGN KEY (country_id) REFERENCES country(id),

    UNIQUE (external_id)
);

CREATE TABLE IF NOT EXISTS player (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    person_id INTEGER NOT NULL,
    external_id INTEGER NOT NULL,

    sofascore_id TEXT NULL,
    nationality_id INTEGER NULL,
    gender TEXT NULL,
    date_of_birth TEXT NULL,

    deceased INTEGER NOT NULL DEFAULT 0,
    underage INTEGER NOT NULL DEFAULT 0,

    height INTEGER NULL,

    jersey_number TEXT NULL,
    shirt_number INTEGER NULL,

    position TEXT NULL,
    preferred_foot TEXT NULL,

    proposed_market_value REAL NULL,
    proposed_market_value_currency TEXT NULL,

    FOREIGN KEY (person_id) REFERENCES person(id),
    FOREIGN KEY (nationality_id) REFERENCES country(id),

    UNIQUE (external_id),
    UNIQUE (sofascore_id)
);

CREATE TABLE IF NOT EXISTS player_position (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    player_id INTEGER NOT NULL,
    position TEXT NOT NULL,

    FOREIGN KEY (player_id) REFERENCES player(id),

    UNIQUE (player_id, position)
);

CREATE TABLE IF NOT EXISTS manager (
    id INTEGER PRIMARY KEY,
    nationality TEXT NULL,
    nationality_iso2 TEXT NULL,
    preferred_formation TEXT NULL,

    FOREIGN KEY (id) REFERENCES person(id)
);

CREATE TABLE IF NOT EXISTS player_team_period (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,
    start_at TEXT NULL,
    end_at TEXT NULL,

    FOREIGN KEY (player_id) REFERENCES player(id),
    FOREIGN KEY (team_id) REFERENCES team(id),

    UNIQUE (player_id, team_id)
);

CREATE TABLE IF NOT EXISTS manager_team_period (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    manager_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,

    start_date TEXT NULL,
    end_date TEXT NULL,

    matches INTEGER NOT NULL DEFAULT 0,
    wins INTEGER NOT NULL DEFAULT 0,
    draws INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,

    points INTEGER NOT NULL DEFAULT 0,

    goals_scored INTEGER NULL,
    goals_conceded INTEGER NULL,

    FOREIGN KEY (manager_id) REFERENCES manager(id),
    FOREIGN KEY (team_id) REFERENCES team(id)
);

CREATE TABLE IF NOT EXISTS manager_performance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    manager_id INTEGER NOT NULL,

    matches INTEGER NOT NULL DEFAULT 0,
    wins INTEGER NOT NULL DEFAULT 0,
    draws INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,

    goals_scored INTEGER NULL,
    goals_conceded INTEGER NULL,

    points INTEGER NULL,

    FOREIGN KEY (manager_id) REFERENCES manager(id),

    UNIQUE (manager_id)
);

CREATE TABLE IF NOT EXISTS manager_attributes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    manager_id INTEGER NOT NULL,

    attacking INTEGER NOT NULL,
    defending INTEGER NOT NULL,
    tactical INTEGER NOT NULL,
    player_development INTEGER NOT NULL,
    squad_management INTEGER NOT NULL,
    adaptability INTEGER NOT NULL,
    mentality INTEGER NOT NULL,

    overall INTEGER NOT NULL,

    FOREIGN KEY (manager_id) REFERENCES manager(id),

    UNIQUE (manager_id),

    CHECK (attacking BETWEEN 1 AND 20),
    CHECK (defending BETWEEN 1 AND 20),
    CHECK (tactical BETWEEN 1 AND 20),
    CHECK (player_development BETWEEN 1 AND 20),
    CHECK (squad_management BETWEEN 1 AND 20),
    CHECK (adaptability BETWEEN 1 AND 20),
    CHECK (mentality BETWEEN 1 AND 20),
    CHECK (overall BETWEEN 1 AND 20)
);

CREATE TABLE IF NOT EXISTS player_attribute_overview (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    player_id INTEGER NOT NULL,

    attacking INTEGER NULL,
    technical INTEGER NULL,
    tactical INTEGER NULL,
    defending INTEGER NULL,
    creativity INTEGER NULL,

    position TEXT NULL,

    year_shift INTEGER NOT NULL DEFAULT 0,

    FOREIGN KEY (player_id) REFERENCES player(id),

    UNIQUE (player_id, year_shift, position),

    CHECK (attacking BETWEEN 0 AND 100),
    CHECK (technical BETWEEN 0 AND 100),
    CHECK (tactical BETWEEN 0 AND 100),
    CHECK (defending BETWEEN 0 AND 100),
    CHECK (creativity BETWEEN 0 AND 100)
);

CREATE TABLE IF NOT EXISTS player_statistics_snapshot (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    player_id INTEGER NOT NULL,

    competition_season_id INTEGER NULL,

    type TEXT NOT NULL DEFAULT 'overall',

    appearances INTEGER NULL,
    minutes_played INTEGER NULL,

    goals INTEGER NULL,
    assists INTEGER NULL,
    goals_assists_sum INTEGER NULL,

    expected_goals REAL NULL,
    expected_assists REAL NULL,
    expected_goal_involvements REAL NULL,

    rating REAL NULL,
    total_rating REAL NULL,
    count_rating INTEGER NULL,

    total_shots INTEGER NULL,
    shots_on_target INTEGER NULL,
    shots_from_inside_box INTEGER NULL,

    goal_conversion_percentage REAL NULL,
    scoring_frequency REAL NULL,

    key_passes INTEGER NULL,
    big_chances_created INTEGER NULL,
    big_chances_missed INTEGER NULL,

    accurate_passes INTEGER NULL,
    total_passes INTEGER NULL,
    accurate_passes_percentage REAL NULL,

    accurate_long_balls INTEGER NULL,
    total_long_balls INTEGER NULL,
    accurate_long_balls_percentage REAL NULL,

    accurate_crosses INTEGER NULL,
    total_crosses INTEGER NULL,
    accurate_crosses_percentage REAL NULL,

    accurate_own_half_passes INTEGER NULL,
    accurate_opposition_half_passes INTEGER NULL,
    accurate_final_third_passes INTEGER NULL,

    successful_dribbles INTEGER NULL,
    successful_dribbles_percentage REAL NULL,

    touches INTEGER NULL,
    touches_in_opponent_box INTEGER NULL,
    unsuccessful_touches INTEGER NULL,

    total_duels_won INTEGER NULL,
    total_duels_won_percentage REAL NULL,

    ground_duels_won INTEGER NULL,
    ground_duels_won_percentage REAL NULL,

    aerial_duels_won INTEGER NULL,
    aerial_duels_won_percentage REAL NULL,

    tackles INTEGER NULL,
    interceptions INTEGER NULL,
    clearances INTEGER NULL,
    ball_recovery INTEGER NULL,
    defensive_contributions INTEGER NULL,

    blocked_shots INTEGER NULL,
    outfielder_blocks INTEGER NULL,
    dribbled_past INTEGER NULL,

    error_lead_to_goal INTEGER NULL,
    error_lead_to_shot INTEGER NULL,

    clean_sheet INTEGER NULL,
    goals_conceded INTEGER NULL,
    saves INTEGER NULL,

    fouls INTEGER NULL,
    was_fouled INTEGER NULL,
    offsides INTEGER NULL,

    yellow_cards INTEGER NULL,
    red_cards INTEGER NULL,

    own_goals INTEGER NULL,

    penalty_won INTEGER NULL,
    penalties_taken INTEGER NULL,
    penalty_goals INTEGER NULL,

    left_foot_goals INTEGER NULL,

    shot_from_set_piece INTEGER NULL,
    free_kick_goal INTEGER NULL,
    set_piece_conversion REAL NULL,

    corners_taken INTEGER NULL,

    goal_involvements INTEGER NULL,

    FOREIGN KEY (player_id) REFERENCES player(id),
    FOREIGN KEY (competition_season_id) REFERENCES competition_season(id)
);

CREATE TABLE IF NOT EXISTS player_match_rating (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    player_id INTEGER NOT NULL,

    match_date TEXT NOT NULL,

    rating REAL NOT NULL,

    competition_id INTEGER NULL,

    FOREIGN KEY (player_id) REFERENCES player(id),
    FOREIGN KEY (competition_id) REFERENCES competition(id)
);

CREATE TABLE IF NOT EXISTS competition_other_name (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    competition_id INTEGER NOT NULL,
    name TEXT NOT NULL,

    FOREIGN KEY (competition_id) REFERENCES competition(id),

    UNIQUE (competition_id, name)
);

CREATE TABLE IF NOT EXISTS tv_partner (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    name TEXT NOT NULL,
    url TEXT NULL,

    UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS competition_tv_partner (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    competition_id INTEGER NOT NULL,
    tv_partner_id INTEGER NOT NULL,

    FOREIGN KEY (competition_id) REFERENCES competition(id),
    FOREIGN KEY (tv_partner_id) REFERENCES tv_partner(id),

    UNIQUE (competition_id, tv_partner_id)
);

CREATE TABLE IF NOT EXISTS organization (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    name TEXT NOT NULL,
    url TEXT NULL,

    UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS competition_organization (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    competition_id INTEGER NOT NULL,
    organization_id INTEGER NOT NULL,

    FOREIGN KEY (competition_id) REFERENCES competition(id),
    FOREIGN KEY (organization_id) REFERENCES organization(id),

    UNIQUE (competition_id, organization_id)
);

CREATE TABLE IF NOT EXISTS competition_season_promotion (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    competition_season_id INTEGER NOT NULL,
    destination_competition_id INTEGER NOT NULL,

    promotion_count INTEGER NOT NULL,

    FOREIGN KEY (competition_season_id) REFERENCES competition_season(id),
    FOREIGN KEY (destination_competition_id) REFERENCES competition(id),

    UNIQUE (competition_season_id, destination_competition_id)
);

CREATE TABLE IF NOT EXISTS standing_rule (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    stage_id INTEGER NOT NULL,

    rule_order INTEGER NOT NULL,
    rule_type TEXT NOT NULL,

    FOREIGN KEY (stage_id) REFERENCES competition_stage(id),

    UNIQUE (stage_id, rule_order)
);

CREATE TABLE IF NOT EXISTS stage_transition (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    from_stage_id INTEGER NOT NULL,
    to_stage_id INTEGER NOT NULL,

    source_type TEXT NOT NULL,
    source_position INTEGER NULL,

    FOREIGN KEY (from_stage_id)
        REFERENCES competition_stage(id),

    FOREIGN KEY (to_stage_id)
        REFERENCES competition_stage(id)
);

CREATE TABLE IF NOT EXISTS qualification_rule (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stage_id INTEGER NOT NULL,
    position_from INTEGER NOT NULL,
    position_to INTEGER NOT NULL,
    qualification_type TEXT NOT NULL,
    destination TEXT NOT NULL,
    FOREIGN KEY (stage_id) REFERENCES competition_stage(id)
);

CREATE INDEX IF NOT EXISTS idx_mtp_manager ON manager_team_period (manager_id);
CREATE INDEX IF NOT EXISTS idx_mtp_team ON manager_team_period (team_id);
CREATE INDEX IF NOT EXISTS idx_pss_player ON player_statistics_snapshot (player_id);
CREATE INDEX IF NOT EXISTS idx_pss_season ON player_statistics_snapshot (competition_season_id);
CREATE INDEX IF NOT EXISTS idx_pmr_player_date ON player_match_rating (player_id, match_date);
CREATE INDEX IF NOT EXISTS idx_pmr_competition ON player_match_rating (competition_id);
`;