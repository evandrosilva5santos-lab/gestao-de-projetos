"use server";

import { supabaseAdmin as supabase } from "@/lib/supabase/client";

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

export async function getLeadsOverview() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStartIso = todayStart.toISOString();

  const [{ count: receivedToday }, { count: distributedToday }, { count: errorToday }] = await Promise.all([
    supabase.from("gestao_leads").select("id", { count: "exact", head: true }).gte("created_at", todayStartIso),
    supabase.from("gestao_leads").select("id", { count: "exact", head: true }).eq("status", "distributed").gte("created_at", todayStartIso),
    supabase.from("gestao_leads").select("id", { count: "exact", head: true }).eq("status", "error").gte("created_at", todayStartIso),
  ]);

  const { data: recentLeads } = await supabase
    .from("gestao_leads")
    .select("id, name, phone, email, source, status, created_at, core_workspaces(name), gestao_leads_sellers(name)")
    .order("created_at", { ascending: false })
    .limit(10);

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
