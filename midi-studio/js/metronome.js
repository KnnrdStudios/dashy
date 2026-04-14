/* ============================================================
 * MIDI Studio — Metronome + Practice Timer
 * Sample-accurate click scheduling via Web Audio.
 * ============================================================ */

(function (MS) {
  'use strict';

  MS.Metronome = {
    bpm: 100,
    timeSig: 4,
    subdivision: 1,
    running: false,
    nextNoteTime: 0,
    currentBeat: 0,
    lookahead: 25,    // ms
    scheduleAhead: 0.12, // seconds
    schedulerId: null,
    beatEls: [],
    tapTimes: [],

    init() {
      this.bpmSlider = document.getElementById('bpm-slider');
      this.bpmValue = document.getElementById('bpm-value');
      this.timeSigSel = document.getElementById('time-sig');
      this.subdivSel = document.getElementById('subdivision');
      this.toggleBtn = document.getElementById('metro-toggle');
      this.tapBtn = document.getElementById('tap-tempo');
      this.beatLights = document.getElementById('beat-lights');

      this.bpmSlider.addEventListener('input', (e) => {
        this.bpm = parseInt(e.target.value, 10);
        this.bpmValue.textContent = this.bpm;
      });
      this.timeSigSel.addEventListener('change', (e) => {
        this.timeSig = parseInt(e.target.value, 10);
        this.renderBeatLights();
      });
      this.subdivSel.addEventListener('change', (e) => {
        this.subdivision = parseInt(e.target.value, 10);
      });
      this.toggleBtn.addEventListener('click', () => this.toggle());
      this.tapBtn.addEventListener('click', () => this.tap());

      this.renderBeatLights();

      // Practice timer
      this.timerDisplay = document.getElementById('timer-display');
      this.timerMinsInput = document.getElementById('timer-mins');
      document.getElementById('timer-start').addEventListener('click', () => this.timerStart());
      document.getElementById('timer-reset').addEventListener('click', () => this.timerReset());
      this.timerReset();
    },

    renderBeatLights() {
      this.beatLights.innerHTML = '';
      this.beatEls = [];
      for (let i = 0; i < this.timeSig; i += 1) {
        const dot = document.createElement('div');
        dot.className = 'beat-dot';
        this.beatLights.appendChild(dot);
        this.beatEls.push(dot);
      }
    },

    toggle() {
      if (this.running) this.stop(); else this.start();
    },

    start() {
      if (!MS.Synth.ctx) MS.Synth.init();
      MS.Synth.resume();
      this.running = true;
      this.currentBeat = 0;
      this.nextNoteTime = MS.Synth.ctx.currentTime + 0.05;
      this.toggleBtn.textContent = 'Stop';
      this.scheduler();
    },

    stop() {
      this.running = false;
      this.toggleBtn.textContent = 'Start';
      clearTimeout(this.schedulerId);
      this.beatEls.forEach((e) => e.classList.remove('on', 'downbeat'));
    },

    scheduler() {
      if (!this.running) return;
      const ctx = MS.Synth.ctx;
      while (this.nextNoteTime < ctx.currentTime + this.scheduleAhead) {
        this.scheduleClick(this.currentBeat, this.nextNoteTime);
        const secsPerBeat = 60.0 / this.bpm / this.subdivision;
        this.nextNoteTime += secsPerBeat;
        this.currentBeat = (this.currentBeat + 1) % (this.timeSig * this.subdivision);
      }
      this.schedulerId = setTimeout(() => this.scheduler(), this.lookahead);
    },

    scheduleClick(beatIdx, when) {
      const ctx = MS.Synth.ctx;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();

      const mainBeat = Math.floor(beatIdx / this.subdivision);
      const isDown = beatIdx === 0;
      const isMain = beatIdx % this.subdivision === 0;

      osc.frequency.value = isDown ? 1500 : isMain ? 1000 : 700;
      g.gain.setValueAtTime(isMain ? 0.5 : 0.25, when);
      g.gain.exponentialRampToValueAtTime(0.001, when + 0.05);

      osc.connect(g).connect(ctx.destination);
      osc.start(when);
      osc.stop(when + 0.06);

      // UI blink
      const delayMs = Math.max(0, (when - ctx.currentTime) * 1000);
      setTimeout(() => {
        if (!this.running) return;
        this.beatEls.forEach((el) => el.classList.remove('on', 'downbeat'));
        if (isMain && this.beatEls[mainBeat]) {
          this.beatEls[mainBeat].classList.add('on');
          if (isDown) this.beatEls[mainBeat].classList.add('downbeat');
        }
      }, delayMs);
    },

    tap() {
      const now = performance.now();
      this.tapTimes.push(now);
      this.tapTimes = this.tapTimes.filter((t) => now - t < 3000);
      if (this.tapTimes.length >= 2) {
        const diffs = [];
        for (let i = 1; i < this.tapTimes.length; i += 1) {
          diffs.push(this.tapTimes[i] - this.tapTimes[i - 1]);
        }
        const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length;
        const bpm = Math.round(60000 / avg);
        if (bpm >= 40 && bpm <= 220) {
          this.bpm = bpm;
          this.bpmSlider.value = bpm;
          this.bpmValue.textContent = bpm;
        }
      }
    },

    /* -------- Practice Timer -------- */
    timerInterval: null,
    timerRemaining: 0,

    timerStart() {
      const mins = parseInt(this.timerMinsInput.value, 10) || 10;
      this.timerRemaining = mins * 60;
      if (this.timerInterval) clearInterval(this.timerInterval);
      this.timerInterval = setInterval(() => {
        this.timerRemaining -= 1;
        if (this.timerRemaining <= 0) {
          clearInterval(this.timerInterval);
          this.timerInterval = null;
          this.timerDisplay.textContent = 'Done!';
          // Play a little alert tone
          this.playAlert();
          return;
        }
        this.renderTimer();
      }, 1000);
      this.renderTimer();
    },

    timerReset() {
      if (this.timerInterval) clearInterval(this.timerInterval);
      this.timerInterval = null;
      const mins = parseInt(this.timerMinsInput.value, 10) || 10;
      this.timerRemaining = mins * 60;
      this.renderTimer();
    },

    renderTimer() {
      const m = Math.floor(this.timerRemaining / 60);
      const s = this.timerRemaining % 60;
      this.timerDisplay.textContent =
        `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    },

    playAlert() {
      if (!MS.Synth.ctx) MS.Synth.init();
      MS.Synth.resume();
      MS.Synth.playSequence([72, 76, 79, 84], 0.2, 20);
    },
  };
}(window.MS));
