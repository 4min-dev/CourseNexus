import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { InfoBanner } from "@shared/schema";
import { Terminal } from "lucide-react";

export function InfoBanner() {
  const { data: banners = [] } = useQuery<InfoBanner[]>({
    queryKey: ["/api/info-banners"],
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [showCursor, setShowCursor] = useState(false);

  const activeBanners = useMemo(() => banners.filter(b => b.isActive), [banners]);

  useEffect(() => {
    if (activeBanners.length === 0) return;

    const currentBanner = activeBanners[currentIndex];
    if (!currentBanner) return;

    setShowCursor(true);
    setDisplayedText("");

    let charIndex = 0;
    const typingSpeed = 75;
    const erasingSpeed = 50;
    const pauseBeforeErase = 4000;
    
    // Сохраняем все таймеры для правильной очистки
    let typingInterval: NodeJS.Timeout | null = null;
    let pauseTimeout: NodeJS.Timeout | null = null;
    let erasingInterval: NodeJS.Timeout | null = null;

    // Phase 1: Typing
    typingInterval = setInterval(() => {
      if (charIndex < currentBanner.message.length) {
        setDisplayedText(currentBanner.message.slice(0, charIndex + 1));
        charIndex++;
      } else {
        if (typingInterval) clearInterval(typingInterval);
        
        // Phase 2: Pause before erasing (cursor stays visible)
        pauseTimeout = setTimeout(() => {
          let eraseIndex = currentBanner.message.length;
          
          // Phase 3: Erasing (cursor still visible)
          erasingInterval = setInterval(() => {
            if (eraseIndex > 0) {
              setDisplayedText(currentBanner.message.slice(0, eraseIndex - 1));
              eraseIndex--;
            } else {
              if (erasingInterval) clearInterval(erasingInterval);
              setShowCursor(false);
              // Move to next banner after erasing
              setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
            }
          }, erasingSpeed);
        }, pauseBeforeErase);
      }
    }, typingSpeed);

    // Cleanup: очищаем ВСЕ таймеры при размонтировании
    return () => {
      if (typingInterval) clearInterval(typingInterval);
      if (pauseTimeout) clearTimeout(pauseTimeout);
      if (erasingInterval) clearInterval(erasingInterval);
    };
  }, [currentIndex, activeBanners]);

  if (activeBanners.length === 0) return null;

  return (
    <div className="bg-primary/10 border-b border-primary/20" data-testid="info-banner">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-3 py-2 min-h-[40px]">
          <Terminal className="w-4 h-4 text-primary flex-shrink-0" data-testid="icon-terminal" />
          <p className="text-sm font-mono text-foreground flex-1" data-testid="text-banner-message">
            {displayedText}
            {showCursor && (
              <span className="inline-block w-2 h-4 bg-primary ml-1 animate-pulse" data-testid="indicator-typing" />
            )}
          </p>
          {activeBanners.length > 1 && (
            <div className="flex gap-1 flex-shrink-0">
              {activeBanners.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    idx === currentIndex ? "bg-primary" : "bg-primary/30"
                  }`}
                  data-testid={`indicator-banner-${idx}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
