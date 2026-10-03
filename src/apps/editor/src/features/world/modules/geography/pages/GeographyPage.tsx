import { ArrowLeft, Building2, ChevronRight, Globe2, Map, Plus, Upload, UsersRound } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { DeleteDialog, EntityPicker } from "../../../../../shared/components";
import { GeographyEditorForm } from "../components/GeographyEditorForm";
import { GeographyEntityHeader } from "../components/GeographyEntityHeader";
import { GeographyRelationsPanel } from "../components/GeographyRelationsPanel";
import { useGeographyEditor } from "../hooks/useGeographyEditor";
import type { GeographyEntityKind, GeographyTreeNode, GeographyView } from "../types";
import { editorApi, type EntityRow } from "../../../../../shared/api/editorApi";

const levelLabels = {
  continents: "Continents",
  countries: "Countries",
  country: "Country",
} as const;

export function GeographyPage() {
  const state = useGeographyEditor();
  const [view, setView] = useState<GeographyView>({ level: "continents" });
  const [uploading, setUploading] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const continentCards = useMemo(() => {
    return state.geography.tree.map(node => ({
      node,
      countryCount: countKind(node, "country"),
      regionCount: countKind(node, "nation-region"),
      cityCount: countKind(node, "city"),
    }));
  }, [state.geography.tree]);

  const selectedContinent = view.level !== "continents"
    ? state.geography.tree.find(node => node.entityId === view.continentId)
    : undefined;

  const countryCards = useMemo(() => {
    if (!selectedContinent) return [];
    const countryNodes = selectedContinent.children.flatMap(collectCountries);
    const unique = new Map(countryNodes.map(node => [node.id, node]));
    return [...unique.values()].map(node => ({
      node,
      regionCount: countKind(node, "nation-region"),
      cityCount: countKind(node, "city"),
    }));
  }, [selectedContinent]);

  const selectedCountry = view.level === "country"
    ? state.geography.allRows.find(node => node.kind === "country" && node.entityId === view.countryId)
    : undefined;

  function openContinent(node: GeographyTreeNode) {
    setView({ level: "countries", continentId: node.entityId });
    state.geography.setSelectedId(node.id);
  }

  function openCountry(node: GeographyTreeNode) {
    setView({
      level: "country",
      countryId: node.entityId,
    });
    state.geography.setSelectedId(node.id);
  }

  function back() {
    if (view.level === "country" && selectedCountry) {
      const continent = findAncestorContinent(state.geography.tree, selectedCountry);
      if (continent) {
        setView({ level: "countries", continentId: continent.entityId });
        state.geography.setSelectedId(continent.id);
        return;
      }
    }

    setView({ level: "continents" });
    state.geography.setSelectedId(undefined);
    state.cancel();
  }

  async function importCsv(file: File) {
    setUploading(true);
    setImportMessage(null);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      let created = 0;
      let failed = 0;

      for (const row of rows) {
        const name = String(row.name ?? "").trim();
        if (!name) {
          failed++;
          continue;
        }

        const shortName = String(row.short_name ?? "").trim() || null;
        const population = row.population ? Number(row.population) : null;
        try {
          await editorApi.create("nation_region", {
            nation_id: Number(view.level === "country" ? view.countryId : row.nation_id),
            name,
            short_name: shortName,
            population: Number.isFinite(population) ? population : null,
          });
          created++;
        } catch {
          failed++;
        }
      }

      setImportMessage(
        failed > 0
          ? `Imported ${created} regions; ${failed} rows skipped.`
          : `Imported ${created} regions.`,
      );
      await state.geography.reload();
      if (selectedCountry) {
        state.geography.setSelectedId(`country-${selectedCountry.entityId}`);
      }
    } catch (cause) {
      setImportMessage(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-600">
            WORLD
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            GEOGRAPHY
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Explore the world through continents and countries instead of navigating raw database tables.
          </p>
        </div>

        <button
          type="button"
          onClick={() => state.startCreate("continent")}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-400/10 px-4 py-2.5 text-sm font-medium text-emerald-200 hover:bg-emerald-400/15"
        >
          <Plus size={15} /> Add continent
        </button>
      </header>

      {(state.error || importMessage) && (
        <div className={[
          "rounded-xl border px-4 py-3 text-sm",
          state.error
            ? "border-red-400/20 bg-red-400/5 text-red-200"
            : "border-emerald-400/10 bg-emerald-400/5 text-emerald-200",
        ].join(" ")}>
          {state.error ?? importMessage}
        </div>
      )}

      {view.level === "continents" && (
        <>
          <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-emerald-400/10 p-2.5 text-emerald-200">
                <Globe2 size={19} />
              </div>
              <div>
                <h2 className="font-semibold text-white">Continents</h2>
                <p className="text-xs text-slate-600">
                  {continentCards.length} geographic roots
                </p>
              </div>
            </div>

            {state.loading ? (
              <LoadingGrid />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {continentCards.map(({ node, countryCount, regionCount, cityCount }) => (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => openContinent(node)}
                    className="group rounded-2xl border border-white/10 bg-white/[0.015] p-5 text-left transition hover:border-emerald-400/20 hover:bg-emerald-400/[0.03]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-xl">
                          {continentEmoji(node.label)}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-lg font-semibold text-white">{node.label}</div>
                          <div className="text-xs text-slate-600">{node.row.short_name ?? "World region"}</div>
                        </div>
                      </div>
                      <ChevronRight size={17} className="text-slate-700 transition group-hover:text-emerald-200" />
                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-2">
                      <Stat label="Countries" value={countryCount} icon={<UsersRound size={13} />} />
                      <Stat label="Regions" value={regionCount} icon={<Map size={13} />} />
                      <Stat label="Cities" value={cityCount} icon={<Building2 size={13} />} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {view.level === "countries" && selectedContinent && (
        <>
          <Breadcrumb
            items={[
              { label: "Geography", onClick: () => back() },
              { label: selectedContinent.label },
            ]}
          />

          <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <button
                  type="button"
                  onClick={back}
                  className="mb-4 inline-flex items-center gap-2 text-xs text-slate-500 hover:text-white"
                >
                  <ArrowLeft size={13} /> Back to continents
                </button>
                <h2 className="text-2xl font-semibold text-white">{selectedContinent.label}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {countryCards.length} countries in this continent
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {countryCards.map(({ node, regionCount, cityCount }) => (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => openCountry(node)}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.015] px-4 py-4 text-left transition hover:border-emerald-400/20 hover:bg-emerald-400/[0.03]"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium text-white">{node.label}</div>
                    <div className="mt-1 text-xs text-slate-600">
                      {regionCount} regions · {cityCount} cities
                    </div>
                  </div>
                  <ChevronRight size={16} className="shrink-0 text-slate-700" />
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      {view.level === "country" && selectedCountry && (
        <>
          <Breadcrumb
            items={[
              { label: "Geography", onClick: () => setView({ level: "continents" }) },
              {
                label: findAncestorContinent(state.geography.tree, selectedCountry)?.label ?? "Continent",
                onClick: () => {
                  const continent = findAncestorContinent(state.geography.tree, selectedCountry);
                  if (continent) setView({ level: "countries", continentId: continent.entityId });
                },
              },
              { label: selectedCountry.label },
            ]}
          />

          <GeographyEntityHeader
            node={selectedCountry}
            formLabel="Country"
            childKind="nation-region"
            onBack={back}
            onEdit={() => state.startEdit(selectedCountry)}
            onAddChild={() => state.startCreate("nation-region", selectedCountry)}
            onDelete={() => state.setDeleting(selectedCountry)}
          />

          <CountryOverview
            country={selectedCountry}
            languages={state.languages}
            allRows={state.geography.allRows}
            relationRows={state.relationRows}
            onAddRegion={() => state.startCreate("nation-region", selectedCountry)}
            onImport={() => fileRef.current?.click()}
          />

          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={event => {
              const file = event.target.files?.[0];
              if (file) void importCsv(file);
            }}
          />

          {(state.editing || state.creating) && state.formSpec && (
            <GeographyEditorForm
              spec={state.formSpec}
              editing={state.editing}
              creating={state.creating}
              values={state.values}
              saving={state.saving}
              error={state.formError}
              onChange={state.setFieldValue}
              onSubmit={() => void state.save()}
              onCancel={state.cancel}
            />
          )}

          <RegionsList
            regions={selectedCountry.children.flatMap(region => region.kind === "continent-region" ? region.children : [])}
            onSelect={openCountryRegion}
            onAdd={() => state.startCreate("nation-region", selectedCountry)}
          />

          <GeographyRelationsPanel
            selectedNode={selectedCountry}
            relation={state.relation}
            relationRows={state.relationRows}
            languages={state.languages}
            altNames={state.altNames}
            nativeTreatments={state.nativeTreatments}
            regionalClimates={state.regionalClimates}
            climateRows={state.climateRows}
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

  function openCountryRegion(node: GeographyTreeNode) {
    state.geography.setSelectedId(node.id);
  }
}

function CountryOverview({
  country,
  languages,
  allRows,
  relationRows,
  onAddRegion,
  onImport,
}: {
  country: GeographyTreeNode;
  languages: EntityRow[];
  allRows: GeographyTreeNode[];
  relationRows: EntityRow[];
  onAddRegion: () => void;
  onImport: () => void;
}) {
  const regionCount = countKind(country, "nation-region");
  const cityCount = countKind(country, "city");
  const languageCount = relationRows.filter(row => row.language_id != null).length;

  const regions = country.children.flatMap(collectCountries);

  const confederation = country.row.continent_region_id != null
    ? "Configured by football/world package"
    : null;

  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_auto]">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Regions" value={regionCount} />
        <Metric label="Cities" value={cityCount} />
        <Metric label="Languages" value={languageCount || "—"} />
        <Metric label="Climate zones" value={countCountryClimates(country, allRows)} />
        <Metric label="Confederation" value={confederation ?? "—"} />
      </div>

      <div className="flex flex-wrap gap-2 lg:self-end">
        <button
          type="button"
          onClick={onImport}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/[0.04]"
        >
          <Upload size={13} /> Import CSV
        </button>
        <button
          type="button"
          onClick={onAddRegion}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-400/10 px-3 py-2 text-xs font-medium text-emerald-200"
        >
          <Plus size={13} /> Add Region
        </button>
      </div>

      <div className="hidden">{languages.length}{regions.length}</div>
    </section>
  );
}

function RegionsList({ regions, onSelect, onAdd }: {
  regions: GeographyTreeNode[];
  onSelect: (node: GeographyTreeNode) => void;
  onAdd: () => void;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-white">Regions</h3>
          <p className="mt-1 text-xs text-slate-600">Administrative areas belonging to this country.</p>
        </div>
        <button type="button" onClick={onAdd} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300">
          <Plus size={13} /> Add Region
        </button>
      </div>

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {regions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-xs text-slate-600 md:col-span-2 xl:col-span-3">
            No regions yet.
          </div>
        ) : (
          regions.map(region => (
            <button
              key={region.id}
              type="button"
              onClick={() => onSelect(region)}
              className="rounded-xl border border-white/10 bg-white/[0.015] px-4 py-3 text-left hover:border-emerald-400/20"
            >
              <div className="font-medium text-white">{region.label}</div>
              <div className="mt-1 text-xs text-slate-600">
                {countKind(region, "city")} cities
              </div>
            </button>
          ))
        )}
      </div>
    </section>
  );
}

function Breadcrumb({ items }: { items: Array<{ label: string; onClick?: () => void }> }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
      {items.map((item, index) => (
        <div key={item.label + index} className="flex items-center gap-2">
          {index > 0 && <ChevronRight size={12} className="text-slate-700" />}
          {item.onClick ? (
            <button type="button" onClick={item.onClick} className="hover:text-white">{item.label}</button>
          ) : (
            <span className="text-slate-300">{item.label}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <div className="rounded-xl bg-white/[0.025] px-3 py-2">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-slate-600">{icon}{label}</div>
      <div className="mt-1 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.14em] text-slate-600">{label}</div>
      <div className="mt-1 text-lg font-semibold text-white">{value}</div>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="h-36 animate-pulse rounded-2xl border border-white/10 bg-white/[0.02]" />
      ))}
    </div>
  );
}

function countKind(node: GeographyTreeNode, kind: GeographyEntityKind): number {
  return node.children.reduce(
    (total, child) =>
      total +
      (child.kind === kind ? 1 : 0) +
      countKind(child, kind),
    0,
  );
}

function findAncestorContinent(
  roots: GeographyTreeNode[],
  target: GeographyTreeNode,
): GeographyTreeNode | undefined {
  return roots.find(root =>
    root.id === target.id || root.children.some(child => containsNode(child, target.id)),
  );
}

function containsNode(node: GeographyTreeNode, id: string): boolean {
  return node.id === id || node.children.some(child => containsNode(child, id));
}

function collectCountries(node: GeographyTreeNode): GeographyTreeNode[] {
  return [
    ...(node.kind === "country" ? [node] : []),
    ...node.children.flatMap(collectCountries),
  ];
}

function continentEmoji(name: string): string {
  const normalized = name.toLowerCase();
  if (normalized.includes("africa")) return "🌍";
  if (normalized.includes("asia")) return "🌏";
  if (normalized.includes("europe")) return "🌍";
  if (normalized.includes("america")) return "🌎";
  if (normalized.includes("oceania")) return "🌊";
  return "🌐";
}

function countCountryClimates(country: GeographyTreeNode, allRows: GeographyTreeNode[]) {
  const cityIds = new Set(
    flattenNodes(country)
      .filter(node => node.kind === "city")
      .map(node => node.row.climate_id)
      .filter(value => value != null),
  );
  void allRows;
  return cityIds.size;
}

function flattenNodes(node: GeographyTreeNode): GeographyTreeNode[] {
  return [node, ...node.children.flatMap(flattenNodes)];
}

function parseCsv(content: string): Array<Record<string, string>> {
  const lines = content.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map(line => {
    const cells = splitCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
  });
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}
