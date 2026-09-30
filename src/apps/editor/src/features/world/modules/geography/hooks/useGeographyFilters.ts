import { useMemo, useState } from "react";
import type { GeographyEntityKind, GeographyTreeNode } from "../types";

export function useGeographyFilters(tree: GeographyTreeNode[]) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<GeographyEntityKind | "all">("all");

  const allRows = useMemo(() => {
    function flatten(nodes: GeographyTreeNode[]): GeographyTreeNode[] {
      return nodes.flatMap(node => [node, ...flatten(node.children)]);
    }
    return flatten(tree);
  }, [tree]);

  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return allRows.filter(node =>
      (filter === "all" || node.kind === filter) &&
      (!normalized ||
        node.label.toLowerCase().includes(normalized) ||
        String(node.row.short_name ?? "").toLowerCase().includes(normalized)),
    );
  }, [allRows, filter, query]);

  const counts = useMemo(() => ({
    federation: allRows.filter(node => node.kind === "federation").length,
    continent: allRows.filter(node => node.kind === "continent").length,
    "continent-region": allRows.filter(node => node.kind === "continent-region").length,
    country: allRows.filter(node => node.kind === "country").length,
    "nation-region": allRows.filter(node => node.kind === "nation-region").length,
    city: allRows.filter(node => node.kind === "city").length,
  }), [allRows]);

  return { query, filter, setQuery, setFilter, allRows, filteredRows, counts };
}
