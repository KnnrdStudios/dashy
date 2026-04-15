/* Web MIDI API wrapper. Dispatches note/control events. */
const MIDI = (() => {
  const listeners = { noteOn: [], noteOff: [], cc: [], pitchBend: [] };
  let connectedName = null;

  async function init() {
    if (!navigator.requestMIDIAccess) {
      return { ok: false, error: 'Web MIDI API unavailable (use Chrome, Edge or Brave).' };
    }
    try {
      const access = await navigator.requestMIDIAccess({ sysex: false });
      const scan = () => {
        let any = null;
        for (const input of access.inputs.values()) {
          input.onmidimessage = handle;
          any = input;
        }
        connectedName = any ? any.name : null;
        return any;
      };
      access.onstatechange = () => {
        const any = scan();
        listeners._statechange?.(any ? any.name : null);
      };
      const any = scan();
      return { ok: true, name: any ? any.name : null };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  }

  function handle(ev) {
    const [status, d1, d2] = ev.data;
    const cmd = status & 0xf0;
    if (cmd === 0x90 && d2 > 0) emit('noteOn', d1, d2);
    else if (cmd === 0x80 || (cmd === 0x90 && d2 === 0)) emit('noteOff', d1, 0);
    else if (cmd === 0xb0) emit('cc', d1, d2);
    else if (cmd === 0xe0) emit('pitchBend', d1, d2);
  }

  function emit(event, a, b) {
    (listeners[event] || []).forEach(fn => fn(a, b));
  }

  return {
    init,
    on(event, fn) {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(fn);
    },
    onStateChange(fn) { listeners._statechange = fn; },
    deviceName: () => connectedName,
  };
})();
