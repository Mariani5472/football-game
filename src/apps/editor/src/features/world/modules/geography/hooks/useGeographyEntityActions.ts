import { useState } from "react";
import { editorApi } from "../../../../../shared/api/editorApi";
import type { GeographyTreeNode } from "../types";

export function useGeographyEntityActions(reload: () => Promise<void>) {
  const [deleting, setDeleting] = useState<GeographyTreeNode | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function removeEntity() {
    if (!deleting) return;

    setError(null);
    try {
      await editorApi.remove(deleting.table, deleting.entityId);
      setDeleting(null);
      setNotice("Entity deleted.");
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  function closeDeleteDialog() {
    setDeleting(null);
    setError(null);
  }

  return {
    deleting,
    setDeleting,
    notice,
    error,
    removeEntity,
    closeDeleteDialog,
  };
}
