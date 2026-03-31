import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Shield, ExternalLink } from "lucide-react";
import { SiTelegram } from "react-icons/si";
import { NeonLogo } from "@/components/NeonLogo";
import { ShopPreview } from "@/components/shop-preview";
import { useReferralTracking } from "@/hooks/useReferralTracking";
import { useLandingVisit } from "@/hooks/useLandingVisit";
import { debugLog } from "@/lib/debug";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // Use referral tracking hook to get and manage referral code
  const { referralCode, hasReferral, clearReferral } = useReferralTracking();
  
  // Track landing visit for conversion analytics
  const { visitId: landingVisitId, status: visitStatus, clearVisitId } = useLandingVisit();
  
  // Query for site settings (to check if 2FA is required and get bot username)
  const { data: siteSettings } = useQuery<{ 
    require2FA: 'disabled' | 'optional' | 'mandatory';
    telegramBotUsername: string;
  }>({
    queryKey: ["/api/site-settings"],
  });
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    referralCode: "",
    telegramCode: "",
  });
  
  // Restore state from localStorage on mount (must run FIRST)
  useEffect(() => {
    try {
      const savedState = localStorage.getItem('registerFormState');
      if (savedState) {
        const parsed = JSON.parse(savedState);
        
        // Restore non-sensitive fields only
        setFormData(prev => ({
          ...prev,
          email: parsed.email || "",
          firstName: parsed.firstName || "",
          lastName: parsed.lastName || "",
          // Do NOT restore referralCode - managed by useReferralTracking hook
          // Do NOT restore password or telegramCode - security risk!
        }));
      }
    } catch (error) {
      console.error('[Register] Error restoring state from localStorage:', error);
    }
  }, []);
  
  // Sync referral code from hook to form data
  useEffect(() => {
    if (referralCode) {
      setFormData(prev => ({ ...prev, referralCode }));
    }
  }, [referralCode]);

  // Save state to localStorage whenever it changes (excluding sensitive data)
  useEffect(() => {
    try {
      const stateToSave = {
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        // Do NOT save referralCode - managed by useReferralTracking hook
        // Do NOT save password or telegramCode - security risk!
        timestamp: Date.now(),
      };
      localStorage.setItem('registerFormState', JSON.stringify(stateToSave));
    } catch (error) {
      console.error('[Register] Error saving state to localStorage:', error);
    }
  }, [formData.email, formData.firstName, formData.lastName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if mandatory 2FA is enabled and Telegram code is missing
    if (siteSettings?.require2FA === 'mandatory' && !formData.telegramCode) {
      toast({
        title: "Требуется Telegram код",
        description: "Для регистрации необходимо привязать Telegram. Пожалуйста, получите код от бота.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);

    try {
      const normalizedReferralCode = formData.referralCode.trim().toUpperCase();
      const normalizedLandingVisitId = landingVisitId && UUID_REGEX.test(landingVisitId)
        ? landingVisitId
        : undefined;

      const response = await apiRequest("POST", "/api/register", {
        ...formData,
        referralCode: normalizedReferralCode || undefined,
        telegramCode: formData.telegramCode || undefined,
        landingVisitId: normalizedLandingVisitId,
      });

      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      // Clear localStorage on successful registration
      localStorage.removeItem('registerFormState');
      
      // Clear referral code from tracking system
      clearReferral();
      
      // Clear landing visit tracking
      clearVisitId();
      
      toast({
        title: "Регистрация успешна!",
        description: "Добро пожаловать на платформу",
      });
      
      // Set flag in sessionStorage if user didn't link Telegram during registration
      const hasTelegramCode = formData.telegramCode && formData.telegramCode.length > 0;
      
      if (!hasTelegramCode) {
        // Set flag to show Telegram reminder on /shop page
        sessionStorage.setItem('showTelegramReminder', 'true');
        debugLog('[Register] Set showTelegramReminder flag in sessionStorage');
      }
      
      // Navigate to shop - modal will be shown there if flag is set
      setLocation("/shop");
    } catch (error: any) {
      toast({
        title: "Ошибка регистрации",
        description: error.message || "Произошла ошибка при регистрации",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="relative min-h-screen overflow-hidden isolate bg-background">
      <div className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden">
        <ShopPreview />
      </div>

      <div
        className="absolute inset-0 z-10 bg-gradient-to-br from-background/42 via-background/34 to-background/42"
        style={{
          backdropFilter: 'blur(3px) saturate(118%)',
          WebkitBackdropFilter: 'blur(3px) saturate(118%)',
        }}
      />

      <div className="relative z-20 min-h-screen flex items-center justify-center p-4 animate-in fade-in duration-300">
        {/* Back button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 left-4 z-10 bg-card/80 backdrop-blur-sm hover:bg-card"
          onClick={() => window.history.back()}
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <Card className="w-full max-w-md animate-in slide-in-from-bottom-4 duration-500 shadow-2xl border-border/50 bg-card/95 backdrop-blur-sm">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-4">
              <NeonLogo variant="pulse" />
            </div>
            <CardTitle className="text-2xl text-center">Регистрация</CardTitle>
            <CardDescription className="text-center">
              Создайте аккаунт для доступа к курсам
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Имя</Label>
                  <Input
                    id="firstName"
                    placeholder="Иван"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                    data-testid="input-first-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Фамилия</Label>
                  <Input
                    id="lastName"
                    placeholder="Иванов"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required
                    data-testid="input-last-name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="ivan@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  data-testid="input-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Пароль</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Минимум 6 символов"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={6}
                  data-testid="input-password"
                />
              </div>
              
              {/* Only show referral code field if user didn't come from referral link */}
              {!hasReferral && (
                <div className="space-y-2">
                  <Label htmlFor="referralCode">Реферальный код (необязательно)</Label>
                  <Input
                    id="referralCode"
                    placeholder="ABCD1234"
                    value={formData.referralCode}
                    onChange={(e) => setFormData({ ...formData, referralCode: e.target.value.toUpperCase() })}
                    data-testid="input-referral-code"
                  />
                </div>
              )}

              {/* Telegram Integration */}
              <Alert className="border-primary/20 bg-primary/5" data-testid="alert-telegram-info">
                <Shield className="h-4 w-4 text-primary" />
                <AlertTitle className="text-sm font-semibold flex items-center gap-2">
                  <SiTelegram className="h-4 w-4" />
                  Привязать Telegram для 2FA
                </AlertTitle>
                <AlertDescription className="text-xs space-y-3">
                  <div className="space-y-1 text-muted-foreground">
                    <p className="font-medium">Как привязать:</p>
                    <ol className="list-decimal list-inside space-y-0.5 ml-1">
                      <li>
                        Откройте бота{" "}
                        <button
                          type="button"
                          onClick={() => window.open(`https://t.me/${siteSettings?.telegramBotUsername || 'proverka1323bot'}`, '_blank')}
                          className="text-primary hover:underline font-medium inline-flex items-center gap-1 max-[360px]:max-w-full max-[360px]:text-[11px] max-[360px]:leading-tight max-[360px]:break-all"
                          data-testid="link-telegram-bot"
                        >
                          @{siteSettings?.telegramBotUsername || 'proverka1323bot'}
                          <ExternalLink className="h-3 w-3" />
                        </button>
                      </li>
                      <li>Отправьте команду /start</li>
                      <li>Введите полученный код ниже</li>
                    </ol>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="telegramCode" className="text-xs">
                      Код из Telegram
                    </Label>
                    <Input
                      id="telegramCode"
                      placeholder="123456"
                      value={formData.telegramCode}
                      onChange={(e) => setFormData({ ...formData, telegramCode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                      maxLength={6}
                      className="text-center text-lg tracking-widest font-mono"
                      data-testid="input-telegram-code"
                    />
                    <p className="text-xs text-muted-foreground">
                      Можно пропустить и привязать позже в настройках
                    </p>
                  </div>
                </AlertDescription>
              </Alert>

              <Button
                type="submit"
                className="w-full max-[360px]:text-sm max-[360px]:px-2"
                disabled={isLoading}
                data-testid="button-register"
              >
                {isLoading ? "Регистрация..." : "Зарегистрироваться"}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm max-[360px]:text-xs">
              <span className="text-muted-foreground">Уже есть аккаунт? </span>
              <Button
                variant="ghost"
                className="p-0 h-auto max-[360px]:px-1 max-[360px]:whitespace-nowrap"
                onClick={() => setLocation("/login")}
                data-testid="link-login"
              >
                Войти
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
