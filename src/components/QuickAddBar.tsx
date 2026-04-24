import { useEffect, useRef, useState } from 'react';
import type { Business, Person } from '../types';
import { parseQuickAdd } from '../lib/parseQuickAdd';
import { formatLongDate } from '../lib/date';

interface Props {
  businesses: Business[];
  people: Person[];
  defaultDate: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function QuickAddBar({
  businesses, people, defaultDate, onClose, onSaved,
}: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');

  useEffect(() => {
    ref.current?.focus();
  }, []);

  const preview = parseQuickAdd(value, { businesses, people, defaultDate });

  async function submit() {
    const parsed = parseQuickAdd(value, { businesses, people, defaultDate });
    if (!parsed) return;
    await window.api.tasks.create(parsed);
    onSaved();
    onClose();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }

  return (
    <div
      role="dialog"
      aria-label="Quick add task"
      className="fixed inset-x-0 top-0 z-50 flex justify-center pt-20 px-4 bg-ink-950/60 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-2xl card p-4 shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-ink-200/60 mb-2">
          <span>Quick add</span>
          <span className="text-ink-200/40">Enter to save · Esc to cancel</span>
        </div>
        <input
          ref={ref}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="e.g. Email supplier tomorrow 30min koffee Melissa"
          className="w-full bg-transparent border-0 text-xl text-ink-50 placeholder-ink-200/30 focus:outline-none"
        />
        {preview ? (
          <Preview
            title={preview.title}
            business={businesses.find((b) => b.id === preview.business_id)?.name ?? ''}
            assignee={people.find((p) => p.id === preview.assignee_id)?.name ?? ''}
            dueDate={preview.due_date}
            minutes={preview.estimated_minutes}
          />
        ) : (
          <div className="mt-3 text-xs text-ink-200/40">
            Tokens recognized: today, tomorrow, weekday names (mon/tue/…), 30m, 1h, person names
            (Jeremy/Melissa/Kika), businesses (fba, ai, koffee).
          </div>
        )}
      </div>
    </div>
  );
}

function Preview({ title, business, assignee, dueDate, minutes }: {
  title: string; business: string; assignee: string; dueDate: string; minutes: number;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-200/80">
      <span><strong className="text-ink-50">{title}</strong></span>
      <span>· {assignee}</span>
      <span>· {business}</span>
      <span>· {formatLongDate(dueDate)}</span>
      <span>· {minutes}m</span>
    </div>
  );
}
