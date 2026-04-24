export function todayIso(): string {
  return toIso(new Date());
}

export function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromIso(iso: string): Date {
  return new Date(`${iso}T12:00:00`);
}

export function addDaysIso(iso: string, days: number): string {
  const d = fromIso(iso);
  d.setDate(d.getDate() + days);
  return toIso(d);
}

export function startOfWeekIso(iso: string): string {
  const d = fromIso(iso);
  const js = d.getDay(); // 0..6, Sun..Sat
  const diff = js === 0 ? -6 : 1 - js; // shift to Monday
  d.setDate(d.getDate() + diff);
  return toIso(d);
}

export function formatLongDate(iso: string): string {
  const d = fromIso(iso);
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatShortDay(iso: string): string {
  const d = fromIso(iso);
  return d.toLocaleDateString(undefined, { weekday: 'short' });
}

export function isoWeekday(iso: string): number {
  const d = fromIso(iso);
  const js = d.getDay();
  return js === 0 ? 7 : js;
}
