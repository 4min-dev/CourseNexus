import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ShoppingCart, BookOpen, ArrowLeft, CheckCircle2, Star, Sparkles, Crown, Check, Gem, Package, TrendingDown, ArrowRight, ThumbsUp, ThumbsDown, Edit, Trash2, AlertCircle, Heart, Users, PlayCircle, Clock, Award, TrendingUp } from "lucide-react";
import { Link } from "wouter";
import type { Course, Review, Lesson, Subcategory, Category } from "@shared/schema";
import { Header } from "@/components/header";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { Footer } from "@/components/footer";
import { formatPrice } from "@/lib/formatPrice";
import { VideoPlayer } from "@/components/VideoPlayer";
import { celebrateJackpot } from "@/lib/celebration";
import { SuccessDialog } from "@/components/success-dialog";
import { useLocation } from "wouter";
import { AwardIcon } from "@/components/award-icon";

interface VipTier {
  id: string;
  tier: string;
  displayName: string;
  description: string | null;
  price: string;
  features: string[];
}

function VipSubscriptionPage({
  course,
  vipTier,
  isPurchased,
  balance,
  fantiks,
  useFantiks,
  setUseFantiks,
  showPurchaseDialog,
  setShowPurchaseDialog,
  showSuccessDialog,
  setShowSuccessDialog,
  purchaseMutation
}: {
  course: Course;
  vipTier: VipTier;
  isPurchased: boolean;
  balance: number;
  fantiks: number;
  useFantiks: boolean;
  setUseFantiks: (value: boolean) => void;
  showPurchaseDialog: boolean;
  setShowPurchaseDialog: (value: boolean) => void;
  showSuccessDialog: boolean;
  setShowSuccessDialog: (value: boolean) => void;
  purchaseMutation: ReturnType<typeof useMutation<void, Error, { useFantiks: boolean; payWithFantiks: boolean }, unknown>>;
}) {
  const [, setLocation] = useLocation();

  const price = parseFloat(vipTier.price || "0");
  const maxFantiksDiscount = price * 0.2;
  const fantiksToUse = Math.min(fantiks, maxFantiksDiscount);
  const priceWithDiscount = useFantiks ? Math.max(0, price - fantiksToUse) : price;
  const canAfford = balance >= priceWithDiscount;

  const getTierGradient = (tier: string) => {
    const gradients: Record<string, string> = {
      bronze: "from-orange-600/20 via-amber-500/20 to-orange-600/20",
      silver: "from-slate-400/20 via-gray-300/20 to-slate-400/20",
      gold: "from-yellow-500/20 via-amber-400/20 to-yellow-500/20",
      diamond: "from-cyan-400/20 via-blue-500/20 to-purple-600/20",
    };
    return gradients[tier] || gradients.bronze;
  };

  const getTierColors = (tier: string) => {
    const colors: Record<string, { border: string; glow: string; text: string; icon: string }> = {
      bronze: {
        border: "border-orange-600/30",
        glow: "shadow-orange-500/20",
        text: "text-orange-500",
        icon: "text-orange-500"
      },
      silver: {
        border: "border-slate-400/30",
        glow: "shadow-slate-400/20",
        text: "text-slate-300",
        icon: "text-slate-400"
      },
      gold: {
        border: "border-yellow-500/30",
        glow: "shadow-yellow-500/20",
        text: "text-yellow-500",
        icon: "text-yellow-500"
      },
      diamond: {
        border: "border-cyan-400/30",
        glow: "shadow-cyan-400/20",
        text: "text-cyan-400",
        icon: "text-cyan-400"
      },
    };
    return colors[tier] || colors.bronze;
  };

  const tierGradient = getTierGradient(vipTier.tier);
  const tierColors = getTierColors(vipTier.tier);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Header />
      <main className="container mx-auto px-3 md:px-4 py-4 md:py-6 max-w-7xl">
        <div
          className="inline-flex items-center gap-2 text-sm md:text-base text-muted-foreground hover:text-foreground mb-4 md:mb-6 hover-elevate px-2 py-1 rounded-md transition-all cursor-pointer"
          data-testid="link-back-to-shop"
          onClick={() => {
            const shopUrl = sessionStorage.getItem('shopUrl');
            setLocation(shopUrl || '/shop');
          }}
        >
          <ArrowLeft className="h-4 w-4" />
          Назад к магазину
        </div>

        <div className="grid lg:grid-cols-5 gap-4 md:gap-8">
          {/* Left: Hero & Description */}
          <div className="lg:col-span-3 space-y-8">
            {/* Premium Hero Section with Gradient */}
            <div className={`relative overflow-hidden rounded-xl border-2 ${tierColors.border} bg-gradient-to-br ${tierGradient} shadow-2xl ${tierColors.glow}`}>
              <div className="absolute inset-0 bg-gradient-to-br from-background/90 via-background/80 to-background/90" />
              <div className="relative p-8 lg:p-12">
                <div className="flex items-center gap-4 mb-6">
                  <div className={`p-4 rounded-full bg-background/50 border ${tierColors.border}`}>
                    <Crown className={`h-8 w-8 ${tierColors.icon}`} />
                  </div>
                  <div>
                    <h1 className="text-4xl lg:text-5xl font-bold tracking-tight" data-testid="text-vip-title">
                      {vipTier.displayName}
                    </h1>
                    <p className="text-muted-foreground mt-1">Премиум подписка</p>
                  </div>
                </div>

                {vipTier.description && (
                  <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl" data-testid="text-vip-description">
                    {vipTier.description}
                  </p>
                )}
              </div>
            </div>

            {/* Features Section */}
            {vipTier.features && vipTier.features.length > 0 && (
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <Gem className={`h-6 w-6 ${tierColors.icon}`} />
                    Что входит в подписку
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    {vipTier.features.map((feature, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-3 rounded-lg hover-elevate bg-muted/30"
                        data-testid={`feature-${idx}`}
                      >
                        <div className={`mt-0.5 p-1 rounded-full ${tierColors.border} bg-background`}>
                          <Check className={`h-4 w-4 ${tierColors.icon}`} />
                        </div>
                        <p className="text-sm leading-relaxed">{feature}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Additional Description */}
            {course.description && (
              <Card>
                <CardHeader>
                  <CardTitle>Дополнительная информация</CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground"
                    data-testid="text-vip-additional-description"
                    dangerouslySetInnerHTML={{ __html: course.description || '' }}
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right: Premium Purchase Card */}
          <div className="lg:col-span-2">
            <Card className={`sticky top-20 border-2 ${tierColors.border} shadow-xl ${tierColors.glow}`}>
              {/* Thumbnail with gradient overlay */}
              {course.thumbnailImage && (
                <div className="relative aspect-video w-full overflow-hidden">
                  <img
                    src={course.thumbnailImage}
                    alt={vipTier.displayName}
                    className="w-full h-full object-cover"
                  />
                  <div className={`absolute inset-0 bg-gradient-to-t ${tierGradient}`} />
                </div>
              )}

              <CardHeader className="space-y-4">
                <div className="flex items-baseline gap-2">
                  <h3 className="text-4xl font-bold" data-testid="text-vip-price">
                    {formatPrice(price)} ₽
                  </h3>
                  {!isPurchased && (
                    <Sparkles className="h-5 w-5 text-yellow-500" />
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {isPurchased ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-chart-2">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-semibold">VIP подписка активна</span>
                    </div>
                    <Link href="/library/vip-select">
                      <Button className="w-full" data-testid="button-select-courses">
                        Выбрать курсы
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <>
                    <Button
                      className="w-full text-lg py-6"
                      onClick={() => setShowPurchaseDialog(true)}
                      disabled={purchaseMutation.isPending}
                      data-testid="button-purchase-vip"
                    >
                      {purchaseMutation.isPending ? (
                        "Обработка..."
                      ) : (
                        <>
                          <Crown className="mr-2 h-5 w-5" />
                          Приобрести VIP подписку
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      На вашем балансе: {formatPrice(balance)} ₽
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />

      {/* Purchase Confirmation Dialog */}
      <Dialog open={showPurchaseDialog} onOpenChange={setShowPurchaseDialog}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-purchase-confirmation">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className={`h-5 w-5 ${tierColors.icon}`} />
              Подтверждение покупки VIP подписки
            </DialogTitle>
            <DialogDescription>
              Проверьте детали покупки перед подтверждением
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* VIP Info */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-muted-foreground">Подписка</h4>
              <p className="font-medium" data-testid="text-dialog-vip-name">{vipTier.displayName}</p>
            </div>

            {/* Fantiks Checkbox */}
            {fantiks > 0 && (
              <div className="flex items-start space-x-3 rounded-lg border border-border p-4 bg-muted/30">
                <Checkbox
                  id="use-fantiks"
                  checked={useFantiks}
                  onCheckedChange={(checked) => setUseFantiks(checked as boolean)}
                  data-testid="checkbox-use-fantiks"
                />
                <div className="flex-1 space-y-1">
                  <Label
                    htmlFor="use-fantiks"
                    className="text-sm font-medium leading-none cursor-pointer flex items-center gap-2"
                  >
                    <Sparkles className="h-4 w-4 text-yellow-500" />
                    Использовать фантики для скидки
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    У вас есть {fantiks} фантиков. Скидка до 20% ({formatPrice(maxFantiksDiscount)} ₽)
                  </p>
                </div>
              </div>
            )}

            {/* Price Breakdown */}
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Цена подписки:</span>
                <span className={useFantiks ? "line-through text-muted-foreground" : "font-semibold"} data-testid="text-dialog-original-price">
                  {formatPrice(price)} ₽
                </span>
              </div>

              {useFantiks && fantiksToUse > 0 && (
                <>
                  <div className="flex justify-between items-center text-yellow-600 dark:text-yellow-500">
                    <span className="flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      Скидка фантиками:
                    </span>
                    <span data-testid="text-dialog-fantiks-discount">-{formatPrice(fantiksToUse)} ₽</span>
                  </div>
                  <div className="h-px bg-border" />
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Итого к оплате:</span>
                    <span className="text-primary" data-testid="text-dialog-final-price">{formatPrice(priceWithDiscount)} ₽</span>
                  </div>
                </>
              )}

              <div className="flex justify-between items-center text-sm pt-2 border-t border-border">
                <span className="text-muted-foreground">Ваш баланс:</span>
                <span className={canAfford ? "text-chart-2" : "text-destructive"} data-testid="text-dialog-balance">
                  {formatPrice(balance)} ₽
                </span>
              </div>
            </div>

            {!canAfford && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                <p className="text-sm text-destructive text-center">
                  Недостаточно средств на балансе. Пополните баланс для покупки.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowPurchaseDialog(false);
                setUseFantiks(false);
              }}
              data-testid="button-dialog-cancel"
            >
              Отмена
            </Button>
            <Button
              onClick={() => purchaseMutation.mutate({ useFantiks, payWithFantiks: false })}
              disabled={!canAfford || purchaseMutation.isPending}
              data-testid="button-dialog-confirm"
            >
              {purchaseMutation.isPending ? "Обработка..." : "Подтвердить покупку"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <SuccessDialog
        open={showSuccessDialog}
        onOpenChange={setShowSuccessDialog}
        title="🎉 Покупка успешна!"
        description={`VIP подписка "${vipTier.displayName}" активирована! Откройте библиотеку и выберите курсы из вашего VIP пакета.`}
        isVip={true}
        onGoToCourse={() => {
          setShowSuccessDialog(false);
          setLocation('/library');
        }}
        onContinueShopping={() => {
          setShowSuccessDialog(false);
          const shopUrl = sessionStorage.getItem('shopUrl');
          setLocation(shopUrl || '/shop');
        }}
      />
    </div>
  );
}

export default function CourseDetail() {
  const [, params] = useRoute("/course/:id");
  const courseId = params?.id;
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [useFantiks, setUseFantiks] = useState(false);
  const [payWithFantiks, setPayWithFantiks] = useState(false);

  const { data: course, isLoading } = useQuery<Course>({
    queryKey: ["/api/courses", courseId],
    enabled: !!courseId,
  });

  console.log('course', course)

  const { data: purchases } = useQuery<{ courseId: string }[]>({
    queryKey: ["/api/purchases"],
  });

  const { data: previewLesson } = useQuery<Lesson>({
    queryKey: ["/api/courses", courseId, "preview"],
    queryFn: async () => {
      const res = await fetch(`/api/courses/${courseId}/preview`, {
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      return res.json();
    },
    enabled: !!courseId,
  });

  const { data: courseStats } = useQuery<{
    lessonCount: number;
    totalDurationMinutes: number;
    purchaseCount: number;
  }>({
    queryKey: ["/api/courses", courseId, "stats"],
    enabled: !!courseId,
  });

  const { data: coursePackages } = useQuery<Array<{
    id: string;
    name: string;
    description: string | null;
    thumbnailUrl: string | null;
    discount: number;
    totalPrice: number;
    discountedPrice: number;
    courseCount: number;
  }>>({
    queryKey: ["/api/courses", courseId, "packages"],
    enabled: !!courseId,
  });

  const { data: subcategories } = useQuery<Subcategory[]>({
    queryKey: ["/api/subcategories"],
  });

  const { data: vipTier, isLoading: isVipTierLoading, isError: isVipTierError } = useQuery<VipTier>({
    queryKey: ["/api/vip-tiers", course?.vipTier],
    queryFn: async () => {
      const res = await fetch(`/api/vip-tiers`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load VIP tiers");
      const tiers = await res.json();
      return tiers.find((t: VipTier) => t.tier === course?.vipTier || t.id === course?.vipTier);
    },
    enabled: !!course?.isVipSubscription && !!course?.vipTier,
  });

  const isPurchased = purchases?.some((p) => p.courseId === courseId);

  const purchaseMutation = useMutation({
    mutationFn: async (params: { useFantiks: boolean; payWithFantiks: boolean }) => {
      await apiRequest("POST", `/api/purchases`, {
        courseId,
        useFantiks: params.useFantiks,
        payWithFantiks: params.payWithFantiks
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/library/new-count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return Array.isArray(key) && key.some(k =>
            typeof k === 'string' && k.includes('/api/balance/transactions')
          );
        }
      });
      setShowPurchaseDialog(false);
      setUseFantiks(false);
      setPayWithFantiks(false);

      celebrateJackpot();

      setTimeout(() => {
        setShowSuccessDialog(true);
      }, 400);
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Ошибка авторизации",
          description: "Требуется вход в систему",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось купить курс",
        variant: "destructive",
      });
    },
  });

  const { data: favorites } = useQuery<{ courseId: string }[]>({
    queryKey: ["/api/favorites"],
    enabled: !!user,
  });

  const favoriteMutation = useMutation({
    mutationFn: async ({ courseId, isFavorited }: { courseId: string; isFavorited: boolean }) => {
      if (isFavorited) {
        await apiRequest("DELETE", `/api/favorites/${courseId}`);
      } else {
        await apiRequest("POST", `/api/favorites/${courseId}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
    },
  });

  const isFavorited = favorites?.some((f) => f.courseId === courseId) || false;

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!courseId) return;
    favoriteMutation.mutate({ courseId, isFavorited });
  };

  const { data: courseRating } = useQuery<{ averageRating: number; totalReviews: number }>({
    queryKey: ["/api/courses", courseId, "rating"],
    queryFn: async () => {
      const res = await fetch(`/api/courses/${courseId}/rating`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch rating stats");
      return res.json();
    },
    enabled: !!courseId,
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const getPlatformName = (platform: string | null) => {
    const selectedPlatform = categories?.filter(cat => cat.slug === platform)[0].name

    return selectedPlatform || platform
  };

  const getLevelName = (level: string) => {
    const names: Record<string, string> = {
      beginner: "Для новичков",
      intermediate: "Для опытных",
      advanced: "Продвинутый",
    };

    return names[level] || level;
  };

  const fantiksBalance = parseFloat(user?.balance || "0");
  const referralBalance = parseFloat(user?.referralBalance || "0");
  const balance = fantiksBalance + referralBalance; // Total available balance
  const fantiks = user?.fantiks || 0;
  const moneyPrice = parseFloat(course?.price || "0");
  const fantikPrice = course?.fantikPrice ? parseInt(course.fantikPrice.toString()) : 0;
  const paymentType = course?.paymentType || 'money_only';

  // Calculate final price based on payment method
  let finalPrice = 0;
  let canAfford = true;
  let fantiksToUse = 0;
  let maxFantiksDiscount = 0;

  if (payWithFantiks) {
    finalPrice = fantikPrice;
    canAfford = fantiks >= fantikPrice;
  } else {
    finalPrice = moneyPrice;
    maxFantiksDiscount = moneyPrice * 0.2; // 20% max discount
    fantiksToUse = useFantiks ? Math.min(fantiks, maxFantiksDiscount) : 0;
    const priceWithDiscount = Math.max(0, moneyPrice - fantiksToUse);
    finalPrice = priceWithDiscount;
    canAfford = balance >= priceWithDiscount;
  }

  if (isLoading || !course) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-6 max-w-6xl">
          <Skeleton className="h-8 w-32 mb-6" />
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="aspect-video w-full" />
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-24 w-full" />
            </div>
            <div className="lg:col-span-1">
              <Skeleton className="h-96 w-full" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (course.isVipSubscription) {
    if (!course.vipTier) {
      return (
        <div className="min-h-screen bg-background">
          <Header />
          <main className="container mx-auto px-4 py-6 max-w-6xl">
            <div
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 hover-elevate px-2 py-1 rounded-md transition-all cursor-pointer"
              data-testid="link-back-to-shop"
              onClick={() => {
                const shopUrl = sessionStorage.getItem('shopUrl');
                setLocation(shopUrl || '/shop');
              }}
            >
              <ArrowLeft className="h-4 w-4" />
              Назад к магазину
            </div>
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="text-destructive">Ошибка конфигурации VIP подписки</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  У данной VIP подписки не указан тип тарифа. Пожалуйста, свяжитесь с поддержкой.
                </p>
              </CardContent>
            </Card>
          </main>
          <Footer />
        </div>
      );
    }

    if (isVipTierLoading) {
      return (
        <div className="min-h-screen bg-background">
          <Header />
          <main className="container mx-auto px-4 py-6 max-w-6xl">
            <div
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 hover-elevate px-2 py-1 rounded-md transition-all cursor-pointer"
              data-testid="link-back-to-shop"
              onClick={() => {
                const shopUrl = sessionStorage.getItem('shopUrl');
                setLocation(shopUrl || '/shop');
              }}
            >
              <ArrowLeft className="h-4 w-4" />
              Назад к магазину
            </div>
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground">Загрузка VIP подписки...</p>
              </div>
            </div>
          </main>
          <Footer />
        </div>
      );
    }

    if (isVipTierError || (!isVipTierLoading && !vipTier)) {
      return (
        <div className="min-h-screen bg-background">
          <Header />
          <main className="container mx-auto px-4 py-6 max-w-6xl">
            <div
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 hover-elevate px-2 py-1 rounded-md transition-all cursor-pointer"
              data-testid="link-back-to-shop"
              onClick={() => {
                const shopUrl = sessionStorage.getItem('shopUrl');
                setLocation(shopUrl || '/shop');
              }}
            >
              <ArrowLeft className="h-4 w-4" />
              Назад к магазину
            </div>
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="text-destructive">Ошибка загрузки VIP подписки</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {isVipTierError
                    ? "Не удалось загрузить информацию о VIP подписке. Пожалуйста, попробуйте обновить страницу."
                    : `VIP тариф "${course.vipTier}" не найден. Пожалуйста, свяжитесь с поддержкой.`
                  }
                </p>
              </CardContent>
            </Card>
          </main>
          <Footer />
        </div>
      );
    }

    return <VipSubscriptionPage
      course={course}
      vipTier={vipTier!}
      isPurchased={!!isPurchased}
      balance={balance}
      fantiks={fantiks}
      useFantiks={useFantiks}
      setUseFantiks={setUseFantiks}
      showPurchaseDialog={showPurchaseDialog}
      setShowPurchaseDialog={setShowPurchaseDialog}
      showSuccessDialog={showSuccessDialog}
      setShowSuccessDialog={setShowSuccessDialog}
      purchaseMutation={purchaseMutation}
    />;
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-6xl">
        <div
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 hover-elevate px-2 py-1 rounded-md transition-all cursor-pointer"
          data-testid="link-back-to-shop"
          onClick={() => {
            const shopUrl = sessionStorage.getItem('shopUrl');
            setLocation(shopUrl || '/shop');
          }}
        >
          <ArrowLeft className="h-4 w-4" />
          Назад к магазину
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Preview Video Section - Full Player with Controls */}
            <div className="aspect-video w-full bg-muted overflow-hidden rounded-lg">
              {previewLesson?.videoUrl ? (
                <VideoPlayer
                  src={previewLesson.videoUrl}
                />
              ) : course.thumbnailImage ? (
                <img
                  src={course.thumbnailImage}
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <BookOpen className="h-24 w-24 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Hero Section with Gradient Background */}
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-orange-500/10 p-6 border border-purple-500/20">
              {/* Decorative Elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-pink-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

              <div className="relative space-y-4">
                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="border-purple-500/30 bg-purple-500/10">
                    <Award className="h-3 w-3 mr-1" />
                    {getPlatformName(course.platform)}
                  </Badge>
                  {Array.isArray(course.level) && course.level.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {Array.from(
                        new Set(
                          course.level
                            .map(id => subcategories.find(sub => sub.id === id))
                            .filter(Boolean)
                            .map(sub => sub.name)
                        )
                      ).map(levelName => (
                        <Badge key={levelName} variant="outline" className="text-sm font-medium">
                          {levelName}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <Badge variant="outline" className="border-orange-500/30 bg-orange-500/10">
                    <Clock className="h-3 w-3 mr-1" />
                    {course.year}
                  </Badge>
                  {course.isFree && (
                    <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-none">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Бесплатно
                    </Badge>
                  )}
                </div>

                {/* Title */}
                <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text" data-testid="text-course-title">
                  {course.title}
                </h1>

                {/* Rating */}
                {courseRating && courseRating.averageRating > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-5 w-5 ${star <= Math.round(courseRating.averageRating)
                            ? 'fill-yellow-500 text-yellow-500'
                            : 'text-muted-foreground/30'
                            }`}
                        />
                      ))}
                    </div>
                    <span className="text-lg font-semibold">
                      {courseRating.averageRating.toFixed(1)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      ({courseRating.totalReviews} {courseRating.totalReviews === 1 ? 'отзыв' : courseRating.totalReviews < 5 ? 'отзыва' : 'отзывов'})
                    </span>
                  </div>
                )}

                {/* Author Card */}
                <div
                  className="flex items-center gap-4 p-4 bg-background/50 backdrop-blur-sm rounded-lg border border-border/50"
                  style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' } as React.CSSProperties}
                >
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full blur-sm opacity-50" />
                    <Avatar className="h-14 w-14 relative border-2 border-background">
                      <AvatarImage src={course.authorImage || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                        {course.authorName?.[0] || 'A'}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-lg" data-testid="text-author-name">
                        {course.authorName || 'Автор'}
                      </p>
                      <Badge variant="outline" className="text-xs border-purple-500/30">
                        <Award className="h-3 w-3 mr-1" />
                        Эксперт
                      </Badge>
                    </div>
                    {course.authorBio && (
                      <p className="text-sm text-muted-foreground mt-1">{course.authorBio}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <Card>
              <CardHeader>
                <h2 className="text-2xl font-bold">Описание курса</h2>
              </CardHeader>
              <CardContent>
                <div
                  className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground"
                  data-testid="text-course-description"
                  dangerouslySetInnerHTML={{ __html: course.description || '' }}
                />
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-20">
              {/* Thumbnail above price - only show if preview video exists */}
              {previewLesson?.videoUrl && course.thumbnailImage && (
                <div className="aspect-video w-full bg-muted overflow-hidden">
                  <img
                    src={course.thumbnailImage}
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <CardHeader>
                <div data-testid="text-course-price">
                  {course.isFree ? (
                    <h3 className="text-3xl font-bold">Бесплатно</h3>
                  ) : paymentType === 'fantiks_only' ? (
                    <div className="flex flex-col gap-1">
                      <h3 className="text-3xl font-bold text-purple-400">{fantikPrice} 🎫</h3>
                      <span className="text-sm text-purple-400/70">фантики</span>
                    </div>
                  ) : paymentType === 'both' ? (
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col">
                        <h3 className="text-3xl font-bold">{formatPrice(moneyPrice)} ₽</h3>
                      </div>
                      <div className="h-12 w-px bg-gradient-to-b from-transparent via-border to-transparent" />
                      <div className="flex flex-col">
                        <span className="text-2xl font-bold text-purple-400">{fantikPrice} 🎫</span>
                        <span className="text-xs text-purple-400/70">фантики</span>
                      </div>
                    </div>
                  ) : (
                    <h3 className="text-3xl font-bold">{formatPrice(moneyPrice)} ₽</h3>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isPurchased ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-chart-2">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-semibold">Курс куплен</span>
                    </div>
                    <Link href="/library">
                      <Button className="w-full" data-testid="button-go-to-library">
                        Перейти в библиотеку
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <>
                    <Button
                      className="w-full"
                      onClick={() => {
                        if (course.isFree) {
                          purchaseMutation.mutate({ useFantiks: false, payWithFantiks: false });
                        } else {
                          if (paymentType === 'fantiks_only') {
                            setPayWithFantiks(true);
                          }
                          setShowPurchaseDialog(true);
                        }
                      }}
                      disabled={purchaseMutation.isPending}
                      data-testid="button-purchase-course"
                    >
                      {purchaseMutation.isPending ? (
                        "Обработка..."
                      ) : course.isFree ? (
                        <>
                          <BookOpen className="mr-2 h-4 w-4" />
                          Получить бесплатно
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="mr-2 h-4 w-4" />
                          Купить курс
                        </>
                      )}
                    </Button>
                    {!course.isFree && (
                      <p className="text-xs text-muted-foreground text-center">
                        На вашем балансе: {formatPrice(balance)} ₽
                      </p>
                    )}

                    {/* Favorite Button - показываем только для авторизованных пользователей */}
                    {user && (
                      <Button
                        variant="outline"
                        className={`w-full ${isFavorited
                          ? 'border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20'
                          : 'hover:border-red-500 hover:text-red-500'
                          }`}
                        onClick={handleToggleFavorite}
                        disabled={favoriteMutation.isPending}
                        data-testid="button-toggle-favorite"
                      >
                        <Heart className={`h-4 w-4 mr-2 ${isFavorited ? 'fill-current' : ''}`} />
                        {isFavorited ? "Убрать из избранного" : "Добавить в избранное"}
                      </Button>
                    )}
                  </>
                )}

                {/* Course Statistics */}
                {courseStats && (
                  <div className="pt-4 border-t border-border">
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="space-y-1">
                        <div className="flex items-center justify-center">
                          <PlayCircle className="h-4 w-4 text-primary" />
                        </div>
                        <p className="text-lg font-bold">{courseStats.lessonCount}</p>
                        <p className="text-xs text-muted-foreground">
                          {courseStats.lessonCount === 1 ? 'урок' : courseStats.lessonCount < 5 ? 'урока' : 'уроков'}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-center">
                          <Clock className="h-4 w-4 text-primary" />
                        </div>
                        <p className="text-lg font-bold">
                          {courseStats.totalDurationMinutes >= 60
                            ? `${Math.floor(courseStats.totalDurationMinutes / 60)}ч`
                            : `${courseStats.totalDurationMinutes}м`
                          }
                        </p>
                        <p className="text-xs text-muted-foreground">длительность</p>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-center">
                          <Users className="h-4 w-4 text-primary" />
                        </div>
                        <p className="text-lg font-bold">{courseStats.purchaseCount}</p>
                        <p className="text-xs text-muted-foreground">
                          {courseStats.purchaseCount === 1 ? 'студент' : courseStats.purchaseCount < 5 ? 'студента' : 'студентов'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-border space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Платформа:</span>
                    <span className="font-medium">{getPlatformName(course.platform)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Уровень:</span>
                    {Array.isArray(course.level) && course.level.length > 0 && (
                      <div className="inline-flex flex-wrap items-center gap-2">
                        {Array.from(
                          new Set(
                            course.level
                              .map(id => subcategories.find(sub => sub.id === id))
                              .filter(Boolean)
                              .map(sub => sub.name)
                          )
                        ).map(levelName => (
                          <span key={levelName} className="font-medium">
                            {levelName}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Год:</span>
                    <span className="font-medium">{course.year}</span>
                  </div>
                </div>

                {/* Package Advertisement - показываем если курс входит в подборку */}
                {coursePackages && coursePackages.length > 0 && !isPurchased && (
                  <div className="pt-4 border-t border-border">
                    {coursePackages.map((pkg) => (
                      <div
                        key={pkg.id}
                        className="relative overflow-hidden rounded-lg border border-primary/30 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-orange-500/10 p-4 space-y-3 hover-elevate active-elevate-2 transition-all duration-300"
                        data-testid={`package-ad-${pkg.id}`}
                      >
                        {/* Discount Badge */}
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-gradient-to-r from-orange-500 to-pink-500 text-white border-none shadow-lg">
                            <TrendingDown className="h-3 w-3 mr-1" />
                            -{pkg.discount}%
                          </Badge>
                        </div>

                        {/* Package Icon & Title */}
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                            <Package className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm leading-tight mb-1">
                              Этот курс входит в подборку
                            </h4>
                            <p className="text-xs text-primary font-medium truncate">
                              {pkg.name}
                            </p>
                          </div>
                        </div>

                        {/* Package Stats */}
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            {pkg.courseCount} {pkg.courseCount === 1 ? 'курс' : pkg.courseCount < 5 ? 'курса' : 'курсов'}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="line-through text-muted-foreground">
                              {formatPrice(pkg.totalPrice)} ₽
                            </span>
                            <span className="font-bold text-primary">
                              {formatPrice(pkg.discountedPrice)} ₽
                            </span>
                          </div>
                        </div>

                        {/* CTA Button */}
                        <Link href={`/package/${pkg.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full border-primary/50 hover:bg-primary/10 group"
                            data-testid={`button-view-package-${pkg.id}`}
                          >
                            <span className="text-xs">Смотреть подборку</span>
                            <ArrowRight className="ml-2 h-3 w-3 transition-transform group-hover:translate-x-1" />
                          </Button>
                        </Link>

                        {/* Savings Highlight */}
                        <p className="text-center text-xs text-muted-foreground">
                          Экономия: <span className="text-chart-2 font-semibold">{formatPrice(pkg.totalPrice - pkg.discountedPrice)} ₽</span>
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-12">
          <FrequentlyBoughtTogether courseId={courseId!} />
        </div>

        <div className="mt-12">
          <ReviewsSection courseId={courseId!} isPurchased={isPurchased || course.isFree} />
        </div>
      </main>
      <Footer />

      {/* Purchase Confirmation Dialog */}
      <Dialog open={showPurchaseDialog} onOpenChange={setShowPurchaseDialog}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-purchase-confirmation">
          <DialogHeader>
            <DialogTitle>Подтверждение покупки</DialogTitle>
            <DialogDescription>
              Проверьте детали покупки перед подтверждением
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Course Info */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-muted-foreground">Курс</h4>
              <p className="font-medium" data-testid="text-dialog-course-title">{course?.title}</p>
            </div>

            {/* For fantiks_only courses, show a notice */}
            {paymentType === 'fantiks_only' && (
              <div className="rounded-lg border border-purple-500/30 bg-purple-500/10 p-4">
                <div className="flex items-center gap-2 text-purple-400 mb-2">
                  <Sparkles className="h-4 w-4" />
                  <span className="font-semibold text-sm">Оплата только фантиками</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Этот курс можно приобрести только за фантики
                </p>
              </div>
            )}

            {/* Payment Method Selection for 'both' payment type */}
            {paymentType === 'both' && fantikPrice > 0 && (
              <div className="space-y-3 rounded-lg border border-border p-4 bg-muted/30">
                <h4 className="font-semibold text-sm">Способ оплаты</h4>
                <div className="space-y-2">
                  <div
                    className={`flex items-start space-x-3 p-3 rounded-md border cursor-pointer transition-colors ${!payWithFantiks ? 'bg-primary/10 border-primary' : 'hover:bg-muted'
                      }`}
                    onClick={() => setPayWithFantiks(false)}
                    data-testid="option-pay-with-money"
                  >
                    <div className="flex h-4 items-center">
                      <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${!payWithFantiks ? 'border-primary' : 'border-muted-foreground'
                        }`}>
                        {!payWithFantiks && <div className="h-2 w-2 rounded-full bg-primary" />}
                      </div>
                    </div>
                    <div className="flex-1">
                      <Label className="cursor-pointer font-medium">Оплатить деньгами</Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatPrice(moneyPrice)} ₽
                      </p>
                    </div>
                  </div>
                  <div
                    className={`flex items-start space-x-3 p-3 rounded-md border cursor-pointer transition-colors ${payWithFantiks ? 'bg-purple-500/10 border-purple-500' : 'hover:bg-muted'
                      }`}
                    onClick={() => setPayWithFantiks(true)}
                    data-testid="option-pay-with-fantiks"
                  >
                    <div className="flex h-4 items-center">
                      <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${payWithFantiks ? 'border-purple-500' : 'border-muted-foreground'
                        }`}>
                        {payWithFantiks && <div className="h-2 w-2 rounded-full bg-purple-500" />}
                      </div>
                    </div>
                    <div className="flex-1">
                      <Label className="cursor-pointer font-medium flex items-center gap-1">
                        <Sparkles className="h-4 w-4 text-purple-400" />
                        Оплатить фантиками
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        {fantikPrice} 🎫
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Fantiks Checkbox for money payment (discount) */}
            {!payWithFantiks && paymentType !== 'fantiks_only' && fantiks > 0 && maxFantiksDiscount > 0 && (
              <div className="flex items-start space-x-3 rounded-lg border border-border p-4 bg-muted/30">
                <Checkbox
                  id="use-fantiks"
                  checked={useFantiks}
                  onCheckedChange={(checked) => setUseFantiks(checked as boolean)}
                  data-testid="checkbox-use-fantiks"
                />
                <div className="flex-1 space-y-1">
                  <Label
                    htmlFor="use-fantiks"
                    className="text-sm font-medium leading-none cursor-pointer flex items-center gap-2"
                  >
                    <Sparkles className="h-4 w-4 text-yellow-500" />
                    Использовать фантики для скидки
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    У вас есть {fantiks} фантиков. Скидка до 20% ({formatPrice(maxFantiksDiscount)} ₽)
                  </p>
                </div>
              </div>
            )}

            {/* Price Breakdown */}
            <div className="space-y-3 pt-2">
              {payWithFantiks ? (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Цена:</span>
                    <span className="font-semibold text-purple-400" data-testid="text-dialog-fantik-price">
                      {fantikPrice} 🎫
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm pt-2 border-t border-border">
                    <span className="text-muted-foreground">У вас фантиков:</span>
                    <span className={canAfford ? "text-chart-2" : "text-destructive"} data-testid="text-dialog-fantiks-balance">
                      {fantiks} 🎫
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Цена курса:</span>
                    <span className={useFantiks ? "line-through text-muted-foreground" : "font-semibold"} data-testid="text-dialog-original-price">
                      {formatPrice(moneyPrice)} ₽
                    </span>
                  </div>

                  {useFantiks && fantiksToUse > 0 && (
                    <>
                      <div className="flex justify-between items-center text-yellow-600 dark:text-yellow-500">
                        <span className="flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          Скидка фантиками:
                        </span>
                        <span data-testid="text-dialog-fantiks-discount">-{formatPrice(fantiksToUse)} ₽</span>
                      </div>
                      <div className="h-px bg-border" />
                      <div className="flex justify-between items-center text-lg font-bold">
                        <span>Итого к оплате:</span>
                        <span className="text-primary" data-testid="text-dialog-final-price">{formatPrice(finalPrice)} ₽</span>
                      </div>
                    </>
                  )}

                  <div className="flex justify-between items-center text-sm pt-2 border-t border-border">
                    <span className="text-muted-foreground">Ваш баланс:</span>
                    <span className={canAfford ? "text-chart-2" : "text-destructive"} data-testid="text-dialog-balance">
                      {formatPrice(balance)} ₽
                    </span>
                  </div>
                </>
              )}
            </div>

            {!canAfford && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                <p className="text-sm text-destructive text-center">
                  Недостаточно средств на балансе. Пополните баланс для покупки.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowPurchaseDialog(false);
                setUseFantiks(false);
              }}
              data-testid="button-dialog-cancel"
            >
              Отмена
            </Button>
            <Button
              onClick={() => purchaseMutation.mutate({ useFantiks, payWithFantiks })}
              disabled={!canAfford || purchaseMutation.isPending}
              data-testid="button-dialog-confirm"
            >
              {purchaseMutation.isPending ? "Обработка..." : "Подтвердить покупку"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <SuccessDialog
        open={showSuccessDialog}
        onOpenChange={setShowSuccessDialog}
        title={course?.isVipSubscription ? "🎉 Поздравляем!" : "🎉 Покупка успешна!"}
        description={
          course?.isVipSubscription
            ? "VIP подписка активирована! Выберите курсы для обучения."
            : "Курс успешно добавлен в вашу библиотеку. Приступайте к обучению!"
        }
        isVip={course?.isVipSubscription || false}
        onGoToCourse={() => {
          setShowSuccessDialog(false);
          if (course?.isVipSubscription) {
            setLocation("/library/vip-select");
          } else {
            setLocation("/library");
          }
        }}
        onContinueShopping={() => {
          setShowSuccessDialog(false);
          const shopUrl = sessionStorage.getItem('shopUrl');
          setLocation(shopUrl || '/shop');
        }}
      />
    </div>
  );
}

interface ReviewWithUser extends Review {
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
    selectedAward: string | null;
  };
}

function FrequentlyBoughtTogether({ courseId }: { courseId: string }) {
  const { data: recommendations, isLoading } = useQuery<Array<Course & { purchaseCount: number }>>({
    queryKey: ['/api/courses', courseId, 'frequently-bought-together'],
    enabled: !!courseId,
  });

  const { user } = useAuth();

  const { data: userPurchases } = useQuery<string[]>({
    queryKey: ['/api/users/me/purchases'],
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>С этим курсом также покупают</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return null;
  }

  const isPurchased = (courseId: string) => userPurchases?.includes(courseId) || false;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          С этим курсом также покупают
        </CardTitle>
        <CardDescription>
          Популярные комбинации от студентов платформы
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recommendations.map((course) => {
            const purchased = isPurchased(course.id);

            return (
              <Link href={`/course/${course.id}`} key={course.id}>
                <div
                  className="group relative rounded-lg border border-border overflow-hidden hover-elevate active-elevate-2 transition-all h-full flex flex-col"
                  data-testid={`card-recommendation-${course.id}`}
                >
                  {/* Thumbnail */}
                  <div className="relative h-32 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center overflow-hidden">
                    {course.thumbnailImage ? (
                      <img
                        src={course.thumbnailImage}
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <BookOpen className="h-12 w-12 text-primary/40" />
                    )}

                    {/* Purchase badge */}
                    {purchased && (
                      <div className="absolute top-2 right-2">
                        <Badge className="bg-chart-2/90 text-white border-0">
                          <Check className="h-3 w-3 mr-1" />
                          Куплено
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="flex-1">
                      {/* Platform badge */}
                      <Badge variant="outline" className="mb-2 text-xs">
                        {course.platform}
                      </Badge>

                      {/* Title */}
                      <h4 className="font-semibold text-sm line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                        {course.title}
                      </h4>

                      {/* Author */}
                      {course.authorName && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                          {course.authorName}
                        </p>
                      )}

                      {/* Rating */}
                      {parseFloat(course.rating || '0') > 0 && (
                        <div className="flex items-center gap-1 mb-2">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs font-semibold">{parseFloat(course.rating || '0').toFixed(1)}</span>
                          {course.reviewsCount > 0 && (
                            <span className="text-xs text-muted-foreground">({course.reviewsCount})</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Price and action */}
                    <div className="mt-auto pt-3 border-t border-border">
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-primary">
                          {formatPrice(parseFloat(course.price || '0'))} ₽
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs"
                          asChild
                          data-testid={`button-view-course-${course.id}`}
                        >
                          <span>
                            Смотреть
                            <ArrowRight className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-1" />
                          </span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function ReviewsSection({ courseId, isPurchased }: { courseId: string; isPurchased: boolean }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [hoverRating, setHoverRating] = useState(0);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState(0);
  const [editComment, setEditComment] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: reviews, isLoading: reviewsLoading } = useQuery<ReviewWithUser[]>({
    queryKey: ["/api/courses", courseId, "reviews"],
    queryFn: async () => {
      const res = await fetch(`/api/courses/${courseId}/reviews`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch reviews");
      return res.json();
    },
  });

  const { data: allAwards } = useQuery({
    queryKey: ['/api/awards'],
  });

  const { data: ratingStats } = useQuery<{ averageRating: number; totalReviews: number }>({
    queryKey: ["/api/courses", courseId, "rating"],
    queryFn: async () => {
      const res = await fetch(`/api/courses/${courseId}/rating`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch rating stats");
      return res.json();
    },
  });

  const { data: myReview } = useQuery<Review | null>({
    queryKey: ["/api/reviews/my", courseId],
    queryFn: async () => {
      const res = await fetch(`/api/reviews/my/${courseId}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!user,
  });

  const createReviewMutation = useMutation({
    mutationFn: async (data: { courseId: string; rating: number; comment?: string }) => {
      await apiRequest("POST", `/api/reviews`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses", courseId, "reviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/courses", courseId, "rating"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reviews/my", courseId] });
      setRating(0);
      setComment("");
      toast({
        title: "Отзыв добавлен",
        description: "Ваш отзыв отправлен на модерацию",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось добавить отзыв",
        variant: "destructive",
      });
    },
  });

  const updateReviewMutation = useMutation({
    mutationFn: async ({ reviewId, rating, comment }: { reviewId: string; rating: number; comment?: string }) => {
      await apiRequest("PUT", `/api/reviews/${reviewId}`, { rating, comment });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses", courseId, "reviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/courses", courseId, "rating"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reviews/my", courseId] });
      setEditingReviewId(null);
      toast({
        title: "Отзыв обновлен",
        description: "Ваши изменения сохранены",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить отзыв",
        variant: "destructive",
      });
    },
  });

  const deleteReviewMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      await apiRequest("DELETE", `/api/reviews/${reviewId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses", courseId, "reviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/courses", courseId, "rating"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reviews/my", courseId] });
      toast({
        title: "Отзыв удален",
        description: "Ваш отзыв был успешно удален",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось удалить отзыв",
        variant: "destructive",
      });
    },
  });

  const voteReviewMutation = useMutation({
    mutationFn: async ({ reviewId, voteType }: { reviewId: string; voteType: 'like' | 'dislike' }) => {
      await apiRequest("POST", `/api/reviews/${reviewId}/vote`, { voteType });
    },
    onSuccess: (_, { reviewId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/reviews", reviewId, "votes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reviews", reviewId, "user-vote"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось проголосовать",
        variant: "destructive",
      });
    },
  });

  const unvoteReviewMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      await apiRequest("DELETE", `/api/reviews/${reviewId}/vote`, {});
    },
    onSuccess: (_, reviewId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/reviews", reviewId, "votes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reviews", reviewId, "user-vote"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось отменить голос",
        variant: "destructive",
      });
    },
  });

  const updateAdminCommentMutation = useMutation({
    mutationFn: async ({ reviewId, adminComment }: { reviewId: string; adminComment: string | null }) => {
      await apiRequest("PATCH", `/api/reviews/${reviewId}/admin-comment`, { adminComment });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses", courseId, "reviews"] });
      toast({
        title: "Комментарий сохранен",
        description: "Комментарий администратора обновлен",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось сохранить комментарий",
        variant: "destructive",
      });
    },
  });

  const handleSubmitReview = () => {
    if (rating === 0) {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, поставьте оценку",
        variant: "destructive",
      });
      return;
    }

    createReviewMutation.mutate({
      courseId,
      rating,
      comment: comment.trim() || undefined,
    });
  };

  const handleEditReview = (review: ReviewWithUser) => {
    setEditingReviewId(review.id);
    setEditRating(review.rating);
    setEditComment(review.comment || "");
  };

  const handleCancelEdit = () => {
    setEditingReviewId(null);
    setEditRating(0);
    setEditComment("");
  };

  const handleSaveEdit = (reviewId: string) => {
    if (editRating === 0) {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, поставьте оценку",
        variant: "destructive",
      });
      return;
    }

    updateReviewMutation.mutate({
      reviewId,
      rating: editRating,
      comment: editComment.trim() || undefined,
    });
  };

  const handleDeleteReview = (reviewId: string) => {
    if (confirm("Вы уверены, что хотите удалить свой отзыв?")) {
      deleteReviewMutation.mutate(reviewId);
    }
  };

  const StarRating = ({ value, onHover, onClick, interactive = true }: {
    value: number;
    onHover?: (rating: number) => void;
    onClick?: (rating: number) => void;
    interactive?: boolean;
  }) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-6 w-6 ${star <= value
              ? "fill-yellow-400 text-yellow-400"
              : "text-muted-foreground"
              } ${interactive ? "cursor-pointer hover:scale-110 transition-transform" : ""}`}
            onMouseEnter={() => interactive && onHover?.(star)}
            onMouseLeave={() => interactive && onHover?.(0)}
            onClick={() => interactive && onClick?.(star)}
            data-testid={`star-${star}`}
          />
        ))}
      </div>
    );
  };

  const ReviewItem = ({ review }: { review: ReviewWithUser }) => {
    const isOwnReview = user?.id === review.userId;
    const isEditing = editingReviewId === review.id;
    const [editHoverRating, setEditHoverRating] = useState(0);
    const [localAdminComment, setLocalAdminComment] = useState(review.adminComment ?? "");
    const [isEditingAdminComment, setIsEditingAdminComment] = useState(false);

    const { data: voteCounts } = useQuery<{ likes: number; dislikes: number }>({
      queryKey: ["/api/reviews", review.id, "votes"],
      queryFn: async () => {
        const res = await fetch(`/api/reviews/${review.id}/votes`, { credentials: "include" });
        if (!res.ok) return { likes: 0, dislikes: 0 };
        return res.json();
      },
    });

    const { data: userVote } = useQuery<{ voteType: 'like' | 'dislike' } | null>({
      queryKey: ["/api/reviews", review.id, "user-vote"],
      queryFn: async () => {
        const res = await fetch(`/api/reviews/${review.id}/user-vote`, { credentials: "include" });
        if (!res.ok) return null;
        return res.json();
      },
      enabled: !!user && !isOwnReview,
    });

    const handleVote = (voteType: 'like' | 'dislike') => {
      if (!user) {
        toast({
          title: "Требуется авторизация",
          description: "Войдите, чтобы голосовать",
          variant: "destructive",
        });
        return;
      }

      if (userVote?.voteType === voteType) {
        unvoteReviewMutation.mutate(review.id);
      } else {
        voteReviewMutation.mutate({ reviewId: review.id, voteType });
      }
    };

    const selectedAwardData = review.user.selectedAward && allAwards && Array.isArray(allAwards)
      ? allAwards.find((award: any) => award.imageUrl === review.user.selectedAward)
      : null;

    return (
      <div key={review.id} className="relative p-4 border border-border rounded-lg space-y-3 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5 hover-elevate transition-all" data-testid={`review-${review.id}`}>
        <div className="flex items-start gap-3">
          {review.user.selectedAward ? (
            <AwardIcon emoji={review.user.selectedAward} rarity={selectedAwardData?.rarity || 'common'} size={40} />
          ) : (
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full blur-sm opacity-30" />
              <Avatar className="relative border-2 border-purple-500/30">
                <AvatarImage src={review.user.profileImageUrl || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                  {review.user.firstName?.[0] || "U"}{review.user.lastName?.[0] || ""}
                </AvatarFallback>
              </Avatar>
            </div>
          )}
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium" data-testid={`text-review-author-${review.id}`}>
                  {review.user.firstName} {review.user.lastName}
                </p>
                {review.status === "pending" && (
                  <Badge variant="outline" className="text-xs" data-testid={`badge-pending-${review.id}`}>
                    <AlertCircle className="h-3 w-3 mr-1" />
                    На модерации
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground" data-testid={`text-review-date-${review.id}`}>
                {review.createdAt ? new Date(review.createdAt).toLocaleDateString("ru-RU") : ""}
              </p>
            </div>

            {isEditing ? (
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Ваша оценка</label>
                  <StarRating
                    value={editHoverRating || editRating}
                    onHover={setEditHoverRating}
                    onClick={setEditRating}
                    data-testid={`star-rating-edit-${review.id}`}
                  />
                </div>
                <Textarea
                  placeholder="Ваш комментарий..."
                  value={editComment}
                  onChange={(e) => setEditComment(e.target.value)}
                  rows={4}
                  data-testid={`textarea-edit-comment-${review.id}`}
                />
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleSaveEdit(review.id)}
                    disabled={updateReviewMutation.isPending || editRating === 0}
                    data-testid={`button-save-edit-${review.id}`}
                  >
                    {updateReviewMutation.isPending ? "Сохранение..." : "Сохранить"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancelEdit}
                    data-testid={`button-cancel-edit-${review.id}`}
                  >
                    Отмена
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <StarRating value={review.rating} interactive={false} />
                {review.comment && (
                  <p className="text-sm text-muted-foreground" data-testid={`text-review-comment-${review.id}`}>
                    {review.comment}
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Admin Comment Section */}
        {user?.isAdmin && !isEditing && (
          <>
            {review.adminComment && !isEditingAdminComment ? (
              <div className="mt-3 p-3 border border-purple-500/30 rounded-lg bg-purple-500/5" data-testid={`admin-comment-${review.id}`}>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="text-xs border-purple-500/30 bg-purple-500/5 text-purple-600 dark:text-purple-400">
                    Комментарий администратора
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setLocalAdminComment(review.adminComment ?? "");
                      setIsEditingAdminComment(true);
                    }}
                    className="h-7 text-xs"
                    data-testid={`button-edit-admin-comment-${review.id}`}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Редактировать
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">{review.adminComment}</p>
              </div>
            ) : isEditingAdminComment || !review.adminComment ? (
              <div className="space-y-2 pt-3 border-t border-purple-500/20">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs border-purple-500/30 bg-purple-500/5 text-purple-600 dark:text-purple-400">
                    Комментарий администратора
                  </Badge>
                </div>
                <Textarea
                  placeholder="Добавить комментарий администратора..."
                  value={localAdminComment}
                  onChange={(e) => setLocalAdminComment(e.target.value)}
                  rows={3}
                  className="text-sm border-purple-500/30"
                  data-testid={`textarea-admin-comment-${review.id}`}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      updateAdminCommentMutation.mutate({
                        reviewId: review.id,
                        adminComment: localAdminComment.trim() || null
                      }, {
                        onSuccess: () => {
                          setIsEditingAdminComment(false);
                        }
                      });
                    }}
                    disabled={updateAdminCommentMutation.isPending}
                    data-testid={`button-save-admin-comment-${review.id}`}
                  >
                    {updateAdminCommentMutation.isPending ? "Сохранение..." : "Сохранить комментарий"}
                  </Button>
                  {isEditingAdminComment && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setLocalAdminComment(review.adminComment ?? "");
                        setIsEditingAdminComment(false);
                      }}
                      data-testid={`button-cancel-admin-comment-${review.id}`}
                    >
                      Отмена
                    </Button>
                  )}
                </div>
              </div>
            ) : null}
          </>
        )}
        {!user?.isAdmin && !isEditing && review.adminComment && (
          <div className="mt-3 p-3 border border-purple-500/30 rounded-lg bg-purple-500/5" data-testid={`admin-comment-${review.id}`}>
            <Badge variant="outline" className="mb-2 text-xs border-purple-500/30 bg-purple-500/5 text-purple-600 dark:text-purple-400">
              Комментарий администратора
            </Badge>
            <p className="text-sm text-muted-foreground">{review.adminComment}</p>
          </div>
        )}

        {!isEditing && (
          <div className="flex items-center justify-between pt-2 border-t border-border">
            {isOwnReview ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditReview(review)}
                  data-testid={`button-edit-review-${review.id}`}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Редактировать
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteReview(review.id)}
                  disabled={deleteReviewMutation.isPending}
                  data-testid={`button-delete-review-${review.id}`}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  {deleteReviewMutation.isPending ? "Удаление..." : "Удалить"}
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className={userVote?.voteType === 'like' ? 'border-green-500 bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400' : 'hover:border-green-500 hover:text-green-600 dark:hover:text-green-400'}
                  onClick={() => handleVote('like')}
                  disabled={voteReviewMutation.isPending || unvoteReviewMutation.isPending}
                  data-testid={`button-like-${review.id}`}
                >
                  <ThumbsUp className={`h-4 w-4 mr-1 ${userVote?.voteType === 'like' ? 'fill-current' : ''}`} />
                  {voteCounts?.likes || 0}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={userVote?.voteType === 'dislike' ? 'border-red-500 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400' : 'hover:border-red-500 hover:text-red-600 dark:hover:text-red-400'}
                  onClick={() => handleVote('dislike')}
                  disabled={voteReviewMutation.isPending || unvoteReviewMutation.isPending}
                  data-testid={`button-dislike-${review.id}`}
                >
                  <ThumbsDown className={`h-4 w-4 mr-1 ${userVote?.voteType === 'dislike' ? 'fill-current' : ''}`} />
                  {voteCounts?.dislikes || 0}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Отзывы</CardTitle>
        {ratingStats && ratingStats.totalReviews > 0 && (
          <CardDescription className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold text-foreground">{ratingStats.averageRating.toFixed(1)}</span>
            </div>
            <span>({ratingStats.totalReviews} {ratingStats.totalReviews === 1 ? "отзыв" : "отзывов"})</span>
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {user && isPurchased && !myReview && (
          <div className="relative p-6 border border-purple-500/30 rounded-lg space-y-4 bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-orange-500/10" data-testid="section-add-review">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-primary fill-current" />
              <h4 className="font-semibold text-lg">Оставить отзыв</h4>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Ваша оценка</label>
              <StarRating
                value={hoverRating || rating}
                onHover={setHoverRating}
                onClick={setRating}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Комментарий (опционально)</label>
              <Textarea
                placeholder="Поделитесь своим мнением о курсе..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                data-testid="textarea-review-comment"
              />
            </div>
            <Button
              onClick={handleSubmitReview}
              disabled={createReviewMutation.isPending || rating === 0}
              data-testid="button-submit-review"
            >
              {createReviewMutation.isPending ? "Отправка..." : "Отправить отзыв"}
            </Button>
          </div>
        )}

        {!user && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Войдите, чтобы оставить отзыв
          </p>
        )}

        {user && !isPurchased && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Купите курс, чтобы оставить отзыв
          </p>
        )}

        <div className="space-y-4">
          {reviewsLoading ? (
            <>
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </>
          ) : reviews && reviews.length > 0 ? (
            reviews.map((review) => <ReviewItem key={review.id} review={review} />)
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Отзывов пока нет. Будьте первым!
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
