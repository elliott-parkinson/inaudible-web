import { h } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { container } from "../../../container";
import type { InaudibleService } from '../../inaudible.service';
import type { InaudibleMediaProgressService } from '../../inaudible.service/media-progress';
import type { DownloadsStore } from '../../inaudible.store/store/downloads-store';
import { AudiobookPlayer } from '../../inaudible.ui/components/audiobook-player/audiobook-player';
import { PlayerTrack } from './player-track';
import closeIcon from "../icons/process-stop-symbolic.svg";
import alarmIcon from "../icons/alarm-symbolic.svg";
import volumeIcon from "../icons/audio-volume-high-symbolic.svg";
import backTenIcon from "../icons/object-rotate-left-symbolic.svg";
import forwardTenIcon from "../icons/object-rotate-right-symbolic.svg";
import backIcon from "../icons/media-skip-backward-symbolic.svg";
import forwardIcon from "../icons/media-skip-backward-symbolic-rtl.svg";
import playIcon from "../icons/media-playback-start-symbolic.svg";
import pauseIcon from "../icons/media-playback-pause-symbolic.svg";
import chaptersIcon from "../icons/view-list-bullet-symbolic.svg";

type Props = {
  mediaItemId: string;
  apiKey: string;
  baseUrl: string;
  coverUrl?: string;
  title?: string;
  author?: string;
  startPosition?: number;
  autoplay?: boolean;
  onTimeUpdate?: (currentTime: number, duration: number, progress: number) => void;
  onClose?: () => void;
};

const css = `
  :host {
    display: block;
  }
  .player {
    display: flex;
    flex-direction: column;
  }
  .player-main {
    display: grid;
    grid-template-columns: minmax(90px, 100px) 1fr;
    gap: 1em;
    align-items: center;
    position: relative;
  }
  .player-content {
    display: grid;
    grid-template-columns: max-content minmax(0, 1fr);
    align-items: center;
    gap: 1em;
    min-width: 0;
    width: 100%;
  }
  .player-close {
    border: none;
    background: transparent;
    cursor: pointer;
    padding: 0.25em;
    position: absolute;
    top: 0;
    right: 0;
    z-index: 1;
  }
  .player-cover {
    width: 100%;
    aspect-ratio: 1 / 1;
    object-fit: cover;
    border-radius: 0.6em;
    box-shadow: 0 8px 18px rgba(0, 0, 0, 0.15);
    background: #e6e6e6;
  }
  .player-controls {
    display: flex;
    flex-direction: column;
    gap: 0.8em;
    width: 100%;
    align-self: center;
    justify-self: stretch;
  }
  .player-meta {
    display: flex;
    flex-direction: column;
    gap: 0.2em;
    font-size: 0.85em;
    align-self: center;
  }
  .player-title {
    font-weight: 600;
  }
  .player-author {
    font-weight: 400;
    color: #666;
  }
  .player-controls-inner {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: 1em;
    min-width: 0;
    width: 100%;
    justify-items: stretch;
  }
  .player-buttons {
    display: flex;
    align-items: center;
    gap: 0.6em;
    flex-wrap: nowrap;
    justify-content: center;
    width: 100%;
  }
  .player-buttons button {
    border: 1px solid #d1d1d1;
    background: #fff;
    padding: 0.5em 0.8em;
    border-radius: 0.6em;
    cursor: pointer;
  }
  .player-buttons button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .player-play {
    font-size: 1.1em;
    padding: 0.75em 1.4em;
    border-radius: 999px;
    border: none;
    background: #1d1d1d;
    color: #fff;
  }
  .player-status {
    font-size: 0.9em;
    color: #666;
  }
  .player-bottom-bar {
    display: flex;
    justify-content: flex-end;
    gap: 0.8em;
    flex-wrap: nowrap;
    margin-top: 0.2em;
    min-width: 0;
  }
  .player-popover {
    position: relative;
  }
  .player-popover > button {
    border: 1px solid #d1d1d1;
    background: #fff;
    padding: 0.5em 0.8em;
    border-radius: 0.6em;
    cursor: pointer;
    font-weight: 600;
  }
  .player-popover-panel {
    position: absolute;
    right: 0;
    top: calc(100% + 0.4em);
    background: #fff;
    border: 1px solid #e2e2e2;
    border-radius: 0.6em;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    padding: 0.7em;
    min-width: 200px;
    z-index: 2;
    display: none;
  }
  .player-popover-panel.open {
    display: block;
  }
  .player-popover-panel label {
    display: flex;
    flex-direction: column;
    gap: 0.35em;
    font-size: 0.8em;
    color: #666;
  }
  .player-popover-panel input[type="range"] {
    width: 100%;
  }
  .player-popover-panel select,
  .player-popover-panel input[type="range"] {
    border: 1px solid #d1d1d1;
    border-radius: 0.45em;
    padding: 0.35em 0.5em;
    font-size: 0.95em;
    background: #fff;
  }
  .player-sleep-status {
    font-size: 0.75em;
    color: #888;
  }
  @media (max-width: 640px) {
    .player-chapter-button {
      display: none;
    }
    .player-controls-inner {
      grid-template-columns: 1fr;
      justify-items: center;
    }
    .player-bottom-bar {
      align-items: center;
      justify-content: center;
    }
    .player-buttons {
      justify-content: center;
    }
    .player-buttons button,
    .player-popover > button {
      padding: 0.4em 0.6em;
    }
    .player-popover-panel {
      position: fixed;
      left: 1rem;
      right: 1rem;
      top: auto;
      bottom: 1.2rem;
      width: auto;
      max-width: calc(100vw - 2rem);
    }
    .player-main {
      grid-template-columns: minmax(90px, 100px) 1fr;
    }
    .player-content {
      grid-template-columns: 1fr;
      justify-items: center;
    }
    .player-meta {
      grid-column: 1 / -1;
      text-align: center;
    }
  }
  audio {
    display: none;
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

const computeChapterLabel = (tracks: Array<any>, index: number) => {
  if (!Array.isArray(tracks) || tracks.length === 0) {
    return 'Chapter unavailable';
  }
  const current = Math.min(Math.max(index, 0), tracks.length - 1);
  const track = tracks[current];
  const title = track?.title || track?.name || track?.metadata?.title;
  if (title) {
    return `Chapter ${current + 1}: ${title}`;
  }
  return `Chapter ${current + 1} of ${tracks.length}`;
};

export const AudiobookPlayerView = ({
  mediaItemId,
  apiKey,
  baseUrl,
  coverUrl,
  title,
  author,
  startPosition = 0,
  autoplay = true,
  onTimeUpdate,
  onClose,
}: Props) => {
  const playerRef = useRef<AudiobookPlayer | null>(null);
  const progressServiceRef = useRef<InaudibleMediaProgressService | null>(null);
  const progressSubscriptionTargetRef = useRef<EventTarget | null>(null);
  const progressEventNameRef = useRef<string | null>(null);
  const downloadsStoreRef = useRef<DownloadsStore | null>(null);
  const lastProgressSentAtRef = useRef<number>(0);
  const isSeekingRef = useRef<boolean>(false);
  const pendingStartPositionRef = useRef<number | null>(null);
  const pendingProgressRatioRef = useRef<number | null>(null);
  const hasAppliedStartPositionRef = useRef<boolean>(false);
  const initialPositionLockedRef = useRef<boolean>(false);
  const sleepTimerIdRef = useRef<number | null>(null);
  const sleepIntervalIdRef = useRef<number | null>(null);
  const sleepEndsAtRef = useRef<number | null>(null);
  const sleepModeRef = useRef<'off' | 'timer' | 'chapter'>('off');

  const [statusMessage, setStatusMessage] = useState('');
  const [trackList, setTrackList] = useState<Array<any>>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [chapterLabel, setChapterLabel] = useState('Chapter unavailable');
  const [sleepLabel, setSleepLabel] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [volume, setVolume] = useState(100);
  const [sleepValue, setSleepValue] = useState('0');
  const [volumeOpen, setVolumeOpen] = useState(false);
  const [sleepOpen, setSleepOpen] = useState(false);
  const [chapterOpen, setChapterOpen] = useState(false);

  const sleepOptions = useMemo(
    () => [
      { label: 'Off', value: '0' },
      { label: '15 min', value: '900' },
      { label: '30 min', value: '1800' },
      { label: '45 min', value: '2700' },
      { label: '60 min', value: '3600' },
      { label: '90 min', value: '5400' },
      { label: 'End of chapter', value: 'chapter' },
    ],
    []
  );

  const shouldAutoplay = () => autoplay !== false;

  const closeAllPopovers = () => {
    setVolumeOpen(false);
    setSleepOpen(false);
    setChapterOpen(false);
  };

  const updateChapterState = () => {
    const player = playerRef.current;
    if (!player) {
      return;
    }
    const nextTrackList = player.trackList ?? [];
    const nextIndex = player.currentTrackIndex ?? 0;
    setTrackList([...nextTrackList]);
    setCurrentTrackIndex(nextIndex);
    setChapterLabel(computeChapterLabel(nextTrackList, nextIndex));
  };

  const updateSleepIndicators = (seconds: number) => {
    const label = `Sleep in ${formatTime(seconds)}`;
    setSleepLabel(label);
  };

  const clearSleepTimer = () => {
    if (sleepTimerIdRef.current) {
      window.clearTimeout(sleepTimerIdRef.current);
    }
    if (sleepIntervalIdRef.current) {
      window.clearInterval(sleepIntervalIdRef.current);
    }
    sleepTimerIdRef.current = null;
    sleepIntervalIdRef.current = null;
    sleepEndsAtRef.current = null;
    sleepModeRef.current = 'off';
    setSleepLabel('');
    setSleepValue('0');
  };

  const setSleepTimer = (seconds: number) => {
    clearSleepTimer();
    sleepModeRef.current = 'timer';
    const durationMs = Math.max(seconds, 0) * 1000;
    if (!durationMs) {
      return;
    }
    sleepEndsAtRef.current = Date.now() + durationMs;
    updateSleepIndicators(seconds);
    sleepTimerIdRef.current = window.setTimeout(() => {
      playerRef.current?.audio.pause();
      setIsPlaying(false);
      setSleepValue('0');
      clearSleepTimer();
    }, durationMs);
    sleepIntervalIdRef.current = window.setInterval(() => {
      if (!sleepEndsAtRef.current) {
        return;
      }
      const remainingMs = Math.max(sleepEndsAtRef.current - Date.now(), 0);
      if (remainingMs <= 0) {
        return;
      }
      updateSleepIndicators(remainingMs / 1000);
    }, 1000);
  };

  const setSleepChapterMode = () => {
    clearSleepTimer();
    sleepModeRef.current = 'chapter';
    setSleepLabel('Sleep: chapter');
  };

  const readStoredValue = (key: string) => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  };

  const storeValue = (key: string, value: string) => {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      return;
    }
  };

  const ensureProgressService = () => {
    if (progressServiceRef.current) {
      return;
    }
    const service = container.get("inaudible.service") as InaudibleService | undefined;
    progressServiceRef.current = service?.progress ?? null;
  };

  const ensureDownloadsStore = () => {
    if (downloadsStoreRef.current) {
      return;
    }
    downloadsStoreRef.current = (container.get("inaudible.store.downloads") as DownloadsStore) ?? null;
  };

  const requestProgressUpdate = () => {
    if (!mediaItemId || !progressServiceRef.current) {
      return;
    }
    void progressServiceRef.current.updateByLibraryItemId(mediaItemId);
  };

  const teardownProgressSubscription = () => {
    if (progressSubscriptionTargetRef.current && progressEventNameRef.current) {
      progressSubscriptionTargetRef.current.removeEventListener(progressEventNameRef.current, onProgressEvent);
    }
    progressSubscriptionTargetRef.current = null;
    progressEventNameRef.current = null;
  };

  const updateProgressSubscription = () => {
    teardownProgressSubscription();
    if (!mediaItemId || !progressServiceRef.current) {
      return;
    }
    const eventName = `${mediaItemId}-progress`;
    progressServiceRef.current.addEventListener(eventName, onProgressEvent);
    progressSubscriptionTargetRef.current = progressServiceRef.current;
    progressEventNameRef.current = eventName;
  };

  const extractProgress = (detail: unknown) => {
    if (typeof detail === 'number' && Number.isFinite(detail)) {
      return detail <= 1 ? { currentTime: null, progressRatio: detail } : { currentTime: detail, progressRatio: null };
    }
    if (!detail || typeof detail !== 'object') {
      return null;
    }
    const data = detail as { currentTime?: unknown; progress?: unknown };
    if (typeof data.currentTime === 'number' && Number.isFinite(data.currentTime)) {
      return { currentTime: data.currentTime, progressRatio: null };
    }
    if (typeof data.progress === 'number' && Number.isFinite(data.progress)) {
      return data.progress <= 1
        ? { currentTime: null, progressRatio: data.progress }
        : { currentTime: data.progress, progressRatio: null };
    }
    return null;
  };

  const applyStartPosition = () => {
    if (hasAppliedStartPositionRef.current) {
      return;
    }
    const audio = playerRef.current?.audio;
    if (!audio) {
      return;
    }
    const safeDuration = Number.isFinite(audio.duration) ? audio.duration : 0;
    let target = pendingStartPositionRef.current ?? 0;
    if (!target && pendingProgressRatioRef.current !== null && safeDuration > 0) {
      target = safeDuration * pendingProgressRatioRef.current;
    }
    if (!target || target <= 0 || safeDuration <= 0) {
      return;
    }
    audio.currentTime = Math.min(target, safeDuration);
    hasAppliedStartPositionRef.current = true;
  };

  const onProgressEvent = (event: Event) => {
    if (initialPositionLockedRef.current || hasAppliedStartPositionRef.current) {
      return;
    }
    const detail = (event as CustomEvent).detail as unknown;
    const progressData = extractProgress(detail);
    if (!progressData) {
      return;
    }
    if (progressData.currentTime !== null) {
      pendingStartPositionRef.current = progressData.currentTime;
      pendingProgressRatioRef.current = null;
    } else if (progressData.progressRatio !== null) {
      pendingProgressRatioRef.current = progressData.progressRatio;
    }
    applyStartPosition();
  };

  const maybeSendProgress = (force: boolean) => {
    const now = Date.now();
    if (!force && now - lastProgressSentAtRef.current < 5000) {
      return;
    }
    const audio = playerRef.current?.audio;
    if (!audio) {
      return;
    }
    const safeDuration = Number.isFinite(audio.duration) ? audio.duration : 0;
    const safeCurrent = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
    const nextProgress = safeDuration > 0 ? safeCurrent / safeDuration : 0;
    if (mediaItemId && progressServiceRef.current) {
      void progressServiceRef.current.updateMediaProgressByLibraryItemId(mediaItemId, safeCurrent, safeDuration, nextProgress);
    }
    lastProgressSentAtRef.current = now;
  };

  const loadLocalAudio = async () => {
    if (!downloadsStoreRef.current || !mediaItemId || !playerRef.current) {
      return false;
    }
    const download = await downloadsStoreRef.current.get(mediaItemId);
    if (!download?.tracks?.length) {
      return false;
    }
    return playerRef.current.loadLocalDownload(download, shouldAutoplay());
  };

  useEffect(() => {
    if (playerRef.current) {
      return;
    }
    playerRef.current = new AudiobookPlayer({
      shouldAutoplay: () => shouldAutoplay(),
      onChapterUpdate: () => {
        updateChapterState();
      },
      onPlaybackUpdate: () => {
        return;
      },
      onProgress: (force) => {
        maybeSendProgress(force);
      },
      onStatus: (message) => {
        setStatusMessage(message ?? '');
      },
      onError: () => {
        playerRef.current?.abort();
        setIsLoading(false);
      },
    });
  }, []);

  useEffect(() => {
    const audio = playerRef.current?.audio;
    if (!audio) {
      return;
    }
    audio.volume = volume / 100;
  }, [volume]);

  useEffect(() => {
    const audio = playerRef.current?.audio;
    if (!audio) {
      return;
    }

    const onLoadedMetadata = () => {
      applyStartPosition();
      if (!shouldAutoplay()) {
        setIsLoading(false);
      }
    };
    const onTime = () => {
      maybeSendProgress(false);
    };
    const onPause = () => {
      setIsPlaying(false);
      maybeSendProgress(true);
    };
    const onPlay = () => {
      setIsPlaying(true);
      setIsLoading(false);
    };
    const onEnded = () => {
      setIsPlaying(false);
      setIsLoading(false);
      maybeSendProgress(true);
      if (sleepModeRef.current === 'chapter') {
        setSleepValue('0');
        clearSleepTimer();
      }
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  useEffect(() => {
    if (!playerRef.current) {
      return;
    }

    if (!mediaItemId || !apiKey || !baseUrl) {
      setStatusMessage('Missing playback settings.');
      return;
    }

    initialPositionLockedRef.current = startPosition > 0;
    if (initialPositionLockedRef.current) {
      pendingStartPositionRef.current = startPosition;
    }

    playerRef.current.configure({ mediaItemId, apiKey, baseUrl });
    ensureProgressService();
    ensureDownloadsStore();
    updateProgressSubscription();
    requestProgressUpdate();

    const load = async () => {
      setStatusMessage('Loading audio...');
      setIsLoading(true);
      try {
        const loadedLocal = await loadLocalAudio();
        if (!loadedLocal) {
          await playerRef.current?.startStream();
        }
        applyStartPosition();
      } catch {
        setIsLoading(false);
      }
    };
    void load();

    return () => {
      playerRef.current?.abort();
      playerRef.current?.revokeLocalUrl();
      teardownProgressSubscription();
      clearSleepTimer();
      hasAppliedStartPositionRef.current = false;
      pendingStartPositionRef.current = null;
      pendingProgressRatioRef.current = null;
    };
  }, [mediaItemId, apiKey, baseUrl]);

  useEffect(() => {
    const storedVolume = readStoredValue('inaudible.player.volume');
    if (storedVolume) {
      const storedNumber = Number(storedVolume);
      if (Number.isFinite(storedNumber)) {
        const clamped = Math.min(Math.max(storedNumber, 0), 100);
        setVolume(clamped);
      }
    }

    const storedSleep = readStoredValue('inaudible.player.sleep');
    if (storedSleep && storedSleep !== '0') {
      setSleepValue(storedSleep);
      if (storedSleep === 'chapter') {
        setSleepChapterMode();
      } else {
        const seconds = Number(storedSleep);
        if (Number.isFinite(seconds) && seconds > 0) {
          setSleepTimer(seconds);
        }
      }
    }
  }, []);

  const handlePlayClick = () => {
    const audio = playerRef.current?.audio;
    if (!audio) {
      return;
    }
    if (isLoading && audio.paused) {
      playerRef.current?.abort();
      setIsLoading(false);
      setStatusMessage('');
      return;
    }
    if (audio.paused) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  };

  const handleRootClick = () => {
    closeAllPopovers();
  };

  const handleVolumeClick = (event: MouseEvent) => {
    event.stopPropagation();
    setVolumeOpen((open) => !open);
    setSleepOpen(false);
    setChapterOpen(false);
  };

  const handleSleepClick = (event: MouseEvent) => {
    event.stopPropagation();
    setSleepOpen((open) => !open);
    setVolumeOpen(false);
    setChapterOpen(false);
  };

  const handleChapterClick = (event: MouseEvent) => {
    event.stopPropagation();
    setChapterOpen((open) => !open);
    setVolumeOpen(false);
    setSleepOpen(false);
  };

  const handleVolumeInput = (event: Event) => {
    const value = Number((event.target as HTMLInputElement).value);
    if (Number.isFinite(value)) {
      const clamped = Math.min(Math.max(value, 0), 100);
      setVolume(clamped);
      storeValue('inaudible.player.volume', String(clamped));
    }
  };

  const handleSleepChange = (event: Event) => {
    const value = (event.target as HTMLSelectElement).value;
    setSleepValue(value);
    storeValue('inaudible.player.sleep', value);
    if (value === 'chapter') {
      setSleepChapterMode();
      return;
    }
    const seconds = Number(value);
    if (!Number.isFinite(seconds) || seconds <= 0) {
      clearSleepTimer();
      return;
    }
    setSleepTimer(seconds);
  };

  const handleChapterChange = (event: Event) => {
    const nextIndex = Number((event.target as HTMLSelectElement).value);
    if (Number.isFinite(nextIndex) && nextIndex >= 0) {
      playerRef.current?.playTrackAtIndex(nextIndex);
    }
  };

  const handleSeek = (time: number, isFinal: boolean) => {
    const audio = playerRef.current?.audio;
    if (!audio) {
      return;
    }
    isSeekingRef.current = !isFinal;
    audio.currentTime = time;
    if (isFinal) {
      isSeekingRef.current = false;
    }
  };

  const handleBackClick = () => playerRef.current?.seekBy(-10);
  const handleForwardClick = () => playerRef.current?.seekBy(10);
  const handlePrevChapterClick = () => playerRef.current?.switchChapter(-1);
  const handleNextChapterClick = () => playerRef.current?.switchChapter(1);
  const handleCloseClick = () => {
    playerRef.current?.abort();
    const audio = playerRef.current?.audio;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setIsLoading(false);
    setIsPlaying(false);
    onClose?.();
  };

  const canGoPrev = currentTrackIndex > 0;
  const canGoNext = trackList.length > 0 && currentTrackIndex < trackList.length - 1;

  return (
    <div className="inaudible-audiobook-player">
      <style>{css}</style>
      <div className="player" onClick={handleRootClick}>
        <div className="player-main">
          <button className="player-close" type="button" onClick={handleCloseClick}>
            <adw-icon style="width: 1.4em; height: 1.4em;">
              <img src={closeIcon} alt="Close player" />
            </adw-icon>
          </button>
          <img className="player-cover" src={coverUrl} alt="Book cover" />
          <div className="player-content">
            <div className="player-meta">
              <div className="player-title">{title}</div>
              <div className="player-author">{author}</div>
            </div>
            <div className="player-controls">
              <div className="player-controls-inner">
                <div className="player-buttons">
                  <button type="button" className="player-chapter-button" onClick={handlePrevChapterClick} disabled={!canGoPrev || isLoading}>
                    <adw-icon style="width: 1.4em; height: 1.4em;">
                      <img src={backIcon} alt="Previous Chapter" />
                    </adw-icon>
                  </button>
                  <button type="button" onClick={handleBackClick} disabled={isLoading}>
                    <adw-icon style="width: 1.4em; height: 1.4em;">
                      <img src={backTenIcon} alt="Back 10s" />
                    </adw-icon>
                  </button>
                  <button type="button" className="player-play" onClick={handlePlayClick}>
                    {isLoading ? (
                      <adw-spinner aria-hidden="true" />
                    ) : isPlaying ? (
                      <adw-icon style="width: 1.4em; height: 1.4em;">
                        <img src={pauseIcon} alt="Pause" />
                      </adw-icon>
                    ) : (
                      <adw-icon style="width: 1.4em; height: 1.4em;">
                        <img src={playIcon} alt="Play" />
                      </adw-icon>
                    )}
                  </button>
                  <button type="button" onClick={handleForwardClick} disabled={isLoading}>
                    <adw-icon style="width: 1.4em; height: 1.4em;">
                      <img src={forwardTenIcon} alt="Forward 10s" />
                    </adw-icon>
                  </button>
                  <button type="button" className="player-chapter-button" onClick={handleNextChapterClick} disabled={!canGoNext || isLoading}>
                    <adw-icon style="width: 1.4em; height: 1.4em;">
                      <img src={forwardIcon} alt="Next Chapter" />
                    </adw-icon>
                  </button>
                </div>
                <div className="player-bottom-bar">
                  <div className="player-popover">
                    <button type="button" onClick={handleVolumeClick} disabled={isLoading}>
                      <adw-icon style="width: 1.4em; height: 1.4em;">
                        <img src={volumeIcon} alt="volume" />
                      </adw-icon>
                    </button>
                    <div className={`player-popover-panel ${volumeOpen ? 'open' : ''}`} onClick={(event) => event.stopPropagation()}>
                      <label className="player-volume">
                        <span>Volume</span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          value={volume}
                          onInput={handleVolumeInput}
                        />
                      </label>
                    </div>
                  </div>
                  <div className="player-popover">
                    <button type="button" onClick={handleSleepClick} disabled={isLoading}>
                      <adw-icon style="width: 1.4em; height: 1.4em;">
                          <img src={alarmIcon} alt="Sleep Timer" />
                        </adw-icon>
                    </button>
                    <div className={`player-popover-panel ${sleepOpen ? 'open' : ''}`} onClick={(event) => event.stopPropagation()}>
                      <label className="player-sleep">
                        <span>Sleep timer</span>
                      <select value={sleepValue} onChange={handleSleepChange} disabled={isLoading}>
                          {sleepOptions.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                        <span className="player-sleep-status">{sleepLabel || 'Sleep off'}</span>
                      </label>
                    </div>
                  </div>
                  <div className="player-popover">
                    <button type="button" onClick={handleChapterClick} disabled={isLoading}>
                    <adw-icon style="width: 1.4em; height: 1.4em;">
                      <img src={chaptersIcon} alt="Chapters" />
                    </adw-icon></button>
                    <div className={`player-popover-panel ${chapterOpen ? 'open' : ''}`} onClick={(event) => event.stopPropagation()}>
                      <label className="player-chapters">
                        <span>Chapters</span>
                        <select value={String(currentTrackIndex)} disabled={trackList.length === 0 || isLoading} onChange={handleChapterChange}>
                          {trackList.length === 0 && <option value="-1">Chapters unavailable</option>}
                          {trackList.map((track, index) => {
                            const title = track?.title || track?.name || track?.metadata?.title;
                            return (
                              <option key={String(index)} value={String(index)}>
                                {title ? `Chapter ${index + 1}: ${title}` : `Chapter ${index + 1}`}
                              </option>
                            );
                          })}
                        </select>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <PlayerTrack
          audio={playerRef.current?.audio ?? null}
          chapterLabel={chapterLabel}
          sleepLabel={sleepLabel}
          onSeek={handleSeek}
          onTimeUpdate={onTimeUpdate}
        />
        <div className="player-status">{statusMessage}</div>
      </div>
    </div>
  );
};
