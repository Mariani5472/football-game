import type { WorldDatabase } from "../database/world/WorldDatabase.js";

export interface PackageIdentityManifest {
  packageKey: string;
  packageType?: string;
  version: string;
  provides?: string[];
  dependencies?: Array<{ key: string; minVersion?: string | null }>;
  conflicts?: string[];
}

export type PackageIdentityIssueCode =
  | "DUPLICATE_IDENTITY"
  | "VERSION_NOT_NEWER"
  | "VERSION_DOWNGRADE"
  | "PROVIDE_CONFLICT"
  | "DUPLICATE_PROVIDE"
  | "MISSING_DEPENDENCY"
  | "INCOMPATIBLE_DEPENDENCY"
  | "SELF_DEPENDENCY"
  | "EXPLICIT_CONFLICT";

export interface PackageIdentityIssue {
  code: PackageIdentityIssueCode;
  message: string;
  packageKey: string;
  relatedPackageKey?: string;
  capabilityKey?: string;
  currentVersion?: string;
  incomingVersion?: string;
}

export interface PackageIdentityValidation {
  packageId: number | null;
  update: boolean;
  issues: PackageIdentityIssue[];
}

export function normalizePackageIdentity(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizeCapabilityKey(value: string): string {
  return value.trim().toLowerCase();
}

export function comparePackageVersions(a: string, b: string): number {
  const left = a.split(".").map(part => Number(part.replace(/[^0-9].*$/, "")) || 0);
  const right = b.split(".").map(part => Number(part.replace(/[^0-9].*$/, "")) || 0);
  const length = Math.max(left.length, right.length);

  for (let index = 0; index < length; index += 1) {
    const l = left[index] ?? 0;
    const r = right[index] ?? 0;
    if (l !== r) return l > r ? 1 : -1;
  }

  return 0;
}

export function validatePackageIdentity(
  database: WorldDatabase,
  manifest: PackageIdentityManifest,
  sourceSha256: string,
): PackageIdentityValidation {
  const packageKey = normalizePackageIdentity(manifest.packageKey);
  const issues: PackageIdentityIssue[] = [];

  const installed = database.connection
    .prepare(
      `SELECT id,package_key AS packageKey,version,source_sha256 AS sourceSha256,
              package_type AS packageType,enabled
       FROM world_package
       WHERE lower(package_key)=?
       LIMIT 1`,
    )
    .get(packageKey) as
    | {
        id: number;
        packageKey: string;
        version: string;
        sourceSha256: string | null;
        packageType: string;
        enabled: number;
      }
    | undefined;

  let update = false;

  if (installed) {
    const versionOrder = comparePackageVersions(
      manifest.version,
      installed.version,
    );

    if (
      installed.sourceSha256 === sourceSha256 &&
      versionOrder === 0
    ) {
      // Idempotent re-inspection of the exact installed package.
    } else if (versionOrder > 0) {
      update = true;
    } else if (versionOrder < 0) {
      issues.push({
        code: "VERSION_DOWNGRADE",
        packageKey,
        relatedPackageKey: installed.packageKey,
        currentVersion: installed.version,
        incomingVersion: manifest.version,
        message:
          `Package ${packageKey} v${manifest.version} cannot replace installed v${installed.version}; updates must move forward.`,
      });
    } else {
      issues.push({
        code: "DUPLICATE_IDENTITY",
        packageKey,
        relatedPackageKey: installed.packageKey,
        currentVersion: installed.version,
        incomingVersion: manifest.version,
        message:
          `Package identity ${packageKey} v${manifest.version} is already installed with a different source. The same identity/version cannot be installed twice.`,
      });
    }

    if (
      installed.packageType &&
      manifest.packageType &&
      normalizePackageIdentity(installed.packageType) !==
        normalizePackageIdentity(manifest.packageType)
    ) {
      issues.push({
        code: "DUPLICATE_IDENTITY",
        packageKey,
        relatedPackageKey: installed.packageKey,
        currentVersion: installed.version,
        incomingVersion: manifest.version,
        message:
          `Package ${packageKey} has type ${installed.packageType}; incoming metadata declares ${manifest.packageType}.`,
      });
    }
  }

  const provides = (manifest.provides ?? [])
    .map(normalizeCapabilityKey)
    .filter(Boolean);
  const uniqueProvides = new Set<string>();

  for (const capability of provides) {
    if (uniqueProvides.has(capability)) {
      issues.push({
        code: "DUPLICATE_PROVIDE",
        packageKey,
        capabilityKey: capability,
        message:
          `Package ${packageKey} declares provided capability ${capability} more than once.`,
      });
      continue;
    }

    uniqueProvides.add(capability);

    const provider = database.connection
      .prepare(
        `SELECT p.package_key AS packageKey,p.version
         FROM world_package_provides pr
         JOIN world_package p ON p.id=pr.package_id
         WHERE p.enabled=1
           AND lower(pr.provide_key)=?
           AND (? IS NULL OR p.id<>?)
         LIMIT 1`,
      )
      .get(
        capability,
        installed?.id ?? null,
        installed?.id ?? null,
      ) as
      | { packageKey: string; version: string }
      | undefined;

    if (provider) {
      issues.push({
        code: "PROVIDE_CONFLICT",
        packageKey,
        relatedPackageKey: provider.packageKey,
        capabilityKey: capability,
        message:
          `Capability ${capability} is already provided by enabled package ${provider.packageKey}; another package cannot claim the same logical scope.`,
      });
    }
  }

  for (const dependency of manifest.dependencies ?? []) {
    const dependencyKey = normalizeCapabilityKey(dependency.key);

    if (!dependencyKey) continue;

    if (dependencyKey === packageKey) {
      issues.push({
        code: "SELF_DEPENDENCY",
        packageKey,
        capabilityKey: dependencyKey,
        message:
          `Package ${packageKey} cannot depend on itself.`,
      });
      continue;
    }

    const providers = database.connection
      .prepare(
        `SELECT p.package_key AS packageKey,p.version
         FROM world_package p
         LEFT JOIN world_package_provides pr
           ON pr.package_id=p.id
         WHERE p.enabled=1
           AND (
             lower(p.package_key)=?
             OR lower(pr.provide_key)=?
           )
           AND (? IS NULL OR p.id<>?)
         ORDER BY CASE WHEN lower(p.package_key)=? THEN 0 ELSE 1 END,
                  p.id`,
      )
      .all(
        dependencyKey,
        dependencyKey,
        installed?.id ?? null,
        installed?.id ?? null,
        dependencyKey,
      ) as Array<{ packageKey: string; version: string }>;

    const provider = providers[0];

    if (!provider) {
      issues.push({
        code: "MISSING_DEPENDENCY",
        packageKey,
        capabilityKey: dependencyKey,
        message:
          `Package ${packageKey} requires ${dependencyKey}, but no enabled package provides it.`,
      });
      continue;
    }

    if (
      dependency.minVersion &&
      comparePackageVersions(
        provider.version,
        dependency.minVersion,
      ) < 0
    ) {
      issues.push({
        code: "INCOMPATIBLE_DEPENDENCY",
        packageKey,
        relatedPackageKey: provider.packageKey,
        capabilityKey: dependencyKey,
        currentVersion: provider.version,
        incomingVersion: dependency.minVersion,
        message:
          `Package ${packageKey} requires ${dependencyKey} >= ${dependency.minVersion}, but ${provider.packageKey} is v${provider.version}.`,
      });
    }
  }

  for (const conflict of manifest.conflicts ?? []) {
    const conflictKey = normalizeCapabilityKey(conflict);

    if (!conflictKey) continue;

    const conflictingPackage = database.connection
      .prepare(
        `SELECT p.package_key AS packageKey,p.version
         FROM world_package p
         LEFT JOIN world_package_provides pr
           ON pr.package_id=p.id
         WHERE p.enabled=1
           AND p.id<>?
           AND (
             lower(p.package_key)=?
             OR lower(pr.provide_key)=?
           )
         LIMIT 1`,
      )
      .get(
        installed?.id ?? -1,
        conflictKey,
        conflictKey,
      ) as
      | { packageKey: string; version: string }
      | undefined;

    if (conflictingPackage) {
      issues.push({
        code: "EXPLICIT_CONFLICT",
        packageKey,
        relatedPackageKey: conflictingPackage.packageKey,
        capabilityKey: conflictKey,
        currentVersion: conflictingPackage.version,
        message:
          `Package ${packageKey} explicitly conflicts with ${conflictKey}, provided by ${conflictingPackage.packageKey}.`,
      });
    }
  }

  return {
    packageId: installed?.id ?? null,
    update,
    issues,
  };
}
