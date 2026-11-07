"use client";

import { useMemo, useState } from "react";
import { useMe } from "@/hooks/useMe";
import { useTasks } from "@/hooks/useTasks";
import { addDays, dateToDayKey, formatDMY, dayKeyToDate, nowDayKey, today } from "@/lib/dates";
import { TaskCard } from "@/components/TaskCard";
import { EmptyState } from "@/components/Section";

export default function HistorialPage() {
  const { me, other } = useMe();
  const persons = useMemo(() => [me, other].filter((p): p is NonNullable<typeof p> => !!p), [me, other]);
  const [days, setDays] = useState(30);

  const fromKey = dateToDayKey(addDays(today(), -days));
  const toKey = nowDayKey();
  const { tasks, mutate } = useTasks(fromKey, toKey);

  const sorted = [...tasks].sort((a, b) => b.date.localeCompare(a.date));
  const grouped = sorted.reduce<Record<string, typeof sorted>>((acc, t) => {
    (acc[t.date] ??= []).push(t);
    return acc;
  }, {});

  return (
    <div className="pt-1 pb-6">
      <h1 className="text-xl font-extrabold mb-3">Historial</h1>

      <div className="flex gap-2 mb-4">
        {[14, 30, 60].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className="text-xs font-medium px-3 py-1.5 rounded-full"
            style={{
              backgroundColor: days === d ? "var(--accent)" : "var(--surface)",
              color: days === d ? "white" : "var(--foreground)",
              border: "1px solid var(--border)",
            }}
          >
            Últimos {d} días
          </button>
        ))}
      </div>

      {Object.keys(grouped).length === 0 && <EmptyState text="Sin historial en este rango." />}

      {Object.entries(grouped).map(([date, items]) => (
        <div key={date} className="mb-4">
          <p className="text-xs font-bold uppercase mb-2" style={{ color: "var(--muted)" }}>
            {formatDMY(dayKeyToDate(date))}
          </p>
          <div className="flex flex-col gap-2">
            {items.map((t) => (
              <TaskCard key={t.id} task={t} persons={persons} onChanged={mutate} compact />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
