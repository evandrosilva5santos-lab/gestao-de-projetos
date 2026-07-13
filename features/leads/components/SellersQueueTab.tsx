"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

type Seller = {
  id: string;
  name: string;
  phone: string;
  is_active: boolean;
  last_assigned: string;
};

// TODO (Fase 1/5 do PLANO-EXECUCAO-MODULO-LEADS.md): substituir dados mock
// por leitura de gestao_leads_sellers (não core_workspace_users — vendedores
// do rodízio não têm login, ver 00 - Regras/DATABASE-NAMING.md) e o toggle
// de status via Server Action, com Supabase Realtime.
export function SellersQueueTab() {
  const [sellers, setSellers] = useState<Seller[]>([
    { id: "s1", name: "Marcos Castilho", phone: "(11) 99999-1111", is_active: true, last_assigned: "Agora mesmo" },
    { id: "s2", name: "Aline Lemos", phone: "(21) 98888-2222", is_active: true, last_assigned: "Há 10 min" },
    { id: "s3", name: "Eduardo Rocha", phone: "(31) 97777-3333", is_active: false, last_assigned: "Ontem" }
  ]);

  const toggleSellerActive = (id: string) => {
    setSellers(sellers.map((s) => (s.id === id ? { ...s, is_active: !s.is_active } : s)));
  };

  return (
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
  );
}
