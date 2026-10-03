import { editorApi } from "../../../shared/api/editorApi";
import { Card, Field, toId } from "../components/WorldSystemsForm";
import { useTransfers } from "../hooks/useTransfers";

export function TransfersPage() {
  const { message, error, submit, transfer, setTransfer, windowConfig, setWindowConfig, contract, setContract } = useTransfers();
  return (
    <div className="space-y-5">
      {message && <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3 text-sm text-emerald-200">{message}</div>}
      {error && <div className="rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-200">{error}</div>}
      
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
            <button onClick={() => void submit(() => editorApi.domain.transfer({
              playerId:toId(transfer.player)!, originClubId:toId(transfer.origin), destinationClubId:toId(transfer.destination),
              transferTypeId:toId(transfer.type), transferStatusId:toId(transfer.status), transferWindowId:toId(transfer.window),
              transferDate:transfer.date || undefined, fee:toId(transfer.fee), currencyId:toId(transfer.currency), permanent:transfer.permanent,
              loan:transfer.loan ? {} : undefined,
              installments: transfer.installmentAmount && transfer.installmentPeriods && transfer.interval
                ? [{ directionId:toId(transfer.installmentDirection)!, amountPerPeriod:Number(transfer.installmentAmount), numberOfPeriods:Number(transfer.installmentPeriods), intervalId:toId(transfer.interval)! }]
                : undefined,
              wageContribution: transfer.wageContribution
                ? { directionId:toId(transfer.wageDirection)!, salary:Number(transfer.wageContribution) }
                : undefined,
              resaleClause: transfer.resale
                ? { targetClubFinanceId:toId(transfer.destination)!, percentage:Number(transfer.resale) }
                : undefined,
              saleClause: transfer.sale
                ? { targetClubFinanceId:toId(transfer.destination)!, percentage:Number(transfer.sale) }
                : undefined,
            }))} className="mt-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950">Registrar transferência</button>
          </Card>
          <Card title="Janela de transferências" description="Defina quando clubes de uma competição ou nação podem registrar movimentações.">
            <Field label="Competição" value={windowConfig.competition} onChange={v=>setWindowConfig({...windowConfig,competition:v})} />
            <Field label="Nação" value={windowConfig.nation} onChange={v=>setWindowConfig({...windowConfig,nation:v})} />
            <Field label="Nome da janela" value={windowConfig.name} onChange={v=>setWindowConfig({...windowConfig,name:v})} />
            <Field label="Início" type="date" value={windowConfig.start} onChange={v=>setWindowConfig({...windowConfig,start:v})} />
            <Field label="Fim" type="date" value={windowConfig.end} onChange={v=>setWindowConfig({...windowConfig,end:v})} />
            <button onClick={() => void submit(() => editorApi.entity.create("transfer_window",{competition_id:toId(windowConfig.competition),nation_id:toId(windowConfig.nation),name:windowConfig.name,start_date:windowConfig.start,end_date:windowConfig.end}))} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950">Criar janela</button>
          </Card>

          <Card title="Condições financeiras" description="Parcelas, participação salarial e cláusulas são gravadas junto com a operação.">
            <Field label="Valor por parcela" type="number" value={transfer.installmentAmount} onChange={v => setTransfer({...transfer, installmentAmount:v})} />
            <Field label="Número de parcelas" type="number" value={transfer.installmentPeriods} onChange={v => setTransfer({...transfer, installmentPeriods:v})} />
            <Field label="Intervalo de pagamento" value={transfer.interval} onChange={v => setTransfer({...transfer, interval:v})} />
            <Field label="Direção do pagamento" value={transfer.installmentDirection} onChange={v => setTransfer({...transfer, installmentDirection:v})} />
            <Field label="Contribuição salarial mensal" type="number" value={transfer.wageContribution} onChange={v => setTransfer({...transfer, wageContribution:v})} />
            <Field label="Direção da contribuição" value={transfer.wageDirection} onChange={v => setTransfer({...transfer, wageDirection:v})} />
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
            <Field label="Tipo de cláusula" value={contract.clauseType} onChange={v => setContract({...contract, clauseType:v})} />
            <Field label="Valor da cláusula" type="number" value={contract.clauseValue} onChange={v => setContract({...contract, clauseValue:v})} />
            <Field label="Percentual da cláusula" type="number" value={contract.clausePercentage} onChange={v => setContract({...contract, clausePercentage:v})} />
            <button onClick={() => void submit(() => editorApi.domain.contract({
              personId:toId(contract.person)!, clubId:toId(contract.club)!, employmentId:toId(contract.employment),
              startDate:contract.start || undefined, endDate:contract.end || undefined, contractType:contract.type || undefined,
              salary:toId(contract.salary), squadNumber:toId(contract.squad),
              clauses:contract.clauseType ? [{ clauseTypeId:toId(contract.clauseType)!, value:toId(contract.clauseValue), percentage:Number(contract.clausePercentage)||undefined }] : [],
            }))} className="mt-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950">Criar contrato</button>
          </Card>
        </div>
    </div>
  );
}
