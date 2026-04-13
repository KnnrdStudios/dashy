/* ============================================================
 * MIDI Studio — Audio recorder with level meter, waveform,
 * takes list and in-session markers. Built for Maono AME2
 * podcast workflows (pick the AME2 as the input device).
 * ============================================================ */

(function (MS) {
  'use strict';

  MS.Recorder = {
    stream: null,
    recorder: null,
    chunks: [],
    startedAt: 0,
    recording: false,
    markers: [],
    takes: [],
    audioCtx: null,
    analyser: null,
    meterRaf: null,
    wfCanvas: null,
    wfCtx: null,
    samples: [],

    async init() {
      this.deviceSelect = document.getElementById('rec-device');
      this.refreshBtn = document.getElementById('rec-refresh');
      this.toggleBtn = document.getElementById('rec-toggle');
      this.markBtn = document.getElementById('rec-mark');
      this.meterEl = document.getElementById('rec-meter');
      this.timeEl = document.getElementById('rec-time');
      this.listEl = document.getElementById('rec-list');
      this.markerListEl = document.getElementById('marker-list');
      this.wfCanvas = document.getElementById('rec-waveform');
      this.wfCtx = this.wfCanvas.getContext('2d');
      this.resizeCanvas();
      window.addEventListener('resize', () => this.resizeCanvas());

      this.refreshBtn.addEventListener('click', () => this.populateDevices());
      this.toggleBtn.addEventListener('click', () => this.toggle());
      this.markBtn.addEventListener('click', () => this.addMarker());

      try {
        // Ask permission up front so enumerateDevices returns labels
        await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (e) {
        // User may deny — that's fine, they can allow later.
      }
      this.populateDevices();
      navigator.mediaDevices.addEventListener('devicechange', () => this.populateDevices());
    },

    async populateDevices() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const inputs = devices.filter((d) => d.kind === 'audioinput');
        this.deviceSelect.innerHTML = '';
        inputs.forEach((d) => {
          const opt = document.createElement('option');
          opt.value = d.deviceId;
          opt.textContent = d.label || `Input ${d.deviceId.slice(0, 6)}`;
          if (/ame2|maono/i.test(opt.textContent)) opt.selected = true;
          this.deviceSelect.appendChild(opt);
        });
        if (inputs.length === 0) {
          const opt = document.createElement('option');
          opt.textContent = 'No audio inputs found — plug in your AME2';
          this.deviceSelect.appendChild(opt);
        }
      } catch (e) {
        console.error('enumerateDevices failed', e);
      }
    },

    resizeCanvas() {
      if (!this.wfCanvas) return;
      const w = this.wfCanvas.parentElement.clientWidth;
      this.wfCanvas.width = w;
      this.wfCanvas.height = 120;
      this.drawWaveform();
    },

    async toggle() {
      if (this.recording) {
        this.stop();
      } else {
        await this.start();
      }
    },

    async start() {
      try {
        const deviceId = this.deviceSelect.value;
        this.stream = await navigator.mediaDevices.getUserMedia({
          audio: deviceId ? { deviceId: { exact: deviceId } } : true,
        });
      } catch (e) {
        alert('Microphone access failed: ' + e.message);
        return;
      }

      // MediaRecorder
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      this.recorder = new MediaRecorder(this.stream, { mimeType: mime });
      this.chunks = [];
      this.markers = [];
      this.samples = [];
      this.recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) this.chunks.push(e.data);
      };
      this.recorder.onstop = () => this.finalizeTake();
      this.recorder.start(250);

      // Analyser for meter + waveform
      if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = this.audioCtx.createMediaStreamSource(this.stream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 2048;
      source.connect(this.analyser);

      this.startedAt = performance.now();
      this.recording = true;
      this.toggleBtn.textContent = '■ Stop';
      this.toggleBtn.classList.add('ghost-btn');
      this.renderMarkers();
      this.tick();
    },

    stop() {
      if (this.recorder && this.recorder.state !== 'inactive') this.recorder.stop();
      if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
      this.recording = false;
      cancelAnimationFrame(this.meterRaf);
      this.toggleBtn.textContent = '● Record';
      this.meterEl.style.width = '0%';
    },

    tick() {
      if (!this.recording) return;
      const elapsed = (performance.now() - this.startedAt) / 1000;
      this.timeEl.textContent = MS.formatTime(elapsed);

      const buf = new Uint8Array(this.analyser.fftSize);
      this.analyser.getByteTimeDomainData(buf);
      // Peak level
      let peak = 0;
      for (let i = 0; i < buf.length; i += 1) {
        const v = Math.abs(buf[i] - 128) / 128;
        if (v > peak) peak = v;
      }
      this.meterEl.style.width = (peak * 100).toFixed(1) + '%';

      // Save samples for waveform (downsample)
      if (this.samples.length < 4000) {
        this.samples.push(peak);
        this.drawWaveform();
      } else {
        this.samples.push(peak);
        this.samples.shift();
        this.drawWaveform();
      }

      this.meterRaf = requestAnimationFrame(() => this.tick());
    },

    drawWaveform() {
      if (!this.wfCtx) return;
      const ctx = this.wfCtx;
      const { width, height } = this.wfCanvas;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#1c232d';
      ctx.fillRect(0, 0, width, height);

      // Grid line
      ctx.strokeStyle = '#2a333f';
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      // Waveform
      ctx.strokeStyle = '#7dd3fc';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const n = this.samples.length;
      if (n > 0) {
        for (let i = 0; i < width; i += 1) {
          const si = Math.floor((i / width) * n);
          const v = this.samples[si] || 0;
          const y = height / 2 - v * (height / 2 - 4);
          if (i === 0) ctx.moveTo(i, y); else ctx.lineTo(i, y);
        }
        for (let i = width - 1; i >= 0; i -= 1) {
          const si = Math.floor((i / width) * n);
          const v = this.samples[si] || 0;
          const y = height / 2 + v * (height / 2 - 4);
          ctx.lineTo(i, y);
        }
        ctx.closePath();
        ctx.fillStyle = 'rgba(125, 211, 252, 0.25)';
        ctx.fill();
        ctx.stroke();
      }

      // Draw markers
      if (this.startedAt) {
        const elapsed = (performance.now() - this.startedAt) / 1000;
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1;
        this.markers.forEach((m) => {
          const x = Math.floor((m.at / elapsed) * width);
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        });
      }
    },

    addMarker() {
      if (!this.recording) return;
      const at = (performance.now() - this.startedAt) / 1000;
      const label = prompt('Marker label (e.g. "intro", "retake"):', `Marker ${this.markers.length + 1}`);
      if (label == null) return;
      this.markers.push({ at, label });
      this.renderMarkers();
    },

    renderMarkers() {
      this.markerListEl.innerHTML = '';
      if (this.markers.length === 0) {
        this.markerListEl.innerHTML = '<li class="muted">No markers in this take yet.</li>';
        return;
      }
      this.markers.forEach((m) => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${m.label}</span><span>${MS.formatTime(m.at)}</span>`;
        this.markerListEl.appendChild(li);
      });
    },

    finalizeTake() {
      const blob = new Blob(this.chunks, { type: 'audio/webm' });
      const url = URL.createObjectURL(blob);
      const take = {
        id: Date.now(),
        name: `Take ${this.takes.length + 1} — ${new Date().toLocaleTimeString()}`,
        url,
        blob,
        markers: [...this.markers],
      };
      this.takes.unshift(take);
      this.renderTakes();
    },

    renderTakes() {
      this.listEl.innerHTML = '';
      if (this.takes.length === 0) {
        this.listEl.innerHTML = '<li class="muted">No recordings yet.</li>';
        return;
      }
      this.takes.forEach((t) => {
        const li = document.createElement('li');
        const audio = document.createElement('audio');
        audio.controls = true;
        audio.src = t.url;

        const meta = document.createElement('span');
        meta.textContent = t.name + (t.markers.length ? ` · ${t.markers.length} marker${t.markers.length > 1 ? 's' : ''}` : '');

        const dl = document.createElement('a');
        dl.className = 'ghost-btn';
        dl.href = t.url;
        dl.download = t.name.replace(/[^a-z0-9]/gi, '_') + '.webm';
        dl.textContent = 'Download';

        li.appendChild(meta);
        li.appendChild(audio);
        li.appendChild(dl);
        this.listEl.appendChild(li);
      });
    },
  };
}(window.MS));
