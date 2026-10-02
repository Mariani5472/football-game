import { useRef, useState } from "react";
import type { FormationPosition } from "../types";

interface FormationPitchProps {
  positions: FormationPosition[];
  positionNames?: Map<number, string>;
  selectedPositionId?: number | null;
  onMove?: (positionId: number, x: number, y: number) => void;
  onSelect?: (positionId: number) => void;
}

export function FormationPitch({
  positions,
  positionNames = new Map(),
  selectedPositionId,
  onMove,
  onSelect,
}: FormationPitchProps) {
  const pitchRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);

  function move(event: React.PointerEvent<HTMLDivElement>) {
    if (draggingId == null || !onMove || !pitchRef.current) return;

    const bounds = pitchRef.current.getBoundingClientRect();
    const x = Math.max(4, Math.min(96, ((event.clientX - bounds.left) / bounds.width) * 100));
    const y = Math.max(4, Math.min(96, ((event.clientY - bounds.top) / bounds.height) * 100));

    onMove(draggingId, x, y);
  }

  return (
    <div
      ref={pitchRef}
      className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-emerald-300/10 bg-[#10251d] touch-none select-none"
      onPointerMove={move}
      onPointerUp={() => setDraggingId(null)}
      onPointerCancel={() => setDraggingId(null)}
    >
      <div className="absolute inset-4 rounded-xl border border-white/10" />
      <div className="absolute left-1/2 top-1/2 h-px w-[calc(100%-32px)] -translate-x-1/2 bg-white/10" />
      <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />
      <div className="absolute left-1/2 top-4 h-16 w-32 -translate-x-1/2 rounded-b-xl border border-t-0 border-white/10" />
      <div className="absolute bottom-4 left-1/2 h-16 w-32 -translate-x-1/2 rounded-t-xl border border-b-0 border-white/10" />

      {positions.map(position => {
        const selected = selectedPositionId === position.id;

        return (
          <button
            key={position.id}
            type="button"
            className={[
              "absolute -translate-x-1/2 -translate-y-1/2 rounded-full",
              "flex h-11 w-11 cursor-grab items-center justify-center border",
              "bg-[#132b22] text-[10px] font-semibold text-emerald-200",
              "shadow-lg shadow-black/20 active:cursor-grabbing",
              selected
                ? "border-emerald-300 ring-2 ring-emerald-300/30"
                : "border-emerald-300/30",
            ].join(" ")}
            style={{ left: `${position.x}%`, top: `${position.y}%` }}
            onClick={() => onSelect?.(position.id)}
            onPointerDown={event => {
              event.currentTarget.setPointerCapture(event.pointerId);
              setDraggingId(position.id);
              onSelect?.(position.id);
            }}
          >
            {positionNames.get(position.positionId) ?? position.label}
          </button>
        );
      })}
    </div>
  );
}
