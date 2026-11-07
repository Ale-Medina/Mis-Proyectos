"use client";

import { useMemo, useState } from "react";
import { useMe } from "@/hooks/useMe";
import { useTasks } from "@/hooks/useTasks";
import {
  addDays,
  capitalize,
  dateToDayKey,
  dayKeyToDate,
  endOfMonth,
  endOfWeekSunday,
  formatDM,
  fullLabel,
  monthName,
  nowDayKey,
  startOfMonth,
  startOfWeekMonday,
  today,
  weekdayShort,
} from "@/lib/dates";
import { TaskCard } from "@/components/TaskCard";
import { EmptyState } from "@/components/Section";
import type { Task } from "@/lib/types";

type Mode = "week" | "month";

function dayHasKind(tasks: Task[], dateKey: string, kind: "LATE" | "DONE" | "PENDING") {
  return tasks.some((t) => {
    const matches = t.date === dateKey || (t.windowStart && t.windowEnd && t.windowStart <= dateKey && t.windowEnd >= dateKey && t.date <= dateKey);
    if (!matches) return false;
    if (kind === "DONE") return t.effectiveStatus === "DONE";
    if (kind === "LATE") return t.effectiveStatus === "LATE";
    return t.effectiveStatus === "PENDING" || t.effectiveStatus === "IN_PROGRESS";
  });
}

export default function CalendarioPage() {
  const { me, other } = useMe();
  const [mode, setMode] = useState<Mode>("week");
  const [anchor, setAnchor] = useState<Date>(today());
  const [selected, setSelected] = useState<string>(nowDayKey());
  const persons = useMemo(() => [me, other].filter((p): p is NonNullable<typeof p> => !!p), [me, other]);

  const weekStart = startOfWeekMonday(anchor);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const monthStart = startOfMonth(anchor);
  const monthEnd = endOfMonth(anchor);
  const gridStart = startOfWeekMonday(monthStart);
  const gridEnd = endOfWeekSunday(monthEnd);
  const monthDays = useMemo(() => {
    const days: Date[] = [];
    let d = gridStart;
    while (d <= gridEnd) {
      days.push(d);
      d = addDays(d, 1);
    }
    return days;
  }, [gridStart, gridEnd]);

  const rangeFrom = mode === "week" ? weekStart : gridStart;
  const rangeTo = mode === "week" ? addDays(weekStart, 6) : gridEnd;
  const { tasks, mutate } = useTasks(dateToDayKey(rangeFrom), dateToDayKey(rangeTo));

  const todayKey = nowDayKey();
  const selectedTasks = tasks
    .filter((t) => t.date === selected || (t.windowStart && t.windowEnd && t.windowStart <= selected && t.windowEnd >= selected))
    .sort((a, b) => (a.orientativeTime ?? "").localeCompare(b.orientativeTime ?? ""));

  function goPrev() {
    setAnchor((a) => (mode === "week" ? addDays(a, -7) : addDays(startOfMonth(a), -1)));
  }
  function goNext() {
    setAnchor((a) => (mode === "week" ? addDays(a, 7) : addDays(endOfMonth(a), 1)));
  }
  function goToday() {
    setAnchor(today());
    setSelected(todayKey);
  }

  return (
    <div className="pt-1 pb-6">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-extrabold">Calendario</h1>
        <div className="flex gap-1">
          <button
            onClick={() => setMode("week")}
            className="text-xs font-medium px-3 py-1.5 rounded-full"
            style={{ backgroundColor: mode === "week" ? "var(--accent)" : "var(--surface)", color: mode === "week" ? "white" : "var(--foreground)", border: "1px solid var(--border)" }}
          >
            Semana
          </button>
          <button
            onClick={() => setMode("month")}
            className="text-xs font-medium px-3 py-1.5 rounded-full"
            style={{ backgroundColor: mode === "month" ? "var(--accent)" : "var(--surface)", color: mode === "month" ? "white" : "var(--foreground)", border: "1px solid var(--border)" }}
          >
            Mes
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <button onClick={goPrev} className="px-3 py-1.5 surface text-sm">‹</button>
        <button onClick={goToday} className="text-sm font-semibold">
          {mode === "week"
            ? `${formatDM(weekStart)} – ${formatDM(addDays(weekStart, 6))}`
            : capitalize(monthName(anchor)) + " " + anchor.getUTCFullYear()}
        </button>
        <button onClick={goNext} className="px-3 py-1.5 surface text-sm">›</button>
      </div>

      {mode === "week" && (
        <div className="grid grid-cols-7 gap-1.5 mb-4">
          {weekDays.map((d) => {
            const key = dateToDayKey(d);
            const isToday = key === todayKey;
            const isSelected = key === selected;
            return (
              <button
                key={key}
                onClick={() => setSelected(key)}
                className="surface flex flex-col items-center py-2 gap-1"
                style={{
                  borderColor: isSelected ? "var(--accent)" : "var(--border)",
                  borderWidth: isSelected ? 2 : 1,
                }}
              >
                <span className="text-[10px] uppercase" style={{ color: "var(--muted)" }}>{weekdayShort(d)}</span>
                <span className={`text-sm font-bold ${isToday ? "" : ""}`} style={{ color: isToday ? "var(--accent)" : "var(--foreground)" }}>
                  {d.getUTCDate()}
                </span>
                <div className="flex gap-0.5">
                  {dayHasKind(tasks, key, "LATE") && <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />}
                  {dayHasKind(tasks, key, "PENDING") && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />}
                  {dayHasKind(tasks, key, "DONE") && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {mode === "month" && (
        <div className="grid grid-cols-7 gap-1 mb-4 text-center">
          {["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"].map((d) => (
            <span key={d} className="text-[10px] font-semibold py-1" style={{ color: "var(--muted)" }}>{d}</span>
          ))}
          {monthDays.map((d) => {
            const key = dateToDayKey(d);
            const inMonth = d.getUTCMonth() === anchor.getUTCMonth();
            const isToday = key === todayKey;
            const isSelected = key === selected;
            return (
              <button
                key={key}
                onClick={() => setSelected(key)}
                className="flex flex-col items-center justify-center aspect-square rounded-lg gap-0.5"
                style={{
                  opacity: inMonth ? 1 : 0.35,
                  border: isSelected ? "2px solid var(--accent)" : "1px solid var(--border)",
                  backgroundColor: "var(--surface)",
                }}
              >
                <span className="text-xs font-semibold" style={{ color: isToday ? "var(--accent)" : "var(--foreground)" }}>
                  {d.getUTCDate()}
                </span>
                <div className="flex gap-0.5">
                  {dayHasKind(tasks, key, "LATE") && <span className="h-1 w-1 rounded-full bg-rose-500" />}
                  {dayHasKind(tasks, key, "PENDING") && <span className="h-1 w-1 rounded-full bg-amber-400" />}
                  {dayHasKind(tasks, key, "DONE") && <span className="h-1 w-1 rounded-full bg-emerald-500" />}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <h2 className="text-sm font-bold mb-2" style={{ color: "var(--muted)" }}>
        {capitalize(fullLabel(dayKeyToDate(selected)))}
      </h2>
      {selectedTasks.length === 0 ? (
        <EmptyState text="Sin tareas para este día." />
      ) : (
        <div className="flex flex-col gap-2">
          {selectedTasks.map((t) => (
            <TaskCard key={t.id} task={t} persons={persons} onChanged={mutate} />
          ))}
        </div>
      )}
    </div>
  );
}
