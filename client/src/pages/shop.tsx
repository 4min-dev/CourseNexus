import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueries } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useLocation } from "wouter";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShoppingCart, BookOpen, Crown, Shield, Sparkles, Check, Gem, Heart, Play, RefreshCw, ArrowRight, X, TrendingUp, Target, Crosshair, ThumbsUp, Users, Gift, Percent, ExternalLink, CheckCircle2, XCircle, Wifi, Link2, Lock, Bell, AlertCircle, Edit2 } from "lucide-react";
import { SiTelegram } from "react-icons/si";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import type { Course, Category, Subcategory } from "@shared/schema";
import { Header } from "@/components/header";
import { InfoBanner } from "@/components/info-banner";
import { Sidebar } from "@/components/sidebar";
import { MobileFilters } from "@/components/MobileFilters";
import { Footer } from "@/components/footer";
import { formatPrice } from "@/lib/formatPrice";
import { StarRating } from "@/components/star-rating";
import { ViewingCounter } from "@/components/viewing-counter";
import PreviewVideoPlayer from "@/components/PreviewVideoPlayer";
import { Diamond } from "@/components/Diamond";
import { Pagination } from "@/components/pagination";
import { GlassCard } from "@/components/GlassCard";
import { TopCourses } from "@/components/TopCourses";
import { PageNavigation } from "@/components/PageNavigation";
import { SwipeableCarousel } from "@/components/SwipeableCarousel";
import { apiRequest, queryClient } from "@/lib/queryClient";
import tradeInImage from "@assets/generated_images/UNO_style_trade_cards_illustration_11a5fb90.png";
import sniperImage from "@assets/generated_images/Influencer_in_sniper_crosshair_2bdcbb43.png";
import referralImage from "@assets/generated_images/Referral_network_illustration_951f8395.png";
import starterPackageImg from "@assets/generated_images/Starter_package_illustration_bundle_1c8f4d88.png";
import professionalPackageImg from "@assets/generated_images/Professional_package_illustration_levels_de5bc7a2.png";
import premiumPackageImg from "@assets/generated_images/Premium_package_illustration_orbit_4879daf5.png";
import { Section } from "./admin-course-edit";

const COURSES_PER_PAGE = 12;

interface VipTier {
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

// Function to convert HTML to plain text with proper spacing
const htmlToText = (html: string): string => {
  if (!html) return '';

  let text = html
    // First pass: block elements get double space for separation
    .replace(/<\/p>/gi, '  ')
    .replace(/<p[^>]*>/gi, '  ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/div>/gi, '  ')
    .replace(/<div[^>]*>/gi, '  ')
    .replace(/<\/?(h[1-6]|li|ul|ol|blockquote|table|tr|td)[^>]*>/gi, ' ')
    // Second pass: remove ALL other tags with single space
    .replace(/<[^>]*>/g, ' ')
    // Normalize spaces
    .replace(/\s+/g, ' ')
    .trim();

  return text;
};

// Separate component for package card to use hooks properly
function PackageCard({ pkg, idx }: { pkg: CoursePackage; idx: number }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hoveredCourse, setHoveredCourse] = useState<string | null>(null);
  const [previewCourse, setPreviewCourse] = useState<Course | null>(null);
  const packageImages = [starterPackageImg, professionalPackageImg, premiumPackageImg];
  const packageImage = pkg.thumbnailUrl || packageImages[idx % packageImages.length];

  // Use shared mobile detection hook - prevents memory leaks from multiple resize listeners
  const isMobile = useIsMobile();

  // Toggle expansion on mobile (touch devices)
  const handleMobileToggle = (e: React.MouseEvent) => {
    // Only toggle if clicking on the card itself, not interactive elements
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a')) {
      return;
    }

    if (isMobile) {
      e.stopPropagation();
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div
      className={`group relative ${idx === 0 ? 'md:col-span-2 lg:col-span-1' : ''}`}
      onMouseEnter={() => {
        // Only activate hover on desktop (devices with hover support)
        const isMobile = window.matchMedia('(hover: none)').matches;
        if (!isMobile) {
          setIsExpanded(true);
        }
      }}
      onMouseLeave={() => {
        const isMobile = window.matchMedia('(hover: none)').matches;
        if (!isMobile) {
          setIsExpanded(false);
          setHoveredCourse(null);
        }
      }}
      onClick={handleMobileToggle}
      data-testid={`card-package-${pkg.id}`}
      style={{
        zIndex: isExpanded ? 50 : 'auto',
        position: 'relative'
      }}
    >
      {/* Glassmorphism Card - GPU optimized via global CSS */}
      <div
        className={`
          relative overflow-visible rounded-2xl h-full
          bg-gradient-to-br from-background/40 via-background/60 to-background/40
          backdrop-blur-md border-2 border-purple-500/20
          transition-[transform,box-shadow,border-color] duration-200 ease-out
          flex flex-col
          transform-gpu scale-100
          ${isExpanded ? 'scale-[1.02] shadow-2xl shadow-purple-500/30 border-purple-500/40' : 'hover-elevate active-elevate-2 md:active:scale-100'}
        `}
        style={{
          backdropFilter: 'blur(8px) saturate(140%)',
          WebkitBackdropFilter: 'blur(8px) saturate(140%)',
          transformOrigin: 'center center',
        }}
      >
        {/* Animated gradient border effect */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-pink-500/20 to-orange-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-100 pointer-events-none"
        />

        {/* Discount Badge - Floating */}
        {pkg.discount > 0 && (
          <div className="absolute top-6 right-6 z-20">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-red-500 rounded-full blur-md opacity-40" />
              <Badge
                className="relative bg-gradient-to-r from-orange-600 to-red-600 text-white border-0 text-lg px-5 py-2.5 shadow-lg font-bold"
                data-testid={`badge-discount-${pkg.id}`}
              >
                <Sparkles className="h-4 w-4 mr-1.5" />
                -{pkg.discount}%
              </Badge>
            </div>
          </div>
        )}

        {/* Hero Image with Parallax */}
        <div className="relative h-64 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/30 via-pink-600/20 to-orange-600/30" />
          <img
            src={packageImage}
            alt={pkg.name}
            className={`
              absolute inset-0 w-full h-full object-cover transition-transform duration-150 ease-out
              transform-gpu scale-100
              ${isExpanded ? 'scale-[1.03]' : ''}
            `}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />

          {/* Package Title Overlay */}
          <div className="absolute bottom-6 left-6 right-6">
            <h3 className="text-3xl font-bold text-white drop-shadow-lg" data-testid={`text-package-name-${pkg.id}`}>
              {pkg.name}
            </h3>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 flex-1 flex flex-col min-h-[280px] max-md:px-4 max-md:space-y-2">
          {/* Description */}
          {pkg.description && (
            <p className="text-muted-foreground leading-relaxed line-clamp-3 break-words" data-testid={`text-package-description-${pkg.id}`}>
              {pkg.description}
            </p>
          )}

          {/* Stats Row */}
          <div className="flex flex-wrap items-center gap-6 text-sm max-md:gap-3">
            <div className="flex flex-wrap items-center gap-2 max-md:gap-1">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <BookOpen className="h-4 w-4 text-purple-400" />
              </div>
              <span className="font-medium" data-testid={`text-course-count-${pkg.id}`}>
                {pkg.courses.length} {pkg.courses.length === 1 ? 'курс' : 'курса'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 max-md:gap-1">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Gem className="h-4 w-4 text-green-400" />
              </div>
              <span className="font-medium text-green-500">
                Экономия {formatPrice(pkg.totalPrice - pkg.discountedPrice)}
              </span>
            </div>
          </div>

          {/* Pricing Section */}
          <div className="pt-4 border-t border-border/50 mt-auto">
            <div className="flex flex-col gap-4 max-md:gap-2">
              <div className="space-y-1">
                {pkg.discount > 0 ? (
                  <>
                    <div className="flex flex-wrap items-baseline gap-3 max-md:gap-2">
                      <span className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent" data-testid={`text-discounted-price-${pkg.id}`}>
                        {formatPrice(pkg.discountedPrice)}
                      </span>
                      <span className="text-lg text-muted-foreground line-through" data-testid={`text-original-price-${pkg.id}`}>
                        {formatPrice(pkg.totalPrice)}
                      </span>
                    </div>
                  </>
                ) : (
                  <span className="text-4xl font-bold" data-testid={`text-price-${pkg.id}`}>
                    {formatPrice(pkg.totalPrice)}
                  </span>
                )}
              </div>

              <Button
                className="w-full relative overflow-hidden backdrop-blur-sm bg-white/5 border-2 border-purple-500/30 text-white shadow-lg hover:shadow-purple-500/50 transition-all duration-300 font-semibold group"
                size="lg"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.location.href = `/package/${pkg.id}`;
                }}
                data-testid={`button-view-package-${pkg.id}`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <span className="relative flex items-center justify-center gap-2">
                  <ArrowRight className="h-5 w-5" />
                  Изучить подробнее
                </span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile backdrop - rendered via Portal to escape carousel */}
      {isExpanded && isMobile && createPortal(
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
          style={{ zIndex: 9998 }}
          onClick={() => {
            console.log('[PackageCard] Backdrop clicked, closing overlay');
            setIsExpanded(false);
          }}
        />,
        document.body
      )}

      {/* Expandable Course Grid - Absolutely positioned overlay on desktop, Portal on mobile */}
      {isExpanded && pkg.courses && pkg.courses.length > 0 && (
        isMobile ? createPortal(
          <div
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-h-[70vh] overflow-y-auto scrollbar-hide bg-background/95 backdrop-blur-lg rounded-2xl border-2 border-purple-500/20 p-4 shadow-2xl shadow-purple-500/20 animate-in fade-in duration-300"
            style={{
              zIndex: 9999,
              transform: 'translateY(-50%) translateZ(0)'
            }}
            onClick={(e) => {
              // Prevent closing when clicking inside expanded area on mobile
              e.stopPropagation();
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              {pkg.courses.map((course) => (
                <div
                  key={course.id}
                  className="group/course relative cursor-pointer"
                  onClick={() => setPreviewCourse(course)}
                  data-testid={`mini-course-card-${course.id}`}
                >
                  {/* Course Mini Card */}
                  <div
                    className="relative overflow-hidden rounded-xl border border-border/50 transition-all duration-200 ease-out"
                    style={{
                      transform: 'translateZ(0)',
                      transformOrigin: 'center center'
                    }}
                  >
                    {/* Course Thumbnail */}
                    <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-purple-900/20 to-pink-900/20">
                      {course.thumbnailImage ? (
                        <img
                          src={course.thumbnailImage}
                          alt={course.title}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <BookOpen className="h-8 w-8 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                    {/* Course Info */}
                    <div className="p-2 bg-background">
                      <p className="text-xs font-semibold line-clamp-2">
                        {course.title}
                      </p>
                      {course.price && (
                        <p className="text-xs text-purple-400 mt-1">
                          {formatPrice(parseFloat(course.price))}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>,
          document.body
        ) : (
          <div
            className="absolute left-0 right-0 top-full slide-in-from-top-4 bg-background/95 backdrop-blur-lg rounded-2xl border-2 border-purple-500/20 p-4 shadow-2xl shadow-purple-500/20 animate-in fade-in duration-300"
            style={{
              zIndex: 100,
              transform: 'translateZ(0)',
              marginTop: '-2px'
            }}
            onMouseEnter={() => setIsExpanded(true)}
            onMouseLeave={() => {
              setIsExpanded(false);
              setHoveredCourse(null);
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              {pkg.courses.map((course) => (
                <div
                  key={course.id}
                  className="group/course relative cursor-pointer"
                  onMouseEnter={() => setHoveredCourse(course.id)}
                  onMouseLeave={() => setHoveredCourse(null)}
                  onClick={() => setPreviewCourse(course)}
                  data-testid={`mini-course-card-${course.id}`}
                >
                  {/* Course Mini Card */}
                  <div
                    className={`
                      relative overflow-hidden rounded-xl border
                      transition-all duration-200 ease-out
                      ${hoveredCourse === course.id
                        ? 'border-purple-500/60 shadow-lg shadow-purple-500/20 scale-105 z-10'
                        : 'border-border/50'
                      }
                    `}
                    style={{
                      transform: 'translateZ(0)',
                      transformOrigin: 'center center'
                    }}
                  >
                    {/* Course Thumbnail */}
                    <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-purple-900/20 to-pink-900/20">
                      {course.thumbnailImage ? (
                        <img
                          src={course.thumbnailImage}
                          alt={course.title}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <BookOpen className="h-8 w-8 text-muted-foreground/30" />
                        </div>
                      )}
                      {/* Hover Overlay */}
                      <div className={`
                        absolute inset-0 bg-gradient-to-t from-background via-background/90 to-transparent
                        transition-opacity duration-75 ease-out
                        ${hoveredCourse === course.id ? 'opacity-100' : 'opacity-0'}
                      `}>
                        <div className="absolute bottom-2 left-2 right-2">
                          <p className="text-xs font-semibold text-white line-clamp-2">
                            {course.title}
                          </p>
                          {course.price && (
                            <p className="text-xs text-purple-300 mt-1">
                              {formatPrice(parseFloat(course.price))}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {/* Course Preview Dialog */}
      <Dialog open={!!previewCourse} onOpenChange={(open) => !open && setPreviewCourse(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-course-preview">
          {previewCourse && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold pr-8">{previewCourse.title}</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 max-md:space-y-2">
                {/* Course Thumbnail */}
                <div className="relative aspect-video overflow-hidden rounded-lg bg-gradient-to-br from-purple-900/20 to-pink-900/20">
                  {previewCourse.thumbnailImage ? (
                    <img
                      src={previewCourse.thumbnailImage}
                      alt={previewCourse.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <BookOpen className="h-16 w-16 text-muted-foreground/30" />
                    </div>
                  )}
                </div>

                {/* Rating and Stats */}
                <div className="flex items-center justify-between gap-4 max-md:gap-2">
                  <StarRating
                    rating={Number(previewCourse.rating || 0)}
                    reviewsCount={Number(previewCourse.reviewsCount || 0)}
                  />
                  <ViewingCounter value={course.reviewsCount} courseId={previewCourse.id} />
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  {previewCourse.platform && (
                    <Badge variant="outline" className="text-sm">
                      {previewCourse.platform}
                    </Badge>
                  )}
                  {previewCourse.level && (
                    <Badge variant="outline" className="text-sm">
                      {previewCourse.level}
                    </Badge>
                  )}
                  {previewCourse.year && (
                    <Badge variant="outline" className="text-sm">
                      {previewCourse.year}
                    </Badge>
                  )}
                </div>

                {/* Description */}
                {previewCourse.description && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm text-muted-foreground">Описание</h4>
                    <div
                      className="prose prose-sm dark:prose-invert max-w-none text-foreground leading-relaxed text-sm"
                      dangerouslySetInnerHTML={{ __html: previewCourse.description }}
                    />
                  </div>
                )}

                {/* Author */}
                {previewCourse.authorName && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Avatar className="h-10 w-10 border-2 border-primary/20">
                      <AvatarImage src={previewCourse.authorImage || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {previewCourse.authorName[0] || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">Автор</span>
                      <span className="text-sm font-medium">{previewCourse.authorName}</span>
                    </div>
                  </div>
                )}

                {/* Price */}
                {previewCourse.price && (
                  <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                    <span className="text-sm text-muted-foreground">Цена курса</span>
                    <span className="text-2xl font-bold">
                      {formatPrice(parseFloat(previewCourse.price))}
                    </span>
                  </div>
                )}

                {/* View Course Button */}
                <Button
                  className="w-full gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg"
                  size="lg"
                  onClick={() => {
                    setPreviewCourse(null);
                    window.location.href = `/course/${previewCourse.id}`;
                  }}
                  data-testid="button-view-full-course"
                >
                  <ArrowRight className="h-5 w-5" />
                  Перейти к курсу
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Shop() {
  const { isAuthenticated, user } = useAuth();
  const [location, setLocation] = useLocation();
  const [selectedCategories, setSelectedCategories] = useState<{
    platform?: string;
    level?: string;
    year?: number;
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    author?: string;
  }>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1); // Для desktop пагинации
  const [visiblePageRange, setVisiblePageRange] = useState({ start: 1, end: 1 }); // Для mobile infinite scroll
  const [currentVisiblePage, setCurrentVisiblePage] = useState(1); // Отслеживание текущей видимой страницы для пагинатора
  const [carouselInitialIndex, setCarouselInitialIndex] = useState(0); // Начальный индекс для карусели (0 или 11)
  const [hoveredVipId, setHoveredVipId] = useState<string | null>(null);
  const [hoveredCourseId, setHoveredCourseId] = useState<string | null>(null);
  const [activeMobileCourseId, setActiveMobileCourseId] = useState<string | null>(null);
  const [hoveredCourseHasPreview, setHoveredCourseHasPreview] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [loadedImageUrls, setLoadedImageUrls] = useState<Set<string>>(new Set());

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

  const useCoursePlatforms = (courseId: string | undefined) => {
    return useQuery({
      queryKey: ["/api/admin/courses", courseId, "subcategories"],
      queryFn: async () => {
        if (!courseId) throw new Error("No courseId");
        const response = await fetch(`/api/admin/courses/${courseId}/subcategories`, {
          credentials: "include",
        });
        if (!response.ok) throw new Error("Failed to fetch");
        return response.json();
      },
      enabled: !!courseId,
      staleTime: 1000 * 60 * 5,
    });
  };

  // Restore Telegram modal state from localStorage on mount
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
    } else {
      setSearchQuery("");
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

    // Always save current shop URL for "Continue Shopping" feature
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
      if (selectedCategories.platform) params.append("platform", selectedCategories.platform);
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

  // Pagination calculations (must be before useEffect that uses them)
  const totalCourses = courses.length || 0;
  const totalPages = Math.ceil(totalCourses / COURSES_PER_PAGE);
  const startIndex = (currentPage - 1) * COURSES_PER_PAGE;
  const endIndex = startIndex + COURSES_PER_PAGE;
  const paginatedCourses = courses.slice(startIndex, endIndex) || [];

  // Для мобильных: показываем курсы в диапазоне страниц (скользящее окно)
  const mobileStartIndex = (visiblePageRange.start - 1) * COURSES_PER_PAGE;
  const mobileEndIndex = visiblePageRange.end * COURSES_PER_PAGE;
  const mobileCourses = courses.slice(mobileStartIndex, mobileEndIndex) || [];

  const platformQueries = useQueries({
    queries: paginatedCourses.map((course) => ({
      queryKey: ['course-platforms', course.id],
      queryFn: async () => {
        const response = await fetch(`/api/admin/courses/${course.id}/subcategories`, {
          credentials: 'include',
        });
        if (!response.ok) {
          throw new Error('Failed to fetch subcategories');
        }
        return response.json();
      },
      enabled: !!course.id,
      staleTime: 5 * 60 * 1000,
      retry: 1,
    })),
  });

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

  // Preload images только на десктопе (на мобильных устройствах пропускаем для экономии памяти)
  useEffect(() => {
    if (!paginatedCourses || paginatedCourses.length === 0) {
      setImagesLoaded(true);
      return;
    }

    // На мобильных устройствах не делаем preload - экономим память
    const isMobileDevice = window.innerWidth < 768;
    if (isMobileDevice) {
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

  // Memoized map of category/subcategory slugs to Russian names
  const categoryNameMap = useMemo(() => {
    const map: Record<string, string> = {};

    // Add category mappings (slug → Russian name)
    if (categories) {
      categories.forEach(cat => {
        map[cat.slug] = cat.name;
        // Also map English name to Russian (for backward compatibility)
        map[cat.nameEn.toLowerCase()] = cat.name;
      });
    }

    // Add subcategory mappings (slug → Russian name)
    if (subcategories) {
      subcategories.forEach(sub => {
        map[sub.slug] = sub.name;
        // Also map English name to Russian (for backward compatibility)
        map[sub.nameEn.toLowerCase()] = sub.name;
      });
    }

    return map;
  }, [categories, subcategories]);

  const sectionQueries = useQueries({
    queries: paginatedCourses.map((course) => ({
      queryKey: ["/api/admin/courses", course.id, "sections"],
      queryFn: async () => {
        const response = await fetch(`/api/admin/courses/${course.id}/sections`, {
          credentials: "include",
        });
        if (!response.ok) throw new Error("Failed to fetch sections");
        return response.json() as Promise<Section[]>;
      },
      enabled: !!course.id,
      staleTime: 1000 * 60 * 5, // 5 минут кэш
    })),
  });

  const getLevelName = (level: string) => {
    const names: Record<string, string> = {
      beginner: "Для новичков",
      intermediate: "Для опытных",
      advanced: "Продвинутый",
    };

    return names[level] || level;
  };

  const handleResetFilters = () => {
    setSelectedCategories({});
    setSearchQuery("");
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
        return categories.find(
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
        onSearchChange={setSearchQuery}
        onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        onResetFilters={handleResetFilters}
        onOpenFilters={() => setSidebarOpen(true)}
      />
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
            {navigationItems.length > 1 && <PageNavigation items={navigationItems} />}

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
                  <div className="md:hidden">
                    <SwipeableCarousel itemCount={sortedVips.length}>
                      {(activeIndex, itemIndex) => {
                        const vip = sortedVips[itemIndex];
                        if (!vip) return null;

                        const isExpanded = activeIndex === itemIndex;
                        const isPurchased = purchasedCourseIds.has(vip.id);
                        const tier = vip.vipTier || 'bronze';

                        // Get tier data from vipTiers
                        const tierData = vipTiers?.find(t => t.tier === tier);

                        const tierConfig: Record<string, {
                          sphereClass?: string;
                          isDiamond?: boolean;
                          glowColor: "purple" | "blue" | "pink" | "gold" | "cyan" | "silver" | "bronze";
                        }> = {
                          bronze: {
                            sphereClass: 'sphere-bronze',
                            glowColor: 'bronze',
                          },
                          silver: {
                            sphereClass: 'sphere-silver',
                            glowColor: 'silver',
                          },
                          gold: {
                            sphereClass: 'sphere-gold',
                            glowColor: 'gold',
                          },
                          diamond: {
                            isDiamond: true,
                            glowColor: 'purple',
                          },
                        };

                        const config = tierConfig[tier] || tierConfig.bronze;

                        return (
                          <div
                            key={vip.id}
                            className="h-full relative overflow-visible"
                          >
                            {/* Base Card - Fixed Height */}
                            <Link
                              href={`/course/${vip.id}`}
                              className={`block rounded-xl h-full ${isExpanded ? 'opacity-0 pointer-events-none' : ''}`}
                            >
                              <GlassCard
                                variant="premium"
                                glowColor={config.glowColor}
                                hover={false}
                                isActive={isExpanded}
                                className="cursor-pointer flex flex-col w-full min-h-[350px] overflow-hidden"
                                data-testid={`card-vip-${tier}`}
                              >
                                <div
                                  className="flex flex-col flex-1 overflow-hidden"
                                  style={{
                                    backfaceVisibility: 'hidden',
                                    transform: 'translateZ(0)'
                                  }}
                                >

                                  <CardHeader className="space-y-2 pb-3 relative z-10">
                                    <div className="flex items-center justify-between">
                                      {config.isDiamond ? (
                                        <Diamond className="diamond-sparkle w-7 h-7" />
                                      ) : (
                                        <div className={`h-7 w-7 rounded-full ${config.sphereClass}`} />
                                      )}
                                      {isPurchased && (
                                        <Badge variant="default" className="bg-green-600 text-xs">
                                          <Shield className="h-3 w-3 mr-1" />
                                          Активна
                                        </Badge>
                                      )}
                                    </div>
                                    <h3 className="font-bold tracking-tight text-2xl">
                                      {tierData?.displayName || vip.title}
                                    </h3>
                                  </CardHeader>

                                  <CardContent className="space-y-3 pb-3 flex-1 relative z-10 overflow-hidden">
                                    <div className="flex items-baseline gap-2">
                                      <span className="font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent text-3xl">
                                        {formatPrice(tierData?.price || vip.price || "0")}
                                      </span>
                                    </div>

                                    <p className="text-sm text-muted-foreground/90 line-clamp-3 leading-snug">
                                      {tierData?.description || (vip.description ? htmlToText(vip.description) : 'Эксклюзивный доступ к премиум контенту и персональной поддержке')}
                                    </p>
                                  </CardContent>

                                  <CardFooter className="pt-0 relative z-10 mt-auto">
                                    <Button
                                      className={`w-full relative overflow-hidden backdrop-blur-sm font-semibold transition-all duration-300 group ${isPurchased
                                        ? 'bg-white/5 border-2 border-green-500/30 text-white shadow-lg'
                                        : `bg-white/5 border-2 border-yellow-500/30 text-white ${isExpanded ? 'shadow-yellow-500/50' : ''}`
                                        }`}
                                      size="default"
                                      disabled={isPurchased}
                                    >
                                      <div className={`absolute inset-0 transition-opacity duration-700 ${isPurchased
                                        ? 'bg-gradient-to-r from-green-600 to-emerald-600 opacity-100'
                                        : `bg-gradient-to-r from-yellow-500 via-orange-500 to-pink-600 ${isExpanded ? 'opacity-100' : 'opacity-0'}`
                                        }`} />
                                      <span className="relative flex items-center justify-center">
                                        {isPurchased ? (
                                          <>
                                            <Check className="mr-2 h-4 w-4" />
                                            У вас есть подписка
                                          </>
                                        ) : (
                                          <>
                                            <Crown className="mr-2 h-4 w-4" />
                                            Оформить подписку
                                          </>
                                        )}
                                      </span>
                                    </Button>
                                  </CardFooter>
                                </div>
                              </GlassCard>
                            </Link>

                            {/* Expanded Overlay */}
                            {isExpanded && (
                              <div
                                className="absolute inset-x-0 top-0 z-[60] overflow-hidden rounded-xl pointer-events-auto"
                                onClick={(e) => e.preventDefault()}
                              >
                                <GlassCard
                                  variant="premium"
                                  glowColor={config.glowColor}
                                  hover={false}
                                  isActive={true}
                                  className="w-full shadow-2xl"
                                >
                                  <div className="flex flex-col">
                                    <CardHeader className="space-y-2 pb-2 relative z-10">
                                      <div className="flex items-center justify-between">
                                        {config.isDiamond ? (
                                          <Diamond className="diamond-sparkle" />
                                        ) : (
                                          <div className={`h-7 w-7 rounded-full ${config.sphereClass}`} />
                                        )}
                                        {isPurchased && (
                                          <Badge variant="default" className="bg-green-600 text-xs">
                                            <Shield className="h-3 w-3 mr-1" />
                                            Активна
                                          </Badge>
                                        )}
                                      </div>
                                      <h3 className="font-bold tracking-tight text-xl">
                                        {tierData?.displayName || vip.title}
                                      </h3>
                                      <p className="text-xs text-muted-foreground/90 leading-snug">
                                        {tierData?.description || (vip.description ? htmlToText(vip.description) : 'Эксклюзивный доступ к премиум контенту и персональной поддержке')}
                                      </p>
                                    </CardHeader>

                                    <CardContent className="space-y-2 pb-2 relative z-10">
                                      <div className="flex items-baseline gap-2">
                                        <span className="font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent text-2xl">
                                          {formatPrice(tierData?.price || vip.price || "0")}
                                        </span>
                                      </div>

                                      <div className="space-y-1">
                                        <p className="text-xs font-semibold text-muted-foreground">Что входит:</p>
                                        {(tierData?.features || []).map((feature: string, idx: number) => (
                                          <div key={idx} className="flex items-start gap-1.5">
                                            <Check className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                                            <span className="text-xs leading-snug">{feature}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </CardContent>

                                    <CardFooter className="pt-0 relative z-10">
                                      <Button
                                        className={`w-full relative overflow-hidden backdrop-blur-sm font-semibold transition-all duration-300 group ${isPurchased
                                          ? 'bg-white/5 border-2 border-green-500/30 text-white shadow-lg'
                                          : 'bg-white/5 border-2 border-yellow-500/30 text-white shadow-yellow-500/50'
                                          }`}
                                        size="default"
                                        disabled={isPurchased}
                                        onClick={(e) => {
                                          e.preventDefault();
                                          setLocation(`/course/${vip.id}`);
                                        }}
                                      >
                                        <div className={`absolute inset-0 transition-opacity duration-700 ${isPurchased
                                          ? 'bg-gradient-to-r from-green-600 to-emerald-600 opacity-100'
                                          : 'bg-gradient-to-r from-yellow-500 via-orange-500 to-pink-600 opacity-100'
                                          }`} />
                                        <span className="relative flex items-center justify-center">
                                          {isPurchased ? (
                                            <>
                                              <Check className="mr-2 h-4 w-4" />
                                              У вас есть подписка
                                            </>
                                          ) : (
                                            <>
                                              <Crown className="mr-2 h-4 w-4" />
                                              Оформить подписку
                                            </>
                                          )}
                                        </span>
                                      </Button>
                                    </CardFooter>
                                  </div>
                                </GlassCard>
                              </div>
                            )}
                          </div>
                        );
                      }}
                    </SwipeableCarousel>
                  </div>

                  {/* Desktop: Original Grid - UNTOUCHED */}
                  <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch" style={{ gridAutoRows: '1fr' }}>
                    {sortedVips.map((vip) => {
                      const isPurchased = purchasedCourseIds.has(vip.id);
                      const tier = vip.vipTier || 'bronze';
                      const isHovered = hoveredVipId === vip.id;

                      // Get tier data from vipTiers
                      const tierData = vipTiers?.find(t => t.tier === tier);

                      const tierConfig: Record<string, {
                        sphereClass?: string;
                        isDiamond?: boolean;
                        glowColor: "purple" | "blue" | "pink" | "gold" | "cyan" | "silver" | "bronze";
                      }> = {
                        bronze: {
                          sphereClass: 'sphere-bronze',
                          glowColor: 'bronze',
                        },
                        silver: {
                          sphereClass: 'sphere-silver',
                          glowColor: 'silver',
                        },
                        gold: {
                          sphereClass: 'sphere-gold',
                          glowColor: 'gold',
                        },
                        diamond: {
                          isDiamond: true,
                          glowColor: 'purple',
                        },
                      };

                      const config = tierConfig[tier] || tierConfig.bronze;

                      return (
                        <div
                          key={vip.id}
                          className="relative h-full group"
                          onMouseEnter={() => setHoveredVipId(vip.id)}
                          onMouseLeave={() => setHoveredVipId(null)}
                        >
                          <Link href={`/course/${vip.id}`} className="h-full">
                            <GlassCard
                              variant="premium"
                              glowColor={config.glowColor}
                              hover={true}
                              className={`relative overflow-visible cursor-pointer flex flex-col h-full min-h-[390px] ${isHovered ? 'absolute top-0 left-0 w-[400px] min-h-0 z-40 shadow-2xl scale-[1.02] transition-[width,height,transform,box-shadow] duration-300 ease-out' : 'transition-[width,height,transform,box-shadow] duration-300 ease-out'
                                }`}
                              data-testid={`card-vip-${tier}`}
                            >
                              <div
                                className="flex flex-col flex-1"
                              >

                                <CardHeader className="space-y-3 pb-4 relative z-10 min-h-[120px]">
                                  <div className="flex items-center justify-between">
                                    {config.isDiamond ? (
                                      <Diamond className="diamond-sparkle" />
                                    ) : (
                                      <div className={`h-10 w-10 rounded-full ${config.sphereClass}`} />
                                    )}
                                    {isPurchased && (
                                      <Badge variant="default" className="bg-green-600 text-sm">
                                        <Shield className="h-3 w-3 mr-1" />
                                        Активна
                                      </Badge>
                                    )}
                                  </div>
                                  <h3 className="font-bold text-3xl tracking-tight">
                                    {tierData?.displayName || vip.title}
                                  </h3>
                                  {isHovered && (
                                    <p className="text-base text-muted-foreground/90 leading-relaxed">
                                      {tierData?.description || (vip.description ? htmlToText(vip.description) : 'Эксклюзивный доступ к премиум контенту и персональной поддержке')}
                                    </p>
                                  )}
                                </CardHeader>

                                <CardContent className="space-y-4 pb-4 flex-1 relative z-10 min-h-[180px]">
                                  <div className="flex items-baseline gap-2">
                                    <span className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                                      {formatPrice(tierData?.price || vip.price || "0")}
                                    </span>
                                  </div>

                                  {!isHovered ? (
                                    <p className="text-base text-muted-foreground/90 line-clamp-3 leading-relaxed">
                                      {tierData?.description || (vip.description ? htmlToText(vip.description) : 'Эксклюзивный доступ к премиум контенту и персональной поддержке')}
                                    </p>
                                  ) : (
                                    <div className="space-y-2">
                                      <p className="text-base font-semibold text-muted-foreground">Что входит:</p>
                                      {(tierData?.features || []).map((feature: string, idx: number) => (
                                        <div key={idx} className="flex items-start gap-2">
                                          <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                          <span className="text-base">{feature}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </CardContent>

                                <CardFooter className="pt-0 relative z-10">
                                  <Button
                                    className={`w-full relative overflow-hidden backdrop-blur-sm font-semibold shadow-lg transition-all duration-300 group ${isPurchased
                                      ? 'bg-white/5 border-2 border-green-500/30 text-white'
                                      : 'bg-white/5 border-2 border-yellow-500/30 text-white hover:shadow-yellow-500/50'
                                      }`}
                                    size="lg"
                                    disabled={isPurchased}
                                  >
                                    <div className={`absolute inset-0 transition-opacity duration-700 ${isPurchased
                                      ? 'bg-gradient-to-r from-green-600 to-emerald-600 opacity-100'
                                      : 'bg-gradient-to-r from-yellow-500 via-orange-500 to-pink-600 opacity-0 group-hover:opacity-100'
                                      }`} />
                                    <span className="relative flex items-center justify-center">
                                      {isPurchased ? (
                                        <>
                                          <Check className="mr-2 h-4 w-4" />
                                          У вас есть подписка
                                        </>
                                      ) : (
                                        <>
                                          <Crown className="mr-2 h-4 w-4" />
                                          Оформить подписку
                                        </>
                                      )}
                                    </span>
                                  </Button>
                                </CardFooter>
                              </div>
                            </GlassCard>
                          </Link>
                        </div>
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
              <p className="text-base md:text-lg text-muted-foreground md:ml-12">
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
                {/* Mobile: SwipeableCarousel с infinite scroll */}
                <div className="md:hidden">
                  <SwipeableCarousel
                    key={currentVisiblePage}
                    onReachEnd={handleSwipeEnd}
                    onReachStart={handleSwipeStart}
                    currentPageSize={mobileCourses.length}
                    initialIndex={carouselInitialIndex}
                    onActiveIndexChange={(index) => {
                      // Always activate center card to show glow effect
                      const course = mobileCourses[index];
                      if (course) {
                        setActiveMobileCourseId(course.id);
                      }
                    }}
                  >
                    {mobileCourses.map((course, index) => {
                      const isPurchased = purchasedCourseIds.has(course.id);
                      const isFavorited = favoritedCourseIds.has(course.id);
                      const price = parseFloat(course.price || "0");
                      const hasPreviewVideo = !!(course as any).previewVideoUrl;
                      const isActive = activeMobileCourseId === course.id;
                      const shouldPlayVideo = isActive && hasPreviewVideo;

                      const platformQuery = platformQueries[index];
                      const subcategoryIds = platformQuery?.data ?? [];

                      const getPlatforms = () => {
                        if (!subcategoryIds.length || !subcategories || !categories) return [];
                        const matched = subcategories.filter(sub => subcategoryIds.includes(sub.id));
                        const categoryIds = [...new Set(matched.map(sub => sub.categoryId))];
                        return categories.filter(cat => categoryIds.includes(cat.id));
                      };

                      const platforms = getPlatforms();
                      return (
                        <div key={course.id}>
                          <GlassCard
                            variant="default"
                            glowColor="purple"
                            hover={true}
                            isActive={isActive}
                            className="flex flex-col h-full w-full overflow-hidden transition-all duration-300"
                            data-testid={`card-course-${course.id}`}
                          >
                            <div
                              className="flex flex-col flex-1"
                              style={{
                                backfaceVisibility: 'hidden',
                                transform: 'translateZ(0)'
                              }}
                            >
                              {/* Video/Thumbnail Section */}
                              <div
                                className="bg-gradient-to-br from-primary/10 to-primary/5 relative overflow-hidden aspect-video w-full"
                                style={{
                                  backfaceVisibility: 'hidden',
                                  transform: 'translateZ(0)'
                                }}
                              >
                                {/* Thumbnail Image - always visible, hidden only when video preview shows */}
                                {course.thumbnailImage ? (
                                  <img
                                    src={course.thumbnailImage}
                                    alt={course.title}
                                    className={`w-full h-full object-cover absolute inset-0 transition-opacity duration-300 ${isActive && hasPreviewVideo ? 'opacity-0' : 'opacity-100'
                                      }`}
                                    style={{
                                      backfaceVisibility: 'hidden',
                                      transform: 'translateZ(0)',
                                    }}
                                  />
                                ) : (
                                  <div className={`w-full h-full flex items-center justify-center absolute inset-0 transition-opacity duration-300 ${isActive && hasPreviewVideo ? 'opacity-0' : 'opacity-100'
                                    }`}>
                                    <BookOpen className="h-16 w-16 text-primary/40" />
                                  </div>
                                )}

                                {/* Preview Video - controlled by isActive state */}
                                {hasPreviewVideo && (
                                  <>
                                    <div
                                      className={`relative w-full h-full overflow-visible absolute inset-0 transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-0'
                                        }`}
                                      style={{
                                        pointerEvents: 'none',
                                      }}
                                    >
                                      <PreviewVideoPlayer
                                        src={(course as any).previewVideoUrl}
                                        shouldPlay={shouldPlayVideo}
                                      />
                                    </div>

                                    {/* Free lesson button */}
                                    <div className={`absolute bottom-3 left-3 z-10 transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-0'
                                      }`}>
                                      <Button
                                        size="sm"
                                        className="bg-green-600 hover:bg-green-700 text-white shadow-lg"
                                        data-testid={`button-free-lesson-${course.id}`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                        }}
                                      >
                                        <Play className="h-3 w-3 mr-1" />
                                        Вводный урок
                                      </Button>
                                    </div>
                                  </>
                                )}

                                {/* Top right badges and favorite button */}
                                <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                                  {isAuthenticated && !isPurchased && (
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className={`h-8 w-8 rounded-full shadow-lg ${isFavorited
                                        ? 'bg-red-500 hover:bg-red-600 text-white'
                                        : 'bg-white/90 hover:bg-white text-red-500'
                                        }`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleFavorite(course.id, e);
                                      }}
                                      data-testid={`button-favorite-${course.id}`}
                                    >
                                      <Heart className={`h-4 w-4 ${isFavorited ? 'fill-current' : ''}`} />
                                    </Button>
                                  )}
                                  {course.isFree ? (
                                    <Badge className="bg-green-600 text-white shadow-lg">
                                      Бесплатно
                                    </Badge>
                                  ) : isPurchased ? (
                                    <Badge className="bg-blue-600 text-white shadow-lg">
                                      <ShoppingCart className="h-3 w-3 mr-1" />
                                      Куплен
                                    </Badge>
                                  ) : (course.paymentType === 'fantiks_only' || course.paymentType === 'both') ? (
                                    <Badge className="bg-amber-600 text-white shadow-lg font-semibold px-3 py-1.5">
                                      <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                                      Оплата фантиками
                                    </Badge>
                                  ) : null}
                                </div>
                              </div>

                              {/* Content Section */}
                              <CardHeader className="space-y-3 pb-4">
                                <h3
                                  className="font-bold text-2xl group-hover:text-xl line-clamp-2"
                                  data-testid={`text-course-title-${course.id}`}
                                >
                                  {course.title}
                                </h3>

                                {/* Rating and viewing counter */}
                                <div className="flex items-center justify-between gap-2">
                                  <StarRating
                                    rating={Number(course.rating || 0)}
                                    reviewsCount={Number(course.reviewsCount || 0)}
                                    size="sm"
                                  />
                                  <ViewingCounter value={course.reviewsCount} courseId={course.id} />
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  {platforms.map((platform) => (
                                    <Badge key={platform.id} variant="outline" className="text-sm font-medium">
                                      {platform.name}
                                    </Badge>
                                  ))}

                                  {Array.isArray(course.level) && course.level.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                      {Array.from(
                                        new Set(
                                          course.level
                                            .map(id => subcategories.find(sub => sub.id === id))
                                            .filter(Boolean)
                                            .map(sub => sub.name)
                                        )
                                      ).map(levelName => (
                                        <Badge key={levelName} variant="outline" className="text-sm font-medium">
                                          {levelName}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                  {course.year && (
                                    <Badge variant="outline" className="text-sm font-medium">
                                      {course.year}
                                    </Badge>
                                  )}
                                </div>

                                {course.description && (
                                  <p className="text-base text-muted-foreground line-clamp-2 leading-relaxed">
                                    {htmlToText(course.description)}
                                  </p>
                                )}

                                <div className="flex items-center gap-2">
                                  <Avatar className="h-9 w-9 border-2 border-primary/20">
                                    <AvatarImage src={course.authorImage || undefined} />
                                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                      {course.authorName?.[0] || "?"}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex flex-col">
                                    <span className="text-xs text-muted-foreground">Автор</span>
                                    <span className="text-base font-medium">{course.authorName || "Неизвестен"}</span>
                                  </div>
                                </div>
                              </CardHeader>

                              {/* Spacer to push footer to bottom */}
                              <div className="flex-1" />

                              <CardFooter className="flex flex-col gap-3 pt-0">
                                <div className="w-full px-1">
                                  <span className="text-xs text-muted-foreground mb-2 block">Цена</span>
                                  {course.isFree ? (
                                    <span className="text-2xl font-bold text-foreground" data-testid={`text-course-price-${course.id}`}>
                                      Бесплатно
                                    </span>
                                  ) : course.paymentType === 'both' ? (
                                    <div className="flex items-center gap-3">
                                      <div className="flex flex-col">
                                        <span className="text-2xl font-bold text-foreground" data-testid={`text-course-price-${course.id}`}>
                                          {formatPrice(price)} ₽
                                        </span>
                                      </div>
                                      <div className="h-10 w-px bg-gradient-to-b from-transparent via-border to-transparent" />
                                      <div className="flex flex-col">
                                        <span className="text-xl font-semibold text-purple-400" data-testid={`text-course-fantik-price-${course.id}`}>
                                          {course.fantikPrice && parseInt(course.fantikPrice.toString())} 🎫
                                        </span>
                                        <span className="text-xs text-purple-400/70">фантики</span>
                                      </div>
                                    </div>
                                  ) : course.paymentType === 'fantiks_only' && course.fantikPrice ? (
                                    <div className="flex flex-col">
                                      <span className="text-2xl font-semibold text-purple-400" data-testid={`text-course-fantik-price-${course.id}`}>
                                        {parseInt(course.fantikPrice.toString())} 🎫
                                      </span>
                                      <span className="text-sm text-purple-400/70">фантики</span>
                                    </div>
                                  ) : (
                                    <span className="text-2xl font-bold text-foreground" data-testid={`text-course-price-${course.id}`}>
                                      {formatPrice(price)} ₽
                                    </span>
                                  )}
                                </div>
                                <Button
                                  className={`w-full relative overflow-hidden backdrop-blur-sm font-semibold shadow-lg transition-all duration-300 group ${isPurchased
                                    ? 'bg-white/5 border-2 border-blue-500/30 text-white hover:shadow-blue-500/50'
                                    : 'bg-white/5 border-2 border-purple-500/30 text-white hover:shadow-purple-500/50'
                                    }`}
                                  size="lg"
                                  data-testid={`button-view-course-${course.id}`}
                                  onClick={() => setLocation(`/course/${course.id}`)}
                                >
                                  <div className={`absolute inset-0 transition-opacity duration-700 ${isPurchased
                                    ? 'bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 opacity-0 group-hover:opacity-100'
                                    : 'bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 opacity-0 group-hover:opacity-100'
                                    }`} />
                                  <span className="relative flex items-center justify-center">
                                    {isPurchased ? (
                                      <>
                                        <ShoppingCart className="mr-2 h-4 w-4" />
                                        Открыть курс
                                      </>
                                    ) : (
                                      <>
                                        <ArrowRight className="mr-2 h-4 w-4" />
                                        Подробнее
                                      </>
                                    )}
                                  </span>
                                </Button>
                              </CardFooter>
                            </div>
                          </GlassCard>
                        </div>
                      );
                    })}
                  </SwipeableCarousel>
                </div>

                {/* Desktop: Original Grid - UNTOUCHED */}
                <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch" style={{ gridAutoRows: '1fr' }}>
                  {paginatedCourses.map((course, index) => {
                    const isPurchased = purchasedCourseIds.has(course.id);
                    const isFavorited = favoritedCourseIds.has(course.id);
                    const price = parseFloat(course.price || "0");
                    const hasPreviewVideo = !!(course as any).previewVideoUrl;
                    const shouldPlayVideo = hoveredCourseId === course.id && hasPreviewVideo;
                    const isAdmin = user && user.isAdmin

                    const sectionQuery = sectionQueries[index];
                    console.log(sectionQuery.data)
                    const sections = sectionQuery.data ?? [];

                    console.log(course.title, sections)

                    // Данные из useQueries
                    const platformQuery = platformQueries[index];
                    const subcategoryIds = platformQuery?.data ?? [];

                    // ←←← ЗАМЕНИ useMemo НА ОБЫЧНУЮ ФУНКЦИЮ
                    const getPlatforms = () => {
                      if (!subcategoryIds.length || !subcategories || !categories) return [];
                      const matched = subcategories.filter(sub => subcategoryIds.includes(sub.id));
                      const categoryIds = [...new Set(matched.map(sub => sub.categoryId))];
                      return categories.filter(cat => categoryIds.includes(cat.id));
                    };

                    const platforms = getPlatforms(); // ← просто вызываем

                    return (
                      <div
                        key={course.id}
                        className="relative h-full group min-h-[500px]"
                        onMouseEnter={() => {
                          if (hasPreviewVideo) {
                            setHoveredCourseId(course.id);
                          }
                        }}
                        onMouseLeave={() => {
                          if (hasPreviewVideo) {
                            setHoveredCourseId(null);
                          }
                        }}
                      >
                        <GlassCard
                          variant="default"
                          glowColor="purple"
                          hover={true}
                          className="overflow-visible flex flex-col h-full group-hover:md:absolute group-hover:md:top-0 group-hover:md:left-0 group-hover:md:w-[420px] group-hover:md:z-40 group-hover:shadow-2xl"
                          data-testid={`card-course-${course.id}`}
                        >
                          <div
                            className="flex flex-col flex-1"
                            style={{
                              backfaceVisibility: 'hidden',
                              transform: 'translateZ(0)'
                            }}
                          >
                            {/* Video/Thumbnail Section */}
                            <div
                              className="bg-gradient-to-br from-primary/10 to-primary/5 relative overflow-hidden aspect-video w-full group-hover:md:h-[236px] group-hover:md:aspect-auto"
                              style={{
                                backfaceVisibility: 'hidden',
                                transform: 'translateZ(0)'
                              }}
                            >
                              {isAdmin &&
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="!absolute top-3 left-3 !z-[1500] 
             bg-white/40 
             shadow-lg rounded-full"
                                  onClick={() => {
                                    window.location.replace(`/admin/courses/${course.id}/edit?subcategoryId=null&categiryId=null&parentId=null&fromStore`)
                                  }}
                                >
                                  <Edit2 className="h-4 w-4" strokeWidth={2.2} />
                                </Button>
                              }

                              {/* Thumbnail Image - always visible, hidden only when video preview shows */}
                              {course.thumbnailImage ? (
                                <img
                                  src={course.thumbnailImage}
                                  alt={course.title}
                                  className={`w-full h-full object-cover absolute inset-0 ${hasPreviewVideo ? 'group-hover:opacity-0' : ''
                                    }`}
                                  style={{
                                    backfaceVisibility: 'hidden',
                                    transform: 'translateZ(0)',
                                    transition: 'opacity 20ms linear',
                                  }}
                                />
                              ) : (
                                <div className={`w-full h-full flex items-center justify-center absolute inset-0 ${hasPreviewVideo ? 'group-hover:opacity-0' : ''
                                  }`}>
                                  <BookOpen className="h-16 w-16 text-primary/40 group-hover:text-primary/60" />
                                </div>
                              )}

                              {/* Preview Video - CSS hover controlled visibility, React controls playback */}
                              {hasPreviewVideo && (
                                <>
                                  <div
                                    className="relative w-full h-full overflow-visible absolute inset-0 opacity-0 group-hover:opacity-100"
                                    style={{
                                      transition: 'opacity 20ms linear',
                                      pointerEvents: 'none',
                                    }}
                                  >
                                    <PreviewVideoPlayer
                                      src={(course as any).previewVideoUrl}
                                      shouldPlay={shouldPlayVideo}
                                    />
                                  </div>

                                  {/* Free lesson button - outside overlay to remain clickable */}
                                  <div className="absolute bottom-3 left-3 z-10 opacity-0 group-hover:opacity-100" style={{ transition: 'opacity 20ms linear' }}>
                                    <Button
                                      size="sm"
                                      className="bg-green-600 hover:bg-green-700 text-white shadow-lg"
                                      data-testid={`button-free-lesson-${course.id}`}
                                    >
                                      <Play className="h-3 w-3 mr-1" />
                                      БЕСПЛАТНЫЙ вводный урок
                                    </Button>
                                  </div>
                                </>
                              )}



                              {/* Top right badges and favorite button */}
                              <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                                {isAuthenticated && !isPurchased && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className={`h-8 w-8 rounded-full shadow-lg ${isFavorited
                                      ? 'bg-red-500 hover:bg-red-600 text-white'
                                      : 'bg-white/90 hover:bg-white text-red-500'
                                      }`}
                                    onClick={(e) => handleToggleFavorite(course.id, e)}
                                    data-testid={`button-favorite-${course.id}`}
                                  >
                                    <Heart className={`h-4 w-4 ${isFavorited ? 'fill-current' : ''}`} />
                                  </Button>
                                )}
                                {course.isFree ? (
                                  <Badge className="bg-green-600 text-white shadow-lg">
                                    Бесплатно
                                  </Badge>
                                ) : isPurchased ? (
                                  <Badge className="bg-blue-600 text-white shadow-lg">
                                    <ShoppingCart className="h-3 w-3 mr-1" />
                                    Куплен
                                  </Badge>
                                ) : (course.paymentType === 'fantiks_only' || course.paymentType === 'both') ? (
                                  <Badge className="bg-amber-600 text-white shadow-lg font-semibold px-3 py-1.5">
                                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                                    Оплата фантиками
                                  </Badge>
                                ) : null}
                              </div>
                            </div>

                            {/* Content Section */}
                            <CardHeader className="space-y-3 pb-4">
                              <h3
                                className="font-bold text-2xl group-hover:text-xl line-clamp-2"
                                data-testid={`text-course-title-${course.id}`}
                              >
                                <span>{course.title}</span>
                              </h3>

                              {/* Rating and viewing counter */}
                              <div className="flex items-center justify-between gap-2 flex_wrap">
                                <StarRating
                                  rating={Number(course.rating || 0)}
                                  reviewsCount={Number(course.reviewsCount || 0)}
                                  size="sm"
                                />
                                <ViewingCounter value={course.reviewsCount} courseId={course.id} />
                                {isAdmin && (
                                  <div className="flex items-center gap-2 text-sm font-medium flex-wrap">
                                    {sections.some(section =>
                                      section.lessons?.some(lesson => lesson.processingStatus === 'failed')
                                    ) && <span className="text-red-500" title="Есть уроки с ошибкой">Failed</span>}

                                    {sections.some(section =>
                                      section.lessons?.some(lesson => lesson.processingStatus === 'processing')
                                    ) && <span className="text-purple-500" title="Уроки в очереди">Processing</span>}

                                    {sections.some(section =>
                                      section.lessons?.some(lesson => lesson.processingStatus === 'queued')
                                    ) && <span className="text-orange-500" title="Уроки в очереди">In Queue</span>}

                                    {sections.length > 0 &&
                                      sections.some(section =>
                                        section.lessons?.some(lesson => lesson.processingStatus === 'ready')
                                      ) &&
                                      !sections.some(section =>
                                        section.lessons?.some(lesson =>
                                          ['queued', 'processing', 'uploading', 'failed'].includes(lesson.processingStatus)
                                        )
                                      ) && (
                                        <span className="text-green-500 font-medium" title="Все загруженные уроки готовы">
                                          Ready
                                        </span>
                                      )}
                                  </div>
                                )}
                              </div>

                              <div className="flex flex-wrap gap-2">
                                {platforms.map((platform) => (
                                  <Badge key={platform.id} variant="outline" className="text-sm font-medium">
                                    {platform.name}
                                  </Badge>
                                ))}

                                {/* Уровни — показываем уникальные по имени */}
                                {(() => {
                                  if (!Array.isArray(course.level) || course.level.length === 0) return null;

                                  // Находим все подкатегории по ID из course.level
                                  const selectedSubcategories = course.level
                                    .map(levelId => subcategories.find(sub => sub.id === levelId))
                                    .filter(Boolean);

                                  // Группируем по имени и оставляем только уникальные
                                  const uniqueLevelNames = Array.from(
                                    new Set(selectedSubcategories.map(sub => sub.name))
                                  );

                                  return uniqueLevelNames.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                      {uniqueLevelNames.map(name => (
                                        <Badge key={name} variant="outline" className="text-sm font-medium">
                                          {name}
                                        </Badge>
                                      ))}
                                    </div>
                                  ) : null;
                                })()}

                                {/* Год */}
                                {course.year && (
                                  <Badge variant="outline" className="text-sm font-medium">
                                    {course.year}
                                  </Badge>
                                )}
                              </div>

                              {course.description && (
                                <p className="text-base text-muted-foreground line-clamp-2 leading-relaxed">
                                  <div
                                    className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground"
                                    data-testid="text-course-description"
                                    dangerouslySetInnerHTML={{ __html: course.description || '' }}
                                  />
                                </p>
                              )}

                              <div className="flex items-center gap-2">
                                <Avatar className="h-9 w-9 border-2 border-primary/20">
                                  <AvatarImage src={course.authorImage || undefined} />
                                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                    {course.authorName?.[0] || "?"}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                  <span className="text-xs text-muted-foreground">Автор</span>
                                  <span className="text-base font-medium">{course.authorName || "Неизвестен"}</span>
                                </div>
                              </div>
                            </CardHeader>

                            {/* Spacer to push footer to bottom */}
                            <div className="flex-1" />

                            <CardFooter className="flex flex-col gap-3 pt-0">
                              <div className="w-full px-1">
                                <span className="text-xs text-muted-foreground mb-2 block">Цена</span>
                                {course.isFree ? (
                                  <span className="text-2xl font-bold text-foreground" data-testid={`text-course-price-${course.id}`}>
                                    Бесплатно
                                  </span>
                                ) : course.paymentType === 'both' ? (
                                  <div className="flex items-center gap-3">
                                    <div className="flex flex-col">
                                      <span className="text-2xl font-bold text-foreground" data-testid={`text-course-price-${course.id}`}>
                                        {formatPrice(price)} ₽
                                      </span>
                                    </div>
                                    <div className="h-10 w-px bg-gradient-to-b from-transparent via-border to-transparent" />
                                    <div className="flex flex-col">
                                      <span className="text-xl font-semibold text-purple-400" data-testid={`text-course-fantik-price-${course.id}`}>
                                        {course.fantikPrice && parseInt(course.fantikPrice.toString())} 🎫
                                      </span>
                                      <span className="text-xs text-purple-400/70">фантики</span>
                                    </div>
                                  </div>
                                ) : course.paymentType === 'fantiks_only' && course.fantikPrice ? (
                                  <div className="flex flex-col">
                                    <span className="text-2xl font-semibold text-purple-400" data-testid={`text-course-fantik-price-${course.id}`}>
                                      {parseInt(course.fantikPrice.toString())} 🎫
                                    </span>
                                    <span className="text-sm text-purple-400/70">фантики</span>
                                  </div>
                                ) : (
                                  <span className="text-2xl font-bold text-foreground" data-testid={`text-course-price-${course.id}`}>
                                    {formatPrice(price)} ₽
                                  </span>
                                )}
                              </div>
                              <Button
                                className={`w-full relative overflow-hidden backdrop-blur-sm font-semibold shadow-lg transition-all duration-300 group ${isPurchased
                                  ? 'bg-white/5 border-2 border-blue-500/30 text-white hover:shadow-blue-500/50'
                                  : 'bg-white/5 border-2 border-purple-500/30 text-white hover:shadow-purple-500/50'
                                  }`}
                                size="lg"
                                data-testid={`button-view-course-${course.id}`}
                                onClick={() => setLocation(`/course/${course.id}`)}
                              >
                                <div className={`absolute inset-0 transition-opacity duration-700 ${isPurchased
                                  ? 'bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 opacity-0 group-hover:opacity-100'
                                  : 'bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 opacity-0 group-hover:opacity-100'
                                  }`} />
                                <span className="relative flex items-center justify-center">
                                  {isPurchased ? (
                                    <>
                                      <ShoppingCart className="mr-2 h-4 w-4" />
                                      Открыть курс
                                    </>
                                  ) : (
                                    <>
                                      <ArrowRight className="mr-2 h-4 w-4" />
                                      Подробнее
                                    </>
                                  )}
                                </span>
                              </Button>
                            </CardFooter>
                          </div>
                        </GlassCard>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Pagination - интерактивный */}
                <div className="hidden md:block">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalCourses}
                    itemLabel="курсов"
                    onPageChange={setCurrentPage}
                  />
                </div>

                {/* Mobile Pagination - интерактивный */}
                <div className="block md:hidden">
                  <Pagination
                    currentPage={currentVisiblePage}
                    totalPages={totalPages}
                    totalItems={totalCourses}
                    itemLabel="курсов"
                    onPageChange={handleMobilePageChange}
                  />
                </div>

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
                        <div className="absolute inset-0 bg-gradient-to-l from-background/80 via-background/40 to-transparent md:hidden" />
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
