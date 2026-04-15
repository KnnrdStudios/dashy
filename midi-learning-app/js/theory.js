/* Music theory data + helpers. No sound here, just note math. */
const Theory = (() => {
  const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const SCALE_INTERVALS = {
    major:             [0,2,4,5,7,9,11],
    minor:             [0,2,3,5,7,8,10],
    harmonic_minor:    [0,2,3,5,7,8,11],
    melodic_minor:     [0,2,3,5,7,9,11],
    pentatonic_major:  [0,2,4,7,9],
    pentatonic_minor:  [0,3,5,7,10],
    blues:             [0,3,5,6,7,10],
    dorian:            [0,2,3,5,7,9,10],
    mixolydian:        [0,2,4,5,7,9,10],
  };
  const CHORD_INTERVALS = {
    maj:  [0,4,7],
    min:  [0,3,7],
    dim:  [0,3,6],
    aug:  [0,4,8],
    maj7: [0,4,7,11],
    min7: [0,3,7,10],
    dom7: [0,4,7,10],
    sus2: [0,2,7],
    sus4: [0,5,7],
  };

  // Fifth circle (clockwise, sharp direction)
  const CIRCLE = ['C','G','D','A','E','B','F#','C#','G#','D#','A#','F'];

  return {
    NOTE_NAMES, SCALE_INTERVALS, CHORD_INTERVALS, CIRCLE,

    // MIDI note <-> name
    midiToName(m) {
      const n = NOTE_NAMES[m % 12];
      const oct = Math.floor(m / 12) - 1;
      return `${n}${oct}`;
    },
    nameToMidi(name, octave = 4) {
      const idx = NOTE_NAMES.indexOf(name);
      if (idx < 0) return null;
      return idx + (octave + 1) * 12;
    },
    freq(m) { return 440 * Math.pow(2, (m - 69) / 12); },

    scale(rootName, type, octave = 4) {
      const rootMidi = this.nameToMidi(rootName, octave);
      return SCALE_INTERVALS[type].map(i => rootMidi + i);
    },
    chord(rootName, type, octave = 4) {
      const rootMidi = this.nameToMidi(rootName, octave);
      return CHORD_INTERVALS[type].map(i => rootMidi + i);
    },

    // Diatonic chord from scale degree (1-7) in a major key
    diatonicChord(rootName, degree, octave = 4) {
      const scale = this.scale(rootName, 'major', octave);
      // triad quality by scale degree in major: I maj, ii min, iii min, IV maj, V maj, vi min, vii dim
      const qualities = ['maj','min','min','maj','maj','min','dim'];
      const d = degree - 1;
      const root = scale[d];
      const q = qualities[d];
      return CHORD_INTERVALS[q].map(i => root + i);
    },
  };
})();
