import { useMemo, useState } from "react";
import { editorApi, type EntityRow } from "../../../../../shared/api/editorApi";
import type { EntityFormValue } from "../../../../../shared/components";
import { useEntityQuery } from "../../../../../shared/hooks/useEntityApi";
import { useGeography } from "./useGeography";
import { geographyChildKind, geographySpecs, getInitialGeographyValues, normalizeGeographyValue } from "../config/geographyConfig";
import type { GeographyEntityKind, GeographyTreeNode } from "../types";

const referenceConfigs = {
  currency: { title: "Currencies", fields: [{name:"name",label:"Name",required:true},{name:"exchange_rate",label:"Exchange Rate",type:"number" as const}], columns: [] },
  nationality_method: { title: "Nationality Methods", fields: [{name:"name",label:"Name",required:true}], columns: [] },
  nation_development_state: { title: "Development States", fields: [{name:"name",label:"Name",required:true},{name:"index_value",label:"Index",type:"number" as const}], columns: [] },
  language_family: { title: "Language Families", fields: [{name:"name",label:"Name",required:true}], columns: [] },
  language_group: { title: "Language Groups", fields: [{name:"family_id",label:"Family",relation:"language_family"},{name:"name",label:"Name",required:true}], columns: [] },
  language_subgroup: { title: "Language Subgroups", fields: [{name:"group_id",label:"Group",relation:"language_group"},{name:"name",label:"Name",required:true}], columns: [] },
  language: { title: "Languages", fields: [{name:"name",label:"Name",required:true}], columns: [] },
  climate: { title: "Climates", fields: [{name:"name",label:"Name",required:true},{name:"short_name",label:"Short Name"}], columns: [] },
  weekday: { title: "Weekdays", fields: [{name:"name",label:"Name",required:true}], columns: [] },
} as const;

type ReferenceKey = keyof typeof referenceConfigs;
type RelationState = { table: string; ownerColumn: string } | undefined;

export function useGeographyEditor() {
  const geography = useGeography();
  const [query,setQuery]=useState("");
  const [filter,setFilter]=useState<GeographyEntityKind|"all">("all");
  const [editing,setEditing]=useState<GeographyTreeNode|null>(null);
  const [creating,setCreating]=useState<{kind:GeographyEntityKind;parent?:GeographyTreeNode}|null>(null);
  const [values,setValues]=useState<Record<string,EntityFormValue>>({});
  const [saving,setSaving]=useState(false);
  const [formError,setFormError]=useState<string|null>(null);
  const [notice,setNotice]=useState<string|null>(null);
  const [deleting,setDeleting]=useState<GeographyTreeNode|null>(null);
  const selectedNode=geography.selectedNode;
  const formSpec=editing||creating ? geographySpecs[(editing||creating)!.kind] : null;

  const relation:RelationState=selectedNode?.kind==="country"?{table:"nation_language",ownerColumn:"nation_id"}:selectedNode?.kind==="nation-region"?{table:"nation_region_language",ownerColumn:"nation_region_id"}:selectedNode?.kind==="city"?{table:"city_language",ownerColumn:"city_id"}:undefined;
  const relationQuery=useEntityQuery(relation?.table??"nation_language",{page:1,pageSize:100,orderBy:"id",orderDirection:"ASC"});
  const languageQuery=useEntityQuery("language",{page:1,pageSize:100,orderBy:"name",orderDirection:"ASC"});
  const climateQuery=useEntityQuery("climate",{page:1,pageSize:100,orderBy:"name",orderDirection:"ASC"});
  const altNameQuery=useEntityQuery("continent_alt_name",{page:1,pageSize:100,orderBy:"name",orderDirection:"ASC"});
  const nativeTreatmentQuery=useEntityQuery("nation_native_treatment",{page:1,pageSize:100,orderBy:"id",orderDirection:"ASC"});
  const regionClimateQuery=useEntityQuery("climate_nation_region",{page:1,pageSize:100,orderBy:"id",orderDirection:"ASC"});

  const allRows=useMemo(()=>geography.tree.flatMap(function walk(n):GeographyTreeNode[]{return [n,...n.children.flatMap(walk)]}),[geography.tree]);
  const filteredRows=useMemo(()=>{const q=query.trim().toLowerCase();return allRows.filter(n=>(filter==="all"||n.kind===filter)&&(!q||n.label.toLowerCase().includes(q)||String(n.row.short_name??"").toLowerCase().includes(q)))},[allRows,filter,query]);
  const counts=useMemo(()=>({federation:allRows.filter(n=>n.kind==="federation").length,continent:allRows.filter(n=>n.kind==="continent").length,"continent-region":allRows.filter(n=>n.kind==="continent-region").length,country:allRows.filter(n=>n.kind==="country").length,"nation-region":allRows.filter(n=>n.kind==="nation-region").length,city:allRows.filter(n=>n.kind==="city").length}),[allRows]);
  const relationRows=useMemo(()=>selectedNode&&relation?relationQuery.rows.filter(r=>Number(r[relation.ownerColumn])===selectedNode.entityId):[],[relationQuery.rows,relation,selectedNode?.entityId]);
  const altNames=useMemo(()=>selectedNode?.kind==="continent"?altNameQuery.rows.filter(r=>Number(r.continent_id)===selectedNode.entityId):[],[altNameQuery.rows,selectedNode]);
  const nativeTreatments=useMemo(()=>selectedNode?.kind==="country"?nativeTreatmentQuery.rows.filter(r=>Number(r.root_nation_id)===selectedNode.entityId):[],[nativeTreatmentQuery.rows,selectedNode]);
  const regionalClimates=useMemo(()=>selectedNode?.kind==="nation-region"?regionClimateQuery.rows.filter(r=>Number(r.nation_region_id)===selectedNode.entityId):[],[regionClimateQuery.rows,selectedNode]);

  function startEdit(node:GeographyTreeNode){setEditing(node);setCreating(null);setValues(Object.fromEntries(geographySpecs[node.kind].fields.map(f=>[f.name,node.row[f.name]])));setFormError(null);}
  function startCreate(kind:GeographyEntityKind,parent?:GeographyTreeNode){setEditing(null);setCreating({kind,parent});setValues(getInitialGeographyValues(geographySpecs[kind],parent));setFormError(null);}
  function cancelForm(){setEditing(null);setCreating(null);setFormError(null);}
  async function saveEntity(){if(!formSpec)return;setSaving(true);setFormError(null);const snapshot=editing;try{const payload=Object.fromEntries(formSpec.fields.map(f=>[f.name,normalizeGeographyValue(values[f.name],f)]));if(snapshot)await editorApi.update(formSpec.table,snapshot.entityId,payload);else await editorApi.create(formSpec.table,payload);cancelForm();setNotice(snapshot?"Entity updated.":"Entity created.");await geography.reload();}catch(e){setFormError(e instanceof Error?e.message:String(e));}finally{setSaving(false);}}
  async function removeEntity(){if(!deleting)return;setSaving(true);setFormError(null);try{await editorApi.remove(deleting.table,deleting.entityId);setNotice("Entity deleted.");setDeleting(null);await geography.reload();}catch(e){setFormError(e instanceof Error?e.message:String(e));}finally{setSaving(false);}}
  async function saveLanguages(items:{targetId:number|string;values:Record<string,any>}[]){if(!selectedNode||!relation)return;const next=new Map(items.map(i=>[String(i.targetId),i]));for(const row of relationRows){const item=next.get(String(row.language_id));if(!item)await editorApi.remove(relation.table,row.id as number);else await editorApi.update(relation.table,row.id as number,item.values);}for(const item of items)if(!relationRows.some(r=>String(r.language_id)===String(item.targetId)))await editorApi.create(relation.table,{[relation.ownerColumn]:selectedNode.entityId,language_id:item.targetId,percentage:item.values.percentage??0});await relationQuery.reload();}
  async function addAlternativeName(){if(!selectedNode||selectedNode.kind!=="continent")return;const name=window.prompt("Alternative continent name");if(name?.trim()){await editorApi.create("continent_alt_name",{continent_id:selectedNode.entityId,name:name.trim()});await altNameQuery.reload();}}
  async function removeAlternativeName(row:EntityRow){await editorApi.remove("continent_alt_name",row.id as number);await altNameQuery.reload();}
  async function addNativeTreatment(){if(!selectedNode||selectedNode.kind!=="country")return;const target=allRows.find(n=>n.kind==="country"&&n.entityId!==selectedNode.entityId&&!nativeTreatments.some(r=>Number(r.target_nation_id)===n.entityId));if(target){await editorApi.create("nation_native_treatment",{root_nation_id:selectedNode.entityId,target_nation_id:target.entityId});await nativeTreatmentQuery.reload();}}
  async function removeNativeTreatment(row:EntityRow){await editorApi.remove("nation_native_treatment",row.id as number);await nativeTreatmentQuery.reload();}
  async function addRegionalClimate(){if(!selectedNode||selectedNode.kind!=="nation-region")return;const climate=climateQuery.rows.find(c=>!regionalClimates.some(r=>Number(r.climate_id)===Number(c.id)));if(climate){await editorApi.create("climate_nation_region",{nation_region_id:selectedNode.entityId,climate_id:climate.id});await regionClimateQuery.reload();}}
  async function removeRegionalClimate(row:EntityRow){await editorApi.remove("climate_nation_region",row.id as number);await regionClimateQuery.reload();}
  async function updateCityClimate(value:number|string){if(!selectedNode||selectedNode.kind!=="city")return;await editorApi.update("city",selectedNode.entityId,{climate_id:value===""?null:Number(value)});await geography.reload();}

  const [referenceTable,setReferenceTableState]=useState<ReferenceKey>("currency");
  const [referenceMode,setReferenceMode]=useState<"list"|"create"|"edit">("list");
  const [referenceEditing,setReferenceEditing]=useState<EntityRow|null>(null);
  const [referenceValues,setReferenceValues]=useState<Record<string,EntityFormValue>>({});
  const [referenceSaving,setReferenceSaving]=useState(false);
  const [referenceError,setReferenceError]=useState<string|null>(null);
  const referenceConfig=referenceConfigs[referenceTable];
  const referenceState=useEntityQuery(referenceTable,{page:1,pageSize:100,orderBy:"name",orderDirection:"ASC"});
  function setReferenceTable(value:ReferenceKey){setReferenceTableState(value);setReferenceMode("list");setReferenceEditing(null);}
  function startReferenceCreate(){setReferenceMode("create");setReferenceEditing(null);setReferenceValues(Object.fromEntries(referenceConfig.fields.map(f=>[f.name,f.type==="boolean"?false:null])));setReferenceError(null);}
  function startReferenceEdit(row:EntityRow){setReferenceMode("edit");setReferenceEditing(row);setReferenceValues(Object.fromEntries(referenceConfig.fields.map(f=>[f.name,row[f.name]])));setReferenceError(null);}
  async function saveReference(){setReferenceSaving(true);setReferenceError(null);const snapshot=referenceEditing;try{const payload=Object.fromEntries(referenceConfig.fields.map(f=>[f.name,normalizeGeographyValue(referenceValues[f.name],f)]));if(snapshot)await editorApi.update(referenceTable,snapshot.id as number,payload);else await editorApi.create(referenceTable,payload);setReferenceMode("list");setReferenceEditing(null);setNotice(snapshot?"Reference updated.":"Reference created.");await referenceState.reload();}catch(e){setReferenceError(e instanceof Error?e.message:String(e));}finally{setReferenceSaving(false);}}
  return {geography,query,filter,setQuery,setFilter,counts,allRows,filteredRows,selectedNode,childKind:selectedNode?geographyChildKind[selectedNode.kind]:undefined,formSpec,editing,creating,values,saving,formError,notice,error:geography.error,startEdit,startCreate,cancelForm,setFieldValue:(n:string,v:EntityFormValue)=>setValues(x=>({...x,[n]:v})),saveEntity,removeEntity,setDeleting,deleting,closeDeleteDialog:()=>setDeleting(null),reload:geography.reload,relation,relationRows,languageQuery,climateQuery,altNames,nativeTreatments,regionalClimates,relationLoading:relationQuery.loading||languageQuery.loading,relationError:relationQuery.error??languageQuery.error,saveLanguages,addAlternativeName,removeAlternativeName,addNativeTreatment,removeNativeTreatment,addRegionalClimate,removeRegionalClimate,updateCityClimate,referenceTable,referenceConfig,referenceState,referenceMode,referenceEditing,referenceValues,referenceSaving,referenceError,setReferenceTable,startReferenceCreate,startReferenceEdit,saveReference,setReferenceFieldValue:(n:string,v:EntityFormValue)=>setReferenceValues(x=>({...x,[n]:v}))};
}
