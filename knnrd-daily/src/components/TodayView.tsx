import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Business, Task } from '../types';
import { formatLongDate, todayIso } from '../lib/date';
import TaskItem from './TaskItem';

interface Props {
  onAddTask: (defaults?: { assigneeName?: string; businessName?: string }) => void;
  onEditTask: (task: Task) => void;
  reloadKey: number;
}

export default function TodayView({ onAddTask, onEditTask, reloadKey }: Props) {
  const [today] = useState(todayIso());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [focus, setFocus] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const [list, f] = await Promise.all([
      window.api.tasks.list({ date: today }),
      window.api.meta.focusForDate(today),
    ]);
    setTasks(list);
    setFocus(f);
    setLoading(false);
  }, [today]);

  useEffect(() => { load(); }, [load, reloadKey]);

  const toggle = useCallback(async (task: Task) => {
    const next = task.status === 'done' ? 'pending' : 'done';
    await window.api.tasks.setStatus(task.id, next);
    await load();
  }, [load]);

  const byPerson = useMemo(() => {
    const m = new Map<string, Task[]>();
    for (const t of tasks) {
      const list = m.get(t.assignee_name) ?? [];
      list.push(t);
      m.set(t.assignee_name, list);
    }
    return m;
  }, [tasks]);

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

  // Keyboard nav
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!tasks.length) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const ids = tasks.map((t) => t.id);
        const idx = selectedId == null ? -1 : ids.indexOf(selectedId);
        const nextIdx = e.key === 'ArrowDown'
          ? Math.min(idx + 1, ids.length - 1)
          : Math.max(idx - 1, 0);
        setSelectedId(ids[nextIdx]);
      } else if (e.key === ' ' && selectedId != null) {
        e.preventDefault();
        const t = tasks.find((x) => x.id === selectedId);
        if (t) toggle(t);
      } else if (e.key === 'Enter' && selectedId != null) {
        e.preventDefault();
        const t = tasks.find((x) => x.id === selectedId);
        if (t) onEditTask(t);
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [tasks, selectedId, toggle, onEditTask]);

  if (loading) {
    return <div className="p-8 text-ink-200/60">Loading…</div>;
  }

  return (
    <div className={`flex flex-col h-full ${allJeremyDone ? 'opacity-70' : ''}`}>
      <header className="px-10 pt-10 pb-6 border-b border-ink-800">
        <div className="text-sm uppercase tracking-widest text-ink-200/60">Today</div>
        <h1 className="mt-1 text-4xl font-semibold text-ink-50">{formatLongDate(today)}</h1>
        {focus && (
          <div className="mt-3 flex items-center gap-2 text-ink-100">
            <span className="business-dot" style={{ backgroundColor: focus.color }} />
            <span className="text-lg">Focus: <strong>{focus.name}</strong></span>
          </div>
        )}
      </header>

      <main className="flex-1 overflow-y-auto px-10 py-6 space-y-10">
        <Section
          title="Jeremy's tasks today"
          count={jeremyTasks.length}
          onAdd={() => onAddTask({ assigneeName: 'Jeremy' })}
          emptyHint="Nothing on your plate. Add the one thing that matters today."
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

        {melissaTasks.length > 0 && (
          <Section
            title="Melissa's tasks today"
            count={melissaTasks.length}
            onAdd={() => onAddTask({ assigneeName: 'Melissa', businessName: "Kika's Koffee" })}
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

        {kikaTasks.length > 0 && (
          <Section
            title="Kika's tasks today"
            count={kikaTasks.length}
            onAdd={() => onAddTask({ assigneeName: 'Kika', businessName: "Kika's Koffee" })}
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
      </main>

      <footer className="px-10 py-5 border-t border-ink-800 flex items-center justify-between">
        <div className="text-sm text-ink-200/70">
          {allJeremyDone ? 'Day complete. Close the laptop.' : `${jeremyTasks.filter((t) => t.status !== 'done').length} left for you today`}
        </div>
        <button
          type="button"
          disabled={!allJeremyDone}
          className={`btn ${allJeremyDone ? 'btn-primary' : 'bg-ink-800 text-ink-200/50 cursor-not-allowed'}`}
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
