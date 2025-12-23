import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueries } from "@tanstack/react-query";
import { Link, useParams, useLocation, useSearchParams } from "wouter";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, ArrowLeft, Edit2, Edit } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Course } from "@shared/schema";
import { formatPrice } from "@/lib/formatPrice";
import { Switch } from "@/components/ui/switch";
import { stripHtml } from "./admin-courses";

interface Category {
  id: string;
  name: string;
  nameEn: string;
  slug: string;
}

interface Subcategory {
  id: string;
  categoryId: string;
  name: string;
  nameEn: string;
  slug: string;
  description: string | null;
}

export default function AdminSubcategories() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [searchParams] = useSearchParams();
  const parentId = searchParams.get("parentId");

  // Диалоги
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddCourseDialogOpen, setIsAddCourseDialogOpen] = useState(false);

  // Формы
  const [addFormData, setAddFormData] = useState({ name: "", nameEn: "", description: "" });
  const [editFormData, setEditFormData] = useState<Subcategory | null>(null);
  const [courseTitle, setCourseTitle] = useState("");

  // Fetch category
  const { data: category } = useQuery<Category>({
    queryKey: ["/api/categories", categoryId],
    enabled: !!categoryId,
  });

  // Fetch subcategories
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

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: { name: string; nameEn: string; description?: string }) => {
      return apiRequest("POST", "/api/admin/subcategories", { ...data, categoryId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subcategories", categoryId] });
      toast({ title: "Успешно", description: "Подкатегория создана" });
      setIsAddDialogOpen(false);
      setAddFormData({ name: "", nameEn: "", description: "" });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось создать подкатегорию", variant: "destructive" });
    },
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Subcategory> }) => {
      return apiRequest("PUT", `/api/admin/subcategories/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subcategories", categoryId] });
      toast({ title: "Успешно", description: "Подкатегория обновлена" });
      setIsEditDialogOpen(false);
      setEditFormData(null);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || "Не удалось обновить подкатегорию";
      toast({ title: "Ошибка", description: message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/subcategories/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subcategories", categoryId] });
      toast({ title: "Успешно", description: "Подкатегория удалена" });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось удалить подкатегорию", variant: "destructive" });
    },
  });

  const deleteCourseMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/courses/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/courses", categoryId] });
      toast({ title: "Успешно", description: "Курс удалён" });
    },
  });

  const createCourseMutation = useMutation({
    mutationFn: async (title: string) => {
      const platform = category?.slug || "";
      const response = await apiRequest("POST", "/api/admin/courses", { title, platform });
      return response.json();
    },
    onSuccess: (course) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/courses"] });
      toast({ title: "Успешно", description: "Курс создан" });
      setIsAddCourseDialogOpen(false);
      setCourseTitle("");
      setLocation(`/admin/courses/${course.id}/edit?categoryId=${categoryId}&parentId=${parentId}`);
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось создать курс", variant: "destructive" });
    },
  });

  const toggleVisibilityMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("PATCH", `/api/admin/courses/${id}/toggle-visibility`, {
        field: "hiddenInShop",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/courses", categoryId] });
      toast({ title: "Успешно", description: "Видимость курса изменена" });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось изменить видимость", variant: "destructive" });
    },
  });


  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ["/api/admin/courses", categoryId],
    queryFn: async () => {
      const response = await fetch(`/api/admin/courses?categoryId=${categoryId}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch");
      return response.json();
    },
    enabled: !!categoryId,
  })

  console.log('courses', courses)

  const handleCreate = () => {
    if (!addFormData.name || !addFormData.nameEn) {
      toast({ title: "Ошибка", description: "Заполните обязательные поля", variant: "destructive" });
      return;
    }
    createMutation.mutate(addFormData);
  };

  const handleEdit = () => {
    if (!editFormData || !editFormData.name || !editFormData.nameEn) {
      toast({ title: "Ошибка", description: "Заполните обязательные поля", variant: "destructive" });
      return;
    }
    editMutation.mutate({
      id: editFormData.id,
      data: {
        name: editFormData.name,
        nameEn: editFormData.nameEn,
        description: editFormData.description || null,
      },
    });
  };

  const handleCreateCourse = () => {
    if (!courseTitle.trim()) {
      toast({ title: "Ошибка", description: "Введите название курса", variant: "destructive" });
      return;
    }
    createCourseMutation.mutate(courseTitle);
  };

  const breadcrumbs = [
    { label: "Категории", href: "/admin/categories" },
    { label: category?.name || "..." },
  ];

  const getSubcategoryNames = (levelIds: string[] | null | undefined): string => {
    if (!levelIds || !Array.isArray(levelIds) || levelIds.length === 0) return "";

    return levelIds
      .map((id) => {
        const sub = subcategories ? subcategories.find((s) => s.id === id) : []

        return sub?.name
      })
      .filter(Boolean)
      .join(", ");
  };

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

  // Фильтрация: курсы, у которых level содержит categoryId или parentId, И подкатегорий нет (пустой массив)
  const coursesWithoutSubcategory = useMemo(() => {
    if (!courses || courses.length === 0) {
      console.log('[coursesWithoutSubcategory] Нет курсов для обработки');
      return [];
    }

    return courses
      .map((course, idx) => {
        const query = subcategoriesQueries[idx];
        const subcatIds = query.data ?? [];
        const level = course.level ?? [];

        const isLevelArray = Array.isArray(level);
        const hasCategoryId = isLevelArray && level.includes(categoryId);
        const hasParentId = parentId ? isLevelArray && level.includes(parentId) : false;
        const matchesLevel = hasCategoryId || hasParentId;

        console.log(`[coursesWithoutSubcategory] Курс: "${course.title}" (ID: ${course.id})`);
        console.log(`  → level:`, level);
        console.log(`  → matchesLevel: ${matchesLevel} (categoryId: ${hasCategoryId}, parentId: ${hasParentId})`);
        console.log(`  → subcatIds:`, subcatIds);
        console.log(`  → query status: loading=${query.isLoading}, error=${query.isError}, success=${query.isSuccess}`);

        // Причина исключения
        if (!matchesLevel) {
          console.log(`  ❌ Исключён: не соответствует level (categoryId=${categoryId}, parentId=${parentId})`);
          return null;
        }

        if (query.isLoading) {
          console.log(`  ⏳ Исключён временно: подкатегории ещё загружаются`);
          return null;
        }

        if (query.isError) {
          console.log(`  ❌ Исключён: ошибка загрузки подкатегорий`);
          return null;
        }

        if (!course.level?.includes(categoryId)) {
          console.log(`  ❌ Исключён: не из этой категории:`, subcatIds);
          return null;
        }

        if (subcatIds.length > 0 && subcategories?.some(sub => subcatIds.includes(sub.id))) {
          console.log(`  ❌ Исключён: есть подкатегории (${subcatIds.length}):`, subcatIds);
          return null;
        }

        console.log(`  ✅ Включён: нет подкатегорий и соответствует level`);
        return course;
      })
      .filter(Boolean) as Course[];
  }, [courses, subcategoriesQueries, categoryId, parentId]);

  useEffect(() => {
    console.log('[coursesWithoutSubcategory] Финальный список:', coursesWithoutSubcategory.map(c => ({ title: c.title, id: c.id })));
  }, [coursesWithoutSubcategory]);

  return (
    <AdminLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/admin/categories")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">Подкатегории</h1>
            <p className="text-muted-foreground">
              {category?.name} • {subcategories?.length || 0} подкатегорий
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* <Link href={`/admin/categories/${categoryId}/courses?parentId=${parentId}`}>
              <Button variant="outline">
                Все курсы категории →
              </Button>
            </Link> */}
            <Button onClick={() => setIsAddCourseDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Добавить курс
            </Button>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Добавить подкатегорию
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Загрузка...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subcategories?.map((subcategory) => (
              <Card key={subcategory.id} className="hover-elevate transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-1">{subcategory.name}</h3>
                      <p className="text-sm text-muted-foreground">{subcategory.slug}</p>
                      {subcategory.description && (
                        <p className="text-sm text-muted-foreground mt-2">{subcategory.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditFormData(subcategory);
                          setIsEditDialogOpen(true);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          if (confirm(`Удалить подкатегорию "${subcategory.name}"?`)) {
                            deleteMutation.mutate(subcategory.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Link
                    href={`/admin/categories/${categoryId}/subcategories/${subcategory.id}/courses?parentId=${parentId}`}
                  >
                    <Button className="w-full" variant="outline">
                      Курсы →
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Диалог создания подкатегории */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить подкатегорию</DialogTitle>
            <DialogDescription>Создайте новую подкатегорию</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Название (RU) *</Label>
              <Input
                value={addFormData.name}
                onChange={(e) => setAddFormData({ ...addFormData, name: e.target.value })}
                placeholder="Для новичков"
              />
            </div>
            <div className="space-y-2">
              <Label>Название (EN) *</Label>
              <Input
                value={addFormData.nameEn}
                onChange={(e) => setAddFormData({ ...addFormData, nameEn: e.target.value })}
                placeholder="beginner"
              />
            </div>
            <div className="space-y-2">
              <Label>Описание</Label>
              <Textarea
                value={addFormData.description}
                onChange={(e) => setAddFormData({ ...addFormData, description: e.target.value })}
                placeholder="Курсы для начинающих..."
              />
            </div>
            <Button
              className="w-full"
              onClick={handleCreate}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Создание..." : "Создать"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Диалог редактирования подкатегории */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать подкатегорию</DialogTitle>
            <DialogDescription>Измените данные подкатегории</DialogDescription>
          </DialogHeader>
          {editFormData && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Название (RU) *</Label>
                <Input
                  value={editFormData.name}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Название (EN) *</Label>
                <Input
                  value={editFormData.nameEn}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, nameEn: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Описание</Label>
                <Textarea
                  value={editFormData.description || ""}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, description: e.target.value })
                  }
                  placeholder="Описание подкатегории..."
                />
              </div>
              <Button
                className="w-full"
                onClick={handleEdit}
                disabled={editMutation.isPending}
              >
                {editMutation.isPending ? "Сохранение..." : "Сохранить изменения"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <div className="grid gap-4 mt-4">
        {coursesWithoutSubcategory && coursesWithoutSubcategory.map((course, idx) => {
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

          const courseSubcategoryIds = subcategoriesQueries[idx]?.data ?? []
          const selectedSubcategories = subcategories?.filter(sub => courseSubcategoryIds.includes(sub.id))

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
                      {selectedSubcategories && Array.isArray(selectedSubcategories) && selectedSubcategories.length > 0 && selectedSubcategories.map(subcategory =>

                        <span key={subcategory.id} className="text-muted-foreground">
                          {subcategory.name}
                        </span>

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
                      <Link href={`/admin/courses/${core.id ?? course.id}/edit?subcategoryId=null&categoryId=${categoryId}&parentId=${parentId}`}>
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
                          deleteCourseMutation.mutate(cid);
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

      {/* Диалог создания курса */}
      <Dialog open={isAddCourseDialogOpen} onOpenChange={setIsAddCourseDialogOpen}>
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
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !createCourseMutation.isPending) {
                    handleCreateCourse();
                  }
                }}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleCreateCourse}
              disabled={createCourseMutation.isPending}
            >
              {createCourseMutation.isPending ? "Создание..." : "Создать и перейти к редактору"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}