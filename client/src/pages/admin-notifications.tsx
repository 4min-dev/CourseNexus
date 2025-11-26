import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Bell, Send, Users, Upload, X, Image as ImageIcon } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ObjectUploader } from "@/components/ObjectUploader";

export default function AdminNotifications() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    imageUrl: "",
  });
  const [uploadedImage, setUploadedImage] = useState<{
    fileName: string;
    fileUrl: string;
  } | null>(null);

  // Handle image upload (get presigned URL)
  const handleImageUpload = async () => {
    try {
      const response = await fetch('/api/objects/upload-public', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to get public upload URL');
      const data = await response.json();
      return { method: 'PUT' as const, url: data.uploadURL, headers: data.uploadHeaders };
    } catch (error) {
      console.error('Error getting public upload URL:', error);
      toast({ title: "Ошибка при получении URL загрузки", variant: "destructive" });
      throw error;
    }
  };

  // Handle image upload complete (set public ACL)
  const handleImageUploadComplete = async (result: any) => {
    if (result.successful && result.successful.length > 0) {
      const uploadedFile = result.successful[0];
      const uploadURL = uploadedFile.uploadURL;
      const fileName = uploadedFile.name;

      try {
        // Set public ACL and get the correct public path
        const aclResponse = await fetch('/api/objects/acl-public', {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileURL: uploadURL,
          }),
        });

        if (!aclResponse.ok) {
          throw new Error('Failed to set public ACL');
        }

        const aclData = await aclResponse.json();
        const publicPath = aclData.publicPath;

        setUploadedImage({
          fileName,
          fileUrl: publicPath,
        });

        setFormData((prev) => ({
          ...prev,
          imageUrl: publicPath,
        }));

        toast({
          title: "Успешно",
          description: "Изображение загружено",
        });
      } catch (error) {
        console.error('Error setting public ACL:', error);
        toast({ 
          title: "Ошибка", 
          description: "Не удалось сделать изображение публичным", 
          variant: "destructive" 
        });
      }
    }
  };

  const broadcastMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("POST", "/api/admin/notifications/broadcast", data);
      return response.json();
    },
    onSuccess: (result: { count: number }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      toast({ 
        title: "Успешно", 
        description: `Уведомление отправлено ${result.count} пользователям` 
      });
      setFormData({ title: "", message: "", imageUrl: "" });
      setUploadedImage(null);
    },
    onError: () => {
      toast({ 
        title: "Ошибка", 
        description: "Не удалось отправить уведомление", 
        variant: "destructive" 
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast({ 
        title: "Ошибка", 
        description: "Введите заголовок уведомления", 
        variant: "destructive" 
      });
      return;
    }

    if (!formData.message.trim()) {
      toast({ 
        title: "Ошибка", 
        description: "Введите текст уведомления", 
        variant: "destructive" 
      });
      return;
    }

    broadcastMutation.mutate(formData);
  };

  return (
    <AdminLayout>
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Bell className="h-8 w-8" />
            Управление уведомлениями
          </h1>
          <p className="text-muted-foreground">
            Отправляйте важные уведомления всем пользователям платформы
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Отправить уведомление всем пользователям
            </CardTitle>
            <CardDescription>
              Уведомление будет отправлено всем зарегистрированным пользователям и появится в их списке уведомлений
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Заголовок уведомления</Label>
                <Input
                  id="title"
                  data-testid="input-notification-title"
                  placeholder="Например: Новые курсы на платформе!"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  maxLength={100}
                />
                <p className="text-xs text-muted-foreground">
                  {formData.title.length}/100 символов
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Текст уведомления</Label>
                <Textarea
                  id="message"
                  data-testid="textarea-notification-message"
                  placeholder="Введите подробное описание уведомления..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={6}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground">
                  {formData.message.length}/500 символов
                </p>
              </div>

              {/* Image Upload Section */}
              <div className="space-y-2">
                <Label>Изображение (опционально)</Label>
                <p className="text-sm text-muted-foreground">
                  Изображение будет отправлено вместе с текстом в Telegram
                </p>
                
                <ObjectUploader
                  onGetUploadParameters={handleImageUpload}
                  onComplete={handleImageUploadComplete}
                  buttonVariant="outline"
                  buttonClassName="h-9"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Загрузить изображение
                </ObjectUploader>

                {(uploadedImage || formData.imageUrl) && (
                  <div className="p-3 bg-muted rounded-md space-y-2">
                    <div className="relative aspect-video w-full bg-background rounded overflow-hidden">
                      <img
                        src={uploadedImage?.fileUrl || formData.imageUrl}
                        alt="Notification image"
                        className="w-full h-full object-cover"
                        data-testid="img-notification-preview"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {uploadedImage?.fileName || formData.imageUrl.split('/').pop()}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setUploadedImage(null);
                        setFormData((prev) => ({ ...prev, imageUrl: "" }));
                      }}
                      className="w-full"
                      data-testid="button-remove-notification-image"
                      type="button"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Удалить изображение
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1 text-sm">
                  <p className="font-medium">Как это работает?</p>
                  <p className="text-muted-foreground">
                    Уведомление будет добавлено в список каждого пользователя. Они увидят его в выпадающем меню и на странице уведомлений.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={broadcastMutation.isPending}
                  data-testid="button-send-broadcast"
                  className="flex-1"
                >
                  {broadcastMutation.isPending ? (
                    <>Отправка...</>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Отправить уведомление
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setFormData({ title: "", message: "", imageUrl: "" });
                    setUploadedImage(null);
                  }}
                  disabled={broadcastMutation.isPending}
                  data-testid="button-clear-form"
                >
                  Очистить
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Советы по использованию</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <ul className="list-disc list-inside space-y-1">
              <li>Используйте четкие и понятные заголовки</li>
              <li>Текст должен быть информативным, но кратким</li>
              <li>Избегайте слишком частых уведомлений, чтобы не раздражать пользователей</li>
              <li>Уведомления отлично подходят для анонсов новых курсов, акций и важных обновлений</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
