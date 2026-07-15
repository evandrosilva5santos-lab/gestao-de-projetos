"use server";

import { supabaseAdmin as supabase } from "@/lib/supabase/client";
import { fetchMetaPages, fetchMetaForms, fetchMetaAdAccounts } from "@/lib/leads/providers/meta";
import type { MetaPage } from "@/lib/leads/providers/meta";
import { listAccessibleSpreadsheets, listSheetTabs } from "@/lib/leads/integrations/sheets";
import { fetchKommoUsers } from "@/lib/leads/integrations/kommo";
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

export async function saveGoogleSheetsDestination(data: {
  clientEmail: string;
  privateKey: string;
  spreadsheetId: string;
  sheetName: string;
  fieldMapping?: Record<string, string>;
  workspaceId?: string;
}) {
  try {
    const workspaceId = data.workspaceId || (await getOrCreateWorkspaceId());

    const { error } = await supabase
      .from("gestao_leads_destinations")
      .upsert(
        {
          workspace_id: workspaceId,
          type: "google_sheets",
          config: {
            clientEmail: data.clientEmail,
            privateKey: data.privateKey,
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
