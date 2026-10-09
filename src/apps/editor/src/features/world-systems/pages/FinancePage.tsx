import { editorApi } from "../../../shared/api/editorApi";
import { Card, Field, toId } from "../components/WorldSystemsForm";
import { useFinance } from "../hooks/useFinance";

export function FinancePage() {
  const { message, error, submit, finance, setFinance } = useFinance();
  return (
    <div className="space-y-5">
      {message && <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3 text-sm text-emerald-200">{message}</div>}
      {error && <div className="rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-200">{error}</div>}
      
        <div className="grid gap-5 lg:grid-cols-2">
          <Card title="Saúde financeira do clube" description="Defina caixa, orçamento de transferências e orçamento salarial.">
            <Field label="Clube" value={finance.club} onChange={v => setFinance({...finance, club:v})} />
            <Field label="Saldo disponível" type="number" value={finance.balance} onChange={v => setFinance({...finance, balance:v})} />
            <Field label="Orçamento de transferências" type="number" value={finance.transferBudget} onChange={v => setFinance({...finance, transferBudget:v})} />
            <Field label="Orçamento salarial" type="number" value={finance.wageBudget} onChange={v => setFinance({...finance, wageBudget:v})} />
            <Field label="Limite salarial mensal" type="number" value={finance.monthlyWage} onChange={v => setFinance({...finance, monthlyWage:v})} />
            <button onClick={() => void submit(() => editorApi.domain.finance({
              clubId:toId(finance.club)!,
              balance:toId(finance.balance),
              transferBudget:toId(finance.transferBudget),
              wageBudget:toId(finance.wageBudget),
              monthlyWageBudget:toId(finance.monthlyWage),
              transferEmbargo: finance.embargoType ? { startDate:finance.embargoStart || undefined, endDate:finance.embargoEnd || undefined, typeIds:[toId(finance.embargoType)!] } : undefined,
              revenues: finance.revenueAmount && finance.revenueType ? [{ amount:Number(finance.revenueAmount), revenueTypeId:toId(finance.revenueType)! }] : undefined,
              debts: finance.debtAmount && finance.debtSource ? [{ amount:Number(finance.debtAmount), debtSourceId:toId(finance.debtSource)!, interestRate:Number(finance.interest)||undefined }] : undefined,
              ffp: finance.ffpAmount && finance.ffpYear && finance.ffpCompetition ? { amount:Number(finance.ffpAmount), year:Number(finance.ffpYear), competitionId:toId(finance.ffpCompetition)! } : undefined,
            }))} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950">Salvar finanças</button>
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
    </div>
  );
}
