import type { FormationPosition, Role } from "../types";

export function TacticalPositionInspector({
  position,
  positionName,
  role,
  duty,
}: {
  position: FormationPosition | null;
  positionName?: string;
  role?: Role;
  duty?: { id: number; name: string };
}) {
  if (!position) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.01] p-5 text-sm text-slate-500">
        Select a player slot on the pitch to inspect its tactical behavior.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#121820] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300/70">
            Selected slot
          </div>
          <h2 className="mt-1 text-lg font-semibold text-white">
            {positionName ?? position.label}
          </h2>
        </div>
        <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-slate-500">
          {position.side}
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Detail label="Coordinates" value={`${position.x.toFixed(1)} / ${position.y.toFixed(1)}`} />
        <Detail label="Role" value={role?.name ?? "Not assigned"} />
        <Detail label="Duty" value={duty?.name ?? "Not assigned"} />
        <Detail
          label="Key attributes"
          value={
            role?.keyAttributes?.length
              ? role.keyAttributes.map((attribute) => attribute.name ?? `#${attribute.attributeId}`).join(", ")
              : "Role attributes not loaded"
          }
        />
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/[0.03] p-3">
      <div className="text-[10px] uppercase tracking-[0.14em] text-slate-600">{label}</div>
      <div className="mt-1 text-xs text-slate-300">{value}</div>
    </div>
  );
}
