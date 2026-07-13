"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Save, Trash2, CheckCircle2 } from "lucide-react";
import { FacebookIcon } from "./FacebookIcon";

type MetaConnection = {
  id: string;
  name: string;
  pageId: string;
  status: string;
  token: string;
};

// TODO (Fase 2 do PLANO-EXECUCAO-MODULO-LEADS.md): substituir formulário
// manual por OAuth "Facebook Login for Business" e persistir em
// gestao_leads_meta_connections via Server Action (features/leads/actions.ts).
export function MetaConnectionsTab() {
  const [metaConnections, setMetaConnections] = useState<MetaConnection[]>([
    { id: "1", name: "Mega Invest - Consórcio", pageId: "10938472918", status: "Conectado", token: "EAAGb..." },
    { id: "2", name: "Clínica Sorriso", pageId: "29384719284", status: "Conectado", token: "EAAGb..." }
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
    setMetaConnections(metaConnections.filter((c) => c.id !== id));
  };

  return (
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
                  placeholder="Ex: Clínica Sorriso Facebook"
                  className="w-full text-sm border border-slate-200 rounded-md p-2 bg-slate-50 focus:bg-white"
                  value={newConnName}
                  onChange={(e) => setNewConnName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600 block">ID da Página do Facebook</label>
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
  );
}
