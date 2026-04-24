import type { IpcMain } from 'electron';
import { getDb } from './db';

interface TaskRow {
  id: number;
  title: string;
  description: string | null;
  business_id: number;
  assignee_id: number;
  due_date: string;
  estimated_minutes: number;
  status: 'pending' | 'done';
  recurrence_type: 'none' | 'daily' | 'weekly' | 'monthly';
  recurrence_parent_id: number | null;
  created_at: string;
  completed_at: string | null;
  business_name?: string;
  business_color?: string;
  assignee_name?: string;
}

interface CreateTaskInput {
  title: string;
  description?: string;
  business_id: number;
  assignee_id: number;
  due_date: string;
  estimated_minutes?: number;
  recurrence_type?: 'none' | 'daily' | 'weekly' | 'monthly';
}

const taskSelect = `
  SELECT t.*,
    b.name AS business_name, b.color AS business_color,
    p.name AS assignee_name
  FROM tasks t
  JOIN businesses b ON b.id = t.business_id
  JOIN people p ON p.id = t.assignee_id
`;

export function registerIpcHandlers(ipcMain: IpcMain) {
  ipcMain.handle('meta:businesses', () => {
    const db = getDb();
    return db.prepare('SELECT id, name, color, weekly_focus_days FROM businesses ORDER BY id').all();
  });

  ipcMain.handle('meta:people', () => {
    const db = getDb();
    return db.prepare('SELECT id, name, role FROM people ORDER BY id').all();
  });

  ipcMain.handle('meta:focusForDate', (_evt, isoDate: string) => {
    return focusBusinessForDate(isoDate);
  });

  ipcMain.handle('tasks:list', (_evt, filters: { date?: string; assigneeId?: number; businessId?: number }) => {
    const db = getDb();
    if (filters?.date) materializeRecurringFor(filters.date);

    const where: string[] = [];
    const params: Record<string, unknown> = {};
    if (filters?.date) { where.push('t.due_date = @date'); params.date = filters.date; }
    if (filters?.assigneeId) { where.push('t.assignee_id = @aid'); params.aid = filters.assigneeId; }
    if (filters?.businessId) { where.push('t.business_id = @bid'); params.bid = filters.businessId; }
    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = db.prepare(
      `${taskSelect} ${whereClause} ORDER BY t.status ASC, t.estimated_minutes DESC, t.id ASC`
    ).all(params) as TaskRow[];
    return rows;
  });

  ipcMain.handle('tasks:listRange', (_evt, args: { startDate: string; endDate: string }) => {
    const db = getDb();
    materializeRecurringRange(args.startDate, args.endDate);
    return db.prepare(
      `${taskSelect} WHERE t.due_date >= @s AND t.due_date <= @e ORDER BY t.due_date ASC, t.id ASC`
    ).all({ s: args.startDate, e: args.endDate });
  });

  ipcMain.handle('tasks:create', (_evt, input: CreateTaskInput) => {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO tasks (title, description, business_id, assignee_id, due_date, estimated_minutes, recurrence_type)
      VALUES (@title, @description, @business_id, @assignee_id, @due_date, @estimated_minutes, @recurrence_type)
    `);
    const res = stmt.run({
      title: input.title,
      description: input.description ?? null,
      business_id: input.business_id,
      assignee_id: input.assignee_id,
      due_date: input.due_date,
      estimated_minutes: input.estimated_minutes ?? 30,
      recurrence_type: input.recurrence_type ?? 'none',
    });
    return db.prepare(`${taskSelect} WHERE t.id = ?`).get(res.lastInsertRowid);
  });

  ipcMain.handle('tasks:update', (_evt, args: { id: number; patch: Partial<CreateTaskInput> }) => {
    const db = getDb();
    const fields: string[] = [];
    const params: Record<string, unknown> = { id: args.id };
    for (const [k, v] of Object.entries(args.patch)) {
      fields.push(`${k} = @${k}`);
      params[k] = v;
    }
    if (!fields.length) return db.prepare(`${taskSelect} WHERE t.id = ?`).get(args.id);
    db.prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = @id`).run(params);
    return db.prepare(`${taskSelect} WHERE t.id = ?`).get(args.id);
  });

  ipcMain.handle('tasks:setStatus', (_evt, args: { id: number; status: 'pending' | 'done' }) => {
    const db = getDb();
    const completedAt = args.status === 'done' ? new Date().toISOString() : null;
    db.prepare('UPDATE tasks SET status = ?, completed_at = ? WHERE id = ?')
      .run(args.status, completedAt, args.id);
    return db.prepare(`${taskSelect} WHERE t.id = ?`).get(args.id);
  });

  ipcMain.handle('tasks:remove', (_evt, id: number) => {
    const db = getDb();
    db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
    return { ok: true };
  });

  ipcMain.handle('tasks:move', (_evt, args: { id: number; newDate: string }) => {
    const db = getDb();
    db.prepare('UPDATE tasks SET due_date = ? WHERE id = ?').run(args.newDate, args.id);
    return db.prepare(`${taskSelect} WHERE t.id = ?`).get(args.id);
  });

  ipcMain.handle('export:weekMarkdown', (_evt, startDate: string) => {
    return buildWeekMarkdown(startDate);
  });
}

function focusBusinessForDate(isoDate: string) {
  const db = getDb();
  const weekday = isoWeekday(isoDate); // 1..7
  const businesses = db.prepare('SELECT id, name, color, weekly_focus_days FROM businesses').all() as Array<{
    id: number; name: string; color: string; weekly_focus_days: string;
  }>;
  for (const b of businesses) {
    const days = b.weekly_focus_days.split(',').map((s) => Number(s.trim()));
    if (days.includes(weekday)) return b;
  }
  return null;
}

function isoWeekday(isoDate: string): number {
  const d = new Date(`${isoDate}T12:00:00`);
  // getDay: 0=Sun..6=Sat; convert to 1=Mon..7=Sun
  const js = d.getDay();
  return js === 0 ? 7 : js;
}

function materializeRecurringFor(isoDate: string) {
  materializeRecurringRange(isoDate, isoDate);
}

function materializeRecurringRange(startIso: string, endIso: string) {
  const db = getDb();
  const parents = db.prepare(
    "SELECT * FROM tasks WHERE recurrence_type != 'none' AND recurrence_parent_id IS NULL"
  ).all() as TaskRow[];

  const start = new Date(`${startIso}T00:00:00`);
  const end = new Date(`${endIso}T00:00:00`);

  const exists = db.prepare(
    'SELECT 1 FROM tasks WHERE recurrence_parent_id = ? AND due_date = ? LIMIT 1'
  );
  const insert = db.prepare(`
    INSERT INTO tasks (title, description, business_id, assignee_id, due_date, estimated_minutes,
      recurrence_type, recurrence_parent_id)
    VALUES (@title, @description, @business_id, @assignee_id, @due_date, @estimated_minutes,
      'none', @parent_id)
  `);

  for (const p of parents) {
    const parentStart = new Date(`${p.due_date}T00:00:00`);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (d < parentStart) continue;
      if (!matchesRecurrence(parentStart, d, p.recurrence_type)) continue;
      const iso = toIso(d);
      if (iso === p.due_date) continue;
      const has = exists.get(p.id, iso);
      if (has) continue;
      insert.run({
        title: p.title,
        description: p.description,
        business_id: p.business_id,
        assignee_id: p.assignee_id,
        due_date: iso,
        estimated_minutes: p.estimated_minutes,
        parent_id: p.id,
      });
    }
  }
}

function matchesRecurrence(parentDate: Date, candidate: Date, type: string) {
  if (type === 'daily') return true;
  if (type === 'weekly') return parentDate.getDay() === candidate.getDay();
  if (type === 'monthly') return parentDate.getDate() === candidate.getDate();
  return false;
}

function toIso(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function buildWeekMarkdown(startIso: string): string {
  const db = getDb();
  const start = new Date(`${startIso}T00:00:00`);
  const endDate = new Date(start);
  endDate.setDate(endDate.getDate() + 6);
  const endIso = toIso(endDate);
  materializeRecurringRange(startIso, endIso);

  const rows = db.prepare(
    `${taskSelect} WHERE t.due_date >= @s AND t.due_date <= @e ORDER BY t.due_date ASC, p.name ASC, t.id ASC`
  ).all({ s: startIso, e: endIso }) as TaskRow[];

  const byDate = new Map<string, TaskRow[]>();
  for (const r of rows) {
    const list = byDate.get(r.due_date) ?? [];
    list.push(r);
    byDate.set(r.due_date, list);
  }

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const lines: string[] = [`# Knnrd Daily — Week of ${startIso}`, ''];

  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const iso = toIso(d);
    const focus = focusBusinessForDate(iso);
    lines.push(`## ${dayNames[i]} ${iso}${focus ? ` — Focus: ${focus.name}` : ''}`);
    const dayTasks = byDate.get(iso) ?? [];
    if (!dayTasks.length) {
      lines.push('_No tasks_');
      lines.push('');
      continue;
    }
    const byPerson = new Map<string, TaskRow[]>();
    for (const t of dayTasks) {
      const list = byPerson.get(t.assignee_name!) ?? [];
      list.push(t);
      byPerson.set(t.assignee_name!, list);
    }
    for (const [person, list] of byPerson) {
      lines.push(`### ${person}`);
      for (const t of list) {
        const box = t.status === 'done' ? '[x]' : '[ ]';
        lines.push(`- ${box} ${t.title} _(${t.business_name}, ${t.estimated_minutes}m)_`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}
