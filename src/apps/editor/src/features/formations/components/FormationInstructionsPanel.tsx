import type { FormationInstruction, TacticalInstruction } from "../types";

export function FormationInstructionsPanel({
  instructions,
  values,
  onChange,
}: {
  instructions: TacticalInstruction[];
  values: FormationInstruction[];
  onChange: (instructionId: number, value: string) => void;
}) {
  const valueMap = new Map(
    values.map(instruction => [instruction.instructionId, instruction.value]),
  );

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {instructions.map(instruction => {
        const value = valueMap.get(instruction.id) ?? "";
        const type = instruction.valueType.toUpperCase();

        return (
          <label
            key={instruction.id}
            className="rounded-xl border border-white/10 bg-white/[0.02] p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-white">{instruction.name}</div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.15em] text-slate-600">
                  {instruction.category}
                </div>
              </div>
              <span className="text-[10px] text-slate-600">{instruction.valueType}</span>
            </div>

            {type === "BOOLEAN" ? (
              <input
                type="checkbox"
                checked={value === "true"}
                onChange={event =>
                  onChange(instruction.id, event.target.checked ? "true" : "")
                }
                className="mt-4 h-4 w-4"
              />
            ) : (
              <input
                type={type === "NUMBER" || type === "INTEGER" ? "number" : "text"}
                value={value}
                onChange={event => onChange(instruction.id, event.target.value)}
                placeholder="Not set"
                className="mt-4 w-full rounded-lg border border-white/10 bg-[#121820] px-3 py-2 text-xs text-slate-200 outline-none focus:border-emerald-300/30"
              />
            )}
          </label>
        );
      })}

      {!instructions.length && (
        <div className="md:col-span-2 rounded-xl border border-dashed border-white/10 p-6 text-sm text-slate-500">
          No tactical instructions are defined in the world database yet.
        </div>
      )}
    </div>
  );
}
