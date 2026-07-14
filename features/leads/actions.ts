"use server";

import { supabaseAdmin as supabase } from "@/lib/supabase/client";

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

interface SellerQueueRaw {
  id: string;
  name: string;
  phone: string | null;
  is_active: boolean;
  last_assigned_at: string | null;
  workspace_id: string;
  core_workspaces: { name: string } | { name: string }[] | null;
}

/** Fila da vez de TODOS os clientes (visão interna/admin da agência). */
export async function getAllSellersQueue() {
  const { data, error } = await supabase
    .from("gestao_leads_sellers")
    .select("id, name, phone, is_active, last_assigned_at, workspace_id, core_workspaces(name)")
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
      isActive: s.is_active,
      lastAssignedAt: s.last_assigned_at,
    })),
  }));

  return { success: true as const, groups };
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
  input: { name?: string; phone?: string | null; crmUserId?: string | null }
) {
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) return { success: false as const, error: "Nome do vendedor é obrigatório." };
    patch.name = name;
  }
  if (input.phone !== undefined) patch.phone = input.phone?.trim() || null;
  if (input.crmUserId !== undefined) patch.crm_user_id = input.crmUserId?.trim() || null;

  const { error } = await supabase.from("gestao_leads_sellers").update(patch).eq("id", sellerId);
  if (error) {
    return { success: false as const, error: error.message };
  }
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
