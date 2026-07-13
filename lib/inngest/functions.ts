import { inngest } from "./client";
import { supabaseAdmin } from "../supabase/client";

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

  // Lista de DDDs que exigem o dígito 9 no WhatsApp
  const dddsComNove = [
    "11", "12", "13", "14", "15", "16", "17", "18", "19",
    "21", "22", "24", "27"
  ];

  const exigeNove = dddsComNove.includes(ddd);

  // Adiciona o 9 caso falte nos DDDs que exigem
  if (exigeNove && numero.length === 8) {
    numero = "9" + numero;
  }

  // Remove o 9 excedente caso o DDD não exija (padrão legado do WhatsApp em algumas APIs)
  if (!exigeNove && numero.length === 9 && numero.startsWith("9")) {
    numero = numero.slice(1);
  }

  return "55" + ddd + numero;
}

// Abreviar o nome do vendedor para enviar no WhatsApp
function abbreviateName(fullName: string): string {
  const raw = String(fullName || "")
    .replace(/_/g, " ")
    .replace(/\n/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const first = raw.split(" ").filter(Boolean)[0] || "";
  return first ? first.charAt(0).toUpperCase() + first.slice(1).toLowerCase() : "";
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

    // 1. Identificar Conexão e normalizar dados
    const treatedData = await step.run("normalize-lead-data", async () => {
      const rawName = rawPayload.name || rawPayload.nome || rawPayload.nome_completo || "Sem Nome";
      const rawPhone = rawPayload.phone || rawPayload.telefone || "";
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
        connectionId
      };
    });

    // 2. Deduplicação (Procura se o Lead já existe no CRM desse workspace/cliente)
    const existingAssignment = await step.run("check-duplicate-lead", async () => {
      if (!treatedData.email && !treatedData.phone) return null;

      let query = supabaseAdmin
        .from("gestao_leads")
        .select("seller_id")
        .eq("workspace_id", workspaceId)
        .not("seller_id", "is", null);

      if (treatedData.email) {
        query = query.eq("email", treatedData.email);
      } else {
        query = query.eq("phone", treatedData.phone);
      }

      const { data } = await query.limit(1);
      
      if (data && data.length > 0) {
        return data[0].seller_id; // Retorna o ID do vendedor anterior
      }

      return null;
    });

    // 3. Distribuição Round Robin Atômica (caso seja lead novo, isolado por Conexão/Cliente)
    const assignedSellerId = await step.run("execute-distribution", async () => {
      // Se a deduplicação achou um vendedor, mantém ele
      if (existingAssignment) return existingAssignment;

      if (treatedData.connectionId) {
        // Roteamento Atômico Isolado por Conexão (Cliente do Facebook)
        const { data: seller, error } = await supabaseAdmin
          .rpc("assign_next_seller_for_connection", { p_connection_id: treatedData.connectionId })
          .maybeSingle();

        if (error) throw new Error(`Erro no roteamento atômico por conexão: ${error.message}`);
        return (seller as any)?.id || null;
      } else {
        // Roteamento Atômico Global do Workspace (Fallback)
        const { data: seller, error } = await supabaseAdmin
          .rpc("assign_next_seller", { p_workspace_id: workspaceId })
          .maybeSingle();

        if (error) throw new Error(`Erro no roteamento atômico do workspace: ${error.message}`);
        return (seller as any)?.id || null;
      }
    });

    // 4. Salva o Lead no Banco de Dados
    const leadRecord = await step.run("save-lead-to-db", async () => {
      const { data, error } = await supabaseAdmin
        .from("gestao_leads")
        .insert({
          workspace_id: workspaceId,
          name: treatedData.name,
          email: treatedData.email,
          phone: treatedData.phone,
          source: source,
          status: assignedSellerId ? "distributed" : "error",
          seller_id: assignedSellerId,
          raw_data: {
            ...rawPayload,
            treated: treatedData
          }
        })
        .select("id, name, status, seller_id")
        .single();

      if (error) throw new Error(`Erro ao salvar lead: ${error.message}`);
      return data;
    });

    // 5. Enviar Notificações via Evolution API (WhatsApp)
    await step.run("send-whatsapp-notifications", async () => {
      // Busca a config do Whatsapp do workspace
      const { data: workspace } = await supabaseAdmin
        .from("core_workspaces")
        .select("name, whatsapp_config")
        .eq("id", workspaceId)
        .single();

      const config = workspace?.whatsapp_config as any;
      if (!config || !config.url || !config.token || !config.instanceName) {
        return { success: false, reason: "WhatsApp integration not configured" };
      }

      // Função auxiliar de disparo HTTP
      const sendMsg = async (to: string, text: string) => {
        try {
          const res = await fetch(`${config.url}/message/sendText/${config.instanceName}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": config.token
            },
            body: JSON.stringify({
              number: to,
              text: text
            })
          });
          return res.ok;
        } catch (e) {
          console.error(`Erro ao disparar Evolution para ${to}:`, e);
          return false;
        }
      };

      // Busca dados do vendedor para personalizar e saber o telefone
      let sellerDetails = null;
      if (assignedSellerId) {
        const { data } = await supabaseAdmin
          .from("gestao_leads_sellers")
          .select("name, phone")
          .eq("id", assignedSellerId)
          .single();
        sellerDetails = data;
      }

      // Template Vendedor (1-to-1)
      if (sellerDetails && sellerDetails.phone) {
        const abbreviatedSellerName = abbreviateName(sellerDetails.name);
        const sellerMsg = `Fala ${abbreviatedSellerName}\n\nChegou um *novo Lead* 🔥\n\n> \`${source}\` \n\n👤 *Nome:* ${treatedData.name}\n📧 *Email:* ${treatedData.email || "Não informado"}\n📱 *Telefone:* ${treatedData.phone || "Não informado"}\n💰 *Consórcio:* ${treatedData.interest || "Não informado"}\n🤑 *Total para Investir:* ${treatedData.budget || "Não informado"}\n💰 *Parcela:* ${treatedData.monthly || "Não informado"}\n\n🗓️ _Quando deseja iniciar_: ${treatedData.startTime || "Não informado"}\n\nVamos pra cima!`;
        
        await sendMsg(normalizePhone(sellerDetails.phone), sellerMsg);
      }

      // Template Grupo de Acompanhamento (Caso configurado)
      if (config.groupJid) {
        const groupMsg = `🔥 *Novo Lead Recebido!* 🔥\n> \`Lead do ${source}\` \n\n👤 *Nome:* ${treatedData.name}\n📧 *Email:* ${treatedData.email || "Não informado"}\n📱 *Telefone:* ${treatedData.phone || "Não informado"}\n💰 *Consórcio:* ${treatedData.interest || "Não informado"}\n🤑 *Total para Investir:* ${treatedData.budget || "Não informado"}\n💰 *Parcela:* ${treatedData.monthly || "Não informado"}\n\n🗓️ _Quando deseja iniciar_: ${treatedData.startTime || "Não informado"}\n👤 *Vendedor Designado:* ${sellerDetails?.name || "Nenhum (Round Robin Falhou)"}`;
        
        await sendMsg(config.groupJid, groupMsg);
      }

      return { success: true };
    });

    // 6. Registro de Log de Auditoria
    await step.run("audit-log", async () => {
      await supabaseAdmin
        .from("gestao_leads_audit_logs")
        .insert({
          lead_id: leadRecord.id,
          action: assignedSellerId ? "round_robin_distribution" : "error",
          details: {
            seller_id: assignedSellerId,
            existing_assignment: !!existingAssignment,
            treated_data: treatedData
          }
        });
      return true;
    });

    return { success: true, leadId: leadRecord.id };
  }
);
