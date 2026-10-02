

-- ============================================================
-- WORLD DATABASE
-- SQLite / editor-first schema
-- No seed data is required.
-- Naming: singular entities, snake_case, *_id foreign keys.
-- Booleans: INTEGER 0/1.
-- Dates/timestamps: ISO-8601 TEXT.
-- Money: INTEGER in the database currency minor unit.
-- ============================================================

CREATE TABLE IF NOT EXISTS database_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- =========================
-- GEOGRAPHY / REFERENCE
-- =========================

CREATE TABLE IF NOT EXISTS federation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    short_name TEXT,
    regional_strength INTEGER,
    primary_color TEXT,
    secondary_color TEXT,
    tertiary_color TEXT,
    UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS continent (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    short_name TEXT,
    continental_name TEXT,
    federation_id INTEGER,
    FOREIGN KEY (federation_id) REFERENCES federation(id),
    UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS continent_alt_name (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    continent_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    FOREIGN KEY (continent_id) REFERENCES continent(id) ON DELETE CASCADE,
    UNIQUE (continent_id, name)
);

CREATE TABLE IF NOT EXISTS continent_region (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    continent_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    short_name TEXT,
    FOREIGN KEY (continent_id) REFERENCES continent(id),
    UNIQUE (continent_id, name)
);

CREATE TABLE IF NOT EXISTS currency (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    exchange_rate REAL,
    UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS nationality_method (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS nation_development_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    index_value INTEGER,
    UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS language_family (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS language_group (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    family_id INTEGER,
    name TEXT NOT NULL,
    FOREIGN KEY (family_id) REFERENCES language_family(id),
    UNIQUE (family_id, name)
);

CREATE TABLE IF NOT EXISTS language_subgroup (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER,
    name TEXT NOT NULL,
    FOREIGN KEY (group_id) REFERENCES language_group(id),
    UNIQUE (group_id, name)
);

CREATE TABLE IF NOT EXISTS language (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    influence INTEGER,
    learning_difficulty INTEGER,
    family_id INTEGER,
    group_id INTEGER,
    subgroup_id INTEGER,
    FOREIGN KEY (family_id) REFERENCES language_family(id),
    FOREIGN KEY (group_id) REFERENCES language_group(id),
    FOREIGN KEY (subgroup_id) REFERENCES language_subgroup(id),
    UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS nation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    short_name TEXT,
    continent_region_id INTEGER,
    currency_id INTEGER,
    national_stadium_id INTEGER,
    economic_factor REAL,
    years_to_naturalization INTEGER,
    nationality_method_id INTEGER,
    development_state_id INTEGER,
    FOREIGN KEY (continent_region_id) REFERENCES continent_region(id),
    FOREIGN KEY (currency_id) REFERENCES currency(id),
    FOREIGN KEY (nationality_method_id) REFERENCES nationality_method(id),
    FOREIGN KEY (development_state_id) REFERENCES nation_development_state(id),
    UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS nation_native_treatment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    root_nation_id INTEGER NOT NULL,
    target_nation_id INTEGER NOT NULL,
    FOREIGN KEY (root_nation_id) REFERENCES nation(id),
    FOREIGN KEY (target_nation_id) REFERENCES nation(id),
    UNIQUE (root_nation_id, target_nation_id),
    CHECK (root_nation_id <> target_nation_id)
);

CREATE TABLE IF NOT EXISTS nation_language (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nation_id INTEGER NOT NULL,
    language_id INTEGER NOT NULL,
    percentage REAL,
    FOREIGN KEY (nation_id) REFERENCES nation(id) ON DELETE CASCADE,
    FOREIGN KEY (language_id) REFERENCES language(id),
    UNIQUE (nation_id, language_id)
);

CREATE TABLE IF NOT EXISTS nation_region (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nation_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    short_name TEXT,
    population INTEGER,
    FOREIGN KEY (nation_id) REFERENCES nation(id) ON DELETE CASCADE,
    UNIQUE (nation_id, name)
);

CREATE TABLE IF NOT EXISTS nation_region_language (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nation_region_id INTEGER NOT NULL,
    language_id INTEGER NOT NULL,
    percentage REAL,
    FOREIGN KEY (nation_region_id) REFERENCES nation_region(id) ON DELETE CASCADE,
    FOREIGN KEY (language_id) REFERENCES language(id),
    UNIQUE (nation_region_id, language_id)
);

CREATE TABLE IF NOT EXISTS climate (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    short_name TEXT,
    UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS climate_nation_region (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nation_region_id INTEGER NOT NULL,
    climate_id INTEGER NOT NULL,
    FOREIGN KEY (nation_region_id) REFERENCES nation_region(id) ON DELETE CASCADE,
    FOREIGN KEY (climate_id) REFERENCES climate(id),
    UNIQUE (nation_region_id, climate_id)
);

CREATE TABLE IF NOT EXISTS city (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nation_id INTEGER NOT NULL,
    nation_region_id INTEGER,
    name TEXT NOT NULL,
    attraction INTEGER,
    population INTEGER,
    latitude REAL,
    longitude REAL,
    altitude REAL,
    climate_id INTEGER,
    FOREIGN KEY (nation_id) REFERENCES nation(id),
    FOREIGN KEY (nation_region_id) REFERENCES nation_region(id),
    FOREIGN KEY (climate_id) REFERENCES climate(id),
    UNIQUE (nation_id, name)
);

CREATE TABLE IF NOT EXISTS city_language (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    city_id INTEGER NOT NULL,
    language_id INTEGER NOT NULL,
    percentage REAL,
    FOREIGN KEY (city_id) REFERENCES city(id) ON DELETE CASCADE,
    FOREIGN KEY (language_id) REFERENCES language(id),
    UNIQUE (city_id, language_id)
);

-- =========================
-- GENERIC TEAM MODEL
-- =========================
-- Team is the common identity shared by clubs and national teams.
-- Club and national_team are 1:1 subtypes.

CREATE TABLE IF NOT EXISTS gender (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS team (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    short_name TEXT,
    six_letter_name TEXT,
    three_letter_name TEXT,
    alternative_three_letter_name TEXT,
    nickname TEXT,
    hashtag TEXT,
    gender_id INTEGER,
    nation_id INTEGER,
    extinct INTEGER NOT NULL DEFAULT 0 CHECK (extinct IN (0,1)),
    reputation INTEGER,
    primary_color TEXT,
    secondary_color TEXT,
    tertiary_color TEXT,
    FOREIGN KEY (gender_id) REFERENCES gender(id),
    FOREIGN KEY (nation_id) REFERENCES nation(id),
    UNIQUE (name, gender_id)
);

CREATE TABLE IF NOT EXISTS club (
    team_id INTEGER PRIMARY KEY,
    city_id INTEGER,
    base_nation_id INTEGER,
    international_competition_nation_id INTEGER,
    situation_id INTEGER,
    min_age INTEGER,
    max_age INTEGER,
    morale INTEGER,
    is_institute INTEGER NOT NULL DEFAULT 0 CHECK (is_institute IN (0,1)),
    is_all_star INTEGER NOT NULL DEFAULT 0 CHECK (is_all_star IN (0,1)),
    observation_package_id INTEGER,
    has_extra_designated_player_slot INTEGER NOT NULL DEFAULT 0 CHECK (has_extra_designated_player_slot IN (0,1)),
    FOREIGN KEY (team_id) REFERENCES team(id) ON DELETE CASCADE,
    FOREIGN KEY (city_id) REFERENCES city(id),
    FOREIGN KEY (base_nation_id) REFERENCES nation(id),
    FOREIGN KEY (international_competition_nation_id) REFERENCES nation(id),
    FOREIGN KEY (situation_id) REFERENCES club_status(id)
);

CREATE TABLE IF NOT EXISTS national_team (
    team_id INTEGER PRIMARY KEY,
    nation_id INTEGER NOT NULL UNIQUE,
    FOREIGN KEY (team_id) REFERENCES team(id) ON DELETE CASCADE,
    FOREIGN KEY (nation_id) REFERENCES nation(id)
);

CREATE TABLE IF NOT EXISTS club_status (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    is_reserve_team INTEGER NOT NULL DEFAULT 0 CHECK (is_reserve_team IN (0,1))
);

CREATE TABLE IF NOT EXISTS club_observation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

-- =========================
-- STADIUMS
-- =========================

CREATE TABLE IF NOT EXISTS stadium_owner_type (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS pitch_type (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS grass_deterioration_rate (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    indicator INTEGER,
    UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS quality_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    indicator INTEGER,
    UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS environment_quality (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    indicator INTEGER,
    UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS weekday (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    index_value INTEGER NOT NULL UNIQUE,
    is_weekend INTEGER NOT NULL CHECK (is_weekend IN (0,1))
);

CREATE TABLE IF NOT EXISTS stadium (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    city_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    is_training_ground INTEGER NOT NULL DEFAULT 0 CHECK (is_training_ground IN (0,1)),
    owner_type_id INTEGER,
    owner_club_id INTEGER,
    owner_person_id INTEGER,
    capacity INTEGER,
    seated_capacity INTEGER,
    expansion_capacity INTEGER,
    seats_in_use INTEGER,
    pitch_type_id INTEGER,
    field_length REAL,
    international_field_length REAL,
    min_field_length REAL,
    min_field_width REAL,
    max_field_length REAL,
    max_field_width REAL,
    field_width REAL,
    international_field_width REAL,
    field_condition INTEGER,
    grass_deterioration_rate_id INTEGER,
    grass_recovery_level INTEGER,
    last_pitch_replacement_date TEXT,
    pitch_replacement_deadline TEXT,
    construction_date TEXT,
    reconstruction_date TEXT,
    current_ownership_date TEXT,
    latitude REAL,
    longitude REAL,
    quality_state_id INTEGER,
    environment_quality_id INTEGER,
    used_by_national_team INTEGER NOT NULL DEFAULT 0 CHECK (used_by_national_team IN (0,1)),
    banned_from_continental_final INTEGER NOT NULL DEFAULT 0 CHECK (banned_from_continental_final IN (0,1)),
    extinct INTEGER NOT NULL DEFAULT 0 CHECK (extinct IN (0,1)),
    has_cover INTEGER NOT NULL DEFAULT 0 CHECK (has_cover IN (0,1)),
    has_retractable_roof INTEGER NOT NULL DEFAULT 0 CHECK (has_retractable_roof IN (0,1)),
    has_underfloor_heating INTEGER NOT NULL DEFAULT 0 CHECK (has_underfloor_heating IN (0,1)),
    has_digital_advertising INTEGER NOT NULL DEFAULT 0 CHECK (has_digital_advertising IN (0,1)),
    has_capacity_change INTEGER NOT NULL DEFAULT 0 CHECK (has_capacity_change IN (0,1)),
    FOREIGN KEY (city_id) REFERENCES city(id),
    FOREIGN KEY (owner_type_id) REFERENCES stadium_owner_type(id),
    FOREIGN KEY (owner_club_id) REFERENCES club(team_id),
    FOREIGN KEY (owner_person_id) REFERENCES person(id),
    FOREIGN KEY (pitch_type_id) REFERENCES pitch_type(id),
    FOREIGN KEY (grass_deterioration_rate_id) REFERENCES grass_deterioration_rate(id),
    FOREIGN KEY (quality_state_id) REFERENCES quality_state(id),
    FOREIGN KEY (environment_quality_id) REFERENCES environment_quality(id)
);

CREATE TABLE IF NOT EXISTS stadium_change_type (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS stadium_change (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    club_id INTEGER NOT NULL,
    change_type_id INTEGER NOT NULL,
    new_stadium_id INTEGER NOT NULL,
    old_stadium_id INTEGER,
    start_date TEXT,
    end_date TEXT,
    FOREIGN KEY (club_id) REFERENCES club(team_id),
    FOREIGN KEY (change_type_id) REFERENCES stadium_change_type(id),
    FOREIGN KEY (new_stadium_id) REFERENCES stadium(id),
    FOREIGN KEY (old_stadium_id) REFERENCES stadium(id)
);

CREATE TABLE IF NOT EXISTS competition_stage_type (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS alternative_stadium (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    club_id INTEGER NOT NULL,
    competition_id INTEGER NOT NULL,
    stadium_id INTEGER NOT NULL,
    year INTEGER,
    stage_type_id INTEGER,
    start_date TEXT,
    end_date TEXT,
    FOREIGN KEY (club_id) REFERENCES club(team_id),
    FOREIGN KEY (competition_id) REFERENCES competition(id),
    FOREIGN KEY (stadium_id) REFERENCES stadium(id),
    FOREIGN KEY (stage_type_id) REFERENCES competition_stage_type(id)
);

-- =========================
-- COMPETITIONS
-- =========================

CREATE TABLE IF NOT EXISTS competition_type (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS referee_category (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS trophy (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS competition (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    three_letter_name TEXT,
    nation_id INTEGER,
    gender_id INTEGER,
    level INTEGER,
    parent_competition_id INTEGER,
    reputation INTEGER,
    trophy_id INTEGER,
    allows_foreign_referees INTEGER NOT NULL DEFAULT 0 CHECK (allows_foreign_referees IN (0,1)),
    requires_seated_stadiums INTEGER NOT NULL DEFAULT 0 CHECK (requires_seated_stadiums IN (0,1)),
    extinct INTEGER NOT NULL DEFAULT 0 CHECK (extinct IN (0,1)),
    type_id INTEGER,
    goal_line_tv_only INTEGER NOT NULL DEFAULT 0 CHECK (goal_line_tv_only IN (0,1)),
    goal_line_from_main_stage INTEGER NOT NULL DEFAULT 0 CHECK (goal_line_from_main_stage IN (0,1)),
    goal_line_from_sub_stage INTEGER NOT NULL DEFAULT 0 CHECK (goal_line_from_sub_stage IN (0,1)),
    goal_line_from_date TEXT,
    minimum_referee_category_id INTEGER,
    FOREIGN KEY (nation_id) REFERENCES nation(id),
    FOREIGN KEY (gender_id) REFERENCES gender(id),
    FOREIGN KEY (parent_competition_id) REFERENCES competition(id),
    FOREIGN KEY (trophy_id) REFERENCES trophy(id),
    FOREIGN KEY (type_id) REFERENCES competition_type(id),
    FOREIGN KEY (minimum_referee_category_id) REFERENCES referee_category(id),
    UNIQUE (name, gender_id)
);

CREATE TABLE IF NOT EXISTS competition_other_name (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    competition_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    FOREIGN KEY (competition_id) REFERENCES competition(id) ON DELETE CASCADE,
    UNIQUE (competition_id, name)
);

CREATE TABLE IF NOT EXISTS competition_reserve_team_level (
    competition_id INTEGER NOT NULL,
    reserve_level INTEGER NOT NULL CHECK (reserve_level BETWEEN 1 AND 6),
    allowed INTEGER NOT NULL DEFAULT 1 CHECK (allowed IN (0,1)),
    PRIMARY KEY (competition_id, reserve_level),
    FOREIGN KEY (competition_id) REFERENCES competition(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS competition_season (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    competition_id INTEGER NOT NULL,
    year INTEGER NOT NULL,
    start_date TEXT,
    end_date TEXT,
    status TEXT,
    FOREIGN KEY (competition_id) REFERENCES competition(id),
    UNIQUE (competition_id, year)
);

CREATE TABLE IF NOT EXISTS competition_season_host_country (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    competition_season_id INTEGER NOT NULL,
    country_id INTEGER NOT NULL,
    FOREIGN KEY (competition_season_id) REFERENCES competition_season(id) ON DELETE CASCADE,
    FOREIGN KEY (country_id) REFERENCES nation(id),
    UNIQUE (competition_season_id, country_id)
);

CREATE TABLE IF NOT EXISTS competition_stage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    competition_season_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    stage_type_id INTEGER,
    stage_order INTEGER NOT NULL,
    FOREIGN KEY (competition_season_id) REFERENCES competition_season(id) ON DELETE CASCADE,
    FOREIGN KEY (stage_type_id) REFERENCES competition_stage_type(id),
    UNIQUE (competition_season_id, stage_order),
    UNIQUE (competition_season_id, name)
);

CREATE TABLE IF NOT EXISTS competition_round (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stage_id INTEGER NOT NULL,
    round_number INTEGER NOT NULL,
    name TEXT NOT NULL,
    start_date TEXT,
    end_date TEXT,
    FOREIGN KEY (stage_id) REFERENCES competition_stage(id) ON DELETE CASCADE,
    UNIQUE (stage_id, round_number)
);

CREATE TABLE IF NOT EXISTS competition_team (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    competition_season_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,
    reputation INTEGER,
    FOREIGN KEY (competition_season_id) REFERENCES competition_season(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES team(id),
    UNIQUE (competition_season_id, team_id)
);

CREATE TABLE IF NOT EXISTS competition_season_next_team (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    competition_season_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,
    reputation INTEGER,
    FOREIGN KEY (competition_season_id) REFERENCES competition_season(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES team(id),
    UNIQUE (competition_season_id, team_id)
);

CREATE TABLE IF NOT EXISTS standing_rule (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stage_id INTEGER NOT NULL,
    rule_order INTEGER NOT NULL,
    rule_type TEXT NOT NULL,
    FOREIGN KEY (stage_id) REFERENCES competition_stage(id) ON DELETE CASCADE,
    UNIQUE (stage_id, rule_order)
);

CREATE TABLE IF NOT EXISTS qualification_rule (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stage_id INTEGER NOT NULL,
    position_from INTEGER NOT NULL,
    position_to INTEGER NOT NULL,
    qualification_type TEXT NOT NULL,
    destination_competition_id INTEGER,
    destination_stage_id INTEGER,
    FOREIGN KEY (stage_id) REFERENCES competition_stage(id) ON DELETE CASCADE,
    FOREIGN KEY (destination_competition_id) REFERENCES competition(id),
    FOREIGN KEY (destination_stage_id) REFERENCES competition_stage(id),
    CHECK (position_from > 0 AND position_to >= position_from),
    CHECK (
        destination_competition_id IS NOT NULL
        OR destination_stage_id IS NOT NULL
    ),
    UNIQUE (stage_id, position_from, position_to, qualification_type)
);

CREATE TABLE IF NOT EXISTS stage_transition (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_stage_id INTEGER NOT NULL,
    to_stage_id INTEGER NOT NULL,
    source_type TEXT NOT NULL,
    source_position INTEGER,
    qualification_rule_id INTEGER,
    FOREIGN KEY (from_stage_id) REFERENCES competition_stage(id) ON DELETE CASCADE,
    FOREIGN KEY (to_stage_id) REFERENCES competition_stage(id) ON DELETE CASCADE,
    FOREIGN KEY (qualification_rule_id) REFERENCES qualification_rule(id),
    UNIQUE (from_stage_id, to_stage_id, source_type, source_position)
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
    FOREIGN KEY (round_id) REFERENCES competition_round(id) ON DELETE CASCADE,
    FOREIGN KEY (home_team_id) REFERENCES team(id),
    FOREIGN KEY (away_team_id) REFERENCES team(id),
    CHECK (home_team_id <> away_team_id)
);


-- =========================
-- NATIONAL TEAM
-- =========================

CREATE TABLE IF NOT EXISTS national_team_info (
    team_id INTEGER PRIMARY KEY,
    financial_power INTEGER,
    match_importance INTEGER,
    foundation_year INTEGER,
    ranking_points REAL,
    foreign_coach_probability REAL,
    federation_power INTEGER,
    youth_ranking INTEGER,
    FOREIGN KEY (team_id) REFERENCES national_team(team_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS national_team_coefficient (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    national_team_id INTEGER NOT NULL,
    season_offset INTEGER NOT NULL CHECK (season_offset BETWEEN -10 AND -1),
    coefficient REAL NOT NULL,
    FOREIGN KEY (national_team_id) REFERENCES national_team(team_id) ON DELETE CASCADE,
    UNIQUE (national_team_id, season_offset)
);

-- =========================
-- CLUB / OWNERSHIP
-- =========================

CREATE TABLE IF NOT EXISTS ownership_type (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    has_election INTEGER NOT NULL DEFAULT 0 CHECK (has_election IN (0,1))
);

CREATE TABLE IF NOT EXISTS ownership_promise (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS president_title (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS club_ownership (
    club_id INTEGER PRIMARY KEY,
    president_title_id INTEGER,
    ownership_type_id INTEGER,
    election_date TEXT,
    promise_id INTEGER,
    max_term_duration INTEGER,
    max_conditions INTEGER,
    min_revenue INTEGER,
    max_attendance INTEGER,
    prevent_external_acquisition INTEGER NOT NULL DEFAULT 0 CHECK (prevent_external_acquisition IN (0,1)),
    FOREIGN KEY (club_id) REFERENCES club(team_id) ON DELETE CASCADE,
    FOREIGN KEY (president_title_id) REFERENCES president_title(id),
    FOREIGN KEY (ownership_type_id) REFERENCES ownership_type(id),
    FOREIGN KEY (promise_id) REFERENCES ownership_promise(id)
);

CREATE TABLE IF NOT EXISTS reserve_team (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    club_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL UNIQUE,
    situation_id INTEGER,
    competition_id INTEGER,
    stadium_id INTEGER,
    home_weekday_id INTEGER,
    home_weekend_weekday_id INTEGER,
    average_attendance INTEGER,
    minimum_attendance INTEGER,
    maximum_attendance INTEGER,
    FOREIGN KEY (club_id) REFERENCES club(team_id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES team(id) ON DELETE CASCADE,
    FOREIGN KEY (situation_id) REFERENCES club_status(id),
    FOREIGN KEY (competition_id) REFERENCES competition(id),
    FOREIGN KEY (stadium_id) REFERENCES stadium(id),
    FOREIGN KEY (home_weekday_id) REFERENCES weekday(id),
    FOREIGN KEY (home_weekend_weekday_id) REFERENCES weekday(id)
);

-- =========================
-- CLUB FINANCE
-- =========================

CREATE TABLE IF NOT EXISTS patron_type (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS embargo_type (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS revenue_type (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS debt_source (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS money_direction (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS payment_interval (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    days INTEGER,
    months INTEGER,
    years INTEGER
);

CREATE TABLE IF NOT EXISTS clause_condition (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS club_finance (
    club_id INTEGER PRIMARY KEY,
    balance INTEGER,
    transfer_budget INTEGER,
    wage_budget INTEGER,
    monthly_wage_budget INTEGER,
    patron_type_id INTEGER,
    has_transfer_embargo INTEGER NOT NULL DEFAULT 0 CHECK (has_transfer_embargo IN (0,1)),
    transfer_embargo_start_date TEXT,
    transfer_embargo_end_date TEXT,
    transfer_embargo_appeal_date TEXT,
    embargo_age_restriction INTEGER,
    stadium_rent_year INTEGER,
    average_match_ticket_price INTEGER,
    average_season_ticket_price INTEGER,
    season_tickets_sold INTEGER,
    special_season_tickets_sold INTEGER,
    special_season_ticket_start_date TEXT,
    special_season_ticket_end_date TEXT,
    FOREIGN KEY (club_id) REFERENCES club(team_id) ON DELETE CASCADE,
    FOREIGN KEY (patron_type_id) REFERENCES patron_type(id)
);

CREATE TABLE IF NOT EXISTS club_finance_embargo (
    club_id INTEGER NOT NULL,
    embargo_type_id INTEGER NOT NULL,
    PRIMARY KEY (club_id, embargo_type_id),
    FOREIGN KEY (club_id) REFERENCES club_finance(club_id) ON DELETE CASCADE,
    FOREIGN KEY (embargo_type_id) REFERENCES embargo_type(id)
);

CREATE TABLE IF NOT EXISTS club_revenue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    club_id INTEGER NOT NULL,
    total_amount INTEGER NOT NULL,
    revenue_type_id INTEGER NOT NULL,
    start_date TEXT,
    end_date TEXT,
    renewable INTEGER NOT NULL DEFAULT 0 CHECK (renewable IN (0,1)),
    fixed_amount INTEGER NOT NULL DEFAULT 0 CHECK (fixed_amount IN (0,1)),
    FOREIGN KEY (club_id) REFERENCES club_finance(club_id) ON DELETE CASCADE,
    FOREIGN KEY (revenue_type_id) REFERENCES revenue_type(id)
);

CREATE TABLE IF NOT EXISTS club_debt (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    club_id INTEGER NOT NULL,
    original_amount INTEGER NOT NULL,
    debt_source_id INTEGER NOT NULL,
    start_date TEXT,
    end_date TEXT,
    interest_rate REAL,
    FOREIGN KEY (club_id) REFERENCES club_finance(club_id) ON DELETE CASCADE,
    FOREIGN KEY (debt_source_id) REFERENCES debt_source(id)
);

CREATE TABLE IF NOT EXISTS financial_fair_play_record (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    club_id INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    year INTEGER NOT NULL,
    competition_id INTEGER NOT NULL,
    FOREIGN KEY (club_id) REFERENCES club_finance(club_id) ON DELETE CASCADE,
    FOREIGN KEY (competition_id) REFERENCES competition(id),
    UNIQUE (club_id, year, competition_id)
);

-- =========================
-- PEOPLE
-- =========================

CREATE TABLE IF NOT EXISTS person_type (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS employment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS person (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT,
    second_name TEXT,
    common_name TEXT,
    full_name TEXT NOT NULL,
    person_type_id INTEGER NOT NULL,
    sex TEXT,
    height INTEGER,
    birth_date TEXT,
    birth_city_id INTEGER,
    agent_person_id INTEGER,
    retirement_after_current_club INTEGER NOT NULL DEFAULT 0 CHECK (retirement_after_current_club IN (0,1)),
    FOREIGN KEY (person_type_id) REFERENCES person_type(id),
    FOREIGN KEY (birth_city_id) REFERENCES city(id),
    FOREIGN KEY (agent_person_id) REFERENCES person(id)
);

CREATE TABLE IF NOT EXISTS second_nationality_info (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS person_second_nationality (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    person_id INTEGER NOT NULL,
    nation_id INTEGER NOT NULL,
    information_id INTEGER,
    FOREIGN KEY (person_id) REFERENCES person(id) ON DELETE CASCADE,
    FOREIGN KEY (nation_id) REFERENCES nation(id),
    FOREIGN KEY (information_id) REFERENCES second_nationality_info(id),
    UNIQUE (person_id, nation_id)
);

CREATE TABLE IF NOT EXISTS person_international_data (
    person_id INTEGER PRIMARY KEY,
    caps INTEGER DEFAULT 0,
    goals INTEGER DEFAULT 0,
    under_21_caps INTEGER DEFAULT 0,
    under_21_goals INTEGER DEFAULT 0,
    debut_date TEXT,
    debut_opponent_nation_id INTEGER,
    first_goal_date TEXT,
    first_goal_opponent_nation_id INTEGER,
    current_national_team_id INTEGER,
    youth_national_team_id INTEGER,
    FOREIGN KEY (person_id) REFERENCES person(id) ON DELETE CASCADE,
    FOREIGN KEY (debut_opponent_nation_id) REFERENCES nation(id),
    FOREIGN KEY (first_goal_opponent_nation_id) REFERENCES nation(id),
    FOREIGN KEY (current_national_team_id) REFERENCES national_team(team_id),
    FOREIGN KEY (youth_national_team_id) REFERENCES national_team(team_id)
);

CREATE TABLE IF NOT EXISTS person_contract (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    person_id INTEGER NOT NULL,
    club_id INTEGER NOT NULL,
    employment_id INTEGER,
    start_date TEXT,
    end_date TEXT,
    contract_type TEXT,
    salary INTEGER,
    squad_number INTEGER,
    FOREIGN KEY (person_id) REFERENCES person(id) ON DELETE CASCADE,
    FOREIGN KEY (club_id) REFERENCES club(team_id),
    FOREIGN KEY (employment_id) REFERENCES employment(id)
);

CREATE TABLE IF NOT EXISTS person_general_attribute (
    person_id INTEGER PRIMARY KEY,
    current_reputation INTEGER,
    national_reputation INTEGER,
    world_reputation INTEGER,
    FOREIGN KEY (person_id) REFERENCES person(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS person_tactical_attribute (
    person_id INTEGER PRIMARY KEY,
    FOREIGN KEY (person_id) REFERENCES person(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS person_non_technical_attribute (
    person_id INTEGER PRIMARY KEY,
    FOREIGN KEY (person_id) REFERENCES person(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS person_tendency (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    person_id INTEGER NOT NULL,
    tendency_key TEXT NOT NULL,
    enabled INTEGER NOT NULL CHECK (enabled IN (0,1)),
    FOREIGN KEY (person_id) REFERENCES person(id) ON DELETE CASCADE,
    UNIQUE (person_id, tendency_key)
);

CREATE TABLE IF NOT EXISTS person_language (
    person_id INTEGER NOT NULL,
    language_id INTEGER NOT NULL,
    PRIMARY KEY (person_id, language_id),
    FOREIGN KEY (person_id) REFERENCES person(id) ON DELETE CASCADE,
    FOREIGN KEY (language_id) REFERENCES language(id)
);

CREATE TABLE IF NOT EXISTS person_team_period (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    person_id INTEGER NOT NULL,
    club_id INTEGER NOT NULL,
    start_date TEXT,
    end_date TEXT,
    FOREIGN KEY (person_id) REFERENCES person(id) ON DELETE CASCADE,
    FOREIGN KEY (club_id) REFERENCES club(team_id)
);

CREATE TABLE IF NOT EXISTS person_person_relationship_reason (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS person_person_relationship (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    person_id_1 INTEGER NOT NULL,
    person_id_2 INTEGER NOT NULL,
    level INTEGER,
    reason_id INTEGER,
    is_permanent INTEGER NOT NULL DEFAULT 0 CHECK (is_permanent IN (0,1)),
    is_positive INTEGER NOT NULL DEFAULT 1 CHECK (is_positive IN (0,1)),
    FOREIGN KEY (person_id_1) REFERENCES person(id) ON DELETE CASCADE,
    FOREIGN KEY (person_id_2) REFERENCES person(id) ON DELETE CASCADE,
    FOREIGN KEY (reason_id) REFERENCES person_person_relationship_reason(id),
    UNIQUE (person_id_1, person_id_2),
    CHECK (person_id_1 <> person_id_2)
);

CREATE TABLE IF NOT EXISTS person_team_relationship (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    person_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,
    level INTEGER,
    reason TEXT,
    is_permanent INTEGER NOT NULL DEFAULT 0 CHECK (is_permanent IN (0,1)),
    is_positive INTEGER NOT NULL DEFAULT 1 CHECK (is_positive IN (0,1)),
    is_negative INTEGER NOT NULL DEFAULT 0 CHECK (is_negative IN (0,1)),
    is_legend INTEGER NOT NULL DEFAULT 0 CHECK (is_legend IN (0,1)),
    is_icon INTEGER NOT NULL DEFAULT 0 CHECK (is_icon IN (0,1)),
    FOREIGN KEY (person_id) REFERENCES person(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES team(id),
    UNIQUE (person_id, team_id, reason)
);

CREATE TABLE IF NOT EXISTS person_title (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    person_id INTEGER NOT NULL,
    club_id INTEGER,
    competition_id INTEGER,
    placement_id INTEGER,
    employment_id INTEGER,
    FOREIGN KEY (person_id) REFERENCES person(id) ON DELETE CASCADE,
    FOREIGN KEY (club_id) REFERENCES club(team_id),
    FOREIGN KEY (competition_id) REFERENCES competition(id),
    FOREIGN KEY (employment_id) REFERENCES employment(id)
);

-- =========================
-- PLAYER
-- =========================

CREATE TABLE IF NOT EXISTS player (
    person_id INTEGER PRIMARY KEY,
    potential_capacity INTEGER,
    potential INTEGER,
    estimated_value INTEGER,
    left_foot INTEGER,
    right_foot INTEGER,
    FOREIGN KEY (person_id) REFERENCES person(id) ON DELETE CASCADE,
    CHECK (left_foot IS NULL OR left_foot BETWEEN 0 AND 20),
    CHECK (right_foot IS NULL OR right_foot BETWEEN 0 AND 20)
);

CREATE TABLE IF NOT EXISTS position_definition (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS player_position (
    player_id INTEGER NOT NULL,
    position_id INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 0 AND 20),
    PRIMARY KEY (player_id, position_id),
    FOREIGN KEY (player_id) REFERENCES player(person_id) ON DELETE CASCADE,
    FOREIGN KEY (position_id) REFERENCES position_definition(id)
);

CREATE TABLE IF NOT EXISTS player_role (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    position_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    FOREIGN KEY (position_id) REFERENCES position_definition(id),
    UNIQUE (position_id, name)
);

CREATE TABLE IF NOT EXISTS player_role_rating (
    player_id INTEGER NOT NULL,
    role_id INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 0 AND 20),
    PRIMARY KEY (player_id, role_id),
    FOREIGN KEY (player_id) REFERENCES player(person_id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES player_role(id)
);

CREATE TABLE IF NOT EXISTS player_attribute_definition (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    attribute_key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    scale_id INTEGER,
    is_hidden INTEGER NOT NULL DEFAULT 0 CHECK (is_hidden IN (0,1)),
    FOREIGN KEY (scale_id) REFERENCES attribute_scale(id)
);

CREATE TABLE IF NOT EXISTS position_attribute_weight (
    position_id INTEGER NOT NULL,
    attribute_id INTEGER NOT NULL,
    weight REAL NOT NULL,
    PRIMARY KEY (position_id, attribute_id),
    FOREIGN KEY (position_id) REFERENCES position_definition(id) ON DELETE CASCADE,
    FOREIGN KEY (attribute_id) REFERENCES player_attribute_definition(id)
);

CREATE TABLE IF NOT EXISTS player_psychological_attribute (
    player_id INTEGER PRIMARY KEY,
    aggression INTEGER,
    anticipation INTEGER,
    bravery INTEGER,
    composure INTEGER,
    concentration INTEGER,
    consistency INTEGER,
    decisions INTEGER,
    determination INTEGER,
    dirtiness INTEGER,
    unpredictability INTEGER,
    important_matches INTEGER,
    leadership INTEGER,
    movement INTEGER,
    positioning INTEGER,
    teamwork INTEGER,
    vision INTEGER,
    work_rate INTEGER,
    FOREIGN KEY (player_id) REFERENCES player(person_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS player_physical_attribute (
    player_id INTEGER PRIMARY KEY,
    acceleration INTEGER,
    agility INTEGER,
    balance INTEGER,
    injury_proneness INTEGER,
    jumping_reach INTEGER,
    fitness INTEGER,
    pace INTEGER,
    stamina INTEGER,
    strength INTEGER,
    FOREIGN KEY (player_id) REFERENCES player(person_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS player_technical_attribute (
    player_id INTEGER PRIMARY KEY,
    corners INTEGER,
    crossing INTEGER,
    dribbling INTEGER,
    finishing INTEGER,
    first_touch INTEGER,
    free_kicks INTEGER,
    heading INTEGER,
    long_shots INTEGER,
    long_throws INTEGER,
    marking INTEGER,
    passing INTEGER,
    penalties INTEGER,
    tackling INTEGER,
    technique INTEGER,
    versatility INTEGER,
    FOREIGN KEY (player_id) REFERENCES player(person_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS player_goalkeeper_attribute (
    player_id INTEGER PRIMARY KEY,
    aerial_reach INTEGER,
    command_of_area INTEGER,
    communication INTEGER,
    eccentricity INTEGER,
    handling INTEGER,
    kicking INTEGER,
    one_on_ones INTEGER,
    reflexes INTEGER,
    rushes_out INTEGER,
    punches_ball INTEGER,
    throwing INTEGER,
    FOREIGN KEY (player_id) REFERENCES player(person_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS player_club_period (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    club_id INTEGER NOT NULL,
    start_date TEXT,
    end_date TEXT,
    FOREIGN KEY (player_id) REFERENCES player(person_id) ON DELETE CASCADE,
    FOREIGN KEY (club_id) REFERENCES club(team_id)
);

CREATE TABLE IF NOT EXISTS player_national_team_period (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    national_team_id INTEGER NOT NULL,
    start_date TEXT,
    end_date TEXT,
    FOREIGN KEY (player_id) REFERENCES player(person_id) ON DELETE CASCADE,
    FOREIGN KEY (national_team_id) REFERENCES national_team(team_id)
);

-- =========================
-- INJURIES / SUSPENSIONS
-- =========================

CREATE TABLE IF NOT EXISTS injury_classification (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS injury_subclassification (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    classification_id INTEGER,
    name TEXT NOT NULL,
    FOREIGN KEY (classification_id) REFERENCES injury_classification(id),
    UNIQUE (classification_id, name)
);

CREATE TABLE IF NOT EXISTS injury (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    location TEXT,
    minimum_days INTEGER,
    extra_days INTEGER,
    inactivity_ratio REAL,
    match_injury_percentage REAL,
    is_recurrent INTEGER NOT NULL DEFAULT 0 CHECK (is_recurrent IN (0,1)),
    is_contagious INTEGER NOT NULL DEFAULT 0 CHECK (is_contagious IN (0,1)),
    classification_id INTEGER,
    subclassification_id INTEGER,
    FOREIGN KEY (classification_id) REFERENCES injury_classification(id),
    FOREIGN KEY (subclassification_id) REFERENCES injury_subclassification(id),
    UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS injury_reason (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS injury_reason_injury (
    injury_id INTEGER NOT NULL,
    injury_reason_id INTEGER NOT NULL,
    PRIMARY KEY (injury_id, injury_reason_id),
    FOREIGN KEY (injury_id) REFERENCES injury(id) ON DELETE CASCADE,
    FOREIGN KEY (injury_reason_id) REFERENCES injury_reason(id)
);

CREATE TABLE IF NOT EXISTS player_injury (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    injury_id INTEGER NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT,
    future INTEGER NOT NULL DEFAULT 0 CHECK (future IN (0,1)),
    permanent INTEGER NOT NULL DEFAULT 0 CHECK (permanent IN (0,1)),
    severity INTEGER,
    side TEXT,
    prevents_training INTEGER NOT NULL DEFAULT 0 CHECK (prevents_training IN (0,1)),
    FOREIGN KEY (player_id) REFERENCES player(person_id) ON DELETE CASCADE,
    FOREIGN KEY (injury_id) REFERENCES injury(id)
);

CREATE TABLE IF NOT EXISTS suspension (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS person_suspension (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    person_id INTEGER NOT NULL,
    suspension_id INTEGER NOT NULL,
    competition_id INTEGER,
    start_date TEXT,
    end_date TEXT,
    number_of_matches INTEGER,
    FOREIGN KEY (person_id) REFERENCES person(id) ON DELETE CASCADE,
    FOREIGN KEY (suspension_id) REFERENCES suspension(id),
    FOREIGN KEY (competition_id) REFERENCES competition(id)
);

CREATE TABLE IF NOT EXISTS fan_suspension (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    competition_id INTEGER NOT NULL,
    suspension_type_id INTEGER,
    local_type_id INTEGER,
    number_of_matches INTEGER,
    start_date TEXT,
    end_date TEXT,
    FOREIGN KEY (competition_id) REFERENCES competition(id),
    FOREIGN KEY (suspension_type_id) REFERENCES suspension_type(id),
    FOREIGN KEY (local_type_id) REFERENCES game_location_type(id)
);

CREATE TABLE IF NOT EXISTS suspension_type (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS game_location_type (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

-- =========================
-- TACTICS / FANS / EQUIPMENT
-- =========================

CREATE TABLE IF NOT EXISTS formation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE IF NOT EXISTS team_tactical_profile (
    team_id INTEGER PRIMARY KEY,
    preferred_formation_id INTEGER,
    secondary_preferred_formation_id INTEGER,
    preferred_offensive_formation_id INTEGER,
    preferred_defensive_formation_id INTEGER,
    FOREIGN KEY (team_id) REFERENCES team(id) ON DELETE CASCADE,
    FOREIGN KEY (preferred_formation_id) REFERENCES formation(id),
    FOREIGN KEY (secondary_preferred_formation_id) REFERENCES formation(id),
    FOREIGN KEY (preferred_offensive_formation_id) REFERENCES formation(id),
    FOREIGN KEY (preferred_defensive_formation_id) REFERENCES formation(id)
);

CREATE TABLE IF NOT EXISTS fan_profile (
    club_id INTEGER PRIMARY KEY,
    loyalty INTEGER,
    passion INTEGER,
    patience INTEGER,
    attendance INTEGER,
    temperament INTEGER,
    expectations INTEGER,
    FOREIGN KEY (club_id) REFERENCES club(team_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS objective_type (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS fan_objective (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    club_id INTEGER NOT NULL,
    objective_type_id INTEGER NOT NULL,
    importance INTEGER,
    start_year INTEGER,
    end_year INTEGER,
    max_age INTEGER,
    minimum_length INTEGER,
    is_current_vision INTEGER NOT NULL DEFAULT 0 CHECK (is_current_vision IN (0,1)),
    competition_id INTEGER,
    nation_id INTEGER,
    FOREIGN KEY (club_id) REFERENCES club(team_id) ON DELETE CASCADE,
    FOREIGN KEY (objective_type_id) REFERENCES objective_type(id),
    FOREIGN KEY (competition_id) REFERENCES competition(id),
    FOREIGN KEY (nation_id) REFERENCES nation(id)
);

CREATE TABLE IF NOT EXISTS equipment_type (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS equipment_piece (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS equipment_style (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE IF NOT EXISTS team_equipment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL,
    equipment_type_id INTEGER NOT NULL,
    equipment_piece_id INTEGER NOT NULL,
    equipment_style_id INTEGER,
    has_number_square INTEGER NOT NULL DEFAULT 0 CHECK (has_number_square IN (0,1)),
    primary_color TEXT,
    secondary_color TEXT,
    details TEXT,
    number_color TEXT,
    number_border_color TEXT,
    competition_id INTEGER,
    overlap_number INTEGER CHECK (overlap_number BETWEEN 0 AND 10),
    specific_year INTEGER,
    FOREIGN KEY (team_id) REFERENCES team(id) ON DELETE CASCADE,
    FOREIGN KEY (equipment_type_id) REFERENCES equipment_type(id),
    FOREIGN KEY (equipment_piece_id) REFERENCES equipment_piece(id),
    FOREIGN KEY (equipment_style_id) REFERENCES equipment_style(id),
    FOREIGN KEY (competition_id) REFERENCES competition(id)
);

-- =========================
-- TEAM RELATIONSHIPS
-- =========================

CREATE TABLE IF NOT EXISTS team_person_relationship (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL,
    person_id INTEGER NOT NULL,
    level INTEGER,
    reason TEXT,
    permanent INTEGER NOT NULL DEFAULT 0 CHECK (permanent IN (0,1)),
    stadium_name_reference INTEGER NOT NULL DEFAULT 0 CHECK (stadium_name_reference IN (0,1)),
    negative INTEGER NOT NULL DEFAULT 0 CHECK (negative IN (0,1)),
    legend INTEGER NOT NULL DEFAULT 0 CHECK (legend IN (0,1)),
    icon INTEGER NOT NULL DEFAULT 0 CHECK (icon IN (0,1)),
    FOREIGN KEY (team_id) REFERENCES team(id) ON DELETE CASCADE,
    FOREIGN KEY (person_id) REFERENCES person(id) ON DELETE CASCADE,
    UNIQUE (team_id, person_id, reason)
);

CREATE TABLE IF NOT EXISTS team_rivalry (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id_1 INTEGER NOT NULL,
    team_id_2 INTEGER NOT NULL,
    level INTEGER,
    reason TEXT,
    FOREIGN KEY (team_id_1) REFERENCES team(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id_2) REFERENCES team(id) ON DELETE CASCADE,
    UNIQUE (team_id_1, team_id_2),
    CHECK (team_id_1 < team_id_2)
);

CREATE TABLE IF NOT EXISTS team_captain (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('CAPTAIN', 'VICE_CAPTAIN')),
    FOREIGN KEY (team_id) REFERENCES team(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES player(person_id),
    UNIQUE (team_id, role),
    UNIQUE (team_id, player_id)
);

CREATE TABLE IF NOT EXISTS team_player_partnership (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL,
    player_id_1 INTEGER NOT NULL,
    player_id_2 INTEGER NOT NULL,
    FOREIGN KEY (team_id) REFERENCES team(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id_1) REFERENCES player(person_id),
    FOREIGN KEY (player_id_2) REFERENCES player(person_id),
    UNIQUE (team_id, player_id_1, player_id_2),
    CHECK (player_id_1 < player_id_2)
);

CREATE TABLE IF NOT EXISTS retired_number_reason (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS team_retired_number (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL,
    player_id INTEGER,
    number INTEGER NOT NULL,
    reason_id INTEGER,
    transferable_between_players INTEGER NOT NULL DEFAULT 0 CHECK (transferable_between_players IN (0,1)),
    FOREIGN KEY (team_id) REFERENCES team(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES player(person_id),
    FOREIGN KEY (reason_id) REFERENCES retired_number_reason(id),
    UNIQUE (team_id, number)
);

CREATE TABLE IF NOT EXISTS club_affiliation_type (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS club_affiliation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    root_club_id INTEGER NOT NULL,
    target_club_id INTEGER NOT NULL,
    start_date TEXT,
    end_date TEXT,
    root_is_parent INTEGER NOT NULL DEFAULT 0 CHECK (root_is_parent IN (0,1)),
    affiliation_type_id INTEGER,
    annual_commission INTEGER,
    annual_friendly_probability REAL,
    FOREIGN KEY (root_club_id) REFERENCES club(team_id) ON DELETE CASCADE,
    FOREIGN KEY (target_club_id) REFERENCES club(team_id),
    FOREIGN KEY (affiliation_type_id) REFERENCES club_affiliation_type(id),
    UNIQUE (root_club_id, target_club_id, start_date),
    CHECK (root_club_id <> target_club_id)
);

-- =========================
-- CLUB / COMPETITION HISTORY
-- =========================

CREATE TABLE IF NOT EXISTS division (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS club_competition_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    club_id INTEGER NOT NULL,
    competition_id INTEGER NOT NULL,
    year INTEGER NOT NULL,
    order_number INTEGER,
    position INTEGER,
    points INTEGER,
    matches INTEGER,
    wins INTEGER,
    draws INTEGER,
    losses INTEGER,
    goals_for INTEGER,
    goals_against INTEGER,
    FOREIGN KEY (club_id) REFERENCES club(team_id) ON DELETE CASCADE,
    FOREIGN KEY (competition_id) REFERENCES competition(id),
    UNIQUE (club_id, competition_id, year)
);

CREATE TABLE IF NOT EXISTS club_regional_competition (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    club_id INTEGER NOT NULL,
    competition_id INTEGER NOT NULL,
    level INTEGER,
    year INTEGER,
    FOREIGN KEY (club_id) REFERENCES club(team_id) ON DELETE CASCADE,
    FOREIGN KEY (competition_id) REFERENCES competition(id),
    UNIQUE (club_id, competition_id, year)
);

CREATE TABLE IF NOT EXISTS club_competition_expectation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    club_id INTEGER NOT NULL,
    competition_id INTEGER NOT NULL,
    expected_final_position INTEGER,
    press_source_id INTEGER,
    FOREIGN KEY (club_id) REFERENCES club(team_id) ON DELETE CASCADE,
    FOREIGN KEY (competition_id) REFERENCES competition(id),
    FOREIGN KEY (press_source_id) REFERENCES press_source(id)
);

CREATE TABLE IF NOT EXISTS club_competition_coefficient (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    club_id INTEGER NOT NULL,
    competition_season_id INTEGER NOT NULL,
    season_offset INTEGER NOT NULL CHECK (season_offset BETWEEN -10 AND -1),
    coefficient REAL NOT NULL,
    FOREIGN KEY (club_id) REFERENCES club(team_id) ON DELETE CASCADE,
    FOREIGN KEY (competition_season_id) REFERENCES competition_season(id),
    UNIQUE (club_id, competition_season_id, season_offset)
);

-- =========================
-- TRANSFERS / CONTRACTUAL CLAUSES
-- =========================

CREATE TABLE IF NOT EXISTS transfer (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    origin_club_id INTEGER,
    target_club_id INTEGER,
    transfer_date TEXT,
    transfer_value INTEGER,
    FOREIGN KEY (player_id) REFERENCES player(person_id),
    FOREIGN KEY (origin_club_id) REFERENCES club(team_id),
    FOREIGN KEY (target_club_id) REFERENCES club(team_id)
);

CREATE TABLE IF NOT EXISTS resale_clause (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    origin_club_finance_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    target_club_finance_id INTEGER NOT NULL,
    resale_commission REAL,
    transfer_id INTEGER,
    FOREIGN KEY (origin_club_finance_id) REFERENCES club_finance(club_id),
    FOREIGN KEY (player_id) REFERENCES player(person_id),
    FOREIGN KEY (target_club_finance_id) REFERENCES club_finance(club_id),
    FOREIGN KEY (transfer_id) REFERENCES transfer(id)
);

CREATE TABLE IF NOT EXISTS sale_clause (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    origin_club_finance_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    target_club_finance_id INTEGER NOT NULL,
    resale_percentage REAL,
    transfer_id INTEGER,
    FOREIGN KEY (origin_club_finance_id) REFERENCES club_finance(club_id),
    FOREIGN KEY (player_id) REFERENCES player(person_id),
    FOREIGN KEY (target_club_finance_id) REFERENCES club_finance(club_id),
    FOREIGN KEY (transfer_id) REFERENCES transfer(id)
);

CREATE TABLE IF NOT EXISTS additional_commission (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    origin_club_finance_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    target_club_finance_id INTEGER NOT NULL,
    condition_id INTEGER NOT NULL,
    value INTEGER,
    target_quantity INTEGER,
    current_quantity INTEGER,
    transfer_id INTEGER,
    FOREIGN KEY (origin_club_finance_id) REFERENCES club_finance(club_id),
    FOREIGN KEY (player_id) REFERENCES player(person_id),
    FOREIGN KEY (target_club_finance_id) REFERENCES club_finance(club_id),
    FOREIGN KEY (condition_id) REFERENCES clause_condition(id),
    FOREIGN KEY (transfer_id) REFERENCES transfer(id)
);

CREATE TABLE IF NOT EXISTS installment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    origin_club_finance_id INTEGER NOT NULL,
    direction_id INTEGER NOT NULL,
    player_id INTEGER,
    target_club_finance_id INTEGER NOT NULL,
    amount_per_period INTEGER NOT NULL,
    number_of_periods INTEGER NOT NULL,
    interval_id INTEGER NOT NULL,
    transfer_id INTEGER,
    FOREIGN KEY (origin_club_finance_id) REFERENCES club_finance(club_id),
    FOREIGN KEY (direction_id) REFERENCES money_direction(id),
    FOREIGN KEY (player_id) REFERENCES player(person_id),
    FOREIGN KEY (target_club_finance_id) REFERENCES club_finance(club_id),
    FOREIGN KEY (interval_id) REFERENCES payment_interval(id),
    FOREIGN KEY (transfer_id) REFERENCES transfer(id)
);

CREATE TABLE IF NOT EXISTS wage_contribution (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    origin_club_finance_id INTEGER NOT NULL,
    direction_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    target_club_finance_id INTEGER NOT NULL,
    salary INTEGER NOT NULL,
    end_date TEXT,
    transfer_id INTEGER,
    FOREIGN KEY (origin_club_finance_id) REFERENCES club_finance(club_id),
    FOREIGN KEY (direction_id) REFERENCES money_direction(id),
    FOREIGN KEY (player_id) REFERENCES player(person_id),
    FOREIGN KEY (target_club_finance_id) REFERENCES club_finance(club_id),
    FOREIGN KEY (transfer_id) REFERENCES transfer(id)
);

CREATE TABLE IF NOT EXISTS loaned_player (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    root_club_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    target_club_id INTEGER NOT NULL,
    start_date TEXT,
    end_date TEXT,
    is_foreign INTEGER NOT NULL DEFAULT 0 CHECK (is_foreign IN (0,1)),
    FOREIGN KEY (root_club_id) REFERENCES club(team_id),
    FOREIGN KEY (player_id) REFERENCES player(person_id),
    FOREIGN KEY (target_club_id) REFERENCES club(team_id)
);

-- =========================
-- PRESS / MEDIA
-- =========================

CREATE TABLE IF NOT EXISTS press_period (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    day_period TEXT,
    weekday_id INTEGER,
    day_of_month INTEGER,
    month INTEGER,
    FOREIGN KEY (weekday_id) REFERENCES weekday(id)
);

CREATE TABLE IF NOT EXISTS news_reach (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS press_type (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS press_source (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    period_id INTEGER,
    reach_id INTEGER,
    participates_in_press_conferences INTEGER NOT NULL DEFAULT 0 CHECK (participates_in_press_conferences IN (0,1)),
    FOREIGN KEY (period_id) REFERENCES press_period(id),
    FOREIGN KEY (reach_id) REFERENCES news_reach(id)
);

CREATE TABLE IF NOT EXISTS press_source_type (
    press_source_id INTEGER NOT NULL,
    press_type_id INTEGER NOT NULL,
    PRIMARY KEY (press_source_id, press_type_id),
    FOREIGN KEY (press_source_id) REFERENCES press_source(id) ON DELETE CASCADE,
    FOREIGN KEY (press_type_id) REFERENCES press_type(id)
);

CREATE TABLE IF NOT EXISTS press_source_area (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    press_source_id INTEGER NOT NULL,
    nation_region_id INTEGER,
    club_id INTEGER,
    nation_id INTEGER,
    continent_id INTEGER,
    competition_id INTEGER,
    city_id INTEGER,
    FOREIGN KEY (press_source_id) REFERENCES press_source(id) ON DELETE CASCADE,
    FOREIGN KEY (nation_region_id) REFERENCES nation_region(id),
    FOREIGN KEY (club_id) REFERENCES club(team_id),
    FOREIGN KEY (nation_id) REFERENCES nation(id),
    FOREIGN KEY (continent_id) REFERENCES continent(id),
    FOREIGN KEY (competition_id) REFERENCES competition(id),
    FOREIGN KEY (city_id) REFERENCES city(id),
    CHECK (
        (nation_region_id IS NOT NULL) +
        (club_id IS NOT NULL) +
        (nation_id IS NOT NULL) +
        (continent_id IS NOT NULL) +
        (competition_id IS NOT NULL) +
        (city_id IS NOT NULL) = 1
    )
);

-- =========================
-- AWARDS
-- =========================

CREATE TABLE IF NOT EXISTS award_period (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS award_recipient_type (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS award_type (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS award_voting_type (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS award_organizer (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS award_statistic (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS award (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    short_name TEXT,
    continent_id INTEGER,
    competition_id INTEGER,
    award_period_id INTEGER,
    reputation INTEGER,
    winner_home_reputation INTEGER,
    winner_world_reputation INTEGER,
    primary_color TEXT,
    secondary_color TEXT,
    tertiary_color TEXT,
    recipient_type_id INTEGER,
    award_type_id INTEGER,
    award_date TEXT,
    announcement_date TEXT,
    voting_type_id INTEGER,
    organizer_id INTEGER,
    previous_winner_allowed INTEGER NOT NULL DEFAULT 1 CHECK (previous_winner_allowed IN (0,1)),
    minimum_match_percentage REAL,
    minimum_age INTEGER,
    maximum_age INTEGER,
    position_id INTEGER,
    side TEXT,
    FOREIGN KEY (continent_id) REFERENCES continent(id),
    FOREIGN KEY (competition_id) REFERENCES competition(id),
    FOREIGN KEY (award_period_id) REFERENCES award_period(id),
    FOREIGN KEY (recipient_type_id) REFERENCES award_recipient_type(id),
    FOREIGN KEY (award_type_id) REFERENCES award_type(id),
    FOREIGN KEY (voting_type_id) REFERENCES award_voting_type(id),
    FOREIGN KEY (organizer_id) REFERENCES award_organizer(id),
    FOREIGN KEY (position_id) REFERENCES position_definition(id),
    UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS award_other_name (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    award_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    FOREIGN KEY (award_id) REFERENCES award(id) ON DELETE CASCADE,
    UNIQUE (award_id, name)
);

CREATE TABLE IF NOT EXISTS award_eligible_recipient (
    award_id INTEGER NOT NULL,
    recipient_type_id INTEGER NOT NULL,
    PRIMARY KEY (award_id, recipient_type_id),
    FOREIGN KEY (award_id) REFERENCES award(id) ON DELETE CASCADE,
    FOREIGN KEY (recipient_type_id) REFERENCES award_recipient_type(id)
);

CREATE TABLE IF NOT EXISTS award_used_statistic (
    award_id INTEGER NOT NULL,
    statistic_id INTEGER NOT NULL,
    PRIMARY KEY (award_id, statistic_id),
    FOREIGN KEY (award_id) REFERENCES award(id) ON DELETE CASCADE,
    FOREIGN KEY (statistic_id) REFERENCES award_statistic(id)
);

CREATE TABLE IF NOT EXISTS award_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    award_id INTEGER NOT NULL,
    year INTEGER NOT NULL,
    ranking INTEGER,
    person_id INTEGER,
    club_id INTEGER,
    nation_id INTEGER,
    FOREIGN KEY (award_id) REFERENCES award(id) ON DELETE CASCADE,
    FOREIGN KEY (person_id) REFERENCES person(id),
    FOREIGN KEY (club_id) REFERENCES club(team_id),
    FOREIGN KEY (nation_id) REFERENCES nation(id),
    CHECK (
        (person_id IS NOT NULL) +
        (club_id IS NOT NULL) +
        (nation_id IS NOT NULL) = 1
    ),
    UNIQUE (award_id, year, ranking)
);

-- =========================
-- PLAYER / PERSON HISTORY
-- =========================

CREATE TABLE IF NOT EXISTS player_career_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    year INTEGER NOT NULL,
    order_number INTEGER,
    club_id INTEGER,
    division_id INTEGER,
    start_date TEXT,
    end_date TEXT,
    loan INTEGER NOT NULL DEFAULT 0 CHECK (loan IN (0,1)),
    youth INTEGER NOT NULL DEFAULT 0 CHECK (youth IN (0,1)),
    matches INTEGER,
    goals INTEGER,
    transfer_value INTEGER,
    FOREIGN KEY (player_id) REFERENCES player(person_id) ON DELETE CASCADE,
    FOREIGN KEY (club_id) REFERENCES club(team_id),
    FOREIGN KEY (division_id) REFERENCES division(id)
);

CREATE TABLE IF NOT EXISTS staff_career_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    person_id INTEGER NOT NULL,
    year INTEGER,
    club_id INTEGER,
    start_date TEXT,
    end_date TEXT,
    employment_id INTEGER,
    FOREIGN KEY (person_id) REFERENCES person(id) ON DELETE CASCADE,
    FOREIGN KEY (club_id) REFERENCES club(team_id),
    FOREIGN KEY (employment_id) REFERENCES employment(id)
);

CREATE TABLE IF NOT EXISTS player_achievement_type (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS player_achievement (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    team_id INTEGER,
    competition_id INTEGER,
    achievement_type_id INTEGER NOT NULL,
    FOREIGN KEY (player_id) REFERENCES player(person_id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES team(id),
    FOREIGN KEY (competition_id) REFERENCES competition(id),
    FOREIGN KEY (achievement_type_id) REFERENCES player_achievement_type(id)
);

-- =========================
-- CLUB RECORDS
-- =========================

CREATE TABLE IF NOT EXISTS record_type (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS club_record (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    club_id INTEGER NOT NULL,
    record_type_id INTEGER NOT NULL,
    date TEXT,
    opponent_club_id INTEGER,
    team_goals INTEGER,
    opponent_goals INTEGER,
    competition_id INTEGER,
    attendance INTEGER,
    matches INTEGER,
    start_date TEXT,
    end_date TEXT,
    player_id INTEGER,
    goals INTEGER,
    assists INTEGER,
    transfer_value INTEGER,
    seconds INTEGER,
    FOREIGN KEY (club_id) REFERENCES club(team_id) ON DELETE CASCADE,
    FOREIGN KEY (record_type_id) REFERENCES record_type(id),
    FOREIGN KEY (opponent_club_id) REFERENCES club(team_id),
    FOREIGN KEY (competition_id) REFERENCES competition(id),
    FOREIGN KEY (player_id) REFERENCES player(person_id)
);

CREATE TABLE IF NOT EXISTS competition_record (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    competition_id INTEGER NOT NULL,
    record_type_id INTEGER NOT NULL,
    date TEXT,
    club_id INTEGER,
    opponent_club_id INTEGER,
    team_goals INTEGER,
    opponent_goals INTEGER,
    attendance INTEGER,
    matches INTEGER,
    start_date TEXT,
    end_date TEXT,
    player_id INTEGER,
    goals INTEGER,
    assists INTEGER,
    transfer_value INTEGER,
    seconds INTEGER,
    FOREIGN KEY (competition_id) REFERENCES competition(id) ON DELETE CASCADE,
    FOREIGN KEY (record_type_id) REFERENCES record_type(id),
    FOREIGN KEY (club_id) REFERENCES club(team_id),
    FOREIGN KEY (opponent_club_id) REFERENCES club(team_id),
    FOREIGN KEY (player_id) REFERENCES player(person_id)
);

-- =========================
-- COMPETITION HISTORY / DERBIES
-- =========================

CREATE TABLE IF NOT EXISTS competition_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    competition_id INTEGER NOT NULL,
    year INTEGER NOT NULL,
    order_number INTEGER,
    start_year INTEGER,
    end_year INTEGER,
    final_date TEXT,
    is_single_year INTEGER NOT NULL DEFAULT 1 CHECK (is_single_year IN (0,1)),
    has_multiple_years INTEGER NOT NULL DEFAULT 0 CHECK (has_multiple_years IN (0,1)),
    no_data INTEGER NOT NULL DEFAULT 0 CHECK (no_data IN (0,1)),
    did_not_happen INTEGER NOT NULL DEFAULT 0 CHECK (did_not_happen IN (0,1)),
    did_not_finish INTEGER NOT NULL DEFAULT 0 CHECK (did_not_finish IN (0,1)),
    FOREIGN KEY (competition_id) REFERENCES competition(id) ON DELETE CASCADE,
    UNIQUE (competition_id, year)
);

CREATE TABLE IF NOT EXISTS competition_history_team (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    competition_history_id INTEGER NOT NULL,
    team_id INTEGER,
    slot_number INTEGER NOT NULL CHECK (slot_number BETWEEN 1 AND 3),
    FOREIGN KEY (competition_history_id) REFERENCES competition_history(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES team(id),
    UNIQUE (competition_history_id, slot_number)
);

CREATE TABLE IF NOT EXISTS competition_history_host (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    competition_history_id INTEGER NOT NULL,
    nation_id INTEGER,
    stadium_id INTEGER,
    slot_number INTEGER NOT NULL CHECK (slot_number BETWEEN 1 AND 3),
    FOREIGN KEY (competition_history_id) REFERENCES competition_history(id) ON DELETE CASCADE,
    FOREIGN KEY (nation_id) REFERENCES nation(id),
    FOREIGN KEY (stadium_id) REFERENCES stadium(id),
    UNIQUE (competition_history_id, slot_number)
);

CREATE TABLE IF NOT EXISTS derby (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    short_name TEXT,
    club_id_1 INTEGER NOT NULL,
    club_id_2 INTEGER NOT NULL,
    world_reputation INTEGER,
    national_reputation INTEGER,
    FOREIGN KEY (club_id_1) REFERENCES club(team_id),
    FOREIGN KEY (club_id_2) REFERENCES club(team_id),
    UNIQUE (club_id_1, club_id_2),
    CHECK (club_id_1 < club_id_2)
);

-- =========================
-- WEATHER
-- =========================

CREATE TABLE IF NOT EXISTS weather_season (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS climate_season_profile (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    climate_id INTEGER NOT NULL,
    season_id INTEGER NOT NULL,
    start_day INTEGER,
    rain_dry REAL,
    rain_humid REAL,
    rain_drizzle REAL,
    rain_shower REAL,
    wind_calm REAL,
    wind_breeze REAL,
    wind_windy REAL,
    wind_strong REAL,
    wind_storm REAL,
    temp_below_minus_16 REAL,
    temp_minus_15_to_minus_8 REAL,
    temp_minus_7_to_0 REAL,
    temp_1_to_6 REAL,
    temp_7_to_13 REAL,
    temp_14_to_21 REAL,
    temp_22_to_28 REAL,
    temp_29_to_34 REAL,
    temp_35_to_42 REAL,
    temp_above_43 REAL,
    day_night_variation INTEGER NOT NULL DEFAULT 0 CHECK (day_night_variation IN (0,1)),
    day_night_variation_value REAL,
    FOREIGN KEY (climate_id) REFERENCES climate(id) ON DELETE CASCADE,
    FOREIGN KEY (season_id) REFERENCES weather_season(id),
    UNIQUE (climate_id, season_id)
);


-- ============================================================
-- WORLD V1.1 — SECOND PASS
-- Competition rules, scheduling, draws, transfers, tactics,
-- attributes, nationality and editor validation support.
-- ============================================================

-- =========================
-- COMPETITION RULES
-- =========================

CREATE TABLE IF NOT EXISTS stage_participant_rule (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stage_id INTEGER NOT NULL,
    participant_type TEXT NOT NULL,
    min_participants INTEGER,
    max_participants INTEGER,
    FOREIGN KEY (stage_id) REFERENCES competition_stage(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS stage_participant_source (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stage_id INTEGER NOT NULL,
    source_type TEXT NOT NULL,
    source_competition_id INTEGER,
    source_stage_id INTEGER,
    position_from INTEGER,
    position_to INTEGER,
    FOREIGN KEY (stage_id) REFERENCES competition_stage(id) ON DELETE CASCADE,
    FOREIGN KEY (source_competition_id) REFERENCES competition(id),
    FOREIGN KEY (source_stage_id) REFERENCES competition_stage(id)
);

CREATE TABLE IF NOT EXISTS stage_format (
    stage_id INTEGER PRIMARY KEY,
    format_type TEXT NOT NULL,
    participant_count INTEGER,
    group_count INTEGER,
    participants_per_group INTEGER,
    legs INTEGER NOT NULL DEFAULT 1,
    home_away INTEGER NOT NULL DEFAULT 1 CHECK (home_away IN (0,1)),
    aggregate_score INTEGER NOT NULL DEFAULT 0 CHECK (aggregate_score IN (0,1)),
    extra_time INTEGER NOT NULL DEFAULT 0 CHECK (extra_time IN (0,1)),
    penalties INTEGER NOT NULL DEFAULT 0 CHECK (penalties IN (0,1)),
    away_goals_rule INTEGER NOT NULL DEFAULT 0 CHECK (away_goals_rule IN (0,1)),
    FOREIGN KEY (stage_id) REFERENCES competition_stage(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS stage_points_rule (
    stage_id INTEGER PRIMARY KEY,
    win_points INTEGER NOT NULL DEFAULT 3,
    draw_points INTEGER NOT NULL DEFAULT 1,
    loss_points INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (stage_id) REFERENCES competition_stage(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS stage_match_rule (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stage_id INTEGER NOT NULL,
    rule_type TEXT NOT NULL,
    rule_value TEXT,
    FOREIGN KEY (stage_id) REFERENCES competition_stage(id) ON DELETE CASCADE,
    UNIQUE (stage_id, rule_type)
);

CREATE TABLE IF NOT EXISTS stage_squad_rule (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stage_id INTEGER NOT NULL,
    rule_type TEXT NOT NULL,
    value INTEGER,
    nation_id INTEGER,
    competition_id INTEGER,
    FOREIGN KEY (stage_id) REFERENCES competition_stage(id) ON DELETE CASCADE,
    FOREIGN KEY (nation_id) REFERENCES nation(id),
    FOREIGN KEY (competition_id) REFERENCES competition(id)
);

CREATE TABLE IF NOT EXISTS stage_registration_rule (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stage_id INTEGER NOT NULL,
    rule_type TEXT NOT NULL,
    value INTEGER,
    position_id INTEGER,
    nation_id INTEGER,
    FOREIGN KEY (stage_id) REFERENCES competition_stage(id) ON DELETE CASCADE,
    FOREIGN KEY (position_id) REFERENCES position_definition(id),
    FOREIGN KEY (nation_id) REFERENCES nation(id)
);

CREATE TABLE IF NOT EXISTS stage_promotion_relegation_rule (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stage_id INTEGER NOT NULL,
    position_from INTEGER NOT NULL,
    position_to INTEGER NOT NULL,
    direction TEXT NOT NULL,
    destination_competition_id INTEGER,
    destination_stage_id INTEGER,
    FOREIGN KEY (stage_id) REFERENCES competition_stage(id) ON DELETE CASCADE,
    FOREIGN KEY (destination_competition_id) REFERENCES competition(id),
    FOREIGN KEY (destination_stage_id) REFERENCES competition_stage(id),
    CHECK (position_from > 0 AND position_to >= position_from)
);

CREATE TABLE IF NOT EXISTS stage_technology_rule (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stage_id INTEGER NOT NULL,
    technology TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0,1)),
    from_date TEXT,
    tv_only INTEGER NOT NULL DEFAULT 0 CHECK (tv_only IN (0,1)),
    FOREIGN KEY (stage_id) REFERENCES competition_stage(id) ON DELETE CASCADE,
    UNIQUE (stage_id, technology)
);

-- =========================
-- SCHEDULING
-- =========================

CREATE TABLE IF NOT EXISTS schedule_profile (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stage_id INTEGER NOT NULL UNIQUE,
    scheduling_type TEXT NOT NULL,
    start_date TEXT,
    end_date TEXT,
    interval_days INTEGER,
    home_away_balanced INTEGER NOT NULL DEFAULT 1 CHECK (home_away_balanced IN (0,1)),
    FOREIGN KEY (stage_id) REFERENCES competition_stage(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS schedule_matchday_rule (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    schedule_profile_id INTEGER NOT NULL,
    weekday_id INTEGER,
    start_time TEXT,
    end_time TEXT,
    priority INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (schedule_profile_id) REFERENCES schedule_profile(id) ON DELETE CASCADE,
    FOREIGN KEY (weekday_id) REFERENCES weekday(id)
);

CREATE TABLE IF NOT EXISTS schedule_blackout (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    schedule_profile_id INTEGER NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    reason TEXT,
    FOREIGN KEY (schedule_profile_id) REFERENCES schedule_profile(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS schedule_constraint (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    schedule_profile_id INTEGER NOT NULL,
    constraint_type TEXT NOT NULL,
    value TEXT,
    FOREIGN KEY (schedule_profile_id) REFERENCES schedule_profile(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS fixture_leg (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fixture_id INTEGER NOT NULL,
    leg_number INTEGER NOT NULL,
    aggregate_group TEXT,
    FOREIGN KEY (fixture_id) REFERENCES fixture(id) ON DELETE CASCADE,
    UNIQUE (fixture_id, leg_number)
);

CREATE TABLE IF NOT EXISTS fixture_venue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fixture_id INTEGER NOT NULL UNIQUE,
    stadium_id INTEGER,
    alternative_stadium_id INTEGER,
    venue_reason TEXT,
    FOREIGN KEY (fixture_id) REFERENCES fixture(id) ON DELETE CASCADE,
    FOREIGN KEY (stadium_id) REFERENCES stadium(id),
    FOREIGN KEY (alternative_stadium_id) REFERENCES stadium(id)
);

-- =========================
-- DRAW / POTS / RESTRICTIONS
-- =========================

CREATE TABLE IF NOT EXISTS draw_definition (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stage_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    draw_type TEXT NOT NULL,
    seed_count INTEGER,
    order_mode TEXT,
    FOREIGN KEY (stage_id) REFERENCES competition_stage(id) ON DELETE CASCADE,
    UNIQUE (stage_id, name)
);

CREATE TABLE IF NOT EXISTS draw_pot (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    draw_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    pot_order INTEGER NOT NULL,
    team_count INTEGER,
    FOREIGN KEY (draw_id) REFERENCES draw_definition(id) ON DELETE CASCADE,
    UNIQUE (draw_id, pot_order)
);

CREATE TABLE IF NOT EXISTS draw_pot_team (
    draw_pot_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,
    seed INTEGER,
    PRIMARY KEY (draw_pot_id, team_id),
    FOREIGN KEY (draw_pot_id) REFERENCES draw_pot(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES team(id)
);

CREATE TABLE IF NOT EXISTS draw_participant (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    draw_id INTEGER NOT NULL,
    team_id INTEGER,
    participant_slot INTEGER,
    source_type TEXT,
    source_stage_id INTEGER,
    source_position INTEGER,
    FOREIGN KEY (draw_id) REFERENCES draw_definition(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES team(id),
    FOREIGN KEY (source_stage_id) REFERENCES competition_stage(id),
    UNIQUE (draw_id, participant_slot)
);

CREATE TABLE IF NOT EXISTS draw_restriction (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    draw_id INTEGER NOT NULL,
    restriction_type TEXT NOT NULL,
    source_pot_id INTEGER,
    target_pot_id INTEGER,
    nation_id INTEGER,
    continent_id INTEGER,
    competition_id INTEGER,
    max_meetings INTEGER,
    same_group_allowed INTEGER,
    FOREIGN KEY (draw_id) REFERENCES draw_definition(id) ON DELETE CASCADE,
    FOREIGN KEY (source_pot_id) REFERENCES draw_pot(id),
    FOREIGN KEY (target_pot_id) REFERENCES draw_pot(id),
    FOREIGN KEY (nation_id) REFERENCES nation(id),
    FOREIGN KEY (continent_id) REFERENCES continent(id),
    FOREIGN KEY (competition_id) REFERENCES competition(id)
);

CREATE TABLE IF NOT EXISTS draw_slot (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    draw_id INTEGER NOT NULL,
    slot_number INTEGER NOT NULL,
    pot_id INTEGER,
    group_number INTEGER,
    FOREIGN KEY (draw_id) REFERENCES draw_definition(id) ON DELETE CASCADE,
    FOREIGN KEY (pot_id) REFERENCES draw_pot(id),
    UNIQUE (draw_id, slot_number)
);

-- =========================
-- TRANSFERS / CONTRACTS
-- =========================

CREATE TABLE IF NOT EXISTS transfer_window (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    competition_id INTEGER,
    nation_id INTEGER,
    name TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    FOREIGN KEY (competition_id) REFERENCES competition(id),
    FOREIGN KEY (nation_id) REFERENCES nation(id),
    CHECK (competition_id IS NOT NULL OR nation_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS transfer_status (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS transfer_type (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS player_transfer (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    origin_club_id INTEGER,
    destination_club_id INTEGER,
    transfer_type_id INTEGER,
    transfer_status_id INTEGER,
    transfer_window_id INTEGER,
    transfer_date TEXT,
    fee INTEGER,
    currency_id INTEGER,
    permanent INTEGER NOT NULL DEFAULT 1 CHECK (permanent IN (0,1)),
    FOREIGN KEY (player_id) REFERENCES player(person_id),
    FOREIGN KEY (origin_club_id) REFERENCES club(team_id),
    FOREIGN KEY (destination_club_id) REFERENCES club(team_id),
    FOREIGN KEY (transfer_type_id) REFERENCES transfer_type(id),
    FOREIGN KEY (transfer_status_id) REFERENCES transfer_status(id),
    FOREIGN KEY (transfer_window_id) REFERENCES transfer_window(id),
    FOREIGN KEY (currency_id) REFERENCES currency(id)
);

CREATE TABLE IF NOT EXISTS contract_type (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS contract_clause_type (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS player_contract_clause (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_id INTEGER NOT NULL,
    clause_type_id INTEGER NOT NULL,
    value INTEGER,
    percentage REAL,
    target_club_id INTEGER,
    condition_id INTEGER,
    target_quantity INTEGER,
    FOREIGN KEY (contract_id) REFERENCES person_contract(id) ON DELETE CASCADE,
    FOREIGN KEY (clause_type_id) REFERENCES contract_clause_type(id),
    FOREIGN KEY (target_club_id) REFERENCES club(team_id),
    FOREIGN KEY (condition_id) REFERENCES clause_condition(id)
);

-- =========================
-- TACTICS / FORMATIONS / ROLES
-- =========================

CREATE TABLE IF NOT EXISTS formation_position (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    formation_id INTEGER NOT NULL,
    position_id INTEGER NOT NULL,
    x REAL NOT NULL,
    y REAL NOT NULL,
    side TEXT,
    FOREIGN KEY (formation_id) REFERENCES formation(id) ON DELETE CASCADE,
    FOREIGN KEY (position_id) REFERENCES position_definition(id),
    UNIQUE (formation_id, x, y)
);

CREATE TABLE IF NOT EXISTS role_duty (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS player_role_duty (
    role_id INTEGER NOT NULL,
    duty_id INTEGER NOT NULL,
    PRIMARY KEY (role_id, duty_id),
    FOREIGN KEY (role_id) REFERENCES player_role(id) ON DELETE CASCADE,
    FOREIGN KEY (duty_id) REFERENCES role_duty(id)
);

CREATE TABLE IF NOT EXISTS player_role_key_attribute (
    role_id INTEGER NOT NULL,
    attribute_id INTEGER NOT NULL,
    weight REAL NOT NULL DEFAULT 1,
    PRIMARY KEY (role_id, attribute_id),
    FOREIGN KEY (role_id) REFERENCES player_role(id) ON DELETE CASCADE,
    FOREIGN KEY (attribute_id) REFERENCES player_attribute_definition(id)
);

CREATE TABLE IF NOT EXISTS formation_position_assignment (
    formation_position_id INTEGER PRIMARY KEY,
    role_id INTEGER,
    duty_id INTEGER,
    FOREIGN KEY (formation_position_id) REFERENCES formation_position(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES player_role(id),
    FOREIGN KEY (duty_id) REFERENCES role_duty(id)
);

CREATE TABLE IF NOT EXISTS tactical_instruction (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    value_type TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS formation_instruction (
    formation_id INTEGER NOT NULL,
    instruction_id INTEGER NOT NULL,
    value TEXT,
    PRIMARY KEY (formation_id, instruction_id),
    FOREIGN KEY (formation_id) REFERENCES formation(id) ON DELETE CASCADE,
    FOREIGN KEY (instruction_id) REFERENCES tactical_instruction(id)
);

-- =========================
-- ATTRIBUTES / WEIGHTS
-- =========================

CREATE TABLE IF NOT EXISTS attribute_scale (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    minimum_value INTEGER NOT NULL,
    maximum_value INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS role_attribute_weight (
    role_id INTEGER NOT NULL,
    attribute_id INTEGER NOT NULL,
    weight REAL NOT NULL,
    PRIMARY KEY (role_id, attribute_id),
    FOREIGN KEY (role_id) REFERENCES player_role(id) ON DELETE CASCADE,
    FOREIGN KEY (attribute_id) REFERENCES player_attribute_definition(id)
);

-- =========================
-- NATIONALITY RULES
-- =========================

CREATE TABLE IF NOT EXISTS nationality_rule (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nation_id INTEGER NOT NULL,
    rule_type TEXT NOT NULL,
    value INTEGER,
    required_nation_id INTEGER,
    cumulative INTEGER NOT NULL DEFAULT 0 CHECK (cumulative IN (0,1)),
    enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0,1)),
    FOREIGN KEY (nation_id) REFERENCES nation(id) ON DELETE CASCADE,
    FOREIGN KEY (required_nation_id) REFERENCES nation(id)
);

CREATE TABLE IF NOT EXISTS nationality_eligibility_rule (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nation_id INTEGER NOT NULL,
    rule_type TEXT NOT NULL,
    minimum_age INTEGER,
    maximum_age INTEGER,
    years_required INTEGER,
    matches_required INTEGER,
    required_nation_id INTEGER,
    FOREIGN KEY (nation_id) REFERENCES nation(id) ON DELETE CASCADE,
    FOREIGN KEY (required_nation_id) REFERENCES nation(id)
);

CREATE TABLE IF NOT EXISTS nation_treatment_rule (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    root_nation_id INTEGER NOT NULL,
    target_nation_id INTEGER NOT NULL,
    treatment_type TEXT NOT NULL,
    value INTEGER,
    FOREIGN KEY (root_nation_id) REFERENCES nation(id) ON DELETE CASCADE,
    FOREIGN KEY (target_nation_id) REFERENCES nation(id) ON DELETE CASCADE,
    UNIQUE (root_nation_id, target_nation_id, treatment_type)
);

-- =========================
-- EDITOR VALIDATION
-- =========================

CREATE TABLE IF NOT EXISTS validation_rule_definition (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('ERROR', 'WARNING', 'INFO')),
    description TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0,1))
);

CREATE TABLE IF NOT EXISTS validation_rule_parameter (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    validation_rule_id INTEGER NOT NULL,
    parameter_key TEXT NOT NULL,
    parameter_value TEXT,
    FOREIGN KEY (validation_rule_id) REFERENCES validation_rule_definition(id) ON DELETE CASCADE,
    UNIQUE (validation_rule_id, parameter_key)
);

CREATE TABLE IF NOT EXISTS editor_validation_profile (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0,1))
);

CREATE TABLE IF NOT EXISTS editor_validation_profile_rule (
    profile_id INTEGER NOT NULL,
    validation_rule_id INTEGER NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0,1)),
    PRIMARY KEY (profile_id, validation_rule_id),
    FOREIGN KEY (profile_id) REFERENCES editor_validation_profile(id) ON DELETE CASCADE,
    FOREIGN KEY (validation_rule_id) REFERENCES validation_rule_definition(id) ON DELETE CASCADE
);


-- =========================
-- INDEXES
-- =========================

CREATE INDEX IF NOT EXISTS idx_city_nation ON city(nation_id);
CREATE INDEX IF NOT EXISTS idx_city_region ON city(nation_region_id);
CREATE INDEX IF NOT EXISTS idx_stadium_city ON stadium(city_id);
CREATE INDEX IF NOT EXISTS idx_team_nation ON team(nation_id);
CREATE INDEX IF NOT EXISTS idx_club_city ON club(city_id);
CREATE INDEX IF NOT EXISTS idx_competition_nation ON competition(nation_id);
CREATE INDEX IF NOT EXISTS idx_competition_parent ON competition(parent_competition_id);
CREATE INDEX IF NOT EXISTS idx_season_competition ON competition_season(competition_id);
CREATE INDEX IF NOT EXISTS idx_stage_season ON competition_stage(competition_season_id);
CREATE INDEX IF NOT EXISTS idx_round_stage ON competition_round(stage_id);
CREATE INDEX IF NOT EXISTS idx_fixture_round ON fixture(round_id);
CREATE INDEX IF NOT EXISTS idx_fixture_date ON fixture(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_fixture_home_team ON fixture(home_team_id);
CREATE INDEX IF NOT EXISTS idx_fixture_away_team ON fixture(away_team_id);
CREATE INDEX IF NOT EXISTS idx_person_type ON person(person_type_id);
CREATE INDEX IF NOT EXISTS idx_person_birth_city ON person(birth_city_id);
CREATE INDEX IF NOT EXISTS idx_contract_person ON person_contract(person_id);
CREATE INDEX IF NOT EXISTS idx_contract_club ON person_contract(club_id);
CREATE INDEX IF NOT EXISTS idx_player_club_period ON player_club_period(player_id, club_id);
CREATE INDEX IF NOT EXISTS idx_player_injury ON player_injury(player_id, start_date);
CREATE INDEX IF NOT EXISTS idx_competition_history ON competition_history(competition_id, year);
CREATE INDEX IF NOT EXISTS idx_club_record ON club_record(club_id, record_type_id);
CREATE INDEX IF NOT EXISTS idx_press_area_source ON press_source_area(press_source_id);

CREATE INDEX IF NOT EXISTS idx_stage_participant_rule_stage ON stage_participant_rule(stage_id);
CREATE INDEX IF NOT EXISTS idx_stage_participant_source_stage ON stage_participant_source(stage_id);
CREATE INDEX IF NOT EXISTS idx_schedule_profile_stage ON schedule_profile(stage_id);
CREATE INDEX IF NOT EXISTS idx_draw_stage ON draw_definition(stage_id);
CREATE INDEX IF NOT EXISTS idx_draw_pot_draw ON draw_pot(draw_id);
CREATE INDEX IF NOT EXISTS idx_transfer_player ON player_transfer(player_id);
CREATE INDEX IF NOT EXISTS idx_transfer_club_origin ON player_transfer(origin_club_id);
CREATE INDEX IF NOT EXISTS idx_transfer_club_destination ON player_transfer(destination_club_id);
CREATE INDEX IF NOT EXISTS idx_player_contract_clause_contract ON player_contract_clause(contract_id);
CREATE INDEX IF NOT EXISTS idx_nationality_rule_nation ON nationality_rule(nation_id);
CREATE INDEX IF NOT EXISTS idx_validation_rule_entity ON validation_rule_definition(entity_type);
