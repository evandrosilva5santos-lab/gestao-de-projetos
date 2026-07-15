import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/client";
import { getWorkspaceById } from "@/features/leads/actions";
import { z } from "zod";

/**
 * POST /api/whatsapp/sync-groups
 * Sincroniza a lista de grupos da Evolution API para um workspace.
 *
 * Body:
 *   workspace_id: string (UUID)
 *   integration_url: string (raiz da API Evolution, ex. https://evolution.exemplo.com)
 *   integration_token: string (apikey/bearer token da instância Evolution)
 *
 * Response 200:
 *   { ok: true, groups: [{ id, name, jid, isAdmin }], syncedAt }
 *
 * Response 400/404/500:
 *   { ok: false, error: string }
 */

const SyncGroupsSchema = z.object({
  workspace_id: z.string().uuid(),
  integration_url: z.string().min(1),
  integration_token: z.string().min(1),
});

type EvolutionGroup = { id?: string; jid?: string; name?: string; subject?: string; owner?: boolean; isAdmin?: boolean };
type NormalizedGroup = { id: string; name: string; jid: string; isAdmin: boolean };

// Bloqueia hosts reservados/internos (loopback, link-local, RFC1918) como alvo do fetch
// server-side — a Evolution real de um tenant é sempre um domínio público, então isso
// não quebra uso legítimo e evita SSRF via integration_url apontando pra rede interna
// do servidor (ex. metadata endpoint de cloud).
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

export async function POST(req: NextRequest) {
  try {
    const parseResult = SyncGroupsSchema.safeParse(await req.json());
    if (!parseResult.success) {
      return NextResponse.json(
        { ok: false, error: "Payload inválido: workspace_id, integration_url e integration_token são obrigatórios." },
        { status: 400 }
      );
    }
    const { workspace_id, integration_url, integration_token } = parseResult.data;

    let host: URL;
    try {
      host = new URL(integration_url);
    } catch {
      return NextResponse.json({ ok: false, error: "integration_url inválida." }, { status: 400 });
    }
    if (host.protocol !== "http:" && host.protocol !== "https:") {
      return NextResponse.json({ ok: false, error: "integration_url deve usar http ou https." }, { status: 400 });
    }
    if (isPrivateOrLoopbackHost(host.hostname)) {
      return NextResponse.json({ ok: false, error: "integration_url não pode apontar para um host interno/reservado." }, { status: 400 });
    }

    // Confirma que o workspace existe antes de sincronizar/gravar qualquer grupo nele.
    const workspaceResult = await getWorkspaceById(workspace_id);
    if (!workspaceResult.success) {
      return NextResponse.json({ ok: false, error: "Workspace não encontrado." }, { status: 404 });
    }

    const fetchUrl = `${host.origin}${host.pathname.replace(/\/+$/, "")}/groups`;

    // Mesma convenção de autenticação usada em lib/leads/integrations/evolution.ts —
    // a Evolution API espera o header "apikey", não "Authorization: Bearer".
    const response = await fetch(fetchUrl, {
      method: "GET",
      headers: {
        apikey: integration_token,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Evolution respondeu ${response.status} em sync-groups: ${errText}`);
      return NextResponse.json({ ok: false, error: `Erro na Evolution (status ${response.status}).` }, { status: response.status });
    }

    const json = await response.json();
    const rawGroups: EvolutionGroup[] = [json, json?.data, json?.groups].find(Array.isArray) ?? [];

    // "owner" na Evolution/Baileys costuma ser o JID de quem criou o grupo, não um
    // boolean — usar `!!g.owner` marcaria quase todo grupo como isAdmin. Só confiamos
    // em `isAdmin` quando a própria API já manda esse campo como boolean explícito.
    const groups: NormalizedGroup[] = [];
    for (const g of rawGroups) {
      const jid = g.jid || g.id || "";
      if (!jid) continue; // sem jid não dá pra identificar o grupo nem gravar (chave do upsert)
      groups.push({ id: g.id || jid, name: g.name || g.subject || "Grupo sem nome", jid, isAdmin: !!g.isAdmin });
    }

    const syncedAt = new Date().toISOString();

    if (groups.length > 0) {
      const recordsToUpsert = groups.map((g) => ({
        workspace_id,
        group_id: g.id,
        group_name: g.name,
        group_jid: g.jid,
        is_admin: g.isAdmin,
        fetched_at: syncedAt,
      }));

      const { error: dbError } = await supabaseAdmin
        .from("gestao_leads_whatsapp_groups")
        .upsert(recordsToUpsert, { onConflict: "workspace_id, group_jid" });

      if (dbError) {
        console.error("Erro ao gravar grupos sincronizados:", dbError);
        return NextResponse.json({ ok: false, error: "Falha ao salvar grupos no banco." }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true, groups, syncedAt });
  } catch (error) {
    console.error("Erro em sync-groups:", error);
    return NextResponse.json({ ok: false, error: "Erro interno ao sincronizar grupos." }, { status: 500 });
  }
}
