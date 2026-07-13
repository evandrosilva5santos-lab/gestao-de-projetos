import { inngest } from "./client";

/**
 * Função assíncrona do Inngest responsável por processar o Lead.
 * É aqui que a mágica acontece em "background". Se houver erro, 
 * o Inngest fará tentativas (retries) automáticas.
 */
export const processNewLead = inngest.createFunction(
  { 
    id: "process-new-lead",
    name: "Processamento de Novo Lead",
    retries: 3 // Tenta 3 vezes em caso de falha (ex: banco caiu, api do zap falhou)
  },
  { event: "lead/received" },
  async ({ event, step }) => {
    const { workspaceId, source, rawPayload } = event.data;

    // Passo 1: Padronização e Limpeza dos Dados (Zod)
    const treatedData = await step.run("treat-lead-data", async () => {
      // TODO: Implementar lógica real de Zod + Deduplicação
      return {
        name: rawPayload.name || "Sem Nome",
        phone: rawPayload.phone || "",
        email: rawPayload.email || ""
      };
    });

    // Passo 2: Executar Regras de Distribuição (Round Robin)
    const assignedUserId = await step.run("execute-distribution-rules", async () => {
      // TODO: Buscar na tabela gestao_leads_distribution_rules e definir o vendedor
      // Para o MVP 0 vamos retornar um ID falso ou NULL
      return null;
    });

    // Passo 3: Salvar o Lead no Banco de Dados (Supabase)
    const leadRecord = await step.run("save-lead-to-db", async () => {
      // TODO: Salvar na tabela `gestao_leads` via Supabase Client
      return { id: "fake-uuid-123", status: "distributed" };
    });

    // Passo 4: Registrar Log de Auditoria
    await step.run("audit-log", async () => {
      // TODO: Salvar na tabela `gestao_leads_audit_logs`
      return true;
    });

    // Retorna o resultado final da função
    return { success: true, lead: leadRecord };
  }
);
