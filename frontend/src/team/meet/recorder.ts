// Records a meeting in the host's browser: every video tile drawn into one 1280×720 canvas, plus
// everyone's audio mixed together, into a WebM (MP4 in Safari) file that is then uploaded.
// The tab must stay open while recording; a worker drives the drawing so a hidden tab keeps going.

export const MAX_RECORDING_MS = 2 * 60 * 60 * 1000;
const MAX_BYTES = 1000 * 1024 * 1024;
const FPS = 15;
const W = 1280;
const H = 720;

const MIME_CHOICES = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4;codecs=avc1,mp4a', 'video/mp4'];

export const recordingSupported = () => typeof MediaRecorder !== 'undefined' && !!HTMLCanvasElement.prototype.captureStream && MIME_CHOICES.some((m) => MediaRecorder.isTypeSupported(m));

export interface Tile { video: HTMLVideoElement | null; name: string; screen: boolean }

// A timer that isn't slowed down in background tabs
function workerTicker(ms: number, fn: () => void) {
  const src = `let t=setInterval(()=>postMessage(0),${ms});onmessage=()=>{clearInterval(t);close()}`;
  const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
  const worker = new Worker(url);
  worker.onmessage = fn;
  return () => { worker.postMessage(0); worker.terminate(); URL.revokeObjectURL(url); };
}

export class CallRecorder {
  private canvas = document.createElement('canvas');
  private ctx = this.canvas.getContext('2d')!;
  private audio = new AudioContext();
  private mix = this.audio.createMediaStreamDestination();
  private sources = new Map<string, MediaStreamAudioSourceNode>();
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private bytes = 0;
  private stopTicker: (() => void) | null = null;
  private limitTimer = 0;
  private done: ((file: File) => void) | null = null;
  readonly mime: string;
  startedAt = 0;

  private tiles: () => Tile[];
  private onLimit: () => void;

  constructor(tiles: () => Tile[], onLimit: () => void) {
    this.tiles = tiles;
    this.onLimit = onLimit;
    this.canvas.width = W;
    this.canvas.height = H;
    this.mime = MIME_CHOICES.find((m) => MediaRecorder.isTypeSupported(m)) || 'video/webm';
  }

  // Adds new voices to the mix (people who joined after recording started)
  syncAudio(streams: MediaStream[]) {
    for (const s of streams) {
      const track = s.getAudioTracks()[0];
      if (!track || this.sources.has(track.id)) continue;
      const node = this.audio.createMediaStreamSource(new MediaStream([track]));
      node.connect(this.mix);
      this.sources.set(track.id, node);
    }
  }

  start(streams: MediaStream[]) {
    this.syncAudio(streams);
    const out = new MediaStream([...this.canvas.captureStream(FPS).getVideoTracks(), ...this.mix.stream.getAudioTracks()]);
    this.recorder = new MediaRecorder(out, { mimeType: this.mime, videoBitsPerSecond: 1_500_000, audioBitsPerSecond: 96_000 });
    this.recorder.ondataavailable = (e) => {
      if (!e.data.size) return;
      this.chunks.push(e.data);
      this.bytes += e.data.size;
      if (this.bytes > MAX_BYTES) this.onLimit();
    };
    this.recorder.onstop = () => {
      const ext = this.mime.startsWith('video/mp4') ? 'mp4' : 'webm';
      // Local date and time, e.g. meeting-2026-10-24-14-30.webm
      const d = new Date(this.startedAt);
      const stamp = new Date(+d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16).replace(/[:T]/g, '-');
      this.done?.(new File(this.chunks, `meeting-${stamp}.${ext}`, { type: this.mime.split(';')[0] }));
    };
    this.startedAt = Date.now();
    this.recorder.start(5000);
    this.stopTicker = workerTicker(1000 / FPS, () => this.draw());
    this.limitTimer = window.setTimeout(() => this.onLimit(), MAX_RECORDING_MS);
  }

  stop(): Promise<File> {
    return new Promise((resolve) => {
      this.done = resolve;
      this.stopTicker?.();
      window.clearTimeout(this.limitTimer);
      if (this.recorder?.state !== 'inactive') this.recorder?.stop();
      this.sources.forEach((n) => n.disconnect());
      this.audio.close().catch(() => {});
    });
  }

  // A shared screen fills most of the frame; otherwise everyone gets an equal tile
  private draw() {
    const { ctx } = this;
    ctx.fillStyle = '#0f1320';
    ctx.fillRect(0, 0, W, H);
    const tiles = this.tiles();
    const screen = tiles.find((t) => t.screen && t.video);
    if (screen) {
      this.drawTile(screen, 0, 0, W - 260, H, true);
      tiles.filter((t) => t !== screen).slice(0, 5).forEach((t, i) => this.drawTile(t, W - 250, 10 + i * 142, 240, 135, false));
      return;
    }
    const n = Math.max(1, tiles.length);
    const cols = n <= 1 ? 1 : n <= 4 ? 2 : 3;
    const rows = Math.ceil(n / cols);
    const tw = W / cols;
    const th = H / rows;
    tiles.forEach((t, i) => this.drawTile(t, (i % cols) * tw + 4, Math.floor(i / cols) * th + 4, tw - 8, th - 8, false));
  }

  private drawTile(t: Tile, x: number, y: number, w: number, h: number, contain: boolean) {
    const { ctx } = this;
    ctx.fillStyle = '#1d2333';
    ctx.fillRect(x, y, w, h);
    const v = t.video;
    if (v && v.readyState >= 2 && v.videoWidth) {
      const scale = contain ? Math.min(w / v.videoWidth, h / v.videoHeight) : Math.max(w / v.videoWidth, h / v.videoHeight);
      const dw = v.videoWidth * scale;
      const dh = v.videoHeight * scale;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      ctx.drawImage(v, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
      ctx.restore();
    } else {
      ctx.fillStyle = '#2dc08d';
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) / 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = `700 ${Math.round(Math.min(w, h) / 8)}px Inter, Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((t.name.trim()[0] || '?').toUpperCase(), x + w / 2, y + h / 2);
    }
    ctx.font = '600 15px Inter, Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    const label = t.name;
    const lw = ctx.measureText(label).width + 16;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(x + 8, y + h - 32, lw, 24);
    ctx.fillStyle = '#fff';
    ctx.fillText(label, x + 16, y + h - 15);
  }
}
