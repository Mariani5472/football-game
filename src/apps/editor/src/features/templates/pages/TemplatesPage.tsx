import { TemplateBuilder } from "../components/TemplateBuilder";
import { TemplateList } from "../components/TemplateList";
import { TemplateMessages } from "../components/TemplateMessages";
import { useTemplates } from "../hooks/useTemplates";

export function TemplatesPage() {
  const state = useTemplates();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-white">Duplication & Templates</h1>
        <p className="mt-1 text-sm text-slate-500">
          Duplique entidades sem reaproveitar PKs e escolha quais relações internas acompanham a cópia.
        </p>
      </header>

      <TemplateBuilder
        rootTable={state.rootTable}
        rootKey={state.rootKey}
        templateName={state.templateName}
        relations={state.relations}
        selectedRelations={state.selectedRelations}
        selectedRequired={state.selectedRequired}
        busy={state.busy}
        onRootTableChange={state.changeRootTable}
        onRootKeyChange={state.setRootKey}
        onTemplateNameChange={state.setTemplateName}
        onLoadRelations={() => void state.loadRelations()}
        onToggleRelation={state.toggleRelation}
        onDuplicate={() => void state.duplicateNow()}
        onSave={() => void state.saveTemplate()}
      />

      <TemplateMessages message={state.message} error={state.error} />

      <TemplateList
        templates={state.templates}
        busy={state.busy}
        onRefresh={() => void state.refreshTemplates()}
        onCreate={template => void state.createFromTemplate(template)}
        onDelete={template => void state.deleteTemplate(template)}
      />
    </div>
  );
}
