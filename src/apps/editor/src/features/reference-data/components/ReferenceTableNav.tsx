import { referenceGroups, type ReferenceTable, titleize } from "../config/referenceTables";

export function ReferenceTableNav({
  selected,
  onSelect,
}: {
  selected: ReferenceTable;
  onSelect: (table: ReferenceTable) => void;
}) {
  return (
    <aside className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-3">
      {Object.entries(referenceGroups).map(([group, tables]) => (
        <div key={group}>
          <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">{group}</div>
          <div className="space-y-1">
            {tables.map(table => (
              <button
                key={table}
                type="button"
                onClick={() => onSelect(table)}
                className={[
                  "w-full rounded-lg px-2.5 py-2 text-left text-xs",
                  selected === table
                    ? "bg-emerald-400/10 text-emerald-200"
                    : "text-slate-400 hover:bg-white/[0.03] hover:text-slate-200",
                ].join(" ")}
              >
                {titleize(table)}
              </button>
            ))}
          </div>
        </div>
      ))}
    </aside>
  );
}
