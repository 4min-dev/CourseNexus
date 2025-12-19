import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueries } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, BookOpen, ShoppingCart, Trash2, ArrowLeft } from "lucide-react";
import type { Category, Course, Subcategory } from "@shared/schema";
import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import { Footer } from "@/components/footer";
import { formatPrice } from "@/lib/formatPrice";
import { StarRating } from "@/components/star-rating";
import { ViewingCounter } from "@/components/viewing-counter";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface FavoriteWithCourse {
  id: string;
  userId: string;
  courseId: string;
  createdAt: Date;
  course: Course;
}

export default function Favorites() {
  const [, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<{
    platform?: string;
    level?: string;
    year?: number;
    minRating?: number;
    author?: string;
  }>({});

  const { data: favorites, isLoading } = useQuery<FavoriteWithCourse[]>({
    queryKey: ["/api/favorites"],
  });

  const { data: purchases } = useQuery<{ courseId: string }[]>({
    queryKey: ["/api/purchases"],
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: subcategories } = useQuery<Subcategory[]>({
    queryKey: ["/api/subcategories"]
  })

  const removeFavoriteMutation = useMutation({
    mutationFn: async (courseId: string) => {
      await apiRequest("DELETE", `/api/favorites/${courseId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
    },
  });

  const purchasedCourseIds = new Set(purchases?.map((p) => p.courseId) || []);

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

  const getLevelName = (level: string) => {
    const names: Record<string, string> = {
      "Начинающий": "Для новичков",
      "Средний": "Для опытных",
      "Продвинутый": "Продвинутый",
    };

    return names[level] || level;
  };

  const handleRemoveFavorite = (courseId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    removeFavoriteMutation.mutate(courseId);
  };

  const subcategoriesQueries = useQueries({
    queries: (favorites || []).map((fav) => ({
      queryKey: ["/api/admin/courses", fav.course.id, "subcategories"], // ← fav.course.id
      queryFn: async (): Promise<string[]> => {
        const response = await fetch(`/api/admin/courses/${fav.course.id}/subcategories`, {
          credentials: "include",
        });
        if (!response.ok) return [];
        return response.json();
      },
      enabled: !!fav.course.id,
      staleTime: 5 * 60 * 1000,
    })),
  });

  const filteredCoursesByLevel = useMemo(() => {
    if (!favorites || favorites.length === 0) return [];

    return favorites.filter((fav, idx) => {
      const query = subcategoriesQueries[idx];
      if (query.isLoading) return true; // показываем пока грузится

      const course = fav.course;

      // Проверяем, есть ли активные категории в старом поле level
      const activeCategoriesInLevel = categories?.filter(
        cat => course.level?.includes(cat.id) && cat.isActive
      ) || []

      return activeCategoriesInLevel.length > 0;
    });
  }, [favorites, categories, subcategoriesQueries]);

  const platformQueries = useQueries({
    queries: filteredCoursesByLevel ? filteredCoursesByLevel?.map((course) => ({
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
    })) : [],
  });

  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden" >
      <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex flex-1">
        <Sidebar
          isOpen={sidebarOpen}
          selectedCategories={selectedCategories}
          onCategoryChange={setSelectedCategories}
          showPriceFilter={false}
          catalogPath="/shop"
        />
        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto p-3 md:p-6 space-y-6 md:space-y-8">
            {/* Page Header */}
            <div className="space-y-4">
              <Button
                variant="ghost"
                onClick={() => {
                  const shopUrl = sessionStorage.getItem('shopUrl');
                  setLocation(shopUrl || '/shop');
                }}
                className="gap-2"
                data-testid="button-back-to-shop"
              >
                <ArrowLeft className="h-4 w-4" />
                Назад в магазин
              </Button>

              <div className="flex items-center gap-2 md:gap-3">
                <Heart className="h-6 w-6 md:h-8 md:w-8 text-red-500 fill-red-500 flex-shrink-0" />
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground">Избранное</h1>
                  <p className="text-sm md:text-base text-muted-foreground mt-1">
                    Ваши любимые курсы в одном месте
                  </p>
                </div>
              </div>
            </div>

            {isLoading ? (
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
            ) : filteredCoursesByLevel && filteredCoursesByLevel.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {filteredCoursesByLevel.map(({ course }, index) => {
                  const isPurchased = purchasedCourseIds.has(course.id);
                  const price = parseFloat(course.price || "0");

                  const platformQuery = platformQueries[index];
                  console.log('platformQuery', platformQuery.data)
                  const subcategoryIds = platformQuery?.data ?? [];

                  const getPlatforms = () => {
                    if (!subcategoryIds.length || !subcategories || !categories) return [];
                    const matched = subcategories.filter((sub) => subcategoryIds.includes(sub.id) && sub.isActive);
                    console.log('matched', matched)
                    const categoryIds = [...new Set(matched.map(sub => sub.categoryId))];
                    return categories.filter((cat) => categoryIds.includes(cat.id) && cat.isActive);
                  };

                  const platforms = getPlatforms();
                  console.log(platforms)

                  const originalIndex = index

                  const courseSubcategoryIds = originalIndex !== -1
                    ? subcategoriesQueries[originalIndex]?.data ?? []
                    : [];

                  // Теперь можно правильно получить выбранные подкатегории
                  const selectedSubcategories = subcategories?.filter((sub) =>
                    courseSubcategoryIds.includes(sub.id) && sub.isActive
                  ) ?? [];

                  const categoriesWithoutSub = categories?.filter((cat) => course.level?.includes(cat.id) && cat.isActive) ?? []

                  console.log('selectedSubcategories', selectedSubcategories)

                  if (categoriesWithoutSub && categoriesWithoutSub.length > 0) return (
                    <Card
                      key={course.id}
                      className="overflow-hidden flex flex-col h-full border-2 bg-gradient-to-br from-background via-background to-primary/5 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 transition-all duration-200"
                      data-testid={`card-favorite-${course.id}`}
                    >
                      {/* Thumbnail Section */}
                      <div className="bg-gradient-to-br from-primary/10 to-primary/5 relative overflow-hidden aspect-video w-full">
                        {course.thumbnailImage ? (
                          <img
                            src={course.thumbnailImage}
                            alt={course.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen className="h-16 w-16 text-primary/40" />
                          </div>
                        )}

                        {/* Top right badges and remove button */}
                        <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg"
                            onClick={(e) => handleRemoveFavorite(course.id, e)}
                            data-testid={`button-remove-favorite-${course.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          {course.isFree ? (
                            <Badge className="bg-green-600 text-white shadow-lg">
                              Бесплатно
                            </Badge>
                          ) : isPurchased && (
                            <Badge className="bg-blue-600 text-white shadow-lg">
                              <ShoppingCart className="h-3 w-3 mr-1" />
                              Куплен
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Content Section */}
                      <CardHeader className="space-y-3 flex-grow pb-4">
                        <h3 className="font-bold text-xl line-clamp-2" data-testid={`text-favorite-title-${course.id}`}>
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
                          {platforms.length > 0 && platforms.map((platform) => (
                            <Badge variant="outline" className="text-xs font-medium">
                              {
                                platform.name
                              }
                            </Badge>
                          ))}
                          {((Array.isArray(selectedSubcategories) && selectedSubcategories.length > 0) || categoriesWithoutSub) && (
                            <div className="flex flex-wrap gap-2">
                              {
                                selectedSubcategories && selectedSubcategories.length > 0 ? selectedSubcategories.map(subCategory => (
                                  <Badge key={subCategory.id} variant="outline" className="text-xs font-medium">
                                    {subCategory.name}
                                  </Badge>
                                )) : categoriesWithoutSub?.map(subCategory => (
                                  <Badge key={subCategory.id} variant="outline" className="text-xs font-medium">
                                    {subCategory.name}
                                  </Badge>
                                ))
                              }
                            </div>
                          )}
                          {course.year && (
                            <Badge variant="outline" className="text-xs font-medium">
                              {course.year}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8 border-2 border-primary/20">
                            <AvatarImage src={course.authorImage || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                              {course.authorName?.[0] || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground">Автор</span>
                            <span className="text-sm font-medium">{course.authorName || "Неизвестен"}</span>
                          </div>
                        </div>
                      </CardHeader>

                      <CardFooter className="flex flex-col gap-3 pt-0">
                        <div className="w-full flex items-center justify-between px-1">
                          <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground">Цена</span>
                            <span className="text-2xl font-bold text-foreground" data-testid={`text-favorite-price-${course.id}`}>
                              {course.isFree ? "Бесплатно" : `${formatPrice(price)} ₽`}
                            </span>
                          </div>
                        </div>
                        <Button
                          className={`w-full font-semibold shadow-lg transition-all duration-200 ${isPurchased
                            ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30'
                            : 'shadow-primary/30'
                            }`}
                          data-testid={`button-view-favorite-${course.id}`}
                          onClick={() => setLocation(`/course/${course.id}`)}
                        >
                          {isPurchased ? "Открыть курс" : "Подробнее"}
                        </Button>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="p-12">
                <div className="text-center space-y-4">
                  <Heart className="h-16 w-16 mx-auto text-muted-foreground" />
                  <h3 className="text-xl font-semibold">Избранное пусто</h3>
                  <p className="text-muted-foreground">
                    Добавьте курсы в избранное, нажав на значок сердечка
                  </p>
                  <Button
                    onClick={() => {
                      const shopUrl = sessionStorage.getItem('shopUrl');
                      setLocation(shopUrl || '/shop');
                    }}
                    data-testid="button-go-to-shop"
                  >
                    Перейти в каталог
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </main>
      </div>
      <Footer />
    </div >
  );
}
