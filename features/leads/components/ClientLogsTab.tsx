"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type AuditLog = {
  id: string;
  leadId: string;
  action: string;
  timestamp: string;
  leadName: string;
  leadPhone: string;
  details: Record<string, unknown> | null;
};

export function ClientLogsTab({ workspaceId }: { workspaceId: string }) {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const { getLeadAuditLogs } = await import("../actions");
      const result = await getLeadAuditLogs(workspaceId, 100);
      if (result.success) {
        setLogs(result.logs);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [workspaceId]);

  const getActionLabel = (action: string): { label: string; color: string } => {
    const actions: Record<string, { label: string; color: string }> = {
      round_robin_distribution: { label: "Distribuído", color: "bg-green-100 text-green-800" },
      error: { label: "Erro", color: "bg-red-100 text-red-800" },
      kommo_delivery: { label: "Kommo", color: "bg-blue-100 text-blue-800" },
      sheets_delivery: { label: "Sheets", color: "bg-yellow-100 text-yellow-800" },
      whatsapp_delivery: { label: "WhatsApp", color: "bg-purple-100 text-purple-800" },
    };
    return actions[action] || { label: action, color: "bg-gray-100 text-gray-800" };
  };

  if (loading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-slate-500">Carregando logs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <p className="text-red-700">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Leads & Logs</h2>
          <p className="text-sm text-slate-500 mt-1">Histórico de processamento ({logs.length} logs)</p>
        </div>
        <button
          onClick={fetchLogs}
          className="px-3 py-1 text-sm border border-slate-300 rounded-md hover:bg-slate-50"
        >
          Atualizar
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200">
            <tr>
              <th className="text-left py-3 px-4 font-semibold text-slate-700">Horário</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-700">Lead</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-700">Contato</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-700">Ação</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-700">Detalhes</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-slate-500">
                  Nenhum log disponível
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const actionInfo = getActionLabel(log.action);
                return (
                  <tr key={log.id} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="py-3 px-4 text-slate-600">
                      {new Date(log.timestamp).toLocaleString("pt-BR")}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{log.leadName}</div>
                      <div className="text-xs text-slate-500">{log.leadId.slice(0, 8)}...</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{log.leadPhone}</td>
                    <td className="py-3 px-4">
                      <Badge className={actionInfo.color}>{actionInfo.label}</Badge>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500">
                      {log.details?.seller_id ? `Vendedor: ${log.details.seller_id}` : "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-slate-500 text-center">
        Auto-atualiza a cada 5 segundos
      </div>
    </div>
  );
}
