'use client';

import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  RotateCw, 
  Maximize, 
  Minimize, 
  Volume2, 
  VolumeX, 
  Lock, 
  Unlock, 
  Settings, 
  SkipForward,
  ArrowLeft
} from 'lucide-react';
import { db } from '@/lib/db';
import { useSettingsStore } from '@/lib/store';

interface VideoPlayerProps {
  streamUrl?: string;
  blobUrl?: string;
  title: string;
  episodeTitle: string;
  episodeNumber: number;
  showSlug: string;
  videoCode: string;
  poster: string;
  initialTime?: number;
  onNextEpisode?: () => void;
  hasNextEpisode?: boolean;
  onBack?: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  streamUrl,
  blobUrl,
  title,
  episodeTitle,
  episodeNumber,
  showSlug,
  videoCode,
  poster,
  initialTime = 0,
  onNextEpisode,
  hasNextEpisode = false,
  onBack
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isScreenLocked, setIsScreenLocked] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [qualityLevels, setQualityLevels] = useState<Array<{ id: number; height: number; bitrate: number }>>([]);
  const [currentQuality, setCurrentQuality] = useState<number>(-1); // -1 = Auto
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showNextPrompt, setShowNextPrompt] = useState(false);
  const [nextCountdown, setNextCountdown] = useState(10);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const hideControlsWithDelay = () => {
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !isScreenLocked) {
        setShowControls(false);
      }
    }, 4000);
  };

  const handleUserActivity = () => {
    setShowControls(true);
    hideControlsWithDelay();
  };

  // Initialize playback
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Offline Blob Playback
    if (blobUrl) {
      video.src = blobUrl;
      video.play().catch(() => setIsPlaying(false));
      return;
    }

    // Online HLS Playback
    if (streamUrl) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 90
        });

        hls.loadSource(streamUrl);
        hls.attachMedia(video);
        hlsRef.current = hls;

        hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
          const levels = data.levels.map((lvl, idx) => ({
            id: idx,
            height: lvl.height,
            bitrate: lvl.bitrate
          }));
          setQualityLevels(levels);

          if (initialTime > 0) {
            video.currentTime = initialTime;
          }
          video.play().catch(() => setIsPlaying(false));
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                hls.destroy();
                break;
            }
          }
        });

        return () => {
          hls.destroy();
          hlsRef.current = null;
        };
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native Safari / iOS support
        video.src = streamUrl;
        if (initialTime > 0) video.currentTime = initialTime;
        video.play().catch(() => setIsPlaying(false));
      }
    }
  }, [streamUrl, blobUrl, initialTime]);

  // Sync playback progress to DB
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      const cur = video.currentTime;
      const dur = video.duration || 0;
      setCurrentTime(cur);
      setDuration(dur);

      // Check if near end for next episode prompt
      if (dur > 0 && cur / dur >= 0.92 && hasNextEpisode) {
        setShowNextPrompt(true);
      }
    };

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);

    // Save to Watch History periodically
    const syncInterval = setInterval(() => {
      if (video.currentTime > 5 && video.duration > 0) {
        const progress = Math.round((video.currentTime / video.duration) * 100);
        db.history.put({
          id: videoCode,
          showSlug,
          showTitle: title,
          episodeTitle,
          episodeNumber,
          poster,
          currentTime: video.currentTime,
          duration: video.duration,
          progress,
          lastWatched: Date.now()
        });
      }
    }, 5000);

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      clearInterval(syncInterval);
    };
  }, [videoCode, showSlug, title, episodeTitle, episodeNumber, poster, hasNextEpisode]);

  // Handle Play/Pause
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  };

  // Seek +/- 10 seconds
  const seekRelative = (sec: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + sec));
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Quality switch
  const selectQuality = (levelIndex: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIndex;
      setCurrentQuality(levelIndex);
      setShowQualityMenu(false);
    }
  };

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleUserActivity}
      onTouchStart={handleUserActivity}
      className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl group select-none"
    >
      <video
        ref={videoRef}
        playsInline
        className="w-full h-full object-contain cursor-pointer"
        onClick={() => {
          if (!isScreenLocked) togglePlay();
        }}
      />

      {/* Screen Locked Badge */}
      {isScreenLocked && (
        <div className="absolute top-6 left-6 z-30">
          <button
            onClick={() => setIsScreenLocked(false)}
            className="flex items-center gap-2 bg-amber-500 text-slate-950 font-black px-4 py-2.5 rounded-2xl shadow-xl active:scale-95 transition-transform"
          >
            <Unlock className="w-5 h-5 stroke-[2.5]" />
            <span>Unlock Screen</span>
          </button>
        </div>
      )}

      {/* Main Overlay Controls */}
      {showControls && !isScreenLocked && (
        <div className="absolute inset-0 z-20 flex flex-col justify-between p-4 sm:p-6 bg-gradient-to-t from-black/80 via-black/20 to-black/80 transition-opacity duration-300">
          {/* Top Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-2.5 rounded-2xl bg-black/50 hover:bg-black/80 text-white backdrop-blur-md active:scale-95 transition-all"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <div>
                <h3 className="font-extrabold text-white text-base sm:text-lg drop-shadow">
                  {episodeTitle || title}
                </h3>
                <p className="text-xs text-amber-300 font-bold drop-shadow">
                  {title} • Hindi Dubbed
                </p>
              </div>
            </div>

            {/* Quality & Screen Lock Options */}
            <div className="flex items-center gap-2 relative">
              <button
                onClick={() => setIsScreenLocked(true)}
                className="p-2.5 rounded-2xl bg-black/50 hover:bg-black/80 text-white backdrop-blur-md active:scale-95 transition-all"
                title="Lock Screen for Kids"
              >
                <Lock className="w-5 h-5" />
              </button>

              {qualityLevels.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShowQualityMenu(!showQualityMenu)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-black/50 hover:bg-black/80 text-white text-xs font-bold backdrop-blur-md active:scale-95 transition-all"
                  >
                    <Settings className="w-4 h-4 text-amber-400" />
                    <span>
                      {currentQuality === -1 ? 'Auto' : `${qualityLevels[currentQuality]?.height}p`}
                    </span>
                  </button>

                  {showQualityMenu && (
                    <div className="absolute right-0 top-12 bg-slate-900 border border-slate-700 rounded-2xl p-2 min-w-[140px] shadow-2xl z-30">
                      <button
                        onClick={() => selectQuality(-1)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold ${
                          currentQuality === -1 ? 'bg-amber-400 text-slate-950' : 'text-white hover:bg-slate-800'
                        }`}
                      >
                        Auto (Adaptive)
                      </button>
                      {qualityLevels.map((lvl) => (
                        <button
                          key={lvl.id}
                          onClick={() => selectQuality(lvl.id)}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold ${
                            currentQuality === lvl.id ? 'bg-amber-400 text-slate-950' : 'text-white hover:bg-slate-800'
                          }`}
                        >
                          {lvl.height}p HD
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Center Playback Controls */}
          <div className="flex items-center justify-center gap-6 sm:gap-10">
            <button
              onClick={() => seekRelative(-10)}
              className="p-3 sm:p-4 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md active:scale-90 transition-all"
              title="Rewind 10 seconds"
            >
              <RotateCcw className="w-6 h-6 sm:w-8 sm:h-8" />
            </button>

            <button
              onClick={togglePlay}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 text-slate-950 flex items-center justify-center shadow-2xl active:scale-90 hover:scale-105 transition-all"
            >
              {isPlaying ? (
                <Pause className="w-8 h-8 sm:w-10 sm:h-10 fill-current" />
              ) : (
                <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-current ml-1" />
              )}
            </button>

            <button
              onClick={() => seekRelative(10)}
              className="p-3 sm:p-4 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md active:scale-90 transition-all"
              title="Forward 10 seconds"
            >
              <RotateCw className="w-6 h-6 sm:w-8 sm:h-8" />
            </button>
          </div>

          {/* Bottom Bar: Timeline & Controls */}
          <div>
            {/* Progress Slider */}
            <div className="relative mb-3 flex items-center">
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (videoRef.current) videoRef.current.currentTime = val;
                }}
                className="w-full h-2 bg-slate-700/80 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>

            <div className="flex items-center justify-between text-white text-xs font-bold">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    const video = videoRef.current;
                    if (video) {
                      video.muted = !video.muted;
                      setIsMuted(video.muted);
                    }
                  }}
                  className="hover:text-amber-400 transition-colors"
                >
                  {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <span>
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {hasNextEpisode && onNextEpisode && (
                  <button
                    onClick={onNextEpisode}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-black hover:bg-amber-300 transition-colors"
                  >
                    <span>Next Ep</span>
                    <SkipForward className="w-4 h-4 fill-current" />
                  </button>
                )}
                <button
                  onClick={toggleFullscreen}
                  className="hover:text-amber-400 transition-colors p-1"
                >
                  {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Next Episode Auto-prompt overlay */}
      {showNextPrompt && hasNextEpisode && onNextEpisode && (
        <div className="absolute bottom-16 right-6 z-30 bg-slate-900/90 border border-amber-400/50 rounded-2xl p-4 backdrop-blur-md shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom">
          <div>
            <h4 className="text-xs font-bold text-amber-400">Up Next</h4>
            <p className="text-sm font-extrabold text-white">Next Episode starting...</p>
          </div>
          <button
            onClick={() => {
              setShowNextPrompt(false);
              onNextEpisode();
            }}
            className="px-4 py-2 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black text-xs rounded-xl shadow-lg active:scale-95"
          >
            Play Now
          </button>
        </div>
      )}
    </div>
  );
};

