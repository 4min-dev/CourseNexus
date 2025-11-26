import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { X, Star, BookOpen, Layers, TrendingUp, Calendar, User, Award, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Category as DbCategory, Subcategory } from "@shared/schema";

interface MobileFiltersProps {
  selectedCategories: {
    platform?: string;
    level?: string;
    year?: number;
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    author?: string;
  };
  onCategoryChange: (categories: {
    platform?: string;
    level?: string;
    year?: number;
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    author?: string;
  }) => void;
}

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

export function MobileFilters({ selectedCategories, onCategoryChange }: MobileFiltersProps) {
  // Локальное состояние для выбранной главной категории
  const [selectedMainCategory, setSelectedMainCategory] = useState<string | null>(null);
  // Локальное состояние для поиска автора
  const [authorSearchQuery, setAuthorSearchQuery] = useState<string>("");

  const { data: allCategories = [] } = useQuery<DbCategory[]>({
    queryKey: ["/api/categories"],
  });

  const { data: subcategories = [] } = useQuery<Subcategory[]>({
    queryKey: ["/api/subcategories"],
  });

  // Главные категории (parent_id = null)
  const mainCategories = allCategories.filter(cat => !cat.parentId && cat.name !== "Уровень");
  
  // Дочерние категории (платформы) - используем categories с parent_id
  const childCategories = selectedMainCategory
    ? allCategories.filter(cat => cat.parentId === selectedMainCategory)
    : [];

  const { data: years = [] } = useQuery<number[]>({
    queryKey: ["/api/courses-metadata/years", selectedCategories.platform, selectedCategories.level, selectedCategories.author, selectedCategories.minRating],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategories.platform) params.append("platform", selectedCategories.platform);
      if (selectedCategories.level) params.append("level", selectedCategories.level);
      if (selectedCategories.author) params.append("author", selectedCategories.author);
      if (selectedCategories.minRating) params.append("minRating", selectedCategories.minRating.toString());
      const url = `/api/courses-metadata/years${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    },
    enabled: !!selectedCategories.platform,
  });

  const { data: courseLevels = [] } = useQuery<string[]>({
    queryKey: ["/api/courses-metadata/levels", selectedCategories.platform, selectedCategories.year, selectedCategories.author, selectedCategories.minRating],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategories.platform) params.append("platform", selectedCategories.platform);
      if (selectedCategories.year) params.append("year", selectedCategories.year.toString());
      if (selectedCategories.author) params.append("author", selectedCategories.author);
      if (selectedCategories.minRating) params.append("minRating", selectedCategories.minRating.toString());
      const url = `/api/courses-metadata/levels${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    },
    enabled: !!selectedCategories.platform,
  });

  const { data: authors = [] } = useQuery<string[]>({
    queryKey: ["/api/courses-metadata/authors", selectedCategories.platform, selectedCategories.level, selectedCategories.year, selectedCategories.minRating],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategories.platform) params.append("platform", selectedCategories.platform);
      if (selectedCategories.level) params.append("level", selectedCategories.level);
      if (selectedCategories.year) params.append("year", selectedCategories.year.toString());
      if (selectedCategories.minRating) params.append("minRating", selectedCategories.minRating.toString());
      const url = `/api/courses-metadata/authors${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    },
    enabled: !!selectedCategories.platform,
  });

  const { data: availableRatings = [] } = useQuery<number[]>({
    queryKey: ["/api/courses-metadata/ratings", selectedCategories.platform, selectedCategories.level, selectedCategories.year, selectedCategories.author],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategories.platform) params.append("platform", selectedCategories.platform);
      if (selectedCategories.level) params.append("level", selectedCategories.level);
      if (selectedCategories.year) params.append("year", selectedCategories.year.toString());
      if (selectedCategories.author) params.append("author", selectedCategories.author);
      const url = `/api/courses-metadata/ratings${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    },
    enabled: !!selectedCategories.platform,
  });


  const handleMainCategoryClick = (categoryId: string, categoryName: string) => {
    if (selectedMainCategory === categoryId) {
      // Сброс главной категории и всех зависимых фильтров
      setSelectedMainCategory(null);
      onCategoryChange({
        minRating: selectedCategories.minRating,
        minPrice: selectedCategories.minPrice,
        maxPrice: selectedCategories.maxPrice,
      });
    } else {
      // Выбор новой главной категории
      trackFilterClick('category', categoryId, categoryName);
      setSelectedMainCategory(categoryId);
      
      // Автоматически выбрать все платформы этой категории
      const platformsInCategory = allCategories.filter(cat => cat.parentId === categoryId);
      const allPlatformSlugs = platformsInCategory.map(p => p.slug).join(',');
      
      onCategoryChange({
        platform: allPlatformSlugs || undefined,
        minRating: selectedCategories.minRating,
        minPrice: selectedCategories.minPrice,
        maxPrice: selectedCategories.maxPrice,
      });
    }
  };

  const handleSubcategoryClick = (subcategorySlug: string, subcategoryName: string, subcategoryId?: string) => {
    if (selectedCategories.platform === subcategorySlug) {
      // Сброс подкатегории (платформы) - вернуться к показу всех платформ категории
      const platformsInCategory = allCategories.filter(cat => cat.parentId === selectedMainCategory);
      const allPlatformSlugs = platformsInCategory.map(p => p.slug).join(',');
      
      onCategoryChange({
        ...selectedCategories,
        platform: allPlatformSlugs || undefined,
        level: undefined,
        year: undefined,
        author: undefined,
      });
    } else {
      // Выбор конкретной подкатегории (платформы)
      trackFilterClick('subcategory', subcategoryId || null, subcategoryName);
      const newCategories: any = {
        platform: subcategorySlug,
        minRating: selectedCategories.minRating,
      };
      if (selectedCategories.minPrice !== undefined) {
        newCategories.minPrice = selectedCategories.minPrice;
      }
      if (selectedCategories.maxPrice !== undefined) {
        newCategories.maxPrice = selectedCategories.maxPrice;
      }
      onCategoryChange(newCategories);
    }
  };

  const handleLevelClick = (level: string, subcategoryId?: string) => {
    if (selectedCategories.level === level) {
      onCategoryChange({
        ...selectedCategories,
        level: undefined,
      });
    } else {
      trackFilterClick('subcategory', subcategoryId || null, level);
      onCategoryChange({
        ...selectedCategories,
        level: level,
      });
    }
  };

  const handleYearClick = (year: number) => {
    if (selectedCategories.year === year) {
      onCategoryChange({
        ...selectedCategories,
        year: undefined,
      });
    } else {
      onCategoryChange({
        ...selectedCategories,
        year: year,
      });
    }
  };

  const handleAuthorClick = (author: string) => {
    if (selectedCategories.author === author) {
      onCategoryChange({
        ...selectedCategories,
        author: undefined,
      });
    } else {
      trackFilterClick('author', null, author);
      onCategoryChange({
        ...selectedCategories,
        author: author,
      });
    }
  };

  const handleRatingClick = (rating: number) => {
    if (selectedCategories.minRating === rating) {
      onCategoryChange({
        ...selectedCategories,
        minRating: undefined,
      });
    } else {
      onCategoryChange({
        ...selectedCategories,
        minRating: rating,
      });
    }
  };

  const hasActiveFilters = selectedMainCategory || selectedCategories.platform || 
    selectedCategories.level || selectedCategories.year || selectedCategories.minRating || 
    selectedCategories.author;

  const handleResetFilters = () => {
    setSelectedMainCategory(null);
    onCategoryChange({});
  };

  return (
    <div className="md:hidden space-y-5 mb-6" data-testid="mobile-filters">
      {/* Главные категории - всегда видны */}
      <div className="space-y-3 animate-in fade-in-50 duration-500">
        <div className="flex items-center gap-2 px-1">
          <BookOpen className="h-4 w-4 text-primary" />
          <h3 className="text-base font-semibold tracking-tight">Категория</h3>
        </div>
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-2.5 pb-2">
            {mainCategories.map((category, index) => (
              <Badge
                key={category.id}
                variant={selectedMainCategory === category.id ? "default" : "outline"}
                className={`
                  cursor-pointer flex-shrink-0 px-5 py-2.5 text-sm font-medium
                  transition-all duration-300 ease-out
                  hover:scale-105 hover:shadow-md
                  active:scale-95
                  ${selectedMainCategory === category.id ? 'shadow-lg shadow-primary/25' : ''}
                  animate-in fade-in-50 slide-in-from-left-5
                `}
                style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'backwards' }}
                onClick={() => handleMainCategoryClick(category.id, category.name)}
                data-testid={`badge-main-category-${category.name}`}
              >
                {category.name}
              </Badge>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Платформы (дочерние категории) - показываются после выбора главной категории */}
      {selectedMainCategory && childCategories.length > 0 && (
        <div className="space-y-3 animate-in fade-in-50 slide-in-from-top-3 duration-500">
          <div className="flex items-center gap-2 px-1">
            <Layers className="h-4 w-4 text-primary" />
            <h3 className="text-base font-semibold tracking-tight">Платформа</h3>
          </div>
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-2.5 pb-2">
              {childCategories.map((platform, index) => (
                <Badge
                  key={platform.id}
                  variant={selectedCategories.platform === platform.slug ? "default" : "outline"}
                  className={`
                    cursor-pointer flex-shrink-0 px-5 py-2.5 text-sm font-medium
                    transition-all duration-300 ease-out
                    hover:scale-105 hover:shadow-md
                    active:scale-95
                    ${selectedCategories.platform === platform.slug ? 'shadow-lg shadow-primary/25' : ''}
                    animate-in fade-in-50 slide-in-from-left-5
                  `}
                  style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'backwards' }}
                  onClick={() => handleSubcategoryClick(platform.slug, platform.name, platform.id)}
                  data-testid={`badge-platform-${platform.name}`}
                >
                  {platform.name}
                </Badge>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      )}

      {/* Уровни - показываются после выбора подкатегории (платформы) */}
      {selectedCategories.platform && courseLevels.length > 0 && (
        <div className="space-y-3 animate-in fade-in-50 slide-in-from-top-3 duration-500">
          <div className="flex items-center gap-2 px-1">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h3 className="text-base font-semibold tracking-tight">Уровень</h3>
          </div>
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-2.5 pb-2">
              {courseLevels.map((level, index) => {
                const subcategory = subcategories.find(s => s.name === level);
                return (
                  <Badge
                    key={level}
                    variant={selectedCategories.level === level ? "default" : "outline"}
                    className={`
                      cursor-pointer flex-shrink-0 px-5 py-2.5 text-sm font-medium
                      transition-all duration-300 ease-out
                      hover:scale-105 hover:shadow-md
                      active:scale-95
                      ${selectedCategories.level === level ? 'shadow-lg shadow-primary/25' : ''}
                      animate-in fade-in-50 slide-in-from-left-5
                    `}
                    style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'backwards' }}
                    onClick={() => handleLevelClick(level, subcategory?.id)}
                    data-testid={`badge-level-${level}`}
                  >
                    {level}
                  </Badge>
                );
              })}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      )}

      {/* Годы - показываются после выбора платформы */}
      {selectedCategories.platform && years.length > 0 && (
        <div className="space-y-3 animate-in fade-in-50 slide-in-from-top-3 duration-500">
          <div className="flex items-center gap-2 px-1">
            <Calendar className="h-4 w-4 text-primary" />
            <h3 className="text-base font-semibold tracking-tight">Год</h3>
          </div>
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-2.5 pb-2">
              {years.map((year, index) => (
                <Badge
                  key={year}
                  variant={selectedCategories.year === year ? "default" : "outline"}
                  className={`
                    cursor-pointer flex-shrink-0 px-5 py-2.5 text-sm font-medium
                    transition-all duration-300 ease-out
                    hover:scale-105 hover:shadow-md
                    active:scale-95
                    ${selectedCategories.year === year ? 'shadow-lg shadow-primary/25' : ''}
                    animate-in fade-in-50 slide-in-from-left-5
                  `}
                  style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'backwards' }}
                  onClick={() => handleYearClick(year)}
                  data-testid={`badge-year-${year}`}
                >
                  {year}
                </Badge>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      )}

      {/* Авторы - показываются после выбора платформы */}
      {selectedCategories.platform && authors.length > 0 && (() => {
        // Фильтруем авторов на основе поискового запроса
        const filteredAuthors = authors.filter(author =>
          author.toLowerCase().includes(authorSearchQuery.toLowerCase())
        );

        return (
          <div className="space-y-3 animate-in fade-in-50 slide-in-from-top-3 duration-500">
            <div className="flex items-center gap-2 px-1">
              <User className="h-4 w-4 text-primary" />
              <h3 className="text-base font-semibold tracking-tight">Автор</h3>
            </div>
            
            {/* Поле поиска автора */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Поиск автора..."
                value={authorSearchQuery}
                onChange={(e) => setAuthorSearchQuery(e.target.value)}
                className="pl-10 h-10 text-sm transition-all duration-300 focus:ring-2 focus:ring-primary/20"
                data-testid="input-author-search"
              />
              {authorSearchQuery && (
                <button
                  onClick={() => setAuthorSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="button-clear-author-search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Список авторов */}
            {filteredAuthors.length > 0 ? (
              <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex gap-2.5 pb-2">
                  {filteredAuthors.map((author, index) => (
                    <Badge
                      key={author}
                      variant={selectedCategories.author === author ? "default" : "outline"}
                      className={`
                        cursor-pointer flex-shrink-0 px-5 py-2.5 text-sm font-medium
                        transition-all duration-300 ease-out
                        hover:scale-105 hover:shadow-md
                        active:scale-95
                        ${selectedCategories.author === author ? 'shadow-lg shadow-primary/25' : ''}
                        animate-in fade-in-50 slide-in-from-left-5
                      `}
                      style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'backwards' }}
                      onClick={() => handleAuthorClick(author)}
                      data-testid={`badge-author-${author}`}
                    >
                      {author}
                    </Badge>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4 animate-in fade-in-50">
                Автор не найден
              </p>
            )}
          </div>
        );
      })()}

      {/* Рейтинг - показывается только если выбрана платформа и есть доступные рейтинги */}
      {selectedCategories.platform && availableRatings.length > 0 && (
        <div className="space-y-3 animate-in fade-in-50 slide-in-from-top-3 duration-500">
          <div className="flex items-center gap-2 px-1">
            <Award className="h-4 w-4 text-primary" />
            <h3 className="text-base font-semibold tracking-tight">Минимальный рейтинг</h3>
          </div>
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-2.5 pb-2">
              {availableRatings.map((rating, index) => (
                <Badge
                  key={rating}
                  variant={selectedCategories.minRating === rating ? "default" : "outline"}
                  className={`
                    cursor-pointer flex-shrink-0 px-5 py-2.5 text-sm font-medium
                    transition-all duration-300 ease-out
                    hover:scale-105 hover:shadow-md
                    active:scale-95
                    ${selectedCategories.minRating === rating ? 'shadow-lg shadow-primary/25' : ''}
                    animate-in fade-in-50 slide-in-from-left-5
                  `}
                  style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'backwards' }}
                  onClick={() => handleRatingClick(rating)}
                  data-testid={`badge-rating-${rating}`}
                >
                  <Star className="h-3.5 w-3.5 mr-1.5 fill-current" />
                  {rating}+
                </Badge>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      )}

      {/* Reset button - показывается только если есть активные фильтры */}
      {hasActiveFilters && (
        <div className="flex justify-center pt-3 animate-in fade-in-50 duration-500">
          <Button
            variant="ghost"
            size="default"
            onClick={handleResetFilters}
            className="text-muted-foreground hover:text-foreground font-medium transition-all duration-300"
            data-testid="button-reset-filters-mobile"
          >
            <X className="h-4 w-4 mr-2" />
            Сбросить фильтры
          </Button>
        </div>
      )}
    </div>
  );
}
