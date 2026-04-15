/* MPK Mini interactive diagram + pad trainer.
   We draw a stylised SVG of the Mk3 layout and wire click hotspots to explanations. */
const MPK = (() => {
  // Each control: id, x, y, w, h, shape ('rect'|'circle'), label, explanation.
  const CONTROLS = [
    { id: 'pads',       x: 18,  y: 55,  w: 200, h: 110, shape: 'rect',
      label: 'Drum Pads (8, Bank A/B)',
      text:  '8 velocity-sensitive RGB pads. Press the <b>Pad Bank</b> button to switch between Bank A (pads 1–8) and Bank B (pads 9–16), giving you 16 trigger slots. In this app Bank A triggers the built-in drum kit.' },

    { id: 'keys',       x: 18,  y: 180, w: 454, h: 80,  shape: 'rect',
      label: '25 Mini Keys',
      text:  '25 velocity-sensitive mini keys. Two full octaves. Use the Octave Up/Down buttons to shift the whole keyboard up or down — you can reach any note on a real 88-key piano.' },

    { id: 'joystick',   x: 246, y: 75,  w: 50,  h: 50,  shape: 'circle',
      label: 'Joystick (4-way)',
      text:  '4-way thumb stick. <b>Left/Right</b> = pitch bend (up to ±2 semitones by default). <b>Up/Down</b> = modulation CC (vibrato, filter sweep, etc.). Centre it when you stop or notes can hang sharp/flat.' },

    { id: 'bank',       x: 310, y: 55,  w: 60,  h: 28,  shape: 'rect',
      label: 'Pad Bank (A/B)',
      text:  'Toggles between Bank A and Bank B for the 8 pads, giving you 16 total slots. Many kits put drums on A and FX / vocal stabs on B.' },

    { id: 'fulllevel',  x: 380, y: 55,  w: 60,  h: 28,  shape: 'rect',
      label: 'Full Level',
      text:  'Locks pads to velocity 127. Useful for making drums punch consistently regardless of how hard you hit. Turn off when you want dynamics.' },

    { id: 'noterepeat', x: 310, y: 90,  w: 60,  h: 28,  shape: 'rect',
      label: 'Note Repeat',
      text:  'Hold to automatically re-trigger the current pad/key at the current <b>Tap Tempo</b> division (1/4, 1/8, 1/16, 1/32). Perfect for hi-hat rolls and trap rolls.' },

    { id: 'arp',        x: 380, y: 90,  w: 60,  h: 28,  shape: 'rect',
      label: 'Arpeggiator',
      text:  'Turns a held chord into an arpeggio. Adjust <b>Mode</b> (Up / Down / Up-Down / Random), <b>Time Division</b>, <b>Octave range</b>, and <b>Latch</b> (keep running after you release). Pair with a Pad preset for instant cinematic results.' },

    { id: 'tap',        x: 310, y: 125, w: 60,  h: 28,  shape: 'rect',
      label: 'Tap Tempo',
      text:  'Tap 4 times at any tempo to set the internal clock. The arpeggiator and note repeat lock to this. If your DAW is the master clock, the MPK will sync to that instead.' },

    { id: 'octdown',    x: 246, y: 125, w: 30,  h: 28,  shape: 'rect',
      label: 'Octave −',
      text:  'Shifts the 25 keys down one octave. Range: −4 to +4. Current octave shows on the OLED (Mk3) or as a coloured LED (Mk2).' },
    { id: 'octup',      x: 276, y: 125, w: 30,  h: 28,  shape: 'rect',
      label: 'Octave +',
      text:  'Shifts the 25 keys up one octave. Useful for lead lines; combine with a Bass preset at −2 and a Lead preset at +2 in a DAW split.' },

    { id: 'knobs',      x: 246, y: 15,  w: 200, h: 40,  shape: 'rect',
      label: '8 Q-Link Knobs',
      text:  '8 assignable endless/pot knobs. By default they send MIDI CC 70–77 — use the MPK Mini editor to map them to any CC to control filter cutoff, resonance, plugin macros, etc.' },

    { id: 'prog',       x: 380, y: 125, w: 60,  h: 28,  shape: 'rect',
      label: 'Prog Change',
      text:  'Sends MIDI Program Change messages to switch patches inside a hardware synth or a plugin that listens for PC messages. Saves mousing around in your DAW.' },
  ];

  let selectedId = null;

  function render(container) {
    const w = 480, h = 290;
    let svg = `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="${w-4}" height="${h-4}" rx="12" fill="#1d2230" stroke="#3a4256" stroke-width="2"/>
      <text x="12" y="20" fill="#ffb879" font-size="12" font-family="monospace">AKAI MPK MINI mk3</text>`;

    CONTROLS.forEach(c => {
      const cls = 'hit' + (c.id === selectedId ? ' selected' : '');
      if (c.shape === 'circle') {
        svg += `<circle class="${cls}" data-id="${c.id}" cx="${c.x + c.w/2}" cy="${c.y + c.h/2}" r="${c.w/2}" fill="#2c3347" stroke="#4a556e" stroke-width="1.5"/>`;
      } else {
        svg += `<rect class="${cls}" data-id="${c.id}" x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" rx="4" fill="#2c3347" stroke="#4a556e" stroke-width="1.5"/>`;
      }
    });

    // Pretty labels on top of shapes
    svg += `
      <text x="118" y="115" text-anchor="middle" class="diagram-label" fill="#8992a8">PADS 1–8</text>
      <text x="245" y="225" text-anchor="middle" class="diagram-label" fill="#8992a8">25 KEYS</text>
      <text x="346" y="73" text-anchor="middle" class="diagram-label" fill="#8992a8">BANK</text>
      <text x="416" y="73" text-anchor="middle" class="diagram-label" fill="#8992a8">FULL LVL</text>
      <text x="346" y="108" text-anchor="middle" class="diagram-label" fill="#8992a8">NOTE RPT</text>
      <text x="416" y="108" text-anchor="middle" class="diagram-label" fill="#8992a8">ARP</text>
      <text x="346" y="143" text-anchor="middle" class="diagram-label" fill="#8992a8">TAP</text>
      <text x="416" y="143" text-anchor="middle" class="diagram-label" fill="#8992a8">PROG</text>
      <text x="261" y="143" text-anchor="middle" class="diagram-label" fill="#8992a8">OCT−</text>
      <text x="291" y="143" text-anchor="middle" class="diagram-label" fill="#8992a8">OCT+</text>
      <text x="346" y="41" text-anchor="middle" class="diagram-label" fill="#8992a8">8 × Q-LINK KNOBS</text>
      <text x="271" y="108" text-anchor="middle" class="diagram-label" fill="#8992a8">JOY</text>
    `;
    svg += `</svg>`;

    container.innerHTML = svg;
    container.querySelectorAll('.hit').forEach(el => {
      el.addEventListener('click', () => {
        selectedId = el.dataset.id;
        render(container);
        const c = CONTROLS.find(x => x.id === selectedId);
        const hint = document.getElementById('mpk-hint');
        if (hint && c) hint.innerHTML = `<strong>${c.label}</strong><br>${c.text}`;
      });
    });
  }

  // ---- Pad trainer ----
  let trainer = { running: false, target: null, score: 0, total: 0, timer: null };

  function renderPadGrid() {
    const grid = document.getElementById('pad-train-grid');
    if (!grid) return;
    grid.innerHTML = '';
    for (let i = 1; i <= 8; i++) {
      const p = document.createElement('div');
      p.className = 'pad';
      p.dataset.num = i;
      p.textContent = 'PAD ' + i;
      p.addEventListener('click', () => handleHit(i));
      grid.appendChild(p);
    }
  }

  function handleHit(pad) {
    if (!trainer.running || !trainer.target) return;
    const el = document.querySelector(`#pad-train-grid .pad[data-num="${pad}"]`);
    trainer.total++;
    if (pad === trainer.target) {
      trainer.score++;
      el.classList.add('correct');
      setTimeout(() => { el.classList.remove('correct'); nextTarget(); }, 250);
    } else {
      el.classList.add('wrong');
      setTimeout(() => el.classList.remove('wrong'), 250);
    }
    updateScore();
  }

  function nextTarget() {
    document.querySelectorAll('#pad-train-grid .pad').forEach(el => el.classList.remove('target'));
    trainer.target = Math.floor(Math.random() * 8) + 1;
    const el = document.querySelector(`#pad-train-grid .pad[data-num="${trainer.target}"]`);
    if (el) el.classList.add('target');
  }

  function updateScore() {
    const el = document.getElementById('pad-train-score');
    if (el) el.textContent = `Score: ${trainer.score} / ${trainer.total}`;
    if (trainer.total >= 20) {
      trainer.running = false;
      Store.push('quiz', { type: 'pad-trainer', score: trainer.score, total: trainer.total, when: Date.now() });
      if (el) el.textContent += '  (session complete)';
    }
  }

  function startTrainer() {
    renderPadGrid();
    trainer = { running: true, target: null, score: 0, total: 0 };
    updateScore();
    nextTarget();
  }

  function midiPadHit(midi) {
    // MPK Mk3 default pads are MIDI notes 36..43 for Bank A
    if (midi >= 36 && midi <= 43) handleHit(midi - 35);
  }

  return { render, startTrainer, renderPadGrid, midiPadHit };
})();
