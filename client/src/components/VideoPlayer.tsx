import { useRef, useEffect, useState } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import BunnyStreamPlayer, { isBunnyStreamUrl } from "@/components/BunnyStreamPlayer";

interface VideoPlayerProps {
  src: string;
  onProgress?: (currentTime: number, duration: number) => void;
  onProgressSave?: (watchedSeconds: number) => void; // Callback for saving progress periodically
  onComplete?: () => void;
  userEmail?: string;
  initialTime?: number; // Starting position in seconds
}

export function VideoPlayer({ src, onProgress, onProgressSave, onComplete, userEmail, initialTime = 0 }: VideoPlayerProps) {
  const useBunnyPlayer = isBunnyStreamUrl(src);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const lastSavedTimeRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(false);

  // Don't auto-restore position - it causes buffering issues
  // User can manually seek if needed
  // TODO: Consider restoring only after user clicks play and video starts playing

  // Helper function to save current progress
  const saveCurrentProgress = () => {
    const video = videoRef.current;
    if (!video || !onProgressSave) return;

    const currentSeconds = Math.floor(video.currentTime);
    // Only save if time has changed and is greater than 0
    if (currentSeconds > 0 && currentSeconds !== lastSavedTimeRef.current) {
      lastSavedTimeRef.current = currentSeconds;
      onProgressSave(currentSeconds);
    }
  };

  // Periodic progress saving (every 5 seconds while playing)
  useEffect(() => {
    if (useBunnyPlayer) return;

    if (!onProgressSave) return;

    const interval = setInterval(() => {
      if (isPlaying) {
        saveCurrentProgress();
      }
    }, 5000); // Save every 5 seconds

    return () => clearInterval(interval);
  }, [isPlaying, onProgressSave, useBunnyPlayer]);

  // Save progress when component unmounts
  useEffect(() => {
    if (useBunnyPlayer) return;

    return () => {
      saveCurrentProgress();
    };
  }, [onProgressSave, useBunnyPlayer]);

  useEffect(() => {
    if (useBunnyPlayer) return;

    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (onProgress) {
        onProgress(video.currentTime, video.duration);
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      console.log('[Video] Metadata loaded:', {
        duration: video.duration,
        readyState: video.readyState,
        networkState: video.networkState,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight
      });
    };

    const handleEnded = () => {
      setIsPlaying(false);
      // Save progress before completing
      saveCurrentProgress();
      if (onComplete) {
        onComplete();
      }
    };

    const handlePlay = () => {
      setIsPlaying(true);
      isPlayingRef.current = true;
      console.log('[Video] PLAY event - currentTime:', video.currentTime.toFixed(2), 'readyState:', video.readyState);
    };

    const handlePause = () => {
      setIsPlaying(false);
      isPlayingRef.current = false;
      setIsBuffering(false); // Clear buffering overlay on pause
      // Save progress when video is paused
      saveCurrentProgress();
    };

    const handlePlaying = () => {
      // Video is actually playing (buffering complete)
      console.log('[Video] Playing - buffering complete');
      setIsBuffering(false);
    };

    const handleWaiting = () => {
      const video = videoRef.current;
      if (!video) return;

      console.log('[Video] WAITING event - currentTime:', video.currentTime.toFixed(2), 'readyState:', video.readyState, 'networkState:', video.networkState, 'isPlaying:', isPlayingRef.current);

      // Only show buffering if video is currently playing (user expects playback)
      // Don't show buffering during initial load or when paused
      if (isPlayingRef.current && video.readyState < 3) {
        console.log('[Video] Buffering started... (readyState:', video.readyState, ')');
        setIsBuffering(true);
      }
    };

    const handleCanPlay = () => {
      console.log('[Video] Can play - buffering complete');
      setIsBuffering(false);
    };

    const handleSeeked = () => {
      // Clear buffering after seek completes
      setIsBuffering(false);
    };

    const handleError = (e: Event) => {
      console.error('[Video] Error:', e);
      setIsBuffering(false);
      setIsPlaying(false);
    };

    const handleStalled = () => {
      const video = videoRef.current;
      if (!video) return;
      console.warn('[Video] STALLED event - currentTime:', video.currentTime.toFixed(2), 'readyState:', video.readyState, 'networkState:', video.networkState);
    };

    const handleProgress = () => {
      // Progress event - buffering data is available
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("playing", handlePlaying);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("canplaythrough", handleCanPlay);
    video.addEventListener("seeked", handleSeeked);
    video.addEventListener("error", handleError);
    video.addEventListener("stalled", handleStalled);
    video.addEventListener("progress", handleProgress);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("playing", handlePlaying);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("canplaythrough", handleCanPlay);
      video.removeEventListener("seeked", handleSeeked);
      video.removeEventListener("error", handleError);
      video.removeEventListener("stalled", handleStalled);
      video.removeEventListener("progress", handleProgress);
    };
  }, [onComplete, onProgress, useBunnyPlayer]);

  useEffect(() => {
    if (useBunnyPlayer) return;

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [useBunnyPlayer]);

  if (useBunnyPlayer) {
    return (
      <BunnyStreamPlayer
        src={src}
        userEmail={userEmail}
        onProgress={onProgress}
        onProgressSave={onProgressSave}
        onComplete={onComplete}
      />
    );
  }

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
      isPlayingRef.current = false;
    } else {
      try {
        await video.play();
        setIsPlaying(true);
        isPlayingRef.current = true;
      } catch (error) {
        console.error('Play error:', error);
        setIsPlaying(false);
        isPlayingRef.current = false;
      }
    }
  };

  const handleSeek = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  const handleVolumeChange = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;
    const newVolume = value[0];
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isMuted) {
      video.volume = volume || 0.5;
      setIsMuted(false);
    } else {
      video.volume = 0;
      setIsMuted(true);
    }
  };

  const toggleFullscreen = async () => {
    const container = containerRef.current;
    if (!container) return;

    if (!isFullscreen) {
      await container.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Защита от копирования видео
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    return false;
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.preventDefault();
    return false;
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-black rounded-lg overflow-hidden group select-none"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
      onContextMenu={handleContextMenu}
      data-testid="video-player"
    >
      <video
        ref={videoRef}
        src={src.replace('processed', 'vkurse/processed')}
        className="w-full aspect-video"
        onClick={togglePlay}
        preload="auto"
        playsInline
        controlsList="nodownload nofullscreen noremoteplayback"
        disablePictureInPicture
        onContextMenu={handleContextMenu}
        onDragStart={handleDragStart}
        data-testid="video-element"
        style={{ backgroundColor: '#000', pointerEvents: 'auto' }}
      />

      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
            <span className="text-white text-sm">Загрузка...</span>
          </div>
        </div>
      )}

      {userEmail && (
        <div className="absolute top-4 right-4 px-3 py-1 bg-black/30 text-white/40 text-xs font-mono rounded select-none pointer-events-none">
          {userEmail}
        </div>
      )}

      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0"
          }`}
      >
        <div className="space-y-2">
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={0.1}
            onValueChange={handleSeek}
            className="cursor-pointer"
            data-testid="video-progress-slider"
          />

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                onClick={togglePlay}
                className="text-white hover:bg-white/20"
                data-testid="button-play-pause"
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={toggleMute}
                  className="text-white hover:bg-white/20"
                  data-testid="button-mute"
                >
                  {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </Button>
                <div className="w-24">
                  <Slider
                    value={[isMuted ? 0 : volume]}
                    max={1}
                    step={0.01}
                    onValueChange={handleVolumeChange}
                    className="cursor-pointer"
                    data-testid="video-volume-slider"
                  />
                </div>
              </div>

              <span className="text-sm text-white" data-testid="video-time">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <Button
              size="icon"
              variant="ghost"
              onClick={toggleFullscreen}
              className="text-white hover:bg-white/20"
              data-testid="button-fullscreen"
            >
              {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}