import { useState } from "react";
import { editorApi } from "../../../../../shared/api/editorApi";
import type { EntityFormValue } from "../../../../../shared/components";
import { geographySpecs, getInitialGeographyValues, normalizeGeographyValue } from "../config/geographyConfig";
import type { GeographyEntityKind, GeographyTreeNode } from "../types";

export function useGeographyEditorForm(reload: () => Promise<void>) {
  const [editing, setEditing] = useState<GeographyTreeNode | null>(null);
  const [creating, setCreating] = useState<{ kind: GeographyEntityKind; parent?: GeographyTreeNode } | null>(null);
  const [values, setValues] = useState<Record<string, EntityFormValue>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formSpec = editing || creating ? geographySpecs[(editing || creating).kind] : null;

  function startEdit(node: GeographyTreeNode) {
    setEditing(node); setCreating(null);
    setValues(Object.fromEntries(geographySpecs[node.kind].fields.map(field => [field.name, node.row[field.name]])));
    setError(null);
  }

  function startCreate(kind: GeographyEntityKind, parent?: GeographyTreeNode) {
    setEditing(null); setCreating({ kind, parent });
    setValues(getInitialGeographyValues(geographySpecs[kind], parent));
    setError(null);
  }

  function cancel() {
    setEditing(null); setCreating(null); setValues({}); setError(null);
  }

  async function save() {
    if (!formSpec) return;
    setSaving(true); setError(null);
    try {
      const payload = Object.fromEntries(formSpec.fields.map(field => [field.name, normalizeGeographyValue(values[field.name], field)]));
      if (editing) await editorApi.update(formSpec.table, editing.entityId, payload);
      else await editorApi.create(formSpec.table, payload);
      cancel();
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally { setSaving(false); }
  }

  return {
    editing, creating, values, saving, error, formSpec,
    startEdit, startCreate, cancel,
    setFieldValue: (name: string, value: EntityFormValue) => setValues(current => ({ ...current, [name]: value })),
    save,
  };
}
