import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import DatabaseConnection from "better-sqlite3";

import { initializeWorldCompositionSchema } from "./WorldCompositionSchema.js";
import type { WorldDatabase } from "./WorldDatabase.js";
import { WorldPackageImportService } from "../../editor/WorldPackageImportService.js";

const BASE_PACKAGE_KEY = "world.base";
const BASE_PACKAGE_VERSION = "1.0.0";

const CONTINENTS = [
  ["Africa", "AF"],
  ["Asia", "AS"],
  ["Europe", "EU"],
  ["North America", "NA"],
  ["South America", "SA"],
  ["Oceania", "OC"],
] as const;

const REGIONS = [
  ["South America", "SA", "South America"],
  ["North America", "NA", "North America"],
  ["Central America", "CA", "North America"],
  ["Caribbean", "CAR", "North America"],
  ["Western Europe", "WE", "Europe"],
  ["Eastern Europe", "EE", "Europe"],
  ["Northern Europe", "NE", "Europe"],
  ["Southern Europe", "SE", "Europe"],
  ["Middle East", "ME", "Asia"],
  ["Central Asia", "CA", "Asia"],
  ["East Asia", "EA", "Asia"],
  ["South Asia", "SA", "Asia"],
  ["Southeast Asia", "SEA", "Asia"],
  ["North Asia", "NA", "Asia"],
  ["Northern Africa", "NAF", "Africa"],
  ["Western Africa", "WAF", "Africa"],
  ["Central Africa", "CAF", "Africa"],
  ["Eastern Africa", "EAF", "Africa"],
  ["Southern Africa", "SAF", "Africa"],
  ["Melanesia", "MEL", "Oceania"],
  ["Micronesia", "MIC", "Oceania"],
  ["Polynesia", "POL", "Oceania"],
] as const;

const NATIONS: Array<[string, string, string]> = [
  ["Argentina", "ARG", "South America"],
  ["Bolivia", "BOL", "South America"],
  ["Brazil", "BRA", "South America"],
  ["Chile", "CHI", "South America"],
  ["Colombia", "COL", "South America"],
  ["Ecuador", "ECU", "South America"],
  ["Guyana", "GUY", "South America"],
  ["Paraguay", "PAR", "South America"],
  ["Peru", "PER", "South America"],
  ["Suriname", "SUR", "South America"],
  ["Uruguay", "URU", "South America"],
  ["Venezuela", "VEN", "South America"],
  ["Canada", "CAN", "North America"],
  ["United States", "USA", "North America"],
  ["Mexico", "MEX", "North America"],
  ["Costa Rica", "CRC", "Central America"],
  ["El Salvador", "SLV", "Central America"],
  ["Guatemala", "GUA", "Central America"],
  ["Honduras", "HON", "Central America"],
  ["Nicaragua", "NCA", "Central America"],
  ["Panama", "PAN", "Central America"],
  ["Belize", "BLZ", "Central America"],
  ["Cuba", "CUB", "Caribbean"],
  ["Haiti", "HAI", "Caribbean"],
  ["Dominican Republic", "DOM", "Caribbean"],
  ["Jamaica", "JAM", "Caribbean"],
  ["Trinidad and Tobago", "TRI", "Caribbean"],
  ["England", "ENG", "Northern Europe"],
  ["Scotland", "SCO", "Northern Europe"],
  ["Wales", "WAL", "Northern Europe"],
  ["Northern Ireland", "NIR", "Northern Europe"],
  ["France", "FRA", "Western Europe"],
  ["Germany", "GER", "Western Europe"],
  ["Netherlands", "NED", "Western Europe"],
  ["Belgium", "BEL", "Western Europe"],
  ["Spain", "ESP", "Southern Europe"],
  ["Portugal", "POR", "Southern Europe"],
  ["Italy", "ITA", "Southern Europe"],
  ["Greece", "GRE", "Southern Europe"],
  ["Switzerland", "SUI", "Western Europe"],
  ["Austria", "AUT", "Western Europe"],
  ["Poland", "POL", "Eastern Europe"],
  ["Czech Republic", "CZE", "Eastern Europe"],
  ["Slovakia", "SVK", "Eastern Europe"],
  ["Hungary", "HUN", "Eastern Europe"],
  ["Romania", "ROU", "Eastern Europe"],
  ["Bulgaria", "BUL", "Eastern Europe"],
  ["Croatia", "CRO", "Southern Europe"],
  ["Serbia", "SRB", "Southern Europe"],
  ["Ukraine", "UKR", "Eastern Europe"],
  ["Russia", "RUS", "North Asia"],
  ["Turkey", "TUR", "Middle East"],
  ["Israel", "ISR", "Middle East"],
  ["Saudi Arabia", "KSA", "Middle East"],
  ["Iran", "IRN", "Middle East"],
  ["Iraq", "IRQ", "Middle East"],
  ["Japan", "JPN", "East Asia"],
  ["South Korea", "KOR", "East Asia"],
  ["China", "CHN", "East Asia"],
  ["India", "IND", "South Asia"],
  ["Pakistan", "PAK", "South Asia"],
  ["Bangladesh", "BAN", "South Asia"],
  ["Thailand", "THA", "Southeast Asia"],
  ["Vietnam", "VIE", "Southeast Asia"],
  ["Indonesia", "IDN", "Southeast Asia"],
  ["Malaysia", "MAS", "Southeast Asia"],
  ["Singapore", "SIN", "Southeast Asia"],
  ["Philippines", "PHI", "Southeast Asia"],
  ["Australia", "AUS", "Oceania"],
  ["New Zealand", "NZL", "Oceania"],
  ["Papua New Guinea", "PNG", "Melanesia"],
  ["Fiji", "FIJ", "Melanesia"],
  ["Samoa", "SAM", "Polynesia"],
  ["Tonga", "TGA", "Polynesia"],
  ["Egypt", "EGY", "Northern Africa"],
  ["Morocco", "MAR", "Northern Africa"],
  ["Algeria", "ALG", "Northern Africa"],
  ["Tunisia", "TUN", "Northern Africa"],
  ["Nigeria", "NGA", "Western Africa"],
  ["Ghana", "GHA", "Western Africa"],
  ["Senegal", "SEN", "Western Africa"],
  ["Ivory Coast", "CIV", "Western Africa"],
  ["Cameroon", "CMR", "Central Africa"],
  ["Democratic Republic of the Congo", "COD", "Central Africa"],
  ["Kenya", "KEN", "Eastern Africa"],
  ["Tanzania", "TAN", "Eastern Africa"],
  ["Ethiopia", "ETH", "Eastern Africa"],
  ["South Africa", "RSA", "Southern Africa"],
  ["Zimbabwe", "ZIM", "Southern Africa"],
] ;

const CONFEDERATIONS = [
  ["AFC", "Asian Football Confederation"],
  ["CAF", "Confederation of African Football"],
  ["CONCACAF", "Confederation of North, Central America and Caribbean Association Football"],
  ["CONMEBOL", "South American Football Confederation"],
  ["OFC", "Oceania Football Confederation"],
  ["UEFA", "Union of European Football Associations"],
] as const;

const CONFEDERATION_MEMBERS: Record<string, string[]> = {
  CONMEBOL: ["Argentina", "Bolivia", "Brazil", "Chile", "Colombia", "Ecuador", "Guyana", "Paraguay", "Peru", "Suriname", "Uruguay", "Venezuela"],
  CONCACAF: ["Canada", "United States", "Mexico", "Costa Rica", "El Salvador", "Guatemala", "Honduras", "Nicaragua", "Panama", "Belize", "Cuba", "Haiti", "Dominican Republic", "Jamaica", "Trinidad and Tobago"],
  UEFA: ["England", "Scotland", "Wales", "Northern Ireland", "France", "Germany", "Netherlands", "Belgium", "Spain", "Portugal", "Italy", "Greece", "Switzerland", "Austria", "Poland", "Czech Republic", "Slovakia", "Hungary", "Romania", "Bulgaria", "Croatia", "Serbia", "Ukraine", "Russia", "Turkey", "Israel"],
  AFC: ["Saudi Arabia", "Iran", "Iraq", "Japan", "South Korea", "China", "India", "Pakistan", "Bangladesh", "Thailand", "Vietnam", "Indonesia", "Malaysia", "Singapore", "Philippines"],
  CAF: ["Egypt", "Morocco", "Algeria", "Tunisia", "Nigeria", "Ghana", "Senegal", "Ivory Coast", "Cameroon", "Democratic Republic of the Congo", "Kenya", "Tanzania", "Ethiopia", "South Africa", "Zimbabwe"],
  OFC: ["Australia", "New Zealand", "Papua New Guinea", "Fiji", "Samoa", "Tonga"],
};

const CURRENCIES = [
  ["Brazilian Real", "BRL"],
  ["Argentine Peso", "ARS"],
  ["Bolivian Boliviano", "BOB"],
  ["Chilean Peso", "CLP"],
  ["Colombian Peso", "COP"],
  ["Peruvian Sol", "PEN"],
  ["Uruguayan Peso", "UYU"],
  ["US Dollar", "USD"],
  ["Canadian Dollar", "CAD"],
  ["Mexican Peso", "MXN"],
  ["Euro", "EUR"],
  ["British Pound", "GBP"],
  ["Swiss Franc", "CHF"],
  ["Polish Zloty", "PLN"],
  ["Japanese Yen", "JPY"],
  ["Chinese Yuan", "CNY"],
  ["Indian Rupee", "INR"],
  ["Australian Dollar", "AUD"],
  ["New Zealand Dollar", "NZD"],
] as const;

const LANGUAGES = [
  ["English", "Germanic"],
  ["Spanish", "Romance"],
  ["Portuguese", "Romance"],
  ["French", "Romance"],
  ["Italian", "Romance"],
  ["German", "Germanic"],
  ["Dutch", "Germanic"],
  ["Polish", "Slavic"],
  ["Russian", "Slavic"],
  ["Arabic", "Semitic"],
  ["Persian", "Indo-Iranian"],
  ["Turkish", "Turkic"],
  ["Japanese", "Japonic"],
  ["Korean", "Koreanic"],
  ["Mandarin Chinese", "Sinitic"],
  ["Hindi", "Indo-Iranian"],
] as const;

const CLIMATES = [
  "Tropical",
  "Dry",
  "Temperate",
  "Continental",
  "Polar",
  "Mediterranean",
  "Subtropical",
] as const;

const REFERENCE_LISTS = {
  genders: ["Male", "Female"],
  weekdays: [
    ["Monday", 1, 0],
    ["Tuesday", 2, 0],
    ["Wednesday", 3, 0],
    ["Thursday", 4, 0],
    ["Friday", 5, 0],
    ["Saturday", 6, 1],
    ["Sunday", 7, 1],
  ],
  nationalityMethods: ["Birth", "Descent", "Naturalization", "Marriage"],
  developmentStates: ["Developed", "Emerging", "Developing"],
  clubStatuses: ["Active", "Reserve", "Inactive"],
  competitionTypes: ["League", "Cup", "Tournament"],
  competitionStageTypes: ["League", "Group", "Knockout"],
  pitchTypes: ["Natural Grass", "Artificial Turf", "Hybrid"],
  stadiumOwnerTypes: ["Club", "Municipal", "Private", "National"],
} as const;

export class WorldBasePackageService {
  static ensureInstalled(world: WorldDatabase, worldPath: string): void {
    const database = world.connection;
    try {
      initializeWorldCompositionSchema(database);

      const existing = database
        .prepare("SELECT id FROM world_package WHERE lower(package_key)=? LIMIT 1")
        .get(BASE_PACKAGE_KEY) as { id: number } | undefined;

      if (existing) return;

      const packageFile = path.resolve(
        path.dirname(worldPath),
        ".packages",
        "world.base.db",
      );

      fs.mkdirSync(path.dirname(packageFile), { recursive: true });
      this.createPackageDatabase(packageFile);

      const now = new Date().toISOString();
      const pkg = database
        .prepare(
          `INSERT INTO world_package(
            package_key,name,version,package_type,priority,status,
            source_file,source_sha256,categories_json,description,
            schema_version,imported_at,installed_at,updated_at,enabled
          ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        )
        .run(
          BASE_PACKAGE_KEY,
          "Base World",
          BASE_PACKAGE_VERSION,
          "BASE",
          0,
          "ACTIVE",
          packageFile,
          sha256File(packageFile),
          JSON.stringify(["reference", "geography", "languages", "currencies", "climate"]),
          "Immutable foundational reference data for every World.",
          4,
          now,
          now,
          now,
          1,
        );

      const packageId = Number(pkg.lastInsertRowid);
      database
        .prepare(
          "INSERT INTO world_package_load_order(package_id,load_order) VALUES(?,?)",
        )
        .run(packageId, 1);

      for (const provide of [
        "reference:base",
        "geography:continents",
        "geography:regions",
        "geography:nations",
        "geography:confederations",
        "reference:currencies",
        "reference:languages",
        "reference:climates",
      ]) {
        database
          .prepare(
            "INSERT INTO world_package_provides(package_id,provide_key) VALUES(?,?)",
          )
          .run(packageId, provide);
      }

      database
        .prepare(
          "UPDATE database_metadata SET value=? WHERE key='world_build_status'",
        )
        .run("DIRTY");
      database
        .prepare(
          "UPDATE database_metadata SET value=? WHERE key='world_dirty_reason'",
        )
        .run("PACKAGE_COMPOSITION");
    }

    const importService = new WorldPackageImportService(world);
    const preview = importService.inspect(packageFile);
    importService.import(preview.sessionId);
  }

  private static createPackageDatabase(file: string): void {
    if (fs.existsSync(file)) fs.unlinkSync(file);

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
        "climate",
        "gender",
        "weekday",
        "nationality_method",
        "nation_development_state",
        "club_status",
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
      metadata.run("package_priority", "0");
      metadata.run("schema_version", "4");
      metadata.run("package_provides", JSON.stringify([
        "reference:base",
        "geography:continents",
        "geography:regions",
        "geography:nations",
        "geography:confederations",
        "reference:currencies",
        "reference:languages",
        "reference:climates",
      ]));
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
      const insertFamily = db.prepare(
        "INSERT INTO language_family(uuid,name) VALUES(?,?)",
      );
      const families = [...new Set(LANGUAGES.map(([, family]) => family))];
      for (const family of families) {
        const result = insertFamily.run(crypto.randomUUID(), family);
        languageFamilyByName.set(family, Number(result.lastInsertRowid));
      }

      const languageByName = new Map<string, number>();
      const insertLanguage = db.prepare(
        "INSERT INTO language(uuid,name,family_id) VALUES(?,?,?)",
      );
      for (const [name, family] of LANGUAGES) {
        const result = insertLanguage.run(
          crypto.randomUUID(),
          name,
          languageFamilyByName.get(family) ?? null,
        );
        languageByName.set(name, Number(result.lastInsertRowid));
      }

      const insertClimate = db.prepare(
        "INSERT INTO climate(uuid,name) VALUES(?,?)",
      );
      for (const name of CLIMATES) {
        insertClimate.run(crypto.randomUUID(), name);
      }

      const insertGender = db.prepare(
        "INSERT INTO gender(uuid,name) VALUES(?,?)",
      );
      for (const name of REFERENCE_LISTS.genders) {
        insertGender.run(crypto.randomUUID(), name);
      }

      const insertWeekday = db.prepare(
        "INSERT INTO weekday(uuid,name,index_value,is_weekend) VALUES(?,?,?,?)",
      );
      for (const [name,index,isWeekend] of REFERENCE_LISTS.weekdays) {
        insertWeekday.run(crypto.randomUUID(), name, index, isWeekend);
      }

      const insertNationalityMethod = db.prepare(
        "INSERT INTO nationality_method(uuid,name) VALUES(?,?)",
      );
      for (const name of REFERENCE_LISTS.nationalityMethods) {
        insertNationalityMethod.run(crypto.randomUUID(), name);
      }

      const insertDevelopmentState = db.prepare(
        "INSERT INTO nation_development_state(uuid,name,index_value) VALUES(?,?,?)",
      );
      for (const [index,name] of REFERENCE_LISTS.developmentStates.entries()) {
        insertDevelopmentState.run(crypto.randomUUID(), name, index + 1);
      }

      const insertClubStatus = db.prepare(
        "INSERT INTO club_status(uuid,name,is_reserve_team) VALUES(?,?,?)",
      );
      for (const name of REFERENCE_LISTS.clubStatuses) {
        insertClubStatus.run(crypto.randomUUID(), name, name === "Reserve" ? 1 : 0);
      }

      const insertCompetitionType = db.prepare(
        "INSERT INTO competition_type(uuid,name) VALUES(?,?)",
      );
      for (const name of REFERENCE_LISTS.competitionTypes) {
        insertCompetitionType.run(crypto.randomUUID(), name);
      }

      const insertStageType = db.prepare(
        "INSERT INTO competition_stage_type(uuid,name) VALUES(?,?)",
      );
      for (const name of REFERENCE_LISTS.competitionStageTypes) {
        insertStageType.run(crypto.randomUUID(), name);
      }

      const insertPitchType = db.prepare(
        "INSERT INTO pitch_type(uuid,name) VALUES(?,?)",
      );
      for (const name of REFERENCE_LISTS.pitchTypes) {
        insertPitchType.run(crypto.randomUUID(), name);
      }

      const insertOwnerType = db.prepare(
        "INSERT INTO stadium_owner_type(uuid,name) VALUES(?,?)",
      );
      for (const name of REFERENCE_LISTS.stadiumOwnerTypes) {
        insertOwnerType.run(crypto.randomUUID(), name);
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

function sha256File(file: string): string {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(file));
  return hash.digest("hex");
}
