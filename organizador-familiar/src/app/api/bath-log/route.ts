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
  const limit = Number(url.searchParams.get("limit") ?? "10");
  const logs = await prisma.bathLog.findMany({
    include: { person: { select: { name: true } } },
    orderBy: { date: "desc" },
    take: limit,
  });
  return NextResponse.json({
    logs: logs.map((l) => ({
      id: l.id,
      date: dateToDayKey(l.date),
      personId: l.personId,
      personName: l.person.name,
      notes: l.notes,
    })),
  });
}

const schema = z.object({
  date: z.string().optional(),
  personId: z.string(),
  notes: z.string().optional(),
});

export async function POST(request: Request) {
  const auth = await requirePerson();
  if ("error" in auth) return auth.error;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest("Datos inválidos");

  const log = await prisma.bathLog.create({
    data: {
      date: dayKeyToDate(parsed.data.date ?? nowDayKey()),
      personId: parsed.data.personId,
      notes: parsed.data.notes,
    },
  });
  return NextResponse.json({ ok: true, id: log.id });
}
