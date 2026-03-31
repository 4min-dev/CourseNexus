import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { BookOpen, ChevronLeft, Sparkles, Check, Search, Info, Crown, Star, Eye, Users, Heart, Calendar, TrendingUp } from "lucide-react";
import { Link } from "wouter";
import type { Category, Course, Subcategory } from "@shared/schema";
import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import { Footer } from "@/components/footer";
import { useToast } from "@/hooks/use-toast";
import {  queryClient } from "@/lib/queryClient";
import { Pagination } from "@/components/pagination";
import { StarRating } from "@/components/star-rating";
import { TagsMarquee } from "@/components/ui/tags-marquee";
import { debugLog } from "@/lib/debug";

const COURSES_PER_PAGE = 12;

interface VipPackage {
  id: string;
  userId: string;
  tier: string;
  currentYearLimit: number;
  previousYearsLimit: number;
  isActivated: boolean;
  purchaseDate: Date;
}

export default function VipCourseSelect() {
  const [, params] = useRoute("/library/vip-select/:packageId");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const packageId = params?.packageId;

  const [selectedCurrentYear, setSelectedCurrentYear] = useState<Set<string>>(new Set());
  const [selectedPreviousYears, setSelectedPreviousYears] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<{
    platform?: string;
    levels?: string[];
    year?: number;
    author?: string;
    minRating?: number;
  }>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [currentYearPage, setCurrentYearPage] = useState(1);
  const [previousYearsPage, setPreviousYearsPage] = useState(1);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showCourseDetails, setShowCourseDetails] = useState(false);

  // Load course rating and reviews when modal opens
  const { data: courseRating } = useQuery<{ averageRating: number; totalReviews: number }>({
    queryKey: ["/api/courses", selectedCourse?.id, "rating"],
    queryFn: async () => {
      const res = await fetch(`/api/courses/${selectedCourse?.id}/rating`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch rating");
      return res.json();
    },
    enabled: !!selectedCourse,
  });

  const { data: courseReviews } = useQuery<Array<{
    id: string;
    rating: number;
    comment: string | null;
    createdAt: Date;
    userId: string;
    user?: { username: string; email: string };
  }>>({
    queryKey: ["/api/courses", selectedCourse?.id, "reviews"],
    queryFn: async () => {
      const res = await fetch(`/api/courses/${selectedCourse?.id}/reviews`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch reviews");
      return res.json();
    },
    enabled: !!selectedCourse,
  });

  // Filter reviews to only include those with valid ratings
  const validReviews = (courseReviews ?? []).filter(r => typeof r.rating === 'number' && r.rating > 0);

  // Load VIP package details
  const { data: vipPackage, isLoading: packageLoading } = useQuery<VipPackage>({
    queryKey: ["/api/vip-packages", packageId],
    queryFn: async () => {
      const res = await fetch(`/api/vip-packages/${packageId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load VIP package");
      return res.json();
    },
    enabled: !!packageId,
  });

  // Load favorites
  const { data: favorites } = useQuery<Array<{ id: string; courseId: string; course: Course }>>({
    queryKey: ["/api/favorites"],
  });

  const currentYear = new Date().getFullYear();

  const { data: currentYearData, isLoading: currentYearLoading } = useQuery<{ courses: Course[]; total: number }>({
    queryKey: ["/api/courses", "vip-selection", "current-year", selectedCategories, searchQuery, currentYearPage],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategories.platform) params.append("platform", selectedCategories.platform);
      if (selectedCategories.levels) params.append("level", selectedCategories.levels.join(','));
      if (selectedCategories.author) params.append("author", selectedCategories.author);
      if (selectedCategories.minRating) params.append("minRating", selectedCategories.minRating.toString());
      if (searchQuery) params.append("search", searchQuery);

      params.append("year", currentYear.toString());
      params.append("excludeVipPackages", "true");
      params.append("excludePurchased", "true");
      params.append("limit", COURSES_PER_PAGE.toString());
      params.append("offset", ((currentYearPage - 1) * COURSES_PER_PAGE).toString());

      const url = `/api/courses?${params.toString()}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load courses");
      const courses = await res.json();
      const total = parseInt(res.headers.get("X-Total-Count") || "0", 10);
      return { courses, total };
    },
  });

  const { data: previousYearsData, isLoading: previousYearsLoading } = useQuery<{ courses: Course[]; total: number }>({
    queryKey: ["/api/courses", "vip-selection", "previous-years", selectedCategories, searchQuery, previousYearsPage],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategories.platform) params.append("platform", selectedCategories.platform);
      if (selectedCategories.levels) params.append("level", selectedCategories.levels.join(','));
      if (selectedCategories.author) params.append("author", selectedCategories.author);
      if (selectedCategories.minRating) params.append("minRating", selectedCategories.minRating.toString());
      if (searchQuery) params.append("search", searchQuery);

      params.append("excludeCurrentYear", currentYear.toString());
      params.append("excludeVipPackages", "true");
      params.append("excludePurchased", "true");
      params.append("limit", COURSES_PER_PAGE.toString());
      params.append("offset", ((previousYearsPage - 1) * COURSES_PER_PAGE).toString());

      const url = `/api/courses?${params.toString()}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load courses");
      const courses = await res.json();
      const total = parseInt(res.headers.get("X-Total-Count") || "0", 10);
      return { courses, total };
    },
  });

  const coursesLoading = currentYearLoading || previousYearsLoading;

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: subcategories } = useQuery<Subcategory[]>({
    queryKey: ["/api/subcategories"]
  })

  const favoriteIds = new Set(favorites?.map(f => f.courseId) || []);

  const paginatedCurrentYearCourses = (currentYearData?.courses || [])
    .sort((a, b) => {
      const aIsFav = favoriteIds.has(a.id) ? 0 : 1;
      const bIsFav = favoriteIds.has(b.id) ? 0 : 1;
      return aIsFav - bIsFav;
    });

  const paginatedPreviousYearsCourses = (previousYearsData?.courses || [])
    .sort((a, b) => {
      const aIsFav = favoriteIds.has(a.id) ? 0 : 1;
      const bIsFav = favoriteIds.has(b.id) ? 0 : 1;
      return aIsFav - bIsFav;
    });

  const currentYearTotal = currentYearData?.total || 0;
  const currentYearTotalPages = Math.ceil(currentYearTotal / COURSES_PER_PAGE);

  const previousYearsTotal = previousYearsData?.total || 0;
  const previousYearsTotalPages = Math.ceil(previousYearsTotal / COURSES_PER_PAGE);

  useEffect(() => {
    setCurrentYearPage(1);
    setPreviousYearsPage(1);
  }, [selectedCategories, searchQuery]);

  const activateMutation = useMutation({
    mutationFn: async (courseIds: string[]) => {
      const res = await fetch(`/api/vip-packages/${packageId}/activate`, {
        method: "POST",
        body: JSON.stringify({ courseIds }),
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to activate VIP package");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/library"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vip-packages"] });
      toast({
        title: "Курсы успешно активированы!",
        description: "Выбранные курсы добавлены в вашу библиотеку",
      });
      setLocation("/library");
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка активации",
        description: error.message || "Не удалось активировать VIP пакет",
        variant: "destructive",
      });
    },
  });

  const handleToggleCourse = (courseId: string, isCurrentYear: boolean) => {
    if (isCurrentYear) {
      setSelectedCurrentYear(prev => {
        const newSet = new Set(prev);
        if (newSet.has(courseId)) {
          newSet.delete(courseId);
        } else {
          if (vipPackage && newSet.size < vipPackage.currentYearLimit) {
            newSet.add(courseId);
          }
        }
        return newSet;
      });
    } else {
      setSelectedPreviousYears(prev => {
        const newSet = new Set(prev);
        if (newSet.has(courseId)) {
          newSet.delete(courseId);
        } else {
          if (vipPackage && newSet.size < vipPackage.previousYearsLimit) {
            newSet.add(courseId);
          }
        }
        return newSet;
      });
    }
  };

  const handleActivate = () => {
    const allSelected = [...Array.from(selectedCurrentYear), ...Array.from(selectedPreviousYears)];
    activateMutation.mutate(allSelected);
  };

  const handleShowDetails = (course: Course, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCourse(course);
    setShowCourseDetails(true);
  };

  // subcategoryIds are already included on Course from `/api/courses` (`Course.subcategoryIds`).


  const canActivate =
    vipPackage &&
    selectedCurrentYear.size === vipPackage.currentYearLimit &&
    selectedPreviousYears.size === vipPackage.previousYearsLimit;

  const getTierName = (tier: string) => {
    const names: Record<string, string> = {
      bronze: "BRONZE VIP",
      silver: "SILVER VIP",
      gold: "GOLD VIP",
      diamond: "DIAMOND VIP",
    };
    return names[tier] || tier;
  };

  const getTierGradient = (tier: string) => {
    const gradients: Record<string, string> = {
      bronze: "from-orange-500/20 via-orange-400/20 to-amber-500/20",
      silver: "from-slate-400/20 via-gray-300/20 to-slate-500/20",
      gold: "from-yellow-500/20 via-amber-400/20 to-yellow-600/20",
      diamond: "from-cyan-500/20 via-blue-400/20 to-purple-500/20",
    };
    return gradients[tier] || "from-primary/20 to-primary/10";
  };

  const getTierBorderGlow = (tier: string) => {
    const glows: Record<string, string> = {
      bronze: "shadow-orange-500/50",
      silver: "shadow-slate-400/50",
      gold: "shadow-yellow-500/50",
      diamond: "shadow-cyan-500/50",
    };
    return glows[tier] || "shadow-primary/50";
  };

  const getTierIcon = (tier: string) => {
    const icons: Record<string, JSX.Element> = {
      bronze: <Crown className="h-8 w-8 text-orange-500" />,
      silver: <Crown className="h-8 w-8 text-slate-400" />,
      gold: <Crown className="h-8 w-8 text-yellow-500" />,
      diamond: <Crown className="h-8 w-8 text-cyan-500" />,
    };
    return icons[tier] || <Sparkles className="h-8 w-8 text-primary" />;
  };

  if (packageLoading) {
    return (
      <div className="min-h-screen bg-background relative">
        <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        <div className="flex justify-center items-center h-96">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Загрузка VIP пакета...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!vipPackage) {
    return (
      <div className="min-h-screen bg-background relative">
        <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        <div className="flex justify-center items-center h-96">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold">VIP пакет не найден</h2>
            <Link href="/library">
              <Button data-testid="button-back-to-library">Вернуться в библиотеку</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      <Header
        onSearchChange={setSearchQuery}
        onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        onResetFilters={() => {
          setSelectedCategories({});
          setSearchQuery("");
        }}
      />

      <div className="relative flex">
        <Sidebar
          selectedCategories={selectedCategories}
          onCategoryChange={setSelectedCategories}
          isOpen={sidebarOpen}
          showPriceFilter={false}
          catalogPath="#"
          hideVipAndFavorites={true}
        />

        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="flex-1 p-3 md:p-6 max-md:overflow-x-hidden">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header with back button */}
            <div className="flex items-center gap-4">
              <Link href="/library">
                <Button variant="ghost" size="icon" data-testid="button-back">
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex-1">
                <h1 className="text-3xl font-bold">Выберите курсы</h1>
                <p className="text-muted-foreground">
                  {getTierName(vipPackage.tier)} пакет
                </p>
              </div>
            </div>

            {/* Instructions Card */}
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-primary/10 p-2">
                    <Info className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2">Как пользоваться разделом</h3>
                    <div className="space-y-3 text-sm text-muted-foreground">
                      <div className="flex gap-2">
                        <span className="font-semibold text-primary min-w-[20px]">1.</span>
                        <p>Выберите курсы из доступного каталога — нажмите на карточку курса для добавления в выборку</p>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-semibold text-primary min-w-[20px]">2.</span>
                        <p>Используйте фильтры слева для поиска по платформе, уровню, году или автору курса</p>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-semibold text-primary min-w-[20px]">3.</span>
                        <p>Вы можете выбрать до <strong>{vipPackage.currentYearLimit}</strong> курсов {currentYear} года и до <strong>{vipPackage.previousYearsLimit}</strong> курсов предыдущих лет</p>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-semibold text-primary min-w-[20px]">4.</span>
                        <p>После выбора всех нужных курсов нажмите кнопку "Активировать" — курсы будут добавлены в вашу библиотеку</p>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-semibold text-red-500 min-w-[20px]">💡</span>
                        <p className="text-foreground"><strong>Совет:</strong> Обратите внимание на раздел "Избранные курсы" — там собраны курсы, которые вы ранее добавили в избранное</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Premium VIP Package Card */}
            <Card className={`bg-gradient-to-br ${getTierGradient(vipPackage.tier)} border-2 shadow-2xl ${getTierBorderGlow(vipPackage.tier)} animate-in fade-in duration-500 overflow-hidden`}>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {getTierIcon(vipPackage.tier)}
                    <div className="absolute inset-0 blur-xl opacity-50">{getTierIcon(vipPackage.tier)}</div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold">{getTierName(vipPackage.tier)}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Куплен: {new Date(vipPackage.purchaseDate).toLocaleDateString("ru-RU")}</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Progress Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Current Year */}
                  <div className="space-y-3 p-4 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        <span className="font-semibold">Курсы {currentYear} года</span>
                      </div>
                      <Badge variant="secondary" className="font-bold" data-testid="badge-current-year-progress">
                        {selectedCurrentYear.size} / {vipPackage.currentYearLimit}
                      </Badge>
                    </div>
                    <Progress
                      value={(selectedCurrentYear.size / vipPackage.currentYearLimit) * 100}
                      className="h-3"
                    />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {vipPackage.currentYearLimit - selectedCurrentYear.size > 0
                          ? `Осталось ${vipPackage.currentYearLimit - selectedCurrentYear.size}`
                          : 'Все выбраны'}
                      </span>
                      {selectedCurrentYear.size === vipPackage.currentYearLimit && (
                        <Badge className="gap-1.5 bg-green-600 hover:bg-green-700" data-testid="badge-current-year-limit-reached">
                          <Check className="h-3.5 w-3.5" />
                          Готово
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Previous Years */}
                  <div className="space-y-3 p-4 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-primary" />
                        <span className="font-semibold">Курсы предыдущих лет</span>
                      </div>
                      <Badge variant="secondary" className="font-bold" data-testid="badge-previous-years-progress">
                        {selectedPreviousYears.size} / {vipPackage.previousYearsLimit}
                      </Badge>
                    </div>
                    <Progress
                      value={(selectedPreviousYears.size / vipPackage.previousYearsLimit) * 100}
                      className="h-3"
                    />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {vipPackage.previousYearsLimit - selectedPreviousYears.size > 0
                          ? `Осталось ${vipPackage.previousYearsLimit - selectedPreviousYears.size}`
                          : 'Все выбраны'}
                      </span>
                      {selectedPreviousYears.size === vipPackage.previousYearsLimit && (
                        <Badge className="gap-1.5 bg-green-600 hover:bg-green-700" data-testid="badge-previous-years-limit-reached">
                          <Check className="h-3.5 w-3.5" />
                          Готово
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Activate Button */}
                <Button
                  onClick={handleActivate}
                  disabled={!canActivate || activateMutation.isPending}
                  className="w-full relative overflow-hidden backdrop-blur-sm bg-white/5 border-2 border-yellow-500/30 text-white shadow-lg hover:shadow-yellow-500/50 transition-all duration-300 font-semibold group text-lg h-14"
                  size="lg"
                  data-testid="button-activate-package"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 via-orange-500 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                  <span className="relative flex items-center justify-center gap-2">
                    <Crown className="h-5 w-5" />
                    {activateMutation.isPending
                      ? "Активация..."
                      : canActivate
                        ? `Активировать ${selectedCurrentYear.size + selectedPreviousYears.size} курсов`
                        : `Выбрано ${selectedCurrentYear.size + selectedPreviousYears.size} из ${vipPackage.currentYearLimit + vipPackage.previousYearsLimit}`
                    }
                  </span>
                </Button>
              </CardContent>
            </Card>

            {/* Premium Search Bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Поиск курсов по названию, автору, описанию..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 text-lg border-2 focus:border-primary transition-all duration-300"
                data-testid="input-search"
              />
            </div>

            {coursesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <Skeleton className="aspect-video w-full" />
                    <CardHeader>
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-1/2 mt-2" />
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : (
              <>


                {currentYearTotal > 0 && (
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                      <Sparkles className="h-6 w-6 text-primary" />
                      Курсы {currentYear} года
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {paginatedCurrentYearCourses.map((course, index) => {
                        const isSelected = selectedCurrentYear.has(course.id);
                        const isDisabled = !isSelected && selectedCurrentYear.size >= vipPackage.currentYearLimit;

                        const subcategoryIds = course.subcategoryIds ?? [];

                        const getPlatforms = () => {
                          if (!subcategoryIds.length || !subcategories || !categories) return [];
                          const matched = subcategories.filter(sub => subcategoryIds.includes(sub.id));
                          const categoryIds = [...new Set(matched.map(sub => sub.categoryId))];
                          return categories.filter(cat => categoryIds.includes(cat.id));
                        };

                        const platforms = getPlatforms()

                        const isFavorite = favoriteIds.has(course.id);

                        return (
                          <Card
                            key={course.id}
                            className={`group cursor-pointer transition-all duration-300 overflow-hidden flex flex-col ${isSelected
                              ? isFavorite
                                ? "border-red-500 border-2 shadow-2xl shadow-red-500/50 scale-105 ring-4 ring-red-500/20"
                                : "border-primary border-2 shadow-2xl shadow-primary/50 scale-105 ring-4 ring-primary/20"
                              : isDisabled
                                ? "opacity-40 cursor-not-allowed grayscale"
                                : isFavorite
                                  ? "border-red-500/30 hover:border-red-500 hover:shadow-xl hover:scale-105 hover:-translate-y-1"
                                  : "hover:border-primary/50 hover:shadow-xl hover:scale-105 hover:-translate-y-1"
                              }`}
                            onClick={() => !isDisabled && handleToggleCourse(course.id, true)}
                            data-testid={`card-course-${course.id}`}
                          >
                            <div className="bg-gradient-to-br from-primary/10 to-primary/5 relative overflow-hidden w-full min-h-[138px]">
                              {course.thumbnailImage ? (
                                <img
                                  src={course.thumbnailImage}
                                  alt={course.title}
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                                  <BookOpen className="h-16 w-16 text-primary/40" />
                                </div>
                              )}

                              {isFavorite && (
                                <div className="absolute top-2 left-2 bg-red-500 text-white rounded-full p-1.5 shadow-lg">
                                  <Heart className="h-4 w-4 fill-current" />
                                </div>
                              )}

                              {isSelected && (
                                <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-2 shadow-lg animate-in zoom-in duration-300">
                                  <Check className="h-5 w-5" />
                                </div>
                              )}


                            </div>

                            <CardHeader className="flex flex-col space-y-3 h-full">
                              <h3 className="font-bold line-clamp-2 text-lg group-hover:text-primary transition-colors">
                                {course.title}
                              </h3>

                              {/* Rating - Always reserve space */}
                                {course.reviewsCount > 0 && (
                                  <div className="min-h-[24px] flex items-center gap-2">

                                    <StarRating
                                      rating={Number(course.rating || 0)}
                                      reviewsCount={Number(course.reviewsCount)}
                                      size="sm"
                                    />
                                  </div>

                                )}

                              {(() => {
                                const courseSubcategoryIds = course.subcategoryIds ?? [];
                                const selectedSubcategories = subcategories?.filter(sub =>
                                  courseSubcategoryIds.includes(sub.id) && sub.isActive
                                ) ?? [];
                                const parentCategories = categories?.filter(cat =>
                                  course.level?.includes(cat.id) &&
                                  cat.isActive &&
                                  !selectedSubcategories.some(selectedSub => selectedSub.categoryId === cat.id)
                                ) ?? [];
                                parentCategories.forEach(parent => selectedSubcategories.push(parent as any));
                                const categoriesWithoutSub = categories?.filter((cat) => course.level?.includes(cat.id) && cat.isActive) ?? [];

                                const tagItems: { id?: string; name: string }[] = [];
                                platforms.forEach(p => tagItems.push({ id: p.id, name: p.name }));
                                const subcats = selectedSubcategories && selectedSubcategories.length > 0
                                  ? selectedSubcategories
                                  : categoriesWithoutSub || [];
                                subcats.forEach(s => tagItems.push({ id: s.id, name: s.name }));
                                if (course.year) tagItems.push({ name: String(course.year) });
                                return tagItems.length > 0 ? (
                                  <TagsMarquee
                                    items={tagItems}
                                    repeatCount={2}
                                    className="h-6 my-0"
                                  />
                                ) : null;
                              })()}

                              {course.description && (
                                <div
                                  className="prose prose-sm dark:prose-invert max-w-none text-sm text-muted-foreground line-clamp-4 leading-relaxed"
                                  dangerouslySetInnerHTML={{ __html: course.description || '' }}
                                />
                              )}


                              <div className="!mt-auto">
                                {/* Details Button */}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full mb-3"
                                  onClick={(e) => handleShowDetails(course, e)}
                                  data-testid={`button-info-${course.id}`}
                                >
                                  <Info className="h-4 w-4 mr-1" />
                                  Подробнее
                                </Button>

                                {/* Selection Status */}
                                <div>
                                  {isSelected ? (
                                    <div className="flex items-center gap-2 text-primary font-semibold">
                                      <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                                      Курс выбран
                                    </div>
                                  ) : isDisabled ? (
                                    <div className="text-sm text-muted-foreground">
                                      Лимит выбора достигнут
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2 text-muted-foreground group-hover:text-primary transition-colors">
                                      <div className="h-2 w-2 rounded-full border-2 border-current" />
                                      Нажмите для выбора
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardHeader>
                          </Card>
                        );
                      })}
                    </div>

                    <Pagination
                      currentPage={currentYearPage}
                      totalPages={currentYearTotalPages}
                      totalItems={currentYearTotal}
                      itemLabel="курсов"
                      onPageChange={setCurrentYearPage}
                    />
                  </div>
                )}

                {previousYearsTotal > 0 && (
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                      <BookOpen className="h-6 w-6 text-primary" />
                      Курсы предыдущих лет
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {paginatedPreviousYearsCourses.map((course, index) => {
                        const isSelected = selectedPreviousYears.has(course.id);
                        const isDisabled = !isSelected && selectedPreviousYears.size >= vipPackage.previousYearsLimit;

                        const subcategoryIds = course.subcategoryIds ?? [];

                        const getPlatforms = () => {
                          if (!subcategoryIds.length || !subcategories || !categories) return [];
                          const matched = subcategories.filter(sub => subcategoryIds.includes(sub.id));
                          const categoryIds = [...new Set(matched.map(sub => sub.categoryId))];
                          return categories.filter(cat => categoryIds.includes(cat.id));
                        };

                        const platforms = getPlatforms();
                        const isFavorite = favoriteIds.has(course.id);

                        return (
                          <Card
                            key={course.id}
                            className={`group cursor-pointer transition-all duration-300 overflow-hidden flex flex-col ${isSelected
                              ? isFavorite
                                ? "border-red-500 border-2 shadow-2xl shadow-red-500/50 scale-105 ring-4 ring-red-500/20"
                                : "border-primary border-2 shadow-2xl shadow-primary/50 scale-105 ring-4 ring-primary/20"
                              : isDisabled
                                ? "opacity-40 cursor-not-allowed grayscale"
                                : isFavorite
                                  ? "border-red-500/30 hover:border-red-500 hover:shadow-xl hover:scale-105 hover:-translate-y-1"
                                  : "hover:border-primary/50 hover:shadow-xl hover:scale-105 hover:-translate-y-1"
                              }`}
                            onClick={() => !isDisabled && handleToggleCourse(course.id, false)}
                            data-testid={`card-course-${course.id}`}
                          >
                            <div className="bg-gradient-to-br from-primary/10 to-primary/5 relative overflow-hidden w-full min-h-[138px]">
                              {course.thumbnailImage ? (
                                <img
                                  src={course.thumbnailImage}
                                  alt={course.title}
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                                  <BookOpen className="h-16 w-16 text-primary/40" />
                                </div>
                              )}

                              {isFavorite && (
                                <div className="absolute top-2 left-2 bg-red-500 text-white rounded-full p-1.5 shadow-lg">
                                  <Heart className="h-4 w-4 fill-current" />
                                </div>
                              )}

                              {isSelected && (
                                <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-2 shadow-lg animate-in zoom-in duration-300">
                                  <Check className="h-5 w-5" />
                                </div>
                              )}


                            </div>

                            <CardHeader className="flex flex-col space-y-3 h-full">
                              <h3 className="font-bold line-clamp-2 text-lg group-hover:text-primary transition-colors">
                                {course.title}
                              </h3>

                              {/* Rating - Always reserve space */}
                                {course.reviewsCount > 0 && (
                                  <div className="min-h-[24px] flex items-center gap-2">
                                    <StarRating
                                      rating={Number(course.rating || 0)}
                                      reviewsCount={Number(course.reviewsCount)}
                                      size="sm"
                                    />
                                  </div>

                                )}

                              {(() => {
                                const courseSubcategoryIds = course.subcategoryIds ?? [];
                                const selectedSubcategories = subcategories?.filter(sub =>
                                  courseSubcategoryIds.includes(sub.id) && sub.isActive
                                ) ?? [];
                                const parentCategories = categories?.filter(cat =>
                                  course.level?.includes(cat.id) &&
                                  cat.isActive &&
                                  !selectedSubcategories.some(selectedSub => selectedSub.categoryId === cat.id)
                                ) ?? [];
                                parentCategories.forEach(parent => selectedSubcategories.push(parent as any));
                                const categoriesWithoutSub = categories?.filter((cat) => course.level?.includes(cat.id) && cat.isActive) ?? [];

                                const tagItems: { id?: string; name: string }[] = [];
                                platforms.forEach(p => tagItems.push({ id: p.id, name: p.name }));
                                const subcats = selectedSubcategories && selectedSubcategories.length > 0
                                  ? selectedSubcategories
                                  : categoriesWithoutSub || [];
                                subcats.forEach(s => tagItems.push({ id: s.id, name: s.name }));
                                if (course.year) tagItems.push({ name: String(course.year) });
                                return tagItems.length > 0 ? (
                                  <TagsMarquee
                                    items={tagItems}
                                    repeatCount={2}
                                    className="h-6 my-0"
                                  />
                                ) : null;
                              })()}

                              {course.description && (
                                <div
                                  className="prose prose-sm dark:prose-invert max-w-none text-sm text-muted-foreground line-clamp-4 leading-relaxed"
                                  dangerouslySetInnerHTML={{ __html: course.description || '' }}
                                />
                              )}

                              <div className="!mt-auto">
                                {/* Details Button */}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full mb-3"
                                  onClick={(e) => handleShowDetails(course, e)}
                                  data-testid={`button-info-${course.id}`}
                                >
                                  <Info className="h-4 w-4 mr-1" />
                                  Подробнее
                                </Button>

                                {/* Selection Status */}
                                <div>
                                  {isSelected ? (
                                    <div className="flex items-center gap-2 text-primary font-semibold">
                                      <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                                      Курс выбран
                                    </div>
                                  ) : isDisabled ? (
                                    <div className="text-sm text-muted-foreground">
                                      Лимит выбора достигнут
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2 text-muted-foreground group-hover:text-primary transition-colors">
                                      <div className="h-2 w-2 rounded-full border-2 border-current" />
                                      Нажмите для выбора
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardHeader>
                          </Card>
                        );
                      })}
                    </div>

                    <Pagination
                      currentPage={previousYearsPage}
                      totalPages={previousYearsTotalPages}
                      totalItems={previousYearsTotal}
                      itemLabel="курсов"
                      onPageChange={setPreviousYearsPage}
                    />
                  </div>
                )}

                {currentYearTotal === 0 && previousYearsTotal === 0 && (
                  <Card className="p-12">
                    <div className="text-center space-y-4">
                      <BookOpen className="h-16 w-16 mx-auto text-muted-foreground" />
                      <h3 className="text-xl font-semibold">Курсы не найдены</h3>
                      <p className="text-muted-foreground">
                        Попробуйте изменить фильтры или поисковый запрос
                      </p>
                    </div>
                  </Card>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {/* Course Details Dialog */}
      <Dialog open={showCourseDetails} onOpenChange={setShowCourseDetails}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedCourse && (() => {
            const subcategoryIds = selectedCourse.subcategoryIds ?? [];

            const getPlatforms = () => {
              if (!subcategoryIds.length || !subcategories || !categories) return [];
              const matched = subcategories.filter(sub => subcategoryIds.includes(sub.id));
              const categoryIds = [...new Set(matched.map(sub => sub.categoryId))];
              return categories.filter(cat => categoryIds.includes(cat.id));
            };

            const platforms = getPlatforms()
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="text-2xl">{selectedCourse.title}</DialogTitle>
                  <DialogDescription>
                    {selectedCourse.authorName && `Автор: ${selectedCourse.authorName}`}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                  {selectedCourse.thumbnailImage && (
                    <div className="aspect-video w-full rounded-lg overflow-hidden">
                      <img
                        src={selectedCourse.thumbnailImage}
                        alt={selectedCourse.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {selectedCourse.level && (
                      <div className="flex flex-col items-center gap-2 p-4 bg-muted rounded-lg">
                        <BookOpen className="h-5 w-5 text-primary" />

                        {(Array.isArray(selectedCourse.level) && selectedCourse.level.length > 0 && subcategories) && (
                          <div className="flex flex-wrap gap-2 flex flex-col items-center">
                            {Array.from(
                              new Set(
                                selectedCourse.level
                                  .map(id => subcategories?.find(sub => sub.id === id))
                                  .filter(Boolean)
                                  .map(sub => sub.name)
                              )
                            ).map(levelName => (

                              <span className="text-sm font-bold">
                                {levelName}
                              </span>

                            ))}
                          </div>
                        )}
                        <span className="text-xs text-muted-foreground">Уровень</span>
                      </div>
                    )}

                    {selectedCourse.year && (
                      <div className="flex flex-col items-center gap-2 p-4 bg-muted rounded-lg">
                        <Sparkles className="h-5 w-5 text-primary" />
                        <span className="text-2xl font-bold">{selectedCourse.year}</span>
                        <span className="text-xs text-muted-foreground">Год</span>
                      </div>
                    )}

                    {selectedCourse.platform && (
                      <div className="flex flex-col items-center gap-2 p-4 bg-muted rounded-lg">
                        <Crown className="h-5 w-5 text-primary" />
                        {
                          platforms.length > 0 && platforms.map((platform) => (
                            <span className="text-sm font-bold" key={platform.id}>{platform.name}</span>
                          ))
                        }

                        <span className="text-xs text-muted-foreground">Платформа</span>
                      </div>
                    )}
                  </div>

                  {selectedCourse.description && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Описание</h3>
                      <div 
                        className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground"
                        dangerouslySetInnerHTML={{ __html: selectedCourse.description }}
                      />
                    </div>
                  )}

                  {/* Rating Section */}
                  {courseRating && courseRating.averageRating > 0 && (
                    <div className="border-t pt-6">
                      <h3 className="text-lg font-semibold mb-4">Рейтинг курса</h3>
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col gap-2">
                          <StarRating
                            rating={courseRating.averageRating}
                            reviewsCount={courseRating.totalReviews}
                            size="lg"
                            showCount={true}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Reviews Section */}
                  {validReviews.length > 0 && (
                    <div className="border-t pt-6">
                      <h3 className="text-lg font-semibold mb-4">Отзывы студентов</h3>
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {validReviews.map((review) => (
                          <div key={review.id} className="bg-muted/50 rounded-lg p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                  <span className="text-sm font-semibold text-primary">
                                    {review.user?.username?.[0]?.toUpperCase() || review.user?.email?.[0]?.toUpperCase() || 'У'}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-medium text-sm">
                                    {review.user?.username || review.user?.email?.split('@')[0] || 'Пользователь'}
                                  </p>
                                  <StarRating
                                    rating={review.rating}
                                    size="sm"
                                    showCount={false}
                                  />
                                </div>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {new Date(review.createdAt).toLocaleDateString('ru-RU')}
                              </span>
                            </div>
                            {review.comment && (
                              <p className="text-sm text-muted-foreground">{review.comment}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>

      <Footer />
    </div >
  );
}
