import type { Socket } from 'socket.io-client';
import { api } from '../api';

// A meeting as a WebRTC mesh: one RTCPeerConnection per other browser. The socket only relays
// offers, answers and ICE candidates, plus small state (mic, camera, hand, reactions, chat).
//
// Every connection carries exactly one audio and one video transceiver, set up by the newcomer's
// offer. Turning the camera on or off and sharing the screen swap the outgoing track with
// replaceTrack, so a connection never has to be renegotiated after it is made.

export interface PeerInfo { socketId: string; adminId: string; name: string; manager: boolean; mic: boolean; cam: boolean; screen: boolean; hand: boolean; joinedAt: number }
export interface PeerView extends PeerInfo { stream: MediaStream; connection: RTCPeerConnectionState | 'new'; speaking: boolean }
export interface ChatLine { id: string; authorId: string; body: string; createdAt: string }
export interface Reaction { key: number; socketId: string; adminId: string; emoji: string }
export interface Caption { socketId: string; adminId: string; text: string; at: number }

export type CallStatus = 'idle' | 'joining' | 'in' | 'left' | 'ended' | 'removed' | 'error';

export interface CallState {
  status: CallStatus;
  error: string;
  selfId: string;
  hostId: string;
  peers: PeerView[];
  mic: boolean;
  cam: boolean;
  screen: boolean;
  hand: boolean;
  speaking: boolean;
  recording: { by: string } | null;
  chat: ChatLine[];
  unreadChat: number;
  captions: Caption[];
  reactions: Reaction[];
  mutedBy: string;
  turn: boolean;
}

interface Peer {
  info: PeerInfo;
  pc: RTCPeerConnection;
  stream: MediaStream;
  initiator: boolean;
  pending: RTCIceCandidateInit[];
  speaking: boolean;
}

export const initialCallState: CallState = {
  status: 'idle', error: '', selfId: '', hostId: '', peers: [], mic: true, cam: true, screen: false, hand: false, speaking: false,
  recording: null, chat: [], unreadChat: 0, captions: [], reactions: [], mutedBy: '', turn: false
};

// Video bitrate per connection: everyone uploads to everyone, so it drops as the call grows
const videoBitrate = (others: number, screen: boolean) => (screen ? (others <= 2 ? 1_500_000 : 800_000) : others <= 1 ? 1_200_000 : others <= 3 ? 600_000 : 350_000);
const SPEAKING_LEVEL = 0.035;

export class MeshCall {
  state: CallState = initialCallState;
  private listeners = new Set<() => void>();
  private peers = new Map<string, Peer>();
  private iceServers: RTCIceServer[] = [];
  private micTrack: MediaStreamTrack | null = null;
  private camTrack: MediaStreamTrack | null = null;
  private screenTrack: MediaStreamTrack | null = null;
  // Your shared screen, for your own preview tile
  screenStream: MediaStream | null = null;
  private audio: AudioContext | null = null;
  private meters = new Map<string, { analyser: AnalyserNode; data: Float32Array<ArrayBuffer>; source: MediaStreamAudioSourceNode }>();
  private meterTimer = 0;
  private reactionKey = 0;
  private chatOpen = false;
  private offs: Array<() => void> = [];
  readonly local = new MediaStream();

  private socket: Socket;
  readonly meetingId: string;
  private meId: string;

  constructor(socket: Socket, meetingId: string, meId: string) {
    this.socket = socket;
    this.meetingId = meetingId;
    this.meId = meId;
  }

  // ── Store for React (useSyncExternalStore) ───────────────────────────────
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  getState = () => this.state;
  private set(patch: Partial<CallState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((fn) => fn());
  }
  private syncPeers() {
    this.set({
      peers: [...this.peers.values()]
        .sort((a, b) => a.info.joinedAt - b.info.joinedAt)
        .map((p) => ({ ...p.info, stream: p.stream, connection: p.pc.connectionState, speaking: p.speaking }))
    });
  }

  // ── Local media ──────────────────────────────────────────────────────────
  // Camera and mic for the lobby preview. Either may be missing or blocked; the call still works.
  async openMedia({ audioId, videoId, mic = true, cam = true }: { audioId?: string; videoId?: string; mic?: boolean; cam?: boolean } = {}) {
    this.local.getTracks().forEach((t) => { t.stop(); this.local.removeTrack(t); });
    this.micTrack = null;
    this.camTrack = null;
    const errors: string[] = [];
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: audioId ? { exact: audioId } : undefined, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      this.micTrack = s.getAudioTracks()[0] || null;
    } catch { errors.push('microphone'); }
    if (cam) {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { deviceId: videoId ? { exact: videoId } : undefined, width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { ideal: 24, max: 30 } } });
        this.camTrack = s.getVideoTracks()[0] || null;
      } catch { errors.push('camera'); }
    }
    if (this.micTrack) { this.micTrack.enabled = mic; this.local.addTrack(this.micTrack); }
    if (this.camTrack) this.local.addTrack(this.camTrack);
    this.set({ mic: !!this.micTrack && mic, cam: !!this.camTrack });
    this.watchLevel('self', this.local);
    return errors;
  }

  // ── Joining ──────────────────────────────────────────────────────────────
  async join() {
    this.set({ status: 'joining', error: '' });
    try {
      const ice = await api<{ iceServers: RTCIceServer[]; turn: boolean }>(`/meetings/${this.meetingId}/ice`);
      this.iceServers = ice.iceServers;
      this.set({ turn: ice.turn });
    } catch (err) {
      this.set({ status: 'error', error: err instanceof Error ? err.message : 'Could not reach the meeting.' });
      return;
    }
    this.listen();
    const res = await new Promise<{ ok: boolean; error?: string; code?: string; selfId: string; peers: PeerInfo[]; hostId: string; recording: { by: string } | null }>((resolve) =>
      this.socket.timeout(10000).emit('meet:join', { meetingId: this.meetingId, mic: this.state.mic, cam: this.state.cam }, (err: Error | null, ack: never) => resolve(err ? { ok: false, error: 'The meeting server did not answer. Check your connection.' } as never : ack)));
    if (!res.ok) {
      this.unlisten();
      this.set({ status: res.code === 'ENDED' ? 'ended' : res.code === 'REMOVED' ? 'removed' : 'error', error: res.error || 'Could not join.' });
      return;
    }
    this.set({ status: 'in', selfId: res.selfId, hostId: res.hostId, recording: res.recording });
    // The newcomer calls everyone already there
    for (const info of res.peers) await this.call(info);
    this.syncPeers();
    api<{ data: ChatLine[] }>(`/meetings/${this.meetingId}/chat`).then((r) => this.set({ chat: r.data })).catch(() => {});
  }

  private listen() {
    const on = <T,>(event: string, fn: (p: T) => void) => {
      this.socket.on(event, fn);
      this.offs.push(() => this.socket.off(event, fn));
    };
    on<PeerInfo>('meet:peer-joined', (info) => {
      // They will send the offer; keep their details until it arrives
      const existing = this.peers.get(info.socketId);
      if (existing) existing.info = info;
      else this.peers.set(info.socketId, this.createPeer(info, false));
      this.syncPeers();
    });
    on<{ socketId: string }>('meet:peer-left', ({ socketId }) => this.dropPeer(socketId));
    on<{ from: string; data: { sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit } }>('meet:signal', ({ from, data }) => { this.onSignal(from, data).catch(() => {}); });
    on<{ socketId: string; mic: boolean; cam: boolean; screen: boolean; hand: boolean }>('meet:state', (s) => {
      const peer = this.peers.get(s.socketId);
      if (s.socketId === this.state.selfId) { this.set({ hand: s.hand }); return; }
      if (!peer) return;
      Object.assign(peer.info, { mic: s.mic, cam: s.cam, screen: s.screen, hand: s.hand });
      this.syncPeers();
    });
    on<{ socketId: string; adminId: string; emoji: string }>('meet:reaction', (r) => {
      const key = ++this.reactionKey;
      this.set({ reactions: [...this.state.reactions.slice(-20), { key, ...r }] });
      setTimeout(() => this.set({ reactions: this.state.reactions.filter((x) => x.key !== key) }), 3200);
    });
    on<ChatLine>('meet:chat', (line) => this.set({ chat: [...this.state.chat, line], unreadChat: this.chatOpen || line.authorId === this.meId ? 0 : this.state.unreadChat + 1 }));
    on<{ socketId: string; adminId: string; text: string; final: boolean }>('meet:caption', (c) => this.showCaption(c.socketId, c.adminId, c.text));
    on<{ hostId: string }>('meet:host', ({ hostId }) => this.set({ hostId }));
    on<{ on: boolean; by?: string }>('meet:recording', ({ on: rec, by }) => this.set({ recording: rec ? { by: by || '' } : null }));
    on<{ by: string }>('meet:muted', ({ by }) => { this.setMic(false); this.set({ mutedBy: by }); });
    on<unknown>('meet:removed', () => this.hangUp('removed'));
    on<unknown>('meet:ended', () => this.hangUp('ended'));
    // A dropped socket comes back with a new id: rejoin so everyone reconnects to it
    on<unknown>('connect', () => { if (this.state.status === 'in') this.rejoin(); });
  }
  private unlisten() { this.offs.forEach((off) => off()); this.offs = []; }

  private async rejoin() {
    [...this.peers.keys()].forEach((id) => this.dropPeer(id, false));
    this.unlisten();
    await this.join();
  }

  // ── Peer connections ─────────────────────────────────────────────────────
  private createPeer(info: PeerInfo, initiator: boolean): Peer {
    const pc = new RTCPeerConnection({ iceServers: this.iceServers });
    const peer: Peer = { info, pc, stream: new MediaStream(), initiator, pending: [], speaking: false };
    pc.onicecandidate = (e) => { if (e.candidate) this.signal(info.socketId, { candidate: e.candidate.toJSON() }); };
    pc.ontrack = (e) => {
      peer.stream.getTracks().filter((t) => t.kind === e.track.kind).forEach((t) => peer.stream.removeTrack(t));
      peer.stream.addTrack(e.track);
      if (e.track.kind === 'audio') this.watchLevel(info.socketId, peer.stream);
      this.syncPeers();
    };
    pc.onconnectionstatechange = () => {
      // A path broke (network change): the side that called restarts ICE
      if (pc.connectionState === 'failed' && peer.initiator) this.offer(peer, true).catch(() => {});
      if (pc.connectionState === 'connected') this.tuneBitrate();
      this.syncPeers();
    };
    return peer;
  }

  private async call(info: PeerInfo) {
    const peer = this.createPeer(info, true);
    this.peers.set(info.socketId, peer);
    peer.pc.addTransceiver(this.micTrack || 'audio', { direction: 'sendrecv' });
    peer.pc.addTransceiver(this.outgoingVideo() || 'video', { direction: 'sendrecv' });
    await this.offer(peer);
  }

  private async offer(peer: Peer, iceRestart = false) {
    const offer = await peer.pc.createOffer({ iceRestart });
    await peer.pc.setLocalDescription(offer);
    this.signal(peer.info.socketId, { sdp: peer.pc.localDescription!.toJSON() });
  }

  private async onSignal(from: string, data: { sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit }) {
    let peer = this.peers.get(from);
    if (data.sdp?.type === 'offer') {
      if (!peer) {
        peer = this.createPeer({ socketId: from, adminId: '', name: '', manager: false, mic: true, cam: true, screen: false, hand: false, joinedAt: Date.now() }, false);
        this.peers.set(from, peer);
      }
      await peer.pc.setRemoteDescription(data.sdp);
      for (const t of peer.pc.getTransceivers()) {
        const kind = t.receiver.track.kind;
        t.direction = 'sendrecv';
        await t.sender.replaceTrack(kind === 'audio' ? this.micTrack : this.outgoingVideo());
      }
      await peer.pc.setLocalDescription(await peer.pc.createAnswer());
      this.signal(from, { sdp: peer.pc.localDescription!.toJSON() });
      await this.flush(peer);
      this.syncPeers();
    } else if (data.sdp?.type === 'answer' && peer) {
      await peer.pc.setRemoteDescription(data.sdp);
      await this.flush(peer);
    } else if (data.candidate && peer) {
      if (peer.pc.remoteDescription) await peer.pc.addIceCandidate(data.candidate).catch(() => {});
      else peer.pending.push(data.candidate);
    }
  }

  private async flush(peer: Peer) {
    const queued = peer.pending.splice(0);
    for (const c of queued) await peer.pc.addIceCandidate(c).catch(() => {});
  }

  private signal(to: string, data: unknown) { this.socket.emit('meet:signal', { to, data }); }

  private dropPeer(socketId: string, sync = true) {
    const peer = this.peers.get(socketId);
    if (!peer) return;
    peer.pc.close();
    this.peers.delete(socketId);
    this.unwatchLevel(socketId);
    if (sync) { this.syncPeers(); this.tuneBitrate(); }
  }

  private videoSenders() {
    return [...this.peers.values()].flatMap((p) => p.pc.getTransceivers().filter((t) => t.receiver.track.kind === 'video').map((t) => t.sender));
  }
  private audioSenders() {
    return [...this.peers.values()].flatMap((p) => p.pc.getTransceivers().filter((t) => t.receiver.track.kind === 'audio').map((t) => t.sender));
  }
  private outgoingVideo() { return this.screenTrack || (this.state.cam ? this.camTrack : null); }

  private tuneBitrate() {
    const max = videoBitrate(this.peers.size, !!this.screenTrack);
    for (const sender of this.videoSenders()) {
      const params = sender.getParameters();
      if (!params.encodings?.length) continue;
      params.encodings[0].maxBitrate = max;
      sender.setParameters(params).catch(() => {});
    }
  }

  private announce() {
    const { mic, cam, screen, hand } = this.state;
    this.socket.emit('meet:state', { mic, cam, screen, hand });
  }

  // ── Controls ─────────────────────────────────────────────────────────────
  setMic(on: boolean) {
    if (!this.micTrack) { this.set({ mic: false }); return; }
    this.micTrack.enabled = on;
    this.set({ mic: on, mutedBy: on ? '' : this.state.mutedBy });
    this.announce();
  }

  async setCam(on: boolean, deviceId?: string) {
    if (on && (!this.camTrack || this.camTrack.readyState === 'ended' || deviceId)) {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { deviceId: deviceId ? { exact: deviceId } : undefined, width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { ideal: 24, max: 30 } } });
        if (this.camTrack) { this.camTrack.stop(); this.local.removeTrack(this.camTrack); }
        this.camTrack = s.getVideoTracks()[0];
        this.local.addTrack(this.camTrack);
      } catch {
        throw new Error('Could not open your camera. Check that no other app is using it and that the browser may use it.');
      }
    }
    if (!on && this.camTrack) {
      // Stopping the track turns the camera light off
      this.camTrack.stop();
      this.local.removeTrack(this.camTrack);
      this.camTrack = null;
    }
    this.set({ cam: on });
    if (!this.screenTrack) await Promise.all(this.videoSenders().map((s) => s.replaceTrack(on ? this.camTrack : null)));
    this.announce();
  }

  async setMicDevice(deviceId: string) {
    const s = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact: deviceId }, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    const track = s.getAudioTracks()[0];
    track.enabled = this.state.mic;
    if (this.micTrack) { this.micTrack.stop(); this.local.removeTrack(this.micTrack); }
    this.micTrack = track;
    this.local.addTrack(track);
    await Promise.all(this.audioSenders().map((sender) => sender.replaceTrack(track)));
    this.watchLevel('self', this.local);
  }

  async shareScreen(on: boolean) {
    if (on) {
      let s: MediaStream;
      try {
        s = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: { ideal: 15, max: 30 } }, audio: false });
      } catch {
        return; // picker closed
      }
      this.screenTrack = s.getVideoTracks()[0];
      this.screenTrack.contentHint = 'detail';
      this.screenStream = new MediaStream([this.screenTrack]);
      // The browser's own "Stop sharing" bar ends the track
      this.screenTrack.onended = () => { this.shareScreen(false).catch(() => {}); };
    } else {
      this.screenTrack?.stop();
      this.screenTrack = null;
      this.screenStream = null;
    }
    await Promise.all(this.videoSenders().map((sender) => sender.replaceTrack(this.outgoingVideo())));
    this.set({ screen: !!this.screenTrack });
    this.tuneBitrate();
    this.announce();
  }

  setHand(up: boolean) { this.set({ hand: up }); this.announce(); }
  react(emoji: string) { this.socket.emit('meet:reaction', { emoji }); }
  sendChat(body: string) {
    return new Promise<void>((resolve, reject) => this.socket.emit('meet:chat', { body }, (ack: { ok: boolean; error?: string }) => (ack?.ok ? resolve() : reject(new Error(ack?.error || 'Could not send.')))));
  }
  setChatOpen(open: boolean) { this.chatOpen = open; if (open) this.set({ unreadChat: 0 }); }
  host(action: 'mute' | 'remove' | 'end' | 'lower-hand' | 'record', target?: string, on?: boolean) {
    return new Promise<void>((resolve, reject) => this.socket.emit('meet:host', { action, target, on }, (ack: { ok: boolean; error?: string }) => (ack?.ok ? resolve() : reject(new Error(ack?.error || 'Could not do that.')))));
  }

  // Your own words, from the browser's speech recognition
  sendCaption(text: string, final: boolean) {
    if (!this.state.mic) return;
    this.socket.emit('meet:caption', { text, final });
    this.showCaption(this.state.selfId, this.meId, text);
  }
  private showCaption(socketId: string, adminId: string, text: string) {
    const rest = this.state.captions.filter((c) => c.socketId !== socketId && Date.now() - c.at < 8000);
    this.set({ captions: [...rest, { socketId, adminId, text, at: Date.now() }].slice(-3) });
  }

  // Every incoming audio stream, plus your own mic, for the recorder
  audioStreams() {
    return [this.local, ...[...this.peers.values()].map((p) => p.stream)].filter((s) => s.getAudioTracks().length);
  }

  // ── Who is speaking ──────────────────────────────────────────────────────
  private watchLevel(key: string, stream: MediaStream) {
    const track = stream.getAudioTracks()[0];
    if (!track) return;
    try {
      this.audio = this.audio || new AudioContext();
      this.unwatchLevel(key);
      const source = this.audio.createMediaStreamSource(new MediaStream([track]));
      const analyser = this.audio.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      this.meters.set(key, { analyser, data: new Float32Array(analyser.fftSize), source });
      if (!this.meterTimer) this.meterTimer = window.setInterval(() => this.measure(), 250);
    } catch { /* no Web Audio: no speaking highlight */ }
  }
  private unwatchLevel(key: string) {
    const m = this.meters.get(key);
    if (m) { m.source.disconnect(); this.meters.delete(key); }
  }
  private measure() {
    if (this.audio?.state === 'suspended') this.audio.resume().catch(() => {});
    let changed = false;
    for (const [key, m] of this.meters) {
      m.analyser.getFloatTimeDomainData(m.data);
      let sum = 0;
      for (const v of m.data) sum += v * v;
      const speaking = Math.sqrt(sum / m.data.length) > SPEAKING_LEVEL;
      if (key === 'self') {
        const now = speaking && this.state.mic;
        if (now !== this.state.speaking) { this.state = { ...this.state, speaking: now }; changed = true; }
      } else {
        const peer = this.peers.get(key);
        const now = speaking && !!peer?.info.mic;
        if (peer && peer.speaking !== now) { peer.speaking = now; changed = true; }
      }
    }
    if (changed) this.syncPeers();
  }

  // ── Leaving ──────────────────────────────────────────────────────────────
  leave() {
    if (this.state.status === 'in') this.socket.emit('meet:leave', {});
    this.hangUp('left');
  }
  private hangUp(status: CallStatus) {
    this.unlisten();
    [...this.peers.keys()].forEach((id) => this.dropPeer(id, false));
    this.screenTrack?.stop();
    this.screenTrack = null;
    this.screenStream = null;
    this.local.getTracks().forEach((t) => t.stop());
    window.clearInterval(this.meterTimer);
    this.meterTimer = 0;
    this.meters.forEach((m) => m.source.disconnect());
    this.meters.clear();
    this.audio?.close().catch(() => {});
    this.audio = null;
    this.set({ status, peers: [], screen: false, recording: null });
  }
}
