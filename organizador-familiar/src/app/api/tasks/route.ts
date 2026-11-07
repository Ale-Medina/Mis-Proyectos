import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePerson } from "@/lib/api-helpers";
import { ensureInstancesInRange } from "@/lib/instances";
import { instanceInclude, serializeInstance } from "@/lib/serialize";
import { addDays, dayKeyToDate, dateToDayKey, nowDayKey, today } from "@/lib/dates";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requirePerson();
  if ("error" in auth) return auth.error;

  const url = new URL(request.url);
  const fromKey = url.searchParams.get("from") ?? nowDayKey();
  const toKey = url.searchParams.get("to") ?? dateToDayKey(addDays(today(), 14));
  const from = dayKeyToDate(fromKey);
  const to = dayKeyToDate(toKey);

  await ensureInstancesInRange(from, to);

  const [rangeInstances, oldPending] = await Promise.all([
    prisma.taskInstance.findMany({
      where: { date: { gte: from, lte: to } },
      include: instanceInclude,
      orderBy: { date: "asc" },
    }),
    prisma.taskInstance.findMany({
      where: { date: { lt: from }, status: { in: ["PENDING", "IN_PROGRESS"] } },
      include: instanceInclude,
      orderBy: { date: "asc" },
    }),
  ]);

  const tasks = [...oldPending, ...rangeInstances].map(serializeInstance);
  return NextResponse.json({ tasks });
}
