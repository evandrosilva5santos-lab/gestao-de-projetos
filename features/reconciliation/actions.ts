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

/** completo = está no Kommo (negócio próprio) + na CRM + msg no grupo. parado = furou
 * em algum. erro = nosso motor tentou e falhou (status error no banco). */
export type ReconStatus = "completo" | "parado" | "erro";

export type ReconLead = {
  leadgenId: string | null;
  name: string;
  phone: string;
  email: string;
  createdAt: string | null;
  status: ReconStatus;
  inBancoDados: boolean; // veio da aba mestre do Facebook
  inDb: boolean;
  inSheetCRM: boolean;
  inKommo: InKommo;
  /** true = é contato PRINCIPAL de algum negócio; false = só contato; null = não avaliado. */
  kommoOwnDeal: boolean | null;
  whatsSentByEngine: boolean; // nossos audit logs confirmam o envio da mensagem
  // Marcações manuais do cliente na aba "Banco de Dados":
  markedSheet: boolean; // coluna "Atualizar"
  markedWhats: boolean; // coluna "Mandou mensagem no Whats"
  markedKommo: boolean; // coluna "FOI PRO KOMMO?"
  /** Onde a planilha do cliente diz "ok" mas a verdade real diverge. */
  divergences: string[];
};

export type ReconResult =
  | {
      success: true;
      workspaceName: string;
      leads: ReconLead[];
      summary: {
        total: number;
        completos: number;
        parados: number;
        erros: number;
        faltando_no_kommo: number; // sem contato OU sem negócio próprio
        faltando_na_planilha: number;
        so_contato_sem_negocio: number;
        divergencias: number; // planilha marca ok mas a verdade diz não
        kommo_error: boolean;
        sheet_error: boolean;
        banco_dados_error: boolean;
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
// Planilha (read-only): lê a aba "Banco de Dados" — onde o Facebook despeja os
// leads NATIVAMENTE. É a lista-mestre de tudo que o formulário capturou.
// Casa colunas por nome de cabeçalho (robusto à posição): ID (=leadgen_id),
// nome_completo, telefone, email, e as 3 de controle do cliente.
// ---------------------------------------------------------------------------
type BancoRow = {
  leadgenId: string;
  name: string;
  phone: string;
  email: string;
  markedSheet: boolean; // "Atualizar"
  markedWhats: boolean; // "Mandou mensagem no Whats"
  markedKommo: boolean; // "FOI PRO KOMMO?"
};

const isOk = (v: string | undefined) => {
  const s = (v || "").trim().toLowerCase();
  return s === "ok" || s === "sim" || s === "x" || s === "✓" || s === "true";
};

async function readSheetBancoDados(config: {
  clientEmail: string;
  privateKey: string;
  spreadsheetId: string;
}): Promise<BancoRow[]> {
  const auth = new JWT({
    email: config.clientEmail,
    key: (config.privateKey || "").replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  const sheets = google.sheets({ version: "v4", auth: auth as unknown as InstanceType<typeof google.auth.OAuth2> });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: config.spreadsheetId,
    range: "Banco de Dados",
    valueRenderOption: "FORMATTED_VALUE",
  });
  const values = (res.data.values || []) as string[][];
  const headers = (values[0] || []).map((h) => (h || "").trim());

  const find = (re: RegExp) => headers.findIndex((h) => re.test(h));
  const idId = find(/^id$/i);
  const idName = find(/nome/i);
  const idPhone = find(/telefone|phone|whats/i);
  const idEmail = find(/e-?mail/i);
  const idSheet = find(/atualiza/i);
  const idWhats = find(/mensagem|whats/i);
  const idKommo = find(/kommo/i);

  const rows: BancoRow[] = [];
  for (const row of values.slice(1)) {
    const phone = idPhone >= 0 ? row[idPhone] || "" : "";
    const email = idEmail >= 0 ? row[idEmail] || "" : "";
    const name = idName >= 0 ? row[idName] || "" : "";
    if (!phone && !email && !name) continue; // linha vazia
    rows.push({
      leadgenId: idId >= 0 ? (row[idId] || "").trim() : "",
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      markedSheet: idSheet >= 0 ? isOk(row[idSheet]) : false,
      markedWhats: idWhats >= 0 ? isOk(row[idWhats]) : false,
      markedKommo: idKommo >= 0 ? isOk(row[idKommo]) : false,
    });
  }
  return rows;
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

  // 3. Planilha: aba "CRM" (destino formatado) + aba "Banco de Dados" (despejo nativo
  //    do Facebook = lista-mestre). Falha em qualquer uma não derruba o scan.
  const sheetFull =
    sheetCfg?.clientEmail && sheetCfg?.privateKey && sheetCfg?.spreadsheetId
      ? (sheetCfg as { clientEmail: string; privateKey: string; spreadsheetId: string })
      : null;

  let sheetPhones = new Set<string>();
  let sheetEmails = new Set<string>();
  let sheetError = false;
  let bancoRows: BancoRow[] = [];
  let bancoError = false;
  if (sheetFull) {
    try {
      const r = await readSheetCRM(sheetFull);
      sheetPhones = r.phones;
      sheetEmails = r.emails;
    } catch {
      sheetError = true;
    }
    try {
      bancoRows = await readSheetBancoDados(sheetFull);
    } catch {
      bancoError = true;
    }
  } else {
    sheetError = true;
    bancoError = true;
  }

  // Bound de tempo: Kommo é consultado lead a lead (com sleeps). Foca nos mais
  // recentes (fim da aba = mais novo) pra caber no limite do serverless.
  const RECENT_LIMIT = 120;
  bancoRows = bancoRows.slice(-RECENT_LIMIT).reverse();

  // 4. WhatsApp: audit logs que confirmam o envio (só p/ leads que passaram pelo motor).
  const whatsSentPhones = new Set<string>();
  {
    const { data: logs } = await supabaseAdmin
      .from("gestao_leads_audit_logs")
      .select("details")
      .eq("workspace_id", workspaceId);
    for (const log of logs || []) {
      const d = (log.details || {}) as { whatsapp_delivered?: boolean; treated_data?: { phone?: string } };
      if (d.whatsapp_delivered) {
        const p = normalizePhone(d.treated_data?.phone);
        if (p) whatsSentPhones.add(p);
      }
    }
  }

  // 5. Universo: "Banco de Dados" (mestre) ∪ banco. Dedup por telefone (fallback e-mail/nome).
  type Entry = {
    leadgenId: string | null; name: string; phone: string; email: string; phoneKey: string;
    createdAt: string | null; inBancoDados: boolean; inDb: boolean; inSheetCRM: boolean; dbStatus: string | null;
    markedSheet: boolean; markedWhats: boolean; markedKommo: boolean;
  };
  const universe = new Map<string, Entry>();
  const keyFor = (phone: string, email: string, name: string) =>
    normalizePhone(phone) || (email || "").trim().toLowerCase() || (name || "").trim().toLowerCase();

  for (const b of bancoRows) {
    const k = keyFor(b.phone, b.email, b.name);
    if (!k) continue;
    universe.set(k, {
      leadgenId: b.leadgenId || null,
      name: b.name || "—",
      phone: b.phone,
      email: b.email,
      phoneKey: normalizePhone(b.phone),
      createdAt: null,
      inBancoDados: true,
      inDb: false,
      inSheetCRM: false,
      dbStatus: null,
      markedSheet: b.markedSheet,
      markedWhats: b.markedWhats,
      markedKommo: b.markedKommo,
    });
  }
  for (const l of dbLeads || []) {
    const k = keyFor(l.phone, l.email, l.name);
    if (!k) continue;
    const existing = universe.get(k);
    if (existing) {
      existing.inDb = true;
      existing.dbStatus = l.status || null;
      existing.createdAt = existing.createdAt || l.created_at || null;
    } else {
      universe.set(k, {
        leadgenId: null,
        name: l.name || "—",
        phone: l.phone || "",
        email: (l.email || "").trim(),
        phoneKey: normalizePhone(l.phone),
        createdAt: l.created_at || null,
        inBancoDados: false,
        inDb: true,
        inSheetCRM: false,
        dbStatus: l.status || null,
        markedSheet: false,
        markedWhats: false,
        markedKommo: false,
      });
    }
  }
  // Marca quem está na aba CRM (por telefone OU e-mail).
  for (const e of universe.values()) {
    if ((e.phoneKey && sheetPhones.has(e.phoneKey)) || (e.email && sheetEmails.has(e.email.toLowerCase()))) {
      e.inSheetCRM = true;
    }
  }

  // 6. Kommo (ao vivo) + classificação por lead.
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

    const whatsSentByEngine = !!e.phoneKey && whatsSentPhones.has(e.phoneKey);
    const kommoRealOk = inKommo === "yes" && ownDeal === true;
    const whatsOk = whatsSentByEngine || e.markedWhats;

    // Divergência = a planilha do cliente marca "ok" mas a verdade real diz não.
    const divergences: string[] = [];
    if (e.markedKommo && inKommo !== "error" && !kommoRealOk) {
      divergences.push(
        inKommo === "no"
          ? "Planilha diz Kommo OK, mas não achei no Kommo"
          : "Planilha diz Kommo OK, mas é só contato (sem negócio próprio)"
      );
    }
    if (e.markedSheet && !e.inSheetCRM) {
      divergences.push("Planilha diz Atualizado, mas não está na aba CRM");
    }

    let status: ReconStatus;
    if (e.dbStatus === "error") status = "erro";
    else if (kommoRealOk && e.inSheetCRM && whatsOk) status = "completo";
    else status = "parado";

    leads.push({
      leadgenId: e.leadgenId,
      name: e.name,
      phone: e.phone,
      email: e.email,
      createdAt: e.createdAt,
      status,
      inBancoDados: e.inBancoDados,
      inDb: e.inDb,
      inSheetCRM: e.inSheetCRM,
      inKommo,
      kommoOwnDeal: ownDeal,
      whatsSentByEngine,
      markedSheet: e.markedSheet,
      markedWhats: e.markedWhats,
      markedKommo: e.markedKommo,
      divergences,
    });
  }

  const faltando_no_kommo = leads.filter((l) => l.inKommo === "no" || (l.inKommo === "yes" && l.kommoOwnDeal === false)).length;
  const so_contato_sem_negocio = leads.filter((l) => l.inKommo === "yes" && l.kommoOwnDeal === false).length;
  const faltando_na_planilha = leads.filter((l) => !l.inSheetCRM).length;

  return {
    success: true,
    workspaceName,
    leads,
    summary: {
      total: leads.length,
      completos: leads.filter((l) => l.status === "completo").length,
      parados: leads.filter((l) => l.status === "parado").length,
      erros: leads.filter((l) => l.status === "erro").length,
      faltando_no_kommo,
      faltando_na_planilha,
      so_contato_sem_negocio,
      divergencias: leads.filter((l) => l.divergences.length > 0).length,
      kommo_error: kommoError,
      sheet_error: sheetError,
      banco_dados_error: bancoError,
    },
  };
}
