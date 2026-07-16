// Qualificação de leads — só quem passa no critério configurado entra na Rodada
// da Vez. Porte 1:1 de
// "Gestão de projetos repository/handoff/src/features/distribution/qualification.js".
// Rodado no pipeline (lib/inngest/functions.ts) ANTES da distribuição — lead
// reprovado vira status "not_qualified", não recebe vendedor nem notificação.

export type QualificationCriterion = "has_phone" | "has_email" | "min_value" | "field_equals" | "utm_source";

export type QualificationRule = {
  enabled: boolean;
  criterion?: QualificationCriterion;
  config?: {
    minValue?: number;
    field?: string;
    equals?: string;
    value?: string;
  };
};

// Formato mínimo do lead necessário pra avaliar qualificação — não depende do
// tipo completo de LeadData pra este módulo ficar portável/testável isolado.
type QualifiableLead = {
  phone?: string;
  email?: string;
  value?: number;
  custom?: Record<string, unknown>;
};

const CRITERIA: Record<QualificationCriterion, (lead: QualifiableLead, cfg: NonNullable<QualificationRule["config"]>) => boolean> = {
  has_phone: (lead) => !!lead.phone,
  has_email: (lead) => !!lead.email,
  min_value: (lead, cfg) => (lead.value ?? 0) >= (cfg.minValue ?? 0),
  field_equals: (lead, cfg) => lead.custom?.[cfg.field ?? ""] === cfg.equals,
  utm_source: (lead, cfg) => lead.custom?.utm_source === cfg.value,
};

export function isLeadQualified(lead: QualifiableLead, rule: QualificationRule | null | undefined): boolean {
  if (!rule?.enabled || !rule.criterion) return true; // sem regra ativa = todo lead passa
  const fn = CRITERIA[rule.criterion];
  if (!fn) return true;
  return fn(lead, rule.config ?? {});
}
