/* ============================================================
 * MIDI Studio — virtual piano renderer
 * MS.Piano renders an 88-key-lite piano (C2..C6) with highlights.
 * ============================================================ */

(function (MS) {
  'use strict';

  const MIN_MIDI = 36; // C2
  const MAX_MIDI = 84; // C6
  const WHITE_WIDTH = 28;

  // Computer keyboard → midi offset (from base)
  const KEY_MAP = {
    a: 0, w: 1, s: 2, e: 3, d: 4, f: 5, t: 6, g: 7, y: 8, h: 9, u: 10, j: 11,
    k: 12, o: 13, l: 14, p: 15, ';': 16,
  };

  MS.Piano = {
    el: null,
    inner: null,
    keys: {},     // midi -> element
    activeMidis: new Set(),
    targetMidis: new Set(),
    scaleMidis: new Set(),
    onNoteOn: null,
    onNoteOff: null,
    computerBase: 60, // C4

    mount(container) {
      this.el = container;
      this.el.innerHTML = '';
      this.inner = document.createElement('div');
      this.inner.className = 'piano-inner';
      this.el.appendChild(this.inner);
      this.render();
      this.bindMouse();
      this.bindComputerKeys();
    },

    render() {
      this.inner.innerHTML = '';
      this.keys = {};

      // Count white keys
      let whiteCount = 0;
      for (let m = MIN_MIDI; m <= MAX_MIDI; m += 1) {
        if (!this.isBlack(m)) whiteCount += 1;
      }
      this.inner.style.width = (whiteCount * WHITE_WIDTH) + 'px';

      let whiteIdx = 0;
      for (let m = MIN_MIDI; m <= MAX_MIDI; m += 1) {
        const black = this.isBlack(m);
        const key = document.createElement('div');
        key.className = 'key ' + (black ? 'black' : 'white');
        key.dataset.midi = String(m);

        if (black) {
          // Position relative to preceding white key
          key.style.left = (whiteIdx * WHITE_WIDTH - WHITE_WIDTH * 0.28) + 'px';
          key.style.width = (WHITE_WIDTH * 0.55) + 'px';
        } else {
          key.style.left = (whiteIdx * WHITE_WIDTH) + 'px';
          key.style.width = WHITE_WIDTH + 'px';
          whiteIdx += 1;

          // Add C-note label (e.g. C3, C4) for orientation
          if (m % 12 === 0) {
            const label = document.createElement('div');
            label.className = 'key-label';
            label.textContent = MS.midiToName(m);
            key.appendChild(label);
          }
        }
        this.inner.appendChild(key);
        this.keys[m] = key;
      }
    },

    isBlack(m) {
      const pc = m % 12;
      return pc === 1 || pc === 3 || pc === 6 || pc === 8 || pc === 10;
    },

    bindMouse() {
      let mouseDown = false;
      const mousePressed = new Set();
      const pressMouse = (midi) => {
        if (mousePressed.has(midi)) return;
        mousePressed.add(midi);
        this.pressKey(midi, 100);
      };
      const releaseMouse = (midi) => {
        if (!mousePressed.has(midi)) return;
        mousePressed.delete(midi);
        this.releaseKey(midi);
      };
      this.inner.addEventListener('mousedown', (e) => {
        const key = e.target.closest('.key');
        if (!key) return;
        mouseDown = true;
        pressMouse(parseInt(key.dataset.midi, 10));
      });
      this.inner.addEventListener('mouseover', (e) => {
        if (!mouseDown) return;
        const key = e.target.closest('.key');
        if (!key) return;
        pressMouse(parseInt(key.dataset.midi, 10));
      });
      this.inner.addEventListener('mouseout', (e) => {
        if (!mouseDown) return;
        const key = e.target.closest('.key');
        if (!key) return;
        releaseMouse(parseInt(key.dataset.midi, 10));
      });
      window.addEventListener('mouseup', () => {
        if (!mouseDown) return;
        mouseDown = false;
        Array.from(mousePressed).forEach((m) => releaseMouse(m));
      });
    },

    bindComputerKeys() {
      const pressed = new Set();
      window.addEventListener('keydown', (e) => {
        if (e.repeat) return;
        if (e.target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
        const k = e.key.toLowerCase();
        if (k === 'z') { this.computerBase = Math.max(24, this.computerBase - 12); return; }
        if (k === 'x') { this.computerBase = Math.min(96, this.computerBase + 12); return; }
        if (KEY_MAP[k] != null && !pressed.has(k)) {
          pressed.add(k);
          const midi = this.computerBase + KEY_MAP[k];
          this.pressKey(midi, 100);
        }
      });
      window.addEventListener('keyup', (e) => {
        const k = e.key.toLowerCase();
        if (pressed.has(k)) {
          pressed.delete(k);
          const midi = this.computerBase + KEY_MAP[k];
          this.releaseKey(midi);
        }
      });
    },

    pressKey(midi, velocity) {
      if (midi < MIN_MIDI || midi > MAX_MIDI) {
        if (this.onNoteOn) this.onNoteOn(midi, velocity);
        return;
      }
      const key = this.keys[midi];
      if (key) key.classList.add('active');
      this.activeMidis.add(midi);
      if (this.onNoteOn) this.onNoteOn(midi, velocity);
    },

    releaseKey(midi) {
      const key = this.keys[midi];
      if (key) key.classList.remove('active');
      this.activeMidis.delete(midi);
      if (this.onNoteOff) this.onNoteOff(midi);
    },

    /** External update (from MIDI device) */
    highlightActive(midi, on) {
      if (midi < MIN_MIDI || midi > MAX_MIDI) return;
      const key = this.keys[midi];
      if (!key) return;
      if (on) {
        key.classList.add('active');
        this.activeMidis.add(midi);
      } else {
        key.classList.remove('active');
        this.activeMidis.delete(midi);
      }
    },

    /** Highlight scale notes across full range. */
    showScale(pcSet) {
      this.clearScale();
      if (!pcSet) return;
      Object.keys(this.keys).forEach((m) => {
        const pc = parseInt(m, 10) % 12;
        if (pcSet.includes(pc)) {
          this.keys[m].classList.add('scale');
          this.scaleMidis.add(parseInt(m, 10));
        }
      });
    },
    clearScale() {
      this.scaleMidis.forEach((m) => this.keys[m] && this.keys[m].classList.remove('scale'));
      this.scaleMidis.clear();
    },

    /** Highlight target notes (specific MIDI numbers). */
    showTargets(midis) {
      this.clearTargets();
      if (!midis) return;
      midis.forEach((m) => {
        if (this.keys[m]) {
          this.keys[m].classList.add('target');
          this.targetMidis.add(m);
        }
      });
    },
    clearTargets() {
      this.targetMidis.forEach((m) => this.keys[m] && this.keys[m].classList.remove('target'));
      this.targetMidis.clear();
    },
  };
}(window.MS));
