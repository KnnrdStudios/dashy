import { useCallback, useEffect, useState } from 'react';
import DayView from './components/DayView';
import WeekView from './components/WeekView';
import TaskModal from './components/TaskModal';
import TopNav from './components/TopNav';
import QuickAddBar from './components/QuickAddBar';
import type { Business, Person, Task } from './types';
import { startOfWeekIso, todayIso } from './lib/date';

type View = 'today' | 'week';

type ModalState =
  | { kind: 'closed' }
  | { kind: 'create'; defaults?: { assigneeName?: string; businessName?: string; dueDate?: string } }
  | { kind: 'edit'; task: Task };

export default function App() {
  const [view, setView] = useState<View>('today');
  const [currentDate, setCurrentDate] = useState(todayIso());
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [modal, setModal] = useState<ModalState>({ kind: 'closed' });
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [people, setPeople] = useState<Person[]>([]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let active = true;
    Promise.all([window.api.meta.businesses(), window.api.meta.people()]).then(([b, p]) => {
      if (!active) return;
      setBusinesses(b);
      setPeople(p);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const unsub = window.api.quickAdd.onOpen(() => setQuickAddOpen(true));
    return unsub;
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') {
        const target = e.target as HTMLElement | null;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
        e.preventDefault();
        setQuickAddOpen(true);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleAddTask = useCallback(
    (defaults?: { assigneeName?: string; businessName?: string; dueDate?: string }) => {
      setModal({ kind: 'create', defaults: { dueDate: currentDate, ...defaults } });
    },
    [currentDate]
  );

  const handleEditTask = useCallback((task: Task) => {
    setModal({ kind: 'edit', task });
  }, []);

  const handleOpenDay = useCallback((iso: string) => {
    setCurrentDate(iso);
    setView('today');
  }, []);

  const handleExport = useCallback(async () => {
    const start = startOfWeekIso(currentDate);
    const md = await window.api.export.weekMarkdown(start);
    await navigator.clipboard.writeText(md);
    alert(`Week of ${start} copied to clipboard as markdown.`);
  }, [currentDate]);

  return (
    <div className="h-full w-full bg-ink-950 flex flex-col">
      <TopNav
        view={view}
        onChangeView={setView}
        people={people}
        assigneeFilter={assigneeFilter}
        onChangeAssignee={setAssigneeFilter}
        onQuickAdd={() => setQuickAddOpen(true)}
        onExport={handleExport}
      />
      <div className="flex-1 min-h-0">
        {view === 'today' && (
          <DayView
            date={currentDate}
            assigneeFilter={assigneeFilter}
            onAddTask={handleAddTask}
            onEditTask={handleEditTask}
            onChangeDate={setCurrentDate}
            reloadKey={reloadKey}
          />
        )}
        {view === 'week' && (
          <WeekView
            assigneeFilter={assigneeFilter}
            onOpenDay={handleOpenDay}
            reloadKey={reloadKey}
          />
        )}
      </div>
      {modal.kind !== 'closed' && businesses.length > 0 && people.length > 0 && (
        <TaskModal
          mode={modal.kind}
          task={modal.kind === 'edit' ? modal.task : undefined}
          defaults={modal.kind === 'create' ? modal.defaults : undefined}
          businesses={businesses}
          people={people}
          onClose={() => setModal({ kind: 'closed' })}
          onSaved={reload}
        />
      )}
      {quickAddOpen && businesses.length > 0 && people.length > 0 && (
        <QuickAddBar
          businesses={businesses}
          people={people}
          defaultDate={currentDate}
          onClose={() => setQuickAddOpen(false)}
          onSaved={reload}
        />
      )}
    </div>
  );
}
