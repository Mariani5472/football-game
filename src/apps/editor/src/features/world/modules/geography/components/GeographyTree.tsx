import { ChevronDown, ChevronRight, Circle, Globe2, Map, MapPinned, Shield } from "lucide-react";
import { useState } from "react";
import type { GeographyTreeNode } from "../types";

interface GeographyTreeProps {
  nodes: GeographyTreeNode[];
  selectedId?: string;
  onSelect: (node: GeographyTreeNode) => void;
  search?: string;
}

export function GeographyTree({
  nodes,
  selectedId,
  onSelect,
  search = "",
}: GeographyTreeProps) {
  const normalized = search.trim().toLowerCase();

  const visible = nodes
    .map((node) => filterNode(node, normalized))
    .filter(Boolean) as GeographyTreeNode[];

  if (!visible.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-10 text-center text-sm text-slate-600">
        No locations found.
      </div>
    );
  }

  return (
    <div className="max-h-[70vh] overflow-auto rounded-2xl border border-white/10 bg-white/[0.02] p-3">
      {visible.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          selectedId={selectedId}
          onSelect={onSelect}
          depth={0}
        />
      ))}
    </div>
  );
}

function filterNode(
  node: GeographyTreeNode,
  search: string,
): GeographyTreeNode | null {
  if (!search) {
    return node;
  }

  const children = node.children
    .map((child) => filterNode(child, search))
    .filter(Boolean) as GeographyTreeNode[];

  const matches = node.label.toLowerCase().includes(search);

  if (!matches && children.length === 0) {
    return null;
  }

  return {
    ...node,
    children,
  };
}

interface TreeNodeProps {
  node: GeographyTreeNode;
  selectedId?: string;
  onSelect: (node: GeographyTreeNode) => void;
  depth: number;
}

function TreeNode({
  node,
  selectedId,
  onSelect,
  depth,
}: TreeNodeProps) {
  const hasChildren = node.children.length > 0;
  const [open, setOpen] = useState(depth < 2);
  const selected = node.id === selectedId;

  const Icon =
    node.kind === "federation"
      ? Shield
      : node.kind === "continent"
        ? Globe2
        : node.kind === "city"
          ? MapPinned
          : node.kind === "country"
            ? Circle
            : Map;

  return (
    <div>
      <div
        className={[
          "flex items-center gap-1 rounded-lg",
          selected
            ? "bg-emerald-400/10"
            : "hover:bg-white/[0.03]",
        ].join(" ")}
      >
        {hasChildren ? (
          <button
            type="button"
            aria-label={open ? "Collapse" : "Expand"}
            onClick={() => setOpen((value) => !value)}
            className="rounded p-1 text-slate-600 hover:text-slate-300"
          >
            {open ? (
              <ChevronDown size={13} />
            ) : (
              <ChevronRight size={13} />
            )}
          </button>
        ) : (
          <span className="w-6" />
        )}

        <button
          type="button"
          onClick={() => onSelect(node)}
          className={[
            "flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-2 text-left text-sm",
            selected
              ? "text-emerald-200"
              : "text-slate-400 hover:text-slate-200",
          ].join(" ")}
          style={{
            paddingLeft: 8 + depth * 14,
          }}
        >
          <Icon size={14} className="shrink-0" />

          <span className="truncate">
            {node.label}
          </span>

          {node.children.length > 0 && (
            <span className="ml-auto text-[10px] text-slate-700">
              {node.children.length}
            </span>
          )}
        </button>
      </div>

      {open &&
        node.children.map((child) => (
          <TreeNode
            key={child.id}
            node={child}
            selectedId={selectedId}
            onSelect={onSelect}
            depth={depth + 1}
          />
        ))}
    </div>
  );
}