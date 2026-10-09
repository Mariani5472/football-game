import type { EntityRow } from "../../../shared/api";

export function PlayerPositionsPanel(props: {
  positions: EntityRow[];
  roles: EntityRow[];
  selectedPositions: number[];
  positionRatings: Record<number, string>;
  roleRatings: Record<number, string>;
  saving: boolean;
  onTogglePosition: (id: number) => void;
  onPositionRating: (id: number, value: string) => void;
  onRoleRating: (id: number, value: string) => void;
  onSave: () => void;
}) {
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Positions</h3>
            <p className="mt-1 text-xs text-slate-600">Position membership and player-specific rating.</p>
          </div>
          <span className="text-xs text-slate-600">{props.selectedPositions.length} selected</span>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {props.positions.map(position => {
            const id = Number(position.id);
            const selected = props.selectedPositions.includes(id);
            return (
              <div key={id} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input type="checkbox" checked={selected} onChange={() => props.onTogglePosition(id)} />
                  {String(position.name)}
                </label>
                {selected && (
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={props.positionRatings[id] ?? ""}
                    onChange={event => props.onPositionRating(id, event.target.value)}
                    placeholder="Rating 0-20"
                    className="mt-3 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-200"
                  />
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        <h3 className="text-sm font-semibold text-white">Roles</h3>
        <p className="mt-1 text-xs text-slate-600">Role ratings are stored in player_role_rating.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {props.roles.map(role => {
            const id = Number(role.id);
            return (
              <div key={id} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <div className="text-sm text-slate-300">{String(role.name)}</div>
                <div className="mt-1 text-[11px] text-slate-600">{String(role.description ?? "")}</div>
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={props.roleRatings[id] ?? ""}
                  onChange={event => props.onRoleRating(id, event.target.value)}
                  placeholder="Role rating 0-20"
                  className="mt-3 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-200"
                />
              </div>
            );
          })}
        </div>
        <button
          type="button"
          disabled={props.saving}
          onClick={props.onSave}
          className="mt-4 rounded-lg bg-emerald-400/10 px-4 py-2.5 text-sm text-emerald-200 disabled:opacity-50"
        >
          Save Positions & Roles
        </button>
      </section>
    </div>
  );
}
