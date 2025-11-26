import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Crown, BookOpen, Package, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
}

interface PageNavigationProps {
  items: NavigationItem[];
}

export function PageNavigation({ items }: PageNavigationProps) {
  const [activeSection, setActiveSection] = useState<string>("");
  const [isFixed, setIsFixed] = useState(false);
  const [navHeight, setNavHeight] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const navRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const rafIdRef = useRef<number | null>(null);
  const sectionsCache = useRef<Map<string, HTMLElement>>(new Map());
  const sectionPositions = useRef<Map<string, { top: number, bottom: number }>>(new Map());
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollY = useRef<number>(0);
  const scrollDirection = useRef<'up' | 'down'>('down');
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastFixedChangeTime = useRef<number>(0);

  // Function to evaluate which section is active (pure computation, no DOM reads)
  const evaluateActiveSection = useCallback(() => {
    const currentScrollY = window.pageYOffset;
    const viewportHeight = window.innerHeight;
    const threshold = viewportHeight / 2;
    
    // Track scroll direction
    if (currentScrollY > lastScrollY.current) {
      scrollDirection.current = 'down';
    } else if (currentScrollY < lastScrollY.current) {
      scrollDirection.current = 'up';
    }
    lastScrollY.current = currentScrollY;
    
    let currentSection = "";
    
    for (const item of items) {
      const pos = sectionPositions.current.get(item.id);
      if (pos) {
        const relativeTop = pos.top - currentScrollY;
        const relativeBottom = pos.bottom - currentScrollY;
        
        if (relativeTop <= threshold && relativeBottom >= 0) {
          currentSection = item.id;
        }
      }
    }
    
    setActiveSection(prev => prev !== currentSection ? currentSection : prev);
  }, [items]);

  // Function to compute section positions (with DOM reads) and immediately evaluate
  const computeSectionMetrics = useCallback(() => {
    items.forEach(item => {
      const element = sectionsCache.current.get(item.id);
      if (element) {
        const rect = element.getBoundingClientRect();
        const scrollY = window.pageYOffset;
        sectionPositions.current.set(item.id, {
          top: rect.top + scrollY,
          bottom: rect.bottom + scrollY
        });
      }
    });
    
    // Immediately evaluate active section after computing metrics
    evaluateActiveSection();
  }, [items, evaluateActiveSection]);

  // Cache DOM elements and their positions on mount and when items change
  useEffect(() => {
    sectionsCache.current.clear();
    sectionPositions.current.clear();
    
    items.forEach(item => {
      const element = document.getElementById(item.id);
      if (element) {
        sectionsCache.current.set(item.id, element);
      }
    });
    
    // Calculate positions immediately via RAF for first paint
    requestAnimationFrame(() => {
      computeSectionMetrics();
      
      // Recalculate again after images/content may have loaded
      setTimeout(computeSectionMetrics, 500);
    });
  }, [items, computeSectionMetrics]);

  // Handle window resize with debouncing and recalculate positions
  useEffect(() => {
    let resizeTimeout: NodeJS.Timeout;
    
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      
      // Recalculate nav height on resize if needed
      if (mobile && navRef.current) {
        setNavHeight(navRef.current.offsetHeight);
      }
      
      // Recalculate section positions and evaluate active section on resize
      computeSectionMetrics();
    };
    
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(checkMobile, 150);
    };

    // Initial check
    checkMobile();
    
    window.addEventListener("resize", handleResize, { passive: true });
    
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(resizeTimeout);
    };
  }, [computeSectionMetrics]);

  // Track active section and scroll direction - OPTIMIZED for Opera GX
  useEffect(() => {
    const handleScroll = () => {
      // Cancel any pending RAF to throttle updates
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
      
      rafIdRef.current = requestAnimationFrame(() => {
        // If cache is empty on first scroll, compute metrics synchronously once
        if (sectionPositions.current.size === 0) {
          computeSectionMetrics();
        } else {
          // Otherwise just evaluate using cached positions (no DOM reads!)
          evaluateActiveSection();
        }
        rafIdRef.current = null;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [computeSectionMetrics, evaluateActiveSection]);

  // Mobile sticky behavior with IntersectionObserver and smart debouncing
  useEffect(() => {
    if (!isMobile || !sentinelRef.current || !navRef.current) {
      // Reset fixed state on desktop
      if (!isMobile && isFixed) {
        setIsFixed(false);
      }
      return;
    }

    // Measure nav height for placeholder
    setNavHeight(navRef.current.offsetHeight);

    const observer = new IntersectionObserver(
      ([entry]) => {
        const now = Date.now();
        const shouldBeFixed = !entry.isIntersecting;
        
        // Prevent rapid state changes (minimum 150ms between changes)
        const timeSinceLastChange = now - lastFixedChangeTime.current;
        if (timeSinceLastChange < 150) {
          return; // Ignore this change, too soon
        }

        // Clear any pending debounce
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
        }

        // Debounce the state change to prevent flickering on fast scroll
        debounceTimeoutRef.current = setTimeout(() => {
          // Double-check the state hasn't changed
          const currentShouldBeFixed = !entry.isIntersecting;
          
          // Only apply if state actually needs to change
          if (currentShouldBeFixed === isFixed) {
            return; // State already correct
          }

          // Clear any pending transition timeout
          if (transitionTimeoutRef.current) {
            clearTimeout(transitionTimeoutRef.current);
          }

          // Start transition state
          setIsTransitioning(true);
          lastFixedChangeTime.current = Date.now();
          
          // Use requestAnimationFrame for smoother state changes
          requestAnimationFrame(() => {
            setIsFixed(currentShouldBeFixed);
            
            // End transition after CSS animation completes
            transitionTimeoutRef.current = setTimeout(() => {
              setIsTransitioning(false);
              transitionTimeoutRef.current = null;
            }, 500); // Match CSS transition duration (500ms)
          });
          
          debounceTimeoutRef.current = null;
        }, 50); // 50ms debounce - quick enough to feel instant, slow enough to prevent jitter
      },
      {
        threshold: [0, 0.1, 0.9, 1], // Multiple thresholds for smoother detection
        // Attach 40px before menu touches header to prevent visual jump
        rootMargin: '-16px 0px 0px 0px', // Header height (56px) - 40px early attach
      }
    );

    observer.observe(sentinelRef.current);

    return () => {
      observer.disconnect();
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
        transitionTimeoutRef.current = null;
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
    };
  }, [isMobile, isFixed]);

  // Memoized scroll function
  const scrollToSection = useCallback((id: string) => {
    const element = sectionsCache.current.get(id) || document.getElementById(id);
    if (element) {
      const offset = isMobile ? 56 : 80; // Different offset for mobile/desktop header
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  }, [isMobile]);

  if (items.length === 0) return null;

  // Memoize nav container classes with smooth transitions
  const navClasses = useMemo(() => cn(
    "z-[100] mb-6",
    "md:sticky md:top-20",
    isFixed ? "fixed top-14 left-0 right-0 px-3" : "relative",
    // Smooth slow transition when detaching/attaching
    !isTransitioning && "transition-all duration-500 ease-in-out",
    isTransitioning && "will-change-transform will-change-[top,position]" // GPU optimization during transition
  ), [isFixed, isTransitioning]);

  // Memoize glassmorphism inline styles
  const glassStyle = useMemo(() => ({
    backdropFilter: 'blur(24px) saturate(180%)',
    WebkitBackdropFilter: 'blur(24px) saturate(180%)'
  }), []);

  return (
    <>
      {/* Sentinel element for IntersectionObserver (mobile only) */}
      <div ref={sentinelRef} className="md:hidden" style={{ height: '1px' }} />
      
      {/* Placeholder to prevent content jump when nav becomes fixed (mobile only) */}
      {isFixed && (
        <div 
          className="md:hidden transition-all duration-500 ease-in-out" 
          style={{ 
            height: `${navHeight}px`,
            opacity: isTransitioning ? 0 : 1
          }} 
        />
      )}
      
      <nav ref={navRef} className={navClasses}>
        <div className="relative rounded-xl overflow-hidden">
          {/* Glassmorphism layer with backdrop blur - lighter */}
          <div 
            className="absolute inset-0 bg-gradient-to-r from-background/40 via-background/30 to-background/40 border border-border/40 rounded-xl" 
            style={glassStyle} 
          />
          
          {/* Subtle shine effect on top */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-t-xl" />
          
          {/* Content layer */}
          <div className="relative p-2">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {items.map((item) => {
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 rounded-lg whitespace-nowrap transition-all duration-200 min-w-fit",
                      "hover-elevate active-elevate-2",
                      isActive
                        ? `bg-gradient-to-r ${item.color} text-white font-semibold shadow-lg`
                        : "bg-muted/50 text-muted-foreground hover:text-foreground"
                    )}
                    data-testid={`nav-${item.id}`}
                  >
                    <span className={cn(
                      "transition-transform duration-200",
                      isActive && "scale-110"
                    )}>
                      {item.icon}
                    </span>
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}

// Predefined navigation configurations
export const shopNavigationItems: NavigationItem[] = [
  {
    id: "vip-section",
    label: "VIP Пакеты",
    icon: <Crown className="h-4 w-4" />,
    color: "from-yellow-500 to-amber-600",
  },
  {
    id: "catalog-section",
    label: "Каталог",
    icon: <BookOpen className="h-4 w-4" />,
    color: "from-purple-500 to-pink-500",
  },
  {
    id: "packages-section",
    label: "Подборки",
    icon: <Package className="h-4 w-4" />,
    color: "from-purple-400 to-pink-400",
  },
  {
    id: "popular-section",
    label: "Популярное",
    icon: <TrendingUp className="h-4 w-4" />,
    color: "from-orange-500 to-red-500",
  },
];
