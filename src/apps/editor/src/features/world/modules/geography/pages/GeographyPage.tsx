import { useGeographyEditor } from "../hooks/useGeographyEditor";
import { GeographyBreadcrumb } from "../components/GeographyBreadcrumb";
import { GeographyEditorForm } from "../components/GeographyEditorForm";
import { GeographyEntityHeader } from "../components/GeographyEntityHeader";
import { GeographyFilteredTable } from "../components/GeographyFilteredTable";
import { GeographyFilters } from "../components/GeographyFilters";
import { GeographyRelationsPanel } from "../components/GeographyRelationsPanel";
import { GeographyTree } from "../components/GeographyTree";

export function GeographyPage() {
  const state = useGeographyEditor();

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">WORLD DB</div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Geography</h1>
          <p className="mt-2 text-sm text-slate-500">Federation → Continent → Continent Region → Country → Nation Region → City</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void state.reload()} className="rounded-lg border border-white/10 px-3 py-2.5 text-sm text-slate-400">Reload</button>
          <button type="button" onClick={() => state.startCreate("federation")} className="rounded-lg bg-emerald-400/10 px-3.5 py-2.5 text-sm font-medium text-emerald-200">+ New Federation</button>
        </div>
      </header>

      {state.notice && <div className="rounded-xl border border-emerald-400/10 bg-emerald-400/5 px-4 py-3 text-sm text-emerald-200">{state.notice}</div>}
      {state.error && <div className="rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-200">{state.error}</div>}

      <GeographyFilters counts={state.counts} filter={state.filter} query={state.query} onFilterChange={state.setFilter} onQueryChange={state.setQuery} />

      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <GeographyTree nodes={state.geography.tree} selectedId={state.geography.selectedId} onSelect={node => state.geography.setSelectedId(node.id)} search={state.query} />

        <div className="space-y-5">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4">
            <GeographyBreadcrumb selection={state.geography.selection} />
          </div>

          {state.selectedNode && (
            <GeographyEntityHeader
              node={state.selectedNode}
              formLabel={state.formSpec?.label}
              childKind={state.childKind}
              onEdit={() => state.startEdit(state.selectedNode!)}
              onAddChild={() => state.childKind && state.startCreate(state.childKind, state.selectedNode!)}
              onDelete={() => state.setDeleting(state.selectedNode!)}
            />
          )}

          {(state.editing || state.creating) && state.formSpec && (
            <GeographyEditorForm
              spec={state.formSpec}
              editing={state.editing}
              creating={state.creating}
              values={state.values}
              saving={state.saving}
              error={state.formError}
              onChange={state.setFieldValue}
              onSubmit={() => void state.saveEntity()}
              onCancel={state.cancelForm}
            />
          )}

          {state.selectedNode && state.relation && (
            <GeographyRelationsPanel
              selectedNode={state.selectedNode}
              relation={state.relation}
              relationRows={state.relationRows}
              languages={state.languageQuery.rows}
              altNames={state.altNames}
              nativeTreatments={state.nativeTreatments}
              regionalClimates={state.regionalClimates}
              climateRows={state.climateQuery.rows}
              allRows={state.allRows}
              loading={state.relationLoading}
              error={state.relationError}
              onSaveLanguages={state.saveLanguages}
              onAddAlternativeName={state.addAlternativeName}
              onRemoveAlternativeName={state.removeAlternativeName}
              onAddNativeTreatment={state.addNativeTreatment}
              onRemoveNativeTreatment={state.removeNativeTreatment}
              onAddRegionalClimate={state.addRegionalClimate}
              onRemoveRegionalClimate={state.removeRegionalClimate}
              onCityClimateChange={state.updateCityClimate}
            />
          )}

          <GeographyFilteredTable rows={state.filteredRows} loading={state.geography.loading} error={state.geography.error} onSelect={node => state.geography.setSelectedId(node.id)} onEdit={state.startEdit} onDelete={state.setDeleting} />
        </div>
      </div>

      <DeleteDialog open={Boolean(state.deleting)} entityName={String(state.deleting?.label ?? "")} onConfirm={() => void state.removeEntity()} onClose={state.closeDeleteDialog} />
    </div>
  );
}