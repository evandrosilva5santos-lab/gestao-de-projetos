"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Shuffle, Save, MessageCircle, Users } from "lucide-react";
import { getMessageTemplates, saveMessageTemplates } from "../actions";
import {
  renderTemplate,
  buildLeadContext,
  TEMPLATE_VARIABLE_DEFS,
  DEFAULT_TEMPLATES,
  type MessageTemplate,
  type MessageTemplates,
} from "@/lib/leads/templates";

// Lead de exemplo pra prévia — reflete um lead real de consórcio, não é dado real.
const SAMPLE = buildLeadContext({
  name: "Roseli Putton",
  phone: "5551998423942",
  email: "roseliputton566@gmail.com",
  interest: "Imóvel",
  budget: "De 150 Mil A 300 Mil",
  monthly: "Maior Que 20 Mil",
  salaryRange: "De 10 a 20 Mil",
  startTime: "Estou pesquisando",
  consultant: "Sandro",
  source: "Meta",
});

function TemplateEditor({
  title,
  icon,
  tpl,
  onChange,
}: {
  title: string;
  icon: React.ReactNode;
  tpl: MessageTemplate;
  onChange: (t: MessageTemplate) => void;
}) {
  const [nonce, setNonce] = useState(0); // re-sorteia a prévia
  const blocks = Object.entries(tpl.randomBlocks);

  const setBlock = (name: string, optionsText: string) => {
    onChange({ ...tpl, randomBlocks: { ...tpl.randomBlocks, [name]: optionsText.split("\n").map((s) => s.trim()).filter(Boolean) } });
  };
  const renameBlock = (oldName: string, newName: string) => {
    const next: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(tpl.randomBlocks)) next[k === oldName ? newName : k] = v;
    onChange({ ...tpl, randomBlocks: next });
  };
  const removeBlock = (name: string) => {
    const next = { ...tpl.randomBlocks };
    delete next[name];
    onChange({ ...tpl, randomBlocks: next });
  };
  const addBlock = () => {
    let n = "bloco";
    let i = 1;
    while (Object.prototype.hasOwnProperty.call(tpl.randomBlocks, n)) n = `bloco${++i}`;
    onChange({ ...tpl, randomBlocks: { ...tpl.randomBlocks, [n]: [""] } });
  };

  const insertToken = (token: string) => {
    onChange({ ...tpl, text: `${tpl.text}{{${token}}}` });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <CardTitle className="text-[15px]">{title}</CardTitle>
          </div>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 rounded border-slate-300 accent-indigo-600 cursor-pointer" checked={tpl.enabled} onChange={(e) => onChange({ ...tpl, enabled: e.target.checked })} />
            <span className="text-sm font-medium text-slate-700">Ativa</span>
          </label>
        </div>
        <CardDescription>Use variáveis e blocos randômicos pra cada envio sair diferente — menos cara de robô.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <textarea
            value={tpl.text}
            onChange={(e) => onChange({ ...tpl, text: e.target.value })}
            rows={6}
            className="w-full rounded-md border border-slate-300 p-3 text-sm font-mono resize-y focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="Escreva a mensagem. Use {{nome}}, {{produto}}, {{saudacao}}..."
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {TEMPLATE_VARIABLE_DEFS.map((v) => (
              <button key={v.key} onClick={() => insertToken(v.key)} className="text-[11px] font-mono px-2 py-0.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-50" title={v.hint}>
                {`{{${v.key}}}`}
              </button>
            ))}
          </div>
        </div>

        {/* Blocos randômicos */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-600">Blocos randômicos (o motor sorteia uma opção por envio)</span>
            <Button size="sm" variant="outline" className="gap-1 h-7" onClick={addBlock}>
              <Plus className="w-3.5 h-3.5" /> Bloco
            </Button>
          </div>
          {blocks.length === 0 ? (
            <p className="text-xs text-slate-400">Nenhum bloco. Ex.: um bloco <span className="font-mono">saudacao</span> com várias opções, e use <span className="font-mono">{"{{saudacao}}"}</span> no texto.</p>
          ) : (
            <div className="space-y-3">
              {blocks.map(([name, options]) => (
                <div key={name} className="rounded-md border border-slate-200 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-slate-500">{"{{"}</span>
                    <input value={name} onChange={(e) => renameBlock(name, e.target.value.replace(/[^\w]/g, ""))} className="text-sm font-mono border-b border-slate-300 focus:outline-none focus:border-indigo-500 w-32" />
                    <span className="text-xs text-slate-500">{"}}"}</span>
                    <span className="text-[11px] text-slate-400 ml-auto">{options.length} opção(ões)</span>
                    <button onClick={() => removeBlock(name)} className="text-rose-500 hover:text-rose-600" title="Remover bloco">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <textarea
                    value={options.join("\n")}
                    onChange={(e) => setBlock(name, e.target.value)}
                    rows={Math.max(3, options.length)}
                    className="w-full rounded-md border border-slate-300 p-2 text-xs resize-y focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="Uma opção por linha"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Prévia */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-600">Prévia (lead de exemplo)</span>
            <Button size="sm" variant="ghost" className="gap-1 h-7 text-xs" onClick={() => setNonce((n) => n + 1)}>
              <Shuffle className="w-3.5 h-3.5" /> Sortear de novo
            </Button>
          </div>
          <div key={nonce} className="rounded-lg bg-emerald-50 border border-emerald-100 p-3 text-sm whitespace-pre-wrap text-slate-800 min-h-[60px]">
            {renderTemplate(tpl, SAMPLE) || <span className="text-slate-400">Mensagem vazia.</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function MessageTemplatesEditor({ workspaceId }: { workspaceId: string }) {
  const [templates, setTemplates] = useState<MessageTemplates>(DEFAULT_TEMPLATES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [persisted, setPersisted] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    getMessageTemplates(workspaceId).then((res) => {
      if (res.success) {
        setTemplates(res.templates);
        setPersisted(res.persisted);
      }
      setLoading(false);
    });
  }, [workspaceId]);

  const handleSave = async () => {
    setSaving(true);
    const res = await saveMessageTemplates(workspaceId, templates);
    setSaving(false);
    if (res.success) {
      setToast("Templates salvos.");
      setPersisted(true);
    } else {
      setToast("Não consegui salvar: " + res.error);
    }
    setTimeout(() => setToast(null), 4000);
  };

  if (loading) return <div className="py-8 text-center text-sm text-slate-400">Carregando templates…</div>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Mensagens</h2>
          <p className="text-sm text-slate-500 mt-1 max-w-xl">
            Templates que a automação dispara. A IA não decide o texto — você personaliza, com variáveis e variações naturais.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {toast && <span className="text-xs text-slate-500">{toast}</span>}
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="w-4 h-4" /> {saving ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </div>

      {!persisted && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Mostrando os templates padrão. Ao salvar pela primeira vez eles passam a valer para este cliente.
        </div>
      )}

      <TemplateEditor
        title="Mensagem para o cliente"
        icon={<MessageCircle className="w-4 h-4 text-sky-500" />}
        tpl={templates.client}
        onChange={(t) => setTemplates((prev) => ({ ...prev, client: t }))}
      />
      <TemplateEditor
        title="Mensagem para o grupo"
        icon={<Users className="w-4 h-4 text-emerald-500" />}
        tpl={templates.group}
        onChange={(t) => setTemplates((prev) => ({ ...prev, group: t }))}
      />
    </div>
  );
}
