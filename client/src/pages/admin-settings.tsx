import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Switch } from "@/components/ui/switch";
import { Save, Shield, ShieldOff } from "lucide-react";

interface AdminSettingsForm {
  siteName: string;
  siteDescription: string;
  supportEmail: string;
  telegramBotUsername: string;
  telegramBotToken: string;
  referralBonusPercent: number;
  require2FA: 'disabled' | 'optional' | 'mandatory';
  skip2FAOnLogin: boolean;
}

export default function AdminSettings() {
  const { toast } = useToast();

  // Fetch settings (use admin endpoint that returns all fields including token)
  const { data: settings, isLoading } = useQuery<AdminSettingsForm>({
    queryKey: ["/api/admin/settings"],
    placeholderData: {
      siteName: "Маркетплейс Академия",
      siteDescription: "Онлайн-курсы по маркетплейсам: Wildberries, Ozon, Яндекс.Маркет",
      supportEmail: "support@example.com",
      telegramBotUsername: "proverka_bot",
      telegramBotToken: "",
      referralBonusPercent: 30,
      require2FA: 'disabled',
      skip2FAOnLogin: false,
    },
  });

  // Initialize with placeholder data to avoid controlled/uncontrolled warnings
  const [formData, setFormData] = useState<AdminSettingsForm>({
    siteName: "Маркетплейс Академия",
    siteDescription: "Онлайн-курсы по маркетплейсам: Wildberries, Ozon, Яндекс.Маркет",
    supportEmail: "support@example.com",
    telegramBotUsername: "proverka_bot",
    telegramBotToken: "",
    referralBonusPercent: 30,
    require2FA: 'disabled',
    skip2FAOnLogin: false,
  });

  // Update form when settings load (normalize API data to ensure types are correct)
  useEffect(() => {
    if (settings) {
      setFormData({
        siteName: settings.siteName ?? "",
        siteDescription: settings.siteDescription ?? "",
        supportEmail: settings.supportEmail ?? "",
        telegramBotUsername: settings.telegramBotUsername ?? "",
        telegramBotToken: settings.telegramBotToken ?? "",
        referralBonusPercent: Number(settings.referralBonusPercent ?? 30),
        require2FA: settings.require2FA ?? 'disabled',
        skip2FAOnLogin: settings.skip2FAOnLogin ?? false,
      });
    }
  }, [settings]);

  // Save settings mutation
  const saveMutation = useMutation({
    mutationFn: async (data: AdminSettingsForm) => {
      return apiRequest("PUT", "/api/admin/settings", data);
    },
    onSuccess: () => {
      // Invalidate both admin and public settings caches
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/site-settings"] });
      toast({ title: "Успешно", description: "Настройки сохранены" });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось сохранить настройки", variant: "destructive" });
    },
  });

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  return (
    <AdminLayout breadcrumbs={[{ label: "Настройки" }]}>
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Настройки сайта</h1>
          <p className="text-muted-foreground">
            Управление общими настройками платформы
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Загрузка...</div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Основные настройки</CardTitle>
              <CardDescription>
                Изменение информации о сайте и контактных данных
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="siteName">Название сайта</Label>
                <Input
                  id="siteName"
                  value={formData.siteName}
                  onChange={(e) => setFormData({ ...formData, siteName: e.target.value })}
                  placeholder="Маркетплейс Академия"
                  data-testid="input-site-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="siteDescription">Описание сайта</Label>
                <Textarea
                  id="siteDescription"
                  value={formData.siteDescription}
                  onChange={(e) => setFormData({ ...formData, siteDescription: e.target.value })}
                  placeholder="Онлайн-курсы по маркетплейсам"
                  rows={3}
                  data-testid="input-site-description"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supportEmail">Email поддержки</Label>
                <Input
                  id="supportEmail"
                  type="email"
                  value={formData.supportEmail}
                  onChange={(e) => setFormData({ ...formData, supportEmail: e.target.value })}
                  placeholder="support@example.com"
                  data-testid="input-support-email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telegramBot">Telegram бот (username)</Label>
                <Input
                  id="telegramBot"
                  value={formData.telegramBotUsername}
                  onChange={(e) => setFormData({ ...formData, telegramBotUsername: e.target.value })}
                  placeholder="proverka1323bot"
                  data-testid="input-telegram-bot"
                />
                <p className="text-xs text-muted-foreground">
                  Используется для интеграции Telegram Login Widget (без @)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="telegramBotToken">Telegram Bot Token</Label>
                <Input
                  id="telegramBotToken"
                  type="password"
                  value={formData.telegramBotToken}
                  onChange={(e) => setFormData({ ...formData, telegramBotToken: e.target.value })}
                  placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                  data-testid="input-telegram-bot-token"
                />
                <p className="text-xs text-muted-foreground">
                  API токен бота от @BotFather для аутентификации пользователей
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="referralBonusPercent">Общий процент реферальных бонусов (%)</Label>
                <Input
                  id="referralBonusPercent"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.referralBonusPercent}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({ 
                      ...formData, 
                      referralBonusPercent: val === '' ? 0 : parseInt(val) 
                    });
                  }}
                  placeholder="10"
                  data-testid="input-referral-bonus-percent"
                />
                <p className="text-xs text-muted-foreground">
                  По умолчанию для всех пользователей. Можно назначить индивидуальный процент в разделе "Пользователи".
                </p>
              </div>

              <div className="space-y-3 p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <Label htmlFor="require2FA" className="text-base font-medium">
                    Режим двухфакторной аутентификации
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Управляет отображением модального окна с просьбой привязать Telegram и требованиями при регистрации.
                </p>
                <Select
                  value={formData.require2FA}
                  onValueChange={(value: 'disabled' | 'optional' | 'mandatory') => 
                    setFormData({ ...formData, require2FA: value })
                  }
                >
                  <SelectTrigger id="require2FA" data-testid="select-require-2fa">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="disabled" data-testid="option-2fa-disabled">
                      <div className="flex flex-col">
                        <span className="font-medium">Отключено</span>
                        <span className="text-xs text-muted-foreground">Модальное окно не показывается</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="optional" data-testid="option-2fa-optional">
                      <div className="flex flex-col">
                        <span className="font-medium">Рекомендуется (по умолчанию)</span>
                        <span className="text-xs text-muted-foreground">Желтое модальное окно, можно пропустить</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="mandatory" data-testid="option-2fa-mandatory">
                      <div className="flex flex-col">
                        <span className="font-medium">Обязательно</span>
                        <span className="text-xs text-muted-foreground">Красное модальное окно, нельзя пропустить, блокировка регистрации без кода</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3 p-4 rounded-lg border bg-card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldOff className="h-4 w-4 text-orange-500" />
                    <Label htmlFor="skip2FAOnLogin" className="text-base font-medium">
                      Пропустить 2FA при входе
                    </Label>
                  </div>
                  <Switch
                    id="skip2FAOnLogin"
                    checked={formData.skip2FAOnLogin}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, skip2FAOnLogin: checked })
                    }
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Когда включено, пользователи с привязанным Telegram входят на сайт только по email и паролю — без запроса кода подтверждения из Telegram. Полезно при замедлении Telegram.
                </p>
                {formData.skip2FAOnLogin && (
                  <div className="flex items-center gap-2 p-2 rounded bg-orange-50 border border-orange-200">
                    <ShieldOff className="h-4 w-4 text-orange-500 shrink-0" />
                    <p className="text-xs text-orange-700">
                      Внимание: 2FA при входе отключена для всех пользователей. Безопасность авторизации снижена.
                    </p>
                  </div>
                )}
              </div>

              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="w-full"
                data-testid="button-save-settings"
              >
                <Save className="mr-2 h-4 w-4" />
                {saveMutation.isPending ? "Сохранение..." : "Сохранить настройки"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
