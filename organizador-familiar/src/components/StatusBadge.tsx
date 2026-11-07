import type { EffectiveStatus } from "@/lib/types";

const CONFIG: Record<EffectiveStatus, { label: string; className: string }> = {
  DONE: { label: "Hecha", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" },
  PENDING: { label: "Pendiente", className: "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-200" },
  IN_PROGRESS: { label: "En curso", className: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200" },
  LATE: { label: "Atrasada", className: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200" },
  RESCHEDULED: { label: "Reprogramada", className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200" },
};

export function StatusBadge({ status, daysLate }: { status: EffectiveStatus; daysLate?: number }) {
  const cfg = CONFIG[status];
  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${cfg.className}`}>
      {cfg.label}
      {status === "LATE" && daysLate ? ` · ${daysLate}d` : ""}
    </span>
  );
}
