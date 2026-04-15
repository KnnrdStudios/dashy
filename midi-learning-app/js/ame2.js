/* Maono AME2 interactive diagram + scenarios + quiz. */
const AME2 = (() => {
  // Faithful-enough stylized layout. Controls drawn as rect/circle hotspots.
  const CONTROLS = [
    { id: 'mic1', x: 20,  y: 40,  w: 42, h: 26, shape: 'rect', label: 'Mic 1 XLR input',
      text: 'Balanced XLR input for your main mic. Use a short, good-quality XLR cable and lock it in place. The AME2 can power condenser mics from here via the <b>48V phantom</b> switch.' },
    { id: 'mic2', x: 20,  y: 75,  w: 42, h: 26, shape: 'rect', label: 'Mic 2 XLR input',
      text: 'Second mic input for a co-host (podcast) or an instrument mic (music). Each input has its own gain, EQ and FX so you can dial them independently.' },

    { id: 'gain1', x: 80, y: 40,  w: 30, h: 30, shape: 'circle', label: 'Channel 1 Gain',
      text: 'Sets how much your mic signal is amplified <b>before</b> anything else. This is the most important knob in audio. Too low = noisy recording, too high = clipping (red light). Aim for peaks in yellow only.' },
    { id: 'gain2', x: 80, y: 80,  w: 30, h: 30, shape: 'circle', label: 'Channel 2 Gain',
      text: 'Gain for Mic 2. Match it to Mic 1 at the same distance/volume so both hosts sound equally loud without constant riding.' },

    { id: 'phantom', x: 120, y: 44, w: 36, h: 22, shape: 'rect', label: 'Phantom Power 48V',
      text: '48V power for condenser mics. Turn it <b>off</b> for dynamic mics (SM7B, SM58) and ribbons — ribbons can be damaged by phantom. Turn it <b>on</b> for condensers (AT2020, NT1, etc.).' },
    { id: 'pad',     x: 120, y: 80, w: 36, h: 22, shape: 'rect', label: '−20 dB Pad',
      text: 'Attenuates very loud sources by 20 dB so the preamp doesn\'t clip. Engage when miking loud instruments (guitar cab, kick drum) or a screamer.' },

    { id: 'eq',  x: 170, y: 40, w: 80, h: 60, shape: 'rect', label: 'EQ (Low / Mid / High)',
      text: 'Three-band EQ per channel. <b>Low</b> (≈80 Hz) adds weight; cut if too boomy. <b>Mid</b> (≈1 kHz) controls presence — cut to reduce nasal tone. <b>High</b> (≈10 kHz) adds air; cut to tame sibilance. Small moves only, ±3 dB at most.' },

    { id: 'fx', x: 260, y: 40, w: 70, h: 30, shape: 'rect', label: 'FX Section',
      text: 'Built-in effects: <b>Reverb</b> (hall/room), <b>Auto-tune</b> (music mode), <b>Voice changer</b>, and <b>Echo</b>. For podcasts keep Reverb low or off — reverb kills intelligibility.' },
    { id: 'ducker', x: 260, y: 75, w: 70, h: 28, shape: 'rect', label: 'Ducking',
      text: 'Automatically lowers background music whenever a mic detects voice. Essential for podcasts that play intro/outro music or bed loops underneath dialogue.' },

    { id: 'pads',   x: 340, y: 40, w: 86, h: 60, shape: 'rect', label: 'Sample Pads (4)',
      text: '4 assignable sound pads. Load intros, stingers, laugh tracks, applause, or custom samples. Press to fire. Great for live podcasting or solo shows.' },

    { id: 'fader1', x: 80, y: 130, w: 20, h: 60, shape: 'rect', label: 'Channel 1 Fader',
      text: 'Blends Mic 1 into the main mix. This affects what is <b>sent to your computer and headphones</b>, not the pre-amp level. Set gain first, then use the fader to balance.' },
    { id: 'fader2', x: 110, y: 130, w: 20, h: 60, shape: 'rect', label: 'Channel 2 Fader',
      text: 'Fader for Mic 2. Keep both faders near unity (0 dB mark) and balance with Gain first.' },
    { id: 'faderBT',x: 140, y: 130, w: 20, h: 60, shape: 'rect', label: 'Bluetooth / Phone',
      text: 'Bluetooth channel fader. Pair your phone to bring a remote guest into the mix. Lower this during your own speech or use Ducking.' },
    { id: 'faderUSB',x: 170,y: 130, w: 20, h: 60, shape: 'rect', label: 'USB / Computer',
      text: 'Fader for audio playing from your computer — Discord, Zoom guests, Spotify, backing tracks. Route-in from the OS, fade-in here.' },

    { id: 'monitor', x: 210, y: 135, w: 34, h: 30, shape: 'circle', label: 'Monitor Mix',
      text: 'Blend between "direct" (zero-latency mic monitoring) and "computer playback" in your headphones. Essential while tracking — latency from the USB loop is distracting.' },

    { id: 'phones',  x: 260, y: 130, w: 60, h: 30, shape: 'rect', label: 'Headphone Out',
      text: '1/4" TRS headphone jack with its own volume. Use closed-back headphones so bleed doesn\'t get picked up by condenser mics.' },

    { id: 'mute1',   x: 340, y: 130, w: 40, h: 22, shape: 'rect', label: 'Mute Mic 1',
      text: 'Instantly mutes Mic 1. Hit this if you need to cough, sneeze, or slurp coffee on a live broadcast.' },
    { id: 'mute2',   x: 390, y: 130, w: 40, h: 22, shape: 'rect', label: 'Mute Mic 2',
      text: 'Same idea for Mic 2. Consider assigning each host their own mute finger-reach.' },

    { id: 'usb',     x: 340, y: 165, w: 90, h: 28, shape: 'rect', label: 'USB-C to Computer',
      text: 'USB-C connection. The AME2 appears as an audio interface to your OS. Set it as both the <b>input</b> and <b>output</b> in your DAW / OBS / Audacity for zero-latency recording.' },

    { id: 'modeswitch', x: 340, y: 5, w: 90, h: 26, shape: 'rect', label: 'Mode Switch (Podcast/Music)',
      text: 'Top-panel switch that reconfigures routing and default FX. <b>Podcast</b>: dry, natural voice, ducking available. <b>Music</b>: activates auto-tune and vocal effects, enables Loopback for livestreaming.' },
  ];

  let selectedId = null;

  function render(container) {
    const w = 450, h = 210;
    let svg = `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="${w-4}" height="${h-4}" rx="10" fill="#1d2230" stroke="#3a4256" stroke-width="2"/>
      <text x="10" y="16" fill="#ffb879" font-size="11" font-family="monospace">MAONO AME2</text>`;

    CONTROLS.forEach(c => {
      const cls = 'hit' + (c.id === selectedId ? ' selected' : '');
      if (c.shape === 'circle') {
        svg += `<circle class="${cls}" data-id="${c.id}" cx="${c.x + c.w/2}" cy="${c.y + c.h/2}" r="${Math.min(c.w, c.h)/2}" fill="#2c3347" stroke="#4a556e" stroke-width="1.5"/>`;
      } else {
        svg += `<rect class="${cls}" data-id="${c.id}" x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" rx="3" fill="#2c3347" stroke="#4a556e" stroke-width="1.5"/>`;
      }
    });

    // Labels
    const labels = [
      [41,56,'XLR 1'],[41,91,'XLR 2'],[95,58,'G1'],[95,98,'G2'],
      [138,58,'48V'],[138,94,'-20'],[210,72,'EQ'],[295,58,'FX'],
      [295,91,'DUCK'],[383,73,'PADS'],[90,164,'1'],[120,164,'2'],
      [150,164,'BT'],[180,164,'USB'],[227,152,'MIX'],[290,148,'PHONES'],
      [360,143,'MUT1'],[410,143,'MUT2'],[385,182,'USB-C'],[385,21,'MODE']
    ];
    labels.forEach(([x,y,t]) => { svg += `<text x="${x}" y="${y}" text-anchor="middle" class="diagram-label" fill="#8992a8">${t}</text>`; });
    svg += `</svg>`;

    container.innerHTML = svg;
    container.querySelectorAll('.hit').forEach(el => {
      el.addEventListener('click', () => {
        selectedId = el.dataset.id;
        render(container);
        const c = CONTROLS.find(x => x.id === selectedId);
        const hint = document.getElementById('ame2-hint');
        if (hint && c) hint.innerHTML = `<strong>${c.label}</strong><br>${c.text}`;
      });
    });
  }

  // ---- Signal flow ----
  function renderSignalFlow(container) {
    container.innerHTML = `
      <svg viewBox="0 0 450 80" xmlns="http://www.w3.org/2000/svg">
        ${['MIC','GAIN','EQ','FX','FADER','MIX','USB-C','DAW'].map((label,i) => {
          const x = 10 + i * 55;
          return `
            <rect x="${x}" y="25" width="48" height="30" rx="4" fill="#2c3347" stroke="#4a556e"/>
            <text x="${x+24}" y="44" text-anchor="middle" font-size="11" fill="#ffb879" font-family="monospace">${label}</text>
            ${i < 7 ? `<path d="M ${x+48} 40 L ${x+55} 40" stroke="#8992a8" stroke-width="2" marker-end="url(#arrow)"/>` : ''}
          `;
        }).join('')}
        <defs>
          <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L5,3 L0,6 z" fill="#8992a8"/>
          </marker>
        </defs>
      </svg>`;
  }

  // ---- Scenarios ----
  const SCENARIOS = {
    podcast: [
      'Flip the top-panel <b>Mode switch to Podcast</b>.',
      'Plug your XLR mic into <b>Mic 1</b>. If it\'s a condenser, press <b>48V</b>.',
      'Turn <b>Gain 1</b> all the way down, then slowly raise it while speaking at normal volume until peaks touch yellow, never red.',
      'Set the <b>EQ</b> flat (12 o\'clock). Small boost on Low if your voice feels thin, small cut on Mid if boxy.',
      'Turn <b>FX → Reverb</b> off or very low — reverb reduces clarity for listeners.',
      'Set the <b>Monitor Mix</b> so you hear yourself 50/50 with computer audio. Wear closed-back headphones.',
      'Assign Pads to Intro / Outro / Applause / Laugh.',
      'In your recording software (OBS / Reaper / Audacity) set input + output to <b>AME2</b>. Record a 30-second test and listen back.',
      'When going live, keep <b>Mute 1/2</b> within finger reach for coughs.'
    ],
    music: [
      'Flip the top-panel <b>Mode switch to Music</b>.',
      'Plug vocal mic into <b>Mic 1</b>. Engage <b>48V</b> if it is a condenser.',
      'Set <b>Gain</b> so your loudest singing hits yellow, never red. Sing at full performance level, not speaking level.',
      'In your DAW set the input to <b>AME2 Mic 1</b>. Arm a track and record-enable it.',
      'Use <b>Monitor Mix</b> so you hear the backing track + your mic together without latency.',
      'Optionally engage <b>Auto-tune</b> / voice FX on the AME2 itself for tracking vibe — but also record a clean version in the DAW.',
      'If layering with MIDI (MPK Mini), let the DAW handle instrument sounds — keep AME2 purely for vocals.',
      'Use the <b>Loopback</b> feature to send backing track + voice together to a single stream for livestreaming.'
    ]
  };

  function renderScenario(name) {
    const list = document.getElementById('scenario-steps');
    if (!list) return;
    list.innerHTML = SCENARIOS[name].map(s => `<li>${s}</li>`).join('');
  }

  // ---- Quiz ----
  const QUIZ = [
    { q: 'You want to power a condenser mic. What do you engage?', a: 'phantom' },
    { q: 'Your recording is too quiet but clean. What do you raise first?', a: 'gain1' },
    { q: 'A guest keeps stepping on your intro music. What feature fixes it automatically?', a: 'ducker' },
    { q: 'You need to cough mid-podcast without editing. Which button?', a: 'mute1' },
    { q: 'Where does your computer actually receive the mixed audio?', a: 'usb' },
    { q: 'You hear latency/echo of your own voice. Which knob helps?', a: 'monitor' },
    { q: 'Your singer is clipping with gain at minimum. Which switch helps?', a: 'pad' },
  ];

  let quizIdx = 0, quizScore = 0;
  function renderQuiz() {
    const container = document.getElementById('ame2-quiz');
    if (!container) return;
    if (quizIdx >= QUIZ.length) {
      container.innerHTML = `<p><strong>Done!</strong> Score: ${quizScore}/${QUIZ.length}</p>
        <button id="ame2-quiz-restart">Restart</button>`;
      container.querySelector('#ame2-quiz-restart').addEventListener('click', () => {
        quizIdx = 0; quizScore = 0; renderQuiz();
      });
      Store.push('quiz', { type: 'ame2', score: quizScore, total: QUIZ.length, when: Date.now() });
      return;
    }
    const q = QUIZ[quizIdx];
    // Pick 3 distractors
    const pool = CONTROLS.filter(c => c.id !== q.a).sort(() => Math.random() - 0.5).slice(0, 3);
    const choices = [...pool.map(c => c.id), q.a].sort(() => Math.random() - 0.5);
    container.innerHTML = `
      <p><strong>${quizIdx + 1}/${QUIZ.length}.</strong> ${q.q}</p>
      <div class="row compact">
        ${choices.map(id => {
          const c = CONTROLS.find(x => x.id === id);
          return `<button data-id="${id}">${c.label}</button>`;
        }).join('')}
      </div>
      <p class="muted">Score: ${quizScore}/${quizIdx}</p>`;
    container.querySelectorAll('button[data-id]').forEach(b => {
      b.addEventListener('click', () => {
        if (b.dataset.id === q.a) quizScore++;
        else {
          b.style.background = 'var(--bad)';
        }
        setTimeout(() => { quizIdx++; renderQuiz(); }, 500);
      });
    });
  }

  return { render, renderSignalFlow, renderScenario, renderQuiz };
})();
