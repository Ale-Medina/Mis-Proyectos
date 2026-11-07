import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { badRequest, requirePerson } from "@/lib/api-helpers";
import { dayKeyToDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const schema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  categoryId: z.string().min(1).optional(),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "ONCE"]).optional(),
  daysOfWeek: z.string().nullable().optional(),
  occurrencesPerMonth: z.number().int().min(1).max(2).optional(),
  scheduleType: z
    .enum(["FIXED_TIME", "ORIENTATIVE_TIME", "TARGET_DATE", "FLEXIBLE_WINDOW"])
    .optional(),
  orientativeTime: z.string().nullable().optional(),
  durationMinutes: z.number().int().positive().optional(),
  rotationMode: z
    .enum([
      "NONE",
      "FIXED",
      "DAILY_ALTERNATE",
      "WEEKLY_ALTERNATE",
      "MONTHLY_ALTERNATE",
      "MONTHLY_SPLIT_ALTERNATE",
    ])
    .optional(),
  rotationAnchorDate: z.string().nullable().optional(),
  rotationAnchorPersonId: z.string().nullable().optional(),
  isShared: z.boolean().optional(),
  isCore: z.boolean().optional(),
  active: z.boolean().optional(),
  subtasks: z.array(z.string()).optional(),
  sortOrder: z.number().int().optional(),
});

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requirePerson();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Datos inválidos");

  const { rotationAnchorDate, ...rest } = parsed.data;
  await prisma.taskTemplate.update({
    where: { id },
    data: {
      ...rest,
      ...(rotationAnchorDate !== undefined
        ? { rotationAnchorDate: rotationAnchorDate ? dayKeyToDate(rotationAnchorDate) : null }
        : {}),
    },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requirePerson();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  // No se borra físicamente (preserva historial de instancias ya generadas):
  // se desactiva para que deje de generar nuevas instancias.
  await prisma.taskTemplate.update({ where: { id }, data: { active: false } });
  return NextResponse.json({ ok: true });
}
