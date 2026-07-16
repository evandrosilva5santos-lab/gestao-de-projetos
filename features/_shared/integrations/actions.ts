"use server";

import { supabaseAdmin as supabase } from "@/lib/supabase/client";
import { fetchMetaPages, fetchMetaForms, fetchMetaAdAccounts } from "@/lib/leads/providers/meta";
import type { MetaPage } from "@/lib/leads/providers/meta";
import { listAccessibleSpreadsheets, listSheetTabs } from "@/lib/leads/integrations/sheets";
import { fetchKommoUsers, pingKommoAccount, fetchKommoPipelines } from "@/lib/leads/integrations/kommo";
import type { KommoPipeline } from "@/lib/leads/integrations/kommo";
import { fetchSheetHeaders } from "@/lib/leads/integrations/sheets";
import * as crypto from "crypto";

export async function listWorkspaces() {
  const { data, error } = await supabase
    .from("core_workspaces")
    .select("id, name")
    .order("name");

  if (error) {
    return { success: false as const, error: error.message };
  }
  return { success: true as const, workspaces: data || [] };
}

export async function listMetaConnections() {
  const { data, error } = await supabase
    .from("gestao_leads_meta_connections")
    .select("id, workspace_id, page_id, page_name, is_active, updated_at, core_workspaces(name)")
    .eq("is_active", true);

  if (error) {
    return { success: false as const, error: error.message };
  }
  return { success: true as const, connections: data || [] };
}

export async function listMetaPages(token: string) {
  return fetchMetaPages(token);
}

/* ------------------------------------------------------------------ *
 * Fontes de Entrada — conexão (token) salva uma vez e reutilizada.
 * Ver docs/PRD-FONTES-DE-ENTRADA.md.
 *
 * Nenhuma destas actions devolve token ao client: o browser trabalha com
 * sourceId + externalPageId, e o token é lido do banco aqui no servidor.
 * ------------------------------------------------------------------ */

/** Conexão salva, como o modal a enxerga (sem credenciais). */
export type SavedSource = {
  id: string;
  name: string;
  providerType: string;
  status: string;
  maskedToken: string;
  lastValidatedAt: string | null;
  pageCount: number;
};

export type SourcePage = {
  id: string;
  externalPageId: string;
  name: string;
  isMonitored: boolean;
};

export type SourceForm = {
  id: string;
  externalFormId: string;
  name: string;
  status: string | null;
  isMonitored: boolean;
};

function maskToken(token: string) {
  if (token.length <= 12) return "••••••••";
  return `${token.slice(0, 8)}••••••••${token.slice(-4)}`;
}

/** Conexões Meta já cadastradas — é o que faz você não recolar o token. */
export async function listSavedSources() {
  const { data, error } = await supabase
    .from("gestao_leads_sources")
    .select("id, name, provider_type, credentials, status, last_validated_at, gestao_leads_source_pages(id)")
    .order("created_at", { ascending: false });

  if (error) {
    return { success: false as const, error: error.message };
  }

  const sources: SavedSource[] = (data || []).map((s) => {
    const pages = s.gestao_leads_source_pages;
    const credentials = s.credentials as { token?: string } | null;
    return {
      id: s.id,
      name: s.name,
      providerType: s.provider_type,
      status: s.status,
      maskedToken: maskToken(credentials?.token || ""),
      lastValidatedAt: s.last_validated_at,
      pageCount: Array.isArray(pages) ? pages.length : 0,
    };
  });

  return { success: true as const, sources };
}

/**
 * Cadastra um token novo: valida na Graph API e já cacheia as páginas que ele
 * enxerga. A partir daqui a conexão é reutilizável — nunca mais se cola este
 * token para adicionar outro cliente.
 */
export async function saveMetaSource(data: { name: string; token: string }) {
  const token = data.token.trim();
  const name = data.name.trim();

  if (!name) {
    return { success: false as const, error: "Dê um nome para esta conexão (ex.: 'BM Agência Start')." };
  }

  const res = await fetchMetaPages(token);
  if (!res.success) {
    return { success: false as const, error: res.error };
  }
  if (res.pages.length === 0) {
    return {
      success: false as const,
      error: "Token válido, mas nenhuma página encontrada (verifique a permissão pages_show_list).",
    };
  }

  const { data: source, error } = await supabase
    .from("gestao_leads_sources")
    .insert({
      provider_type: "meta",
      name,
      credentials: { token },
      status: "active",
      last_validated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !source) {
    return { success: false as const, error: error?.message || "Falha ao salvar a conexão." };
  }

  const cached = await cachePages(source.id, res.pages);
  if (!cached.success) {
    return cached;
  }

  return { success: true as const, sourceId: source.id, pageCount: res.pages.length };
}

async function cachePages(sourceId: string, pages: MetaPage[]) {
  const { error } = await supabase.from("gestao_leads_source_pages").upsert(
    pages.map((p) => ({
      source_id: sourceId,
      external_page_id: p.id,
      name: p.name,
      page_access_token: p.access_token,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: "source_id,external_page_id" }
  );

  if (error) {
    return { success: false as const, error: error.message };
  }
  return { success: true as const };
}

/** Páginas do cache — resposta instantânea, sem bater na Graph API. */
export async function getSourcePages(sourceId: string) {
  const { data, error } = await supabase
    .from("gestao_leads_source_pages")
    .select("id, external_page_id, name, is_monitored")
    .eq("source_id", sourceId)
    .order("name");

  if (error) {
    return { success: false as const, error: error.message };
  }

  const pages: SourcePage[] = (data || []).map((p) => ({
    id: p.id,
    externalPageId: p.external_page_id,
    name: p.name,
    isMonitored: p.is_monitored,
  }));

  return { success: true as const, pages };
}

/** Rebusca as páginas na Graph API (para quando o cliente criou uma página nova). */
export async function resyncSourcePages(sourceId: string) {
  const { data: source, error } = await supabase
    .from("gestao_leads_sources")
    .select("credentials")
    .eq("id", sourceId)
    .maybeSingle();

  if (error || !source) {
    return { success: false as const, error: "Conexão não encontrada." };
  }

  const token = (source.credentials as { token?: string })?.token || "";
  const res = await fetchMetaPages(token);

  if (!res.success) {
    await supabase
      .from("gestao_leads_sources")
      .update({ status: "invalid", last_error: res.error, updated_at: new Date().toISOString() })
      .eq("id", sourceId);
    return { success: false as const, error: res.error };
  }

  const cached = await cachePages(sourceId, res.pages);
  if (!cached.success) {
    return cached;
  }

  await supabase
    .from("gestao_leads_sources")
    .update({
      status: "active",
      last_error: null,
      last_validated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", sourceId);

  return getSourcePages(sourceId);
}

/**
 * Formulários de uma página. Vem do cache; se a página nunca foi sincronizada,
 * busca na Graph API e cacheia. `forceSync` refaz o fetch.
 */
export async function getSourceForms(sourcePageId: string, forceSync = false) {
  const { data: page, error: pageErr } = await supabase
    .from("gestao_leads_source_pages")
    .select("id, external_page_id, page_access_token")
    .eq("id", sourcePageId)
    .maybeSingle();

  if (pageErr || !page) {
    return { success: false as const, error: "Página não encontrada." };
  }

  if (!forceSync) {
    const { data: cachedForms } = await supabase
      .from("gestao_leads_source_forms")
      .select("id, external_form_id, name, status, is_monitored")
      .eq("source_page_id", sourcePageId)
      .order("name");

    if (cachedForms && cachedForms.length > 0) {
      return { success: true as const, forms: toSourceForms(cachedForms) };
    }
  }

  const res = await fetchMetaForms(page.external_page_id, page.page_access_token);
  if (!res.success) {
    return { success: false as const, error: res.error };
  }

  if (res.forms.length > 0) {
    const { error: upsertErr } = await supabase.from("gestao_leads_source_forms").upsert(
      res.forms.map((f) => ({
        source_page_id: sourcePageId,
        external_form_id: f.id,
        name: f.name,
        status: f.status,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: "source_page_id,external_form_id", ignoreDuplicates: false }
    );

    if (upsertErr) {
      return { success: false as const, error: upsertErr.message };
    }
  }

  const { data: forms, error: readErr } = await supabase
    .from("gestao_leads_source_forms")
    .select("id, external_form_id, name, status, is_monitored")
    .eq("source_page_id", sourcePageId)
    .order("name");

  if (readErr) {
    return { success: false as const, error: readErr.message };
  }

  return { success: true as const, forms: toSourceForms(forms || []) };
}

function toSourceForms(
  rows: { id: string; external_form_id: string; name: string; status: string | null; is_monitored: boolean }[]
): SourceForm[] {
  return rows.map((f) => ({
    id: f.id,
    externalFormId: f.external_form_id,
    name: f.name,
    status: f.status,
    isMonitored: f.is_monitored,
  }));
}

/** Remove a conexão e, em cascata, suas páginas e formulários cacheados. */
export async function deleteSource(sourceId: string) {
  const { error } = await supabase.from("gestao_leads_sources").delete().eq("id", sourceId);
  if (error) {
    return { success: false as const, error: error.message };
  }
  return { success: true as const };
}

/** Remove uma conexão Meta (página vinculada a um cliente) — botão "Desconectar". */
export async function deleteMetaConnection(connectionId: string) {
  const { error } = await supabase.from("gestao_leads_meta_connections").delete().eq("id", connectionId);
  if (error) {
    return { success: false as const, error: error.message };
  }
  return { success: true as const };
}

/** Remove um destino (Kommo/Sheets/Evolution) — botão "Desconectar". */
export async function deleteDestination(destinationId: string) {
  const { error } = await supabase.from("gestao_leads_destinations").delete().eq("id", destinationId);
  if (error) {
    return { success: false as const, error: error.message };
  }
  return { success: true as const };
}

type DestinationConfig = { subdomain?: string; token?: string; clientEmail?: string; privateKey?: string; spreadsheetId?: string; sheetName?: string; url?: string; instanceName?: string };

async function getDestinationConfig(destinationId: string): Promise<{ success: true; config: DestinationConfig } | { success: false; error: string }> {
  const { data, error } = await supabase
    .from("gestao_leads_destinations")
    .select("config")
    .eq("id", destinationId)
    .maybeSingle();
  if (error || !data) {
    return { success: false, error: "Destino não encontrado." };
  }
  return { success: true, config: (data.config || {}) as DestinationConfig };
}

/** Botão "Testar" — Kommo: valida subdomínio + token batendo em GET /api/v4/account. */
export async function testKommoConnection(destinationId: string) {
  const cfg = await getDestinationConfig(destinationId);
  if (!cfg.success) return { success: false as const, error: cfg.error };

  const res = await pingKommoAccount(cfg.config.subdomain || "", cfg.config.token || "");
  if (!res.success) return { success: false as const, error: res.error || "Falha ao validar o Kommo." };
  return { success: true as const, message: `Conectado à conta "${res.accountName}".` };
}

/**
 * Busca os pipelines/etapas reais da conta Kommo a partir de subdomínio+token
 * já digitados no wizard (ainda não salvos) — troca "Pipeline ID"/"Status ID"
 * de campo de texto por seleção por nome. Ver docs/AUDITORIA-BOTOES-FICTICIOS.md item 3.
 */
export async function listKommoPipelines(subdomain: string, token: string): Promise<{ success: true; pipelines: KommoPipeline[] } | { success: false; error: string }> {
  const res = await fetchKommoPipelines(subdomain, token);
  if (!res.success || !res.pipelines) {
    return { success: false, error: res.error || "Falha ao buscar pipelines." };
  }
  return { success: true, pipelines: res.pipelines };
}

/** Botão "Testar" — Google Sheets: lê o cabeçalho real da aba configurada. */
export async function testSheetsConnection(destinationId: string) {
  const cfg = await getDestinationConfig(destinationId);
  if (!cfg.success) return { success: false as const, error: cfg.error };

  const res = await fetchSheetHeaders(
    cfg.config.clientEmail || "",
    cfg.config.privateKey || "",
    cfg.config.spreadsheetId || "",
    cfg.config.sheetName || ""
  );
  if (!res.success) return { success: false as const, error: res.error };
  return { success: true as const, message: `Acesso confirmado. Colunas: ${res.headers.slice(0, 5).join(", ")}${res.headers.length > 5 ? "…" : ""}` };
}

/** Botão "Testar" — Evolution: bate em GET /instance/fetchInstances (mesma validação de host do sync de grupos). */
export async function testEvolutionConnection(destinationId: string) {
  const cfg = await getDestinationConfig(destinationId);
  if (!cfg.success) return { success: false as const, error: cfg.error };

  const { url, token, instanceName } = cfg.config;
  if (!url || !token || !instanceName) {
    return { success: false as const, error: "Configuração incompleta (URL, API Key ou instância)." };
  }

  let host: URL;
  try {
    host = new URL(url);
  } catch {
    return { success: false as const, error: "URL da instância inválida." };
  }
  if (host.protocol !== "http:" && host.protocol !== "https:") {
    return { success: false as const, error: "URL deve usar http ou https." };
  }
  if (isPrivateOrLoopbackHost(host.hostname)) {
    return { success: false as const, error: "URL não pode apontar para um host interno/reservado." };
  }

  try {
    const res = await fetch(`${host.origin}/instance/fetchInstances?instanceName=${encodeURIComponent(instanceName)}`, {
      headers: { apikey: token },
    });
    if (!res.ok) {
      return { success: false as const, error: `Evolution respondeu ${res.status}.` };
    }
    const data = await res.json();
    const list = Array.isArray(data) ? data : [];
    if (list.length === 0) {
      return { success: false as const, error: `Instância "${instanceName}" não encontrada nesse servidor.` };
    }
    const state = list[0]?.connectionStatus || list[0]?.instance?.state || "desconhecido";
    return { success: true as const, message: `Instância "${instanceName}" encontrada — status: ${state}.` };
  } catch (err) {
    return { success: false as const, error: err instanceof Error ? err.message : "Erro de rede ao contatar a Evolution." };
  }
}

/**
 * Valida uma conexão Meta já salva e busca os formulários da página ao vivo.
 * O access_token nunca sai do servidor — só devolvemos a lista de formulários.
 * Usada tanto pelo botão "Testar" (valida o token) quanto pelo "Sincronizar"
 * (relista os formulários disponíveis) em Fontes de Entrada.
 */
export async function testMetaConnection(connectionId: string) {
  const { data: conn, error } = await supabase
    .from("gestao_leads_meta_connections")
    .select("page_id, page_name, access_token")
    .eq("id", connectionId)
    .maybeSingle();

  if (error || !conn) {
    return { success: false as const, error: "Conexão não encontrada." };
  }

  const res = await fetchMetaForms(conn.page_id, conn.access_token);
  if (!res.success) {
    return { success: false as const, error: res.error };
  }

  return {
    success: true as const,
    pageName: conn.page_name || conn.page_id,
    forms: res.forms,
  };
}

export async function listMetaForms(pageId: string, pageAccessToken: string) {
  return fetchMetaForms(pageId, pageAccessToken);
}

/**
 * Vincula uma página (de uma conexão salva) a um cliente e define QUAIS
 * formulários daquela página valem — só os `selectedFormIds` viram lead.
 * O page access token é lido do cache no servidor; não trafega pelo browser.
 */
export async function saveMetaConnection(data: {
  sourcePageId: string;
  workspaceId?: string;
  newWorkspaceName?: string;
  selectedFormIds: string[];
}) {
  try {
    const { data: page, error: pageErr } = await supabase
      .from("gestao_leads_source_pages")
      .select("id, source_id, external_page_id, name, page_access_token")
      .eq("id", data.sourcePageId)
      .maybeSingle();

    if (pageErr || !page) {
      return { success: false as const, error: "Página não encontrada. Sincronize a conexão novamente." };
    }

    if (data.selectedFormIds.length === 0) {
      return {
        success: false as const,
        error: "Selecione ao menos um formulário — os não selecionados são ignorados pelo Motor.",
      };
    }

    let workspaceId = data.workspaceId;

    if (!workspaceId && data.newWorkspaceName?.trim()) {
      const slug = data.newWorkspaceName
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      const { data: newWs, error: createErr } = await supabase
        .from("core_workspaces")
        .insert({ name: data.newWorkspaceName.trim(), slug })
        .select("id")
        .single();

      if (createErr || !newWs) {
        return { success: false as const, error: createErr?.message || "Falha ao criar cliente" };
      }
      workspaceId = newWs.id;
    }

    if (!workspaceId) {
      return { success: false as const, error: "Selecione ou crie um cliente (workspace) para vincular a página." };
    }

    const { data: connection, error } = await supabase
      .from("gestao_leads_meta_connections")
      .upsert(
        {
          workspace_id: workspaceId,
          page_id: page.external_page_id,
          page_name: page.name,
          access_token: page.page_access_token,
          source_id: page.source_id,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "page_id" }
      )
      .select("id")
      .single();

    if (error || !connection) {
      return { success: false as const, error: error?.message || "Falha ao salvar a conexão" };
    }

    const formsSaved = await setMonitoredForms(page.id, data.selectedFormIds);
    if (!formsSaved.success) {
      return formsSaved;
    }

    await supabase
      .from("gestao_leads_source_pages")
      .update({ is_monitored: true, updated_at: new Date().toISOString() })
      .eq("id", page.id);

    return { success: true as const, workspaceId, connectionId: connection.id };
  } catch (err) {
    return { success: false as const, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Define exatamente quais formulários da página são monitorados. Os que saem da
 * seleção voltam a `is_monitored = false` e param de gerar lead — é o que
 * permite reconfigurar depois sem recriar a conexão.
 */
export async function setMonitoredForms(sourcePageId: string, selectedFormIds: string[]) {
  const { error: offErr } = await supabase
    .from("gestao_leads_source_forms")
    .update({ is_monitored: false, updated_at: new Date().toISOString() })
    .eq("source_page_id", sourcePageId);

  if (offErr) {
    return { success: false as const, error: offErr.message };
  }

  if (selectedFormIds.length > 0) {
    const { error: onErr } = await supabase
      .from("gestao_leads_source_forms")
      .update({ is_monitored: true, updated_at: new Date().toISOString() })
      .eq("source_page_id", sourcePageId)
      .in("id", selectedFormIds);

    if (onErr) {
      return { success: false as const, error: onErr.message };
    }
  }

  return { success: true as const };
}

export async function addSellerToConnection(data: {
  workspaceId: string;
  connectionId: string;
  name: string;
  phone?: string;
  crmUserId?: string;
}) {
  try {
    const { data: seller, error } = await supabase
      .from("gestao_leads_sellers")
      .insert({
        workspace_id: data.workspaceId,
        name: data.name,
        phone: data.phone || null,
        crm_user_id: data.crmUserId || null,
        is_active: true,
      })
      .select("id")
      .single();

    if (error || !seller) {
      return { success: false, error: error?.message || "Falha ao criar vendedor" };
    }

    const { error: linkErr } = await supabase
      .from("gestao_leads_seller_connections")
      .insert({ seller_id: seller.id, connection_id: data.connectionId });

    if (linkErr) {
      return { success: false, error: linkErr.message };
    }

    return { success: true, sellerId: seller.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * @deprecated Pega "o primeiro workspace" arbitrariamente — só serve enquanto
 * havia 1 cliente só. Com múltiplos clientes, use getDestinationsForWorkspace.
 */
export async function getDestinations() {
  const { data: destinations, error } = await supabase
    .from("gestao_leads_destinations")
    .select("*, core_workspaces(name)");

  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true, destinations };
}

/** Destinos (Kommo/Sheets/Evolution) de UM cliente específico. */
export async function getDestinationsForWorkspace(workspaceId: string) {
  const [{ data: destinations, error: destError }, { data: metaAdAccounts, error: metaError }] = await Promise.all([
    supabase.from("gestao_leads_destinations").select("*").eq("workspace_id", workspaceId),
    supabase.from("gestao_leads_meta_ad_accounts").select("*").eq("workspace_id", workspaceId),
  ]);

  if (destError) {
    return { success: false as const, error: destError.message };
  }

  return {
    success: true as const,
    destinations: destinations || [],
    metaAdAccounts: metaAdAccounts || [],
  };
}

async function getOrCreateWorkspaceId() {
  const { data: workspaces, error: wsError } = await supabase
    .from("core_workspaces")
    .select("id")
    .limit(1);
    
  if (wsError || !workspaces || workspaces.length === 0) {
    // If no workspace, try to create a default one
    const { data: newWs, error: createWsError } = await supabase
      .from("core_workspaces")
      .insert({
        name: "Default Workspace",
        slug: "default-workspace",
      })
      .select("id")
      .single();
      
    if (createWsError || !newWs) {
      throw new Error("Failed to create default workspace");
    }
    return newWs.id;
  }
  return workspaces[0].id;
}

export async function saveKommoDestination(data: {
  subdomain: string;
  token: string;
  pipelineId?: string;
  statusId?: string;
  workspaceId?: string;
}) {
  try {
    const workspaceId = data.workspaceId || (await getOrCreateWorkspaceId());

    const { error } = await supabase
      .from("gestao_leads_destinations")
      .upsert(
        {
          workspace_id: workspaceId,
          type: "kommo",
          config: {
            subdomain: data.subdomain,
            token: data.token,
            pipelineId: data.pipelineId ? parseInt(data.pipelineId, 10) : undefined,
            statusId: data.statusId ? parseInt(data.statusId, 10) : undefined,
          },
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "workspace_id,type" }
      );

    if (error) {
      return { success: false, error: error.message };
    }

    // Sincroniza usuários do Kommo como Vendedores (Fila da Vez)
    const usersRes = await fetchKommoUsers(data.subdomain, data.token);
    if (usersRes.success && usersRes.users) {
      const sellersToUpsert = usersRes.users.map((u) => ({
        workspace_id: workspaceId,
        crm_user_id: String(u.id),
        name: u.name,
        email: u.email || null,
        phone: u.phone || null,
        is_active: true,
        updated_at: new Date().toISOString(),
      }));

      for (const seller of sellersToUpsert) {
        // Verifica se já existe para este workspace_id e crm_user_id
        const { data: existing } = await supabase
          .from("gestao_leads_sellers")
          .select("id")
          .eq("workspace_id", workspaceId)
          .eq("crm_user_id", seller.crm_user_id)
          .single();

        if (!existing) {
          await supabase.from("gestao_leads_sellers").insert({
            ...seller,
            created_at: new Date().toISOString(),
          });
        } else {
          await supabase
            .from("gestao_leads_sellers")
            .update(seller)
            .eq("id", existing.id);
        }
      }
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/* ------------------------------------------------------------------ *
 * Google Sheets — Service Account como CONEXÃO catalogada (nível agência).
 * A credencial (client_email + private_key) é cadastrada UMA vez; adicionar
 * uma planilha nova pra um cliente vira só "escolher a planilha", sem recolar
 * o JSON. Mesmo padrão do token Meta (gestao_leads_sources).
 * ------------------------------------------------------------------ */

/** Contas de serviço do Sheets já catalogadas — alimenta o seletor do wizard. */
export async function listSheetsSources() {
  const { data, error } = await supabase
    .from("gestao_leads_sources")
    .select("id, name, credentials")
    .eq("provider_type", "google_sheets")
    .order("created_at", { ascending: false });
  if (error) return { success: false as const, error: error.message };
  const sources = (data || []).map((s) => {
    const cred = (s.credentials || {}) as { clientEmail?: string };
    return { id: s.id as string, name: s.name as string, clientEmail: cred.clientEmail || "" };
  });
  return { success: true as const, sources };
}

/** Cadastra (ou reusa) uma Service Account do Sheets. Dedup por client_email. */
export async function saveSheetsSource(data: { clientEmail: string; privateKey: string; name?: string }) {
  const clientEmail = data.clientEmail.trim();
  const privateKey = data.privateKey.trim();
  if (!clientEmail || !privateKey) {
    return { success: false as const, error: "client_email e private_key são obrigatórios." };
  }

  // Valida a credencial de verdade antes de salvar (chave inválida falha aqui).
  const check = await listAccessibleSpreadsheets(clientEmail, privateKey, "");
  if (!check.success) return { success: false as const, error: check.error };

  // Mesma service account = um source só.
  const { data: existing } = await supabase
    .from("gestao_leads_sources")
    .select("id, credentials")
    .eq("provider_type", "google_sheets");
  const match = (existing || []).find(
    (s) => (s.credentials as { clientEmail?: string })?.clientEmail === clientEmail
  );
  if (match) return { success: true as const, sourceId: match.id as string, clientEmail };

  const { data: source, error } = await supabase
    .from("gestao_leads_sources")
    .insert({
      provider_type: "google_sheets",
      name: data.name?.trim() || clientEmail.split("@")[0],
      credentials: { clientEmail, privateKey },
      status: "active",
      last_validated_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !source) return { success: false as const, error: error?.message || "Falha ao salvar a conta de serviço." };
  return { success: true as const, sourceId: source.id as string, clientEmail };
}

/** Lê a credencial do source no servidor — nunca devolve a private_key ao browser. */
async function getSheetsSourceCreds(sourceId: string): Promise<{ clientEmail: string; privateKey: string } | null> {
  const { data, error } = await supabase
    .from("gestao_leads_sources")
    .select("credentials")
    .eq("id", sourceId)
    .eq("provider_type", "google_sheets")
    .maybeSingle();
  if (error || !data) return null;
  const cred = data.credentials as { clientEmail?: string; privateKey?: string };
  if (!cred?.clientEmail || !cred?.privateKey) return null;
  return { clientEmail: cred.clientEmail, privateKey: cred.privateKey };
}

/** Busca planilhas usando a credencial JÁ salva no source — sem recolar JSON. */
export async function searchSpreadsheetsForSource(sourceId: string, search?: string) {
  const creds = await getSheetsSourceCreds(sourceId);
  if (!creds) return { success: false as const, error: "Conta de serviço não encontrada." };
  return listAccessibleSpreadsheets(creds.clientEmail, creds.privateKey, search);
}

/** Lista as abas de uma planilha usando a credencial do source. */
export async function listSheetTabsForSource(sourceId: string, spreadsheetId: string) {
  const creds = await getSheetsSourceCreds(sourceId);
  if (!creds) return { success: false as const, error: "Conta de serviço não encontrada." };
  return listSheetTabs(creds.clientEmail, creds.privateKey, spreadsheetId);
}

export async function saveGoogleSheetsDestination(data: {
  clientEmail?: string;
  privateKey?: string;
  sourceId?: string;
  spreadsheetId: string;
  sheetName: string;
  fieldMapping?: Record<string, string>;
  workspaceId?: string;
}) {
  try {
    const workspaceId = data.workspaceId || (await getOrCreateWorkspaceId());

    // Credencial vem do source (catálogo) quando há sourceId; senão do JSON colado.
    let clientEmail = data.clientEmail;
    let privateKey = data.privateKey;
    if (data.sourceId) {
      const creds = await getSheetsSourceCreds(data.sourceId);
      if (!creds) return { success: false, error: "Conta de serviço não encontrada." };
      clientEmail = creds.clientEmail;
      privateKey = creds.privateKey;
    }
    if (!clientEmail || !privateKey) {
      return { success: false, error: "Credencial da service account ausente." };
    }

    // Mantém client_email/private_key no config (o sender lê daqui, sem mudança de
    // runtime), e guarda o sourceId como referência ao catálogo.
    const { error } = await supabase
      .from("gestao_leads_destinations")
      .upsert(
        {
          workspace_id: workspaceId,
          type: "google_sheets",
          config: {
            clientEmail,
            privateKey,
            sourceId: data.sourceId || null,
            spreadsheetId: data.spreadsheetId,
            sheetName: data.sheetName,
            fieldMapping: data.fieldMapping || {},
          },
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "workspace_id,type" }
      );

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function saveEvolutionDestination(data: {
  url: string;
  token: string;
  instanceName: string;
  groupJid?: string;
  workspaceId?: string;
}) {
  try {
    const workspaceId = data.workspaceId || (await getOrCreateWorkspaceId());

    const { error } = await supabase
      .from("gestao_leads_destinations")
      .upsert(
        {
          workspace_id: workspaceId,
          type: "evolution",
          config: {
            url: data.url,
            token: data.token,
            instanceName: data.instanceName,
            groupJid: data.groupJid,
          },
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "workspace_id,type" }
      );

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function getWhatsAppGroupsHistory(workspaceId: string) {
  const { data, error } = await supabase
    .from("gestao_leads_whatsapp_groups")
    .select("group_id, group_name, group_jid, is_admin, fetched_at")
    .eq("workspace_id", workspaceId)
    .order("fetched_at", { ascending: false });

  if (error) return { success: false as const, error: error.message };
  return { success: true as const, groups: data };
}

// Mesma lista de hosts internos/reservados bloqueada em outras integrações que fazem
// fetch server-side pra URL fornecida pelo usuário (SSRF) — a Evolution real de um
// tenant é sempre um domínio público.
function isPrivateOrLoopbackHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h === "0.0.0.0" || h === "::1") return true;
  if (/^127\./.test(h)) return true;
  if (/^169\.254\./.test(h)) return true;
  if (/^10\./.test(h)) return true;
  if (/^192\.168\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  return false;
}

type EvolutionRawGroup = {
  id?: string;
  subject?: string;
  participants?: { id?: string; phoneNumber?: string; admin?: string | null }[];
};

/**
 * Busca os grupos da instância Evolution real do cliente e atualiza o histórico local
 * (gestao_leads_whatsapp_groups), pra não precisar rebuscar toda vez que alguém for
 * escolher o grupo de destino. Endpoint confirmado batendo direto na Evolution API:
 * GET /group/fetchAllGroups/{instance}?getParticipants=true — NÃO é "/groups" (isso
 * nunca existiu, era um chute de uma versão anterior desta função).
 * "isAdmin" só é confiável comparando o participante cujo phoneNumber bate com o
 * ownerJid da própria instância (GET /instance/fetchInstances) — o campo "owner" do
 * grupo é quem CRIOU o grupo, não necessariamente quem está conectado agora.
 */
export async function syncWhatsAppGroups(data: {
  workspaceId: string;
  url: string;
  token: string;
  instanceName: string;
}) {
  const { workspaceId, url, token, instanceName } = data;
  if (!workspaceId || !url || !token || !instanceName) {
    return { success: false as const, error: "Preencha URL, API Key e Nome da instância antes de buscar grupos." };
  }

  let host: URL;
  try {
    host = new URL(url);
  } catch {
    return { success: false as const, error: "URL da instância inválida." };
  }
  if (host.protocol !== "http:" && host.protocol !== "https:") {
    return { success: false as const, error: "URL deve usar http ou https." };
  }
  if (isPrivateOrLoopbackHost(host.hostname)) {
    return { success: false as const, error: "URL não pode apontar para um host interno/reservado." };
  }

  const base = host.origin;
  const instancePath = encodeURIComponent(instanceName);

  try {
    const [groupsRes, instancesRes] = await Promise.all([
      fetch(`${base}/group/fetchAllGroups/${instancePath}?getParticipants=true`, {
        headers: { apikey: token },
      }),
      fetch(`${base}/instance/fetchInstances?instanceName=${instancePath}`, {
        headers: { apikey: token },
      }),
    ]);

    if (!groupsRes.ok) {
      const errText = await groupsRes.text();
      console.error(`Evolution respondeu ${groupsRes.status} em fetchAllGroups: ${errText}`);
      return { success: false as const, error: `Evolution respondeu ${groupsRes.status} ao buscar grupos.` };
    }

    const rawGroups = await groupsRes.json();
    const groupsArray: EvolutionRawGroup[] = Array.isArray(rawGroups)
      ? rawGroups
      : Array.isArray(rawGroups?.data)
      ? rawGroups.data
      : [];

    let ownerDigits: string | null = null;
    if (instancesRes.ok) {
      const instancesData = await instancesRes.json();
      const list = Array.isArray(instancesData) ? instancesData : [];
      const ownerJid: string | undefined = list[0]?.ownerJid;
      ownerDigits = ownerJid ? ownerJid.replace(/\D/g, "") : null;
    }

    const groups = groupsArray
      .map((g) => {
        const jid = g.id || "";
        if (!jid) return null;
        let isAdmin = false;
        if (ownerDigits && Array.isArray(g.participants)) {
          const me = g.participants.find((p) => {
            const num = (p.phoneNumber || p.id || "").replace(/\D/g, "");
            return num && num === ownerDigits;
          });
          isAdmin = me?.admin === "admin" || me?.admin === "superadmin";
        }
        return {
          group_id: jid,
          group_name: g.subject || "Grupo sem nome",
          group_jid: jid,
          is_admin: isAdmin,
        };
      })
      .filter((g): g is NonNullable<typeof g> => g !== null);

    const syncedAt = new Date().toISOString();

    if (groups.length > 0) {
      const { error: dbError } = await supabase.from("gestao_leads_whatsapp_groups").upsert(
        groups.map((g) => ({ workspace_id: workspaceId, ...g, fetched_at: syncedAt })),
        { onConflict: "workspace_id,group_jid" }
      );
      if (dbError) {
        console.error("Erro ao gravar grupos sincronizados:", dbError);
        return { success: false as const, error: "Grupos buscados, mas falha ao salvar o histórico." };
      }
    }

    return { success: true as const, groups, syncedAt };
  } catch (err) {
    console.error("Erro ao sincronizar grupos WhatsApp:", err);
    return {
      success: false as const,
      error: err instanceof Error ? err.message : "Erro de rede ao contatar a Evolution.",
    };
  }
}

export async function listMetaAdAccounts(bmToken: string, workspaceId?: string) {
  const result = await fetchMetaAdAccounts(bmToken);
  if (!result.success) {
    return { success: false as const, error: result.error };
  }

  if (!workspaceId) {
    workspaceId = await getOrCreateWorkspaceId();
  }

  const { data: existingAccounts } = await supabase
    .from("gestao_leads_meta_ad_accounts")
    .select("ad_account_id")
    .eq("workspace_id", workspaceId);

  const selectedIds = new Set((existingAccounts || []).map((a) => a.ad_account_id));

  return {
    success: true as const,
    adAccounts: result.adAccounts.map((account) => ({
      ...account,
      isSelected: selectedIds.has(account.id),
    })),
  };
}

export async function saveMetaAdAccounts(data: {
  workspaceId?: string;
  bmToken: string;
  selectedAccountIds: string[];
}) {
  try {
    const workspaceId = data.workspaceId || (await getOrCreateWorkspaceId());
    const tokenHash = crypto.createHash("sha256").update(data.bmToken).digest("hex");

    const { data: allAccounts } = await supabase
      .from("gestao_leads_meta_ad_accounts")
      .select("ad_account_id")
      .eq("workspace_id", workspaceId)
      .eq("bm_token_hash", tokenHash);

    const existingIds = new Set((allAccounts || []).map((a) => a.ad_account_id));
    const newIds = new Set(data.selectedAccountIds);

    const toDelete = Array.from(existingIds).filter((id) => !newIds.has(id));
    const toAdd = Array.from(newIds).filter((id) => !existingIds.has(id));

    if (toDelete.length > 0) {
      await supabase
        .from("gestao_leads_meta_ad_accounts")
        .delete()
        .eq("workspace_id", workspaceId)
        .in("ad_account_id", toDelete);
    }

    if (toAdd.length > 0) {
      const result = await fetchMetaAdAccounts(data.bmToken);
      if (!result.success) {
        return { success: false as const, error: result.error };
      }

      const accountMap = new Map(result.adAccounts.map((a) => [a.id, a]));
      const rowsToInsert = toAdd.map((accountId) => ({
        workspace_id: workspaceId,
        ad_account_id: accountId,
        ad_account_name: accountMap.get(accountId)?.name || accountId,
        bm_token_hash: tokenHash,
      }));

      const { error } = await supabase
        .from("gestao_leads_meta_ad_accounts")
        .insert(rowsToInsert);

      if (error) {
        return { success: false as const, error: error.message };
      }
    }

    return { success: true as const };
  } catch (err) {
    return { success: false as const, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Busca planilhas que a Service Account enxerga (só as compartilhadas com ela).
 * Credenciais chegam do JSON recém-colado no modal — nada aqui foi salvo ainda.
 */
export async function searchGoogleSpreadsheets(data: { clientEmail: string; privateKey: string; search?: string }) {
  return listAccessibleSpreadsheets(data.clientEmail, data.privateKey, data.search);
}

/** Abas de uma planilha já escolhida — usada para seleção por clique em vez de digitação. */
export async function listGoogleSheetTabs(data: { clientEmail: string; privateKey: string; spreadsheetId: string }) {
  return listSheetTabs(data.clientEmail, data.privateKey, data.spreadsheetId);
}
