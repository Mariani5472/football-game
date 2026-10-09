import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { WorldPackageImportService } from "../../infrastructure/packages/WorldPackageImportService.js";
import { initializeWorldCompositionSchema } from "./WorldCompositionSchema.js";
import {
  BASE_PACKAGE_KEY,
  BASE_PACKAGE_VERSION,
  BASE_PACKAGE_PRIORITY,
} from "./WorldBasePackageDefinition.js";
import { WorldDefaultDataPackageBuilder } from "./WorldDefaultDataPackageBuilder.js";
import type { WorldDatabase } from "./WorldDatabase.js";

export class WorldBasePackageService {
  static ensureInstalled(world: WorldDatabase, worldPath: string): void {
    const database = world.connection;
    const packageFile = path.resolve(
      path.dirname(worldPath),
      ".packages",
      `world.base.${BASE_PACKAGE_VERSION}.db`,
    );

    initializeWorldCompositionSchema(database);
    const existing = database.prepare(
      "SELECT id,version,package_type AS packageType,priority,enabled,source_file AS sourceFile,source_sha256 AS sourceSha256 FROM world_package WHERE lower(package_key)=? LIMIT 1",
    ).get(BASE_PACKAGE_KEY) as {
      id: number;
      version: string;
      packageType: string;
      priority: number;
      enabled: number;
      sourceFile: string | null;
      sourceSha256: string | null;
    } | undefined;

    if (
      existing &&
      existing.version === BASE_PACKAGE_VERSION &&
      existing.packageType === "BASE" &&
      existing.priority === BASE_PACKAGE_PRIORITY &&
      existing.enabled === 1 &&
      existing.sourceFile &&
      path.resolve(existing.sourceFile) === packageFile &&
      fs.existsSync(packageFile) &&
      sha256File(packageFile) === existing.sourceSha256
    ) {
      return;
    }

    fs.mkdirSync(path.dirname(packageFile), { recursive: true });
    if (!fs.existsSync(packageFile)) WorldDefaultDataPackageBuilder.createPackageDatabase(packageFile);
    const sourceHash = sha256File(packageFile);

    if (!existing) {
      database.transaction(() => {
        const now = new Date().toISOString();
        const result = database.prepare(
          `INSERT INTO world_package(
            package_key,name,version,package_type,priority,status,
            source_file,source_sha256,categories_json,description,
            schema_version,imported_at,installed_at,updated_at,enabled
          ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        ).run(
          BASE_PACKAGE_KEY,
          "Base World",
          BASE_PACKAGE_VERSION,
          "BASE",
          BASE_PACKAGE_PRIORITY,
          "ERROR",
          packageFile,
          sourceHash,
          JSON.stringify(["reference", "geography", "languages", "currencies", "climate", "people", "competition", "stadiums", "finance", "contracts", "transfers", "tactics", "equipment", "awards", "press", "records"]),
          "Immutable foundational reference data for every World.",
          5,
          now,
          now,
          now,
          1,
        );

        database.exec("UPDATE world_package_load_order SET load_order = -load_order");
        database.exec("UPDATE world_package_load_order SET load_order = -load_order + 1");
        database.prepare(
          "INSERT INTO world_package_load_order(package_id,load_order) VALUES(?,1)",
        ).run(Number(result.lastInsertRowid));
      });
    }

    const importer = new WorldPackageImportService(world);
    const preview = importer.inspect(packageFile);
    importer.import(preview.sessionId);
  }
}

function sha256File(file: string): string {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(file));
  return hash.digest("hex");
}
