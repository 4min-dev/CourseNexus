import { ChevronRight, ChevronDown, FolderOpen, Star, Crown, Heart, ShoppingBag, BookOpen, Gift, RefreshCw, Search, X, HelpCircle } from "lucide-react";
import { useState, useEffect, useRef, useCallback, type MouseEvent } from "react";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import type { Category as DbCategory, Subcategory } from "@shared/schema";
import { formatPrice } from "@/lib/formatPrice";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

// Helper function to track filter clicks for analytics
const trackFilterClick = async (filterType: 'category' | 'subcategory' | 'author', filterId: string | null, filterValue: string) => {
  try {
    await fetch('/api/analytics/filter-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        filterType,
        filterId,
        filterValue,
      }),
    });
  } catch (error) {
    console.error('Failed to track filter click:', error);
  }
};

interface Category {
  id: string;
  name: string;
  children?: Category[];
  count?: number;
}

interface SidebarProps {
  selectedCategories: {
    platform?: string;
    levels?: string[];
    level?: string;
    year?: number;
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    author?: string;
  };
  onCategoryChange: (categories: {
    platform?: string;
    levels?: string[];
    level?: string;
    year?: number;
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    author?: string;
  }) => void;
  isOpen: boolean;
  showPriceFilter?: boolean;
  catalogPath?: string;
  hideVipAndFavorites?: boolean;
}

export function Sidebar({ selectedCategories, onCategoryChange, isOpen, showPriceFilter = true, catalogPath = "/shop", hideVipAndFavorites = false }: SidebarProps) {
  const [location, setLocation] = useLocation();

  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(
    new Set(["root", "platforms"])
  );
  const [authorSearch, setAuthorSearch] = useState("");
  const [authorSearchDebounced, setAuthorSearchDebounced] = useState("");
  const [displayedAuthorsCount, setDisplayedAuthorsCount] = useState(20);
  const [showAuthorsList, setShowAuthorsList] = useState(false);
  const authorsScrollRef = useRef<HTMLDivElement>(null);
  const authorsContainerRef = useRef<HTMLDivElement>(null);
  const autoExpandedPlatformRef = useRef<string | null>(null);

  // Debounce author search
  useEffect(() => {
    const timer = setTimeout(() => {
      setAuthorSearchDebounced(authorSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [authorSearch]);


  // Wrapper to ensure price filters are excluded when showPriceFilter is false
  const handleCategoryChange = (categories: typeof selectedCategories) => {
    if (!showPriceFilter) {
      const { minPrice, maxPrice, ...rest } = categories;
      onCategoryChange(rest);
    } else {
      onCategoryChange(categories);
    }
  };


  const { data: categories } = useQuery<DbCategory[]>({
    queryKey: ["/api/categories"],
  });

  const { data: subcategories } = useQuery<Subcategory[]>({
    queryKey: ["/api/subcategories"],
  });

  const { data: authors = [] } = useQuery<string[]>({
    queryKey: ["/api/courses-metadata/authors", selectedCategories.platform, authorSearchDebounced],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategories.platform) {
        params.append("platform", selectedCategories.platform);
      }
      if (authorSearchDebounced) {
        params.append("search", authorSearchDebounced);
      }
      const url = `/api/courses-metadata/authors${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    },
    enabled: !!selectedCategories.platform,
  });

  // Reset displayed count when search changes
  useEffect(() => {
    setDisplayedAuthorsCount(20);
  }, [authorSearchDebounced]);

  // Close authors list when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (authorsContainerRef.current && !authorsContainerRef.current.contains(event.target as Node)) {
        setShowAuthorsList(false);
      }
    };

    if (showAuthorsList) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showAuthorsList]);

  // Handle infinite scroll for authors
  const handleAuthorsScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrolledToBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 50;

    if (scrolledToBottom && displayedAuthorsCount < authors.length) {
      setDisplayedAuthorsCount(prev => Math.min(prev + 20, authors.length));
    }
  }, [authors.length, displayedAuthorsCount]);

  const { data: years = [] } = useQuery<number[]>({
    queryKey: ["/api/courses-metadata/years", selectedCategories.platform],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategories.platform) {
        params.append("platform", selectedCategories.platform);
      }
      const url = `/api/courses-metadata/years${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    },
  });

  const { data: courseLevels = [] } = useQuery<string[]>({
    queryKey: ["/api/courses-metadata/levels", selectedCategories.platform],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategories.platform) {
        params.append("platform", selectedCategories.platform);
      }
      const url = `/api/courses-metadata/levels${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    },
  });

  // Query for VIP page content (for title)
  const { data: vipPageContent } = useQuery<{ pageTitle: string; pageSubtitle: string }>({
    queryKey: ["/api/vip-page-content"],
  });

  // Query for max price (optionally filtered by platform)
  const { data: maxPrice = 50000 } = useQuery<number>({
    queryKey: ["/api/courses-metadata/max-price", selectedCategories.platform],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategories.platform) {
        params.append("platform", selectedCategories.platform);
      }
      const url = `/api/courses-metadata/max-price${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    },
  });

  const [localPriceRange, setLocalPriceRange] = useState<[number, number]>([
    selectedCategories.minPrice ?? 0,
    selectedCategories.maxPrice ?? maxPrice,
  ]);

  const handleShopLinkClick = (e: MouseEvent) => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      e.preventDefault();
      window.location.assign("/shop");
    }
  };

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const handlePlatformClick = (platform: string, platformName: string, categoryId?: string, parentCategoryId?: string) => {
    // When changing platform, reset level, year, and author filters
    // to avoid showing invalid filter combinations
    if (selectedCategories.platform === platform) {

    } else {
      // Track filter click for analytics (only when selecting, not deselecting)
      trackFilterClick('category', categoryId || null, platformName);

      // Selecting a new platform - reset dependent filters
      const newCategories: any = {
        platform: platform,
        minRating: selectedCategories.minRating,
        levels: [parentCategoryId]
      };
      // Keep price filters if they exist (for shop page)
      if (selectedCategories.minPrice !== undefined) {
        newCategories.minPrice = selectedCategories.minPrice;
      }
      if (selectedCategories.maxPrice !== undefined) {
        newCategories.maxPrice = selectedCategories.maxPrice;
      }
      handleCategoryChange(newCategories);
    }
  };

  const handleLevelClick = (level: string) => {
    handleCategoryChange({
      ...selectedCategories,
      level: selectedCategories.level === level ? undefined : level,
    });
  };

  const handleYearClick = (year: number) => {
    handleCategoryChange({
      ...selectedCategories,
      year: selectedCategories.year === year ? undefined : year,
    });
  };

  const handlePriceChange = (values: number[]) => {
    setLocalPriceRange([values[0], values[1]]); // только обновляем локальное состояние
  };

  const handlePriceCommit = (values: number[]) => {
    // При отпускании слайдера — отправляем запрос на сервер
    handleCategoryChange({
      ...selectedCategories,
      minPrice: values[0],
      maxPrice: values[1],
    });
  };

  const handleRatingChange = (value: string) => {
    handleCategoryChange({
      ...selectedCategories,
      minRating: value === "none" ? undefined : parseFloat(value),
    });
  };

  const handleAuthorChange = (value: string) => {
    // Track filter click for analytics (only when selecting a specific author)
    if (value !== "all") {
      trackFilterClick('author', null, value);
    }

    handleCategoryChange({
      ...selectedCategories,
      author: value === "all" ? undefined : value,
    });
  };

  // Build hierarchical platform structure (exclude "Уровень" category)
  const mainCategories = (categories || [])
    .filter(cat => cat.isActive && !cat.parentId && cat.slug !== 'level');

  const platformsHierarchy = mainCategories.map(mainCat => ({
    id: mainCat.slug,
    name: mainCat.name,
    categoryId: mainCat.id,
    children: (categories || [])
      .filter(cat => cat.isActive && cat.parentId === mainCat.id)
      .map(child => ({
        id: child.slug,
        name: child.name,
        categoryId: child.id,
      })),
  }));

  const getLevelName = (level: string) => {
    const names: Record<string, string> = {
      beginner: "Для новичков",
      "Начинающий": "Для новичков",
      intermediate: "Для опытных",
      "Средний": "Для опытных",
      advanced: "Продвинутый",
      "Продвинутый": "Продвинутый",
      "Эксперт": "Эксперт",
    };
    return names[level] || level;
  };

  // Map and deduplicate levels
  const levelMap = new Map<string, string>();
  courseLevels.forEach(level => {
    const mappedName = getLevelName(level);
    if (!levelMap.has(mappedName)) {
      levelMap.set(mappedName, level);
    }
  });
  const levels = Array.from(levelMap.entries()).map(([name, id]) => ({
    id,
    name,
  }));

  const authorsWithAll = [{ id: "all", name: "Все авторы" }, ...authors.map(a => ({ id: a, name: a }))];
  const displayedAuthors = authorsWithAll.slice(0, displayedAuthorsCount);

  const priceRange = [
    selectedCategories.minPrice ?? 0,
    selectedCategories.maxPrice ?? maxPrice,
  ];

  // Auto-expand parent nodes when a platform is selected (e.g., from URL)
  // Only auto-expands ONCE per platform selection to allow manual collapse
  useEffect(() => {
    if (!selectedCategories.platform) {
      // Platform was deselected - reset ref to allow future auto-expansion
      autoExpandedPlatformRef.current = null;
      return;
    }

    // Already auto-expanded this platform - don't interfere with manual toggles
    if (autoExpandedPlatformRef.current === selectedCategories.platform) {
      return;
    }

    // Mark this platform as auto-expanded
    autoExpandedPlatformRef.current = selectedCategories.platform;

    // Use functional update to respect current state
    setExpandedNodes(prev => {
      const newExpanded = new Set(prev);

      // Ensure "platforms" is expanded
      newExpanded.add("platforms");

      // Find the parent category for the selected platform
      for (const mainPlatform of platformsHierarchy) {
        // Check if this is a child platform (single slug like "wb", "ozon")
        const isChildPlatform = mainPlatform.children.some(
          child => child.id === selectedCategories.platform
        );

        if (isChildPlatform) {
          newExpanded.add(`platform-${mainPlatform.id}`);
          break;
        }

        // Also handle main category selection (combined slugs)
        const childSlugs = mainPlatform.children.map(c => c.id).join(',');
        if (selectedCategories.platform === childSlugs) {
          newExpanded.add(`platform-${mainPlatform.id}`);
          break;
        }
      }

      return newExpanded;
    });
  }, [selectedCategories.platform, platformsHierarchy]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const platformId = params.get('platform'); // ID основной категории (опционально)
    const levelParam = params.get('level') || ''
    const levelIds = levelParam.split(',').map(id => id.trim()).filter(Boolean);

    if (!platformId && !levelParam) return;

    setExpandedNodes((prev) => {
      const newSet = new Set(prev);

      // Очищаем старые platform-*
      for (const node of newSet) {
        if (node.startsWith("platform-")) newSet.delete(node);
      }

      // Очищаем старые subcategories-*
      for (const node of newSet) {
        if (node.startsWith("subcategories-")) newSet.delete(node);
      }

      let levelIdToUse = '';
      // 1. Если есть явный platform в URL — открываем его
      if (levelParam) {
        levelIdToUse = levelIds.length > 1 ? levelIds[levelIds.length - 1] : levelParam
        const platform = categories?.find(cat => cat.id === levelIdToUse);

        if (platform) {
          const name = platform.nameEn || platform.name || platformId;
          newSet.add(`platform-${name}`);

          onCategoryChange((prev: any) => ({
            ...prev,
            platform: platformId
          }))
        }
      }

      const subcategory = categories?.find(cat => cat.id === platformId)

      if (subcategory) {
        const subName = subcategory.nameEn || subcategory.name || levelIdToUse;
        newSet.add(`subcategories-${subName}`);
      }

      return newSet;
    });
  }, [location, categories, subcategories]);

  useEffect(() => {
  }, [expandedNodes])

  return (
    <aside
      className={cn(
        "w-80 border-r border-border bg-sidebar flex-shrink-0 overflow-y-auto hide-scrollbar transition-all duration-200",
        // Mobile: hidden by default, shown when isOpen=true
        // Desktop (lg:): always visible
        isOpen ? "translate-x-0" : "-translate-x-full",
        "lg:translate-x-0",
        "fixed lg:sticky top-16 lg:top-20 h-[calc(100vh-4rem)] lg:h-[calc(100vh-5rem)] z-40 lg:z-0"
      )}
      data-testid="sidebar"
    >
      <div className="p-4 space-y-2">
        <div className="space-y-1">
          {/* Main Navigation - visible on mobile */}
          <div className="lg:hidden space-y-1 pb-2 mb-2 border-b border-border">

            <Link href="/shop" onClick={handleShopLinkClick}>
              <div className="flex items-center gap-2 px-2 py-1.5 text-sm font-semibold cursor-pointer hover-elevate rounded-md transition-all" data-testid="link-sidebar-shop">
                <ShoppingBag className="h-4 w-4 text-primary" />
                <span>Магазин</span>
              </div>
            </Link>

            <Link href="/library">
              <div className="flex items-center gap-2 px-2 py-1.5 text-sm font-semibold cursor-pointer hover-elevate rounded-md transition-all" data-testid="link-sidebar-library">
                <BookOpen className="h-4 w-4 text-primary" />
                <span>Библиотека</span>
              </div>
            </Link>

            <Link href="/bonuses">
              <div className="flex items-center gap-2 px-2 py-1.5 text-sm font-semibold cursor-pointer hover-elevate rounded-md transition-all" data-testid="link-sidebar-bonuses">
                <Gift className="h-4 w-4 text-primary" />
                <span>Бонусы</span>
              </div>
            </Link>

            <Link href="/trade-in">
              <div className="flex items-center gap-2 px-2 py-1.5 text-sm font-semibold cursor-pointer hover-elevate rounded-md transition-all" data-testid="link-sidebar-trade-in">
                <RefreshCw className="h-4 w-4 text-primary" />
                <span>Trade-In</span>
              </div>
            </Link>
          </div>

          {!hideVipAndFavorites && (
            <Link href="/vip">
              <div className="flex items-center gap-2 px-2 py-1.5 text-sm font-semibold cursor-pointer hover-elevate rounded-md transition-all vip-shimmer" data-testid="link-vip">
                <Crown className="h-4 w-4 text-yellow-500" />
                <span className="text-yellow-500">{vipPageContent?.pageTitle || 'VIP Подписка'}</span>
              </div>
            </Link>
          )}

          {!hideVipAndFavorites && (
            <Link href="/favorites">
              <div className="flex items-center gap-2 px-2 py-1.5 text-sm font-semibold cursor-pointer hover-elevate rounded-md transition-all" data-testid="link-favorites">
                <Heart className="h-4 w-4 text-red-500" />
                <span className="text-red-500">Избранное</span>
              </div>
            </Link>
          )}

          <Link href={catalogPath} onClick={() => handleCategoryChange({})}>
            <div className="flex items-center gap-2 px-2 py-1.5 text-sm font-semibold cursor-pointer hover-elevate rounded-md transition-all" data-testid="link-catalog">
              <FolderOpen className="h-4 w-4 text-primary" />
              <span>Каталог курсов</span>
            </div>
          </Link>

          <div className="ml-4 space-y-1">
            <button
              onClick={() => toggleNode("platforms")}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md hover-elevate w-full text-left text-sm"
              data-testid="button-toggle-platforms"
            >
              {expandedNodes.has("platforms") ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <span>Платформы</span>
            </button>

            {expandedNodes.has("platforms") && (
              <div className="ml-6 space-y-1">
                {platformsHierarchy.map((mainPlatform) => {
                  const childSlugs = mainPlatform.children.map(c => c.id).join(',');
                  const isMainSelected = selectedCategories.platform === childSlugs;

                  const newLevels = selectedCategories.levels?.includes(mainPlatform.categoryId)
                    ? selectedCategories.levels.filter(id => id !== mainPlatform.categoryId)
                    : [mainPlatform.categoryId];

                  return (
                    <div key={mainPlatform.id} className="space-y-1">
                      {/* Main category - whole button toggles expand/collapse */}
                      <button
                        onClick={() => {
                          const currentCategoryId = mainPlatform.categoryId;

                          // 1. Обновляем selectedCategories.levels
                          // Если эта категория уже выбрана → удаляем её
                          // Иначе → оставляем только её (или добавляем, в зависимости от твоей текущей логики)
                          let newLevels: string[] | undefined;

                          if (selectedCategories.levels?.includes(currentCategoryId)) {
                            // Уже выбрана → деселектим (удаляем)
                            newLevels = selectedCategories.levels.filter(id => id !== currentCategoryId);
                          } else {
                            // Не выбрана → выбираем только эту (или добавляем — зависит от твоего поведения)
                            // Здесь я предполагаю "только эта", как в подкатегориях
                            newLevels = [currentCategoryId];
                            // Если нужно добавлять, а не заменять — используй:
                            // newLevels = [...(selectedCategories.levels || []), currentCategoryId];
                          }

                          handleCategoryChange({
                            ...selectedCategories,
                            platform: '',
                            levels: newLevels.length > 0 ? newLevels : undefined,
                          });

                          // 2. Управление раскрытием (expandedNodes)
                          setExpandedNodes((prev) => {
                            const newSet = new Set(prev);

                            // Всегда очищаем ВСЕ platform-XXX перед дальнейшими действиями
                            [...newSet].forEach((node) => {
                              if (node.startsWith("platform-")) {
                                newSet.delete(node);
                              }
                            });

                            const currentNode = `platform-${mainPlatform.id}`;

                            // Если мы деселектим платформу (удаляем из levels) → НЕ открываем её
                            if (newLevels?.includes(currentCategoryId)) {
                              // Платформа остаётся/становится выбранной → открываем (или оставляем открытой)
                              newSet.add(currentNode);
                            }
                            // else — если удалили → она уже очищена выше, ничего не добавляем

                            return newSet;
                          });
                        }}
                        className={cn(
                          "flex items-center gap-2 px-2 py-1.5 rounded-md w-full text-left text-sm hover-elevate transition-all",
                          selectedCategories.levels?.includes(mainPlatform.categoryId) &&
                          "bg-sidebar-accent text-sidebar-accent-foreground toggle-elevate toggle-elevated"
                        )}
                        data-testid={`button-main-platform-${mainPlatform.id}`}
                      >
                        {expandedNodes.has(`platform-${mainPlatform.id}`) ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}

                        <span className="font-medium">{mainPlatform.name}</span>
                      </button>

                      {/* Child categories */}
                      {expandedNodes.has(`platform-${mainPlatform.id}`) && mainPlatform.children.length > 0 && (
                        <div className="ml-6 space-y-1">
                          {mainPlatform.children.map((child) => {
                            // Находим все подкатегории, принадлежащие текущему child (платформе)
                            const childSubcategories = subcategories?.filter(
                              sub => sub.categoryId === child.categoryId && sub.isActive
                            ) || [];

                            // Состояние раскрытия подкатегорий для этого child
                            const isChildExpanded = expandedNodes.has(`subcategories-${child.id}`);

                            return (
                              <div key={child.id} className="space-y-1">
                                {/* Сама платформа (child) — кликабельная, с возможностью раскрытия подкатегорий */}
                                <button
                                  onClick={() => {
                                    const currentPlatformId = child.id;
                                    const currentCategoryId = child.categoryId;

                                    // 1. Логика выбора / снятия выбора платформы
                                    const isCurrentlySelected = selectedCategories.platform === currentCategoryId

                                    if (isCurrentlySelected) {
                                      // уже выбрана → снимаем выбор

                                      onCategoryChange((prev) => ({ ...prev, platform: '' }))
                                      handlePlatformClick(null, null, null, mainPlatform.categoryId); // ← подставь правильный вызов для deselect
                                      // если handlePlatformClick не поддерживает null — можно:
                                      // handlePlatformClick(undefined, undefined, undefined);
                                    } else {
                                      // не выбрана → выбираем эту платформу

                                      handlePlatformClick(currentCategoryId, child.name, currentCategoryId, mainPlatform.categoryId);

                                      const categoryId = mainPlatform.categoryId;

                                      // Добавляем только если ещё нет
                                      if (!selectedCategories.levels?.includes(categoryId)) {

                                        onCategoryChange((prev) => ({
                                          ...prev,
                                          levels: [...(prev.levels ?? []), categoryId],
                                        }));
                                      }
                                    }

                                    // 2. Управление раскрытием подкатегорий (только если они есть)
                                    if (childSubcategories.length > 0) {
                                      setExpandedNodes((prev) => {
                                        const newSet = new Set(prev);

                                        // Закрываем ВСЕ subcategories-XXX от других child-платформ
                                        [...newSet].forEach((node) => {
                                          if (node.startsWith("subcategories-")) {
                                            newSet.delete(node);
                                          }
                                        });

                                        const nodeId = `subcategories-${child.id}`;

                                        // Открываем подкатегории ТОЛЬКО если платформа теперь выбрана
                                        if (!isCurrentlySelected) {
                                          // была не выбрана → теперь выбрана → открываем
                                          newSet.add(nodeId);
                                        }
                                        // если была выбрана → теперь снята → остаётся закрытой (уже удалили выше)

                                        return newSet;
                                      });
                                    }
                                  }}
                                  className={cn(
                                    "flex items-center justify-between gap-2 px-2 py-1.5 rounded-md w-full text-left text-sm hover-elevate transition-all",
                                    selectedCategories.platform === child.categoryId &&
                                    "bg-sidebar-accent text-sidebar-accent-foreground toggle-elevate toggle-elevated"
                                  )}
                                  data-testid={`button-platform-${child.id}`}
                                >
                                  <div className="flex items-center gap-2">
                                    {childSubcategories.length > 0 ? (
                                      isChildExpanded ? (
                                        <ChevronDown className="h-3 w-3 flex-shrink-0" />
                                      ) : (
                                        <ChevronRight className="h-3 w-3 flex-shrink-0" />
                                      )
                                    ) : (
                                      <div className="w-4" />
                                    )}
                                    <span>{child.name}</span>
                                  </div>

                                </button>

                                {/* Подкатегории — третий уровень */}
                                {isChildExpanded && childSubcategories.length > 0 && (
                                  <div className="ml-8 space-y-1">
                                    {childSubcategories.map((subcat) => (
                                      <button
                                        key={subcat.id}
                                        onClick={() => {
                                          const subcatId = subcat.id;
                                          const platformCategoryId = mainPlatform.categoryId;

                                          // 1. Текущие levels (или пустой массив, если undefined)
                                          const currentLevels = selectedCategories.levels ?? [];

                                          // 2. Toggle подкатегории
                                          let newLevels = currentLevels.includes(subcatId)
                                            ? currentLevels.filter(id => id !== subcatId) // убираем, если уже есть
                                            : [subcatId];               // добавляем, если нет

                                          // 3. Добавляем mainPlatform.categoryId ТОЛЬКО если его ещё нет
                                          if (!newLevels.includes(platformCategoryId)) {
                                            newLevels = [...newLevels, platformCategoryId];
                                          }

                                          // 4. Если после всех операций levels пустой → можно установить undefined (по твоей логике)
                                          const finalLevels = newLevels.length > 0 ? newLevels : undefined;

                                          handleCategoryChange({
                                            ...selectedCategories,
                                            levels: finalLevels,
                                          });

                                          trackFilterClick('subcategory', subcat.id, subcat.name);
                                        }}
                                        className={cn(
                                          "flex items-center gap-2 px-2 py-1.5 rounded-md w-full text-left text-xs hover:bg-accent/50 transition-all pl-6",
                                          selectedCategories.levels?.includes(subcat.id) &&
                                          "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                                        )}
                                        data-testid={`button-subcategory-${subcat.id}`}
                                      >
                                        <span className={cn(
                                          "text-muted-foreground",
                                          selectedCategories.levels?.includes(subcat.id) && "text-sidebar-accent-foreground font-medium"
                                        )}>
                                          {subcat.name}
                                        </span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="ml-4 space-y-1">
            {expandedNodes.has("levels") && (
              <div className="ml-6 space-y-1">

                {Array.isArray(levels) && levels.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {Array.from(
                      new Set(
                        levels.map((level) => {
                          const sub = subcategories.find(sub => sub.id === level.id);
                          const category = categories.find(cat => cat.id === sub?.categoryId);
                          return {
                            ...level,
                            subcategoryName: sub?.name,
                            categoryName: category?.name
                          };
                        })
                      )
                    ).map(level => (
                      <button
                        key={level?.id}
                        onClick={() => handleLevelClick(level.id)}
                        className={cn(
                          "flex items-center gap-2 px-2 py-1.5 rounded-md w-full text-left text-sm hover-elevate transition-all",
                          selectedCategories.level === level?.id &&
                          "bg-sidebar-accent text-sidebar-accent-foreground toggle-elevate toggle-elevated"
                        )}
                        data-testid={`button-level-${level.id}`}
                      >

                        <div className="flex flex-col">
                          <span>{level.categoryName}</span>
                          {level.categoryName && (
                            <span className="text-xs text-muted-foreground">
                              {level.subcategoryName}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}


                {/* {levels.map((level) => (
                  <button
                    key={level.id}
                    onClick={() => handleLevelClick(level.id)}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 rounded-md w-full text-left text-sm hover-elevate transition-all",
                      selectedCategories.level === level.id &&
                      "bg-sidebar-accent text-sidebar-accent-foreground toggle-elevate toggle-elevated"
                    )}
                    data-testid={`button-level-${level.id}`}
                  >
                    
                    <span>{level.name}</span>
                  </button>
                ))} */}
              </div>
            )}
          </div>

          <div className="ml-4 space-y-1">
            <button
              onClick={() => toggleNode("years")}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md hover-elevate w-full text-left text-sm"
              data-testid="button-toggle-years"
            >
              {expandedNodes.has("years") ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <span>Год</span>
            </button>

            {expandedNodes.has("years") && (
              <div className="ml-6 space-y-1">
                {years.map((year) => (
                  <button
                    key={year}
                    onClick={() => handleYearClick(year)}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 rounded-md w-full text-left text-sm hover-elevate transition-all",
                      selectedCategories.year === year &&
                      "bg-sidebar-accent text-sidebar-accent-foreground toggle-elevate toggle-elevated"
                    )}
                    data-testid={`button-year-${year}`}
                  >

                    <span>{year}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="ml-4 space-y-3 pt-4 border-t border-sidebar-border">
            {showPriceFilter && (
              <div className="space-y-2">
                <Label className="text-sm font-medium px-2">Цена (₽)</Label>
                <div className="px-4 py-2 space-y-2">
                  <Slider
                    min={0}
                    max={maxPrice}
                    step={1000}
                    value={localPriceRange}
                    onValueChange={handlePriceChange}
                    onValueCommit={handlePriceCommit}
                    className="w-full"
                    data-testid="slider-price-range"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span data-testid="text-min-price">{formatPrice(priceRange[0])} ₽</span>
                    <span data-testid="text-max-price">{formatPrice(priceRange[1])} ₽</span>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-sm font-medium px-2">Минимальный рейтинг</Label>
              <div className="px-2">
                <Select
                  value={selectedCategories.minRating?.toString() ?? "none"}
                  onValueChange={handleRatingChange}
                >
                  <SelectTrigger data-testid="select-min-rating" className="w-full">
                    <SelectValue placeholder="Любой рейтинг" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Любой рейтинг</SelectItem>
                    <SelectItem value="4">4+ ⭐</SelectItem>
                    <SelectItem value="4.5">4.5+ ⭐</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedCategories.platform && (
              <div className="space-y-2">
                <Label className="text-sm font-medium px-2">Автор курса</Label>
                <div className="px-2 space-y-2" ref={authorsContainerRef}>
                  {/* Search input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Поиск автора..."
                      value={authorSearch}
                      onChange={(e) => setAuthorSearch(e.target.value)}
                      onFocus={() => setShowAuthorsList(true)}
                      className="pl-9 pr-9"
                      data-testid="input-author-search"
                    />
                    {authorSearch && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                        onClick={() => {
                          setAuthorSearch("");
                          setShowAuthorsList(false);
                        }}
                        data-testid="button-clear-author-search"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {/* Authors list with infinite scroll - shown only when focused */}
                  {showAuthorsList && (
                    <div className="max-h-[200px] rounded-md border overflow-auto" onScroll={handleAuthorsScroll} ref={authorsScrollRef}>
                      <div className="p-2 space-y-1" data-testid="authors-list">
                        {displayedAuthors.length > 0 ? (
                          displayedAuthors.map((author) => (
                            <button
                              key={author.id}
                              onClick={() => {
                                handleAuthorChange(author.id);
                                setShowAuthorsList(false);
                                setAuthorSearch("");
                              }}
                              className={cn(
                                "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                                selectedCategories.author === author.id || (!selectedCategories.author && author.id === "all")
                                  ? "bg-accent text-accent-foreground font-medium"
                                  : "hover-elevate"
                              )}
                              data-testid={`button-author-${author.id}`}
                            >
                              {author.name}
                            </button>
                          ))
                        ) : (
                          <div className="text-center py-4 text-sm text-muted-foreground">
                            Авторы не найдены
                          </div>
                        )}
                        {displayedAuthorsCount < authorsWithAll.length && (
                          <div className="text-center py-2 text-xs text-muted-foreground">
                            Показано {displayedAuthorsCount} из {authorsWithAll.length}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="ml-4 pt-4 border-t border-sidebar-border">
            <button
              onClick={() => handleCategoryChange({})}
              className="px-2 py-1.5 rounded-md hover-elevate w-full text-left text-sm text-muted-foreground hover:text-foreground transition-all"
              data-testid="button-clear-filters"
            >
              Сбросить фильтры
            </button>
          </div>

          <div className="ml-4 pt-4 border-t border-sidebar-border">
            <Link href="/help">
              <div className="flex items-center gap-2 px-2 py-1.5 text-sm font-semibold cursor-pointer hover-elevate rounded-md transition-all" data-testid="link-help">
                <HelpCircle className="h-4 w-4 text-primary" />
                <span>Помощь</span>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}
