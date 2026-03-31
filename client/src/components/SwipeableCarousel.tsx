import { useState, useEffect, useCallback, ReactNode, memo, useRef } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { cn } from "@/lib/utils";



interface SwipeableCarouselProps {
  children: ReactNode | ((activeIndex: number, itemIndex: number, isScrolling: boolean) => ReactNode);
  className?: string;
  slideClassName?: string;
  slideContainIntrinsicSize?: string;
  renderRadius?: number;
  disableVirtualization?: boolean;
  itemCount?: number;
  onReachEnd?: () => void;
  onReachStart?: () => void;
  currentPageSize?: number;
  showDots?: boolean;
  initialIndex?: number;
  onActiveIndexChange?: (index: number) => void;
}

// Минимальное расстояние свайпа для триггера перехода (в пикселях)
const SWIPE_THRESHOLD = 50;

function SwipeableCarouselComponent({ children, className, slideClassName, slideContainIntrinsicSize = '85vw 500px', renderRadius = 1, disableVirtualization = false, itemCount, onReachEnd, onReachStart, currentPageSize, showDots = true, initialIndex = 0, onActiveIndexChange }: SwipeableCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    dragFree: false,
    containScroll: 'trimSnaps',
    startIndex: initialIndex,
  });

  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);
  const [isScrolling, setIsScrolling] = useState(false);

  const pointerStartX = useRef<number | null>(null);
  const isAtBoundary = useRef<'start' | 'end' | null>(null);
  

  const onSelect = useCallback(() => {
    if (!emblaApi) return;

    // Используем requestAnimationFrame для синхронизации с циклом рендеринга
    // Это предотвращает множественные обновления состояния во время быстрого свайпа
    requestAnimationFrame(() => {
      const newIndex = emblaApi.selectedScrollSnap();
      setSelectedIndex(newIndex);

      // Notify parent component about active index change
      if (onActiveIndexChange) {
        onActiveIndexChange(newIndex);
      }
    });
  }, [emblaApi, onActiveIndexChange]);

  // Обработчик начала скроллинга - включаем willChange
  const onScroll = useCallback(() => {
    if (!isScrolling) {
      setIsScrolling(true);
    }
  }, [isScrolling]);

  // Обработчик окончания скроллинга - выключаем willChange
  const onSettle = useCallback(() => {
    setIsScrolling(false);
  }, []);

  // Обработчик начала свайпа - только запоминаем позицию если на границе
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!emblaApi) return;

    const canScrollPrev = emblaApi.canScrollPrev();
    const canScrollNext = emblaApi.canScrollNext();

    // Проверяем границы только один раз при начале свайпа
    if (!canScrollPrev && onReachStart) {
      isAtBoundary.current = 'start';
      pointerStartX.current = e.clientX;
    } else if (!canScrollNext && onReachEnd) {
      isAtBoundary.current = 'end';
      pointerStartX.current = e.clientX;
    } else {
      isAtBoundary.current = null;
      pointerStartX.current = null;
    }
  }, [emblaApi, onReachStart, onReachEnd]);

  // Обработчик окончания свайпа - проверяем направление и расстояние
  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (pointerStartX.current === null || isAtBoundary.current === null) return;

    const diff = e.clientX - pointerStartX.current;

    // На первом слайде свайп вправо (diff > 0) = предыдущая страница
    if (isAtBoundary.current === 'start' && diff > SWIPE_THRESHOLD && onReachStart) {
      onReachStart();
    }
    // На последнем слайде свайп влево (diff < 0) = следующая страница
    else if (isAtBoundary.current === 'end' && diff < -SWIPE_THRESHOLD && onReachEnd) {
      onReachEnd();
    }

    // Сброс
    pointerStartX.current = null;
    isAtBoundary.current = null;
  }, [onReachStart, onReachEnd]);



  useEffect(() => {
    if (!emblaApi) return;

    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on('select', onSelect);
    emblaApi.on('scroll', onScroll);
    emblaApi.on('settle', onSettle);
    onSelect();

    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('scroll', onScroll);
      emblaApi.off('settle', onSettle);
    };
  }, [emblaApi, onSelect, onScroll, onSettle, initialIndex]);

  const scrollTo = useCallback(
    (index: number) => emblaApi?.scrollTo(index),
    [emblaApi]
  );

  const isRenderProp = typeof children === 'function';
  const effectiveRenderRadius = Math.max(1, renderRadius);
  const childrenArray = isRenderProp ? [] : (Array.isArray(children) ? children : [children]);
  const renderCount = isRenderProp ? (itemCount || 0) : childrenArray.length;

  return (
    <div
      className={cn("relative", className)}
      data-testid="carousel-container"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      <div className="overflow-visible" ref={emblaRef} data-testid="carousel-viewport">
        <div className="flex gap-4 overflow-visible" style={{ willChange: isScrolling ? 'transform' : 'auto' }} data-testid="carousel-slides">
          {isRenderProp && typeof children === 'function'
            ? Array.from({ length: renderCount }).map((_, index) => {
              // Only render content if it's the current slide or adjacent ones
              const shouldRender = disableVirtualization || Math.abs(index - selectedIndex) <= effectiveRenderRadius;


              return (
                <div
                  key={index}
                  className={cn("flex-[0_0_85%] min-w-0 max-w-[85%]", slideClassName)}
                  style={{
                    contentVisibility: disableVirtualization ? 'visible' : (shouldRender ? 'visible' : 'auto'),
                    containIntrinsicSize: disableVirtualization ? 'auto' : slideContainIntrinsicSize,
                  }}
                  data-testid={`carousel-slide-${index}`}
                >
                  {shouldRender ? (
                    children(selectedIndex, index, isScrolling)
                  ) : <div className="h-full w-full" />}
                </div>
              );
            })
            : childrenArray.map((child, index) => {
              // Only render content if it's the current slide or adjacent ones
              const shouldRender = disableVirtualization || Math.abs(index - selectedIndex) <= effectiveRenderRadius;


              return (
                <div
                  key={index}
                  className={cn("flex-[0_0_85%] min-w-0 max-w-[85%] overflow-visible", slideClassName)}
                  style={{
                    isolation: 'auto',
                    contentVisibility: disableVirtualization ? 'visible' : (shouldRender ? 'visible' : 'auto'),
                    containIntrinsicSize: disableVirtualization ? 'auto' : slideContainIntrinsicSize,
                  }}
                  data-testid={`carousel-slide-${index}`}
                >
                  {shouldRender ? child : <div className="h-full w-full" />}
                </div>
              );
            })}
        </div>
      </div>

      {showDots && scrollSnaps.length > 1 && (
        <div
          className="flex items-center justify-center gap-2 mt-4"
          data-testid="carousel-pagination"
        >
          {scrollSnaps.map((_, index) => (
            <button
              key={index}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                index === selectedIndex
                  ? "w-8 bg-primary"
                  : "w-2 bg-muted-foreground/30 hover-elevate"
              )}
              onClick={() => scrollTo(index)}
              aria-label={`Go to slide ${index + 1}`}
              data-testid={`carousel-dot-${index}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export const SwipeableCarousel = memo(SwipeableCarouselComponent);
