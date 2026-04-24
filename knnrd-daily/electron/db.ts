import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) throw new Error('Database not initialized');
  return db;
}

export function initDb() {
  const userData = app.getPath('userData');
  if (!fs.existsSync(userData)) fs.mkdirSync(userData, { recursive: true });
  const dbPath = path.join(userData, 'knnrd-daily.sqlite');

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  createSchema(db);
  seedIfEmpty(db);
}

function createSchema(d: Database.Database) {
  d.exec(`
    CREATE TABLE IF NOT EXISTS businesses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL,
      weekly_focus_days TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS people (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      business_id INTEGER NOT NULL REFERENCES businesses(id),
      assignee_id INTEGER NOT NULL REFERENCES people(id),
      due_date TEXT NOT NULL,
      estimated_minutes INTEGER NOT NULL DEFAULT 30,
      status TEXT NOT NULL DEFAULT 'pending',
      recurrence_type TEXT NOT NULL DEFAULT 'none',
      recurrence_parent_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
    CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_business ON tasks(business_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_recurrence_parent ON tasks(recurrence_parent_id);
  `);
}

function seedIfEmpty(d: Database.Database) {
  const row = d.prepare('SELECT COUNT(*) as c FROM businesses').get() as { c: number };
  if (row.c > 0) return;

  const insertBusiness = d.prepare(
    'INSERT INTO businesses (name, color, weekly_focus_days) VALUES (?, ?, ?)'
  );
  // weekly_focus_days as comma-separated ISO weekday numbers (Mon=1 .. Sun=7)
  insertBusiness.run('Knnrd Amazon FBA', '#F59E0B', '1,4');
  insertBusiness.run('AI Consulting', '#3B82F6', '2,5');
  insertBusiness.run('Kika\'s Koffee', '#8B5A2B', '3,6');

  const insertPerson = d.prepare('INSERT INTO people (name, role) VALUES (?, ?)');
  insertPerson.run('Jeremy', 'Commercial, brand, sales');
  insertPerson.run('Melissa', 'Operations, finance, customer experience');
  insertPerson.run('Kika', 'Quality, sourcing, roast');

  seedSampleTasks(d);
}

function seedSampleTasks(d: Database.Database) {
  const jeremy = (d.prepare('SELECT id FROM people WHERE name = ?').get('Jeremy') as { id: number }).id;
  const melissa = (d.prepare('SELECT id FROM people WHERE name = ?').get('Melissa') as { id: number }).id;
  const kika = (d.prepare('SELECT id FROM people WHERE name = ?').get('Kika') as { id: number }).id;

  const fba = (d.prepare('SELECT id FROM businesses WHERE name = ?').get('Knnrd Amazon FBA') as { id: number }).id;
  const ai = (d.prepare('SELECT id FROM businesses WHERE name = ?').get('AI Consulting') as { id: number }).id;
  const koffee = (d.prepare('SELECT id FROM businesses WHERE name = ?').get("Kika's Koffee") as { id: number }).id;

  const today = todayIso();

  const insert = d.prepare(`
    INSERT INTO tasks (title, description, business_id, assignee_id, due_date, estimated_minutes)
    VALUES (@title, @description, @business_id, @assignee_id, @due_date, @estimated_minutes)
  `);

  const rows = [
    { title: 'Review FBA inventory levels', description: 'Check stock of handprint kits across SKUs', business_id: fba, assignee_id: jeremy, due_date: today, estimated_minutes: 20 },
    { title: 'Reply to 3 consulting lead emails', description: 'Pipeline triage', business_id: ai, assignee_id: jeremy, due_date: today, estimated_minutes: 30 },
    { title: 'Draft Q2 brand positioning doc', description: '', business_id: koffee, assignee_id: jeremy, due_date: today, estimated_minutes: 60 },
    { title: 'Confirm roaster schedule with Kika', description: '', business_id: koffee, assignee_id: melissa, due_date: today, estimated_minutes: 15 },
    { title: 'Cup this week\'s Ethiopia sample', description: '', business_id: koffee, assignee_id: kika, due_date: today, estimated_minutes: 45 },
  ];
  for (const r of rows) insert.run(r);
}

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
