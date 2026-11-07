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
  const limit = Number(url.searchParams.get("limit") ?? "15");
  const logs = await prisma.compensatoryRestLog.findMany({
    orderBy: { date: "desc" },
    take: limit,
  });
  return NextResponse.json({
    logs: logs.map((l) => ({
      id: l.id,
      date: dateToDayKey(l.date),
      startTime: l.startTime,
      endTime: l.endTime,
      careMinutesByAle: l.careMinutesByAle,
      restMinutesForHelu: l.restMinutesForHelu,
      notes: l.notes,
    })),
  });
}

const schema = z.object({
  date: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  careMinutesByAle: z.number().int().nonnegative().optional(),
  restMinutesForHelu: z.number().int().nonnegative().optional(),
  notes: z.string().optional(),
});

export async function POST(request: Request) {
  const auth = await requirePerson();
  if ("error" in auth) return auth.error;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest("Datos inválidos");

  const log = await prisma.compensatoryRestLog.create({
    data: {
      date: dayKeyToDate(parsed.data.date ?? nowDayKey()),
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      careMinutesByAle: parsed.data.careMinutesByAle,
      restMinutesForHelu: parsed.data.restMinutesForHelu,
      notes: parsed.data.notes,
      createdById: auth.person.id,
    },
  });
  return NextResponse.json({ ok: true, id: log.id });
}
