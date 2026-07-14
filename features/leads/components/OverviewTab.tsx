"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, ArrowRightLeft, RotateCcw, AlertCircle } from "lucide-react";
import { getLeadsOverview } from "../actions";

type OverviewData = Awaited<ReturnType<typeof getLeadsOverview>>;

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Agora mesmo";
  if (minutes < 60) return `Há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Há ${hours} h`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

function statusBadge(status: string) {
  if (status === "distributed") return <Badge className="bg-emerald-500 hover:bg-emerald-600">Distribuído</Badge>;
  if (status === "error") return <Badge variant="outline" className="text-rose-700 bg-rose-50 border-rose-200">Erro</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

export function OverviewTab() {
  const [data, setData] = useState<OverviewData | null>(null);

  useEffect(() => {
    getLeadsOverview().then(setData);
  }, []);

  const metrics = data?.metrics;
  const leads = data?.recentLeads || [];

  return (
    <>
      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Leads Recebidos (Hoje)</CardTitle>
            <Users className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{metrics ? metrics.receivedToday : "—"}</div>
            <p className="text-xs text-slate-500 mt-1">Todos os clientes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Distribuídos (Hoje)</CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{metrics ? metrics.distributedToday : "—"}</div>
            <p className="text-xs text-slate-500 mt-1">Via Round Robin</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Reentradas (Hoje)</CardTitle>
            <RotateCcw className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{metrics ? metrics.returningToday : "—"}</div>
            <p className="text-xs text-slate-500 mt-1">Voltou pro mesmo vendedor</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Falhas / Erros (Hoje)</CardTitle>
            <AlertCircle className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{metrics ? metrics.errorToday : "—"}</div>
            <p className="text-xs text-rose-500 mt-1">Sem vendedor atribuído</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Auditoria de Leads em Tempo Real</CardTitle>
          <CardDescription>
            Acompanhe o percurso exato de cada lead desde o webhook até a distribuição pro vendedor.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Cliente (Workspace)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Vendedor Designado</TableHead>
                <TableHead className="text-right">Horário</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium">
                    <div>{lead.name}</div>
                    <div className="text-xs text-slate-500">{lead.contact}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-blue-600 bg-blue-50 border-blue-200">{lead.source}</Badge>
                  </TableCell>
                  <TableCell>{lead.workspaceName}</TableCell>
                  <TableCell>
                    {lead.isReturning ? (
                      <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-200">Reentrada</Badge>
                    ) : (
                      statusBadge(lead.status)
                    )}
                  </TableCell>
                  <TableCell>
                    {lead.sellerName ? (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200 text-[10px] flex items-center justify-center font-bold">
                          {lead.sellerName.slice(0, 2).toUpperCase()}
                        </div>
                        {lead.sellerName}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-sm text-slate-500">{relativeTime(lead.createdAt)}</TableCell>
                </TableRow>
              ))}
              {data && leads.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-slate-400 py-8">
                    Nenhum lead recebido ainda.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
