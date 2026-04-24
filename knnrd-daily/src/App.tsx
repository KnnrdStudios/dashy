import { useCallback, useEffect, useState } from 'react';
import TodayView from './components/TodayView';
import type { Task } from './types';

type View = 'today';

export default function App() {
  const [view] = useState<View>('today');
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    // Reserve the quick-add hook; the modal will plug in here next.
    const unsub = window.api.quickAdd.onOpen(() => {
      // no-op until task modal exists
    });
    return unsub;
  }, []);

  const handleAddTask = useCallback(() => {
    // Placeholder until task modal is built.
    reload();
  }, [reload]);

  const handleEditTask = useCallback((_task: Task) => {
    // Placeholder until task modal is built.
  }, []);

  return (
    <div className="h-full w-full bg-ink-950">
      {view === 'today' && (
        <TodayView
          onAddTask={handleAddTask}
          onEditTask={handleEditTask}
          reloadKey={reloadKey}
        />
      )}
    </div>
  );
}
