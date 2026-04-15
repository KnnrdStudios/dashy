/* Metronome + drum machine + chord progression jam + routine generator. */
const Practice = (() => {
  // ---------- Metronome ----------
  let metroRunning = false;
  let metroInterval = null;
  let metroBeat = 0;
  let bpm = 100;
  let meter = 4;

  function toggleMetronome() {
    metroRunning ? stopMetronome() : startMetronome();
  }
  function startMetronome() {
    Synth.init();
    metroRunning = true;
    metroBeat = 0;
    const period = 60000 / bpm;
    const tick = () => {
      Drums.metronomeClick(metroBeat % meter === 0);
      const viz = document.getElementById('metro-viz');
      if (viz) {
        viz.querySelectorAll('.beat').forEach(el => el.classList.remove('hit'));
        const el = viz.children[metroBeat % meter];
        if (el) el.classList.add('hit');
      }
      metroBeat++;
    };
    tick();
    metroInterval = setInterval(tick, period);
    document.getElementById('metro-toggle').textContent = 'Stop';
  }
  function stopMetronome() {
    metroRunning = false;
    clearInterval(metroInterval);
    metroInterval = null;
    document.getElementById('metro-toggle').textContent = 'Start';
  }
  function setBpm(v) {
    bpm = v;
    document.getElementById('bpm-label').textContent = v;
    if (metroRunning) { stopMetronome(); startMetronome(); }
  }
  function setMeter(m) {
    meter = parseInt(m, 10) || 4;
    renderMetroViz();
    if (metroRunning) { stopMetronome(); startMetronome(); }
  }
  function renderMetroViz() {
    const viz = document.getElementById('metro-viz');
    if (!viz) return;
    viz.innerHTML = '';
    for (let i = 0; i < meter; i++) {
      const d = document.createElement('div');
      d.className = 'beat' + (i === 0 ? ' downbeat' : '');
      viz.appendChild(d);
    }
  }

  // ---------- Drum machine ----------
  const PATTERNS = {
    // rows: K S H O (Kick, Snare, cl Hat, op Hat)
    rock:    { K: '1000100010001000', S: '0000100000001000', H: '1010101010101010', O: '0000000000000000' },
    hiphop:  { K: '1000001010000010', S: '0000100000001000', H: '1010101010101010', O: '0000000000000000' },
    funk:    { K: '1000100000101000', S: '0000100001001000', H: '1110111011101110', O: '0001000100010001' },
    halftime:{ K: '1000000000001000', S: '0000000010000000', H: '1010101010101010', O: '0000000000000000' },
    bossa:   { K: '1001001000100100', S: '0100010001000100', H: '1010101010101010', O: '0000000000000000' },
  };
  const ROWS = [
    { id: 'K', name: 'Kick',  fn: () => Drums.kick() },
    { id: 'S', name: 'Snare', fn: () => Drums.snare() },
    { id: 'H', name: 'Hat',   fn: () => Drums.hat(false) },
    { id: 'O', name: 'OpHat', fn: () => Drums.hat(true) },
  ];
  let drumRunning = false, drumTimer = null, drumStep = 0, currentPattern = 'rock';

  function renderDrumGrid() {
    const grid = document.getElementById('drum-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const p = PATTERNS[currentPattern];
    ROWS.forEach(r => {
      const row = document.createElement('div'); row.className = 'drum-row';
      row.innerHTML = `<div class="name">${r.name}</div>` +
        Array.from({length:16}, (_,i) => `<div class="drum-cell ${p[r.id][i]==='1'?'on':''}" data-row="${r.id}" data-step="${i}"></div>`).join('');
      grid.appendChild(row);
    });
    // toggle cells
    grid.querySelectorAll('.drum-cell').forEach(cell => {
      cell.addEventListener('click', () => {
        const r = cell.dataset.row; const s = +cell.dataset.step;
        const arr = PATTERNS[currentPattern][r].split('');
        arr[s] = arr[s] === '1' ? '0' : '1';
        PATTERNS[currentPattern][r] = arr.join('');
        cell.classList.toggle('on');
      });
    });
  }

  function toggleDrums() {
    drumRunning ? stopDrums() : startDrums();
  }
  function startDrums() {
    Synth.init();
    drumRunning = true;
    drumStep = 0;
    const period = (60000 / bpm) / 4; // 16th notes at current bpm
    const tick = () => {
      const p = PATTERNS[currentPattern];
      ROWS.forEach(r => { if (p[r.id][drumStep] === '1') r.fn(); });
      const grid = document.getElementById('drum-grid');
      if (grid) {
        grid.querySelectorAll('.drum-cell').forEach(c => c.classList.remove('playing'));
        grid.querySelectorAll(`.drum-cell[data-step="${drumStep}"]`).forEach(c => c.classList.add('playing'));
      }
      drumStep = (drumStep + 1) % 16;
    };
    tick();
    drumTimer = setInterval(tick, period);
    document.getElementById('drum-toggle').textContent = 'Stop';
  }
  function stopDrums() {
    drumRunning = false;
    clearInterval(drumTimer); drumTimer = null;
    document.getElementById('drum-toggle').textContent = 'Start';
  }
  function setPattern(name) { currentPattern = name; renderDrumGrid(); }

  // ---------- Chord progression jam ----------
  const PROGS = {
    '1-5-6-4':  [1, 5, 6, 4],
    '2-5-1':    [2, 5, 1, 1],
    '1-6-4-5':  [1, 6, 4, 5],
    '1-4-5':    [1, 4, 5, 5],
    '6-4-1-5':  [6, 4, 1, 5],
  };
  let progRunning = false, progTimer = null, progIdx = 0, progName = '1-5-6-4', progKey = 'C';
  function toggleProg() { progRunning ? stopProg() : startProg(); }
  function startProg() {
    Synth.init();
    progRunning = true;
    progIdx = 0;
    const play = () => {
      const degs = PROGS[progName];
      const deg = degs[progIdx % degs.length];
      const notes = Theory.diatonicChord(progKey, deg, 4);
      notes.forEach(n => Synth.noteOn(n, 70));
      setTimeout(() => notes.forEach(n => Synth.noteOff(n)), 1900);
      const label = ['', 'I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'][deg];
      const el = document.getElementById('prog-current');
      if (el) el.textContent = `Now: ${label} in ${progKey}`;
      progIdx++;
    };
    play();
    progTimer = setInterval(play, 2000);
    document.getElementById('prog-toggle').textContent = 'Stop jam';
  }
  function stopProg() {
    progRunning = false;
    clearInterval(progTimer); progTimer = null;
    Synth.panic();
    document.getElementById('prog-toggle').textContent = 'Start jam';
    const el = document.getElementById('prog-current');
    if (el) el.textContent = '—';
  }
  function setProg(name) { progName = name; }
  function setProgKey(k) { progKey = k; }

  // ---------- Routine generator ----------
  const ROUTINES = [
    'Warm up: 5 min chromatic runs, MPK keys, both hands if possible.',
    'Scales: play C major, then G major, then A minor. 2 minutes each at 80 BPM.',
    'Chord drill: play I–IV–V–I in C, then F, then G. Switch without stopping.',
    'Pad drill: start the Pad Trainer, complete 20 hits at 100% accuracy.',
    'Groove: start the drum machine, improvise a melody in C pentatonic for 3 minutes.',
    'Ear training: identify 5 notes correctly in a row.',
    'Record: capture a 30-second loop you\'re proud of in the Loop Recorder.',
  ];
  function generateRoutine() {
    const shuffled = [...ROUTINES].sort(() => Math.random() - 0.5).slice(0, 5);
    const list = document.getElementById('routine-list');
    if (list) list.innerHTML = shuffled.map(s => `<li>${s}</li>`).join('');
  }

  return {
    toggleMetronome, setBpm, setMeter, renderMetroViz,
    toggleDrums, renderDrumGrid, setPattern,
    toggleProg, setProg, setProgKey,
    generateRoutine,
  };
})();
