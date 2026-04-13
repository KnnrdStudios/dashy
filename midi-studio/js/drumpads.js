/* ============================================================
 * MIDI Studio — Drum pads
 * Synthesized drum sounds (no samples needed), mapped to MPK Mini
 * bank A pads (notes 36-51) + clickable grid.
 * ============================================================ */

(function (MS) {
  'use strict';

  // 16 pads. MPK Mini Bank A defaults usually start at note 36 (GM kick).
  const PADS = [
    { note: 36, name: 'Kick' },
    { note: 37, name: 'Rim' },
    { note: 38, name: 'Snare' },
    { note: 39, name: 'Clap' },
    { note: 40, name: 'Snare 2' },
    { note: 41, name: 'Tom Lo' },
    { note: 42, name: 'HH Closed' },
    { note: 43, name: 'Tom Mid' },
    { note: 44, name: 'HH Pedal' },
    { note: 45, name: 'Tom Hi' },
    { note: 46, name: 'HH Open' },
    { note: 47, name: 'Crash' },
    { note: 48, name: 'Ride' },
    { note: 49, name: 'Crash 2' },
    { note: 50, name: 'Cowbell' },
    { note: 51, name: 'Shaker' },
  ];

  MS.Pads = {
    el: null,
    kit: 'acoustic',
    volume: 0.8,
    padByNote: {},

    init() {
      this.el = document.getElementById('pad-grid');
      this.render();
      document.getElementById('pad-kit').addEventListener('change', (e) => {
        this.kit = e.target.value;
      });
      document.getElementById('pad-volume').addEventListener('input', (e) => {
        this.volume = parseInt(e.target.value, 10) / 100;
      });
    },

    render() {
      this.el.innerHTML = '';
      this.padByNote = {};
      PADS.forEach((p) => {
        const div = document.createElement('div');
        div.className = 'pad';
        div.innerHTML = `<div class="pad-name">${p.name}</div><div class="pad-note">MIDI ${p.note}</div>`;
        div.addEventListener('mousedown', () => this.hit(p.note, 110));
        div.addEventListener('mouseup', () => this.release(p.note));
        div.addEventListener('mouseleave', () => this.release(p.note));
        this.padByNote[p.note] = { el: div, info: p };
        this.el.appendChild(div);
      });
    },

    hit(note, velocity) {
      const pad = this.padByNote[note];
      if (!pad) return;
      pad.el.classList.add('hit');
      this.playDrum(pad.info.name, velocity);
    },

    release(note) {
      const pad = this.padByNote[note];
      if (!pad) return;
      setTimeout(() => pad.el.classList.remove('hit'), 60);
    },

    /** Synthesize drum sounds on the fly using the same Web Audio context. */
    playDrum(name, velocity) {
      const S = MS.Synth;
      if (!S.ctx) S.init();
      S.resume();
      const ctx = S.ctx;
      const now = ctx.currentTime;
      const vel = (velocity || 100) / 127;
      const out = ctx.createGain();
      out.gain.value = this.volume * vel;
      out.connect(ctx.destination);

      // Tweak per kit
      const bright = this.kit === 'electronic' ? 1.4 : this.kit === 'lofi' ? 0.65 : 1.0;

      switch (name) {
        case 'Kick': {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          const g = ctx.createGain();
          osc.frequency.setValueAtTime(120 * bright, now);
          osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
          g.gain.setValueAtTime(1, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
          osc.connect(g).connect(out);
          osc.start(now); osc.stop(now + 0.45);
          break;
        }
        case 'Snare':
        case 'Snare 2':
        case 'Clap':
        case 'Rim': {
          const noise = this.makeNoise(0.25);
          const src = ctx.createBufferSource();
          src.buffer = noise;
          const bp = ctx.createBiquadFilter();
          bp.type = 'bandpass';
          bp.frequency.value = name === 'Rim' ? 2000 : 1600 * bright;
          bp.Q.value = name === 'Clap' ? 0.8 : 1.2;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.9, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
          src.connect(bp).connect(g).connect(out);
          src.start(now); src.stop(now + 0.25);

          // Body tone for snare
          if (name.startsWith('Snare')) {
            const osc = ctx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.value = 220;
            const og = ctx.createGain();
            og.gain.setValueAtTime(0.35, now);
            og.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
            osc.connect(og).connect(out);
            osc.start(now); osc.stop(now + 0.15);
          }
          break;
        }
        case 'HH Closed':
        case 'HH Open':
        case 'HH Pedal':
        case 'Shaker': {
          const dur = name === 'HH Open' ? 0.35 : 0.08;
          const noise = this.makeNoise(dur + 0.05);
          const src = ctx.createBufferSource();
          src.buffer = noise;
          const hp = ctx.createBiquadFilter();
          hp.type = 'highpass';
          hp.frequency.value = 6000 * bright;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.5, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + dur);
          src.connect(hp).connect(g).connect(out);
          src.start(now); src.stop(now + dur + 0.05);
          break;
        }
        case 'Tom Lo':
        case 'Tom Mid':
        case 'Tom Hi': {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          const base = name === 'Tom Lo' ? 110 : name === 'Tom Mid' ? 165 : 220;
          osc.frequency.setValueAtTime(base, now);
          osc.frequency.exponentialRampToValueAtTime(base * 0.6, now + 0.2);
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.9, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          osc.connect(g).connect(out);
          osc.start(now); osc.stop(now + 0.35);
          break;
        }
        case 'Crash':
        case 'Crash 2':
        case 'Ride': {
          const dur = name === 'Ride' ? 0.5 : 1.0;
          const noise = this.makeNoise(dur);
          const src = ctx.createBufferSource();
          src.buffer = noise;
          const bp = ctx.createBiquadFilter();
          bp.type = 'bandpass';
          bp.frequency.value = name === 'Ride' ? 5000 : 8000;
          bp.Q.value = 0.5;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.6, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + dur);
          src.connect(bp).connect(g).connect(out);
          src.start(now); src.stop(now + dur + 0.05);
          break;
        }
        case 'Cowbell': {
          const mk = (f) => {
            const o = ctx.createOscillator();
            o.type = 'square';
            o.frequency.value = f;
            const g = ctx.createGain();
            g.gain.setValueAtTime(0.35, now);
            g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            o.connect(g).connect(out);
            o.start(now); o.stop(now + 0.25);
          };
          mk(540); mk(800);
          break;
        }
        default: {
          const osc = ctx.createOscillator();
          osc.frequency.value = 440;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.3, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
          osc.connect(g).connect(out);
          osc.start(now); osc.stop(now + 0.25);
        }
      }
    },

    makeNoise(duration) {
      const ctx = MS.Synth.ctx;
      const sr = ctx.sampleRate;
      const len = Math.max(1, Math.floor(sr * duration));
      const buf = ctx.createBuffer(1, len, sr);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
      return buf;
    },
  };
}(window.MS));
