import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueries } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useSearch } from "wouter";
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
import { usePageIdleClass } from "@/hooks/usePageIdleClass";

const COURSES_PER_PAGE = 12

const areStringArraysEqual = (a?: string[], b?: string[]) => {
  if (a === b) return true;
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

const areSelectedCategoriesEqual = (
  a: {
    platform?: string;
    levels?: string[];
    year?: number;
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    author?: string;
  },
  b: {
    platform?: string;
    levels?: string[];
    year?: number;
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    author?: string;
  }
) => {
  return (
    a.platform === b.platform &&
    areStringArraysEqual(a.levels, b.levels) &&
    a.year === b.year &&
    a.minPrice === b.minPrice &&
    a.maxPrice === b.maxPrice &&
    a.minRating === b.minRating &&
    a.author === b.author
  );
};

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
  const search = useSearch()
  const [selectedCategories, setSelectedCategories] = useState<{
    platform?: string;
    levels?: string[];
    year?: number;
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    author?: string;
  }>({});
  const params = new URLSearchParams();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState(searchQuery);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [visiblePageRange, setVisiblePageRange] = useState({ start: 1, end: 1 }); // Для mobile infinite scroll
  const [currentVisiblePage, setCurrentVisiblePage] = useState(1); // Отслеживание текущей видимой страницы для пагинатора
  const [carouselInitialIndex, setCarouselInitialIndex] = useState(0); // Начальный индекс для карусели (0 или 11)
  const [hoveredVipId, setHoveredVipId] = useState<string | null>(null);
  const urlSyncTimerRef = useRef<number | null>(null);
  const [isIosLandscapeSafeMode, setIsIosLandscapeSafeMode] = useState(false);
  const [vipGridColumns, setVipGridColumns] = useState(4);
  const [catalogGridColumns, setCatalogGridColumns] = useState(4);

  const isNarrowMobile = useIsMobile()
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    const shortestSide = Math.min(window.innerWidth, window.innerHeight);
    const forcePortraitLikeMobile = isTouchDevice && window.innerWidth <= 1024 && shortestSide < 768;
    return window.innerWidth < 768 || forcePortraitLikeMobile;
  });
  const instantMobileLike = typeof window !== "undefined" && (() => {
    const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    const shortestSide = Math.min(window.innerWidth, window.innerHeight);
    return isTouchDevice && shortestSide < 768;
  })();
  const instantIosLandscapeSafeMode = typeof window !== "undefined" && (() => {
    const ua = navigator.userAgent || "";
    const isIOS =
      /iP(hone|od|ad)/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    const isLandscape = window.matchMedia("(orientation: landscape)").matches;
    return isIOS && isTouchDevice && isLandscape && window.innerWidth <= 1024;
  })();
  const effectiveIsMobile = isMobile || instantMobileLike;
  const effectiveIosLandscapeSafeMode = isIosLandscapeSafeMode || instantIosLandscapeSafeMode;

  useEffect(() => {
    const computeIsMobileLayout = () => {
      if (typeof window === "undefined") return isNarrowMobile;
      const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
      const shortestSide = Math.min(window.innerWidth, window.innerHeight);
      const forcePortraitLikeMobile = isTouchDevice && window.innerWidth <= 1024 && shortestSide < 768;
      return isNarrowMobile || forcePortraitLikeMobile;
    };
    const computeIosLandscapeSafeMode = () => {
      if (typeof window === "undefined") return false;
      const ua = navigator.userAgent || "";
      const isIOS =
        /iP(hone|od|ad)/.test(ua) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
      const isLandscape = window.matchMedia("(orientation: landscape)").matches;
      return isIOS && isTouchDevice && isLandscape && window.innerWidth <= 1024;
    };

    const updateMobileLayout = () => {
      const next = computeIsMobileLayout();
      setIsMobile((prev) => (prev === next ? prev : next));
      const nextSafeMode = computeIosLandscapeSafeMode();
      setIsIosLandscapeSafeMode((prev) => (prev === nextSafeMode ? prev : nextSafeMode));
    };

    updateMobileLayout();
    window.addEventListener("resize", updateMobileLayout, { passive: true });
    window.addEventListener("orientationchange", updateMobileLayout);

    return () => {
      window.removeEventListener("resize", updateMobileLayout);
      window.removeEventListener("orientationchange", updateMobileLayout);
    };
  }, [isNarrowMobile]);

  useEffect(() => {
    const updateGridColumns = () => {
      if (typeof window === "undefined") return;
      const width = window.innerWidth;
      const nextVip = width >= 1024 ? 4 : width >= 768 ? 2 : 1;
      const nextCatalog = width >= 1280 ? 4 : width >= 1024 ? 3 : width >= 768 ? 2 : 1;
      setVipGridColumns((prev) => (prev === nextVip ? prev : nextVip));
      setCatalogGridColumns((prev) => (prev === nextCatalog ? prev : nextCatalog));
    };

    updateGridColumns();
    window.addEventListener("resize", updateGridColumns, { passive: true });
    return () => window.removeEventListener("resize", updateGridColumns);
  }, []);

  usePageIdleClass({
    enabled: effectiveIsMobile,
    initialActiveMs: 3500,
    idleAfterMs: 2200,
    activityThrottleMs: 120,
    trackPointerMove: false,
    trackWheel: false,
    trackMouseMove: false,
    trackScroll: false,
  });

  // Telegram reminder modal states
  const { toast } = useToast();
  const [showTelegramReminder, setShowTelegramReminder] = useState(false);
  const [showTelegramCodeInput, setShowTelegramCodeInput] = useState(false);
  const [telegramCodeModal, setTelegramCodeModal] = useState("");
  const [isLinkingTelegram, setIsLinkingTelegram] = useState(false);
  const [delayTelegramReminder, setDelayTelegramReminder] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("justLoggedIn") === "1";
  });

  const [hasPopularCourses, setHasPopularCourses] = useState(false)

  useEffect(() => {
    if (!delayTelegramReminder) return;
    const timer = window.setTimeout(() => {
      sessionStorage.removeItem("justLoggedIn");
      setDelayTelegramReminder(false);
    }, 1600);
    return () => window.clearTimeout(timer);
  }, [delayTelegramReminder]);

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
    if (delayTelegramReminder) {
      return;
    }

    const storageKey = `telegramModalState:${user.id}`;
    const savedState = localStorage.getItem(storageKey);

    if (savedState) {
      try {
        const state = JSON.parse(savedState);

        if (state.isOpen) {
          setShowTelegramReminder(true);
          setShowTelegramCodeInput(state.codeInputShown || false);
          setTelegramCodeModal(state.code || "");
        }
      } catch (error) {
        localStorage.removeItem(storageKey);
      }
    }
  }, [isAuthenticated, user, delayTelegramReminder]);

  // Check Telegram linking status and show reminder if needed
  useEffect(() => {
    // Skip if user is not authenticated or data is loading
    if (!isAuthenticated || !user) {
      return;
    }
    if (delayTelegramReminder) {
      return;
    }

    // Skip if 2FA mode is disabled (no modal should be shown)
    if (siteSettings?.require2FA === 'disabled') {
      return;
    }


    // Check registration flag first (takes priority)
    const registrationFlag = sessionStorage.getItem('showTelegramReminder');
    if (registrationFlag === 'true') {
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
        setShowTelegramReminder(true);
        // Mark as shown for this session
        sessionStorage.setItem(sessionKey, 'true');
      }
    }
  }, [isAuthenticated, user, siteSettings, delayTelegramReminder]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pageFromUrl = params.get('page');
    const pageNum = pageFromUrl ? parseInt(pageFromUrl, 10) : 1;
    const nextPage = !isNaN(pageNum) && pageNum >= 1 ? pageNum : 1;

    setCurrentPage((prev) => (prev === nextPage ? prev : nextPage));
  }, [location]);

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
    } else {
      // Clear saved state when modal is closed
      localStorage.removeItem(storageKey);
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
    const donateStatus = params.get('donateStatus');

    if (platform) filters.platform = platform;
    if (level) filters.levels = level.split(',');
    if (year) filters.year = parseInt(year);
    if (minPrice) filters.minPrice = parseFloat(minPrice);
    if (maxPrice) filters.maxPrice = parseFloat(maxPrice);
    if (minRating) filters.minRating = parseFloat(minRating);
    if (author) filters.author = author;

    if (donateStatus) {
      if (donateStatus === 'success') {
        toast({
          title: "Баланс пополнен!",
          description: "Спасибо за поддержку, приятного обучения!"
        });
      } else if (donateStatus === 'error') {
        toast({
          title: "Ошибка при пополнении баланса",
          description: "Пожалуйста, попробуйте снова. Если проблема повторится, свяжитесь с поддержкой",
          variant: "destructive"
        });
      }
    }


    setSelectedCategories((prev) => {
      const nextFilters = Object.keys(filters).length > 0 ? filters : {};
      return areSelectedCategoriesEqual(prev, nextFilters) ? prev : nextFilters;
    });
    if (search) {
      setSearchQuery((prev) => (prev === search ? prev : search));
      setSearchInput((prev) => (prev === search ? prev : search))
    } else {
      setSearchQuery((prev) => (prev === "" ? prev : ""));
      setSearchInput((prev) => (prev === "" ? prev : ""))
    }
  }, [location]);

  useEffect(() => {
    const syncUrl = () => {
      const currentParams = new URLSearchParams(window.location.search);

      if (selectedCategories.platform) {
        currentParams.set('platform', selectedCategories.platform);
      } else {
        currentParams.delete('platform');
      }

      if (selectedCategories.levels?.length) {
        currentParams.set('level', selectedCategories.levels.join(','));
      } else {
        currentParams.delete('level');
      }

      if (selectedCategories.year) {
        currentParams.set('year', selectedCategories.year.toString());
      } else {
        currentParams.delete('year');
      }

      if (selectedCategories.minPrice !== undefined) {
        currentParams.set('minPrice', selectedCategories.minPrice.toString());
      } else {
        currentParams.delete('minPrice');
      }

      if (selectedCategories.maxPrice !== undefined) {
        currentParams.set('maxPrice', selectedCategories.maxPrice.toString());
      } else {
        currentParams.delete('maxPrice');
      }

      if (selectedCategories.minRating !== undefined) {
        currentParams.set('minRating', selectedCategories.minRating.toString());
      } else {
        currentParams.delete('minRating');
      }

      if (selectedCategories.author) {
        currentParams.set('author', selectedCategories.author);
      } else {
        currentParams.delete('author');
      }

      if (searchQuery) {
        currentParams.set('search', searchQuery);
      } else {
        currentParams.delete('search');
      }

      currentParams.set('page', currentPage.toString());

      const searchString = currentParams.toString();
      const newUrl = searchString
        ? `${window.location.pathname}?${searchString}`
        : window.location.pathname;

      window.history.replaceState(null, '', newUrl);
    };

    if (urlSyncTimerRef.current !== null) {
      window.clearTimeout(urlSyncTimerRef.current);
      urlSyncTimerRef.current = null;
    }

    if (isMobile) {
      urlSyncTimerRef.current = window.setTimeout(syncUrl, 180);
    } else {
      syncUrl();
    }

    return () => {
      if (urlSyncTimerRef.current !== null) {
        window.clearTimeout(urlSyncTimerRef.current);
        urlSyncTimerRef.current = null;
      }
    };
  }, [selectedCategories, searchQuery, currentPage, isMobile]);

  useEffect(() => {
    if (!location.startsWith("/shop")) return;

    const fullPathWithQuery = location + `?${search}`;

    sessionStorage.setItem("shopUrl", fullPathWithQuery);
  }, [searchQuery, selectedCategories, currentPage, search]);

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
    queryKey: ["/api/packages", selectedCategories.platform, selectedCategories.levels],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (selectedCategories.platform) params.set('categoryId', selectedCategories.platform);
      if (selectedCategories.levels) params.set('parentId', selectedCategories.levels[selectedCategories.levels.length - 1])

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
    selectedCategories.levels,
    selectedCategories.year,
    selectedCategories.minPrice,
    selectedCategories.maxPrice,
    selectedCategories.minRating,
    selectedCategories.author,
    searchQuery,
    currentPage
  ], [
    selectedCategories.platform,
    selectedCategories.levels,
    selectedCategories.year,
    selectedCategories.minPrice,
    selectedCategories.maxPrice,
    selectedCategories.minRating,
    selectedCategories.author,
    searchQuery,
    currentPage
  ]);

  const { data: coursesData, isLoading } = useQuery<{ courses: Course[]; total: number }>({
    queryKey: coursesQueryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategories.platform) params.append("platform", selectedCategories?.platform || params.get('platform') || '');
      if (selectedCategories.levels) params.append("level", selectedCategories.levels.join(','));
      if (selectedCategories.year) params.append("year", selectedCategories.year.toString());
      if (selectedCategories.minPrice !== undefined) params.append("minPrice", selectedCategories.minPrice.toString());
      if (selectedCategories.maxPrice !== undefined) params.append("maxPrice", selectedCategories.maxPrice.toString());
      if (selectedCategories.minRating !== undefined) params.append("minRating", selectedCategories.minRating.toString());
      if (selectedCategories.author) params.append("author", selectedCategories.author);
      if (searchQuery) params.append("search", searchQuery);
      params.append("excludeVipPackages", "true");
      params.append("limit", COURSES_PER_PAGE.toString());
      params.append("offset", ((currentPage - 1) * COURSES_PER_PAGE).toString());

      const url = `/api/courses${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      const courses = await res.json();
      const total = parseInt(res.headers.get('X-Total-Count') || '0', 10);
      return { courses, total };
    },
    enabled: !!categories
  });

  // Extract courses from query data.
  // Safety fallback: tolerate legacy cache shape when array is stored directly.
  const allCourses: Course[] = Array.isArray(coursesData)
    ? (coursesData as Course[])
    : (coursesData?.courses || []);

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

  const purchasedCourseIds = useMemo(() => new Set(purchases?.map((p) => p.courseId) || []), [purchases]);
  const favoritedCourseIds = useMemo(() => new Set(favorites?.map((f) => f.courseId) || []), [favorites]);

  const handleToggleFavorite = useCallback((courseId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const isFavorited = favoritedCourseIds.has(courseId);
    favoriteMutation.mutate({ courseId, isFavorited });
  }, [favoritedCourseIds, favoriteMutation]);

  // Server already excludes VIP subscriptions via excludeVipPackages=true
  const courses = allCourses;

  // Sort VIP subscriptions by tier (clone to avoid cache mutation)
  const sortedVips = useMemo(() => vipSubscriptions ? [...vipSubscriptions].sort((a, b) => {
    const tierOrder = { bronze: 1, silver: 2, gold: 3, diamond: 4 };
    const aTier = tierOrder[a.vipTier as keyof typeof tierOrder] || 999;
    const bTier = tierOrder[b.vipTier as keyof typeof tierOrder] || 999;
    return aTier - bTier;
  }) : [], [vipSubscriptions]);

  // Теперь фильтрация без дополнительных запросов
  const filteredCoursesByLevel = useMemo(() => {
    if (!courses.length) return [];

    return courses.filter((course) => {
      const courseSubcategoryIds = course.level || [];
      // Если выбраны уровни (level) — проверяем пересечение
      if (selectedCategories.levels) {
        // Предположим, что selectedCategories.levels — это массив ID
        const selectedLevels = selectedCategories.levels;
        const courseBySubcategories = courseSubcategoryIds.some(id => selectedLevels.includes(id))

        if (selectedCategories.levels.length > 1) {
          return courseBySubcategories
        } else {
          if (selectedCategories.platform) {
            return course?.level?.some(level => selectedCategories.platform === level)
          } else {
            return course?.level?.some(level => selectedCategories.levels?.[0] === level)
          }
        }
      }

      return true;
    });
  }, [courses, selectedCategories]);

  const paginatedCourses = filteredCoursesByLevel;
  const totalCourses = Array.isArray(coursesData)
    ? coursesData.length
    : (coursesData?.total || 0);
  const totalPages = Math.ceil(totalCourses / COURSES_PER_PAGE);
  // Server already returns paginated data, so use filteredCoursesByLevel directly

  useEffect(() => {
    if (!effectiveIsMobile) return;
    if (totalPages <= 1) return;
    const prefetchAdjacent = async () => {
      const pagesToWarm = [currentPage - 1, currentPage + 1].filter(
        (page) => page >= 1 && page <= totalPages
      );

      await Promise.all(
        pagesToWarm.map(async (targetPage) => {
          const queryKey = [
            "/api/courses",
            selectedCategories.platform,
            selectedCategories.levels,
            selectedCategories.year,
            selectedCategories.minPrice,
            selectedCategories.maxPrice,
            selectedCategories.minRating,
            selectedCategories.author,
            searchQuery,
            targetPage,
          ];

          await queryClient.prefetchQuery({
            queryKey,
            queryFn: async () => {
              const params = new URLSearchParams();
              if (selectedCategories.platform) params.append("platform", selectedCategories.platform);
              if (selectedCategories.levels) params.append("level", selectedCategories.levels.join(","));
              if (selectedCategories.year) params.append("year", selectedCategories.year.toString());
              if (selectedCategories.minPrice !== undefined) params.append("minPrice", selectedCategories.minPrice.toString());
              if (selectedCategories.maxPrice !== undefined) params.append("maxPrice", selectedCategories.maxPrice.toString());
              if (selectedCategories.minRating !== undefined) params.append("minRating", selectedCategories.minRating.toString());
              if (selectedCategories.author) params.append("author", selectedCategories.author);
              if (searchQuery) params.append("search", searchQuery);
              params.append("excludeVipPackages", "true");
              params.append("limit", COURSES_PER_PAGE.toString());
              params.append("offset", ((targetPage - 1) * COURSES_PER_PAGE).toString());

              const res = await fetch(`/api/courses?${params.toString()}`, {
                credentials: "include",
              });
              if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
              const courses = await res.json();
              const total = parseInt(res.headers.get("X-Total-Count") || "0", 10);
              return { courses, total };
            },
          });

          // Best-effort image warmup for adjacent swipe batches.
          const data = queryClient.getQueryData<{ courses?: Array<{ thumbnailImage?: string }> }>(queryKey);
          const thumbs = (data?.courses || [])
            .map((c) => c.thumbnailImage)
            .filter((v): v is string => !!v)
            .slice(0, 8);
          thumbs.forEach((src) => {
            const img = new Image();
            img.decoding = "async";
            img.loading = "eager";
            img.src = src;
          });
        })
      );
    };

    prefetchAdjacent().catch(() => {
      // ignore warmup failures
    });
  }, [
    effectiveIsMobile,
    currentPage,
    totalPages,
    selectedCategories.platform,
    selectedCategories.levels,
    selectedCategories.year,
    selectedCategories.minPrice,
    selectedCategories.maxPrice,
    selectedCategories.minRating,
    selectedCategories.author,
    searchQuery,
  ]);


  // Для мобильных: используем те же пагинированные данные с сервера
  const mobileCourses = filteredCoursesByLevel;

  const validMobileCourses = useMemo(() => {
    return mobileCourses.filter(course => {
      const activeCategories = categories?.filter(
        (cat) => course.level?.includes(cat.id) && cat.isActive
      );
      return !categories || (activeCategories && activeCategories.length > 0);
    });
  }, [mobileCourses, categories]);

  // Reset to page 1 when filters or search changes
  useEffect(() => {
    setCurrentPage((prev) => (prev === 1 ? prev : 1));
    setVisiblePageRange((prev) => (prev.start === 1 && prev.end === 1 ? prev : { start: 1, end: 1 }));
    setCurrentVisiblePage((prev) => (prev === 1 ? prev : 1));
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

  // Memoized render prop for carousel items
  const renderCarouselItem = useCallback((activeIndex: number, index: number, isScrolling: boolean) => {
    const course = validMobileCourses[index];
    if (!course) return null;

    return (
      <ShopMobileCard
        key={course.id}
        course={course}
        index={index}
        purchasedCourseIds={purchasedCourseIds}
        favoritedCourseIds={favoritedCourseIds}
        subcategories={subcategories}
        categories={categories}
        isActive={!effectiveIosLandscapeSafeMode && activeIndex === index && !isScrolling}
        isScrolling={isScrolling}
        isAuthenticated={isAuthenticated}
        handleToggleFavorite={handleToggleFavorite}
        priority={index === 0}
        disablePreviewVideo={effectiveIosLandscapeSafeMode}
      />
    );
  }, [validMobileCourses, purchasedCourseIds, favoritedCourseIds, subcategories, categories, isAuthenticated, handleToggleFavorite, effectiveIosLandscapeSafeMode]);


  // Обработчик свайпа влево до конца (переход на следующую страницу)
  const handleSwipeEnd = useCallback(() => {
    if (visiblePageRange.end >= totalPages) return;

    const nextPage = visiblePageRange.end + 1;
    // Показываем следующую страницу с начала (индекс 0)
    setCurrentPage(nextPage);
    setVisiblePageRange({ start: nextPage, end: nextPage });
    setCurrentVisiblePage(nextPage);
    setCarouselInitialIndex(0);
  }, [visiblePageRange.end, totalPages]);

  // Обработчик свайпа вправо к началу (возврат на предыдущую страницу)
  const handleSwipeStart = useCallback(() => {
    if (visiblePageRange.start <= 1) return;

    const prevPage = visiblePageRange.start - 1;
    // Показываем предыдущую страницу с конца (индекс 11 - последняя карточка)
    setCurrentPage(prevPage);
    setVisiblePageRange({ start: prevPage, end: prevPage });
    setCurrentVisiblePage(prevPage);
    setCarouselInitialIndex(COURSES_PER_PAGE - 1); // 12 - 1 = 11
  }, [visiblePageRange.start]);

  // Обработчик клика по пагинатору на мобильной версии
  const handleMobilePageChange = useCallback((page: number) => {
    if (page < 1 || page > totalPages) return;

    // При клике на пагинатор всегда начинаем с первой карточки
    setCurrentPage(page);
    setVisiblePageRange({ start: page, end: page });
    setCurrentVisiblePage(page);
    setCarouselInitialIndex(0);
  }, [totalPages]);



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
    if (!telegramCodeModal || telegramCodeModal.length !== 4) {
      toast({
        title: "Ошибка",
        description: "Введите 4-значный код из Telegram",
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
    if (!selectedCategories.platform || !categories) return []

    // selectedCategories.platform теперь строка с UUID через запятую
    // например: "20669c5b-dd6b-4722-b3d9-08307f1889e1,85ab9ef9-7f08-4cfc-9109-f9a2c0711fe0"
    const platformIds = selectedCategories.platform
      .split(',')
      .map(id => id.trim())
      .filter(id => id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))

    // Находим категории по их id (предполагаем, что у категории есть поле id)
    const matchedCategories = platformIds
      .map(id => categories.find(cat => cat.id === id))
      .filter((cat): cat is Category => !!cat)
    return matchedCategories
  }, [selectedCategories.platform, categories])

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
      id: isMobile ? 'mobile-catalog-section' : 'catalog-section',
      label: "Каталог",
      icon: <BookOpen className="h-4 w-4" />,
      color: "from-purple-500 to-pink-500",
    });

    items.push({
      id: "referral-section",
      label: "Рефералка",
      icon: <Sparkles className="h-4 w-4" />,
      color: "from-purple-400 to-pink-400",
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
    if (hasPopularCourses) {
      items.push({
        id: "popular-section",
        label: "Популярное",
        icon: <TrendingUp className="h-4 w-4" />,
        color: "from-orange-500 to-red-500",
      });
    }

    return items;
  }, [sortedVips, coursePackages, topCoursesCategories, hasPopularCourses]);

  return (
    <div
      className="min-h-screen bg-sidebar relative"
      data-shop-main="1"
      data-mobile-safe-mode={effectiveIosLandscapeSafeMode ? "1" : undefined}
    >
      <Header
        searchQuery={searchInput}
        onSearchChange={setSearchInput}
        onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        onResetFilters={handleResetFilters}
        onOpenFilters={() => setSidebarOpen(true)}
      />

      {(navigationItems.length >= 1 && isMobile) && <PageNavigation items={navigationItems} />}

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

        <main className={`flex-1 min-h-screen ${effectiveIosLandscapeSafeMode ? 'p-3 md:px-6 md:pb-6 pt-[92px] overflow-x-hidden' : 'p-3 md:p-6 pt-[70px] max-md:overflow-x-hidden'}`}>
          <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
            <div className="space-y-3">
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight">Магазин курсов</h1>
              <p className="text-base md:text-lg text-muted-foreground">
                Выберите курс для обучения и развития в любом направлении
              </p>
            </div>

            {/* Page Navigation */}
            {(navigationItems.length >= 1 && !isMobile) && <PageNavigation items={navigationItems} />}

            {/* VIP Subscriptions Block */}
            <div id="vip-section" className="relative space-y-2 md:space-y-3 py-4 md:py-6 pl-6 md:px-8 rounded-2xl border border-yellow-500/10 bg-gradient-to-br from-slate-950/40 via-purple-950/30 to-amber-950/40 shadow-[0_0_80px_-12px_rgba(234,179,8,0.15)] overflow-visible" data-testid="vip-subscriptions-block">
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
                  {effectiveIsMobile && (
                    <div className="block transition-all max-w-full overflow-x-hidden mt-1.5 pt-1">
                      <SwipeableCarousel
                        key={`vip-mobile-carousel-${effectiveIosLandscapeSafeMode ? 'safe' : 'default'}-${sortedVips.length}`}
                        itemCount={sortedVips.length}
                        className={effectiveIosLandscapeSafeMode ? "max-w-full overflow-x-hidden" : undefined}
                        slideClassName={effectiveIosLandscapeSafeMode ? "flex-[0_0_48%] max-w-[48%]" : undefined}
                        slideContainIntrinsicSize={effectiveIosLandscapeSafeMode ? "48vw 305px" : "85vw 320px"}
                        renderRadius={effectiveIosLandscapeSafeMode ? 1 : 1}
                      >
                        {(activeIndex, itemIndex) => {
                          return (
                            <MobileVipCard
                              key={itemIndex}
                              sortedVips={sortedVips}
                              itemIndex={itemIndex}
                              isActive={activeIndex === itemIndex}
                              purchasedCourseIds={purchasedCourseIds}
                              vipTiers={vipTiers}
                              disableExpand={effectiveIosLandscapeSafeMode}
                              maxWidthPx={effectiveIosLandscapeSafeMode ? 360 : undefined}
                            />
                          );
                        }}
                      </SwipeableCarousel>
                    </div>
                  )}

                  {/* Desktop: Original Grid - UNTOUCHED */}
                  {!effectiveIsMobile && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch" style={{ gridAutoRows: '1fr' }}>
                      {sortedVips.map((vip, idx) => {

                        return (
                          <VipCard
                            key={vip.id}
                            purchasedCourseIds={purchasedCourseIds}
                            vip={vip}
                            hoveredVipId={hoveredVipId}
                            vipTiers={vipTiers}
                            setHoveredVipId={setHoveredVipId}
                            expandToLeft={vipGridColumns > 1 && (idx + 1) % vipGridColumns === 0}
                          />
                        );
                      })}
                    </div>
                  )}
                </>
              ) : null}
            </div>

            {/* Divider */}
            <div className="border-t border-border pt-6 md:pt-8 pb-4">
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
              forceVisible={effectiveIosLandscapeSafeMode}
            />

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array.from({ length: 12 }).map((_, i) => (
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
                    <div
                      id="mobile-catalog-section"
                      className="block"
                    >
                      <SwipeableCarousel
                        onReachEnd={handleSwipeEnd}
                        onReachStart={handleSwipeStart}
                        currentPageSize={validMobileCourses.length}
                        itemCount={validMobileCourses.length}
                        initialIndex={carouselInitialIndex}
                        key={`mobile-carousel-page-${currentPage}`}
                        className={effectiveIosLandscapeSafeMode ? "max-w-full overflow-x-hidden" : undefined}
                        slideClassName={effectiveIosLandscapeSafeMode ? "!flex-[0_0_30%] !max-w-[30%]" : undefined}
                        renderRadius={effectiveIosLandscapeSafeMode ? 2 : 1}
                        disableVirtualization={effectiveIosLandscapeSafeMode}
                      >
                        {renderCarouselItem}
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
                    <div id="catalog-section" className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch" style={{ gridAutoRows: '1fr' }}>
                      {paginatedCourses.map((course, index) => {

                        const selectedCategoriesWithoutsub = categories?.filter((cat) => course.level?.includes(cat.id) && cat.isActive);


                        if (selectedCategoriesWithoutsub && selectedCategoriesWithoutsub.length > 0) return (
                          <ShopDesktopCard
                            key={course.id}
                            course={course}
                            index={index}
                            purchasedCourseIds={purchasedCourseIds}
                            favoritedCourseIds={favoritedCourseIds}
                            subcategories={subcategories}
                            categories={categories}
                            user={user}
                            isAuthenticated={isAuthenticated}
                            handleToggleFavorite={handleToggleFavorite}
                            priority={index < 4}
                            expandToLeft={catalogGridColumns > 1 && (index + 1) % catalogGridColumns === 0}
                          />
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
                <div
                  className="mt-12 mb-8"
                  data-testid="section-trade-in-banner"
                >
                  <Card className="overflow-hidden border-2 border-purple-500/20 bg-gradient-to-br from-background via-purple-950/5 to-pink-950/5">
                    <div className="grid md:grid-cols-2 gap-0">
                      {/* Left side - Image */}
                      <div className="relative h-64 md:h-auto min-h-[300px] overflow-hidden" data-testid="image-trade-in-banner">
                        <img
                          src={tradeInImage}
                          alt="Trade-In Exchange"
                          loading="lazy"
                          className="absolute inset-0 w-full h-full object-cover"
                        />
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

                          <div className={`grid gap-4 ${effectiveIosLandscapeSafeMode ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-3'}`}>
                            <div className="flex items-start gap-3 p-4 rounded-lg bg-card/50 border border-border min-w-0" data-testid="card-trade-in-benefit-1">
                              <div className="p-2 rounded-lg bg-purple-500/10">
                                <Check className="h-5 w-5 text-purple-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-sm">До 60%</p>
                                <p className="text-xs text-muted-foreground break-words">возврата стоимости</p>
                              </div>
                            </div>

                            <div className="flex items-start gap-3 p-4 rounded-lg bg-card/50 border border-border min-w-0" data-testid="card-trade-in-benefit-2">
                              <div className="p-2 rounded-lg bg-pink-500/10">
                                <Shield className="h-5 w-5 text-pink-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-sm">24 часа</p>
                                <p className="text-xs text-muted-foreground break-words">на оценку</p>
                              </div>
                            </div>

                            <div className="flex items-start gap-3 p-4 rounded-lg bg-card/50 border border-border min-w-0" data-testid="card-trade-in-benefit-3">
                              <div className="p-2 rounded-lg bg-orange-500/10">
                                <Gem className="h-5 w-5 text-orange-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-sm">Любые темы</p>
                                <p className="text-xs text-muted-foreground break-words">принимаем все</p>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row gap-3 pt-2">
                            <Link href="/trade-in" onClick={() => window.scrollTo(0, 0)}>
                              <Button
                                size="lg"
                                className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30 w-full sm:w-auto"
                                data-testid="button-trade-in-promo"
                              >
                                Обменять курсы
                                <ArrowRight className="h-5 w-5" />
                              </Button>
                            </Link>
                            <Link href="/trade-in" onClick={() => window.scrollTo(0, 0)}>
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
                <div
                  id="referral-section"
                  className="mb-8"
                  data-testid="section-referral-banner"
                >
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

                          <div className={`grid gap-4 ${effectiveIosLandscapeSafeMode ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-3'}`}>
                            <div className="flex items-start gap-3 p-4 rounded-lg bg-card/50 border border-border min-w-0" data-testid="card-referral-benefit-1">
                              <div className="p-2 rounded-lg bg-blue-500/10">
                                <TrendingUp className="h-5 w-5 text-blue-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-sm">До 45%</p>
                                <p className="text-xs text-muted-foreground break-words">от пополнений</p>
                              </div>
                            </div>

                            <div className="flex items-start gap-3 p-4 rounded-lg bg-card/50 border border-border min-w-0" data-testid="card-referral-benefit-2">
                              <div className="p-2 rounded-lg bg-cyan-500/10">
                                <Percent className="h-5 w-5 text-cyan-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-sm">5% скидка</p>
                                <p className="text-xs text-muted-foreground break-words">для друга</p>
                              </div>
                            </div>

                            <div className="flex items-start gap-3 p-4 rounded-lg bg-card/50 border border-border min-w-0" data-testid="card-referral-benefit-3">
                              <div className="p-2 rounded-lg bg-teal-500/10">
                                <Gift className="h-5 w-5 text-teal-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-sm">Навсегда</p>
                                <p className="text-xs text-muted-foreground break-words">пассивный доход</p>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row gap-3 pt-2">
                            <Link href="/bonuses" onClick={() => window.scrollTo(0, 0)}>
                              <Button
                                size="lg"
                                className="gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/30 w-full sm:w-auto"
                                data-testid="button-referral-promo"
                              >
                                Пригласить друзей
                                <ArrowRight className="h-5 w-5" />
                              </Button>
                            </Link>
                            <Link href="/bonuses" onClick={() => window.scrollTo(0, 0)}>
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
                          loading="lazy"
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
                {/* Background handled by global fixed background */}

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
                    <PackageCard key={pkg.id} pkg={pkg} idx={idx} priority={idx === 0} />
                  ))}
                </div>



                {/* Packages Carousel - Mobile */}
                <div className="md:hidden">
                  <SwipeableCarousel>
                    {coursePackages.map((pkg, idx) => (
                      <PackageCard key={pkg.id} pkg={pkg} idx={idx} priority={idx === 0} />
                    ))}
                  </SwipeableCarousel>
                </div>
              </div>
            )}

            {/* Top Courses Section */}
            {topCoursesCategories.length > 0 && (
              <div
                id="popular-section"
                className="space-y-8 mb-8"
              >
                {topCoursesCategories.map(category => (
                  <TopCourses
                    key={category.id}
                    categoryId={category.id}
                    platform={category.id}
                    limit={5}
                    title={`🔥 Популярные курсы: ${category.name}`}
                    onDataLoaded={(hasData) => setHasPopularCourses(hasData)}
                  />
                ))}
              </div>
            )}

            {/* Sniper Promotional Banner */}
            <div
              className="mt-12 mb-8"
              data-testid="section-sniper-banner"
            >
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

                      <div className={`grid gap-4 ${effectiveIosLandscapeSafeMode ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-3'}`}>
                        <div className="flex items-start gap-3 p-4 rounded-lg bg-card/50 border border-border min-w-0" data-testid="card-sniper-benefit-1">
                          <div className="p-2 rounded-lg bg-blue-500/10">
                            <Target className="h-5 w-5 text-blue-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm">Предложите</p>
                            <p className="text-xs text-muted-foreground break-words">любой курс</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 p-4 rounded-lg bg-card/50 border border-border min-w-0" data-testid="card-sniper-benefit-2">
                          <div className="p-2 rounded-lg bg-purple-500/10">
                            <ThumbsUp className="h-5 w-5 text-purple-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm">Голосуйте</p>
                            <p className="text-xs text-muted-foreground break-words">за идеи других</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 p-4 rounded-lg bg-card/50 border border-border min-w-0" data-testid="card-sniper-benefit-3">
                          <div className="p-2 rounded-lg bg-pink-500/10">
                            <TrendingUp className="h-5 w-5 text-pink-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm">Получите</p>
                            <p className="text-xs text-muted-foreground break-words">доступ первыми</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <Link href="/sniper" onClick={() => window.scrollTo(0, 0)}>
                          <Button
                            size="lg"
                            className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30 w-full sm:w-auto"
                            data-testid="button-sniper-promo"
                          >
                            Предложить курс
                            <Target className="h-5 w-5" />
                          </Button>
                        </Link>
                        <Link href="/sniper" onClick={() => window.scrollTo(0, 0)}>
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
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
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
                            <span>Скопируйте <strong>4-значный код</strong> из сообщения</span>
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
                      placeholder="● ● ● ● "
                      value={telegramCodeModal}
                      onChange={(e) => setTelegramCodeModal(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      maxLength={4}
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
                    disabled={isLinkingTelegram || telegramCodeModal.length !== 4}
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
