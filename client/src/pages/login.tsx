import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Loader2, AlertCircle, CheckCircle2, XCircle, RefreshCw, ExternalLink, Wifi, Link2, Lock, Bell } from "lucide-react";
import { SiTelegram } from "react-icons/si";
import Shop from "@/pages/shop";
import { NeonLogo } from "@/components/NeonLogo";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [twoFaDialogOpen, setTwoFaDialogOpen] = useState(false);
  const [twoFaStep, setTwoFaStep] = useState<1 | 2>(1);
  const [twoFaEmail, setTwoFaEmail] = useState("");
  const [twoFaCode, setTwoFaCode] = useState("");
  const [twoFaSessionId, setTwoFaSessionId] = useState("");

  // Restore state from localStorage on mount
  useEffect(() => {
    try {
      const savedState = localStorage.getItem('loginFormState');
      if (savedState) {
        const parsed = JSON.parse(savedState);
        
        // Restore email (but not password for security!)
        if (parsed.email) {
          setFormData(prev => ({ ...prev, email: parsed.email }));
        }
        
        // Restore 2FA dialog state (but not sensitive data like sessionId or code)
        if (parsed.twoFaDialogOpen) {
          setTwoFaDialogOpen(true);
          setTwoFaStep(parsed.twoFaStep || 1);
          setTwoFaEmail(parsed.twoFaEmail || "");
          // Do NOT restore twoFaCode or twoFaSessionId - security risk!
        }
      }
    } catch (error) {
      console.error('[Login] Error restoring state from localStorage:', error);
    }
  }, []);

  // Save state to localStorage whenever it changes (excluding sensitive data)
  useEffect(() => {
    try {
      const stateToSave = {
        email: formData.email,
        twoFaDialogOpen,
        twoFaStep,
        twoFaEmail,
        // Do NOT save twoFaCode or twoFaSessionId - security risk!
        timestamp: Date.now(),
      };
      localStorage.setItem('loginFormState', JSON.stringify(stateToSave));
    } catch (error) {
      console.error('[Login] Error saving state to localStorage:', error);
    }
  }, [formData.email, twoFaDialogOpen, twoFaStep, twoFaEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await apiRequest("POST", "/api/auth/local", formData);
      const data = await response.json();
      
      // Check if 2FA is required
      if (data.requiresTwoFactor) {
        // Validate that we have session data
        if (!data.sessionId || !data.email) {
          console.error("2FA required but missing session data:", data);
          toast({
            title: "Ошибка",
            description: "Не удалось инициализировать двухфакторную аутентификацию",
            variant: "destructive",
          });
          return;
        }
        
        // User has Telegram linked - show 2FA dialog
        setTwoFaSessionId(data.sessionId);
        setTwoFaEmail(data.email);
        setTwoFaStep(2); // Go directly to code entry step
        setTwoFaDialogOpen(true);
        
        toast({
          title: "Код отправлен в Telegram!",
          description: "Проверьте сообщения в Telegram и введите код",
        });
      } else {
        // No 2FA required - login successful
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        
        // Clear localStorage on successful login
        localStorage.removeItem('loginFormState');
        
        toast({
          title: "Вход выполнен!",
          description: "Добро пожаловать",
        });
        setLocation("/shop");
      }
    } catch (error: any) {
      toast({
        title: "Ошибка входа",
        description: error.message || "Неверный email или пароль",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendCodeMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await apiRequest("POST", "/api/telegram/send-code", { email });
      return await response.json();
    },
    onSuccess: (data: { success: boolean; sessionId: string }) => {
      if (data.sessionId) {
        setTwoFaSessionId(data.sessionId);
      }
      toast({
        title: "Код отправлен в Telegram!",
        description: "Проверьте сообщения в Telegram",
      });
      setTwoFaStep(2);
    },
    onError: (error: any) => {
      const errorMessage = error.message || "Не удалось отправить код";
      let description = errorMessage;
      
      if (error.status === 429) {
        description = "Слишком много попыток. Попробуйте позже.";
      } else if (errorMessage.includes("Telegram account not linked")) {
        description = "Telegram аккаунт не привязан. Пожалуйста, привяжите аккаунт в профиле.";
      } else if (errorMessage.includes("User not found")) {
        description = "Пользователь с таким email не найден.";
      }
      
      toast({
        title: "Ошибка отправки кода",
        description,
        variant: "destructive",
      });
    },
  });

  const verifyCodeMutation = useMutation({
    mutationFn: async ({ code, sessionId }: { code: string; sessionId: string }) => {
      const response = await apiRequest("POST", "/api/telegram/verify-code", { code, sessionId });
      return await response.json();
    },
    onSuccess: async (data: { valid: boolean; sessionToken?: string }) => {
      if (data.valid && data.sessionToken) {
        try {
          await apiRequest("POST", "/api/auth/telegram-2fa", { sessionToken: data.sessionToken });
          await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
          
          toast({
            title: "Вход выполнен!",
            description: "Добро пожаловать",
          });
          
          // Clear localStorage on successful login
          localStorage.removeItem('loginFormState');
          
          setTwoFaDialogOpen(false);
          setTwoFaStep(1);
          setTwoFaEmail("");
          setTwoFaCode("");
          
          setLocation("/shop");
        } catch (error: any) {
          toast({
            title: "Ошибка входа",
            description: error.message || "Не удалось выполнить вход",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Неверный код",
          description: "Проверьте код и попробуйте снова",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      const errorMessage = error.message || "Не удалось проверить код";
      let description = errorMessage;
      
      if (error.status === 429) {
        description = "Слишком много попыток. Попробуйте позже.";
      }
      
      toast({
        title: "Ошибка проверки кода",
        description,
        variant: "destructive",
      });
    },
  });

  const handleSendCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (twoFaEmail) {
      sendCodeMutation.mutate(twoFaEmail);
    }
  };

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (twoFaCode && twoFaSessionId) {
      verifyCodeMutation.mutate({ code: twoFaCode, sessionId: twoFaSessionId });
    }
  };

  const handleTwoFaDialogClose = () => {
    setTwoFaDialogOpen(false);
    setTwoFaStep(1);
    setTwoFaEmail("");
    setTwoFaCode("");
    
    // Update localStorage to reflect closed dialog (no sensitive data)
    try {
      const savedState = localStorage.getItem('loginFormState');
      if (savedState) {
        const parsed = JSON.parse(savedState);
        parsed.twoFaDialogOpen = false;
        parsed.twoFaStep = 1;
        parsed.twoFaEmail = "";
        localStorage.setItem('loginFormState', JSON.stringify(parsed));
      }
    } catch (error) {
      console.error('[Login] Error updating localStorage on dialog close:', error);
    }
  };

  const handleBackToEmail = () => {
    setTwoFaStep(1);
    setTwoFaCode("");
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div 
        className="absolute inset-0 pointer-events-none select-none"
        style={{
          filter: 'blur(2px)',
          overflow: 'hidden',
        }}
      >
        <Shop />
      </div>

      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[25%] left-[15%] w-64 h-64 bg-gradient-radial from-purple-500/12 via-purple-500/4 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-[25%] right-[15%] w-64 h-64 bg-gradient-radial from-pink-500/12 via-pink-500/4 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-[45%] left-[25%] w-56 h-56 bg-gradient-radial from-blue-500/10 via-blue-500/3 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-[45%] right-[25%] w-56 h-56 bg-gradient-radial from-cyan-500/10 via-cyan-500/3 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-[35%] left-[35%] w-40 h-40 bg-gradient-radial from-violet-500/15 via-violet-500/5 to-transparent rounded-full blur-2xl" />
        <div className="absolute top-[55%] right-[35%] w-40 h-40 bg-gradient-radial from-fuchsia-500/15 via-fuchsia-500/5 to-transparent rounded-full blur-2xl" />
      </div>

      <div 
        className="absolute inset-0 bg-gradient-to-r from-background/65 via-background/50 to-background/65" 
        style={{
          backdropFilter: 'blur(8px) saturate(180%)',
          WebkitBackdropFilter: 'blur(8px) saturate(180%)'
        }} 
      />

      <div className="relative min-h-screen flex items-center justify-center p-4 animate-in fade-in duration-300">
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
            <CardTitle className="text-2xl text-center">Вход</CardTitle>
            <CardDescription className="text-center">
              Войдите в свой аккаунт
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Пароль</Label>
                  <button
                    type="button"
                    className="text-sm text-primary hover:underline underline-offset-4"
                    onClick={() => setLocation("/reset-password")}
                    data-testid="link-forgot-password"
                  >
                    Забыли пароль?
                  </button>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="Введите пароль"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  data-testid="input-password"
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                data-testid="button-login"
              >
                {isLoading ? "Вход..." : "Войти"}
              </Button>
            </form>

            <div className="my-4">
              <Separator />
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">или</span>
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setTwoFaDialogOpen(true)}
                data-testid="button-telegram-2fa"
              >
                Войти через Telegram 2FA
              </Button>
            </div>

            <div className="mt-4 text-center text-sm">
              <span className="text-muted-foreground">Нет аккаунта? </span>
              <button
                type="button"
                className="text-primary underline-offset-4 hover:underline"
                onClick={() => setLocation("/register")}
                data-testid="link-register"
              >
                Зарегистрироваться
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={twoFaDialogOpen} onOpenChange={handleTwoFaDialogClose}>
        <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-sm border-border/50">
          <DialogHeader>
            <DialogTitle>Вход через Telegram</DialogTitle>
            <DialogDescription>
              {twoFaStep === 1 
                ? "Введите ваш email, указанный при регистрации, для получения кода подтверждения в Telegram"
                : "Введите код подтверждения, отправленный в ваш Telegram"}
            </DialogDescription>
          </DialogHeader>

          {twoFaStep === 1 ? (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="telegram-email">Email</Label>
                <Input
                  id="telegram-email"
                  type="email"
                  placeholder="ivan@example.com"
                  value={twoFaEmail}
                  onChange={(e) => setTwoFaEmail(e.target.value)}
                  required
                  data-testid="input-telegram-email"
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={sendCodeMutation.isPending || !twoFaEmail}
                data-testid="button-send-code"
              >
                {sendCodeMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Отправка...
                  </>
                ) : (
                  "Отправить код"
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verification-code">Код из Telegram</Label>
                <Input
                  id="verification-code"
                  type="text"
                  placeholder="123456"
                  value={twoFaCode}
                  onChange={(e) => setTwoFaCode(e.target.value)}
                  maxLength={6}
                  required
                  data-testid="input-verification-code"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBackToEmail}
                  className="flex-1"
                  data-testid="button-back-to-email"
                >
                  Назад
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={verifyCodeMutation.isPending || !twoFaCode}
                  data-testid="button-verify-code"
                >
                  {verifyCodeMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Проверка...
                    </>
                  ) : (
                    "Войти"
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
