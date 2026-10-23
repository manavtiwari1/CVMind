import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { FormEvent } from 'react';
import {
  ArrowLeft, Captions, CaptionsOff, Circle, Hand, LayoutGrid, Maximize2, MessageSquare, Mic, MicOff, MonitorUp, MoreVertical, PhoneOff,
  Pin, Send, Settings, SmilePlus, Sparkles, Square, Users, Video, VideoOff, X
} from 'lucide-react';
import { api } from '../api';
import type { Meeting } from '../api';
import { confirmDialog } from '../confirm';
import { getSocket } from '../socket';
import { hrefFor, useTeam, useTeamEvent } from '../store';
import { clock } from '../format';
import { Avatar, Empty, Spinner } from '../ui';
import { openFile, uploadFile, fileUrl } from '../upload';
import { initialCallState, MeshCall } from '../meet/call';
import type { CallState, PeerView } from '../meet/call';
import { Captioner, captionsSupported } from '../meet/captions';
import { CallRecorder, recordingSupported } from '../meet/recorder';
import type { Tile } from '../meet/recorder';
import { SummaryView } from './Leo';
import type { TaskDraft } from './Leo';
import TaskForm from './TaskForm';
import { ScheduleForm } from './Meetings';

export const MEET_REACTIONS = ['👍', '❤️', '😂', '🎉', '👏', '😮'];
const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export default function Meet({ id }: { id: string }) {
  const [data, setData] = useState<{ data: Meeting; canHost: boolean; canEdit: boolean } | null>(null);
  const [error, setError] = useState('');
  const [inCall, setInCall] = useState<MeshCall | null>(null);
  const load = useCallback(() => {
    api<{ data: Meeting; canHost: boolean; canEdit: boolean }>(`/meetings/${id}`).then(setData).catch((err: Error) => setError(err.message || 'Meeting not found.'));
  }, [id]);
  useEffect(() => { load(); }, [load]);
  useTeamEvent('meeting.updated', (p) => { if (p.meetingId === id && !inCall) load(); }, () => { if (!inCall) load(); });

  if (error) return <div className="tm-page"><Empty icon={<Video size={22} />} title="Meeting not found" text={error} action={<a className="tm-btn" href={hrefFor('meetings')}>All meetings</a>} /></div>;
  if (!data) return <div className="tm-center"><Spinner size={20} /></div>;
  const m = data.data;
  if (inCall) return <Room call={inCall} meeting={m} onDone={() => { setInCall(null); load(); }} />;
  if (m.status === 'ended') return <AfterMeeting meeting={m} canHost={data.canHost} onChanged={load} />;
  if (m.status === 'cancelled') return <div className="tm-page"><Empty icon={<Video size={22} />} title="This meeting was cancelled" text={m.scheduledAt ? `It was planned for ${when(m.scheduledAt)}.` : ''} action={<a className="tm-btn" href={hrefFor('meetings')}>All meetings</a>} /></div>;
  return <Lobby meeting={m} canEdit={data.canEdit} onChanged={load} onJoin={setInCall} />;
}

// ── Lobby ────────────────────────────────────────────────────────────────────
function Lobby({ meeting, canEdit, onChanged, onJoin }: { meeting: Meeting; canEdit: boolean; onChanged: () => void; onJoin: (c: MeshCall) => void }) {
  const { me, person, nameOf, toast, live } = useTeam();
  const socket = getSocket();
  const call = useMemo(() => (socket ? new MeshCall(socket, meeting.id, me.id) : null), [socket, meeting.id, me.id]);
  const state = useCall(call);
  const [problems, setProblems] = useState<string[]>([]);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioId, setAudioId] = useState('');
  const [videoId, setVideoId] = useState('');
  const [opening, setOpening] = useState(true);
  const [editing, setEditing] = useState(false);
  const joined = useRef(false);

  const open = useCallback(async (opts: { audioId?: string; videoId?: string } = {}) => {
    if (!call) return;
    setOpening(true);
    setProblems(await call.openMedia({ ...opts, cam: true }));
    setDevices(await navigator.mediaDevices.enumerateDevices().catch(() => []));
    setOpening(false);
  }, [call]);
  useEffect(() => { open(); }, [open]);
  // Leaving the lobby without joining turns the camera off
  useEffect(() => () => { if (!joined.current) call?.leave(); }, [call]);

  const join = async () => {
    if (!call) return;
    await call.join();
    if (call.state.status === 'in') { joined.current = true; onJoin(call); }
    else toast(call.state.error || 'Could not join.', 'error');
  };
  const cancel = async () => {
    if (!(await confirmDialog({ title: 'Cancel this meeting?', message: 'Everyone invited is told it is cancelled.', confirmLabel: 'Cancel meeting', danger: true }))) return;
    await api(`/meetings/${meeting.id}/cancel`, { method: 'POST' }).then(onChanged).catch((err: Error) => toast(err.message, 'error'));
  };

  const mics = devices.filter((d) => d.kind === 'audioinput');
  const cams = devices.filter((d) => d.kind === 'videoinput');
  const early = meeting.status === 'scheduled' && meeting.scheduledAt && new Date(meeting.scheduledAt).getTime() - Date.now() > 15 * 60 * 1000;

  return (
    <div className="tm-page tm-lobby">
      <a className="tm-back" href={hrefFor('meetings')}><ArrowLeft size={15} /> Meetings</a>
      <div className="tm-lobby-grid">
        <div className="tm-lobby-preview">
          <div className="tm-meet-tile self">
            {state.cam ? <VideoView stream={call?.local || null} muted mirror /> : <div className="tm-meet-avatar"><Avatar person={person(me.id)} size={88} /></div>}
            {opening && <div className="tm-meet-overlay"><Spinner /> Starting your camera…</div>}
            <span className="tm-meet-name">{me.name}</span>
          </div>
          <div className="tm-lobby-controls">
            <button type="button" className={`tm-round ${state.mic ? '' : 'off'}`} onClick={() => call?.setMic(!state.mic)} aria-label={state.mic ? 'Turn off microphone' : 'Turn on microphone'} aria-pressed={!state.mic}>{state.mic ? <Mic size={20} /> : <MicOff size={20} />}</button>
            <button type="button" className={`tm-round ${state.cam ? '' : 'off'}`} onClick={() => call?.setCam(!state.cam).catch((err: Error) => toast(err.message, 'error'))} aria-label={state.cam ? 'Turn off camera' : 'Turn on camera'} aria-pressed={!state.cam}>{state.cam ? <Video size={20} /> : <VideoOff size={20} />}</button>
          </div>
          {problems.length > 0 && <p className="tm-notice amber">Could not use your {problems.join(' or ')}. Allow it in the browser's address bar, or join without it.</p>}
          {(mics.length > 1 || cams.length > 1) && (
            <div className="tm-form-row">
              {mics.length > 1 && <div className="tm-field"><label htmlFor="lb-mic">Microphone</label><select id="lb-mic" className="tm-input" value={audioId} onChange={(e) => { setAudioId(e.target.value); open({ audioId: e.target.value, videoId }); }}>{mics.map((d, i) => <option key={d.deviceId} value={d.deviceId}>{d.label || `Microphone ${i + 1}`}</option>)}</select></div>}
              {cams.length > 1 && <div className="tm-field"><label htmlFor="lb-cam">Camera</label><select id="lb-cam" className="tm-input" value={videoId} onChange={(e) => { setVideoId(e.target.value); open({ audioId, videoId: e.target.value }); }}>{cams.map((d, i) => <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${i + 1}`}</option>)}</select></div>}
            </div>
          )}
        </div>
        <div className="tm-lobby-side">
          <h1>{meeting.title || 'Meeting'}</h1>
          {meeting.scheduledAt && <p className="tm-muted">{when(meeting.scheduledAt)} · {meeting.durationMin} min · hosted by {nameOf(meeting.hostId)}</p>}
          {meeting.liveIds.length > 0
            ? <div className="tm-lobby-in"><span className="tm-stack">{meeting.liveIds.slice(0, 5).map((a) => <Avatar key={a} person={person(a)} size={28} />)}</span> {meeting.liveIds.map(nameOf).join(', ')} {meeting.liveIds.length === 1 ? 'is' : 'are'} in the meeting</div>
            : <p className="tm-muted">{meeting.status === 'live' ? 'Nobody is in yet.' : 'The meeting starts when the first person joins.'}</p>}
          {early && <p className="tm-notice">This meeting is scheduled for later. You can still join early.</p>}
          {!live && <p className="tm-notice amber">Connecting to CVMind Team… Meetings need a live connection.</p>}
          <button type="button" className="tm-btn primary lg" disabled={!call || !live || state.status === 'joining' || opening} onClick={join}>{state.status === 'joining' && <Spinner size={15} />} Join now</button>
          {state.status === 'error' && <p className="tm-notice red">{state.error}</p>}
          {state.status === 'removed' && <p className="tm-notice red">{state.error}</p>}
          <p className="tm-hint">Up to 6 people. {captionsSupported() ? "Your speech is turned into text for live captions and Leo's meeting notes; you can turn this off in the meeting." : 'Live captions need Chrome or Edge, so your speech is not transcribed in this browser.'}</p>
          {canEdit && (
            <div className="tm-inline">
              <button type="button" className="tm-btn sm" onClick={() => setEditing(true)}><Settings size={14} /> Edit</button>
              <button type="button" className="tm-btn sm ghost tm-danger" onClick={cancel}>Cancel meeting</button>
            </div>
          )}
          {meeting.inviteeIds.length > 0 && (
            <div className="tm-lobby-invitees">
              <span className="tm-label">Invited</span>
              {meeting.inviteeIds.map((a) => <span key={a} className="tm-person"><Avatar person={person(a)} size={22} presence /> {nameOf(a)}</span>)}
            </div>
          )}
        </div>
      </div>
      {editing && <ScheduleForm meeting={meeting} onClose={() => setEditing(false)} onSaved={onChanged} />}
    </div>
  );
}

// ── In the call ──────────────────────────────────────────────────────────────
function useCall(call: MeshCall | null): CallState {
  const subscribe = useCallback((fn: () => void) => (call ? call.subscribe(fn) : () => {}), [call]);
  return useSyncExternalStore(subscribe, () => (call ? call.state : initialCallState));
}

function Room({ call, meeting, onDone }: { call: MeshCall; meeting: Meeting; onDone: () => void }) {
  const { me, manager, person, nameOf, toast } = useTeam();
  const s = useCall(call);
  const [panel, setPanel] = useState<'chat' | 'people' | null>(null);
  const [layout, setLayout] = useState<'grid' | 'speaker'>('grid');
  const [pinned, setPinned] = useState<string | null>(null);
  const [showReactions, setShowReactions] = useState(false);
  const [transcribe, setTranscribe] = useState(captionsSupported());
  const [showCaptions, setShowCaptions] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const recorder = useRef<CallRecorder | null>(null);
  const lastSpeaker = useRef<string>('');
  const isHost = s.hostId === me.id || manager;

  // Captions from your own mic while it's on
  useEffect(() => {
    if (!transcribe || !s.mic || s.status !== 'in') return;
    const cap = new Captioner((text, final) => call.sendCaption(text, final));
    cap.start();
    return () => cap.stop();
  }, [transcribe, s.mic, s.status, call]);

  useEffect(() => { call.setChatOpen(panel === 'chat'); }, [panel, call]);
  useEffect(() => { recorder.current?.syncAudio(call.audioStreams()); }, [s.peers, call]);
  useEffect(() => { if (s.mutedBy) toast(`${nameOf(s.mutedBy)} muted you`); }, [s.mutedBy, nameOf, toast]);

  // Ctrl+D mic, Ctrl+E camera, like Google Meet
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === 'd') { e.preventDefault(); call.setMic(!call.state.mic); }
      if (k === 'e') { e.preventDefault(); call.setCam(!call.state.cam).catch((err: Error) => toast(err.message, 'error')); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [call, toast]);

  // Warn before closing the tab mid-recording
  useEffect(() => {
    if (!recorder.current) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [s.recording]);

  const stopRecording = useCallback(async () => {
    const rec = recorder.current;
    if (!rec) return;
    recorder.current = null;
    await call.host('record', undefined, false).catch(() => {});
    const file = await rec.stop();
    setSaving(0);
    try {
      const uploaded = await uploadFile(file, { scope: 'meeting', scopeId: meeting.id }, setSaving);
      await api(`/meetings/${meeting.id}/recording`, { method: 'POST', body: { fileId: uploaded.id } });
      toast('Recording saved to Media');
    } catch (err) {
      toast(err instanceof Error ? `Recording not saved: ${err.message}` : 'Recording not saved.', 'error');
      // Keep a copy on this computer so nothing is lost
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(file), download: file.name });
      a.click();
    } finally {
      setSaving(null);
    }
  }, [call, meeting.id, toast]);

  const startRecording = async () => {
    if (!(await confirmDialog({ title: 'Record this meeting?', message: 'Everyone sees a recording banner. Keep this tab open while recording; the video is saved to Media when you stop (up to 2 hours).', confirmLabel: 'Start recording' }))) return;
    const tiles = (): Tile[] => [...document.querySelectorAll<HTMLElement>('[data-meet-tile]')].map((el) => ({ video: el.querySelector('video'), name: el.dataset.name || '', screen: el.dataset.screen === '1' }));
    const rec = new CallRecorder(tiles, () => { toast('Recording reached its limit and was stopped.'); stopRecording(); });
    try {
      rec.start(call.audioStreams());
      recorder.current = rec;
      await call.host('record', undefined, true);
    } catch (err) {
      recorder.current = null;
      toast(err instanceof Error ? err.message : 'Could not start recording.', 'error');
    }
  };

  const leave = async () => {
    if (recorder.current) await stopRecording();
    call.leave();
    onDone();
  };
  const endForAll = async () => {
    if (!(await confirmDialog({ title: 'End the meeting for everyone?', message: "Everyone leaves the call. Leo then writes the meeting notes.", confirmLabel: 'End for everyone', danger: true }))) return;
    if (recorder.current) await stopRecording();
    await call.host('end').catch((err: Error) => toast(err.message, 'error'));
  };

  // Ended, removed or left: back to the meeting page
  useEffect(() => {
    if (s.status === 'ended' || s.status === 'removed' || s.status === 'left') {
      if (recorder.current) stopRecording();
      if (s.status === 'removed') toast('The host removed you from the meeting.', 'error');
      if (s.status === 'ended') toast('The meeting has ended');
      onDone();
    }
  }, [s.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tiles: you, then everyone else; a shared screen gets its own tile
  const selfTile = { key: 'self', socketId: s.selfId, adminId: me.id, name: `${me.name} (you)`, stream: s.screen ? call.screenStream : call.local, mic: s.mic, cam: s.cam || s.screen, screen: s.screen, hand: s.hand, speaking: s.speaking, self: true, connection: 'connected' as const };
  const others = s.peers.map((p: PeerView) => ({ key: p.socketId, socketId: p.socketId, adminId: p.adminId, name: p.name || nameOf(p.adminId), stream: p.stream, mic: p.mic, cam: p.cam || p.screen, screen: p.screen, hand: p.hand, speaking: p.speaking, self: false, connection: p.connection }));
  const tiles = [selfTile, ...others];
  const speaking = others.find((t) => t.speaking);
  if (speaking) lastSpeaker.current = speaking.key;
  const sharer = tiles.find((t) => t.screen);
  const main = tiles.find((t) => t.key === pinned) || sharer || (layout === 'speaker' ? others.find((t) => t.key === lastSpeaker.current) || others[0] : null);
  const stage = main ? [main] : tiles;
  const strip = main ? tiles.filter((t) => t !== main) : [];
  const hands = tiles.filter((t) => t.hand);

  return (
    <div className="tm-meet" role="application" aria-label={`Meeting: ${meeting.title}`}>
      {s.recording && <div className="tm-meet-rec" role="status"><Circle size={10} fill="currentColor" /> Recording{s.recording.by ? ` · started by ${nameOf(s.recording.by)}` : ''}</div>}
      {saving !== null && <div className="tm-meet-rec saving" role="status"><Spinner size={12} /> Saving recording… {saving}%</div>}
      <div className={`tm-meet-body ${panel ? 'with-panel' : ''}`}>
        <div className="tm-meet-stage">
          <div className={`tm-meet-grid n${Math.min(stage.length, 6)} ${main ? 'focus' : ''}`}>
            {stage.map((t) => <MeetTile key={t.key} t={t} big={!!main} onPin={() => setPinned(pinned === t.key ? null : t.key)} pinned={pinned === t.key} person={person(t.adminId)} />)}
          </div>
          {strip.length > 0 && <div className="tm-meet-strip">{strip.map((t) => <MeetTile key={t.key} t={t} onPin={() => setPinned(t.key)} pinned={false} person={person(t.adminId)} />)}</div>}
          {showCaptions && s.captions.length > 0 && (
            <div className="tm-meet-captions" aria-live="polite">
              {s.captions.map((c) => <p key={c.socketId}><strong>{c.adminId === me.id ? 'You' : nameOf(c.adminId)}:</strong> {c.text}</p>)}
            </div>
          )}
          <div className="tm-meet-reactions" aria-hidden>
            {s.reactions.map((r) => <span key={r.key} style={{ left: `${10 + ((r.key * 37) % 70)}%` }}>{r.emoji}<small>{r.adminId === me.id ? 'You' : nameOf(r.adminId).split(' ')[0]}</small></span>)}
          </div>
          {hands.length > 0 && <div className="tm-meet-hands"><Hand size={15} /> {hands.map((t) => (t.self ? 'You' : t.name.split(' ')[0])).join(', ')} raised a hand</div>}
        </div>
        {panel && (
          <aside className="tm-meet-panel" aria-label={panel === 'chat' ? 'Meeting chat' : 'People'}>
            <header><h2>{panel === 'chat' ? 'In-call messages' : `People (${tiles.length})`}</h2><button type="button" className="tm-meet-icon" onClick={() => setPanel(null)} aria-label="Close"><X size={18} /></button></header>
            {panel === 'chat' ? <MeetChat call={call} state={s} /> : <MeetPeople call={call} state={s} tiles={tiles} isHost={isHost} />}
          </aside>
        )}
      </div>

      <footer className="tm-meet-bar">
        <div className="tm-meet-bar-left"><span className="tm-meet-clock">{clock(new Date().toISOString())}</span><span className="tm-meet-title">{meeting.title}</span></div>
        <div className="tm-meet-bar-mid">
          <button type="button" className={`tm-round ${s.mic ? '' : 'off'}`} onClick={() => call.setMic(!s.mic)} title={`${s.mic ? 'Turn off' : 'Turn on'} microphone (Ctrl+D)`} aria-label={s.mic ? 'Turn off microphone' : 'Turn on microphone'} aria-pressed={!s.mic}>{s.mic ? <Mic size={20} /> : <MicOff size={20} />}</button>
          <button type="button" className={`tm-round ${s.cam ? '' : 'off'}`} onClick={() => call.setCam(!s.cam).catch((err: Error) => toast(err.message, 'error'))} title={`${s.cam ? 'Turn off' : 'Turn on'} camera (Ctrl+E)`} aria-label={s.cam ? 'Turn off camera' : 'Turn on camera'} aria-pressed={!s.cam}>{s.cam ? <Video size={20} /> : <VideoOff size={20} />}</button>
          {'getDisplayMedia' in (navigator.mediaDevices || {}) && <button type="button" className={`tm-round ${s.screen ? 'on' : ''}`} onClick={() => call.shareScreen(!s.screen).catch(() => {})} title={s.screen ? 'Stop presenting' : 'Present your screen'} aria-label={s.screen ? 'Stop presenting' : 'Present your screen'} aria-pressed={s.screen}><MonitorUp size={20} /></button>}
          <div className="tm-meet-react">
            <button type="button" className="tm-round" onClick={() => setShowReactions((v) => !v)} title="Send a reaction" aria-label="Send a reaction" aria-expanded={showReactions}><SmilePlus size={20} /></button>
            {showReactions && <div className="tm-meet-react-pop" role="menu">{MEET_REACTIONS.map((e) => <button key={e} type="button" role="menuitem" onClick={() => call.react(e)} aria-label={`React ${e}`}>{e}</button>)}</div>}
          </div>
          <button type="button" className={`tm-round ${s.hand ? 'on' : ''}`} onClick={() => call.setHand(!s.hand)} title={s.hand ? 'Lower hand' : 'Raise hand'} aria-label={s.hand ? 'Lower hand' : 'Raise hand'} aria-pressed={s.hand}><Hand size={20} /></button>
          {captionsSupported() && <button type="button" className={`tm-round ${showCaptions ? 'on' : ''}`} onClick={() => setShowCaptions((v) => !v)} title={showCaptions ? 'Hide captions' : 'Show captions'} aria-label={showCaptions ? 'Hide captions' : 'Show captions'} aria-pressed={showCaptions}>{showCaptions ? <Captions size={20} /> : <CaptionsOff size={20} />}</button>}
          {isHost && recordingSupported() && (
            <button type="button" className={`tm-round ${s.recording ? 'rec' : ''}`} disabled={saving !== null || (!!s.recording && !recorder.current)} onClick={() => (recorder.current ? stopRecording() : startRecording())} title={recorder.current ? 'Stop recording' : 'Record'} aria-label={recorder.current ? 'Stop recording' : 'Record the meeting'}>{recorder.current ? <Square size={18} fill="currentColor" /> : <Circle size={20} />}</button>
          )}
          <MoreMenu layout={layout} setLayout={setLayout} transcribe={transcribe} setTranscribe={setTranscribe} isHost={isHost} onEnd={endForAll} />
          <button type="button" className="tm-round leave" onClick={leave} title="Leave call" aria-label="Leave call"><PhoneOff size={20} /></button>
        </div>
        <div className="tm-meet-bar-right">
          <button type="button" className={`tm-meet-icon ${panel === 'people' ? 'on' : ''}`} onClick={() => setPanel(panel === 'people' ? null : 'people')} aria-label="People" title="People"><Users size={20} /><span className="tm-meet-count">{tiles.length}</span></button>
          <button type="button" className={`tm-meet-icon ${panel === 'chat' ? 'on' : ''}`} onClick={() => setPanel(panel === 'chat' ? null : 'chat')} aria-label="Chat" title="In-call messages"><MessageSquare size={20} />{s.unreadChat > 0 && <span className="tm-meet-dot" />}</button>
        </div>
      </footer>
      {!s.turn && s.peers.some((p) => p.connection === 'failed') && <div className="tm-meet-warn">Could not connect to someone. A strict network may be blocking the call.</div>}
    </div>
  );
}

interface TileData { key: string; socketId: string; adminId: string; name: string; stream: MediaStream | null; mic: boolean; cam: boolean; screen: boolean; hand: boolean; speaking: boolean; self: boolean; connection: string }

function MeetTile({ t, big, onPin, pinned, person }: { t: TileData; big?: boolean; onPin: () => void; pinned: boolean; person: ReturnType<ReturnType<typeof useTeam>['person']> }) {
  return (
    <div className={`tm-meet-tile ${t.speaking ? 'speaking' : ''} ${big ? 'big' : ''} ${t.screen ? 'screen' : ''}`} data-meet-tile data-name={t.name} data-screen={t.screen ? '1' : '0'}>
      <VideoView stream={t.stream} muted mirror={t.self && !t.screen} hidden={!t.cam} contain={t.screen} />
      {!t.cam && <div className="tm-meet-avatar"><Avatar person={person} size={big ? 96 : 56} /></div>}
      {!t.self && <AudioView stream={t.stream} />}
      {t.connection !== 'connected' && !t.self && <div className="tm-meet-overlay"><Spinner size={14} /> {t.connection === 'failed' ? 'Connection lost' : 'Connecting…'}</div>}
      <span className="tm-meet-name">{!t.mic && <MicOff size={13} />} {t.hand && <Hand size={13} />} {t.screen ? `${t.name} is presenting` : t.name}</span>
      <button type="button" className={`tm-meet-pin ${pinned ? 'on' : ''}`} onClick={onPin} aria-label={pinned ? 'Unpin' : `Pin ${t.name}`} title={pinned ? 'Unpin' : 'Pin'}>{pinned ? <Pin size={14} /> : <Maximize2 size={14} />}</button>
    </div>
  );
}

function VideoView({ stream, muted, mirror, hidden, contain }: { stream: MediaStream | null; muted?: boolean; mirror?: boolean; hidden?: boolean; contain?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const tracks = stream?.getVideoTracks().map((t) => t.id).join() || '';
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.srcObject = stream && stream.getVideoTracks().length ? new MediaStream(stream.getVideoTracks()) : null;
    v.play().catch(() => {});
  }, [stream, tracks]);
  return <video ref={ref} autoPlay playsInline muted={muted ?? true} className={`${mirror ? 'mirror' : ''} ${contain ? 'contain' : ''}`} style={hidden ? { opacity: 0 } : undefined} />;
}

// Remote voices play through their own element, so they keep playing when the video is hidden
function AudioView({ stream }: { stream: MediaStream | null }) {
  const ref = useRef<HTMLAudioElement>(null);
  const tracks = stream?.getAudioTracks().map((t) => t.id).join() || '';
  useEffect(() => {
    const a = ref.current;
    if (!a) return;
    a.srcObject = stream && stream.getAudioTracks().length ? new MediaStream(stream.getAudioTracks()) : null;
    a.play().catch(() => {});
  }, [stream, tracks]);
  return <audio ref={ref} autoPlay />;
}

function MoreMenu({ layout, setLayout, transcribe, setTranscribe, isHost, onEnd }: { layout: 'grid' | 'speaker'; setLayout: (l: 'grid' | 'speaker') => void; transcribe: boolean; setTranscribe: (v: boolean) => void; isHost: boolean; onEnd: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="tm-meet-react">
      <button type="button" className="tm-round" onClick={() => setOpen((v) => !v)} aria-label="More options" aria-expanded={open}><MoreVertical size={20} /></button>
      {open && (
        <div className="tm-meet-menu" role="menu" onMouseLeave={() => setOpen(false)}>
          <button type="button" role="menuitem" onClick={() => { setLayout(layout === 'grid' ? 'speaker' : 'grid'); setOpen(false); }}><LayoutGrid size={16} /> {layout === 'grid' ? 'Speaker view' : 'Grid view'}</button>
          {captionsSupported() && <button type="button" role="menuitem" onClick={() => { setTranscribe(!transcribe); setOpen(false); }}>{transcribe ? <CaptionsOff size={16} /> : <Captions size={16} />} {transcribe ? 'Stop transcribing me' : 'Transcribe me again'}</button>}
          {isHost && <button type="button" role="menuitem" className="danger" onClick={() => { setOpen(false); onEnd(); }}><PhoneOff size={16} /> End meeting for everyone</button>}
        </div>
      )}
    </div>
  );
}

function MeetChat({ call, state }: { call: MeshCall; state: CallState }) {
  const { me, nameOf, toast } = useTeam();
  const [body, setBody] = useState('');
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [state.chat.length]);
  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    try { await call.sendChat(body); setBody(''); } catch (err) { toast(err instanceof Error ? err.message : 'Could not send.', 'error'); }
  };
  return (
    <>
      <div className="tm-meet-chat">
        {!state.chat.length && <p className="tm-meet-muted">Messages here are seen by everyone in the call and saved with the meeting.</p>}
        {state.chat.map((m) => (
          <div key={m.id} className="tm-meet-line">
            <span><strong>{m.authorId === me.id ? 'You' : nameOf(m.authorId)}</strong> <time>{clock(m.createdAt)}</time></span>
            <p>{m.body}</p>
          </div>
        ))}
        <div ref={end} />
      </div>
      <form className="tm-meet-send" onSubmit={send}>
        <input value={body} onChange={(e) => setBody(e.target.value)} maxLength={1000} placeholder="Send a message" aria-label="Message everyone" />
        <button type="submit" className="tm-meet-icon" disabled={!body.trim()} aria-label="Send"><Send size={18} /></button>
      </form>
    </>
  );
}

function MeetPeople({ call, state, tiles, isHost }: { call: MeshCall; state: CallState; tiles: TileData[]; isHost: boolean }) {
  const { person, toast } = useTeam();
  const act = (action: 'mute' | 'remove' | 'lower-hand', target: string) => call.host(action, target).catch((err: Error) => toast(err.message, 'error'));
  return (
    <ul className="tm-meet-people">
      {tiles.map((t) => (
        <li key={t.key}>
          <Avatar person={person(t.adminId)} size={30} />
          <span className="tm-meet-who">{t.name}{t.adminId === state.hostId && <small>Host</small>}</span>
          {t.hand && <Hand size={15} className="tm-amber" />}
          {t.mic ? <Mic size={15} /> : <MicOff size={15} className="tm-meet-muted" />}
          {isHost && !t.self && (
            <span className="tm-meet-host-actions">
              {t.hand && <button type="button" className="tm-meet-mini" onClick={() => act('lower-hand', t.socketId)}>Lower hand</button>}
              {t.mic && <button type="button" className="tm-meet-mini" onClick={() => act('mute', t.socketId)}>Mute</button>}
              <button type="button" className="tm-meet-mini danger" onClick={async () => { if (await confirmDialog({ title: `Remove ${t.name}?`, message: 'They leave the call and cannot rejoin this meeting.', confirmLabel: 'Remove', danger: true })) act('remove', t.socketId); }}>Remove</button>
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

// ── After the meeting ────────────────────────────────────────────────────────
function AfterMeeting({ meeting, canHost, onChanged }: { meeting: Meeting; canHost: boolean; onChanged: () => void }) {
  const { me, person, nameOf, toast } = useTeam();
  const [chat, setChat] = useState<Array<{ id: string; authorId: string; body: string; createdAt: string }> | null>(null);
  const [draft, setDraft] = useState<TaskDraft | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { api<{ data: typeof chat }>(`/meetings/${meeting.id}/chat`).then((r) => setChat(r.data)).catch(() => setChat([])); }, [meeting.id]);
  const took = meeting.startedAt && meeting.endedAt ? Math.max(1, Math.round((+new Date(meeting.endedAt) - +new Date(meeting.startedAt)) / 60000)) : null;
  const rewrite = async () => {
    setBusy(true);
    try { await api(`/meetings/${meeting.id}/notes`, { method: 'POST' }); onChanged(); } catch (err) { toast(err instanceof Error ? err.message : 'Leo could not write the notes.', 'error'); } finally { setBusy(false); }
  };
  return (
    <div className="tm-page tm-task-page">
      <a className="tm-back" href={hrefFor('meetings')}><ArrowLeft size={15} /> Meetings</a>
      <header className="tm-task-head">
        <div>
          <div className="tm-task-meta"><span className="tm-badge status-approved">Ended</span>{took && <span className="tm-muted">{took} min</span>}{meeting.endedAt && <span className="tm-muted">{when(meeting.endedAt)}</span>}</div>
          <h1>{meeting.title || 'Meeting'}</h1>
        </div>
        {meeting.channelId && <a className="tm-btn" href={hrefFor('chat', meeting.channelId)}><MessageSquare size={15} /> Open channel</a>}
      </header>
      <div className="tm-task-grid">
        <div className="tm-task-content">
          <section className="tm-card pad">
            <h2 className="tm-h2"><Sparkles size={16} /> Leo's notes</h2>
            {!meeting.notes && <p className="tm-muted">No notes: nothing was transcribed or written in the chat.</p>}
            {meeting.notes?.status === 'pending' && <div className="tm-center"><Spinner /> Leo is writing the notes…</div>}
            {meeting.notes?.status === 'failed' && <p className="tm-notice amber">{meeting.notes.error}</p>}
            {meeting.notes?.status === 'ready' && <SummaryView summary={meeting.notes} onTask={me.teamOnly ? undefined : setDraft} />}
            {canHost && meeting.notes?.status !== 'pending' && <button type="button" className="tm-btn sm ghost" disabled={busy} onClick={rewrite}>{busy && <Spinner size={13} />} {meeting.notes?.status === 'ready' ? 'Write the notes again' : 'Ask Leo for notes'}</button>}
            <p className="tm-hint">Written by Leo from live captions and the in-call chat. Speech recognition makes mistakes, so check names and numbers.</p>
          </section>
          {meeting.recordingFileIds.length > 0 && (
            <section className="tm-card pad">
              <h2 className="tm-h2"><Video size={16} /> Recording</h2>
              {meeting.recordingFileIds.map((id) => <RecordingPlayer key={id} fileId={id} />)}
            </section>
          )}
          <section className="tm-card pad">
            <h2 className="tm-h2"><MessageSquare size={16} /> In-call messages</h2>
            {!chat && <Spinner />}
            {chat && !chat.length && <p className="tm-muted">No messages.</p>}
            {chat?.map((m) => <div key={m.id} className="tm-comment"><Avatar person={person(m.authorId)} size={26} /><div><div className="tm-msg-meta"><strong>{nameOf(m.authorId)}</strong> <time>{clock(m.createdAt)}</time></div><div className="tm-text">{m.body}</div></div></div>)}
          </section>
        </div>
        <aside className="tm-task-side">
          <dl className="tm-card pad tm-facts">
            <dt>Host</dt><dd><span className="tm-person"><Avatar person={person(meeting.hostId)} size={22} /> {nameOf(meeting.hostId)}</span></dd>
            <dt>Joined</dt><dd>{meeting.participantIds.map((a) => <span key={a} className="tm-person"><Avatar person={person(a)} size={22} /> {nameOf(a)}</span>)}</dd>
            {meeting.startedAt && <><dt>Started</dt><dd>{when(meeting.startedAt)}</dd></>}
          </dl>
        </aside>
      </div>
      {draft && <TaskForm draft={draft} onClose={() => setDraft(null)} />}
    </div>
  );
}

function RecordingPlayer({ fileId }: { fileId: string }) {
  const [src, setSrc] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { fileUrl(fileId).then(setSrc).catch((err: Error) => setError(err.message)); }, [fileId]);
  if (error) return <p className="tm-notice amber">{error}</p>;
  if (!src) return <Spinner />;
  return (
    <div className="tm-recording">
      <video src={src} controls preload="metadata" />
      <button type="button" className="tm-btn sm" onClick={() => openFile(fileId, true).catch(() => {})}>Download</button>
    </div>
  );
}

