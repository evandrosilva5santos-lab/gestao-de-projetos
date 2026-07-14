"use server";

import { supabaseAdmin as supabase } from "@/lib/supabase/client";
import { fetchMetaPages, fetchMetaForms } from "@/lib/leads/providers/meta";

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

export async function listMetaForms(pageId: string, pageAccessToken: string) {
  return fetchMetaForms(pageId, pageAccessToken);
}

export async function saveMetaConnection(data: {
  pageId: string;
  pageName: string;
  accessToken: string;
  workspaceId?: string;
  newWorkspaceName?: string;
}) {
  try {
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
          page_id: data.pageId,
          page_name: data.pageName,
          access_token: data.accessToken,
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

    return { success: true as const, workspaceId, connectionId: connection.id };
  } catch (err) {
    return { success: false as const, error: err instanceof Error ? err.message : String(err) };
  }
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
  // Try to find the default workspace
  const { data: workspaces, error: wsError } = await supabase
    .from("core_workspaces")
    .select("id")
    .limit(1);

  if (wsError || !workspaces || workspaces.length === 0) {
    return { success: false, error: "No workspace found" };
  }

  const workspaceId = workspaces[0].id;

  const { data: destinations, error } = await supabase
    .from("gestao_leads_destinations")
    .select("*")
    .eq("workspace_id", workspaceId);

  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true, destinations };
}

/** Destinos (Kommo/Sheets/Evolution) de UM cliente específico. */
export async function getDestinationsForWorkspace(workspaceId: string) {
  const { data: destinations, error } = await supabase
    .from("gestao_leads_destinations")
    .select("*")
    .eq("workspace_id", workspaceId);

  if (error) {
    return { success: false as const, error: error.message };
  }

  return { success: true as const, destinations: destinations || [] };
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
