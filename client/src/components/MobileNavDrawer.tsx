import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ShoppingBag,
  BookOpen,
  Gift,
  User,
  LogOut,
  RefreshCw,
  Target,
  Settings,
  Handshake,
  Package,
  Sparkles,
  SlidersHorizontal,
  Bell,
  Headphones,
  Heart,
  Wallet,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AwardIcon } from "@/components/award-icon";
import { formatPrice } from "@/lib/formatPrice";
import type { User as UserType } from "@shared/schema";
import type { MouseEvent } from "react";

interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user?: UserType;
  onOpenFilters?: () => void;
  logout: () => void
}

export function MobileNavDrawer({ isOpen, onClose, user, onOpenFilters, logout }: MobileNavDrawerProps) {
  const regularBalance = parseFloat(user?.balance || "0");
  const referralBalance = parseFloat(user?.referralBalance || "0");
  const totalBalance = regularBalance + referralBalance;
  const userInitials = `${user?.firstName?.[0] || ""}${user?.lastName?.[0] || ""}`.toUpperCase() || "U";

  // Загрузка наград для отображения выбранной награды
  const { data: allAwards } = useQuery<any[]>({
    queryKey: ['/api/awards'],
    enabled: !!user?.selectedAwardId,
  });

  const selectedAward = user?.selectedAwardId && allAwards
    ? allAwards.find((award: any) => award.id === user.selectedAwardId)
    : null;

  // Получение количества непрочитанных уведомлений
  const { data: unreadCount } = useQuery<{ count: number }>({
    queryKey: ['/api/notifications/unread-count'],
    enabled: !!user,
  });

  // Получение данных о техподдержке
  const { data: tradeInContent } = useQuery<{ telegramUrl?: string }>({
    queryKey: ['/api/trade-in-content'],
  });

  const handleLogout = async () => {
    // Close the sheet first to prevent event conflicts
    onClose();

    // Small delay to allow sheet animation to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    // Clear all Telegram reminder session flags before logout
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('telegramReminderShown:')) {
        sessionStorage.removeItem(key);
      }
    });

    logout()
  };

  const handleLinkClick = () => {
    onClose();
  };

  const handleShopLinkClick = (e: MouseEvent) => {
    e.preventDefault();
    onClose();
    // Keep behavior consistent with manual refresh after navigation to /shop.
    window.location.assign("/shop");
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="left" className="w-[85vw] sm:w-[400px] p-0 flex flex-col bg-background/95">
        <SheetHeader className="px-6 py-5">
          <SheetTitle className="text-2xl font-bold">Меню</SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="flex flex-col gap-4 p-5">
            {/* User Section - iOS Card with Gradient */}
            {user && (
              <div
                className="rounded-3xl bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-purple-500/10 backdrop-blur-sm p-5 shadow-lg border border-border/50"
                data-testid="mobile-nav-user-section"
              >
                <div className="flex items-center gap-4 mb-4">
                  {selectedAward ? (
                    <AwardIcon emoji={selectedAward.imageUrl} rarity={selectedAward.rarity} size={64} />
                  ) : (
                    <Avatar className="h-16 w-16 ring-4 ring-purple-500/20">
                      <AvatarImage src={user.profileImageUrl || undefined} />
                      <AvatarFallback className="text-lg font-semibold bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-lg truncate" data-testid="text-user-name">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {user.email}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <a href="/payment" className="rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 p-3 shadow-sm">
                    <p className="text-xs text-muted-foreground mb-1">Баланс</p>
                    <p className="font-semibold text-sm" data-testid="text-mobile-balance">
                      {formatPrice(totalBalance)} ₽
                    </p>
                  </a>
                  <a href="/bonuses" className="rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 p-3 shadow-sm">
                    <p className="text-xs text-muted-foreground mb-1">Фантики</p>
                    <p className="font-semibold text-sm text-purple-600 dark:text-purple-400" data-testid="text-mobile-fantiks">
                      {user.fantiks || 0}
                    </p>
                  </a>
                </div>
              </div>
            )}

            <div className="rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 shadow-sm overflow-hidden">
              <Link href="/payment" onClick={handleLinkClick}>
                <button
                  className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/30 text-left min-h-[44px] transition-all hover:scale-[1.01]"
                  data-testid="link-payment"
                >
                  <Wallet className="h-5 w-5" />
                  <span className="font-semibold">Пополнить баланс</span>
                </button>
              </Link>
            </div>

            {/* Магазин - iOS Card with Accordion */}
            <div className="rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 shadow-sm overflow-hidden">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="shop" className="border-0">
                  <AccordionTrigger
                    className="px-5 py-4 hover:bg-muted/30 min-h-[44px] hover:no-underline transition-all"
                    data-testid="accordion-shop"
                  >
                    <div className="flex items-center gap-3">
                      <ShoppingBag className="h-5 w-5" />
                      <span className="font-semibold">Магазин</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-0">
                    <div className="flex flex-col gap-2 px-2 pb-2">
                      <Link href="/shop" onClick={handleShopLinkClick}>
                        <button
                          className="w-full flex items-center gap-3 px-5 py-3 rounded-xl hover:bg-muted/30 text-left min-h-[44px] transition-all hover:scale-[1.01]"
                          data-testid="link-courses"
                        >
                          <BookOpen className="h-5 w-5" />
                          <span>Курсы</span>
                        </button>
                      </Link>
                      <Link href="/programs" onClick={handleLinkClick}>
                        <button
                          className="w-full flex items-center gap-3 px-5 py-3 rounded-xl hover:bg-muted/30 text-left min-h-[44px] transition-all hover:scale-[1.01]"
                          data-testid="link-programs"
                        >
                          <Package className="h-5 w-5" />
                          <span>Программы</span>
                        </button>
                      </Link>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            {/* Библиотека - iOS Card */}
            <div className="rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 shadow-sm overflow-hidden">
              <Link href="/library" onClick={handleLinkClick}>
                <button
                  className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/30 text-left min-h-[44px] transition-all hover:scale-[1.01]"
                  data-testid="link-library"
                >
                  <BookOpen className="h-5 w-5" />
                  <span className="font-semibold">Библиотека</span>
                </button>
              </Link>
            </div>

            {/* Избранное - iOS Card (if authenticated) */}
            {user && (
              <div className="rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 shadow-sm overflow-hidden">
                <Link href="/favorites" onClick={handleLinkClick}>
                  <button
                    className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/30 text-left min-h-[44px] transition-all hover:scale-[1.01]"
                    data-testid="link-favorites"
                  >
                    <Heart className="h-5 w-5" />
                    <span className="font-semibold">Избранное</span>
                  </button>
                </Link>
              </div>
            )}

            {/* Активности - iOS Card with Accordion */}
            <div className="rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 shadow-sm overflow-hidden">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="activities" className="border-0">
                  <AccordionTrigger
                    className="px-5 py-4 hover:bg-muted/30 min-h-[44px] hover:no-underline transition-all"
                    data-testid="accordion-activities"
                  >
                    <div className="flex items-center gap-3">
                      <Sparkles className="h-5 w-5" />
                      <span className="font-semibold">Активности</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-0">
                    <div className="flex flex-col gap-2 px-2 pb-2">
                      <Link href="/bonuses" onClick={handleLinkClick}>
                        <button
                          className="w-full flex items-center gap-3 px-5 py-3 rounded-xl hover:bg-muted/30 text-left min-h-[44px] transition-all hover:scale-[1.01]"
                          data-testid="link-bonuses"
                        >
                          <Gift className="h-5 w-5" />
                          <span>Бонусы</span>
                        </button>
                      </Link>
                      <Link href="/sniper" onClick={handleLinkClick}>
                        <button
                          className="w-full flex items-center gap-3 px-5 py-3 rounded-xl hover:bg-muted/30 text-left min-h-[44px] transition-all hover:scale-[1.01]"
                          data-testid="link-sniper"
                        >
                          <Target className="h-5 w-5" />
                          <span>Снайпер</span>
                        </button>
                      </Link>
                      <Link href="/partners" onClick={handleLinkClick}>
                        <button
                          className="w-full flex items-center gap-3 px-5 py-3 rounded-xl hover:bg-muted/30 text-left min-h-[44px] transition-all hover:scale-[1.01]"
                          data-testid="link-partners"
                        >
                          <Handshake className="h-5 w-5" />
                          <span>Партнёры</span>
                        </button>
                      </Link>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            {/* Trade-In - iOS Card */}
            <div className="rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 shadow-sm overflow-hidden">
              <Link href="/trade-in" onClick={handleLinkClick}>
                <button
                  className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/30 text-left min-h-[44px] transition-all hover:scale-[1.01]"
                  data-testid="link-trade-in"
                >
                  <RefreshCw className="h-5 w-5" />
                  <span className="font-semibold">Trade-In</span>
                </button>
              </Link>
            </div>

            {/* Notifications - iOS Card (if authenticated) */}
            {user && (
              <div className="rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 shadow-sm overflow-hidden">
                <Link href="/notifications" onClick={handleLinkClick}>
                  <button
                    className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/30 text-left min-h-[44px] transition-all hover:scale-[1.01]"
                    data-testid="link-notifications"
                  >
                    <div className="relative">
                      <Bell className="h-5 w-5" />
                      {unreadCount && unreadCount.count > 0 && (
                        <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-600 flex items-center justify-center">
                          <span className="text-[9px] font-bold text-white">
                            {unreadCount.count > 9 ? '9+' : unreadCount.count}
                          </span>
                        </div>
                      )}
                    </div>
                    <span className="font-semibold">Уведомления</span>
                    {unreadCount && unreadCount.count > 0 && (
                      <span className="ml-auto text-xs font-semibold text-red-600">
                        {unreadCount.count}
                      </span>
                    )}
                  </button>
                </Link>
              </div>
            )}

            {/* Support - iOS Card */}
            <div className="rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 shadow-sm overflow-hidden">
              <button
                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/30 text-left min-h-[44px] transition-all hover:scale-[1.01]"
                onClick={() => {
                  window.open(tradeInContent?.telegramUrl || 'https://t.me/vkurse_support', '_blank');
                  handleLinkClick();
                }}
                data-testid="button-support"
              >
                <Headphones className="h-5 w-5" />
                <span className="font-semibold">Техподдержка</span>
              </button>
            </div>

            {/* Profile - iOS Card (if authenticated) */}
            {user && (
              <div className="rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 shadow-sm overflow-hidden">
                <Link href="/profile" onClick={handleLinkClick}>
                  <button
                    className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/30 text-left min-h-[44px] transition-all hover:scale-[1.01]"
                    data-testid="link-profile"
                  >
                    <User className="h-5 w-5" />
                    <span className="font-semibold">Профиль</span>
                  </button>
                </Link>
              </div>
            )}

            {/* Admin Settings - iOS Card (if admin) */}
            {user?.isAdmin && (
              <div className="rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 shadow-sm overflow-hidden">
                <Link href="/admin/menu" onClick={handleLinkClick}>
                  <button
                    className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/30 text-left min-h-[44px] transition-all hover:scale-[1.01]"
                    data-testid="link-admin"
                  >
                    <Settings className="h-5 w-5" />
                    <span className="font-semibold">Настройки админа</span>
                  </button>
                </Link>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Logout Button - iOS Style (if authenticated) */}
        {user && (
          <div className="p-5 mt-auto">
            <Button
              variant="destructive"
              className="w-full min-h-[44px] gap-2 rounded-2xl shadow-sm"
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <LogOut className="h-5 w-5" />
              <span>Выйти</span>
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
