/* ============================================================
 * MIDI Studio — shared utilities and music theory helpers
 * Exposes: window.MS (global namespace)
 * ============================================================ */

window.MS = window.MS || {};

(function (MS) {
  'use strict';

  MS.NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  MS.NOTE_NAMES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

  /** MIDI note number → "C4" style name. */
  MS.midiToName = function (midi) {
    if (midi == null || Number.isNaN(midi)) return '—';
    const name = MS.NOTE_NAMES[midi % 12];
    const octave = Math.floor(midi / 12) - 1;
    return name + octave;
  };

  /** MIDI note → frequency (Hz) using equal temperament, A4 = 440Hz. */
  MS.midiToFreq = function (midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  };

  /** Convert a note name like "C4" to MIDI number. */
  MS.nameToMidi = function (name) {
    const m = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(name);
    if (!m) return null;
    const letters = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    let pc = letters[m[1].toUpperCase()];
    if (m[2] === '#') pc += 1;
    if (m[2] === 'b') pc -= 1;
    return (parseInt(m[3], 10) + 1) * 12 + pc;
  };

  /* -------- Scale intervals (semitones from root) -------- */
  MS.SCALES = {
    major:            [0, 2, 4, 5, 7, 9, 11],
    natural_minor:    [0, 2, 3, 5, 7, 8, 10],
    harmonic_minor:   [0, 2, 3, 5, 7, 8, 11],
    melodic_minor:    [0, 2, 3, 5, 7, 9, 11],
    dorian:           [0, 2, 3, 5, 7, 9, 10],
    phrygian:         [0, 1, 3, 5, 7, 8, 10],
    lydian:           [0, 2, 4, 6, 7, 9, 11],
    mixolydian:       [0, 2, 4, 5, 7, 9, 10],
    locrian:          [0, 1, 3, 5, 6, 8, 10],
    major_pentatonic: [0, 2, 4, 7, 9],
    minor_pentatonic: [0, 3, 5, 7, 10],
    blues:            [0, 3, 5, 6, 7, 10],
    chromatic:        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  };

  /* -------- Chord qualities (intervals from root) -------- */
  MS.CHORDS = {
    maj:   { name: '',      intervals: [0, 4, 7] },
    min:   { name: 'm',     intervals: [0, 3, 7] },
    dim:   { name: '°',     intervals: [0, 3, 6] },
    aug:   { name: '+',     intervals: [0, 4, 8] },
    sus2:  { name: 'sus2',  intervals: [0, 2, 7] },
    sus4:  { name: 'sus4',  intervals: [0, 5, 7] },
    maj7:  { name: 'maj7',  intervals: [0, 4, 7, 11] },
    min7:  { name: 'm7',    intervals: [0, 3, 7, 10] },
    dom7:  { name: '7',     intervals: [0, 4, 7, 10] },
    dim7:  { name: '°7',    intervals: [0, 3, 6, 9] },
    m7b5:  { name: 'ø7',    intervals: [0, 3, 6, 10] },
    add9:  { name: 'add9',  intervals: [0, 4, 7, 14] },
  };

  /** Build note set (pitch classes 0..11) from root name + scale key. */
  MS.scaleNotes = function (rootPc, scaleKey) {
    const intervals = MS.SCALES[scaleKey] || MS.SCALES.major;
    return intervals.map((i) => (rootPc + i) % 12);
  };

  /** Build MIDI notes for a chord rooted at rootMidi. */
  MS.chordMidis = function (rootMidi, qualityKey) {
    const q = MS.CHORDS[qualityKey] || MS.CHORDS.maj;
    return q.intervals.map((i) => rootMidi + i);
  };

  MS.pcFromName = function (name) {
    const idx = MS.NOTE_NAMES.indexOf(name);
    if (idx >= 0) return idx;
    return MS.NOTE_NAMES_FLAT.indexOf(name);
  };

  /** Diatonic chord qualities for major / minor keys. */
  MS.DIATONIC = {
    major: [
      { roman: 'I',   q: 'maj', degree: 0 },
      { roman: 'ii',  q: 'min', degree: 1 },
      { roman: 'iii', q: 'min', degree: 2 },
      { roman: 'IV',  q: 'maj', degree: 3 },
      { roman: 'V',   q: 'maj', degree: 4 },
      { roman: 'vi',  q: 'min', degree: 5 },
      { roman: 'vii°',q: 'dim', degree: 6 },
    ],
    natural_minor: [
      { roman: 'i',   q: 'min', degree: 0 },
      { roman: 'ii°', q: 'dim', degree: 1 },
      { roman: 'III', q: 'maj', degree: 2 },
      { roman: 'iv',  q: 'min', degree: 3 },
      { roman: 'v',   q: 'min', degree: 4 },
      { roman: 'VI',  q: 'maj', degree: 5 },
      { roman: 'VII', q: 'maj', degree: 6 },
    ],
  };

  /** Try to identify a chord from a set of MIDI numbers currently held down. */
  MS.identifyChord = function (midis) {
    if (!midis || midis.length < 3) return '';
    const sorted = [...new Set(midis.map((m) => m % 12))].sort((a, b) => a - b);
    for (let root = 0; root < 12; root += 1) {
      for (const key of Object.keys(MS.CHORDS)) {
        const intervals = MS.CHORDS[key].intervals.map((i) => (root + i) % 12).sort((a, b) => a - b);
        if (intervals.length === sorted.length &&
            intervals.every((v, i) => v === sorted[i])) {
          return MS.NOTE_NAMES[root] + MS.CHORDS[key].name;
        }
      }
    }
    return '';
  };

  /** Simple event emitter. */
  MS.createEmitter = function () {
    const listeners = {};
    return {
      on(event, fn) {
        (listeners[event] = listeners[event] || []).push(fn);
      },
      emit(event, ...args) {
        (listeners[event] || []).forEach((fn) => fn(...args));
      },
    };
  };

  /** Populate a <select> element with note-name options. */
  MS.fillNoteSelect = function (el, defaultPc) {
    MS.NOTE_NAMES.forEach((n, i) => {
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = n;
      if (i === defaultPc) opt.selected = true;
      el.appendChild(opt);
    });
  };

  /** Format seconds as mm:ss.t */
  MS.formatTime = function (sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const t = Math.floor((sec * 10) % 10);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${t}`;
  };
}(window.MS));
