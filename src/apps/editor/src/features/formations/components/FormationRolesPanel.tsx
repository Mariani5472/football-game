import type { Role } from "../types";

export function FormationRolesPanel({
  roles, duties, positionNames,
}: {
  roles: Role[];
  duties: Array<{ id: number; name: string }>;
  positionNames: Map<number, string>;
}) {
  return (
    <div className="space-y-4">
      {roles.map(role => (
        <div key={role.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="text-sm font-semibold text-white">{role.name}</div>
          <div className="mt-1 text-xs text-slate-500">{positionNames.get(role.positionId) ?? "—"}</div>
          {role.description && <p className="mt-3 text-xs leading-5 text-slate-500">{role.description}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            {duties.map(duty => <span key={duty.id} className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-slate-400">{duty.name}</span>)}
          </div>
        </div>
      ))}
    </div>
  );
}
