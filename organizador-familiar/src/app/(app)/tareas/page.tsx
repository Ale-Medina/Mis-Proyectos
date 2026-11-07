"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMe } from "@/hooks/useMe";
import { useTasks } from "@/hooks/useTasks";
import { addDays, dateToDayKey, nowDayKey, today } from "@/lib/dates";
import { TaskCard } from "@/components/TaskCard";
import { EmptyState } from "@/components/Section";

type Filter = "mias" | "otra" | "compartidas" | "pendientes" | "atrasadas" | "todas";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "mias", label: "Mis tareas" },
  { key: "otra", label: "La otra persona" },
  { key: "compartidas", label: "Compartidas" },
  { key: "pendientes", label: "Pendientes" },
  { key: "atrasadas", label: "Atrasadas" },
  { key: "todas", label: "Todas" },
];

export default function TareasPage() {
  return (
    <Suspense fallback={null}>
      <TareasContent />
    </Suspense>
  );
}

function TareasContent() {
  const { me, other } = useMe();
  const searchParams = useSearchParams();
  const initial = (searchParams.get("filtro") as Filter) ?? "mias";
  const [filter, setFilter] = useState<Filter>(initial);

  const fromKey = dateToDayKey(addDays(today(), -7));
  const toKey = dateToDayKey(addDays(today(), 28));
  const { tasks, mutate } = useTasks(fromKey, toKey);

  const persons = useMemo(() => [me, other].filter((p): p is NonNullable<typeof p> => !!p), [me, other]);
  const todayKey = nowDayKey();

  const filtered = tasks
    .filter((t) => {
      if (filter === "mias") return !t.isShared && t.assignedPersonId === me?.id;
      if (filter === "otra") return !t.isShared && t.assignedPersonId === other?.id;
      if (filter === "compartidas") return t.isShared;
      if (filter === "pendientes") return t.effectiveStatus === "PENDING" || t.effectiveStatus === "IN_PROGRESS";
      if (filter === "atrasadas") return t.effectiveStatus === "LATE";
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  // Agrupar por estado real, no por la fecha "cruda": una tarea semanal con
  // ventana lun-dom cuyo campo date cae en el pasado pero sigue vigente esta
  // semana no es "atrasada", así que no debe aparecer en ese grupo.
  const late = filtered.filter((t) => t.effectiveStatus === "LATE");
  const current = filtered.filter(
    (t) => t.effectiveStatus !== "LATE" && t.date <= todayKey && (t.windowEnd ?? t.date) >= todayKey,
  );
  const future = filtered.filter((t) => t.date > todayKey);

  return (
    <div className="pt-1 pb-6">
      <h1 className="text-xl font-extrabold mb-3">Tareas del hogar</h1>

      <div className="flex gap-2 overflow-x-auto scrollbar-none mb-4 -mx-1 px-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className="shrink-0 text-sm font-medium px-3.5 py-1.5 rounded-full transition"
            style={{
              backgroundColor: filter === f.key ? "var(--accent)" : "var(--surface)",
              color: filter === f.key ? "white" : "var(--foreground)",
              border: "1px solid var(--border)",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {late.length === 0 && current.length === 0 && future.length === 0 && (
        <EmptyState text="No hay tareas en esta vista." />
      )}

      {late.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-bold uppercase mb-2" style={{ color: "var(--danger)" }}>Atrasadas</p>
          <div className="flex flex-col gap-2">
            {late.map((t) => (
              <TaskCard key={t.id} task={t} persons={persons} onChanged={mutate} />
            ))}
          </div>
        </div>
      )}

      {current.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-bold uppercase mb-2" style={{ color: "var(--muted)" }}>Hoy / esta semana</p>
          <div className="flex flex-col gap-2">
            {current.map((t) => (
              <TaskCard key={t.id} task={t} persons={persons} onChanged={mutate} />
            ))}
          </div>
        </div>
      )}

      {future.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-bold uppercase mb-2" style={{ color: "var(--muted)" }}>Próximas</p>
          <div className="flex flex-col gap-2">
            {future.map((t) => (
              <TaskCard key={t.id} task={t} persons={persons} onChanged={mutate} compact />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
