import { useEffect, useRef, useState } from 'react';
import { BookOpen, GraduationCap, Award, Star, Trophy, Sparkles, Target, Zap, TrendingUp, Lightbulb, Rocket, Brain } from 'lucide-react';

export function ParallaxBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseX = useRef(0);
  const mouseY = useRef(0);
  const targetX = useRef(0);
  const targetY = useRef(0);
  const rafId = useRef<number>();
  const layersCache = useRef<Array<{ element: HTMLElement; speed: number }>>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsVisible(entry.isIntersecting);
        });
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    // Check if we're on the landing page
    const isOnLanding = window.location.pathname === '/';
    
    if (!isVisible || !isOnLanding) {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
        rafId.current = undefined;
      }
      layersCache.current = [];
      return;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;
    
    // Отключаем анимацию на мобильных устройствах для экономии батареи и производительности
    const isMobile = window.innerWidth < 768 || 'ontouchstart' in window;
    if (isMobile) return;

    const handleMouseMove = (e: MouseEvent) => {
      targetX.current = e.clientX;
      targetY.current = e.clientY;
    };

    const animate = () => {
      if (!containerRef.current || !isVisible) {
        if (rafId.current) {
          cancelAnimationFrame(rafId.current);
          rafId.current = undefined;
        }
        return;
      }

      if (layersCache.current.length === 0) {
        const elements = containerRef.current.querySelectorAll('[data-speed]');
        layersCache.current = Array.from(elements).map((el) => ({
          element: el as HTMLElement,
          speed: parseFloat(el.getAttribute('data-speed') || '0'),
        }));
      }

      const ease = 0.08;
      mouseX.current += (targetX.current - mouseX.current) * ease;
      mouseY.current += (targetY.current - mouseY.current) * ease;

      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;

      layersCache.current.forEach(({ element, speed }) => {
        const x = ((mouseX.current - centerX) * speed) / 100;
        const y = ((mouseY.current - centerY) * speed) / 100;
        element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      });

      rafId.current = requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    rafId.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
        rafId.current = undefined;
      }
      layersCache.current = [];
    };
  }, [isVisible]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{
        contain: 'layout style paint',
        backfaceVisibility: 'hidden',
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      {/* ГРУППА 1: Фоновые градиенты с цветовой пульсацией */}
      <div data-speed="-3" className="absolute inset-0 will-change-transform">
        <div className="absolute top-10 left-[10%] w-40 h-40 rounded-full bg-gradient-to-br from-primary/25 to-chart-2/15 opacity-20 parallax-gradient-rotate" 
             style={{ boxShadow: '0 0 40px rgba(139, 92, 246, 0.15)' }} />
        <div className="absolute top-[20%] right-[12%] w-56 h-56 rounded-full bg-gradient-to-br from-chart-1/20 to-primary/15 opacity-15 parallax-gradient-rotate" 
             style={{ boxShadow: '0 0 50px rgba(139, 92, 246, 0.12)', animationDelay: '1s' }} />
        <div className="absolute bottom-[30%] left-[18%] w-48 h-48 rounded-full bg-gradient-to-br from-chart-2/20 to-chart-3/15 opacity-12 parallax-gradient-rotate" 
             style={{ boxShadow: '0 0 35px rgba(236, 72, 153, 0.12)', animationDelay: '2s' }} />
        <div className="absolute top-[50%] right-[25%] w-44 h-44 rounded-full bg-gradient-to-br from-yellow-400/15 to-orange-400/12 opacity-10 parallax-gradient-rotate" 
             style={{ boxShadow: '0 0 30px rgba(250, 204, 21, 0.12)', animationDelay: '3s' }} />
      </div>

      {/* ГРУППА 2: Крупные образовательные иконки с мерцанием */}
      <div data-speed="5" className="absolute inset-0 will-change-transform hidden md:block">
        <div className="absolute top-[15%] left-[12%] text-primary/15 parallax-icon-shimmer">
          <BookOpen className="w-20 h-20" strokeWidth={1.5} />
        </div>
        <div className="absolute top-[58%] right-[18%] text-chart-2/15 parallax-icon-shimmer" style={{ animationDelay: '0.5s' }}>
          <GraduationCap className="w-24 h-24" strokeWidth={1.5} />
        </div>
        <div className="absolute bottom-[22%] left-[22%] text-chart-1/15 parallax-icon-shimmer" style={{ animationDelay: '1s' }}>
          <Award className="w-18 h-18" strokeWidth={1.5} />
        </div>
        <div className="absolute top-[42%] right-[8%] text-primary/12 parallax-icon-shimmer" style={{ animationDelay: '1.5s' }}>
          <Target className="w-16 h-16" strokeWidth={1.5} />
        </div>
        <div className="absolute bottom-[45%] left-[8%] text-chart-3/12 parallax-icon-shimmer" style={{ animationDelay: '2s' }}>
          <Lightbulb className="w-14 h-14" strokeWidth={1.5} />
        </div>
        <div className="absolute top-[70%] right-[35%] text-yellow-400/12 parallax-icon-shimmer" style={{ animationDelay: '2.5s' }}>
          <Rocket className="w-16 h-16" strokeWidth={1.5} />
        </div>
      </div>

      {/* ГРУППА 3: Средние декоративные иконки с пульсацией */}
      <div data-speed="8" className="absolute inset-0 will-change-transform">
        <div className="absolute top-[25%] left-[8%] text-primary/10 parallax-glow">
          <Brain className="w-14 h-14" strokeWidth={1.5} />
        </div>
        <div className="absolute bottom-[35%] right-[12%] text-chart-1/10 parallax-star-twinkle">
          <Star className="w-12 h-12 fill-chart-1/5" strokeWidth={1.5} />
        </div>
        <div className="absolute top-[65%] left-[30%] text-chart-2/10 parallax-glow" style={{ animationDelay: '1s' }}>
          <Trophy className="w-14 h-14" strokeWidth={1.5} />
        </div>
        <div className="absolute top-[32%] right-[40%] text-yellow-400/10 parallax-glow" style={{ animationDelay: '1.5s' }}>
          <Sparkles className="w-12 h-12" strokeWidth={1.5} />
        </div>
      </div>

      {/* ГРУППА 4: Декоративные карточки с переливами */}
      <div data-speed="10" className="absolute inset-0 will-change-transform">
        <div className="absolute top-[28%] right-[28%]">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/8 to-chart-2/6 border border-primary/20 flex items-center justify-center rotate-12 parallax-shimmer"
               style={{ boxShadow: '0 0 15px rgba(139, 92, 246, 0.15)' }}>
            <Star className="w-12 h-12 text-primary/40 fill-primary/15 parallax-star-twinkle" />
          </div>
        </div>
        <div className="absolute bottom-[38%] right-[32%]">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-chart-2/8 to-chart-3/6 border-2 border-chart-2/20 flex items-center justify-center parallax-shimmer"
               style={{ boxShadow: '0 0 12px rgba(236, 72, 153, 0.18)', animationDelay: '0.5s' }}>
            <Trophy className="w-10 h-10 text-chart-2/40 parallax-glow" />
          </div>
        </div>
        <div className="absolute top-[52%] left-[8%]">
          <div className="w-18 h-18 rounded-xl bg-gradient-to-br from-chart-1/8 to-primary/6 border border-chart-1/20 flex items-center justify-center -rotate-6 parallax-shimmer"
               style={{ boxShadow: '0 0 12px rgba(139, 92, 246, 0.12)', animationDelay: '1s' }}>
            <TrendingUp className="w-9 h-9 text-chart-1/35 parallax-glow" style={{ animationDelay: '0.5s' }} />
          </div>
        </div>
        <div className="absolute top-[65%] right-[15%]">
          <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-yellow-400/8 to-orange-400/6 border border-yellow-400/20 flex items-center justify-center rotate-45 parallax-shimmer"
               style={{ boxShadow: '0 0 10px rgba(250, 204, 21, 0.15)', animationDelay: '1.5s' }}>
            <Zap className="w-8 h-8 text-yellow-400/40 -rotate-45 parallax-glow" style={{ animationDelay: '1s' }} />
          </div>
        </div>
        <div className="absolute bottom-[15%] left-[40%]">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/8 to-chart-3/6 border border-primary/15 flex items-center justify-center -rotate-12 parallax-shimmer"
               style={{ boxShadow: '0 0 12px rgba(139, 92, 246, 0.14)', animationDelay: '2s' }}>
            <BookOpen className="w-10 h-10 text-primary/35 parallax-glow" style={{ animationDelay: '1.5s' }} />
          </div>
        </div>
      </div>

      {/* ГРУППА 5: Плавающие большие фигуры с яркими свечениями */}
      <div data-speed="13" className="absolute inset-0 will-change-transform">
        <div className="absolute top-[35%] left-[5%]">
          <div className="relative w-28 h-28">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/12 to-chart-2/10 border border-primary/25 rotate-6 parallax-shimmer"
                 style={{ boxShadow: '0 0 20px rgba(139, 92, 246, 0.2)' }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="w-12 h-12 text-primary/50 parallax-glow" />
            </div>
          </div>
        </div>
        <div className="absolute bottom-[18%] right-[10%]">
          <div className="relative w-24 h-24">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-chart-2/12 to-chart-3/10 border-2 border-chart-2/25 parallax-shimmer"
                 style={{ boxShadow: '0 0 18px rgba(236, 72, 153, 0.2)', animationDelay: '1s' }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <BookOpen className="w-10 h-10 text-chart-2/50 parallax-glow" style={{ animationDelay: '0.5s' }} />
            </div>
          </div>
        </div>
        <div className="absolute top-[10%] right-[5%]">
          <div className="relative w-26 h-26">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-chart-1/10 to-primary/8 border border-chart-1/20 rotate-12 parallax-shimmer"
                 style={{ boxShadow: '0 0 16px rgba(139, 92, 246, 0.15)', animationDelay: '2s' }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <Rocket className="w-11 h-11 text-chart-1/45 parallax-glow" style={{ animationDelay: '1s' }} />
            </div>
          </div>
        </div>
      </div>

      {/* ГРУППА 6: Звёзды и мелкие элементы с мерцанием */}
      <div data-speed="15" className="absolute inset-0 will-change-transform">
        {/* Звёздный рейтинг с мерцанием */}
        <div className="absolute top-[72%] left-[38%]">
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star 
                key={i} 
                className="w-6 h-6 text-yellow-400/30 fill-yellow-400/20 parallax-star-twinkle" 
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        </div>
        
        {/* Дополнительные звёзды */}
        <div className="absolute top-[20%] left-[50%]">
          <div className="flex items-center gap-1 rotate-45">
            {[...Array(3)].map((_, i) => (
              <Star 
                key={i} 
                className="w-5 h-5 text-primary/25 fill-primary/15 parallax-star-twinkle" 
                style={{ animationDelay: `${i * 0.3}s` }}
              />
            ))}
          </div>
        </div>

        {/* Акцентные точки с пульсацией */}
        <div className="absolute top-[12%] right-[42%] w-4 h-4 rounded-full bg-primary/40 parallax-dot-glow"
             style={{ boxShadow: '0 0 8px rgba(139, 92, 246, 0.4)' }} />
        <div className="absolute top-[78%] left-[32%] w-3 h-3 rounded-full bg-chart-2/45 parallax-dot-glow"
             style={{ boxShadow: '0 0 6px rgba(236, 72, 153, 0.4)', animationDelay: '0.3s' }} />
        <div className="absolute top-[48%] right-[48%] w-2 h-2 rounded-full bg-chart-1/40 parallax-dot-glow"
             style={{ boxShadow: '0 0 5px rgba(139, 92, 246, 0.5)', animationDelay: '0.6s' }} />
        <div className="absolute bottom-[52%] left-[48%] w-3 h-3 rounded-full bg-yellow-400/45 parallax-dot-glow"
             style={{ boxShadow: '0 0 8px rgba(250, 204, 21, 0.5)', animationDelay: '0.9s' }} />
        <div className="absolute top-[25%] left-[45%] w-2 h-2 rounded-full bg-primary/35 parallax-dot-glow"
             style={{ boxShadow: '0 0 4px rgba(139, 92, 246, 0.4)', animationDelay: '1.2s' }} />
        <div className="absolute bottom-[60%] right-[15%] w-3 h-3 rounded-full bg-chart-3/40 parallax-dot-glow"
             style={{ boxShadow: '0 0 6px rgba(236, 72, 153, 0.4)', animationDelay: '1.5s' }} />
        <div className="absolute top-[85%] right-[50%] w-2 h-2 rounded-full bg-yellow-400/40 parallax-dot-glow"
             style={{ boxShadow: '0 0 5px rgba(250, 204, 21, 0.5)', animationDelay: '1.8s' }} />
      </div>
    </div>
  );
}
