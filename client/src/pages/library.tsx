import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueries } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Sparkles, Download, Package, Calendar, Crown } from "lucide-react";
import { Link } from "wouter";
import type { Category, Course, Purchase, Subcategory } from "@shared/schema";
import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import { Footer } from "@/components/footer";
import { Pagination } from "@/components/pagination";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

interface VipPackage {
  id: string;
  userId: string;
  tier: string;
  currentYearLimit: number;
  previousYearsLimit: number;
  currentYearSelected: number;
  previousYearsSelected: number;
  isActivated: boolean;
  purchaseDate: Date;
  viewedInLibrary: boolean;
}

interface Program {
  id: string;
  title: string;
  description: string | null;
  category: string;
  imageUrl: string | null;
  isFree: boolean;
  price: string | null;
  downloadType: string;
  downloadUrl: string | null;
  isActive: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

interface ProgramPurchase {
  id: string;
  userId: string;
  programId: string;
  price: string;
  purchaseDate: Date;
  program?: Program;
}

const COURSES_PER_PAGE = 10;

export default function Library() {
  const { user } = useAuth();
  const markedPurchasesRef = useRef<Set<string>>(new Set());
  const markedVipPackagesRef = useRef<Set<string>>(new Set());

  const [selectedCategories, setSelectedCategories] = useState<{
    platform?: string;
    level?: string;
    year?: number;
    minRating?: number;
    author?: string;
  }>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const { data: library, isLoading } = useQuery<(Purchase & { course: Course })[]>({
    queryKey: ["/api/library", selectedCategories, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategories.platform) params.append("platform", selectedCategories.platform);
      if (selectedCategories.level) params.append("level", selectedCategories.level);
      if (selectedCategories.year) params.append("year", selectedCategories.year.toString());
      if (selectedCategories.minRating !== undefined) params.append("minRating", selectedCategories.minRating.toString());
      if (selectedCategories.author) params.append("author", selectedCategories.author);
      if (searchQuery) params.append("search", searchQuery);

      const url = `/api/library${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url, {
        credentials: "include",
        cache: "no-store"
      });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    },
    staleTime: 0,
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: subcategories } = useQuery<Subcategory[]>({
    queryKey: ["/api/subcategories"]
  })

  const { data: vipPackages, isLoading: vipLoading } = useQuery<VipPackage[]>({
    queryKey: ["/api/vip-packages"],
    queryFn: async () => {
      const res = await fetch("/api/vip-packages", {
        credentials: "include",
        cache: "no-store"
      });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    },
    staleTime: 120000, // Кэшировать на 2 минуты
  });

  const { data: programPurchases, isLoading: programsLoading } = useQuery<ProgramPurchase[]>({
    queryKey: ["/api/program-purchases"],
    queryFn: async () => {
      const res = await fetch("/api/program-purchases", {
        credentials: "include",
        cache: "no-store"
      });
      if (!res.ok) {
        if (res.status === 401) return [];
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      return res.json();
    },
    staleTime: 120000, // Кэшировать на 2 минуты
  });

  // Mutation to mark purchases and VIP packages as viewed
  const markViewedMutation = useMutation({
    mutationFn: async ({ purchaseIds, vipPackageIds }: { purchaseIds?: string[], vipPackageIds?: string[] }) => {
      await apiRequest("POST", "/api/library/mark-viewed", { purchaseIds, vipPackageIds });
    },
    onSuccess: () => {
      // Invalidate library count to update the badge in header
      queryClient.invalidateQueries({ queryKey: ['/api/library/new-count'] });
    },
  });

  // Pagination calculations (must be before useEffect that uses them)
  const totalCourses = library?.length || 0;
  const totalPages = Math.ceil(totalCourses / COURSES_PER_PAGE);
  const startIndex = (currentPage - 1) * COURSES_PER_PAGE;
  const endIndex = startIndex + COURSES_PER_PAGE;
  const paginatedLibrary = library?.slice(startIndex, endIndex) || [];

  // Mark purchases as viewed when they appear on the current page
  useEffect(() => {
    if (!user || !paginatedLibrary || paginatedLibrary.length === 0) return;

    // Extract purchase IDs from the current page that haven't been viewed AND not already marked
    const purchaseIds = paginatedLibrary
      .filter(item => !item.viewedInLibrary && !markedPurchasesRef.current.has(item.id))
      .map(item => item.id);

    if (purchaseIds.length > 0) {
      // Add to marked set immediately to prevent duplicate requests
      purchaseIds.forEach(id => markedPurchasesRef.current.add(id));
      markViewedMutation.mutate({ purchaseIds });
    }
  }, [user, currentPage, library]);

  // Mark VIP packages as viewed when loaded
  useEffect(() => {
    if (!user || !vipPackages || vipPackages.length === 0) return;

    // Extract VIP package IDs that haven't been viewed AND not already marked
    const vipPackageIds = vipPackages
      .filter(pkg => !pkg.viewedInLibrary && !markedVipPackagesRef.current.has(pkg.id))
      .map(pkg => pkg.id);

    if (vipPackageIds.length > 0) {
      // Add to marked set immediately to prevent duplicate requests
      vipPackageIds.forEach(id => markedVipPackagesRef.current.add(id));
      markViewedMutation.mutate({ vipPackageIds });
    }
  }, [user, vipPackages]);

  // Reset to page 1 when filters or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategories, searchQuery]);

  // Clamp currentPage when data changes to avoid empty pages
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [library, totalPages, currentPage]);

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

  const getPlatformName = (platform: string) => {
    // Legacy marketplace names (hardcoded)
    const legacyNames: Record<string, string> = {
      wb: "Wildberries",
      ozon: "Ozon",
      yandex: "Яндекс.Маркет",
    };

    // Try legacy mapping first
    if (legacyNames[platform]) {
      return legacyNames[platform];
    }

    // Try category/subcategory mapping (by slug or nameEn)
    const mappedName = categoryNameMap[platform.toLowerCase()];
    if (mappedName) {
      return mappedName;
    }

    // Fallback to original platform string
    return platform;
  };

  const getLevelName = (level: string) => {
    const names: Record<string, string> = {
      "Начинающий": "Для новичков",
      "Средний": "Для опытных",
      "Продвинутый": "Продвинутый",
    };

    return names[level] || level;
  };

  const handleResetFilters = () => {
    setSelectedCategories({});
    setSearchQuery("");
  };

  const getTierName = (tier: string) => {
    const names: Record<string, string> = {
      bronze: "Bronze VIP",
      silver: "Silver VIP",
      gold: "Gold VIP",
      diamond: "Diamond VIP",
    };
    return names[tier] || tier;
  };

  const getTierBorderColor = (tier: string) => {
    const colors: Record<string, string> = {
      bronze: "border-orange-500/30",
      silver: "border-slate-400/30",
      gold: "border-yellow-500/30",
      diamond: "border-cyan-500/30",
    };
    return colors[tier] || "border-primary/30";
  };

  const getTierAccentColor = (tier: string) => {
    const colors: Record<string, string> = {
      bronze: "text-orange-500",
      silver: "text-slate-400",
      gold: "text-yellow-500",
      diamond: "text-cyan-500",
    };
    return colors[tier] || "text-primary";
  };

  const getCategoryLabel = (category: string) => {
    const categories: Record<string, string> = {
      photo_editors: "Фоторедакторы",
      video_editors: "Видеоредакторы",
      telegram_bot: "Telegram боты",
      spreadsheet: "Таблицы",
      other: "Другое",
    };
    return categories[category] || category;
  };

  const getDownloadTypeLabel = (downloadType: string) => {
    const types: Record<string, string> = {
      torrent: "Торрент",
      archive: "Архив",
      link: "Прямая ссылка",
    };
    return types[downloadType] || downloadType;
  };

  const activeVipPackages = vipPackages?.filter(pkg => !pkg.isActivated) || [];

  const platformQueries = useQueries({
    queries: paginatedLibrary.map((course) => ({
      queryKey: ['course-platforms', course.courseId],
      queryFn: async () => {
        const response = await fetch(`/api/admin/courses/${course.courseId}/subcategories`, {
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

  return (
    <div className="min-h-screen bg-background relative">
      <Header
        onSearchChange={setSearchQuery}
        onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        onResetFilters={handleResetFilters}
      />

      <div className="relative flex">
        <Sidebar
          selectedCategories={selectedCategories}
          onCategoryChange={setSelectedCategories}
          isOpen={sidebarOpen}
          showPriceFilter={false}
          catalogPath="/library"
        />

        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="flex-1 p-3 md:p-6 max-md:overflow-x-hidden">
          <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
            <div className="space-y-2">
              <h1 className="text-2xl md:text-3xl font-bold">Моя библиотека</h1>
              <p className="text-sm md:text-base text-muted-foreground">
                Все ваши курсы и программы в одном месте
              </p>
            </div>

            {/* VIP Packages Section */}
            {activeVipPackages.length > 0 && (
              <div className="space-y-3 md:space-y-4">
                <h2 className="text-xl md:text-2xl font-bold">VIP Пакеты</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {activeVipPackages.map(pkg => (
                    <Link key={pkg.id} href={`/library/vip-select/${pkg.id}`}>
                      <div>
                        <Card
                          className={`group cursor-pointer transition-all duration-200 border-2 ${getTierBorderColor(pkg.tier)} hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 bg-card`}
                          data-testid={`card-vip-package-${pkg.id}`}
                        >
                          <CardHeader className="space-y-4">
                            <div className="flex items-start gap-3">
                              <div className={`p-2.5 rounded-lg ${getTierAccentColor(pkg.tier)}`}>
                                <Crown className="h-7 w-7" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-xl mb-1 truncate">{getTierName(pkg.tier)}</h3>
                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                  <Calendar className="h-3.5 w-3.5" />
                                  <span>Куплен: {new Date(pkg.purchaseDate).toLocaleDateString("ru-RU")}</span>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-2.5">
                              <div className="flex items-center justify-between text-sm">
                                <span>Курсы {new Date().getFullYear()} года:</span>
                                <Badge variant="secondary" className="font-semibold">
                                  {pkg.currentYearLimit}
                                </Badge>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span>Курсы предыдущих лет:</span>
                                <Badge variant="secondary" className="font-semibold">
                                  {pkg.previousYearsLimit}
                                </Badge>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <Button
                              className="w-full"
                              variant="default"
                              size="lg"
                              data-testid={`button-select-courses-${pkg.id}`}
                            >
                              <Sparkles className="h-4 w-4 mr-2" />
                              Выбрать курсы
                            </Button>
                          </CardContent>
                        </Card>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Programs Section */}
            {!programsLoading && programPurchases && programPurchases.length > 0 && (
              <div className="space-y-3 md:space-y-4">
                <h2 className="text-xl md:text-2xl font-bold">Мои программы</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                  {programPurchases.map((purchase) => {
                    const program = purchase.program;
                    if (!program) return null;

                    return (
                      <Card
                        key={purchase.id}
                        className="group overflow-hidden transition-all duration-200 border-2 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 bg-gradient-to-br from-background via-background to-purple/5"
                        data-testid={`card-library-program-${program.id}`}
                      >
                        <div className="aspect-video w-full bg-gradient-to-br from-purple-600/10 to-pink-600/10 relative overflow-hidden">
                          {program.imageUrl ? (
                            <img
                              src={program.imageUrl}
                              alt={program.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="h-16 w-16 text-purple-500/40 group-hover:text-purple-500/60 transition-colors duration-200" />
                            </div>
                          )}
                        </div>

                        <CardHeader className="space-y-3 p-4 md:p-6">
                          <h3 className="font-bold text-base md:text-lg line-clamp-2 transition-colors duration-200">
                            {program.title}
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {getCategoryLabel(program.category)}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {getDownloadTypeLabel(program.downloadType)}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Куплено: {new Date(purchase.purchaseDate).toLocaleDateString("ru-RU")}
                          </p>
                        </CardHeader>

                        <CardContent>
                          <Button
                            className="w-full gap-2"
                            variant="default"
                            size="lg"
                            onClick={() => {
                              if (program.downloadUrl) {
                                window.open(program.downloadUrl, '_blank');
                              }
                            }}
                            disabled={!program.downloadUrl}
                            data-testid={`button-download-${program.id}`}
                          >
                            <Download className="h-4 w-4" />
                            Скачать
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {isLoading || vipLoading || programsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Card key={i}>
                    <Skeleton className="aspect-video w-full" />
                    <CardHeader>
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-1/2 mt-2" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-4 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : library && library.length > 0 ? (
              <>
                <div className="space-y-3 md:space-y-4">
                  <h2 className="text-xl md:text-2xl font-bold">Мои курсы</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                    {paginatedLibrary.map(({ course, purchaseDate }, index) => {
                      const platformQuery = platformQueries[index];
                      console.log('platformQuery', platformQuery.data)
                      const subcategoryIds = platformQuery?.data ?? [];

                      const getPlatforms = () => {
                        if (!subcategoryIds.length || !subcategories || !categories) return [];
                        const matched = subcategories.filter(sub => subcategoryIds.includes(sub.id));
                        const categoryIds = [...new Set(matched.map(sub => sub.categoryId))];
                        return categories.filter(cat => categoryIds.includes(cat.id));
                      };

                      const platforms = getPlatforms();
                      return (
                        <Link key={course.id} href={`/library/${course.id}`}>
                          <div>
                            <Card className="group overflow-hidden transition-all duration-200 cursor-pointer border-2 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 bg-gradient-to-br from-background via-background to-primary/5" data-testid={`card-library-course-${course.id}`}>
                              <div className="aspect-video w-full bg-gradient-to-br from-primary/10 to-primary/5 relative overflow-hidden">
                                {course.thumbnailImage ? (
                                  <img
                                    src={course.thumbnailImage}
                                    alt={course.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <BookOpen className="h-16 w-16 text-primary/40 group-hover:text-primary/60 transition-colors duration-200" />
                                  </div>
                                )}
                              </div>

                              <CardHeader className="space-y-3 p-4 md:p-6">
                                <h3 className="font-bold text-lg md:text-xl line-clamp-2 transition-colors duration-200">
                                  {course.title}
                                </h3>
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-8 w-8 border-2 border-primary/20">
                                    <AvatarImage src={course.authorImage || undefined} />
                                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                      {course.authorName?.[0] || 'A'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex flex-col">
                                    <span className="text-xs text-muted-foreground">Автор</span>
                                    <span className="text-sm font-medium">{course.authorName || 'Автор'}</span>
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {
                                    platforms.length > 0 && platforms.map((platform) => (
                                      <Badge variant="outline" className="text-xs font-medium">
                                        {platform.name}
                                      </Badge>
                                    ))
                                  }
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
                                        <Badge key={levelName} variant="outline" className="text-xs font-medium">
                                          {levelName}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                  {course.year && (
                                    <Badge variant="outline" className="text-xs font-medium">
                                      {course.year}
                                    </Badge>
                                  )}
                                </div>
                              </CardHeader>

                              <CardContent>
                                <p className="text-xs text-muted-foreground">
                                  Куплено: {new Date(purchaseDate!).toLocaleDateString("ru-RU")}
                                </p>
                              </CardContent>
                            </Card>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </div>

                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalCourses}
                  itemLabel="курсов"
                  onPageChange={setCurrentPage}
                />
              </>
            ) : (
              <Card className="p-8 md:p-12">
                <div className="text-center space-y-4">
                  <BookOpen className="h-12 w-12 md:h-16 md:w-16 mx-auto text-muted-foreground" />
                  <h3 className="text-lg md:text-xl font-semibold">
                    {searchQuery || Object.keys(selectedCategories).length > 0
                      ? "Курсы не найдены"
                      : "У вас пока нет курсов"}
                  </h3>
                  <p className="text-sm md:text-base text-muted-foreground">
                    {searchQuery || Object.keys(selectedCategories).length > 0
                      ? "Попробуйте изменить фильтры или поисковый запрос"
                      : "Перейдите в магазин, чтобы выбрать и купить курсы"}
                  </p>
                  {!searchQuery && Object.keys(selectedCategories).length === 0 && (
                    <Link href="/shop">
                      <Button className="mt-4" data-testid="button-go-to-shop">
                        Перейти в магазин
                      </Button>
                    </Link>
                  )}
                </div>
              </Card>
            )}
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}
