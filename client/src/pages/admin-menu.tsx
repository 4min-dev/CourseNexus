import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, ExternalLink, GripVertical } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface MenuItem {
  id: string;
  label: string;
  path: string;
  isExternal: boolean;
  isVisible: boolean;
  displayOrder: number;
}

export default function AdminMenu() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    label: "",
    path: "",
    isExternal: false,
    isVisible: true,
  });

  // Fetch menu items
  const { data: menuItems, isLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/admin/menu"],
    placeholderData: [],
  });

  // Create menu item mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "/api/admin/menu", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/menu"] });
      toast({ title: "Успешно", description: "Пункт меню создан" });
      setIsAddDialogOpen(false);
      setFormData({ label: "", path: "", isExternal: false, isVisible: true });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось создать пункт меню", variant: "destructive" });
    },
  });

  // Delete menu item mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/menu/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/menu"] });
      toast({ title: "Успешно", description: "Пункт меню удален" });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось удалить пункт меню", variant: "destructive" });
    },
  });

  // Toggle visibility mutation
  const toggleVisibilityMutation = useMutation({
    mutationFn: async ({ id, isVisible }: { id: string; isVisible: boolean }) => {
      return apiRequest("PATCH", `/api/admin/menu/${id}`, { isVisible });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/menu"] });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось изменить видимость", variant: "destructive" });
    },
  });

  const handleCreate = () => {
    if (!formData.label || !formData.path) {
      toast({ title: "Ошибка", description: "Заполните все обязательные поля", variant: "destructive" });
      return;
    }
    createMutation.mutate(formData);
  };

  const sortedMenuItems = menuItems?.sort((a, b) => a.displayOrder - b.displayOrder) || [];

  return (
    <AdminLayout breadcrumbs={[{ label: "Меню сайта" }]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Меню сайта</h1>
            <p className="text-muted-foreground">
              Управление пунктами главного меню навигации
            </p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-menu-item">
            <Plus className="mr-2 h-4 w-4" />
            Добавить пункт
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Загрузка...</div>
        ) : sortedMenuItems.length > 0 ? (
          <div className="space-y-2">
            {sortedMenuItems.map((item) => (
              <Card key={item.id} data-testid={`card-menu-item-${item.id}`}>
                <CardContent className="flex items-center gap-4 p-4">
                  <GripVertical className="h-5 w-5 text-muted-foreground" />
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{item.label}</h3>
                      {item.isExternal && (
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      )}
                      {!item.isVisible && (
                        <span className="text-xs px-2 py-1 bg-muted rounded">Скрыт</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{item.path}</p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`visible-${item.id}`} className="text-sm cursor-pointer">
                        Видимый
                      </Label>
                      <Switch
                        id={`visible-${item.id}`}
                        checked={item.isVisible}
                        onCheckedChange={(checked) => {
                          toggleVisibilityMutation.mutate({ id: item.id, isVisible: checked });
                        }}
                        data-testid={`switch-visibility-${item.id}`}
                      />
                    </div>

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(`Удалить пункт меню "${item.label}"?`)) {
                          deleteMutation.mutate(item.id);
                        }
                      }}
                      data-testid={`button-delete-menu-item-${item.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">Нет пунктов меню</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Menu Item Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent data-testid="dialog-add-menu-item">
          <DialogHeader>
            <DialogTitle>Добавить пункт меню</DialogTitle>
            <DialogDescription>
              Создайте новый пункт навигационного меню
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Название *</Label>
              <Input
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="Главная"
                data-testid="input-menu-label"
              />
            </div>

            <div className="space-y-2">
              <Label>Путь или URL *</Label>
              <Input
                value={formData.path}
                onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                placeholder="/shop или https://example.com"
                data-testid="input-menu-path"
              />
              <p className="text-xs text-muted-foreground">
                Для внутренних ссылок используйте /path, для внешних - https://
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="isExternal"
                checked={formData.isExternal}
                onCheckedChange={(checked) => setFormData({ ...formData, isExternal: checked })}
                data-testid="switch-is-external"
              />
              <Label htmlFor="isExternal" className="cursor-pointer">
                Внешняя ссылка
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="isVisible"
                checked={formData.isVisible}
                onCheckedChange={(checked) => setFormData({ ...formData, isVisible: checked })}
                data-testid="switch-is-visible"
              />
              <Label htmlFor="isVisible" className="cursor-pointer">
                Видимый
              </Label>
            </div>

            <Button
              className="w-full"
              onClick={handleCreate}
              disabled={createMutation.isPending}
              data-testid="button-submit-menu-item"
            >
              {createMutation.isPending ? "Создание..." : "Создать пункт меню"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
