import { LeadData } from "./kommo";

export interface EvolutionConfig {
  url: string;
  token: string;
  instanceName: string;
  groupJid?: string;
}

// Função auxiliar para abreviar o nome do vendedor para enviar no WhatsApp
function abbreviateName(fullName: string): string {
  const raw = String(fullName || "")
    .replace(/_/g, " ")
    .replace(/\n/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const first = raw.split(" ").filter(Boolean)[0] || "";
  return first ? first.charAt(0).toUpperCase() + first.slice(1).toLowerCase() : "";
}

// Função auxiliar para formatar o telefone (garante DDI 55)
// Assume que o telefone já vem normalizado (sem caracteres especiais), 
// mas faremos um fallback rápido só por segurança.
function formatPhone(phone: string): string {
  const num = phone.replace(/\D/g, "");
  if (!num) return "";
  // Se já começar com 55 e tiver tamanho adequado, mantém
  if (num.startsWith("55") && num.length >= 12) return num;
  // Caso contrário adiciona 55 (isso já deveria estar feito no normalize, mas reforçamos)
  return "55" + num;
}

export async function sendLeadToWhatsApp(
  config: EvolutionConfig,
  lead: LeadData,
  source: string,
  sellerDetails?: { name: string; phone: string } | null,
  isReturningLead?: boolean
): Promise<{ success: boolean; reason?: string; error?: string }> {
  try {
    if (!config.url || !config.token || !config.instanceName) {
      return { success: false, reason: "WhatsApp integration not configured correctly" };
    }

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

    let sentToSeller = false;
    let sentToGroup = false;

    // Template Vendedor (1-to-1)
    if (sellerDetails && sellerDetails.phone) {
      const abbreviatedSellerName = abbreviateName(sellerDetails.name);
      const returningNotice = isReturningLead
        ? `⚠️ *Esse lead já tinha entrado antes! Ele voltou pra você.*\n\n`
        : "";
      const sellerMsg = `Fala ${abbreviatedSellerName}\n\n${returningNotice}Chegou um *novo Lead* 🔥\n\n> \`${source}\` \n\n👤 *Nome:* ${lead.name}\n📧 *Email:* ${lead.email || "Não informado"}\n📱 *Telefone:* ${lead.phone || "Não informado"}\n💰 *Consórcio:* ${lead.interest || "Não informado"}\n🤑 *Total para Investir:* ${lead.budget || "Não informado"}\n💰 *Parcela:* ${lead.monthly || "Não informado"}\n\n🗓️ _Quando deseja iniciar_: ${lead.startTime || "Não informado"}\n\nVamos pra cima!`;

      sentToSeller = await sendMsg(formatPhone(sellerDetails.phone), sellerMsg);
    }

    // Template Grupo (se groupJid configurado)
    if (config.groupJid && config.groupJid.trim()) {
      const groupMsg = `*📌 Novo Lead Chegou!*\n\n👤 ${lead.name}\n📱 ${lead.phone || "—"}\n📊 ${source}\n\n🏷️ ${lead.interest || "—"}\n💵 ${lead.budget || "—"}\n\n${sellerDetails ? `👨‍💼 *Vendedor:* ${sellerDetails.name}` : ""}`;
      sentToGroup = await sendMsg(config.groupJid, groupMsg);
    }

    // Template Grupo de Acompanhamento (Caso configurado)
    // Formato espelha a saída de produção do N8N (ver exemplo do grupo "Lead mega invest POA").
    if (config.groupJid) {
      const groupMsg = `🔥 *Novo Lead Recebido!* 🔥\n> \`lead do ${source}\`\n\n👤 *Nome:* ${lead.name}\n📧 *Email:* ${lead.email || "Não informado"}\n📱 *Telefone:* ${lead.phone || "Não informado"}\n💰 *Consórcio:* ${lead.interest || "Não informado"}\n🤑 *Total para Investir:* ${lead.budget || "Não informado"}\n💰 *Parcela:* ${lead.monthly || "Não informado"}\n\n🗓️ _Quando deseja iniciar_: ${lead.startTime || "Não informado"}\nVendedor da vez: ${sellerDetails?.name || "Nenhum"}`;

      sentToGroup = await sendMsg(config.groupJid, groupMsg);
    }

    return { 
      success: true, 
      reason: `Sent: Seller (${sentToSeller}), Group (${sentToGroup})` 
    };
  } catch (err) {
    console.error("Erro inesperado na integração do WhatsApp:", err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
