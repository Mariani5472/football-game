import { Copy, RefreshCw, Save } from "lucide-react";
import { formatTemplateLabel, templateRoots } from "../config/templateConfig";
import type { TemplateRelationOption } from "../../../shared/api";

export function TemplateBuilder({
  rootTable,
  rootKey,
  templateName,
  relations,
  selectedRelations,
  busy,
  selectedRequired,
  onRootTableChange,
  onRootKeyChange,
  onTemplateNameChange,
  onLoadRelations,
  onToggleRelation,
  onDuplicate,
  onSave,
}: {
  rootTable: (typeof templateRoots)[number][0];
  rootKey: string;
  templateName: string;
  relations: TemplateRelationOption[];
  selectedRelations: string[];
  busy: boolean;
  selectedRequired: string[];
  onRootTableChange: (value: typeof rootTable) => void;
  onRootKeyChange: (value: string) => void;
  onTemplateNameChange: (value: string) => void;
  onLoadRelations: () => void;
  onToggleRelation: (table: string) => void;
  onDuplicate: () => void;
  onSave: () => void;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-white">Duplicar entidade</h2>
          <p className="text-xs text-slate-500">A operação é transacional.</p>
        </div>
        <button
          type="button"
          onClick={onLoadRelations}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 hover:bg-white/[0.05]"
        >
          <RefreshCw size={15} /> Carregar relações
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-[180px_1fr]">
        <label className="text-xs text-slate-500">
          Entidade
          <select
            value={rootTable}
            onChange={event => onRootTableChange(event.target.value as typeof rootTable)}
            className="mt-2 w-full rounded-lg border border-white/10 bg-[#10161d] px-3 py-2 text-sm text-slate-200 outline-none"
          >
            {templateRoots.map(([value, title]) => (
              <option key={value} value={value}>{title}</option>
            ))}
          </select>
        </label>

        <label className="text-xs text-slate-500">
          ID / chave da origem
          <input
            value={rootKey}
            onChange={event => onRootKeyChange(event.target.value)}
            placeholder='Ex.: 12 ou {"formation_id":1,"instruction_id":2}'
            className="mt-2 w-full rounded-lg border border-white/10 bg-[#10161d] px-3 py-2 text-sm text-slate-200 outline-none"
          />
        </label>
      </div>

      {relations.length > 0 && (
        <div className="mt-6">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Relações que serão copiadas
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {relations.map(item => {
              const checked = selectedRelations.includes(item.table);
              return (
                <label key={item.table} className="flex items-center justify-between rounded-lg border border-white/5 bg-black/10 px-3 py-2">
                  <span className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={item.required}
                      onChange={() => onToggleRelation(item.table)}
                    />
                    <span className="text-sm text-slate-300">{formatTemplateLabel(item.table)}</span>
                  </span>
                  <span className="text-[10px] uppercase text-slate-600">
                    {item.required ? "obrigatória" : item.direction}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onDuplicate}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-50"
        >
          <Copy size={15} /> Duplicar agora
        </button>
        <input
          value={templateName}
          onChange={event => onTemplateNameChange(event.target.value)}
          placeholder="Nome do template"
          className="min-w-56 rounded-lg border border-white/10 bg-[#10161d] px-3 py-2 text-sm text-slate-200 outline-none"
        />
        <button
          type="button"
          onClick={onSave}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/[0.05] disabled:opacity-50"
        >
          <Save size={15} /> Salvar template
        </button>
      </div>

      <p className="mt-4 text-xs text-slate-600">
        {selectedRequired.length} relação(ões) obrigatória(s) serão copiadas automaticamente.
      </p>
    </section>
  );
}
