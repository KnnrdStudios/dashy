/* ============================================================
 * MIDI Studio — Practice games
 *   ChordChallenge: flash a target chord, detect when played
 *   ScaleRunner:    highlight next note in a scale, time the run
 * ============================================================ */

(function (MS) {
  'use strict';

  /* ============== Chord Challenge ============== */
  MS.ChordChallenge = {
    active: false,
    difficulty: 'easy',
    target: null,
    held: new Set(),
    score: { right: 0, total: 0, streak: 0, best: 0 },
    startedAt: 0,

    init() {
      this.targetEl = document.getElementById('cc-target');
      this.feedbackEl = document.getElementById('cc-feedback');
      this.scoreEl = document.getElementById('cc-score');
      this.streakEl = document.getElementById('cc-streak');
      this.startBtn = document.getElementById('cc-start');
      this.skipBtn = document.getElementById('cc-skip');
      this.diffSel = document.getElementById('cc-difficulty');

      this.startBtn.addEventListener('click', () => this.toggle());
      this.skipBtn.addEventListener('click', () => this.skip());
      this.diffSel.addEventListener('change', (e) => {
        this.difficulty = e.target.value;
      });
      this.renderScore();
    },

    qualitiesForDifficulty() {
      switch (this.difficulty) {
        case 'medium': return ['maj', 'min', 'dim', 'maj7', 'min7', 'dom7'];
        case 'hard':   return ['maj', 'min', 'dim', 'aug', 'maj7', 'min7', 'dom7', 'm7b5', 'sus2', 'sus4'];
        default:       return ['maj', 'min'];
      }
    },

    toggle() {
      if (this.active) this.stop(); else this.start();
    },

    start() {
      this.active = true;
      this.score = { right: 0, total: 0, streak: 0, best: this.score.best };
      this.renderScore();
      this.startBtn.textContent = 'Stop';
      this.feedbackEl.textContent = '';
      this.nextTarget();
    },

    stop() {
      this.active = false;
      this.target = null;
      this.held.clear();
      this.startBtn.textContent = 'Start';
      this.targetEl.textContent = '—';
      this.feedbackEl.textContent = '';
      MS.Piano.clearTargets();
    },

    nextTarget() {
      const roots = [0, 2, 4, 5, 7, 9, 11]; // C D E F G A B
      const rootPc = roots[Math.floor(Math.random() * roots.length)];
      const qs = this.qualitiesForDifficulty();
      const q = qs[Math.floor(Math.random() * qs.length)];
      const rootMidi = 60 + rootPc;
      const midis = MS.chordMidis(rootMidi, q);
      const pcs = [...new Set(midis.map((m) => m % 12))].sort((a, b) => a - b);
      this.target = { rootMidi, q, midis, pcs };
      this.targetEl.textContent = MS.NOTE_NAMES[rootPc] + MS.CHORDS[q].name;
      MS.Piano.showTargets(midis);
      this.startedAt = performance.now();
    },

    onNoteOn(midi) {
      if (!this.active || !this.target) return;
      this.held.add(midi);
      this.check();
    },
    onNoteOff(midi) {
      if (!this.active) return;
      this.held.delete(midi);
    },

    check() {
      if (!this.target) return;
      const heldPcs = [...new Set([...this.held].map((m) => m % 12))].sort((a, b) => a - b);
      const targetPcs = this.target.pcs;
      if (heldPcs.length < targetPcs.length) return;
      const match = targetPcs.every((pc) => heldPcs.includes(pc))
        && heldPcs.length === targetPcs.length;
      if (match) {
        const dt = ((performance.now() - this.startedAt) / 1000).toFixed(1);
        this.score.right += 1;
        this.score.total += 1;
        this.score.streak += 1;
        if (this.score.streak > this.score.best) this.score.best = this.score.streak;
        this.feedbackEl.textContent = `✓ Nailed it in ${dt}s`;
        this.feedbackEl.style.color = 'var(--good)';
        this.renderScore();
        const target = this.target;
        this.target = null;
        setTimeout(() => {
          if (this.active) this.nextTarget();
        }, 700);
      }
    },

    skip() {
      if (!this.active) return;
      this.score.total += 1;
      this.score.streak = 0;
      this.feedbackEl.textContent = '↷ Skipped';
      this.feedbackEl.style.color = 'var(--text-dim)';
      this.renderScore();
      this.nextTarget();
    },

    renderScore() {
      this.scoreEl.textContent = `${this.score.right} / ${this.score.total}`;
      this.streakEl.textContent = `Streak ${this.score.streak} · Best ${this.score.best}`;
    },
  };

  /* ============== Scale Runner ============== */
  MS.ScaleRunner = {
    active: false,
    rootPc: 0,
    scaleKey: 'major',
    sequence: [],
    cursor: 0,
    startedAt: 0,
    best: {},

    init() {
      this.rootSel = document.getElementById('sr-root');
      this.typeSel = document.getElementById('sr-type');
      this.startBtn = document.getElementById('sr-start');
      this.nextEl = document.getElementById('sr-next');
      this.progressEl = document.getElementById('sr-progress');
      this.timeEl = document.getElementById('sr-time');

      MS.fillNoteSelect(this.rootSel, 0);
      this.startBtn.addEventListener('click', () => this.toggle());
    },

    toggle() {
      if (this.active) this.stop(); else this.start();
    },

    start() {
      this.active = true;
      this.rootPc = parseInt(this.rootSel.value, 10);
      this.scaleKey = this.typeSel.value;
      const intervals = MS.SCALES[this.scaleKey];
      const startMidi = 60 + this.rootPc;
      // Ascending + descending one octave
      const asc = intervals.map((i) => startMidi + i);
      asc.push(startMidi + 12);
      const desc = [...asc].slice(0, -1).reverse();
      this.sequence = asc.concat(desc);
      this.cursor = 0;
      this.startedAt = performance.now();
      this.startBtn.textContent = 'Stop';
      this.highlight();
      this.tick();
    },

    stop() {
      this.active = false;
      this.sequence = [];
      this.cursor = 0;
      this.startBtn.textContent = 'Start';
      this.nextEl.textContent = '—';
      MS.Piano.clearTargets();
    },

    highlight() {
      if (this.cursor >= this.sequence.length) {
        const dt = ((performance.now() - this.startedAt) / 1000).toFixed(2);
        const key = `${this.rootPc}-${this.scaleKey}`;
        const prev = this.best[key];
        if (!prev || parseFloat(dt) < parseFloat(prev)) this.best[key] = dt;
        this.nextEl.textContent = `Done in ${dt}s`;
        this.progressEl.textContent = this.best[key] ? `Best: ${this.best[key]}s` : '';
        MS.Piano.clearTargets();
        this.active = false;
        this.startBtn.textContent = 'Start';
        return;
      }
      const midi = this.sequence[this.cursor];
      MS.Piano.showTargets([midi]);
      this.nextEl.textContent = MS.midiToName(midi);
      this.progressEl.textContent = `${this.cursor + 1} / ${this.sequence.length}`;
    },

    onNoteOn(midi) {
      if (!this.active) return;
      const expected = this.sequence[this.cursor];
      if (midi === expected) {
        this.cursor += 1;
        this.highlight();
      }
    },

    tick() {
      if (!this.active) return;
      const dt = (performance.now() - this.startedAt) / 1000;
      if (this.timeEl) this.timeEl.textContent = dt.toFixed(1) + 's';
      requestAnimationFrame(() => this.tick());
    },
  };
}(window.MS));
