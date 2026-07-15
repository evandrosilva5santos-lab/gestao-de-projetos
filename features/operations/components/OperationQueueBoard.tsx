"use client";

import { useEffect, useState } from "react";
import { getOperationQueue, OperationLead, OperationQueueResult, OperationStatus } from "../actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, Clock, XCircle, AlertCircle, RefreshCw } from "lucide-react";

function StatusBadge({ status, error }: { status: OperationStatus; error?: string }) {
  switch (status) {
    case "success":
      return (
        <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md w-fit">
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-xs font-medium">Sucesso</span>
        </div>
      );
    case "error":
      return (
        <div className="flex flex-col gap-1 w-fit">
          <div className="flex items-center gap-1.5 text-red-600 bg-red-50 px-2 py-1 rounded-md w-fit">
            <XCircle className="h-4 w-4" />
            <span className="text-xs font-medium">Falha</span>
          </div>
          {error && <span className="text-[10px] text-red-500 max-w-[120px] truncate" title={error}>{error}</span>}
        </div>
      );
    case "skipped":
      return (
        <div className="flex items-center gap-1.5 text-slate-600 bg-slate-100 px-2 py-1 rounded-md w-fit">
          <AlertCircle className="h-4 w-4" />
          <span className="text-xs font-medium">Pulado</span>
        </div>
      );
    case "pending":
    default:
      return (
        <div className="flex items-center gap-1.5 text-slate-400 bg-slate-50 px-2 py-1 rounded-md w-fit border border-dashed">
          <Clock className="h-4 w-4" />
          <span className="text-xs font-medium">Pendente</span>
        </div>
      );
  }
}

export function OperationQueueBoard({ workspaceId }: { workspaceId?: string }) {
  const [data, setData] = useState<OperationQueueResult | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchQueue = async () => {
    setLoading(true);
    const result = await getOperationQueue(workspaceId);
    setData(result);
    setLoading(false);
  };

  useEffect(() => {
    fetchQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  if (!workspaceId) {
    return (
      <div className="flex h-[400px] items-center justify-center border border-dashed rounded-lg bg-slate-50/50">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-4 font-medium text-slate-800">Selecione um Cliente</h3>
          <p className="mt-2 text-sm text-slate-500 max-w-sm">
            Escolha um cliente no menu lateral para visualizar os logs de operação.
          </p>
        </div>
      </div>
    );
  }

  const summary = data?.success ? data.summary : null;
  const leads = data?.success ? data.leads : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-800">Logs & Automação</h2>
          <p className="text-slate-500 mt-1">
            Fila de Operação Visual. Acompanhe o percurso de cada lead e identifique gargalos.
          </p>
        </div>
        <button 
          onClick={fetchQueue}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium border rounded-md shadow-sm bg-white hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </button>
      </div>

      {summary && (
        <div className="grid grid-cols-4 gap-4">
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-slate-500">Total Recentes</p>
              <h3 className="text-2xl font-bold mt-1 text-slate-800">{summary.total}</h3>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-slate-500">Completos (S/ Erros)</p>
              <h3 className="text-2xl font-bold mt-1 text-emerald-600">{summary.completed}</h3>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-slate-500">Pendentes</p>
              <h3 className="text-2xl font-bold mt-1 text-amber-500">{summary.pending}</h3>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-slate-500">Com Falha</p>
              <h3 className="text-2xl font-bold mt-1 text-red-600">{summary.error}</h3>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="shadow-sm overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 bg-slate-50 border-b">
              <tr>
                <th className="px-6 py-4 font-medium">Lead</th>
                <th className="px-6 py-4 font-medium">Planilha (Sheets)</th>
                <th className="px-6 py-4 font-medium">App (CRM)</th>
                <th className="px-6 py-4 font-medium">Kommo CRM</th>
                <th className="px-6 py-4 font-medium">WhatsApp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && leads.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    Carregando fila de operação...
                  </td>
                </tr>
              ) : !data?.success ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-red-500">
                    Erro ao carregar dados: {data?.error || "Erro desconhecido"}
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    Nenhum lead encontrado para este workspace recentemente.
                  </td>
                </tr>
              ) : (
                leads.map((lead: OperationLead) => (
                  <tr key={lead.id} className="bg-white hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{lead.name}</div>
                      <div className="text-slate-500 text-xs mt-0.5">{lead.phone || "—"}</div>
                      <div className="text-slate-400 text-[10px] mt-1">
                        {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(lead.createdAt))}
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <StatusBadge status={lead.deliveries.sheets.status} error={lead.deliveries.sheets.error} />
                    </td>
                    <td className="px-6 py-4 align-top">
                      <StatusBadge status={lead.deliveries.app.status} error={lead.deliveries.app.error} />
                    </td>
                    <td className="px-6 py-4 align-top">
                      <StatusBadge status={lead.deliveries.kommo.status} error={lead.deliveries.kommo.error} />
                    </td>
                    <td className="px-6 py-4 align-top">
                      <StatusBadge status={lead.deliveries.whatsapp.status} error={lead.deliveries.whatsapp.error} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
