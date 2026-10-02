import type { SqlRow } from "../database/Database.js";
import { WorldDatabase } from "../database/world/WorldDatabase.js";

export type ValidationSeverity = "ERROR" | "WARNING" | "INFO";

export interface ValidationIssue {
  id: string;
  ruleKey: string;
  severity: ValidationSeverity;
  entityType: string;
  entityId?: string | number;
  message: string;
  details?: string;
}

export interface ValidationProfile {
  id: number;
  name: string;
  description: string | null;
  enabled: boolean;
}

const RULES: Array<[string, string, string, ValidationSeverity, string]> = [
  ["foreign-key", "Foreign keys", "*", "ERROR", "Detecta referências que não possuem entidade de destino."],
  ["not-null", "Campos obrigatórios", "*", "ERROR", "Detecta valores nulos em colunas obrigatórias."],
  ["unique", "Valores únicos", "*", "ERROR", "Detecta violações de unicidade."],
  ["orphan", "Relações órfãs", "*", "ERROR", "Detecta subtipos ou relações sem entidade pai."],
  ["season-stage", "Season sem Stage", "competition_season", "ERROR", "Toda temporada deve possuir pelo menos um stage."],
  ["stage-configuration", "Stage sem configuração", "competition_stage", "ERROR", "Stages competitivos precisam de participantes e formato."],
  ["competition-teams", "Times insuficientes", "competition_season", "ERROR", "A temporada deve possuir participantes suficientes para sua configuração."],
  ["player-person", "Player sem Person", "player", "ERROR", "Todo player deve possuir uma Person."],
  ["club-team", "Club sem Team", "club", "ERROR", "Todo club deve possuir um Team."],
  ["stadium-city", "Stadium sem City", "stadium", "ERROR", "Todo estádio deve possuir uma City."],
  ["rule-compatibility", "Regras incompatíveis", "competition_stage", "ERROR", "Detecta combinações impossíveis de formato e participantes."],
  ["transfer-window-dates", "Janela inválida", "transfer_window", "WARNING", "A data inicial não pode ser posterior à data final."],
  ["contract-dates", "Contrato inválido", "person_contract", "WARNING", "O fim do contrato não pode preceder o início."],
  ["financial-balance", "Finanças suspeitas", "club_finance", "WARNING", "Sinaliza orçamento salarial ou de transferências negativo."],
];

export class WorldValidator {
  constructor(private readonly database: WorldDatabase) {
    this.ensureValidationInfrastructure();
  }

  validate(profileId?: number): ValidationIssue[] {
    const enabled = this.enabledRuleKeys(profileId);
    const issues: ValidationIssue[] = [];

    if (enabled.has("foreign-key")) this.foreignKeys(issues);
    if (enabled.has("not-null")) this.notNull(issues);
    if (enabled.has("unique")) this.unique(issues);
    if (enabled.has("orphan")) this.orphans(issues);
    if (enabled.has("season-stage")) this.seasonStages(issues);
    if (enabled.has("stage-configuration")) this.stageConfiguration(issues);
    if (enabled.has("competition-teams")) this.competitionTeams(issues);
    if (enabled.has("player-person")) this.playerPerson(issues);
    if (enabled.has("club-team")) this.clubTeam(issues);
    if (enabled.has("stadium-city")) this.stadiumCity(issues);
    if (enabled.has("rule-compatibility")) this.ruleCompatibility(issues);
    if (enabled.has("transfer-window-dates")) this.transferWindows(issues);
    if (enabled.has("contract-dates")) this.contractDates(issues);
    if (enabled.has("financial-balance")) this.financialBalance(issues);

    return issues;
  }

  profiles(): ValidationProfile[] {
    return (this.database.connection
      .prepare("SELECT id, name, description, enabled FROM editor_validation_profile ORDER BY id")
      .all() as Array<{ id: number; name: string; description: string | null; enabled: number }>)
      .map(row => ({ ...row, enabled: row.enabled === 1 }));
  }

  setProfileEnabled(id: number, enabled: boolean): ValidationProfile {
    this.database.connection
      .prepare("UPDATE editor_validation_profile SET enabled = ? WHERE id = ?")
      .run(enabled ? 1 : 0, id);
    return this.profiles().find(profile => profile.id === id) ?? (() => {
      throw new Error("Perfil de validação não encontrado.");
    })();
  }

  setRuleEnabled(ruleKey: string, enabled: boolean): void {
    this.database.connection
      .prepare("UPDATE validation_rule_definition SET enabled = ? WHERE rule_key = ?")
      .run(enabled ? 1 : 0, ruleKey);
  }

  private enabledRuleKeys(profileId?: number): Set<string> {
    if (profileId) {
      const rows = this.database.connection.prepare(
        `SELECT definition.rule_key
         FROM editor_validation_profile_rule profile_rule
         JOIN validation_rule_definition definition
           ON definition.id = profile_rule.validation_rule_id
         JOIN editor_validation_profile profile
           ON profile.id = profile_rule.profile_id
         WHERE profile.id = ? AND profile.enabled = 1 AND profile_rule.enabled = 1 AND definition.enabled = 1`,
      ).all(profileId) as Array<{ rule_key: string }>;
      return new Set(rows.map(row => row.rule_key));
    }

    const rows = this.database.connection
      .prepare("SELECT rule_key FROM validation_rule_definition WHERE enabled = 1")
      .all() as Array<{ rule_key: string }>;
    return new Set(rows.map(row => row.rule_key));
  }

  private foreignKeys(issues: ValidationIssue[]) {
    const rows = this.database.connection.prepare("PRAGMA foreign_key_check").all() as Array<{
      table: string; rowid: number; parent: string; fkid: number;
    }>;
    for (const row of rows) {
      issues.push(this.issue(
        "foreign-key",
        "ERROR",
        row.table,
        row.rowid,
        `Referência inválida: ${row.table} aponta para ${row.parent}, mas o registro não existe.`,
      ));
    }
  }

  private notNull(issues: ValidationIssue[]) {
    for (const table of this.database.listTables()) {
      if (table.startsWith("editor_") || table === "database_metadata") continue;
      const schema = this.database.tableSchema(table);
      const required = schema.columns.filter(column =>
        column.notNull && !column.primaryKey && column.defaultValue == null,
      );
      if (!required.length) continue;
      const rows = this.database.connection.prepare(
        `SELECT rowid AS __rowid, * FROM "${table}" WHERE ${required.map(column => `"${column.name}" IS NULL`).join(" OR ")}`,
      ).all() as SqlRow[];
      for (const row of rows) {
        const column = required.find(item => row[item.name] === null);
        issues.push(this.issue(
          "not-null",
          "ERROR",
          table,
          Number(row.__rowid),
          `O campo obrigatório "${column?.name}" está vazio.`,
        ));
      }
    }
  }

  private unique(issues: ValidationIssue[]) {
    for (const table of this.database.listTables()) {
      if (table.startsWith("editor_") || table === "database_metadata") continue;
      const schema = this.database.tableSchema(table);
      for (const columns of schema.uniqueColumns) {
        if (!columns.length) continue;
        const groups = this.database.connection.prepare(
          `SELECT ${columns.map(column => `"${column}"`).join(", ")}, COUNT(*) AS __count
           FROM "${table}"
           GROUP BY ${columns.map(column => `"${column}"`).join(", ")}
           HAVING COUNT(*) > 1`,
        ).all() as SqlRow[];
        for (const group of groups) {
          issues.push(this.issue(
            "unique",
            "ERROR",
            table,
            undefined,
            `Valor duplicado para UNIQUE (${columns.join(", ")}).`,
            JSON.stringify(group),
          ));
        }
      }
    }
  }

  private orphans(issues: ValidationIssue[]) {
    const checks: Array<[string, string, string, string, string]> = [
      ["player", "person_id", "person", "id", "Player sem Person."],
      ["club", "team_id", "team", "id", "Club sem Team."],
      ["stadium", "city_id", "city", "id", "Stadium sem City."],
    ];

    for (const [table, fk, parent, pk, message] of checks) {
      const rows = this.database.connection.prepare(
        `SELECT "${table}"."${fk}" AS entity_id FROM "${table}"
         LEFT JOIN "${parent}" ON "${parent}"."${pk}" = "${table}"."${fk}"
         WHERE "${table}"."${fk}" IS NOT NULL AND "${parent}"."${pk}" IS NULL`,
      ).all() as Array<{ entity_id: number }>;
      for (const row of rows) issues.push(this.issue("orphan", "ERROR", table, row.entity_id, message));
    }
  }

  private seasonStages(issues: ValidationIssue[]) {
    const rows = this.database.connection.prepare(
      `SELECT season.id, season.year, season.competition_id
       FROM competition_season season
       LEFT JOIN competition_stage stage ON stage.competition_season_id = season.id
       GROUP BY season.id HAVING COUNT(stage.id) = 0`,
    ).all() as Array<{ id: number; year: number; competition_id: number }>;
    for (const row of rows) issues.push(this.issue(
      "season-stage", "ERROR", "competition_season", row.id,
      `A temporada ${row.year} não possui nenhum stage.`,
    ));
  }

  private stageConfiguration(issues: ValidationIssue[]) {
    const rows = this.database.connection.prepare(
      `SELECT stage.id, stage.name
       FROM competition_stage stage
       LEFT JOIN stage_participant_rule participant ON participant.stage_id = stage.id
       LEFT JOIN stage_participant_source source ON source.stage_id = stage.id
       LEFT JOIN stage_format format ON format.stage_id = stage.id
       GROUP BY stage.id
       HAVING (COUNT(DISTINCT participant.id) = 0 AND COUNT(DISTINCT source.id) = 0)
          OR COUNT(DISTINCT format.stage_id) = 0`,
    ).all() as Array<{ id: number; name: string }>;
    for (const row of rows) issues.push(this.issue(
      "stage-configuration", "ERROR", "competition_stage", row.id,
      `O stage "${row.name}" não possui configuração completa de participantes/formato.`,
    ));
  }

  private competitionTeams(issues: ValidationIssue[]) {
    const rows = this.database.connection.prepare(
      `SELECT season.id, season.year,
              COALESCE(format.participant_count, participant.max_participants, 0) AS required_count,
              COUNT(team.id) AS actual_count
       FROM competition_season season
       JOIN competition_stage stage ON stage.competition_season_id = season.id AND stage.stage_order = 1
       LEFT JOIN stage_format format ON format.stage_id = stage.id
       LEFT JOIN stage_participant_rule participant ON participant.stage_id = stage.id
       LEFT JOIN competition_team team ON team.competition_season_id = season.id
       GROUP BY season.id
       HAVING required_count > 0 AND actual_count < required_count`,
    ).all() as Array<{ id: number; year: number; required_count: number; actual_count: number }>;
    for (const row of rows) issues.push(this.issue(
      "competition-teams", "ERROR", "competition_season", row.id,
      `A temporada ${row.year} possui ${row.actual_count} times, mas requer pelo menos ${row.required_count}.`,
    ));
  }

  private playerPerson(issues: ValidationIssue[]) {
    const rows = this.database.connection.prepare(
      `SELECT player.person_id FROM player
       LEFT JOIN person ON person.id = player.person_id
       WHERE person.id IS NULL`,
    ).all() as Array<{ person_id: number }>;
    for (const row of rows) issues.push(this.issue("player-person", "ERROR", "player", row.person_id, "Player sem Person."));
  }

  private clubTeam(issues: ValidationIssue[]) {
    const rows = this.database.connection.prepare(
      `SELECT club.team_id FROM club
       LEFT JOIN team ON team.id = club.team_id
       WHERE team.id IS NULL`,
    ).all() as Array<{ team_id: number }>;
    for (const row of rows) issues.push(this.issue("club-team", "ERROR", "club", row.team_id, "Club sem Team."));
  }

  private stadiumCity(issues: ValidationIssue[]) {
    const rows = this.database.connection.prepare(
      `SELECT stadium.id FROM stadium
       LEFT JOIN city ON city.id = stadium.city_id
       WHERE city.id IS NULL`,
    ).all() as Array<{ id: number }>;
    for (const row of rows) issues.push(this.issue("stadium-city", "ERROR", "stadium", row.id, "Stadium sem City."));
  }

  private ruleCompatibility(issues: ValidationIssue[]) {
    const rows = this.database.connection.prepare(
      `SELECT stage.id, stage.name, format.participant_count, format.group_count, format.participants_per_group
       FROM competition_stage stage
       JOIN stage_format format ON format.stage_id = stage.id
       WHERE format.group_count IS NOT NULL
         AND format.participants_per_group IS NOT NULL
         AND format.participant_count IS NOT NULL
         AND format.group_count * format.participants_per_group <> format.participant_count`,
    ).all() as Array<{ id: number; name: string }>;
    for (const row of rows) issues.push(this.issue(
      "rule-compatibility", "ERROR", "competition_stage", row.id,
      `O formato "${row.name}" possui número de grupos/times incompatível com o total de participantes.`,
    ));
  }

  private transferWindows(issues: ValidationIssue[]) {
    const rows = this.database.connection.prepare(
      "SELECT id, name FROM transfer_window WHERE start_date > end_date",
    ).all() as Array<{ id: number; name: string }>;
    for (const row of rows) issues.push(this.issue(
      "transfer-window-dates", "WARNING", "transfer_window", row.id,
      `A janela "${row.name}" termina antes de começar.`,
    ));
  }

  private contractDates(issues: ValidationIssue[]) {
    const rows = this.database.connection.prepare(
      "SELECT id FROM person_contract WHERE start_date IS NOT NULL AND end_date IS NOT NULL AND start_date > end_date",
    ).all() as Array<{ id: number }>;
    for (const row of rows) issues.push(this.issue(
      "contract-dates", "WARNING", "person_contract", row.id,
      "O contrato termina antes de começar.",
    ));
  }

  private financialBalance(issues: ValidationIssue[]) {
    const rows = this.database.connection.prepare(
      "SELECT club_id, transfer_budget, wage_budget FROM club_finance WHERE transfer_budget < 0 OR wage_budget < 0",
    ).all() as Array<{ club_id: number }>;
    for (const row of rows) issues.push(this.issue(
      "financial-balance", "WARNING", "club_finance", row.club_id,
      "O orçamento de transferências ou salários está negativo.",
    ));
  }

  private issue(
    ruleKey: string,
    severity: ValidationSeverity,
    entityType: string,
    entityId: string | number | undefined,
    message: string,
    details?: string,
  ): ValidationIssue {
    return {
      id: `${ruleKey}:${entityType}:${entityId ?? "global"}:${message}`,
      ruleKey,
      severity,
      entityType,
      entityId,
      message,
      details,
    };
  }

  private ensureValidationInfrastructure() {
    this.database.connection.exec(`
      CREATE TABLE IF NOT EXISTS validation_rule_definition (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rule_key TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        description TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1
      );
      CREATE TABLE IF NOT EXISTS editor_validation_profile (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        enabled INTEGER NOT NULL DEFAULT 1
      );
      CREATE TABLE IF NOT EXISTS editor_validation_profile_rule (
        profile_id INTEGER NOT NULL,
        validation_rule_id INTEGER NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        PRIMARY KEY (profile_id, validation_rule_id)
      );
    `);

    const insertRule = this.database.connection.prepare(
      `INSERT OR IGNORE INTO validation_rule_definition
       (rule_key, name, entity_type, severity, description)
       VALUES (?, ?, ?, ?, ?)`,
    );
    for (const [key, name, entity, severity, description] of RULES) {
      insertRule.run(key, name, entity, severity, description);
    }

    const profile = this.database.connection
      .prepare("SELECT id FROM editor_validation_profile WHERE name = 'World Core'")
      .get() as { id: number } | undefined;

    const profileId = profile?.id ?? Number(
      this.database.connection.prepare(
        "INSERT INTO editor_validation_profile (name, description) VALUES ('World Core', 'Validação estrutural e regras essenciais do mundo.')",
      ).run().lastInsertRowid,
    );

    const ruleIds = this.database.connection
      .prepare("SELECT id FROM validation_rule_definition")
      .all() as Array<{ id: number }>;
    const insertProfileRule = this.database.connection.prepare(
      "INSERT OR IGNORE INTO editor_validation_profile_rule (profile_id, validation_rule_id) VALUES (?, ?)",
    );
    for (const rule of ruleIds) insertProfileRule.run(profileId, rule.id);
  }
}
