"use client";

import { useState } from "react";
import { apiSend } from "@/lib/api-client";
import type { Category, Person, TemplateAdmin } from "@/lib/types";

const FREQUENCY_LABEL: Record<TemplateAdmin["frequency"], string> = {
  DAILY: "Diaria",
  WEEKLY: "Semanal",
  MONTHLY: "Mensual",
  ONCE: "Única vez",
};

const ROTATION_LABEL: Record<TemplateAdmin["rotationMode"], string> = {
  NONE: "Sin rotación (manual)",
  FIXED: "Fija (siempre la misma persona)",
  DAILY_ALTERNATE: "Alterna cada día",
  WEEKLY_ALTERNATE: "Alterna cada semana",
  MONTHLY_ALTERNATE: "Alterna cada mes",
  MONTHLY_SPLIT_ALTERNATE: "2 por mes, una cada uno (orden alterna)",
};

type Draft = {
  name: string;
  description: string;
  categoryId: string;
  frequency: TemplateAdmin["frequency"];
  daysOfWeek: string;
  occurrencesPerMonth: number;
  durationMinutes: number;
  orientativeTime: string;
  rotationMode: TemplateAdmin["rotationMode"];
  rotationAnchorPersonId: string;
  isShared: boolean;
  active: boolean;
  subtasksText: string;
};

function toDraft(t: TemplateAdmin): Draft {
  return {
    name: t.name,
    description: t.description,
    categoryId: t.categoryId,
    frequency: t.frequency,
    daysOfWeek: t.daysOfWeek ?? "",
    occurrencesPerMonth: t.occurrencesPerMonth,
    durationMinutes: t.durationMinutes,
    orientativeTime: t.orientativeTime ?? "",
    rotationMode: t.rotationMode,
    rotationAnchorPersonId: t.rotationAnchorPersonId ?? "",
    isShared: t.isShared,
    active: t.active,
    subtasksText: t.subtasks.join("\n"),
  };
}

export function TemplateEditor({
  template,
  categories,
  persons,
  onSaved,
}: {
  template: TemplateAdmin;
  categories: Category[];
  persons: Person[];
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(toDraft(template));
  const [saving, setSaving] = useState(false);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      await apiSend(`/api/templates/${template.id}`, "PATCH", {
        name: draft.name,
        description: draft.description,
        categoryId: draft.categoryId,
        frequency: draft.frequency,
        daysOfWeek: draft.daysOfWeek || null,
        occurrencesPerMonth: draft.occurrencesPerMonth,
        durationMinutes: draft.durationMinutes,
        orientativeTime: draft.orientativeTime || null,
        rotationMode: draft.rotationMode,
        rotationAnchorPersonId: draft.rotationAnchorPersonId || null,
        isShared: draft.isShared,
        active: draft.active,
        subtasks: draft.subtasksText.split("\n").map((s) => s.trim()).filter(Boolean),
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  async function deactivate() {
    if (!window.confirm("¿Desactivar esta tarea? No se borra el historial, solo deja de generar nuevas instancias.")) return;
    await apiSend(`/api/templates/${template.id}`, "DELETE");
    onSaved();
  }

  return (
    <div className="flex flex-col gap-3 text-sm">
      <label className="flex flex-col gap-1">
        Nombre
        <input value={draft.name} onChange={(e) => set("name", e.target.value)} className="surface px-2 py-1.5" />
      </label>
      <label className="flex flex-col gap-1">
        Descripción
        <textarea value={draft.description} onChange={(e) => set("description", e.target.value)} className="surface px-2 py-1.5" rows={2} />
      </label>
      <label className="flex flex-col gap-1">
        Categoría
        <select value={draft.categoryId} onChange={(e) => set("categoryId", e.target.value)} className="surface px-2 py-1.5">
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          Frecuencia
          <select value={draft.frequency} onChange={(e) => set("frequency", e.target.value as TemplateAdmin["frequency"])} className="surface px-2 py-1.5">
            {Object.entries(FREQUENCY_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          Duración (min)
          <input
            type="number"
            value={draft.durationMinutes}
            onChange={(e) => set("durationMinutes", Number(e.target.value))}
            className="surface px-2 py-1.5"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        Días de la semana (0=domingo…6=sábado, separados por coma; vacío = sin día fijo)
        <input value={draft.daysOfWeek} onChange={(e) => set("daysOfWeek", e.target.value)} placeholder="ej: 1,3,5" className="surface px-2 py-1.5" />
      </label>

      {draft.frequency === "MONTHLY" && (
        <label className="flex flex-col gap-1">
          Ocurrencias por mes
          <select value={draft.occurrencesPerMonth} onChange={(e) => set("occurrencesPerMonth", Number(e.target.value))} className="surface px-2 py-1.5">
            <option value={1}>1 (ventana: todo el mes)</option>
            <option value={2}>2 (ventanas: días 14-16 y 29-fin de mes)</option>
          </select>
        </label>
      )}

      <label className="flex flex-col gap-1">
        Hora orientativa / fija (HH:mm, opcional)
        <input value={draft.orientativeTime} onChange={(e) => set("orientativeTime", e.target.value)} placeholder="ej: 18:00" className="surface px-2 py-1.5" />
      </label>

      <label className="flex items-center gap-2">
        <input type="checkbox" checked={draft.isShared} onChange={(e) => set("isShared", e.target.checked)} className="h-4 w-4" />
        Tarea compartida (no tiene un único responsable)
      </label>

      {!draft.isShared && (
        <>
          <label className="flex flex-col gap-1">
            Rotación
            <select value={draft.rotationMode} onChange={(e) => set("rotationMode", e.target.value as TemplateAdmin["rotationMode"])} className="surface px-2 py-1.5">
              {Object.entries(ROTATION_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            {draft.rotationMode === "FIXED" ? "Responsable fijo" : "Quién empieza la rotación"}
            <select value={draft.rotationAnchorPersonId} onChange={(e) => set("rotationAnchorPersonId", e.target.value)} className="surface px-2 py-1.5">
              <option value="">Sin asignar</option>
              {persons.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
        </>
      )}

      <label className="flex flex-col gap-1">
        Subtareas (una por línea)
        <textarea value={draft.subtasksText} onChange={(e) => set("subtasksText", e.target.value)} className="surface px-2 py-1.5" rows={4} />
      </label>

      <label className="flex items-center gap-2">
        <input type="checkbox" checked={draft.active} onChange={(e) => set("active", e.target.checked)} className="h-4 w-4" />
        Activa (genera nuevas instancias)
      </label>

      <div className="flex gap-2">
        <button onClick={save} disabled={saving} className="text-xs font-semibold px-4 py-2 rounded-full text-white" style={{ backgroundColor: "var(--accent)" }}>
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
        <button onClick={deactivate} className="text-xs font-semibold px-4 py-2 rounded-full" style={{ color: "var(--danger)", border: "1px solid var(--border)" }}>
          Desactivar
        </button>
      </div>
    </div>
  );
}
