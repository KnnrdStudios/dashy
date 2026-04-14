/* ============================================================
 * MIDI Studio — main orchestration
 * Wires tabs, MIDI → synth/piano, synth controls, "Now Playing".
 * ============================================================ */

(function (MS) {
  'use strict';

  const state = {
    octaveShift: 0,
    heldMidis: new Set(),
  };

  function setupTabs() {
    document.querySelectorAll('.tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t === tab));
        document.querySelectorAll('.tab-panel').forEach((p) => {
          p.classList.toggle('active', p.dataset.panel === target);
        });
        if (target === 'record') {
          // lazy layout for canvas
          MS.Recorder.resizeCanvas();
        }
      });
    });
  }

  function setupSynthControls() {
    const preset = document.getElementById('synth-preset');
    const volume = document.getElementById('synth-volume');
    const sustain = document.getElementById('sustain-toggle');
    const envA = document.getElementById('env-a');
    const envD = document.getElementById('env-d');
    const envS = document.getElementById('env-s');
    const envR = document.getElementById('env-r');
    const rev = document.getElementById('fx-reverb');
    const del = document.getElementById('fx-delay');
    const flt = document.getElementById('fx-filter');

    preset.addEventListener('change', (e) => MS.Synth.setPreset(e.target.value));
    volume.addEventListener('input', (e) => MS.Synth.setVolume(parseInt(e.target.value, 10) / 100));
    sustain.addEventListener('change', (e) => MS.Synth.setSustain(e.target.checked));
    const updateEnv = () => MS.Synth.setEnvelope(
      parseInt(envA.value, 10) / 100 * 2,      // 0..2 s
      parseInt(envD.value, 10) / 100 * 2,
      parseInt(envS.value, 10) / 100,
      parseInt(envR.value, 10) / 100 * 3,
    );
    envA.addEventListener('input', updateEnv);
    envD.addEventListener('input', updateEnv);
    envS.addEventListener('input', updateEnv);
    envR.addEventListener('input', updateEnv);
    updateEnv();
    rev.addEventListener('input', (e) => MS.Synth.setReverb(parseInt(e.target.value, 10) / 100 * 1.5));
    del.addEventListener('input', (e) => MS.Synth.setDelay(parseInt(e.target.value, 10) / 100));
    flt.addEventListener('input', (e) => MS.Synth.setFilter(parseInt(e.target.value, 10) / 100));
  }

  function setupOctave() {
    const val = document.getElementById('oct-value');
    document.getElementById('oct-down').addEventListener('click', () => {
      state.octaveShift = Math.max(-3, state.octaveShift - 1);
      val.textContent = state.octaveShift;
    });
    document.getElementById('oct-up').addEventListener('click', () => {
      state.octaveShift = Math.min(3, state.octaveShift + 1);
      val.textContent = state.octaveShift;
    });
  }

  function shift(midi) { return midi + state.octaveShift * 12; }

  function updateNowPlaying(midi, vel) {
    if (midi != null) {
      document.getElementById('np-note').textContent = MS.midiToName(midi);
      document.getElementById('np-vel').textContent = vel != null ? vel : '—';
    }
    document.getElementById('np-voices').textContent = MS.Synth.voiceCount();
    const chord = MS.identifyChord(Array.from(state.heldMidis));
    document.getElementById('np-chord').textContent = chord || '—';
  }

  function onNoteOn(midi, velocity) {
    const m = shift(midi);
    state.heldMidis.add(m);
    MS.Synth.noteOn(m, velocity);
    MS.Piano.highlightActive(m, true);
    if (MS.Pads.padByNote && MS.Pads.padByNote[m]) {
      MS.Pads.hit(m, velocity);
    }
    if (MS.Looper) MS.Looper.captureNoteOn(m, velocity);
    if (MS.ChordChallenge) MS.ChordChallenge.onNoteOn(m);
    if (MS.ScaleRunner) MS.ScaleRunner.onNoteOn(m);
    updateNowPlaying(m, velocity);
  }

  function onNoteOff(midi) {
    const m = shift(midi);
    state.heldMidis.delete(m);
    MS.Synth.noteOff(m);
    MS.Piano.highlightActive(m, false);
    if (MS.Pads.padByNote && MS.Pads.padByNote[m]) {
      MS.Pads.release(m);
    }
    if (MS.Looper) MS.Looper.captureNoteOff(m);
    if (MS.ChordChallenge) MS.ChordChallenge.onNoteOff(m);
    updateNowPlaying(null);
  }

  function setupStatus() {
    const midiStatus = document.getElementById('midi-status');
    const midiLabel = midiStatus.querySelector('.status-label');
    const midiDot = midiStatus.querySelector('.status-dot');
    const audioStatus = document.getElementById('audio-status');
    const audioLabel = audioStatus.querySelector('.status-label');
    const audioDot = audioStatus.querySelector('.status-dot');
    const deviceName = document.getElementById('device-name');

    MS.MIDI.on('device', (name, count) => {
      if (count === 0 || !name) {
        midiDot.className = 'status-dot offline';
        midiLabel.textContent = 'MIDI: not found';
        deviceName.textContent = 'No MIDI device connected';
      } else {
        midiDot.className = 'status-dot online';
        midiLabel.textContent = `MIDI: ${name}`;
        deviceName.textContent = `Connected: ${name} (${count} input${count > 1 ? 's' : ''})`;
      }
    });
    MS.MIDI.on('unsupported', () => {
      midiLabel.textContent = 'MIDI: unsupported browser';
    });

    const enableBtn = document.getElementById('enable-audio');
    enableBtn.addEventListener('click', () => {
      MS.Synth.init();
      MS.Synth.resume();
      audioDot.className = 'status-dot online';
      audioLabel.textContent = `Audio: ${MS.Synth.ctx.sampleRate} Hz`;
      enableBtn.textContent = 'Audio On';
      enableBtn.disabled = true;
    });

    document.getElementById('panic-btn').addEventListener('click', () => {
      MS.Synth.panic();
      state.heldMidis.clear();
      updateNowPlaying(null);
    });
  }

  function setupMidiRouting() {
    MS.MIDI.on('noteon', (note, vel) => onNoteOn(note, vel));
    MS.MIDI.on('noteoff', (note) => onNoteOff(note));
    MS.MIDI.on('sustain', (on) => {
      MS.Synth.setSustain(on);
      document.getElementById('sustain-toggle').checked = on;
    });
    MS.MIDI.on('pitchbend', (value) => {
      // ±2 semitone default bend range; apply to all voices by shifting osc detune
      if (!MS.Synth.ctx) return;
      const cents = (value / 8192) * 200;
      MS.Synth.voices.forEach((v) => {
        v.osc1.detune.value = -8 + cents;
        v.osc2.detune.value = 8 + cents;
      });
    });
  }

  async function init() {
    setupTabs();
    setupSynthControls();
    setupOctave();
    setupStatus();
    setupMidiRouting();

    MS.Piano.mount(document.getElementById('piano'));
    MS.Piano.onNoteOn = (m, v) => onNoteOn(m - state.octaveShift * 12, v);
    MS.Piano.onNoteOff = (m) => onNoteOff(m - state.octaveShift * 12);

    MS.Trainer.init();
    MS.ChordChallenge.init();
    MS.ScaleRunner.init();
    MS.Looper.init();
    MS.Pads.init();
    MS.Metronome.init();
    MS.Guides.init();

    await MS.MIDI.init();
    await MS.Recorder.init();

    // Show a starter scale so the piano looks alive on first load
    document.getElementById('show-scale').click();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}(window.MS));
