export interface KommoConfig {
  subdomain: string;
  token: string;
  pipelineId?: number;
  statusId?: number;
  tagId?: number;
  tagName?: string;
  fields?: {
    phone?: number;
    email?: number;
    utmContent?: number;
    utmMedium?: number;
    utmCampaign?: number;
    utmSourcePlatform?: number;
    interest?: number;
    startTime?: number;
    budget?: number;
    salaryRange?: number;
    /** Campo custom (texto) do NEGÓCIO para guardar o Facebook Lead ID (leadgenId).
     * Varia por conta Kommo — sem default. Quando presente, torna o upsert por
     * leadgenId confiável mesmo em clientes SEM a integração nativa Facebook. */
    leadgenId?: number;
  };
}

export interface LeadData {
  name: string;
  email: string;
  phone: string;
  interest?: string;
  budget?: string;
  monthly?: string;
  salaryRange?: string;
  startTime?: string;
  utmMedium?: string;
  utmContent?: string;
  utmCampaign?: string;
  utmSourcePlatform?: string;
  leadgenId?: string;
  /** Quantas vezes esta pessoa já entrou no funil antes desta (0 = primeira vez). */
  reentryCount?: number;
}

interface KommoContactsResponse {
  _embedded?: { contacts?: { id: number }[] };
}

interface KommoLeadsResponse {
  _embedded?: { leads?: { id: number }[] };
}

interface KommoLeadSearchItem {
  id: number;
  name?: string;
  custom_fields_values?: { values?: { value?: string | number }[] }[];
}

interface KommoCustomFieldValue {
  field_id: number;
  values: { value: string }[];
}

interface KommoTag {
  id?: number;
  name?: string;
}

interface KommoLeadBody {
  name: string;
  pipeline_id: number;
  status_id: number;
  responsible_user_id?: number;
  _embedded: {
    contacts: { id: number }[];
    tags?: KommoTag[];
  };
  custom_fields_values: KommoCustomFieldValue[];
}

/**
 * Envia um Lead para o Kommo CRM (antigo amoCRM).
 * Cria/Associa o contato e depois cria a oportunidade (Lead/Deal) no funil correto.
 */
export async function sendLeadToKommo(
  config: KommoConfig,
  lead: LeadData,
  sellerCrmId?: string
): Promise<{ success: boolean; leadId?: number; error?: string }> {
  try {
    const { subdomain, token } = config;
    if (!subdomain || !token) {
      return { success: false, error: "Subdomínio ou Token do Kommo não configurados" };
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    const baseUrl = `https://${subdomain.toLowerCase().trim()}.kommo.com`;

    // Resolução de IDs de campos personalizados (default para a Karol Shutz)
    const f = config.fields || {};
    const phoneFieldId = f.phone || 655730;
    const emailFieldId = f.email || 655732;
    const utmContentFieldId = f.utmContent || 655738;
    const utmMediumFieldId = f.utmMedium || 655740;
    const utmCampaignFieldId = f.utmCampaign || 655742;
    const utmSourcePlatformFieldId = f.utmSourcePlatform || 655744;
    const interestFieldId = f.interest || 1120378;
    const startTimeFieldId = f.startTime || 1120376;
    const budgetFieldId = f.budget || 1120368;
    const salaryRangeFieldId = f.salaryRange || 1120370;
    const leadgenIdFieldId = f.leadgenId; // opcional — sem default (varia por conta)

    // 1. Procurar contato por telefone (últimos 8 dígitos para evitar conflitos de DDD)
    let contactId: number | null = null;
    const phoneClean = lead.phone.replace(/\D/g, "");
    
    if (phoneClean && phoneClean.length >= 8) {
      const last8Digits = phoneClean.slice(-8);
      try {
        const searchRes = await fetch(`${baseUrl}/api/v4/contacts?query=${last8Digits}`, {
          method: "GET",
          headers,
        });

        if (searchRes.ok) {
          const searchData = (await searchRes.json()) as KommoContactsResponse;
          const foundContacts = searchData?._embedded?.contacts;
          if (foundContacts && foundContacts.length > 0) {
            contactId = foundContacts[0].id;
          }
        }
      } catch (err) {
        console.error("Erro ao buscar contato no Kommo por telefone:", err instanceof Error ? err.message : err);
      }
    }

    // Se não encontrou por telefone e tem e-mail, tenta buscar por e-mail
    if (!contactId && lead.email) {
      try {
        const searchRes = await fetch(`${baseUrl}/api/v4/contacts?query=${lead.email.trim()}`, {
          method: "GET",
          headers,
        });

        if (searchRes.ok) {
          const searchData = (await searchRes.json()) as KommoContactsResponse;
          const foundContacts = searchData?._embedded?.contacts;
          if (foundContacts && foundContacts.length > 0) {
            contactId = foundContacts[0].id;
          }
        }
      } catch (err) {
        console.error("Erro ao buscar contato no Kommo por e-mail:", err instanceof Error ? err.message : err);
      }
    }

    // 2. Se o contato não existe, cria um novo contato
    //
    // REGRA (Contato vs Oportunidade): o CONTATO é único por pessoa (dedup por
    // telefone/e-mail acima) e NUNCA é duplicado. Mas um contato existente PODE
    // ganhar uma nova OPORTUNIDADE (negócio) — isso é tratado no passo 3 (upsert
    // por leadgenId). Por isso NÃO retornamos cedo aqui só porque o contato existe.
    if (!contactId) {
      const nameParts = lead.name.trim().split(" ");
      const firstName = nameParts[0] || "Lead";
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : ".";

      const contactBody = [
        {
          name: lead.name,
          first_name: firstName,
          last_name: lastName,
          custom_fields_values: [
            {
              field_id: phoneFieldId,
              values: [{ value: lead.phone }]
            },
            {
              field_id: emailFieldId,
              values: [{ value: lead.email }]
            }
          ]
        }
      ];

      const createContactRes = await fetch(`${baseUrl}/api/v4/contacts`, {
        method: "POST",
        headers,
        body: JSON.stringify(contactBody),
      });

      if (!createContactRes.ok) {
        const errorText = await createContactRes.text();
        return { success: false, error: `Falha ao criar contato no Kommo: ${errorText}` };
      }

      const createContactData = (await createContactRes.json()) as KommoContactsResponse;
      contactId = createContactData?._embedded?.contacts?.[0]?.id || null;
    }

    if (!contactId) {
      return { success: false, error: "Não foi possível obter ou criar o contato no Kommo." };
    }

    // 2.5. Reentrada no funil: marca no contato quantas vezes essa pessoa já entrou.
    // Best-effort — não deve derrubar o envio do lead se falhar.
    if (lead.reentryCount && lead.reentryCount > 0) {
      try {
        await fetch(`${baseUrl}/api/v4/contacts`, {
          method: "PATCH",
          headers,
          body: JSON.stringify([
            {
              id: contactId,
              _embedded: {
                tags: [{ name: `Reentrada ${lead.reentryCount + 1}x` }]
              }
            }
          ]),
        });
      } catch (err) {
        console.error("Aviso: falha ao marcar tag de reentrada no contato Kommo:", err instanceof Error ? err.message : err);
      }
    }

    // 3. Cadastra o Lead (Deal/Oportunidade) associado ao contato
    const customFields: KommoCustomFieldValue[] = [
      {
        field_id: utmContentFieldId,
        values: [{ value: lead.utmContent || "" }]
      },
      {
        field_id: utmMediumFieldId,
        values: [{ value: lead.utmMedium || "" }]
      },
      {
        field_id: utmCampaignFieldId,
        values: [{ value: lead.utmCampaign || "" }]
      },
      {
        field_id: utmSourcePlatformFieldId,
        values: [{ value: lead.utmSourcePlatform || "Meta Ads" }]
      }
    ];

    if (lead.interest) {
      customFields.push({
        field_id: interestFieldId,
        values: [{ value: lead.interest }]
      });
    }

    if (lead.startTime) {
      customFields.push({
        field_id: startTimeFieldId,
        values: [{ value: lead.startTime }]
      });
    }

    if (lead.budget) {
      customFields.push({
        field_id: budgetFieldId,
        values: [{ value: lead.budget }]
      });
    }

    if (lead.salaryRange) {
      customFields.push({
        field_id: salaryRangeFieldId,
        values: [{ value: lead.salaryRange }]
      });
    }

    // Grava o Facebook Lead ID (leadgenId) num campo custom buscável do negócio —
    // só quando a conta tem esse campo configurado. Isso permite reconciliar por
    // leadgenId mesmo em clientes SEM a integração nativa Facebook.
    if (leadgenIdFieldId && lead.leadgenId) {
      customFields.push({
        field_id: leadgenIdFieldId,
        values: [{ value: lead.leadgenId }]
      });
    }

    const leadBody: KommoLeadBody = {
      name: `Lead: ${lead.name}`,
      pipeline_id: config.pipelineId || 13924251,
      status_id: config.statusId || 107449871,
      _embedded: {
        contacts: [{ id: contactId }]
      },
      custom_fields_values: customFields
    };

    // Associa vendedor responsável
    if (sellerCrmId) {
      const responsibleId = Number(sellerCrmId);
      if (!isNaN(responsibleId)) {
        leadBody.responsible_user_id = responsibleId;
      }
    }

    // Associa tag (aceita ID ou Nome dinâmico)
    const tags: KommoTag[] = [];
    if (config.tagId) {
      tags.push({ id: config.tagId });
    } else if (config.tagName) {
      tags.push({ name: config.tagName });
    } else {
      // Padrão Karol Shutz
      tags.push({ id: 60338 });
    }

    // Tags de tráfego dinâmico (Meta Ads / Google Ads)
    const sourcePlatform = String(lead.utmSourcePlatform || "").toUpperCase();
    if (sourcePlatform.includes("FACEBOOK") || sourcePlatform.includes("META") || sourcePlatform.includes("INSTAGRAM")) {
      tags.push({ name: "META ADS" });
    } else if (sourcePlatform.includes("GOOGLE") || sourcePlatform.includes("GGL")) {
      tags.push({ name: "GOOGLE ADS" });
    }

    leadBody._embedded.tags = tags;

    // 3.5. UPSERT da OPORTUNIDADE por evento (leadgenId).
    // A integração NATIVA Facebook→Kommo (quando ativa) já cria o negócio com nome
    // "Facebook №{leadgenId}". Para NÃO duplicar a MESMA oportunidade, procuramos esse
    // negócio pelo leadgenId e, se existir, ATUALIZAMOS (PATCH) com o nosso fluxo correto
    // (nome padrão, campos, estágio, vendedor, tags). Se não existir, CRIAMOS um negócio
    // novo. Um contato pode ter vários negócios (eventos diferentes) — cada leadgenId é um.
    // Confirmado (14/jul): número do deal nativo == leadgenId (29/29 casaram na Karol).
    let existingDealId: number | null = null;
    if (lead.leadgenId) {
      try {
        // Busca pelo número puro do leadgenId — casa tanto o deal da integração NATIVA
        // (nome "Facebook №{leadgenId}") quanto o campo custom (clientes SEM nativa).
        const dealSearchRes = await fetch(`${baseUrl}/api/v4/leads?query=${encodeURIComponent(String(lead.leadgenId))}`, { method: "GET", headers });
        if (dealSearchRes.ok) {
          const dealSearchData = (await dealSearchRes.json()) as { _embedded?: { leads?: KommoLeadSearchItem[] } };
          const wanted = String(lead.leadgenId).replace(/\D/g, "");
          const reName = new RegExp(`Facebook\\s*№\\s*${lead.leadgenId}(\\D|$)`, "i");
          const match = (dealSearchData?._embedded?.leads || []).find((d) =>
            reName.test(d.name || "") ||
            (d.custom_fields_values || []).some((cf) =>
              (cf.values || []).some((v) => String(v.value ?? "").replace(/\D/g, "") === wanted && wanted.length > 0)
            )
          );
          existingDealId = match?.id ?? null;
        }
      } catch (err) {
        console.error("Aviso: falha ao buscar deal por leadgenId no Kommo:", err instanceof Error ? err.message : err);
      }
    }

    let kommoLeadId: number | undefined;
    if (existingDealId) {
      // ATUALIZA o negócio que já existe (nativa ou reenvio) — não duplica.
      const updateLeadRes = await fetch(`${baseUrl}/api/v4/leads`, {
        method: "PATCH",
        headers,
        body: JSON.stringify([{ id: existingDealId, ...leadBody }]),
      });
      if (!updateLeadRes.ok) {
        const errorText = await updateLeadRes.text();
        return { success: false, error: `Falha ao atualizar Deal no Kommo: ${errorText}` };
      }
      const updateLeadData = (await updateLeadRes.json()) as KommoLeadsResponse;
      kommoLeadId = updateLeadData?._embedded?.leads?.[0]?.id ?? existingDealId;
    } else {
      // CRIA um negócio novo (nova oportunidade).
      const createLeadRes = await fetch(`${baseUrl}/api/v4/leads`, {
        method: "POST",
        headers,
        body: JSON.stringify([leadBody]),
      });
      if (!createLeadRes.ok) {
        const errorText = await createLeadRes.text();
        return { success: false, error: `Falha ao criar Deal no Kommo: ${errorText}` };
      }
      const createLeadData = (await createLeadRes.json()) as KommoLeadsResponse;
      kommoLeadId = createLeadData?._embedded?.leads?.[0]?.id;
    }

    // 4. Rastreabilidade: anexa o ID original do lead do Meta como nota no deal (só ao criar).
    // Best-effort — não deve derrubar o sucesso do envio se a nota falhar.
    if (kommoLeadId && lead.leadgenId && !existingDealId) {
      try {
        await fetch(`${baseUrl}/api/v4/leads/${kommoLeadId}/notes`, {
          method: "POST",
          headers,
          body: JSON.stringify([
            {
              note_type: "common",
              params: { text: `Facebook Lead ID: ${lead.leadgenId}` }
            }
          ]),
        });
      } catch (err) {
        console.error("Aviso: falha ao anexar leadgen_id como nota no Kommo:", err instanceof Error ? err.message : err);
      }
    }

    return { success: true, leadId: kommoLeadId };
  } catch (err) {
    console.error("Erro inesperado na integração do Kommo:", err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export interface KommoUser {
  id: number;
  name: string;
  email: string;
  phone?: string;
}

interface KommoUsersResponse {
  _embedded?: {
    users?: KommoUser[];
  };
}

/**
 * Busca a lista de usuários responsáveis/representantes na conta Kommo.
 */
export async function fetchKommoUsers(subdomain: string, token: string): Promise<{ success: boolean; users?: KommoUser[]; error?: string }> {
  try {
    if (!subdomain || !token) {
      return { success: false, error: "Subdomínio ou Token não fornecidos" };
    }

    const baseUrl = `https://${subdomain.toLowerCase().trim()}.kommo.com`;
    
    const headers = {
      Authorization: `Bearer ${token.trim()}`,
      "Content-Type": "application/json",
    };

    const response = await fetch(`${baseUrl}/api/v4/users`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `Falha ao buscar usuários no Kommo: ${errorText}` };
    }

    const data = (await response.json()) as KommoUsersResponse;
    const users = data._embedded?.users || [];

    return { success: true, users };
  } catch (err) {
    console.error("Erro inesperado ao buscar usuários no Kommo:", err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

interface KommoAccountResponse {
  id?: number;
  name?: string;
  subdomain?: string;
}

/**
 * Valida subdomínio + token batendo em GET /api/v4/account — o endpoint mais
 * leve da API para confirmar que a credencial é válida (usado pelo botão
 * "Testar" da integração Kommo).
 */
export async function pingKommoAccount(subdomain: string, token: string): Promise<{ success: boolean; accountName?: string; error?: string }> {
  if (!subdomain || !token) {
    return { success: false, error: "Subdomínio ou Token não fornecidos" };
  }

  const baseUrl = `https://${subdomain.toLowerCase().trim()}.kommo.com`;
  const headers = { Authorization: `Bearer ${token.trim()}`, "Content-Type": "application/json" };

  try {
    const response = await fetch(`${baseUrl}/api/v4/account`, { method: "GET", headers });
    if (!response.ok) {
      if (response.status === 401) return { success: false, error: "Token inválido ou expirado." };
      const errorText = await response.text();
      return { success: false, error: `Kommo respondeu ${response.status}: ${errorText.slice(0, 200)}` };
    }
    const data = (await response.json()) as KommoAccountResponse;
    return { success: true, accountName: data.name || data.subdomain || subdomain };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro de rede ao contatar o Kommo." };
  }
}
