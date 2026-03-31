import { useRef, useEffect, useMemo, useState } from "react"
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import BunnyStreamPlayer, { isBunnyStreamUrl } from "@/components/BunnyStreamPlayer"

interface VideoPlayerProps {
  className?: string
  src: string
  onProgress?: (currentTime: number, duration: number) => void
  onProgressSave?: (data: { watchedSeconds: number; completed?: boolean }) => void
  onComplete?: () => void
  userEmail?: string
  initialTime?: number
  key?: any
}

export function VideoPlayer({
  className = '',
  src,
  onProgress,
  onProgressSave,
  onComplete,
  userEmail,
  initialTime = 0,
  key
}: VideoPlayerProps) {
  const normalizedSrc = useMemo(() => {
    if (!src) return src
    if (src.includes("/vkurse/processed/")) return src
    return src.replace("/processed/", "/vkurse/processed/")
  }, [src])

  const useBunnyPlayer = isBunnyStreamUrl(src)
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [isBuffering, setIsBuffering] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [showSpeedControls, setShowSpeedControls] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [videoAspect, setVideoAspect] = useState<number | null>(null)

  const lastSavedTimeRef = useRef<number>(0)
  const stallRecoveryTimeoutRef = useRef<number | null>(null)

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream

  const clearStallRecoveryTimeout = () => {
    if (stallRecoveryTimeoutRef.current !== null) {
      window.clearTimeout(stallRecoveryTimeoutRef.current)
      stallRecoveryTimeoutRef.current = null
    }
  }

  const saveProgress = (completed = false) => {
    const video = videoRef.current
    if (!video || !onProgressSave) return

    const currentSeconds = Math.floor(video.currentTime)
    if (currentSeconds === lastSavedTimeRef.current) return

    lastSavedTimeRef.current = currentSeconds
    onProgressSave({
      watchedSeconds: currentSeconds,
      completed
    })
  }

  useEffect(() => {
    if (useBunnyPlayer || !onProgressSave) return

    const interval = setInterval(() => {
      if (isPlaying) saveProgress()
    }, 5000)

    return () => clearInterval(interval)
  }, [isPlaying, onProgressSave, useBunnyPlayer])

  useEffect(() => {
    if (useBunnyPlayer) return
    return () => saveProgress()
  }, [onProgressSave, useBunnyPlayer])

  useEffect(() => {
    if (useBunnyPlayer) return

    const video = videoRef.current
    if (video) video.playbackRate = playbackRate
  }, [playbackRate, useBunnyPlayer])

  useEffect(() => {
    if (useBunnyPlayer) return

    const video = videoRef.current
    if (!video) return

    const handleLoadedMetadata = () => {
      setDuration(video.duration)
      setIsReady(true)

      const aspect = video.videoWidth / video.videoHeight
      setVideoAspect(aspect)

      if (initialTime > 0 && initialTime < video.duration) {
        video.currentTime = initialTime
        setCurrentTime(initialTime)
      }
    }

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime)
      if (onProgress) onProgress(video.currentTime, video.duration)
    }

    const handleEnded = () => {
      setIsPlaying(false)
      saveProgress(true)
      if (onComplete) onComplete()
    }

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => {
      setIsPlaying(false)
      saveProgress()
    }

    const handlePlaying = () => setIsBuffering(false)
    const handleWaiting = () => setIsBuffering(true)
    const handleCanPlay = () => setIsBuffering(false)

    video.addEventListener("loadedmetadata", handleLoadedMetadata)
    video.addEventListener("timeupdate", handleTimeUpdate)
    video.addEventListener("ended", handleEnded)
    video.addEventListener("play", handlePlay)
    video.addEventListener("pause", handlePause)
    video.addEventListener("playing", handlePlaying)
    video.addEventListener("waiting", handleWaiting)
    video.addEventListener("canplay", handleCanPlay)

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata)
      video.removeEventListener("timeupdate", handleTimeUpdate)
      video.removeEventListener("ended", handleEnded)
      video.removeEventListener("play", handlePlay)
      video.removeEventListener("pause", handlePause)
      video.removeEventListener("playing", handlePlaying)
      video.removeEventListener("waiting", handleWaiting)
      video.removeEventListener("canplay", handleCanPlay)
    }
  }, [onComplete, onProgress, onProgressSave, useBunnyPlayer, initialTime])

  useEffect(() => {
    if (useBunnyPlayer) return

    const handleFullscreenChange = () => {
      setIsFullscreen(
        !!(
          document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).msFullscreenElement
        )
      )
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange)
    document.addEventListener("msfullscreenchange", handleFullscreenChange)
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange)
      document.removeEventListener("msfullscreenchange", handleFullscreenChange)
    }
  }, [useBunnyPlayer])

  const togglePlay = async () => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.pause()
      setIsPlaying(false)
    } else {
      try {
        await video.play()
        setIsPlaying(true)
      } catch { }
    }
  }

  const handleSeek = (value: number[]) => {
    const video = videoRef.current
    if (video) {
      video.currentTime = value[0]
      setCurrentTime(value[0])
    }
  }

  const handleVolumeChange = (value: number[]) => {
    const video = videoRef.current
    if (video) {
      const newVolume = value[0]
      video.volume = newVolume
      setVolume(newVolume)
      setIsMuted(newVolume === 0)
    }
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (video) {
      if (isMuted) {
        video.volume = volume || 0.5
        setIsMuted(false)
      } else {
        video.volume = 0
        setIsMuted(true)
      }
    }
  }

  const toggleFullscreen = async () => {
    const video = videoRef.current
    const container = containerRef.current
    if (!video || !container) return

    try {
      if (!isFullscreen) {

        if (isIOS && video.webkitEnterFullscreen) {
          // На iOS используем нативный полноэкранный режим для видео
          video.webkitEnterFullscreen()
        } else if (container.requestFullscreen) {
          await container.requestFullscreen()
        } else if ((container as any).webkitRequestFullscreen) {
          await (container as any).webkitRequestFullscreen()
        } else if ((container as any).msRequestFullscreen) {
          await (container as any).msRequestFullscreen()
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen()
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen()
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen()
        }
      }
    } catch { }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const formatPlaybackRate = (rate: number) => rate.toFixed(2).replace(/\.?0+$/, "") + "×"

  const aspectStyle = videoAspect
    ? videoAspect > 1
      ? { width: "100%", height: "auto" }
      : { width: "auto", height: "100%" }
    : { width: "100%", height: "100%" }

  return (
    <div
      ref={containerRef}
      className={`relative w-full bg-black rounded-lg overflow-hidden group select-none flex items-center justify-center ${className}`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <video
        key={key}
        ref={videoRef}
        src={normalizedSrc}
        className="max-w-full max-h-full object-contain"
        style={aspectStyle}
        onClick={togglePlay}
        preload="metadata"
        playsInline
        controlsList="nodownload nofullscreen noremoteplayback"
        disablePictureInPicture
      />

      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white" />
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
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 sm:p-4 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0"}`}
      >
        <div className="space-y-2">
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={0.1}
            onValueChange={handleSeek}
            className="cursor-pointer"
          />

          <div className="flex sm:items-center sm:justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              <Button size="icon" variant="ghost" onClick={togglePlay} className="text-white hover:bg-white/20">
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </Button>

              <div className="flex items-center gap-2">
                <Button size="icon" variant="ghost" onClick={toggleMute} className="text-white hover:bg-white/20">
                  {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </Button>
                <div className="w-16 sm:w-24">
                  <Slider
                    value={[isMuted ? 0 : volume]}
                    max={1}
                    step={0.01}
                    onValueChange={handleVolumeChange}
                    className="cursor-pointer"
                  />
                </div>
              </div>

              <span className="text-xs sm:text-sm text-white">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-2 relative">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowSpeedControls(!showSpeedControls)}
                className="text-white hover:bg-white/20 px-3 min-w-[60px] text-center"
              >
                {formatPlaybackRate(playbackRate)}
              </Button>

              {showSpeedControls && (
                <div className="absolute bottom-full right-0 mb-2 bg-black/90 rounded-lg p-3 shadow-xl border border-white/10 min-w-[220px]">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-white/70 w-12 text-right">
                      {formatPlaybackRate(playbackRate)}
                    </span>
                    <Slider
                      value={[playbackRate]}
                      min={1}
                      max={2}
                      step={0.25}
                      onValueChange={(value) => setPlaybackRate(value[0])}
                      className="w-40 cursor-pointer"
                    />
                  </div>
                </div>
              )}

              <Button size="icon" variant="ghost" onClick={toggleFullscreen} className="text-white hover:bg-white/20">
                {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}