import type { EntityRow } from "../../../../../shared/api/editorApi";
import type { GeographySpec } from "../config/geographyConfig";
import type { GeographyEntityKind, GeographyTreeNode } from "../types";
import { useEntityQuery } from "../../../../../shared/hooks/useEntityApi";

interface Props { selectedNode: GeographyTreeNode; relation?: { table: string; ownerColumn: string }; relationRows: EntityRow[]; languages: EntityRow[]; altNames: EntityRow[]; nativeTreatments: EntityRow[]; regionalClimates: EntityRow[]; climateRows: EntityRow[]; allRows: GeographyTreeNode[]; loading: boolean; error: string | null; onSaveLanguages: (items: { targetId: number|string; values: Record<string,string|number|boolean|null> }[]) => Promise<void>; onAddAlternativeName: () => Promise<void>; onRemoveAlternativeName: (row: EntityRow)=>Promise<void>; onAddNativeTreatment:()=>Promise<void>; onRemoveNativeTreatment:(row:EntityRow)=>Promise<void>; onAddRegionalClimate:()=>Promise<void>; onRemoveRegionalClimate:(row:EntityRow)=>Promise<void>; onCityClimateChange:(value:number|string)=>Promise<void>; }
import { LanguageRelationshipEditor, RelationList } from "./GeographyRelations";
import { EntityPicker } from "../../../../../shared/components";

export function GeographyRelationsPanel({selectedNode,relation,relationRows,languages,altNames,nativeTreatments,regionalClimates,climateRows,allRows,loading,error,onSaveLanguages,onAddAlternativeName,onRemoveAlternativeName,onAddNativeTreatment,onRemoveNativeTreatment,onAddRegionalClimate,onRemoveRegionalClimate,onCityClimateChange}:Props){
 if(!relation && selectedNode.kind !== "continent" && selectedNode.kind !== "country" && selectedNode.kind !== "nation-region" && selectedNode.kind !== "city") return null;
 return <div className="space-y-5">
  {relation && <LanguageRelationshipEditor title="Languages" table={relation.table} ownerColumn={relation.ownerColumn} ownerId={selectedNode.entityId} rows={relationRows} languages={languages} loading={loading} error={error} onSave={onSaveLanguages}/>} 
  {selectedNode.kind==="continent" && <RelationList title="Alternative names" rows={altNames} targetKey="name" loading={false} onAdd={()=>void onAddAlternativeName()} onRemove={row=>void onRemoveAlternativeName(row)} action="Add name"/>}
  {selectedNode.kind==="country" && <RelationList title="Native treatment targets" rows={nativeTreatments} targetRows={allRows.filter(n=>n.kind==="country").map(n=>n.row)} targetKey="target_nation_id" loading={false} onAdd={()=>void onAddNativeTreatment()} onRemove={row=>void onRemoveNativeTreatment(row)} action="Add target"/>}
  {selectedNode.kind==="nation-region" && <RelationList title="Regional climates" rows={regionalClimates} targetRows={climateRows} targetKey="climate_id" loading={false} onAdd={()=>void onAddRegionalClimate()} onRemove={row=>void onRemoveRegionalClimate(row)} action="Add climate"/>}
  {selectedNode.kind==="city" && <EntityPicker label="Climate" table="climate" value={String(selectedNode.row.climate_id ?? "")} onChange={value=>void onCityClimateChange(value)}/>} 
 </div>;
}
