import { useState } from 'react';
import type { Task } from '../types';

interface Props {
  task: Task;
  selected?: boolean;
  onToggle: (task: Task) => void;
  onSelect?: (task: Task) => void;
}

const BUSINESS_COLOR_CLASSES: Record<string, string> = {
  'Knnrd Amazon FBA': 'bg-fba/15 text-fba border-fba/30',
  'AI Consulting': 'bg-consulting/15 text-consulting border-consulting/30',
  "Kika's Koffee": 'bg-koffee/20 text-koffee border-koffee/40',
};

export default function TaskItem({ task, selected, onToggle, onSelect }: Props) {
  const [pending, setPending] = useState(false);
  const tag = BUSINESS_COLOR_CLASSES[task.business_name] ?? 'bg-ink-700 text-ink-100';
  const done = task.status === 'done';

  async function toggle() {
    setPending(true);
    await onToggle(task);
    setPending(false);
  }

  return (
    <div
      onClick={() => onSelect?.(task)}
      className={[
        'group flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors cursor-pointer',
        selected ? 'bg-ink-700/80 border-ink-200/30' : 'bg-ink-800/40 border-ink-700/50 hover:bg-ink-700/40',
      ].join(' ')}
    >
      <button
        type="button"
        aria-label={done ? 'Mark pending' : 'Mark done'}
        onClick={(e) => { e.stopPropagation(); toggle(); }}
        disabled={pending}
        className={[
          'h-5 w-5 shrink-0 rounded-md border-2 flex items-center justify-center transition-colors',
          done ? 'bg-ink-50 border-ink-50' : 'border-ink-200/40 hover:border-ink-100',
        ].join(' ')}
      >
        {done && (
          <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 text-ink-900" fill="currentColor">
            <path d="M7.7 13.3 4.4 10l-1.1 1.1 4.4 4.4 9.9-9.9-1.1-1.1z" />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className={`truncate text-[15px] ${done ? 'line-through text-ink-200/60' : 'text-ink-50'}`}>
          {task.title}
        </div>
        {task.description && (
          <div className="truncate text-xs text-ink-200/60">{task.description}</div>
        )}
      </div>

      <span className={`shrink-0 text-[11px] px-2 py-0.5 rounded-full border ${tag}`}>
        {task.business_name}
      </span>
      <span className="shrink-0 text-xs text-ink-200/70 tabular-nums w-12 text-right">
        {task.estimated_minutes}m
      </span>
    </div>
  );
}
