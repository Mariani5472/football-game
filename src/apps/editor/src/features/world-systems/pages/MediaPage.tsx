import { editorApi } from "../../../shared/api/editorApi";
import { Card, Field, toId } from "../components/WorldSystemsForm";
import { useMedia } from "../hooks/useMedia";

export function MediaPage() {
  const { message, error, submit, media, setMedia } = useMedia();
  return (
    <div className="space-y-5">
      {message && <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3 text-sm text-emerald-200">{message}</div>}
      {error && <div className="rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-200">{error}</div>}
      
        <Card title="Fonte de imprensa" description="Modele quem cobre o mundo, onde atua e em quais tipos de cobertura participa.">
          <Field label="Nome da fonte" value={media.name} onChange={v => setMedia({...media, name:v})} />
          <Field label="Periodicidade" value={media.period} onChange={v => setMedia({...media, period:v})} />
          <Field label="Alcance" value={media.reach} onChange={v => setMedia({...media, reach:v})} />
          <Field label="Tipos de imprensa (IDs separados por vírgula)" value={media.pressTypes} onChange={v => setMedia({...media, pressTypes:v})} />
          <label className="text-xs text-slate-500">Área de cobertura<select value={media.areaType} onChange={e=>setMedia({...media,areaType:e.target.value})} className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#10161d] px-3 py-2 text-sm text-slate-200"><option value="nation">Nação</option><option value="continent">Continente</option><option value="region">Região</option><option value="club">Clube</option><option value="competition">Competição</option><option value="city">Cidade</option></select></label>
          <Field label="Área de cobertura" value={media.areaId} onChange={v => setMedia({...media, areaId:v})} />
          <label className="flex items-center gap-2 text-xs text-slate-400"><input type="checkbox" checked={media.conferences} onChange={e=>setMedia({...media,conferences:e.target.checked})}/> Participa de coletivas</label>
          <button onClick={() => void submit(() => editorApi.domainPressSource({name:media.name,periodId:toId(media.period),reachId:toId(media.reach),pressTypeIds:media.pressTypes.split(",").map(id).filter((v): v is number=>v!==undefined),area:{[media.areaType+"Id"]:toId(media.areaId)},pressConference:media.conferences}))} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950">Salvar fonte</button>
        </Card>
    </div>
  );
}
