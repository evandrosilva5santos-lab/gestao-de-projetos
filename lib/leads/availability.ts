// Disponibilidade do vendedor — mesma regra usada em seller_is_available() (SQL,
// ver migration 20260715130000). Este módulo existe só pra a UI mostrar "disponível
// agora: sim/não" sem round-trip ao banco; a atribuição de verdade acontece no RPC
// atômico, não aqui. Porte 1:1 da lógica já testada em
// "Gestão de projetos repository/handoff/src/features/distribution/availability.js".

export type SellerAvailability = {
  paused?: boolean;
  vacation?: { from?: string; to?: string };
  weekdays?: number[]; // 0=domingo .. 6=sábado (mesma convenção de Date.getDay())
  hours?: { start?: string; end?: string }; // "HH:MM"
};

export type WorkspaceQueueRules = {
  respectHours: boolean;
  skipUnavailable: boolean;
  queuePaused: boolean;
};

export function isSellerAvailable(
  availability: SellerAvailability | null | undefined,
  rules: Pick<WorkspaceQueueRules, "respectHours" | "skipUnavailable">,
  now: Date = new Date()
): boolean {
  if (!rules.skipUnavailable) return true;

  const a = availability ?? {};
  if (a.paused) return false;
  if (isOnVacation(a.vacation, now)) return false;
  if (!worksOnWeekday(a.weekdays, now)) return false;
  if (rules.respectHours && !withinHours(a.hours, now)) return false;
  return true;
}

function isOnVacation(vac: SellerAvailability["vacation"], now: Date): boolean {
  if (!vac?.from || !vac?.to) return false;
  const t = now.getTime();
  return t >= new Date(vac.from).getTime() && t <= new Date(vac.to).getTime();
}

function worksOnWeekday(weekdays: number[] | undefined, now: Date): boolean {
  if (!weekdays || weekdays.length === 0) return true;
  return weekdays.includes(now.getDay());
}

function withinHours(hours: SellerAvailability["hours"], now: Date): boolean {
  if (!hours?.start || !hours?.end) return true;
  const mins = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = hours.start.split(":").map(Number);
  const [eh, em] = hours.end.split(":").map(Number);
  return mins >= sh * 60 + sm && mins <= eh * 60 + em;
}

export const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
