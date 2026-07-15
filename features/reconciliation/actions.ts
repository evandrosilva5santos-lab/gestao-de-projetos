"use server";

// ---------------------------------------------------------------------------
// Feature: Reconciliation (Conferência) — ESTRITAMENTE READ-ONLY.
//
// Varre os leads de um workspace e, para cada um, confere onde ele está:
//   - no nosso banco (gestao_leads)
//   - no Kommo (contato com telefone casando + se tem NEGÓCIO PRÓPRIO)
//   - na aba "CRM" da planilha do cliente (Google Sheets)
// Objetivo: achar quem está na planilha/banco mas FALTA (como negócio) no Kommo.
//
// NUNCA escreve em lugar nenhum: não dispara WhatsApp, não cria/edita Kommo,
// não escreve na planilha, não grava em tabela. Só GET/SELECT.
//
// Regra de Ouro #7: não importa de outra feature. Helpers (normalizePhone,
// auth do Google, chamada ao Kommo) são cópias mínimas e independentes.
// ---------------------------------------------------------------------------

import { supabaseAdmin } from "@/lib/supabase/client";
import { google } from "googleapis";
import { JWT } from "google-auth-library";

export type WorkspaceOption = { id: string; name: string; slug: string | null };

export type InKommo = "yes" | "no" | "error";

export type ReconLead = {
  name: string;
  phone: string;
  email: string;
  inDb: boolean;
  inKommo: InKommo;
  /** true = é contato PRINCIPAL de algum negócio; false = só contato (ex.: grudado no deal de outro); null = não avaliado. */
  kommoOwnDeal: boolean | null;
  inSheetCRM: boolean;
  createdAt: string | null;
};

export type ReconResult =
  | {
      success: true;
      workspaceName: string;
      leads: ReconLead[];
      summary: {
        total: number;
        faltando_no_kommo: number; // sem contato OU sem negócio próprio
        faltando_na_planilha: number;
        so_contato_sem_negocio: number; // caso "Elizane": contato existe mas sem deal próprio
        kommo_error: boolean;
        sheet_error: boolean;
      };
    }
  | { success: false; error: string };

// ---------------------------------------------------------------------------
// Telefone BR: normaliza para uma CHAVE canônica de casamento.
// Trata DDI 55 e o 9º dígito, e usa os últimos 8 dígitos (número local) como
// chave — tolerante a variações de DDD/DDI e presença/ausência do 9.
// ---------------------------------------------------------------------------
function normalizePhone(raw: string | null | undefined): string {
  let d = (raw ?? "").replace(/\D/g, "");
  if (!d) return "";
  // remove DDI 55 quando o número claramente o tem (12/13 dígitos com 55 na frente)
  if (d.length >= 12 && d.startsWith("55")) d = d.slice(2);
  // chave = últimos 8 dígitos (número local, sem DDD e sem o 9º dígito)
  return d.slice(-8);
}

function digitsOnly(raw: string | null | undefined): string {
  return (raw ?? "").replace(/\D/g, "");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Lista os workspaces (para o seletor de cliente na UI).
// ---------------------------------------------------------------------------
export async function listWorkspaces(): Promise<{ success: boolean; workspaces?: WorkspaceOption[]; error?: string }> {
  const { data, error } = await supabaseAdmin
    .from("core_workspaces")
    .select("id, name, slug")
    .order("name");
  if (error) return { success: false, error: error.message };
  return { success: true, workspaces: (data || []) as WorkspaceOption[] };
}

// ---------------------------------------------------------------------------
// Kommo (read-only): busca contato por telefone e devolve se casa + se é
// contato principal (is_main) de algum negócio próprio.
// ---------------------------------------------------------------------------
type KommoContact = {
  id: number;
  name?: string;
  custom_fields_values?: { field_code?: string; field_name?: string; values?: { value?: string }[] }[];
  _embedded?: { leads?: { id: number }[] };
};

function contactPhones(c: KommoContact): string[] {
  const out: string[] = [];
  for (const f of c.custom_fields_values || []) {
    const isPhone = f.field_code === "PHONE" || (f.field_name || "").toLowerCase().includes("phone") || (f.field_name || "").toLowerCase().includes("telefone");
    if (!isPhone) continue;
    for (const v of f.values || []) if (v.value) out.push(v.value);
  }
  return out;
}

async function kommoLookup(
  baseUrl: string,
  headers: Record<string, string>,
  phoneKey: string,
  email: string,
  dealMainCache: Map<number, Set<number>>
): Promise<{ inKommo: InKommo; ownDeal: boolean | null }> {
  async function query(q: string): Promise<KommoContact[]> {
    const res = await fetch(`${baseUrl}/api/v4/contacts?query=${encodeURIComponent(q)}&with=leads`, { headers });
    if (res.status === 204) return [];
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { _embedded?: { contacts?: KommoContact[] } };
    return data?._embedded?.contacts || [];
  }

  let contacts: KommoContact[] = [];
  try {
    if (phoneKey) contacts = await query(phoneKey);
    if (contacts.length === 0 && email) {
      await sleep(220);
      contacts = await query(email);
    }
  } catch {
    return { inKommo: "error", ownDeal: null };
  }

  // Casa pelo telefone real do contato (evita falso positivo do primeiro resultado).
  let match: KommoContact | undefined;
  if (phoneKey) {
    match = contacts.find((c) => contactPhones(c).some((p) => normalizePhone(p) === phoneKey));
  }
  if (!match && email) {
    match = contacts.find((c) =>
      (c.custom_fields_values || []).some(
        (f) => (f.field_code === "EMAIL") && (f.values || []).some((v) => (v.value || "").trim().toLowerCase() === email.toLowerCase())
      )
    );
  }
  if (!match) return { inKommo: "no", ownDeal: null };

  // Negócio próprio = é is_main em algum deal vinculado.
  const dealIds = (match._embedded?.leads || []).map((l) => l.id);
  if (dealIds.length === 0) return { inKommo: "yes", ownDeal: false };

  let ownDeal = false;
  for (const dealId of dealIds.slice(0, 5)) {
    let mains = dealMainCache.get(dealId);
    if (!mains) {
      try {
        await sleep(200);
        const res = await fetch(`${baseUrl}/api/v4/leads/${dealId}?with=contacts`, { headers });
        if (!res.ok) continue;
        const d = (await res.json()) as { _embedded?: { contacts?: { id: number; is_main?: boolean }[] } };
        mains = new Set((d._embedded?.contacts || []).filter((c) => c.is_main).map((c) => c.id));
        dealMainCache.set(dealId, mains);
      } catch {
        continue;
      }
    }
    if (mains.has(match.id)) {
      ownDeal = true;
      break;
    }
  }
  return { inKommo: "yes", ownDeal };
}

// ---------------------------------------------------------------------------
// Planilha (read-only): lê a aba "CRM" e devolve o conjunto de chaves de
// telefone (e e-mails) presentes nela.
// ---------------------------------------------------------------------------
async function readSheetCRM(config: {
  clientEmail: string;
  privateKey: string;
  spreadsheetId: string;
}): Promise<{ phones: Set<string>; emails: Set<string> }> {
  const auth = new JWT({
    email: config.clientEmail,
    key: (config.privateKey || "").replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  const sheets = google.sheets({ version: "v4", auth: auth as unknown as InstanceType<typeof google.auth.OAuth2> });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: config.spreadsheetId,
    range: "CRM",
    valueRenderOption: "FORMATTED_VALUE",
  });
  const values = (res.data.values || []) as string[][];
  const headers = values[0] || [];
  const idxPhone = headers.findIndex((h) => /telefone|phone|whats/i.test(h || ""));
  const idxEmail = headers.findIndex((h) => /e-?mail/i.test(h || ""));

  const phones = new Set<string>();
  const emails = new Set<string>();
  for (const row of values.slice(1)) {
    if (idxPhone >= 0) {
      const key = normalizePhone(row[idxPhone]);
      if (key) phones.add(key);
    }
    if (idxEmail >= 0) {
      const e = (row[idxEmail] || "").trim().toLowerCase();
      if (e) emails.add(e);
    }
  }
  return { phones, emails };
}

// ---------------------------------------------------------------------------
// Ação principal.
// ---------------------------------------------------------------------------
export async function reconcileWorkspace(workspaceId: string): Promise<ReconResult> {
  if (!workspaceId) return { success: false, error: "Workspace não informado." };

  // Nome do workspace
  const { data: ws } = await supabaseAdmin
    .from("core_workspaces")
    .select("name")
    .eq("id", workspaceId)
    .maybeSingle();
  const workspaceName = ws?.name || "—";

  // 1. Leads do banco
  const { data: dbLeads, error: dbErr } = await supabaseAdmin
    .from("gestao_leads")
    .select("name, phone, email, created_at, status")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });
  if (dbErr) return { success: false, error: `Erro ao ler leads: ${dbErr.message}` };

  // 2. Destinos (credenciais)
  const { data: dests } = await supabaseAdmin
    .from("gestao_leads_destinations")
    .select("type, config")
    .eq("workspace_id", workspaceId);
  const kommoCfg = dests?.find((d) => d.type === "kommo")?.config as
    | { subdomain?: string; token?: string }
    | undefined;
  const sheetCfg = dests?.find((d) => d.type === "google_sheets")?.config as
    | { clientEmail?: string; privateKey?: string; spreadsheetId?: string }
    | undefined;

  // 3. Planilha CRM (read-only). Falha aqui não derruba o scan.
  let sheetPhones = new Set<string>();
  let sheetEmails = new Set<string>();
  let sheetError = false;
  if (sheetCfg?.clientEmail && sheetCfg?.privateKey && sheetCfg?.spreadsheetId) {
    try {
      const r = await readSheetCRM(sheetCfg as { clientEmail: string; privateKey: string; spreadsheetId: string });
      sheetPhones = r.phones;
      sheetEmails = r.emails;
    } catch {
      sheetError = true;
    }
  } else {
    sheetError = true;
  }

  // 4. Universo = banco ∪ planilha CRM (dedup por chave de telefone; fallback e-mail/nome).
  type Entry = { name: string; phone: string; email: string; inDb: boolean; inSheetCRM: boolean; createdAt: string | null; phoneKey: string };
  const universe = new Map<string, Entry>();
  const keyFor = (phone: string, email: string, name: string) =>
    normalizePhone(phone) || (email || "").trim().toLowerCase() || (name || "").trim().toLowerCase();

  for (const l of dbLeads || []) {
    const phoneKey = normalizePhone(l.phone);
    const k = keyFor(l.phone, l.email, l.name);
    if (!k) continue;
    universe.set(k, {
      name: l.name || "—",
      phone: l.phone || "",
      email: (l.email || "").trim(),
      inDb: true,
      inSheetCRM: false,
      createdAt: l.created_at || null,
      phoneKey,
    });
  }
  // marca quem está na planilha (e adiciona os que só existem lá)
  for (const key of sheetPhones) {
    const existing = [...universe.values()].find((e) => e.phoneKey === key);
    if (existing) existing.inSheetCRM = true;
  }

  // 5. Consulta Kommo (read-only) por lead do universo.
  const kommoOk = !!(kommoCfg?.subdomain && kommoCfg?.token);
  let kommoError = false;
  const baseUrl = kommoOk ? `https://${kommoCfg!.subdomain!.toLowerCase().trim()}.kommo.com` : "";
  const headers = { Authorization: `Bearer ${kommoCfg?.token}`, "Content-Type": "application/json" };
  const dealMainCache = new Map<number, Set<number>>();

  const leads: ReconLead[] = [];
  for (const e of universe.values()) {
    let inKommo: InKommo = "error";
    let ownDeal: boolean | null = null;
    if (kommoOk) {
      const r = await kommoLookup(baseUrl, headers, e.phoneKey, e.email, dealMainCache);
      inKommo = r.inKommo;
      ownDeal = r.ownDeal;
      if (inKommo === "error") kommoError = true;
      await sleep(160);
    }
    // inSheetCRM: também confere e-mail
    const inSheetCRM = e.inSheetCRM || (!!e.email && sheetEmails.has(e.email.toLowerCase()));
    leads.push({
      name: e.name,
      phone: e.phone,
      email: e.email,
      inDb: e.inDb,
      inKommo,
      kommoOwnDeal: ownDeal,
      inSheetCRM,
      createdAt: e.createdAt,
    });
  }

  // 6. Resumo
  const faltando_no_kommo = leads.filter((l) => l.inKommo === "no" || (l.inKommo === "yes" && l.kommoOwnDeal === false)).length;
  const so_contato_sem_negocio = leads.filter((l) => l.inKommo === "yes" && l.kommoOwnDeal === false).length;
  const faltando_na_planilha = leads.filter((l) => !l.inSheetCRM).length;

  return {
    success: true,
    workspaceName,
    leads,
    summary: {
      total: leads.length,
      faltando_no_kommo,
      faltando_na_planilha,
      so_contato_sem_negocio,
      kommo_error: kommoError,
      sheet_error: sheetError,
    },
  };
}
