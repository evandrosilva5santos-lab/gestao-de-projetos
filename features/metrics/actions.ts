"use server";

import { supabaseAdmin as supabase } from "@/lib/supabase/client";

// Módulo isolado (Feature-Sliced): não importa de nenhuma outra feature — só de
// lib/. Ver 00 - Regras/RULES.md #7. Read-only: agrega gestao_leads e
// gestao_leads_audit_logs para o dashboard da agência (PRD #9).

type LeadRow = {
  status: string;
  source: string | null;
  workspace_id: string;
  created_at: string;
};

function startOfTodayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/**
 * KPIs da agência inteira: volume, taxa de sucesso, quebra por cliente e por
 * origem, e descartes (formulário não monitorado) do novo modelo de auditoria.
 */
export async function getAgencyMetrics() {
  const todayIso = startOfTodayIso();

  const [
    { count: receivedTotal },
    { count: receivedToday },
    { count: distributedToday },
    { count: waitingSeller },
    { count: errorToday },
    { count: discardsToday },
    { data: workspaces },
    { data: recentLeads },
  ] = await Promise.all([
    supabase.from("gestao_leads").select("id", { count: "exact", head: true }),
    supabase.from("gestao_leads").select("id", { count: "exact", head: true }).gte("created_at", todayIso),
    supabase.from("gestao_leads").select("id", { count: "exact", head: true }).eq("status", "distributed").gte("created_at", todayIso),
    supabase.from("gestao_leads").select("id", { count: "exact", head: true }).eq("status", "waiting_seller"),
    supabase.from("gestao_leads").select("id", { count: "exact", head: true }).eq("status", "error").gte("created_at", todayIso),
    supabase.from("gestao_leads_audit_logs").select("id", { count: "exact", head: true }).eq("action", "ignored_unmonitored_form").gte("created_at", todayIso),
    supabase.from("core_workspaces").select("id, name"),
    // Janela recente para quebra por cliente/origem — volume é baixo nesta fase.
    supabase.from("gestao_leads").select("status, source, workspace_id, created_at").order("created_at", { ascending: false }).limit(1000),
  ]);

  const leads = (recentLeads || []) as LeadRow[];
  const wsName = new Map((workspaces || []).map((w) => [w.id, w.name as string]));

  // Quebra por cliente.
  const byClientMap = new Map<string, { received: number; distributed: number; error: number }>();
  // Quebra por origem.
  const bySourceMap = new Map<string, number>();

  for (const l of leads) {
    const c = byClientMap.get(l.workspace_id) || { received: 0, distributed: 0, error: 0 };
    c.received += 1;
    if (l.status === "distributed") c.distributed += 1;
    if (l.status === "error") c.error += 1;
    byClientMap.set(l.workspace_id, c);

    const src = l.source || "—";
    bySourceMap.set(src, (bySourceMap.get(src) || 0) + 1);
  }

  const byClient = Array.from(byClientMap.entries())
    .map(([id, v]) => ({ workspaceId: id, workspaceName: wsName.get(id) || "—", ...v }))
    .sort((a, b) => b.received - a.received);

  const bySource = Array.from(bySourceMap.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);

  const distributed = distributedToday || 0;
  const errored = errorToday || 0;
  const attemptedToday = distributed + errored;
  const successRate = attemptedToday > 0 ? Math.round((distributed / attemptedToday) * 100) : null;

  return {
    success: true as const,
    kpis: {
      receivedTotal: receivedTotal || 0,
      receivedToday: receivedToday || 0,
      distributedToday: distributed,
      waitingSeller: waitingSeller || 0,
      errorToday: errored,
      discardsToday: discardsToday || 0,
      successRate, // null quando não houve tentativa hoje
    },
    byClient,
    bySource,
  };
}
