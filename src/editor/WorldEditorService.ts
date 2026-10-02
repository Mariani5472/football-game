import path from "node:path";
import { WorldDatabase } from "../database/world/WorldDatabase.js";
import type { ListOptions, SqlKey, SqlRow, SqlValue, TableSchema } from "../database/Database.js";
import { WorldTemplateService, type TemplateRecord, type TemplateRelationOption } from "./WorldTemplateService.js";
import { WorldDomainService } from "./WorldDomainService.js";
import { WorldValidator, type ValidationIssue, type ValidationProfile } from "./WorldValidator.js";

export interface WorldEditorServiceOptions {
  filePath: string;
  createIfMissing?: boolean;
}

export class WorldEditorService {
  private readonly database: WorldDatabase;
  private readonly templatesService: WorldTemplateService;
  private readonly domainService: WorldDomainService;
  private readonly validator: WorldValidator;

  constructor(options: WorldEditorServiceOptions) {
    const create = options.createIfMissing ?? false;

    this.database = create
      ? WorldDatabase.create(path.resolve(options.filePath))
      : WorldDatabase.open(path.resolve(options.filePath));
    this.templatesService = new WorldTemplateService(this.database);
    this.domainService = new WorldDomainService(this.database);
    this.validator = new WorldValidator(this.database);
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
  validationProfiles(): ValidationProfile[] { return this.validator.profiles(); }
  setValidationProfileEnabled(id: number, enabled: boolean): ValidationProfile { return this.validator.setProfileEnabled(id, enabled); }
  setValidationRuleEnabled(ruleKey: string, enabled: boolean): void { return this.validator.setRuleEnabled(ruleKey, enabled); }

  close(): void {
    this.database.close();
  }
}