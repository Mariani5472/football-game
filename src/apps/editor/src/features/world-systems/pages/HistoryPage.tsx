import { editorApi } from "../../../shared/api/editorApi";
import { Card, Field, toId } from "../components/WorldSystemsForm";
import { useHistory } from "../hooks/useHistory";

export function HistoryPage() {
  const { message, error, submit, award, setAward, derby, setDerby, achievement, setAchievement, history, setHistory } = useHistory();
  return (
    <div className="space-y-5">
      {message && <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3 text-sm text-emerald-200">{message}</div>}
      {error && <div className="rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-200">{error}</div>}
      
        <div className="grid gap-5 lg:grid-cols-2">
          <Card title="Histórico de competição" description="Registre vencedores, posições e sedes de uma edição histórica.">
            <Field label="Competição" value={history.competition} onChange={v => setHistory({...history, competition:v})} />
            <Field label="Ano" type="number" value={history.year} onChange={v => setHistory({...history, year:v})} />
            <Field label="1º colocado" value={history.firstTeam} onChange={v => setHistory({...history, firstTeam:v})} />
            <Field label="2º colocado" value={history.secondTeam} onChange={v => setHistory({...history, secondTeam:v})} />
            <Field label="3º colocado" value={history.thirdTeam} onChange={v => setHistory({...history, thirdTeam:v})} />
            <Field label="País-sede" value={history.hostNation} onChange={v => setHistory({...history, hostNation:v})} />
            <Field label="Estádio-sede" value={history.hostStadium} onChange={v => setHistory({...history, hostStadium:v})} />
            <button onClick={() => void submit(() => editorApi.domainHistory({competitionId:id(history.competition)!, year:Number(history.year), positionTeams:[id(history.firstTeam),id(history.secondTeam),id(history.thirdTeam)].filter((v): v is number => v !== undefined), hosts:history.hostNation || history.hostStadium ? [{nationId:id(history.hostNation),stadiumId:id(history.hostStadium)}] : []}))} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950">Salvar edição histórica</button>
          </Card>
          <Card title="Configuração de prêmio" description="Defina quem pode receber o prêmio, como é votado e em qual contexto ele existe.">
            <Field label="Nome do prêmio" value={award.name} onChange={v=>setAward({...award,name:v})} />
            <Field label="Competição associada" value={award.competition} onChange={v=>setAward({...award,competition:v})} />
            <Field label="Periodicidade" value={award.period} onChange={v=>setAward({...award,period:v})} />
            <Field label="Tipo de vencedor" value={award.recipientType} onChange={v=>setAward({...award,recipientType:v})} />
            <Field label="Tipo de prêmio" value={award.awardType} onChange={v=>setAward({...award,awardType:v})} />
            <Field label="Método de votação" value={award.votingType} onChange={v=>setAward({...award,votingType:v})} />
            <Field label="Organizador" value={award.organizer} onChange={v=>setAward({...award,organizer:v})} />
            <Field label="Posição elegível" value={award.position} onChange={v=>setAward({...award,position:v})} />
            <button onClick={() => void submit(() => editorApi.domainAward({name:award.name,competitionId:id(award.competition),awardPeriodId:id(award.period),recipientTypeId:id(award.recipientType),awardTypeId:id(award.awardType),votingTypeId:id(award.votingType),organizerId:id(award.organizer),positionId:id(award.position)}))} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950">Salvar configuração do prêmio</button>
          </Card>

          <Card title="Derbies e conquistas" description="Registre rivalidades e marcos de carreira do jogador.">
            <Field label="Nome do derby" value={derby.name} onChange={v=>setDerby({...derby,name:v})} />
            <Field label="Clube 1" value={derby.club1} onChange={v=>setDerby({...derby,club1:v})} />
            <Field label="Clube 2" value={derby.club2} onChange={v=>setDerby({...derby,club2:v})} />
            <Field label="Reputação mundial" type="number" value={derby.world} onChange={v=>setDerby({...derby,world:v})} />
            <Field label="Reputação nacional" type="number" value={derby.national} onChange={v=>setDerby({...derby,national:v})} />
            <button onClick={() => void submit(() => editorApi.domainDerby({name:derby.name,clubId1:id(derby.club1)!,clubId2:id(derby.club2)!,worldReputation:id(derby.world),nationalReputation:id(derby.national)}))} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950">Criar derby</button>
            <Field label="Jogador da conquista" value={achievement.player} onChange={v=>setAchievement({...achievement,player:v})} />
            <Field label="Equipe / competição" value={achievement.team} onChange={v=>setAchievement({...achievement,team:v})} />
            <Field label="Competição" value={achievement.competition} onChange={v=>setAchievement({...achievement,competition:v})} />
            <Field label="Tipo de conquista" value={achievement.type} onChange={v=>setAchievement({...achievement,type:v})} />
            <button onClick={() => void submit(() => editorApi.domainAchievement({playerId:id(achievement.player)!,teamId:id(achievement.team),competitionId:id(achievement.competition),achievementTypeId:id(achievement.type)!}))} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300">Registrar conquista</button>
          </Card>

          <Card title="Prêmios e carreira" description="Registre vencedor de prêmio e histórico de carreira do jogador/staff.">
            <Field label="Prêmio" value={history.award} onChange={v => setHistory({...history, award:v})} />
            <Field label="Ano" type="number" value={history.awardYear} onChange={v => setHistory({...history, awardYear:v})} />
            <Field label="Ranking" type="number" value={history.ranking} onChange={v => setHistory({...history, ranking:v})} />
            <Field label="Jogador/pessoa vencedora" value={history.recipientPerson} onChange={v => setHistory({...history, recipientPerson:v})} />
            <Field label="Clube vencedor" value={history.recipientClub} onChange={v => setHistory({...history, recipientClub:v})} />
            <Field label="Nação vencedora" value={history.recipientNation} onChange={v => setHistory({...history, recipientNation:v})} />
            <button onClick={() => void submit(() => editorApi.domainAwardHistory({awardId:id(history.award)!,year:Number(history.awardYear),ranking:Number(history.ranking),recipient:{personId:id(history.recipientPerson),clubId:id(history.recipientClub),nationId:id(history.recipientNation)}}))} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950">Registrar prêmio</button>
            <div className="rounded-lg border border-white/5 bg-black/10 p-3 text-xs text-slate-500">
              Carreiras, recordes, achievements e derbies permanecem disponíveis como entidades do domínio para edição detalhada.
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
