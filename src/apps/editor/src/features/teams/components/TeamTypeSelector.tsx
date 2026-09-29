import type { TeamKind } from "../types";

interface TeamTypeSelectorProps {
  value: TeamKind;
  onChange: (value: TeamKind) => void;
}

export function TeamTypeSelector({
  value,
  onChange,
}: TeamTypeSelectorProps) {
  return (
    <div>
      <div className="mb-3 text-xs font-medium text-slate-400">
        Type
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 hover:bg-white/[0.03]">
          <input
            type="radio"
            name="team-type"
            value="CLUB"
            checked={value === "CLUB"}
            onChange={() => onChange("CLUB")}
          />
          <span className="text-sm text-slate-200">
            Club
          </span>
        </label>

        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 hover:bg-white/[0.03]">
          <input
            type="radio"
            name="team-type"
            value="NATIONAL_TEAM"
            checked={value === "NATIONAL_TEAM"}
            onChange={() => onChange("NATIONAL_TEAM")}
          />
          <span className="text-sm text-slate-200">
            National Team
          </span>
        </label>
      </div>
    </div>
  );
}