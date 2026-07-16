"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Plus, Pencil, Trash2, Check } from "lucide-react";
import {
  getAllSellersQueue,
  toggleSellerActive,
  createSeller,
  updateSeller,
  deleteSeller,
  getWorkspaceRules,
  updateWorkspaceRules,
  passarVez,
  getDistributionExtras,
  getKommoResponsibles
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

type RecentAssignment = {
  id: string;
  leadName: string;
  sellerName: string | null;
  source: string;
  status: string;
  createdAt: string;
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

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function hhmm(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(iso));
  } catch {
    return "—";
  }
}

function ruleLabel(status: string): { text: string; tone: "muted" | "warn" | "danger" } {
  if (status === "distributed") return { text: "Round Robin", tone: "muted" };
  if (status === "not_qualified") return { text: "Não qualificado", tone: "warn" };
  if (status === "error") return { text: "Sem vendedor", tone: "danger" };
  return { text: status, tone: "muted" };
}

function fmtVacation(from?: string, to?: string): string {
  const f = (d?: string) => (d ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(new Date(d)) : "");
  if (from && to) return `Férias ${f(from)}–${f(to)}`;
  if (to) return `Férias até ${f(to)}`;
  return "Ausência";
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

  // Regras da rodada + Qualificação — por cliente.
  const [rules, setRules] = useState<WorkspaceRules>(defaultRules);
  const [rulesLoading, setRulesLoading] = useState(false);

  // Dados de apoio: leads hoje por vendedor + últimas atribuições.
  const [leadsToday, setLeadsToday] = useState<Record<string, number>>({});
  const [recent, setRecent] = useState<RecentAssignment[]>([]);

  // Responsáveis do Kommo (buscados uma vez que o Kommo do cliente está conectado)
  // — pra escolher o vendedor por nome em vez de digitar o ID na mão.
  const [kommoUsers, setKommoUsers] = useState<{ id: string; name: string; email: string }[]>([]);
  const [kommoConnected, setKommoConnected] = useState(false);
  const [manualKommoId, setManualKommoId] = useState(false);

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

  const fetchExtras = useCallback(() => {
    if (!workspaceId) return;
    getDistributionExtras(workspaceId).then((res) => {
      if (res.success) {
        setLeadsToday(res.leadsTodayBySeller);
        setRecent(res.recentAssignments);
      }
    });
    getKommoResponsibles(workspaceId).then((res) => {
      if (res.success && res.connected) {
        setKommoConnected(true);
        setKommoUsers(res.users);
      } else {
        setKommoConnected(false);
        setKommoUsers([]);
      }
    });
  }, [workspaceId]);

  useEffect(() => {
    fetchGroups();
    fetchExtras();
  }, [fetchGroups, fetchExtras]);

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

  const load = useCallback(() => {
    setLoading(true);
    fetchGroups();
    fetchExtras();
  }, [fetchGroups, fetchExtras]);

  const patchRules = async (patch: Partial<WorkspaceRules>) => {
    if (!workspaceId) return;
    const prev = rules;
    setRules({ ...rules, ...patch });
    setRulesLoading(true);
    const res = await updateWorkspaceRules(workspaceId, patch);
    setRulesLoading(false);
    if (!res.success) {
      alert("Erro ao salvar regra: " + res.error);
      setRules(prev);
    }
  };

  const handleToggle = async (seller: Seller) => {
    const next = !seller.isActive;
    setGroups((prev) =>
      prev.map((g) => ({ ...g, sellers: g.sellers.map((s) => (s.id === seller.id ? { ...s, isActive: next } : s)) }))
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
    setForm({ name: seller.name, phone: seller.phone || "", crmUserId: seller.crmUserId || "", availability: seller.availability ?? {} });
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
      : await createSeller({ workspaceId: workspaceId!, name: form.name, phone: form.phone, crmUserId: form.crmUserId });
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

  const handlePassarVez = async (seller: Seller) => {
    setGroups((prev) =>
      prev.map((g) => ({
        ...g,
        sellers: g.sellers.map((s) => (s.id === seller.id ? { ...s, lastAssignedAt: new Date().toISOString() } : s)),
      }))
    );
    const res = await passarVez(seller.id);
    if (!res.success) {
      alert("Erro ao passar a vez: " + res.error);
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

  const group = (workspaceId ? groups.find((g) => g.workspaceId === workspaceId) : groups[0]) ?? null;
  const sellers = group?.sellers ?? [];
  const clienteName = group?.workspaceName ?? "";

  // Ordem da fila = ativos por last_assigned_at ASC NULLS FIRST (mesmo critério do RPC).
  const activeSorted = [...sellers]
    .filter((s) => s.isActive)
    .sort((a, b) => {
      if (!a.lastAssignedAt && !b.lastAssignedAt) return 0;
      if (!a.lastAssignedAt) return -1;
      if (!b.lastAssignedAt) return 1;
      return new Date(a.lastAssignedAt).getTime() - new Date(b.lastAssignedAt).getTime();
    });

  // "Quem recebe o próximo lead" respeita disponibilidade e fila pausada (igual RPC).
  const availableSorted = rules.queuePaused ? [] : activeSorted.filter((s) => isSellerAvailable(s.availability, rules));
  const currentSeller = availableSorted[0] ?? null;
  const nextSeller = availableSorted[1] ?? null;
  const withPhone = sellers.filter((s) => !!s.phone).length;
  const onVacation = sellers.filter((s) => s.availability?.vacation?.from || s.availability?.vacation?.to);

  if (!loading && sellers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Fila da Vez</CardTitle>
              <CardDescription>Nenhum vendedor cadastrado ainda. Adicione o primeiro para ativar o rodízio.</CardDescription>
            </div>
            {workspaceId && (
              <Button className="gap-2" onClick={openCreate}>
                <Plus className="w-4 h-4" /> Adicionar vendedor
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center text-slate-400">Sem vendedores na fila.</div>
        </CardContent>
        {modalOpen && renderModal()}
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-800">Vendedores &amp; Rodada</h2>
          <p className="text-slate-500 mt-1">
            Cada cliente tem a <b>sua própria equipe e a sua Rodada da Vez</b> — nada é misturado entre clientes.
          </p>
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

      {/* Grid 2 colunas: (Rodada + Fila) | (WhatsApp + Regras) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-4 items-start">
        {/* Coluna esquerda */}
        <div className="flex flex-col gap-4">
          {/* Rodada da vez */}
          <div className="rounded-2xl p-6 text-white bg-indigo-600">
            <div className="text-xs font-semibold tracking-wider uppercase opacity-85">Rodada da vez · {clienteName}</div>
            {currentSeller ? (
              <>
                <div className="flex items-center gap-4 mt-4">
                  <div className="rounded-full bg-white/20 flex items-center justify-center font-bold text-lg" style={{ width: 52, height: 52 }}>
                    {initials(currentSeller.name)}
                  </div>
                  <div>
                    <div className="text-[22px] font-bold leading-tight">{currentSeller.name}</div>
                    <div className="text-sm opacity-85">é quem recebe o próximo lead</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-5 flex-wrap">
                  <Button onClick={() => handlePassarVez(currentSeller)} className="bg-white text-indigo-600 hover:bg-indigo-50 font-bold h-10">
                    Passar a vez →
                  </Button>
                  {nextSeller && <span className="text-sm opacity-90">Próximo: <b>{nextSeller.name}</b></span>}
                </div>
              </>
            ) : (
              <div className="mt-4 text-sm opacity-90">
                {rules.queuePaused ? "Fila pausada — nenhum lead está sendo distribuído." : "Nenhum vendedor disponível agora para receber leads."}
              </div>
            )}
          </div>

          {/* Fila de distribuição */}
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-[15px]">Fila de distribuição</CardTitle>
                <CardDescription>Ordem em que os próximos leads serão atribuídos · {clienteName}</CardDescription>
              </div>
              <Badge variant="secondary">Round Robin</Badge>
            </CardHeader>
            <CardContent className="p-0">
              {activeSorted.length === 0 ? (
                <div className="py-6 text-center text-sm text-slate-400">Nenhum vendedor ativo na fila.</div>
              ) : (
                <div className="divide-y">
                  {activeSorted.map((s, i) => {
                    const isCurrent = currentSeller?.id === s.id;
                    return (
                      <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                        <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-slate-500 bg-slate-100">{i + 1}</span>
                        <span className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-indigo-700 bg-indigo-50">{initials(s.name)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-800 truncate">{s.name}</div>
                          <div className="text-xs text-slate-400 font-mono">{s.phone || "sem número"}</div>
                        </div>
                        {isCurrent && (
                          <Badge className="bg-indigo-600">Recebe o próximo</Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex items-center gap-2 px-4 py-3 border-t text-xs text-slate-500">
                🔒 Atribuição <b className="mx-1">transacional</b> — um lock garante que dois leads simultâneos nunca caiam no mesmo vendedor.
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coluna direita */}
        <div className="flex flex-col gap-4">
          {/* WhatsApp */}
          <Card>
            <CardContent className="pt-6 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">Ev</div>
                <div>
                  <div className="text-sm font-semibold text-slate-800">{withPhone} de {sellers.length} com WhatsApp</div>
                  <div className="text-xs text-slate-500">{clienteName} · via Evolution API</div>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed pt-3 border-t m-0">
                As mensagens saem <b>do número do próprio vendedor</b> — não do gestor. Cada um usa o WhatsApp dele.
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="text-emerald-500">🔒</span>
                Distribuição transacional — lock de concorrência impede dois vendedores no mesmo lead.
              </div>
            </CardContent>
          </Card>

          {/* Regras da rodada */}
          <Card>
            <CardHeader>
              <CardTitle className="text-[15px]">Regras da rodada</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-indigo-50 border border-indigo-100">
                <span className="w-7 h-7 rounded-lg flex-shrink-0 bg-indigo-600 text-white flex items-center justify-center">
                  <Check className="w-4 h-4" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-indigo-700">Disponibilidade</span>
                    <span className="text-[10px] font-bold tracking-wide text-white bg-indigo-600 px-2 py-0.5 rounded-full">REGRA PRINCIPAL</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Só entra na vez quem está <b>disponível agora</b>: dentro do horário, no dia de atendimento e sem ausência ativa. As regras abaixo refinam isso.
                  </p>
                </div>
              </div>

              <RuleToggleRow title="Pular indisponível" description="Vendedor pausado, de férias ou fora do dia de atendimento não entra na vez." checked={rules.skipUnavailable} disabled={rulesLoading} onChange={(v) => patchRules({ skipUnavailable: v })} />
              <RuleToggleRow title="Respeitar horário de atendimento" description="Fora do horário configurado do vendedor, pula para o próximo disponível." checked={rules.respectHours} disabled={rulesLoading} onChange={(v) => patchRules({ respectHours: v })} />
              <RuleToggleRow title="Pausar entrada de novos leads" description="Segura a fila inteira deste cliente sem perder a ordem atual." checked={rules.queuePaused} disabled={rulesLoading} onChange={(v) => patchRules({ queuePaused: v })} />

              <div className="pt-3 border-t">
                <div className="text-xs font-semibold text-slate-600 mb-2">Ausências e férias</div>
                {onVacation.length === 0 ? (
                  <div className="text-xs text-slate-400">Ninguém de férias. Configure dias, horário e férias de cada vendedor no ✏️ da tabela Equipe.</div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {onVacation.map((s) => (
                      <div key={s.id} className="flex items-center gap-2 text-xs px-2.5 py-1.5 border rounded-lg">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[9px]">{initials(s.name)}</span>
                        <span className="flex-1 text-slate-700">{s.name}</span>
                        <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-semibold">
                          {fmtVacation(s.availability.vacation?.from, s.availability.vacation?.to)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Qualificação de leads */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Qualificação de leads</CardTitle>
              <CardDescription>Só leads qualificados entram na Rodada da Vez. Escolha o critério.</CardDescription>
            </div>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded border-slate-300 accent-indigo-600 cursor-pointer" checked={rules.qualification.enabled} disabled={rulesLoading} onChange={(e) => patchRules({ qualification: { ...rules.qualification, enabled: e.target.checked } })} />
              <span className="text-sm font-medium text-slate-700">Ativa</span>
            </label>
          </div>
        </CardHeader>
        {rules.qualification.enabled && (
          <CardContent className="space-y-4">
            <div className="text-xs font-semibold text-slate-600">Critério de qualificação</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {QUALIFICATION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => patchRules({ qualification: { ...rules.qualification, criterion: opt.value, config: rules.qualification.config ?? {} } })}
                  className={`text-left p-3 rounded-lg border transition-colors ${rules.qualification.criterion === opt.value ? "border-indigo-400 bg-indigo-50" : "border-slate-200 bg-white hover:border-slate-300"}`}
                >
                  <div className="text-sm font-semibold text-slate-800">{opt.label}</div>
                  <div className="text-xs text-slate-500 mt-1">{opt.hint}</div>
                </button>
              ))}
            </div>

            {rules.qualification.criterion === "field_equals" && (
              <div className="flex flex-wrap items-center gap-2 p-3 border border-dashed border-slate-300 rounded-lg">
                <span className="text-xs font-medium text-slate-600">Campo</span>
                <input className="h-9 px-2.5 border border-slate-300 rounded-md text-sm flex-1 min-w-[140px]" placeholder="ex: interesse" value={rules.qualification.config?.field || ""} onChange={(e) => patchRules({ qualification: { ...rules.qualification, config: { ...rules.qualification.config, field: e.target.value } } })} />
                <span className="text-xs font-medium text-slate-600">é igual a</span>
                <input className="h-9 px-2.5 border border-slate-300 rounded-md text-sm flex-1 min-w-[140px]" placeholder="ex: quero orçamento" value={rules.qualification.config?.equals || ""} onChange={(e) => patchRules({ qualification: { ...rules.qualification, config: { ...rules.qualification.config, equals: e.target.value } } })} />
              </div>
            )}

            {rules.qualification.criterion === "utm_source" && (
              <div className="flex flex-wrap items-center gap-2 p-3 border border-dashed border-slate-300 rounded-lg">
                <span className="text-xs font-medium text-slate-600">utm_source igual a</span>
                <input className="h-9 px-2.5 border border-slate-300 rounded-md text-sm flex-1 min-w-[140px]" placeholder="ex: facebook-ads" value={rules.qualification.config?.value || ""} onChange={(e) => patchRules({ qualification: { ...rules.qualification, config: { ...rules.qualification.config, value: e.target.value } } })} />
              </div>
            )}

            <div className="text-xs text-slate-500">
              Leads reprovados são salvos com status <b>não qualificado</b> — não entram na fila nem geram notificação ao vendedor.
            </div>
          </CardContent>
        )}
      </Card>

      {/* Últimas atribuições */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[15px]">Últimas atribuições</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-400">Nenhum lead atribuído ainda.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hora</TableHead>
                  <TableHead>Lead</TableHead>
                  <TableHead>Atribuído a</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead className="text-right">Regra aplicada</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((r) => {
                  const rl = ruleLabel(r.status);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs text-slate-500">{hhmm(r.createdAt)}</TableCell>
                      <TableCell className="font-medium">{r.leadName}</TableCell>
                      <TableCell className="text-slate-600">{r.sellerName || "—"}</TableCell>
                      <TableCell className="text-slate-500 text-sm">{r.source}</TableCell>
                      <TableCell className="text-right">
                        <span className={`text-xs ${rl.tone === "warn" ? "text-amber-600" : rl.tone === "danger" ? "text-rose-600" : "text-slate-500"}`}>{rl.text}</span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Equipe */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-[15px]">Equipe · {clienteName}</CardTitle>
          {workspaceId && (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={openCreate}>
              <Plus className="w-4 h-4" /> Adicionar
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendedor</TableHead>
                <TableHead>Telefone (WhatsApp)</TableHead>
                <TableHead>Leads hoje</TableHead>
                <TableHead>Disponibilidade</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sellers.map((seller) => {
                const available = isSellerAvailable(seller.availability, rules);
                const isCurrent = currentSeller?.id === seller.id;
                return (
                  <TableRow key={seller.id} className={!seller.isActive ? "opacity-50" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center text-[10px] font-bold">{initials(seller.name)}</span>
                        <span className="font-semibold text-slate-800">{seller.name}</span>
                        {isCurrent && <Badge variant="secondary" className="text-[10px]">Vez atual</Badge>}
                        {(!seller.phone || !seller.email) && (
                          <Badge variant="secondary" className="bg-amber-100 hover:bg-amber-100 text-amber-800 border-amber-200 text-[10px] px-1.5 py-0" title="Falta telefone ou e-mail">Incompleto</Badge>
                        )}
                      </div>
                      {seller.crmUserId && <div className="text-slate-400 text-xs mt-0.5 ml-9" title="ID no Kommo/CRM">ID: {seller.crmUserId}</div>}
                    </TableCell>
                    <TableCell className="text-slate-500 font-mono text-sm">{seller.phone || "—"}</TableCell>
                    <TableCell className="font-semibold text-slate-700">{leadsToday[seller.id] ?? 0}</TableCell>
                    <TableCell>
                      {!seller.isActive ? (
                        <Badge variant="outline" className="border-slate-200 text-slate-400 bg-slate-50">Pausado</Badge>
                      ) : available ? (
                        <Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50">Disponível</Badge>
                      ) : (
                        <Badge variant="outline" className="border-slate-200 text-slate-500 bg-slate-50">Indisponível</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {workspaceId && (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => openEdit(seller)} title="Editar disponibilidade">
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(seller)} title="Remover">
                              <Trash2 className="w-4 h-4 text-rose-500" />
                            </Button>
                          </>
                        )}
                        <Button variant={seller.isActive ? "destructive" : "secondary"} size="sm" onClick={() => handleToggle(seller)}>
                          {seller.isActive ? "Pausar" : "Ativar na Fila"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {modalOpen && renderModal()}
    </div>
  );

  function renderModal() {
    return (
      <div
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16, overflowY: "auto" }}
        onClick={() => !saving && setModalOpen(false)}
      >
        <div style={{ background: "white", borderRadius: 12, padding: 28, width: "100%", maxWidth: 440, maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>{editingId ? "Editar vendedor" : "Adicionar vendedor"}</h2>
            <button onClick={() => setModalOpen(false)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#666" }}>✕</button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <label style={labelStyle}>
              Nome do vendedor *
              <input autoFocus value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex.: Carol" style={inputStyle} />
            </label>
            <label style={labelStyle}>
              WhatsApp (opcional)
              <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="Ex.: 5551991490515" style={inputStyle} />
              <span style={hintStyle}>Usado para notificar o vendedor no privado quando ele recebe um lead.</span>
            </label>
            <label style={labelStyle}>
              Responsável no Kommo (opcional)
              {kommoConnected && kommoUsers.length > 0 && !manualKommoId ? (
                <>
                  <select
                    value={form.crmUserId}
                    onChange={(e) => setForm((f) => ({ ...f, crmUserId: e.target.value }))}
                    style={{ ...inputStyle, appearance: "auto" }}
                  >
                    <option value="">— Nenhum —</option>
                    {kommoUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}{u.email ? ` · ${u.email}` : ""}
                      </option>
                    ))}
                  </select>
                  <span style={hintStyle}>
                    Buscado do Kommo deste cliente — o ID entra sozinho. {" "}
                    <button type="button" onClick={() => setManualKommoId(true)} style={{ background: "none", border: "none", color: "#4f46e5", fontWeight: 600, cursor: "pointer", padding: 0, fontSize: 11.5 }}>
                      Digitar ID manualmente
                    </button>
                  </span>
                </>
              ) : (
                <>
                  <input value={form.crmUserId} onChange={(e) => setForm((f) => ({ ...f, crmUserId: e.target.value }))} placeholder="Só se este cliente dispara para o Kommo" style={inputStyle} />
                  <span style={hintStyle}>
                    {kommoConnected
                      ? "Kommo conectado, mas nenhum responsável encontrado — digite o ID."
                      : "Kommo não conectado neste cliente. Conecte em Destinos para escolher o responsável por nome."}
                    {manualKommoId && kommoUsers.length > 0 && (
                      <>
                        {" "}
                        <button type="button" onClick={() => setManualKommoId(false)} style={{ background: "none", border: "none", color: "#4f46e5", fontWeight: 600, cursor: "pointer", padding: 0, fontSize: 11.5 }}>
                          Escolher da lista
                        </button>
                      </>
                    )}
                  </span>
                </>
              )}
            </label>

            <div style={{ borderTop: "1px solid #eee", paddingTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#334155", letterSpacing: ".02em" }}>DISPONIBILIDADE</span>

              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 500, color: "#334155", cursor: "pointer" }}>
                <input type="checkbox" checked={!!form.availability.paused} onChange={(e) => setForm((f) => ({ ...f, availability: { ...f.availability, paused: e.target.checked } }))} />
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
                        style={{ flex: 1, height: 32, border: "none", borderRadius: 6, fontSize: 11.5, fontWeight: 700, cursor: "pointer", background: active ? "#4f46e5" : "#f1f5f9", color: active ? "#fff" : "#64748b" }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label style={labelStyle}>
                Horário de atendimento <span style={{ ...hintStyle, fontWeight: 400 }}>(vazio = 24h — só aplica se "Respeitar horário" estiver ligado)</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <input type="time" value={form.availability.hours?.start || ""} onChange={(e) => setForm((f) => ({ ...f, availability: { ...f.availability, hours: { ...f.availability.hours, start: e.target.value } } }))} style={{ ...inputStyle, flex: 1 }} />
                  <input type="time" value={form.availability.hours?.end || ""} onChange={(e) => setForm((f) => ({ ...f, availability: { ...f.availability, hours: { ...f.availability.hours, end: e.target.value } } }))} style={{ ...inputStyle, flex: 1 }} />
                </div>
              </label>

              <label style={labelStyle}>
                Férias / ausência <span style={{ ...hintStyle, fontWeight: 400 }}>(opcional)</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <input type="date" value={form.availability.vacation?.from || ""} onChange={(e) => setForm((f) => ({ ...f, availability: { ...f.availability, vacation: { ...f.availability.vacation, from: e.target.value } } }))} style={{ ...inputStyle, flex: 1 }} />
                  <input type="date" value={form.availability.vacation?.to || ""} onChange={(e) => setForm((f) => ({ ...f, availability: { ...f.availability, vacation: { ...f.availability.vacation, to: e.target.value } } }))} style={{ ...inputStyle, flex: 1 }} />
                </div>
              </label>
            </div>

            {formError && <p style={{ margin: 0, color: "#e11d48", fontSize: 13 }}>{formError}</p>}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
            <button onClick={() => setModalOpen(false)} disabled={saving} style={{ padding: "9px 16px", border: "1px solid #ddd", borderRadius: 8, cursor: "pointer", background: "white", fontSize: 13, fontWeight: 600 }}>Cancelar</button>
            <button onClick={handleSave} disabled={saving} style={{ padding: "9px 18px", border: "none", borderRadius: 8, cursor: "pointer", background: "var(--accent, #4f46e5)", color: "white", fontSize: 13, fontWeight: 600, opacity: saving ? 0.6 : 1 }}>
              {saving ? "Salvando…" : editingId ? "Salvar alterações" : "Adicionar"}
            </button>
          </div>
        </div>
      </div>
    );
  }
}

const inputStyle: React.CSSProperties = { height: 38, padding: "0 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, outline: "none" };
const labelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 5, fontSize: 13, fontWeight: 600, color: "#334155" };
const hintStyle: React.CSSProperties = { fontSize: 11.5, fontWeight: 400, color: "#94a3b8" };

function RuleToggleRow({ title, description, checked, disabled, onChange }: { title: string; description: string; checked: boolean; disabled: boolean; onChange: (value: boolean) => void }) {
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
        style={{ width: 42, height: 24, border: "none", borderRadius: 9999, background: checked ? "#4f46e5" : "#e2e8f0", padding: 3, display: "flex", cursor: disabled ? "wait" : "pointer", justifyContent: checked ? "flex-end" : "flex-start" }}
      >
        <span style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", display: "block" }} />
      </button>
    </div>
  );
}
