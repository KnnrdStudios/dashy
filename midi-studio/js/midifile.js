/* ============================================================
 * MIDI Studio — Standard MIDI File (SMF) writer
 * Produces a format-0 .mid file with tempo meta + note events.
 * ============================================================ */

(function (MS) {
  'use strict';

  /** Append a variable-length quantity (VLQ) to a byte array. */
  function writeVLQ(arr, value) {
    value = value >>> 0;
    let buffer = value & 0x7f;
    // eslint-disable-next-line no-cond-assign
    while ((value >>>= 7)) {
      buffer <<= 8;
      buffer |= ((value & 0x7f) | 0x80);
    }
    // Emit bytes high-to-low
    // eslint-disable-next-line no-constant-condition
    while (true) {
      arr.push(buffer & 0xff);
      if (buffer & 0x80) buffer >>>= 8; else break;
    }
  }

  /**
   * Build a Standard MIDI File (format 0) from an event list.
   * @param {Array<{time:number, type:'on'|'off', midi:number, velocity:number}>} events
   *        `time` is seconds from loop start.
   * @param {number} bpm
   * @returns {Uint8Array}
   */
  MS.writeMidiFile = function (events, bpm) {
    const ppq = 480;
    const microsPerQuarter = Math.round(60000000 / bpm);
    const secPerTick = 60 / bpm / ppq;

    const sorted = [...events].sort((a, b) => a.time - b.time);

    const track = [];

    // Tempo meta event
    track.push(0);                   // delta = 0
    track.push(0xff, 0x51, 0x03,
      (microsPerQuarter >> 16) & 0xff,
      (microsPerQuarter >> 8) & 0xff,
      microsPerQuarter & 0xff);

    // Time signature meta: 4/4, 24 clocks/beat, 8 32nds/quarter
    track.push(0);
    track.push(0xff, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08);

    let lastTick = 0;
    sorted.forEach((ev) => {
      const tick = Math.max(0, Math.round(ev.time / secPerTick));
      const delta = Math.max(0, tick - lastTick);
      lastTick = tick;
      writeVLQ(track, delta);
      if (ev.type === 'on') {
        track.push(0x90, ev.midi & 0x7f, Math.max(1, Math.min(127, ev.velocity | 0)));
      } else {
        track.push(0x80, ev.midi & 0x7f, 64);
      }
    });

    // End of track
    track.push(0);
    track.push(0xff, 0x2f, 0x00);

    const trackLen = track.length;
    const bytes = [];

    // Header chunk
    bytes.push(0x4d, 0x54, 0x68, 0x64); // "MThd"
    bytes.push(0, 0, 0, 6);             // length
    bytes.push(0, 0);                    // format 0
    bytes.push(0, 1);                    // 1 track
    bytes.push((ppq >> 8) & 0xff, ppq & 0xff); // division

    // Track chunk header
    bytes.push(0x4d, 0x54, 0x72, 0x6b); // "MTrk"
    bytes.push((trackLen >>> 24) & 0xff,
               (trackLen >>> 16) & 0xff,
               (trackLen >>> 8)  & 0xff,
               trackLen & 0xff);

    // Track data
    for (let i = 0; i < track.length; i += 1) bytes.push(track[i]);

    return new Uint8Array(bytes);
  };

  /** Trigger a browser download of a Uint8Array as a file. */
  MS.downloadBytes = function (bytes, filename) {
    const blob = new Blob([bytes], { type: 'audio/midi' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
}(window.MS));
