import type { FormationPosition, Role } from "../types";

export function FormationPositionList({
  positions, roles, duties, positionNames, onRoleChange, onDutyChange,
}: {
  positions: FormationPosition[];
  roles: Role[];
  duties: Array<{ id: number; name: string }>;
  positionNames: Map<number, string>;
  onRoleChange: (positionId: number, roleId: number) => void;
  onDutyChange: (positionId: number, dutyId: number) => void;
}) {
  return (
    <div className="space-y-3">
      {positions.map(position => {
        const availableRoles = roles.filter(role => role.positionId === position.positionId);
        const availableDuties = duties;
        return (
          <div key={position.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <div className="grid gap-3 md:grid-cols-[90px_1fr_160px_130px]">
              <div>
                <div className="text-sm font-semibold text-white">{position.label}</div>
                <div className="mt-1 text-[11px] text-slate-600">{positionNames.get(position.positionId) ?? "—"}</div>
              </div>
              <div className="text-xs text-slate-500">Slot {position.id}</div>
              <select value={position.roleId} onChange={event => onRoleChange(position.id, Number(event.target.value))} className="rounded-lg border border-white/10 bg-[#121820] px-3 py-2 text-xs text-slate-300">
                {availableRoles.map(role => <option key={role.id} value={role.id}>{role.name}</option>)}
              </select>
              <select value={position.dutyId} onChange={event => onDutyChange(position.id, Number(event.target.value))} className="rounded-lg border border-white/10 bg-[#121820] px-3 py-2 text-xs text-slate-300">
                {availableDuties.map(duty => <option key={duty.id} value={duty.id}>{duty.name}</option>)}
              </select>
            </div>
          </div>
        );
      })}
    </div>
  );
}
