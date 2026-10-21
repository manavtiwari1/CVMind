import { Pause, Play, RotateCcw, SkipBack, SkipForward, Volume2, VolumeX, Captions } from 'lucide-react';

const SPEEDS = [0.75, 1, 1.25, 1.5] as const;

interface Props {
  playing: boolean;
  canPlay: boolean;
  beatIndex: number;
  beatCount: number;
  speed: number;
  muted: boolean;
  captions: boolean;
  voiceAvailable: boolean;
  onToggle: () => void;
  onReplayBeat: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSpeed: (speed: number) => void;
  onMute: (muted: boolean) => void;
  onCaptions: (on: boolean) => void;
}

/** The control bar under Leo's board: play/pause, replay beat, beat skip, speed, mute and captions. */
export default function LeoPlayer(p: Props) {
  return (
    <div className="ll-player" role="toolbar" aria-label="Lesson controls">
      <div className="ll-player-group">
        <button type="button" className="ll-pbtn" onClick={p.onPrev} disabled={p.beatIndex <= 0} aria-label="Previous beat" title="Previous beat (←)">
          <SkipBack size={18} />
        </button>
        <button type="button" className="ll-pbtn ll-pbtn-main" onClick={p.onToggle} disabled={!p.canPlay} aria-label={p.playing ? 'Pause' : 'Play'} title="Play / pause (Space)">
          {p.playing ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <button type="button" className="ll-pbtn" onClick={p.onNext} disabled={p.beatIndex >= p.beatCount - 1} aria-label="Next beat" title="Next beat (→)">
          <SkipForward size={18} />
        </button>
        <button type="button" className="ll-pbtn" onClick={p.onReplayBeat} aria-label="Replay this beat" title="Replay this beat">
          <RotateCcw size={17} />
        </button>
        <span className="ll-player-count" aria-live="polite">Beat {Math.min(p.beatIndex + 1, p.beatCount)} of {p.beatCount}</span>
      </div>
      <div className="ll-player-group">
        <label className="ll-speed">
          <span className="ll-sr">Speed</span>
          <select value={p.speed} onChange={(e) => p.onSpeed(Number(e.target.value))} aria-label="Playback speed">
            {SPEEDS.map((s) => <option key={s} value={s}>{s}×</option>)}
          </select>
        </label>
        <button
          type="button"
          className={`ll-pbtn${p.muted ? ' is-off' : ''}`}
          onClick={() => p.onMute(!p.muted)}
          disabled={!p.voiceAvailable}
          aria-pressed={p.muted}
          aria-label={p.muted ? 'Turn voice on' : 'Mute voice'}
          title={p.voiceAvailable ? (p.muted ? 'Voice off: the board still plays' : 'Mute voice') : 'This browser has no voice; the board plays on a timer'}
        >
          {p.muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
        <button type="button" className={`ll-pbtn${p.captions ? ' is-on' : ''}`} onClick={() => p.onCaptions(!p.captions)} aria-pressed={p.captions} aria-label="Captions">
          <Captions size={18} />
        </button>
      </div>
    </div>
  );
}
