// Utilidades de fecha para la zona horaria de Argentina.
//
// Convención interna: toda "fecha de calendario" (día) se representa como un
// objeto Date en medianoche UTC cuyos componentes Y-M-D coinciden con el día
// calendario real en Argentina. Así evitamos depender de la zona horaria del
// servidor donde corre el proceso: `today()` siempre devuelve el día de hoy
// en Argentina, sin importar dónde esté desplegada la app. A partir de ahí,
// toda la aritmética de fechas se hace exclusivamente con getters/setters UTC
// (nunca con los métodos "locales" de Date), por lo que el resultado es
// siempre coherente.

import { formatInTimeZone } from "date-fns-tz";

export const TIMEZONE = "America/Argentina/Cordoba";

const WEEKDAY_NAMES = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];

const WEEKDAY_SHORT = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];

const MONTH_NAMES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

export function nowDayKey(): string {
  return formatInTimeZone(new Date(), TIMEZONE, "yyyy-MM-dd");
}

export function nowTimeHHmm(): string {
  return formatInTimeZone(new Date(), TIMEZONE, "HH:mm");
}

export function dayKeyToDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function dateToDayKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function today(): Date {
  return dayKeyToDate(nowDayKey());
}

export function addDays(date: Date, n: number): Date {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

export function addMonths(date: Date, n: number): Date {
  const d = new Date(date.getTime());
  d.setUTCMonth(d.getUTCMonth() + n);
  return d;
}

export function diffDays(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

export function diffMonths(a: Date, b: Date): number {
  return (
    (a.getUTCFullYear() - b.getUTCFullYear()) * 12 +
    (a.getUTCMonth() - b.getUTCMonth())
  );
}

/** 0 = domingo ... 6 = sábado (coincide con el día calendario en Argentina) */
export function weekdayOf(date: Date): number {
  return date.getUTCDay();
}

export function startOfWeekMonday(date: Date): Date {
  const wd = weekdayOf(date);
  const diff = wd === 0 ? 6 : wd - 1;
  return addDays(date, -diff);
}

export function endOfWeekSunday(date: Date): Date {
  return addDays(startOfWeekMonday(date), 6);
}

export function diffWeeksMonday(a: Date, b: Date): number {
  return Math.round(
    diffDays(startOfWeekMonday(a), startOfWeekMonday(b)) / 7,
  );
}

export function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function endOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
}

export function lastDayOfMonthNum(date: Date): number {
  return endOfMonth(date).getUTCDate();
}

export function dateAtDay(date: Date, day: number): Date {
  const lastDay = lastDayOfMonthNum(date);
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), Math.min(day, lastDay)),
  );
}

export function formatDMY(date: Date): string {
  const d = String(date.getUTCDate()).padStart(2, "0");
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const y = date.getUTCFullYear();
  return `${d}/${m}/${y}`;
}

export function formatDM(date: Date): string {
  const d = String(date.getUTCDate()).padStart(2, "0");
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${d}/${m}`;
}

export function weekdayName(date: Date): string {
  return WEEKDAY_NAMES[weekdayOf(date)];
}

export function weekdayShort(date: Date): string {
  return WEEKDAY_SHORT[weekdayOf(date)];
}

export function monthName(date: Date): string {
  return MONTH_NAMES[date.getUTCMonth()];
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function isSameDay(a: Date, b: Date): boolean {
  return dateToDayKey(a) === dateToDayKey(b);
}

export function isBeforeDay(a: Date, b: Date): boolean {
  return dateToDayKey(a) < dateToDayKey(b);
}

export function isAfterDay(a: Date, b: Date): boolean {
  return dateToDayKey(a) > dateToDayKey(b);
}

export function parseHHmm(value: string): { h: number; m: number } {
  const [h, m] = value.split(":").map(Number);
  return { h, m };
}

export function addMinutesToTime(value: string, minutes: number): string {
  const { h, m } = parseHHmm(value);
  const total = h * 60 + m + minutes;
  const normalized = ((total % 1440) + 1440) % 1440;
  const hh = Math.floor(normalized / 60)
    .toString()
    .padStart(2, "0");
  const mm = (normalized % 60).toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

export function fullLabel(date: Date): string {
  return `${capitalize(weekdayName(date))} ${formatDMY(date)}`;
}
