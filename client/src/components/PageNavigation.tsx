import { useState, useEffect, useRef, useCallback } from "react";
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
  const [isMobile, setIsMobile] = useState(false);

  const sectionsCache = useRef<Map<string, HTMLElement>>(new Map());
  const sectionPositions = useRef<Map<string, { top: number; bottom: number }>>(new Map());
  const lastScrollY = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);

  // Определяем активную секцию (без чтения DOM)
  const evaluateActiveSection = useCallback(() => {
    const currentScrollY = window.pageYOffset;
    const viewportHeight = window.innerHeight;
    const threshold = viewportHeight / 2;

    // Определяем направление скролла
    lastScrollY.current = currentScrollY;

    let currentSection = "";

    for (const item of items) {
      const pos = sectionPositions.current.get(item.id);
      if (pos) {
        const relativeTop = pos.top - currentScrollY;
        const relativeBottom = pos.bottom - currentScrollY;

        if (relativeTop <= threshold && relativeBottom >= 0) {
          currentSection = item.id;
          break; // первая подходящая секция сверху
        }
      }
    }

    setActiveSection((prev) => (prev !== currentSection ? currentSection : prev));
  }, [items]);

  // Вычисляем позиции секций (с чтением DOM)
  const computeSectionMetrics = useCallback(() => {
    items.forEach((item) => {
      const element = sectionsCache.current.get(item.id);
      if (element) {
        const rect = element.getBoundingClientRect();
        const scrollY = window.pageYOffset;
        sectionPositions.current.set(item.id, {
          top: rect.top + scrollY,
          bottom: rect.bottom + scrollY,
        });
      }
    });

    evaluateActiveSection();
  }, [items, evaluateActiveSection]);

  // Кэшируем элементы при монтировании и изменении items
  useEffect(() => {
    sectionsCache.current.clear();
    sectionPositions.current.clear();

    items.forEach((item) => {
      const element = document.getElementById(item.id);
      if (element) {
        sectionsCache.current.set(item.id, element);
      }
    });

    requestAnimationFrame(() => {
      computeSectionMetrics();
      // Повторный расчёт после возможной загрузки изображений
      setTimeout(computeSectionMetrics, 500);
    });
  }, [items, computeSectionMetrics]);

  // Обработка ресайза — определяем мобильность и пересчитываем позиции
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      computeSectionMetrics();
    };

    handleResize();
    window.addEventListener("resize", handleResize, { passive: true });

    return () => window.removeEventListener("resize", handleResize);
  }, [computeSectionMetrics]);

  // Обработка скролла — оптимизировано RAF
  useEffect(() => {
    const handleScroll = () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }

      rafIdRef.current = requestAnimationFrame(() => {
        if (sectionPositions.current.size === 0) {
          computeSectionMetrics();
        } else {
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
      }
    };
  }, [computeSectionMetrics, evaluateActiveSection]);

  // Плавный скролл к секции
  const scrollToSection = useCallback(
    (id: string) => {
      const element = sectionsCache.current.get(id) || document.getElementById(id);
      if (element) {
        // Подбери под высоту своего хедера: мобильный ~56px, десктоп ~80px
        const offset = isMobile ? 64 : 88;
        const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;

        window.scrollTo({
          top: elementPosition - offset,
          behavior: "smooth",
        });
      }
    },
    [isMobile]
  );

  if (items.length === 0) return null;

  // Основные классы — теперь всегда sticky
  const navClasses = cn(
    "z-[100] mb-6",
    "sticky", // всегда sticky
    isMobile ? "top-12" : "top-20", // разные отступы сверху
    "transition-all duration-300 ease-out",
    "-mt-6 pt-6 bg-background/80", // компенсация отступа + лёгкий фон при прилипании
    "border-b border-border/20" // опционально: нижняя граница при прилипании
  );

  return (
    <nav className={navClasses}>
      <div className="relative rounded-xl overflow-hidden mx-3 md:mx-0">
        {/* Glassmorphism слой */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-background/40 via-background/30 to-background/40 border border-border/40 rounded-xl"
          style={{
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
          }}
        />

        {/* Блик сверху */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

        {/* Контент */}
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
                  <span className={cn("transition-transform duration-200", isActive && "scale-110")}>
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
  );
}

// Предопределённые элементы навигации (не менялись)
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