"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import { getTemplateFieldMapping, saveFieldOverride } from "../actions";

type Field = {
  label: string;
  sample: string;
  conceptKey: string | null;
  conceptLabel: string | null;
  templateVar: string | null;
  status: "mapeado" | "sem_variavel" | "nao_mapeado";
  overridden: boolean;
};
type ConceptOption = { key: string; label: string; templateVar: string };

export function FieldMappingReview({ workspaceId }: { workspaceId: string }) {
  const [fields, setFields] = useState<Field[]>([]);
  const [missingVars, setMissingVars] = useState<string[]>([]);
  const [options, setOptions] = useState<ConceptOption[]>([]);
  const [analisados, setAnalisados] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    getTemplateFieldMapping(workspaceId).then((res) => {
      if (res.success) {
        setFields(res.fields);
        setMissingVars(res.missingVars);
        setOptions(res.conceptOptions);
        setAnalisados(res.leadsAnalisados);
      }
      setLoading(false);
    });
  }, [workspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleOverride = async (label: string, conceptKey: string) => {
    await saveFieldOverride(workspaceId, label, conceptKey || null);
    load();
  };

  const naoMapeados = fields.filter((f) => f.status === "nao_mapeado").length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-[15px]">Mapeamento dos campos do formulário</CardTitle>
            <CardDescription>
              O que chega da Meta → qual variável do template. {analisados} lead(s) analisado(s).
              {naoMapeados > 0 && <span className="text-amber-600 font-medium"> {naoMapeados} campo(s) precisam de ajuste.</span>}
            </CardDescription>
          </div>
          <button onClick={load} className="text-slate-400 hover:text-slate-600" title="Reanalisar">
            <RefreshCw className={loading ? "w-4 h-4 animate-spin" : "w-4 h-4"} />
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-6 text-center text-sm text-slate-400">Analisando os campos que chegam…</div>
        ) : fields.length === 0 ? (
          <div className="py-6 text-center text-sm text-slate-400">
            Nenhum lead com dados de formulário ainda — assim que chegar um lead da Meta, o mapeamento aparece aqui.
          </div>
        ) : (
          <div className="space-y-2">
            {fields.map((f) => (
              <div key={f.label} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-2.5 rounded-lg border border-slate-100">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-800 truncate" title={f.label}>{f.label}</div>
                  {f.sample && <div className="text-xs text-slate-400 truncate">ex.: {f.sample}</div>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {f.status === "mapeado" && (
                    <Badge className="bg-emerald-500 hover:bg-emerald-600 gap-1">
                      <CheckCircle2 className="w-3 h-3" /> {`{{${f.templateVar}}}`}
                    </Badge>
                  )}
                  {f.status === "sem_variavel" && (
                    <Badge variant="outline" className="text-slate-500">{f.conceptLabel} (rastreio)</Badge>
                  )}
                  {f.status === "nao_mapeado" && (
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      <select
                        defaultValue=""
                        onChange={(e) => handleOverride(f.label, e.target.value)}
                        className="text-xs border border-amber-300 rounded-md px-2 py-1 bg-amber-50 text-amber-800"
                      >
                        <option value="">Mapear para…</option>
                        {options.map((o) => (
                          <option key={o.key} value={o.key}>{`{{${o.templateVar}}}`} — {o.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {f.overridden && f.status === "mapeado" && (
                    <button onClick={() => handleOverride(f.label, "")} className="text-[10px] text-slate-400 hover:text-rose-500" title="Remover ajuste manual">
                      (manual ✕)
                    </button>
                  )}
                </div>
              </div>
            ))}

            {missingVars.length > 0 && (
              <div className="mt-3 text-xs text-slate-500">
                Variáveis sem nenhum campo alimentando (vão renderizar vazias):{" "}
                {missingVars.map((v) => <span key={v} className="font-mono text-slate-400 mr-1">{`{{${v}}}`}</span>)}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
