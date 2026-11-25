import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkAppPassword, setSessionCookie } from "@/lib/auth";
import { badRequest } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

const schema = z.object({
  personId: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest("Datos inválidos");

  let passwordOk: boolean;
  try {
    passwordOk = checkAppPassword(parsed.data.password);
  } catch {
    return NextResponse.json(
      { error: "La app no tiene configurada la contraseña (APP_PASSWORD)." },
      { status: 500 },
    );
  }
  if (!passwordOk) {
    return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
  }

  const person = await prisma.person.findUnique({
    where: { id: parsed.data.personId },
  });
  if (!person) return badRequest("Perfil inexistente");

  await setSessionCookie(person.id);
  return NextResponse.json({ ok: true, person: { id: person.id, name: person.name } });
}
