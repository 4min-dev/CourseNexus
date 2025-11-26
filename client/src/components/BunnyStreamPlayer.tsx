import { useEffect, useMemo, useRef, useState } from "react";

interface BunnyStreamPlayerProps {
  src: string;
  userEmail?: string;
  onProgress?: (currentTime: number, duration: number) => void;
  onProgressSave?: (watchedSeconds: number) => void;
  onComplete?: () => void;
}

interface BunnyStreamMessage {
  type: string;
  currentTime?: number;
  duration?: number;
}

const ALLOWED_ORIGINS = ["mediadelivery.net", "b-cdn.net", "bunnycdn.com"];

function isAllowedOrigin(origin: string) {
  return ALLOWED_ORIGINS.some((host) => origin.includes(host));
}

function normalizeMessage(data: unknown): BunnyStreamMessage | null {
  const payload = typeof data === "string" ? (() => {
    try {
      return JSON.parse(data);
    } catch (_error) {
      return null;
    }
  })() : data;

  if (!payload || typeof payload !== "object") return null;

  const type = (payload as Record<string, unknown>).type ?? (payload as Record<string, unknown>).event;
  if (typeof type !== "string") return null;

  const currentTime = (payload as Record<string, unknown>).currentTime ??
    (payload as { data?: { currentTime?: number } }).data?.currentTime;
  const duration = (payload as Record<string, unknown>).duration ??
    (payload as { data?: { duration?: number } }).data?.duration;

  return { type, currentTime: typeof currentTime === "number" ? currentTime : undefined, duration: typeof duration === "number" ? duration : undefined };
}

export function isBunnyStreamUrl(src: string) {
  return /mediadelivery\.net|b-cdn\.net|bunnycdn\.com/.test(src);
}

export default function BunnyStreamPlayer({ src, userEmail, onProgress, onProgressSave, onComplete }: BunnyStreamPlayerProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const lastSavedTimeRef = useRef(0);

  const sanitizedSrc = useMemo(() => {
    // Ensure the iframe always has allowfullscreen-capable URL
    const url = new URL(src, window.location.origin);
    if (!url.searchParams.has("autoplay")) url.searchParams.set("autoplay", "0");
    if (!url.searchParams.has("muted")) url.searchParams.set("muted", "0");
    if (!url.searchParams.has("controls")) url.searchParams.set("controls", "1");
    return url.toString();
  }, [src]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!isAllowedOrigin(event.origin)) return;

      const payload = normalizeMessage(event.data);
      if (!payload) return;

      const { type, currentTime: time, duration: incomingDuration } = payload;

      if (incomingDuration && incomingDuration !== duration) {
        setDuration(incomingDuration);
      }

      switch (type) {
        case "ready":
        case "playerReady":
          setIsReady(true);
          break;
        case "play":
        case "playing":
          setIsPlaying(true);
          break;
        case "pause":
          setIsPlaying(false);
          break;
        case "timeupdate":
          if (typeof time === "number") {
            setCurrentTime(time);
            if (onProgress) {
              onProgress(time, incomingDuration ?? duration ?? 0);
            }
            if (onProgressSave) {
              const rounded = Math.floor(time);
              if (rounded > 0 && rounded !== lastSavedTimeRef.current) {
                lastSavedTimeRef.current = rounded;
                onProgressSave(rounded);
              }
            }
          }
          break;
        case "ended":
          setIsPlaying(false);
          if (onComplete) onComplete();
          break;
        default:
          break;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [duration, onComplete, onProgress, onProgressSave]);

  return (
    <div className="relative w-full bg-black rounded-lg overflow-hidden group select-none" data-testid="video-player">
      <div className="relative aspect-video">
        <iframe
          key={sanitizedSrc}
          ref={frameRef}
          src={sanitizedSrc}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          title="Bunny Stream Player"
        />

        {!isReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white text-sm">
            Загрузка плеера...
          </div>
        )}

        {userEmail && (
          <div className="absolute top-4 right-4 px-3 py-1 bg-black/30 text-white/40 text-xs font-mono rounded select-none pointer-events-none">
            {userEmail}
          </div>
        )}
      </div>

      <div className="px-4 py-3 text-sm text-white/70 flex items-center justify-between bg-gradient-to-t from-black/70 via-black/30 to-transparent">
        <span>
          {isPlaying ? "Воспроизведение" : "Пауза"}
        </span>
        <span>
          {Math.floor(currentTime)} с / {Math.ceil(duration)} с
        </span>
      </div>
    </div>
  );
}
