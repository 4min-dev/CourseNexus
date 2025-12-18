import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueries, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useParams, useLocation, useSearchParams } from "wouter";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, ArrowLeft, Edit, Search } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { formatPrice } from "@/lib/formatPrice";
import { Pagination } from "@/components/pagination";
import { Switch } from "@/components/ui/switch";

const COURSES_PER_PAGE = 20;

export function stripHtml(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Subcategory {
  id: string;
  name: string;
}

interface Course {
  id: string;
  title: string;
  description: string | null;
  price: number;
  authorName: string;
  thumbnailImage: string | null;
  thumbnailUrl?: string | null;
  instructor?: string;
  level?: string[] | null;
  platform: string;
  year?: number;
  isFree?: boolean;
  hiddenInShop?: boolean;
  hiddenInLibrary?: boolean;
}

export default function AdminCourses() {
  const { categoryId, subcategoryId } = useParams<{ categoryId: string; subcategoryId?: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [courseTitle, setCourseTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchParams] = useSearchParams();
  const parentId = searchParams.get('parentId');

  // Fetch category and subcategory info
  const { data: category } = useQuery<Category>({
    queryKey: ["/api/categories", categoryId],
    enabled: !!categoryId,
  });

  const { data: subcategory } = useQuery<Subcategory>({
    queryKey: ["/api/subcategories", subcategoryId],
    enabled: !!subcategoryId,
  });


  // Fetch ALL courses for this category (without subcategory filter on backend)
  const { data: courses = [], isLoading: isLoadingCourses } = useQuery<Course[]>({
    queryKey: ["/api/admin/courses", categoryId],
    queryFn: async () => {
      const response = await fetch(`/api/admin/courses?categoryId=${categoryId}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch courses");
      return response.json();
    },
    enabled: !!categoryId,
  });

  const { data: subcategories, isLoading } = useQuery<Subcategory[]>({
    queryKey: ["/api/subcategories", categoryId],
    queryFn: async () => {
      const response = await fetch(`/api/subcategories?categoryId=${categoryId}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch");
      return response.json();
    },
    enabled: !!categoryId,
  });

  // Запросы подкатегорий для каждого курса
  const subcategoriesQueries = useQueries({
    queries: courses.map((course) => ({
      queryKey: ["/api/admin/courses", course.id, "subcategories"],
      queryFn: async (): Promise<string[]> => {
        const response = await fetch(`/api/admin/courses/${course.id}/subcategories`, {
          credentials: "include",
        });
        if (!response.ok) return [];
        return response.json();
      },
      enabled: !!course.id,
      staleTime: 5 * 60 * 1000,
    })),
  });

  // Фильтрация курсов по наличию subcategoryId в их подкатегориях + поиск
  const filteredCourses = useMemo(() => {
    if (!subcategoryId) return courses; // если нет subcategoryId — показываем все

    return courses
      .map((course, idx) => {
        const query = subcategoriesQueries[idx];
        const subcatIds = query.data;

        // Если данные ещё не загружены — считаем курс "не подходящим" (скроем)
        if (query.isLoading || query.isError || subcatIds === undefined) {
          return null;
        }

        // Проверяем, есть ли нужная подкатегория
        if (subcatIds.includes(subcategoryId)) {
          return course;
        }
        return null;
      })
      .filter(Boolean) as Course[];
  }, [courses, subcategoriesQueries, subcategoryId]);

  // Поиск по заголовку, автору, описанию
  const searchedCourses = useMemo(() => {
    if (!searchQuery) return filteredCourses;

    const query = searchQuery.toLowerCase();
    return filteredCourses.filter((course) => {
      const title = (course.title ?? "").toLowerCase();
      const instructor = (course.instructor ?? course.authorName ?? "").toLowerCase();
      const description = stripHtml(course.description ?? "").toLowerCase();

      return title.includes(query) || instructor.includes(query) || description.includes(query);
    });
  }, [filteredCourses, searchQuery]);

  // Пагинация
  const totalCourses = searchedCourses.length;
  const totalPages = Math.ceil(totalCourses / COURSES_PER_PAGE);
  const paginatedCourses = searchedCourses.slice(
    (currentPage - 1) * COURSES_PER_PAGE,
    currentPage * COURSES_PER_PAGE
  );

  // Состояние загрузки подкатегорий
  const isLoadingSubcategories = subcategoriesQueries.some(q => q.isLoading);
  const hasErrors = subcategoriesQueries.some(q => q.isError);

  // Получение имён подкатегорий для отображения (из уже загруженных данных)
  const { data: allSubcategories = [] } = useQuery<Subcategory[]>({
    queryKey: ["/api/subcategories", categoryId],
    enabled: !!categoryId,
  });

  const getSubcategoryNames = (levelIds: string[] | null | undefined): string => {
    if (!levelIds || !Array.isArray(levelIds) || levelIds.length === 0) return "";
    return levelIds
      .map(id => allSubcategories.find(s => s.id === id)?.name)
      .filter(Boolean)
      .join(", ");
  };

  // Сброс страницы при поиске
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Корректировка страницы, если стало меньше страниц
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // Мутации
  const createMutation = useMutation({
    mutationFn: async (title: string) => {
      const platform = category?.slug || "";
      const response = await apiRequest("POST", "/api/admin/courses", { title, platform });
      const course = await response.json();
      if (subcategoryId) {
        await apiRequest("PUT", `/api/admin/courses/${course.id}/subcategories`, {
          subcategoryIds: [subcategoryId],
        });
      }
      return course;
    },
    onSuccess: (course) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/courses", categoryId] });
      toast({ title: "Успешно", description: "Курс создан" });
      setIsAddDialogOpen(false);
      setCourseTitle("");
      setLocation(`/admin/courses/${course.id}/edit?subcategoryId=${subcategoryId}&categoryId=${categoryId}&parentId=${parentId}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/courses/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/courses", categoryId] });
      toast({ title: "Успешно", description: "Курс удалён" });
    },
  });

  const toggleVisibilityMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/admin/courses/${id}/toggle-visibility`, { field: "hiddenInShop" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/courses", categoryId] });
      toast({ title: "Успешно", description: "Видимость изменена" });
    },
  });

  const breadcrumbs = [
    { label: "Категории", href: "/admin/categories" },
    { label: category?.name || "...", href: `/admin/categories/${categoryId}/subcategories` },
    { label: subcategory?.name || "Все курсы" },
  ];

  return (
    <AdminLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">Курсы</h1>
            <p className="text-muted-foreground">
              {category?.name} → {subcategory?.name || "Все"} • {totalCourses} курсов
            </p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Добавить курс
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск курсов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {(isLoadingCourses || isLoadingSubcategories) ? (
          <div className="text-center py-12">Загрузка курсов...</div>
        ) : hasErrors ? (
          <div className="text-center py-12 text-destructive">Ошибка загрузки подкатегорий некоторых курсов</div>
        ) : paginatedCourses.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {searchQuery ? "Курсы не найдены" : "Нет курсов в этой подкатегории"}
          </div>
        ) : (
          <>
            <div className="grid gap-4">
              {paginatedCourses.map((course) => {
                const originalIndex = courses.findIndex(c => c.id === course.id);

                // Получаем правильный запрос подкатегорий
                const courseSubcategoryIds = originalIndex !== -1
                  ? subcategoriesQueries[originalIndex]?.data ?? []
                  : [];

                // Теперь можно правильно получить выбранные подкатегории
                const selectedSubcategories = allSubcategories?.filter(sub =>
                  courseSubcategoryIds.includes(sub.id)
                ) ?? [];

                const title = course.title ?? "";
                const description = course.description ?? "";
                const instructor = course.instructor ?? course.authorName ?? "";
                const thumbnail = course.thumbnailUrl ?? course.thumbnailImage ?? null;
                const price = course.price ?? null;
                const year = course.year ?? null;
                const isFree = course.isFree ?? false;
                const level = course.level ?? null;

                return (
                  <Card
                    key={course.id}
                    className={`hover-elevate transition-all ${course.hiddenInShop ? 'opacity-50' : ''}`}
                  >
                    <CardHeader>
                      <div className="flex items-start gap-4">
                        {thumbnail && (
                          <img src={thumbnail} alt={title} className="w-24 h-24 object-cover rounded" />
                        )}
                        <div className="flex-1">
                          <h3 className="text-xl font-bold mb-1">{title}</h3>
                          {instructor && <p className="text-sm text-muted-foreground mb-2">{instructor}</p>}
                          {description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {stripHtml(description)}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span>
                              {isFree ? "Бесплатно" : price !== null ? `${formatPrice(price)} ₽` : "—"}
                            </span>
                            {(selectedSubcategories && Array.isArray(selectedSubcategories) && selectedSubcategories.length > 0) && selectedSubcategories.map(sub =>
                              <span key={sub.id} className="text-muted-foreground">
                                {sub.name}
                              </span>
                            )}
                            {year && <span className="text-muted-foreground">{year}</span>}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <div className="flex items-center gap-2 px-2">
                            <Label htmlFor={`visibility-${course.id}`} className="text-sm cursor-pointer">
                              Активен в магазине
                            </Label>
                            <Switch
                              id={`visibility-${course.id}`}
                              checked={!course.hiddenInShop}
                              onCheckedChange={() => toggleVisibilityMutation.mutate(course.id)}
                            />
                          </div>

                          <Button asChild size="icon" variant="ghost">
                            <Link href={`/admin/courses/${course.id}/edit?subcategoryId=${subcategoryId}&categoryId=${categoryId}&parentId=${parentId}`}>
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>

                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (confirm(`Удалить курс "${title}"?`)) {
                                deleteMutation.mutate(course.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>

            {totalCourses > COURSES_PER_PAGE && (
              <div className="flex justify-center mt-8">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalCourses}
                  itemLabel="курсов"
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Dialog создания курса — без изменений */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Добавить курс</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Название курса</Label>
              <Input
                value={courseTitle}
                onChange={(e) => setCourseTitle(e.target.value)}
                placeholder="Продвижение на Wildberries"
                onKeyDown={(e) => e.key === 'Enter' && !createMutation.isPending && createMutation.mutate(courseTitle)}
                autoFocus
              />
              <p className="text-sm text-muted-foreground">
                Остальные поля можно заполнить в редакторе курса
              </p>
            </div>
            <Button
              className="w-full"
              onClick={() => courseTitle.trim() && createMutation.mutate(courseTitle)}
              disabled={createMutation.isPending || !courseTitle.trim()}
            >
              {createMutation.isPending ? "Создание..." : "Создать и перейти к редактору"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}