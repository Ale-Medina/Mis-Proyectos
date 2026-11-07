import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const persons = await prisma.person.findMany({
    select: { id: true, name: true, colorHex: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ persons });
}
