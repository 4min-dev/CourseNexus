import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Handshake, Plus, Edit, Trash2, ExternalLink, Building2, ChevronUp, ChevronDown, Upload, Image as ImageIcon } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { Partner, InsertPartner } from "@shared/schema";

export default function AdminPartners() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [deletingPartnerId, setDeletingPartnerId] = useState<string | null>(null);

  const { data: partners, isLoading } = useQuery<Partner[]>({
    queryKey: ["/api/admin/partners"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertPartner) => {
      return await apiRequest("POST", "/api/admin/partners", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/partners"] });
      queryClient.invalidateQueries({ queryKey: ["/api/partners"] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Партнёр создан",
        description: "Партнёр успешно добавлен",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось создать партнёра",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertPartner> }) => {
      return await apiRequest("PUT", `/api/admin/partners/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/partners"] });
      queryClient.invalidateQueries({ queryKey: ["/api/partners"] });
      setEditingPartner(null);
      toast({
        title: "Партнёр обновлён",
        description: "Изменения сохранены",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить партнёра",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/admin/partners/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/partners"] });
      queryClient.invalidateQueries({ queryKey: ["/api/partners"] });
      setDeletingPartnerId(null);
      toast({
        title: "Партнёр удалён",
        description: "Партнёр успешно удалён",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось удалить партнёра",
        variant: "destructive",
      });
    },
  });

  const movePartner = async (partnerId: string, direction: "up" | "down") => {
    if (!partners) return;
    
    const currentIndex = partners.findIndex(p => p.id === partnerId);
    if (currentIndex === -1) return;
    
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= partners.length) return;

    const currentPartner = partners[currentIndex];
    const targetPartner = partners[targetIndex];

    await updateMutation.mutateAsync({
      id: currentPartner.id,
      data: { ...currentPartner, displayOrder: targetPartner.displayOrder },
    });

    await updateMutation.mutateAsync({
      id: targetPartner.id,
      data: { ...targetPartner, displayOrder: currentPartner.displayOrder },
    });
  };

  return (
    <AdminLayout
      breadcrumbs={[
        { label: "Админ панель", href: "/admin" },
        { label: "Партнёры" },
      ]}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Handshake className="h-8 w-8" />
              Управление партнёрами
            </h1>
            <p className="text-muted-foreground mt-2">
              Добавляйте и редактируйте партнёров платформы
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-partner">
                <Plus className="mr-2 h-4 w-4" />
                Добавить партнёра
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Создать партнёра</DialogTitle>
                <DialogDescription>
                  Добавьте нового партнёра платформы
                </DialogDescription>
              </DialogHeader>
              <PartnerForm
                onSubmit={(data) => createMutation.mutate(data)}
                onCancel={() => setIsCreateDialogOpen(false)}
                isPending={createMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-16 w-16 rounded-full mx-auto" />
                  <Skeleton className="h-6 w-3/4 mx-auto mt-4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-16 w-full mt-4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : partners && partners.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {partners.map((partner, index) => (
              <Card key={partner.id} data-testid={`card-partner-${partner.id}`}>
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      {partner.logoUrl ? (
                        <img 
                          src={partner.logoUrl} 
                          alt={partner.name}
                          className="h-16 w-16 object-contain rounded-full border-2 border-purple-500/20"
                        />
                      ) : (
                        <div className="h-16 w-16 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full flex items-center justify-center border-2 border-purple-500/20">
                          <Building2 className="h-8 w-8 text-purple-500" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate" data-testid={`text-partner-name-${partner.id}`}>
                          {partner.name}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={partner.isActive ? "default" : "secondary"} data-testid={`badge-status-${partner.id}`}>
                            {partner.isActive ? "Активен" : "Неактивен"}
                          </Badge>
                          <Badge variant="outline" data-testid={`badge-order-${partner.id}`}>
                            #{partner.displayOrder}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-1">Описание</h4>
                    <p className="text-sm line-clamp-2" data-testid={`text-description-${partner.id}`}>
                      {partner.description}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-1">Услуги</h4>
                    <p className="text-sm line-clamp-2" data-testid={`text-services-${partner.id}`}>
                      {partner.services}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-1">Контакт</h4>
                    <a 
                      href={partner.contactUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-purple-500 hover:underline flex items-center gap-1"
                      data-testid={`link-contact-${partner.id}`}
                    >
                      <ExternalLink className="h-3 w-3" />
                      {new URL(partner.contactUrl).hostname}
                    </a>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setEditingPartner(partner)}
                      data-testid={`button-edit-${partner.id}`}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Редактировать
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeletingPartnerId(partner.id)}
                      data-testid={`button-delete-${partner.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => movePartner(partner.id, "up")}
                        disabled={index === 0}
                        data-testid={`button-move-up-${partner.id}`}
                      >
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => movePartner(partner.id, "down")}
                        disabled={index === partners.length - 1}
                        data-testid={`button-move-down-${partner.id}`}
                      >
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12">
            <div className="text-center space-y-4">
              <Handshake className="h-16 w-16 mx-auto text-muted-foreground" />
              <h3 className="text-xl font-semibold">Партнёров пока нет</h3>
              <p className="text-muted-foreground">
                Добавьте первого партнёра, нажав кнопку выше
              </p>
            </div>
          </Card>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingPartner} onOpenChange={(open) => !open && setEditingPartner(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Редактировать партнёра</DialogTitle>
            <DialogDescription>
              Обновите информацию о партнёре
            </DialogDescription>
          </DialogHeader>
          {editingPartner && (
            <PartnerForm
              partner={editingPartner}
              onSubmit={(data) => updateMutation.mutate({ id: editingPartner.id, data })}
              onCancel={() => setEditingPartner(null)}
              isPending={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingPartnerId} onOpenChange={(open) => !open && setDeletingPartnerId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить партнёра?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Партнёр будет удалён из системы.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingPartnerId && deleteMutation.mutate(deletingPartnerId)}
              data-testid="button-confirm-delete"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}

function PartnerForm({ 
  partner, 
  onSubmit, 
  onCancel, 
  isPending 
}: { 
  partner?: Partner | null; 
  onSubmit: (data: any) => void; 
  onCancel: () => void;
  isPending?: boolean;
}) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: partner?.name || "",
    description: partner?.description || "",
    services: partner?.services || "",
    contactUrl: partner?.contactUrl || "",
    logoUrl: partner?.logoUrl || "",
    coverImageUrl: partner?.coverImageUrl || "",
    displayOrder: partner?.displayOrder ?? 0,
    isActive: partner?.isActive ?? true,
  });

  const handleLogoUpload = async (file: any) => {
    const response = await apiRequest("POST", "/api/objects/upload-public");
    const data = await response.json();
    return {
      method: "PUT" as const,
      url: data.uploadURL,
      headers: data.uploadHeaders,
    };
  };

  const handleCoverUpload = async (file: any) => {
    const response = await apiRequest("POST", "/api/objects/upload-public");
    const data = await response.json();
    return {
      method: "PUT" as const,
      url: data.uploadURL,
      headers: data.uploadHeaders,
    };
  };

  const handleLogoComplete = async (result: any) => {
    try {
      const uploadedFile = result.successful?.[0];
      if (!uploadedFile) return;

      const uploadURL = uploadedFile.uploadURL;
      
      // Set public ACL and get normalized path
      const aclResponse = await apiRequest("PUT", "/api/objects/acl-public", { fileURL: uploadURL });
      const aclData = await aclResponse.json();
      const logoUrl = aclData.publicPath;
      
      setFormData(prev => ({ ...prev, logoUrl }));
    } catch (error) {
      console.error('Error processing logo upload:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось обработать загрузку логотипа",
        variant: "destructive",
      });
    }
  };

  const handleCoverComplete = async (result: any) => {
    try {
      const uploadedFile = result.successful?.[0];
      if (!uploadedFile) return;

      const uploadURL = uploadedFile.uploadURL;
      
      // Set public ACL and get normalized path
      const aclResponse = await apiRequest("PUT", "/api/objects/acl-public", { fileURL: uploadURL });
      const aclData = await aclResponse.json();
      const coverImageUrl = aclData.publicPath;
      
      setFormData(prev => ({ ...prev, coverImageUrl }));
    } catch (error) {
      console.error('Error processing cover upload:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось обработать загрузку обложки",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Название партнёра</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="ООО 'Компания'"
          required
          data-testid="input-partner-name"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Описание</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Краткое описание партнёра..."
          rows={3}
          required
          data-testid="input-partner-description"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="services">Услуги</Label>
        <Textarea
          id="services"
          value={formData.services}
          onChange={(e) => setFormData(prev => ({ ...prev, services: e.target.value }))}
          placeholder="Какие услуги предоставляет партнёр..."
          rows={3}
          required
          data-testid="input-partner-services"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="contactUrl">Ссылка для связи</Label>
        <Input
          id="contactUrl"
          type="url"
          value={formData.contactUrl}
          onChange={(e) => setFormData(prev => ({ ...prev, contactUrl: e.target.value }))}
          placeholder="https://t.me/username или https://example.com"
          required
          data-testid="input-partner-contact-url"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Logo Upload */}
        <div className="space-y-2">
          <Label>Логотип (необязательно)</Label>
          {formData.logoUrl && (
            <div className="relative aspect-square w-full max-w-[200px] mb-2">
              <img 
                src={formData.logoUrl} 
                alt="Logo preview" 
                className="w-full h-full object-contain rounded border-2 border-purple-500/20"
              />
            </div>
          )}
          <ObjectUploader
            onGetUploadParameters={handleLogoUpload}
            onComplete={handleLogoComplete}
            buttonVariant="outline"
            data-testid="upload-partner-logo"
          >
            <Upload className="mr-2 h-4 w-4" />
            Загрузить логотип
          </ObjectUploader>
        </div>

        {/* Cover Image Upload */}
        <div className="space-y-2">
          <Label>Обложка/баннер (необязательно)</Label>
          {formData.coverImageUrl && (
            <div className="relative aspect-video w-full max-w-[300px] mb-2">
              <img 
                src={formData.coverImageUrl} 
                alt="Cover preview" 
                className="w-full h-full object-cover rounded border-2 border-purple-500/20"
              />
            </div>
          )}
          <ObjectUploader
            onGetUploadParameters={handleCoverUpload}
            onComplete={handleCoverComplete}
            buttonVariant="outline"
            data-testid="upload-partner-cover"
          >
            <ImageIcon className="mr-2 h-4 w-4" />
            Загрузить обложку
          </ObjectUploader>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="displayOrder">Порядок отображения</Label>
        <Input
          id="displayOrder"
          type="number"
          value={formData.displayOrder}
          onChange={(e) => setFormData(prev => ({ ...prev, displayOrder: parseInt(e.target.value) || 0 }))}
          min={0}
          data-testid="input-partner-display-order"
        />
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="isActive"
          checked={formData.isActive}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: !!checked }))}
          data-testid="checkbox-partner-is-active"
        />
        <Label htmlFor="isActive" className="cursor-pointer">
          Активен (отображается на публичной странице)
        </Label>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
          Отмена
        </Button>
        <Button type="submit" disabled={isPending} data-testid="button-submit">
          {isPending ? "Сохранение..." : partner ? "Сохранить" : "Создать"}
        </Button>
      </DialogFooter>
    </form>
  );
}
