import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { badRequest, requirePerson } from "@/lib/api-helpers";
import { dayKeyToDate, dateToDayKey } from "@/lib/dates";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePerson();
  if ("error" in auth) return auth.error;
  const settings = await prisma.settings.findUniqueOrThrow({ where: { id: 1 } });
  return NextResponse.json({
    settings: {
      timezone: settings.timezone,
      systemStartDate: dateToDayKey(settings.systemStartDate),
      defaultWakeTime: settings.defaultWakeTime,
      trialPeriodWeeks: settings.trialPeriodWeeks,
    },
  });
}

const schema = z.object({
  systemStartDate: z.string().optional(),
  defaultWakeTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  trialPeriodWeeks: z.number().int().positive().optional(),
});

export async function PUT(request: Request) {
  const auth = await requirePerson();
  if ("error" in auth) return auth.error;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest("Datos inválidos");

  await prisma.settings.update({
    where: { id: 1 },
    data: {
      ...(parsed.data.systemStartDate
        ? { systemStartDate: dayKeyToDate(parsed.data.systemStartDate) }
        : {}),
      ...(parsed.data.defaultWakeTime ? { defaultWakeTime: parsed.data.defaultWakeTime } : {}),
      ...(parsed.data.trialPeriodWeeks ? { trialPeriodWeeks: parsed.data.trialPeriodWeeks } : {}),
    },
  });
  return NextResponse.json({ ok: true });
}
