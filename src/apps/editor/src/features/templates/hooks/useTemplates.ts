import { useEffect, useMemo, useState } from "react";
import { templatesApi } from "../../../shared/api";
import type { EntityKey, TemplateRecord, TemplateRelationOption } from "../../../shared/api";
import { parseTemplateKey } from "../config/templateConfig";

export function useTemplates() {
  const [rootTable, setRootTable] = useState<"team" | "stadium" | "person" | "player" | "competition" | "formation">("team");
  const [rootKey, setRootKey] = useState("1");
  const [templateName, setTemplateName] = useState("");
  const [relations, setRelations] = useState<TemplateRelationOption[]>([]);
  const [selectedRelations, setSelectedRelations] = useState<string[]>([]);
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedRequired = useMemo(
    () => relations.filter(item => item.required).map(item => item.table),
    [relations],
  );

  async function refreshTemplates() {
    try {
      const result = await templatesApi.list();
      setTemplates(result.templates);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  useEffect(() => {
    void refreshTemplates();
  }, []);

  async function loadRelations() {
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const result = await templatesApi.relations(rootTable, parseTemplateKey(rootKey));
      setRelations(result.relations);
      setSelectedRelations(
        result.relations.filter(item => item.required).map(item => item.table),
      );
      setMessage("Relações carregadas.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setRelations([]);
      setSelectedRelations([]);
    } finally {
      setBusy(false);
    }
  }

  function selectedRelationTables() {
    return [...new Set([...selectedRequired, ...selectedRelations])];
  }

  async function duplicateNow() {
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const result = await templatesApi.duplicate({
        rootTable,
        rootKey: parseTemplateKey(rootKey),
        relations: selectedRelationTables(),
      });
      setMessage(
        `Duplicado: ${rootTable} ${JSON.stringify(result.oldKey)} → ${JSON.stringify(result.newKey)}. ${result.rowsCreated} registros.`,
      );
      await refreshTemplates();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  async function saveTemplate() {
    if (!templateName.trim()) {
      setError("Informe o nome do template.");
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      await templatesApi.create({
        name: templateName.trim(),
        rootTable,
        rootKey: parseTemplateKey(rootKey),
        relations: selectedRelationTables(),
      });
      setTemplateName("");
      setMessage("Template salvo.");
      await refreshTemplates();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  async function createFromTemplate(template: TemplateRecord) {
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const result = await templatesApi.duplicateTemplate(template.id);
      setMessage(`Criado a partir de "${template.name}": ${JSON.stringify(result.newKey)}.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  async function deleteTemplate(template: TemplateRecord) {
    if (!window.confirm(`Excluir o template "${template.name}"?`)) return;

    setBusy(true);
    setError(null);

    try {
      await templatesApi.remove(template.id);
      await refreshTemplates();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  function toggleRelation(table: string) {
    setSelectedRelations(current =>
      current.includes(table)
        ? current.filter(item => item !== table)
        : [...current, table],
    );
  }

  function changeRootTable(value: typeof rootTable) {
    setRootTable(value);
    setRelations([]);
    setSelectedRelations([]);
  }

  return {
    rootTable,
    rootKey,
    templateName,
    relations,
    selectedRelations,
    templates,
    busy,
    message,
    error,
    selectedRequired,
    setRootKey,
    setTemplateName,
    changeRootTable,
    loadRelations,
    duplicateNow,
    saveTemplate,
    createFromTemplate,
    deleteTemplate,
    toggleRelation,
    refreshTemplates,
  };
}
