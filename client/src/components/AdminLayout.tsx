import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/header";
import { Home, Menu as MenuIcon, Upload, Settings, Users, Crown, Terminal, Package, FileText, RefreshCw, BarChart3, Bell, MessageSquare, Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/footer";
import { Separator } from "@/components/ui/separator";

interface AdminLayoutProps {
  children: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
}

export default function AdminLayout({ children, breadcrumbs }: AdminLayoutProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Check if user is admin
  const { data: user } = useQuery<{ id: string; email: string; isAdmin: boolean }>({
    queryKey: ["/api/auth/user"],
  });

  // Redirect non-admin users
  useEffect(() => {
    if (user && !user.isAdmin) {
      toast({
        title: "Доступ запрещён",
        description: "У вас нет прав администратора",
        variant: "destructive",
      });
      setTimeout(() => {
        setLocation("/shop");
      }, 100);
    }
  }, [user, setLocation]);

  // Don't render anything if user is not loaded or not admin
  // if (!user || !user.isAdmin) {
  //   return null;
  // }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 border-r min-h-[calc(100vh-64px)] p-4 space-y-1">
          {/* Контент */}
          <div className="px-3 py-2">
            <h2 className="mb-2 px-2 text-xs font-semibold tracking-tight text-muted-foreground uppercase">
              Контент
            </h2>
          </div>
          <Link href="/admin/categories">
            <Button
              variant="ghost"
              className="w-full justify-start"
              data-testid="link-admin-categories"
            >
              <Home className="mr-2 h-4 w-4" />
              Категории и курсы
            </Button>
          </Link>
          <Link href="/admin/packages">
            <Button
              variant="ghost"
              className="w-full justify-start"
              data-testid="link-admin-packages"
            >
              <Package className="mr-2 h-4 w-4" />
              Подборки
            </Button>
          </Link>
          <Link href="/admin/partners">
            <Button
              variant="ghost"
              className="w-full justify-start"
              data-testid="link-admin-partners"
            >
              <Handshake className="mr-2 h-4 w-4" />
              Партнеры
            </Button>
          </Link>
          <Link href="/admin/programs">
            <Button
              variant="ghost"
              className="w-full justify-start"
              data-testid="link-admin-programs"
            >
              <Package className="mr-2 h-4 w-4" />
              Программы
            </Button>
          </Link>

          <Separator className="my-3" />

          {/* Пользователи */}
          <div className="px-3 py-2">
            <h2 className="mb-2 px-2 text-xs font-semibold tracking-tight text-muted-foreground uppercase">
              Пользователи
            </h2>
          </div>
          <Link href="/admin/users">
            <Button
              variant="ghost"
              className="w-full justify-start"
              data-testid="link-admin-users"
            >
              <Users className="mr-2 h-4 w-4" />
              Пользователи
            </Button>
          </Link>
          <Link href="/admin/moderation">
            <Button
              variant="ghost"
              className="w-full justify-start"
              data-testid="link-admin-moderation"
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Модерация
            </Button>
          </Link>
          <Link href="/admin/notifications">
            <Button
              variant="ghost"
              className="w-full justify-start"
              data-testid="link-admin-notifications"
            >
              <Bell className="mr-2 h-4 w-4" />
              Уведомления
            </Button>
          </Link>
          <Link href="/admin/chat">
            <Button
              variant="ghost"
              className="w-full justify-start"
              data-testid="link-admin-chat"
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Чат поддержки
            </Button>
          </Link>

          <Separator className="my-3" />

          {/* Страницы */}
          <div className="px-3 py-2">
            <h2 className="mb-2 px-2 text-xs font-semibold tracking-tight text-muted-foreground uppercase">
              Страницы
            </h2>
          </div>
          <Link href="/admin/landing">
            <Button
              variant="ghost"
              className="w-full justify-start"
              data-testid="link-admin-landing"
            >
              <FileText className="mr-2 h-4 w-4" />
              Редактор лендинга
            </Button>
          </Link>
          <Link href="/admin/vip">
            <Button
              variant="ghost"
              className="w-full justify-start"
              data-testid="link-admin-vip"
            >
              <Crown className="mr-2 h-4 w-4" />
              VIP Страница
            </Button>
          </Link>
          <Link href="/admin/trade-in">
            <Button
              variant="ghost"
              className="w-full justify-start"
              data-testid="link-admin-trade-in"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Trade-In
            </Button>
          </Link>
          <Link href="/admin/menu">
            <Button
              variant="ghost"
              className="w-full justify-start"
              data-testid="link-admin-menu"
            >
              <MenuIcon className="mr-2 h-4 w-4" />
              Меню сайта
            </Button>
          </Link>
          <Link href="/admin/info-banners">
            <Button
              variant="ghost"
              className="w-full justify-start"
              data-testid="link-admin-info-banners"
            >
              <Terminal className="mr-2 h-4 w-4" />
              Инфобаннеры
            </Button>
          </Link>

          <Separator className="my-3" />

          {/* Система */}
          <div className="px-3 py-2">
            <h2 className="mb-2 px-2 text-xs font-semibold tracking-tight text-muted-foreground uppercase">
              Система
            </h2>
          </div>
          <Link href="/admin/analytics">
            <Button
              variant="ghost"
              className="w-full justify-start"
              data-testid="link-admin-analytics"
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              Аналитика
            </Button>
          </Link>
          <Link href="/admin/settings">
            <Button
              variant="ghost"
              className="w-full justify-start"
              data-testid="link-admin-settings"
            >
              <Settings className="mr-2 h-4 w-4" />
              Настройки
            </Button>
          </Link>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6">
          {/* Breadcrumbs */}
          {breadcrumbs && breadcrumbs.length > 0 && (
            <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
              {breadcrumbs.map((crumb, index) => (
                <div key={index} className="flex items-center gap-2">
                  {crumb.href ? (
                    <Link href={crumb.href}>
                      <span className="hover:text-foreground cursor-pointer" data-testid={`breadcrumb-${index}`}>
                        {crumb.label}
                      </span>
                    </Link>
                  ) : (
                    <span className="text-foreground font-medium" data-testid={`breadcrumb-${index}`}>
                      {crumb.label}
                    </span>
                  )}
                  {index < breadcrumbs.length - 1 && <span>/</span>}
                </div>
              ))}
            </div>
          )}

          {children}
        </main>
      </div>
      <Footer />
    </div>
  );
}
