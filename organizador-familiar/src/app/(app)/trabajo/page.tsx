"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { apiSend, swrFetcher } from "@/lib/api-client";
import { addDays, addMinutesToTime, dateToDayKey, dayKeyToDate, nowDayKey, startOfWeekMonday, today } from "@/lib/dates";
import type { Person, WeekdayResponsibility, WeeklyPlanItem } from "@/lib/types";
import { Section } from "@/components/Section";

const WEEKDAY_LABELS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function useDailyLog(dateKey: string) {
  const { data, mutate } = useSWR<{ log: { date: string; wakeTime: string; notes: string | null; isDefault: boolean } }>(
    `/api/daily-log?date=${dateKey}`,
    swrFetcher,
  );
  return { log: data?.log, mutate };
}

const TYPE_LABEL: Record<WeeklyPlanItem["type"], string> = {
  URGENT: "Urgente",
  IMPORTANT: "Importante",
  DEVELOPMENT: "Desarrollo / proyectos",
};

export default function TrabajoPage() {
  const todayKey = nowDayKey();
  const { log, mutate: mutateLog } = useDailyLog(todayKey);
  const { data: respData } = useSWR<{ items: WeekdayResponsibility[] }>("/api/weekday-responsibility", swrFetcher);
  const { data: profilesData } = useSWR<{ persons: Person[] }>("/api/auth/profiles", swrFetcher);

  const [weekStart, setWeekStart] = useState(() => dateToDayKey(startOfWeekMonday(today())));
  const { data: planData, mutate: mutatePlan } = useSWR<{ items: WeeklyPlanItem[]; weekStartDate: string }>(
    `/api/weekly-plan?week=${weekStart}`,
    swrFetcher,
  );

  const [wakeInput, setWakeInput] = useState<string>("");
  const wakeTime = wakeInput || log?.wakeTime || "07:00";
  const workStart = addMinutesToTime(wakeTime, 60);
  const workEnd = addMinutesToTime(wakeTime, 60 + 150);
  const lunchRef = addMinutesToTime(wakeTime, 240);
  const napRef = addMinutesToTime(wakeTime, 60 * 5 + 15);

  const todayWeekday = today().getUTCDay();
  const workPerson = respData?.items.find((r) => r.kind === "WORK_BLOCK" && r.dayOfWeek === todayWeekday);
  const lunchPerson = respData?.items.find((r) => r.kind === "LUNCH" && r.dayOfWeek === todayWeekday);

  async function saveWake() {
    await apiSend("/api/daily-log", "PUT", { date: todayKey, wakeTime: wakeInput || wakeTime });
    mutateLog();
  }

  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<WeeklyPlanItem["type"]>("IMPORTANT");
  const [newResponsible, setNewResponsible] = useState("");

  async function addItem() {
    if (!newTitle.trim()) return;
    await apiSend("/api/weekly-plan", "POST", {
      weekStartDate: weekStart,
      title: newTitle.trim(),
      type: newType,
      responsibleId: newResponsible || null,
    });
    setNewTitle("");
    mutatePlan();
  }

  async function toggleItemStatus(item: WeeklyPlanItem) {
    const next = item.status === "DONE" ? "PENDING" : item.status === "PENDING" ? "IN_PROGRESS" : "DONE";
    await apiSend(`/api/weekly-plan/${item.id}`, "PATCH", { status: next });
    mutatePlan();
  }

  async function deleteItem(id: string) {
    await apiSend(`/api/weekly-plan/${id}`, "DELETE");
    mutatePlan();
  }

  return (
    <div className="pt-1 pb-6">
      <h1 className="text-xl font-extrabold mb-4">Trabajo</h1>

      <Section title="Bloque protegido de hoy">
        <div className="surface px-4 py-3 flex flex-col gap-2">
          <p className="text-sm">
            Hoy, <strong>{workPerson?.personName ?? "sin asignar"}</strong> tiene su bloque de trabajo protegido de{" "}
            <strong>{workStart}</strong> a <strong>{workEnd}</strong> (2 h 30 min).
          </p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            Mientras tanto, la otra persona queda a cargo completo del cuidado de la nena (comida, higiene, juego).
          </p>
          <div className="flex items-center gap-2 mt-1">
            <label className="text-xs" style={{ color: "var(--muted)" }}>Hora en que se despertó hoy:</label>
            <input
              type="time"
              defaultValue={log?.wakeTime ?? "07:00"}
              onChange={(e) => setWakeInput(e.target.value)}
              className="surface px-2 py-1 text-sm"
            />
            <button onClick={saveWake} className="text-xs underline" style={{ color: "var(--accent)" }}>Guardar</button>
          </div>
        </div>
      </Section>

      <Section title="Almuerzo y siesta de hoy (orientativo)">
        <div className="surface px-4 py-3 flex flex-col gap-1 text-sm">
          <p>
            Almuerzo a cargo de <strong>{lunchPerson?.personName ?? "sin asignar"}</strong>, aproximadamente a las{" "}
            <strong>{lunchRef}</strong>. No es obligación estricta de horario.
          </p>
          <p style={{ color: "var(--muted)" }}>
            Siesta orientativa desde ~{napRef} (puede adelantarse si la nena tiene sueño antes de terminar de comer).
          </p>
        </div>
      </Section>

      <Section title="Semana (trabajo / almuerzo)" action={<Link href="/configuracion" className="text-xs underline" style={{ color: "var(--muted)" }}>Editar</Link>}>
        <div className="surface overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th className="text-left px-3 py-2 font-semibold">Día</th>
                <th className="text-left px-3 py-2 font-semibold">Trabajo</th>
                <th className="text-left px-3 py-2 font-semibold">Almuerzo</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5, 6, 0].map((dow) => {
                const w = respData?.items.find((r) => r.kind === "WORK_BLOCK" && r.dayOfWeek === dow);
                const l = respData?.items.find((r) => r.kind === "LUNCH" && r.dayOfWeek === dow);
                return (
                  <tr key={dow} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td className="px-3 py-1.5">{WEEKDAY_LABELS[dow]}</td>
                    <td className="px-3 py-1.5">{w?.personName ?? "—"}</td>
                    <td className="px-3 py-1.5">{l?.personName ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        title="Planificación laboral semanal"
        action={
          <button
            onClick={() => setWeekStart(dateToDayKey(startOfWeekMonday(today())))}
            className="text-xs underline"
            style={{ color: "var(--muted)" }}
          >
            Hoy
          </button>
        }
      >
        <div className="flex items-center justify-between mb-2">
          <button
            className="surface px-3 py-1 text-xs"
            onClick={() => setWeekStart((w) => dateToDayKey(addDays(dayKeyToDate(w), -7)))}
          >
            ‹ Semana anterior
          </button>
          <span className="text-xs font-medium" style={{ color: "var(--muted)" }}>Semana del {weekStart}</span>
          <button
            className="surface px-3 py-1 text-xs"
            onClick={() => setWeekStart((w) => dateToDayKey(addDays(dayKeyToDate(w), 7)))}
          >
            Semana siguiente ›
          </button>
        </div>

        {(["URGENT", "IMPORTANT", "DEVELOPMENT"] as const).map((type) => {
          const items = planData?.items.filter((i) => i.type === type) ?? [];
          return (
            <div key={type} className="mb-3">
              <p className="text-xs font-bold mb-1" style={{ color: "var(--muted)" }}>{TYPE_LABEL[type]}</p>
              {items.length === 0 && <p className="text-xs pl-1" style={{ color: "var(--muted)" }}>Sin ítems.</p>}
              <div className="flex flex-col gap-1.5">
                {items.map((item) => (
                  <div key={item.id} className="surface px-3 py-2 flex items-center justify-between gap-2">
                    <button onClick={() => toggleItemStatus(item)} className="text-left flex-1">
                      <span className={item.status === "DONE" ? "line-through opacity-60" : ""}>{item.title}</span>
                      <span className="block text-[11px]" style={{ color: "var(--muted)" }}>
                        {item.responsibleName ?? "sin responsable"} · {item.status === "DONE" ? "hecho" : item.status === "IN_PROGRESS" ? "en curso" : "pendiente"}
                      </span>
                    </button>
                    <button onClick={() => deleteItem(item.id)} className="text-xs" style={{ color: "var(--danger)" }}>Borrar</button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        <div className="surface px-3 py-3 flex flex-col gap-2">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Nuevo ítem…"
            className="bg-transparent outline-none text-sm border-b pb-1"
            style={{ borderColor: "var(--border)" }}
          />
          <div className="flex gap-2 flex-wrap">
            <select value={newType} onChange={(e) => setNewType(e.target.value as WeeklyPlanItem["type"])} className="surface px-2 py-1 text-xs">
              <option value="URGENT">Urgente</option>
              <option value="IMPORTANT">Importante</option>
              <option value="DEVELOPMENT">Desarrollo</option>
            </select>
            <select value={newResponsible} onChange={(e) => setNewResponsible(e.target.value)} className="surface px-2 py-1 text-xs">
              <option value="">Sin responsable</option>
              {profilesData?.persons.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <button onClick={addItem} className="text-xs font-semibold px-3 py-1 rounded-full text-white" style={{ backgroundColor: "var(--accent)" }}>
              Agregar
            </button>
          </div>
        </div>
      </Section>

      <Section title="Trabajo de cada uno (referencia)">
        <div className="surface px-4 py-3 text-sm flex flex-col gap-2">
          <p><strong>Helu:</strong> redes sociales y publicidad de clientes, contenido Instagram/Facebook, Selinna, formación.</p>
          <p><strong>Ale:</strong> publicaciones para clientes, contenido Instagram/LinkedIn, otras actividades profesionales.</p>
          <p style={{ color: "var(--muted)" }}>No hay días fijos por cliente; se organiza en la planificación semanal de arriba.</p>
        </div>
      </Section>
    </div>
  );
}
