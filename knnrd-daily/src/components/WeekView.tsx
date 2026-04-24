import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Business, Task } from '../types';
import { addDaysIso, formatShortDay, fromIso, startOfWeekIso, todayIso } from '../lib/date';

interface Props {
  assigneeFilter: string | null;
  onOpenDay: (iso: string) => void;
  reloadKey: number;
}

const PERSONS = ['Jeremy', 'Melissa', 'Kika'] as const;

export default function WeekView({ assigneeFilter, onOpenDay, reloadKey }: Props) {
  const [weekStart, setWeekStart] = useState(() => startOfWeekIso(todayIso()));
  const [tasks, setTasks] = useState<Task[]>([]);
  const [focusByDate, setFocusByDate] = useState<Record<string, Business | null>>({});
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState<number | null>(null);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDaysIso(weekStart, i)),
    [weekStart]
  );

  const load = useCallback(async () => {
    setLoading(true);
    const [list, ...focus] = await Promise.all([
      window.api.tasks.listRange(days[0], days[6]),
      ...days.map((d) => window.api.meta.focusForDate(d)),
    ]);
    setTasks(list);
    const map: Record<string, Business | null> = {};
    days.forEach((d, i) => { map[d] = focus[i]; });
    setFocusByDate(map);
    setLoading(false);
  }, [days]);

  useEffect(() => { load(); }, [load, reloadKey]);

  const tasksByDate = useMemo(() => {
    const m = new Map<string, Task[]>();
    for (const t of tasks) {
      if (assigneeFilter && t.assignee_name !== assigneeFilter) continue;
      const list = m.get(t.due_date) ?? [];
      list.push(t);
      m.set(t.due_date, list);
    }
    return m;
  }, [tasks, assigneeFilter]);

  async function onDropOnDay(date: string) {
    if (dragging == null) return;
    await window.api.tasks.move(dragging, date);
    setDragging(null);
    await load();
  }

  const today = todayIso();

  return (
    <div className="flex flex-col h-full">
      <header className="px-10 pt-8 pb-4 border-b border-ink-800 flex items-start justify-between">
        <div>
          <div className="text-sm uppercase tracking-widest text-ink-200/60">Week</div>
          <h1 className="mt-1 text-3xl font-semibold text-ink-50">
            Week of {fromIso(weekStart).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
          </h1>
        </div>
        <div className="flex items-center gap-1 mt-2">
          <button className="btn-ghost" onClick={() => setWeekStart(addDaysIso(weekStart, -7))}>‹</button>
          <button className="btn-ghost" onClick={() => setWeekStart(startOfWeekIso(todayIso()))}>This week</button>
          <button className="btn-ghost" onClick={() => setWeekStart(addDaysIso(weekStart, 7))}>›</button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-10 py-6">
        {loading ? (
          <div className="text-ink-200/60">Loading…</div>
        ) : (
          <div className="grid grid-cols-7 gap-3 h-full">
            {days.map((date) => {
              const focus = focusByDate[date];
              const dayTasks = tasksByDate.get(date) ?? [];
              const counts = PERSONS.map((name) => ({
                name,
                count: dayTasks.filter((t) => t.assignee_name === name).length,
              }));
              const businesses = Array.from(
                new Map(dayTasks.map((t) => [t.business_id, t])).values()
              );
              const isToday = date === today;
              return (
                <button
                  type="button"
                  key={date}
                  onClick={() => onOpenDay(date)}
                  onDragOver={(e) => { e.preventDefault(); }}
                  onDrop={() => onDropOnDay(date)}
                  className={[
                    'text-left flex flex-col rounded-xl border transition-colors p-3 min-h-[240px]',
                    'bg-ink-800/40 hover:bg-ink-700/40',
                    isToday ? 'border-ink-200/60' : 'border-ink-700/50',
                  ].join(' ')}
                >
                  <div className="flex items-baseline justify-between">
                    <div className={`text-xs uppercase tracking-wider ${isToday ? 'text-ink-50' : 'text-ink-200/60'}`}>
                      {formatShortDay(date)}
                    </div>
                    <div className="text-sm text-ink-100 tabular-nums">
                      {fromIso(date).getDate()}
                    </div>
                  </div>
                  {focus && (
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="business-dot" style={{ backgroundColor: focus.color }} />
                      <span className="text-[11px] text-ink-100 truncate">{focus.name}</span>
                    </div>
                  )}

                  <div className="mt-3 space-y-1">
                    {counts.map((c) => (
                      <div key={c.name} className="flex items-center justify-between text-[12px]">
                        <span className={c.count ? 'text-ink-100' : 'text-ink-200/40'}>{c.name}</span>
                        <span className={`tabular-nums ${c.count ? 'text-ink-50' : 'text-ink-200/30'}`}>{c.count}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex-1 space-y-1 overflow-hidden">
                    {dayTasks.slice(0, 4).map((t) => (
                      <div
                        key={t.id}
                        draggable
                        onDragStart={(e) => { e.stopPropagation(); setDragging(t.id); }}
                        onClick={(e) => e.stopPropagation()}
                        className={`text-[11px] truncate px-1.5 py-0.5 rounded border ${t.status === 'done' ? 'line-through opacity-60' : ''}`}
                        style={{
                          borderColor: t.business_color + '55',
                          background: t.business_color + '22',
                          color: '#ECECEE',
                        }}
                        title={`${t.title} — ${t.assignee_name}`}
                      >
                        {t.title}
                      </div>
                    ))}
                    {dayTasks.length > 4 && (
                      <div className="text-[11px] text-ink-200/50">+{dayTasks.length - 4} more</div>
                    )}
                  </div>

                  {businesses.length > 0 && (
                    <div className="mt-2 flex items-center gap-1">
                      {businesses.map((t) => (
                        <span key={t.business_id} className="business-dot" style={{ backgroundColor: t.business_color }} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
