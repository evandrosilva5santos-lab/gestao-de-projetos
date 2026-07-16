const GRAPH_API_VERSION = "v21.0";

export interface MetaPage {
  id: string;
  name: string;
  access_token: string;
}

export interface MetaLeadForm {
  id: string;
  name: string;
  status: string;
}

export interface MetaAdAccount {
  id: string;
  name: string;
}

interface GraphErrorBody {
  error?: { message: string; code?: number; type?: string };
}

interface MetaAccountsResponse extends GraphErrorBody {
  data?: MetaPage[];
}

/**
 * Lista as páginas do Facebook administradas pelo token informado (Graph API).
 * Sem regra de negócio aqui — só tradução Graph API -> tipo canônico.
 */
export async function fetchMetaPages(
  userToken: string
): Promise<{ success: true; pages: MetaPage[] } | { success: false; error: string }> {
  const token = userToken.trim();
  if (!token) {
    return { success: false, error: "Informe um Access Token." };
  }

  try {
    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/me/accounts?fields=id,name,access_token&access_token=${encodeURIComponent(token)}`;
    const res = await fetch(url);
    const json = (await res.json()) as MetaAccountsResponse;

    if (!res.ok || json.error) {
      return { success: false, error: json.error?.message || `Graph API respondeu ${res.status}` };
    }

    return { success: true, pages: json.data || [] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Falha de rede ao contatar a Graph API." };
  }
}

/**
 * Lista os formulários de lead (Leadgen Forms) de uma página específica.
 */
export async function fetchMetaForms(
  pageId: string,
  pageAccessToken: string
): Promise<{ success: true; forms: MetaLeadForm[] } | { success: false; error: string }> {
  try {
    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${pageId}/leadgen_forms?fields=id,name,status&access_token=${encodeURIComponent(pageAccessToken)}`;
    const res = await fetch(url);
    const json = (await res.json()) as { data?: MetaLeadForm[] } & GraphErrorBody;

    if (!res.ok || json.error) {
      return { success: false, error: json.error?.message || `Graph API respondeu ${res.status}` };
    }

    return { success: true, forms: json.data || [] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Falha de rede ao contatar a Graph API." };
  }
}

interface MetaLeadFieldData {
  name: string;
  values: string[];
}

/**
 * Busca os dados reais preenchidos pelo usuário em um lead (nome, telefone, etc.).
 *
 * O webhook de leadgen da Meta manda só o `leadgen_id` — por design da Meta, os
 * valores dos campos NUNCA vêm no payload do webhook (é preciso buscar à parte,
 * autenticado com o access_token da página que é dona do formulário).
 * Endpoint: GET /v21.0/{leadgen_id}?fields=field_data
 */
export async function fetchMetaLeadDetails(
  leadgenId: string,
  pageAccessToken: string
): Promise<{ success: true; fields: Record<string, string> } | { success: false; error: string }> {
  try {
    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${leadgenId}?fields=field_data&access_token=${encodeURIComponent(pageAccessToken)}`;
    const res = await fetch(url);
    const json = (await res.json()) as { field_data?: MetaLeadFieldData[] } & GraphErrorBody;

    if (!res.ok || json.error) {
      return { success: false, error: json.error?.message || `Graph API respondeu ${res.status}` };
    }

    const fields: Record<string, string> = {};
    for (const item of json.field_data || []) {
      fields[item.name] = item.values?.[0] ?? "";
    }

    return { success: true, fields };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Falha de rede ao contatar a Graph API." };
  }
}

export interface MetaFormLead {
  id: string;
  createdTime: string;
  fields: Record<string, string>;
}

/**
 * Lista os leads reais que a Meta registrou para um formulário (fonte da verdade
 * pra auditoria — comparar contra o que o nosso sistema efetivamente recebeu).
 * Segue paginação (`paging.next`) até um teto de segurança, já que formulários
 * antigos podem ter milhares de leads acumulados.
 */
export async function fetchMetaFormLeads(
  formId: string,
  pageAccessToken: string
): Promise<{ success: true; leads: MetaFormLead[] } | { success: false; error: string }> {
  const MAX_PAGES = 10;
  const leads: MetaFormLead[] = [];
  let url: string | null =
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${formId}/leads?fields=id,created_time,field_data&limit=200&access_token=${encodeURIComponent(pageAccessToken)}`;

  try {
    for (let page = 0; url && page < MAX_PAGES; page++) {
      const res = await fetch(url);
      const json = (await res.json()) as {
        data?: Array<{ id: string; created_time: string; field_data?: MetaLeadFieldData[] }>;
        paging?: { next?: string };
      } & GraphErrorBody;

      if (!res.ok || json.error) {
        return { success: false, error: json.error?.message || `Graph API respondeu ${res.status}` };
      }

      for (const item of json.data || []) {
        const fields: Record<string, string> = {};
        for (const f of item.field_data || []) {
          fields[f.name] = f.values?.[0] ?? "";
        }
        leads.push({ id: item.id, createdTime: item.created_time, fields });
      }

      url = json.paging?.next || null;
    }

    return { success: true, leads };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Falha de rede ao contatar a Graph API." };
  }
}

/**
 * Lista as contas de anúncio (Ad Accounts) de um Business Manager.
 * Endpoint: GET /v21.0/{bm_id}/adaccount
 */
export async function fetchMetaAdAccounts(
  bmToken: string
): Promise<{ success: true; adAccounts: MetaAdAccount[] } | { success: false; error: string }> {
  const token = bmToken.trim();
  if (!token) {
    return { success: false, error: "Informe um Business Manager Token." };
  }

  try {
    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/me/adaccounts?fields=id,name&access_token=${encodeURIComponent(token)}`;
    const res = await fetch(url);
    const json = (await res.json()) as { data?: Array<{ id: string; name: string }> } & GraphErrorBody;

    if (!res.ok || json.error) {
      return { success: false, error: json.error?.message || `Graph API respondeu ${res.status}` };
    }

    const adAccounts: MetaAdAccount[] = (json.data || []).map((account) => ({
      id: account.id, // preserva "act_xxx" format
      name: account.name,
    }));

    return { success: true, adAccounts };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Falha de rede ao contatar a Graph API." };
  }
}
