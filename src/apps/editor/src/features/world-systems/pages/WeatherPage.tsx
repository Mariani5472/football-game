import { editorApi } from "../../../shared/api/editorApi";
import { Card, Field, toId } from "../components/WorldSystemsForm";
import { useWeather } from "../hooks/useWeather";

export function WeatherPage() {
  const { message, error, submit, weather, setWeather } = useWeather();
  return (
    <div className="space-y-5">
      {message && <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3 text-sm text-emerald-200">{message}</div>}
      {error && <div className="rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-200">{error}</div>}
      
        <Card title="Perfil climático sazonal" description="Defina o comportamento de chuva, vento e temperatura de uma região ao longo da estação.">
          <Field label="Clima" value={weather.climate} onChange={v => setWeather({...weather, climate:v})} />
          <Field label="Estação meteorológica" value={weather.season} onChange={v => setWeather({...weather, season:v})} />
          <Field label="Dia inicial da estação" type="number" value={weather.startDay} onChange={v => setWeather({...weather, startDay:v})} />
          <Field label="Chuva seca" type="number" value={weather.rainDry} onChange={v => setWeather({...weather, rainDry:v})} />
          <Field label="Chuva úmida" type="number" value={weather.rainHumid} onChange={v => setWeather({...weather, rainHumid:v})} />
          <Field label="Chuva forte" type="number" value={weather.rainShower} onChange={v => setWeather({...weather, rainShower:v})} />
          <Field label="Vento calmo" type="number" value={weather.windCalm} onChange={v => setWeather({...weather, windCalm:v})} />
          <Field label="Vento moderado" type="number" value={weather.windBreeze} onChange={v => setWeather({...weather, windBreeze:v})} />
          <Field label="Vento de tempestade" type="number" value={weather.windStorm} onChange={v => setWeather({...weather, windStorm:v})} />
          <Field label="Variação dia/noite" type="number" value={weather.variationValue} onChange={v => setWeather({...weather, variationValue:v})} />
          <button onClick={() => void submit(() => editorApi.domainClimateProfile({climateId:toId(weather.climate)!,seasonId:toId(weather.season)!,startDay:toId(weather.startDay),rainDry:Number(weather.rainDry)||undefined,rainHumid:Number(weather.rainHumid)||undefined,rainShower:Number(weather.rainShower)||undefined,windCalm:Number(weather.windCalm)||undefined,windBreeze:Number(weather.windBreeze)||undefined,windStorm:Number(weather.windStorm)||undefined,dayNightVariation:Boolean(weather.variationValue),dayNightVariationValue:Number(weather.variationValue)||undefined}))} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950">Salvar perfil climático</button>
        </Card>
        <Card title="Temporadas e regiões" description="Crie estações meteorológicas e associe um clima às regiões do mundo.">
          <Field label="Nome da nova estação" value={weather.season} onChange={v=>setWeather({...weather,season:v})} />
          <button onClick={() => void submit(() => editorApi.domainWeatherSeason(weather.season))} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300">Criar estação meteorológica</button>
          <Field label="Região do país" value={weather.region} onChange={v=>setWeather({...weather,region:v})} />
          <Field label="Clima aplicado à região" value={weather.climate} onChange={v=>setWeather({...weather,climate:v})} />
          <button onClick={() => void submit(() => editorApi.domainClimateRegion({nationRegionId:toId(weather.region)!,climateId:toId(weather.climate)!}))} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300">Mapear clima para região</button>
        </Card>
    </div>
  );
}
