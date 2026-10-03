import type { AttributeCategory, AttributeDefinition, AttributeScale, PositionAttributeWeight, RoleAttributeWeight } from "../../attributes/types";

function label(value: string) {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, char => char.toUpperCase());
}

export function PlayerAttributesPanel(props: {
  categories: string[];
  definitions: AttributeDefinition[];
  scaleMap: Map<number, AttributeScale>;
  attributes: Record<string, Record<string, string>>;
  positionWeights: PositionAttributeWeight[];
  roleWeights: RoleAttributeWeight[];
  selectedPositions: number[];
  roleRatings: Record<number, string>;
  saving: boolean;
  onChange: (category: AttributeCategory, key: string, value: string) => void;
  onSave: () => void;
  weightedRating: (items: { attributeId: number; weight: number }[]) => number | null;
}) {
  return (
    <div className="space-y-5">
      {props.categories.map(category => {
        const definitions = props.definitions.filter(item => item.category === category && !item.is_hidden);
        return (
          <section key={category} className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <div className="mb-5">
              <h3 className="text-sm font-semibold text-white">{label(category)}</h3>
              <p className="mt-1 text-xs text-slate-600">{definitions.length} database-defined attributes</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {definitions.map(definition => {
                const scale = definition.scale_id == null ? undefined : props.scaleMap.get(definition.scale_id);
                const value = props.attributes[category]?.[definition.attribute_key] ?? "";
                return (
                  <label key={definition.id} className="space-y-1.5">
                    <span className="block text-xs font-medium text-slate-400">{definition.name}</span>
                    <input type="number" min={scale?.minimumValue} max={scale?.maximumValue} value={value} onChange={event => props.onChange(category as AttributeCategory, definition.attribute_key, event.target.value)} className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-slate-200 outline-none" />
                    <span className="block text-[10px] text-slate-700">
                      {scale ? "Scale: " + scale.name + " (" + scale.minimumValue + "–" + scale.maximumValue + ")" : "No scale configured"}
                    </span>
                  </label>
                );
              })}
            </div>
          </section>
        );
      })}
      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <div className="text-xs text-slate-500">
          Position-weighted: {props.weightedRating(props.positionWeights.filter(weight => props.selectedPositions.includes(weight.positionId)))}
          {" | "}
          Role-weighted: {props.weightedRating(props.roleWeights.filter(weight => Object.keys(props.roleRatings).map(Number).includes(weight.roleId)))}
        </div>
        <button type="button" disabled={props.saving} onClick={props.onSave} className="rounded-lg bg-emerald-400/10 px-4 py-2.5 text-sm text-emerald-200 disabled:opacity-50">
          Save Attributes
        </button>
      </div>
    </div>
  );
}