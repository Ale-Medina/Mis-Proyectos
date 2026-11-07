// Mapeo estático de colorKey (guardado en Category.colorKey) a clases de
// Tailwind. Tailwind v4 analiza el código fuente de forma textual, así que
// las clases tienen que aparecer completas y literales en algún lado del
// bundle: por eso este mapa explícito en vez de interpolar el string.

export type ColorKey =
  | "amber"
  | "stone"
  | "sky"
  | "violet"
  | "teal"
  | "indigo"
  | "rose"
  | "emerald"
  | "slate";

export const CATEGORY_BADGE_CLASSES: Record<string, string> = {
  amber: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  stone: "bg-stone-100 text-stone-800 dark:bg-stone-900 dark:text-stone-200",
  sky: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
  violet: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200",
  teal: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200",
  indigo: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200",
  rose: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
  emerald: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  slate: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200",
};

export const CATEGORY_DOT_CLASSES: Record<string, string> = {
  amber: "bg-amber-500",
  stone: "bg-stone-500",
  sky: "bg-sky-500",
  violet: "bg-violet-500",
  teal: "bg-teal-500",
  indigo: "bg-indigo-500",
  rose: "bg-rose-500",
  emerald: "bg-emerald-500",
  slate: "bg-slate-500",
};

export function categoryBadgeClass(colorKey: string): string {
  return CATEGORY_BADGE_CLASSES[colorKey] ?? CATEGORY_BADGE_CLASSES.slate;
}

export function categoryDotClass(colorKey: string): string {
  return CATEGORY_DOT_CLASSES[colorKey] ?? CATEGORY_DOT_CLASSES.slate;
}
