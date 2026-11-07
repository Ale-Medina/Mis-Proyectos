import { NextResponse } from "next/server";
import { getCurrentPerson, type CurrentPerson } from "./auth";

export async function requirePerson(): Promise<
  { person: CurrentPerson } | { error: NextResponse }
> {
  const person = await getCurrentPerson();
  if (!person) {
    return {
      error: NextResponse.json({ error: "No autenticado" }, { status: 401 }),
    };
  }
  return { person };
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function notFound(message = "No encontrado") {
  return NextResponse.json({ error: message }, { status: 404 });
}
