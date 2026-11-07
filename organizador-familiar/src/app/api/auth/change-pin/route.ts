import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPin, verifyPin } from "@/lib/auth";
import { badRequest, requirePerson } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

const schema = z.object({
  currentPin: z.string().min(1),
  newPin: z.string().min(4).max(12),
});

export async function POST(request: Request) {
  const auth = await requirePerson();
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest("Datos inválidos (el PIN debe tener 4 a 12 caracteres)");

  const person = await prisma.person.findUnique({ where: { id: auth.person.id } });
  if (!person) return badRequest("Perfil inexistente");

  const ok = await verifyPin(parsed.data.currentPin, person.pinHash);
  if (!ok) return NextResponse.json({ error: "PIN actual incorrecto" }, { status: 401 });

  const newHash = await hashPin(parsed.data.newPin);
  await prisma.person.update({ where: { id: person.id }, data: { pinHash: newHash } });

  return NextResponse.json({ ok: true });
}
