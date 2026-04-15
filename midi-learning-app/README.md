# Signal — MIDI & Mixer Learning Studio

A local, dependency-free desktop app to help you learn the **Akai Pro MPK
Mini** and the **Maono AME2** audio mixer, practice piano/keys, and get ready
to record podcasts and music.

Everything runs 100% locally — no accounts, no cloud, no tracking. The only
"install" is copying files to your home directory and adding a `signal`
command to your PATH.

![tabs](https://img.shields.io/badge/100%25-local-brightgreen)
![no-deps](https://img.shields.io/badge/dependencies-0-blue)

---

## What's inside

| Tab | What it does |
|---|---|
| **Play** | Live synthesizer (7 presets) played by your MPK Mini, your mouse, or your computer keyboard. Onscreen piano, octave shifter, reverb, sustain, a built-in drum pad kit mapped to the MPK's pads, and a short-loop recorder. |
| **MPK Mini** | Interactive SVG of the controller. Click any part of the diagram to learn what it does. Includes a pad-trainer quiz that builds muscle memory for Bank A. |
| **AME2 Mixer** | Interactive SVG of the Maono AME2 with every control annotated. Signal-flow diagram, 60-second gain-staging tutorial, two scenario walkthroughs (Podcast / Music), and a multiple-choice quiz. |
| **Theory** | Scales, chords, circle of fifths, and ear training. Pick a root and type — the matching notes light up on the keyboard and play. |
| **Practice** | Metronome, 16-step drum machine (5 patterns), endless chord-progression jams (I–V–vi–IV, ii–V–I, 50s progression, 12-bar, sad-pop), and a daily routine generator. |
| **Podcast** | Pre-session checklist (persistent), mic technique guide, level targets, and an AME2 podcast-mode cheat sheet. |
| **Progress** | Local practice log + quiz-score history. Nothing leaves your machine. |

---

## Install on Ubuntu or WSL (Ubuntu on Windows)

```bash
cd midi-learning-app
./install.sh
```

The installer will:

1. Copy the app to `~/.local/share/signal-midi/`
2. Install a `signal` command to `~/.local/bin/`
3. Register a `.desktop` entry so Signal shows up in your app launcher
4. Detect WSL vs native Linux and pick the best browser strategy

Then launch it:

```bash
signal
```

If `~/.local/bin` isn't on your PATH yet, add this to `~/.bashrc`:

```bash
export PATH="$HOME/.local/bin:$PATH"
```

### Installer flags

```
./install.sh                 # install
./install.sh --run           # install (if needed) and launch
./install.sh --uninstall     # remove everything
SIGNAL_PORT=9000 signal      # use a custom local port
```

---

## How it works

`signal` starts a tiny local web server (`python3 -m http.server`) in the
app directory and opens your browser at `http://localhost:8731/`. The app
uses three standard browser APIs:

- **Web MIDI API** — talks to your MPK Mini directly over USB
- **Web Audio API** — synthesizes every sound you hear (piano, pad, drums)
- **localStorage** — remembers your checklist and practice log

There are **no external dependencies**, no node_modules, and no build step.
The entire app is ~2000 lines of vanilla JS across a handful of modules.

### Why a local web server on WSL?

On WSL, Web MIDI through a Linux-side Chromium can't see a USB device plugged
into the Windows host without `usbipd-win` gymnastics. By running a tiny
server on WSL and opening it in the **Windows browser**, the MPK Mini shows
up natively and audio plays through your normal Windows output — no PulseAudio
fiddling, no USB forwarding.

The installer detects WSL automatically and calls `cmd.exe /c start` (or
`wslview`) to open the Windows browser.

### Why not Electron?

Electron would add 150+ MB of download and a build toolchain. The same
experience is achievable with a single HTML file opened in `--app` mode by an
existing browser — which also happens to be how Web MIDI already works.

---

## Browser requirements

Web MIDI is only supported in **Chromium-based** browsers:

- Google Chrome ✓
- Microsoft Edge ✓
- Brave ✓
- Chromium ✓
- Opera ✓
- Firefox / Safari ✗ (no Web MIDI support)

On first launch, click **"Enable audio"** in the top-right — browsers require
a user gesture before playing sound.

---

## Keyboard shortcuts (Play tab)

| Key | Action |
|---|---|
| `A S D F G H J K L ;` | White keys C4 → E5 |
| `W E T Y U O P` | Black keys C#4 → D#5 |
| `Z` / `X` | Octave down / up |

You can also play using the mouse on the onscreen keyboard, or plug in your
MPK Mini and use the real keys — all three input methods work simultaneously.

---

## MPK Mini tips baked into the app

- **Full Level** → velocity-127 lock for punchy drum takes
- **Note Repeat** → auto-retrigger at the tap-tempo rate
- **Arpeggiator** → hold a chord, get an instant sequence
- **Pad Bank A/B** → 16 total pad slots
- **Joystick** → X = pitch bend, Y = modulation
- **Tap Tempo** → set clock by tapping 4 times

## AME2 tips baked into the app

- **Gain first, fader second** — always
- **Phantom power** = 48V, only for condensers (never ribbons)
- **Monitor mix** fixes latency while tracking
- **Ducking** auto-lowers music when voice is detected
- **Mode switch** (Podcast vs Music) reconfigures routing and default FX

---

## File layout

```
midi-learning-app/
├── index.html         # Main shell + tabs
├── install.sh         # Ubuntu / WSL installer
├── css/
│   └── styles.css     # All styling
└── js/
    ├── storage.js     # localStorage wrapper
    ├── theory.js      # Scales, chords, note math
    ├── synth.js       # Polyphonic Web Audio synth
    ├── drums.js       # Synthesized drum kit
    ├── keyboard.js    # Onscreen piano renderer
    ├── midi.js        # Web MIDI API wrapper
    ├── mpk.js         # MPK Mini diagram + pad trainer
    ├── ame2.js        # AME2 diagram + scenarios + quiz
    ├── practice.js    # Metronome / drums / progression jam
    ├── podcast.js     # Podcast checklist
    └── main.js        # App orchestrator
```

---

## Roadmap ideas

- Audio input + waveform meter so you can see your AME2 mic level in-app
- MIDI recorder that exports a real `.mid` file
- Sampler mode for pads (drag-and-drop WAVs)
- More drum patterns + swing
- Intervallic ear training (not just notes)
- AME2 + OBS recipe for livestreaming music performances

Pull requests welcome.

---

## License

Personal project — do whatever you want with it. No warranty.
