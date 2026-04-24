import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Business, Task } from '../types';
import { addDaysIso, formatLongDate, todayIso } from '../lib/date';
import TaskItem from './TaskItem';

interface Props {
  date: string;
  assigneeFilter: string | null;
  onAddTask: (defaults?: { assigneeName?: string; businessName?: string; dueDate?: string }) => void;
  onEditTask: (task: Task) => void;
  onChangeDate: (iso: string) => void;
  reloadKey: number;
}

export default function DayView({
  date, assigneeFilter, onAddTask, onEditTask, onChangeDate, reloadKey,
}: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [focus, setFocus] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const isToday = date === todayIso();

  const load = useCallback(async () => {
    setLoading(true);
    const [list, f] = await Promise.all([
      window.api.tasks.list({ date }),
      window.api.meta.focusForDate(date),
    ]);
    setTasks(list);
    setFocus(f);
    setLoading(false);
  }, [date]);

  useEffect(() => { load(); }, [load, reloadKey]);

  const toggle = useCallback(async (task: Task) => {
    const next = task.status === 'done' ? 'pending' : 'done';
    await window.api.tasks.setStatus(task.id, next);
    await load();
  }, [load]);

  const byPerson = useMemo(() => {
    const m = new Map<string, Task[]>();
    for (const t of tasks) {
      if (assigneeFilter && t.assignee_name !== assigneeFilter) continue;
      const list = m.get(t.assignee_name) ?? [];
      list.push(t);
      m.set(t.assignee_name, list);
    }
    return m;
  }, [tasks, assigneeFilter]);

  const jeremyTasks = byPerson.get('Jeremy') ?? [];
  const melissaTasks = byPerson.get('Melissa') ?? [];
  const kikaTasks = byPerson.get('Kika') ?? [];

  const jeremyFocusTasks = useMemo(
    () => jeremyTasks.filter((t) => focus && t.business_id === focus.id),
    [jeremyTasks, focus]
  );
  const jeremyOtherTasks = useMemo(
    () => jeremyTasks.filter((t) => !focus || t.business_id !== focus.id),
    [jeremyTasks, focus]
  );

  const allJeremyDone = jeremyTasks.length > 0 && jeremyTasks.every((t) => t.status === 'done');

  const flatTasks = useMemo(
    () => [...jeremyFocusTasks, ...jeremyOtherTasks, ...melissaTasks, ...kikaTasks],
    [jeremyFocusTasks, jeremyOtherTasks, melissaTasks, kikaTasks]
  );

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!flatTasks.length) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const ids = flatTasks.map((t) => t.id);
        const idx = selectedId == null ? -1 : ids.indexOf(selectedId);
        const nextIdx = e.key === 'ArrowDown'
          ? Math.min(idx + 1, ids.length - 1)
          : Math.max(idx - 1, 0);
        setSelectedId(ids[nextIdx]);
      } else if (e.key === ' ' && selectedId != null) {
        e.preventDefault();
        const t = flatTasks.find((x) => x.id === selectedId);
        if (t) toggle(t);
      } else if (e.key === 'Enter' && selectedId != null) {
        e.preventDefault();
        const t = flatTasks.find((x) => x.id === selectedId);
        if (t) onEditTask(t);
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [flatTasks, selectedId, toggle, onEditTask]);

  if (loading) {
    return <div className="p-8 text-ink-200/60">Loading…</div>;
  }

  const showMelissa = !assigneeFilter || assigneeFilter === 'Melissa';
  const showKika = !assigneeFilter || assigneeFilter === 'Kika';
  const showJeremy = !assigneeFilter || assigneeFilter === 'Jeremy';

  return (
    <div className={`flex flex-col h-full ${allJeremyDone && isToday && !assigneeFilter ? 'opacity-70' : ''}`}>
      <header className="px-10 pt-8 pb-5 border-b border-ink-800 flex items-start justify-between">
        <div>
          <div className="text-sm uppercase tracking-widest text-ink-200/60">
            {isToday ? 'Today' : 'Day'}
          </div>
          <h1 className="mt-1 text-3xl font-semibold text-ink-50">{formatLongDate(date)}</h1>
          {focus && (
            <div className="mt-2 flex items-center gap-2 text-ink-100">
              <span className="business-dot" style={{ backgroundColor: focus.color }} />
              <span className="text-base">Focus: <strong>{focus.name}</strong></span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 mt-2">
          <button className="btn-ghost" onClick={() => onChangeDate(addDaysIso(date, -1))} aria-label="Previous day">‹</button>
          <button className="btn-ghost" onClick={() => onChangeDate(todayIso())} disabled={isToday}>Today</button>
          <button className="btn-ghost" onClick={() => onChangeDate(addDaysIso(date, 1))} aria-label="Next day">›</button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-10 py-6 space-y-10">
        {showJeremy && (
          <Section
            title="Jeremy's tasks"
            count={jeremyTasks.length}
            onAdd={() => onAddTask({ assigneeName: 'Jeremy', dueDate: date })}
            emptyHint={assigneeFilter ? 'No tasks for Jeremy.' : 'Nothing on your plate. Add the one thing that matters today.'}
          >
            {jeremyFocusTasks.length > 0 && (
              <div className="space-y-1.5">
                {jeremyFocusTasks.map((t) => (
                  <TaskItem key={t.id} task={t}
                    selected={selectedId === t.id}
                    onToggle={toggle}
                    onSelect={(task) => { setSelectedId(task.id); onEditTask(task); }}
                  />
                ))}
              </div>
            )}
            {jeremyOtherTasks.length > 0 && (
              <>
                <div className="mt-4 text-xs uppercase tracking-widest text-ink-200/50">
                  Also today (other businesses)
                </div>
                <div className="mt-2 space-y-1.5">
                  {jeremyOtherTasks.map((t) => (
                    <TaskItem key={t.id} task={t}
                      selected={selectedId === t.id}
                      onToggle={toggle}
                      onSelect={(task) => { setSelectedId(task.id); onEditTask(task); }}
                    />
                  ))}
                </div>
              </>
            )}
          </Section>
        )}

        {showMelissa && melissaTasks.length > 0 && (
          <Section
            title="Melissa's tasks"
            count={melissaTasks.length}
            onAdd={() => onAddTask({ assigneeName: 'Melissa', businessName: "Kika's Koffee", dueDate: date })}
          >
            <div className="space-y-1.5">
              {melissaTasks.map((t) => (
                <TaskItem key={t.id} task={t}
                  selected={selectedId === t.id}
                  onToggle={toggle}
                  onSelect={(task) => { setSelectedId(task.id); onEditTask(task); }}
                />
              ))}
            </div>
          </Section>
        )}

        {showKika && kikaTasks.length > 0 && (
          <Section
            title="Kika's tasks"
            count={kikaTasks.length}
            onAdd={() => onAddTask({ assigneeName: 'Kika', businessName: "Kika's Koffee", dueDate: date })}
          >
            <div className="space-y-1.5">
              {kikaTasks.map((t) => (
                <TaskItem key={t.id} task={t}
                  selected={selectedId === t.id}
                  onToggle={toggle}
                  onSelect={(task) => { setSelectedId(task.id); onEditTask(task); }}
                />
              ))}
            </div>
          </Section>
        )}

        {showMelissa && melissaTasks.length === 0 && assigneeFilter === 'Melissa' && (
          <div className="text-ink-200/60 italic">No tasks for Melissa on this day.</div>
        )}
        {showKika && kikaTasks.length === 0 && assigneeFilter === 'Kika' && (
          <div className="text-ink-200/60 italic">No tasks for Kika on this day.</div>
        )}
      </main>

      <footer className="px-10 py-4 border-t border-ink-800 flex items-center justify-between">
        <div className="text-sm text-ink-200/70">
          {allJeremyDone && isToday
            ? 'Day complete. Close the laptop.'
            : `${jeremyTasks.filter((t) => t.status !== 'done').length} left for Jeremy`}
        </div>
        <button
          type="button"
          disabled={!allJeremyDone || !isToday}
          className={`btn ${allJeremyDone && isToday ? 'btn-primary' : 'bg-ink-800 text-ink-200/50 cursor-not-allowed'}`}
        >
          Day complete
        </button>
      </footer>
    </div>
  );
}

interface SectionProps {
  title: string;
  count: number;
  onAdd: () => void;
  emptyHint?: string;
  children: React.ReactNode;
}

function Section({ title, count, onAdd, emptyHint, children }: SectionProps) {
  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-lg font-semibold text-ink-50">
          {title} <span className="text-ink-200/50 text-sm font-normal">· {count}</span>
        </h2>
        <button type="button" onClick={onAdd} className="btn-ghost text-sm">+ Add</button>
      </div>
      {count === 0 && emptyHint ? (
        <div className="text-sm text-ink-200/60 italic">{emptyHint}</div>
      ) : (
        <>{children}</>
      )}
    </section>
  );
}
