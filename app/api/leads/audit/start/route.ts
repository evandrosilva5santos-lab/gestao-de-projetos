import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/client";
import { inngest } from "@/lib/inngest/client";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { workspaceId, connectionId, formId, formName } = body;

    if (!workspaceId || !connectionId || !formId || !formName) {
      return NextResponse.json(
        { error: "Campos obrigatórios: workspaceId, connectionId, formId, formName" },
        { status: 400 }
      );
    }

    // Cria o registro na tabela de auditoria
    const { data: audit, error } = await supabaseAdmin
      .from("gestao_leads_audits")
      .insert({
        workspace_id: workspaceId,
        connection_id: connectionId,
        form_id: formId,
        form_name: formName,
        status: "PENDING",
      })
      .select("id")
      .single();

    if (error || !audit) {
      console.error("Erro ao criar auditoria:", error);
      return NextResponse.json(
        { error: "Não foi possível criar o registro de auditoria." },
        { status: 500 }
      );
    }

    // Dispara o job no Inngest
    await inngest.send({
      name: "lead/audit.requested",
      data: {
        auditId: audit.id,
        workspaceId,
        connectionId,
        formId,
      },
    });

    return NextResponse.json({ success: true, auditId: audit.id });
  } catch (err) {
    console.error("Erro no start audit:", err);
    return NextResponse.json(
      { error: "Erro interno ao iniciar auditoria." },
      { status: 500 }
    );
  }
}
