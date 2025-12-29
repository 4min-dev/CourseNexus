import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueries } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen, Crown, Shield, Sparkles, Check, Gem, RefreshCw, ArrowRight, TrendingUp, Target, Crosshair, ThumbsUp, Users, Gift, Percent, ExternalLink, CheckCircle2, XCircle, Wifi, Link2, Lock, Bell, AlertCircle } from "lucide-react";
import { SiTelegram } from "react-icons/si";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import type { Course, Category, Subcategory } from "@shared/schema";
import { Header } from "@/components/header";
import { InfoBanner } from "@/components/info-banner";
import { Sidebar } from "@/components/sidebar";
import { MobileFilters } from "@/components/MobileFilters";
import { Footer } from "@/components/footer";
import { Pagination } from "@/components/pagination";
import { TopCourses } from "@/components/TopCourses";
import { PageNavigation } from "@/components/PageNavigation";
import { SwipeableCarousel } from "@/components/SwipeableCarousel";
import { apiRequest, queryClient } from "@/lib/queryClient";
import tradeInImage from "@assets/generated_images/UNO_style_trade_cards_illustration_11a5fb90.png";
import sniperImage from "@assets/generated_images/Influencer_in_sniper_crosshair_2bdcbb43.png";
import referralImage from "@assets/generated_images/Referral_network_illustration_951f8395.png";
import ShopMobileCard from "@/components/ui/shop-mobile-card";
import MobileVipCard from "@/components/ui/mobile-vip-card";
import PackageCard from "@/components/ui/packageCard";
import VipCard from "@/components/ui/vip-card";
import ShopDesktopCard from "@/components/ui/shop-desktop-card";
import { useIsMobile } from "@/hooks/useIsMobile";

const COURSES_PER_PAGE = 12;

export interface VipTier {
  id: string;
  tier: string;
  displayName: string;
  description?: string;
  price?: string;
  features: string[];
  displayOrder: number;
}

interface CoursePackage {
  id: string;
  name: string;
  description: string | null;
  thumbnailUrl: string | null;
  discount: number;
  displayOrder: number;
  isActive: boolean;
  courses: Course[];
  totalPrice: number;
  discountedPrice: number;
}

export default function Shop() {
  const { isAuthenticated, user } = useAuth();
  const [location, setLocation] = useLocation();
  const [selectedCategories, setSelectedCategories] = useState<{
    platform?: string;
    levels?: string;
    year?: number;
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    author?: string;
  }>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState(searchQuery);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1); // Для desktop пагинации
  const [visiblePageRange, setVisiblePageRange] = useState({ start: 1, end: 1 }); // Для mobile infinite scroll
  const [currentVisiblePage, setCurrentVisiblePage] = useState(1); // Отслеживание текущей видимой страницы для пагинатора
  const [carouselInitialIndex, setCarouselInitialIndex] = useState(0); // Начальный индекс для карусели (0 или 11)
  const [hoveredVipId, setHoveredVipId] = useState<string | null>(null);
  const [activeMobileCourseId, setActiveMobileCourseId] = useState<string | null>(null);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [loadedImageUrls, setLoadedImageUrls] = useState<Set<string>>(new Set());
  const isMobile = useIsMobile()

  // Telegram reminder modal states
  const { toast } = useToast();
  const [showTelegramReminder, setShowTelegramReminder] = useState(false);
  const [showTelegramCodeInput, setShowTelegramCodeInput] = useState(false);
  const [telegramCodeModal, setTelegramCodeModal] = useState("");
  const [isLinkingTelegram, setIsLinkingTelegram] = useState(false);

  // Query for site settings (to check if 2FA is required and get bot username)
  const { data: siteSettings } = useQuery<{
    require2FA: 'disabled' | 'optional' | 'mandatory';
    telegramBotUsername: string;
  }>({
    queryKey: ["/api/site-settings"],
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput.trim());
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }

    const storageKey = `telegramModalState:${user.id}`;
    const savedState = localStorage.getItem(storageKey);

    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        console.log('[Shop] Restoring Telegram modal state from localStorage:', state);

        if (state.isOpen) {
          setShowTelegramReminder(true);
          setShowTelegramCodeInput(state.codeInputShown || false);
          setTelegramCodeModal(state.code || "");
        }
      } catch (error) {
        console.error('[Shop] Failed to restore Telegram modal state:', error);
        localStorage.removeItem(storageKey);
      }
    }
  }, [isAuthenticated, user]);

  // Check Telegram linking status and show reminder if needed
  useEffect(() => {
    // Skip if user is not authenticated or data is loading
    if (!isAuthenticated || !user) {
      return;
    }

    // Skip if 2FA mode is disabled (no modal should be shown)
    if (siteSettings?.require2FA === 'disabled') {
      console.log('[Shop] 2FA mode is disabled, not showing modal');
      return;
    }

    // Check registration flag first (takes priority)
    const registrationFlag = sessionStorage.getItem('showTelegramReminder');
    if (registrationFlag === 'true') {
      console.log('[Shop] Found registration flag, showing modal');
      setShowTelegramReminder(true);
      sessionStorage.removeItem('showTelegramReminder');
      return;
    }

    // Check if Telegram is not linked
    if (!user.telegramChatId) {
      // Check if we've already shown the modal this session for this user
      const sessionKey = `telegramReminderShown:${user.id}`;
      const alreadyShown = sessionStorage.getItem(sessionKey);

      if (!alreadyShown) {
        console.log('[Shop] User has no Telegram linked, showing reminder modal');
        setShowTelegramReminder(true);
        // Mark as shown for this session
        sessionStorage.setItem(sessionKey, 'true');
      }
    }
  }, [isAuthenticated, user, siteSettings]);

  // Save Telegram modal state to localStorage whenever it changes
  useEffect(() => {
    if (!user) return;

    const storageKey = `telegramModalState:${user.id}`;

    if (showTelegramReminder) {
      const state = {
        isOpen: true,
        codeInputShown: showTelegramCodeInput,
        code: telegramCodeModal,
        timestamp: Date.now()
      };
      localStorage.setItem(storageKey, JSON.stringify(state));
      console.log('[Shop] Saved Telegram modal state to localStorage');
    } else {
      // Clear saved state when modal is closed
      localStorage.removeItem(storageKey);
      console.log('[Shop] Cleared Telegram modal state from localStorage');
    }
  }, [showTelegramReminder, showTelegramCodeInput, telegramCodeModal, user]);

  // Read URL parameters and update filters whenever location changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const filters: typeof selectedCategories = {};

    const platform = params.get('platform');
    const level = params.get('level');
    const year = params.get('year');
    const minPrice = params.get('minPrice');
    const maxPrice = params.get('maxPrice');
    const minRating = params.get('minRating');
    const author = params.get('author');
    const search = params.get('search');

    if (platform) filters.platform = platform;
    if (level) filters.level = level;
    if (year) filters.year = parseInt(year);
    if (minPrice) filters.minPrice = parseFloat(minPrice);
    if (maxPrice) filters.maxPrice = parseFloat(maxPrice);
    if (minRating) filters.minRating = parseFloat(minRating);
    if (author) filters.author = author;

    if (Object.keys(filters).length > 0) {
      setSelectedCategories(filters);
    } else {
      // Reset filters if no URL params
      setSelectedCategories({});
    }
    if (search) {
      setSearchQuery(search);
      setSearchInput(search)
    } else {
      setSearchQuery("");
      setSearchInput("")
    }
  }, [location]);

  // Save current shop URL to sessionStorage on mount and when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedCategories.platform) params.set('platform', selectedCategories.platform);
    if (selectedCategories.level) params.set('level', selectedCategories.level);
    if (selectedCategories.year) params.set('year', selectedCategories.year.toString());
    if (selectedCategories.minPrice !== undefined) params.set('minPrice', selectedCategories.minPrice.toString());
    if (selectedCategories.maxPrice !== undefined) params.set('maxPrice', selectedCategories.maxPrice.toString());
    if (selectedCategories.minRating !== undefined) params.set('minRating', selectedCategories.minRating.toString());
    if (selectedCategories.author) params.set('author', selectedCategories.author);
    if (searchQuery) params.set('search', searchQuery);

    const newUrl = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
    window.history.replaceState({}, '', newUrl);

    sessionStorage.setItem('shopUrl', window.location.pathname + window.location.search);
  }, [selectedCategories, searchQuery]);

  // No separate preview query needed - previewVideoUrl comes with course data!

  // Separate query for VIP subscriptions
  const { data: vipSubscriptions, isLoading: vipLoading } = useQuery<Course[]>({
    queryKey: ["/api/courses", { vipOnly: true }],
    queryFn: async () => {
      const res = await fetch("/api/courses?vipOnly=true", {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    },
  });

  // Query for VIP tiers metadata
  const { data: vipTiers } = useQuery<VipTier[]>({
    queryKey: ["/api/vip-tiers"],
  });

  // Query for VIP page content (for title)
  const { data: vipPageContent, isLoading: vipPageContentLoading } = useQuery<{ pageTitle: string; pageSubtitle: string }>({
    queryKey: ["/api/vip-page-content"],
  });

  // Query for categories (to map platform slugs to category IDs)
  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  // Query for subcategories (to map slugs to Russian names)
  const { data: subcategories } = useQuery<Subcategory[]>({
    queryKey: ["/api/subcategories"],
  });

  // Get current category ID from selected platform
  const currentCategoryId = useMemo(() => {
    if (!selectedCategories.platform || !categories) return undefined;

    // Get first platform slug from comma-separated string
    const firstPlatformSlug = selectedCategories.platform.split(',')[0]?.trim();
    if (!firstPlatformSlug) return undefined;

    // Platform slug mapping
    const platformMap: Record<string, string> = {
      'wb': 'Wildberries',
      'ozon': 'Ozon',
      'yandex': 'Yandex.Market',
      'ai': 'Искусственный интеллект',
    };

    const platformName = platformMap[firstPlatformSlug] || firstPlatformSlug;
    const category = categories.find(c => c.name === platformName);
    return category?.id;
  }, [selectedCategories.platform, categories]);

  // Query for course packages (filtered by current category)
  const { data: coursePackages, isLoading: packagesLoading } = useQuery<CoursePackage[]>({
    queryKey: ["/api/packages", currentCategoryId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (currentCategoryId) params.set('categoryId', currentCategoryId);

      const url = `/api/packages${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    },
  });

  // Memoize query key to prevent unnecessary re-fetches
  const coursesQueryKey = useMemo(() => [
    "/api/courses",
    selectedCategories.platform,
    selectedCategories.level,
    selectedCategories.year,
    selectedCategories.minPrice,
    selectedCategories.maxPrice,
    selectedCategories.minRating,
    selectedCategories.author,
    searchQuery
  ], [
    selectedCategories.platform,
    selectedCategories.level,
    selectedCategories.year,
    selectedCategories.minPrice,
    selectedCategories.maxPrice,
    selectedCategories.minRating,
    selectedCategories.author,
    searchQuery
  ]);

  const { data: allCourses, isLoading } = useQuery<Course[]>({
    queryKey: coursesQueryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategories.platform) params.append("platform", selectedCategories?.platform || params.get('platform') || '');
      if (selectedCategories.level) params.append("level", selectedCategories.level);
      if (selectedCategories.year) params.append("year", selectedCategories.year.toString());
      if (selectedCategories.minPrice !== undefined) params.append("minPrice", selectedCategories.minPrice.toString());
      if (selectedCategories.maxPrice !== undefined) params.append("maxPrice", selectedCategories.maxPrice.toString());
      if (selectedCategories.minRating !== undefined) params.append("minRating", selectedCategories.minRating.toString());
      if (selectedCategories.author) params.append("author", selectedCategories.author);
      if (searchQuery) params.append("search", searchQuery);

      const url = `/api/courses${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    },
    enabled: !!categories
  });

  const { data: purchases } = useQuery<{ courseId: string }[]>({
    queryKey: ["/api/purchases"],
    enabled: isAuthenticated,
  });

  const { data: favorites } = useQuery<{ courseId: string }[]>({
    queryKey: ["/api/favorites"],
    enabled: isAuthenticated,
  });

  const favoriteMutation = useMutation({
    mutationFn: async ({ courseId, isFavorited }: { courseId: string; isFavorited: boolean }) => {
      if (isFavorited) {
        await apiRequest("DELETE", `/api/favorites/${courseId}`);
      } else {
        await apiRequest("POST", `/api/favorites/${courseId}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
    },
  });

  const purchasedCourseIds = new Set(purchases?.map((p) => p.courseId) || []);
  const favoritedCourseIds = new Set(favorites?.map((f) => f.courseId) || []);

  const handleToggleFavorite = (courseId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const isFavorited = favoritedCourseIds.has(courseId);
    favoriteMutation.mutate({ courseId, isFavorited });
  };

  // Filter out VIP subscriptions from regular courses
  const courses = allCourses?.filter(course => !course.isVipSubscription) || [];

  // Sort VIP subscriptions by tier (clone to avoid cache mutation)
  const sortedVips = vipSubscriptions ? [...vipSubscriptions].sort((a, b) => {
    const tierOrder = { bronze: 1, silver: 2, gold: 3, diamond: 4 };
    const aTier = tierOrder[a.vipTier as keyof typeof tierOrder] || 999;
    const bTier = tierOrder[b.vipTier as keyof typeof tierOrder] || 999;
    return aTier - bTier;
  }) : [];

  const subcategoryQueries = useQueries({
    queries: courses.map((course) => ({
      queryKey: ["/api/admin/courses", course.id, "subcategories"],
      queryFn: async (): Promise<string[]> => {
        const response = await fetch(`/api/admin/courses/${course.id}/subcategories`, {
          credentials: "include",
        });
        if (!response.ok) throw new Error("Failed to fetch");
        return response.json();
      },
      enabled: !!course.id,
      staleTime: 5 * 60 * 1000, // опционально: кэшировать на 5 минут
    })),
  });

  // Теперь создаём map: course.id → subcategoryIds
  const courseSubcategoryMap = useMemo(() => {
    const map = new Map<string, string[]>();
    courses.forEach((course, index) => {
      const result = subcategoryQueries[index];
      if (result.data) {
        map.set(course.id, result.data);
      }
    });
    return map;
  }, [courses, subcategoryQueries]);

  // Теперь фильтрация без хуков внутри
  const filteredCoursesByLevel = useMemo(() => {
    if (!courses.length) return [];

    return courses.filter((course) => {
      const courseSubcategoryIds = courseSubcategoryMap.get(course.id) || [];

      // Если выбраны уровни (level) — проверяем пересечение
      if (selectedCategories.levels) {
        // Предположим, что selectedCategories.level — это строка или массив ID
        const selectedLevels = Array.isArray(selectedCategories.levels)
          ? selectedCategories.levels
          : [selectedCategories.levels];

        return courseSubcategoryIds.some(id => selectedLevels.includes(id));
      }

      return true;
    });
  }, [courses, courseSubcategoryMap, selectedCategories]);

  // Pagination calculations (must be before useEffect that uses them)
  const totalCourses = filteredCoursesByLevel.length || 0;
  const totalPages = Math.ceil(totalCourses / COURSES_PER_PAGE);
  const startIndex = (currentPage - 1) * COURSES_PER_PAGE;
  const endIndex = startIndex + COURSES_PER_PAGE;
  const paginatedCourses = filteredCoursesByLevel.slice(startIndex, endIndex) || [];

  // Для мобильных: показываем курсы в диапазоне страниц (скользящее окно)
  const mobileStartIndex = (visiblePageRange.start - 1) * COURSES_PER_PAGE;
  const mobileEndIndex = visiblePageRange.end * COURSES_PER_PAGE;
  const mobileCourses = filteredCoursesByLevel.slice(mobileStartIndex, mobileEndIndex) || [];

  // Reset to page 1 when filters or search changes
  useEffect(() => {
    setCurrentPage(1);
    setVisiblePageRange({ start: 1, end: 1 });
    setCurrentVisiblePage(1);
  }, [selectedCategories, searchQuery]);

  // Clamp currentPage when data changes to avoid empty pages
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
    if (totalPages > 0 && visiblePageRange.end > totalPages) {
      setVisiblePageRange({ start: totalPages, end: totalPages });
    }
  }, [courses, totalPages, currentPage, visiblePageRange.end]);

  // Auto-activate center card on mobile when carousel first mounts
  useEffect(() => {
    if (mobileCourses.length > 0 && carouselInitialIndex >= 0 && carouselInitialIndex < mobileCourses.length) {
      const centerCourse = mobileCourses[carouselInitialIndex];
      if (centerCourse) {
        setActiveMobileCourseId(centerCourse.id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentVisiblePage]); // Only run when page changes, not on every mobileCourses change


  // Обработчик свайпа влево до конца (переход на следующую страницу)
  const handleSwipeEnd = useCallback(() => {
    if (visiblePageRange.end >= totalPages) return;

    const nextPage = visiblePageRange.end + 1;
    // Показываем следующую страницу с начала (индекс 0)
    setVisiblePageRange({ start: nextPage, end: nextPage });
    setCurrentVisiblePage(nextPage);
    setCarouselInitialIndex(0);
  }, [visiblePageRange.end, totalPages]);

  // Обработчик свайпа вправо к началу (возврат на предыдущую страницу)
  const handleSwipeStart = useCallback(() => {
    if (visiblePageRange.start <= 1) return;

    const prevPage = visiblePageRange.start - 1;
    // Показываем предыдущую страницу с конца (индекс 11 - последняя карточка)
    setVisiblePageRange({ start: prevPage, end: prevPage });
    setCurrentVisiblePage(prevPage);
    setCarouselInitialIndex(COURSES_PER_PAGE - 1); // 12 - 1 = 11
  }, [visiblePageRange.start]);

  // Обработчик клика по пагинатору на мобильной версии
  const handleMobilePageChange = useCallback((page: number) => {
    if (page < 1 || page > totalPages) return;

    // При клике на пагинатор всегда начинаем с первой карточки
    setVisiblePageRange({ start: page, end: page });
    setCurrentVisiblePage(page);
    setCarouselInitialIndex(0);
  }, [totalPages]);

  useEffect(() => {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    const shouldPreload = !connection || connection.effectiveType === '4g' || connection.saveData === false;

    if (!shouldPreload || window.innerWidth < 768) {
      setImagesLoaded(true);
      return;
    }

    setImagesLoaded(false);

    // Collect all image URLs that need to be preloaded
    const imageUrls = paginatedCourses
      .map(course => course.thumbnailImage)
      .filter((url): url is string => !!url && url.trim().length > 0);

    // If no images to load, mark as loaded immediately
    if (imageUrls.length === 0) {
      setImagesLoaded(true);
      return;
    }

    // Check if all images are already in cache
    const allAlreadyLoaded = imageUrls.every(url => loadedImageUrls.has(url));
    if (allAlreadyLoaded) {
      setImagesLoaded(true);
      return;
    }

    // Preload all images in parallel (только на десктопе)
    let cancelled = false;
    const imagePromises = imageUrls.map(url => {
      return new Promise<string>((resolve) => {
        // Skip if already loaded
        if (loadedImageUrls.has(url)) {
          resolve(url);
          return;
        }

        const img = new Image();
        img.onload = () => resolve(url);
        // Don't reject on error - just resolve to allow other images to load
        img.onerror = () => resolve(url);
        img.src = url;
      });
    });

    Promise.all(imagePromises)
      .then((urls) => {
        if (!cancelled) {
          // Add to loaded cache, но ограничиваем размер кэша до 50 URL (экономия памяти)
          setLoadedImageUrls(prev => {
            const newSet = new Set(prev);
            urls.forEach(url => newSet.add(url));

            // Если кэш слишком большой, удаляем старые записи
            if (newSet.size > 50) {
              const entries = Array.from(newSet);
              const toKeep = entries.slice(-50); // Оставляем только последние 50
              return new Set(toKeep);
            }

            return newSet;
          });
          setImagesLoaded(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [paginatedCourses, loadedImageUrls]);

  const handleResetFilters = () => {
    setSelectedCategories({});
    setSearchQuery("");
    setSearchInput("")
  };

  // Telegram reminder modal handlers
  const handleLinkTelegramNow = () => {
    setShowTelegramCodeInput(true);
  };

  const handleSkipTelegram = () => {
    setShowTelegramReminder(false);
    setShowTelegramCodeInput(false);
    setTelegramCodeModal("");
  };

  const handleModalClose = (open: boolean) => {
    if (!open) {
      // Reset modal state when closing
      setShowTelegramCodeInput(false);
      setTelegramCodeModal("");
    }
    setShowTelegramReminder(open);
  };

  const handleLinkTelegramCode = async () => {
    if (!telegramCodeModal || telegramCodeModal.length !== 6) {
      toast({
        title: "Ошибка",
        description: "Введите 6-значный код из Telegram",
        variant: "destructive",
      });
      return;
    }

    setIsLinkingTelegram(true);
    try {
      await apiRequest("POST", "/api/telegram/verify-linking-code", {
        code: telegramCodeModal,
      });

      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });

      toast({
        title: "Telegram привязан!",
        description: "Двухфакторная аутентификация активирована",
      });

      // Clear saved state from localStorage on successful link
      if (user) {
        const storageKey = `telegramModalState:${user.id}`;
        localStorage.removeItem(storageKey);
        console.log('[Shop] Cleared Telegram modal state after successful link');
      }

      setShowTelegramReminder(false);
    } catch (error: any) {
      toast({
        title: "Ошибка привязки",
        description: error.message || "Неверный код или код истёк",
        variant: "destructive",
      });
    } finally {
      setIsLinkingTelegram(false);
    }
  };

  // Determine which categories to show top courses for based on selected platform
  const topCoursesCategories = useMemo(() => {
    if (!selectedCategories.platform || !categories) return [];

    // Map platform slugs to their proper names
    const platformMap: Record<string, string> = {
      'wb': 'Wildberries',
      'ozon': 'Ozon',
      'yandex': 'Yandex Market',
    };

    // Split combined platform string (e.g., "wb,ozon,yandex")
    const platformSlugs = selectedCategories.platform.split(',').map(s => s.trim());

    // Find categories for each platform
    const matchedCategories = platformSlugs
      .map(slug => {
        const platformName = platformMap[slug] || slug;
        return categories?.find(
          cat => cat.slug === slug || cat.name === platformName
        );
      })
      .filter((cat): cat is Category => cat !== null && cat !== undefined);

    return matchedCategories;
  }, [selectedCategories.platform, categories]);

  // Determine which navigation items to show based on visible sections
  const navigationItems = useMemo(() => {
    const items = [];

    // VIP section - always show if there are VIP courses
    if (sortedVips && sortedVips.length > 0) {
      items.push({
        id: "vip-section",
        label: "VIP Пакеты",
        icon: <Crown className="h-4 w-4" />,
        color: "from-yellow-500 to-amber-600",
      });
    }

    // Catalog section - always show
    items.push({
      id: "catalog-section",
      label: "Каталог",
      icon: <BookOpen className="h-4 w-4" />,
      color: "from-purple-500 to-pink-500",
    });

    // Packages section - show if there are packages
    if (coursePackages && coursePackages.length > 0) {
      items.push({
        id: "packages-section",
        label: "Подборки",
        icon: <Sparkles className="h-4 w-4" />,
        color: "from-purple-400 to-pink-400",
      });
    }

    // Popular section - show if there are top courses
    if (topCoursesCategories.length > 0) {
      items.push({
        id: "popular-section",
        label: "Популярное",
        icon: <TrendingUp className="h-4 w-4" />,
        color: "from-orange-500 to-red-500",
      });
    }

    return items;
  }, [sortedVips, coursePackages, topCoursesCategories]);

  return (
    <div className="min-h-screen bg-background relative">
      {/* Optimized Static Background */}
      <div className="fixed inset-0 pointer-events-none -z-10" style={{ contain: 'paint' }}>
        {/* Base gradient layer */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-background to-pink-500/5" />

        {/* Static radial gradients - no animation for performance */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/8 rounded-full blur-xl opacity-60" style={{ willChange: 'transform', transform: 'translateZ(0)' }} />
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-pink-500/8 rounded-full blur-xl opacity-50" style={{ willChange: 'transform', transform: 'translateZ(0)' }} />
        <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-orange-500/6 rounded-full blur-xl opacity-40" style={{ willChange: 'transform', transform: 'translateZ(0)' }} />

        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.015]" style={{
          backgroundImage: `
            linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }} />
      </div>

      <Header
        onSearchChange={setSearchInput}
        onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        onResetFilters={handleResetFilters}
        onOpenFilters={() => setSidebarOpen(true)}
      />

      {(navigationItems.length > 1 && isMobile) && <PageNavigation items={navigationItems} />}

      <InfoBanner />

      <div className="relative flex" style={{ zIndex: 1 }}>
        <Sidebar
          selectedCategories={selectedCategories}
          onCategoryChange={setSelectedCategories}
          isOpen={sidebarOpen}
        />

        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="flex-1 p-3 md:p-6 min-h-screen max-md:overflow-x-hidden">
          <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
            <div className="space-y-3">
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight">Магазин курсов</h1>
              <p className="text-base md:text-lg text-muted-foreground">
                Выберите курс для обучения и развития в любом направлении
              </p>
            </div>

            {/* Page Navigation */}
            {(navigationItems.length > 1 && !isMobile) && <PageNavigation items={navigationItems} />}

            {/* VIP Subscriptions Block */}
            <div id="vip-section" className="relative space-y-4 md:space-y-6 py-4 md:py-6 pl-6 md:px-8 rounded-2xl border border-yellow-500/10 bg-gradient-to-br from-slate-950/40 via-purple-950/30 to-amber-950/40 shadow-[0_0_80px_-12px_rgba(234,179,8,0.15)] overflow-visible" data-testid="vip-subscriptions-block">
              <div className="flex items-center justify-between gap-2 pr-6 md:pr-0">
                <div className="flex items-center gap-2 md:gap-3">
                  <Crown className="h-7 w-7 md:h-10 md:w-10 text-yellow-500 vip-shimmer flex-shrink-0" />
                  {vipPageContentLoading ? (
                    <Skeleton className="h-10 md:h-12 w-36 md:w-56" />
                  ) : (
                    <h2 className="text-2xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 bg-clip-text text-transparent">
                      {vipPageContent?.pageTitle || 'VIP Пакеты'}
                    </h2>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  data-testid="button-view-all-vip"
                  onClick={() => setLocation("/vip")}
                  className="border-yellow-500/30 hover:border-yellow-500/50 text-xs md:text-sm whitespace-nowrap"
                >
                  <span className="hidden sm:inline">Все тарифы</span>
                  <span className="sm:hidden">Все</span>
                </Button>
              </div>

              {vipLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i}>
                      <Skeleton className="h-64 w-full" />
                    </Card>
                  ))}
                </div>
              ) : sortedVips && sortedVips.length > 0 ? (
                <>
                  {/* Mobile: SwipeableCarousel */}
                  <div className="md:hidden transition-all">
                    <SwipeableCarousel itemCount={sortedVips.length}>
                      {(activeIndex, itemIndex) => {

                        return (
                          <MobileVipCard
                            sortedVips={sortedVips}
                            itemIndex={itemIndex}
                            activeIndex={activeIndex}
                            purchasedCourseIds={purchasedCourseIds}
                            vipTiers={vipTiers}
                          />
                        );
                      }}
                    </SwipeableCarousel>
                  </div>

                  {/* Desktop: Original Grid - UNTOUCHED */}
                  <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch" style={{ gridAutoRows: '1fr' }}>
                    {sortedVips.map((vip) => {

                      return (
                        <VipCard
                          purchasedCourseIds={purchasedCourseIds}
                          vip={vip}
                          hoveredVipId={hoveredVipId}
                          vipTiers={vipTiers}
                          setHoveredVipId={setHoveredVipId}
                        />
                      );
                    })}
                  </div>
                </>
              ) : null}
            </div>

            {/* Divider */}
            <div id="catalog-section" className="border-t border-border pt-6 md:pt-8 pb-4">
              <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
                <BookOpen className="h-7 w-7 md:h-10 md:w-10 text-primary flex-shrink-0" />
                <h2 className="text-2xl md:text-4xl font-bold tracking-tight text-foreground">
                  Каталог курсов
                </h2>
              </div>
              <p className="text-base md:text-lg text-muted-foreground">
                Выберите подходящий курс по интересующему вас направлению
              </p>
            </div>

            {/* Mobile Filters - показываются только на мобильных устройствах */}
            <MobileFilters
              selectedCategories={selectedCategories}
              onCategoryChange={setSelectedCategories}
            />

            {isLoading || !imagesLoaded ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Card key={i}>
                    <Skeleton className="aspect-video w-full" />
                    <CardHeader>
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-1/2 mt-2" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3 mt-2" />
                    </CardContent>
                    <CardFooter>
                      <Skeleton className="h-10 w-full" />
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : courses && courses.length > 0 ? (

              <>
                {isMobile && (
                  mobileCourses && mobileCourses.length > 0 ? (
                    <div className="md:hidden">
                      <SwipeableCarousel
                        key={currentVisiblePage}
                        onReachEnd={handleSwipeEnd}
                        onReachStart={handleSwipeStart}
                        currentPageSize={mobileCourses.length}
                        initialIndex={carouselInitialIndex}
                        onActiveIndexChange={(index) => {
                          const course = mobileCourses[index];
                          if (course) {
                            setActiveMobileCourseId(course.id);
                          }
                        }}
                      >
                        {mobileCourses.map((course, index) => {
                          const activeCategories = categories?.filter(
                            (cat) => course.level?.includes(cat.id) && cat.isActive
                          );

                          // Если нет активных категорий — не показываем карточку
                          if (!activeCategories || activeCategories.length === 0) {
                            return null;
                          }

                          return (
                            <ShopMobileCard
                              key={course.id} // ← Важно! Добавьте key
                              course={course}
                              index={index}
                              purchasedCourseIds={purchasedCourseIds}
                              favoritedCourseIds={favoritedCourseIds}
                              subcategories={subcategories}
                              categories={categories}
                              activeMobileCourseId={activeMobileCourseId}
                              isAuthenticated={isAuthenticated}
                              handleToggleFavorite={handleToggleFavorite}
                            />
                          );
                        })}
                      </SwipeableCarousel>
                    </div>
                  ) : (
                    <Card className="p-12">
                      <div className="text-center space-y-4">
                        <BookOpen className="h-16 w-16 mx-auto text-muted-foreground" />
                        <h3 className="text-xl font-semibold">Курсы не найдены</h3>
                        <p className="text-muted-foreground">
                          {searchQuery || Object.keys(selectedCategories).length > 0
                            ? "Попробуйте изменить фильтры или поисковый запрос"
                            : "Курсы скоро появятся"}
                        </p>
                      </div>
                    </Card>
                  )
                )}

                {!isMobile && (
                  paginatedCourses && paginatedCourses.length > 0 ? (
                    <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch" style={{ gridAutoRows: '1fr' }}>
                      {paginatedCourses.map((course, index) => {

                        const selectedCategoriesWithoutsub = categories?.filter((cat) => course.level?.includes(cat.id) && cat.isActive);


                        if (selectedCategoriesWithoutsub && selectedCategoriesWithoutsub.length > 0) return (
                          <ShopDesktopCard course={course}
                            index={index}
                            purchasedCourseIds={purchasedCourseIds}
                            favoritedCourseIds={favoritedCourseIds}
                            subcategories={subcategories}
                            categories={categories}
                            user={user}
                            isAuthenticated={isAuthenticated}
                            handleToggleFavorite={handleToggleFavorite} />
                        );
                      })}
                    </div>
                  ) : <Card className="p-12">
                    <div className="text-center space-y-4">
                      <BookOpen className="h-16 w-16 mx-auto text-muted-foreground" />
                      <h3 className="text-xl font-semibold">Курсы не найдены</h3>
                      <p className="text-muted-foreground">
                        {searchQuery || Object.keys(selectedCategories).length > 0
                          ? "Попробуйте изменить фильтры или поисковый запрос"
                          : "Курсы скоро появятся"}
                      </p>
                    </div>
                  </Card>)
                }


                {
                  totalPages && totalPages > 1 ? (
                    <div className="hidden md:block">
                      <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={totalCourses}
                        itemLabel="курсов"
                        onPageChange={setCurrentPage}
                      />
                    </div>
                  ) : null
                }

                {
                  totalPages && totalPages > 1 ? (
                    <div className="block md:hidden">
                      <Pagination
                        currentPage={currentVisiblePage}
                        totalPages={totalPages}
                        totalItems={totalCourses}
                        itemLabel="курсов"
                        onPageChange={handleMobilePageChange}
                      />
                    </div>
                  ) : null
                }

                {/* Trade-In Promotional Banner */}
                <div className="mt-12 mb-8" data-testid="section-trade-in-banner">
                  <Card className="overflow-hidden border-2 border-purple-500/20 bg-gradient-to-br from-background via-purple-950/5 to-pink-950/5">
                    <div className="grid md:grid-cols-2 gap-0">
                      {/* Left side - Image */}
                      <div className="relative h-64 md:h-auto min-h-[300px] overflow-hidden" data-testid="image-trade-in-banner">
                        <img
                          src={tradeInImage}
                          alt="Trade-In Exchange"
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-background/40 to-transparent md:hidden" />
                      </div>

                      {/* Right side - Content */}
                      <div className="p-8 md:p-12 flex flex-col justify-center relative">
                        <div className="absolute top-4 right-4">
                          <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0" data-testid="badge-trade-in-new">
                            <Sparkles className="h-3 w-3 mr-1" />
                            Новинка
                          </Badge>
                        </div>

                        <div className="space-y-6">
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="p-3 rounded-xl bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-500/30">
                                <RefreshCw className="h-8 w-8 text-purple-400" />
                              </div>
                              <h3 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent" data-testid="text-trade-in-title">
                                Trade-In Программа
                              </h3>
                            </div>

                            <p className="text-lg text-muted-foreground leading-relaxed" data-testid="text-trade-in-description">
                              Обменяйте старые курсы на новые! Принимаем курсы{" "}
                              <span className="font-semibold text-foreground">любых тематик</span>
                              {" "}— маркетинг, дизайн, программирование, бизнес и другие.
                            </p>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="flex items-start gap-3 p-4 rounded-lg bg-card/50 border border-border" data-testid="card-trade-in-benefit-1">
                              <div className="p-2 rounded-lg bg-purple-500/10">
                                <Check className="h-5 w-5 text-purple-400" />
                              </div>
                              <div>
                                <p className="font-semibold text-sm">До 60%</p>
                                <p className="text-xs text-muted-foreground">возврата стоимости</p>
                              </div>
                            </div>

                            <div className="flex items-start gap-3 p-4 rounded-lg bg-card/50 border border-border" data-testid="card-trade-in-benefit-2">
                              <div className="p-2 rounded-lg bg-pink-500/10">
                                <Shield className="h-5 w-5 text-pink-400" />
                              </div>
                              <div>
                                <p className="font-semibold text-sm">24 часа</p>
                                <p className="text-xs text-muted-foreground">на оценку</p>
                              </div>
                            </div>

                            <div className="flex items-start gap-3 p-4 rounded-lg bg-card/50 border border-border" data-testid="card-trade-in-benefit-3">
                              <div className="p-2 rounded-lg bg-orange-500/10">
                                <Gem className="h-5 w-5 text-orange-400" />
                              </div>
                              <div>
                                <p className="font-semibold text-sm">Любые темы</p>
                                <p className="text-xs text-muted-foreground">принимаем все</p>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row gap-3 pt-2">
                            <Link href="/trade-in">
                              <Button
                                size="lg"
                                className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30 w-full sm:w-auto"
                                data-testid="button-trade-in-promo"
                              >
                                Обменять курсы
                                <ArrowRight className="h-5 w-5" />
                              </Button>
                            </Link>
                            <Link href="/trade-in">
                              <Button
                                size="lg"
                                variant="outline"
                                className="gap-2 w-full sm:w-auto"
                                data-testid="button-trade-in-learn"
                              >
                                Узнать подробнее
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Referral Program Promotional Banner */}
                <div className="mb-8" data-testid="section-referral-banner">
                  <Card className="overflow-hidden border-2 border-blue-500/20 bg-gradient-to-br from-background via-blue-950/5 to-cyan-950/5">
                    <div className="grid md:grid-cols-2 gap-0">
                      {/* Left side - Content */}
                      <div className="p-8 md:p-12 flex flex-col justify-center relative order-2 md:order-1">
                        <div className="absolute top-4 left-4">
                          <Badge className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-0" data-testid="badge-referral-hot">
                            <Gift className="h-3 w-3 mr-1" />
                            Выгодно
                          </Badge>
                        </div>

                        <div className="space-y-6">
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border border-blue-500/30">
                                <Users className="h-8 w-8 text-blue-400" />
                              </div>
                              <h3 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent" data-testid="text-referral-title">
                                Приглашай друзей
                              </h3>
                            </div>

                            <p className="text-lg text-muted-foreground leading-relaxed" data-testid="text-referral-description">
                              Зарабатывайте на рекомендациях! Получайте{" "}
                              <span className="font-semibold text-foreground">до 45% от всех пополнений</span>
                              {" "}баланса ваших рефералов навсегда, а друзья получат{" "}
                              <span className="font-semibold text-foreground">5% скидку</span>.
                            </p>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="flex items-start gap-3 p-4 rounded-lg bg-card/50 border border-border" data-testid="card-referral-benefit-1">
                              <div className="p-2 rounded-lg bg-blue-500/10">
                                <TrendingUp className="h-5 w-5 text-blue-400" />
                              </div>
                              <div>
                                <p className="font-semibold text-sm">До 45%</p>
                                <p className="text-xs text-muted-foreground">от пополнений</p>
                              </div>
                            </div>

                            <div className="flex items-start gap-3 p-4 rounded-lg bg-card/50 border border-border" data-testid="card-referral-benefit-2">
                              <div className="p-2 rounded-lg bg-cyan-500/10">
                                <Percent className="h-5 w-5 text-cyan-400" />
                              </div>
                              <div>
                                <p className="font-semibold text-sm">5% скидка</p>
                                <p className="text-xs text-muted-foreground">для друга</p>
                              </div>
                            </div>

                            <div className="flex items-start gap-3 p-4 rounded-lg bg-card/50 border border-border" data-testid="card-referral-benefit-3">
                              <div className="p-2 rounded-lg bg-teal-500/10">
                                <Gift className="h-5 w-5 text-teal-400" />
                              </div>
                              <div>
                                <p className="font-semibold text-sm">Навсегда</p>
                                <p className="text-xs text-muted-foreground">пассивный доход</p>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row gap-3 pt-2">
                            <Link href="/bonuses">
                              <Button
                                size="lg"
                                className="gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/30 w-full sm:w-auto"
                                data-testid="button-referral-promo"
                              >
                                Пригласить друзей
                                <ArrowRight className="h-5 w-5" />
                              </Button>
                            </Link>
                            <Link href="/bonuses">
                              <Button
                                size="lg"
                                variant="outline"
                                className="gap-2 w-full sm:w-auto"
                                data-testid="button-referral-learn"
                              >
                                Узнать подробнее
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>

                      {/* Right side - Image */}
                      <div className="relative h-64 md:h-auto min-h-[300px] overflow-hidden order-1 md:order-2" data-testid="image-referral-banner">
                        <img
                          src={referralImage}
                          alt="Referral Program"
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  </Card>
                </div>

              </>
            ) : (
              <Card className="p-12">
                <div className="text-center space-y-4">
                  <BookOpen className="h-16 w-16 mx-auto text-muted-foreground" />
                  <h3 className="text-xl font-semibold">Курсы не найдены</h3>
                  <p className="text-muted-foreground">
                    {searchQuery || Object.keys(selectedCategories).length > 0
                      ? "Попробуйте изменить фильтры или поисковый запрос"
                      : "Курсы скоро появятся"}
                  </p>
                </div>
              </Card>
            )}

            {/* Course Packages Section - REDESIGNED - Always visible */}
            {coursePackages && coursePackages.length > 0 && (
              <div
                id="packages-section"
                className="mt-20 relative"
                data-testid="section-course-packages"
              >
                {/* Optimized Static Background */}
                <div className="absolute inset-0 -z-10 overflow-hidden" style={{ contain: 'paint' }}>
                  <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/8 rounded-full blur-xl opacity-50" style={{ willChange: 'transform', transform: 'translateZ(0)' }} />
                  <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-500/8 rounded-full blur-xl opacity-40" style={{ willChange: 'transform', transform: 'translateZ(0)' }} />
                </div>

                {/* Header */}
                <div className="text-center space-y-6 mb-16">
                  <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-orange-500/10 border border-purple-500/20">
                    <Sparkles className="h-5 w-5 text-purple-400" />
                    <span className="text-sm font-semibold text-purple-400">ЭКСКЛЮЗИВНЫЕ ПРЕДЛОЖЕНИЯ</span>
                  </div>
                  <h2 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent" data-testid="text-packages-title">
                    Готовые подборки
                  </h2>
                  <p className="text-xl text-muted-foreground max-w-3xl mx-auto" data-testid="text-packages-subtitle">
                    Курсы подобраны профессионалами. Максимальная выгода и экономия времени
                  </p>
                </div>

                {/* Packages Grid - Desktop */}
                <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch" style={{ gridAutoRows: '1fr' }}>
                  {coursePackages.map((pkg, idx) => (
                    <PackageCard key={pkg.id} pkg={pkg} idx={idx} />
                  ))}
                </div>

                {/* Packages Carousel - Mobile */}
                <div className="md:hidden">
                  <SwipeableCarousel>
                    {coursePackages.map((pkg, idx) => (
                      <PackageCard key={pkg.id} pkg={pkg} idx={idx} />
                    ))}
                  </SwipeableCarousel>
                </div>
              </div>
            )}

            {/* Top Courses Section */}
            {topCoursesCategories.length > 0 && (
              <div id="popular-section" className="space-y-8 mb-8">
                {topCoursesCategories.map(category => (
                  <TopCourses
                    key={category.id}
                    categoryId={category.id}
                    platform={category.slug}
                    limit={5}
                    title={`🔥 Популярные курсы: ${category.name}`}
                  />
                ))}
              </div>
            )}

            {/* Sniper Promotional Banner */}
            <div className="mt-12 mb-8" data-testid="section-sniper-banner">
              <Card className="overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-background via-blue-950/5 to-purple-950/5">
                <div className="grid md:grid-cols-2 gap-0">
                  {/* Left side - Content */}
                  <div className="p-8 md:p-12 flex flex-col justify-center relative order-2 md:order-1">
                    <div className="absolute top-4 right-4">
                      <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0" data-testid="badge-sniper-new">
                        <Target className="h-3 w-3 mr-1" />
                        Снайпер
                      </Badge>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/30">
                            <Crosshair className="h-8 w-8 text-blue-400" />
                          </div>
                          <h3 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent" data-testid="text-sniper-title">
                            Мы сольём то, что вам нужно!
                          </h3>
                        </div>

                        <p className="text-lg text-muted-foreground leading-relaxed" data-testid="text-sniper-description">
                          Не нашли нужный курс? Предложите его, и мы{" "}
                          <span className="font-semibold text-foreground">возьмём на прицел</span>
                          {" "}— голосуйте за идеи других и получайте доступ первыми!
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="flex items-start gap-3 p-4 rounded-lg bg-card/50 border border-border" data-testid="card-sniper-benefit-1">
                          <div className="p-2 rounded-lg bg-blue-500/10">
                            <Target className="h-5 w-5 text-blue-400" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm">Предложите</p>
                            <p className="text-xs text-muted-foreground">любой курс</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 p-4 rounded-lg bg-card/50 border border-border" data-testid="card-sniper-benefit-2">
                          <div className="p-2 rounded-lg bg-purple-500/10">
                            <ThumbsUp className="h-5 w-5 text-purple-400" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm">Голосуйте</p>
                            <p className="text-xs text-muted-foreground">за идеи других</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 p-4 rounded-lg bg-card/50 border border-border" data-testid="card-sniper-benefit-3">
                          <div className="p-2 rounded-lg bg-pink-500/10">
                            <TrendingUp className="h-5 w-5 text-pink-400" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm">Получите</p>
                            <p className="text-xs text-muted-foreground">доступ первыми</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <Link href="/sniper">
                          <Button
                            size="lg"
                            className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30 w-full sm:w-auto"
                            data-testid="button-sniper-promo"
                          >
                            Предложить курс
                            <Target className="h-5 w-5" />
                          </Button>
                        </Link>
                        <Link href="/sniper">
                          <Button
                            size="lg"
                            variant="outline"
                            className="gap-2 w-full sm:w-auto"
                            data-testid="button-sniper-learn"
                          >
                            Смотреть заявки
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Right side - Image */}
                  <div className="relative h-64 md:h-auto min-h-[300px] overflow-hidden order-1 md:order-2" data-testid="image-sniper-banner">
                    <img
                      src={sniperImage}
                      alt="Снайпер - Заказ курсов"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-l from-background/80 via-background/40 to-transparent md:hidden" />
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </main>
      </div >
      <Footer />

      {/* Telegram Reminder Modal */}
      <AlertDialog open={showTelegramReminder} onOpenChange={handleModalClose}>
        <AlertDialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-telegram-reminder">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-3 text-2xl pb-2">
              <div className="rounded-full bg-gradient-to-br from-blue-500 to-purple-600 p-2.5">
                <SiTelegram className="h-7 w-7 text-white" />
              </div>
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Защитите свой аккаунт
              </span>
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-5 pt-3">
              {/* Warning Block */}
              <div className={`rounded-lg border-l-4 p-4 ${siteSettings?.require2FA === 'mandatory' ? 'bg-red-50 dark:bg-red-950/30 border-red-500' : 'bg-amber-50 dark:bg-amber-950/30 border-amber-500'}`}>
                <div className="flex gap-3">
                  <AlertCircle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${siteSettings?.require2FA === 'mandatory' ? 'text-red-600 dark:text-red-500' : 'text-amber-600 dark:text-amber-500'}`} />
                  <div className="space-y-1">
                    <p className={`text-sm font-semibold ${siteSettings?.require2FA === 'mandatory' ? 'text-red-900 dark:text-red-100' : 'text-amber-900 dark:text-amber-100'}`}>
                      {siteSettings?.require2FA === 'mandatory'
                        ? "Привязка Telegram обязательна"
                        : "Привязка Telegram скоро станет обязательной"}
                    </p>
                    <p className={`text-sm ${siteSettings?.require2FA === 'mandatory' ? 'text-red-800 dark:text-red-200' : 'text-amber-800 dark:text-amber-200'}`}>
                      {siteSettings?.require2FA === 'mandatory'
                        ? <>Пройдите подтверждение через бота <strong>@{siteSettings?.telegramBotUsername || 'proverka1323bot'}</strong> для доступа к аккаунту</>
                        : <>Пройдите подтверждение через бота <strong>@{siteSettings?.telegramBotUsername || 'proverka1323bot'}</strong>, чтобы не потерять доступ к аккаунту</>}
                    </p>
                  </div>
                </div>
              </div>

              {/* Benefits Section */}
              <div className="space-y-3">
                <h3 className="font-bold text-base text-foreground">Почему это важно:</h3>
                <div className="grid gap-3">
                  {/* Benefit 1 */}
                  <div className="rounded-lg border bg-card p-3 hover-elevate transition-all">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-blue-100 dark:bg-blue-950 p-2">
                        <Wifi className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="font-semibold text-sm text-foreground">Всегда на связи</p>
                        <p className="text-xs text-muted-foreground">
                          Интернет в России непредсказуем — мы <strong className="text-foreground">всегда найдём способ</strong> вас уведомить!
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Benefit 2 */}
                  <div className="rounded-lg border bg-card p-3 hover-elevate transition-all">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-purple-100 dark:bg-purple-950 p-2">
                        <Link2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="font-semibold text-sm text-foreground">Зеркала сайта</p>
                        <p className="text-xs text-muted-foreground">
                          При блокировке <strong className="text-foreground">первым получите ссылку</strong> на резервное зеркало
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Benefit 3 */}
                  <div className="rounded-lg border bg-card p-3 hover-elevate transition-all">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-green-100 dark:bg-green-950 p-2">
                        <Lock className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="font-semibold text-sm text-foreground">Двухфакторная защита</p>
                        <p className="text-xs text-muted-foreground">
                          <strong className="text-foreground">Надёжная защита</strong> вашего аккаунта от взлома
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Benefit 4 */}
                  <div className="rounded-lg border bg-card p-3 hover-elevate transition-all">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-orange-100 dark:bg-orange-950 p-2">
                        <Bell className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="font-semibold text-sm text-foreground">Важные уведомления</p>
                        <p className="text-xs text-muted-foreground">
                          <strong className="text-foreground">Не пропустите</strong> новые уроки и важные обновления курсов
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Code input section - shown when user clicks green button */}
              {showTelegramCodeInput && (
                <div className="space-y-4 pt-4 border-t-2 border-dashed">
                  {/* Instructions Block */}
                  <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-full bg-blue-500 p-1.5 mt-0.5">
                        <SiTelegram className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                          Как получить код:
                        </p>
                        <ol className="space-y-1.5 text-sm text-blue-800 dark:text-blue-200">
                          <li className="flex items-start gap-2">
                            <span className="font-bold text-blue-600 dark:text-blue-400">1.</span>
                            <span>
                              Откройте бота{" "}
                              <button
                                type="button"
                                onClick={() => window.open(`https://t.me/${siteSettings?.telegramBotUsername || 'proverka1323bot'}`, '_blank')}
                                className="inline-flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400 hover:underline"
                                data-testid="link-telegram-bot-modal"
                              >
                                @{siteSettings?.telegramBotUsername || 'proverka1323bot'}
                                <ExternalLink className="h-3 w-3" />
                              </button>
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="font-bold text-blue-600 dark:text-blue-400">2.</span>
                            <span>Отправьте команду <code className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 rounded font-mono text-xs">/start</code></span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="font-bold text-blue-600 dark:text-blue-400">3.</span>
                            <span>Скопируйте <strong>6-значный код</strong> из сообщения</span>
                          </li>
                        </ol>
                      </div>
                    </div>
                  </div>

                  {/* Code Input */}
                  <div className="space-y-3">
                    <Label htmlFor="telegramCodeModal" className="text-sm font-semibold text-foreground">
                      Введите код из Telegram
                    </Label>
                    <Input
                      id="telegramCodeModal"
                      placeholder="● ● ● ● ● ●"
                      value={telegramCodeModal}
                      onChange={(e) => setTelegramCodeModal(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      maxLength={6}
                      className="text-center text-2xl tracking-[0.5em] font-bold h-14 border-2"
                      data-testid="input-telegram-code-modal"
                    />
                    <p className="text-xs text-muted-foreground text-center">
                      Код действителен в течение 10 минут
                    </p>
                  </div>

                  {/* Submit Button */}
                  <Button
                    size="lg"
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
                    onClick={handleLinkTelegramCode}
                    disabled={isLinkingTelegram || telegramCodeModal.length !== 6}
                    data-testid="button-link-telegram-modal"
                  >
                    {isLinkingTelegram ? (
                      <>
                        <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                        Привязка...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-5 w-5 mr-2" />
                        Подтвердить и привязать
                      </>
                    )}
                  </Button>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Buttons */}
          <AlertDialogFooter className="flex-col sm:flex-col gap-3 pt-2">
            {!showTelegramCodeInput ? (
              <>
                <Button
                  onClick={handleLinkTelegramNow}
                  size="lg"
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg shadow-green-500/20"
                  data-testid="button-link-now"
                >
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  Хорошо, подключу Telegram
                </Button>
                {siteSettings?.require2FA !== 'mandatory' && (
                  <Button
                    variant="ghost"
                    onClick={handleSkipTelegram}
                    className="w-full text-muted-foreground hover:text-foreground"
                    data-testid="button-skip-telegram"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Напомнить в другой раз
                  </Button>
                )}
              </>
            ) : (
              siteSettings?.require2FA !== 'mandatory' && (
                <Button
                  variant="ghost"
                  onClick={handleSkipTelegram}
                  className="w-full text-muted-foreground hover:text-foreground"
                  data-testid="button-skip-telegram"
                >
                  <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
                  Назад
                </Button>
              )
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div >
  );
}
