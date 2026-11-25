import { NextResponse } from "next/server";
import { z } from "zod";
import { checkAppPassword } from "@/lib/auth";
import { badRequest } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

const schema = z.object({ password: z.string().min(1) });

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest("Datos inválidos");

  let ok: boolean;
  try {
    ok = checkAppPassword(parsed.data.password);
  } catch {
    return NextResponse.json(
      { error: "La app no tiene configurada la contraseña (APP_PASSWORD)." },
      { status: 500 },
    );
  }

  if (!ok) {
    return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
