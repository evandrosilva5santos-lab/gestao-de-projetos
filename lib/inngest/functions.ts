import { inngest } from "./client";
import { supabaseAdmin } from "../supabase/client";
import { sendLeadToKommo } from "../leads/integrations/kommo";
import { appendLeadToSheets } from "../leads/integrations/sheets";
import { sendLeadToWhatsApp } from "../leads/integrations/evolution";
import { isLeadQualified, type QualificationRule } from "../leads/qualification";
import { fetchMetaLeadDetails } from "../leads/providers/meta";

// Função auxiliar para normalizar o telefone no formato brasileiro
function normalizePhone(rawPhone: string): string {
  let num = String(rawPhone).replace(/\D/g, "").trim();
  if (!num) return "";

  // Remove prefixos internacionais redundantes adicionados por formulários
  if (num.startsWith("00")) num = num.slice(2);
  if (num.startsWith("55")) num = num.slice(2);

  if (num.length < 10) return "";

  const ddd = num.slice(0, 2);
  let numero = num.slice(2);

  // Desde 2016 todos os DDDs do Brasil usam 9 dígitos para celular
  // (a antiga distinção por DDD só valia durante a migração, hoje é universal).
  if (numero.length === 8) {
    numero = "9" + numero;
  }

  return "55" + ddd + numero;
}

/**
 * Função assíncrona do Inngest responsável por processar o Lead.
 * Roteia o lead de forma isolada por Conexão (Cliente da Agência), garantindo rodada independente.
 */
export const processNewLead = inngest.createFunction(
  { 
    id: "process-new-lead",
    name: "Processamento de Novo Lead",
    triggers: [{ event: "lead/received" }],
    retries: 3 
  },
  async ({ event, step }) => {
    const { workspaceId, source, rawPayload } = event.data;

    // 0. Leads da Meta: o webhook manda só o leadgen_id — a Meta nunca entrega os
    // valores preenchidos no formulário (nome/telefone/email) via webhook, por
    // design própria dela. É preciso buscar à parte na Graph API, autenticado com
    // o access_token da página dona do formulário. Sem isso, todo lead da Meta
    // chegava aqui como "Sem Nome" / telefone e email vazios.
    const enrichedPayload = await step.run("enrich-meta-lead-data", async () => {
      if (source !== "Meta Ads" || !rawPayload.leadgen_id || !rawPayload.page_id) {
        return rawPayload;
      }

      const { data: conn } = await supabaseAdmin
        .from("gestao_leads_meta_connections")
        .select("access_token")
        .eq("page_id", String(rawPayload.page_id))
        .limit(1)
        .maybeSingle();

      if (!conn?.access_token) {
        console.warn(`Sem access_token cadastrado pra página ${rawPayload.page_id} — lead ${rawPayload.leadgen_id} ficará sem os dados do formulário.`);
        return rawPayload;
      }

      const details = await fetchMetaLeadDetails(String(rawPayload.leadgen_id), conn.access_token);
      if (!details.success) {
        console.error(`Falha ao buscar dados do lead ${rawPayload.leadgen_id} na Graph API: ${details.error}`);
        return rawPayload;
      }

      return { ...rawPayload, ...details.fields };
    });

    // 1. Identificar Conexão e normalizar dados
    const treatedData = await step.run("normalize-lead-data", async () => {
      const rawPayload = enrichedPayload;
      const rawName = rawPayload.name || rawPayload.nome || rawPayload.nome_completo || rawPayload.full_name || "Sem Nome";
      const rawPhone = rawPayload.phone || rawPayload.telefone || rawPayload.phone_number || "";
      const rawEmail = rawPayload.email || rawPayload.e_mail || "";

      // Tenta mapear o page_id vindo da Meta para descobrir a conexão
      const pageId = rawPayload.page_id || (rawPayload.entry && rawPayload.entry[0]?.id) || null;
      let connectionId = null;

      if (pageId) {
        const { data: conn } = await supabaseAdmin
          .from("gestao_leads_meta_connections")
          .select("id")
          .eq("page_id", String(pageId))
          .limit(1)
          .maybeSingle();
        connectionId = conn?.id || null;
      }

      return {
        name: String(rawName).trim(),
        phone: normalizePhone(rawPhone),
        email: String(rawEmail).trim().toLowerCase(),
        interest: rawPayload.interest || rawPayload["Voce está interessado"] || rawPayload["você_está_interessado(a)_em_investimentos_ou_consórcio_para_veículo_e_imóvel?"] || "",
        budget: rawPayload.budget || rawPayload["Valor de Consorcio Desejado"] || rawPayload["valor_da_consórcio_desejado?"] || "",
        monthly: rawPayload.monthly || rawPayload["Quanto pode ivestir por mês"] || rawPayload["quanto_você_planeja_investir_por_mês_no_seu_sonho?"] || rawPayload["Valor minimo da Parcela"] || "",
        salaryRange: rawPayload.salaryRange || rawPayload["Faixa Salarial da Familia"] || rawPayload["em_qual_faixa_de_orçamento_mensal_você_ou_sua_família_se_enquadram_atualmente?"] || "",
        startTime: rawPayload.startTime || rawPayload["Quando Deseja iniciar?"] || "",
        utmMedium: rawPayload.utm_medium || "",
        utmContent: rawPayload.utm_content || "",
        utmCampaign: rawPayload.utm_campaign || "",
        leadgenId: rawPayload.leadgen_id ? String(rawPayload.leadgen_id) : undefined,
        connectionId
      };
    });

    // 2. Camada 1 — Duplicata de EVENTO (mesmo leadgen_id, ex.: retry do webhook do Meta).
    // Se já processamos este leadgen_id neste workspace, para tudo aqui: não insere
    // lead novo, não dispara Kommo/Sheets/WhatsApp de novo.
    const trueDuplicate = await step.run("check-true-duplicate-event", async () => {
      if (!treatedData.leadgenId) return null;

      const { data } = await supabaseAdmin
        .from("gestao_leads")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("leadgen_id", treatedData.leadgenId)
        .limit(1)
        .maybeSingle();

      return data?.id || null;
    });

    if (trueDuplicate) {
      return { success: true, duplicate: true, leadId: trueDuplicate };
    }

    // 3. Camada 2 — Lead REENTROU no funil (mesma pessoa, leadgen_id novo).
    // Se o vendedor anterior ainda está ativo, o lead volta pra ele (sticky) e o
    // motor sinaliza "lead retornando" na notificação. Se o vendedor saiu, cai no
    // round robin normal (não gruda em vendedor inativo).
    const returningLeadInfo = await step.run("check-returning-lead", async () => {
      if (!treatedData.email && !treatedData.phone) return { stickySellerId: null, previousCount: 0 };

      // Conta quantas vezes essa pessoa já entrou no funil deste cliente (histórico)
      let countQuery = supabaseAdmin
        .from("gestao_leads")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId);
      countQuery = treatedData.email
        ? countQuery.eq("email", treatedData.email)
        : countQuery.eq("phone", treatedData.phone);
      const { count } = await countQuery;

      let query = supabaseAdmin
        .from("gestao_leads")
        .select("seller_id, gestao_leads_sellers!inner(id, is_active)")
        .eq("workspace_id", workspaceId)
        .not("seller_id", "is", null)
        .eq("gestao_leads_sellers.is_active", true);

      query = treatedData.email
        ? query.eq("email", treatedData.email)
        : query.eq("phone", treatedData.phone);

      const { data } = await query.limit(1);

      return {
        stickySellerId: data && data.length > 0 ? data[0].seller_id : null, // Vendedor anterior, ainda ativo
        previousCount: count || 0
      };
    });
    const isReturningLead = !!returningLeadInfo.stickySellerId;
    const reentryCount = returningLeadInfo.previousCount; // 0 = primeira vez deste lead

    // 3.5. Qualificação — só leads que passam no critério configurado (por
    // cliente) entram na Rodada da Vez. Sem regra ativa, todo lead passa
    // (comportamento atual preservado). Reentrada com vendedor sticky ignora
    // qualificação: a pessoa já foi qualificada da primeira vez.
    const isQualified = await step.run("check-qualification", async () => {
      if (returningLeadInfo.stickySellerId) return true;

      const { data } = await supabaseAdmin
        .from("gestao_leads_workspace_rules")
        .select("qualification")
        .eq("workspace_id", workspaceId)
        .maybeSingle();

      const rule = (data?.qualification ?? { enabled: false }) as QualificationRule;
      return isLeadQualified(
        { phone: treatedData.phone, email: treatedData.email, custom: rawPayload },
        rule
      );
    });

    // 4. Distribuição Round Robin Atômica (caso não seja reentrada com vendedor ativo)
    const assignedSellerId = await step.run("execute-distribution", async () => {
      // Reprovado na qualificação: nunca entra na Rodada, não gasta vez de ninguém.
      if (!isQualified) return null;

      // Reentrada com vendedor ainda ativo: mantém o mesmo vendedor
      if (returningLeadInfo.stickySellerId) return returningLeadInfo.stickySellerId;

      if (treatedData.connectionId) {
        // Roteamento Atômico Isolado por Conexão (Cliente do Facebook)
        const { data: seller, error } = await supabaseAdmin
          .rpc("assign_next_seller_for_connection", { p_connection_id: treatedData.connectionId })
          .maybeSingle();

        if (error) throw new Error(`Erro no roteamento atômico por conexão: ${error.message}`);
        return (seller as { id: string } | null)?.id || null;
      } else {
        // Roteamento Atômico Global do Workspace (Fallback)
        const { data: seller, error } = await supabaseAdmin
          .rpc("assign_next_seller", { p_workspace_id: workspaceId })
          .maybeSingle();

        if (error) throw new Error(`Erro no roteamento atômico do workspace: ${error.message}`);
        return (seller as { id: string } | null)?.id || null;
      }
    });

    // 5. Salva o Lead no Banco de Dados
    const leadRecord = await step.run("save-lead-to-db", async () => {
      const { data, error } = await supabaseAdmin
        .from("gestao_leads")
        .insert({
          workspace_id: workspaceId,
          name: treatedData.name,
          email: treatedData.email,
          phone: treatedData.phone,
          source: source,
          status: assignedSellerId ? "distributed" : isQualified ? "error" : "not_qualified",
          seller_id: assignedSellerId,
          leadgen_id: treatedData.leadgenId,
          raw_data: {
            ...enrichedPayload,
            treated: treatedData
          }
        })
        .select("id, name, status, seller_id")
        .single();

      if (error) throw new Error(`Erro ao salvar lead: ${error.message}`);
      return data;
    });

    // 4.5. Buscar Detalhes do Vendedor (se houver)
    const sellerDetails = await step.run("get-seller-details", async () => {
      if (!assignedSellerId) return null;
      const { data, error } = await supabaseAdmin
        .from("gestao_leads_sellers")
        .select("name, phone, crm_user_id")
        .eq("id", assignedSellerId)
        .single();
      if (error) {
        console.error("Erro ao obter vendedor:", error.message);
        return null;
      }
      return data;
    });

    // 4.6. Buscar Destinos Ativos do Workspace
    const destinations = await step.run("get-destinations", async () => {
      const { data } = await supabaseAdmin
        .from("gestao_leads_destinations")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true);
      return data || [];
    });

    // 4.7. Integrar com Kommo CRM (AmoCRM) se configurado.
    // Kommo é um destino OPCIONAL (ver regras de destino do lead) — uma falha aqui
    // NUNCA pode bloquear os destinos OBRIGATÓRIOS (Sheets/WhatsApp) que vêm depois.
    // Por isso não lança exceção: registra o erro e segue o fluxo.
    const kommoDest = destinations.find((d) => d.type === "kommo");
    let kommoResult = null;
    if (kommoDest) {
      kommoResult = await step.run("deliver-to-kommo", async () => {
        const config = kommoDest.config;
        const res = await sendLeadToKommo(
          {
            subdomain: config.subdomain,
            token: config.token,
            pipelineId: config.pipelineId ? Number(config.pipelineId) : undefined,
            statusId: config.statusId ? Number(config.statusId) : undefined,
            tagId: config.tagId ? Number(config.tagId) : undefined,
            fields: config.fields,
          },
          { ...treatedData, leadgenId: treatedData.leadgenId, reentryCount },
          sellerDetails?.crm_user_id || undefined
        );
        if (!res.success) {
          console.error(`Falha no envio ao Kommo (não bloqueia Sheets/WhatsApp): ${res.error}`);
        }
        return res;
      });
    }

    // 4.8. Integrar com Google Sheets se configurado
    const sheetsDest = destinations.find((d) => d.type === "google_sheets");
    let sheetsResult = null;
    if (sheetsDest) {
      sheetsResult = await step.run("deliver-to-sheets", async () => {
        const config = sheetsDest.config;
        const res = await appendLeadToSheets(
          {
            clientEmail: config.clientEmail,
            privateKey: config.privateKey,
            spreadsheetId: config.spreadsheetId,
            sheetName: config.sheetName,
            fieldMapping: config.fieldMapping,
          },
          treatedData,
          sellerDetails?.name || undefined
        );
        if (!res.success) {
          throw new Error(`Falha no envio ao Google Sheets: ${res.error}`);
        }
        return res;
      });
    }

    // 5. Enviar Notificações via Evolution API (WhatsApp)
    const evolutionDest = destinations.find((d) => d.type === "evolution");
    let whatsappResult = null;
    if (evolutionDest) {
      whatsappResult = await step.run("send-whatsapp-notifications", async () => {
        const config = evolutionDest.config;
        
        const res = await sendLeadToWhatsApp(
          {
            url: config.url,
            token: config.token,
            instanceName: config.instanceName,
            groupJid: config.groupJid,
          },
          treatedData,
          source,
          sellerDetails,
          isReturningLead
        );

        if (!res.success) {
          console.warn(`Aviso no disparo do WhatsApp: ${res.reason || res.error}`);
        }
        return res;
      });
    }

    // 6. Registro de Log de Auditoria
    await step.run("audit-log", async () => {
      await supabaseAdmin
        .from("gestao_leads_audit_logs")
        .insert({
          lead_id: leadRecord.id,
          workspace_id: workspaceId,
          action: assignedSellerId ? "round_robin_distribution" : "error",
          details: {
            seller_id: assignedSellerId,
            is_returning_lead: isReturningLead,
            reentry_count: reentryCount,
            treated_data: treatedData,
            kommo_lead_id: kommoResult?.leadId || null,
            kommo_error: kommoResult?.success === false ? kommoResult.error : null,
            sheets_delivered: !!sheetsResult,
            whatsapp_delivered: !!whatsappResult?.success
          }
        });
      return true;
    });

    return { success: true, leadId: leadRecord.id };
  }
);
