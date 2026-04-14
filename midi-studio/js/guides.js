/* ============================================================
 * MIDI Studio — Interactive guides for MPK Mini + Maono AME2
 * Plus podcast / music-making recipes and practice plan.
 * ============================================================ */

(function (MS) {
  'use strict';

  MS.Guides = {
    mpkControls: [
      {
        key: 'keys',
        type: 'Keys',
        name: '25 Mini Keys',
        body: `<h4>25 Mini Keys</h4>
          Two octaves of velocity-sensitive mini keys. Use the <strong>Oct −/+</strong>
          buttons to shift the playable range from C-2 up to C7. Start in the middle
          (octave 0) to match what you'll see on the virtual piano. Practice playing
          scales slowly with a metronome — speed will come naturally.`,
      },
      {
        key: 'octave',
        type: 'Buttons',
        name: 'Oct − / Oct +',
        body: `<h4>Octave Buttons</h4>
          Shift the keyboard up or down in octaves. Hold both to reset.
          Tip: chords tend to sound fullest between C3 and C5. Leads pop above C5; basslines live below C3.`,
      },
      {
        key: 'pads',
        type: 'Pads',
        name: '8 × 2 Banks of Pads',
        body: `<h4>8 MPC-Style Pads (× 2 banks)</h4>
          Backlit, velocity-sensitive. <strong>PAD BANK</strong> switches A/B for 16 pads total.
          In MIDI Studio open the <em>Pads</em> tab — the first 16 pad notes (36-51)
          are mapped to an in-browser drum kit. Try playing a basic kick / snare groove
          with the metronome running.`,
      },
      {
        key: 'bank',
        type: 'Button',
        name: 'Pad Bank A / B',
        body: `<h4>Pad Bank Switch</h4>
          Toggles between two banks of 8 pads. Useful for separating drums (Bank A)
          from samples / FX (Bank B).`,
      },
      {
        key: 'prog',
        type: 'Button',
        name: 'Prog Change',
        body: `<h4>Prog Change</h4>
          While held, the pads send MIDI Program Change messages so you can page
          through presets in your DAW / softsynth without touching the mouse.`,
      },
      {
        key: 'knobs',
        type: 'Knobs',
        name: '8 Q-Link Knobs',
        body: `<h4>Q-Link Knobs</h4>
          Eight assignable endless(ish) knobs sending MIDI CC. Great for filter sweeps,
          reverb amount, or macro controls on a soft-synth. MIDI Studio listens to all
          CCs — try mapping Knob 1 to the filter slider on the Play tab via your DAW.`,
      },
      {
        key: 'joystick',
        type: 'Stick',
        name: 'X/Y Joystick',
        body: `<h4>4-Way Joystick</h4>
          Default: X = pitch bend, Y = modulation (CC1). Push forward for vibrato on a
          pad, side-to-side for expressive bends on a lead. MIDI Studio pipes pitch
          bend and modulation into the synth.`,
      },
      {
        key: 'arp',
        type: 'Feature',
        name: 'Arpeggiator',
        body: `<h4>Arpeggiator</h4>
          Turns held chords into flowing patterns. Try:
          <strong>Up</strong> direction, <strong>1 octave</strong>, <strong>1/16 rate</strong>,
          <strong>Latch ON</strong>, then hold C–E–G. A simple house arp!`,
      },
      {
        key: 'tap',
        type: 'Button',
        name: 'Tap Tempo',
        body: `<h4>Tap Tempo</h4>
          Tap 4 or more times to set the arp/note-repeat tempo. The same idea lives
          in the Metronome tab here — hit <em>Tap</em> to dial in a BPM by feel.`,
      },
      {
        key: 'sustain',
        type: 'Button',
        name: 'Sustain',
        body: `<h4>Sustain</h4>
          Holds notes the way a piano pedal does. In MIDI Studio, the <em>Sustain</em>
          checkbox on the Play tab does the same thing, and the MPK Mini's built-in
          sustain button is captured automatically via CC 64.`,
      },
      {
        key: 'fullctrl',
        type: 'Button',
        name: 'Full Level',
        body: `<h4>Full Level</h4>
          Makes all pad hits max velocity (127). Handy for programming drum machines
          where you want every hit at the same loudness.`,
      },
      {
        key: 'noterep',
        type: 'Button',
        name: 'Note Repeat',
        body: `<h4>Note Repeat</h4>
          Hold a pad and it repeats at the current tempo & division. Great for rolled
          hi-hats or trap-style snare rolls.`,
      },
    ],

    ame2Controls: [
      {
        key: 'input1',
        type: 'Input',
        name: 'Mic Input 1 (XLR/TRS)',
        body: `<h4>Mic Input 1</h4>
          Combo jack — use XLR for your dynamic podcast mic or TRS for a line-level
          source. Set the gain so speaking peaks hit around −12 to −6 dB on the
          input meter (solid green, occasional yellow, never red).`,
      },
      {
        key: 'input2',
        type: 'Input',
        name: 'Mic Input 2',
        body: `<h4>Mic Input 2</h4>
          Second host or guest mic. For two-person podcasts, aim for matched levels:
          talk at normal volume, turn both mics until the meters behave the same.`,
      },
      {
        key: 'gain',
        type: 'Knob',
        name: 'Gain Knobs',
        body: `<h4>Gain</h4>
          Controls how hot the preamp runs. Rule of thumb: get the loudest usable
          signal <em>before</em> the meter turns red. If you're clipping, turn the gain
          down — don't just turn the output down later, clipping can't be un-clipped.`,
      },
      {
        key: 'phantom',
        type: 'Switch',
        name: '+48V Phantom Power',
        body: `<h4>Phantom Power (+48V)</h4>
          Only needed for condenser microphones. Dynamic mics (likely what you're
          using for podcasts) don't need this — leave it off to avoid noise.`,
      },
      {
        key: 'monitor',
        type: 'Knob',
        name: 'Monitor / Direct Mix',
        body: `<h4>Direct Monitor</h4>
          Blends the mic input straight into your headphones with zero latency.
          Critical for talking or singing naturally — if you only hear what comes back
          from the computer, the round-trip delay can throw you off.`,
      },
      {
        key: 'bt',
        type: 'Feature',
        name: 'Bluetooth Input',
        body: `<h4>Bluetooth</h4>
          Pair a phone to bring in a remote guest via phone call, or play music beds.
          Treat the BT channel like a third input with its own gain / mute.`,
      },
      {
        key: 'soundpad',
        type: 'Pads',
        name: 'Sound Pads',
        body: `<h4>Sound Pads</h4>
          Trigger intro/outro stings, laughs, "applause" etc. Load short WAV files
          from the Maono companion app. For podcasts, keep it <em>sparse</em> — one
          theme and one outro is plenty for most shows.`,
      },
      {
        key: 'fx',
        type: 'Feature',
        name: 'Voice FX (Reverb / Echo)',
        body: `<h4>Voice Effects</h4>
          Built-in reverb/echo and voice changers. Great for creative intros but turn
          them <strong>OFF</strong> for spoken-word podcasting — you want dry, clean
          audio so you can edit and match guests later.`,
      },
      {
        key: 'bass',
        type: 'Button',
        name: 'Bass Boost',
        body: `<h4>Bass Boost</h4>
          Adds low-end warmth to the voice. Use sparingly — too much and things get
          muddy. Most listeners hear podcasts on phone speakers / earbuds that
          don't render deep bass anyway.`,
      },
      {
        key: 'mute',
        type: 'Button',
        name: 'Mute',
        body: `<h4>Per-channel Mute</h4>
          Physical mute is faster than hunting in software. Build the habit of
          muting when coughing, sipping, or checking notes.`,
      },
      {
        key: 'usb',
        type: 'Output',
        name: 'USB-C to PC',
        body: `<h4>USB-C Output</h4>
          This is what MIDI Studio (and any DAW) will see as a "Maono AME2" audio
          input. Pick it in the <em>Podcast / Record</em> tab's device dropdown to
          capture your mic to a take.`,
      },
      {
        key: 'phones',
        type: 'Output',
        name: 'Headphone Out',
        body: `<h4>Headphone Out</h4>
          Closed-back cans here — open-backs leak into the mic. The headphone knob
          sets <em>your</em> monitoring only; it doesn't affect what gets recorded.`,
      },
    ],

    mpkCheatsheet: [
      'Start every session by centering Octave to 0 so notes match what you see on-screen.',
      'Arpeggiator ON + Latch ON = instant loopable chord progressions for practice.',
      'Use Q-Link knob 1 for "filter cutoff" → learn how a low-pass shapes a sound.',
      'Bank A for drums, Bank B for one-shots / FX — don\'t mix them.',
      'Tap Tempo ≈ the groove of the song in your head → dial it in before practicing.',
      'Hold Sustain + slowly play a scale → great for hearing how notes overlap harmonically.',
    ],

    ame2Cheatsheet: [
      'Signal flow: Mic → Gain → Channel strip (FX/Bass/Mute) → Monitor mix → USB-C out.',
      'Set gain so your speaking voice peaks around −12 to −6 dBFS.',
      'Monitor mix: 50/50 gives you a natural hear-yourself-while-the-DAW-plays balance.',
      'Turn Voice FX OFF for podcasts; save them for creative music sessions.',
      'Bluetooth in = remote guests. Mute it whenever you\'re not actively using it.',
      'Phantom power +48V only for condenser mics — leave off for your dynamic.',
      'Closed-back headphones only when recording — open-backs bleed into the mic.',
    ],

    podcastRecipe: [
      '<strong>Physical setup</strong>: mic on a shock mount ~10–15 cm from your mouth, slightly off-axis. Treat the room lightly — a rug and a blanket behind you do more than foam tiles.',
      '<strong>Cabling</strong>: XLR mic → AME2 input 1, AME2 USB-C → computer. Plug headphones into the AME2, not your computer.',
      '<strong>Levels</strong>: say "testing one two, today I\'m…" at your real speaking volume. Adjust GAIN until peaks sit around −12 dBFS in this app\'s meter.',
      '<strong>Monitor mix</strong>: set Direct Monitor so you hear yourself at the same loudness as any backing track — prevents shouting or dropping off.',
      '<strong>Clean first</strong>: Voice FX off, Bass Boost off, Reverb off. Add flavor in post, not at the source.',
      '<strong>Take 1</strong>: hit Record in MIDI Studio. Say your intro. Hit "Add Marker" every time you stumble — you\'ll jump right to those points to re-record.',
      '<strong>Guests</strong>: use Mic 2 for in-room guests, or pair a phone over Bluetooth for remotes.',
      '<strong>Backup</strong>: download every take (.webm file) and keep the raw files until the episode ships.',
      '<strong>Editing</strong>: import the .webm into your editor of choice (Audacity / Reaper / Descript). Trim mistakes at the markers, normalize to −16 LUFS for podcast distribution.',
    ],

    musicRecipe: [
      '<strong>Goal</strong>: make a two-minute loop you enjoy hearing — that\'s a full music session.',
      '<strong>Pick a key</strong>: head to the <em>Learn</em> tab, choose a scale you like the sound of (C Major or A Minor are friendly starters). Click "Show on Piano".',
      '<strong>Pick a progression</strong>: use I–V–vi–IV for something cinematic, ii–V–I for jazzy, 12-bar blues for groove. Click each chord to hear it.',
      '<strong>Play along</strong>: MPK Mini in hand, mimic the chords an octave higher with your left hand, improvise a melody using ONLY the scale notes with your right hand.',
      '<strong>Drums</strong>: switch to the <em>Pads</em> tab. Lay down a kick on beats 1 &amp; 3, snare on 2 &amp; 4, hi-hats on every 8th. Metronome on.',
      '<strong>Record</strong>: route your computer\'s <em>speaker output</em> into the AME2 (or record internally in a DAW) and capture a performance.',
      '<strong>Iterate</strong>: change one thing per loop — a chord, the drum pattern, the synth preset — and listen for what you like.',
    ],

    practicePlan: [
      '<strong>2 min</strong> — warm up: play the C major scale up & down, two octaves, metronome at 80 BPM.',
      '<strong>3 min</strong> — scale of the day: pick a different key from the Learn tab; play its scale ascending and descending.',
      '<strong>5 min</strong> — chord shapes: play I–IV–V–vi in the key of the day, three times. Use the virtual piano as a reference.',
      '<strong>5 min</strong> — ear training: Learn tab → Ear Training → target 10 correct intervals.',
      '<strong>3 min</strong> — groove: Pads tab. Four-bar loop, any pattern. Make it feel good.',
      '<strong>2 min</strong> — free play: no rules. Put everything you just learned into a short improvisation.',
    ],

    init() {
      this.renderDevice('mpk-diagram', 'mpk-detail', this.mpkControls);
      this.renderDevice('ame2-diagram', 'ame2-detail', this.ame2Controls);
      this.renderCheats('mpk-cheatsheet', this.mpkCheatsheet);
      this.renderCheats('ame2-cheatsheet', this.ame2Cheatsheet);
      this.renderRecipe('podcast-recipe', this.podcastRecipe);
      this.renderRecipe('music-recipe', this.musicRecipe);
      this.renderCheats('practice-plan', this.practicePlan);
    },

    renderDevice(diagramId, detailId, controls) {
      const diagram = document.getElementById(diagramId);
      const detail = document.getElementById(detailId);
      diagram.innerHTML = '';
      controls.forEach((c, idx) => {
        const div = document.createElement('div');
        div.className = 'dev-control' + (idx === 0 ? ' active' : '');
        div.innerHTML = `<div class="dc-name">${c.name}</div><div class="dc-type">${c.type}</div>`;
        div.addEventListener('click', () => {
          diagram.querySelectorAll('.dev-control').forEach((e) => e.classList.remove('active'));
          div.classList.add('active');
          detail.innerHTML = c.body;
        });
        diagram.appendChild(div);
      });
      if (controls.length) detail.innerHTML = controls[0].body;
    },

    renderCheats(id, items) {
      const el = document.getElementById(id);
      el.innerHTML = '';
      items.forEach((it) => {
        const li = document.createElement('li');
        li.innerHTML = it;
        el.appendChild(li);
      });
    },

    renderRecipe(id, items) {
      const el = document.getElementById(id);
      el.innerHTML = '';
      items.forEach((it) => {
        const li = document.createElement('li');
        li.innerHTML = it;
        el.appendChild(li);
      });
    },
  };
}(window.MS));
