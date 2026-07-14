import { google } from "googleapis";
import { JWT } from "google-auth-library";
import { LeadData } from "./kommo";

export interface SheetsConfig {
  clientEmail: string;
  privateKey: string;
  spreadsheetId: string;
  sheetName: string;
  /** Mapeia campo interno do lead -> texto exato do cabeçalho nesta planilha. */
  fieldMapping: Record<string, string>;
}

/** Vocabulário de campos que o motor sabe preencher. Cada cliente mapeia estes
 * campos para as colunas da própria planilha (nomes de coluna variam por cliente). */
export const SHEETS_LEAD_FIELDS: { key: string; label: string }[] = [
  { key: "sellerName", label: "Vendedor da vez" },
  { key: "name", label: "Nome completo" },
  { key: "email", label: "E-mail" },
  { key: "phone", label: "Telefone" },
  { key: "interest", label: "Interesse / Consórcio" },
  { key: "budget", label: "Total para investir" },
  { key: "monthly", label: "Parcela mensal" },
  { key: "salaryRange", label: "Renda mensal" },
  { key: "startTime", label: "Quando deseja iniciar" },
  { key: "utmCampaign", label: "Campanha (UTM)" },
  { key: "utmContent", label: "Anúncio (UTM)" },
  { key: "utmMedium", label: "Conjunto de anúncios (UTM)" },
  { key: "utmSourcePlatform", label: "Plataforma de origem" },
  { key: "date", label: "Data de entrada" },
  { key: "status", label: "Status/Etapa" },
];

function buildAuth(clientEmail: string, privateKey: string) {
  const formattedPrivateKey = privateKey.replace(/\\n/g, "\n");
  return new JWT({
    email: clientEmail,
    key: formattedPrivateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

function sheetsClient(clientEmail: string, privateKey: string) {
  const auth = buildAuth(clientEmail, privateKey);
  // googleapis tipa `auth` como OAuth2Client; JWT implementa a mesma interface em runtime,
  // mas as declarações têm uma propriedade privada divergente — incompatibilidade só de tipos.
  return google.sheets({ version: "v4", auth: auth as unknown as InstanceType<typeof google.auth.OAuth2> });
}

/**
 * Lê a linha de cabeçalho (primeira linha) de uma planilha/aba — usado pela UI
 * para descobrir as colunas reais e deixar o usuário mapear campo a campo.
 */
export async function fetchSheetHeaders(
  clientEmail: string,
  privateKey: string,
  spreadsheetId: string,
  sheetName: string
): Promise<{ success: true; headers: string[] } | { success: false; error: string }> {
  try {
    if (!clientEmail || !privateKey || !spreadsheetId || !sheetName) {
      return { success: false, error: "Preencha Service Account, ID da planilha e nome da aba." };
    }

    const sheets = sheetsClient(clientEmail, privateKey);
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A1:Z1`,
    });

    const headers = (res.data.values?.[0] || []).filter((h): h is string => typeof h === "string" && h.trim() !== "");
    if (headers.length === 0) {
      return { success: false, error: "A aba não tem cabeçalho na primeira linha (ou está vazia)." };
    }

    return { success: true, headers };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Falha ao ler a planilha." };
  }
}

/**
 * Adiciona um lead como uma linha em uma planilha do Google Sheets.
 * As colunas da planilha do cliente NÃO são hardcoded aqui — o mapeamento
 * campo-interno -> cabeçalho-real vem de `config.fieldMapping`, configurado
 * por cliente na UI (cada planilha pode ter uma estrutura de colunas diferente).
 */
export async function appendLeadToSheets(
  config: SheetsConfig,
  lead: LeadData,
  sellerName?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { clientEmail, privateKey, spreadsheetId, sheetName, fieldMapping } = config;
    if (!clientEmail || !privateKey || !spreadsheetId || !sheetName) {
      return { success: false, error: "Credenciais ou parâmetros do Google Sheets incompletos" };
    }
    if (!fieldMapping || Object.keys(fieldMapping).length === 0) {
      return { success: false, error: "Mapeamento de colunas não configurado para esta planilha." };
    }

    const sheets = sheetsClient(clientEmail, privateKey);

    // 1. Cabeçalho real da planilha (define a ordem/colunas exatas a preencher)
    const getRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A1:Z1`,
    });
    const headers = getRes.data.values?.[0] || [];
    if (headers.length === 0) {
      return { success: false, error: "A planilha não tem cabeçalho configurado — configure o mapeamento primeiro." };
    }

    // 2. Valores do lead por campo interno
    const nowStr = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
    const valuesByField: Record<string, string> = {
      sellerName: sellerName || "Não atribuído",
      name: lead.name || "",
      email: lead.email || "",
      phone: lead.phone || "",
      interest: lead.interest || "",
      budget: lead.budget || "",
      monthly: lead.monthly || "",
      salaryRange: lead.salaryRange || "",
      startTime: lead.startTime || "",
      utmCampaign: lead.utmCampaign || "",
      utmContent: lead.utmContent || "",
      utmMedium: lead.utmMedium || "",
      utmSourcePlatform: lead.utmSourcePlatform || "Meta Ads",
      date: nowStr,
      status: "Novo Lead",
    };

    // 3. Cabeçalho-real -> campo-interno (a partir do mapeamento salvo pelo cliente)
    const headerToField = new Map<string, string>();
    for (const [internalField, headerText] of Object.entries(fieldMapping)) {
      if (headerText) headerToField.set(headerText.toLowerCase().trim(), internalField);
    }

    // 4. Monta a linha na ORDEM das colunas reais da planilha
    const rowValues = headers.map((header) => {
      const internalField = headerToField.get(String(header).toLowerCase().trim());
      return internalField ? valuesByField[internalField] ?? "" : "";
    });

    // 5. Insere a nova linha
    const appendRes = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [rowValues],
      },
    });

    if (appendRes.status !== 200) {
      return { success: false, error: `Google Sheets API respondeu com status ${appendRes.status}` };
    }

    return { success: true };
  } catch (err) {
    console.error("Erro inesperado na integração do Google Sheets:", err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
