import { useEffect, useRef, useState } from 'react';

interface AmbientColor {
  r: number;
  g: number;
  b: number;
}

export function useVideoAmbientLight(videoRef: React.RefObject<HTMLVideoElement>, enabled: boolean = true) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ambientColor, setAmbientColor] = useState<AmbientColor>({ r: 139, g: 92, b: 246 }); // Default purple
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    if (!enabled || !videoRef.current) return;

    const video = videoRef.current;
    
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

    const extractColors = () => {
      if (!isActive || !video || video.paused || video.ended) return;

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
          const max = Math.max(avgR, avgG, avgB);
          const boost = 1.3; // Saturation boost factor
          
          setAmbientColor({
            r: Math.min(255, Math.round(avgR * boost)),
            g: Math.min(255, Math.round(avgG * boost)),
            b: Math.min(255, Math.round(avgB * boost))
          });
        }
      } catch (error) {
        // Silently handle CORS or other errors
        console.log('[Ambient Light] Sampling error:', error);
      }

      // Continue sampling at ~30fps
      animationFrameRef.current = requestAnimationFrame(extractColors);
    };

    // Start color extraction when video is playing
    const handlePlay = () => {
      if (isActive) {
        extractColors();
      }
    };

    const handlePause = () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handlePause);

    // Start if already playing
    if (!video.paused) {
      extractColors();
    }

    return () => {
      isActive = false;
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handlePause);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [videoRef, enabled]);

  return ambientColor;
}
