"use server";

// ---------------------------------------------------------------------------
// Feature: Traffic (Gestão de Tráfego) — SCAFFOLD / BACKLOG
//
// Server Actions ainda NÃO implementadas. São stubs tipados que documentam o
// contrato pretendido de cada uma das 4 capacidades. Cada stub retorna um erro
// "não implementado" de propósito, para que qualquer chamada acidental falhe de
// forma explícita em vez de silenciosa.
//
// Ao implementar (última prioridade — ver docs/BACKLOG-GESTAO-TRAFEGO.md):
//   - Usar `supabaseAdmin` de "@/lib/supabase/client" (server-only).
//   - NÃO importar de outra feature (Regra de Ouro #7). Duplicar helpers mínimos.
//   - Filtrar SEMPRE por `workspace_id` (isolamento por cliente).
// ---------------------------------------------------------------------------

import type {
  ActionResult,
  AdAccount,
  Campaign,
  ClientTrafficReport,
  TrafficMetrics,
} from "./types";

const NOT_IMPLEMENTED = "Gestão de tráfego ainda não implementada (backlog)." as const;

/** (1) Conexão de contas de anúncio — lista as contas conectadas do workspace. */
export async function getAdAccounts(
  _workspaceId: string
): Promise<ActionResult<{ accounts: AdAccount[] }>> {
  return { success: false, error: NOT_IMPLEMENTED };
}

/** (2) Gestão de campanhas — lista as campanhas do workspace. */
export async function getCampaigns(
  _workspaceId: string
): Promise<ActionResult<{ campaigns: Campaign[] }>> {
  return { success: false, error: NOT_IMPLEMENTED };
}

/** (3) Dashboard de métricas — métricas agregadas do workspace numa janela. */
export async function getTrafficMetrics(
  _workspaceId: string,
  _period?: { from: string; to: string }
): Promise<ActionResult<{ metrics: TrafficMetrics }>> {
  return { success: false, error: NOT_IMPLEMENTED };
}

/** (4) Relatório do cliente por token público (espelha o padrão do client-portal). */
export async function getTrafficReportByClientToken(
  _token: string
): Promise<ActionResult<{ report: ClientTrafficReport }>> {
  return { success: false, error: NOT_IMPLEMENTED };
}
