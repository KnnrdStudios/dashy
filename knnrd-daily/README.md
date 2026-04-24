# Knnrd Daily

A linear, low-decision daily task planner for three businesses — Knnrd Amazon FBA, AI Consulting, and Kika's Koffee. Built to minimize context-switching for an ADD-friendly workflow: each weekday has a "focus business" and the Today view tells you, and Melissa, and Kika, exactly what needs to get done.

Electron + React + Vite + Tailwind + better-sqlite3. Fully offline, no network calls, no cloud.

## Install

```bash
cd knnrd-daily
npm install
```

`better-sqlite3` is a native module; the `postinstall` step runs `electron-builder install-app-deps` which rebuilds it against the Electron Node ABI.

## Dev

```bash
npm run dev
```

Starts Vite + Electron with HMR on the renderer.

## Build installers

```bash
npm run build:win   # NSIS .exe installer + .msi (x64)
npm run build:mac   # .dmg
```

Artifacts land in `release/<version>/`:

- `Knnrd Daily-0.1.0-Setup.exe` — NSIS wizard installer with "choose install dir" step
- `Knnrd Daily-0.1.0.msi` — Windows Installer package (good for Group Policy / enterprise deploy)
- `Knnrd Daily-0.1.0.dmg` — macOS disk image

> Windows builds **must** run on a Windows host. Cross-building from macOS/Linux works for NSIS via Wine, but MSI requires the Windows SDK / WiX Toolset and is not reliable off-Windows. The GitHub Actions workflow below runs them on native runners.

## CI: native Win + Mac builds

`.github/workflows/knnrd-daily-release.yml` builds installers on `windows-latest` and `macos-latest` runners and uploads them as workflow artifacts. Trigger it by either:

1. **Manual run** — GitHub → Actions → "Knnrd Daily — Build installers" → Run workflow
2. **Tag push** — `git tag knnrd-daily-v0.1.0 && git push --tags`

Download the `knnrd-daily-windows-latest` and `knnrd-daily-macos-latest` artifacts from the completed run.

## What's in the app

### Today view (the home screen)
- Big header with today's date and the day's **focus business**
- **Jeremy's tasks** for today, split into focus-business tasks and an "Also today (other businesses)" group
- **Melissa's** and **Kika's** tasks (shown only when they have any)
- Prev / Today / Next day controls for jumping between days without leaving the view
- "Day complete" footer dims the screen once all Jeremy tasks are checked off

### Week view
- 7-day Mon–Sun grid, color-coded by business
- Per-day task counts per person, focus-business label, up to 4 task previews per day
- Drag a task to another day to move it
- Click any day to jump to its detail

### Assignee filter
- Top bar toggle: All / Jeremy / Melissa / Kika
- Applies to both Today and Week views — useful for "what does Melissa need to do this week?"

### Quick add (Cmd/Ctrl + N)
- A single-line prompt with natural-language parsing
- Recognizes:
  - `today`, `tomorrow`, `tmrw`
  - Weekday names: `mon`, `tuesday`, `fri`, etc. → next occurrence
  - Duration: `30m`, `45min`, `1h`
  - People: `Jeremy`, `Melissa`, `Kika`
  - Businesses: `fba`, `amazon`, `ai`, `consulting`, `koffee`, `coffee`, `kika's`
- Example: `Email supplier tomorrow 30min koffee Melissa` → task due tomorrow, 30min, Kika's Koffee, assigned to Melissa

### Task modal
- Click any task (or press Enter on a selected task) to edit
- Full fields: title, notes, business, assignee, due date, estimated minutes, recurrence (none/daily/weekly/monthly)
- `⌘↵` (or `Ctrl+Enter`) saves

### Export
- Top bar "Export week" button copies the current week's tasks to the clipboard as markdown, grouped by day and person — paste straight into Notion, Slack, or email to share with Melissa and Kika

## Keyboard

- `↑` / `↓` — move task selection
- `Space` — toggle selected task done/pending
- `Enter` — edit selected task
- `Cmd/Ctrl+N` — quick add (global shortcut, works even when the app isn't focused)
- `Esc` — close modal / quick-add

## Data

SQLite database is created on first launch in your OS user-data dir:

- macOS: `~/Library/Application Support/Knnrd Daily/knnrd-daily.sqlite`
- Windows: `%APPDATA%/Knnrd Daily/knnrd-daily.sqlite`

Seeded with:
- 3 businesses: **Knnrd Amazon FBA** (orange, Mon/Thu), **AI Consulting** (blue, Tue/Fri), **Kika's Koffee** (brown, Wed/Sat)
- 3 people: Jeremy, Melissa, Kika
- 5 sample tasks dated today

## Schema

```sql
businesses (id, name, color, weekly_focus_days)
people (id, name, role)
tasks (
  id, title, description, business_id, assignee_id,
  due_date, estimated_minutes, status,
  recurrence_type, recurrence_parent_id,
  created_at, completed_at
)
```

Recurring tasks are materialized into dated instances on demand, so the UI always works with concrete single-day rows.

## Project layout

```
electron/
  main.ts     # app window, global shortcut, IPC wiring
  preload.ts  # contextBridge — exposes window.api
  db.ts       # SQLite init + schema + seed
  ipc.ts      # handlers for tasks + meta + export
src/
  App.tsx           # view switcher, modal/quick-add state
  components/
    TopNav.tsx      # brand, tabs, filter chips, export, + Task
    DayView.tsx     # Today / single-day detail
    WeekView.tsx    # 7-day grid
    TaskItem.tsx    # single task row
    TaskModal.tsx   # full task add/edit
    QuickAddBar.tsx # Cmd+N natural-language input
  lib/
    date.ts          # ISO date helpers
    parseQuickAdd.ts # natural-language parser
  types.ts          # shared types + window.api declaration
  index.css         # Tailwind layers + component classes
```
