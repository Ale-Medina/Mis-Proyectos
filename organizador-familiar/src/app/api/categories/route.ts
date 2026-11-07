import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { badRequest, requirePerson } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePerson();
  if ("error" in auth) return auth.error;
  const categories = await prisma.category.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json({ categories });
}

const schema = z.object({
  name: z.string().min(1),
  balanceGroup: z.enum(["WORK", "HOUSEHOLD", "CHILDCARE", "NIGHT", "PERSONAL"]),
  colorKey: z.string().min(1),
});

export async function POST(request: Request) {
  const auth = await requirePerson();
  if ("error" in auth) return auth.error;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest("Datos inválidos");

  const count = await prisma.category.count();
  const category = await prisma.category.create({
    data: { ...parsed.data, sortOrder: count + 1 },
  });
  return NextResponse.json({ ok: true, category });
}
