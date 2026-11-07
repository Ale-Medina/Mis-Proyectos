import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { badRequest, notFound, requirePerson } from "@/lib/api-helpers";
import { instanceInclude, serializeInstance } from "@/lib/serialize";
import { parseSubtaskState } from "@/lib/instances";
import { dayKeyToDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("complete"),
    actualMinutes: z.number().int().positive().optional(),
    notes: z.string().optional(),
  }),
  z.object({ action: z.literal("uncomplete") }),
  z.object({
    action: z.literal("toggleSubtask"),
    index: z.number().int().nonnegative(),
    done: z.boolean(),
  }),
  z.object({ action: z.literal("reassign"), personId: z.string().nullable() }),
  z.object({ action: z.literal("reschedule"), date: z.string() }),
  z.object({
    action: z.literal("setStatus"),
    status: z.enum(["PENDING", "IN_PROGRESS"]),
  }),
  z.object({ action: z.literal("setNotes"), notes: z.string() }),
]);

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requirePerson();
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const instance = await prisma.taskInstance.findUnique({ where: { id } });
  if (!instance) return notFound("Tarea no encontrada");

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return badRequest("Datos inválidos");
  const data = parsed.data;

  if (data.action === "complete") {
    await prisma.taskInstance.update({
      where: { id },
      data: {
        status: "DONE",
        completedAt: new Date(),
        completedByPersonId: auth.person.id,
        actualMinutes: data.actualMinutes ?? instance.actualMinutes,
        notes: data.notes ?? instance.notes,
      },
    });
  } else if (data.action === "uncomplete") {
    await prisma.taskInstance.update({
      where: { id },
      data: {
        status: "PENDING",
        completedAt: null,
        completedByPersonId: null,
      },
    });
  } else if (data.action === "toggleSubtask") {
    const subtasks = parseSubtaskState(instance.subtaskState);
    if (data.index >= subtasks.length) return badRequest("Subtarea inexistente");
    subtasks[data.index] = { ...subtasks[data.index], done: data.done };
    await prisma.taskInstance.update({
      where: { id },
      data: { subtaskState: subtasks },
    });
  } else if (data.action === "reassign") {
    await prisma.taskInstance.update({
      where: { id },
      data: { assignedPersonId: data.personId },
    });
  } else if (data.action === "reschedule") {
    const newDate = dayKeyToDate(data.date);
    await prisma.$transaction(async (tx) => {
      await tx.taskInstance.update({
        where: { id },
        data: { status: "RESCHEDULED", rescheduledDate: newDate },
      });
      await tx.taskInstance.upsert({
        where: {
          templateId_date: { templateId: instance.templateId, date: newDate },
        },
        update: {},
        create: {
          templateId: instance.templateId,
          date: newDate,
          windowStart: null,
          windowEnd: null,
          assignedPersonId: instance.assignedPersonId,
          subtaskState: instance.subtaskState as object,
        },
      });
    });
  } else if (data.action === "setStatus") {
    await prisma.taskInstance.update({ where: { id }, data: { status: data.status } });
  } else if (data.action === "setNotes") {
    await prisma.taskInstance.update({ where: { id }, data: { notes: data.notes } });
  }

  const updated = await prisma.taskInstance.findUniqueOrThrow({
    where: { id },
    include: instanceInclude,
  });
  return NextResponse.json({ task: serializeInstance(updated) });
}
