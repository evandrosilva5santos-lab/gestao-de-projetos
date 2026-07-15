// ---------------------------------------------------------------------------
// Feature: Traffic (Gestão de Tráfego) — SCAFFOLD / BACKLOG
// Tipos base para as 4 capacidades planejadas. Ainda NÃO implementado.
// Ver README.md desta pasta e docs/BACKLOG-GESTAO-TRAFEGO.md.
// ---------------------------------------------------------------------------

/** Plataformas de anúncio suportadas (planejado). */
export type AdPlatform = "meta" | "google" | "tiktok";

/** (1) Conexão de contas de anúncio por cliente/workspace. */
export type AdAccount = {
  id: string;
  workspaceId: string;
  platform: AdPlatform;
  externalAccountId: string; // ex: act_123456 (Meta) ou 123-456-7890 (Google)
  name: string;
  status: "connected" | "disconnected" | "error";
  connectedAt: string | null;
};

/** (2) Gestão de campanhas de tráfego. */
export type Campaign = {
  id: string;
  workspaceId: string;
  adAccountId: string | null;
  platform: AdPlatform;
  name: string;
  objective: string | null;
  dailyBudget: number | null;
  status: "draft" | "active" | "paused" | "ended";
  startDate: string | null;
  endDate: string | null;
};

/** (3) Dashboard de métricas de ads (janela de tempo agregada). */
export type TrafficMetrics = {
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  cpc: number; // custo por clique
  cpm: number; // custo por mil impressões
  ctr: number; // taxa de clique
  roas: number | null; // retorno sobre investimento em ads
};

/** (4) Relatório de tráfego para o cliente final (visão read-only por token). */
export type ClientTrafficReport = {
  workspaceName: string;
  period: { from: string; to: string };
  totals: TrafficMetrics;
  byCampaign: Array<{ campaignName: string; platform: AdPlatform; metrics: TrafficMetrics }>;
};

/** Envelope padrão de retorno das Server Actions desta feature. */
export type ActionResult<T> =
  | ({ success: true } & T)
  | { success: false; error: string };
