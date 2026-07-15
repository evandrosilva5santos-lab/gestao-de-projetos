"use server";

import { supabaseAdmin as supabase } from "@/lib/supabase/client";

// ---------------------------------------------------------------------------
// Regra de Ouro #7: esta feature NUNCA importa de outra feature.
// O helper abaixo é uma cópia mínima e independente do padrão usado em
// features/leads (getWorkspaceByToken). Resolve um token público de cliente
// para o workspace correspondente, sem exigir login.
// ---------------------------------------------------------------------------
async function getWorkspaceByToken(token: string) {
  const { data } = await supabase
    .from("core_workspaces")
    .select("id, name")
    .eq("client_access_token", token)
    .maybeSingle();
  return data;
}

/** Relação retornada pelo Supabase pode vir como objeto único ou array. */
function unwrapRelation<T>(rel: T | T[] | null): T | null {
  if (!rel) return null;
  return Array.isArray(rel) ? rel[0] || null : rel;
}

export type PortalLead = {
  id: string;
  name: string;
  contact: string;
  source: string;
  sellerName: string | null;
  status: string;
  createdAt: string;
};

type PortalLeadRaw = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  source: string | null;
  status: string;
  created_at: string;
  gestao_leads_sellers: { name: string } | { name: string }[] | null;
};

/**
 * Portal público do cliente: valida o token, resolve o workspace e retorna
 * SOMENTE os leads daquele workspace. Um token nunca enxerga lead de outro
 * cliente — o filtro por `workspace_id` é aplicado no servidor.
 */
export async function getLeadsByClientToken(token: string) {
  const workspace = await getWorkspaceByToken(token);
  if (!workspace) {
    return { success: false as const, error: "Link inválido." };
  }

  const { data, error } = await supabase
    .from("gestao_leads")
    .select("id, name, phone, email, source, status, created_at, gestao_leads_sellers(name)")
    .eq("workspace_id", workspace.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return { success: false as const, error: error.message };
  }

  const rows = (data || []) as unknown as PortalLeadRaw[];
  const leads: PortalLead[] = rows.map((l) => ({
    id: l.id,
    name: l.name || "—",
    contact: l.email || l.phone || "—",
    source: l.source || "—",
    sellerName: unwrapRelation(l.gestao_leads_sellers)?.name || null,
    status: l.status,
    createdAt: l.created_at,
  }));

  return {
    success: true as const,
    workspaceName: workspace.name as string,
    leads,
  };
}
