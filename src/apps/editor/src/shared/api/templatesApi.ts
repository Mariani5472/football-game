import { request, serializeEntityKey } from "./client";
import type { EntityKey, TemplateRecord, TemplateRelationOption } from "./types";

export const templatesApi = {
  relations: (rootTable: string, rootKey: EntityKey) =>
    request<{ relations: TemplateRelationOption[] }>(
      `/templates/relations?rootTable=${encodeURIComponent(rootTable)}&rootKey=${encodeURIComponent(serializeEntityKey(rootKey))}`,
    ),
  list: () => request<{ templates: TemplateRecord[] }>("/templates"),
  create: (payload: { name: string; rootTable: string; rootKey: EntityKey; relations: string[] }) =>
    request<TemplateRecord>("/templates", { method: "POST", body: JSON.stringify(payload) }),
  duplicate: (payload: { rootTable: string; rootKey: EntityKey; relations: string[] }) =>
    request<{ rootTable: string; oldKey: EntityKey; newKey: EntityKey; rowsCreated: number }>(
      "/duplicate", { method: "POST", body: JSON.stringify(payload) }),
  duplicateTemplate: (id: number) =>
    request<{ rootTable: string; oldKey: EntityKey; newKey: EntityKey; rowsCreated: number }>(
      `/templates/${id}/duplicate`, { method: "POST" }),
  remove: (id: number) =>
    request<{ deleted: boolean }>(`/templates/${id}`, { method: "DELETE" }),
};
