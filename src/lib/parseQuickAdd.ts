import type { Business, Person } from '../types';
import { addDaysIso, isoWeekday, todayIso } from './date';

export interface QuickAddResult {
  title: string;
  business_id: number;
  assignee_id: number;
  due_date: string;
  estimated_minutes: number;
}

const WEEKDAYS: Record<string, number> = {
  mon: 1, monday: 1,
  tue: 2, tues: 2, tuesday: 2,
  wed: 3, weds: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
  sun: 7, sunday: 7,
};

const BUSINESS_ALIASES: Record<string, string> = {
  fba: 'Knnrd Amazon FBA',
  amazon: 'Knnrd Amazon FBA',
  ai: 'AI Consulting',
  consulting: 'AI Consulting',
  koffee: "Kika's Koffee",
  coffee: "Kika's Koffee",
  "kika's": "Kika's Koffee",
};

export function parseQuickAdd(
  input: string,
  opts: { businesses: Business[]; people: Person[]; defaultDate?: string; defaultAssignee?: string; defaultBusiness?: string }
): QuickAddResult | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const today = opts.defaultDate ?? todayIso();
  let due = today;
  let minutes = 30;
  let assigneeName: string | null = null;
  let businessName: string | null = null;

  const tokens = trimmed.split(/\s+/);
  const kept: string[] = [];
  const durationRe = /^(\d+)\s*(m|min|mins|minute|minutes|h|hr|hrs|hour|hours)$/i;

  for (const raw of tokens) {
    const token = raw.toLowerCase().replace(/[,.]$/g, '');

    // Duration like "30m" or "1h"
    const durMatch = token.match(durationRe);
    if (durMatch) {
      const n = Number(durMatch[1]);
      const unit = durMatch[2].toLowerCase();
      minutes = unit.startsWith('h') ? n * 60 : n;
      continue;
    }

    // "today", "tomorrow"
    if (token === 'today') { due = today; continue; }
    if (token === 'tomorrow' || token === 'tmrw') { due = addDaysIso(today, 1); continue; }

    // Weekday names → next occurrence (including today if it matches)
    if (token in WEEKDAYS) {
      due = nextWeekday(today, WEEKDAYS[token]);
      continue;
    }

    // Person name
    const personMatch = opts.people.find((p) => p.name.toLowerCase() === token);
    if (personMatch) { assigneeName = personMatch.name; continue; }

    // Business alias
    if (token in BUSINESS_ALIASES) { businessName = BUSINESS_ALIASES[token]; continue; }

    kept.push(raw);
  }

  const title = kept.join(' ').trim();
  if (!title) return null;

  const fallbackAssignee = opts.defaultAssignee ?? 'Jeremy';
  const person = opts.people.find((p) => p.name === (assigneeName ?? fallbackAssignee))
    ?? opts.people[0];
  if (!person) return null;

  const business = (businessName && opts.businesses.find((b) => b.name === businessName))
    ?? (opts.defaultBusiness && opts.businesses.find((b) => b.name === opts.defaultBusiness))
    ?? opts.businesses[0];
  if (!business) return null;

  return {
    title,
    business_id: business.id,
    assignee_id: person.id,
    due_date: due,
    estimated_minutes: Math.max(1, minutes),
  };
}

function nextWeekday(fromIso: string, weekday: number): string {
  const from = isoWeekday(fromIso);
  const diff = (weekday - from + 7) % 7; // 0..6, today-matches stays today
  return addDaysIso(fromIso, diff);
}
