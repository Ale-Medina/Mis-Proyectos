import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

const COOKIE_NAME = "ofam_session";
const SESSION_DAYS = 180;

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "SESSION_SECRET no está configurado (o es muy corto). Definilo en .env.",
    );
  }
  return new TextEncoder().encode(secret);
}

// El PIN quedó sin uso (login es solo por perfil), pero el esquema todavía
// guarda un hash en Person.pinHash por compatibilidad con el seed; se
// mantiene esta función para generarlo ahí.
export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 10);
}

export async function createSessionToken(personId: string): Promise<string> {
  return new SignJWT({ personId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secretKey());
}

export async function verifySessionToken(
  token: string,
): Promise<{ personId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (typeof payload.personId === "string") {
      return { personId: payload.personId };
    }
    return null;
  } catch {
    return null;
  }
}

export async function setSessionCookie(personId: string) {
  const token = await createSessionToken(personId);
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSessionPersonId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  return session?.personId ?? null;
}

export type CurrentPerson = {
  id: string;
  name: string;
  colorHex: string;
};

export async function getCurrentPerson(): Promise<CurrentPerson | null> {
  const personId = await getSessionPersonId();
  if (!personId) return null;
  const person = await prisma.person.findUnique({
    where: { id: personId },
    select: { id: true, name: true, colorHex: true },
  });
  return person ?? null;
}

/** Devuelve la "otra" persona (la app está pensada para exactamente 2 perfiles). */
export async function getOtherPerson(
  currentPersonId: string,
): Promise<CurrentPerson | null> {
  const person = await prisma.person.findFirst({
    where: { id: { not: currentPersonId } },
    select: { id: true, name: true, colorHex: true },
  });
  return person ?? null;
}
