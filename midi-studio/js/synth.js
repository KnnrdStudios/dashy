/* ============================================================
 * MIDI Studio — polyphonic Web Audio synth
 * Provides MS.Synth singleton with presets, ADSR, filter, reverb.
 * ============================================================ */

(function (MS) {
  'use strict';

  const PRESETS = {
    grand:  { osc: 'triangle', harmonic: 'sine',  filter: 3500, a: 0.005, d: 0.4, s: 0.3, r: 0.7, gain: 0.7, detune: 3 },
    rhodes: { osc: 'sine',     harmonic: 'sine',  filter: 2400, a: 0.005, d: 0.6, s: 0.2, r: 0.9, gain: 0.9, detune: 6 },
    pad:    { osc: 'sawtooth', harmonic: 'sine',  filter: 1600, a: 0.6,   d: 0.4, s: 0.8, r: 1.6, gain: 0.5, detune: 10 },
    lead:   { osc: 'sawtooth', harmonic: 'square',filter: 3000, a: 0.01,  d: 0.1, s: 0.8, r: 0.3, gain: 0.55, detune: 8 },
    bass:   { osc: 'square',   harmonic: 'sine',  filter: 900,  a: 0.005, d: 0.2, s: 0.8, r: 0.4, gain: 0.85, detune: 0 },
    pluck:  { osc: 'triangle', harmonic: 'square',filter: 4200, a: 0.001, d: 0.25,s: 0.0, r: 0.3, gain: 0.9, detune: 4 },
    organ:  { osc: 'sine',     harmonic: 'sine',  filter: 4000, a: 0.005, d: 0.05,s: 1.0, r: 0.15,gain: 0.55, detune: 0 },
  };

  MS.Synth = {
    ctx: null,
    master: null,
    filter: null,
    reverb: null,
    reverbMix: null,
    dryMix: null,
    delay: null,
    delayMix: null,
    voices: new Map(), // midi -> voice object
    sustainPedal: false,
    sustainedNotes: new Set(),
    preset: 'grand',
    envelope: { a: 0.05, d: 0.2, s: 0.7, r: 0.4 },
    filterEnvAmt: 1,
    volume: 0.7,

    init() {
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();

      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;

      this.filter = this.ctx.createBiquadFilter();
      this.filter.type = 'lowpass';
      this.filter.frequency.value = 4000;
      this.filter.Q.value = 0.6;

      // Dry path
      this.dryMix = this.ctx.createGain();
      this.dryMix.gain.value = 1.0;

      // Reverb (synthetic impulse)
      this.reverb = this.ctx.createConvolver();
      this.reverb.buffer = this.buildImpulse(2.2, 2.8);
      this.reverbMix = this.ctx.createGain();
      this.reverbMix.gain.value = 0.25;

      // Delay
      this.delay = this.ctx.createDelay(1.5);
      this.delay.delayTime.value = 0.32;
      const fb = this.ctx.createGain();
      fb.gain.value = 0.35;
      this.delay.connect(fb).connect(this.delay);
      this.delayMix = this.ctx.createGain();
      this.delayMix.gain.value = 0;

      // Wire it up
      this.filter.connect(this.dryMix).connect(this.master);
      this.filter.connect(this.reverb).connect(this.reverbMix).connect(this.master);
      this.filter.connect(this.delay).connect(this.delayMix).connect(this.master);
      this.master.connect(this.ctx.destination);
    },

    /** Build a synthetic reverb impulse (exponentially decaying noise). */
    buildImpulse(duration, decay) {
      const sr = this.ctx.sampleRate;
      const length = sr * duration;
      const impulse = this.ctx.createBuffer(2, length, sr);
      for (let ch = 0; ch < 2; ch += 1) {
        const data = impulse.getChannelData(ch);
        for (let i = 0; i < length; i += 1) {
          data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
        }
      }
      return impulse;
    },

    resume() {
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },

    setPreset(key) {
      if (PRESETS[key]) this.preset = key;
    },

    setVolume(v) {
      this.volume = v;
      if (this.master) this.master.gain.value = v;
    },

    setEnvelope(a, d, s, r) {
      this.envelope = { a, d, s, r };
    },

    setReverb(v) { if (this.reverbMix) this.reverbMix.gain.value = v; },
    setDelay(v) { if (this.delayMix) this.delayMix.gain.value = v; },
    setFilter(v) {
      if (this.filter) {
        // v is 0..1 → 250..8000 Hz
        this.filter.frequency.value = 250 + v * 7750;
      }
    },

    /** Start a note. velocity 0..127 */
    noteOn(midi, velocity) {
      if (!this.ctx) this.init();
      if (this.voices.has(midi)) this.noteOff(midi, true);

      const preset = PRESETS[this.preset];
      const now = this.ctx.currentTime;
      const freq = MS.midiToFreq(midi);
      const vel = Math.max(0.05, (velocity || 100) / 127);

      const osc1 = this.ctx.createOscillator();
      osc1.type = preset.osc;
      osc1.frequency.value = freq;
      osc1.detune.value = -preset.detune;

      const osc2 = this.ctx.createOscillator();
      osc2.type = preset.harmonic;
      osc2.frequency.value = freq;
      osc2.detune.value = preset.detune;

      const mix = this.ctx.createGain();
      mix.gain.value = 0.5 * preset.gain;

      const ampEnv = this.ctx.createGain();
      ampEnv.gain.value = 0;

      osc1.connect(mix);
      osc2.connect(mix);
      mix.connect(ampEnv);
      ampEnv.connect(this.filter);

      // ADSR
      const env = this.envelope;
      const peak = vel;
      const sustainLvl = peak * env.s;
      ampEnv.gain.cancelScheduledValues(now);
      ampEnv.gain.setValueAtTime(0, now);
      ampEnv.gain.linearRampToValueAtTime(peak, now + env.a);
      ampEnv.gain.linearRampToValueAtTime(sustainLvl, now + env.a + env.d);

      osc1.start(now);
      osc2.start(now);

      const voice = { osc1, osc2, mix, ampEnv, midi, startedAt: now };
      this.voices.set(midi, voice);
    },

    /** Stop a note. If sustain pedal is down, queue the release. */
    noteOff(midi, force) {
      if (!force && this.sustainPedal) {
        this.sustainedNotes.add(midi);
        return;
      }
      const voice = this.voices.get(midi);
      if (!voice) return;
      const now = this.ctx.currentTime;
      const env = this.envelope;
      const g = voice.ampEnv.gain;
      g.cancelScheduledValues(now);
      g.setValueAtTime(g.value, now);
      g.linearRampToValueAtTime(0.0001, now + env.r);
      voice.osc1.stop(now + env.r + 0.05);
      voice.osc2.stop(now + env.r + 0.05);
      this.voices.delete(midi);
    },

    setSustain(on) {
      this.sustainPedal = on;
      if (!on) {
        this.sustainedNotes.forEach((m) => this.noteOff(m, true));
        this.sustainedNotes.clear();
      }
    },

    panic() {
      this.sustainedNotes.clear();
      this.sustainPedal = false;
      this.voices.forEach((_v, m) => this.noteOff(m, true));
    },

    voiceCount() { return this.voices.size; },

    /** Play a sequence of midi notes, each lasting duration seconds. */
    playSequence(midis, duration, gap) {
      if (!this.ctx) this.init();
      this.resume();
      const step = (duration || 0.3) * 1000;
      const g = (gap != null ? gap : 30);
      midis.forEach((m, i) => {
        setTimeout(() => {
          this.noteOn(m, 100);
          setTimeout(() => this.noteOff(m, true), step - g);
        }, i * step);
      });
    },

    /** Play multiple notes together for given seconds. */
    playChord(midis, duration) {
      if (!this.ctx) this.init();
      this.resume();
      midis.forEach((m) => this.noteOn(m, 100));
      setTimeout(() => midis.forEach((m) => this.noteOff(m, true)), (duration || 1.2) * 1000);
    },
  };
}(window.MS));
