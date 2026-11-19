"use client";

import { useState } from "react";
import useSWR from "swr";
import { apiSend, swrFetcher } from "@/lib/api-client";
import { Section } from "@/components/Section";
import { TemplateEditor } from "@/components/TemplateEditor";
import { NewTemplateForm } from "@/components/NewTemplateForm";
import { useMe } from "@/hooks/useMe";
import type { Category, Person, TemplateAdmin, WeekdayResponsibility } from "@/lib/types";

const WEEKDAY_LABELS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const COLOR_KEYS = ["amber", "stone", "sky", "violet", "teal", "indigo", "rose", "emerald", "slate"];

function WeekdayTable({ kind, title }: { kind: "WORK_BLOCK" | "LUNCH"; title: string }) {
  const { data, mutate } = useSWR<{ items: WeekdayResponsibility[] }>("/api/weekday-responsibility", swrFetcher);
  const { data: profiles } = useSWR<{ persons: Person[] }>("/api/auth/profiles", swrFetcher);

  async function update(dayOfWeek: number, personId: string) {
    await apiSend("/api/weekday-responsibility", "PUT", { kind, dayOfWeek, personId: personId || null });
    mutate();
  }

  return (
    <div className="surface px-4 py-3">
      <p className="text-xs font-semibold mb-2" style={{ color: "var(--muted)" }}>{title}</p>
      <div className="flex flex-col gap-1.5">
        {[1, 2, 3, 4, 5, 6, 0].map((dow) => {
          const item = data?.items.find((r) => r.kind === kind && r.dayOfWeek === dow);
          return (
            <div key={dow} className="flex items-center justify-between text-sm">
              <span>{WEEKDAY_LABELS[dow]}</span>
              <select
                value={item?.personId ?? ""}
                onChange={(e) => update(dow, e.target.value)}
                className="surface px-2 py-1 text-xs"
              >
                <option value="">—</option>
                {profiles?.persons.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GeneralSettingsForm() {
  const { data, mutate } = useSWR<{ settings: { systemStartDate: string; defaultWakeTime: string; trialPeriodWeeks: number } }>(
    "/api/settings",
    swrFetcher,
  );
  const [wake, setWake] = useState("");
  const [trial, setTrial] = useState("");

  async function save() {
    await apiSend("/api/settings", "PUT", {
      defaultWakeTime: wake || undefined,
      trialPeriodWeeks: trial ? Number(trial) : undefined,
    });
    mutate();
  }

  return (
    <div className="surface px-4 py-3 flex flex-col gap-2 text-sm">
      <p style={{ color: "var(--muted)" }}>Fecha de inicio del sistema (ancla de rotaciones): {data?.settings.systemStartDate}</p>
      <label className="flex items-center justify-between gap-2">
        Hora de despertar por defecto
        <input type="time" defaultValue={data?.settings.defaultWakeTime} onChange={(e) => setWake(e.target.value)} className="surface px-2 py-1" />
      </label>
      <label className="flex items-center justify-between gap-2">
        Semanas del período de prueba (estimado vs. real)
        <input type="number" defaultValue={data?.settings.trialPeriodWeeks} onChange={(e) => setTrial(e.target.value)} className="surface px-2 py-1 w-16" />
      </label>
      <button onClick={save} className="self-start text-xs font-semibold px-3 py-1.5 rounded-full text-white" style={{ backgroundColor: "var(--accent)" }}>
        Guardar
      </button>
    </div>
  );
}

function NewCategoryForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [balanceGroup, setBalanceGroup] = useState("HOUSEHOLD");
  const [colorKey, setColorKey] = useState("slate");

  async function create() {
    if (!name.trim()) return;
    await apiSend("/api/categories", "POST", { name: name.trim(), balanceGroup, colorKey });
    setName("");
    onCreated();
  }

  return (
    <div className="surface px-4 py-3 flex flex-col gap-2">
      <p className="text-xs font-semibold" style={{ color: "var(--muted)" }}>Nueva categoría</p>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ej: Frente de la casa" className="surface px-2 py-1.5 text-sm" />
      <div className="flex gap-2 flex-wrap">
        <select value={balanceGroup} onChange={(e) => setBalanceGroup(e.target.value)} className="surface px-2 py-1 text-xs">
          <option value="WORK">Trabajo</option>
          <option value="HOUSEHOLD">Tareas domésticas</option>
          <option value="CHILDCARE">Cuidado de la nena</option>
          <option value="PERSONAL">Personal</option>
        </select>
        <select value={colorKey} onChange={(e) => setColorKey(e.target.value)} className="surface px-2 py-1 text-xs">
          {COLOR_KEYS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button onClick={create} className="text-xs font-semibold px-3 py-1 rounded-full text-white" style={{ backgroundColor: "var(--accent)" }}>
          Crear
        </button>
      </div>
    </div>
  );
}

export default function ConfiguracionPage() {
  const { me } = useMe();
  const { data: catData, mutate: mutateCats } = useSWR<{ categories: Category[] }>("/api/categories", swrFetcher);
  const { data: tplData, mutate: mutateTpls } = useSWR<{ templates: TemplateAdmin[] }>("/api/templates", swrFetcher);
  const { data: profiles } = useSWR<{ persons: Person[] }>("/api/auth/profiles", swrFetcher);
  const [openId, setOpenId] = useState<string | null>(null);

  const categories = catData?.categories ?? [];
  const templates = tplData?.templates ?? [];
  const persons = profiles?.persons ?? [];

  const byCategory = categories.map((c) => ({
    category: c,
    items: templates.filter((t) => t.categoryId === c.id),
  }));

  return (
    <div className="pt-1 pb-6">
      <h1 className="text-xl font-extrabold mb-1">Configuración</h1>
      <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>
        Todo lo de esta página se puede ajustar sin tocar código: tareas, responsables, frecuencias, duraciones,
        horarios y categorías.
      </p>

      <Section title="Tu cuenta">
        <div className="surface px-4 py-3 text-sm">Sesión activa: <strong>{me?.name}</strong></div>
      </Section>

      <Section title="General">
        <GeneralSettingsForm />
      </Section>

      <Section title="Responsabilidades por día (trabajo y almuerzo)">
        <div className="grid sm:grid-cols-2 gap-3">
          <WeekdayTable kind="WORK_BLOCK" title="Bloque de trabajo protegido" />
          <WeekdayTable kind="LUNCH" title="Almuerzo" />
        </div>
      </Section>

      <Section title="Categorías">
        <div className="flex flex-wrap gap-2 mb-2">
          {categories.map((c) => (
            <span key={c.id} className="text-xs px-2.5 py-1 rounded-full surface">{c.name}</span>
          ))}
        </div>
        <NewCategoryForm onCreated={mutateCats} />
      </Section>

      <Section title="Tareas y rotaciones">
        <NewTemplateForm categories={categories} onCreated={mutateTpls} />
        {byCategory.map(({ category, items }) => (
          items.length > 0 && (
            <div key={category.id} className="mt-3">
              <p className="text-xs font-bold mb-1.5" style={{ color: "var(--muted)" }}>{category.name}</p>
              <div className="flex flex-col gap-1.5">
                {items.map((t) => (
                  <div key={t.id} className="surface px-3 py-2.5">
                    <button
                      onClick={() => setOpenId(openId === t.id ? null : t.id)}
                      className="w-full flex items-center justify-between text-left"
                    >
                      <span className={`text-sm font-medium ${!t.active ? "opacity-50 line-through" : ""}`}>{t.name}</span>
                      <span className="text-[11px]" style={{ color: "var(--muted)" }}>
                        {t.durationMinutes}min · {t.rotationAnchorPersonName ?? (t.isShared ? "compartida" : "sin asignar")}
                      </span>
                    </button>
                    {openId === t.id && (
                      <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                        <TemplateEditor template={t} categories={categories} persons={persons} onSaved={mutateTpls} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        ))}
      </Section>
    </div>
  );
}
