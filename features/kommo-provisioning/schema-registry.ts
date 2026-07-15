// ---------------------------------------------------------------------------
// SchemaRegistry — vocabulário canônico de campos (conceitos).
//
// Cada CONCEITO tem sinônimos que aparecem tanto do lado da ENTRADA (chaves do
// formulário da Meta, ex.: "Quando Deseja iniciar?") quanto do DESTINO (nome do
// campo no Kommo, ex.: "Qnd Começa:"). Casar ambos ao mesmo conceito dá um
// casamento SEMÂNTICO — imune a rótulos diferentes entre Meta e Kommo.
//
// É a peça que a arquitetura pede para o mecanismo não ficar preso à Meta:
// qualquer fonte/CRM fala através deste vocabulário.
// ---------------------------------------------------------------------------

export type ConceptCategory = "contato" | "formulario" | "rastreio";

export type Concept = {
  key: string;
  label: string;
  category: ConceptCategory;
  /** Campo nativo do CRM (Nome/E-mail/Telefone) — sempre existe, não precisa criar. */
  native?: boolean;
  /** Ausência bloqueia a reconciliação (ex.: Facebook Lead ID). */
  critical?: boolean;
  synonyms: string[];
};

export const CONCEPTS: Concept[] = [
  { key: "name",  label: "Nome",      category: "contato", native: true, synonyms: ["name", "nome", "nome completo", "full name"] },
  { key: "email", label: "E-mail",    category: "contato", native: true, synonyms: ["email", "e mail", "mail"] },
  { key: "phone", label: "Telefone",  category: "contato", native: true, synonyms: ["phone", "telefone", "celular", "whats", "whatsapp"] },

  { key: "leadgenId", label: "Facebook Lead ID", category: "rastreio", critical: true, synonyms: ["leadgen id", "leadgen", "lead id", "facebook lead id", "facebook lead", "id do lead"] },

  { key: "interest",    label: "Interesse em",        category: "formulario", synonyms: ["interesse", "interessado", "voce esta interessado", "interesse em"] },
  { key: "startTime",   label: "Quando deseja iniciar", category: "formulario", synonyms: ["quando deseja iniciar", "qnd comeca", "quando comeca", "quando iniciar", "quando comecar"] },
  { key: "budget",      label: "Valor do consórcio",  category: "formulario", synonyms: ["valor de consorcio", "valor do consorcio", "consorcio desejado", "valor do credito", "credito", "do credito"] },
  { key: "monthly",     label: "Investimento mensal", category: "formulario", synonyms: ["quanto pode investir", "quanto planeja investir", "quanto pode ivestir", "investir por mes", "parcela mensal", "que pode pagar mes", "pagar mes"] },
  { key: "salaryRange", label: "Faixa de renda",      category: "formulario", synonyms: ["faixa salarial", "faixa salarial da familia", "renda familiar", "renda mensal", "faixa de orcamento", "renda"] },

  { key: "campaignId", label: "ID da Campanha",   category: "rastreio", synonyms: ["campaign id", "id da campanha"] },
  { key: "campaignName", label: "Nome da Campanha", category: "rastreio", synonyms: ["campaign name", "nome da campanha"] },
  { key: "adId",       label: "ID do Anúncio",    category: "rastreio", synonyms: ["ad id", "id do anuncio", "anuncio id"] },
  { key: "adName",     label: "Nome do Anúncio",  category: "rastreio", synonyms: ["ad name", "nome do anuncio"] },
  { key: "formId",     label: "ID do Formulário", category: "rastreio", synonyms: ["form id", "id do formulario"] },
  { key: "utm",        label: "UTMs (tracking)",  category: "rastreio", synonyms: ["utm", "utm source", "utm medium", "utm campaign", "utm content", "plataforma"] },
];

/** Chaves de sistema que não representam dado do lead — ignoradas na análise. */
export const IGNORED_KEYS = new Set([
  "page_id", "adgroup_id", "created_time", "treated", "created_at", "updated_at",
  "workspace_id", "id", "seller_id", "source", "status", "raw_data",
]);

/** Normaliza um rótulo: minúsculas, sem acentos, sem pontuação, espaços colapsados. */
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

/** true se `needle` aparece como sequência CONTÍGUA de palavras inteiras em `hay`. */
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

/** Casa um rótulo (da Meta ou do Kommo) a um conceito, por sinônimo.
 * Compara PALAVRAS inteiras (não substring de caracteres) — evita falsos
 * positivos como "ad id" casar com "lead id" (le-AD ID). */
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
