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

export const TEMPLATE_VARIABLES = [
  "nome",
  "telefone",
  "cidade",
  "estado",
  "produto",
  "consultor",
  "origem",
  "email",
  "data",
  "hora",
  "empresa",
] as const;

export type TemplateVariable = (typeof TEMPLATE_VARIABLES)[number];

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

/** Constrói o contexto de variáveis a partir dos dados do lead. */
export function buildLeadContext(lead: {
  name?: string;
  phone?: string;
  email?: string;
  city?: string;
  state?: string;
  product?: string;
  consultant?: string;
  source?: string;
  company?: string;
}): Record<TemplateVariable, string> {
  const now = new Date();
  const fmt = (opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", ...opts }).format(now);
  return {
    nome: lead.name || "",
    telefone: lead.phone || "",
    cidade: lead.city || "",
    estado: lead.state || "",
    produto: lead.product || "",
    consultor: lead.consultant || "",
    origem: lead.source || "",
    email: lead.email || "",
    empresa: lead.company || "",
    data: fmt({ dateStyle: "short" }),
    hora: fmt({ hour: "2-digit", minute: "2-digit" }),
  };
}

// Templates iniciais — SÓ exemplos editáveis. A IA não decide o texto; o usuário
// personaliza. Randomização já vem com uma saudação variada de exemplo.
export const DEFAULT_TEMPLATES: MessageTemplates = {
  client: {
    enabled: false,
    text: "{{saudacao}}\n\nOlá {{nome}}!\n\nRecebemos sua solicitação sobre {{produto}}. Em instantes nossa equipe dá continuidade ao seu atendimento.",
    randomBlocks: {
      saudacao: ["Olá, tudo bem?", "Oi, tudo certo?", "Olá! Como você está?", "Oi! Espero que esteja bem."],
    },
  },
  group: {
    enabled: true,
    text: "🔥 Novo lead recebido!\n\nNome: {{nome}}\nTelefone: {{telefone}}\nProduto: {{produto}}\nOrigem: {{origem}}\nConsultor da vez: {{consultor}}",
    randomBlocks: {},
  },
};
