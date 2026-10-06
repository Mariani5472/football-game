import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import DatabaseConnection from "better-sqlite3";

import {
  BASE_PACKAGE_KEY,
  BASE_PACKAGE_PROVIDES,
  BASE_PACKAGE_VERSION,
  BASE_PACKAGE_PRIORITY,
  CONTINENTS,
  REGIONS,
  NATIONS,
  CONFEDERATIONS,
  CONFEDERATION_MEMBERS,
  CURRENCIES,
  LANGUAGES,
  DEFAULT_CLIMATES,
  DEFAULT_INJURY_SUBCLASSIFICATIONS,
  DEFAULT_PLAYER_ROLES,
  DEFAULT_REFERENCE_LISTS,
} from "./WorldBasePackageDefinition.js";

export class WorldDefaultDataPackageBuilder {
  static createPackageDatabase(file: string): void {
    if (fs.existsSync(file)) throw new Error("Refusing to overwrite an existing versioned default-data package.");

    const db = new DatabaseConnection(file);
    try {
      const schemaPath = path.resolve(
        process.cwd(),
        "src/schemas/world/world_schema_v2.sql",
      );
      db.exec(fs.readFileSync(schemaPath, "utf8"));

      db.exec(`
        CREATE TABLE IF NOT EXISTS database_metadata (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS confederation (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          uuid TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL UNIQUE,
          short_name TEXT NOT NULL UNIQUE,
          description TEXT
        );

        CREATE TABLE IF NOT EXISTS confederation_member_nation (
          confederation_id INTEGER NOT NULL,
          nation_id INTEGER NOT NULL,
          joined_at TEXT,
          PRIMARY KEY(confederation_id, nation_id),
          FOREIGN KEY(confederation_id) REFERENCES confederation(id) ON DELETE CASCADE,
          FOREIGN KEY(nation_id) REFERENCES nation(id) ON DELETE CASCADE
        );
      `);

      this.addUuids(db, [
        "continent",
        "continent_region",
        "currency",
        "language_family",
        "language_group",
        "language_subgroup",
        "language",
        "nation",
        "nation_region",
        "city",
        "gender",
        "weekday",
        "nationality_method",
        "nation_development_state",
        "club_status",
        "person_type",
        "position_definition",
        "referee_category",
        "employment",
        "weather_season",
        "competition_type",
        "competition_stage_type",
        "pitch_type",
        "stadium_owner_type",
      ]);

      const metadata = db.prepare(
        "INSERT OR REPLACE INTO database_metadata(key,value) VALUES(?,?)",
      );
      metadata.run("schema_version", "4");
      metadata.run("database_type", "world");
      metadata.run("package_key", BASE_PACKAGE_KEY);
      metadata.run("package_name", "Base World");
      metadata.run("package_version", BASE_PACKAGE_VERSION);
      metadata.run("package_type", "BASE");
      metadata.run("package_priority", String(BASE_PACKAGE_PRIORITY));
      metadata.run("schema_version", "4");
      metadata.run("package_provides", JSON.stringify(BASE_PACKAGE_PROVIDES));
      metadata.run("package_dependencies", "[]");
      metadata.run("package_conflicts", "[]");

      const continentByName = new Map<string, number>();
      const insertContinent = db.prepare(
        "INSERT INTO continent(uuid,name,short_name) VALUES(?,?,?)",
      );
      for (const [name, short] of CONTINENTS) {
        const result = insertContinent.run(crypto.randomUUID(), name, short);
        continentByName.set(name, Number(result.lastInsertRowid));
      }

      const regionByName = new Map<string, number>();
      const insertRegion = db.prepare(
        "INSERT INTO continent_region(uuid,continent_id,name,short_name) VALUES(?,?,?,?)",
      );
      for (const [name, short, continentName] of REGIONS) {
        const continentId = continentByName.get(continentName);
        if (!continentId) continue;
        const result = insertRegion.run(
          crypto.randomUUID(),
          continentId,
          name,
          short,
        );
        regionByName.set(name, Number(result.lastInsertRowid));
      }

      const currencyByName = new Map<string, number>();
      const insertCurrency = db.prepare(
        "INSERT INTO currency(uuid,name,exchange_rate) VALUES(?,?,?)",
      );
      for (const [name, code] of CURRENCIES) {
        const result = insertCurrency.run(crypto.randomUUID(), name, null);
        currencyByName.set(code, Number(result.lastInsertRowid));
      }

      const languageFamilyByName = new Map<string, number>();
      const insertFamily = db.prepare("INSERT INTO language_family(uuid,name) VALUES(?,?)");
      const families = [...new Set(LANGUAGES.map(([, family]) => family))];
      for (const family of families) {
        const result = insertFamily.run(crypto.randomUUID(), family);
        languageFamilyByName.set(family, Number(result.lastInsertRowid));
      }

      const languageGroupByKey = new Map<string, number>();
      const insertGroup = db.prepare("INSERT INTO language_group(family_id,name) VALUES(?,?)");
      for (const [, family, group] of LANGUAGES) {
        const key = `${family}:${group}`;
        if (languageGroupByKey.has(key)) continue;
        const result = insertGroup.run(languageFamilyByName.get(family) ?? null, group);
        languageGroupByKey.set(key, Number(result.lastInsertRowid));
      }

      const languageSubgroupByKey = new Map<string, number>();
      const insertSubgroup = db.prepare("INSERT INTO language_subgroup(group_id,name) VALUES(?,?)");
      for (const [, family, group, subgroup] of LANGUAGES) {
        const groupKey = `${family}:${group}`;
        const key = `${groupKey}:${subgroup}`;
        if (languageSubgroupByKey.has(key)) continue;
        const result = insertSubgroup.run(languageGroupByKey.get(groupKey) ?? null, subgroup);
        languageSubgroupByKey.set(key, Number(result.lastInsertRowid));
      }

      const languageByName = new Map<string, number>();
      const insertLanguage = db.prepare("INSERT INTO language(uuid,name,family_id,group_id,subgroup_id) VALUES(?,?,?,?,?)");
      for (const [name, family, group, subgroup] of LANGUAGES) {
        const groupKey = `${family}:${group}`;
        const subgroupKey = `${groupKey}:${subgroup}`;
        const result = insertLanguage.run(
          crypto.randomUUID(), name,
          languageFamilyByName.get(family) ?? null,
          languageGroupByKey.get(groupKey) ?? null,
          languageSubgroupByKey.get(subgroupKey) ?? null,
        );
        languageByName.set(name, Number(result.lastInsertRowid));
      }

      const insertClimate = db.prepare(
        "INSERT INTO climate(name) VALUES(?)",
      );
      for (const name of DEFAULT_CLIMATES) {
        insertClimate.run(name);
      }

      const insertGender = db.prepare(
        "INSERT INTO gender(uuid,name) VALUES(?,?)",
      );
      for (const name of DEFAULT_REFERENCE_LISTS.genders) {
        insertGender.run(crypto.randomUUID(), name);
      }

      const insertWeekday = db.prepare(
        "INSERT INTO weekday(uuid,name,index_value,is_weekend) VALUES(?,?,?,?)",
      );
      for (const [name, index, isWeekend] of DEFAULT_REFERENCE_LISTS.weekdays) {
        insertWeekday.run(crypto.randomUUID(), name, index, isWeekend);
      }

      const insertNationalityMethod = db.prepare(
        "INSERT INTO nationality_method(uuid,name) VALUES(?,?)",
      );
      for (const name of DEFAULT_REFERENCE_LISTS.nationalityMethods) {
        insertNationalityMethod.run(crypto.randomUUID(), name);
      }

      const insertDevelopmentState = db.prepare(
        "INSERT INTO nation_development_state(uuid,name,index_value) VALUES(?,?,?)",
      );
      for (const [index, name] of DEFAULT_REFERENCE_LISTS.developmentStates.entries()) {
        insertDevelopmentState.run(crypto.randomUUID(), name, index + 1);
      }

      const insertClubStatus = db.prepare(
        "INSERT INTO club_status(uuid,name,is_reserve_team) VALUES(?,?,?)",
      );
      for (const name of DEFAULT_REFERENCE_LISTS.clubStatuses) {
        insertClubStatus.run(crypto.randomUUID(), name, name === "Reserve" ? 1 : 0);
      }

      const insertCompetitionType = db.prepare(
        "INSERT INTO competition_type(uuid,name) VALUES(?,?)",
      );
      for (const name of DEFAULT_REFERENCE_LISTS.competitionTypes) {
        insertCompetitionType.run(crypto.randomUUID(), name);
      }

      const insertStageType = db.prepare(
        "INSERT INTO competition_stage_type(uuid,name) VALUES(?,?)",
      );
      for (const name of DEFAULT_REFERENCE_LISTS.competitionStageTypes) {
        insertStageType.run(crypto.randomUUID(), name);
      }

      const insertPitchType = db.prepare(
        "INSERT INTO pitch_type(uuid,name) VALUES(?,?)",
      );
      for (const name of DEFAULT_REFERENCE_LISTS.pitchTypes) {
        insertPitchType.run(crypto.randomUUID(), name);
      }

      const insertReferenceList = (table: string, values: readonly string[]) => {
        const insert = db.prepare(`INSERT INTO "${table}"(name) VALUES(?)`);
        for (const value of values) insert.run(value);
      };

      insertReferenceList("person_type", DEFAULT_REFERENCE_LISTS.personTypes);
      insertReferenceList("position_definition", DEFAULT_REFERENCE_LISTS.positions);
      insertReferenceList("referee_category", DEFAULT_REFERENCE_LISTS.refereeCategories);
      insertReferenceList("employment", DEFAULT_REFERENCE_LISTS.employments);
      insertReferenceList("weather_season", DEFAULT_REFERENCE_LISTS.weatherSeasons);
      insertReferenceList("second_nationality_info", DEFAULT_REFERENCE_LISTS.secondNationalityInfo);
      insertReferenceList("money_direction", DEFAULT_REFERENCE_LISTS.moneyDirections);
      insertReferenceList("clause_condition", DEFAULT_REFERENCE_LISTS.clauseConditions);
      insertReferenceList("suspension_type", DEFAULT_REFERENCE_LISTS.suspensionTypes);
      insertReferenceList("suspension", DEFAULT_REFERENCE_LISTS.suspensions);
      insertReferenceList("game_location_type", DEFAULT_REFERENCE_LISTS.gameLocationTypes);
      insertReferenceList("ownership_promise", DEFAULT_REFERENCE_LISTS.ownershipPromises);
      insertReferenceList("president_title", DEFAULT_REFERENCE_LISTS.presidentTitles);
      insertReferenceList("patron_type", DEFAULT_REFERENCE_LISTS.patronTypes);
      insertReferenceList("embargo_type", DEFAULT_REFERENCE_LISTS.embargoTypes);
      insertReferenceList("revenue_type", DEFAULT_REFERENCE_LISTS.revenueTypes);
      insertReferenceList("debt_source", DEFAULT_REFERENCE_LISTS.debtSources);
      insertReferenceList("equipment_type", DEFAULT_REFERENCE_LISTS.equipmentTypes);
      insertReferenceList("equipment_piece", DEFAULT_REFERENCE_LISTS.equipmentPieces);
      insertReferenceList("equipment_style", DEFAULT_REFERENCE_LISTS.equipmentStyles);
      insertReferenceList("objective_type", DEFAULT_REFERENCE_LISTS.objectiveTypes);
      insertReferenceList("retired_number_reason", DEFAULT_REFERENCE_LISTS.retiredNumberReasons);
      insertReferenceList("club_affiliation_type", DEFAULT_REFERENCE_LISTS.affiliationTypes);
      insertReferenceList("transfer_status", DEFAULT_REFERENCE_LISTS.transferStatuses);
      insertReferenceList("transfer_type", DEFAULT_REFERENCE_LISTS.transferTypes);
      insertReferenceList("contract_type", DEFAULT_REFERENCE_LISTS.contractTypes);
      insertReferenceList("contract_clause_type", DEFAULT_REFERENCE_LISTS.contractClauseTypes);
      insertReferenceList("role_duty", DEFAULT_REFERENCE_LISTS.roleDuties);
      insertReferenceList("player_achievement_type", DEFAULT_REFERENCE_LISTS.playerAchievementTypes);
      insertReferenceList("press_period", DEFAULT_REFERENCE_LISTS.pressPeriods);
      insertReferenceList("news_reach", DEFAULT_REFERENCE_LISTS.newsReaches);
      insertReferenceList("press_type", DEFAULT_REFERENCE_LISTS.pressTypes);
      insertReferenceList("award_period", DEFAULT_REFERENCE_LISTS.awardPeriods);
      insertReferenceList("award_recipient_type", DEFAULT_REFERENCE_LISTS.awardRecipientTypes);
      insertReferenceList("award_type", DEFAULT_REFERENCE_LISTS.awardTypes);
      insertReferenceList("award_voting_type", DEFAULT_REFERENCE_LISTS.awardVotingTypes);
      insertReferenceList("award_organizer", DEFAULT_REFERENCE_LISTS.awardOrganizers);
      insertReferenceList("award_statistic", DEFAULT_REFERENCE_LISTS.awardStatistics);
      insertReferenceList("record_type", DEFAULT_REFERENCE_LISTS.recordTypes);
      insertReferenceList("trophy", DEFAULT_REFERENCE_LISTS.trophyTypes);

      const insertOwnerType = db.prepare(
        "INSERT INTO stadium_owner_type(uuid,name) VALUES(?,?)",
      );
      for (const name of DEFAULT_REFERENCE_LISTS.stadiumOwnerTypes) {
        insertOwnerType.run(crypto.randomUUID(), name);
      }

      const insertIndicatorReference = (table: string, values: readonly (readonly [string, number])[]) => {
        const insert = db.prepare(`INSERT INTO "${table}"(name,indicator) VALUES(?,?)`);
        for (const [name, indicator] of values) insert.run(name, indicator);
      };
      insertIndicatorReference("grass_deterioration_rate", DEFAULT_REFERENCE_LISTS.grassDeteriorationRates);
      insertIndicatorReference("quality_state", DEFAULT_REFERENCE_LISTS.qualityStates);
      insertIndicatorReference("environment_quality", DEFAULT_REFERENCE_LISTS.environmentQualities);

      const ownershipType = db.prepare("INSERT INTO ownership_type(name,has_election) VALUES(?,?)");
      for (const [name, hasElection] of DEFAULT_REFERENCE_LISTS.ownershipTypes) ownershipType.run(name, hasElection);

      const paymentInterval = db.prepare("INSERT INTO payment_interval(name,days,months,years) VALUES(?,?,?,?)");
      for (const [name, days, months, years] of DEFAULT_REFERENCE_LISTS.paymentIntervals) {
        paymentInterval.run(name, days, months, years);
      }

      const injuryClassIds = new Map<string, number>();
      const insertInjuryClass = db.prepare("INSERT INTO injury_classification(name) VALUES(?)");
      for (const name of DEFAULT_REFERENCE_LISTS.injuryClassifications) {
        injuryClassIds.set(name, Number(insertInjuryClass.run(name).lastInsertRowid));
      }
      const insertInjurySubclass = db.prepare("INSERT INTO injury_subclassification(classification_id,name) VALUES(?,?)");
      for (const [classification, names] of DEFAULT_INJURY_SUBCLASSIFICATIONS) {
        const classificationId = injuryClassIds.get(classification);
        if (classificationId === undefined) throw new Error("Missing default injury classification: " + classification);
        for (const name of names) insertInjurySubclass.run(classificationId, name);
      }
      insertReferenceList("injury_reason", DEFAULT_REFERENCE_LISTS.injuryReasons);

      const positionIds = new Map<string, number>();
      for (const row of db.prepare("SELECT id,name FROM position_definition").all() as Array<{ id: number; name: string }>) {
        positionIds.set(row.name, row.id);
      }
      const insertPlayerRole = db.prepare("INSERT OR IGNORE INTO player_role(position_id,name) VALUES(?,?)");
      for (const [position, roles] of DEFAULT_PLAYER_ROLES) {
        const positionId = positionIds.get(position);
        if (positionId === undefined) throw new Error("Missing default player position: " + position);
        for (const role of roles) insertPlayerRole.run(positionId, role);
      }


      const nationByName = new Map<string, number>();
      const insertNation = db.prepare(
        "INSERT INTO nation(uuid,name,short_name,continent_region_id) VALUES(?,?,?,?)",
      );
      for (const [name, short, regionName] of NATIONS) {
        const result = insertNation.run(
          crypto.randomUUID(),
          name,
          short,
          regionByName.get(regionName) ?? null,
        );
        nationByName.set(name, Number(result.lastInsertRowid));
      }

      const insertConfederation = db.prepare(
        "INSERT INTO confederation(uuid,name,short_name,description) VALUES(?,?,?,?)",
      );
      const confederationByName = new Map<string, number>();
      for (const [short, name] of CONFEDERATIONS) {
        const result = insertConfederation.run(
          crypto.randomUUID(),
          name,
          short,
          name,
        );
        confederationByName.set(short, Number(result.lastInsertRowid));
      }

      const insertMember = db.prepare(
        "INSERT INTO confederation_member_nation(confederation_id,nation_id) VALUES(?,?)",
      );
      for (const [confederation, members] of Object.entries(CONFEDERATION_MEMBERS)) {
        const confederationId = confederationByName.get(confederation);
        if (!confederationId) continue;
        for (const nation of members) {
          const nationId = nationByName.get(nation);
          if (nationId) insertMember.run(confederationId, nationId);
        }
      }

      const addRegion = db.prepare(
        "INSERT OR IGNORE INTO nation_region(uuid,nation_id,name,short_name) VALUES(?,?,?,?)",
      );
      for (const [name] of NATIONS) {
        const nationId = nationByName.get(name);
        if (nationId) addRegion.run(crypto.randomUUID(), nationId, name, name);
      }

      this.assertReferenceDataset(db);
      db.pragma("foreign_keys = ON");
    } finally {
      db.close();
    }
  }

  private static addUuids(
    db: DatabaseConnection.Database,
    tables: string[],
  ): void {
    for (const table of tables) {
      db.exec(`ALTER TABLE "${table}" ADD COLUMN uuid TEXT`);
      const rows = db
        .prepare(`SELECT rowid FROM "${table}"`)
        .all() as Array<{ rowid: number }>;
      const update = db.prepare(
        `UPDATE "${table}" SET uuid=? WHERE rowid=?`,
      );
      for (const row of rows) update.run(crypto.randomUUID(), row.rowid);
      db.exec(
        `CREATE UNIQUE INDEX "ux_${table}_uuid" ON "${table}"(uuid)`,
      );
    }
  }
}


