/* ============================================================
 * MIDI Studio — Web MIDI input handler
 * MS.MIDI emits 'noteon', 'noteoff', 'cc', 'pitchbend', 'device'
 * ============================================================ */

(function (MS) {
  'use strict';

  MS.MIDI = Object.assign(MS.createEmitter(), {
    access: null,
    inputs: [],
    connectedName: null,

    async init() {
      if (!navigator.requestMIDIAccess) {
        this.emit('unsupported');
        return;
      }
      try {
        this.access = await navigator.requestMIDIAccess({ sysex: false });
        this.refresh();
        this.access.onstatechange = () => this.refresh();
      } catch (e) {
        this.emit('error', e);
      }
    },

    refresh() {
      this.inputs = [];
      if (!this.access) return;
      this.access.inputs.forEach((input) => {
        this.inputs.push(input);
        input.onmidimessage = (msg) => this.handleMessage(input, msg);
      });
      // Prefer MPK if present, otherwise first input
      const mpk = this.inputs.find((i) => /mpk/i.test(i.name || ''));
      const chosen = mpk || this.inputs[0] || null;
      this.connectedName = chosen ? chosen.name : null;
      this.emit('device', this.connectedName, this.inputs.length);
    },

    handleMessage(input, msg) {
      const [status, data1, data2] = msg.data;
      const cmd = status & 0xf0;
      const channel = status & 0x0f;

      if (cmd === 0x90 && data2 > 0) {
        // Note on
        this.emit('noteon', data1, data2, channel);
      } else if (cmd === 0x80 || (cmd === 0x90 && data2 === 0)) {
        // Note off
        this.emit('noteoff', data1, channel);
      } else if (cmd === 0xb0) {
        // Control change
        this.emit('cc', data1, data2, channel);
        // CC 64 = sustain pedal
        if (data1 === 64) {
          this.emit('sustain', data2 >= 64);
        }
      } else if (cmd === 0xe0) {
        // Pitch bend
        const value = ((data2 << 7) | data1) - 8192;
        this.emit('pitchbend', value, channel);
      }
    },
  });
}(window.MS));
