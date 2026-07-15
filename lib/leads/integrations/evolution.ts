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

// Formato de JID de grupo do WhatsApp (Evolution/Baileys) termina em "@g.us".
// Aceita o formato atual (só dígitos, ex. "120363402141221369@g.us") E o formato
// legado de grupos antigos ("<telefone>-<timestamp>@g.us") — ser rígido demais
// aqui rejeitaria silenciosamente grupos reais e mais antigos. Rejeita mesmo
// assim links de convite, número solto ou JID de contato ("...@s.whatsapp.net").
function isValidGroupJid(jid: string): boolean {
  return /^[\d-]+@g\.us$/.test(jid);
}

function buildSellerMessage(
  lead: LeadData,
  source: string,
  sellerName: string,
  isReturningLead?: boolean
): string {
  const abbreviatedSellerName = abbreviateName(sellerName);
  const returningNotice = isReturningLead
    ? `⚠️ *Esse lead já tinha entrado antes! Ele voltou pra você.*\n\n`
    : "";
  return `Fala ${abbreviatedSellerName}\n\n${returningNotice}Chegou um *novo Lead* 🔥\n\n> \`${source}\` \n\n👤 *Nome:* ${lead.name}\n📧 *Email:* ${lead.email || "Não informado"}\n📱 *Telefone:* ${lead.phone || "Não informado"}\n💰 *Consórcio:* ${lead.interest || "Não informado"}\n🤑 *Total para Investir:* ${lead.budget || "Não informado"}\n💰 *Parcela:* ${lead.monthly || "Não informado"}\n\n🗓️ _Quando deseja iniciar_: ${lead.startTime || "Não informado"}\n\nVamos pra cima!`;
}

// Formato espelha a saída de produção do N8N (ver exemplo do grupo "Lead mega invest POA").
function buildGroupMessage(lead: LeadData, source: string, sellerName?: string): string {
  return `🔥 *Novo Lead Recebido!* 🔥\n> \`lead do ${source}\`\n\n👤 *Nome:* ${lead.name}\n📧 *Email:* ${lead.email || "Não informado"}\n📱 *Telefone:* ${lead.phone || "Não informado"}\n💰 *Consórcio:* ${lead.interest || "Não informado"}\n🤑 *Total para Investir:* ${lead.budget || "Não informado"}\n💰 *Parcela:* ${lead.monthly || "Não informado"}\n\n🗓️ _Quando deseja iniciar_: ${lead.startTime || "Não informado"}\nVendedor da vez: ${sellerName || "Nenhum"}`;
}

/** Uma tentativa de envio — nunca lança, sempre volta { ok, error, status }. */
async function attemptSend(
  config: EvolutionConfig,
  to: string,
  text: string
): Promise<{ ok: boolean; error?: string; status?: number }> {
  try {
    const res = await fetch(`${config.url}/message/sendText/${config.instanceName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: config.token,
      },
      body: JSON.stringify({ number: to, text }),
    });

    if (!res.ok) {
      return { ok: false, error: `Evolution respondeu ${res.status} para ${to}`, status: res.status };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Envia com 1 retentativa leve, só quando a falha parece transitória (erro de
 * rede/exceção, sem `status`, ou 5xx — instância reiniciando/sobrecarregada).
 * NÃO repete em 4xx (token errado, número malformado): é determinístico, a
 * segunda tentativa falharia do mesmo jeito e só dobraria a latência.
 * Nunca lança — quem chama sempre recebe { ok, error } estruturado.
 *
 * Risco residual assumido: se a 1ª tentativa já entregou a mensagem na Evolution
 * mas a resposta HTTP se perdeu no caminho (timeout pós-processamento), a
 * retentativa pode reenviar a mesma notificação. A API de sendText usada aqui
 * não expõe idempotency key — eliminar esse risco por completo exigiria mudança
 * de infraestrutura fora do escopo deste arquivo.
 */
async function sendMsgWithRetry(
  config: EvolutionConfig,
  to: string,
  text: string
): Promise<{ ok: boolean; error?: string }> {
  const first = await attemptSend(config, to, text);
  if (first.ok) return first;

  const isRetryable = first.status === undefined || first.status >= 500;
  if (!isRetryable) {
    console.error(`Evolution: falha não-transitória (status ${first.status}) para ${to} — sem retentativa: ${first.error}`);
    return first;
  }

  console.warn(`Evolution: falha ao enviar para ${to} (${first.error}) — 1 retentativa...`);
  const retry = await attemptSend(config, to, text);
  if (!retry.ok) {
    console.error(`Evolution: retentativa também falhou para ${to}: ${retry.error}`);
  }
  return retry;
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

    type SendOutcome = { label: string; ok: boolean; error?: string };
    const toOutcome = (label: string, send: Promise<{ ok: boolean; error?: string }>): Promise<SendOutcome> =>
      send.then((res) => ({ label, ok: res.ok, error: res.error }));

    // Promise.all aceita valor já resolvido misturado com Promise de verdade —
    // não precisa envolver o caso síncrono (groupJid mal formatado) em
    // Promise.resolve manual. Ordem de push = ordem em `reason` (Seller, Group).
    const tasks: (SendOutcome | Promise<SendOutcome>)[] = [];

    // Vendedor (1-to-1)
    if (sellerDetails && sellerDetails.phone) {
      const sellerMsg = buildSellerMessage(lead, source, sellerDetails.name, isReturningLead);
      tasks.push(toOutcome("Seller", sendMsgWithRetry(config, formatPhone(sellerDetails.phone), sellerMsg)));
    }

    // Grupo — só tenta enviar se configurado E com formato válido (...@g.us).
    // Formato inválido não derruba o fluxo: vira um outcome com ok:false, mas
    // o lead segue seu caminho normal (WhatsApp é notificação, não persistência).
    const trimmedGroupJid = config.groupJid?.trim();
    if (trimmedGroupJid) {
      if (!isValidGroupJid(trimmedGroupJid)) {
        tasks.push({
          label: "Group",
          ok: false,
          error: `JID mal formatado, esperado "<dígitos ou dígitos-timestamp>@g.us", recebido "${trimmedGroupJid}"`,
        });
      } else {
        const groupMsg = buildGroupMessage(lead, source, sellerDetails?.name);
        tasks.push(toOutcome("Group", sendMsgWithRetry(config, trimmedGroupJid, groupMsg)));
      }
    }

    // Vendedor e grupo são canais independentes — roda em paralelo em vez de
    // esperar um terminar pra começar o outro (metade da latência quando os
    // dois estão configurados). Promise.all preserva a ordem de `tasks`.
    const results = await Promise.all(tasks);
    const failed = results.filter((r) => !r.ok);

    return {
      success: true,
      reason:
        results.length > 0
          ? `Sent: ${results.map((r) => `${r.label} (${r.ok})`).join(", ")}`
          : "nada a enviar (sem vendedor nem grupo configurado)",
      // Não derruba o fluxo — `success` continua true mesmo com falha aqui.
      // O detalhe fica disponível pra quem chamar; hoje lib/inngest/functions.ts
      // só faz console.warn com isto (não persiste em gestao_leads_audit_logs).
      error: failed.length > 0 ? failed.map((r) => `${r.label.toLowerCase()}: ${r.error}`).join(" | ") : undefined,
    };
  } catch (err) {
    console.error("Erro inesperado na integração do WhatsApp:", err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
