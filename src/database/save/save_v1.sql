
-- ============================================================
-- SAVE DATABASE V1
-- Runtime state of a career/game.
--
-- This database does NOT own the world definition.
-- IDs such as team_id, player_id and competition_id refer to
-- the immutable world package loaded by the game.
--
-- World package identity is stored in save_world.
-- Dates use ISO-8601 TEXT.
-- Money uses INTEGER.
-- Booleans use INTEGER 0/1.
-- ============================================================

-- =========================
-- SAVE / WORLD IDENTITY
-- =========================

CREATE TABLE IF NOT EXISTS save (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    last_saved_at TEXT NOT NULL,
    game_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS save_world (
    save_id INTEGER PRIMARY KEY,
    package_name TEXT NOT NULL,
    package_version TEXT,
    package_hash TEXT,
    source_path TEXT,
    imported_at TEXT NOT NULL,
    FOREIGN KEY (save_id) REFERENCES save(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS save_manager (
    save_id INTEGER PRIMARY KEY,
    person_id INTEGER,
    club_id INTEGER,
    national_team_id INTEGER,
    FOREIGN KEY (save_id) REFERENCES save(id) ON DELETE CASCADE
);

-- =========================
-- GAME CLOCK / CALENDAR
-- =========================

CREATE TABLE IF NOT EXISTS calendar_state (
    save_id INTEGER PRIMARY KEY,
    game_date TEXT NOT NULL,
    season_year INTEGER NOT NULL,
    day_phase TEXT,
    FOREIGN KEY (save_id) REFERENCES save(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS calendar_event (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    save_id INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    event_date TEXT NOT NULL,
    end_date TEXT,
    priority INTEGER NOT NULL DEFAULT 0,
    title TEXT,
    description TEXT,
    completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0,1)),
    FOREIGN KEY (save_id) REFERENCES save(id) ON DELETE CASCADE
);

-- =========================
-- ACTIVE COMPETITION STATE
-- =========================

CREATE TABLE IF NOT EXISTS season_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    save_id INTEGER NOT NULL,
    competition_id INTEGER NOT NULL,
    competition_season_id INTEGER,
    year INTEGER NOT NULL,
    status TEXT NOT NULL,
    current_stage_id INTEGER,
    current_round_id INTEGER,
    start_date TEXT,
    end_date TEXT,
    FOREIGN KEY (save_id) REFERENCES save(id) ON DELETE CASCADE,
    UNIQUE (save_id, competition_id, year)
);

CREATE TABLE IF NOT EXISTS stage_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    save_id INTEGER NOT NULL,
    season_state_id INTEGER NOT NULL,
    world_stage_id INTEGER,
    status TEXT NOT NULL,
    current_round_number INTEGER,
    FOREIGN KEY (save_id) REFERENCES save(id) ON DELETE CASCADE,
    FOREIGN KEY (season_state_id) REFERENCES season_state(id) ON DELETE CASCADE,
    UNIQUE (save_id, world_stage_id)
);

CREATE TABLE IF NOT EXISTS round_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    save_id INTEGER NOT NULL,
    stage_state_id INTEGER NOT NULL,
    world_round_id INTEGER,
    round_number INTEGER NOT NULL,
    status TEXT NOT NULL,
    scheduled_date TEXT,
    played_date TEXT,
    FOREIGN KEY (save_id) REFERENCES save(id) ON DELETE CASCADE,
    FOREIGN KEY (stage_state_id) REFERENCES stage_state(id) ON DELETE CASCADE,
    UNIQUE (save_id, world_round_id)
);

-- =========================
-- MATCHES
-- =========================

CREATE TABLE IF NOT EXISTS fixture_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    save_id INTEGER NOT NULL,
    round_state_id INTEGER NOT NULL,
    world_fixture_id INTEGER,
    home_team_id INTEGER NOT NULL,
    away_team_id INTEGER NOT NULL,
    scheduled_at TEXT,
    status TEXT NOT NULL DEFAULT 'SCHEDULED',
    home_score INTEGER,
    away_score INTEGER,
    home_extra_time_score INTEGER,
    away_extra_time_score INTEGER,
    home_penalty_score INTEGER,
    away_penalty_score INTEGER,
    winner_team_id INTEGER,
    stadium_id INTEGER,
    postponed_from TEXT,
    played_at TEXT,
    FOREIGN KEY (save_id) REFERENCES save(id) ON DELETE CASCADE,
    FOREIGN KEY (round_state_id) REFERENCES round_state(id) ON DELETE CASCADE,
    UNIQUE (save_id, world_fixture_id),
    CHECK (home_team_id <> away_team_id),
    CHECK (home_score IS NULL OR home_score >= 0),
    CHECK (away_score IS NULL OR away_score >= 0)
);

CREATE TABLE IF NOT EXISTS fixture_event (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fixture_state_id INTEGER NOT NULL,
    minute INTEGER NOT NULL,
    extra_minute INTEGER,
    event_type TEXT NOT NULL,
    team_id INTEGER,
    player_id INTEGER,
    secondary_player_id INTEGER,
    value INTEGER,
    text TEXT,
    FOREIGN KEY (fixture_state_id) REFERENCES fixture_state(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS fixture_lineup (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fixture_state_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    position_id INTEGER,
    role_id INTEGER,
    starter INTEGER NOT NULL DEFAULT 0 CHECK (starter IN (0,1)),
    shirt_number INTEGER,
    FOREIGN KEY (fixture_state_id) REFERENCES fixture_state(id) ON DELETE CASCADE,
    UNIQUE (fixture_state_id, team_id, player_id)
);

CREATE TABLE IF NOT EXISTS fixture_substitution (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fixture_state_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,
    player_in_id INTEGER NOT NULL,
    player_out_id INTEGER NOT NULL,
    minute INTEGER NOT NULL,
    extra_minute INTEGER,
    FOREIGN KEY (fixture_state_id) REFERENCES fixture_state(id) ON DELETE CASCADE
);

-- =========================
-- STANDINGS
-- =========================

CREATE TABLE IF NOT EXISTS standing (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    save_id INTEGER NOT NULL,
    stage_state_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,
    position INTEGER,
    played INTEGER NOT NULL DEFAULT 0,
    wins INTEGER NOT NULL DEFAULT 0,
    draws INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,
    goals_for INTEGER NOT NULL DEFAULT 0,
    goals_against INTEGER NOT NULL DEFAULT 0,
    points INTEGER NOT NULL DEFAULT 0,
    form TEXT,
    qualified INTEGER NOT NULL DEFAULT 0 CHECK (qualified IN (0,1)),
    relegated INTEGER NOT NULL DEFAULT 0 CHECK (relegated IN (0,1)),
    FOREIGN KEY (save_id) REFERENCES save(id) ON DELETE CASCADE,
    FOREIGN KEY (stage_state_id) REFERENCES stage_state(id) ON DELETE CASCADE,
    UNIQUE (save_id, stage_state_id, team_id)
);

CREATE TABLE IF NOT EXISTS standing_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    save_id INTEGER NOT NULL,
    stage_state_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,
    snapshot_date TEXT NOT NULL,
    position INTEGER,
    played INTEGER NOT NULL,
    wins INTEGER NOT NULL,
    draws INTEGER NOT NULL,
    losses INTEGER NOT NULL,
    goals_for INTEGER NOT NULL,
    goals_against INTEGER NOT NULL,
    points INTEGER NOT NULL,
    FOREIGN KEY (save_id) REFERENCES save(id) ON DELETE CASCADE,
    FOREIGN KEY (stage_state_id) REFERENCES stage_state(id) ON DELETE CASCADE
);

-- =========================
-- TEAM / PLAYER CURRENT STATE
-- =========================

CREATE TABLE IF NOT EXISTS team_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    save_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,
    reputation INTEGER,
    morale INTEGER,
    financial_balance INTEGER,
    transfer_budget INTEGER,
    wage_budget INTEGER,
    FOREIGN KEY (save_id) REFERENCES save(id) ON DELETE CASCADE,
    UNIQUE (save_id, team_id)
);

CREATE TABLE IF NOT EXISTS team_competition_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    save_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,
    competition_id INTEGER NOT NULL,
    competition_season_id INTEGER,
    status TEXT,
    current_position INTEGER,
    FOREIGN KEY (save_id) REFERENCES save(id) ON DELETE CASCADE,
    UNIQUE (save_id, team_id, competition_id, competition_season_id)
);

CREATE TABLE IF NOT EXISTS player_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    save_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    current_club_id INTEGER,
    condition INTEGER,
    match_fitness INTEGER,
    morale INTEGER,
    sharpness INTEGER,
    current_value INTEGER,
    suspension_until TEXT,
    unavailable_until TEXT,
    FOREIGN KEY (save_id) REFERENCES save(id) ON DELETE CASCADE,
    UNIQUE (save_id, player_id)
);

CREATE TABLE IF NOT EXISTS player_attribute_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    save_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    attribute_key TEXT NOT NULL,
    value INTEGER NOT NULL,
    FOREIGN KEY (save_id) REFERENCES save(id) ON DELETE CASCADE,
    UNIQUE (save_id, player_id, attribute_key)
);

CREATE TABLE IF NOT EXISTS player_position_state (
    save_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    position_id INTEGER NOT NULL,
    rating INTEGER NOT NULL,
    PRIMARY KEY (save_id, player_id, position_id),
    FOREIGN KEY (save_id) REFERENCES save(id) ON DELETE CASCADE
);

-- =========================
-- CONTRACTS / EMPLOYMENT
-- =========================

CREATE TABLE IF NOT EXISTS contract_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    save_id INTEGER NOT NULL,
    world_contract_id INTEGER,
    person_id INTEGER NOT NULL,
    club_id INTEGER,
    employment_id INTEGER,
    contract_type_id INTEGER,
    start_date TEXT,
    end_date TEXT,
    salary INTEGER,
    squad_number INTEGER,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    FOREIGN KEY (save_id) REFERENCES save(id) ON DELETE CASCADE,
    UNIQUE (save_id, world_contract_id)
);

CREATE TABLE IF NOT EXISTS contract_clause_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_state_id INTEGER NOT NULL,
    clause_type_id INTEGER,
    value INTEGER,
    percentage REAL,
    target_club_id INTEGER,
    condition_id INTEGER,
    target_quantity INTEGER,
    current_quantity INTEGER,
    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
    FOREIGN KEY (contract_state_id) REFERENCES contract_state(id) ON DELETE CASCADE
);

-- =========================
-- TRANSFERS
-- =========================

CREATE TABLE IF NOT EXISTS transfer_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    save_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    origin_club_id INTEGER,
    destination_club_id INTEGER,
    transfer_type TEXT,
    status TEXT NOT NULL,
    transfer_date TEXT,
    fee INTEGER,
    permanent INTEGER NOT NULL DEFAULT 1 CHECK (permanent IN (0,1)),
    completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0,1)),
    FOREIGN KEY (save_id) REFERENCES save(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS transfer_clause_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transfer_state_id INTEGER NOT NULL,
    clause_type TEXT NOT NULL,
    value INTEGER,
    percentage REAL,
    condition_type TEXT,
    target_quantity INTEGER,
    current_quantity INTEGER,
    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
    FOREIGN KEY (transfer_state_id) REFERENCES transfer_state(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS transfer_installment_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transfer_state_id INTEGER NOT NULL,
    payer_club_id INTEGER NOT NULL,
    receiver_club_id INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    due_date TEXT NOT NULL,
    paid INTEGER NOT NULL DEFAULT 0 CHECK (paid IN (0,1)),
    paid_at TEXT,
    FOREIGN KEY (transfer_state_id) REFERENCES transfer_state(id) ON DELETE CASCADE
);

-- =========================
-- LOANS
-- =========================

CREATE TABLE IF NOT EXISTS loan_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    save_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    origin_club_id INTEGER NOT NULL,
    destination_club_id INTEGER NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    loan_fee INTEGER,
    wage_contribution INTEGER,
    option_to_buy INTEGER NOT NULL DEFAULT 0 CHECK (option_to_buy IN (0,1)),
    mandatory_purchase INTEGER NOT NULL DEFAULT 0 CHECK (mandatory_purchase IN (0,1)),
    purchase_fee INTEGER,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    FOREIGN KEY (save_id) REFERENCES save(id) ON DELETE CASCADE
);

-- =========================
-- INJURIES / SUSPENSIONS
-- =========================

CREATE TABLE IF NOT EXISTS injury_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    save_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    injury_id INTEGER NOT NULL,
    start_date TEXT NOT NULL,
    expected_end_date TEXT,
    actual_end_date TEXT,
    severity INTEGER,
    prevents_training INTEGER NOT NULL DEFAULT 0 CHECK (prevents_training IN (0,1)),
    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
    FOREIGN KEY (save_id) REFERENCES save(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS suspension_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    save_id INTEGER NOT NULL,
    person_id INTEGER NOT NULL,
    suspension_id INTEGER NOT NULL,
    competition_id INTEGER,
    start_date TEXT NOT NULL,
    end_date TEXT,
    matches_remaining INTEGER,
    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
    FOREIGN KEY (save_id) REFERENCES save(id) ON DELETE CASCADE
);

-- =========================
-- NATIONALITY / INTERNATIONAL STATE
-- =========================

CREATE TABLE IF NOT EXISTS player_nationality_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    save_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    nation_id INTEGER NOT NULL,
    acquired_date TEXT,
    eligible_date TEXT,
    declared_for_nation INTEGER NOT NULL DEFAULT 0 CHECK (declared_for_nation IN (0,1)),
    FOREIGN KEY (save_id) REFERENCES save(id) ON DELETE CASCADE,
    UNIQUE (save_id, player_id, nation_id)
);

CREATE TABLE IF NOT EXISTS national_team_selection (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    save_id INTEGER NOT NULL,
    national_team_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    call_up_date TEXT NOT NULL,
    release_date TEXT,
    status TEXT NOT NULL DEFAULT 'CALLED',
    FOREIGN KEY (save_id) REFERENCES save(id) ON DELETE CASCADE
);

-- =========================
-- CLUB TACTICS / SQUAD
-- =========================

CREATE TABLE IF NOT EXISTS team_tactic_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    save_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    formation_id INTEGER,
    mentality TEXT,
    width TEXT,
    tempo TEXT,
    defensive_line TEXT,
    pressing TEXT,
    FOREIGN KEY (save_id) REFERENCES save(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS team_tactic_player_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tactic_state_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    position_id INTEGER,
    role_id INTEGER,
    duty_id INTEGER,
    instructions TEXT,
    FOREIGN KEY (tactic_state_id) REFERENCES team_tactic_state(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS team_squad_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    save_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    squad_status TEXT,
    squad_number INTEGER,
    registration_status TEXT,
    FOREIGN KEY (save_id) REFERENCES save(id) ON DELETE CASCADE,
    UNIQUE (save_id, team_id, player_id)
);

-- =========================
-- FINANCE / ECONOMY
-- =========================

CREATE TABLE IF NOT EXISTS club_finance_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    save_id INTEGER NOT NULL,
    club_id INTEGER NOT NULL,
    balance INTEGER NOT NULL DEFAULT 0,
    transfer_budget INTEGER NOT NULL DEFAULT 0,
    wage_budget INTEGER NOT NULL DEFAULT 0,
    monthly_wage_commitment INTEGER NOT NULL DEFAULT 0,
    debt INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (save_id) REFERENCES save(id) ON DELETE CASCADE,
    UNIQUE (save_id, club_id)
);

CREATE TABLE IF NOT EXISTS financial_transaction (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    save_id INTEGER NOT NULL,
    club_id INTEGER NOT NULL,
    transaction_date TEXT NOT NULL,
    transaction_type TEXT NOT NULL,
    amount INTEGER NOT NULL,
    description TEXT,
    related_player_id INTEGER,
    related_team_id INTEGER,
    FOREIGN KEY (save_id) REFERENCES save(id) ON DELETE CASCADE
);

-- =========================
-- NEWS / WORLD EVENTS
-- =========================

CREATE TABLE IF NOT EXISTS news_item (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    save_id INTEGER NOT NULL,
    published_at TEXT NOT NULL,
    news_type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    importance INTEGER NOT NULL DEFAULT 0,
    read INTEGER NOT NULL DEFAULT 0 CHECK (read IN (0,1)),
    team_id INTEGER,
    player_id INTEGER,
    competition_id INTEGER,
    FOREIGN KEY (save_id) REFERENCES save(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS inbox_item (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    save_id INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    category TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT,
    priority INTEGER NOT NULL DEFAULT 0,
    read INTEGER NOT NULL DEFAULT 0 CHECK (read IN (0,1)),
    action_required INTEGER NOT NULL DEFAULT 0 CHECK (action_required IN (0,1)),
    completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0,1)),
    FOREIGN KEY (save_id) REFERENCES save(id) ON DELETE CASCADE
);

-- =========================
-- AWARDS / RECORDS
-- =========================

CREATE TABLE IF NOT EXISTS award_result_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    save_id INTEGER NOT NULL,
    award_id INTEGER NOT NULL,
    year INTEGER NOT NULL,
    ranking INTEGER NOT NULL,
    person_id INTEGER,
    team_id INTEGER,
    nation_id INTEGER,
    value REAL,
    FOREIGN KEY (save_id) REFERENCES save(id) ON DELETE CASCADE,
    UNIQUE (save_id, award_id, year, ranking)
);

CREATE TABLE IF NOT EXISTS record_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    save_id INTEGER NOT NULL,
    record_type_id INTEGER NOT NULL,
    team_id INTEGER,
    competition_id INTEGER,
    player_id INTEGER,
    value REAL,
    date TEXT,
    fixture_state_id INTEGER,
    FOREIGN KEY (save_id) REFERENCES save(id) ON DELETE CASCADE
);

-- =========================
-- ACHIEVEMENTS / CAREER
-- =========================

CREATE TABLE IF NOT EXISTS career_achievement (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    save_id INTEGER NOT NULL,
    person_id INTEGER,
    team_id INTEGER,
    competition_id INTEGER,
    achievement_type TEXT NOT NULL,
    achieved_date TEXT NOT NULL,
    value TEXT,
    FOREIGN KEY (save_id) REFERENCES save(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS manager_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    save_id INTEGER NOT NULL,
    person_id INTEGER NOT NULL,
    club_id INTEGER,
    national_team_id INTEGER,
    start_date TEXT NOT NULL,
    end_date TEXT,
    FOREIGN KEY (save_id) REFERENCES save(id) ON DELETE CASCADE
);

-- =========================
-- SAVE VARIABLES / FLAGS
-- =========================

CREATE TABLE IF NOT EXISTS save_variable (
    save_id INTEGER NOT NULL,
    variable_key TEXT NOT NULL,
    variable_value TEXT,
    PRIMARY KEY (save_id, variable_key),
    FOREIGN KEY (save_id) REFERENCES save(id) ON DELETE CASCADE
);

-- =========================
-- INDEXES
-- =========================

CREATE INDEX IF NOT EXISTS idx_calendar_event_save_date
    ON calendar_event(save_id, event_date);

CREATE INDEX IF NOT EXISTS idx_season_state_save
    ON season_state(save_id);

CREATE INDEX IF NOT EXISTS idx_stage_state_season
    ON stage_state(season_state_id);

CREATE INDEX IF NOT EXISTS idx_round_state_stage
    ON round_state(stage_state_id);

CREATE INDEX IF NOT EXISTS idx_fixture_state_round
    ON fixture_state(round_state_id);

CREATE INDEX IF NOT EXISTS idx_fixture_state_date
    ON fixture_state(scheduled_at);

CREATE INDEX IF NOT EXISTS idx_fixture_event_fixture
    ON fixture_event(fixture_state_id);

CREATE INDEX IF NOT EXISTS idx_fixture_lineup_fixture
    ON fixture_lineup(fixture_state_id);

CREATE INDEX IF NOT EXISTS idx_standing_stage
    ON standing(stage_state_id);

CREATE INDEX IF NOT EXISTS idx_player_state_player
    ON player_state(player_id);

CREATE INDEX IF NOT EXISTS idx_contract_state_person
    ON contract_state(person_id);

CREATE INDEX IF NOT EXISTS idx_transfer_state_player
    ON transfer_state(player_id);

CREATE INDEX IF NOT EXISTS idx_injury_state_player
    ON injury_state(player_id);

CREATE INDEX IF NOT EXISTS idx_suspension_state_person
    ON suspension_state(person_id);

CREATE INDEX IF NOT EXISTS idx_news_save_date
    ON news_item(save_id, published_at);

CREATE INDEX IF NOT EXISTS idx_financial_transaction_club_date
    ON financial_transaction(club_id, transaction_date);
