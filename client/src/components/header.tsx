import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ShoppingBag, Search, BookOpen, Gift, User, LogOut, Menu, ExternalLink, Link2, RefreshCw, Target, Settings, Bell, Handshake, ChevronDown, Store, Sparkles, Package, Headphones } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import type { MenuItem, TradeInPageContent } from "@shared/schema";
import { formatPrice } from "@/lib/formatPrice";
import { NeonLogo } from "@/components/NeonLogo";
import { AwardIcon } from "@/components/award-icon";
import { MobileNavDrawer } from "@/components/MobileNavDrawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

interface HeaderProps {
  onSearchChange?: (query: string) => void;
  onMenuToggle?: () => void;
  onResetFilters?: () => void;
  onOpenFilters?: () => void;
}

interface Notification {
  id: string;
  userId: string;
  type: 'purchase_course' | 'purchase_package' | 'purchase_vip' | 'sniper_approved';
  title: string;
  message: string;
  isRead: boolean;
  relatedId: string | null;
  relatedType: string | null;
  createdAt: string;
}

export function Header({ onSearchChange, onMenuToggle, onResetFilters, onOpenFilters }: HeaderProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [closeTimeout, setCloseTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const { data: menuItems } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items"],
  });

  const { data: tradeInContent } = useQuery<TradeInPageContent>({
    queryKey: ['/api/trade-in-content'],
  });

  const { data: unreadCount } = useQuery<{ count: number }>({
    queryKey: ['/api/notifications/unread-count'],
    refetchInterval: 30000, // Обновлять каждые 30 секунд
  });

  const { data: notifications } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
    refetchInterval: 30000, // Обновлять каждые 30 секунд
  });

  const { data: newLibraryCount } = useQuery<{ count: number }>({
    queryKey: ['/api/library/new-count'],
    refetchInterval: 30000, // Обновлять каждые 30 секунд
    enabled: !!user, // Только если пользователь авторизован
  });

  const { data: allAwards } = useQuery({
    queryKey: ['/api/awards'],
    staleTime: 300000, // Кэшировать награды на 5 минут
  });

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    onSearchChange?.(value);
  };

  const handleDropdownEnter = (dropdown: string) => {
    if (closeTimeout) {
      clearTimeout(closeTimeout);
      setCloseTimeout(null);
    }
    setOpenDropdown(dropdown);
  };

  const handleDropdownLeave = () => {
    const timeout = setTimeout(() => {
      setOpenDropdown(null);
    }, 150); // Небольшая задержка перед закрытием
    setCloseTimeout(timeout);
  };

  const getNotificationLink = (notification: Notification) => {
    if (!notification.relatedId || !notification.relatedType) return null;

    switch (notification.relatedType) {
      case 'course':
        return `/library/${notification.relatedId}`;
      case 'package':
        return `/package/${notification.relatedId}`;
      case 'course_request':
        return `/sniper`;
      default:
        return null;
    }
  };

  const getIconForMenuItem = (item: MenuItem) => {
    if (item.isExternal) return ExternalLink;
    if (!item.href) return Menu;
    
    if (item.href === "/shop") return ShoppingBag;
    if (item.href === "/library") return BookOpen;
    if (item.href === "/bonuses") return Gift;
    
    return Link2;
  };

  const rootMenuItems = (menuItems || [])
    .filter(item => item.isActive && !item.parentId)
    .sort((a, b) => a.displayOrder - b.displayOrder);

  const navItems = rootMenuItems.map(item => ({
    id: item.id,
    path: item.href || '#',
    label: item.label,
    icon: getIconForMenuItem(item),
    isExternal: item.isExternal,
    hasChildren: (menuItems || []).some(child => child.parentId === item.id && child.isActive),
    children: (menuItems || [])
      .filter(child => child.parentId === item.id && child.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder),
  }));

  const regularBalance = parseFloat(user?.balance || "0");
  const referralBalance = parseFloat(user?.referralBalance || "0");
  const totalBalance = regularBalance + referralBalance;
  const userInitials = `${user?.firstName?.[0] || ""}${user?.lastName?.[0] || ""}`.toUpperCase() || "U";

  const selectedAward = allAwards && user?.selectedAwardId && Array.isArray(allAwards)
    ? allAwards.find((award: any) => award.id === user.selectedAwardId)
    : null;

  return (
    <header className="sticky top-0 z-[100] border-b border-border/40 overflow-hidden w-full">
      {/* Glowing gradient orbs - background layer */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-10 left-1/4 w-96 h-96 bg-gradient-to-br from-purple-500/40 via-pink-500/40 to-transparent rounded-full blur-3xl animate-pulse" />
        <div className="absolute -top-16 right-1/4 w-80 h-80 bg-gradient-to-br from-blue-500/35 via-cyan-500/35 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute -top-12 left-1/2 w-72 h-72 bg-gradient-to-br from-violet-500/30 via-fuchsia-500/30 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>
      
      {/* Glassmorphism layer with backdrop blur */}
      <div className="absolute inset-0 bg-gradient-to-r from-background/70 via-background/50 to-background/70 backdrop-blur-xl border-t border-white/5" 
           style={{
             backdropFilter: 'blur(24px) saturate(180%)',
             WebkitBackdropFilter: 'blur(24px) saturate(180%)'
           }} 
      />
      
      {/* Subtle shine effect on top */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      
      {/* Content layer */}
      <div className="relative mx-auto px-0.5 sm:px-1 md:px-2 lg:px-4" style={{ maxWidth: '1690px' }}>
        <div className="flex items-center justify-between h-12 sm:h-14 md:h-16 lg:h-20 gap-0.5 sm:gap-1 md:gap-2 lg:gap-4">
          <div className="flex items-center gap-0.5 sm:gap-1 md:gap-2 lg:gap-4 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 flex-shrink-0"
              onClick={() => setIsMobileMenuOpen(true)}
              data-testid="button-menu-toggle"
            >
              <Menu className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" />
            </Button>
            
            <Link href="/shop" onClick={onResetFilters}>
              <div className="hover-elevate px-0.5 py-0.5 md:px-1 md:py-0.5 lg:px-2 lg:py-1 rounded-md transition-all cursor-pointer" data-testid="link-home">
                <NeonLogo variant="gradient" />
              </div>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-0.5 lg:gap-1">
            {/* Магазин Dropdown */}
            <div
              onMouseEnter={() => handleDropdownEnter('shop')}
              onMouseLeave={handleDropdownLeave}
            >
              <DropdownMenu 
                open={openDropdown === 'shop'}
                modal={false}
              >
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className={`gap-0.5 md:gap-1 uppercase font-semibold px-2 md:px-3 lg:px-4 py-1 md:py-1.5 lg:py-2 h-auto text-xs md:text-sm lg:text-base leading-normal rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 outline-none border-0 no-default-hover-elevate ${
                      ['/shop', '/programs'].includes(location)
                        ? "text-blue-500 border-b-2 md:border-b-4 border-blue-500" 
                        : "text-muted-foreground border-b-2 md:border-b-4 border-transparent hover:text-foreground"
                    }`}
                    data-testid="dropdown-shop"
                  >
                    <ShoppingBag className="h-3 w-3 md:h-4 md:w-4" />
                    <span className="hidden sm:inline">Магазин</span>
                    <span className="sm:hidden">Маг.</span>
                    <ChevronDown className="h-2.5 w-2.5 md:h-3 md:w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="start"
                  sideOffset={2}
                  className="overflow-hidden rounded-xl border border-border/40 p-0 shadow-2xl min-w-[240px] bg-transparent"
                  style={{
                    background: 'linear-gradient(to bottom right, hsl(var(--background) / 0.4), hsl(var(--background) / 0.3), hsl(var(--background) / 0.4))',
                    backdropFilter: 'blur(24px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(24px) saturate(180%)'
                  }}
                >
                  {/* Subtle shine effect on top */}
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
                  
                  {/* Content layer */}
                  <div className="relative">
                    <DropdownMenuItem asChild className={`py-6 px-4 ${location === '/shop' ? 'border-b-2 border-blue-500' : ''}`}>
                      <Link href="/shop">
                        <div className={`flex items-center gap-3 cursor-pointer w-full uppercase font-semibold text-base ${location === '/shop' ? 'text-blue-500' : ''}`}>
                          <BookOpen className="h-5 w-5" />
                          <span>Курсы</span>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className={`py-6 px-4 ${location === '/programs' ? 'border-b-2 border-blue-500' : ''}`}>
                      <Link href="/programs">
                        <div className={`flex items-center gap-3 cursor-pointer w-full uppercase font-semibold text-base ${location === '/programs' ? 'text-blue-500' : ''}`}>
                          <Package className="h-5 w-5" />
                          <span>Программы</span>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Библиотека Link */}
            <Link href="/library">
              <div className="relative inline-flex">
                <div
                  className={`px-2 md:px-3 lg:px-4 py-1 md:py-1.5 lg:py-2 cursor-pointer transition-all uppercase font-semibold text-xs md:text-sm lg:text-base ${
                    location === "/library"
                      ? "text-blue-500 border-b-2 md:border-b-4 border-blue-500" 
                      : "text-muted-foreground hover:text-foreground border-b-2 md:border-b-4 border-transparent"
                  }`}
                  data-testid="link-library"
                >
                  <span className="hidden sm:inline">Библиотека</span>
                  <span className="sm:hidden">Библ.</span>
                </div>
                {newLibraryCount && newLibraryCount.count > 0 && (
                  <div 
                    className="absolute -top-1 -right-1 h-4 w-4 md:h-5 md:w-5 rounded-full bg-red-600 flex items-center justify-center pointer-events-none"
                    data-testid="badge-new-library-count"
                  >
                    <span className="text-[8px] md:text-[10px] font-bold text-white">
                      {newLibraryCount.count > 9 ? '9+' : newLibraryCount.count}
                    </span>
                  </div>
                )}
              </div>
            </Link>

            {/* Активности Dropdown */}
            <div
              onMouseEnter={() => handleDropdownEnter('activities')}
              onMouseLeave={handleDropdownLeave}
            >
              <DropdownMenu 
                open={openDropdown === 'activities'}
                modal={false}
              >
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className={`gap-0.5 md:gap-1 uppercase font-semibold px-2 md:px-3 lg:px-4 py-1 md:py-1.5 lg:py-2 h-auto text-xs md:text-sm lg:text-base leading-normal rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 outline-none border-0 no-default-hover-elevate ${
                      ['/bonuses', '/sniper', '/partners'].includes(location)
                        ? "text-blue-500 border-b-2 md:border-b-4 border-blue-500" 
                        : "text-muted-foreground border-b-2 md:border-b-4 border-transparent hover:text-foreground"
                    }`}
                    data-testid="dropdown-activities"
                  >
                    <Sparkles className="h-3 w-3 md:h-4 md:w-4" />
                    <span className="hidden sm:inline">Активности</span>
                    <span className="sm:hidden">Акт.</span>
                    <ChevronDown className="h-2.5 w-2.5 md:h-3 md:w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="start"
                  sideOffset={2}
                  className="overflow-hidden rounded-xl border border-border/40 p-0 shadow-2xl min-w-[240px] bg-transparent"
                  style={{
                    background: 'linear-gradient(to bottom right, hsl(var(--background) / 0.4), hsl(var(--background) / 0.3), hsl(var(--background) / 0.4))',
                    backdropFilter: 'blur(24px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(24px) saturate(180%)'
                  }}
                >
                  {/* Subtle shine effect on top */}
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
                  
                  {/* Content layer */}
                  <div className="relative">
                    <DropdownMenuItem asChild className={`py-6 px-4 ${location === '/bonuses' ? 'border-b-2 border-blue-500' : ''}`}>
                      <Link href="/bonuses">
                        <div className={`flex items-center gap-3 cursor-pointer w-full uppercase font-semibold text-base ${location === '/bonuses' ? 'text-blue-500' : ''}`}>
                          <Gift className="h-5 w-5" />
                          <span>Бонусы</span>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className={`py-6 px-4 ${location === '/sniper' ? 'border-b-2 border-blue-500' : ''}`}>
                      <Link href="/sniper">
                        <div className={`flex items-center gap-3 cursor-pointer w-full uppercase font-semibold text-base ${location === '/sniper' ? 'text-blue-500' : ''}`}>
                          <div className="relative h-5 w-5">
                            <Target className="h-5 w-5 text-transparent bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 bg-clip-text" 
                                    style={{
                                      WebkitBackgroundClip: 'text',
                                      WebkitTextFillColor: 'transparent',
                                      backgroundClip: 'text'
                                    }} 
                            />
                            <Target className="h-5 w-5 absolute inset-0" 
                                    style={{
                                      stroke: 'url(#sniper-gradient)',
                                      fill: 'none'
                                    }}
                            />
                            <svg width="0" height="0" style={{ position: 'absolute' }}>
                              <defs>
                                <linearGradient id="sniper-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                  <stop offset="0%" stopColor="#a855f7" />
                                  <stop offset="50%" stopColor="#ec4899" />
                                  <stop offset="100%" stopColor="#a855f7" />
                                </linearGradient>
                              </defs>
                            </svg>
                          </div>
                          <span>Снайпер</span>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className={`py-6 px-4 ${location === '/partners' ? 'border-b-2 border-blue-500' : ''}`}>
                      <Link href="/partners">
                        <div className={`flex items-center gap-3 cursor-pointer w-full uppercase font-semibold text-base ${location === '/partners' ? 'text-blue-500' : ''}`}>
                          <Handshake className="h-5 w-5" />
                          <span>Партнёры</span>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {/* Trade-In Button with Gradient */}
            <Link href="/trade-in">
              <Button 
                size="sm"
                className="gap-0.5 md:gap-1 lg:gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30 ml-1 md:ml-2 px-2 md:px-3 lg:px-4 h-auto py-1 md:py-1.5 lg:py-2 text-xs md:text-sm"
                data-testid="button-trade-in"
              >
                <RefreshCw className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Trade-In</span>
                <span className="sm:hidden">TI</span>
              </Button>
            </Link>
          </nav>

          {/* Desktop Search */}
          <div className="flex-1 max-w-xl mx-2 md:mx-4 hidden lg:block">
            <div className={`relative rounded-xl overflow-hidden ${
              (location === "/shop" || location === "/library") ? "visible" : "invisible"
            }`}>
              {/* Glassmorphism layer with backdrop blur */}
              <div className="absolute inset-0 bg-gradient-to-r from-background/40 via-background/30 to-background/40 border border-border/40 rounded-xl" 
                   style={{
                     backdropFilter: 'blur(24px) saturate(180%)',
                     WebkitBackdropFilter: 'blur(24px) saturate(180%)'
                   }} 
              />
              
              {/* Subtle shine effect on top */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-t-xl" />
              
              {/* Content layer */}
              <div className="relative">
                <Search className="absolute left-2 md:left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground z-10" />
                <Input
                  type="search"
                  placeholder="Поиск курсов..."
                  className="pl-8 md:pl-10 pr-2 text-sm md:text-base bg-transparent border-0 focus-visible:ring-0 relative h-8 md:h-10"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  data-testid="input-search"
                />
              </div>
            </div>
          </div>

          {/* Mobile Search */}
          <div className="flex-1 min-w-0 mx-0.5 sm:mx-1 md:mx-2 lg:hidden">
            <div className={`relative rounded-lg sm:rounded-xl overflow-hidden ${
              (location === "/shop" || location === "/library") ? "visible" : "invisible"
            }`}>
              {/* Glassmorphism layer with backdrop blur */}
              <div className="absolute inset-0 bg-gradient-to-r from-background/40 via-background/30 to-background/40 border border-border/40 rounded-lg sm:rounded-xl" 
                   style={{
                     backdropFilter: 'blur(24px) saturate(180%)',
                     WebkitBackdropFilter: 'blur(24px) saturate(180%)'
                   }} 
              />
              
              {/* Subtle shine effect on top */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-t-lg sm:rounded-t-xl" />
              
              {/* Content layer */}
              <div className="relative">
                <Search className="absolute left-1.5 sm:left-2 top-1/2 -translate-y-1/2 h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground z-10" />
                <Input
                  type="search"
                  placeholder="Поиск..."
                  className="pl-7 sm:pl-8 pr-1 sm:pr-2 py-1 text-xs sm:text-sm bg-transparent border-0 focus-visible:ring-0 relative h-7 sm:h-8"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  data-testid="input-search-mobile"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-0.5 sm:gap-1 md:gap-1.5 lg:gap-2 flex-shrink-0">
            {/* Balance */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="hidden md:block relative rounded-lg md:rounded-xl overflow-hidden cursor-help">
                  {/* Glassmorphism layer */}
                  <div className="absolute inset-0 bg-gradient-to-r from-background/40 via-background/30 to-background/40 border border-border/40 rounded-lg md:rounded-xl" 
                       style={{
                         backdropFilter: 'blur(24px) saturate(180%)',
                         WebkitBackdropFilter: 'blur(24px) saturate(180%)'
                       }} 
                  />
                  {/* Subtle shine effect */}
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-t-lg md:rounded-t-xl" />
                  {/* Content */}
                  <div className="relative flex items-center gap-0.5 md:gap-1 lg:gap-2 px-1.5 py-0.5 md:px-2 md:py-1 lg:px-3 lg:py-1.5">
                    <span className="text-[10px] md:text-xs lg:text-sm text-muted-foreground hidden xl:inline">Баланс:</span>
                    <span className="text-[10px] md:text-xs lg:text-sm font-semibold whitespace-nowrap" data-testid="text-balance">{formatPrice(totalBalance)} ₽</span>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Основной баланс для покупки курсов</p>
                <p className="text-xs text-muted-foreground">Пополняйте и приглашайте друзей</p>
              </TooltipContent>
            </Tooltip>

            {/* Fantiks */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="hidden md:block relative rounded-lg md:rounded-xl overflow-hidden cursor-help">
                  {/* Glassmorphism layer */}
                  <div className="absolute inset-0 bg-gradient-to-r from-background/40 via-background/30 to-background/40 border border-border/40 rounded-lg md:rounded-xl" 
                       style={{
                         backdropFilter: 'blur(24px) saturate(180%)',
                         WebkitBackdropFilter: 'blur(24px) saturate(180%)'
                       }} 
                  />
                  {/* Subtle shine effect */}
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-t-lg md:rounded-t-xl" />
                  {/* Content */}
                  <div className="relative flex items-center gap-0.5 md:gap-1 lg:gap-2 px-1.5 py-0.5 md:px-2 md:py-1 lg:px-3 lg:py-1.5">
                    <Gift className="h-3 w-3 md:h-3.5 md:w-3.5 lg:h-4 lg:w-4 text-purple-500 flex-shrink-0" />
                    <span className="text-[10px] md:text-xs lg:text-sm font-semibold text-purple-600 dark:text-purple-400" data-testid="text-fantiks">{user?.fantiks || 0}</span>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Фантики — бонусная валюта</p>
                <p className="text-xs text-muted-foreground">Используйте для скидок на курсы</p>
              </TooltipContent>
            </Tooltip>

            {/* Notifications Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hidden sm:flex h-7 w-7 md:h-8 md:w-8 lg:h-9 lg:w-9"
                    data-testid="button-notifications"
                    title="Уведомления"
                  >
                    <Bell className="h-3.5 w-3.5 md:h-4 md:w-4 lg:h-5 lg:w-5" />
                  </Button>
                  {unreadCount && unreadCount.count > 0 && (
                    <div 
                      className="absolute -top-0.5 -right-0.5 md:-top-1 md:-right-1 h-4 w-4 md:h-5 md:w-5 rounded-full bg-red-600 flex items-center justify-center pointer-events-none"
                      data-testid="badge-notification-count"
                    >
                      <span className="text-[8px] md:text-[10px] font-bold text-white">
                        {unreadCount.count > 9 ? '9+' : unreadCount.count}
                      </span>
                    </div>
                  )}
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-96 p-0" align="end">
                <div className="flex items-center justify-between p-4 border-b">
                  <h3 className="font-semibold">Уведомления</h3>
                  {unreadCount && unreadCount.count > 0 && (
                    <Badge variant="destructive" className="rounded-full">
                      {unreadCount.count}
                    </Badge>
                  )}
                </div>
                <ScrollArea className="h-[400px]">
                  {notifications && notifications.length > 0 ? (
                    <div className="divide-y">
                      {notifications.slice(0, 5).map((notification) => {
                        const link = getNotificationLink(notification);
                        return (
                          <div
                            key={notification.id}
                            className={`p-4 hover-elevate cursor-pointer transition-colors ${
                              !notification.isRead ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                            }`}
                            data-testid={`notification-item-${notification.id}`}
                          >
                            {link ? (
                              <Link href={link} className="block w-full">
                                <div className="space-y-1">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-sm force-wrap">
                                        {notification.title}
                                      </p>
                                    </div>
                                    {!notification.isRead && (
                                      <div className="h-2 w-2 rounded-full bg-blue-500 mt-1 flex-shrink-0" />
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground force-wrap">
                                    {notification.message}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(new Date(notification.createdAt), {
                                      addSuffix: true,
                                      locale: ru,
                                    })}
                                  </p>
                                </div>
                              </Link>
                            ) : (
                              <div className="space-y-1 w-full">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm force-wrap">
                                      {notification.title}
                                    </p>
                                  </div>
                                  {!notification.isRead && (
                                    <div className="h-2 w-2 rounded-full bg-blue-500 mt-1 flex-shrink-0" />
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground force-wrap">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(notification.createdAt), {
                                    addSuffix: true,
                                    locale: ru,
                                  })}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Bell className="h-12 w-12 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Нет уведомлений</p>
                    </div>
                  )}
                </ScrollArea>
                {notifications && notifications.length > 0 && (
                  <div className="p-2 border-t">
                    <Link href="/notifications">
                      <Button variant="ghost" className="w-full" size="sm" data-testid="button-all-notifications">
                        Все уведомления
                      </Button>
                    </Link>
                  </div>
                )}
              </PopoverContent>
            </Popover>

            {/* Support Button */}
            <Button
              variant="ghost"
              size="icon"
              className="hidden sm:flex h-7 w-7 md:h-8 md:w-8 lg:h-9 lg:w-9"
              onClick={() => window.open(tradeInContent?.telegramUrl || 'https://t.me/vkurse_support', '_blank')}
              data-testid="button-support"
              title="Техподдержка"
            >
              <Headphones className="h-3.5 w-3.5 md:h-4 md:w-4 lg:h-5 lg:w-5" />
            </Button>

            {/* User Avatar Dropdown - Hidden on mobile */}
            <Tooltip>
              <DropdownMenu>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <div className="hidden md:block relative rounded-lg md:rounded-xl overflow-hidden cursor-pointer">
                      {/* Glassmorphism layer */}
                      <div className="absolute inset-0 bg-gradient-to-r from-background/40 via-background/30 to-background/40 border border-border/40 rounded-lg md:rounded-xl" 
                           style={{
                             backdropFilter: 'blur(24px) saturate(180%)',
                             WebkitBackdropFilter: 'blur(24px) saturate(180%)'
                           }} 
                      />
                      {/* Subtle shine effect */}
                      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-t-lg md:rounded-t-xl" />
                      {/* Content */}
                      <div className="relative flex items-center gap-1 md:gap-1.5 lg:gap-2 px-1.5 py-0.5 md:px-2 md:py-1 lg:px-3 lg:py-2 hover-elevate active-elevate-2" data-testid="button-user-menu">
                        {selectedAward ? (
                          <AwardIcon emoji={selectedAward.imageUrl} rarity={selectedAward.rarity} size={24} className="md:w-7 md:h-7 lg:w-8 lg:h-8" />
                        ) : (
                          <Avatar className="h-6 w-6 md:h-7 md:w-7 lg:h-8 lg:w-8 rounded-full">
                            <AvatarImage src={user?.profileImageUrl || undefined} />
                            <AvatarFallback className="text-[10px] md:text-xs">{userInitials}</AvatarFallback>
                          </Avatar>
                        )}
                        <div className="hidden lg:flex flex-col items-start">
                          <span className="text-[10px] md:text-xs font-medium leading-none">Настройки</span>
                          <span className="text-[9px] md:text-xs text-muted-foreground leading-none mt-0.5">профиля</span>
                        </div>
                        <Settings className="h-3 w-3 md:h-3.5 md:w-3.5 lg:h-4 lg:w-4 text-muted-foreground hidden lg:block" />
                      </div>
                    </div>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium" data-testid="text-username">
                    {user?.firstName && user?.lastName
                      ? `${user.firstName} ${user.lastName}`
                      : user?.email || "Пользователь"}
                  </p>
                  <p className="text-xs text-muted-foreground" data-testid="text-user-email">
                    {user?.email}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <span className="flex items-center cursor-pointer w-full" data-testid="link-profile">
                      <User className="mr-2 h-4 w-4" />
                      Мой профиль
                    </span>
                  </Link>
                </DropdownMenuItem>
                {user?.isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin">
                      <span className="flex items-center cursor-pointer w-full" data-testid="link-admin">
                        <ShoppingBag className="mr-2 h-4 w-4" />
                        Админ панель
                      </span>
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => {
                    // Clear all Telegram reminder session flags before logout
                    Object.keys(sessionStorage).forEach(key => {
                      if (key.startsWith('telegramReminderShown:')) {
                        sessionStorage.removeItem(key);
                      }
                    });
                    // Redirect to logout
                    window.location.href = '/api/logout';
                  }}
                  className="cursor-pointer"
                  data-testid="button-logout"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Выйти
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <TooltipContent>
              <div className="text-sm">
                <p className="font-medium mb-1">Настройки профиля</p>
                <p className="text-xs text-muted-foreground">• Редактирование данных</p>
                <p className="text-xs text-muted-foreground">• Баланс и пополнение</p>
                <p className="text-xs text-muted-foreground">• Реферальная система</p>
                <p className="text-xs text-muted-foreground">• Выход из аккаунта</p>
              </div>
            </TooltipContent>
          </Tooltip>
          </div>
        </div>
      </div>
      
      <MobileNavDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        user={user}
        onOpenFilters={onOpenFilters}
      />
    </header>
  );
}
