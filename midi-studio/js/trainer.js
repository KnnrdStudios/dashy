/* ============================================================
 * MIDI Studio — Scale / Chord / Progression / Ear trainer
 * ============================================================ */

(function (MS) {
  'use strict';

  const INTERVALS = [
    { semi: 1,  name: 'Minor 2nd' },
    { semi: 2,  name: 'Major 2nd' },
    { semi: 3,  name: 'Minor 3rd' },
    { semi: 4,  name: 'Major 3rd' },
    { semi: 5,  name: 'Perfect 4th' },
    { semi: 6,  name: 'Tritone' },
    { semi: 7,  name: 'Perfect 5th' },
    { semi: 8,  name: 'Minor 6th' },
    { semi: 9,  name: 'Major 6th' },
    { semi: 10, name: 'Minor 7th' },
    { semi: 11, name: 'Major 7th' },
    { semi: 12, name: 'Octave' },
  ];

  MS.Trainer = {
    scaleRootSel: null,
    scaleTypeSel: null,
    chordRootSel: null,
    chordQualitySel: null,
    progKeySel: null,
    progModeSel: null,

    earCurrent: null,
    earScore: { right: 0, total: 0 },

    init() {
      this.scaleRootSel = document.getElementById('scale-root');
      this.scaleTypeSel = document.getElementById('scale-type');
      this.chordRootSel = document.getElementById('chord-root');
      this.chordQualitySel = document.getElementById('chord-quality');
      this.progKeySel = document.getElementById('prog-key');
      this.progModeSel = document.getElementById('prog-mode');

      MS.fillNoteSelect(this.scaleRootSel, 0);
      MS.fillNoteSelect(this.chordRootSel, 0);
      MS.fillNoteSelect(this.progKeySel, 0);

      document.getElementById('show-scale').addEventListener('click', () => this.showScale());
      document.getElementById('play-scale').addEventListener('click', () => this.playScale());
      document.getElementById('show-chord').addEventListener('click', () => this.showChord());
      document.getElementById('play-chord').addEventListener('click', () => this.playChord());

      document.getElementById('prog-pop').addEventListener('click', () => this.loadProgression('pop'));
      document.getElementById('prog-jazz').addEventListener('click', () => this.loadProgression('jazz'));
      document.getElementById('prog-blues').addEventListener('click', () => this.loadProgression('blues'));
      this.progKeySel.addEventListener('change', () => this.rebuildCurrentProgression());
      this.progModeSel.addEventListener('change', () => this.rebuildCurrentProgression());

      document.getElementById('ear-play').addEventListener('click', () => this.newEar());
      document.getElementById('ear-replay').addEventListener('click', () => this.replayEar());
      this.buildEarChoices();

      // Preload default pop progression
      this.loadProgression('pop');
    },

    /* -------- Scales -------- */
    showScale() {
      const rootPc = parseInt(this.scaleRootSel.value, 10);
      const key = this.scaleTypeSel.value;
      const pcs = MS.scaleNotes(rootPc, key);
      MS.Piano.showScale(pcs);
      MS.Piano.clearTargets();
      this.renderNoteStrip('scale-notes', pcs.map((pc) => MS.NOTE_NAMES[pc]));
    },

    playScale() {
      const rootPc = parseInt(this.scaleRootSel.value, 10);
      const key = this.scaleTypeSel.value;
      const intervals = MS.SCALES[key];
      const start = 60 + rootPc; // around middle C
      const midis = intervals.map((i) => start + i);
      midis.push(start + 12); // octave
      this.showScale();
      MS.Synth.playSequence(midis, 0.35, 40);
    },

    /* -------- Chords -------- */
    showChord() {
      const rootPc = parseInt(this.chordRootSel.value, 10);
      const qKey = this.chordQualitySel.value;
      const rootMidi = 60 + rootPc;
      const midis = MS.chordMidis(rootMidi, qKey);
      MS.Piano.showTargets(midis);
      MS.Piano.clearScale();
      const names = midis.map((m) => MS.midiToName(m));
      this.renderNoteStrip('chord-notes', names);
    },

    playChord() {
      const rootPc = parseInt(this.chordRootSel.value, 10);
      const qKey = this.chordQualitySel.value;
      const rootMidi = 60 + rootPc;
      const midis = MS.chordMidis(rootMidi, qKey);
      this.showChord();
      MS.Synth.playChord(midis, 1.4);
    },

    renderNoteStrip(containerId, names) {
      const el = document.getElementById(containerId);
      el.innerHTML = '';
      names.forEach((n) => {
        const chip = document.createElement('span');
        chip.className = 'note-chip';
        chip.textContent = n;
        el.appendChild(chip);
      });
    },

    /* -------- Progressions -------- */
    currentProgId: 'pop',

    progressions: {
      pop:   { degrees: [0, 4, 5, 3], label: 'I–V–vi–IV' }, // ii/vi flipped to lowercase via quality
      jazz:  { degrees: [1, 4, 0],    label: 'ii–V–I' },
      blues: { degrees: [0, 0, 0, 0, 3, 3, 0, 0, 4, 3, 0, 4], label: '12-bar Blues' },
    },

    loadProgression(id) {
      this.currentProgId = id;
      this.rebuildCurrentProgression();
    },

    rebuildCurrentProgression() {
      const id = this.currentProgId;
      const prog = this.progressions[id];
      if (!prog) return;
      const keyPc = parseInt(this.progKeySel.value, 10);
      const mode = this.progModeSel.value; // 'major' or 'natural_minor'
      const diatonic = MS.DIATONIC[mode];
      const scaleIntervals = MS.SCALES[mode];

      const container = document.getElementById('prog-roman');
      container.innerHTML = '';

      prog.degrees.forEach((d) => {
        const dia = diatonic[d];
        const rootPc = (keyPc + scaleIntervals[d]) % 12;
        const chordName = MS.NOTE_NAMES[rootPc] + MS.CHORDS[dia.q].name;
        const rootMidi = 60 + rootPc;
        const chordMidis = MS.chordMidis(rootMidi, dia.q);

        const card = document.createElement('button');
        card.className = 'prog-chord';
        card.innerHTML = `<div class="roman">${dia.roman}</div><div class="chord-name">${chordName}</div>`;
        card.addEventListener('click', () => {
          MS.Piano.showTargets(chordMidis);
          MS.Synth.playChord(chordMidis, 1.2);
        });
        container.appendChild(card);
      });
    },

    /* -------- Ear Training -------- */
    buildEarChoices() {
      const host = document.getElementById('ear-choices');
      host.innerHTML = '';
      INTERVALS.forEach((iv) => {
        const btn = document.createElement('button');
        btn.className = 'ear-choice';
        btn.textContent = iv.name;
        btn.dataset.semi = String(iv.semi);
        btn.addEventListener('click', () => this.guessEar(iv.semi, btn));
        host.appendChild(btn);
      });
    },

    newEar() {
      // Pick a random interval, build two random midis
      const iv = INTERVALS[Math.floor(Math.random() * INTERVALS.length)];
      const base = 55 + Math.floor(Math.random() * 12);
      this.earCurrent = { semi: iv.semi, base, top: base + iv.semi };
      document.querySelectorAll('.ear-choice').forEach((b) => b.classList.remove('correct', 'wrong'));
      document.getElementById('ear-feedback').textContent = 'Listen...';
      this.playEar();
    },

    replayEar() {
      if (this.earCurrent) this.playEar();
    },

    playEar() {
      if (!this.earCurrent) return;
      MS.Synth.resume();
      MS.Synth.playSequence([this.earCurrent.base, this.earCurrent.top], 0.5, 30);
    },

    guessEar(semi, btn) {
      if (!this.earCurrent) return;
      this.earScore.total += 1;
      if (semi === this.earCurrent.semi) {
        this.earScore.right += 1;
        btn.classList.add('correct');
        document.getElementById('ear-feedback').textContent = '✓ Correct!';
      } else {
        btn.classList.add('wrong');
        document.querySelectorAll('.ear-choice').forEach((b) => {
          if (parseInt(b.dataset.semi, 10) === this.earCurrent.semi) b.classList.add('correct');
        });
        document.getElementById('ear-feedback').textContent = '✗ It was ' +
          INTERVALS.find((x) => x.semi === this.earCurrent.semi).name;
      }
      document.getElementById('ear-score').textContent =
        `${this.earScore.right} / ${this.earScore.total}`;
      this.earCurrent = null;
    },
  };
}(window.MS));
