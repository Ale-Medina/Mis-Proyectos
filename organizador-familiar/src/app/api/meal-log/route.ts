import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { badRequest, requirePerson } from "@/lib/api-helpers";
import { dayKeyToDate, dateToDayKey, nowDayKey } from "@/lib/dates";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requirePerson();
  if ("error" in auth) return auth.error;
  const url = new URL(request.url);
  const dateKey = url.searchParams.get("date") ?? nowDayKey();
  const logs = await prisma.mealLog.findMany({
    where: { date: dayKeyToDate(dateKey) },
    include: { person: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({
    logs: logs.map((l) => ({
      id: l.id,
      date: dateToDayKey(l.date),
      personId: l.personId,
      personName: l.person.name,
      description: l.description,
      cleanedUp: l.cleanedUp,
    })),
  });
}

const schema = z.object({
  date: z.string().optional(),
  description: z.string().optional(),
  cleanedUp: z.boolean().optional(),
});

export async function POST(request: Request) {
  const auth = await requirePerson();
  if ("error" in auth) return auth.error;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest("Datos inválidos");

  const log = await prisma.mealLog.create({
    data: {
      date: dayKeyToDate(parsed.data.date ?? nowDayKey()),
      personId: auth.person.id,
      description: parsed.data.description,
      cleanedUp: parsed.data.cleanedUp ?? true,
    },
  });
  return NextResponse.json({ ok: true, id: log.id });
}
