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
  deleteSeller,
  getWorkspaceRules,
  updateWorkspaceRules
} from "../actions";
import { isSellerAvailable, WEEKDAY_LABELS, type SellerAvailability } from "@/lib/leads/availability";
import type { QualificationRule, QualificationCriterion } from "@/lib/leads/qualification";

type Seller = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  crmUserId: string | null;
  isActive: boolean;
  lastAssignedAt: string | null;
  availability: SellerAvailability;
};
type Group = { workspaceId: string; workspaceName: string; sellers: Seller[] };

type WorkspaceRules = {
  respectHours: boolean;
  skipUnavailable: boolean;
  queuePaused: boolean;
  qualification: QualificationRule;
};

const QUALIFICATION_OPTIONS: { value: QualificationCriterion; label: string; hint: string }[] = [
  { value: "has_phone", label: "Tem telefone", hint: "Só entra na Rodada quem informou telefone." },
  { value: "has_email", label: "Tem e-mail", hint: "Só entra na Rodada quem informou e-mail." },
  { value: "field_equals", label: "Campo do formulário", hint: 'Ex.: só quem respondeu "quero orçamento".' },
  { value: "utm_source", label: "Origem / campanha (UTM)", hint: "Ex.: só leads de uma campanha específica." },
];

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

type SellerForm = { name: string; phone: string; crmUserId: string; availability: SellerAvailability };
const emptyForm: SellerForm = { name: "", phone: "", crmUserId: "", availability: {} };

const defaultRules: WorkspaceRules = {
  respectHours: false,
  skipUnavailable: true,
  queuePaused: false,
  qualification: { enabled: false },
};

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

  // Regras da rodada (disponibilidade) + Qualificação de leads — por cliente.
  const [rules, setRules] = useState<WorkspaceRules>(defaultRules);
  const [rulesLoading, setRulesLoading] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;
    let mounted = true;
    getWorkspaceRules(workspaceId).then((res) => {
      if (mounted && res.success) setRules(res.rules);
    });
    return () => {
      mounted = false;
    };
  }, [workspaceId]);

  const patchRules = async (patch: Partial<WorkspaceRules>) => {
    if (!workspaceId) return;
    const next = { ...rules, ...patch };
    setRules(next); // otimista — mesmo padrão dos toggles de vendedor
    setRulesLoading(true);
    const res = await updateWorkspaceRules(workspaceId, patch);
    setRulesLoading(false);
    if (!res.success) {
      alert("Erro ao salvar regra: " + res.error);
      setRules(rules); // reverte
    }
  };

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleToggleSelectAll = (sellers: Seller[], checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      sellers.forEach(s => {
        if (checked) next.add(s.id);
        else next.delete(s.id);
      });
      return next;
    });
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleBulkToggle = async (sellers: Seller[], forceActive: boolean) => {
    const toUpdate = sellers.filter(s => selectedIds.has(s.id) && s.isActive !== forceActive);
    if (toUpdate.length === 0) return;
    
    // Optimistic update
    setGroups((prev) =>
      prev.map((g) => ({
        ...g,
        sellers: g.sellers.map((s) => (selectedIds.has(s.id) ? { ...s, isActive: forceActive } : s))
      }))
    );
    
    // API calls in parallel
    await Promise.all(toUpdate.map(s => toggleSellerActive(s.id, forceActive)));
    
    setSelectedIds(new Set());
    load();
  };

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
    setForm({ name: seller.name, phone: seller.phone || "", crmUserId: "", availability: seller.availability ?? {} });
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
      ? await updateSeller(editingId, { name: form.name, phone: form.phone, crmUserId: form.crmUserId, availability: form.availability })
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
                  {group.sellers.some(s => selectedIds.has(s.id)) && (
                    <>
                      <Button variant="secondary" className="gap-2" onClick={() => handleBulkToggle(group.sellers, false)}>
                        Pausar Selecionados
                      </Button>
                      <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleBulkToggle(group.sellers, true)}>
                        Ativar Selecionados
                      </Button>
                    </>
                  )}
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
                    <TableHead className="w-[40px]">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-slate-300 accent-indigo-600 cursor-pointer"
                        checked={group.sellers.length > 0 && group.sellers.every(s => selectedIds.has(s.id))}
                        onChange={(e) => handleToggleSelectAll(group.sellers, e.target.checked)}
                      />
                    </TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Disponibilidade</TableHead>
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
                        <TableCell>
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded border-slate-300 accent-indigo-600 cursor-pointer"
                            checked={selectedIds.has(seller.id)}
                            onChange={(e) => handleSelectOne(seller.id, e.target.checked)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-slate-800 flex items-center gap-2">
                            {seller.name}
                            {(!seller.phone || !seller.email) && (
                              <Badge variant="secondary" className="bg-amber-100 hover:bg-amber-100 text-amber-800 border-amber-200 text-[10px] px-1.5 py-0 whitespace-nowrap" title="Falta telefone ou e-mail">
                                Incompleto
                              </Badge>
                            )}
                          </div>
                          {seller.crmUserId && (
                            <div className="text-slate-400 text-xs mt-0.5" title="ID no Kommo/CRM">ID: {seller.crmUserId}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-slate-500 font-mono text-sm">{seller.phone || "—"}</TableCell>
                        <TableCell>
                          {isSellerAvailable(seller.availability, rules) ? (
                            <Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50">Disponível agora</Badge>
                          ) : (
                            <Badge variant="outline" className="border-slate-200 text-slate-500 bg-slate-50">Indisponível</Badge>
                          )}
                        </TableCell>
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
                      <TableCell colSpan={8} className="py-8 text-center text-slate-400">
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

      {workspaceId && (
        <Card>
          <CardHeader>
            <CardTitle>Regras da rodada</CardTitle>
            <CardDescription>
              <b>Disponibilidade</b> é a regra principal: só entra na vez quem está disponível agora
              (sem pausa, sem férias, no dia e horário de atendimento). Configure dias/horário/férias
              de cada vendedor no botão de editar da tabela acima.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RuleToggleRow
              title="Pular indisponível"
              description="Vendedor pausado, de férias ou fora do dia de atendimento não entra na vez."
              checked={rules.skipUnavailable}
              disabled={rulesLoading}
              onChange={(v) => patchRules({ skipUnavailable: v })}
            />
            <RuleToggleRow
              title="Respeitar horário de atendimento"
              description="Fora do horário configurado do vendedor, pula para o próximo disponível."
              checked={rules.respectHours}
              disabled={rulesLoading}
              onChange={(v) => patchRules({ respectHours: v })}
            />
            <RuleToggleRow
              title="Pausar entrada de novos leads"
              description="Segura a fila inteira deste cliente sem perder a ordem atual."
              checked={rules.queuePaused}
              disabled={rulesLoading}
              onChange={(v) => patchRules({ queuePaused: v })}
            />
          </CardContent>
        </Card>
      )}

      {workspaceId && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Qualificação de leads</CardTitle>
                <CardDescription>Só leads qualificados entram na Rodada da Vez. Escolha o critério.</CardDescription>
              </div>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-300 accent-indigo-600 cursor-pointer"
                  checked={rules.qualification.enabled}
                  disabled={rulesLoading}
                  onChange={(e) =>
                    patchRules({ qualification: { ...rules.qualification, enabled: e.target.checked } })
                  }
                />
                <span className="text-sm font-medium text-slate-700">Ativa</span>
              </label>
            </div>
          </CardHeader>
          {rules.qualification.enabled && (
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {QUALIFICATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() =>
                      patchRules({
                        qualification: { ...rules.qualification, criterion: opt.value, config: rules.qualification.config ?? {} },
                      })
                    }
                    className={`text-left p-3 rounded-lg border transition-colors ${
                      rules.qualification.criterion === opt.value
                        ? "border-indigo-400 bg-indigo-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="text-sm font-semibold text-slate-800">{opt.label}</div>
                    <div className="text-xs text-slate-500 mt-1">{opt.hint}</div>
                  </button>
                ))}
              </div>

              {rules.qualification.criterion === "field_equals" && (
                <div className="flex flex-wrap items-center gap-2 p-3 border border-dashed border-slate-300 rounded-lg">
                  <span className="text-xs font-medium text-slate-600">Campo</span>
                  <input
                    className="h-9 px-2.5 border border-slate-300 rounded-md text-sm flex-1 min-w-[140px]"
                    placeholder="ex: interesse"
                    value={rules.qualification.config?.field || ""}
                    onChange={(e) =>
                      patchRules({
                        qualification: { ...rules.qualification, config: { ...rules.qualification.config, field: e.target.value } },
                      })
                    }
                  />
                  <span className="text-xs font-medium text-slate-600">é igual a</span>
                  <input
                    className="h-9 px-2.5 border border-slate-300 rounded-md text-sm flex-1 min-w-[140px]"
                    placeholder="ex: quero orçamento"
                    value={rules.qualification.config?.equals || ""}
                    onChange={(e) =>
                      patchRules({
                        qualification: { ...rules.qualification, config: { ...rules.qualification.config, equals: e.target.value } },
                      })
                    }
                  />
                </div>
              )}

              {rules.qualification.criterion === "utm_source" && (
                <div className="flex flex-wrap items-center gap-2 p-3 border border-dashed border-slate-300 rounded-lg">
                  <span className="text-xs font-medium text-slate-600">utm_source igual a</span>
                  <input
                    className="h-9 px-2.5 border border-slate-300 rounded-md text-sm flex-1 min-w-[140px]"
                    placeholder="ex: facebook-ads"
                    value={rules.qualification.config?.value || ""}
                    onChange={(e) =>
                      patchRules({
                        qualification: { ...rules.qualification, config: { ...rules.qualification.config, value: e.target.value } },
                      })
                    }
                  />
                </div>
              )}

              <div className="text-xs text-slate-500">
                Leads reprovados são salvos com status <b>não qualificado</b> — não entram na fila nem geram notificação ao vendedor.
              </div>
            </CardContent>
          )}
        </Card>
      )}

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

              <div style={{ borderTop: "1px solid #eee", paddingTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#334155", letterSpacing: ".02em" }}>DISPONIBILIDADE</span>

                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 500, color: "#334155", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={!!form.availability.paused}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, availability: { ...f.availability, paused: e.target.checked } }))
                    }
                  />
                  Pausar entrada de novos leads para este vendedor
                </label>

                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                    Dias de atendimento <span style={{ fontWeight: 400, color: "#94a3b8" }}>(nenhum marcado = todo dia)</span>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {WEEKDAY_LABELS.map((label, idx) => {
                      const active = (form.availability.weekdays ?? []).includes(idx);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() =>
                            setForm((f) => {
                              const current = f.availability.weekdays ?? [];
                              const next = current.includes(idx) ? current.filter((d) => d !== idx) : [...current, idx];
                              return { ...f, availability: { ...f.availability, weekdays: next } };
                            })
                          }
                          style={{
                            flex: 1,
                            height: 32,
                            border: "none",
                            borderRadius: 6,
                            fontSize: 11.5,
                            fontWeight: 700,
                            cursor: "pointer",
                            background: active ? "#4f46e5" : "#f1f5f9",
                            color: active ? "#fff" : "#64748b"
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 13, fontWeight: 600, color: "#334155" }}>
                  Horário de atendimento <span style={{ fontWeight: 400, color: "#94a3b8", fontSize: 11.5 }}>(vazio = 24h — só aplica se "Respeitar horário" estiver ligado nas Regras da rodada)</span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      type="time"
                      value={form.availability.hours?.start || ""}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, availability: { ...f.availability, hours: { ...f.availability.hours, start: e.target.value } } }))
                      }
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <input
                      type="time"
                      value={form.availability.hours?.end || ""}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, availability: { ...f.availability, hours: { ...f.availability.hours, end: e.target.value } } }))
                      }
                      style={{ ...inputStyle, flex: 1 }}
                    />
                  </div>
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 13, fontWeight: 600, color: "#334155" }}>
                  Férias / ausência <span style={{ fontWeight: 400, color: "#94a3b8", fontSize: 11.5 }}>(opcional)</span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      type="date"
                      value={form.availability.vacation?.from || ""}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, availability: { ...f.availability, vacation: { ...f.availability.vacation, from: e.target.value } } }))
                      }
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <input
                      type="date"
                      value={form.availability.vacation?.to || ""}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, availability: { ...f.availability, vacation: { ...f.availability.vacation, to: e.target.value } } }))
                      }
                      style={{ ...inputStyle, flex: 1 }}
                    />
                  </div>
                </label>
              </div>

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

function RuleToggleRow({
  title,
  description,
  checked,
  disabled,
  onChange
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="text-sm font-medium text-slate-800">{title}</div>
        <div className="text-xs text-slate-500 mt-0.5">{description}</div>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="flex-shrink-0"
        style={{
          width: 42,
          height: 24,
          border: "none",
          borderRadius: 9999,
          background: checked ? "#4f46e5" : "#e2e8f0",
          padding: 3,
          display: "flex",
          cursor: disabled ? "wait" : "pointer",
          justifyContent: checked ? "flex-end" : "flex-start"
        }}
      >
        <span style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", display: "block" }} />
      </button>
    </div>
  );
}
