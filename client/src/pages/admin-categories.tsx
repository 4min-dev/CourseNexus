import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, FolderTree, Pencil, ChevronRight, ChevronDown } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface Category {
  id: string;
  parentId: string | null;
  name: string;
  nameEn: string;
  slug: string;
  isActive: boolean;
}

export default function AdminCategories() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", nameEn: "", parentId: "" });
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [selectedParentForAdd, setSelectedParentForAdd] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [deletionDialogOpen, setDeletionDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [deletionInfo, setDeletionInfo] = useState<{
    categoryCount: number;
    courseCount: number;
    childCategories: string[];
    courses: string[];
  } | null>(null);

  // Fetch all categories
  const { data: allCategories, isLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  // Filter main categories (no parent, exclude "Уровень" utility category)
  const mainCategories = allCategories?.filter(cat => !cat.parentId && cat.slug !== 'level') || [];

  // Get children for a parent category
  const getChildren = (parentId: string) =>
    allCategories?.filter(cat => cat.parentId === parentId) || [];

  // Create category mutation
  const createMutation = useMutation({
    mutationFn: async (data: { name: string; nameEn: string; parentId?: string }) => {
      return apiRequest("POST", "/api/admin/categories", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/categories"] });
      toast({ title: "Успешно", description: "Категория создана" });
      setIsAddDialogOpen(false);
      setFormData({ name: "", nameEn: "", parentId: "" });
      setSelectedParentForAdd(null);
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось создать категорию", variant: "destructive" });
    },
  });

  // Update category mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; name: string; nameEn: string }) => {
      return apiRequest("PATCH", `/api/admin/categories/${data.id}`, {
        name: data.name,
        nameEn: data.nameEn,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/categories"] });
      toast({ title: "Успешно", description: "Категория обновлена" });
      setIsEditDialogOpen(false);
      setEditingCategory(null);
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось обновить категорию", variant: "destructive" });
    },
  });

  // Toggle active status mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async (data: { id: string; isActive: boolean }) => {
      return apiRequest("PATCH", `/api/admin/categories/${data.id}`, {
        isActive: data.isActive,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/categories"] });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось изменить статус", variant: "destructive" });
    },
  });

  // Delete category mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/categories/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/categories"] });
      setDeletionDialogOpen(false);
      setCategoryToDelete(null);
      setDeletionInfo(null);
      toast({
        title: "Успешно",
        description: deletionInfo
          ? `Удалено: ${deletionInfo.categoryCount} категорий, ${deletionInfo.courseCount} курсов (со всеми видео и файлами)`
          : "Категория удалена"
      });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось удалить категорию", variant: "destructive" });
    },
  });

  const handleCreate = () => {
    if (!formData.name) {
      toast({ title: "Ошибка", description: "Заполните название категории", variant: "destructive" });
      return;
    }
    const dataToSend = {
      name: formData.name,
      ...(formData.nameEn && { nameEn: formData.nameEn }),
      ...(formData.parentId && { parentId: formData.parentId }),
    };
    createMutation.mutate(dataToSend);
  };

  const handleAddMainCategory = () => {
    setSelectedParentForAdd(null);
    setFormData({ name: "", nameEn: "", parentId: "" });
    setIsAddDialogOpen(true);
  };

  const handleAddChildCategory = (parentId: string) => {
    setSelectedParentForAdd(parentId);
    setFormData({ name: "", nameEn: "", parentId });
    setIsAddDialogOpen(true);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setIsEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!editingCategory || !editingCategory.name) {
      toast({ title: "Ошибка", description: "Заполните название категории", variant: "destructive" });
      return;
    }
    updateMutation.mutate({
      id: editingCategory.id,
      name: editingCategory.name,
      nameEn: editingCategory.nameEn,
    });
  };

  const handleToggleActive = (category: Category) => {
    toggleActiveMutation.mutate({
      id: category.id,
      isActive: !category.isActive,
    });
  };

  const toggleExpand = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const handleDeleteClick = async (category: Category) => {
    try {
      const response = await fetch(`/api/admin/categories/${category.id}/deletion-info`);
      if (!response.ok) throw new Error('Failed to fetch deletion info');
      const info = await response.json();
      setCategoryToDelete(category);
      setDeletionInfo(info);
      setDeletionDialogOpen(true);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось получить информацию об удалении",
        variant: "destructive"
      });
    }
  };

  const handleConfirmDelete = () => {
    if (categoryToDelete) {
      deleteMutation.mutate(categoryToDelete.id);
    }
  };

  return (
    <AdminLayout breadcrumbs={[{ label: "Категории" }]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Категории</h1>
            <p className="text-muted-foreground">
              Всего категорий: {allCategories?.length || 0} (главных: {mainCategories.length})
            </p>
          </div>
          <Button onClick={handleAddMainCategory} data-testid="button-add-category">
            <Plus className="mr-2 h-4 w-4" />
            Добавить главную категорию
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Загрузка...</div>
        ) : (
          <div className="space-y-8">
            {mainCategories.map((mainCategory) => {
              const children = getChildren(mainCategory.id);
              const isExpanded = expandedCategories.has(mainCategory.id);
              return (
                <div key={mainCategory.id} className="space-y-4">
                  {/* Main Category Card */}
                  <Card className="border-2 border-primary/20" data-testid={`card-main-category-${mainCategory.id}`}>
                    <CardHeader>
                      <div className="flex items-center justify-between gap-4">
                        <div
                          className="flex items-center gap-3 flex-1 cursor-pointer hover-elevate rounded-md p-2 -m-2"
                          onClick={() => toggleExpand(mainCategory.id)}
                          data-testid={`button-toggle-category-${mainCategory.id}`}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          )}
                          <FolderTree className="h-6 w-6 text-primary" />
                          <div>
                            <h2 className="text-2xl font-bold">{mainCategory.name}</h2>
                            <p className="text-sm text-muted-foreground">{mainCategory.nameEn}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`active-${mainCategory.id}`} className="text-sm">
                              {mainCategory.isActive ? "Активен" : "Неактивен"}
                            </Label>
                            <Switch
                              id={`active-${mainCategory.id}`}
                              checked={mainCategory.isActive}
                              onCheckedChange={() => handleToggleActive(mainCategory)}
                              data-testid={`switch-active-${mainCategory.id}`}
                            />
                          </div>
                          <Button
                            onClick={() => handleAddChildCategory(mainCategory.id)}
                            size="sm"
                            variant="outline"
                            data-testid={`button-add-child-${mainCategory.id}`}
                          >
                            <Plus className="mr-1 h-3 w-3" />
                            Добавить подкатегорию
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleEdit(mainCategory)}
                            data-testid={`button-edit-category-${mainCategory.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDeleteClick(mainCategory);
                            }}
                            data-testid={`button-delete-category-${mainCategory.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>

                  {/* Child Categories Grid */}
                  {children.length > 0 && isExpanded && (
                    <div className="ml-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {children.map((child) => (
                        <Card
                          key={child.id}
                          className="hover-elevate transition-all"
                          data-testid={`card-category-${child.id}`}
                        >
                          <CardHeader className="pb-3">
                            <div className="space-y-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <h3 className="text-lg font-bold mb-1">{child.name}</h3>
                                  <p className="text-xs text-muted-foreground">{child.nameEn}</p>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleEdit(child)}
                                    data-testid={`button-edit-category-${child.id}`}
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleDeleteClick(child);
                                    }}
                                    data-testid={`button-delete-category-${child.id}`}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Label htmlFor={`active-child-${child.id}`} className="text-xs">
                                  {child.isActive ? "Активен" : "Неактивен"}
                                </Label>
                                <Switch
                                  id={`active-child-${child.id}`}
                                  checked={child.isActive}
                                  onCheckedChange={() => handleToggleActive(child)}
                                  data-testid={`switch-active-${child.id}`}
                                />
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <Link href={`/admin/categories/${child.id}/subcategories`}>
                              <Button
                                className="w-full"
                                variant="outline"
                                size="sm"
                                data-testid={`button-view-subcategories-${child.id}`}
                              >
                                Уровни
                                <ChevronRight className="ml-2 h-3 w-3" />
                              </Button>
                            </Link>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Category Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent data-testid="dialog-add-category">
          <DialogHeader>
            <DialogTitle>
              {selectedParentForAdd
                ? `Добавить подкатегорию в "${mainCategories.find(c => c.id === selectedParentForAdd)?.name}"`
                : "Добавить главную категорию"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Название (RU) *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={selectedParentForAdd ? "Инфографика, фотошоп" : "Маркетинг"}
                data-testid="input-category-name-ru"
              />
            </div>
            <div className="space-y-2">
              <Label>Название (EN) (необязательно)</Label>
              <p className="text-xs text-muted-foreground">Если не указано, будет автоматически сгенерировано из русского названия</p>
              <Input
                value={formData.nameEn}
                onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                placeholder={selectedParentForAdd ? "infographics-photoshop" : "marketing"}
                data-testid="input-category-name-en"
              />
            </div>
            {!selectedParentForAdd && (
              <div className="space-y-2">
                <Label>Родительская категория (необязательно)</Label>
                <Select
                  value={formData.parentId || "none"}
                  onValueChange={(value) => setFormData({ ...formData, parentId: value === "none" ? "" : value })}
                >
                  <SelectTrigger data-testid="select-parent-category">
                    <SelectValue placeholder="Нет (главная категория)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Нет (главная категория)</SelectItem>
                    {mainCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button
              className="w-full"
              onClick={handleCreate}
              disabled={createMutation.isPending}
              data-testid="button-submit-category"
            >
              {createMutation.isPending ? "Создание..." : "Создать категорию"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent data-testid="dialog-edit-category">
          <DialogHeader>
            <DialogTitle>Переименовать категорию</DialogTitle>
          </DialogHeader>
          {editingCategory && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Название (RU) *</Label>
                <Input
                  value={editingCategory.name}
                  onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                  placeholder="Маркетинг"
                  data-testid="input-edit-category-name-ru"
                />
              </div>
              <div className="space-y-2">
                <Label>Название (EN)</Label>
                <Input
                  value={editingCategory.nameEn}
                  onChange={(e) => setEditingCategory({ ...editingCategory, nameEn: e.target.value })}
                  placeholder="marketing"
                  data-testid="input-edit-category-name-en"
                />
              </div>
              <Button
                className="w-full"
                onClick={handleUpdate}
                disabled={updateMutation.isPending}
                data-testid="button-update-category"
              >
                {updateMutation.isPending ? "Сохранение..." : "Сохранить изменения"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deletionDialogOpen} onOpenChange={setDeletionDialogOpen}>
        <AlertDialogContent data-testid="dialog-delete-category">
          <AlertDialogHeader>
            <AlertDialogTitle>Подтвердите удаление</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Вы действительно хотите удалить категорию <strong>{categoryToDelete?.name}</strong>?
                </p>
                {deletionInfo && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 space-y-2">
                    <p className="font-semibold text-destructive">⚠️ Будет безвозвратно удалено:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>
                        <strong>{deletionInfo.categoryCount}</strong> категорий
                        {deletionInfo.categoryCount > 1 && deletionInfo.childCategories.length > 0 && (
                          <span className="text-muted-foreground">
                            {' '}({deletionInfo.childCategories.slice(0, 3).join(', ')}
                            {deletionInfo.childCategories.length > 3 && '...'})
                          </span>
                        )}
                      </li>
                      <li>
                        <strong>{deletionInfo.courseCount}</strong> курсов со всеми видео, файлами и данными
                        {deletionInfo.courseCount > 0 && deletionInfo.courses.length > 0 && (
                          <span className="text-muted-foreground">
                            {' '}({deletionInfo.courses.slice(0, 2).join(', ')}
                            {deletionInfo.courses.length > 2 && '...'})
                          </span>
                        )}
                      </li>
                    </ul>
                    <p className="text-xs text-destructive font-semibold mt-2">
                      Это действие необратимо! Все видео и файлы будут удалены из хранилища.
                    </p>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Удаление..." : "Удалить всё"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
