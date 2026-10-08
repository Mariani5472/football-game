import { useMemo, useState } from "react";
import { ChevronRight, Globe2, Map, MapPinned, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { DeleteDialog, EntityForm, EntityPicker, Pagination } from "../../../../../shared/components";
import { GeographyEntityTable } from "../components/GeographyEntityTable";
import { geographyChildKind, geographyFilterItems, geographyKinds, geographySpecs, normalizeGeographyValue, getInitialGeographyValues } from "../config/geographyConfig";
import { useGeographyEditor } from "../hooks/useGeographyEditor";
import { findAncestors } from "../config/geographyTree";
import type { GeographyEntityKind, GeographyTreeNode } from "../types";
import type { EntityFormValue } from "../../../../../shared/components";

const PAGE_SIZE = 15;

export function GeographyPage() {
  const state = useGeographyEditor();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<GeographyEntityKind | "all">("all");
  const [detailNode, setDetailNode] = useState<GeographyTreeNode | undefined>();

  const allRows = state.geography.allRows;
  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return allRows.filter(node => {
      const typeMatches = filter === "all" || node.kind === filter;
      if (!typeMatches) return false;
      if (!normalized) return true;
      return (
        node.label.toLowerCase().includes(normalized) ||
        String(node.row.short_name ?? "").toLowerCase().includes(normalized)
      );
    });
  }, [allRows, filter, query]);

  const pages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const [page, setPage] = useState(1);
  const currentPage = Math.min(page, pages);
  const pageRows = filteredRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const relationLabels = useMemo(() => {
    const make = (rows: typeof state.geography.rowsByTable[keyof typeof state.geography.rowsByTable]) =>
      new Map(rows.filter(row => row.id != null).map(row => [String(row.id), String(row.name ?? row.short_name ?? row.id)]));
    return {
      federation: make(state.geography.rowsByTable.federation),
      continent: make(state.geography.rowsByTable.continent),
      continent_region: make(state.geography.rowsByTable.continentRegion),
      nation: make(state.geography.rowsByTable.country),
      nation_region: make(state.geography.rowsByTable.nationRegion),
      currency: make(state.geography.rowsByTable.currency),
      climate: make(state.geography.rowsByTable.climate),
      nationality_method: new Map(),
      nation_development_state: new Map(),
    };
  }, [state.geography.rowsByTable]);

  const activeNode = detailNode ?? state.selectedNode;
  const activeSpec = activeNode ? geographySpecs[activeNode.kind] : undefined;

  function openNode(node: GeographyTreeNode) {
    setDetailNode(node);
    state.geography.setSelectedId(node.id);
  }

  function create(kind: GeographyEntityKind, parent?: GeographyTreeNode) {
    setDetailNode(parent);
    state.startCreate(kind, parent);
  }

  function edit(node: GeographyTreeNode) {
    setDetailNode(node);
    state.startEdit(node);
  }

  function clearDetail() {
    setDetailNode(undefined);
    state.geography.setSelectedId(undefined);
    state.cancel();
  }

  const selectedAncestors = activeNode
    ? findAncestors(state.geography.tree, activeNode.id)
    : {};

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-600">WORLD</div>
          <div className="flex items-center gap-3">
            <Globe2 size={22} className="text-emerald-200" />
            <h1 className="text-3xl font-semibold tracking-tight text-white">GEOGRAPHY</h1>
          </div>
          <p className="mt-2 max-w-3xl text-sm text-slate-500">
            Navigate the complete geographic hierarchy: continent, geographic region, country, administrative region/state and city.
          </p>
        </div>
        <button type="button" onClick={() => create("continent")} className="inline-flex items-center gap-2 rounded-xl bg-emerald-400/10 px-4 py-2.5 text-sm font-medium text-emerald-200 hover:bg-emerald-400/15">
          <Plus size={15} /> New continent
        </button>
      </header>

      {(state.error || state.formError) && (
        <div className="rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-200">
          {state.error ?? state.formError}
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Continents" value={state.geography.counts.continents} />
        <Stat label="Geographic Regions" value={state.geography.counts.geographicRegions} />
        <Stat label="Countries" value={state.geography.counts.countries} />
        <Stat label="Administrative Regions" value={state.geography.counts.administrativeRegions} />
        <Stat label="Cities" value={state.geography.counts.cities} />
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#111820] p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative w-full xl:max-w-md">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
            <input
              value={query}
              onChange={event => { setQuery(event.target.value); setPage(1); }}
              placeholder="Search any geographic entity..."
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-9 pr-3 text-sm text-slate-200 outline-none focus:border-emerald-400/30"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {geographyFilterItems.map(([label, value]) => (
              <button
                key={value}
                type="button"
                onClick={() => { setFilter(value); setPage(1); }}
                className={filter === value ? "rounded-lg bg-emerald-400/10 px-3 py-2 text-xs font-medium text-emerald-200" : "rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-400 hover:bg-white/[0.04]"}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <GeographyEntityTable
          nodes={pageRows}
          spec={geographySpecs[filter === "all" ? "continent" : filter]}
          relationLabels={relationLabels}
          onSelect={openNode}
          onEdit={edit}
          onDelete={state.setDeleting}
          onAdd={() => create(filter === "all" ? "continent" : filter)}
        />

        <aside className="rounded-2xl border border-white/10 bg-[#111820] p-5">
          {!activeNode ? (
            <EmptyDetail />
          ) : (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">{activeSpec?.label}</div>
                  <h2 className="mt-2 text-xl font-semibold text-white">{activeNode.label}</h2>
                  <div className="mt-1 text-xs text-slate-500">{activeNode.row.short_name ?? "No short code"}</div>
                </div>
                <button type="button" onClick={clearDetail} className="rounded-lg p-2 text-slate-600 hover:bg-white/[0.04] hover:text-white" aria-label="Close">
                  <X size={15} />
                </button>
              </div>

              <Breadcrumb ancestors={selectedAncestors} node={activeNode} />

              <div className="grid grid-cols-2 gap-2">
                <DetailMetric label="Children" value={activeNode.children.length} />
                <DetailMetric label="ID" value={activeNode.entityId} />
              </div>

              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => edit(activeNode)} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300">
                  <Pencil size={13} /> Edit
                </button>
                {geographyChildKind[activeNode.kind] && (
                  <button type="button" onClick={() => create(geographyChildKind[activeNode.kind]!, activeNode)} className="inline-flex items-center gap-2 rounded-lg bg-emerald-400/10 px-3 py-2 text-xs font-medium text-emerald-200">
                    <Plus size={13} /> Add {geographySpecs[geographyChildKind[activeNode.kind]!].label}
                  </button>
                )}
                <button type="button" onClick={() => state.setDeleting(activeNode)} className="inline-flex items-center gap-2 rounded-lg border border-red-400/20 px-3 py-2 text-xs text-red-200">
                  <Trash2 size={13} /> Delete
                </button>
              </div>

              {state.formSpec && (state.editing?.id === activeNode.id || state.creating) && (
                <InlineForm
                  spec={state.formSpec}
                  values={state.values}
                  saving={state.saving}
                  error={state.formError}
                  parent={state.creating?.parent}
                  onChange={state.setFieldValue}
                  onSubmit={() => void state.save()}
                  onCancel={state.cancel}
                />
              )}

              {!state.formSpec && (
                <div className="space-y-3">
                  <InfoRow label="Type" value={activeSpec?.label ?? "—"} />
                  <InfoRow label="Name" value={String(activeNode.row.name ?? "—")} />
                  <InfoRow label="Short name" value={String(activeNode.row.short_name ?? "—")} />
                  {activeSpec?.fields.filter(field => !field.relation && !["name","short_name"].includes(field.name)).map(field => (
                    <InfoRow key={field.name} label={field.label} value={String(activeNode.row[field.name] ?? "—")} />
                  ))}
                </div>
              )}
            </div>
          )}
        </aside>
      </div>

      <Pagination page={currentPage} pageCount={pages} onPageChange={setPage} />

      <DeleteDialog
        open={Boolean(state.deleting)}
        entityName={String(state.deleting?.label ?? "")}
        onConfirm={() => void state.removeEntity()}
        onClose={state.closeDeleteDialog}
      />
    </div>
  );
}

function InlineForm({ spec, values, saving, error, parent, onChange, onSubmit, onCancel }: {
  spec: typeof geographySpecs[GeographyEntityKind];
  values: Record<string, EntityFormValue>;
  saving: boolean;
  error: string | null;
  parent?: GeographyTreeNode;
  onChange: (name: string, value: EntityFormValue) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const scalarFields = spec.fields.filter(field => !field.relation);
  const relationFields = spec.fields.filter(field => field.relation);

  return (
    <div className="border-t border-white/10 pt-5">
      <div className="mb-4">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">Editor</div>
        {parent && <p className="mt-1 text-xs text-slate-500">Child of {parent.label}</p>}
      </div>
      <EntityForm
        fields={scalarFields}
        values={values}
        onChange={onChange}
        onSubmit={onSubmit}
        submitLabel="Save"
        submitting={saving}
        error={error}
      >
        {relationFields.map(field => (
          <EntityPicker
            key={field.name}
            label={field.label}
            table={field.relation}
            value={values[field.name] == null ? "" : String(values[field.name])}
            onChange={value => onChange(field.name, value)}
            placeholder={`Select ${field.label.toLowerCase()}...`}
          />
        ))}
        <div className="flex justify-end">
          <button type="button" onClick={onCancel} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-400">Cancel</button>
        </div>
      </EntityForm>
    </div>
  );
}

function Breadcrumb({ ancestors, node }: { ancestors: ReturnType<typeof findAncestors>; node: GeographyTreeNode }) {
  const items = [
    ancestors.continent,
    ancestors.continentRegion,
    ancestors.country,
    ancestors.nationRegion,
  ].filter(Boolean) as GeographyTreeNode[];
  return (
    <div className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
      <span className="text-slate-600">World</span>
      {items.map(item => (
        <span key={item.id} className="inline-flex items-center gap-1">
          <ChevronRight size={11} className="text-slate-700" />
          <span>{item.label}</span>
        </span>
      ))}
      <ChevronRight size={11} className="text-slate-700" />
      <span className="text-slate-300">{node.label}</span>
    </div>
  );
}

function EmptyDetail() {
  return (
    <div className="flex min-h-[380px] flex-col items-center justify-center text-center">
      <MapPinned size={24} className="text-slate-700" />
      <h2 className="mt-3 text-sm font-semibold text-white">Select an entity</h2>
      <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">Select a row to inspect its hierarchy, edit it or create a child entity.</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.14em] text-slate-600">{label}</div>
      <div className="mt-1 text-lg font-semibold text-white">{value}</div>
    </div>
  );
}

function DetailMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white/[0.025] px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-[0.12em] text-slate-600">{label}</div>
      <div className="mt-1 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.015] px-3 py-2.5">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-right text-xs text-slate-200">{value}</span>
    </div>
  );
}
