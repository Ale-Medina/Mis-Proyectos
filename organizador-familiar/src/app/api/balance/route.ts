import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePerson } from "@/lib/api-helpers";
import { computeBalance } from "@/lib/balance";
import { addDays, dayKeyToDate, dateToDayKey, startOfWeekMonday, today } from "@/lib/dates";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requirePerson();
  if ("error" in auth) return auth.error;

  const url = new URL(request.url);
  const fromKey = url.searchParams.get("from");
  const toKey = url.searchParams.get("to");
  const from = fromKey ? dayKeyToDate(fromKey) : startOfWeekMonday(today());
  const to = toKey ? dayKeyToDate(toKey) : addDays(from, 6);

  const result = await computeBalance(from, to);
  const persons = await prisma.person.findMany({ select: { id: true, name: true } });

  return NextResponse.json({
    from: dateToDayKey(from),
    to: dateToDayKey(to),
    persons,
    ...result,
  });
}
