import { DeleteDialog } from "../../../../../shared/components";
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
