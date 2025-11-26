import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useParams, useLocation } from "wouter";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, ArrowLeft, Edit, Search } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { formatPrice } from "@/lib/formatPrice";
import { Pagination } from "@/components/pagination";
import { Switch } from "@/components/ui/switch";

const COURSES_PER_PAGE = 20;

// Helper function to extract plain text from HTML for preview
function stripHtml(html: string): string {
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
  level: string[] | null;
  platform: string;
  year: number;
  isFree: boolean;
  hiddenInShop: boolean;
  hiddenInLibrary: boolean;
}

export default function AdminCourses() {
  const { categoryId, subcategoryId } = useParams<{ categoryId: string; subcategoryId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [courseTitle, setCourseTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch category
  const { data: category } = useQuery<Category>({
    queryKey: ["/api/categories", categoryId],
    enabled: !!categoryId,
  });

  // Fetch subcategory
  const { data: subcategory } = useQuery<Subcategory>({
    queryKey: ["/api/subcategories", subcategoryId],
    enabled: !!subcategoryId,
  });

  // Fetch courses
  const { data: courses, isLoading } = useQuery<Course[]>({
    queryKey: ["/api/admin/courses", categoryId, subcategoryId],
    queryFn: async () => {
      const response = await fetch(`/api/admin/courses?categoryId=${categoryId}&subcategoryId=${subcategoryId}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch");
      return response.json();
    },
    enabled: !!categoryId && !!subcategoryId,
  });

  // Filter courses by search query
  const filteredCourses = courses?.filter((course) => {
    const raw: any = course as any;
    const core: any = raw.courses ?? raw;
    const title = (core.title ?? "").toLowerCase();
    const instructor = (core.instructor ?? core.authorName ?? "").toLowerCase();
    const description = (core.description ?? "").toLowerCase();
    const query = searchQuery.toLowerCase();
    
    return title.includes(query) || instructor.includes(query) || stripHtml(description).toLowerCase().includes(query);
  }) || [];

  // Pagination calculations (must be before useEffect that uses them)
  const totalCourses = filteredCourses.length;
  const totalPages = Math.ceil(totalCourses / COURSES_PER_PAGE);
  const startIndex = (currentPage - 1) * COURSES_PER_PAGE;
  const endIndex = startIndex + COURSES_PER_PAGE;
  const paginatedCourses = filteredCourses.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Clamp currentPage when data changes to avoid empty pages
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [filteredCourses, totalPages, currentPage]);

  // Create course mutation
  const createMutation = useMutation({
    mutationFn: async (title: string) => {
      const platform = category?.slug || "";
      const response = await apiRequest("POST", "/api/admin/courses", { title, platform });
      const course = await response.json();
      // After creating course, set its subcategories (M2M)
      if (subcategoryId) {
        await apiRequest("PUT", `/api/admin/courses/${course.id}/subcategories`, {
          subcategoryIds: [subcategoryId],
        });
      }
      return course;
    },
    onSuccess: (course) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/courses", categoryId, subcategoryId] });
      toast({ title: "Успешно", description: "Курс создан. Откройте редактор для заполнения деталей" });
      setIsAddDialogOpen(false);
      setCourseTitle("");
      // Redirect to course editor
      setLocation(`/admin/courses/${course.id}/edit`);
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось создать курс", variant: "destructive" });
    },
  });

  // Delete course mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/courses/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/courses", categoryId, subcategoryId] });
      toast({ title: "Успешно", description: "Курс удалён" });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось удалить курс", variant: "destructive" });
    },
  });

  // Toggle visibility mutation
  const toggleVisibilityMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("PATCH", `/api/admin/courses/${id}/toggle-visibility`, {
        field: "hiddenInShop",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/courses", categoryId, subcategoryId] });
      toast({ title: "Успешно", description: "Видимость курса изменена" });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось изменить видимость", variant: "destructive" });
    },
  });

  const getLevelName = (level: string | string[] | null) => {
    if (!level) return "";
    
    const names: Record<string, string> = {
      beginner: "Для новичков",
      intermediate: "Для опытных",
      advanced: "Продвинутый",
    };
    
    // Handle array of levels
    if (Array.isArray(level)) {
      return level.map(l => names[l] || l).join(", ");
    }
    
    // Handle single string level (backward compatibility)
    return names[level] || level;
  };

  const handleCreate = () => {
    if (!courseTitle.trim()) {
      toast({ title: "Ошибка", description: "Введите название курса", variant: "destructive" });
      return;
    }
    createMutation.mutate(courseTitle);
  };

  const breadcrumbs = [
    { label: "Категории", href: "/admin/categories" },
    { label: category?.name || "...", href: `/admin/categories/${categoryId}/subcategories` },
    { label: subcategory?.name || "..." },
  ];

  return (
    <AdminLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation(`/admin/categories/${categoryId}/subcategories`)}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">Курсы</h1>
            <p className="text-muted-foreground">
              {category?.name} → {subcategory?.name} • {courses?.length || 0} курсов
            </p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-course">
            <Plus className="mr-2 h-4 w-4" />
            Добавить курс
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Поиск курсов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-courses"
          />
        </div>

        {isLoading ? (
          <div className="text-center py-12">Загрузка...</div>
        ) : (
          <>
            {paginatedCourses.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {searchQuery ? "Курсы не найдены" : "Нет курсов"}
              </div>
            ) : (
              <div className="grid gap-4">
                {paginatedCourses.map((course, idx) => {
              // ⚙️ нормализуем форму: либо плоский объект, либо из джойна { courses: {...} }
              const raw: any = course as any;
              const core: any = raw.courses ?? raw;

              const title = core.title ?? "";
              const description = core.description ?? "";
              const instructor = core.instructor ?? core.authorName ?? "";
              const thumbnail =
                core.thumbnailUrl ?? core.thumbnailImage ?? null;
              const price =
                core.price !== undefined && core.price !== null
                  ? Number(core.price)
                  : null;
              const level = core.level ?? "";
              const year = core.year ?? "";
              const isFree = core.isFree ?? false;

              return (
                <Card
                  key={`${core.id ?? course.id}-${idx}`}
                  className={`hover-elevate transition-all ${core.hiddenInShop ? 'opacity-50' : ''}`}
                  data-testid={`card-course-${core.id ?? course.id}`}
                >
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      {thumbnail && (
                        <img
                          src={thumbnail}
                          alt={title}
                          className="w-24 h-24 object-cover rounded"
                        />
                      )}

                      <div className="flex-1">
                        <h3 className="text-xl font-bold mb-1">{title}</h3>
                        {instructor && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {instructor}
                          </p>
                        )}
                        {description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {stripHtml(description)}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span>
                            {isFree ? "Бесплатно" : (price !== null ? `${formatPrice(price)} ₽` : "—")}
                          </span>
                          {level && (
                            <span className="text-muted-foreground">{getLevelName(level)}</span>
                          )}
                          {year && (
                            <span className="text-muted-foreground">{year}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <div 
                          className="flex items-center gap-2 px-2"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                        >
                          <Label 
                            htmlFor={`visibility-${core.id ?? course.id}`} 
                            className="text-sm cursor-pointer"
                          >
                            Активен в магазине
                          </Label>
                          <Switch
                            id={`visibility-${core.id ?? course.id}`}
                            checked={!core.hiddenInShop}
                            onCheckedChange={(checked) => {
                              const cid = core.id ?? course.id;
                              if (cid) {
                                toggleVisibilityMutation.mutate(cid);
                              }
                            }}
                            data-testid={`switch-visibility-${core.id ?? course.id}`}
                          />
                        </div>

                        <Button
                          asChild
                          size="icon"
                          variant="ghost"
                          data-testid={`button-edit-course-${core.id ?? course.id}`}
                        >
                          <Link href={`/admin/courses/${core.id ?? course.id}/edit`}>
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>

                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const cid = core.id ?? course.id;
                            if (cid && confirm(`Удалить курс "${title}"?`)) {
                              deleteMutation.mutate(cid);
                            }
                          }}
                          data-testid={`button-delete-course-${core.id ?? course.id}`}
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
            )}

            {/* Pagination */}
            {filteredCourses.length > 0 && (
              <div className="flex items-center justify-center gap-4 mt-8">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages || 1}
                  totalItems={totalCourses}
                  itemLabel="курсов"
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Course Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md" data-testid="dialog-add-course">
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
                data-testid="input-course-title"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !createMutation.isPending) {
                    handleCreate();
                  }
                }}
                autoFocus
              />
              <p className="text-sm text-muted-foreground">
                Остальные поля можно заполнить в редакторе курса
              </p>
            </div>
            <Button
              className="w-full"
              onClick={handleCreate}
              disabled={createMutation.isPending}
              data-testid="button-submit-course"
            >
              {createMutation.isPending ? "Создание..." : "Создать и перейти к редактору"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
