/* ============================================================
 * MIDI Studio — MIDI Looper
 * Record what you play on the MPK / virtual piano, loop it,
 * overdub additional layers, export to .mid.
 * ============================================================ */

(function (MS) {
  'use strict';

  MS.Looper = {
    bars: 4,
    beatsPerBar: 4,
    bpm: 100,
    quantize: false,
    quantizeDiv: 4, // 16th notes

    layers: [],          // [{ id, name, events, muted }]
    pendingLayer: null,  // events being recorded for a new layer

    recording: false,
    playing: false,
    armed: false,        // waiting for count-in
    playStart: 0,        // performance.now() at loop iteration 0
    iteration: 0,
    timeouts: [],
    playheadRaf: null,
    countInTimeouts: [],

    init() {
      this.recBtn = document.getElementById('loop-record');
      this.playBtn = document.getElementById('loop-play');
      this.stopBtn = document.getElementById('loop-stop');
      this.clearBtn = document.getElementById('loop-clear');
      this.exportBtn = document.getElementById('loop-export');
      this.barsSel = document.getElementById('loop-bars');
      this.quantSel = document.getElementById('loop-quantize');
      this.syncBtn = document.getElementById('loop-sync-bpm');
      this.bpmInput = document.getElementById('loop-bpm');
      this.playhead = document.getElementById('loop-playhead');
      this.barInfo = document.getElementById('loop-bar-info');
      this.layerList = document.getElementById('loop-layers');

      this.recBtn.addEventListener('click', () => this.toggleRecord());
      this.playBtn.addEventListener('click', () => this.togglePlay());
      this.stopBtn.addEventListener('click', () => this.stopAll());
      this.clearBtn.addEventListener('click', () => this.clearAll());
      this.exportBtn.addEventListener('click', () => this.exportMidi());
      this.barsSel.addEventListener('change', (e) => {
        this.bars = parseInt(e.target.value, 10);
        this.render();
      });
      this.quantSel.addEventListener('change', (e) => {
        const v = e.target.value;
        this.quantize = v !== 'off';
        if (this.quantize) this.quantizeDiv = parseInt(v, 10);
      });
      this.bpmInput.addEventListener('input', (e) => {
        this.bpm = parseInt(e.target.value, 10);
        this.render();
      });
      this.syncBtn.addEventListener('click', () => {
        this.bpm = MS.Metronome.bpm;
        this.bpmInput.value = this.bpm;
        this.render();
      });

      this.render();
    },

    /* -------- Geometry -------- */
    loopLengthSec() {
      return (60 / this.bpm) * this.beatsPerBar * this.bars;
    },
    loopLengthMs() { return this.loopLengthSec() * 1000; },

    /* -------- Recording -------- */
    toggleRecord() {
      if (this.recording) {
        this.stopRecord();
      } else {
        this.startRecord();
      }
    },

    startRecord() {
      if (!MS.Synth.ctx) MS.Synth.init();
      MS.Synth.resume();

      // 1 bar count-in with clicks, then start recording in sync with playback
      this.armed = true;
      this.recBtn.textContent = '⏺ Count-in…';
      this.recBtn.classList.add('recording');

      const beatSec = 60 / this.bpm;
      const countInBeats = this.beatsPerBar;
      for (let i = 0; i < countInBeats; i += 1) {
        const id = setTimeout(() => this.clickTick(i === 0), i * beatSec * 1000);
        this.countInTimeouts.push(id);
      }
      const startDelay = countInBeats * beatSec * 1000;
      const id = setTimeout(() => this.beginRecording(), startDelay);
      this.countInTimeouts.push(id);
    },

    beginRecording() {
      this.countInTimeouts = [];
      this.armed = false;
      this.recording = true;
      this.pendingLayer = {
        id: Date.now(),
        name: `Layer ${this.layers.length + 1}`,
        events: [],
        muted: false,
      };
      this.recBtn.textContent = '⏺ Stop Rec';

      if (!this.playing) {
        // Start playback at iteration 0; record into pendingLayer
        this.playStart = performance.now();
        this.iteration = 0;
        this.playing = true;
        this.playBtn.textContent = '❚❚ Pause';
        this.schedulePlayback();
        this.tickPlayhead();
      }
    },

    stopRecord() {
      if (this.armed) {
        this.countInTimeouts.forEach(clearTimeout);
        this.countInTimeouts = [];
        this.armed = false;
        this.recBtn.textContent = '⏺ Record';
        this.recBtn.classList.remove('recording');
        return;
      }
      if (!this.recording) return;
      this.recording = false;
      this.recBtn.textContent = '⏺ Record';
      this.recBtn.classList.remove('recording');

      if (this.pendingLayer && this.pendingLayer.events.length > 0) {
        if (this.quantize) this.applyQuantize(this.pendingLayer);
        this.layers.push(this.pendingLayer);
        this.renderLayers();
        // Reschedule playback so the new layer joins the loop
        this.rescheduleIfPlaying();
      }
      this.pendingLayer = null;
    },

    applyQuantize(layer) {
      const grid = (60 / this.bpm) * (4 / this.quantizeDiv); // seconds per grid unit
      const len = this.loopLengthSec();
      layer.events.forEach((ev) => {
        if (ev.type === 'on') {
          ev.time = Math.round(ev.time / grid) * grid;
          if (ev.time >= len) ev.time = ev.time - len;
        }
      });
      // Also nudge offs to stay after their on
      layer.events.sort((a, b) => a.time - b.time);
    },

    /* -------- Playback -------- */
    togglePlay() {
      if (this.playing) {
        this.pausePlayback();
      } else {
        this.startPlayback();
      }
    },

    startPlayback() {
      if (this.layers.length === 0 && !this.recording) return;
      if (!MS.Synth.ctx) MS.Synth.init();
      MS.Synth.resume();
      this.playing = true;
      this.playStart = performance.now();
      this.iteration = 0;
      this.playBtn.textContent = '❚❚ Pause';
      this.schedulePlayback();
      this.tickPlayhead();
    },

    pausePlayback() {
      this.playing = false;
      this.playBtn.textContent = '▶ Play';
      this.clearTimeouts();
      // Release any ringing notes
      MS.Synth.voices.forEach((_v, m) => MS.Synth.noteOff(m, true));
      cancelAnimationFrame(this.playheadRaf);
    },

    stopAll() {
      if (this.recording) this.stopRecord();
      this.pausePlayback();
      this.iteration = 0;
      if (this.playhead) this.playhead.style.left = '0%';
    },

    clearTimeouts() {
      this.timeouts.forEach(clearTimeout);
      this.timeouts = [];
    },

    rescheduleIfPlaying() {
      if (!this.playing) return;
      this.clearTimeouts();
      this.schedulePlayback();
    },

    schedulePlayback() {
      if (!this.playing) return;
      const loopLen = this.loopLengthMs();
      const iterStart = this.playStart + this.iteration * loopLen;

      this.layers.forEach((layer) => {
        if (layer.muted) return;
        layer.events.forEach((ev) => {
          const when = iterStart + ev.time * 1000;
          const delay = when - performance.now();
          if (delay < -100) return;
          const id = setTimeout(() => {
            if (ev.type === 'on') MS.Synth.noteOn(ev.midi, ev.velocity);
            else MS.Synth.noteOff(ev.midi, true);
            MS.Piano.highlightActive(ev.midi, ev.type === 'on');
            if (ev.type === 'off') {
              setTimeout(() => MS.Piano.highlightActive(ev.midi, false), 10);
            }
          }, Math.max(0, delay));
          this.timeouts.push(id);
        });
      });

      const nextStart = iterStart + loopLen;
      const toNext = nextStart - performance.now();
      const id = setTimeout(() => {
        this.iteration += 1;
        this.schedulePlayback();
      }, Math.max(0, toNext));
      this.timeouts.push(id);
    },

    tickPlayhead() {
      if (!this.playing) return;
      const loopLen = this.loopLengthMs();
      const t = (performance.now() - this.playStart) % loopLen;
      const pct = (t / loopLen) * 100;
      if (this.playhead) this.playhead.style.left = pct + '%';
      const totalBeats = this.beatsPerBar * this.bars;
      const beat = Math.floor((t / loopLen) * totalBeats);
      const bar = Math.floor(beat / this.beatsPerBar) + 1;
      const beatInBar = (beat % this.beatsPerBar) + 1;
      if (this.barInfo) {
        this.barInfo.textContent = `Bar ${bar} / ${this.bars} · Beat ${beatInBar}` +
          (this.recording ? ' · REC' : '');
      }
      this.playheadRaf = requestAnimationFrame(() => this.tickPlayhead());
    },

    clickTick(downbeat) {
      if (!MS.Synth.ctx) return;
      const ctx = MS.Synth.ctx;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.frequency.value = downbeat ? 1500 : 900;
      g.gain.setValueAtTime(0.35, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(g).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    },

    /* -------- Note capture (called from main.js) -------- */
    captureNoteOn(midi, velocity) {
      if (!this.recording || !this.pendingLayer) return;
      const t = ((performance.now() - this.playStart) % this.loopLengthMs()) / 1000;
      this.pendingLayer.events.push({ time: t, type: 'on', midi, velocity });
    },
    captureNoteOff(midi) {
      if (!this.recording || !this.pendingLayer) return;
      const t = ((performance.now() - this.playStart) % this.loopLengthMs()) / 1000;
      this.pendingLayer.events.push({ time: t, type: 'off', midi, velocity: 0 });
    },

    /* -------- Layer management -------- */
    clearAll() {
      this.stopAll();
      this.layers = [];
      this.renderLayers();
    },

    deleteLayer(id) {
      this.layers = this.layers.filter((l) => l.id !== id);
      this.renderLayers();
      this.rescheduleIfPlaying();
    },

    toggleMute(id) {
      const layer = this.layers.find((l) => l.id === id);
      if (layer) layer.muted = !layer.muted;
      this.renderLayers();
      this.rescheduleIfPlaying();
    },

    renderLayers() {
      if (!this.layerList) return;
      this.layerList.innerHTML = '';
      if (this.layers.length === 0) {
        this.layerList.innerHTML = '<li class="muted">No layers yet — record one.</li>';
        return;
      }
      this.layers.forEach((layer) => {
        const li = document.createElement('li');
        const count = layer.events.filter((e) => e.type === 'on').length;
        const name = document.createElement('span');
        name.textContent = `${layer.name} · ${count} note${count !== 1 ? 's' : ''}`;
        if (layer.muted) name.style.opacity = '0.4';

        const muteBtn = document.createElement('button');
        muteBtn.className = 'ghost-btn';
        muteBtn.textContent = layer.muted ? 'Unmute' : 'Mute';
        muteBtn.addEventListener('click', () => this.toggleMute(layer.id));

        const delBtn = document.createElement('button');
        delBtn.className = 'ghost-btn';
        delBtn.textContent = 'Delete';
        delBtn.addEventListener('click', () => this.deleteLayer(layer.id));

        li.appendChild(name);
        const actions = document.createElement('div');
        actions.style.display = 'flex';
        actions.style.gap = '6px';
        actions.appendChild(muteBtn);
        actions.appendChild(delBtn);
        li.appendChild(actions);
        this.layerList.appendChild(li);
      });
    },

    render() {
      if (!this.barInfo) return;
      this.barInfo.textContent = `Bar 1 / ${this.bars} · ${this.loopLengthSec().toFixed(1)}s loop`;
      this.renderLayers();
    },

    /* -------- Export -------- */
    exportMidi() {
      if (this.layers.length === 0) {
        alert('Record at least one layer first.');
        return;
      }
      // Flatten layers into one event stream
      const events = [];
      this.layers.forEach((layer) => {
        if (layer.muted) return;
        layer.events.forEach((ev) => events.push(ev));
      });
      const bytes = MS.writeMidiFile(events, this.bpm);
      const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      MS.downloadBytes(bytes, `midi-studio-loop-${ts}.mid`);
    },
  };
}(window.MS));
