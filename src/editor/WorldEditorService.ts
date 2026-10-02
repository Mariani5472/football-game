import path from "node:path";
import fs from "node:fs";
import { WorldDatabase } from "../database/world/WorldDatabase.js";
import type { ListOptions, SqlKey, SqlRow, SqlValue, TableSchema } from "../database/Database.js";
import { WorldTemplateService, type TemplateRecord, type TemplateRelationOption } from "./WorldTemplateService.js";
import { WorldDomainService } from "./WorldDomainService.js";
import { WorldValidator, type ValidationIssue, type ValidationProfile } from "./WorldValidator.js";
import { WorldPackageService, type WorldExportResult, type WorldPackageIssue } from "./WorldPackageService.js";

export interface WorldDashboardSummary {
  world: {
    name: string;
    year: number;
    schemaVersion: number;
    packageVersion: string;
    status: "VALID" | "INVALID" | "UNKNOWN";
    lastSavedAt: string | null;
    databasePath: string;
  };
  packages: Array<{
    id: number;
    packageKey: string;
    name: string;
    version: string;
    status: "ACTIVE" | "CONFLICT" | "ERROR";
    icon: string | null;
    categories: string[];
    description: string | null;
  }>;
}

export interface WorldEditorServiceOptions {
  filePath: string;
  createIfMissing?: boolean;
}

export class WorldEditorService {
  private readonly database: WorldDatabase;
  private readonly templatesService: WorldTemplateService;
  private readonly domainService: WorldDomainService;
  private readonly validator: WorldValidator;
  private readonly packageService: WorldPackageService;
  private readonly filePath: string;

  constructor(options: WorldEditorServiceOptions) {
    const create = options.createIfMissing ?? false;
    this.filePath = path.resolve(options.filePath);

    this.database = create
      ? WorldDatabase.create(path.resolve(options.filePath))
      : WorldDatabase.open(path.resolve(options.filePath));
    this.templatesService = new WorldTemplateService(this.database);
    this.domainService = new WorldDomainService(this.database);
    this.validator = new WorldValidator(this.database);
    this.packageService = new WorldPackageService(this.database);
  }

  list<T extends SqlRow = SqlRow>(table: string, options?: ListOptions) {
    return this.database.list<T>(table, options);
  }

  findById<T extends SqlRow = SqlRow>(table: string, id: SqlKey) {
    return this.database.findById<T>(table, id);
  }

  tableSchema(table: string): TableSchema {
    return this.database.tableSchema(table);
  }

  tables(): string[] {
    return this.database.listTables();
  }

  create<T extends SqlRow = SqlRow>(
    table: string,
    values: Record<string, SqlValue | undefined>,
  ) {
    return this.database.create<T>(table, values);
  }

  update<T extends SqlRow = SqlRow>(
    table: string,
    id: SqlKey,
    values: Record<string, SqlValue | undefined>,
  ) {
    return this.database.update<T>(table, id, values);
  }

  delete(table: string, id: SqlKey): boolean {
    return this.database.delete(table, id);
  }

  templateRelations(rootTable: string, rootKey: SqlKey): TemplateRelationOption[] {
    return this.templatesService.relationOptions(rootTable, rootKey);
  }

  createTemplate(name: string, rootTable: string, rootKey: SqlKey, relations: string[]): TemplateRecord {
    return this.templatesService.createTemplate(name, rootTable, rootKey, relations);
  }

  listTemplates(): TemplateRecord[] {
    return this.templatesService.listTemplates();
  }

  deleteTemplate(id: number): boolean {
    return this.templatesService.deleteTemplate(id);
  }

  duplicateFromSource(rootTable: string, rootKey: SqlKey, relations: string[]) {
    return this.templatesService.duplicateFromSource(rootTable, rootKey, relations);
  }

  duplicateFromTemplate(templateId: number) {
    return this.templatesService.duplicateFromTemplate(templateId);
  }

  createTransfer(input: Parameters<WorldDomainService["createTransfer"]>[0]) { return this.domainService.createTransfer(input); }
  createContract(input: Parameters<WorldDomainService["createContract"]>[0]) { return this.domainService.createContract(input); }
  saveClubFinance(input: Parameters<WorldDomainService["saveClubFinance"]>[0]) { return this.domainService.saveClubFinance(input); }
  createCompetitionHistory(input: Parameters<WorldDomainService["createCompetitionHistory"]>[0]) { return this.domainService.createCompetitionHistory(input); }
  createAwardHistory(input: Parameters<WorldDomainService["createAwardHistory"]>[0]) { return this.domainService.createAwardHistory(input); }
  createPressSource(input: Parameters<WorldDomainService["createPressSource"]>[0]) { return this.domainService.createPressSource(input); }
  createAward(input: Parameters<WorldDomainService["createAward"]>[0]) { return this.domainService.createAward(input); }
  createPlayerCareerHistory(input: Record<string, SqlValue | undefined>) { return this.domainService.createPlayerCareerHistory(input); }
  createStaffCareerHistory(input: Record<string, SqlValue | undefined>) { return this.domainService.createStaffCareerHistory(input); }
  createPlayerAchievement(input: Parameters<WorldDomainService["createPlayerAchievement"]>[0]) { return this.domainService.createPlayerAchievement(input); }
  createRecord(input: Parameters<WorldDomainService["createRecord"]>[0]) { return this.domainService.createRecord(input); }
  createDerby(input: Parameters<WorldDomainService["createDerby"]>[0]) { return this.domainService.createDerby(input); }
  mapClimateToRegion(nationRegionId: number, climateId: number) { return this.domainService.mapClimateToRegion(nationRegionId, climateId); }
  createWeatherSeason(name: string) { return this.domainService.createWeatherSeason(name); }
  createClimateProfile(input: Parameters<WorldDomainService["createClimateProfile"]>[0]) { return this.domainService.createClimateProfile(input); }
  createNationalityRule(input: Parameters<WorldDomainService["createNationalityRule"]>[0]) { return this.domainService.createNationalityRule(input); }
  validate(profileId?: number): ValidationIssue[] { return this.validator.validate(profileId); }

  dashboard(): WorldDashboardSummary {
    const issues = this.validator.validate();
    const hasErrors = issues.some(issue => issue.severity === "ERROR");
    const stat = fs.existsSync(this.filePath) ? fs.statSync(this.filePath) : null;
    return {
      world: {
        name: this.database.metadata("world_name") ?? "Unnamed World",
        year: Number(this.database.metadata("world_year") ?? new Date().getFullYear()),
        schemaVersion: Number(this.database.metadata("schema_version") ?? 0),
        packageVersion: this.database.metadata("package_version") ?? "0.2.0",
        status: hasErrors ? "INVALID" : "VALID",
        lastSavedAt: stat?.mtime.toISOString() ?? null,
        databasePath: this.filePath,
      },
      packages: this.packageService.listPackages().map(packageItem => ({
        id: packageItem.id,
        packageKey: packageItem.packageKey,
        name: packageItem.name,
        version: packageItem.version,
        status: packageItem.status,
        icon: packageItem.icon,
        categories: packageItem.categories,
        description: packageItem.description,
      })),
    };
  }

  worldSettings(): { name: string; year: number } {
    return {
      name: this.database.metadata("world_name") ?? "Unnamed World",
      year: Number(this.database.metadata("world_year") ?? new Date().getFullYear()),
    };
  }

  updateWorldSettings(name: string, year: number): { name: string; year: number } {
    const normalizedName = name.trim();
    if (!normalizedName) throw new Error("World name is required.");
    if (!Number.isInteger(year) || year < 1900 || year > 3000) throw new Error("World year is invalid.");
    this.database.setMetadata("world_name", normalizedName);
    this.database.setMetadata("world_year", String(year));
    return this.worldSettings();
  }

  listPackages() { return this.packageService.listPackages(); }
  registerPackage(input: Parameters<WorldPackageService["registerPackage"]>[0]) { return this.packageService.registerPackage(input); }
  removePackage(id: number) { return this.packageService.removePackage(id); }\n  inspectPackage(sourceFile: string) { return this.packageService.inspectPackage(sourceFile); }\n  importPackage(sessionId: number, resolutions: Record<string, "REPLACE"|"MERGE"|"KEEP_EXISTING"|"KEEP_INCOMING"|"MANUAL"> = {}) { return this.packageService.importPackage(sessionId, resolutions); }
  exportWorld(outputPath: string): WorldExportResult {
    const validationIssues = this.validator.validate().map(issue => ({
      severity: issue.severity === "ERROR" ? "ERROR" as const : "WARNING" as const,
      ruleKey: issue.ruleKey,
      message: issue.message,
    } satisfies WorldPackageIssue));
    return this.packageService.exportWorld(outputPath, validationIssues);
  }
  validationProfiles(): ValidationProfile[] { return this.validator.profiles(); }
  setValidationProfileEnabled(id: number, enabled: boolean): ValidationProfile { return this.validator.setProfileEnabled(id, enabled); }
  setValidationRuleEnabled(ruleKey: string, enabled: boolean): void { return this.validator.setRuleEnabled(ruleKey, enabled); }

  close(): void {
    this.database.close();
  }
}