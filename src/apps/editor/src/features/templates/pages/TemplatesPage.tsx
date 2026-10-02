import { useEffect, useMemo, useState } from "react";
import { Copy, RefreshCw, Save, Trash2 } from "lucide-react";

import {
  editorApi,
  type EntityKey,
  type TemplateRecord,
  type TemplateRelationOption,
} from "../../../shared/api/editorApi";

const ROOTS = [
  ["team", "Team"],
  ["stadium", "Stadium"],
  ["person", "Person"],
  ["player", "Player"],
  ["competition", "Competition"],
  ["formation", "Formation"],
] as const;

function parseKey(value: string): EntityKey {
  const trimmed = value.trim();
  if (trimmed.startsWith("{")) {
    return JSON.parse(trimmed) as Record<string, string | number | boolean | null>;
  }
  const numeric = Number(trimmed);
  return trimmed !== "" && Number.isFinite(numeric) ? numeric : trimmed;
}

function label(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, char => char.toUpperCase());
}

export function TemplatesPage() {
  const [rootTable, setRootTable] = useState<(typeof ROOTS)[number][0]>("team");
  const [rootKey, setRootKey] = useState("1");
  const [templateName, setTemplateName] = useState("");
  const [relations, setRelations] = useState<TemplateRelationOption[]>([]);
  const [selectedRelations, setSelectedRelations] = useState<string[]>([]);
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedRequired = useMemo(
    () => relations.filter(item => item.required).map(item => item.table),
    [relations],
  );

  useEffect(() => {
    void refreshTemplates();
  }, []);

  async function refreshTemplates() {
    try {
      const result = await editorApi.templates();
      setTemplates(result.templates);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function loadRelations() {
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const result = await editorApi.templateRelations(rootTable, parseKey(rootKey));
      setRelations(result.relations);
      setSelectedRelations(result.relations.filter(item => item.required).map(item => item.table));
      setMessage("Relações carregadas.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setRelations([]);
      setSelectedRelations([]);
    } finally {
      setBusy(false);
    }
  }

  async function duplicateNow() {
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const result = await editorApi.duplicate({
        rootTable,
        rootKey: parseKey(rootKey),
        relations: [...new Set([...selectedRequired, ...selectedRelations])],
      });
      setMessage(
        `Duplicado: ${rootTable} ${JSON.stringify(result.oldKey)} → ${JSON.stringify(result.newKey)}. ${result.rowsCreated} registros.`,
      );
      await refreshTemplates();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  async function saveTemplate() {
    if (!templateName.trim()) {
      setError("Informe o nome do template.");
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      await editorApi.createTemplate({
        name: templateName.trim(),
        rootTable,
        rootKey: parseKey(rootKey),
        relations: [...new Set([...selectedRequired, ...selectedRelations])],
      });
      setTemplateName("");
      setMessage("Template salvo.");
      await refreshTemplates();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  async function createFromTemplate(template: TemplateRecord) {
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const result = await editorApi.duplicateTemplate(template.id);
      setMessage(
        `Criado a partir de "${template.name}": ${JSON.stringify(result.newKey)}.`,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  async function deleteTemplate(template: TemplateRecord) {
    if (!window.confirm(`Excluir o template "${template.name}"?`)) return;

    setBusy(true);
    try {
      await editorApi.deleteTemplate(template.id);
      await refreshTemplates();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  function toggleRelation(table: string) {
    setSelectedRelations(current =>
      current.includes(table)
        ? current.filter(item => item !== table)
        : [...current, table],
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Duplication & Templates</h1>
        <p className="mt-1 text-sm text-slate-500">
          Duplique entidades sem reaproveitar PKs e escolha quais relações internas acompanham a cópia.
        </p>
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-white">Duplicar entidade</h2>
            <p className="text-xs text-slate-500">A operação é transacional.</p>
          </div>
          <button
            type="button"
            onClick={() => void loadRelations()}
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
              onChange={event => {
                setRootTable(event.target.value as typeof rootTable);
                setRelations([]);
                setSelectedRelations([]);
              }}
              className="mt-2 w-full rounded-lg border border-white/10 bg-[#10161d] px-3 py-2 text-sm text-slate-200 outline-none"
            >
              {ROOTS.map(([value, title]) => <option key={value} value={value}>{title}</option>)}
            </select>
          </label>

          <label className="text-xs text-slate-500">
            ID / chave da origem
            <input
              value={rootKey}
              onChange={event => setRootKey(event.target.value)}
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
                  <label
                    key={item.table}
                    className="flex items-center justify-between rounded-lg border border-white/5 bg-black/10 px-3 py-2"
                  >
                    <span className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={item.required}
                        onChange={() => toggleRelation(item.table)}
                      />
                      <span className="text-sm text-slate-300">{label(item.table)}</span>
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
            onClick={() => void duplicateNow()}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
          >
            <Copy size={15} /> Duplicar agora
          </button>
          <input
            value={templateName}
            onChange={event => setTemplateName(event.target.value)}
            placeholder="Nome do template"
            className="min-w-56 rounded-lg border border-white/10 bg-[#10161d] px-3 py-2 text-sm text-slate-200 outline-none"
          />
          <button
            type="button"
            onClick={() => void saveTemplate()}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/[0.05] disabled:opacity-50"
          >
            <Save size={15} /> Salvar template
          </button>
        </div>

        {message && <p className="mt-4 text-sm text-emerald-300">{message}</p>}
        {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-white">Templates salvos</h2>
            <p className="text-xs text-slate-500">Os templates guardam um snapshot; a origem pode mudar depois.</p>
          </div>
          <button type="button" onClick={() => void refreshTemplates()} className="text-slate-500 hover:text-white">
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
                <button
                  type="button"
                  onClick={() => void createFromTemplate(template)}
                  disabled={busy}
                  className="rounded-lg bg-white/10 px-3 py-2 text-xs text-slate-200 hover:bg-white/15"
                >
                  Criar
                </button>
                <button
                  type="button"
                  onClick={() => void deleteTemplate(template)}
                  disabled={busy}
                  className="rounded-lg p-2 text-slate-600 hover:text-red-300"
                  title="Excluir template"
                >
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
    </div>
  );
}
