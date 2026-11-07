// Motor de rotaciones: calcula qué persona es responsable de una tarea en
// una fecha determinada, en base a fechas reales (nunca a etiquetas como
// "Semana A/B" sueltas). La paridad siempre se calcula como diferencia real
// de días/semanas/meses contra una fecha ancla configurable.

import { diffDays, diffMonths, diffWeeksMonday } from "./dates";

export type RotationMode =
  | "NONE"
  | "FIXED"
  | "DAILY_ALTERNATE"
  | "WEEKLY_ALTERNATE"
  | "MONTHLY_ALTERNATE"
  | "MONTHLY_SPLIT_ALTERNATE";

function mod2(n: number): 0 | 1 {
  return (((n % 2) + 2) % 2) as 0 | 1;
}

export function resolveRotationPerson(params: {
  mode: RotationMode;
  anchorDate: Date | null;
  anchorPersonId: string | null;
  otherPersonId: string | null;
  date: Date;
  /** Para MONTHLY_SPLIT_ALTERNATE: 0 = primera ocurrencia del mes, 1 = segunda. */
  occurrenceIndexInMonth?: 0 | 1;
}): string | null {
  const {
    mode,
    anchorDate,
    anchorPersonId,
    otherPersonId,
    date,
    occurrenceIndexInMonth,
  } = params;

  if (mode === "NONE") return null;
  if (mode === "FIXED") return anchorPersonId;
  if (!anchorDate || !anchorPersonId || !otherPersonId) {
    return anchorPersonId ?? null;
  }

  if (mode === "DAILY_ALTERNATE") {
    const diff = diffDays(date, anchorDate);
    return mod2(diff) === 0 ? anchorPersonId : otherPersonId;
  }

  if (mode === "WEEKLY_ALTERNATE") {
    const diff = diffWeeksMonday(date, anchorDate);
    return mod2(diff) === 0 ? anchorPersonId : otherPersonId;
  }

  if (mode === "MONTHLY_ALTERNATE") {
    const diff = diffMonths(date, anchorDate);
    return mod2(diff) === 0 ? anchorPersonId : otherPersonId;
  }

  if (mode === "MONTHLY_SPLIT_ALTERNATE") {
    const diff = diffMonths(date, anchorDate);
    const first = mod2(diff) === 0 ? anchorPersonId : otherPersonId;
    const second = first === anchorPersonId ? otherPersonId : anchorPersonId;
    return occurrenceIndexInMonth === 1 ? second : first;
  }

  return anchorPersonId;
}
