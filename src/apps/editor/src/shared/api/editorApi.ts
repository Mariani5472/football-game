import { domainApi } from "./domainApi";
import { entityApi } from "./entityApi";
import { exportApi } from "./exportApi";
import { templatesApi } from "./templatesApi";
import { validationApi } from "./validationApi";
import { worldApi } from "./worldApi";

export * from "./types";

export const editorApi = {
  world: worldApi,
  entity: entityApi,
  templates: templatesApi,
  domain: domainApi,
  validation: validationApi,
  export: exportApi,
};
