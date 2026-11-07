import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { badRequest, requirePerson } from "@/lib/api-helpers";
import { dayKeyToDate, dateToDayKey, startOfWeekMonday, today } from "@/lib/dates";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requirePerson();
  if ("error" in auth) return auth.error;
  const url = new URL(request.url);
  const weekKey = url.searchParams.get("week");
  const weekStart = weekKey ? dayKeyToDate(weekKey) : startOfWeekMonday(today());

  const items = await prisma.weeklyPlanItem.findMany({
    where: { weekStartDate: weekStart },
    include: { responsible: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    weekStartDate: dateToDayKey(weekStart),
    items: items.map((i) => ({
      id: i.id,
      title: i.title,
      type: i.type,
      responsibleId: i.responsibleId,
      responsibleName: i.responsible?.name ?? null,
      dueDate: i.dueDate ? dateToDayKey(i.dueDate) : null,
      status: i.status,
      notes: i.notes,
    })),
  });
}

const schema = z.object({
  weekStartDate: z.string().optional(),
  title: z.string().min(1),
  type: z.enum(["URGENT", "IMPORTANT", "DEVELOPMENT"]),
  responsibleId: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  notes: z.string().optional(),
});

export async function POST(request: Request) {
  const auth = await requirePerson();
  if ("error" in auth) return auth.error;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest("Datos inválidos");

  const weekStart = parsed.data.weekStartDate
    ? dayKeyToDate(parsed.data.weekStartDate)
    : startOfWeekMonday(today());

  const item = await prisma.weeklyPlanItem.create({
    data: {
      weekStartDate: weekStart,
      title: parsed.data.title,
      type: parsed.data.type,
      responsibleId: parsed.data.responsibleId ?? null,
      dueDate: parsed.data.dueDate ? dayKeyToDate(parsed.data.dueDate) : null,
      notes: parsed.data.notes,
    },
  });
  return NextResponse.json({ ok: true, id: item.id });
}
