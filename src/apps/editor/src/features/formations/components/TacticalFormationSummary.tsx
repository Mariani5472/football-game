import type { FormationPosition, Role } from "../types";

export function TacticalFormationSummary({
  positions,
  roles,
  duties,
}: {
  positions: FormationPosition[];
  roles: Role[];
  duties: Array<{ id: number; name: string }>;
}) {
  const assignedRoles = positions.filter((position) => position.roleId > 0).length;
  const assignedDuties = positions.filter((position) => position.dutyId > 0).length;

  return (
    <div className="grid gap-3 md:grid-cols-4">
      <Metric label="Slots" value={`${positions.length} / 11`} />
      <Metric label="Roles" value={`${assignedRoles} / ${positions.length}`} />
      <Metric label="Duties" value={`${assignedDuties} / ${positions.length}`} />
      <Metric label="Role library" value={String(roles.length)} suffix={duties.length ? ` · ${duties.length} duties` : undefined} />
    </div>
  );
}

function Metric({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix?: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold text-white">
        {value}
        {suffix && <span className="ml-1 text-xs font-normal text-slate-600">{suffix}</span>}
      </div>
    </div>
  );
}
