import { useEffect, useState, useRef } from 'react';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  separator?: string;
}

export function AnimatedNumber({ 
  value, 
  duration = 2000, 
  className = '',
  prefix = '',
  suffix = '',
  separator = ' '
}: AnimatedNumberProps) {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const elementRef = useRef<HTMLSpanElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastFrameTsRef = useRef<number>(0);
  const lastValueRef = useRef<number>(0);
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    // Intersection Observer to trigger animation when element is visible
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimatedRef.current) {
          hasAnimatedRef.current = true;
          setHasAnimated(true);

          const startTime = performance.now();
          lastFrameTsRef.current = 0;
          lastValueRef.current = 0;

          const animate = (ts: number) => {
            // Throttle to ~30fps: same feel, less React churn.
            if (lastFrameTsRef.current && ts - lastFrameTsRef.current < 33) {
              rafRef.current = requestAnimationFrame(animate);
              return;
            }
            lastFrameTsRef.current = ts;

            const elapsed = ts - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function for smooth animation
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const current = Math.floor(value * easeOutQuart);

            if (current !== lastValueRef.current) {
              lastValueRef.current = current;
              setCount(current);
            }
            
            if (progress < 1) {
              rafRef.current = requestAnimationFrame(animate);
            } else {
              setCount(value);
            }
          };

          rafRef.current = requestAnimationFrame(animate);
        }
      },
      { threshold: 0.1 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => {
      observer.disconnect();
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [value, duration]);

  // Format number with separators
  const formatNumber = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, separator);
  };

  return (
    <span ref={elementRef} className={className}>
      {prefix}{formatNumber(count)}{suffix}
    </span>
  );
}
