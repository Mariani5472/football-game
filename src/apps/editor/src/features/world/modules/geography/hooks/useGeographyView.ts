import { useMemo, useRef, useState } from "react";
import { editorApi } from "../../../../../shared/api/editorApi";
import type { GeographyTreeNode, GeographyView } from "../types";

export function useGeographyView(
  tree: GeographyTreeNode[],
  allRows: GeographyTreeNode[],
  reload: () => Promise<void>,
) {
  const [view, setView] = useState<GeographyView>({ level: "continents" });
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [previewRegions, setPreviewRegions] = useState<Array<{ line: number; name: string; shortName?: string; population?: number; error?: string }> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const selectedContinent = useMemo(() => {
    if (view.level !== "countries") return undefined;
    return tree.find(node => node.entityId === view.continentId);
  }, [tree, view]);

  const selectedCountry = useMemo(() => {
    if (view.level !== "country") return undefined;
    return allRows.find(
      node =>
        node.kind === "country" &&
        node.entityId === view.countryId,
    );
  }, [allRows, view]);

  const countryNodes = useMemo(() => {
    if (!selectedContinent) return [];

    const unique = new Map<string, GeographyTreeNode>();

    function visit(node: GeographyTreeNode) {
      if (node.kind === "country") {
        unique.set(node.id, node);
      }
      node.children.forEach(visit);
    }

    visit(selectedContinent);
    return [...unique.values()];
  }, [selectedContinent]);

  function openContinent(node: GeographyTreeNode) {
    setView({
      level: "countries",
      continentId: node.entityId,
    });
  }

  function openCountry(node: GeographyTreeNode) {
    setView({
      level: "country",
      countryId: node.entityId,
    });
  }

  function backToContinents() {
    setView({ level: "continents" });
  }

  function backToCountries() {
    if (!selectedCountry) {
      backToContinents();
      return;
    }

    const continent = findAncestorContinent(tree, selectedCountry);
    if (!continent) {
      backToContinents();
      return;
    }

    setView({
      level: "countries",
      continentId: continent.entityId,
    });
  }

  async function importRegions(file: File) {
    if (view.level !== "country") return;
    setImporting(true);
    setMessage(null);
    setPreviewRegions(null);
    try {
      const rows = parseCsv(await file.text());
      if (!rows.length) throw new Error("CSV has no data rows.");
      if (!Object.keys(rows[0]).includes("name")) {
        throw new Error('CSV must contain a "name" column.');
      }

      const payload = rows.map(row => ({
        line: Number(row.__line),
        values: {
          name: String(row.name ?? "").trim(),
          short_name: String(row.short_name ?? "").trim() || null,
          population: String(row.population ?? "").trim() === ""
            ? null
            : Number(row.population),
        },
      }));

      const preview = await editorApi.entity.csvPreview("nation_region", payload);
      setPreviewRegions(rows.map((row, index) => {
        const issue = preview.errors.find(error => error.line === Number(row.__line));
        const populationText = String(row.population ?? "").trim();
        return {
          line: Number(row.__line),
          name: String(row.name ?? "").trim(),
          shortName: String(row.short_name ?? "").trim() || undefined,
          population: populationText === "" ? undefined : Number(row.population),
          error: issue?.message,
        };
      }));
      setMessage(`Preview ready: ${preview.valid}/${preview.total} valid rows.`);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function commitRegions() {
    if (view.level !== "country" || !previewRegions) return;
    const valid = previewRegions.filter(row => !row.error).map(({ error: _error, ...row }) => row);
    setImporting(true);
    setMessage(null);
    try {
      const result = await editorApi.domain.importNationRegions(view.countryId, valid);
      const details = result.errors.map(item => `Line ${item.line}: ${item.message}`).join("; ");
      setMessage(`Imported ${result.imported} regions.${result.errors.length ? ` ${result.errors.length} row(s) failed: ${details}` : ""}`);
      setPreviewRegions(null);
      await reload();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setImporting(false);
    }
  }
  return {
    view,
    selectedContinent,
    selectedCountry,
    countryNodes,
    importing,
    message,
    previewRegions,
    commitRegions,
    cancelImport: () => setPreviewRegions(null),
    fileRef,
    openContinent,
    openCountry,
    backToContinents,
    backToCountries,
    importRegions,
  };
}

function findAncestorContinent(
  roots: GeographyTreeNode[],
  target: GeographyTreeNode,
): GeographyTreeNode | undefined {
  return roots.find(root =>
    root.id === target.id ||
    root.children.some(child =>
      containsNode(child, target.id),
    ),
  );
}

function containsNode(
  node: GeographyTreeNode,
  id: string,
): boolean {
  return (
    node.id === id ||
    node.children.some(child => containsNode(child, id))
  );
}

function parseCsv(
  content: string,
): Array<Record<string, string>> {
  const lines = content
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]);

  return lines.slice(1).map((line, index) => {
    const cells = splitCsvLine(line);

    return { __line: String(index + 2), ...Object.fromEntries(
      headers.map((header, index) => [
        header,
        cells[index] ?? "",
      ]),
    ) };
  });
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index++) {
    const char = line[index];

    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index++;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (char === "," && !quoted) {
      result.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current.trim());
  return result;
}
