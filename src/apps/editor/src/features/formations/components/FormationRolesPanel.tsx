import type { Role } from "../types";

export function FormationRolesPanel({
  roles,
  duties,
  positionNames,
}: {
  roles: Role[];
  duties: Array<{ id: number; name: string }>;
  positionNames: Map<number, string>;
}) {
  return (
    <div className="space-y-4">
      {roles.map(role => {
        const roleDuties = duties.filter(duty => role.dutyIds.includes(duty.id));

        return (
          <div
            key={role.id}
            className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"
          >
            <div className="text-sm font-semibold text-white">{role.name}</div>
            <div className="mt-1 text-xs text-slate-500">
              {positionNames.get(role.positionId) ?? "—"}
            </div>

            {role.description && (
              <p className="mt-3 text-xs leading-5 text-slate-500">
                {role.description}
              </p>
            )}

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                  Duties
                </div>
                <div className="flex flex-wrap gap-2">
                  {roleDuties.map(duty => (
                    <span
                      key={duty.id}
                      className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-slate-400"
                    >
                      {duty.name}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                  Key Attributes
                </div>
                <div className="flex flex-wrap gap-2">
                  {role.keyAttributes.map(entry => (
                    <span
                      key={entry.attributeId}
                      title={`Weight ${entry.weight}`}
                      className="rounded-full border border-emerald-400/10 bg-emerald-400/[0.03] px-2.5 py-1 text-[11px] text-emerald-200"
                    >
                      {entry.name ?? `#${entry.attributeId}`}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
