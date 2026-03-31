import { useEffect, useRef, useState } from 'react';
import { debugLog } from '@/lib/debug';

interface AmbientColor {
  r: number;
  g: number;
  b: number;
}

type VideoFrameCallbackHandle = number;
type VideoFrameCallback = (now: number, metadata: any) => void;
type VideoWithFrameCallback = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: VideoFrameCallback) => VideoFrameCallbackHandle;
  cancelVideoFrameCallback?: (handle: VideoFrameCallbackHandle) => void;
};

export function useVideoAmbientLight(videoRef: React.RefObject<HTMLVideoElement>, enabled: boolean = true) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ambientColor, setAmbientColor] = useState<AmbientColor>({ r: 139, g: 92, b: 246 }); // Default purple
  const animationFrameRef = useRef<number | null>(null);
  const videoFrameCbRef = useRef<VideoFrameCallbackHandle | null>(null);
  const lastSampleTsRef = useRef<number>(0);
  const isInViewRef = useRef<boolean>(true);
  const lastColorRef = useRef<AmbientColor>(ambientColor);

  useEffect(() => {
    if (!enabled || !videoRef.current) return;

    const video = videoRef.current as VideoWithFrameCallback;
    
    // Create hidden canvas for color sampling
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
      canvasRef.current.width = 64; // Small size for performance
      canvasRef.current.height = 36;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    let isActive = true;
    const TARGET_FPS = 12;
    const MIN_SAMPLE_DELTA_MS = 1000 / TARGET_FPS;

    const stop = () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (videoFrameCbRef.current !== null && video.cancelVideoFrameCallback) {
        try {
          video.cancelVideoFrameCallback(videoFrameCbRef.current);
        } catch {
          // ignore
        }
        videoFrameCbRef.current = null;
      }
    };

    const shouldRun = () => {
      if (!isActive) return false;
      if (!enabled) return false;
      if (!video) return false;
      if (document.visibilityState !== 'visible') return false;
      if (!isInViewRef.current) return false;
      if (video.paused || video.ended) return false;
      return true;
    };

    const maybeSetColor = (next: AmbientColor) => {
      const prev = lastColorRef.current;
      const diff = Math.abs(prev.r - next.r) + Math.abs(prev.g - next.g) + Math.abs(prev.b - next.b);
      // Avoid re-render storms; tiny diffs don't matter visually.
      if (diff < 10) return;
      lastColorRef.current = next;
      setAmbientColor(next);
    };

    const extractColors = (now: number) => {
      if (!shouldRun()) return;
      const last = lastSampleTsRef.current || 0;
      if (now - last < MIN_SAMPLE_DELTA_MS) return;
      lastSampleTsRef.current = now;

      try {
        // Draw current video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Get image data from edges (where ambilight typically samples)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        let r = 0, g = 0, b = 0;
        let count = 0;
        
        // Sample edge pixels for more vibrant colors
        const sampleSize = 4; // Sample every 4th pixel for performance
        for (let i = 0; i < data.length; i += sampleSize * 4) {
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count++;
        }
        
        // Calculate average color
        if (count > 0) {
          const avgR = Math.round(r / count);
          const avgG = Math.round(g / count);
          const avgB = Math.round(b / count);
          
          // Boost saturation for more vibrant ambient light
          const boost = 1.3; // Saturation boost factor
          
          maybeSetColor({
            r: Math.min(255, Math.round(avgR * boost)),
            g: Math.min(255, Math.round(avgG * boost)),
            b: Math.min(255, Math.round(avgB * boost))
          });
        }
      } catch (error) {
        // Silently handle CORS or other errors
        debugLog('[Ambient Light] Sampling error:', error);
      }
    };

    const scheduleNext = () => {
      if (!shouldRun()) return;

      if (video.requestVideoFrameCallback) {
        videoFrameCbRef.current = video.requestVideoFrameCallback((now) => {
          extractColors(now);
          scheduleNext();
        });
        return;
      }

      animationFrameRef.current = requestAnimationFrame((ts) => {
        extractColors(ts);
        scheduleNext();
      });
    };

    // Start color extraction when video is playing
    const handlePlay = () => {
      stop();
      lastSampleTsRef.current = 0;
      scheduleNext();
    };

    const handlePause = () => {
      stop();
    };

    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') {
        stop();
        return;
      }
      // If tab becomes visible and video is playing, resume.
      if (!video.paused && !video.ended) {
        stop();
        scheduleNext();
      }
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handlePause);
    document.addEventListener('visibilitychange', handleVisibility);

    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          isInViewRef.current = !!entry?.isIntersecting;
          if (isInViewRef.current) {
            // Resume if it should be running.
            if (!video.paused && !video.ended) {
              stop();
              scheduleNext();
            }
          } else {
            stop();
          }
        },
        { root: null, threshold: 0.01, rootMargin: '200px' }
      );
      try {
        io.observe(video);
      } catch {
        // ignore
      }
    }

    // Start if already playing
    if (!video.paused) {
      scheduleNext();
    }

    return () => {
      isActive = false;
      stop();
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handlePause);
      document.removeEventListener('visibilitychange', handleVisibility);
      io?.disconnect();
    };
  }, [videoRef, enabled]);

  return ambientColor;
}
