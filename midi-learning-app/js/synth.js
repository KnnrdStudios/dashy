/* Web Audio polyphonic synth with presets + reverb send.
   All sounds are fully synthesized — no samples required. */
const Synth = (() => {
  let ctx, master, reverbSend, reverbNode, dry;
  const voices = new Map(); // midi note -> [osc, gainNode, ...]
  let preset = 'piano';
  let masterVol = 0.7;
  let reverbAmt = 0.25;
  let sustain = false;
  const sustained = new Set();

  // ------- Reverb impulse (synthesized) -------
  function makeImpulse(duration = 2.3, decay = 2.5) {
    const rate = ctx.sampleRate;
    const len = rate * duration;
    const impulse = ctx.createBuffer(2, len, rate);
    for (let c = 0; c < 2; c++) {
      const d = impulse.getChannelData(c);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return impulse;
  }

  function ensureContext() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = masterVol;
    master.connect(ctx.destination);

    dry = ctx.createGain();
    dry.gain.value = 1 - reverbAmt;
    dry.connect(master);

    reverbNode = ctx.createConvolver();
    reverbNode.buffer = makeImpulse();
    reverbSend = ctx.createGain();
    reverbSend.gain.value = reverbAmt;
    reverbSend.connect(reverbNode);
    reverbNode.connect(master);
  }

  // ------- Voice builders per preset -------
  function buildVoice(midi, velocity) {
    const freq = Theory.freq(midi);
    const vel = velocity / 127;
    const now = ctx.currentTime;
    const vGain = ctx.createGain();
    vGain.gain.value = 0;
    vGain.connect(dry);
    vGain.connect(reverbSend);

    const parts = [];
    let env = { a: 0.005, d: 0.25, s: 0.6, r: 0.35 };

    if (preset === 'piano') {
      env = { a: 0.002, d: 0.9, s: 0.0, r: 0.35 };
      const o1 = ctx.createOscillator(); o1.type = 'triangle'; o1.frequency.value = freq;
      const o2 = ctx.createOscillator(); o2.type = 'sine';     o2.frequency.value = freq * 2;
      const o3 = ctx.createOscillator(); o3.type = 'sine';     o3.frequency.value = freq * 3;
      const g2 = ctx.createGain(); g2.gain.value = 0.25;
      const g3 = ctx.createGain(); g3.gain.value = 0.10;
      o1.connect(vGain); o2.connect(g2).connect(vGain); o3.connect(g3).connect(vGain);
      parts.push(o1,o2,o3);
    } else if (preset === 'rhodes') {
      env = { a: 0.005, d: 1.5, s: 0.1, r: 0.5 };
      const o1 = ctx.createOscillator(); o1.type = 'sine'; o1.frequency.value = freq;
      const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = freq * 2.01;
      const g2 = ctx.createGain(); g2.gain.value = 0.5;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 5;
      const lfoG = ctx.createGain(); lfoG.gain.value = 4;
      lfo.connect(lfoG); lfoG.connect(o2.frequency); lfo.start();
      o1.connect(vGain); o2.connect(g2).connect(vGain);
      parts.push(o1,o2,lfo);
    } else if (preset === 'pad') {
      env = { a: 0.8, d: 0.4, s: 0.8, r: 1.2 };
      const o1 = ctx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = freq;
      const o2 = ctx.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = freq * 1.005;
      const o3 = ctx.createOscillator(); o3.type = 'sawtooth'; o3.frequency.value = freq * 0.995;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 900 + vel * 2000;
      filter.Q.value = 3;
      o1.connect(filter); o2.connect(filter); o3.connect(filter);
      filter.connect(vGain);
      parts.push(o1,o2,o3);
    } else if (preset === 'lead') {
      env = { a: 0.01, d: 0.2, s: 0.7, r: 0.3 };
      const o1 = ctx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = freq;
      const o2 = ctx.createOscillator(); o2.type = 'square';   o2.frequency.value = freq / 2;
      const g2 = ctx.createGain(); g2.gain.value = 0.2;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass'; filter.frequency.value = 2500; filter.Q.value = 6;
      o1.connect(filter); o2.connect(g2).connect(filter);
      filter.connect(vGain);
      parts.push(o1,o2);
    } else if (preset === 'bass') {
      env = { a: 0.005, d: 0.3, s: 0.6, r: 0.25 };
      const o1 = ctx.createOscillator(); o1.type = 'square';   o1.frequency.value = freq;
      const o2 = ctx.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = freq * 0.5;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass'; filter.frequency.value = 400 + vel * 800; filter.Q.value = 4;
      o1.connect(filter); o2.connect(filter);
      filter.connect(vGain);
      parts.push(o1,o2);
    } else if (preset === 'bell') {
      env = { a: 0.002, d: 2.0, s: 0.0, r: 0.8 };
      const freqs = [1, 2, 2.76, 5.4];
      const gains = [1, 0.5, 0.3, 0.15];
      freqs.forEach((r, i) => {
        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = freq * r;
        const g = ctx.createGain(); g.gain.value = gains[i];
        o.connect(g).connect(vGain);
        parts.push(o);
      });
    } else if (preset === 'organ') {
      env = { a: 0.01, d: 0.1, s: 0.9, r: 0.1 };
      const ratios = [1, 2, 3, 4];
      const gains  = [0.7, 0.4, 0.2, 0.15];
      ratios.forEach((r, i) => {
        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = freq * r;
        const g = ctx.createGain(); g.gain.value = gains[i];
        o.connect(g).connect(vGain);
        parts.push(o);
      });
    }

    // ADSR
    const peak = 0.25 * vel;
    vGain.gain.cancelScheduledValues(now);
    vGain.gain.setValueAtTime(0, now);
    vGain.gain.linearRampToValueAtTime(peak, now + env.a);
    vGain.gain.linearRampToValueAtTime(peak * env.s, now + env.a + env.d);

    parts.forEach(p => { if (p.start) p.start(now); });
    return { parts, vGain, env };
  }

  function stopVoice(v) {
    if (!v) return;
    const now = ctx.currentTime;
    const r = v.env.r;
    v.vGain.gain.cancelScheduledValues(now);
    v.vGain.gain.setValueAtTime(v.vGain.gain.value, now);
    v.vGain.gain.linearRampToValueAtTime(0.0001, now + r);
    v.parts.forEach(p => { if (p.stop) p.stop(now + r + 0.05); });
    setTimeout(() => { try { v.vGain.disconnect(); } catch {} }, (r + 0.1) * 1000);
  }

  return {
    init() { ensureContext(); if (ctx.state === 'suspended') ctx.resume(); },
    noteOn(midi, velocity = 100) {
      ensureContext();
      if (voices.has(midi)) this.noteOff(midi, true);
      const v = buildVoice(midi, velocity);
      voices.set(midi, v);
    },
    noteOff(midi, force = false) {
      if (sustain && !force) { sustained.add(midi); return; }
      const v = voices.get(midi);
      if (v) { stopVoice(v); voices.delete(midi); }
    },
    setPreset(p) { preset = p; },
    setVolume(v) {
      masterVol = v;
      if (master) master.gain.setTargetAtTime(v, ctx.currentTime, 0.02);
    },
    setReverb(v) {
      reverbAmt = v;
      if (reverbSend) {
        reverbSend.gain.setTargetAtTime(v, ctx.currentTime, 0.02);
        dry.gain.setTargetAtTime(1 - v * 0.7, ctx.currentTime, 0.02);
      }
    },
    setSustain(on) {
      sustain = on;
      if (!on) {
        sustained.forEach(n => this.noteOff(n, true));
        sustained.clear();
      }
    },
    panic() {
      voices.forEach((v, k) => stopVoice(v));
      voices.clear();
      sustained.clear();
    },
    ctx: () => ctx,
  };
})();
