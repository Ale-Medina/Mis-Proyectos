"use client";

import { useState } from "react";
import useSWR from "swr";
import { apiSend, swrFetcher } from "@/lib/api-client";
import { addDays, dateToDayKey, formatDMY, dayKeyToDate, today } from "@/lib/dates";
import { useMe } from "@/hooks/useMe";
import { Section } from "@/components/Section";
import type { NightLogEntry } from "@/lib/types";

type Quality = "GOOD" | "REGULAR" | "BAD" | "";

const QUALITY_LABEL: Record<"GOOD" | "REGULAR" | "BAD", string> = {
  GOOD: "Bueno",
  REGULAR: "Regular",
  BAD: "Malo",
};

export default function NochePage() {
  const { me, other } = useMe();
  const [dateKey, setDateKey] = useState(() => dateToDayKey(addDays(today(), -1)));

  const { data: logsData, mutate } = useSWR<{ logs: NightLogEntry[] }>(
    "/api/night-log?limit=15",
    swrFetcher,
  );
  const existing = logsData?.logs.find((l) => l.date === dateKey);

  const [restHelu, setRestHelu] = useState<Quality>(existing?.restHelu ?? "");
  const [restAle, setRestAle] = useState<Quality>(existing?.restAle ?? "");
  const [wakeups, setWakeups] = useState(existing?.wakeupsCount != null ? String(existing.wakeupsCount) : "");
  const [attendedById, setAttendedById] = useState(existing?.attendedById ?? "");
  const [longFeeding, setLongFeeding] = useState(Boolean(existing?.longFeeding));
  const [recoveryNotes, setRecoveryNotes] = useState(existing?.morningRecoveryNotes ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");

  // Patrón de React para "ajustar estado cuando cambia una prop" (acá, la
  // fecha elegida o la llegada de datos nuevos) sin useEffect: se detecta el
  // cambio durante el render, en vez de disparar un setState en un efecto.
  const [syncedKey, setSyncedKey] = useState(`${dateKey}:${logsData ? "loaded" : "loading"}`);
  const currentKey = `${dateKey}:${logsData ? "loaded" : "loading"}`;
  if (currentKey !== syncedKey) {
    setSyncedKey(currentKey);
    setRestHelu(existing?.restHelu ?? "");
    setRestAle(existing?.restAle ?? "");
    setWakeups(existing?.wakeupsCount != null ? String(existing.wakeupsCount) : "");
    setAttendedById(existing?.attendedById ?? "");
    setLongFeeding(Boolean(existing?.longFeeding));
    setRecoveryNotes(existing?.morningRecoveryNotes ?? "");
    setNotes(existing?.notes ?? "");
  }

  async function save() {
    await apiSend("/api/night-log", "PUT", {
      date: dateKey,
      restHelu: restHelu || null,
      restAle: restAle || null,
      wakeupsCount: wakeups ? Number(wakeups) : null,
      attendedById: attendedById || null,
      longFeeding,
      morningRecoveryNotes: recoveryNotes || null,
      notes: notes || null,
    });
    mutate();
  }

  return (
    <div className="pt-1 pb-6">
      <h1 className="text-xl font-extrabold mb-4">Registro nocturno</h1>

      <Section title="Noche a registrar">
        <div className="surface px-4 py-3 flex items-center gap-3">
          <button className="surface px-2 py-1 text-sm" onClick={() => setDateKey((d) => dateToDayKey(addDays(dayKeyToDate(d), -1)))}>
            ‹
          </button>
          <span className="flex-1 text-center text-sm font-semibold">{formatDMY(dayKeyToDate(dateKey))}</span>
          <button className="surface px-2 py-1 text-sm" onClick={() => setDateKey((d) => dateToDayKey(addDays(dayKeyToDate(d), 1)))}>
            ›
          </button>
        </div>
      </Section>

      <Section title="¿Cómo durmió cada uno?">
        <div className="surface px-4 py-3 flex flex-col gap-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span>{me?.name ?? "Helu"} — descanso</span>
            <div className="flex gap-1">
              {(["GOOD", "REGULAR", "BAD"] as const).map((q) => (
                <button
                  key={q}
                  onClick={() => setRestHelu(q)}
                  className="text-xs px-2.5 py-1 rounded-full"
                  style={{
                    backgroundColor: restHelu === q ? "var(--accent)" : "var(--surface)",
                    color: restHelu === q ? "white" : "var(--foreground)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {QUALITY_LABEL[q]}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span>{other?.name ?? "Ale"} — descanso</span>
            <div className="flex gap-1">
              {(["GOOD", "REGULAR", "BAD"] as const).map((q) => (
                <button
                  key={q}
                  onClick={() => setRestAle(q)}
                  className="text-xs px-2.5 py-1 rounded-full"
                  style={{
                    backgroundColor: restAle === q ? "var(--accent-ale)" : "var(--surface)",
                    color: restAle === q ? "white" : "var(--foreground)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {QUALITY_LABEL[q]}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center justify-between gap-2">
            Cantidad aproximada de despertares
            <input
              type="number"
              min={0}
              value={wakeups}
              onChange={(e) => setWakeups(e.target.value)}
              className="surface px-2 py-1 w-20 text-right"
            />
          </label>

          <label className="flex items-center justify-between gap-2">
            ¿Quién atendió principalmente?
            <select value={attendedById} onChange={(e) => setAttendedById(e.target.value)} className="surface px-2 py-1">
              <option value="">—</option>
              {me && <option value={me.id}>{me.name}</option>}
              {other && <option value={other.id}>{other.name}</option>}
            </select>
          </label>

          <label className="flex items-center gap-2">
            <input type="checkbox" checked={longFeeding} onChange={(e) => setLongFeeding(e.target.checked)} className="h-4 w-4" />
            Hubo tomas de pecho prolongadas
          </label>

          <label className="flex flex-col gap-1">
            ¿Alguien recuperó descanso por la mañana?
            <input value={recoveryNotes} onChange={(e) => setRecoveryNotes(e.target.value)} className="surface px-2 py-1.5" placeholder="Opcional" />
          </label>

          <label className="flex flex-col gap-1">
            Notas
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="surface px-2 py-1.5" rows={2} placeholder="Opcional" />
          </label>

          <button onClick={save} className="self-start text-sm font-semibold px-4 py-2 rounded-full text-white" style={{ backgroundColor: "var(--accent)" }}>
            Guardar
          </button>
        </div>
      </Section>

      <Section title="Historial reciente">
        <div className="flex flex-col gap-1.5">
          {logsData?.logs.map((l) => (
            <div key={l.date} className="surface px-3 py-2 text-xs flex justify-between flex-wrap gap-1">
              <span className="font-semibold">{formatDMY(dayKeyToDate(l.date))}</span>
              <span>
                Helu: {l.restHelu ? QUALITY_LABEL[l.restHelu] : "—"} · Ale: {l.restAle ? QUALITY_LABEL[l.restAle] : "—"}
                {l.attendedByName ? ` · atendió ${l.attendedByName}` : ""}
                {l.wakeupsCount != null ? ` · ${l.wakeupsCount} desp.` : ""}
              </span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
