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
