import { NextResponse } from "next/server";
import { inngest } from "@/lib/inngest/client";
import { supabaseAdmin } from "@/lib/supabase/client";
import { z } from "zod";

// Schema flexível para receber webhooks externos (Landing Pages, Elementor, etc.)
const WebhookSchema = z.object({
  workspaceId: z.string().uuid().optional(),
  source: z.string().optional(),
}).passthrough();

// GET: Desafio de Verificação da Meta (Requisito obrigatório para conectar o Webhook da Meta)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    // Token configurado no aplicativo do Facebook (deve bater com a env var ou valor fixo)
    const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || "agency_os_leads_token";

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("Webhook Meta verificado com sucesso!");
      return new Response(challenge, { status: 200 });
    }

    console.warn("Falha na tentativa de verificação do Webhook Meta.");
    return new Response("Forbidden", { status: 403 });
  } catch (error) {
    console.error("Erro na verificação do Webhook:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

// POST: Recebimento do Lead (Meta ou API externa)
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. Verificar se é um webhook de Leadgen da Meta (Facebook Ads)
    const isMetaWebhook = body.object === "page" && body.entry && body.entry.length > 0;

    if (isMetaWebhook) {
      const entry = body.entry[0];
      const pageId = String(entry.id);
      const changes = entry.changes?.[0]?.value;

      if (!changes || !changes.leadgen_id) {
        return NextResponse.json({ success: true, message: "Evento Meta recebido, mas não contém leads." });
      }

      const { leadgen_id, form_id, ad_id, adgroup_id, campaign_id } = changes;

      // Busca no banco qual workspace (cliente) é dono desta página do Facebook
      const { data: connection, error } = await supabaseAdmin
        .from("gestao_leads_meta_connections")
        .select("id, workspace_id")
        .eq("page_id", pageId)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Erro ao buscar conexão Meta no banco:", error);
        return NextResponse.json({ error: "Erro ao buscar pareamento" }, { status: 500 });
      }

      if (!connection) {
        console.warn(`Página Meta ID ${pageId} recebeu leadgen_id ${leadgen_id}, mas não está ativa/mapeada a nenhum cliente.`);
        return NextResponse.json({ error: "Página não autorizada ou não pareada no sistema." }, { status: 404 });
      }

      // Envia para o Inngest para processar em segundo plano sem travar a resposta pro Facebook
      await inngest.send({
        name: "lead/received",
        data: {
          workspaceId: connection.workspace_id,
          source: "Meta Ads",
          rawPayload: {
            page_id: pageId,
            leadgen_id: String(leadgen_id),
            form_id: form_id ? String(form_id) : undefined,
            ad_id: ad_id ? String(ad_id) : undefined,
            adgroup_id: adgroup_id ? String(adgroup_id) : undefined,
            campaign_id: campaign_id ? String(campaign_id) : undefined,
            ...changes
          },
        },
      });

      return NextResponse.json({ success: true, message: "Lead Meta recebido e enfileirado." }, { status: 202 });
    }

    // 2. Webhook clássico (customizado de Landing Pages, etc.)
    const parseResult = WebhookSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Payload inválido", details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const { workspaceId, source, ...rawPayload } = parseResult.data;

    if (!workspaceId) {
      return NextResponse.json({ error: "Falta o parâmetro 'workspaceId'." }, { status: 400 });
    }

    await inngest.send({
      name: "lead/received",
      data: {
        workspaceId,
        source: source || "API Externa",
        rawPayload,
      },
    });

    return NextResponse.json({ success: true, message: "Lead recebido e na fila de processamento." }, { status: 202 });

  } catch (error) {
    console.error("Erro no Webhook de Leads:", error);
    return NextResponse.json(
      { error: "Erro interno ao processar webhook." },
      { status: 500 }
    );
  }
}
