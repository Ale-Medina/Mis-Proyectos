"use client";

import { useState } from "react";
import useSWR from "swr";
import { swrFetcher } from "@/lib/api-client";
import { addDays, dateToDayKey, startOfMonth, endOfMonth, startOfWeekMonday, today } from "@/lib/dates";
import { Section } from "@/components/Section";
import type { BalanceGroup, BalanceResponse } from "@/lib/types";

const GROUP_LABELS: Record<BalanceGroup, string> = {
  WORK: "A. Trabajo remunerado y protegido",
  HOUSEHOLD: "B. Tareas domésticas",
  CHILDCARE: "C. Cuidado activo de la nena",
  NIGHT: "D. Disponibilidad nocturna",
  PERSONAL: "E. Tiempo personal y descanso",
};

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-12 shrink-0 font-medium">{label}</span>
      <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--border)" }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="w-16 shrink-0 text-right" style={{ color: "var(--muted)" }}>{value} min</span>
    </div>
  );
}

export default function BalancePage() {
  const [period, setPeriod] = useState<"week" | "month">("week");
  const from = period === "week" ? startOfWeekMonday(today()) : startOfMonth(today());
  const to = period === "week" ? addDays(from, 6) : endOfMonth(today());

  const { data } = useSWR<BalanceResponse>(
    `/api/balance?from=${dateToDayKey(from)}&to=${dateToDayKey(to)}`,
    swrFetcher,
  );

  const persons = data?.persons ?? [];
  const helu = persons.find((p) => p.name === "Helu");
  const ale = persons.find((p) => p.name === "Ale");

  const groups: BalanceGroup[] = ["WORK", "HOUSEHOLD", "CHILDCARE", "PERSONAL"];

  return (
    <div className="pt-1 pb-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-extrabold">Balance</h1>
        <div className="flex gap-1">
          <button
            onClick={() => setPeriod("week")}
            className="text-xs font-medium px-3 py-1.5 rounded-full"
            style={{ backgroundColor: period === "week" ? "var(--accent)" : "var(--surface)", color: period === "week" ? "white" : "var(--foreground)", border: "1px solid var(--border)" }}
          >
            Semana
          </button>
          <button
            onClick={() => setPeriod("month")}
            className="text-xs font-medium px-3 py-1.5 rounded-full"
            style={{ backgroundColor: period === "month" ? "var(--accent)" : "var(--surface)", color: period === "month" ? "white" : "var(--foreground)", border: "1px solid var(--border)" }}
          >
            Mes
          </button>
        </div>
      </div>

      <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>
        Las duraciones son estimaciones, no obligaciones. Si alguien hace una tarea más rápido, ese tiempo es
        suyo: no se le asignan automáticamente más tareas por ser eficiente.
      </p>

      {groups.map((g) => {
        const heluBal = helu ? data?.byGroup[g]?.[helu.id] : undefined;
        const aleBal = ale ? data?.byGroup[g]?.[ale.id] : undefined;
        const maxEst = Math.max(heluBal?.estimatedMinutes ?? 0, aleBal?.estimatedMinutes ?? 0, 1);
        const maxReal = Math.max(heluBal?.actualMinutes ?? 0, aleBal?.actualMinutes ?? 0, 1);
        return (
          <Section key={g} title={GROUP_LABELS[g]}>
            <div className="surface px-4 py-3 flex flex-col gap-3">
              <div>
                <p className="text-[11px] font-semibold mb-1.5" style={{ color: "var(--muted)" }}>Estimado</p>
                <div className="flex flex-col gap-1.5">
                  <Bar label={helu?.name ?? "Helu"} value={heluBal?.estimatedMinutes ?? 0} max={maxEst} color={helu?.colorHex ?? "#C9798C"} />
                  <Bar label={ale?.name ?? "Ale"} value={aleBal?.estimatedMinutes ?? 0} max={maxEst} color={ale?.colorHex ?? "#5B8A82"} />
                </div>
              </div>
              <div>
                <p className="text-[11px] font-semibold mb-1.5" style={{ color: "var(--muted)" }}>Real (hecho)</p>
                <div className="flex flex-col gap-1.5">
                  <Bar label={helu?.name ?? "Helu"} value={heluBal?.actualMinutes ?? 0} max={maxReal} color={helu?.colorHex ?? "#C9798C"} />
                  <Bar label={ale?.name ?? "Ale"} value={aleBal?.actualMinutes ?? 0} max={maxReal} color={ale?.colorHex ?? "#5B8A82"} />
                </div>
              </div>
              <p className="text-[11px]" style={{ color: "var(--muted)" }}>
                {helu?.name ?? "Helu"}: {heluBal?.tasksDone ?? 0}/{heluBal?.tasksTotal ?? 0} tareas · {ale?.name ?? "Ale"}: {aleBal?.tasksDone ?? 0}/{aleBal?.tasksTotal ?? 0} tareas
              </p>
            </div>
          </Section>
        );
      })}

      <Section title={GROUP_LABELS.NIGHT}>
        <div className="surface px-4 py-3 text-sm flex flex-col gap-1.5">
          <p style={{ color: "var(--muted)" }}>
            No se busca una distribución nocturna artificialmente igualitaria: esto registra la situación real.
          </p>
          <p>Noches registradas: {data?.night.nights ?? 0}</p>
          {helu && <p>{helu.name} atendió principalmente: {data?.night.attendedCount[helu.id] ?? 0} noches</p>}
          {ale && <p>{ale.name} atendió principalmente: {data?.night.attendedCount[ale.id] ?? 0} noches</p>}
        </div>
      </Section>
    </div>
  );
}
