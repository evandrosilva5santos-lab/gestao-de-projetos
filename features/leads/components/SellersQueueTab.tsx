"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { getAllSellersQueue, toggleSellerActive } from "../actions";

type Seller = { id: string; name: string; phone: string | null; isActive: boolean; lastAssignedAt: string | null };
type Group = { workspaceId: string; workspaceName: string; sellers: Seller[] };

function relativeTime(iso: string | null): string {
  if (!iso) return "Nunca atendeu";
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Agora mesmo";
  if (minutes < 60) return `Há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Há ${hours} h`;
  const days = Math.floor(hours / 24);
  return `Há ${days} dia(s)`;
}

export function SellersQueueTab({ workspaceId }: { workspaceId?: string } = {}) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGroups = useCallback(() => {
    getAllSellersQueue().then((res) => {
      setLoading(false);
      if (!res.success) {
        setError(res.error);
        return;
      }
      setGroups(res.groups);
    });
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const load = useCallback(() => {
    setLoading(true);
    fetchGroups();
  }, [fetchGroups]);

  const handleToggle = async (seller: Seller) => {
    const next = !seller.isActive;
    setGroups((prev) =>
      prev.map((g) => ({
        ...g,
        sellers: g.sellers.map((s) => (s.id === seller.id ? { ...s, isActive: next } : s))
      }))
    );
    const res = await toggleSellerActive(seller.id, next);
    if (!res.success) {
      alert("Erro ao atualizar: " + res.error);
      load();
    }
  };

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-rose-600">{error}</CardContent>
      </Card>
    );
  }

  const visibleGroups = workspaceId ? groups.filter((g) => g.workspaceId === workspaceId) : groups;

  return (
    <div className="flex flex-col gap-5">
      {visibleGroups.map((group) => {
        // Só entram no ranking de posição os vendedores ativos, ordenados por
        // last_assigned_at ASC NULLS FIRST — o mesmo critério do RPC assign_next_seller*.
        const activeSorted = [...group.sellers]
          .filter((s) => s.isActive)
          .sort((a, b) => {
            if (!a.lastAssignedAt && !b.lastAssignedAt) return 0;
            if (!a.lastAssignedAt) return -1;
            if (!b.lastAssignedAt) return 1;
            return new Date(a.lastAssignedAt).getTime() - new Date(b.lastAssignedAt).getTime();
          });
        const positionOf = new Map(activeSorted.map((s, i) => [s.id, i]));

        return (
          <Card key={group.workspaceId}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{workspaceId ? "Fila da Vez" : `${group.workspaceName} — Fila da Vez`}</CardTitle>
                  <CardDescription>
                    Ordem de recebimento de novos leads. Vendedores pausados são ignorados na rodada.
                  </CardDescription>
                </div>
                <Button variant="outline" className="gap-2" onClick={load}>
                  <RefreshCw className="w-4 h-4" /> Atualizar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Último Lead Recebido</TableHead>
                    <TableHead>Fila (Ordem)</TableHead>
                    <TableHead>Status da Fila</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.sellers.map((seller) => {
                    const position = positionOf.get(seller.id);
                    return (
                      <TableRow key={seller.id} className={!seller.isActive ? "opacity-50" : ""}>
                        <TableCell className="font-semibold text-slate-800">{seller.name}</TableCell>
                        <TableCell className="text-slate-500 font-mono text-sm">{seller.phone || "—"}</TableCell>
                        <TableCell className="text-slate-600">{relativeTime(seller.lastAssignedAt)}</TableCell>
                        <TableCell>
                          {seller.isActive ? (
                            <Badge variant="outline" className="border-indigo-200 text-indigo-700 bg-indigo-50">
                              Posição #{(position ?? 0) + 1}
                            </Badge>
                          ) : (
                            <span className="text-slate-400 italic text-xs">Fora da Fila</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {position === 0 && seller.isActive ? (
                            <Badge className="bg-indigo-600 animate-pulse">É A VEZ DELE(A)</Badge>
                          ) : seller.isActive ? (
                            <span className="text-slate-400 text-xs">Aguardando vez</span>
                          ) : (
                            <span className="text-slate-400 text-xs">Pausado</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant={seller.isActive ? "destructive" : "secondary"}
                            size="sm"
                            onClick={() => handleToggle(seller)}
                          >
                            {seller.isActive ? "Pausar" : "Ativar na Fila"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}

      {!loading && visibleGroups.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-slate-400">Nenhum vendedor cadastrado ainda.</CardContent>
        </Card>
      )}
    </div>
  );
}
