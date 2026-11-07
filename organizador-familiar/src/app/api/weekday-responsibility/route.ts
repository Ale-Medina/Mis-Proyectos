import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { badRequest, requirePerson } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePerson();
  if ("error" in auth) return auth.error;
  const rows = await prisma.weekdayResponsibility.findMany({
    include: { person: { select: { id: true, name: true } } },
    orderBy: [{ kind: "asc" }, { dayOfWeek: "asc" }],
  });
  return NextResponse.json({
    items: rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      dayOfWeek: r.dayOfWeek,
      personId: r.personId,
      personName: r.person?.name ?? null,
    })),
  });
}

const schema = z.object({
  kind: z.enum(["WORK_BLOCK", "LUNCH"]),
  dayOfWeek: z.number().int().min(0).max(6),
  personId: z.string().nullable(),
});

export async function PUT(request: Request) {
  const auth = await requirePerson();
  if ("error" in auth) return auth.error;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest("Datos inválidos");

  await prisma.weekdayResponsibility.upsert({
    where: {
      kind_dayOfWeek: { kind: parsed.data.kind, dayOfWeek: parsed.data.dayOfWeek },
    },
    update: { personId: parsed.data.personId },
    create: {
      kind: parsed.data.kind,
      dayOfWeek: parsed.data.dayOfWeek,
      personId: parsed.data.personId,
    },
  });
  return NextResponse.json({ ok: true });
}
