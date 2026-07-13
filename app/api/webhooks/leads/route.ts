import { NextResponse } from "next/server";
import { inngest } from "@/lib/inngest/client";
import { z } from "zod";

// Schema ultra flexível para receber webhooks.
// O único dado estritamente necessário é o workspaceId para saber de quem é o Lead.
// O source é opcional, mas ideal (ex: 'facebook_ads', 'landing_page').
const WebhookSchema = z.object({
  workspaceId: z.string().uuid("O workspaceId deve ser um UUID válido."),
  source: z.string().default("api"),
}).passthrough(); // Permite receber outros dados dinâmicos do facebook/landing page

export async function POST(request: Request) {
  try {
    // 1. Receber o corpo da requisição
    const body = await request.json();

    // 2. Validar estrutura básica
    const parseResult = WebhookSchema.safeParse(body);
    
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Payload inválido", details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const { workspaceId, source, ...rawPayload } = parseResult.data;

    // 3. Disparar o evento no Inngest (Background Job)
    // Isso fará o Next.js devolver status 200 pro Facebook IMEDIATAMENTE.
    // O processamento pesado de round-robin ocorrerá no servidor do Inngest.
    await inngest.send({
      name: "lead/received",
      data: {
        workspaceId,
        source,
        rawPayload,
      },
    });

    return NextResponse.json({ success: true, message: "Lead recebido e na fila de processamento." }, { status: 202 });

  } catch (error: any) {
    console.error("Erro no Webhook de Leads:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor ao processar webhook." },
      { status: 500 }
    );
  }
}
