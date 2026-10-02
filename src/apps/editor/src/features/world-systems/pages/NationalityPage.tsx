import { editorApi } from "../../../shared/api/editorApi";
import { Card, Field, toId } from "../components/WorldSystemsForm";
import { useNationality } from "../hooks/useNationality";

export function NationalityPage() {
  const { message, error, submit, nationality, setNationality } = useNationality();
  return (
    <div className="space-y-5">
      {message && <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3 text-sm text-emerald-200">{message}</div>}
      {error && <div className="rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-200">{error}</div>}
      
        <Card title="Regra de nacionalidade e elegibilidade" description="Modele residência, idade, partidas, dupla nacionalidade e tratamento entre nações.">
          <Field label="Nação" value={nationality.nation} onChange={v=>setNationality({...nationality,nation:v})} />
          <Field label="Método de aquisição de nacionalidade" value={nationality.ruleType} onChange={v=>setNationality({...nationality,ruleType:v})} />
          <Field label="Valor principal" type="number" value={nationality.value} onChange={v=>setNationality({...nationality,value:v})} />
          <Field label="Nação exigida" value={nationality.requiredNation} onChange={v=>setNationality({...nationality,requiredNation:v})} />
          <Field label="Idade mínima" type="number" value={nationality.minAge} onChange={v=>setNationality({...nationality,minAge:v})} />
          <Field label="Idade máxima" type="number" value={nationality.maxAge} onChange={v=>setNationality({...nationality,maxAge:v})} />
          <Field label="Anos de residência" type="number" value={nationality.years} onChange={v=>setNationality({...nationality,years:v})} />
          <Field label="Partidas exigidas" type="number" value={nationality.matches} onChange={v=>setNationality({...nationality,matches:v})} />
          <Field label="Nação tratada como equivalente" value={nationality.treatmentNation} onChange={v=>setNationality({...nationality,treatmentNation:v})} />
          <Field label="Tipo de tratamento" value={nationality.treatmentType} onChange={v=>setNationality({...nationality,treatmentType:v})} />
          <label className="flex items-center gap-2 text-xs text-slate-400"><input type="checkbox" checked={nationality.cumulative} onChange={e=>setNationality({...nationality,cumulative:e.target.checked})}/> Regra cumulativa</label>
          <button onClick={() => void submit(() => editorApi.create("nationality_method",{name:nationality.ruleType}))} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300">Salvar método de nacionalidade</button>
          <button onClick={() => void submit(() => editorApi.domainNationalityRule({nationId:toId(nationality.nation)!,ruleType:nationality.ruleType,value:toId(nationality.value),requiredNationId:toId(nationality.requiredNation),cumulative:nationality.cumulative,eligibility:{minimumAge:toId(nationality.minAge),maximumAge:toId(nationality.maxAge),yearsRequired:toId(nationality.years),matchesRequired:toId(nationality.matches)},treatment:nationality.treatmentNation?{targetNationId:toId(nationality.treatmentNation)!,treatmentType:nationality.treatmentType,value:toId(nationality.treatmentValue)}:undefined}))} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950">Salvar regra de nacionalidade</button>
        </Card>
    </div>
  );
}
