"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { useMe } from "@/hooks/useMe";
import { useTasks } from "@/hooks/useTasks";
import { apiSend, swrFetcher } from "@/lib/api-client";
import { addDays, addMinutesToTime, dateToDayKey, nowDayKey, today } from "@/lib/dates";
import { TaskCard } from "@/components/TaskCard";
import { Section, EmptyState } from "@/components/Section";

type BathLog = { id: string; date: string; personId: string; personName: string; notes: string | null };
type CompRestLog = {
  id: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  careMinutesByAle: number | null;
  restMinutesForHelu: number | null;
  notes: string | null;
};
type DailyLogResp = { log: { wakeTime: string } };

export default function CuidadoPage() {
  const { me, other } = useMe();
  const persons = useMemo(() => [me, other].filter((p): p is NonNullable<typeof p> => !!p), [me, other]);
  const todayKey = nowDayKey();
  const toKey = dateToDayKey(addDays(today(), 10));
  const { tasks, mutate } = useTasks(todayKey, toKey);

  const { data: dailyLog } = useSWR<DailyLogResp>(`/api/daily-log?date=${todayKey}`, swrFetcher);
  const wakeTime = dailyLog?.log.wakeTime ?? "07:00";
  const napStart = addMinutesToTime(wakeTime, 60 * 5 + 15);
  const napEnd = addMinutesToTime(wakeTime, 60 * 5 + 15 + 120);

  const gimnasia = tasks.filter((t) => t.templateName === "Gimnasia artística" && t.date >= todayKey).slice(0, 2);
  const crossfit = tasks.filter((t) => t.templateName === "CrossFit (Ale)" && t.date >= todayKey).slice(0, 1);
  const bathTask = tasks.find((t) => t.templateName === "Baño de la nena" && t.windowStart && t.windowStart <= todayKey && (t.windowEnd ?? "") >= todayKey);

  const { data: bathLogs, mutate: mutateBath } = useSWR<{ logs: BathLog[] }>("/api/bath-log?limit=6", swrFetcher);
  const { data: compLogs, mutate: mutateComp } = useSWR<{ logs: CompRestLog[] }>(
    "/api/compensatory-rest?limit=6",
    swrFetcher,
  );

  async function logBath(personId: string) {
    await apiSend("/api/bath-log", "POST", { personId });
    mutateBath();
  }

  const [careMin, setCareMin] = useState("");
  const [restMin, setRestMin] = useState("");
  const [compNotes, setCompNotes] = useState("");

  async function logCompRest() {
    await apiSend("/api/compensatory-rest", "POST", {
      careMinutesByAle: careMin ? Number(careMin) : undefined,
      restMinutesForHelu: restMin ? Number(restMin) : undefined,
      notes: compNotes || undefined,
    });
    setCareMin("");
    setRestMin("");
    setCompNotes("");
    mutateComp();
  }

  return (
    <div className="pt-1 pb-6">
      <h1 className="text-xl font-extrabold mb-4">Cuidado de nuestra hija</h1>

      <Section title="Siesta de hoy (orientativa)">
        <div className="surface px-4 py-3 text-sm">
          <p>
            Siesta aproximada de <strong>{napStart}</strong> a <strong>{napEnd}</strong> (según hora de
            despertar: {wakeTime}). Puede adelantarse si tiene sueño antes de terminar de comer.
          </p>
        </div>
      </Section>

      <Section title="Baño de la nena">
        <div className="surface px-4 py-3 flex flex-col gap-2 text-sm">
          <p>
            Esta semana le toca bañarla a{" "}
            <strong>{bathTask?.assignedPersonName ?? "—"}</strong> (aprox. día por medio, sin horario fijo). Si no
            se bañó porque no era necesario, no pasa nada.
          </p>
          <div className="flex gap-2">
            {persons.map((p) => (
              <button
                key={p.id}
                onClick={() => logBath(p.id)}
                className="text-xs font-semibold px-3 py-1.5 rounded-full text-white"
                style={{ backgroundColor: p.colorHex }}
              >
                Registrar baño: {p.name}
              </button>
            ))}
          </div>
          {bathLogs?.logs.length ? (
            <ul className="text-xs mt-1" style={{ color: "var(--muted)" }}>
              {bathLogs.logs.map((l) => (
                <li key={l.id}>{l.date} — {l.personName}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </Section>

      <Section title="Gimnasia artística (martes y jueves)">
        {gimnasia.length === 0 && <EmptyState text="Sin próxima clase en el rango visible." />}
        {gimnasia.map((t) => (
          <TaskCard key={t.id} task={t} persons={persons} onChanged={mutate} />
        ))}
      </Section>

      <Section title="Entrenamientos de los adultos">
        {crossfit.map((t) => (
          <TaskCard key={t.id} task={t} persons={persons} onChanged={mutate} compact />
        ))}
        <div className="surface px-4 py-3 text-sm" style={{ color: "var(--muted)" }}>
          Entrenamiento de Helu: todavía sin día ni horario fijo (activar en Configuración cuando se retome).
          Mientras Ale entrena, Helu queda a cargo de la nena aunque esté dormida.
        </div>
      </Section>

      <Section title="Descanso compensatorio para Helu">
        <div className="surface px-4 py-3 flex flex-col gap-2 text-sm">
          <p style={{ color: "var(--muted)" }}>
            Para cuando Helu tuvo una noche difícil: Ale asume el cuidado, sin horario ni duración obligatoria.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs flex flex-col gap-1">
              Minutos a cargo (Ale)
              <input value={careMin} onChange={(e) => setCareMin(e.target.value)} type="number" className="surface px-2 py-1" />
            </label>
            <label className="text-xs flex flex-col gap-1">
              Minutos de descanso real (Helu)
              <input value={restMin} onChange={(e) => setRestMin(e.target.value)} type="number" className="surface px-2 py-1" />
            </label>
          </div>
          <input
            value={compNotes}
            onChange={(e) => setCompNotes(e.target.value)}
            placeholder="Notas (opcional)"
            className="surface px-2 py-1.5 text-sm"
          />
          <button onClick={logCompRest} className="self-start text-xs font-semibold px-3 py-1.5 rounded-full text-white" style={{ backgroundColor: "var(--accent)" }}>
            Registrar
          </button>
          {compLogs?.logs.length ? (
            <ul className="text-xs mt-1" style={{ color: "var(--muted)" }}>
              {compLogs.logs.map((l) => (
                <li key={l.id}>
                  {l.date}: {l.careMinutesByAle ?? "—"} min a cargo · {l.restMinutesForHelu ?? "—"} min de descanso real
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </Section>

      <Section title="Durante el bloque de trabajo / entrenamiento">
        <div className="surface px-4 py-3 text-sm" style={{ color: "var(--muted)" }}>
          Quien no está trabajando/entrenando queda a cargo completo: alimentación, pañales, juego, higiene y
          acompañamiento. No se le asigna cocinar si eso interfiere con la atención de la nena.
        </div>
      </Section>
    </div>
  );
}
