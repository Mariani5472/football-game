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

    try {
      const rows = parseCsv(await file.text());
      let created = 0;
      let skipped = 0;

      for (const row of rows) {
        const name = String(row.name ?? "").trim();

        if (!name) {
          skipped++;
          continue;
        }

        try {
          const population =
            row.population === ""
              ? null
              : Number(row.population);

          await editorApi.entity.create("nation_region", {
            nation_id: view.countryId,
            name,
            short_name:
              String(row.short_name ?? "").trim() || null,
            population:
              Number.isFinite(population)
                ? population
                : null,
          });

          created++;
        } catch {
          skipped++;
        }
      }

      setMessage(
        skipped
          ? `Imported ${created} regions; ${skipped} rows skipped.`
          : `Imported ${created} regions.`,
      );
      await reload();
    } catch (cause) {
      setMessage(
        cause instanceof Error
          ? cause.message
          : String(cause),
      );
    } finally {
      setImporting(false);

      if (fileRef.current) {
        fileRef.current.value = "";
      }
    }
  }

  return {
    view,
    selectedContinent,
    selectedCountry,
    countryNodes,
    importing,
    message,
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

  return lines.slice(1).map(line => {
    const cells = splitCsvLine(line);

    return Object.fromEntries(
      headers.map((header, index) => [
        header,
        cells[index] ?? "",
      ]),
    );
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
