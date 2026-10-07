import path from "node:path";
import crypto from "node:crypto";
import fs from "node:fs";

import {
  type ListOptions,
  type SqlKey,
  type SqlRow,
  type SqlValue,
  type TableSchema,
} from "../database/Database.js";
import { generateUuid, identityPolicy } from "../database/world/WorldIdentity.js";
import { WorldDatabase } from "../database/world/WorldDatabase.js";
import { DefaultDataRepository } from "../database/world/DefaultDataRepository.js";
import { FastStartService, type FastStartTemplate } from "../world/services/FastStartService.js";
import { WorldStatisticsService } from "../world/services/WorldStatisticsService.js";
import { WorldTemplateService, type TemplateRecord, type TemplateRelationOption } from "./WorldTemplateService.js";
import { WorldDomainService } from "./WorldDomainService.js";
import { EditorApplication } from "./application/EditorApplication.js";
import type { ContractInput } from "../modules/career/domain/ContractRepository.js";
import type { FinanceInput } from "../modules/finance/domain/FinanceRepository.js";
import { CsvImportService, type CsvImportRow } from "./CsvImportService.js";
import { WorldValidator, type ValidationIssue, type ValidationProfile } from "./WorldValidator.js";
import {
  WorldPackageService,
  type RegisterWorldPackageInput,
  type UpdateWorldPackageInput,
  type WorldBuildStatus,
  type WorldExportResult,
  type WorldPackageIssue,
  type WorldPackageRecord,
} from "./WorldPackageService.js";
import type {
  ConflictPolicy,
  ImportConflictRecord,
  ImportPreview,
  ImportSessionRecord,
  RebuildResult,
} from "../infrastructure/packages/WorldPackageImportService.js";
import { CompetitionEngine } from "../modules/competition/index.js";

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
  build: WorldBuildStatus;
  packages: WorldPackageRecord[];
  statistics: ReturnType<WorldStatisticsService["get"]>;
}

export interface WorldEditorServiceOptions {
  filePath: string;
  createIfMissing?: boolean;
}

export class WorldEditorService {
  private readonly database: WorldDatabase;
  private readonly templatesService: WorldTemplateService;
  private readonly domainService: WorldDomainService;
  private readonly application: EditorApplication;
  private readonly validator: WorldValidator;
  private readonly competitionEngine: CompetitionEngine;
  private readonly packageService: WorldPackageService;
  private readonly csvImportService: CsvImportService;
  private readonly defaultDataRepository: DefaultDataRepository;
  private readonly filePath: string;

  constructor(options: WorldEditorServiceOptions) {
    const create = options.createIfMissing ?? false;
    this.filePath = path.resolve(options.filePath);

    this.database = create
      ? WorldDatabase.create(this.filePath)
      : WorldDatabase.open(this.filePath);

    this.templatesService = new WorldTemplateService(this.database);
    this.domainService = new WorldDomainService(this.database);
    this.application = new EditorApplication(this.database);
    this.validator = new WorldValidator(this.database);
    this.competitionEngine = new CompetitionEngine(this.database);
    this.packageService = new WorldPackageService(this.database);
    this.csvImportService = new CsvImportService(this.database);
    this.defaultDataRepository = new DefaultDataRepository(this.database);
  }

  list<T extends SqlRow = SqlRow>(
    table: string,
    options?: ListOptions,
  ) {
    return this.database.list<T>(table, options);
  }

  findById<T extends SqlRow = SqlRow>(
    table: string,
    id: SqlKey,
  ) {
    return this.database.findById<T>(
      table,
      id,
    );
  }

  tableSchema(table: string): TableSchema {
    return this.database.tableSchema(table);
  }

  tables(): string[] {
    return this.database.listTables();
  }

  getDefaultData() {
    return this.defaultDataRepository.get();
  }

  previewCsvImport(table: string, rows: CsvImportRow[]) {
    return this.csvImportService.preview(table, rows);
  }

  importCsv(table: string, rows: CsvImportRow[]) {
    const result = this.csvImportService.import(table, rows);
    if (result.imported) this.markDirectEdit();
    return result;
  }

  create<T extends SqlRow = SqlRow>(
    table: string,
    values: Record<
      string,
      SqlValue | undefined
    >,
  ) {
    const normalized = {
      ...values,
    };

    const policy = identityPolicy(
      table,
    );

    if (
      policy?.uuidColumn &&
      (normalized[policy.uuidColumn] == null ||
        normalized[policy.uuidColumn] === "")
    ) {
      normalized[policy.uuidColumn] =
        generateUuid();
    }

    const result =
      this.database.create<T>(
        table,
        normalized,
      );

    this.markDirectEdit();

    return result;
  }

  update<T extends SqlRow = SqlRow>(
    table: string,
    id: SqlKey,
    values: Record<
      string,
      SqlValue | undefined
    >,
  ) {
    const result =
      this.database.update<T>(
        table,
        id,
        values,
      );

    this.markDirectEdit();

    return result;
  }

  delete(
    table: string,
    id: SqlKey,
  ): boolean {
    const deleted =
      this.database.delete(
        table,
        id,
      );

    if (deleted) {
      this.markDirectEdit();
    }

    return deleted;
  }

  templateRelations(
    rootTable: string,
    rootKey: SqlKey,
  ): TemplateRelationOption[] {
    return this.templatesService.relationOptions(
      rootTable,
      rootKey,
    );
  }

  createTemplate(
    name: string,
    rootTable: string,
    rootKey: SqlKey,
    relations: string[],
  ): TemplateRecord {
    return this.templatesService.createTemplate(
      name,
      rootTable,
      rootKey,
      relations,
    );
  }

  listTemplates(): TemplateRecord[] {
    return this.templatesService.listTemplates();
  }

  deleteTemplate(id: number): boolean {
    return this.templatesService.deleteTemplate(
      id,
    );
  }

  duplicateFromSource(
    rootTable: string,
    rootKey: SqlKey,
    relations: string[],
  ) {
    const result = this.templatesService.duplicateFromSource(
      rootTable,
      rootKey,
      relations,
    );
    this.markDirectEdit();
    return result;
  }

  duplicateFromTemplate(
    templateId: number,
  ) {
    const result = this.templatesService.duplicateFromTemplate(
      templateId,
    );
    this.markDirectEdit();
    return result;
  }

  importNationRegions(nationId: number, rows: Array<{ line: number; name: string; shortName?: string; population?: number }>) {
    if (!Number.isInteger(nationId) || !this.database.findById("nation", nationId)) {
      throw new Error("Nation does not exist.");
    }
    const result = this.database.transaction(() => {
      const imported: number[] = [];
      const errors: Array<{ line: number; message: string }> = [];
      for (const row of rows) {
        try {
          this.database.transaction(() => {
            const name = row.name.trim();
            if (!name) throw new Error("Name is required.");
            if (row.population !== undefined && (!Number.isInteger(row.population) || row.population < 0)) throw new Error("Population must be a non-negative whole number.");
            const created = this.database.create("nation_region", {
              nation_id: nationId,
              name,
              short_name: row.shortName?.trim() || null,
              population: row.population ?? null,
            });
            imported.push(Number(created.id));
          });
        } catch (error) {
          errors.push({ line: row.line, message: error instanceof Error ? error.message : String(error) });
        }
      }
      return { imported: imported.length, errors };
    });
    if (result.imported) this.markDirectEdit();
    return result;
  }
  fastStart(template: FastStartTemplate, seasonYear: number) {
    if (!Number.isInteger(seasonYear) || seasonYear < 1900 || seasonYear > 3000) {
      throw new Error("Season year must be between 1900 and 3000.");
    }
    const result = new FastStartService(this.database).run({ template, seasonYear });
    return result;
  }

  resolveCompetitionStageParticipants(seasonId: number, stageId: number) {
    return this.competitionEngine.resolveStageParticipants(seasonId, stageId);
  }

  executeCompetitionDraw(input: Parameters<CompetitionEngine["executeDraw"]>[0]) {
    return this.competitionEngine.executeDraw(input);
  }

  buildCompetitionStageTransitions(seasonId: number) {
    return this.competitionEngine.buildStageTransitions(seasonId);
  }

  createLeague(input: Parameters<WorldDomainService["createLeague"]>[0]) {
    const result = this.application.createLeague(input);
    this.markDirectEdit();
    return result;
  }
  createCompetitionStage(input: Parameters<WorldDomainService["createCompetitionStage"]>[0]) {
    const result = this.application.createCompetitionStage(input);
    this.markDirectEdit();
    return result;
  }
  updateCompetitionStage(stageId: number, input: Parameters<WorldDomainService["updateCompetitionStage"]>[1]) {
    const result = this.application.updateCompetitionStage(stageId, input);
    this.markDirectEdit();
    return result;
  }

  duplicateCompetition(competitionId: number) {
    const result = this.application.duplicateCompetition(competitionId);
    this.markDirectEdit();
    return result;
  }

  duplicateStadium(stadiumId: number) {
    const result = this.application.duplicateStadium(stadiumId);
    this.markDirectEdit();
    return result;
  }

  createClub(input: Parameters<WorldDomainService["createClub"]>[0]) {
    const result = this.application.createClub(input);
    this.markDirectEdit();
    return result;
  }

  createPlayer(input: Parameters<WorldDomainService["createPlayer"]>[0]) {
    const result = this.application.createPlayer(input);
    this.markDirectEdit();
    return result;
  }
  createTransfer(
    input: Parameters<WorldDomainService["createTransfer"]>[0],
  ) {
    const result = this.application.createTransfer(input);
    this.markDirectEdit();
    return result;
  }

  createContract(
    input: ContractInput,
  ) {
    const result = this.application.createContract(input);
    this.markDirectEdit();
    return result;
  }

  saveClubFinance(
    input: FinanceInput,
  ) {
    const result = this.application.saveClubFinance(input);
    this.markDirectEdit();
    return result;
  }

  createCompetitionHistory(
    input: Parameters<WorldDomainService["createCompetitionHistory"]>[0],
  ) {
    const result = this.application.createCompetitionHistory(input);
    this.markDirectEdit();
    return result;
  }

  createAwardHistory(
    input: Parameters<WorldDomainService["createAwardHistory"]>[0],
  ) {
    const result = this.domainService.createAwardHistory(input);
    this.markDirectEdit();
    return result;
  }

  createPressSource(
    input: Parameters<WorldDomainService["createPressSource"]>[0],
  ) {
    const result = this.domainService.createPressSource(input);
    this.markDirectEdit();
    return result;
  }

  createAward(
    input: Parameters<WorldDomainService["createAward"]>[0],
  ) {
    const result = this.domainService.createAward(input);
    this.markDirectEdit();
    return result;
  }

  createPlayerCareerHistory(
    input: Record<string, SqlValue | undefined>,
  ) {
    const result = this.domainService.createPlayerCareerHistory(input);
    this.markDirectEdit();
    return result;
  }

  createStaffCareerHistory(
    input: Record<string, SqlValue | undefined>,
  ) {
    const result = this.domainService.createStaffCareerHistory(input);
    this.markDirectEdit();
    return result;
  }

  createPlayerAchievement(
    input: Parameters<WorldDomainService["createPlayerAchievement"]>[0],
  ) {
    const result = this.domainService.createPlayerAchievement(input);
    this.markDirectEdit();
    return result;
  }

  createRecord(
    input: Parameters<WorldDomainService["createRecord"]>[0],
  ) {
    const result = this.domainService.createRecord(input);
    this.markDirectEdit();
    return result;
  }

  createDerby(
    input: Parameters<WorldDomainService["createDerby"]>[0],
  ) {
    const result = this.domainService.createDerby(input);
    this.markDirectEdit();
    return result;
  }

  mapClimateToRegion(
    nationRegionId: number,
    climateId: number,
  ) {
    const result = this.domainService.mapClimateToRegion(
      nationRegionId,
      climateId,
    );
    this.markDirectEdit();
    return result;
  }

  createWeatherSeason(
    name: string,
  ) {
    const result = this.domainService.createWeatherSeason(name);
    this.markDirectEdit();
    return result;
  }

  createClimateProfile(
    input: Parameters<WorldDomainService["createClimateProfile"]>[0],
  ) {
    const result = this.domainService.createClimateProfile(input);
    this.markDirectEdit();
    return result;
  }

  createNationalityRule(
    input: Parameters<WorldDomainService["createNationalityRule"]>[0],
  ) {
    const result = this.domainService.createNationalityRule(input);
    this.markDirectEdit();
    return result;
  }

  validate(
    profileId?: number,
  ): ValidationIssue[] {
    return this.validator.validate(
      profileId,
    );
  }

  dashboard(): WorldDashboardSummary {
    const issues =
      this.validator.validate();
    const hasErrors =
      issues.some(
        issue =>
          issue.severity ===
          "ERROR",
      );

    const stat =
      fs.existsSync(this.filePath)
        ? fs.statSync(
          this.filePath,
        )
        : null;

    return {
      world: {
        name:
          this.database.metadata(
            "world_name",
          ) ?? "Unnamed World",
        year:
          Number(
            this.database.metadata(
              "world_year",
            ) ??
            new Date().getFullYear(),
          ),
        schemaVersion:
          Number(
            this.database.metadata(
              "schema_version",
            ) ?? 0,
          ),
        packageVersion:
          this.database.metadata(
            "package_version",
          ) ?? "0.3.0",
        status:
          hasErrors
            ? "INVALID"
            : "VALID",
        lastSavedAt:
          stat?.mtime.toISOString() ??
          null,
        databasePath:
          this.filePath,
      },
      build:
        this.packageService.getBuildStatus(),
      packages: this.packageService.listPackages(),
      statistics: new WorldStatisticsService(this.database).get(),
    };
  }

  worldBuild(): WorldBuildStatus {
    return this.packageService.getBuildStatus();
  }

  worldSettings(): {
    name: string;
    year: number;
  } {
    return {
      name:
        this.database.metadata(
          "world_name",
        ) ?? "Unnamed World",
      year:
        Number(
          this.database.metadata(
            "world_year",
          ) ??
          new Date().getFullYear(),
        ),
    };
  }

  updateWorldSettings(
    name: string,
    year: number,
  ): {
    name: string;
    year: number;
  } {
    const normalizedName =
      name.trim();

    if (!normalizedName) {
      throw new Error(
        "World name is required.",
      );
    }

    if (
      !Number.isInteger(year) ||
      year < 1900 ||
      year > 3000
    ) {
      throw new Error(
        "World year is invalid.",
      );
    }

    this.database.setMetadata(
      "world_name",
      normalizedName,
    );
    this.database.setMetadata(
      "world_year",
      String(year),
    );
    this.markDirectEdit();

    return this.worldSettings();
  }

  listPackages(): WorldPackageRecord[] {
    return this.packageService.listPackages();
  }

  registerPackage(
    input: RegisterWorldPackageInput,
  ): WorldPackageRecord {
    return this.packageService.registerPackage(
      input,
    );
  }

  updatePackage(
    id: number,
    input: UpdateWorldPackageInput,
  ): WorldPackageRecord {
    return this.packageService.updatePackage(
      id,
      input,
    );
  }

  removePackage(id: number): boolean {
    return this.packageService.removePackage(
      id,
    );
  }

  uploadPackage(
    fileName: string,
    contentBase64: string,
  ): { sourceFile: string; fileName: string; sizeBytes: number; sha256: string } {
    const safeName = path.basename(fileName).trim();
    if (!safeName || safeName === "." || safeName === "..") {
      throw new Error("Package file name is required.");
    }
    if (!/\.(db|sqlite|sqlite3)$/i.test(safeName)) {
      throw new Error("Package file must be a SQLite database (.db, .sqlite or .sqlite3).");
    }
    if (!contentBase64) {
      throw new Error("Package file content is required.");
    }

    const destinationDirectory = path.join(path.dirname(this.filePath), ".packages");
    fs.mkdirSync(destinationDirectory, { recursive: true });
    const destination = path.join(destinationDirectory, safeName);
    const content = Buffer.from(contentBase64, "base64");
    if (content.length === 0) {
      throw new Error("Package file is empty.");
    }
    fs.writeFileSync(destination, content);

    return {
      sourceFile: destination,
      fileName: safeName,
      sizeBytes: content.length,
      sha256: crypto.createHash("sha256").update(content).digest("hex"),
    };
  }

  inspectPackage(
    sourceFile: string,
  ): ImportPreview {
    return this.packageService.inspectPackage(
      sourceFile,
    );
  }

  importPackage(
    sessionId: number,
    resolutions: Record<
      string,
      ConflictPolicy
    > = {},
  ): ImportPreview {
    return this.packageService.importPackage(
      sessionId,
      resolutions,
    );
  }

  getImportSession(
    id: number,
  ): ImportSessionRecord | undefined {
    return this.packageService.getImportSession(
      id,
    );
  }

  importConflicts(
    id: number,
  ): ImportConflictRecord[] {
    return this.packageService.listImportConflicts(
      id,
    );
  }

  rebuildWorld(): RebuildResult {
    return this.packageService.rebuild();
  }

  exportWorld(
    outputPath: string,
  ): WorldExportResult {
    const validationIssues =
      this.validator
        .validate()
        .map(
          issue =>
          ({
            severity:
              issue.severity ===
                "ERROR"
                ? "ERROR"
                : "WARNING",
            ruleKey:
              issue.ruleKey,
            message:
              issue.message,
          } satisfies WorldPackageIssue),
        );

    return this.packageService.exportWorld(
      outputPath,
      validationIssues,
    );
  }

  validationProfiles(): ValidationProfile[] {
    return this.validator.profiles();
  }

  setValidationProfileEnabled(
    id: number,
    enabled: boolean,
  ): ValidationProfile {
    return this.validator.setProfileEnabled(
      id,
      enabled,
    );
  }

  setValidationRuleEnabled(
    ruleKey: string,
    enabled: boolean,
  ): void {
    this.validator.setRuleEnabled(
      ruleKey,
      enabled,
    );
  }

  private markDirectEdit(): void {
    this.database.setMetadata(
      "world_build_status",
      "DIRTY",
    );
    this.database.setMetadata(
      "world_dirty_reason",
      "DIRECT_EDIT",
    );
  }

  close(): void {
    this.database.close();
  }
}
