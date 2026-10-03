import { Copy, RefreshCw, Trash2 } from "lucide-react";
import type { TemplateRecord } from "../../../shared/api";

export function TemplateList({
  templates,
  busy,
  onRefresh,
  onCreate,
  onDelete,
}: {
  templates: TemplateRecord[];
  busy: boolean;
  onRefresh: () => void;
  onCreate: (template: TemplateRecord) => void;
  onDelete: (template: TemplateRecord) => void;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-white">Templates salvos</h2>
          <p className="text-xs text-slate-500">Os templates guardam um snapshot; a origem pode mudar depois.</p>
        </div>
        <button type="button" onClick={onRefresh} className="text-slate-500 hover:text-white" disabled={busy}>
          <RefreshCw size={15} />
        </button>
      </div>

      <div className="space-y-2">
        {templates.map(template => (
          <div key={template.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-black/10 px-4 py-3">
            <div>
              <div className="text-sm font-medium text-slate-200">{template.name}</div>
              <div className="mt-1 text-xs text-slate-600">
                {template.rootTable} · origem {JSON.stringify(template.sourceKey)} · {template.rowCount} registros
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => onCreate(template)} disabled={busy} className="rounded-lg bg-white/10 px-3 py-2 text-xs text-slate-200 hover:bg-white/15">
                <Copy size={13} className="mr-1 inline" /> Criar
              </button>
              <button type="button" onClick={() => onDelete(template)} disabled={busy} className="rounded-lg p-2 text-slate-600 hover:text-red-300">
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
        {!templates.length && (
          <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-600">
            Nenhum template salvo.
          </div>
        )}
      </div>
    </section>
  );
}
