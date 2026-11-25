"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiGet, apiSend } from "@/lib/api-client";
import type { Person } from "@/lib/types";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [persons, setPersons] = useState<Person[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    apiGet<{ persons: Person[] }>("/api/auth/profiles")
      .then((data) => setPersons(data.persons))
      .catch(() => setError("No se pudo conectar con el servidor."));
  }, []);

  async function enter(person: Person) {
    setLoadingId(person.id);
    setError(null);
    try {
      await apiSend("/api/auth/login", "POST", { personId: person.id });
      const next = searchParams.get("next") || "/dia";
      router.push(next);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo iniciar sesión");
      setLoadingId(null);
    }
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-6 py-12 gap-8">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-extrabold">Organizador Familiar</h1>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Hogar, cuidado y trabajo entre los dos
        </p>
      </div>

      <div className="w-full max-w-xs flex flex-col gap-3">
        <p className="text-center text-sm font-medium" style={{ color: "var(--muted)" }}>
          ¿Quién sos?
        </p>
        {persons.map((p) => (
          <button
            key={p.id}
            onClick={() => enter(p)}
            disabled={loadingId !== null}
            className="surface flex items-center gap-3 px-5 py-4 text-left transition active:scale-[0.98] disabled:opacity-60"
          >
            <span
              className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: p.colorHex }}
            >
              {p.name.charAt(0)}
            </span>
            <span className="font-semibold text-lg">
              {p.name}
              {loadingId === p.id ? "…" : ""}
            </span>
          </button>
        ))}
        {persons.length === 0 && !error && (
          <p className="text-center text-sm" style={{ color: "var(--muted)" }}>
            Cargando perfiles…
          </p>
        )}
        {error && (
          <p className="text-sm text-center" style={{ color: "var(--danger)" }}>
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
