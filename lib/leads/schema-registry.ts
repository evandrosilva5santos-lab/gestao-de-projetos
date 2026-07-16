// ---------------------------------------------------------------------------
// SchemaRegistry (compartilhado) — vocabulário canônico de campos (conceitos).
//
// Casa um rótulo de campo (a pergunta do formulário da Meta, seja qual for o
// texto exato) a um CONCEITO semântico. É o que torna os templates replicáveis
// entre clientes: o template fala em conceito ({{interesse}}), e cada cliente
// resolve o conceito a partir do próprio campo.
//
// Vive em lib/ (infra) e não numa feature, pra ser importável por qualquer
// feature sem violar a Regra de Ouro #7 (sem import cruzado entre features).
// ---------------------------------------------------------------------------

export type ConceptCategory = "contato" | "formulario" | "rastreio";

export type Concept = {
  key: string;
  label: string;
  category: ConceptCategory;
  native?: boolean;
  critical?: boolean;
  synonyms: string[];
};

export const CONCEPTS: Concept[] = [
  { key: "name", label: "Nome", category: "contato", native: true, synonyms: ["name", "nome", "nome completo", "full name"] },
  { key: "email", label: "E-mail", category: "contato", native: true, synonyms: ["email", "e mail", "mail"] },
  { key: "phone", label: "Telefone", category: "contato", native: true, synonyms: ["phone", "telefone", "celular", "whats", "whatsapp"] },

  { key: "leadgenId", label: "Facebook Lead ID", category: "rastreio", critical: true, synonyms: ["leadgen id", "leadgen", "lead id", "facebook lead id", "facebook lead", "id do lead"] },

  { key: "interest", label: "Interesse em", category: "formulario", synonyms: ["interesse", "interessado", "voce esta interessado", "interesse em"] },
  { key: "startTime", label: "Quando deseja iniciar", category: "formulario", synonyms: ["quando deseja iniciar", "qnd comeca", "quando comeca", "quando iniciar", "quando comecar"] },
  { key: "budget", label: "Valor do consórcio", category: "formulario", synonyms: ["valor de consorcio", "valor do consorcio", "consorcio desejado", "valor do credito", "credito", "do credito", "total para investir"] },
  { key: "monthly", label: "Investimento mensal", category: "formulario", synonyms: ["quanto pode investir", "quanto planeja investir", "quanto pode ivestir", "investir por mes", "parcela mensal", "que pode pagar mes", "pagar mes", "parcela"] },
  { key: "salaryRange", label: "Faixa de renda", category: "formulario", synonyms: ["faixa salarial", "faixa salarial da familia", "renda familiar", "renda mensal", "faixa de orcamento", "renda"] },

  { key: "campaignId", label: "ID da Campanha", category: "rastreio", synonyms: ["campaign id", "id da campanha"] },
  { key: "campaignName", label: "Nome da Campanha", category: "rastreio", synonyms: ["campaign name", "nome da campanha"] },
  { key: "adId", label: "ID do Anúncio", category: "rastreio", synonyms: ["ad id", "id do anuncio", "anuncio id"] },
  { key: "adName", label: "Nome do Anúncio", category: "rastreio", synonyms: ["ad name", "nome do anuncio"] },
  { key: "formId", label: "ID do Formulário", category: "rastreio", synonyms: ["form id", "id do formulario"] },
  { key: "utm", label: "UTMs (tracking)", category: "rastreio", synonyms: ["utm", "utm source", "utm medium", "utm campaign", "utm content", "plataforma"] },
];

/** Chaves de sistema que não representam dado do lead. */
export const IGNORED_KEYS = new Set([
  "page_id", "adgroup_id", "created_time", "treated", "created_at", "updated_at",
  "workspace_id", "id", "seller_id", "source", "status", "raw_data",
]);

/** Conceito → variável do template (só os que fazem sentido numa mensagem). */
export const CONCEPT_TO_TEMPLATE_VAR: Record<string, string> = {
  name: "nome",
  email: "email",
  phone: "telefone",
  interest: "interesse",
  budget: "valor",
  monthly: "parcela",
  salaryRange: "faixa_renda",
  startTime: "prazo",
};

export function normalizeLabel(raw: string): string {
  return (raw || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokens(raw: string): string[] {
  const n = normalizeLabel(raw);
  return n ? n.split(" ") : [];
}

function containsSequence(hay: string[], needle: string[]): boolean {
  if (needle.length === 0 || needle.length > hay.length) return false;
  for (let i = 0; i + needle.length <= hay.length; i++) {
    let ok = true;
    for (let j = 0; j < needle.length; j++) {
      if (hay[i + j] !== needle[j]) { ok = false; break; }
    }
    if (ok) return true;
  }
  return false;
}

/** Casa um rótulo a um conceito por sinônimo (palavras inteiras). */
export function matchConcept(rawLabel: string): Concept | null {
  const labelTokens = tokens(rawLabel);
  if (labelTokens.length === 0) return null;
  for (const concept of CONCEPTS) {
    for (const syn of concept.synonyms) {
      const synTokens = tokens(syn);
      if (synTokens.length === 0) continue;
      if (containsSequence(labelTokens, synTokens) || containsSequence(synTokens, labelTokens)) {
        return concept;
      }
    }
  }
  return null;
}

/** Mapa de override manual do cliente: rótulo do campo → chave do conceito. */
export type FieldOverrides = Record<string, string>;

/**
 * Resolve o conceito de um rótulo considerando primeiro o override manual do
 * cliente e depois o casamento automático.
 */
export function resolveConcept(rawLabel: string, overrides?: FieldOverrides): Concept | null {
  if (overrides) {
    const norm = normalizeLabel(rawLabel);
    for (const [label, conceptKey] of Object.entries(overrides)) {
      if (normalizeLabel(label) === norm) {
        return CONCEPTS.find((c) => c.key === conceptKey) || null;
      }
    }
  }
  return matchConcept(rawLabel);
}
