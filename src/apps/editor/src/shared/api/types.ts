export type Scalar = string | number | boolean | null;
export type EntityRow = Record<string, Scalar>;
export type EntityKey = string | number | Record<string, Scalar>;

export interface ListOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  searchColumns?: string[];
  orderBy?: string;
  orderDirection?: "ASC" | "DESC";
}


export interface WorldBuildStatus {
  status: "VALID" | "INVALID" | "DIRTY" | "UNKNOWN";
  lastBuildAt: string | null;
  unresolvedConflicts: number;
  enabledPackages: number;
}

export interface ImportConflict {
  id: number;
  packageId: number;
  tableName: string;
  incomingKey: string;
  incomingId: number | null;
  worldKey: string | null;
  worldId: number | null;
  conflictType: string;
  columnName: string | null;
  existingValue: string | null;
  incomingValue: string | null;
  resolution: "REPLACE" | "MERGE" | "KEEP_EXISTING" | "KEEP_INCOMING" | "MANUAL";
  resolved: boolean;
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

export interface ImportSession {
  id: number;
  status: string;
  packageId: number;
  packageKey: string;
  sourceFile: string;
  sourceSha256: string;
  startedAt: string;
  completedAt: string | null;
  errorMessage: string | null;
  summary: Record<string, unknown>;
}

export interface WorldPackageRecord {
  id: number;
  packageKey: string;
  name: string;
  version: string;
  status: "ACTIVE" | "CONFLICT" | "ERROR" | "DISABLED";
  icon: string | null;
  sourceFile: string | null;
  sourceSha256: string | null;
  categories: string[];
  description: string | null;
  schemaVersion: number;
  importedAt: string;
  updatedAt: string;
  packageType: string;
  priority: number;
  enabled: boolean;
  loadOrder: number | null;
  provides: string[];
  dependencies: Array<{ key: string; minVersion: string | null }>;
  conflicts: string[];
}

export interface WorldDashboard {
  world: {
    name: string;
    year: number;
    schemaVersion: number;
    packageVersion: string;
    status: "VALID" | "INVALID" | "UNKNOWN";
    lastSavedAt: string | null;
    databasePath: string;
  };
  build: WorldBuildStatus;
  packages: WorldPackageRecord[];
}

export interface TemplateRelationOption {
  table: string;
  depth: number;
  required: boolean;
  direction: "parent" | "child" | "related";
}

export interface TemplateRecord {
  id: number;
  name: string;
  rootTable: string;
  sourceKey: EntityKey;
  relations: string[];
  rowCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ListResult<T extends EntityRow = EntityRow> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}


export interface RegisterPackagePayload {
  packageKey: string;
  name: string;
  version?: string;
  packageType?: string;
  priority?: number;
  status?: "ACTIVE" | "CONFLICT" | "ERROR" | "DISABLED";
  icon?: string | null;
  sourceFile?: string | null;
  sourceSha256?: string | null;
  categories?: string[];
  description?: string | null;
  provides?: string[];
  dependencies?: Array<{ key: string; minVersion?: string | null }>;
  conflicts?: string[];
}

export interface UpdatePackagePayload {
  enabled?: boolean;
  priority?: number;
  loadOrder?: number;
}
