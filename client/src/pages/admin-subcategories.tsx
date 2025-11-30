import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useParams, useLocation, useSearchParams } from "wouter";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";

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
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", nameEn: "", description: "" });
  const [searchParams] = useSearchParams()
  const parentId = searchParams.get('parentId')

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

  // Create subcategory mutation
  const createMutation = useMutation({
    mutationFn: async (data: { name: string; nameEn: string; description: string }) => {
      return apiRequest("POST", "/api/admin/subcategories", { ...data, categoryId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subcategories", categoryId] });
      toast({ title: "Успешно", description: "Подкатегория создана" });
      setIsAddDialogOpen(false);
      setFormData({ name: "", nameEn: "", description: "" });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось создать подкатегорию", variant: "destructive" });
    },
  });

  // Delete subcategory mutation
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

  const handleCreate = () => {
    if (!formData.name || !formData.nameEn) {
      toast({ title: "Ошибка", description: "Заполните обязательные поля", variant: "destructive" });
      return;
    }
    createMutation.mutate(formData);
  };

  const breadcrumbs = [
    { label: "Категории", href: "/admin/categories" },
    { label: category?.name || "..." },
  ];

  return (
    <AdminLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/admin/categories")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">Подкатегории</h1>
            <p className="text-muted-foreground">
              {category?.name} • {subcategories?.length || 0} подкатегорий
            </p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-subcategory">
            <Plus className="mr-2 h-4 w-4" />
            Добавить подкатегорию
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Загрузка...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subcategories?.map((subcategory) => (
              <Card
                key={subcategory.id}
                className="hover-elevate transition-all"
                data-testid={`card-subcategory-${subcategory.id}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-1">{subcategory.name}</h3>
                      <p className="text-sm text-muted-foreground">{subcategory.slug}</p>
                      {subcategory.description && (
                        <p className="text-sm text-muted-foreground mt-2">{subcategory.description}</p>
                      )}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (confirm(`Удалить подкатегорию "${subcategory.name}"?`)) {
                          deleteMutation.mutate(subcategory.id);
                        }
                      }}
                      data-testid={`button-delete-subcategory-${subcategory.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Link href={`/admin/categories/${categoryId}/subcategories/${subcategory.id}/courses?parentId=${parentId}`}>
                    <Button
                      className="w-full"
                      variant="outline"
                      data-testid={`button-view-courses-${subcategory.id}`}
                    >
                      Курсы →
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Subcategory Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent data-testid="dialog-add-subcategory">
          <DialogHeader>
            <DialogTitle>Добавить подкатегорию</DialogTitle>
            <DialogDescription>
              Создайте новую подкатегорию для выбранной категории
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Название (RU) *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Для новичков"
                data-testid="input-subcategory-name-ru"
              />
            </div>
            <div className="space-y-2">
              <Label>Название (EN) *</Label>
              <Input
                value={formData.nameEn}
                onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                placeholder="beginner"
                data-testid="input-subcategory-name-en"
              />
            </div>
            <div className="space-y-2">
              <Label>Описание</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Курсы для начинающих..."
                data-testid="input-subcategory-description"
              />
            </div>
            <Button
              className="w-full"
              onClick={handleCreate}
              disabled={createMutation.isPending}
              data-testid="button-submit-subcategory"
            >
              {createMutation.isPending ? "Создание..." : "Создать подкатегорию"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
