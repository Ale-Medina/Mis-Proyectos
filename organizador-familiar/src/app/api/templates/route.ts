import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { badRequest, requirePerson } from "@/lib/api-helpers";
import { dateToDayKey, dayKeyToDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePerson();
  if ("error" in auth) return auth.error;
  const templates = await prisma.taskTemplate.findMany({
    include: { category: true, rotationAnchorPerson: { select: { id: true, name: true } } },
    orderBy: [{ categoryId: "asc" }, { sortOrder: "asc" }],
  });
  return NextResponse.json({
    templates: templates.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      categoryId: t.categoryId,
      categoryName: t.category.name,
      frequency: t.frequency,
      daysOfWeek: t.daysOfWeek,
      occurrencesPerMonth: t.occurrencesPerMonth,
      scheduleType: t.scheduleType,
      orientativeTime: t.orientativeTime,
      durationMinutes: t.durationMinutes,
      rotationMode: t.rotationMode,
      rotationAnchorDate: t.rotationAnchorDate ? dateToDayKey(t.rotationAnchorDate) : null,
      rotationAnchorPersonId: t.rotationAnchorPersonId,
      rotationAnchorPersonName: t.rotationAnchorPerson?.name ?? null,
      isShared: t.isShared,
      isCore: t.isCore,
      active: t.active,
      subtasks: t.subtasks,
      sortOrder: t.sortOrder,
    })),
  });
}

const schema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  categoryId: z.string().min(1),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "ONCE"]),
  daysOfWeek: z.string().nullable().optional(),
  occurrencesPerMonth: z.number().int().min(1).max(2).optional(),
  scheduleType: z
    .enum(["FIXED_TIME", "ORIENTATIVE_TIME", "TARGET_DATE", "FLEXIBLE_WINDOW"])
    .optional(),
  orientativeTime: z.string().nullable().optional(),
  durationMinutes: z.number().int().positive(),
  rotationMode: z.enum([
    "NONE",
    "FIXED",
    "DAILY_ALTERNATE",
    "WEEKLY_ALTERNATE",
    "MONTHLY_ALTERNATE",
    "MONTHLY_SPLIT_ALTERNATE",
  ]),
  rotationAnchorDate: z.string().nullable().optional(),
  rotationAnchorPersonId: z.string().nullable().optional(),
  isShared: z.boolean().optional(),
  isCore: z.boolean().optional(),
  active: z.boolean().optional(),
  subtasks: z.array(z.string()).optional(),
  sortOrder: z.number().int().optional(),
});

export async function POST(request: Request) {
  const auth = await requirePerson();
  if ("error" in auth) return auth.error;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Datos inválidos");

  const t = await prisma.taskTemplate.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description ?? "",
      categoryId: parsed.data.categoryId,
      frequency: parsed.data.frequency,
      daysOfWeek: parsed.data.daysOfWeek ?? null,
      occurrencesPerMonth: parsed.data.occurrencesPerMonth ?? 1,
      scheduleType: parsed.data.scheduleType ?? "ORIENTATIVE_TIME",
      orientativeTime: parsed.data.orientativeTime ?? null,
      durationMinutes: parsed.data.durationMinutes,
      rotationMode: parsed.data.rotationMode,
      rotationAnchorDate: parsed.data.rotationAnchorDate
        ? dayKeyToDate(parsed.data.rotationAnchorDate)
        : null,
      rotationAnchorPersonId: parsed.data.rotationAnchorPersonId ?? null,
      isShared: parsed.data.isShared ?? false,
      isCore: parsed.data.isCore ?? false,
      active: parsed.data.active ?? true,
      subtasks: parsed.data.subtasks ?? [],
      sortOrder: parsed.data.sortOrder ?? 0,
    },
  });
  return NextResponse.json({ ok: true, id: t.id });
}
