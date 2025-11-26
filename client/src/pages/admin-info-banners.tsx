import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, Terminal } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { InfoBanner } from "@shared/schema";

export default function AdminInfoBanners() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<InfoBanner | null>(null);
  const [formData, setFormData] = useState({
    message: "",
    displayOrder: 0,
    isActive: true,
  });

  const { data: banners, isLoading } = useQuery<InfoBanner[]>({
    queryKey: ["/api/admin/info-banners"],
    placeholderData: [],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "/api/admin/info-banners", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/info-banners"] });
      queryClient.invalidateQueries({ queryKey: ["/api/info-banners"] });
      toast({ title: "Успешно", description: "Баннер создан" });
      closeDialog();
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось создать баннер", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      return apiRequest("PUT", `/api/admin/info-banners/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/info-banners"] });
      queryClient.invalidateQueries({ queryKey: ["/api/info-banners"] });
      toast({ title: "Успешно", description: "Баннер обновлен" });
      closeDialog();
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось обновить баннер", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/info-banners/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/info-banners"] });
      queryClient.invalidateQueries({ queryKey: ["/api/info-banners"] });
      toast({ title: "Успешно", description: "Баннер удален" });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось удалить баннер", variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return apiRequest("PUT", `/api/admin/info-banners/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/info-banners"] });
      queryClient.invalidateQueries({ queryKey: ["/api/info-banners"] });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось изменить статус", variant: "destructive" });
    },
  });

  const openAddDialog = () => {
    setEditingBanner(null);
    setFormData({ message: "", displayOrder: 0, isActive: true });
    setIsDialogOpen(true);
  };

  const openEditDialog = (banner: InfoBanner) => {
    setEditingBanner(banner);
    setFormData({
      message: banner.message,
      displayOrder: banner.displayOrder,
      isActive: banner.isActive,
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingBanner(null);
    setFormData({ message: "", displayOrder: 0, isActive: true });
  };

  const handleSubmit = () => {
    if (!formData.message.trim()) {
      toast({ title: "Ошибка", description: "Введите текст сообщения", variant: "destructive" });
      return;
    }

    if (editingBanner) {
      updateMutation.mutate({ id: editingBanner.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const sortedBanners = banners?.sort((a, b) => a.displayOrder - b.displayOrder) || [];

  return (
    <AdminLayout breadcrumbs={[{ label: "Информационные баннеры" }]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Информационные баннеры</h1>
            <p className="text-muted-foreground">
              Управление баннерами с эффектом терминала под шапкой сайта
            </p>
          </div>
          <Button onClick={openAddDialog} data-testid="button-add-banner">
            <Plus className="mr-2 h-4 w-4" />
            Добавить баннер
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Загрузка...</div>
        ) : sortedBanners.length > 0 ? (
          <div className="space-y-2">
            {sortedBanners.map((banner) => (
              <Card key={banner.id} data-testid={`card-banner-${banner.id}`}>
                <CardContent className="flex items-center gap-4 p-4">
                  <Terminal className="h-5 w-5 text-primary flex-shrink-0" />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs px-2 py-1 bg-muted rounded">
                        #{banner.displayOrder}
                      </span>
                      {!banner.isActive && (
                        <span className="text-xs px-2 py-1 bg-red-500/20 text-red-500 rounded">
                          Неактивен
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-mono truncate">{banner.message}</p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`active-${banner.id}`} className="text-sm cursor-pointer">
                        Активен
                      </Label>
                      <Switch
                        id={`active-${banner.id}`}
                        checked={banner.isActive}
                        onCheckedChange={(checked) => {
                          toggleActiveMutation.mutate({ id: banner.id, isActive: checked });
                        }}
                        data-testid={`switch-active-${banner.id}`}
                      />
                    </div>

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openEditDialog(banner)}
                      data-testid={`button-edit-banner-${banner.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(`Удалить баннер?`)) {
                          deleteMutation.mutate(banner.id);
                        }
                      }}
                      data-testid={`button-delete-banner-${banner.id}`}
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
              <Terminal className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Нет информационных баннеров</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent data-testid="dialog-banner-form">
          <DialogHeader>
            <DialogTitle>
              {editingBanner ? "Редактировать баннер" : "Добавить баннер"}
            </DialogTitle>
            <DialogDescription>
              {editingBanner ? "Измените настройки информационного баннера" : "Создайте новый информационный баннер"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="message">Текст сообщения *</Label>
              <Textarea
                id="message"
                placeholder="Введите текст для баннера..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={3}
                data-testid="input-message"
              />
              <p className="text-xs text-muted-foreground">
                Текст будет отображаться с эффектом терминальной печати
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayOrder">Порядок отображения</Label>
              <Input
                id="displayOrder"
                type="number"
                value={formData.displayOrder}
                onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                data-testid="input-display-order"
              />
              <p className="text-xs text-muted-foreground">
                Баннеры с меньшим номером отображаются раньше
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                data-testid="switch-is-active"
              />
              <Label htmlFor="isActive" className="cursor-pointer">
                Баннер активен
              </Label>
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button variant="outline" onClick={closeDialog} data-testid="button-cancel">
                Отмена
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-save"
              >
                {editingBanner ? "Сохранить" : "Создать"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
