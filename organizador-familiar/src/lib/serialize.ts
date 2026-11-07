import { dateToDayKey, today } from "./dates";
import { daysLate, effectiveStatus, parseSubtaskState } from "./instances";
import type { Prisma } from "@prisma/client";

const instanceInclude = {
  template: { include: { category: true } },
  assignedPerson: { select: { id: true, name: true, colorHex: true } },
  completedByPerson: { select: { id: true, name: true, colorHex: true } },
} satisfies Prisma.TaskInstanceInclude;

export type InstanceWithRelations = Prisma.TaskInstanceGetPayload<{
  include: typeof instanceInclude;
}>;

export { instanceInclude };

export function serializeInstance(instance: InstanceWithRelations) {
  const todayDate = today();
  return {
    id: instance.id,
    templateId: instance.templateId,
    templateName: instance.template.name,
    description: instance.template.description,
    categoryId: instance.template.categoryId,
    categoryName: instance.template.category.name,
    categoryColorKey: instance.template.category.colorKey,
    balanceGroup: instance.template.category.balanceGroup,
    date: dateToDayKey(instance.date),
    windowStart: instance.windowStart ? dateToDayKey(instance.windowStart) : null,
    windowEnd: instance.windowEnd ? dateToDayKey(instance.windowEnd) : null,
    scheduleType: instance.template.scheduleType,
    orientativeTime: instance.template.orientativeTime,
    durationMinutes: instance.template.durationMinutes,
    isShared: instance.template.isShared,
    isCore: instance.template.isCore,
    assignedPersonId: instance.assignedPersonId,
    assignedPersonName: instance.assignedPerson?.name ?? null,
    assignedPersonColor: instance.assignedPerson?.colorHex ?? null,
    status: instance.status,
    effectiveStatus: effectiveStatus(instance, todayDate),
    daysLate: daysLate(instance, todayDate),
    completedAt: instance.completedAt?.toISOString() ?? null,
    completedByPersonId: instance.completedByPersonId,
    completedByPersonName: instance.completedByPerson?.name ?? null,
    actualMinutes: instance.actualMinutes,
    notes: instance.notes,
    subtaskState: parseSubtaskState(instance.subtaskState),
    rescheduledDate: instance.rescheduledDate
      ? dateToDayKey(instance.rescheduledDate)
      : null,
  };
}

export type SerializedInstance = ReturnType<typeof serializeInstance>;
