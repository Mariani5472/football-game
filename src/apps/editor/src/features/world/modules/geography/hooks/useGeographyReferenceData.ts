import { useState } from "react";
import type { EntityRow } from "../../../../../shared/api/editorApi";
import type { EntityFormValue } from "../../../../../shared/components";
import { useEntityQuery } from "../../../../../shared/hooks/useEntityApi";
import { editorApi } from "../../../../../shared/api/editorApi";
import type { GeographyReferenceKey } from "../components/GeographyReferencePanel";

export function useGeographyReferenceData(initialTable: GeographyReferenceKey = "currency") {
  const [table, setTable] = useState<GeographyReferenceKey>(initialTable);
  const [mode, setMode] = useState<"list" | "create" | "edit">("list");
  const [editing, setEditing] = useState<EntityRow | null>(null);
  const [values, setValues] = useState<Record<string, EntityFormValue>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const state = useEntityQuery(table, {
    page: 1,
    pageSize: 100,
    orderBy: "name",
    orderDirection: "ASC",
  });

  function selectTable(next: GeographyReferenceKey) {
    setTable(next);
    setMode("list");
    setEditing(null);
    setValues({});
    setError(null);
  }

  function startCreate(fields: Array<{ name: string; type?: string }>) {
    setMode("create");
    setEditing(null);
    setValues(Object.fromEntries(fields.map(field => [field.name, field.type === "boolean" ? false : null])));
    setError(null);
  }

  function startEdit(row: EntityRow, fields: Array<{ name: string }>) {
    setMode("edit");
    setEditing(row);
    setValues(Object.fromEntries(fields.map(field => [field.name, row[field.name] ?? ""])));
    setError(null);
  }

  async function save(fields: Array<{ name: string; type?: string }>) {
    setSaving(true);
    setError(null);
    try {
      const payload = Object.fromEntries(fields.map(field => {
        let value: EntityFormValue = values[field.name];
        if (field.type === "number" && value !== "" && value != null) value = Number(value);
        if (value === "") value = null;
        return [field.name, value];
      }));
      if (editing) await editorApi.update(table, Number(editing.id), payload);
      else await editorApi.create(table, payload);
      setMode("list");
      setEditing(null);
      setValues({});
      await state.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  }

  return {
    table, selectTable, state, mode, editing, values, saving, error,
    startCreate, startEdit, save,
    setFieldValue: (name: string, value: EntityFormValue) => setValues(current => ({ ...current, [name]: value })),
    closeForm: () => { setMode("list"); setEditing(null); setValues({}); setError(null); },
  };
}
