import { useEffect, useMemo, useState } from "react";
import { Download, MapPin } from "lucide-react";
import { domainApi } from "../../../shared/api/domainApi";
import { editorApi, type EntityRow, type Scalar } from "../../../shared/api/editorApi";
import { DataTable, EntityPicker, Pagination, SearchInput, type DataTableColumn } from "../../../shared/components";
import { useEntityQuery } from "../../../shared/hooks/useEntityApi";
import { StadiumBulkEditor, StadiumBulkSelectionHint } from "./StadiumBulkEditor";

const boolLabel = (value: Scalar) => Number(value) === 1 ? "Yes" : "No";

export function StadiumCatalog({ onOpen, onCreate }: { onOpen?: (row: EntityRow) => void; onCreate?: () => void }) {
  const [search, setSearch] = useState("");
  const [trainingOnly, setTrainingOnly] = useState(false);
  const [includeExtinct, setIncludeExtinct] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<ReadonlySet<string | number>>(new Set());
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState<number | null>(null);

  useEffect(() => setPage(1), [search, trainingOnly, includeExtinct]);

  const list = useEntityQuery("stadium", {
    page,
    pageSize: 15,
    search,
    searchColumns: ["name"],
    orderBy: "name",
    orderDirection: "ASC",
  });

  const visibleRows = useMemo(
    () => list.rows.filter(row =>
      (trainingOnly ? Number(row.is_training_ground) === 1 : true) &&
      (includeExtinct ? true : Number(row.extinct) === 0),
    ),
    [list.rows, trainingOnly, includeExtinct],
  );

  useEffect(() => {
    setSelected(current => {
      const valid = new Set(visibleRows.map(row => Number(row.id)));
      const next = new Set([...current].filter(key => valid.has(Number(key))));
      return next.size === current.size ? current : next;
    });
  }, [visibleRows]);

  const relationIds = useMemo(() => ["city", "team", "pitch_type", "quality_state", "environment_quality"], []);
  const [relations, setRelations] = useState<Record<string, EntityRow[]>>({});
  useEffect(() => {
    let active = true;
    void Promise.all(relationIds.map(table => editorApi.entity.list(table, { page: 1, pageSize: 1000, orderBy: "name" })))
      .then(results => {
        if (!active) return;
        setRelations(Object.fromEntries(relationIds.map((table, index) => [table, results[index].rows])));
      })
      .catch(cause => { if (active) setError(cause instanceof Error ? cause.message : String(cause)); });
    return () => { active = false; };
  }, [relationIds]);

  const relationMap = useMemo(() => {
    const maps = new Map<string, Map<string, string>>();
    for (const table of relationIds) {
      maps.set(table, new Map((relations[table] ?? []).map(row => [String(row.id), String(row.name ?? row.short_name ?? row.full_name ?? row.id)])));
    }
    return maps;
  }, [relations, relationIds]);

  const columns: DataTableColumn<EntityRow>[] = [
    { key: "name", header: "Stadium", render: row => <div><div className="font-medium text-white">{String(row.name)}</div><div className="mt-1 flex items-center gap-2 text-[10px] text-slate-600"><MapPin size={11} /> {relationMap.get("city")?.get(String(row.city_id)) ?? `City #${row.city_id}`}</div></div> },
    { key: "capacity", header: "Capacity", render: row => <span>{row.capacity == null ? "—" : Number(row.capacity).toLocaleString()}</span> },
    { key: "pitch_type_id", header: "Pitch", render: row => <span>{relationMap.get("pitch_type")?.get(String(row.pitch_type_id)) ?? "—"}</span> },
    { key: "quality_state_id", header: "Quality", render: row => <span>{relationMap.get("quality_state")?.get(String(row.quality_state_id)) ?? "—"}</span> },
    { key: "is_training_ground", header: "Training", render: row => <span className="rounded-full border border-white/10 px-2 py-1 text-[10px]">{boolLabel(row.is_training_ground)}</span> },
    { key: "extinct", header: "State", render: row => Number(row.extinct) === 1 ? <span className="text-amber-300">Extinct</span> : <span className="text-emerald-300">Active</span> },
  ];

  const toggleRow = (row: EntityRow) => setSelected(current => {
    const next = new Set(current);
    const key = Number(row.id);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  const toggleAll = () => setSelected(current => {
    const all = visibleRows.map(row => Number(row.id));
    const allSelected = all.length > 0 && all.every(id => current.has(id));
    return allSelected ? new Set() : new Set(all);
  });

  async function duplicate(row: EntityRow) {
    const id = Number(row.id);
    setDuplicating(id); setNotice(null); setError(null);
    try { await domainApi.duplicateStadium(id); setNotice(`Duplicated “${String(row.name)}”.`); await list.reload(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setDuplicating(null); }
  }

  function edit(row: EntityRow) {
    if (onOpen) onOpen(row);
  }

  function downloadTemplate() {
    const headers = ["city_id","name","is_training_ground","owner_type_id","owner_club_id","owner_person_id","capacity","seated_capacity","expansion_capacity","seats_in_use","pitch_type_id","field_length","international_field_length","min_field_length","min_field_width","max_field_length","max_field_width","field_width","international_field_width","field_condition","grass_deterioration_rate_id","grass_recovery_level","last_pitch_replacement_date","pitch_replacement_deadline","construction_date","reconstruction_date","current_ownership_date","latitude","longitude","quality_state_id","environment_quality_id","used_by_national_team","banned_from_continental_final","extinct","has_cover","has_retractable_roof","has_underfloor_heating","has_digital_advertising","has_capacity_change"];
    const blob = new Blob([headers.join(",") + "\n"], { type: "text/csv;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = href; link.download = "stadium-import-template.csv"; link.click(); URL.revokeObjectURL(href);
  }

  const selectedRows = visibleRows.filter(row => selected.has(Number(row.id)));

  return (
    <div className="space-y-5">
      {notice && <div role="status" className="rounded-xl border border-emerald-400/15 bg-emerald-400/[0.03] p-3 text-sm text-emerald-200">{notice}</div>}
      {error && <div role="alert" className="rounded-xl border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-200">{error}</div>}

      <section className="rounded-2xl border border-white/10 bg-[#121820] p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[260px] flex-1"><SearchInput value={search} onChange={setSearch} placeholder="Search stadium name..." /></div>
          <label className="flex h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-xs text-slate-400"><input type="checkbox" checked={trainingOnly} onChange={event => setTrainingOnly(event.target.checked)} /> Training grounds</label>
          <label className="flex h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-xs text-slate-400"><input type="checkbox" checked={includeExtinct} onChange={event => setIncludeExtinct(event.target.checked)} /> Include extinct</label>
          {onCreate && <button type="button" onClick={onCreate} className="rounded-xl bg-emerald-400/10 px-3 py-2 text-xs font-medium text-emerald-200">+ New stadium</button>}
          <button type="button" onClick={downloadTemplate} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-400 hover:text-white"><Download size={13} /> CSV template</button>
          <span className="ml-auto text-xs text-slate-600">{list.total.toLocaleString()} total · {selectedRows.length} selected</span>
        </div>
      </section>

      {selectedRows.length > 0 && <StadiumBulkEditor rows={selectedRows} onSaved={async () => { setSelected(new Set()); setNotice(`Bulk update applied to ${selectedRows.length} stadium(s).`); await list.reload(); }} /> }
      {selectedRows.length > 0 && <StadiumBulkSelectionHint onClear={() => setSelected(new Set())} /> }

      <DataTable
        rows={visibleRows}
        columns={columns}
        rowKey={row => Number(row.id)}
        selection={{ selectedKeys: selected, getKey: row => Number(row.id), onToggle: row => toggleRow(row), onToggleAll: toggleAll }}
        loading={list.loading}
        error={list.error ?? error}
        onEdit={edit}
        onDuplicate={row => void duplicate(row)}
        onDelete={row => { void editorApi.entity.remove("stadium", Number(row.id)).then(() => list.reload()).catch(cause => setError(cause instanceof Error ? cause.message : String(cause))); }}
        emptyMessage={trainingOnly ? "No training grounds match the current filter." : "No stadiums found."}
      />

      {!list.loading && !list.error && <Pagination page={list.page} pageCount={list.pageCount} onPageChange={setPage} /> }
    </div>
  );
}