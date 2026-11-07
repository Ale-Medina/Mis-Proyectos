"use client";

import { useState } from "react";
import { apiSend } from "@/lib/api-client";
import type { Category } from "@/lib/types";

export function NewTemplateForm({ categories, onCreated }: { categories: Category[]; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [frequency, setFrequency] = useState<"DAILY" | "WEEKLY" | "MONTHLY" | "ONCE">("WEEKLY");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [saving, setSaving] = useState(false);

  async function create() {
    if (!name.trim() || !categoryId) return;
    setSaving(true);
    try {
      await apiSend("/api/templates", "POST", {
        name: name.trim(),
        categoryId,
        frequency,
        durationMinutes,
        rotationMode: "NONE",
      });
      setName("");
      onCreated();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="surface px-4 py-3 flex flex-col gap-2">
      <p className="text-xs font-semibold" style={{ color: "var(--muted)" }}>Nueva tarea</p>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre de la tarea" className="surface px-2 py-1.5 text-sm" />
      <div className="flex gap-2 flex-wrap">
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="surface px-2 py-1 text-xs">
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select value={frequency} onChange={(e) => setFrequency(e.target.value as typeof frequency)} className="surface px-2 py-1 text-xs">
          <option value="DAILY">Diaria</option>
          <option value="WEEKLY">Semanal</option>
          <option value="MONTHLY">Mensual</option>
          <option value="ONCE">Única vez</option>
        </select>
        <input
          type="number"
          value={durationMinutes}
          onChange={(e) => setDurationMinutes(Number(e.target.value))}
          className="surface px-2 py-1 text-xs w-20"
          title="Duración en minutos"
        />
        <button onClick={create} disabled={saving} className="text-xs font-semibold px-3 py-1 rounded-full text-white" style={{ backgroundColor: "var(--accent)" }}>
          Crear
        </button>
      </div>
      <p className="text-[11px]" style={{ color: "var(--muted)" }}>
        Después de crearla, abrila en la lista para configurar días, rotación, hora y subtareas.
      </p>
    </div>
  );
}
