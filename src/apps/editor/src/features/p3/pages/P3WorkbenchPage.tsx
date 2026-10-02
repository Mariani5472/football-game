import { useState, type ReactNode } from "react";
import { ArrowRightLeft, Banknote, CloudSun, History, Newspaper, ShieldCheck } from "lucide-react";
import { editorApi } from "../../../shared/api/editorApi";

type Tab = "transfers" | "finance" | "history" | "media" | "weather" | "nationality";

const tabs: Array<{ id: Tab; label: string; icon: typeof ArrowRightLeft }> = [
  { id: "transfers", label: "Transfers & Contracts", icon: ArrowRightLeft },
  { id: "finance", label: "Club Finance", icon: Banknote },
  { id: "history", label: "History & Awards", icon: History },
  { id: "media", label: "Press & Media", icon: Newspaper },
  { id: "weather", label: "Weather & Climate", icon: CloudSun },
  { id: "nationality", label: "Nationality", icon: ShieldCheck },
];

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number" | "date";
  placeholder?: string;
}) {
  return (
    <label className="text-xs text-slate-500">
      {label}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={event => onChange(event.target.value)}
        className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#10161d] px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-400/40"
      />
    </label>
  );
}

function id(value: string) {
  return value.trim() ? Number(value) : undefined;
}

export function P3WorkbenchPage() {
  const [tab, setTab] = useState<Tab>("transfers");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [transfer, setTransfer] = useState({
    player: "", origin: "", destination: "", type: "", status: "", window: "", date: "", fee: "", currency: "",
    permanent: true, loan: false, installment: false, installmentAmount: "", installmentPeriods: "", interval: "",
    wageContribution: "", resale: "", sale: "",
  });
  const [contract, setContract] = useState({
    person: "", club: "", employment: "", start: "", end: "", type: "", salary: "", squad: "", clauseType: "", clauseValue: "", clausePercentage: "",
  });
  const [finance, setFinance] = useState({
    club: "", balance: "", transferBudget: "", wageBudget: "", monthlyWage: "", embargoType: "", embargoStart: "", embargoEnd: "",
    revenueAmount: "", revenueType: "", debtAmount: "", debtSource: "", interest: "", ffpAmount: "", ffpYear: "", ffpCompetition: "",
  });
  const [history, setHistory] = useState({
    competition: "", year: "", firstTeam: "", secondTeam: "", thirdTeam: "", hostNation: "", hostStadium: "", club: "", position: "", award: "", awardYear: "", ranking: "", recipientPerson: "", recipientClub: "", recipientNation: "",
  });
  const [media, setMedia] = useState({
    name: "", period: "", reach: "", pressTypes: "", areaType: "nation", areaId: "", conferences: false,
  });
  const [weather, setWeather] = useState({
    climate: "", season: "", startDay: "", rainDry: "", rainHumid: "", rainShower: "", windCalm: "", windBreeze: "", windStorm: "", variation: "", variationValue: "",
  });
  const [nationality, setNationality] = useState({
    nation: "", ruleType: "RESIDENCE_YEARS", value: "", requiredNation: "", cumulative: false, minAge: "", maxAge: "", years: "", matches: "", treatmentNation: "", treatmentType: "", treatmentValue: "",
  });

  async function submit(action: () => Promise<unknown>) {
    setMessage(null); setError(null);
    try {
      await action();
      setMessage("Regra salva com sucesso.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  const pageTitle = tabs.find(item => item.id === tab)?.label;

  return (
    <div className="space-y-6">
      <header>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">WORLD RULES</div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">{pageTitle}</h1>
        <p className="mt-2 text-sm text-slate-500">
          Configure regras de jogo e relações de domínio. O editor grava as operações compostas de forma transacional.
        </p>
      </header>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-white/[0.02] p-2">
        {tabs.map(item => {
          const Icon = item.icon;
          return (
            <button key={item.id} type="button" onClick={() => setTab(item.id)}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${tab === item.id ? "bg-emerald-400/10 text-emerald-200" : "text-slate-500 hover:text-slate-200"}`}>
              <Icon size={14} /> {item.label}
            </button>
          );
        })}
      </div>

      {message && <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3 text-sm text-emerald-200">{message}</div>}
      {error && <div className="rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-200">{error}</div>}

      {tab === "transfers" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card title="Movimentação do jogador" description="Registre uma transferência permanente ou temporária respeitando a janela escolhida.">
            <Field label="Jogador" value={transfer.player} onChange={v => setTransfer({...transfer, player:v})} placeholder="ID do jogador" />
            <Field label="Clube de origem" value={transfer.origin} onChange={v => setTransfer({...transfer, origin:v})} />
            <Field label="Novo clube" value={transfer.destination} onChange={v => setTransfer({...transfer, destination:v})} />
            <Field label="Tipo da transferência" value={transfer.type} onChange={v => setTransfer({...transfer, type:v})} />
            <Field label="Status da operação" value={transfer.status} onChange={v => setTransfer({...transfer, status:v})} />
            <Field label="Janela de transferências" value={transfer.window} onChange={v => setTransfer({...transfer, window:v})} />
            <Field label="Data da transferência" type="date" value={transfer.date} onChange={v => setTransfer({...transfer, date:v})} />
            <Field label="Valor da transferência" type="number" value={transfer.fee} onChange={v => setTransfer({...transfer, fee:v})} />
            <Field label="Moeda" value={transfer.currency} onChange={v => setTransfer({...transfer, currency:v})} />
            <label className="flex items-center gap-2 text-xs text-slate-400"><input type="checkbox" checked={transfer.permanent} onChange={e => setTransfer({...transfer, permanent:e.target.checked})}/> Transferência definitiva</label>
            <label className="flex items-center gap-2 text-xs text-slate-400"><input type="checkbox" checked={transfer.loan} onChange={e => setTransfer({...transfer, loan:e.target.checked})}/> É empréstimo</label>
            <button onClick={() => void submit(() => editorApi.domainTransfer({
              playerId:id(transfer.player)!, originClubId:id(transfer.origin), destinationClubId:id(transfer.destination),
              transferTypeId:id(transfer.type), transferStatusId:id(transfer.status), transferWindowId:id(transfer.window),
              transferDate:transfer.date || undefined, fee:id(transfer.fee), currencyId:id(transfer.currency), permanent:transfer.permanent,
              loan:transfer.loan ? {} : undefined,
            }))} className="mt-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950">Registrar transferência</button>
          </Card>
          <Card title="Condições financeiras" description="Parcelas, participação salarial e cláusulas são gravadas junto com a operação.">
            <Field label="Valor por parcela" type="number" value={transfer.installmentAmount} onChange={v => setTransfer({...transfer, installmentAmount:v})} />
            <Field label="Número de parcelas" type="number" value={transfer.installmentPeriods} onChange={v => setTransfer({...transfer, installmentPeriods:v})} />
            <Field label="Intervalo de pagamento" value={transfer.interval} onChange={v => setTransfer({...transfer, interval:v})} />
            <Field label="Contribuição salarial mensal" type="number" value={transfer.wageContribution} onChange={v => setTransfer({...transfer, wageContribution:v})} />
            <Field label="Percentual de revenda" type="number" value={transfer.resale} onChange={v => setTransfer({...transfer, resale:v})} />
            <Field label="Percentual de venda futura" type="number" value={transfer.sale} onChange={v => setTransfer({...transfer, sale:v})} />
            <div className="rounded-lg border border-white/5 bg-black/10 p-3 text-xs text-slate-500">
              A mesma operação pode conter parcelas, contribuição salarial e cláusulas de revenda/venda.
            </div>
          </Card>
          <Card title="Contrato do profissional" description="Contrato de jogador ou staff, com vínculo, período, salário e cláusulas.">
            <Field label="Pessoa" value={contract.person} onChange={v => setContract({...contract, person:v})} />
            <Field label="Clube empregador" value={contract.club} onChange={v => setContract({...contract, club:v})} />
            <Field label="Vínculo profissional" value={contract.employment} onChange={v => setContract({...contract, employment:v})} />
            <Field label="Início" type="date" value={contract.start} onChange={v => setContract({...contract, start:v})} />
            <Field label="Fim" type="date" value={contract.end} onChange={v => setContract({...contract, end:v})} />
            <Field label="Tipo de contrato" value={contract.type} onChange={v => setContract({...contract, type:v})} />
            <Field label="Salário" type="number" value={contract.salary} onChange={v => setContract({...contract, salary:v})} />
            <Field label="Número do elenco" type="number" value={contract.squad} onChange={v => setContract({...contract, squad:v})} />
            <button onClick={() => void submit(() => editorApi.domainContract({
              personId:id(contract.person)!, clubId:id(contract.club)!, employmentId:id(contract.employment),
              startDate:contract.start || undefined, endDate:contract.end || undefined, contractType:contract.type || undefined,
              salary:id(contract.salary), squadNumber:id(contract.squad),
              clauses:contract.clauseType ? [{ clauseTypeId:id(contract.clauseType)!, value:id(contract.clauseValue), percentage:Number(contract.clausePercentage)||undefined }] : [],
            }))} className="mt-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950">Criar contrato</button>
          </Card>
        </div>
      )}

      {tab === "finance" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card title="Saúde financeira do clube" description="Defina caixa, orçamento de transferências e orçamento salarial.">
            <Field label="Clube" value={finance.club} onChange={v => setFinance({...finance, club:v})} />
            <Field label="Saldo disponível" type="number" value={finance.balance} onChange={v => setFinance({...finance, balance:v})} />
            <Field label="Orçamento de transferências" type="number" value={finance.transferBudget} onChange={v => setFinance({...finance, transferBudget:v})} />
            <Field label="Orçamento salarial" type="number" value={finance.wageBudget} onChange={v => setFinance({...finance, wageBudget:v})} />
            <Field label="Limite salarial mensal" type="number" value={finance.monthlyWage} onChange={v => setFinance({...finance, monthlyWage:v})} />
            <button onClick={() => void submit(() => editorApi.domainFinance({clubId:id(finance.club)!, balance:id(finance.balance), transferBudget:id(finance.transferBudget), wageBudget:id(finance.wageBudget), monthlyWageBudget:id(finance.monthlyWage)}))} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950">Salvar finanças</button>
          </Card>
          <Card title="Risco financeiro e FFP" description="Registre embargo, receitas, dívidas e acompanhamento de fair play financeiro.">
            <Field label="Tipo de embargo" value={finance.embargoType} onChange={v => setFinance({...finance, embargoType:v})} />
            <Field label="Início do embargo" type="date" value={finance.embargoStart} onChange={v => setFinance({...finance, embargoStart:v})} />
            <Field label="Fim do embargo" type="date" value={finance.embargoEnd} onChange={v => setFinance({...finance, embargoEnd:v})} />
            <Field label="Receita" type="number" value={finance.revenueAmount} onChange={v => setFinance({...finance, revenueAmount:v})} />
            <Field label="Tipo de receita" value={finance.revenueType} onChange={v => setFinance({...finance, revenueType:v})} />
            <Field label="Nova dívida" type="number" value={finance.debtAmount} onChange={v => setFinance({...finance, debtAmount:v})} />
            <Field label="Origem da dívida" value={finance.debtSource} onChange={v => setFinance({...finance, debtSource:v})} />
            <Field label="Juros (%)" type="number" value={finance.interest} onChange={v => setFinance({...finance, interest:v})} />
            <Field label="Registro FFP" type="number" value={finance.ffpAmount} onChange={v => setFinance({...finance, ffpAmount:v})} />
            <Field label="Ano do FFP" type="number" value={finance.ffpYear} onChange={v => setFinance({...finance, ffpYear:v})} />
            <Field label="Competição do FFP" value={finance.ffpCompetition} onChange={v => setFinance({...finance, ffpCompetition:v})} />
          </Card>
        </div>
      )}

      {tab === "history" && (
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

      {tab === "media" && (
        <Card title="Fonte de imprensa" description="Modele quem cobre o mundo, onde atua e em quais tipos de cobertura participa.">
          <Field label="Nome da fonte" value={media.name} onChange={v => setMedia({...media, name:v})} />
          <Field label="Periodicidade" value={media.period} onChange={v => setMedia({...media, period:v})} />
          <Field label="Alcance" value={media.reach} onChange={v => setMedia({...media, reach:v})} />
          <Field label="Tipos de imprensa (IDs separados por vírgula)" value={media.pressTypes} onChange={v => setMedia({...media, pressTypes:v})} />
          <label className="text-xs text-slate-500">Área de cobertura<select value={media.areaType} onChange={e=>setMedia({...media,areaType:e.target.value})} className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#10161d] px-3 py-2 text-sm text-slate-200"><option value="nation">Nação</option><option value="continent">Continente</option><option value="region">Região</option><option value="club">Clube</option><option value="competition">Competição</option><option value="city">Cidade</option></select></label>
          <Field label="Área de cobertura" value={media.areaId} onChange={v => setMedia({...media, areaId:v})} />
          <label className="flex items-center gap-2 text-xs text-slate-400"><input type="checkbox" checked={media.conferences} onChange={e=>setMedia({...media,conferences:e.target.checked})}/> Participa de coletivas</label>
          <button onClick={() => void submit(() => editorApi.domainPressSource({name:media.name,periodId:id(media.period),reachId:id(media.reach),pressTypeIds:media.pressTypes.split(",").map(id).filter((v): v is number=>v!==undefined),area:{[media.areaType+"Id"]:id(media.areaId)},pressConference:media.conferences}))} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950">Salvar fonte</button>
        </Card>
      )}

      {tab === "weather" && (
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
          <button onClick={() => void submit(() => editorApi.domainClimateProfile({climateId:id(weather.climate)!,seasonId:id(weather.season)!,startDay:id(weather.startDay),rainDry:Number(weather.rainDry)||undefined,rainHumid:Number(weather.rainHumid)||undefined,rainShower:Number(weather.rainShower)||undefined,windCalm:Number(weather.windCalm)||undefined,windBreeze:Number(weather.windBreeze)||undefined,windStorm:Number(weather.windStorm)||undefined,dayNightVariation:Boolean(weather.variationValue),dayNightVariationValue:Number(weather.variationValue)||undefined}))} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950">Salvar perfil climático</button>
        </Card>
      )}

      {tab === "nationality" && (
        <Card title="Regra de nacionalidade e elegibilidade" description="Modele residência, idade, partidas, dupla nacionalidade e tratamento entre nações.">
          <Field label="Nação" value={nationality.nation} onChange={v=>setNationality({...nationality,nation:v})} />
          <Field label="Tipo da regra" value={nationality.ruleType} onChange={v=>setNationality({...nationality,ruleType:v})} />
          <Field label="Valor principal" type="number" value={nationality.value} onChange={v=>setNationality({...nationality,value:v})} />
          <Field label="Nação exigida" value={nationality.requiredNation} onChange={v=>setNationality({...nationality,requiredNation:v})} />
          <Field label="Idade mínima" type="number" value={nationality.minAge} onChange={v=>setNationality({...nationality,minAge:v})} />
          <Field label="Idade máxima" type="number" value={nationality.maxAge} onChange={v=>setNationality({...nationality,maxAge:v})} />
          <Field label="Anos de residência" type="number" value={nationality.years} onChange={v=>setNationality({...nationality,years:v})} />
          <Field label="Partidas exigidas" type="number" value={nationality.matches} onChange={v=>setNationality({...nationality,matches:v})} />
          <Field label="Nação tratada como equivalente" value={nationality.treatmentNation} onChange={v=>setNationality({...nationality,treatmentNation:v})} />
          <Field label="Tipo de tratamento" value={nationality.treatmentType} onChange={v=>setNationality({...nationality,treatmentType:v})} />
          <label className="flex items-center gap-2 text-xs text-slate-400"><input type="checkbox" checked={nationality.cumulative} onChange={e=>setNationality({...nationality,cumulative:e.target.checked})}/> Regra cumulativa</label>
          <button onClick={() => void submit(() => editorApi.domainNationalityRule({nationId:id(nationality.nation)!,ruleType:nationality.ruleType,value:id(nationality.value),requiredNationId:id(nationality.requiredNation),cumulative:nationality.cumulative,eligibility:{minimumAge:id(nationality.minAge),maximumAge:id(nationality.maxAge),yearsRequired:id(nationality.years),matchesRequired:id(nationality.matches)},treatment:nationality.treatmentNation?{targetNationId:id(nationality.treatmentNation)!,treatmentType:nationality.treatmentType,value:id(nationality.treatmentValue)}:undefined}))} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950">Salvar regra de nacionalidade</button>
        </Card>
      )}
    </div>
  );
}

function Card({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
      <h2 className="font-semibold text-white">{title}</h2>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
      <div className="mt-5 grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}
