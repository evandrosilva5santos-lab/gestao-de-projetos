import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, ArrowRightLeft, Activity, AlertCircle, LayoutDashboard, Settings, UserPlus, Inbox, Zap } from "lucide-react";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-slate-50/50 flex">
      {/* Sidebar Mock */}
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-slate-200">
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xl tracking-tight">
            <Zap className="w-6 h-6 fill-indigo-600" />
            Agency OS
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <Button variant="secondary" className="w-full justify-start gap-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100">
            <LayoutDashboard className="w-4 h-4" />
            Dashboard Motor
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-2 text-slate-600">
            <Inbox className="w-4 h-4" />
            CRM & Funil
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-2 text-slate-600">
            <Users className="w-4 h-4" />
            Clientes (Workspaces)
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-2 text-slate-600">
            <Settings className="w-4 h-4" />
            Regras de Roteamento
          </Button>
        </nav>
        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
              EA
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-slate-900">Admin</span>
              <span className="text-xs text-slate-500">Agência Mega</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">Motor de Leads</h1>
              <p className="text-slate-500 mt-1">Visão global da distribuição em tempo real.</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="gap-2">
                <Settings className="w-4 h-4" /> Configurar Regras
              </Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2">
                <UserPlus className="w-4 h-4" /> Novo Lead Manual
              </Button>
            </div>
          </div>

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
                      <div>Lead Inválido</div>
                      <div className="text-xs text-rose-500">Sem telefone/email</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-purple-600 bg-purple-50 border-purple-200">Landing Page</Badge>
                    </TableCell>
                    <TableCell>Estética Bela</TableCell>
                    <TableCell>
                      <Badge variant="destructive">Bloqueado</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-slate-400 italic">Deduplicado (Zod)</span>
                    </TableCell>
                    <TableCell className="text-right text-sm text-slate-500">Há 15 min</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">
                      <div>Carlos Souza</div>
                      <div className="text-xs text-slate-500">(21) 98888-2222</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-orange-600 bg-orange-50 border-orange-200">Google Ads</Badge>
                    </TableCell>
                    <TableCell>Agência Própria</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700 animate-pulse">Processando</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-slate-400 italic">Inngest executando...</span>
                    </TableCell>
                    <TableCell className="text-right text-sm text-slate-500">Há 40 seg</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
