# Knnrd Daily

A linear, low-decision daily task planner for three businesses. Electron + React + Vite + Tailwind + better-sqlite3. Fully offline.

## Install

```bash
cd knnrd-daily
npm install
```

> `better-sqlite3` is a native module. `npm install` triggers `electron-builder install-app-deps` which rebuilds it against Electron's Node ABI.

## Run in dev

```bash
npm run dev
```

## Build installers

```bash
npm run build:win   # .exe (NSIS installer)
npm run build:mac   # .dmg
```

Artifacts land in `release/<version>/`.

## Data

A SQLite database is created on first launch in your OS user-data dir:

- macOS: `~/Library/Application Support/Knnrd Daily/knnrd-daily.sqlite`
- Windows: `%APPDATA%/Knnrd Daily/knnrd-daily.sqlite`

Seeded with three businesses (Amazon FBA, AI Consulting, Kika's Koffee), three people (Jeremy, Melissa, Kika), and a handful of sample tasks for today.

## Keyboard

- `Space` — toggle selected task
- `↑`/`↓` — move selection
- `Enter` — edit selected task
- `Cmd/Ctrl+N` — quick add (once modal ships)
