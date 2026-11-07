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
  const [selected, setSelected] = useState<Person | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiGet<{ persons: Person[] }>("/api/auth/profiles")
      .then((data) => setPersons(data.persons))
      .catch(() => setError("No se pudo conectar con el servidor."));
  }, []);

  async function submit() {
    if (!selected) return;
    setLoading(true);
    setError(null);
    try {
      await apiSend("/api/auth/login", "POST", { personId: selected.id, pin });
      const next = searchParams.get("next") || "/dia";
      router.push(next);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo iniciar sesión");
      setPin("");
    } finally {
      setLoading(false);
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

      {!selected ? (
        <div className="w-full max-w-xs flex flex-col gap-3">
          <p className="text-center text-sm font-medium" style={{ color: "var(--muted)" }}>
            ¿Quién sos?
          </p>
          {persons.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelected(p)}
              className="surface flex items-center gap-3 px-5 py-4 text-left transition active:scale-[0.98]"
            >
              <span
                className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: p.colorHex }}
              >
                {p.name.charAt(0)}
              </span>
              <span className="font-semibold text-lg">{p.name}</span>
            </button>
          ))}
          {persons.length === 0 && !error && (
            <p className="text-center text-sm" style={{ color: "var(--muted)" }}>
              Cargando perfiles…
            </p>
          )}
        </div>
      ) : (
        <div className="w-full max-w-xs flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="h-8 w-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: selected.colorHex }}
              >
                {selected.name.charAt(0)}
              </span>
              <span className="font-semibold">{selected.name}</span>
            </div>
            <button
              className="text-sm underline"
              style={{ color: "var(--muted)" }}
              onClick={() => {
                setSelected(null);
                setPin("");
                setError(null);
              }}
            >
              Cambiar
            </button>
          </div>

          <input
            autoFocus
            type="password"
            inputMode="numeric"
            placeholder="PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            className="surface w-full text-center text-2xl tracking-[0.5em] py-3 outline-none"
            maxLength={8}
          />

          {error && (
            <p className="text-sm text-center" style={{ color: "var(--danger)" }}>
              {error}
            </p>
          )}

          <button
            onClick={submit}
            disabled={loading || pin.length < 4}
            className="rounded-full py-3 font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
            style={{ backgroundColor: "var(--accent)" }}
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>

          <p className="text-xs text-center" style={{ color: "var(--muted)" }}>
            PIN de fábrica: 1234 (cambiarlo en Configuración)
          </p>
        </div>
      )}
    </main>
  );
}
