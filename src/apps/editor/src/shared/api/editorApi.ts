import { domainApi } from "./domainApi";
import { entityApi } from "./entityApi";
import { exportApi } from "./exportApi";
import { templatesApi } from "./templatesApi";
import { validationApi } from "./validationApi";
import { worldApi } from "./worldApi";

export * from "./types";

export const editorApi = {
  ...worldApi,
  ...entityApi,
  templateRelations: templatesApi.relations,
  templates: templatesApi.list,
  createTemplate: templatesApi.create,
  duplicate: templatesApi.duplicate,
  duplicateTemplate: templatesApi.duplicateTemplate,
  deleteTemplate: templatesApi.remove,
  domainTransfer: domainApi.transfer,
  domainContract: domainApi.contract,
  domainFinance: domainApi.finance,
  domainHistory: domainApi.history,
  domainAwardHistory: domainApi.awardHistory,
  domainPressSource: domainApi.pressSource,
  domainClimateProfile: domainApi.climateProfile,
  domainAward: domainApi.award,
  domainPlayerCareer: domainApi.playerCareer,
  domainStaffCareer: domainApi.staffCareer,
  domainAchievement: domainApi.achievement,
  domainRecord: domainApi.record,
  domainDerby: domainApi.derby,
  domainClimateRegion: domainApi.climateRegion,
  domainWeatherSeason: domainApi.weatherSeason,
  domainNationalityRule: domainApi.nationalityRule,
  validationProfiles: validationApi.profiles,
  runValidation: validationApi.run,
  setValidationProfileEnabled: validationApi.setProfileEnabled,
  setValidationRuleEnabled: validationApi.setRuleEnabled,
  exportWorldDb: exportApi.worldDatabase,
};
