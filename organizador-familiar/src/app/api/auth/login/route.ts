import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { setSessionCookie } from "@/lib/auth";
import { badRequest } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

const schema = z.object({
  personId: z.string().min(1),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest("Datos inválidos");

  const person = await prisma.person.findUnique({
    where: { id: parsed.data.personId },
  });
  if (!person) return badRequest("Perfil inexistente");

  try {
    await setSessionCookie(person.id);
  } catch (err) {
    // Si falta SESSION_SECRET (o es muy corto) en las variables de entorno,
    // esto explota al firmar la cookie. Devolver el motivo en vez de un 500
    // mudo ahorra horas de diagnóstico a ciegas.
    const message = err instanceof Error ? err.message : "Error desconocido al crear la sesión";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, person: { id: person.id, name: person.name } });
}
