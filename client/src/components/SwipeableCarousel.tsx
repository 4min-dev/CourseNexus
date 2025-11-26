import { useState, useEffect, useCallback, ReactNode } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { cn } from "@/lib/utils";

interface SwipeableCarouselProps {
  children: ReactNode | ((activeIndex: number, itemIndex: number) => ReactNode);
  className?: string;
  itemCount?: number;
  onReachEnd?: () => void;
  onReachStart?: () => void;
  currentPageSize?: number;
  showDots?: boolean;
  initialIndex?: number;
  onActiveIndexChange?: (index: number) => void;
}

export function SwipeableCarousel({ children, className, itemCount, onReachEnd, onReachStart, currentPageSize, showDots = true, initialIndex = 0, onActiveIndexChange }: SwipeableCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    dragFree: false,
    containScroll: 'trimSnaps',
    startIndex: initialIndex,
  });

  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const [dragStartIndex, setDragStartIndex] = useState<number | null>(null);
  const [isFirstCard, setIsFirstCard] = useState(false);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    const newIndex = emblaApi.selectedScrollSnap();
    setSelectedIndex(newIndex);
    setIsFirstCard(newIndex === 0);
    
    // Notify parent component about active index change
    if (onActiveIndexChange) {
      onActiveIndexChange(newIndex);
    }
  }, [emblaApi, onActiveIndexChange]);

  useEffect(() => {
    if (!emblaApi) return;

    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on('select', onSelect);
    onSelect();

    // Отслеживаем начало драга
    const onPointerDown = () => {
      if (!emblaApi) return;
      const currentIndex = emblaApi.selectedScrollSnap();
      const lastIndex = emblaApi.scrollSnapList().length - 1;
      
      // Запоминаем позицию и индекс если на первой или последней карточке
      if (currentIndex === 0 || currentIndex === lastIndex) {
        const container = emblaApi.containerNode();
        const rect = container.getBoundingClientRect();
        setDragStartX(rect.left);
        setDragStartIndex(currentIndex);
      } else {
        setDragStartX(null);
        setDragStartIndex(null);
      }
    };

    // Отслеживаем попытку свайпа за пределы первой/последней карточки
    const onPointerUp = () => {
      if (!emblaApi || dragStartX === null || dragStartIndex === null) return;
      
      const currentIndex = emblaApi.selectedScrollSnap();
      const lastIndex = emblaApi.scrollSnapList().length - 1;
      
      const container = emblaApi.containerNode();
      const rect = container.getBoundingClientRect();
      const dragDistance = rect.left - dragStartX;
      
      // Если БЫЛИ на последней карточке, свайпнули влево И индекс НЕ изменился (карусель не прокрутилась)
      if (dragStartIndex === lastIndex && currentIndex === lastIndex && dragDistance < -10 && onReachEnd) {
        onReachEnd();
      }
      
      // Если БЫЛИ на первой карточке, свайпнули вправо И индекс НЕ изменился (карусель не прокрутилась)
      if (dragStartIndex === 0 && currentIndex === 0 && dragDistance > 10 && onReachStart) {
        onReachStart();
      }
      
      setDragStartX(null);
      setDragStartIndex(null);
    };

    emblaApi.on('pointerDown', onPointerDown);
    emblaApi.on('pointerUp', onPointerUp);

    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('pointerDown', onPointerDown);
      emblaApi.off('pointerUp', onPointerUp);
    };
  }, [emblaApi, onSelect, onReachEnd, onReachStart, dragStartX, dragStartIndex, initialIndex]);

  const scrollTo = useCallback(
    (index: number) => emblaApi?.scrollTo(index),
    [emblaApi]
  );

  const isRenderProp = typeof children === 'function';
  const childrenArray = isRenderProp ? [] : (Array.isArray(children) ? children : [children]);
  const renderCount = isRenderProp ? (itemCount || 0) : childrenArray.length;

  return (
    <div className={cn("relative", className)} data-testid="carousel-container">
      <div className="overflow-visible" ref={emblaRef} data-testid="carousel-viewport">
        <div className="flex gap-4 overflow-visible" data-testid="carousel-slides">
          {isRenderProp && typeof children === 'function'
            ? Array.from({ length: renderCount }).map((_, index) => (
                <div
                  key={index}
                  className="flex-[0_0_85%] min-w-0 max-w-[85%]"
                  data-testid={`carousel-slide-${index}`}
                >
                  {children(selectedIndex, index)}
                </div>
              ))
            : childrenArray.map((child, index) => (
                <div
                  key={index}
                  className="flex-[0_0_85%] min-w-0 max-w-[85%] overflow-visible"
                  style={{ isolation: 'auto' }}
                  data-testid={`carousel-slide-${index}`}
                >
                  {child}
                </div>
              ))}
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
