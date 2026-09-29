import {
  ChevronRight,
  Globe2,
  Map,
  MapPinned,
} from "lucide-react";

import type {
  GeographyTreeNode,
} from "../types";

interface GeographyTreeProps {
  nodes: GeographyTreeNode[];

  selectedId?: string;

  onSelect: (
    node: GeographyTreeNode,
  ) => void;
}

export function GeographyTree({
  nodes,
  selectedId,
  onSelect,
}: GeographyTreeProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3">
      {nodes.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

interface TreeNodeProps {
  node: GeographyTreeNode;
  selectedId?: string;

  onSelect: (
    node: GeographyTreeNode,
  ) => void;

  depth?: number;
}

function TreeNode({
  node,
  selectedId,
  onSelect,
  depth = 0,
}: TreeNodeProps) {
  const selected =
    selectedId === node.id;

  const hasChildren =
    Boolean(node.children?.length);

  const Icon =
    node.kind === "city"
      ? MapPinned
      : node.kind === "continent"
        ? Globe2
        : Map;

  return (
    <div>
      <button
        type="button"
        onClick={() => onSelect(node)}
        className={[
          "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition",
          selected
            ? "bg-emerald-400/10 text-emerald-200"
            : "text-slate-400 hover:bg-white/[0.03] hover:text-slate-200",
        ].join(" ")}
        style={{
          paddingLeft:
            12 + depth * 18,
        }}
      >
        {hasChildren ? (
          <ChevronRight
            size={14}
            className="text-slate-600"
          />
        ) : (
          <span className="w-[14px]" />
        )}

        <Icon size={15} />

        <span>{node.label}</span>
      </button>

      {node.children?.map(
        (child) => (
          <TreeNode
            key={child.id}
            node={child}
            selectedId={selectedId}
            onSelect={onSelect}
            depth={depth + 1}
          />
        ),
      )}
    </div>
  );
}