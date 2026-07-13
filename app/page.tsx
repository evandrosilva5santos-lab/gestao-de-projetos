"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, ArrowRightLeft, Activity, AlertCircle, LayoutDashboard, Settings, 
  UserPlus, Inbox, Zap, Save, RefreshCw, Trash2, CheckCircle2, AlertTriangle 
} from "lucide-react";

// Ícone do Facebook SVG Customizado (para evitar problemas de versão do Lucide)
const FacebookIcon = (props: React.ComponentProps<"svg">) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<"overview" | "meta" | "sellers">("overview");

  // Estados simulados para interação na UI
  const [metaConnections, setMetaConnections] = useState([
    { id: "1", name: "Mega Invest - Consórcio", pageId: "10938472918", status: "Conectado", token: "EAAGb..." },
    { id: "2", name: "Clínica Sorriso", pageId: "29384719284", status: "Conectado", token: "EAAGb..." }
  ]);

  const [sellers, setSellers] = useState([
    { id: "s1", name: "Marcos Castilho", phone: "(11) 99999-1111", is_active: true, last_assigned: "Agora mesmo" },
    { id: "s2", name: "Aline Lemos", phone: "(21) 98888-2222", is_active: true, last_assigned: "Há 10 min" },
    { id: "s3", name: "Eduardo Rocha", phone: "(31) 97777-3333", is_active: false, last_assigned: "Ontem" }
  ]);

  const [newConnName, setNewConnName] = useState("");
  const [newConnPageId, setNewConnPageId] = useState("");
  const [newConnToken, setNewConnToken] = useState("");

  const handleAddMeta = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConnName || !newConnPageId || !newConnToken) return;
    setMetaConnections([
      ...metaConnections,
      {
        id: Date.now().toString(),
        name: newConnName,
        pageId: newConnPageId,
        status: "Conectado",
        token: newConnToken.slice(0, 8) + "..."
      }
    ]);
    setNewConnName("");
    setNewConnPageId("");
    setNewConnToken("");
  };

  const handleDeleteMeta = (id: string) => {
    setMetaConnections(metaConnections.filter(c => c.id !== id));
  };

  const toggleSellerActive = (id: string) => {
    setSellers(sellers.map(s => s.id === id ? { ...s, is_active: !s.is_active } : s));
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-slate-200">
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xl tracking-tight">
            <Zap className="w-6 h-6 fill-indigo-600" />
            Agency OS
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <Button 
            variant={activeTab === "overview" ? "secondary" : "ghost"} 
            className={`w-full justify-start gap-2 ${activeTab === "overview" ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100" : "text-slate-600"}`}
            onClick={() => setActiveTab("overview")}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard Motor
          </Button>
          <Button 
            variant={activeTab === "meta" ? "secondary" : "ghost"} 
            className={`w-full justify-start gap-2 ${activeTab === "meta" ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100" : "text-slate-600"}`}
            onClick={() => setActiveTab("meta")}
          >
            <FacebookIcon className="w-4 h-4" />
            Conexões Meta Ads
          </Button>
          <Button 
            variant={activeTab === "sellers" ? "secondary" : "ghost"} 
            className={`w-full justify-start gap-2 ${activeTab === "sellers" ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100" : "text-slate-600"}`}
            onClick={() => setActiveTab("sellers")}
          >
            <Users className="w-4 h-4" />
            Vendedores & Fila
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
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                {activeTab === "overview" && "Motor de Leads"}
                {activeTab === "meta" && "Conexões Meta Ads"}
                {activeTab === "sellers" && "Vendedores da Vez"}
              </h1>
              <p className="text-slate-500 mt-1">
                {activeTab === "overview" && "Visão global da distribuição em tempo real."}
                {activeTab === "meta" && "Gerencie as chaves de API e emparelhe as páginas do FacebookIcon dos seus clientes."}
                {activeTab === "sellers" && "Gerencie a fila de atendimento Round Robin e consulte quem é o próximo."}
              </p>
            </div>
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
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
          )}

          {/* TAB 2: META ADS CONFIG */}
          {activeTab === "meta" && (
            <div className="grid md:grid-cols-3 gap-8">
              {/* Form de Conexão */}
              <div className="md:col-span-1 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Conectar Página</CardTitle>
                    <CardDescription>
                      Insira os tokens da Meta Graph API obtidos no seu painel de desenvolvedor.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleAddMeta} className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-600 block">Nome da Conexão</label>
                        <input 
                          type="text" 
                          placeholder="Ex: Clínica Sorriso FacebookIcon" 
                          className="w-full text-sm border border-slate-200 rounded-md p-2 bg-slate-50 focus:bg-white"
                          value={newConnName}
                          onChange={(e) => setNewConnName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-600 block">ID da Página do FacebookIcon</label>
                        <input 
                          type="text" 
                          placeholder="Ex: 109823472918" 
                          className="w-full text-sm border border-slate-200 rounded-md p-2 bg-slate-50 focus:bg-white"
                          value={newConnPageId}
                          onChange={(e) => setNewConnPageId(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-600 block">Token de Acesso (Page Access Token)</label>
                        <textarea 
                          placeholder="EAAGb..." 
                          className="w-full text-sm border border-slate-200 rounded-md p-2 bg-slate-50 focus:bg-white h-24"
                          value={newConnToken}
                          onChange={(e) => setNewConnToken(e.target.value)}
                        />
                      </div>
                      <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 gap-2">
                        <Save className="w-4 h-4" /> Salvar Conexão
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                <div className="bg-blue-50 border border-blue-200 rounded-md p-4 space-y-2 text-xs text-blue-700">
                  <div className="flex items-center gap-2 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    Como funciona o pareamento?
                  </div>
                  <p>
                    O webhook do Facebook envia o ID da página que gerou o Lead. O nosso roteador busca nessa lista a chave da API correta daquela página, extrai os detalhes do Lead e faz a distribuição automática.
                  </p>
                </div>
              </div>

              {/* Conexões Ativas */}
              <div className="md:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Conexões Emparelhadas</CardTitle>
                    <CardDescription>
                      Páginas autorizadas para receber Leads em tempo real.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Página / Conta</TableHead>
                          <TableHead>ID da Página</TableHead>
                          <TableHead>Token</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Ação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {metaConnections.map((conn) => (
                          <TableRow key={conn.id}>
                            <TableCell className="font-semibold text-slate-800 flex items-center gap-2">
                              <FacebookIcon className="w-4 h-4 text-blue-600 fill-blue-600" />
                              {conn.name}
                            </TableCell>
                            <TableCell className="text-slate-500 font-mono text-xs">{conn.pageId}</TableCell>
                            <TableCell className="text-slate-400 font-mono text-xs">{conn.token}</TableCell>
                            <TableCell>
                              <Badge className="bg-emerald-500">{conn.status}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                onClick={() => handleDeleteMeta(conn.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {metaConnections.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-slate-400 py-8">
                              Nenhuma página conectada ainda. Preencha o formulário ao lado.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* TAB 3: SELLERS ROUND ROBIN */}
          {activeTab === "sellers" && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Lista de Atendimento (Fila da Vez)</CardTitle>
                    <CardDescription>
                      Ordem de recebimento de novos leads. Vendedores inativos são ignorados temporariamente.
                    </CardDescription>
                  </div>
                  <Button variant="outline" className="gap-2">
                    <RefreshCw className="w-4 h-4" /> Resetar Ordem
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendedor</TableHead>
                      <TableHead>WhatsApp (Evolution)</TableHead>
                      <TableHead>Último Lead Recebido</TableHead>
                      <TableHead>Fila (Ordem)</TableHead>
                      <TableHead>Status da Fila</TableHead>
                      <TableHead className="text-right">Status de Distribuição</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sellers.map((seller, index) => (
                      <TableRow key={seller.id} className={!seller.is_active ? "opacity-50" : ""}>
                        <TableCell className="font-semibold text-slate-800">{seller.name}</TableCell>
                        <TableCell className="text-slate-500 font-mono text-sm">{seller.phone}</TableCell>
                        <TableCell className="text-slate-600">{seller.last_assigned}</TableCell>
                        <TableCell>
                          {seller.is_active ? (
                            <Badge variant="outline" className="border-indigo-200 text-indigo-700 bg-indigo-50">
                              Posição #{index + 1}
                            </Badge>
                          ) : (
                            <span className="text-slate-400 italic text-xs">Fora da Fila</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {index === 0 && seller.is_active ? (
                            <Badge className="bg-indigo-600 animate-pulse">É A VEZ DELE(A)</Badge>
                          ) : seller.is_active ? (
                            <span className="text-slate-400 text-xs">Aguardando vez</span>
                          ) : (
                            <span className="text-slate-400 text-xs">Ignorado</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant={seller.is_active ? "destructive" : "secondary"} 
                            size="sm"
                            onClick={() => toggleSellerActive(seller.id)}
                          >
                            {seller.is_active ? "Pausar" : "Ativar na Fila"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

        </div>
      </main>
    </div>
  );
}
