import type { FormationPosition } from "../types";

export function FormationPitch({ positions }: { positions: FormationPosition[] }) {
  return (
    <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-emerald-300/10 bg-[#10251d]">
      <div className="absolute inset-4 rounded-xl border border-white/10" />
      <div className="absolute left-1/2 top-1/2 h-px w-[calc(100%-32px)] -translate-x-1/2 bg-white/10" />
      <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />
      <div className="absolute left-1/2 top-4 h-16 w-32 -translate-x-1/2 rounded-b-xl border border-t-0 border-white/10" />
      <div className="absolute bottom-4 left-1/2 h-16 w-32 -translate-x-1/2 rounded-t-xl border border-b-0 border-white/10" />
      {positions.map(position => (
        <div key={position.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: position.x + "%", top: position.y + "%" }}>
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-300/30 bg-[#132b22] text-[11px] font-semibold text-emerald-200">
            {position.label}
          </div>
        </div>
      ))}
    </div>
  );
}
