import { h } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';

type Props = {
  audio: HTMLAudioElement | null;
  chapterLabel: string;
  sleepLabel: string;
  onSeek: (time: number, isFinal: boolean) => void;
  onTimeUpdate?: (currentTime: number, duration: number, progress: number) => void;
};

const css = `
  .track {
    display: flex;
    flex-direction: column;
    gap: 0.6em;
  }
  .track-seek {
    width: 100%;
  }
  .track-meta {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    font-variant-numeric: tabular-nums;
    color: #555;
    font-size: 0.9em;
  }
  .track-meta span:nth-child(1) {
    text-align: left;
  }
  .track-meta span:nth-child(2) {
    text-align: left;
  }
  .track-meta span:nth-child(3) {
    text-align: center;
  }
  .track-meta span:nth-child(4) {
    text-align: right;
  }
  .track-sleep {
    color: #888;
  }
`;

const formatTime = (totalSeconds: number) => {
  if (!Number.isFinite(totalSeconds)) {
    return '0:00';
  }
  const rounded = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const seconds = rounded % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

export const PlayerTrack = ({ audio, chapterLabel, sleepLabel, onSeek, onTimeUpdate }: Props) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const lastUiUpdateAtRef = useRef<number>(0);
  const onTimeUpdateRef = useRef(onTimeUpdate);

  useEffect(() => {
    onTimeUpdateRef.current = onTimeUpdate;
  }, [onTimeUpdate]);

  useEffect(() => {
    if (!audio) {
      return;
    }

    const updateState = (force: boolean = false) => {
      const now = Date.now();
      if (!force && now - lastUiUpdateAtRef.current < 1000) {
        return;
      }
      lastUiUpdateAtRef.current = now;
      const nextDuration = Number.isFinite(audio.duration) ? audio.duration : 0;
      const nextCurrent = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
      const nextProgress = nextDuration > 0 ? nextCurrent / nextDuration : 0;
      setDuration(nextDuration);
      setCurrentTime(nextCurrent);
      setProgress(nextProgress);
      if (onTimeUpdateRef.current) {
        onTimeUpdateRef.current(nextCurrent, nextDuration, nextProgress);
      }
    };

    const onLoadedMetadata = () => updateState(true);
    const onTime = () => updateState();
    const onPlay = () => updateState(true);
    const onPause = () => updateState(true);
    const onEnded = () => updateState(true);

    audio.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);

    updateState(true);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
    };
  }, [audio]);

  const safeDuration = Number.isFinite(duration) ? duration : 0;
  const safeCurrent = Number.isFinite(currentTime) ? currentTime : 0;
  const safeProgress = Number.isFinite(progress) ? progress : 0;
  const remaining = Math.max(safeDuration - safeCurrent, 0);

  return (
    <div className="track">
      <style>{css}</style>
      <input
        className="track-seek"
        type="range"
        min="0"
        max={safeDuration ? String(Math.floor(safeDuration)) : '0'}
        step="1"
        value={String(Math.floor(safeCurrent))}
        onInput={(event) => {
          const value = Number((event.target as HTMLInputElement).value);
          if (!Number.isFinite(value)) {
            return;
          }
          setCurrentTime(value);
          const nextProgress = safeDuration > 0 ? value / safeDuration : 0;
          setProgress(nextProgress);
          if (onTimeUpdateRef.current) {
            onTimeUpdateRef.current(value, safeDuration, nextProgress);
          }
          onSeek(value, false);
        }}
        onChange={(event) => {
          const value = Number((event.target as HTMLInputElement).value);
          if (!Number.isFinite(value)) {
            return;
          }
          onSeek(value, true);
        }}
      />
      <div className="track-meta">
        <span>{`${formatTime(safeCurrent)} (${Math.round(safeProgress * 100)}%)`}</span>
        <span>{chapterLabel}</span>
        <span className="track-sleep">{sleepLabel ?? ''}</span>
        <span>{`-${formatTime(remaining)}`}</span>
      </div>
    </div>
  );
};
