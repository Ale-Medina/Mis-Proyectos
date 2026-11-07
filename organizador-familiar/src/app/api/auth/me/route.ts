import { NextResponse } from "next/server";
import { getCurrentPerson, getOtherPerson } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const person = await getCurrentPerson();
  if (!person) return NextResponse.json({ person: null, other: null });
  const other = await getOtherPerson(person.id);
  return NextResponse.json({ person, other });
}
