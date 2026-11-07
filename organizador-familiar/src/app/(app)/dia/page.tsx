"use client";

import Link from "next/link";
import { useMemo } from "react";
import useSWR from "swr";
import { useMe } from "@/hooks/useMe";
import { useTasks } from "@/hooks/useTasks";
import { swrFetcher } from "@/lib/api-client";
import { addDays, dateToDayKey, fullLabel, nowDayKey, today, capitalize } from "@/lib/dates";
import { TaskCard } from "@/components/TaskCard";
import { Section, EmptyState } from "@/components/Section";
import { ALL_NAV } from "@/components/nav-items";
import type { BalanceResponse } from "@/lib/types";

export default function DiaPage() {
  const { me, other } = useMe();
  const todayKey = nowDayKey();
  const toKey = dateToDayKey(addDays(today(), 10));
  const { tasks, mutate } = useTasks(todayKey, toKey);

  const persons = useMemo(() => [me, other].filter((p): p is NonNullable<typeof p> => !!p), [me, other]);

  const weekFrom = dateToDayKey(addDays(today(), -((today().getUTCDay() + 6) % 7)));
  const { data: balanceData } = useSWR<BalanceResponse>(
    `/api/balance?from=${weekFrom}&to=${dateToDayKey(addDays(today(), 6 - ((today().getUTCDay() + 6) % 7)))}`,
    swrFetcher,
  );

  const isOpenToday = (t: (typeof tasks)[number]) =>
    t.date === todayKey || (t.windowStart && t.windowEnd && t.windowStart <= todayKey && t.windowEnd >= todayKey);

  const todayTasks = tasks.filter(isOpenToday);
  const mine = todayTasks.filter((t) => !t.isShared && t.assignedPersonId === me?.id);
  const shared = todayTasks.filter((t) => t.isShared);
  const otherTasks = todayTasks.filter((t) => !t.isShared && t.assignedPersonId === other?.id);

  // Tareas con fecha exacta de hoy (diarias, o semanales/mensuales con día
  // fijo) vs. tareas de ventana flexible que siguen abiertas esta semana:
  // separarlas evita saturar "Mi día" con todo lo pendiente de la semana.
  const fixedMine = mine.filter((t) => t.date === todayKey);
  const openMine = mine.filter((t) => t.date !== todayKey && t.effectiveStatus !== "DONE");
  const fixedOther = otherTasks.filter((t) => t.date === todayKey);

  const late = tasks.filter((t) => t.effectiveStatus === "LATE" && !t.isCore);
  const upcoming = tasks
    .filter((t) => t.date > todayKey && t.date <= toKey && t.effectiveStatus !== "DONE")
    .slice(0, 4);

  function householdTotals(personId: string | undefined) {
    if (!personId || !balanceData) return { done: 0, total: 0 };
    const hh = balanceData.byGroup.HOUSEHOLD?.[personId];
    const cc = balanceData.byGroup.CHILDCARE?.[personId];
    return {
      done: (hh?.tasksDone ?? 0) + (cc?.tasksDone ?? 0),
      total: (hh?.tasksTotal ?? 0) + (cc?.tasksTotal ?? 0),
    };
  }

  const myTotals = householdTotals(me?.id);
  const otherTotals = householdTotals(other?.id);

  return (
    <div className="pt-1 pb-6">
      <div className="mb-5">
        <p className="text-2xl font-extrabold">{capitalize(fullLabel(today()).split(" ")[0])}</p>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          {fullLabel(today())}
        </p>
      </div>

      {late.length > 0 && (
        <Section title={`Atrasadas (${late.length})`} action={<Link href="/tareas?filtro=atrasadas" className="text-xs underline" style={{ color: "var(--danger)" }}>Ver todas</Link>}>
          {late.slice(0, 3).map((t) => (
            <TaskCard key={t.id} task={t} persons={persons} onChanged={mutate} compact />
          ))}
        </Section>
      )}

      <Section title="Para hoy — vos">
        {fixedMine.length === 0 && <EmptyState text="No tenés tareas propias con fecha de hoy. 🎉" />}
        {fixedMine.map((t) => (
          <TaskCard key={t.id} task={t} persons={persons} onChanged={mutate} />
        ))}
      </Section>

      {shared.length > 0 && (
        <Section title="Compartidas de hoy">
          {shared.map((t) => (
            <TaskCard key={t.id} task={t} persons={persons} onChanged={mutate} />
          ))}
        </Section>
      )}

      {openMine.length > 0 && (
        <Section title="Pendientes abiertas esta semana — vos" action={<Link href="/tareas?filtro=mias" className="text-xs underline" style={{ color: "var(--muted)" }}>Ver todas</Link>}>
          {openMine.map((t) => (
            <TaskCard key={t.id} task={t} persons={persons} onChanged={mutate} compact />
          ))}
        </Section>
      )}

      <Section title={`Para hoy — ${other?.name ?? "la otra persona"}`}>
        {fixedOther.length === 0 && <EmptyState text="Sin tareas propias con fecha de hoy." />}
        {fixedOther.map((t) => (
          <TaskCard key={t.id} task={t} persons={persons} onChanged={mutate} compact />
        ))}
      </Section>

      {upcoming.length > 0 && (
        <Section title="Próximas actividades">
          {upcoming.map((t) => (
            <TaskCard key={t.id} task={t} persons={persons} onChanged={mutate} compact />
          ))}
        </Section>
      )}

      <Section title="Balance rápido de la semana" action={<Link href="/balance" className="text-xs underline" style={{ color: "var(--muted)" }}>Ver balance</Link>}>
        <div className="surface px-4 py-3 flex justify-between text-sm">
          <span>{me?.name ?? "Vos"}: {myTotals.done}/{myTotals.total} hechas</span>
          <span style={{ color: "var(--muted)" }}>{other?.name ?? "La otra persona"}: {otherTotals.done}/{otherTotals.total}</span>
        </div>
      </Section>

      <Section title="Accesos">
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {ALL_NAV.filter((n) => n.href !== "/dia").map((n) => (
            <Link key={n.href} href={n.href} className="surface flex flex-col items-center gap-1 py-3 text-xs font-medium">
              <span className="text-xl">{n.icon}</span>
              {n.label}
            </Link>
          ))}
        </div>
      </Section>
    </div>
  );
}
