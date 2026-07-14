"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Plus, Pencil, Trash2 } from "lucide-react";
import {
  getAllSellersQueue,
  toggleSellerActive,
  createSeller,
  updateSeller,
  deleteSeller
} from "../actions";

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

type SellerForm = { name: string; phone: string; crmUserId: string };
const emptyForm: SellerForm = { name: "", phone: "", crmUserId: "" };

export function SellersQueueTab({ workspaceId }: { workspaceId?: string } = {}) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal de criação/edição de vendedor
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SellerForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (seller: Seller) => {
    setEditingId(seller.id);
    setForm({ name: seller.name, phone: seller.phone || "", crmUserId: "" });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setFormError("Informe o nome do vendedor.");
      return;
    }
    setSaving(true);
    setFormError(null);
    const res = editingId
      ? await updateSeller(editingId, { name: form.name, phone: form.phone, crmUserId: form.crmUserId })
      : await createSeller({
          workspaceId: workspaceId!,
          name: form.name,
          phone: form.phone,
          crmUserId: form.crmUserId
        });
    setSaving(false);
    if (!res.success) {
      setFormError(res.error);
      return;
    }
    setModalOpen(false);
    load();
  };

  const handleDelete = async (seller: Seller) => {
    if (!confirm(`Remover ${seller.name} da fila? Esta ação não pode ser desfeita.`)) return;
    const res = await deleteSeller(seller.id);
    if (!res.success) {
      alert("Erro ao remover: " + res.error);
      return;
    }
    load();
  };

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-rose-600">{error}</CardContent>
      </Card>
    );
  }

  const visibleGroups = workspaceId ? groups.filter((g) => g.workspaceId === workspaceId) : groups;
  // Na visão de cliente (workspaceId definido) sempre mostramos um card com o
  // botão "Adicionar vendedor", mesmo quando a fila ainda está vazia.
  const showEmptyClientCard = !!workspaceId && !loading && visibleGroups.length === 0;

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
                <div className="flex items-center gap-2">
                  <Button variant="outline" className="gap-2" onClick={load}>
                    <RefreshCw className="w-4 h-4" /> Atualizar
                  </Button>
                  {workspaceId && (
                    <Button className="gap-2" onClick={openCreate}>
                      <Plus className="w-4 h-4" /> Adicionar vendedor
                    </Button>
                  )}
                </div>
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
                          <div className="flex items-center justify-end gap-1.5">
                            {workspaceId && (
                              <>
                                <Button variant="ghost" size="icon" onClick={() => openEdit(seller)} title="Editar">
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(seller)} title="Remover">
                                  <Trash2 className="w-4 h-4 text-rose-500" />
                                </Button>
                              </>
                            )}
                            <Button
                              variant={seller.isActive ? "destructive" : "secondary"}
                              size="sm"
                              onClick={() => handleToggle(seller)}
                            >
                              {seller.isActive ? "Pausar" : "Ativar na Fila"}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {group.sellers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-slate-400">
                        Nenhum vendedor nesta fila. Clique em “Adicionar vendedor” para começar.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}

      {showEmptyClientCard && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Fila da Vez</CardTitle>
                <CardDescription>
                  Nenhum vendedor cadastrado ainda. Adicione o primeiro para ativar o rodízio.
                </CardDescription>
              </div>
              <Button className="gap-2" onClick={openCreate}>
                <Plus className="w-4 h-4" /> Adicionar vendedor
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="py-8 text-center text-slate-400">Sem vendedores na fila.</div>
          </CardContent>
        </Card>
      )}

      {!loading && !workspaceId && visibleGroups.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-slate-400">Nenhum vendedor cadastrado ainda.</CardContent>
        </Card>
      )}

      {modalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100
          }}
          onClick={() => !saving && setModalOpen(false)}
        >
          <div
            style={{ background: "white", borderRadius: 12, padding: 28, width: "90%", maxWidth: 440 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>
                {editingId ? "Editar vendedor" : "Adicionar vendedor"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#666" }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 13, fontWeight: 600, color: "#334155" }}>
                Nome do vendedor *
                <input
                  autoFocus
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ex.: Carol"
                  style={inputStyle}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 13, fontWeight: 600, color: "#334155" }}>
                WhatsApp (opcional)
                <input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="Ex.: 5551991490515"
                  style={inputStyle}
                />
                <span style={{ fontSize: 11.5, fontWeight: 400, color: "#94a3b8" }}>
                  Usado para notificar o vendedor no privado quando ele recebe um lead.
                </span>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 13, fontWeight: 600, color: "#334155" }}>
                ID no Kommo (opcional)
                <input
                  value={form.crmUserId}
                  onChange={(e) => setForm((f) => ({ ...f, crmUserId: e.target.value }))}
                  placeholder="Só se este cliente dispara para o Kommo"
                  style={inputStyle}
                />
                <span style={{ fontSize: 11.5, fontWeight: 400, color: "#94a3b8" }}>
                  ID do responsável no Kommo, para atribuir o lead direto ao vendedor no CRM.
                </span>
              </label>

              {formError && <p style={{ margin: 0, color: "#e11d48", fontSize: 13 }}>{formError}</p>}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
              <button
                onClick={() => setModalOpen(false)}
                disabled={saving}
                style={{ padding: "9px 16px", border: "1px solid #ddd", borderRadius: 8, cursor: "pointer", background: "white", fontSize: 13, fontWeight: 600 }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{ padding: "9px 18px", border: "none", borderRadius: 8, cursor: "pointer", background: "var(--accent, #4f46e5)", color: "white", fontSize: 13, fontWeight: 600, opacity: saving ? 0.6 : 1 }}
              >
                {saving ? "Salvando…" : editingId ? "Salvar alterações" : "Adicionar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  height: 38,
  padding: "0 12px",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  fontSize: 14,
  outline: "none"
};
