import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { badRequest, requirePerson } from "@/lib/api-helpers";
import { addDays, dayKeyToDate, dateToDayKey, nowDayKey } from "@/lib/dates";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requirePerson();
  if ("error" in auth) return auth.error;
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? "14");
  const toKey = url.searchParams.get("to") ?? nowDayKey();
  const to = dayKeyToDate(toKey);
  const from = addDays(to, -limit);

  const logs = await prisma.nightLog.findMany({
    where: { date: { gte: from, lte: to } },
    include: { attendedBy: { select: { name: true } } },
    orderBy: { date: "desc" },
  });

  return NextResponse.json({
    logs: logs.map((l) => ({
      date: dateToDayKey(l.date),
      restHelu: l.restHelu,
      restAle: l.restAle,
      wakeupsCount: l.wakeupsCount,
      attendedById: l.attendedById,
      attendedByName: l.attendedBy?.name ?? null,
      longFeeding: l.longFeeding,
      morningRecoveryNotes: l.morningRecoveryNotes,
      notes: l.notes,
    })),
  });
}

const schema = z.object({
  date: z.string(),
  restHelu: z.enum(["GOOD", "REGULAR", "BAD"]).nullable().optional(),
  restAle: z.enum(["GOOD", "REGULAR", "BAD"]).nullable().optional(),
  wakeupsCount: z.number().int().min(0).nullable().optional(),
  attendedById: z.string().nullable().optional(),
  longFeeding: z.boolean().nullable().optional(),
  morningRecoveryNotes: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function PUT(request: Request) {
  const auth = await requirePerson();
  if ("error" in auth) return auth.error;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest("Datos inválidos");

  const { date: dateKey, ...rest } = parsed.data;
  const date = dayKeyToDate(dateKey);

  await prisma.nightLog.upsert({
    where: { date },
    update: rest,
    create: { date, ...rest },
  });
  return NextResponse.json({ ok: true });
}
