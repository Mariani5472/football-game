import type { FormationPosition, Role } from "../types";

export function FormationPositionList({
  positions,
  roles,
  duties,
  positionNames,
  onRoleChange,
  onDutyChange,
  onSideChange,
  onRemove,
  onSelect,
  selectedPositionId,
}: {
  positions: FormationPosition[];
  roles: Role[];
  duties: Array<{ id: number; name: string }>;
  positionNames: Map<number, string>;
  onRoleChange: (positionId: number, roleId: number) => void;
  onDutyChange: (positionId: number, dutyId: number) => void;
  onSideChange: (positionId: number, side: FormationPosition["side"]) => void;
  onRemove: (positionId: number) => void;
  onSelect?: (positionId: number) => void;
  selectedPositionId?: number | null;
}) {
  return (
    <div className="space-y-3">
      {positions.map((position) => {
        const availableRoles = roles.filter(
          (role) => role.positionId === position.positionId,
        );
        const activeRole = roles.find((role) => role.id === position.roleId);
        const availableDuties = duties.filter((duty) =>
          activeRole?.dutyIds.includes(duty.id),
        );

        return (
          <div
            key={position.id}
            onClick={() => onSelect?.(position.id)}
            className={[
              "rounded-xl border bg-white/[0.02] p-4 transition",
              selectedPositionId === position.id
                ? "border-emerald-300/30 ring-1 ring-emerald-300/10"
                : "border-white/10",
            ].join(" ")}
          >
            <div className="grid gap-3 md:grid-cols-[110px_1fr_170px_150px_110px_auto]">
              <div>
                <div className="text-sm font-semibold text-white">
                  {positionNames.get(position.positionId) ?? position.label}
                </div>
                <div className="mt-1 text-[11px] text-slate-600">
                  x {position.x.toFixed(1)} · y {position.y.toFixed(1)}
                </div>
              </div>

              <div className="text-xs text-slate-500">
                {activeRole?.description ??
                  "Assign a role to define the responsibilities of this slot."}
              </div>

              <select
                value={position.roleId || ""}
                onChange={(event) => {
                  event.stopPropagation();
                  onRoleChange(position.id, Number(event.target.value));
                }}
                className="rounded-lg border border-white/10 bg-[#121820] px-3 py-2 text-xs text-slate-300"
              >
                <option value="">Role</option>
                {availableRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>

              <select
                value={position.dutyId || ""}
                onChange={(event) => {
                  event.stopPropagation();
                  onDutyChange(position.id, Number(event.target.value));
                }}
                disabled={availableDuties.length === 0}
                className="rounded-lg border border-white/10 bg-[#121820] px-3 py-2 text-xs text-slate-300 disabled:opacity-50"
              >
                <option value="">Duty</option>
                {availableDuties.map((duty) => (
                  <option key={duty.id} value={duty.id}>
                    {duty.name}
                  </option>
                ))}
              </select>

              <select
                value={position.side}
                onChange={(event) => {
                  event.stopPropagation();
                  onSideChange(
                    position.id,
                    event.target.value as FormationPosition["side"],
                  );
                }}
                className="rounded-lg border border-white/10 bg-[#121820] px-3 py-2 text-xs text-slate-300"
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>

              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onRemove(position.id);
                }}
                className="rounded-lg border border-red-400/10 px-3 py-2 text-xs text-red-300 hover:bg-red-400/5"
              >
                Remove
              </button>
            </div>
          </div>
        );
      })}

      {!positions.length && (
        <div className="rounded-xl border border-dashed border-white/10 p-6 text-sm text-slate-500">
          Add positions from the selector above to start building the formation.
        </div>
      )}
    </div>
  );
}
