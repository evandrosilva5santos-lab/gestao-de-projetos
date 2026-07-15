"use server";

// ---------------------------------------------------------------------------
// Kommo Provisioning — FASE 1: Analisador de Schema (ESTRITAMENTE READ-ONLY).
//
// Dado um workspace, cruza os campos que CHEGAM (raw_data dos leads = formulário
// da Meta) com os campos que o KOMMO já tem, via SchemaRegistry (casamento
// semântico). Produz o "diff": o que já está coberto e o que faltaria criar.
//
// NÃO cria, edita ou apaga nada — nem no Kommo, nem no banco. Só GET/SELECT.
// A criação (Fase 2) só acontece depois, com confirmação humana.
//
// Regra de Ouro #7: não importa de outra feature. Helpers são locais.
// ---------------------------------------------------------------------------

import { supabaseAdmin } from "@/lib/supabase/client";
import { CONCEPTS, IGNORED_KEYS, matchConcept, type Concept, type ConceptCategory } from "./schema-registry";

export type WorkspaceOption = { id: string; name: string; slug: string | null };

export type FieldDiff = {
  concept: string;
  label: string;
  category: ConceptCategory;
  /** Rótulos vindos da Meta que caíram neste conceito (evidência). */
  metaLabels: string[];
  status: "coberto" | "faltando" | "critico";
  /** Nome do campo no Kommo que cobre este conceito, se houver. */
  kommoField: string | null;
  native: boolean;
};

export type AnalyzeResult =
  | {
      success: true;
      workspaceName: string;
      kommoConnected: boolean;
      leadsAnalisados: number;
      fields: FieldDiff[];
      summary: { total: number; cobertos: number; faltando: number; criticos: number };
      kommoError: boolean;
    }
  | { success: false; error: string };

export async function listWorkspaces(): Promise<{ success: boolean; workspaces?: WorkspaceOption[]; error?: string }> {
  const { data, error } = await supabaseAdmin.from("core_workspaces").select("id, name, slug").order("name");
  if (error) return { success: false, error: error.message };
  return { success: true, workspaces: (data || []) as WorkspaceOption[] };
}

type KommoCustomField = { id: number; name?: string; type?: string };

async function fetchKommoLeadFields(subdomain: string, token: string): Promise<{ ok: boolean; fields: KommoCustomField[] }> {
  const baseUrl = `https://${subdomain.toLowerCase().trim()}.kommo.com`;
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  try {
    const res = await fetch(`${baseUrl}/api/v4/leads/custom_fields?limit=250`, { headers });
    if (!res.ok) return { ok: false, fields: [] };
    const data = (await res.json()) as { _embedded?: { custom_fields?: KommoCustomField[] } };
    return { ok: true, fields: data?._embedded?.custom_fields || [] };
  } catch {
    return { ok: false, fields: [] };
  }
}

export async function analyzeWorkspaceSchema(workspaceId: string): Promise<AnalyzeResult> {
  if (!workspaceId) return { success: false, error: "Workspace não informado." };

  const { data: ws } = await supabaseAdmin.from("core_workspaces").select("name").eq("id", workspaceId).maybeSingle();
  const workspaceName = ws?.name || "—";

  // 1. Schema de ENTRADA: une as chaves do raw_data dos leads (formulário da Meta).
  const { data: leads, error: leadsErr } = await supabaseAdmin
    .from("gestao_leads")
    .select("raw_data, leadgen_id")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (leadsErr) return { success: false, error: `Erro ao ler leads: ${leadsErr.message}` };

  // conceito -> rótulos da Meta que o evidenciam
  const conceptToMetaLabels = new Map<string, Set<string>>();
  const addLabel = (concept: Concept, label: string) => {
    if (!conceptToMetaLabels.has(concept.key)) conceptToMetaLabels.set(concept.key, new Set());
    conceptToMetaLabels.get(concept.key)!.add(label);
  };

  let anyLeadgen = false;
  for (const l of leads || []) {
    if (l.leadgen_id) anyLeadgen = true;
    const rd = (l.raw_data || {}) as Record<string, unknown>;
    for (const rawKey of Object.keys(rd)) {
      if (IGNORED_KEYS.has(rawKey)) continue;
      const concept = matchConcept(rawKey);
      if (concept) addLabel(concept, rawKey);
    }
  }
  // leadgen_id é coluna dedicada — se algum lead tem, o conceito está presente.
  if (anyLeadgen) {
    const lg = CONCEPTS.find((c) => c.key === "leadgenId")!;
    addLabel(lg, "leadgen_id");
  }

  // 2. Schema do KOMMO (read-only). Mapeia cada custom field a um conceito.
  const { data: dests } = await supabaseAdmin
    .from("gestao_leads_destinations")
    .select("type, config")
    .eq("workspace_id", workspaceId);
  const kommoCfg = dests?.find((d) => d.type === "kommo")?.config as { subdomain?: string; token?: string } | undefined;
  const kommoConnected = !!(kommoCfg?.subdomain && kommoCfg?.token);

  const conceptToKommoField = new Map<string, string>();
  let kommoError = false;
  if (kommoConnected) {
    const { ok, fields } = await fetchKommoLeadFields(kommoCfg!.subdomain!, kommoCfg!.token!);
    if (!ok) kommoError = true;
    for (const f of fields) {
      const concept = matchConcept(f.name || "");
      if (concept && !conceptToKommoField.has(concept.key)) conceptToKommoField.set(concept.key, f.name || "");
    }
  }

  // 3. Diff: para cada conceito presente na ENTRADA, ver se o Kommo cobre.
  const fields: FieldDiff[] = [];
  for (const concept of CONCEPTS) {
    const metaLabels = conceptToMetaLabels.get(concept.key);
    if (!metaLabels || metaLabels.size === 0) continue; // não chega pela entrada → fora do escopo

    const covered = concept.native || conceptToKommoField.has(concept.key);
    const status: FieldDiff["status"] = covered ? "coberto" : concept.critical ? "critico" : "faltando";

    fields.push({
      concept: concept.key,
      label: concept.label,
      category: concept.category,
      metaLabels: [...metaLabels],
      status,
      kommoField: concept.native ? "(nativo)" : conceptToKommoField.get(concept.key) || null,
      native: !!concept.native,
    });
  }

  const summary = {
    total: fields.length,
    cobertos: fields.filter((f) => f.status === "coberto").length,
    faltando: fields.filter((f) => f.status === "faltando").length,
    criticos: fields.filter((f) => f.status === "critico").length,
  };

  return {
    success: true,
    workspaceName,
    kommoConnected,
    leadsAnalisados: (leads || []).length,
    fields,
    summary,
    kommoError,
  };
}
