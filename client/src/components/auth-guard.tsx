import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock, LogIn, UserPlus } from "lucide-react";
import { useLocation } from "wouter";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="relative min-h-screen">
        {/* Размытый фон со страницей */}
        <div className="absolute inset-0 blur-md opacity-50 pointer-events-none overflow-hidden">
          {children}
        </div>

        {/* Модальное окно с предложением войти */}
        <Dialog open={true}>
          <DialogContent 
            className="sm:max-w-md" 
            onInteractOutside={(e) => e.preventDefault()}
            data-testid="dialog-auth-required"
          >
            <DialogHeader>
              <div className="flex flex-col items-center gap-4 mb-2">
                <div className="p-3 rounded-full bg-primary/10">
                  <Lock className="h-8 w-8 text-primary" />
                </div>
                <div className="text-center">
                  <DialogTitle className="text-2xl">Требуется авторизация</DialogTitle>
                  <DialogDescription className="mt-2">
                    Войдите или зарегистрируйтесь для доступа к платформе
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="flex flex-col gap-3 mt-4">
              <Button 
                className="w-full"
                size="lg"
                onClick={() => setLocation("/login")}
                data-testid="button-go-to-login"
              >
                <LogIn className="mr-2 h-5 w-5" />
                Войти
              </Button>
              
              <Button 
                variant="outline"
                className="w-full"
                size="lg"
                onClick={() => setLocation("/register")}
                data-testid="button-go-to-register"
              >
                <UserPlus className="mr-2 h-5 w-5" />
                Зарегистрироваться
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return <>{children}</>;
}
