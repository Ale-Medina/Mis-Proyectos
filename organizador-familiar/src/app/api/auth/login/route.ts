import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { setSessionCookie, verifyPin } from "@/lib/auth";
import { badRequest } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

const schema = z.object({
  personId: z.string().min(1),
  pin: z.string().min(1),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest("Datos inválidos");

  const person = await prisma.person.findUnique({
    where: { id: parsed.data.personId },
  });
  if (!person) return badRequest("Perfil inexistente");

  const ok = await verifyPin(parsed.data.pin, person.pinHash);
  if (!ok) {
    return NextResponse.json({ error: "PIN incorrecto" }, { status: 401 });
  }

  await setSessionCookie(person.id);
  return NextResponse.json({ ok: true, person: { id: person.id, name: person.name } });
}
