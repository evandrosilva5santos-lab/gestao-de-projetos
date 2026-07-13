import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, ArrowRightLeft, Activity, AlertCircle } from "lucide-react";

// TODO (Fase 5 do PLANO-EXECUCAO-MODULO-LEADS.md): substituir dados mock
// por TanStack Query lendo gestao_leads / gestao_leads_audit_logs via
// Supabase Realtime, filtrado por workspace_id.
export function OverviewTab() {
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
            <div className="text-2xl font-bold text-slate-900">1,248</div>
            <p className="text-xs text-emerald-600 font-medium mt-1">+12% vs ontem</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Distribuídos</CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">1,240</div>
            <p className="text-xs text-slate-500 mt-1">Via Round Robin</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Em Processamento</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">5</div>
            <p className="text-xs text-slate-500 mt-1">Fila do Inngest</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Falhas / Erros</CardTitle>
            <AlertCircle className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">3</div>
            <p className="text-xs text-rose-500 mt-1">Exigem ação</p>
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
              <TableRow>
                <TableCell className="font-medium">
                  <div>João Silva</div>
                  <div className="text-xs text-slate-500">(11) 99999-1111</div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-blue-600 bg-blue-50 border-blue-200">Meta Ads</Badge>
                </TableCell>
                <TableCell>Clinica Sorriso</TableCell>
                <TableCell>
                  <Badge className="bg-emerald-500 hover:bg-emerald-600">Distribuído</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-200 text-[10px] flex items-center justify-center font-bold">MC</div>
                    Marcos C.
                  </div>
                </TableCell>
                <TableCell className="text-right text-sm text-slate-500">Agora mesmo</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">
                  <div>Maria Oliveira</div>
                  <div className="text-xs text-slate-500">maria@email.com</div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-200">WhatsApp</Badge>
                </TableCell>
                <TableCell>Construtora XYZ</TableCell>
                <TableCell>
                  <Badge className="bg-emerald-500 hover:bg-emerald-600">Distribuído</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-200 text-[10px] flex items-center justify-center font-bold">AL</div>
                    Aline L.
                  </div>
                </TableCell>
                <TableCell className="text-right text-sm text-slate-500">Há 2 min</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">
                  <div>Lead Duplicado</div>
                  <div className="text-xs text-slate-500">carlosteste@email.com</div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-blue-600 bg-blue-50 border-blue-200">Meta Ads</Badge>
                </TableCell>
                <TableCell>Mega Invest</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-200">Re-roteado</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-200 text-[10px] flex items-center justify-center font-bold">AL</div>
                    Aline L. (Anterior)
                  </div>
                </TableCell>
                <TableCell className="text-right text-sm text-slate-500">Há 15 min</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
