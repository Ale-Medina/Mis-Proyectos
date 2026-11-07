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
  const log = await prisma.dailyLog.findUnique({ where: { date: dayKeyToDate(dateKey) } });
  if (!log) {
    const settings = await prisma.settings.findUniqueOrThrow({ where: { id: 1 } });
    return NextResponse.json({
      log: { date: dateKey, wakeTime: settings.defaultWakeTime, notes: null, isDefault: true },
    });
  }
  return NextResponse.json({
    log: {
      date: dateToDayKey(log.date),
      wakeTime: log.wakeTime,
      notes: log.notes,
      isDefault: false,
    },
  });
}

const schema = z.object({
  date: z.string(),
  wakeTime: z.string().regex(/^\d{2}:\d{2}$/),
  notes: z.string().optional(),
});

export async function PUT(request: Request) {
  const auth = await requirePerson();
  if ("error" in auth) return auth.error;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest("Datos inválidos");

  const date = dayKeyToDate(parsed.data.date);
  await prisma.dailyLog.upsert({
    where: { date },
    update: { wakeTime: parsed.data.wakeTime, notes: parsed.data.notes, loggedById: auth.person.id },
    create: {
      date,
      wakeTime: parsed.data.wakeTime,
      notes: parsed.data.notes,
      loggedById: auth.person.id,
    },
  });
  return NextResponse.json({ ok: true });
}
