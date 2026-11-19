// Generador de instancias de tareas a partir de las plantillas (TaskTemplate).
//
// Las instancias se materializan de forma perezosa e idempotente: cada vez
// que se consulta un rango de fechas (dashboard, calendario, etc.) se llama a
// `ensureInstancesInRange`, que crea las filas que falten para ese rango sin
// tocar las que ya existen (así nunca se pisa una tarea ya completada,
// reasignada o con subtareas marcadas). Las tareas pendientes nunca se
// borran ni se auto-completan: su estado "atrasada" se calcula al vuelo
// comparando la fecha/ventana de vencimiento contra el día de hoy.

import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { resolveRotationPerson, type RotationMode } from "./rotation";
import {
  addDays,
  dateAtDay,
  diffDays,
  endOfMonth,
  isBeforeDay,
  startOfMonth,
  startOfWeekMonday,
  weekdayOf,
} from "./dates";
import type { Frequency, TaskStatus } from "@prisma/client";

type Occurrence = {
  date: Date;
  windowStart: Date | null;
  windowEnd: Date | null;
  occurrenceIndexInMonth?: 0 | 1;
};

type TemplateForGeneration = {
  id: string;
  frequency: Frequency;
  daysOfWeek: string | null;
  occurrencesPerMonth: number;
  rotationMode: RotationMode;
  rotationAnchorDate: Date | null;
  rotationAnchorPersonId: string | null;
  isShared: boolean;
  subtasks: unknown;
};

function matchesDaysOfWeek(date: Date, daysOfWeek: string | null): boolean {
  if (!daysOfWeek) return true;
  const allowed = new Set(
    daysOfWeek
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map(Number),
  );
  return allowed.has(weekdayOf(date));
}

function occurrencesForTemplate(
  template: TemplateForGeneration,
  from: Date,
  to: Date,
): Occurrence[] {
  const occurrences: Occurrence[] = [];

  if (template.frequency === "DAILY") {
    let d = from;
    while (!isBeforeDay(to, d)) {
      if (matchesDaysOfWeek(d, template.daysOfWeek)) {
        occurrences.push({ date: d, windowStart: null, windowEnd: null });
      }
      d = addDays(d, 1);
    }
    return occurrences;
  }

  if (template.frequency === "WEEKLY") {
    if (template.daysOfWeek) {
      let d = from;
      while (!isBeforeDay(to, d)) {
        if (matchesDaysOfWeek(d, template.daysOfWeek)) {
          occurrences.push({ date: d, windowStart: null, windowEnd: null });
        }
        d = addDays(d, 1);
      }
      return occurrences;
    }
    // Semana libre (sin día fijo): una instancia por semana, ventana lun-dom.
    let wk = startOfWeekMonday(from);
    const lastWk = startOfWeekMonday(to);
    while (!isBeforeDay(lastWk, wk)) {
      occurrences.push({
        date: wk,
        windowStart: wk,
        windowEnd: addDays(wk, 6),
      });
      wk = addDays(wk, 7);
    }
    return occurrences;
  }

  if (template.frequency === "MONTHLY") {
    let monthStart = startOfMonth(from);
    const lastMonthStart = startOfMonth(to);
    while (!isBeforeDay(lastMonthStart, monthStart)) {
      if (template.occurrencesPerMonth >= 2) {
        const w1start = dateAtDay(monthStart, 14);
        const w1end = dateAtDay(monthStart, 16);
        occurrences.push({
          date: w1start,
          windowStart: w1start,
          windowEnd: w1end,
          occurrenceIndexInMonth: 0,
        });
        const w2start = dateAtDay(monthStart, 29);
        const w2end = endOfMonth(monthStart);
        occurrences.push({
          date: w2start,
          windowStart: w2start,
          windowEnd: w2end,
          occurrenceIndexInMonth: 1,
        });
      } else {
        occurrences.push({
          date: monthStart,
          windowStart: monthStart,
          windowEnd: endOfMonth(monthStart),
          occurrenceIndexInMonth: 0,
        });
      }
      monthStart = addDays(endOfMonth(monthStart), 1);
    }
    return occurrences;
  }

  if (template.frequency === "ONCE") {
    if (
      template.rotationAnchorDate &&
      !isBeforeDay(template.rotationAnchorDate, from) &&
      !isBeforeDay(to, template.rotationAnchorDate)
    ) {
      occurrences.push({
        date: template.rotationAnchorDate,
        windowStart: null,
        windowEnd: null,
      });
    }
    return occurrences;
  }

  return occurrences;
}

export async function ensureInstancesInRange(from: Date, to: Date) {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  // Nunca generar instancias anteriores a la fecha de inicio del sistema: no
  // existieron responsabilidades antes de esa fecha, así que no deben
  // aparecer como "atrasadas" tareas de un pasado en el que la app ni
  // siquiera estaba configurada.
  const effectiveFrom =
    settings && isBeforeDay(from, settings.systemStartDate) ? settings.systemStartDate : from;
  if (isBeforeDay(to, effectiveFrom)) return;

  const persons = await prisma.person.findMany({
    select: { id: true, name: true },
  });
  const heluId = persons.find((p) => p.name === "Helu")?.id ?? null;
  const aleId = persons.find((p) => p.name === "Ale")?.id ?? null;

  const templates = await prisma.taskTemplate.findMany({
    where: { active: true },
  });

  for (const template of templates) {
    const occurrences = occurrencesForTemplate(template, effectiveFrom, to);
    if (occurrences.length === 0) continue;

    const anchorPersonId = template.rotationAnchorPersonId;
    const otherPersonId =
      anchorPersonId === heluId ? aleId : anchorPersonId === aleId ? heluId : null;

    const subtaskNames = Array.isArray(template.subtasks)
      ? (template.subtasks as unknown[]).filter(
          (s): s is string => typeof s === "string",
        )
      : [];
    const initialSubtaskState = subtaskNames.map((name) => ({
      name,
      done: false,
    }));

    for (const occ of occurrences) {
      const assignedPersonId = template.isShared
        ? null
        : resolveRotationPerson({
            mode: template.rotationMode as RotationMode,
            anchorDate: template.rotationAnchorDate,
            anchorPersonId,
            otherPersonId,
            date: occ.date,
            occurrenceIndexInMonth: occ.occurrenceIndexInMonth,
          });

      try {
        await prisma.taskInstance.upsert({
          where: {
            templateId_date: { templateId: template.id, date: occ.date },
          },
          update: {},
          create: {
            templateId: template.id,
            date: occ.date,
            windowStart: occ.windowStart,
            windowEnd: occ.windowEnd,
            assignedPersonId,
            subtaskState: initialSubtaskState,
          },
        });
      } catch (err) {
        // Dos pedidos concurrentes (ej. el polling de dos dispositivos a la
        // vez) pueden intentar crear la misma instancia al mismo tiempo. El
        // upsert de Prisma no es una operación atómica a nivel de base de
        // datos en todos los casos, así que una carrera puede chocar contra
        // la restricción única: eso simplemente significa que la otra
        // request ya la creó, y como no queremos pisar nada (update: {}),
        // no hay nada más que hacer.
        const isDuplicate =
          err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
        if (!isDuplicate) throw err;
      }
    }
  }
}

export type EffectiveStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "DONE"
  | "LATE"
  | "RESCHEDULED";

export function effectiveStatus(
  instance: { status: TaskStatus; date: Date; windowEnd: Date | null },
  todayDate: Date,
): EffectiveStatus {
  if (instance.status === "DONE" || instance.status === "RESCHEDULED") {
    return instance.status;
  }
  const due = instance.windowEnd ?? instance.date;
  if (isBeforeDay(due, todayDate)) return "LATE";
  return instance.status as EffectiveStatus;
}

export function daysLate(
  instance: { date: Date; windowEnd: Date | null },
  todayDate: Date,
): number {
  const due = instance.windowEnd ?? instance.date;
  return Math.max(0, diffDays(todayDate, due));
}

export type SubtaskState = { name: string; done: boolean };

export function parseSubtaskState(value: unknown): SubtaskState[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (v): v is { name?: unknown; done?: unknown } =>
        typeof v === "object" && v !== null,
    )
    .map((v) => ({
      name: typeof v.name === "string" ? v.name : "",
      done: Boolean(v.done),
    }));
}
