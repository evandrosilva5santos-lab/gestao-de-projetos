"use server";

import { supabaseAdmin as supabase } from "@/lib/supabase/client";
import type { SellerAvailability } from "@/lib/leads/availability";
import type { QualificationRule } from "@/lib/leads/qualification";
import { DEFAULT_TEMPLATES, type MessageTemplates } from "@/lib/leads/templates";
import { fetchKommoUsers } from "@/lib/leads/integrations/kommo";
import { fetchMetaFormLeads } from "@/lib/leads/providers/meta";

/**
 * Templates de mensagem por cliente (cliente + grupo). Ficam na coluna
 * message_templates de gestao_leads_workspace_rules. Se a coluna ainda não
 * existir (migration não aplicada) ou não houver nada salvo, cai nos padrões.
 */
export async function getMessageTemplates(workspaceId: string) {
  const { data, error } = await supabase
    .from("gestao_leads_workspace_rules")
    .select("message_templates")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (error) {
    // Coluna ausente ou erro de leitura — degrada pro padrão, sem quebrar a UI.
    return { success: true as const, templates: DEFAULT_TEMPLATES, persisted: false as const };
  }
  const stored = (data?.message_templates as MessageTemplates | null) ?? null;
  return { success: true as const, templates: stored ?? DEFAULT_TEMPLATES, persisted: !!stored };
}

export async function saveMessageTemplates(workspaceId: string, templates: MessageTemplates) {
  const { error } = await supabase
    .from("gestao_leads_workspace_rules")
    .upsert(
      { workspace_id: workspaceId, message_templates: templates, updated_at: new Date().toISOString() },
      { onConflict: "workspace_id" }
    );
  if (error) return { success: false as const, error: error.message };
  return { success: true as const };
}

/**
 * Responsáveis (usuários) do Kommo do cliente — pra escolher o vendedor por nome
 * em vez de digitar o ID na mão. Lê o subdomínio/token do destino Kommo já
 * configurado (gestao_leads_destinations, type='kommo'). Sem Kommo conectado,
 * devolve connected:false pra UI cair no campo de ID manual.
 */
export async function getKommoResponsibles(workspaceId: string) {
  const { data: dest, error } = await supabase
    .from("gestao_leads_destinations")
    .select("config")
    .eq("workspace_id", workspaceId)
    .eq("type", "kommo")
    .maybeSingle();

  if (error) return { success: false as const, error: error.message };
  const cfg = dest?.config as { subdomain?: string; token?: string } | undefined;
  if (!cfg?.subdomain || !cfg?.token) {
    return { success: true as const, connected: false as const, users: [] };
  }

  const res = await fetchKommoUsers(cfg.subdomain, cfg.token);
  if (!res.success) return { success: false as const, error: res.error || "Falha ao buscar responsáveis no Kommo." };

  const users = (res.users || []).map((u) => ({ id: String(u.id), name: u.name, email: u.email }));
  return { success: true as const, connected: true as const, users };
}

/**
 * Nome de um workspace a partir do id na URL (?workspace=id) — usado pra
 * restaurar o cliente ativo ao carregar/recarregar a página, já que a URL só
 * guarda o id, não o nome.
 */
export async function getWorkspaceById(id: string) {
  const { data, error } = await supabase
    .from("core_workspaces")
    .select("id, name")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return { success: false as const, error: error?.message || "Cliente não encontrado." };
  }
  return { success: true as const, workspace: data };
}

/** Lista os clientes (workspaces) da agência, com estatísticas rápidas por cliente. */
export async function listClientWorkspaces() {
  const { data: workspaces, error } = await supabase
    .from("core_workspaces")
    .select("id, name, slug, client_access_token, created_at")
    .order("name");

  if (error) {
    return { success: false as const, error: error.message };
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStartIso = todayStart.toISOString();

  const results = await Promise.all(
    (workspaces || []).map(async (ws) => {
      const [{ count: totalSellers }, { count: activeSellers }, { count: totalLeads }, { count: leadsToday }] = await Promise.all([
        supabase.from("gestao_leads_sellers").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id),
        supabase.from("gestao_leads_sellers").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).eq("is_active", true),
        supabase.from("gestao_leads").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id),
        supabase.from("gestao_leads").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).gte("created_at", todayStartIso),
      ]);
      return {
        id: ws.id,
        name: ws.name,
        slug: ws.slug,
        clientAccessToken: ws.client_access_token as string | null,
        createdAt: ws.created_at as string,
        totalSellers: totalSellers || 0,
        activeSellers: activeSellers || 0,
        activeSellerCount: activeSellers || 0,
        totalLeads: totalLeads || 0,
        leadsToday: leadsToday || 0,
      };
    })
  );

  return { success: true as const, workspaces: results };
}

async function getWorkspaceByToken(token: string) {
  const { data } = await supabase
    .from("core_workspaces")
    .select("id, name")
    .eq("client_access_token", token)
    .maybeSingle();
  return data;
}

export async function getSellersByClientToken(token: string) {
  const workspace = await getWorkspaceByToken(token);
  if (!workspace) {
    return { success: false as const, error: "Link inválido." };
  }

  const { data, error } = await supabase
    .from("gestao_leads_sellers")
    .select("id, name, phone, is_active")
    .eq("workspace_id", workspace.id)
    .order("name");

  if (error) {
    return { success: false as const, error: error.message };
  }

  return { success: true as const, workspaceName: workspace.name, sellers: data || [] };
}

export async function toggleSellerActiveByClientToken(token: string, sellerId: string, isActive: boolean) {
  const workspace = await getWorkspaceByToken(token);
  if (!workspace) {
    return { success: false as const, error: "Link inválido." };
  }

  // Garante que o vendedor pertence a ESTE workspace antes de alterar — evita
  // que o token de um cliente altere vendedor de outro.
  const { data: seller } = await supabase
    .from("gestao_leads_sellers")
    .select("id")
    .eq("id", sellerId)
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  if (!seller) {
    return { success: false as const, error: "Vendedor não encontrado neste workspace." };
  }

  const { error } = await supabase
    .from("gestao_leads_sellers")
    .update({ is_active: isActive })
    .eq("id", sellerId);

  if (error) {
    return { success: false as const, error: error.message };
  }

  return { success: true as const };
}

type SellerQueueRaw = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  crm_user_id: string | null;
  is_active: boolean;
  last_assigned_at: string | null;
  workspace_id: string;
  availability: SellerAvailability;
  core_workspaces: { name: string } | { name: string }[] | null;
}

/** Fila da vez de TODOS os clientes (visão interna/admin da agência). */
export async function getAllSellersQueue() {
  const { data, error } = await supabase
    .from("gestao_leads_sellers")
    .select("id, name, phone, email, crm_user_id, is_active, last_assigned_at, workspace_id, availability, core_workspaces(name)")
    .order("last_assigned_at", { ascending: true, nullsFirst: true });

  if (error) {
    return { success: false as const, error: error.message };
  }

  const rows = (data || []) as unknown as SellerQueueRaw[];

  // Agrupa por cliente — a posição na fila só faz sentido dentro do mesmo workspace.
  const byWorkspace = new Map<string, { workspaceName: string; sellers: typeof rows }>();
  for (const row of rows) {
    const wsName = Array.isArray(row.core_workspaces)
      ? row.core_workspaces[0]?.name
      : row.core_workspaces?.name;
    if (!byWorkspace.has(row.workspace_id)) {
      byWorkspace.set(row.workspace_id, { workspaceName: wsName || "—", sellers: [] });
    }
    byWorkspace.get(row.workspace_id)!.sellers.push(row);
  }

  const groups = Array.from(byWorkspace.entries()).map(([workspaceId, group]) => ({
    workspaceId,
    workspaceName: group.workspaceName,
    sellers: group.sellers.map((s) => ({
      id: s.id,
      name: s.name,
      phone: s.phone,
      email: s.email,
      crmUserId: s.crm_user_id,
      isActive: s.is_active,
      lastAssignedAt: s.last_assigned_at,
      availability: s.availability ?? {},
    })),
  }));

  return { success: true as const, groups };
}

/**
 * "Passar a vez" — empurra o vendedor da vez pro fim da fila sem atribuir lead,
 * setando last_assigned_at = agora (o mesmo critério de ordenação que o RPC
 * assign_next_seller* usa: ASC NULLS FIRST). O próximo da fila vira a vez.
 */
export async function passarVez(sellerId: string) {
  const { error } = await supabase
    .from("gestao_leads_sellers")
    .update({ last_assigned_at: new Date().toISOString() })
    .eq("id", sellerId);

  if (error) return { success: false as const, error: error.message };
  return { success: true as const };
}

/**
 * Dados de apoio da tela Rodada da Vez que não vêm de getAllSellersQueue:
 * "Leads hoje" por vendedor + "Últimas atribuições". Um round-trip só.
 */
export async function getDistributionExtras(workspaceId: string) {
  // Início do dia em America/Sao_Paulo (mesma convenção do resto do módulo).
  const spDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date()); // ex.: "2026-07-15"
  const startOfDayIso = `${spDate}T00:00:00-03:00`;

  const [todayRes, recentRes] = await Promise.all([
    supabase
      .from("gestao_leads")
      .select("seller_id")
      .eq("workspace_id", workspaceId)
      .gte("created_at", startOfDayIso)
      .not("seller_id", "is", null),
    supabase
      .from("gestao_leads")
      .select("id, name, source, status, created_at, seller_id, gestao_leads_sellers(name)")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const leadsTodayBySeller: Record<string, number> = {};
  for (const row of todayRes.data ?? []) {
    const sid = (row as { seller_id: string | null }).seller_id;
    if (sid) leadsTodayBySeller[sid] = (leadsTodayBySeller[sid] ?? 0) + 1;
  }

  const recentAssignments = (recentRes.data ?? []).map((r) => {
    const rel = (r as { gestao_leads_sellers?: { name: string } | { name: string }[] | null }).gestao_leads_sellers;
    const sellerName = Array.isArray(rel) ? rel[0]?.name : rel?.name;
    return {
      id: r.id as string,
      leadName: r.name as string,
      sellerName: sellerName ?? null,
      source: r.source as string,
      status: r.status as string,
      createdAt: r.created_at as string,
    };
  });

  return { success: true as const, leadsTodayBySeller, recentAssignments };
}

export async function toggleSellerActive(sellerId: string, isActive: boolean) {
  const { error } = await supabase
    .from("gestao_leads_sellers")
    .update({ is_active: isActive })
    .eq("id", sellerId);

  if (error) {
    return { success: false as const, error: error.message };
  }
  return { success: true as const };
}

/**
 * Adiciona um vendedor ao rodízio de um cliente. É o pré-requisito nº 1 do
 * fluxo: sem vendedor ativo, o assign_next_seller* não distribui nada.
 * crmUserId é opcional — só usado quando o cliente também dispara para o Kommo.
 */
export async function createSeller(input: {
  workspaceId: string;
  name: string;
  phone?: string | null;
  crmUserId?: string | null;
}) {
  const name = input.name.trim();
  if (!name) {
    return { success: false as const, error: "Nome do vendedor é obrigatório." };
  }
  if (!input.workspaceId) {
    return { success: false as const, error: "Cliente (workspace) é obrigatório." };
  }

  const { data, error } = await supabase
    .from("gestao_leads_sellers")
    .insert({
      workspace_id: input.workspaceId,
      name,
      phone: input.phone?.trim() || null,
      crm_user_id: input.crmUserId?.trim() || null,
      is_active: true,
    })
    .select("id")
    .single();

  if (error) {
    return { success: false as const, error: error.message };
  }
  return { success: true as const, sellerId: data.id as string };
}

export async function updateSeller(
  sellerId: string,
  input: { name?: string; phone?: string | null; crmUserId?: string | null; availability?: SellerAvailability }
) {
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) return { success: false as const, error: "Nome do vendedor é obrigatório." };
    patch.name = name;
  }
  if (input.phone !== undefined) patch.phone = input.phone?.trim() || null;
  if (input.crmUserId !== undefined) patch.crm_user_id = input.crmUserId?.trim() || null;
  if (input.availability !== undefined) patch.availability = input.availability;

  const { error } = await supabase.from("gestao_leads_sellers").update(patch).eq("id", sellerId);
  if (error) {
    return { success: false as const, error: error.message };
  }
  return { success: true as const };
}

/**
 * Regras da Rodada + Qualificação, por cliente (ver migration
 * 20260715130000_seller_availability_and_qualification.sql). Sem linha ainda
 * = defaults do protótipo (skipUnavailable ligado, resto desligado).
 */
export async function getWorkspaceRules(workspaceId: string) {
  const { data, error } = await supabase
    .from("gestao_leads_workspace_rules")
    .select("respect_hours, skip_unavailable, queue_paused, qualification")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) return { success: false as const, error: error.message };

  return {
    success: true as const,
    rules: {
      respectHours: data?.respect_hours ?? false,
      skipUnavailable: data?.skip_unavailable ?? true,
      queuePaused: data?.queue_paused ?? false,
      qualification: (data?.qualification as QualificationRule | null) ?? { enabled: false },
    },
  };
}

export async function updateWorkspaceRules(
  workspaceId: string,
  patch: Partial<{
    respectHours: boolean;
    skipUnavailable: boolean;
    queuePaused: boolean;
    qualification: QualificationRule;
  }>
) {
  const row: Record<string, unknown> = { workspace_id: workspaceId, updated_at: new Date().toISOString() };
  if (patch.respectHours !== undefined) row.respect_hours = patch.respectHours;
  if (patch.skipUnavailable !== undefined) row.skip_unavailable = patch.skipUnavailable;
  if (patch.queuePaused !== undefined) row.queue_paused = patch.queuePaused;
  if (patch.qualification !== undefined) row.qualification = patch.qualification;

  const { error } = await supabase
    .from("gestao_leads_workspace_rules")
    .upsert(row, { onConflict: "workspace_id" });

  if (error) return { success: false as const, error: error.message };
  return { success: true as const };
}

export async function deleteSeller(sellerId: string) {
  const { error } = await supabase.from("gestao_leads_sellers").delete().eq("id", sellerId);
  if (error) {
    return { success: false as const, error: error.message };
  }
  return { success: true as const };
}

/**
 * Prontidão da automação de um cliente: agrega fonte (Meta), fila (vendedores),
 * e destinos configurados para responder "o que falta para a automação rodar?".
 * É a base da aba "Automação" — a sequência visual + checklist de bloqueadores.
 * Sheets e WhatsApp são obrigatórios; Kommo é opcional (ver
 * [[project_regras_destino_lead]]).
 */
export async function getAutomationReadiness(workspaceId: string) {
  const [{ count: metaSources }, { count: activeSellers }, { data: destinations }] = await Promise.all([
    supabase
      .from("gestao_leads_meta_connections")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("is_active", true),
    supabase
      .from("gestao_leads_sellers")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("is_active", true),
    supabase
      .from("gestao_leads_destinations")
      .select("type, config, is_active")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true),
  ]);

  const dests = destinations || [];
  const findDest = (type: string) => dests.find((d) => d.type === type);
  const sheets = findDest("google_sheets");
  const evolution = findDest("evolution");
  const kommo = findDest("kommo");
  const groupJid = (evolution?.config as { groupJid?: string } | undefined)?.groupJid;

  const checks = {
    hasSource: (metaSources || 0) > 0,
    hasSeller: (activeSellers || 0) > 0,
    hasSheets: !!sheets,
    hasWhatsapp: !!evolution,
    hasGroup: !!groupJid,
    hasKommo: !!kommo,
  };

  // Bloqueadores = tudo que impede a automação de rodar (obrigatórios).
  const blockers: string[] = [];
  if (!checks.hasSource) blockers.push("Nenhuma página Meta conectada em Fontes de Entrada.");
  if (!checks.hasSeller) blockers.push("Nenhum vendedor ativo na Fila da Vez.");
  if (!checks.hasSheets) blockers.push("Google Sheets não configurado (destino obrigatório).");
  if (!checks.hasWhatsapp) blockers.push("WhatsApp (Evolution) não configurado (destino obrigatório).");

  return {
    success: true as const,
    checks,
    counts: { sources: metaSources || 0, activeSellers: activeSellers || 0 },
    blockers,
    ready: blockers.length === 0,
  };
}

interface OverviewRawLead {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  source: string | null;
  status: string;
  created_at: string;
  core_workspaces: { name: string } | { name: string }[] | null;
  gestao_leads_sellers: { name: string } | { name: string }[] | null;
}

function unwrapRelation<T>(rel: T | T[] | null): T | null {
  if (!rel) return null;
  return Array.isArray(rel) ? rel[0] || null : rel;
}

export async function getLeadsOverview(workspaceId?: string) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStartIso = todayStart.toISOString();

  let receivedQuery = supabase.from("gestao_leads").select("id", { count: "exact", head: true }).gte("created_at", todayStartIso);
  let distributedQuery = supabase.from("gestao_leads").select("id", { count: "exact", head: true }).eq("status", "distributed").gte("created_at", todayStartIso);
  let errorQuery = supabase.from("gestao_leads").select("id", { count: "exact", head: true }).eq("status", "error").gte("created_at", todayStartIso);
  if (workspaceId) {
    receivedQuery = receivedQuery.eq("workspace_id", workspaceId);
    distributedQuery = distributedQuery.eq("workspace_id", workspaceId);
    errorQuery = errorQuery.eq("workspace_id", workspaceId);
  }

  const [{ count: receivedToday }, { count: distributedToday }, { count: errorToday }] = await Promise.all([
    receivedQuery,
    distributedQuery,
    errorQuery,
  ]);

  let recentLeadsQuery = supabase
    .from("gestao_leads")
    .select("id, name, phone, email, source, status, created_at, core_workspaces(name), gestao_leads_sellers(name)")
    .order("created_at", { ascending: false })
    .limit(10);
  if (workspaceId) recentLeadsQuery = recentLeadsQuery.eq("workspace_id", workspaceId);
  const { data: recentLeads } = await recentLeadsQuery;

  const leads = (recentLeads || []) as unknown as OverviewRawLead[];
  const leadIds = leads.map((l) => l.id);

  const { data: auditLogs } =
    leadIds.length > 0
      ? await supabase
          .from("gestao_leads_audit_logs")
          .select("lead_id, details, created_at")
          .in("lead_id", leadIds)
          .eq("action", "round_robin_distribution")
          .gte("created_at", todayStartIso)
      : { data: [] as { lead_id: string; details: Record<string, unknown> }[] };

  const auditByLead = new Map((auditLogs || []).map((a) => [a.lead_id, a.details]));
  const returningToday = (auditLogs || []).filter((a) => a.details?.is_returning_lead).length;

  return {
    success: true as const,
    metrics: {
      receivedToday: receivedToday || 0,
      distributedToday: distributedToday || 0,
      returningToday,
      errorToday: errorToday || 0,
    },
    recentLeads: leads.map((l) => {
      const audit = auditByLead.get(l.id);
      return {
        id: l.id,
        name: l.name,
        contact: l.email || l.phone || "—",
        source: l.source || "—",
        workspaceName: unwrapRelation(l.core_workspaces)?.name || "—",
        status: l.status,
        sellerName: unwrapRelation(l.gestao_leads_sellers)?.name || null,
        isReturning: !!audit?.is_returning_lead,
        createdAt: l.created_at,
      };
    }),
  };
}

export async function getLeadAuditLogs(workspaceId: string, limit = 100) {
  const { data, error } = await supabase
    .from("gestao_leads_audit_logs")
    .select("id, lead_id, action, details, created_at, gestao_leads(name, phone)")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { success: false as const, error: error.message };
  }

  const logs = (data || []).map((log) => {
    const lead = Array.isArray(log.gestao_leads) ? log.gestao_leads[0] : log.gestao_leads;
    return {
      id: log.id,
      leadId: log.lead_id,
      action: log.action,
      timestamp: log.created_at,
      leadName: lead?.name || "—",
      leadPhone: lead?.phone || "—",
      details: log.details as Record<string, unknown> | null,
    };
  });

  return { success: true as const, logs };
}

export async function getLeadsOperationStatus(workspaceId: string, limit = 20) {
  // Fetch recent leads
  const { data: leads, error: leadsError } = await supabase
    .from("gestao_leads")
    .select("id, name, phone, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (leadsError) {
    return { success: false as const, error: leadsError.message };
  }

  const leadIds = (leads || []).map((l) => l.id);

  // Fetch logs for these leads
  const { data: logs } = leadIds.length > 0 
    ? await supabase
      .from("gestao_leads_audit_logs")
      .select("lead_id, action, details, created_at")
      .in("lead_id", leadIds)
      .order("created_at", { ascending: true }) // latest overrides
    : { data: [] };

  const groupedLogs = (logs || []).reduce((acc, log) => {
    if (!acc[log.lead_id]) {
      acc[log.lead_id] = { app: null, sheets: null, kommo: null, whatsapp: null };
    }

    if (log.action === "round_robin_distribution") {
      acc[log.lead_id].app = { status: "success", detail: "Salvo no banco de dados" };
    }

    if (log.action === "delivery" && log.details) {
      const dest = (log.details as any).destination as string;
      const status = (log.details as any).status as string;
      const errorStr = (log.details as any).error as string | undefined;

      let detail = "";
      if (status === "success") detail = "Enviado com sucesso";
      else if (status === "error") detail = errorStr || "Erro de envio";
      else if (status === "skipped") detail = "Pulado";

      if (dest === "app" || dest === "sheets" || dest === "kommo" || dest === "whatsapp") {
        // As logs are ordered ascending or if not we should ensure latest takes precedence.
        // Actually, without an order in SQL we should sort them, but let's assume order is chronological from id or created_at.
        // Or better, we can just assign, last one overwrites.
        acc[log.lead_id][dest] = { status, detail };
      }
    }
    return acc;
  }, {} as Record<string, any>);

  const pipeline = (leads || []).map((lead) => {
    const leadLogs = groupedLogs[lead.id] || { app: null, sheets: null, kommo: null, whatsapp: null };
    
    return {
      id: lead.id,
      name: lead.name,
      phone: lead.phone,
      createdAt: lead.created_at,
      steps: {
        app: leadLogs.app || { status: "pending", detail: "Aguardando" },
        sheet: leadLogs.sheets || { status: "pending", detail: "Aguardando" },
        kommo: leadLogs.kommo || { status: "pending", detail: "Aguardando" },
        wpp: leadLogs.whatsapp || { status: "pending", detail: "Aguardando" },
      }
    };
  });

  return { success: true as const, pipeline };
}

export async function createWorkspace(name: string, slug: string) {
  if (!name.trim() || !slug.trim()) {
    return { success: false as const, error: "Nome e slug são obrigatórios" };
  }

  const slugNormalized = slug
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "")
    .slice(0, 50);

  if (!slugNormalized) {
    return { success: false as const, error: "Slug inválido" };
  }

  const { data, error } = await supabase
    .from("core_workspaces")
    .insert({
      name: name.trim(),
      slug: slugNormalized,
    })
    .select("id, name, slug, client_access_token, created_at")
    .single();

  if (error) {
    return { success: false as const, error: error.message };
  }

  return { success: true as const, workspace: data };
}

export async function getLeadsWithFilters(
  workspaceId: string,
  filters: {
    origins?: string[];
    statuses?: string[];
    sellerId?: string;
    dateFrom?: string; // ISO date string
    dateTo?: string;   // ISO date string
  }
) {
  // Base query: fetch leads with audit logs
  let query = supabase
    .from("gestao_leads")
    .select(
      `id, name, phone, email, source, status, seller_id, created_at,
       gestao_leads_sellers(id, name),
       gestao_leads_audit_logs(id, action, details, created_at)`
    )
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(100);

  // Apply optional filters
  if (filters.origins && filters.origins.length > 0) {
    query = query.in("source", filters.origins);
  }

  if (filters.sellerId) {
    query = query.eq("seller_id", filters.sellerId);
  }

  if (filters.dateFrom) {
    query = query.gte("created_at", filters.dateFrom);
  }

  if (filters.dateTo) {
    query = query.lte("created_at", filters.dateTo);
  }

  const { data: leads, error: leadsError } = await query;

  if (leadsError) {
    return { success: false as const, error: leadsError.message };
  }

  const leadList = (leads || []) as any[];

  // Post-filter by status (since it's in audit logs, not the lead itself)
  let filtered = leadList;
  if (filters.statuses && filters.statuses.length > 0) {
    filtered = filtered.filter((lead) => {
      const auditLogs = Array.isArray(lead.gestao_leads_audit_logs)
        ? lead.gestao_leads_audit_logs
        : lead.gestao_leads_audit_logs
          ? [lead.gestao_leads_audit_logs]
          : [];
      const lastLog = auditLogs[auditLogs.length - 1];
      return lastLog && filters.statuses!.includes(lastLog.action);
    });
  }

  // Extract available options from the filtered results
  const availableOrigins = Array.from(new Set(leadList.map((l) => l.source).filter(Boolean))) as string[];
  const availableStatuses = Array.from(
    new Set(
      leadList
        .flatMap((l) => (Array.isArray(l.gestao_leads_audit_logs) ? l.gestao_leads_audit_logs : [l.gestao_leads_audit_logs || []]))
        .map((log) => log?.action)
        .filter(Boolean)
    )
  ) as string[];

  // Get sellers for autocomplete from current filtered leads (not all leads)
  const sellerMap = new Map<string, { id: string; name: string }>();
  filtered.forEach((lead) => {
    // Seller ID might be UUID (string) or falsy; guard against both null and empty string
    if (lead.seller_id && typeof lead.seller_id === "string" && lead.gestao_leads_sellers) {
      const seller = Array.isArray(lead.gestao_leads_sellers)
        ? lead.gestao_leads_sellers[0]
        : lead.gestao_leads_sellers;
      if (seller) {
        sellerMap.set(seller.id, { id: seller.id, name: seller.name });
      }
    }
  });
  const availableSellers = Array.from(sellerMap.values());

  // Extract origins and statuses from FILTERED leads, not all leads
  // This ensures dropdown options match the current results
  const filteredOrigins = Array.from(new Set(filtered.map((l) => l.source).filter(Boolean))) as string[];
  const filteredStatuses = Array.from(
    new Set(
      filtered
        .flatMap((l) => (Array.isArray(l.gestao_leads_audit_logs) ? l.gestao_leads_audit_logs : [l.gestao_leads_audit_logs || []]))
        .map((log) => log?.action)
        .filter(Boolean)
    )
  ) as string[];

  return {
    success: true as const,
    leads: filtered.map((l) => ({
      id: l.id,
      name: l.name,
      phone: l.phone,
      email: l.email,
      source: l.source,
      status: l.status,
      sellerId: l.seller_id,
      sellerName: Array.isArray(l.gestao_leads_sellers)
        ? l.gestao_leads_sellers[0]?.name || "—"
        : l.gestao_leads_sellers?.name || "—",
      createdAt: l.created_at,
    })),
    availableOrigins: filteredOrigins,
    availableStatuses: filteredStatuses,
    availableSellers,
  };
}

/**
 * Auditoria de leads: compara os leads que a Meta REALMENTE registrou pra um
 * formulário (fonte da verdade, via Graph API) contra o que chegou no nosso
 * banco (por leadgen_id). Read-only — não altera nada, só aponta divergência.
 */
export async function auditLeadForm(connectionId: string, formId: string) {
  const { data: conn, error: connErr } = await supabase
    .from("gestao_leads_meta_connections")
    .select("access_token, workspace_id")
    .eq("id", connectionId)
    .maybeSingle();

  if (connErr || !conn) {
    return { success: false as const, error: "Conexão não encontrada." };
  }

  const metaRes = await fetchMetaFormLeads(formId, conn.access_token);
  if (!metaRes.success) {
    return { success: false as const, error: metaRes.error };
  }

  const { data: systemLeads, error: leadsErr } = await supabase
    .from("gestao_leads")
    .select("leadgen_id, status")
    .eq("workspace_id", conn.workspace_id)
    .not("leadgen_id", "is", null);

  if (leadsErr) {
    return { success: false as const, error: "Erro ao consultar os leads do sistema." };
  }

  const systemByLeadgenId = new Map((systemLeads || []).map((l) => [l.leadgen_id, l.status]));

  const rows = metaRes.leads
    .map((l) => ({
      leadgenId: l.id,
      createdTime: l.createdTime,
      name: l.fields.full_name || l.fields.name || l.fields.nome_completo || "—",
      systemStatus: systemByLeadgenId.get(l.id) ?? null,
    }))
    .sort((a, b) => new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime());

  return {
    success: true as const,
    totalInMeta: rows.length,
    totalMissing: rows.filter((r) => r.systemStatus === null).length,
    rows,
  };
}
