import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import DatabaseConnection from "better-sqlite3";
import { WorldDatabase } from "../database/world/WorldDatabase.js";
import {
  generateUuid,
  IDENTITY_POLICIES,
  type IdentityMatchMode,
} from "../database/world/WorldIdentity.js";

export type ConflictPolicy = "REPLACE" | "MERGE" | "KEEP_EXISTING" | "KEEP_INCOMING" | "MANUAL";

export interface PackageManifest {
  packageKey: string;
  name: string;
  version: string;
  packageType?: string;
  priority?: number;
  schemaVersion: number;
  categories?: string[];
  description?: string | null;
  provides?: string[];
  dependencies?: Array<{ key: string; minVersion?: string }>;
  conflicts?: string[];
}

export interface ImportPreview {
  sessionId: number;
  packageKey: string;
  status: string;
  tables: number;
  rows: number;
  newRows: number;
  existingRows: number;
  conflicts: number;
  message: string;
}

interface TableInfo {
  name: string;
  columns: Array<{ name: string }>;
  primaryKey: string[];
}

export class WorldPackageImportService {
  constructor(private readonly world: WorldDatabase) {}

  inspect(sourceFile: string): ImportPreview {
    const absolute = this.resolveSource(sourceFile);
    const sourceSha256 = sha256File(absolute);
    const incoming = new DatabaseConnection(absolute, { readonly: true });
    const alias = this.attach(incoming, absolute);
    try {
      const manifest = this.readManifest(incoming);
      this.ensureManifest(manifest, sourceSha256, absolute);
      const packageId = this.ensurePackage(manifest, absolute, sourceSha256);
      const sessionId = this.createSession(packageId, absolute, sourceSha256);
      this.setSessionStatus(sessionId, "INSPECTING");

      const tables = this.listIncomingTables(incoming);
      let rows = 0;
      let newRows = 0;
      let existingRows = 0;
      let conflicts = 0;

      for (const table of tables) {
        const count = Number(incoming.prepare(`SELECT COUNT(*) AS count FROM "${quote(table)}"`).get().count);
        rows += count;
        const policy = IDENTITY_POLICIES[table.name];
        if (!policy) {
          newRows += count;
          continue;
        }

        for (const row of incoming.prepare(`SELECT * FROM "${quote(table)}"`).iterate() as Iterable<Record<string, unknown>>) {
          const resolved = this.resolveIncomingRow(table.name, row);
          if (resolved.worldId == null) newRows++;
          else {
            existingRows++;
            if (this.rowHasChanged(table.name, resolved.worldId, row)) conflicts++;
          }
        }
      }

      const status = conflicts > 0 ? "CONFLICTS_FOUND" : "READY";
      this.setSession(sessionId, status, { tables: tables.length, rows, newRows, existingRows, conflicts });
      return {
        sessionId,
        packageKey: manifest.packageKey,
        status,
        tables: tables.length,
        rows,
        newRows,
        existingRows,
        conflicts,
        message: conflicts > 0 ? "Package inspected; review conflicts before importing." : "Package is ready to import.",
      };
    } finally {
      this.detach(alias);
      incoming.close();
    }
  }

  import(sessionId: number, resolutions: Record<string, ConflictPolicy> = {}): ImportPreview {
    const session = this.getSession(sessionId);
    if (!session) throw new Error(`Import session not found: ${sessionId}`);

    const absolute = session.source_file;
    if (!fs.existsSync(absolute)) throw new Error(`Package file not found: ${absolute}`);
    const incoming = new DatabaseConnection(absolute, { readonly: true });
    const alias = this.attach(incoming, absolute);

    try {
      this.setSessionStatus(sessionId, "RESOLVING");
      const manifest = this.readManifest(incoming);
      const packageRow = this.world.connection.prepare("SELECT id FROM world_package WHERE package_key = ?").get(manifest.packageKey) as { id: number } | undefined;
      if (!packageRow) throw new Error("Package registry entry is missing.");

      const tables = this.listIncomingTables(incoming);
      const map = new Map<string, number>();
      let rows = 0;
      let created = 0;
      let updated = 0;

      this.world.transaction(() => {
        this.setSessionStatus(sessionId, "COMMITTING");

        for (const table of this.orderTablesForImport(tables)) {
          if (this.isInternalTable(table.name)) continue;

          for (const row of incoming.prepare(`SELECT * FROM "${quote(table.name)}"`).iterate() as Iterable<Record<string, unknown>>) {
            rows++;
            const resolved = this.resolveIncomingRow(table.name, row);
            const worldId = resolved.worldId;
            const policy = resolved.policy;

            if (worldId != null && this.rowHasChanged(table.name, worldId, row)) {
              const policyKey = `${table.name}.${worldId}`;
              const conflict = resolutions[policyKey] ?? (policy?.fallback === "NONE" ? "KEEP_INCOMING" : "REPLACE");
              if (conflict === "MANUAL") throw new Error(`Unresolved conflict: ${table.name}#${worldId}`);
              if (conflict === "KEEP_EXISTING") {
                this.recordProvenance(table.name, worldId, packageRow.id, "KEEP_EXISTING", row);
                this.recordMap(sessionId, table.name, row, worldId, resolved);
                continue;
              }
              if (conflict === "MERGE") {
                this.mergeRow(table.name, worldId, row, map);
              } else {
                this.updateResolvedRow(table.name, worldId, row, map);
              }
              updated++;
              this.recordProvenance(table.name, worldId, packageRow.id, conflict, row);
              this.recordMap(sessionId, table.name, row, worldId, resolved);
              continue;
            }

            if (worldId != null) {
              this.recordProvenance(table.name, worldId, packageRow.id, "EXISTING", row);
              this.recordMap(sessionId, table.name, row, worldId, resolved);
              continue;
            }

            const createdId = this.insertResolvedRow(table.name, row, map);
            created++;
            this.recordProvenance(table.name, createdId, packageRow.id, "CREATED", row);
            this.recordMap(sessionId, table.name, row, createdId, resolved);
          }
        }

        this.world.setMetadata("world_build_status", "VALID");
        this.world.setMetadata("world_last_build_at", new Date().toISOString());
      });

      this.setSessionStatus(sessionId, "COMPLETED", { tables: tables.length, rows, created, updated });
      return {
        sessionId,
        packageKey: manifest.packageKey,
        status: "COMPLETED",
        tables: tables.length,
        rows,
        newRows: created,
        existingRows: updated,
        conflicts: 0,
        message: `Imported ${rows} rows.`,
      };
    } catch (error) {
      this.setSessionStatus(sessionId, "FAILED", undefined, error instanceof Error ? error.message : String(error));
      throw error;
    } finally {
      this.detach(alias);
      incoming.close();
    }
  }

  private resolveSource(sourceFile: string): string {
    const absolute = path.resolve(sourceFile);
    if (!fs.existsSync(absolute)) throw new Error(`Package file not found: ${absolute}`);
    return absolute;
  }

  private attach(_incoming: DatabaseConnection.Database, sourceFile: string): string {
    const alias = "incoming_package";
    this.world.connection.exec(`ATTACH DATABASE ? AS ${alias}`.replace("?", quoteString(sourceFile)));
    return alias;
  }

  private detach(alias: string): void {
    this.world.connection.exec(`DETACH DATABASE ${quote(alias)}`);
  }

  private readManifest(db: DatabaseConnection.Database): PackageManifest {
    const hasTable = Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='package_manifest'").get());
    if (hasTable) {
      const row = db.prepare("SELECT manifest_json FROM package_manifest LIMIT 1").get() as { manifest_json?: string } | undefined;
      if (row?.manifest_json) return JSON.parse(row.manifest_json) as PackageManifest;
    }
    const metadataTable = Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='database_metadata'").get());
    const metadata = metadataTable ? db.prepare("SELECT key,value FROM database_metadata").all() as Array<{ key: string; value: string }> : [];
    const values = new Map(metadata.map(item => [item.key, item.value]));
    const packageKey = values.get("package_key");
    const name = values.get("package_name");
    if (!packageKey || !name) throw new Error("Package manifest is missing. Expected package_manifest or database_metadata package_key/package_name.");
    return {
      packageKey,
      name,
      version: values.get("package_version") ?? "1.0.0",
      schemaVersion: Number(values.get("schema_version") ?? 0),
      packageType: values.get("package_type") ?? "CONTENT",
      priority: Number(values.get("package_priority") ?? 100),
    };
  }

  private ensureManifest(manifest: PackageManifest, hash: string, sourceFile: string): void {
    if (!manifest.packageKey.trim()) throw new Error("Package key is required.");
    if (!manifest.name.trim()) throw new Error("Package name is required.");
    if (manifest.schemaVersion !== Number(this.world.metadata("schema_version"))) {
      throw new Error(`Package schema v${manifest.schemaVersion} is incompatible with World schema v${this.world.metadata("schema_version") ?? "unknown"}.`);
    }
    const existing = this.world.connection.prepare("SELECT package_key, version, source_sha256 FROM world_package WHERE package_key = ?").get(manifest.packageKey) as { package_key: string; version: string; source_sha256: string | null } | undefined;
    if (existing?.source_sha256 && existing.source_sha256 !== hash && existing.version === manifest.version) {
      throw new Error(`Package ${manifest.packageKey} v${manifest.version} is already registered with a different source hash.`);
    }
    void sourceFile;
  }

  private ensurePackage(manifest: PackageManifest, sourceFile: string, hash: string): number {
    const now = new Date().toISOString();
    const existing = this.world.connection.prepare("SELECT id FROM world_package WHERE package_key = ?").get(manifest.packageKey) as { id: number } | undefined;
    let id: number;
    if (existing) {
      this.world.connection.prepare(`UPDATE world_package SET name=?, version=?, package_type=?, priority=?, source_file=?, source_sha256=?, categories_json=?, description=?, schema_version=?, updated_at=?, enabled=1 WHERE id=?`)
        .run(manifest.name, manifest.version, manifest.packageType ?? "CONTENT", manifest.priority ?? 100, sourceFile, hash, JSON.stringify(manifest.categories ?? []), manifest.description ?? null, manifest.schemaVersion, now, existing.id);
      id = existing.id;
    } else {
      const result = this.world.connection.prepare(`INSERT INTO world_package (package_key,name,version,package_type,priority,source_file,source_sha256,categories_json,description,schema_version,installed_at,updated_at,enabled) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1)`)
        .run(manifest.packageKey, manifest.name, manifest.version, manifest.packageType ?? "CONTENT", manifest.priority ?? 100, sourceFile, hash, JSON.stringify(manifest.categories ?? []), manifest.description ?? null, manifest.schemaVersion, now, now);
      id = Number(result.lastInsertRowid);
    }

    const nextOrder = Number((this.world.connection.prepare("SELECT COALESCE(MAX(load_order),0)+1 AS value FROM world_package_load_order").get() as { value: number }).value);
    this.world.connection.prepare("INSERT INTO world_package_load_order(package_id,load_order) VALUES(?,?) ON CONFLICT(package_id) DO UPDATE SET load_order=excluded.load_order").run(id, nextOrder);

    this.world.connection.prepare("DELETE FROM world_package_provides WHERE package_id=?").run(id);
    for (const item of manifest.provides ?? []) this.world.connection.prepare("INSERT INTO world_package_provides(package_id,provide_key) VALUES(?,?)").run(id, item);

    this.world.connection.prepare("DELETE FROM world_package_dependency WHERE package_id=?").run(id);
    for (const item of manifest.dependencies ?? []) this.world.connection.prepare("INSERT INTO world_package_dependency(package_id,dependency_key,min_version) VALUES(?,?,?)").run(id, item.key, item.minVersion ?? null);

    this.world.connection.prepare("DELETE FROM world_package_conflict WHERE package_id=?").run(id);
    for (const item of manifest.conflicts ?? []) this.world.connection.prepare("INSERT INTO world_package_conflict(package_id,conflict_key) VALUES(?,?)").run(id, item);

    return id;
  }

  private createSession(packageId: number, sourceFile: string, hash: string): number {
    const result = this.world.connection.prepare("INSERT INTO world_import_session(status,package_id,source_file,source_sha256,started_at) VALUES('CREATED',?,?,?,?)").run(packageId, sourceFile, hash, new Date().toISOString());
    return Number(result.lastInsertRowid);
  }

  private setSessionStatus(id: number, status: string, summary?: Record<string, unknown>, error?: string): void {
    this.world.connection.prepare("UPDATE world_import_session SET status=?, summary_json=?, error_message=?, completed_at=? WHERE id=?")
      .run(status, JSON.stringify(summary ?? {}), error ?? null, ["COMPLETED","FAILED"].includes(status) ? new Date().toISOString() : null, id);
  }

  private listIncomingTables(db: DatabaseConnection.Database): TableInfo[] {
    return (db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT IN ('database_metadata','package_manifest','world_package','world_package_load_order','world_package_provides','world_package_dependency','world_package_conflict','world_entity_identity','world_entity_provenance','world_attribute_provenance','world_import_session','world_import_id_map','world_import_conflict') ORDER BY name`).all() as Array<{ name: string }>).map(({name}) => {
      const columns = db.prepare(`PRAGMA table_info("${quote(name)}")`).all() as Array<{ name: string }>;
      const primaryKey = db.prepare(`PRAGMA table_info("${quote(name)}")`).all().filter((x: any)=>x.pk).sort((a:any,b:any)=>a.pk-b.pk).map((x:any)=>x.name);
      return { name, columns, primaryKey };
    });
  }

  private orderTablesForImport(tables: TableInfo[]): TableInfo[] {
    const core = ["federation","continent","continent_region","currency","language_family","language_group","language_subgroup","language","nation","nation_region","city","gender","team","club_status","club","national_team","stadium"];
    return [...tables].sort((a,b) => {
      const ai = core.indexOf(a.name); const bi = core.indexOf(b.name);
      return (ai < 0 ? 1000 : ai) - (bi < 0 ? 1000 : bi) || a.name.localeCompare(b.name);
    });
  }

  private isInternalTable(name: string): boolean {
    return name.startsWith("world_") || name === "editor_template";
  }

  private resolveIncomingRow(tableName: string, row: Record<string, unknown>): { worldId: number | null; naturalKey: string | null; policy?: typeof IDENTITY_POLICIES[string] } {
    const policy = IDENTITY_POLICIES[tableName];
    if (!policy) return { worldId: null, naturalKey: null };
    let naturalKey: string | null = null;
    try { naturalKey = policy.naturalKey(row, (table, id) => this.lookupRowById(table, id)); } catch { naturalKey = null; }

    if (policy.uuidColumn && row[policy.uuidColumn]) {
      const found = this.world.connection.prepare("SELECT row_id FROM world_entity_identity WHERE entity_uuid = ?").get(String(row[policy.uuidColumn])) as { row_id: number } | undefined;
      if (found) return { worldId: Number(found.row_id), naturalKey, policy };
    }

    if (naturalKey) {
      const found = this.world.connection.prepare("SELECT row_id FROM world_entity_identity WHERE table_name=? AND natural_key=?").get(tableName, naturalKey) as { row_id: number } | undefined;
      if (found) return { worldId: Number(found.row_id), naturalKey, policy };
    }

    const directUuidColumn = policy.uuidColumn && row[policy.uuidColumn] ? String(row[policy.uuidColumn]) : null;
    const rowFound = directUuidColumn ? this.world.connection.prepare(`SELECT id FROM "${quote(tableName)}" WHERE "${quote(policy.uuidColumn!)}" = ?`).get(directUuidColumn) as { id: number } | undefined : undefined;
    return { worldId: rowFound ? Number(rowFound.id) : null, naturalKey, policy };
  }

  private lookupRowById(table: string, id: number): Record<string, unknown> | undefined {
    if (!Number.isFinite(id)) return undefined;
    return this.world.connection.prepare(`SELECT * FROM "${quote(table)}" WHERE id=? LIMIT 1`).get(id) as Record<string, unknown> | undefined;
  }

  private rowHasChanged(tableName: string, worldId: number, incoming: Record<string, unknown>): boolean {
    const current = this.world.connection.prepare(`SELECT * FROM "${quote(tableName)}" WHERE id=? LIMIT 1`).get(worldId) as Record<string, unknown> | undefined;
    if (!current) return false;
    return Object.entries(incoming).some(([column, value]) => column !== "id" && !["created_at","updated_at"].includes(column) && String(current[column] ?? "") !== String(value ?? ""));
  }

  private translatedValue(value: unknown, map: Map<string, number>, tableName: string): unknown {
    if (typeof value !== "number") return value;
    const policy = IDENTITY_POLICIES[tableName];
    if (!policy) return value;
    return map.get(`${tableName}:${value}`) ?? value;
  }

  private buildValues(tableName: string, row: Record<string, unknown>, map: Map<string, number>): Record<string, unknown> {
    const values: Record<string, unknown> = {};
    for (const [column, value] of Object.entries(row)) {
      if (column === "id") continue;
      if (column.endsWith("_id")) {
        const targetTable = column === "team_id" || column === "club_id" ? (this.targetTableForFk(tableName, column)) : this.targetTableForFk(tableName, column);
        values[column] = this.findTranslatedFk(targetTable, value, map);
      } else values[column] = value;
    }
    return values;
  }

  private targetTableForFk(tableName: string, column: string): string {
    const explicit: Record<string, string> = {
      person_id: "person", player_id: "player", team_id: "team", club_id: "club", nation_id: "nation", base_nation_id: "nation", international_competition_nation_id: "nation",
      city_id: "city", birth_city_id: "city", stadium_id: "stadium", alternative_stadium_id: "stadium", competition_id: "competition", parent_competition_id: "competition",
      competition_season_id: "competition_season", stage_id: "competition_stage", stage_type_id: "competition_stage_type", round_id: "competition_round", formation_id: "formation", position_id: "position_definition",
      gender_id: "gender", currency_id: "currency", language_id: "language", family_id: "language_family", group_id: "language_group", subgroup_id: "language_subgroup",
      continent_region_id: "continent_region", nation_region_id: "nation_region", owner_club_id: "club", owner_person_id: "person",
    };
    return explicit[column] ?? column.replace(/_id$/, "");
  }

  private findTranslatedFk(targetTable: string, value: unknown, map: Map<string, number>): unknown {
    if (value == null) return null;
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return value;
    return map.get(`${targetTable}:${numeric}`) ?? numeric;
  }

  private insertResolvedRow(tableName: string, row: Record<string, unknown>, map: Map<string, number>): number {
    const values = this.buildValues(tableName, row, map);
    const columns = Object.keys(values).filter(c => this.world.tableSchema(tableName).columns.some(x => x.name === c));
    const result = this.world.connection.prepare(`INSERT INTO "${quote(tableName)}" (${columns.map(quote).join(",")}) VALUES (${columns.map(()=>"?").join(",")})`).run(...columns.map(c => values[c] ?? null));
    const id = Number(result.lastInsertRowid);
    map.set(`${tableName}:${Number(row.id)}`, id);
    this.persistIdentity(tableName, id, row);
    return id;
  }

  private updateResolvedRow(tableName: string, worldId: number, row: Record<string, unknown>, map: Map<string, number>): void {
    const values = this.buildValues(tableName, row, map);
    const columns = Object.keys(values).filter(c => c !== "id" && this.world.tableSchema(tableName).columns.some(x => x.name === c));
    if (!columns.length) return;
    this.world.connection.prepare(`UPDATE "${quote(tableName)}" SET ${columns.map(c => `"${quote(c)}"=?`).join(",")} WHERE id=?`).run(...columns.map(c => values[c] ?? null), worldId);
    map.set(`${tableName}:${Number(row.id)}`, worldId);
    this.persistIdentity(tableName, worldId, row);
  }

  private mergeRow(tableName: string, worldId: number, row: Record<string, unknown>, map: Map<string, number>): void {
    const current = this.world.connection.prepare(`SELECT * FROM "${quote(tableName)}" WHERE id=?`).get(worldId) as Record<string, unknown>;
    const merged = { ...current };
    for (const [key, value] of Object.entries(row)) if (key !== "id" && (merged[key] == null || merged[key] === "")) merged[key] = value;
    this.updateResolvedRow(tableName, worldId, merged, map);
  }

  private recordMap(sessionId: number, tableName: string, row: Record<string, unknown>, worldId: number, resolved: { naturalKey: string | null }): void {
    this.world.connection.prepare(`INSERT OR REPLACE INTO world_import_id_map(import_session_id,table_name,incoming_id,incoming_uuid,world_id,resolution,natural_key) VALUES(?,?,?,?,?,?,?)`)
      .run(sessionId, tableName, row.id == null ? null : Number(row.id), row.uuid == null ? null : String(row.uuid), worldId, resolved.worldId == null ? "CREATED" : "RESOLVED", resolved.naturalKey);
  }

  private persistIdentity(tableName: string, rowId: number, row: Record<string, unknown>): void {
    const policy = IDENTITY_POLICIES[tableName];
    if (!policy) return;
    let naturalKey: string | null = null;
    try { naturalKey = policy.naturalKey(row, (table, id) => this.lookupRowById(table, id)); } catch { naturalKey = null; }
    const uuid = policy.uuidColumn && row[policy.uuidColumn] ? String(row[policy.uuidColumn]) : (policy.uuidColumn ? generateUuid() : null);
    if (policy.uuidColumn) {
      const tableSchema = this.world.tableSchema(tableName);
      if (tableSchema.columns.some(column => column.name === policy.uuidColumn)) {
        this.world.connection.prepare(`UPDATE "${quote(tableName)}" SET "${quote(policy.uuidColumn)}" = COALESCE("${quote(policy.uuidColumn)}", ?) WHERE id=?`).run(uuid, rowId);
      }
    }
    this.world.connection.prepare(`INSERT OR REPLACE INTO world_entity_identity(table_name,row_id,entity_uuid,natural_key) VALUES(?,?,?,?)`).run(tableName,rowId,uuid,naturalKey);
  }

  private recordProvenance(tableName: string, rowId: number, packageId: number, resolution: string, row: Record<string, unknown>): void {
    const now = new Date().toISOString();
    this.world.connection.prepare(`INSERT OR REPLACE INTO world_entity_provenance(table_name,row_id,package_id,resolution,imported_at) VALUES(?,?,?,?,?)`).run(tableName,rowId,packageId,resolution,now);
    for (const [column,value] of Object.entries(row)) {
      this.world.connection.prepare(`INSERT OR REPLACE INTO world_attribute_provenance(table_name,row_id,column_name,package_id,value_hash,resolution,updated_at) VALUES(?,?,?,?,?,?,?)`)
        .run(tableName,rowId,column,packageId,crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex"),resolution,now);
    }
  }

  private getSession(id: number): { id: number; source_file: string } | undefined {
    return this.world.connection.prepare("SELECT id,source_file FROM world_import_session WHERE id=?").get(id) as { id: number; source_file: string } | undefined;
  }
}

function quote(value: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) throw new Error(`Invalid identifier: ${value}`);
  return value;
}

function quoteString(value: string): string {
  return "'" + value.replaceAll("'", "''") + "'";
}

function sha256File(filePath: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}
