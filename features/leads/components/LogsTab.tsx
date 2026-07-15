"use client";

import { useEffect, useState } from "react";
import { getLeadsOperationStatus } from "../actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings2, AlertCircle, CheckCircle2, Clock, XCircle } from "lucide-react";


type OperationPipeline = Awaited<ReturnType<typeof getLeadsOperationStatus>>["pipeline"];

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "success": return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
    case "pending": return <Clock className="h-5 w-5 text-slate-300" />;
    case "error": return <XCircle className="h-5 w-5 text-red-500" />;
    case "warning": return <AlertCircle className="h-5 w-5 text-amber-500" />;
    default: return <Clock className="h-5 w-5 text-slate-300" />;
  }
}

export function LogsTab({ workspaceId }: { workspaceId?: string }) {
  const [pipeline, setPipeline] = useState<OperationPipeline>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) return;

    let mounted = true;
    async function load() {
      setLoading(true);
      const res = await getLeadsOperationStatus(workspaceId as string);
      if (mounted && res.success) {
        setPipeline(res.pipeline);
      }
      if (mounted) setLoading(false);
    }
    load();

    return () => { mounted = false; };
  }, [workspaceId]);

  if (!workspaceId) {
    return (
      <div className="flex h-[400px] items-center justify-center border border-dashed rounded-lg bg-slate-50/50">
        <div className="text-center">
          <Settings2 className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-4 font-medium text-slate-800">Selecione um Cliente</h3>
          <p className="mt-2 text-sm text-slate-500 max-w-sm">
            Escolha um cliente no menu lateral para visualizar os logs de operação.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-800">Logs & Automação</h2>
        <p className="text-slate-500 mt-1">
          Acompanhe o percurso de cada lead na Fila de Operação Visual. Identifique gargalos e falhas de envio.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fila de Operação Visual</CardTitle>
          <CardDescription>
            Mostrando os últimos 20 leads e seus status de sincronização (App → Planilha → Kommo → WhatsApp).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-sm text-slate-500">Carregando Fila...</div>
          ) : pipeline?.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">Nenhum lead encontrado para este cliente.</div>
          ) : (
            <div className="relative w-full overflow-auto">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                  <tr className="border-b transition-colors hover:bg-slate-100/50 data-[state=selected]:bg-slate-100">
                    <th className="h-12 px-4 text-left align-middle font-medium text-slate-500">Lead</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-slate-500">App (Salvo)</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-slate-500">Planilha (Google)</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-slate-500">CRM (Kommo)</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-slate-500">WhatsApp</th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {pipeline?.map((lead) => (
                    <tr key={lead.id} className="border-b transition-colors hover:bg-slate-100/50">
                      <td className="p-4 align-middle">
                        <div className="font-medium">{lead.name}</div>
                        <div className="text-xs text-slate-500">{lead.phone || "—"}</div>
                        <div className="text-[10px] text-slate-400 mt-1">
                          {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(lead.createdAt))}
                        </div>
                      </td>
                      <td className="p-4 align-middle">
                        <div className="flex items-center gap-2">
                          <StatusIcon status={lead.steps.app.status} />
                          <span className="text-xs text-slate-600 hidden sm:inline">{lead.steps.app.detail}</span>
                        </div>
                      </td>
                      <td className="p-4 align-middle">
                        <div className="flex items-center gap-2">
                          <StatusIcon status={lead.steps.sheet.status} />
                          <span className="text-xs text-slate-600 hidden sm:inline">{lead.steps.sheet.detail}</span>
                        </div>
                      </td>
                      <td className="p-4 align-middle">
                        <div className="flex items-center gap-2">
                          <StatusIcon status={lead.steps.kommo.status} />
                          <span className="text-xs text-slate-600 hidden sm:inline">{lead.steps.kommo.detail}</span>
                        </div>
                      </td>
                      <td className="p-4 align-middle">
                        <div className="flex items-center gap-2">
                          <StatusIcon status={lead.steps.wpp.status} />
                          <span className="text-xs text-slate-600 hidden sm:inline">{lead.steps.wpp.detail}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
