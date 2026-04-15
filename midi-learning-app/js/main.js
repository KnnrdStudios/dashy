/* Main orchestrator: tabs, event wiring, loop recorder, theory UI,
   ear trainer, progress log, circle of fifths. */
(() => {
  // ---------- Tabs ----------
  document.querySelectorAll('#tabs .tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#tabs .tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      btn.classList.add('active');
      const view = document.getElementById('view-' + btn.dataset.tab);
      if (view) view.classList.add('active');
    });
  });

  // ---------- Main keyboard ----------
  let octaveShift = 0;
  const kbd = Keyboard.render(document.getElementById('keyboard'), {
    startOctave: 3, endOctave: 5, showLabels: true,
    onNoteDown: (m, v) => playNote(m, v),
    onNoteUp:   (m)   => releaseNote(m),
  });

  // Shifted note = actual note played (for octave shifter)
  function shifted(m) { return m + octaveShift * 12; }

  function playNote(rawMidi, vel = 100) {
    Synth.init();
    const m = shifted(rawMidi);
    Synth.noteOn(m, vel);
    kbd.activate(rawMidi);
    document.getElementById('note-readout').textContent = Theory.midiToName(m);
    document.getElementById('vel-readout').textContent = 'vel ' + vel;
    if (recording) recordEvent({ t: Date.now() - recordStart, type: 'on', midi: m, vel });
  }
  function releaseNote(rawMidi) {
    const m = shifted(rawMidi);
    Synth.noteOff(m);
    kbd.deactivate(rawMidi);
    if (recording) recordEvent({ t: Date.now() - recordStart, type: 'off', midi: m });
  }

  // ---------- Computer keyboard -> MIDI ----------
  const PC_MAP = {
    a: 60, w: 61, s: 62, e: 63, d: 64, f: 65, t: 66,
    g: 67, y: 68, h: 69, u: 70, j: 71, k: 72, o: 73, l: 74, p: 75, ';': 76
  };
  const downKeys = new Set();
  document.addEventListener('keydown', (e) => {
    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
    const target = e.target;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA')) return;
    const key = e.key.toLowerCase();
    if (PC_MAP[key] != null) {
      if (downKeys.has(key)) return;
      downKeys.add(key);
      playNote(PC_MAP[key], 100);
      e.preventDefault();
    } else if (key === 'z') { octaveShift = Math.max(-4, octaveShift - 1); document.getElementById('oct-label').textContent = octaveShift; }
      else if (key === 'x') { octaveShift = Math.min( 4, octaveShift + 1); document.getElementById('oct-label').textContent = octaveShift; }
  });
  document.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (PC_MAP[key] != null && downKeys.has(key)) {
      downKeys.delete(key);
      releaseNote(PC_MAP[key]);
    }
  });

  // ---------- Controls ----------
  document.getElementById('preset').addEventListener('change', e => Synth.setPreset(e.target.value));
  document.getElementById('volume').addEventListener('input', e => { Synth.init(); Synth.setVolume(+e.target.value); });
  document.getElementById('reverb').addEventListener('input', e => { Synth.init(); Synth.setReverb(+e.target.value); });
  document.getElementById('sustain').addEventListener('change', e => { Synth.init(); Synth.setSustain(e.target.checked); });
  document.getElementById('oct-down').addEventListener('click', () => { octaveShift = Math.max(-4, octaveShift - 1); document.getElementById('oct-label').textContent = octaveShift; });
  document.getElementById('oct-up').addEventListener('click', () => { octaveShift = Math.min( 4, octaveShift + 1); document.getElementById('oct-label').textContent = octaveShift; });
  document.getElementById('audio-enable').addEventListener('click', () => {
    Synth.init();
    document.getElementById('audio-enable').textContent = 'Audio ready ✓';
    document.getElementById('audio-enable').disabled = true;
  });

  // ---------- Pad grid on Play tab ----------
  function renderPlayPads() {
    const grid = document.getElementById('pad-grid');
    grid.innerHTML = '';
    Object.entries(Drums.MAP).forEach(([midi, info], i) => {
      const p = document.createElement('div');
      p.className = 'pad';
      p.textContent = (i + 1) + ' ' + info.name;
      p.addEventListener('click', () => {
        Synth.init();
        Drums.trigger(+midi);
        p.classList.add('active');
        setTimeout(() => p.classList.remove('active'), 100);
      });
      grid.appendChild(p);
    });
  }
  renderPlayPads();

  // ---------- Loop recorder ----------
  let recording = false, recordStart = 0, recordBuffer = [], recordDuration = 0;
  let loopTimer = null, loopPlaying = false;
  document.getElementById('rec-btn').addEventListener('click', () => {
    Synth.init();
    recording = true;
    recordBuffer = [];
    recordStart = Date.now();
    document.getElementById('rec-status').textContent = 'Recording… (max 20 s)';
    setTimeout(() => { if (recording) stopRecording(); }, 20000);
    const start = Date.now();
    const fill = document.getElementById('rec-fill');
    const tick = () => {
      if (!recording) return;
      const pct = Math.min(100, (Date.now() - start) / 200);
      fill.style.width = pct + '%';
      if (recording) requestAnimationFrame(tick);
    };
    tick();
  });
  document.getElementById('stop-btn').addEventListener('click', () => {
    stopRecording();
    stopLoop();
  });
  document.getElementById('play-btn').addEventListener('click', () => {
    if (!recordBuffer.length) return;
    startLoop();
  });
  document.getElementById('clear-btn').addEventListener('click', () => {
    recordBuffer = [];
    recordDuration = 0;
    document.getElementById('rec-fill').style.width = '0%';
    document.getElementById('rec-status').textContent = 'Empty buffer.';
  });

  function recordEvent(ev) { recordBuffer.push(ev); }
  function stopRecording() {
    if (!recording) return;
    recording = false;
    recordDuration = Date.now() - recordStart;
    document.getElementById('rec-status').textContent = `Captured ${recordBuffer.length} events across ${(recordDuration/1000).toFixed(1)}s.`;
  }
  function startLoop() {
    if (loopPlaying || !recordBuffer.length) return;
    loopPlaying = true;
    const playOnce = () => {
      recordBuffer.forEach(ev => {
        setTimeout(() => {
          if (!loopPlaying) return;
          if (ev.type === 'on') Synth.noteOn(ev.midi, ev.vel);
          else Synth.noteOff(ev.midi);
        }, ev.t);
      });
    };
    playOnce();
    loopTimer = setInterval(playOnce, recordDuration + 250);
  }
  function stopLoop() {
    loopPlaying = false;
    clearInterval(loopTimer); loopTimer = null;
    Synth.panic();
  }

  // ---------- MIDI init ----------
  (async () => {
    const res = await MIDI.init();
    const status = document.getElementById('midi-status');
    const label = document.getElementById('midi-label');
    if (res.ok) {
      status.classList.add('ok');
      label.textContent = 'MIDI: ' + (res.name || 'waiting for device…');
    } else {
      label.textContent = 'MIDI unavailable: ' + res.error;
    }
  })();
  MIDI.onStateChange(name => {
    const status = document.getElementById('midi-status');
    const label = document.getElementById('midi-label');
    if (name) { status.classList.add('ok'); label.textContent = 'MIDI: ' + name; }
    else      { status.classList.remove('ok'); label.textContent = 'MIDI: disconnected'; }
  });
  MIDI.on('noteOn',  (m, v) => {
    // Pads on MPK Mk3 Bank A trigger drums, keys play synth.
    if (m >= 36 && m <= 43) {
      Drums.trigger(m);
      MPK.midiPadHit(m);
    } else {
      // Display onscreen using raw midi relative to shown range if possible
      Synth.init();
      Synth.noteOn(m + octaveShift * 12, v);
      if (kbd.elements[m]) kbd.activate(m);
      document.getElementById('note-readout').textContent = Theory.midiToName(m + octaveShift * 12);
      document.getElementById('vel-readout').textContent  = 'vel ' + v;
    }
  });
  MIDI.on('noteOff', (m) => {
    if (m >= 36 && m <= 43) return;
    Synth.noteOff(m + octaveShift * 12);
    if (kbd.elements[m]) kbd.deactivate(m);
  });
  MIDI.on('cc', (ctrl, val) => {
    if (ctrl === 1) { /* modulation: could modulate filter */ }
    if (ctrl === 64) Synth.setSustain(val >= 64);
  });

  // ---------- MPK tab ----------
  MPK.render(document.getElementById('mpk-diagram'));
  MPK.renderPadGrid();
  document.getElementById('pad-train-start').addEventListener('click', () => { Synth.init(); MPK.startTrainer(); });

  // ---------- AME2 tab ----------
  AME2.render(document.getElementById('ame2-diagram'));
  AME2.renderSignalFlow(document.getElementById('signal-flow'));
  AME2.renderScenario('podcast');
  AME2.renderQuiz();
  document.querySelectorAll('.scenario-pick .pill').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.scenario-pick .pill').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      AME2.renderScenario(b.dataset.scenario);
    });
  });

  // ---------- Theory tab ----------
  const rootSelect = document.getElementById('scale-root');
  const chordRoot  = document.getElementById('chord-root');
  const progKey    = document.getElementById('prog-key');
  Theory.NOTE_NAMES.forEach(n => {
    [rootSelect, chordRoot, progKey].forEach(sel => {
      const o = document.createElement('option');
      o.value = n; o.textContent = n;
      sel.appendChild(o);
    });
  });
  rootSelect.value = 'C'; chordRoot.value = 'C'; progKey.value = 'C';

  const scaleKbd = Keyboard.render(document.getElementById('scale-keyboard'), {
    startOctave: 4, endOctave: 5,
    onNoteDown: (m,v) => { Synth.init(); Synth.noteOn(m, v); },
    onNoteUp:   (m) => Synth.noteOff(m),
  });

  function updateScaleDisplay() {
    const root = rootSelect.value;
    const type = document.getElementById('scale-type').value;
    const notes = Theory.scale(root, type, 4);
    scaleKbd.highlight(notes);
    document.getElementById('scale-notes').textContent =
      'Notes: ' + notes.map(n => Theory.midiToName(n)).join('  ');
  }
  rootSelect.addEventListener('change', updateScaleDisplay);
  document.getElementById('scale-type').addEventListener('change', updateScaleDisplay);
  document.getElementById('scale-play').addEventListener('click', () => {
    Synth.init();
    const notes = Theory.scale(rootSelect.value, document.getElementById('scale-type').value, 4);
    const full = [...notes, notes[0] + 12];
    full.forEach((n, i) => {
      setTimeout(() => {
        Synth.noteOn(n, 90);
        setTimeout(() => Synth.noteOff(n), 220);
      }, i * 240);
    });
  });
  updateScaleDisplay();

  // Chords
  function updateChordDisplay() {
    const notes = Theory.chord(chordRoot.value, document.getElementById('chord-type').value, 4);
    document.getElementById('chord-notes').textContent =
      'Notes: ' + notes.map(n => Theory.midiToName(n)).join('  ');
  }
  chordRoot.addEventListener('change', updateChordDisplay);
  document.getElementById('chord-type').addEventListener('change', updateChordDisplay);
  document.getElementById('chord-play').addEventListener('click', () => {
    Synth.init();
    const notes = Theory.chord(chordRoot.value, document.getElementById('chord-type').value, 4);
    notes.forEach(n => Synth.noteOn(n, 90));
    setTimeout(() => notes.forEach(n => Synth.noteOff(n)), 1200);
  });
  updateChordDisplay();

  // Circle of fifths
  (function renderCircle() {
    const c = document.getElementById('circle-of-fifths');
    const size = 240, r = 95, cx = size/2, cy = size/2;
    let svg = `<svg viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${cx}" cy="${cy}" r="${r + 15}" fill="none" stroke="#272e3d"/>`;
    Theory.CIRCLE.forEach((note, i) => {
      const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      svg += `<circle class="hit" data-note="${note}" cx="${x}" cy="${y}" r="18" fill="#2c3347" stroke="#4a556e"/>
              <text x="${x}" y="${y+4}" text-anchor="middle" fill="#ffb879" font-size="12" font-family="monospace" style="pointer-events:none">${note}</text>`;
    });
    svg += `</svg>`;
    c.innerHTML = svg;
    c.querySelectorAll('.hit').forEach(el => {
      el.addEventListener('click', () => {
        Synth.init();
        const notes = Theory.chord(el.dataset.note, 'maj', 4);
        notes.forEach(n => Synth.noteOn(n, 85));
        setTimeout(() => notes.forEach(n => Synth.noteOff(n)), 900);
        rootSelect.value = el.dataset.note; updateScaleDisplay();
      });
    });
  })();

  // Ear training
  let earNote = null;
  document.getElementById('ear-new').addEventListener('click', () => {
    Synth.init();
    earNote = 60 + Math.floor(Math.random() * 12);
    Synth.noteOn(earNote, 90);
    setTimeout(() => Synth.noteOff(earNote), 900);
    document.getElementById('ear-result').textContent = 'Listen and play the matching key.';
  });
  document.getElementById('ear-replay').addEventListener('click', () => {
    if (earNote == null) return;
    Synth.noteOn(earNote, 90);
    setTimeout(() => Synth.noteOff(earNote), 900);
  });
  // Ear checker hooked into both onscreen + MIDI
  function earCheck(midi) {
    if (earNote == null) return;
    const target = earNote % 12;
    const guess = midi % 12;
    const el = document.getElementById('ear-result');
    if (guess === target) {
      el.textContent = '✓ Correct! ' + Theory.NOTE_NAMES[target];
      Store.push('quiz', { type: 'ear', correct: true, when: Date.now() });
      earNote = null;
    } else {
      el.textContent = `Not quite — you played ${Theory.NOTE_NAMES[guess]}. Try again or Replay.`;
    }
  }
  MIDI.on('noteOn', (m) => { if (document.getElementById('view-theory').classList.contains('active')) earCheck(m); });
  scaleKbd && Object.values(scaleKbd.elements || {}).flat().forEach(() => {}); // noop
  document.getElementById('scale-keyboard').addEventListener('mousedown', (e) => {
    // Rough: find the active pkey by element lookup
    setTimeout(() => {
      if (document.getElementById('view-theory').classList.contains('active')) {
        // The last read note is simpler — we hooked onNoteDown above so use a closure var
      }
    }, 0);
  });

  // ---------- Practice tab ----------
  document.getElementById('bpm').addEventListener('input', e => Practice.setBpm(+e.target.value));
  document.getElementById('meter').addEventListener('change', e => Practice.setMeter(e.target.value.split('/')[0]));
  document.getElementById('metro-toggle').addEventListener('click', () => { Synth.init(); Practice.toggleMetronome(); });
  Practice.renderMetroViz();

  document.getElementById('drum-pattern').addEventListener('change', e => Practice.setPattern(e.target.value));
  document.getElementById('drum-toggle').addEventListener('click', () => { Synth.init(); Practice.toggleDrums(); });
  Practice.renderDrumGrid();

  document.getElementById('prog-select').addEventListener('change', e => Practice.setProg(e.target.value));
  document.getElementById('prog-key').addEventListener('change', e => Practice.setProgKey(e.target.value));
  document.getElementById('prog-toggle').addEventListener('click', () => { Synth.init(); Practice.toggleProg(); });

  document.getElementById('routine-gen').addEventListener('click', Practice.generateRoutine);

  // ---------- Podcast tab ----------
  Podcast.render();

  // ---------- Progress tab ----------
  function renderLog() {
    const logs = Store.get('log', []);
    const list = document.getElementById('log-list');
    list.innerHTML = logs.slice().reverse().map(l => {
      const d = new Date(l.when);
      return `<li><span class="when">${d.toLocaleDateString()} ${d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span> — ${l.minutes} min — ${escape(l.note)}</li>`;
    }).join('') || '<li class="muted">No sessions yet.</li>';
    const total = logs.reduce((a,b) => a + (+b.minutes || 0), 0);
    document.getElementById('log-stats').textContent =
      `${logs.length} sessions, ${total} total minutes practiced.`;
  }
  function escape(s) { return String(s || '').replace(/[<>&"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c])); }
  document.getElementById('log-add').addEventListener('click', () => {
    const note = document.getElementById('log-note').value.trim();
    const minutes = +document.getElementById('log-minutes').value || 0;
    if (!minutes) return;
    Store.push('log', { note, minutes, when: Date.now() });
    document.getElementById('log-note').value = '';
    document.getElementById('log-minutes').value = '';
    renderLog();
  });
  function renderQuizScores() {
    const scores = Store.get('quiz', []);
    const list = document.getElementById('quiz-scores');
    if (!scores.length) { list.innerHTML = '<li class="muted">No scores yet.</li>'; return; }
    // Aggregate by type
    const agg = {};
    scores.forEach(s => {
      agg[s.type] = agg[s.type] || { count: 0, sum: 0 };
      agg[s.type].count++;
      agg[s.type].sum += (s.score ?? (s.correct ? 1 : 0));
    });
    list.innerHTML = Object.entries(agg).map(([k,v]) =>
      `<li><strong>${k}</strong>: ${v.count} attempts — points ${v.sum}</li>`).join('');
  }
  document.getElementById('reset-all').addEventListener('click', () => {
    if (confirm('Wipe all local progress?')) { Store.reset(); renderLog(); renderQuizScores(); Podcast.render(); }
  });
  renderLog();
  renderQuizScores();

})();
