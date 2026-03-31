import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, CheckCircle2, Loader2, Mail } from "lucide-react";
import { NeonLogo } from "@/components/NeonLogo";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<"email" | "reset">("email");
  const [email, setEmail] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const session = params.get("session");
    if (session) {
      setSessionId(session);
      setStep("reset");
    }
  }, []);

  const requestCodeMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await apiRequest("POST", "/api/auth/request-password-reset", { email });
      return await response.json();
    },
    onSuccess: (data) => {
      setSessionId(data.sessionId);
      setStep("reset");
      toast({
        title: "Код отправлен!",
        description: "Проверьте Telegram — мы отправили вам 4-значный код для восстановления пароля",
      });
    },
    onError: (error: any) => {
      let description = error.message || "Не удалось отправить код";

      if (description.includes("не найден")) {
        description = "Пользователь с таким email не найден";
      } else if (description.includes("не привязан Telegram")) {
        description = "К вашему аккаунту не привязан Telegram. Пожалуйста, привяжите Telegram в профиле или обратитесь в поддержку";
      }

      toast({
        title: "Ошибка",
        description,
        variant: "destructive",
      });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: { sessionId: string; code: string; newPassword: string }) => {
      const response = await apiRequest("POST", "/api/auth/reset-password", data);
      return await response.json();
    },
    onSuccess: () => {
      setResetSuccess(true);
      toast({
        title: "Пароль изменён!",
        description: "Ваш пароль успешно изменён. Теперь вы можете войти с новым паролем",
      });

      setTimeout(() => {
        setLocation("/login");
      }, 3000);
    },
    onError: (error: any) => {
      let description = error.message || "Не удалось сбросить пароль";

      if (description.includes("Неверный или истекший код")) {
        description = "Неверный или истекший код подтверждения. Проверьте код и попробуйте снова";
      }

      toast({
        title: "Ошибка",
        description,
        variant: "destructive",
      });
    },
  });

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes("@")) {
      toast({
        title: "Ошибка",
        description: "Введите корректный email",
        variant: "destructive",
      });
      return;
    }

    requestCodeMutation.mutate(email);
  };

  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!sessionId) {
      toast({
        title: "Ошибка",
        description: "Не указан идентификатор сессии",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Ошибка",
        description: "Пароль должен содержать минимум 6 символов",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Ошибка",
        description: "Пароли не совпадают",
        variant: "destructive",
      });
      return;
    }

    resetPasswordMutation.mutate({
      sessionId,
      code,
      newPassword,
    });
  };

  if (resetSuccess) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-background via-background/95 to-background">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[25%] left-[15%] w-64 h-64 bg-gradient-radial from-green-500/12 via-green-500/4 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-[25%] right-[15%] w-64 h-64 bg-gradient-radial from-emerald-500/12 via-emerald-500/4 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-[45%] left-[25%] w-56 h-56 bg-gradient-radial from-teal-500/10 via-teal-500/3 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-[45%] right-[25%] w-56 h-56 bg-gradient-radial from-cyan-500/10 via-cyan-500/3 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="relative min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl border-border/50 bg-card/95 backdrop-blur-sm">
            <CardHeader className="space-y-1">
              <div className="flex items-center justify-center mb-4">
                <div className="rounded-full bg-green-500/10 p-4">
                  <CheckCircle2 className="h-12 w-12 text-green-500" />
                </div>
              </div>
              <CardTitle className="text-2xl text-center">Пароль изменён!</CardTitle>
              <CardDescription className="text-center">
                Ваш пароль успешно изменён. Через несколько секунд вы будете перенаправлены на страницу входа
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                onClick={() => setLocation("/login")}
                data-testid="button-go-to-login"
              >
                Перейти к входу
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-background via-background/95 to-background">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[25%] left-[15%] w-64 h-64 bg-gradient-radial from-purple-500/12 via-purple-500/4 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-[25%] right-[15%] w-64 h-64 bg-gradient-radial from-pink-500/12 via-pink-500/4 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-[45%] left-[25%] w-56 h-56 bg-gradient-radial from-blue-500/10 via-blue-500/3 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-[45%] right-[25%] w-56 h-56 bg-gradient-radial from-cyan-500/10 via-cyan-500/3 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-[35%] left-[35%] w-40 h-40 bg-gradient-radial from-violet-500/15 via-violet-500/5 to-transparent rounded-full blur-2xl" />
        <div className="absolute top-[55%] right-[35%] w-40 h-40 bg-gradient-radial from-fuchsia-500/15 via-fuchsia-500/5 to-transparent rounded-full blur-2xl" />
      </div>

      <div className="relative min-h-screen flex items-center justify-center p-4 animate-in fade-in duration-300">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 left-4 z-10 bg-card/80 backdrop-blur-sm hover:bg-card"
          onClick={() => setLocation("/login")}
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        {step === "email" ? (
          <Card className="w-full max-w-md animate-in slide-in-from-bottom-4 duration-500 shadow-2xl border-border/50 bg-card/95 backdrop-blur-sm">
            <CardHeader className="space-y-1">
              <div className="flex items-center justify-center mb-4">
                <NeonLogo variant="pulse" />
              </div>
              <CardTitle className="text-2xl text-center">Восстановление пароля</CardTitle>
              <CardDescription className="text-center">
                Введите email вашего аккаунта и мы отправим код в Telegram
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                      data-testid="input-email"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Убедитесь, что к этому email привязан Telegram
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={requestCodeMutation.isPending}
                  data-testid="button-request-code"
                >
                  {requestCodeMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Отправка кода...
                    </>
                  ) : (
                    "Получить код в Telegram"
                  )}
                </Button>
              </form>

              <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border/50">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Важно:</strong> Для восстановления пароля у вас должен быть привязан Telegram. Если у вас нет привязанного Telegram, обратитесь в поддержку
                </p>
              </div>

              <div className="mt-4 text-center text-sm">
                <span className="text-muted-foreground">Вспомнили пароль? </span>
                <button
                  type="button"
                  className="text-primary underline-offset-4 hover:underline"
                  onClick={() => setLocation("/login")}
                  data-testid="link-back-to-login"
                >
                  Войти
                </button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="w-full max-w-md animate-in slide-in-from-bottom-4 duration-500 shadow-2xl border-border/50 bg-card/95 backdrop-blur-sm">
            <CardHeader className="space-y-1">
              <div className="flex items-center justify-center mb-4">
                <NeonLogo variant="pulse" />
              </div>
              <CardTitle className="text-2xl text-center">Введите код</CardTitle>
              <CardDescription className="text-center">
                Код отправлен в ваш Telegram. Введите его ниже и установите новый пароль
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleResetSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Код из Telegram</Label>
                  <Input
                    id="code"
                    type="text"
                    placeholder="1234"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    maxLength={4}
                    required
                    data-testid="input-reset-code"
                  />
                  <p className="text-xs text-muted-foreground">
                    Введите 4-значный код, отправленный в ваш Telegram
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password">Новый пароль</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="Минимум 6 символов"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    data-testid="input-new-password"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Подтвердите пароль</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Повторите новый пароль"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    data-testid="input-confirm-password"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={resetPasswordMutation.isPending}
                  data-testid="button-reset-password"
                >
                  {resetPasswordMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Изменение пароля...
                    </>
                  ) : (
                    "Изменить пароль"
                  )}
                </Button>
              </form>

              <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border/50">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Не пришёл код?</strong>
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Проверьте папку "Spam" в Telegram или попробуйте{" "}
                  <button
                    type="button"
                    className="text-primary underline-offset-4 hover:underline"
                    onClick={() => {
                      setStep("email");
                      setCode("");
                      setNewPassword("");
                      setConfirmPassword("");
                    }}
                    data-testid="button-resend-code"
                  >
                    запросить код снова
                  </button>
                </p>
              </div>

              <div className="mt-4 text-center text-sm">
                <span className="text-muted-foreground">Вспомнили пароль? </span>
                <button
                  type="button"
                  className="text-primary underline-offset-4 hover:underline"
                  onClick={() => setLocation("/login")}
                  data-testid="link-back-to-login-2"
                >
                  Войти
                </button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
