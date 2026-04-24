import { useEffect, useRef, useState } from 'react';
import type { Business, CreateTaskInput, Person, Recurrence, Task } from '../types';
import { todayIso } from '../lib/date';

interface Props {
  mode: 'create' | 'edit';
  task?: Task;
  defaults?: {
    assigneeName?: string;
    businessName?: string;
    dueDate?: string;
  };
  businesses: Business[];
  people: Person[];
  onClose: () => void;
  onSaved: () => void;
}

export default function TaskModal({
  mode, task, defaults, businesses, people, onClose, onSaved,
}: Props) {
  const titleRef = useRef<HTMLInputElement>(null);

  const defaultBusiness = (() => {
    if (task) return task.business_id;
    if (defaults?.businessName) {
      const match = businesses.find((b) => b.name === defaults.businessName);
      if (match) return match.id;
    }
    return businesses[0]?.id ?? 0;
  })();

  const defaultAssignee = (() => {
    if (task) return task.assignee_id;
    if (defaults?.assigneeName) {
      const match = people.find((p) => p.name === defaults.assigneeName);
      if (match) return match.id;
    }
    return people[0]?.id ?? 0;
  })();

  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [businessId, setBusinessId] = useState<number>(defaultBusiness);
  const [assigneeId, setAssigneeId] = useState<number>(defaultAssignee);
  const [dueDate, setDueDate] = useState(task?.due_date ?? defaults?.dueDate ?? todayIso());
  const [estimatedMinutes, setEstimatedMinutes] = useState(task?.estimated_minutes ?? 30);
  const [recurrence, setRecurrence] = useState<Recurrence>(task?.recurrence_type ?? 'none');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    titleRef.current?.focus();
    titleRef.current?.select();
  }, []);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        submit();
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, businessId, assigneeId, dueDate, estimatedMinutes, recurrence]);

  async function submit() {
    if (!title.trim()) {
      setError('Title is required.');
      titleRef.current?.focus();
      return;
    }
    setSaving(true);
    setError(null);
    const payload: CreateTaskInput = {
      title: title.trim(),
      description: description.trim() || undefined,
      business_id: businessId,
      assignee_id: assigneeId,
      due_date: dueDate,
      estimated_minutes: Math.max(1, estimatedMinutes),
      recurrence_type: recurrence,
    };
    try {
      if (mode === 'create') {
        await window.api.tasks.create(payload);
      } else if (task) {
        await window.api.tasks.update(task.id, payload);
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!task) return;
    const ok = window.confirm('Delete this task?');
    if (!ok) return;
    setSaving(true);
    try {
      await window.api.tasks.remove(task.id);
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-ink-50">
            {mode === 'create' ? 'New task' : 'Edit task'}
          </h2>
          <button type="button" onClick={onClose} className="btn-ghost text-xs">ESC</button>
        </div>

        <div className="space-y-4">
          <Field label="Title">
            <input
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Ship the brand positioning doc"
              className="input"
            />
          </Field>

          <Field label="Notes">
            <textarea
              value={description ?? ''}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Optional detail"
              className="input resize-none"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Business">
              <select
                value={businessId}
                onChange={(e) => setBusinessId(Number(e.target.value))}
                className="input"
              >
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Assignee">
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(Number(e.target.value))}
                className="input"
              >
                {people.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Due date">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Estimated (min)">
              <input
                type="number"
                min={1}
                step={5}
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
                className="input"
              />
            </Field>
            <Field label="Repeats">
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as Recurrence)}
                className="input"
              >
                <option value="none">Never</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </Field>
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/30 rounded px-3 py-2">
              {error}
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between gap-2">
          {mode === 'edit' ? (
            <button type="button" onClick={remove} disabled={saving} className="btn text-red-400 hover:bg-red-400/10">
              Delete
            </button>
          ) : <div />}
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button
              type="button"
              onClick={submit}
              disabled={saving}
              className="btn-primary"
            >
              {mode === 'create' ? 'Add task' : 'Save'}
              <span className="ml-2 opacity-60 text-xs">⌘↵</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-widest text-ink-200/60 mb-1.5">{label}</span>
      {children}
    </label>
  );
}
