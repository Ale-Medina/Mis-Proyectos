"use client";

import { useState } from "react";
import type { Person, SubtaskState, Task } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";
import { categoryDotClass } from "@/lib/colors";
import {
  completeTask,
  rescheduleTask,
  reassignTask,
  toggleSubtask,
  uncompleteTask,
} from "@/hooks/useTasks";

function formatWindow(task: Task): string | null {
  if (task.windowStart && task.windowEnd) {
    const [, m1, d1] = task.windowStart.split("-");
    const [, m2, d2] = task.windowEnd.split("-");
    return m1 === m2 ? `${d1}–${d2}/${m1}` : `${d1}/${m1}–${d2}/${m2}`;
  }
  return null;
}

export function TaskCard({
  task,
  persons,
  onChanged,
  compact = false,
}: {
  task: Task;
  persons: Person[];
  onChanged: () => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // Estado local "optimista": se actualiza al instante al tocar un control y
  // se resincroniza cuando llegan datos nuevos del servidor (otro
  // dispositivo, u otro polling). Evita que un checkbox controlado vuelva a
  // su valor anterior mientras el pedido de red todavía está en vuelo.
  // Siguiendo el patrón de React para "ajustar estado cuando cambia una
  // prop" (sin useEffect): se detecta el cambio durante el render.
  const signature = `${task.id}:${task.status}:${task.assignedPersonId}:${JSON.stringify(task.subtaskState)}`;
  const [syncedSignature, setSyncedSignature] = useState(signature);
  const [localDone, setLocalDone] = useState(task.status === "DONE");
  const [localSubtasks, setLocalSubtasks] = useState<SubtaskState[]>(task.subtaskState);
  const [localAssigned, setLocalAssigned] = useState(task.assignedPersonId);

  if (signature !== syncedSignature) {
    setSyncedSignature(signature);
    setLocalDone(task.status === "DONE");
    setLocalSubtasks(task.subtaskState);
    setLocalAssigned(task.assignedPersonId);
  }

  const hasSubtasks = localSubtasks.length > 0;

  async function handleToggleDone() {
    const next = !localDone;
    setLocalDone(next);
    setBusy(true);
    try {
      if (next) await completeTask(task.id);
      else await uncompleteTask(task.id);
      onChanged();
    } catch {
      setLocalDone(!next);
    } finally {
      setBusy(false);
    }
  }

  async function handleSubtask(index: number, next: boolean) {
    setLocalSubtasks((prev) => prev.map((s, i) => (i === index ? { ...s, done: next } : s)));
    setBusy(true);
    try {
      await toggleSubtask(task.id, index, next);
      onChanged();
    } catch {
      setLocalSubtasks((prev) => prev.map((s, i) => (i === index ? { ...s, done: !next } : s)));
    } finally {
      setBusy(false);
    }
  }

  async function handleReassign(personId: string) {
    const prev = localAssigned;
    setLocalAssigned(personId || null);
    setBusy(true);
    try {
      await reassignTask(task.id, personId || null);
      onChanged();
    } catch {
      setLocalAssigned(prev);
    } finally {
      setBusy(false);
    }
  }

  async function handleReschedule() {
    const input = window.prompt("Nueva fecha (DD/MM/AAAA):");
    if (!input) return;
    const match = input.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) {
      window.alert("Formato inválido. Usá DD/MM/AAAA.");
      return;
    }
    const [, d, m, y] = match;
    setBusy(true);
    try {
      await rescheduleTask(task.id, `${y}-${m}-${d}`);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  const windowLabel = formatWindow(task);
  const assignedPerson = persons.find((p) => p.id === localAssigned);

  return (
    <div className="surface px-3.5 py-3">
      <div className="flex items-start gap-3">
        <button
          onClick={handleToggleDone}
          disabled={busy}
          aria-label={localDone ? "Marcar como pendiente" : "Marcar como hecha"}
          className="mt-0.5 h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 transition"
          style={{
            borderColor: localDone ? "var(--accent)" : "var(--border)",
            backgroundColor: localDone ? "var(--accent)" : "transparent",
          }}
        >
          {localDone && <span className="text-white text-xs">✓</span>}
        </button>

        <div className="flex-1 min-w-0" onClick={() => hasSubtasks && setOpen((o) => !o)}>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`h-2 w-2 rounded-full ${categoryDotClass(task.categoryColorKey)}`} />
            <p className={`font-semibold text-sm ${localDone ? "line-through opacity-60" : ""}`}>
              {task.templateName}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap text-xs" style={{ color: "var(--muted)" }}>
            {task.isShared ? (
              <span className="font-medium">Compartida</span>
            ) : assignedPerson ? (
              <span className="flex items-center gap-1 font-medium">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: assignedPerson.colorHex }}
                />
                {assignedPerson.name}
              </span>
            ) : (
              <span>Sin asignar</span>
            )}
            {task.orientativeTime && <span>{task.orientativeTime}</span>}
            <span>{task.durationMinutes} min</span>
            {windowLabel && <span>vence {windowLabel}</span>}
            {!compact && !task.isCore && (
              <StatusBadge status={localDone ? "DONE" : task.effectiveStatus} daysLate={task.daysLate} />
            )}
          </div>
        </div>
        {task.isCore && (
          <StatusBadge status={localDone ? "DONE" : task.effectiveStatus} daysLate={task.daysLate} />
        )}
      </div>

      {open && (
        <div className="mt-3 ml-9 flex flex-col gap-2">
          {task.description && (
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              {task.description}
            </p>
          )}
          {hasSubtasks && (
            <ul className="flex flex-col gap-1.5">
              {localSubtasks.map((s, idx) => (
                <li key={idx} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={s.done}
                    onChange={(e) => handleSubtask(idx, e.target.checked)}
                    className="h-4 w-4 accent-current"
                  />
                  <span className={s.done ? "line-through opacity-60" : ""}>{s.name}</span>
                </li>
              ))}
            </ul>
          )}
          {!task.isShared && (
            <div className="flex items-center gap-2 text-xs pt-1">
              <span style={{ color: "var(--muted)" }}>Responsable:</span>
              <select
                value={localAssigned ?? ""}
                onChange={(e) => handleReassign(e.target.value)}
                className="surface px-2 py-1 text-xs"
              >
                <option value="">Sin asignar</option>
                {persons.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button onClick={handleReschedule} className="underline" style={{ color: "var(--muted)" }}>
                Reprogramar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
