// Motor de template de mensagem — puro e testável, sem efeito colateral.
//
// Implementa a spec do orquestrador de fila:
//  - Variáveis: {{nome}}, {{telefone}}, ... resolvidas do contexto do lead.
//    Campo ausente vira string vazia, sem quebrar a estrutura da mensagem.
//  - Blocos randômicos: {{saudacao}} etc. mapeiam para uma LISTA de opções;
//    a cada render sorteia UMA. Assim cada envio é semanticamente igual mas
//    textualmente diferente — comunicação mais natural, menos cara de robô.
//
// Ordem de resolução: sorteia o bloco randômico primeiro (a opção sorteada
// pode conter variáveis) e depois resolve as variáveis. Um loop com guarda de
// profundidade cobre opções que referenciam outros tokens.

// Variáveis = os CONCEITOS que o SchemaRegistry (matchConcept) extrai do lead.
// Cada uma puxa o campo real do formulário daquele cliente, seja qual for o
// texto exato da pergunta — por isso o mesmo template é replicável entre clientes.
export const TEMPLATE_VARIABLE_DEFS = [
  { key: "nome", hint: "Nome do lead" },
  { key: "telefone", hint: "Telefone / WhatsApp" },
  { key: "email", hint: "E-mail" },
  { key: "interesse", hint: "No que tem interesse (ex.: Imóvel)" },
  { key: "valor", hint: "Total para investir (ex.: De 150 Mil A 300 Mil)" },
  { key: "parcela", hint: "Investimento mensal / parcela" },
  { key: "faixa_renda", hint: "Faixa de renda / orçamento" },
  { key: "prazo", hint: "Quando deseja iniciar" },
  { key: "consultor", hint: "Vendedor da vez" },
  { key: "origem", hint: "Origem do lead (ex.: Meta)" },
  { key: "data", hint: "Data de hoje" },
  { key: "hora", hint: "Hora de agora" },
] as const;

export const TEMPLATE_VARIABLES = TEMPLATE_VARIABLE_DEFS.map((v) => v.key);

export type TemplateVariable = (typeof TEMPLATE_VARIABLE_DEFS)[number]["key"];

/** Nome do bloco → lista de variações. Ex.: { saudacao: ["Olá, tudo bem?", "Oi!"] } */
export type RandomBlocks = Record<string, string[]>;

export type MessageTemplate = {
  enabled: boolean;
  text: string;
  randomBlocks: RandomBlocks;
};

export type MessageTemplates = {
  /** Mensagem enviada ao cliente final (no WhatsApp do vendedor). */
  client: MessageTemplate;
  /** Mensagem registrada no grupo operacional. */
  group: MessageTemplate;
};

const TOKEN_RE = /\{\{\s*([\w]+)\s*\}\}/g;

/**
 * Renderiza um template com o contexto do lead. `rand` é injetável para testes
 * determinísticos. Tokens desconhecidos viram "" (nunca deixa "{{x}}" na saída).
 */
export function renderTemplate(
  template: MessageTemplate,
  context: Partial<Record<TemplateVariable, string | undefined>> & Record<string, string | undefined>,
  rand: () => number = Math.random
): string {
  const pick = (arr: string[]): string => (arr.length ? arr[Math.floor(rand() * arr.length)] : "");

  const resolveOnce = (input: string): { out: string; changed: boolean } => {
    let changed = false;
    const out = input.replace(TOKEN_RE, (_match, name: string) => {
      changed = true;
      if (Object.prototype.hasOwnProperty.call(template.randomBlocks, name)) {
        return pick(template.randomBlocks[name]);
      }
      const v = context[name];
      return v == null ? "" : String(v);
    });
    return { out, changed };
  };

  let text = template.text;
  for (let depth = 0; depth < 6; depth++) {
    const { out, changed } = resolveOnce(text);
    text = out;
    if (!changed) break;
  }

  // Limpa excesso de linhas em branco que sobra de variável vazia.
  return text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** Lista os nomes de bloco randômico e de variável usados num texto (pra UI/validação). */
export function extractTokens(text: string): string[] {
  const found = new Set<string>();
  for (const m of text.matchAll(TOKEN_RE)) found.add(m[1]);
  return [...found];
}

/**
 * Constrói o contexto a partir do lead JÁ NORMALIZADO (os conceitos que o
 * matchConcept/normalize extraem do formulário: interest, budget, monthly,
 * salaryRange, startTime). Campo ausente vira "".
 */
export function buildLeadContext(lead: {
  name?: string;
  phone?: string;
  email?: string;
  interest?: string; // conceito: interesse
  budget?: string; // conceito: valor (total a investir)
  monthly?: string; // conceito: parcela / investimento mensal
  salaryRange?: string; // conceito: faixa de renda
  startTime?: string; // conceito: prazo
  consultant?: string; // vendedor da vez
  source?: string; // origem
}): Record<TemplateVariable, string> {
  const now = new Date();
  const fmt = (opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", ...opts }).format(now);
  return {
    nome: lead.name || "",
    telefone: lead.phone || "",
    email: lead.email || "",
    interesse: lead.interest || "",
    valor: lead.budget || "",
    parcela: lead.monthly || "",
    faixa_renda: lead.salaryRange || "",
    prazo: lead.startTime || "",
    consultor: lead.consultant || "",
    origem: lead.source || "",
    data: fmt({ dateStyle: "short" }),
    hora: fmt({ hour: "2-digit", minute: "2-digit" }),
  };
}

// Templates iniciais — SÓ exemplos editáveis. A IA não decide o texto; o usuário
// personaliza. Randomização já vem com uma saudação variada de exemplo.
export const DEFAULT_TEMPLATES: MessageTemplates = {
  client: {
    enabled: false,
    text: "{{saudacao}}\n\nOlá {{nome}}! Recebemos seu interesse em {{interesse}}. Em instantes o consultor {{consultor}} vai dar continuidade ao seu atendimento.",
    randomBlocks: {
      saudacao: ["Olá, tudo bem?", "Oi, tudo certo?", "Olá! Como você está?", "Oi! Espero que esteja bem."],
    },
  },
  // Réplica exata da mensagem de grupo do cliente, agora com variáveis reais.
  group: {
    enabled: true,
    text: [
      "🔥 *Novo Lead Recebido!* 🔥",
      "> `lead do {{origem}}`",
      "",
      "👤 *Nome:* {{nome}}",
      "📧 *Email:* {{email}}",
      "📱 *Telefone:* {{telefone}}",
      "💰 *Consórcio:* {{interesse}}",
      "🤑 *Total para Investir:* {{valor}}",
      "💰 *Parcela:* {{parcela}}",
      "",
      "🗓️ _Quando deseja iniciar_: {{prazo}}",
      "Vendedor da vez: {{consultor}}",
    ].join("\n"),
    randomBlocks: {},
  },
};
