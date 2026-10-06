import { DeleteDialog } from "../../../../../shared/components";
import { editorApi } from "../../../../../shared/api/editorApi";
import { GeographyBreadcrumb } from "../components/GeographyBreadcrumb";
import { GeographyCountryContext } from "../components/GeographyCountryContext";
import { ContinentCards } from "../components/ContinentCards";
import { CountryCards } from "../components/CountryCards";
import { CountryOverview } from "../components/CountryOverview";
import { GeographyEditorSection } from "../components/GeographyEditorSection";
import { GeographyEntityHeader } from "../components/GeographyEntityHeader";
import { GeographyHeader } from "../components/GeographyHeader";
import { GeographyNotice } from "../components/GeographyNotice";
import { GeographyRegionList } from "../components/GeographyRegionList";
import { GeographyRelationsPanel } from "../components/GeographyRelationsPanel";
import { useGeographyEditor } from "../hooks/useGeographyEditor";
import { useGeographyView } from "../hooks/useGeographyView";
import type { GeographyTreeNode } from "../types";

export function GeographyPage() {
  const state = useGeographyEditor();
  const view = useGeographyView(
    state.geography.tree,
    state.geography.allRows,
    state.geography.reload,
  );

  const regions = getCountryRegions(view.selectedCountry);

  async function duplicateSelected() {
    if (!view.selectedCountry) return;
    try {
      // Country duplication is not yet a dedicated domain use case; surface the capability when it exists.
      const api = editorApi.domain as typeof editorApi.domain & { duplicateCountry?: (id: number) => Promise<unknown> };
      if (!api.duplicateCountry) return;
      await api.duplicateCountry(view.selectedCountry.entityId);
      await state.geography.reload();
    } catch (cause) {
      state.geography.error;
    }
  }

  return (
    <div className="space-y-7">
      <GeographyHeader
        onAddContinent={() => state.startCreate("continent")}
      />

      <GeographyNotice
        error={state.error}
        message={view.message}
      />

      {view.view.level === "continents" && (
        <ContinentCards
          continents={state.geography.tree}
          loading={state.loading}
          onSelect={view.openContinent}
        />
      )}

      {view.view.level === "countries" && view.selectedContinent && (
        <>
          <GeographyBreadcrumb
            items={[
              {
                label: "Geography",
                onClick: view.backToContinents,
              },
              {
                label: view.selectedContinent.label,
              },
            ]}
          />

          <GeographyCountryContext
            continent={view.selectedContinent}
            countryCount={view.countryNodes.length}
            onBack={view.backToContinents}
          />

          <CountryCards
            countries={view.countryNodes}
            onSelect={view.openCountry}
          />
        </>
      )}

      {view.view.level === "country" && view.selectedCountry && (
        <>
          <GeographyBreadcrumb
            items={[
              {
                label: "Geography",
                onClick: view.backToContinents,
              },
              {
                label:
                  view.selectedContinent?.label ?? "Continent",
                onClick: view.backToCountries,
              },
              {
                label: view.selectedCountry.label,
              },
            ]}
          />

          <GeographyEntityHeader
            node={view.selectedCountry}
            formLabel="Country"
            childKind="nation-region"
            onBack={view.backToCountries}
            onEdit={() => state.startEdit(view.selectedCountry!)}
            onAddChild={() =>
              state.startCreate(
                "nation-region",
                view.selectedCountry,
              )
            }
            onDelete={() =>
              state.setDeleting(view.selectedCountry!)
            }
            onDuplicate={() => { void duplicateSelected(); }}
          />

          <CountryOverview
            country={view.selectedCountry}
            relationRows={state.relationRows}
            onAddRegion={() =>
              state.startCreate(
                "nation-region",
                view.selectedCountry!,
              )
            }
            onImport={() => view.fileRef.current?.click()}
          />

          {view.previewRegions && (
            <section className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <header className="flex flex-wrap items-center justify-between gap-2">
                <div><h3 className="text-sm font-semibold text-white">CSV preview</h3><p className="mt-1 text-xs text-slate-500">{view.previewRegions.length} rows · {view.previewRegions.filter(row => row.error).length} invalid</p></div>
                <div className="flex gap-2"><button type="button" onClick={view.cancelImport} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300">Cancel</button><button type="button" disabled={view.importing || view.previewRegions.every(row => row.error)} onClick={() => void view.commitRegions()} className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-medium text-slate-950 disabled:opacity-50">{view.importing ? "Importing…" : "Import valid rows"}</button></div>
              </header>
              <div className="max-h-64 overflow-auto rounded-lg border border-white/5"><table className="w-full text-left text-xs"><thead className="sticky top-0 bg-[#111820] text-slate-500"><tr><th className="p-2">Line</th><th className="p-2">Name</th><th className="p-2">Short name</th><th className="p-2">Population</th><th className="p-2">Status</th></tr></thead><tbody>{view.previewRegions.slice(0, 100).map(row => <tr key={row.line} className="border-t border-white/5"><td className="p-2 text-slate-500">{row.line}</td><td className="p-2 text-slate-200">{row.name}</td><td className="p-2 text-slate-400">{row.shortName ?? "—"}</td><td className="p-2 text-slate-400">{row.population ?? "—"}</td><td className={row.error ? "p-2 text-red-300" : "p-2 text-emerald-300"}>{row.error ?? "Ready"}</td></tr>)}</tbody></table></div>
              {view.previewRegions.length > 100 && <p className="text-xs text-slate-500">Showing the first 100 rows; all valid rows will be imported.</p>}
            </section>
          )}
          <input
            ref={view.fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            disabled={view.importing}
            onChange={event => {
              const file = event.target.files?.[0];
              if (file) void view.importRegions(file);
            }}
          />

          <GeographyEditorSection
            spec={state.formSpec!}
            editing={state.editing}
            creating={state.creating}
            values={state.values}
            saving={state.saving}
            error={state.formError}
            onChange={state.setFieldValue}
            onSubmit={() => void state.save()}
            onCancel={state.cancel}
          />

          <GeographyRegionList
            regions={regions}
            onSelect={node =>
              state.geography.setSelectedId(node.id)
            }
            onAdd={() =>
              state.startCreate(
                "nation-region",
                view.selectedCountry!,
              )
            }
          />

          <GeographyRelationsPanel
            selectedNode={view.selectedCountry}
            relation={state.relation}
            relationRows={state.relationRows}
            languages={state.languages}
            altNames={state.altNames}
            nativeTreatments={state.nativeTreatments}
            regionalClimates={state.regionalClimates}
            climateRows={state.climateRows}
            allRows={state.geography.allRows}
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
        </>
      )}

      <DeleteDialog
        open={Boolean(state.deleting)}
        entityName={String(state.deleting?.label ?? "")}
        onConfirm={() => void state.removeEntity()}
        onClose={state.closeDeleteDialog}
      />
    </div>
  );
}

function getCountryRegions(
  country: GeographyTreeNode | undefined,
): GeographyTreeNode[] {
  if (!country) return [];

  const regions: GeographyTreeNode[] = [];

  function visit(node: GeographyTreeNode) {
    if (node.kind === "nation-region") {
      regions.push(node);
      return;
    }

    node.children.forEach(visit);
  }

  visit(country);
  return regions;
}
