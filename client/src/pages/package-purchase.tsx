import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ShoppingCart, BookOpen, Sparkles, Check, Crown, Gem } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { celebrateJackpot } from "@/lib/celebration";
import { SuccessDialog } from "@/components/success-dialog";
import { Header } from "@/components/header";

interface Course {
  id: string;
  title: string;
  description: string | null;
  price: string | null;
  thumbnailImage: string | null;
  platform: string | null;
  level: string[] | null;
  year: number | null;
  authorName: string | null;
}

interface CoursePackage {
  id: string;
  name: string;
  description: string | null;
  thumbnailUrl: string | null;
  discount: number;
  displayOrder: number;
  isActive: boolean;
  courses: Course[];
  totalPrice: number;
  discountedPrice: number;
  purchasedCourseIds?: string[];
}

interface User {
  balance: string;
  referralBalance: string;
  fantiks: number;
}

const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('ru-RU').format(price);
};

export default function PackagePurchase() {
  const { packageId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [useFantiks, setUseFantiks] = useState(false);

  // Helper function to navigate back to shop with preserved filters
  const handleBackToShop = () => {
    const savedShopUrl = sessionStorage.getItem('shopUrl');
    setLocation(savedShopUrl || '/shop');
  };

  const { data: pkg, isLoading: packageLoading } = useQuery<CoursePackage>({
    queryKey: ["/api/packages", packageId],
    enabled: !!packageId,
  });

  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  const isAuthenticated = !!user;

  const purchaseMutation = useMutation({
    mutationFn: async (params: { useFantiks: boolean }) => {
      if (!packageId) throw new Error("Package ID is required");
      const res = await fetch(`/api/packages/${packageId}/purchase`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ useFantiks: params.useFantiks }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to purchase package");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
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
      setConfirmDialogOpen(false);
      setUseFantiks(false);
      
      // Trigger celebration animation
      celebrateJackpot();
      
      // Show success dialog after a short delay
      setTimeout(() => {
        setSuccessDialogOpen(true);
      }, 400);
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка покупки",
        description: error.message || "Не удалось приобрести подборку",
        variant: "destructive",
      });
    },
  });

  const handlePurchase = () => {
    if (!isAuthenticated) {
      toast({
        title: "Требуется авторизация",
        description: "Войдите в систему для покупки подборки",
        variant: "destructive",
      });
      return;
    }

    setConfirmDialogOpen(true);
  };

  const fantiksBalance = parseFloat(user?.balance || "0");
  const referralBalance = parseFloat(user?.referralBalance || "0");
  const balance = fantiksBalance + referralBalance; // Total available balance
  const fantiks = user?.fantiks || 0;
  const price = pkg?.discountedPrice || 0;
  
  // Calculate fantiks discount (max 20% off)
  const maxFantiksDiscount = price * 0.2; // 20% max discount
  const fantiksToUse = Math.min(fantiks, maxFantiksDiscount);
  const priceWithDiscount = useFantiks ? Math.max(0, price - fantiksToUse) : price;
  
  const canAfford = balance >= priceWithDiscount;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 overflow-x-hidden">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <ShoppingCart className="h-16 w-16 mx-auto text-muted-foreground" />
            <h2 className="text-2xl font-bold">Требуется авторизация</h2>
            <p className="text-muted-foreground">
              Войдите в систему для покупки подборки курсов
            </p>
            <Button onClick={() => setLocation("/")}>Войти</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (packageLoading || userLoading) {
    return (
      <div className="min-h-screen bg-background p-6 overflow-x-hidden">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2 mt-2" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!pkg) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 overflow-x-hidden">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <BookOpen className="h-16 w-16 mx-auto text-muted-foreground" />
            <h2 className="text-2xl font-bold">Подборка не найдена</h2>
            <p className="text-muted-foreground">
              Запрошенная подборка не существует или была удалена
            </p>
            <Button onClick={handleBackToShop}>Вернуться в каталог</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Header />

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Back button */}
        <div>
          <Button
            variant="ghost"
            onClick={handleBackToShop}
            className="gap-2"
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
            Вернуться в каталог
          </Button>
        </div>
        {/* Package Header */}
        <div className="relative overflow-hidden rounded-2xl border-2 border-purple-500/20 bg-gradient-to-br from-background via-purple-950/10 to-pink-950/10 p-8">
          {/* Background effects */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-orange-500/5" />
          
          <div className="relative space-y-6">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-6 w-6 text-purple-400" />
                  <span className="text-sm font-semibold text-purple-400">ГОТОВАЯ ПОДБОРКА</span>
                </div>
                <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent" data-testid="text-package-name">
                  {pkg.name}
                </h1>
              </div>

              {pkg.discount > 0 && (
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-red-500 rounded-full blur-xl opacity-60 animate-pulse" />
                  <Badge className="relative bg-gradient-to-r from-orange-600 to-red-600 text-white border-0 text-2xl px-6 py-3 shadow-lg font-bold">
                    <Sparkles className="h-5 w-5 mr-2 animate-spin" style={{ animationDuration: '3s' }} />
                    -{pkg.discount}%
                  </Badge>
                </div>
              )}
            </div>

            {pkg.description && (
              <p className="text-xl text-muted-foreground max-w-3xl" data-testid="text-package-description">
                {pkg.description}
              </p>
            )}

            {/* Stats */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="p-3 rounded-lg bg-purple-500/10">
                  <BookOpen className="h-5 w-5 text-purple-400" />
                </div>
                <span className="text-lg font-medium" data-testid="text-course-count">
                  {pkg.courses.length} {pkg.courses.length === 1 ? 'курс' : pkg.courses.length < 5 ? 'курса' : 'курсов'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="p-3 rounded-lg bg-green-500/10">
                  <Gem className="h-5 w-5 text-green-400" />
                </div>
                <span className="text-lg font-medium text-green-500">
                  Экономия {formatPrice(pkg.totalPrice - pkg.discountedPrice)} ₽
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Courses Grid */}
        <div className="space-y-4">
          <h2 className="text-3xl font-bold">Курсы в подборке</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pkg.courses.map((course) => (
              <Card key={course.id} className="overflow-hidden hover-elevate" data-testid={`card-course-${course.id}`}>
                {/* Thumbnail */}
                <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-purple-900/20 to-pink-900/20">
                  {course.thumbnailImage ? (
                    <img
                      src={course.thumbnailImage}
                      alt={course.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <BookOpen className="h-12 w-12 text-muted-foreground/30" />
                    </div>
                  )}
                  {/* Check badge */}
                  <div className="absolute top-3 right-3">
                    <div className="p-2 rounded-full bg-green-600 text-white shadow-lg">
                      <Check className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                <CardHeader>
                  <h3 className="font-bold line-clamp-2" data-testid={`text-course-title-${course.id}`}>
                    {course.title}
                  </h3>
                  <div className="flex items-center gap-2 pt-2">
                    {course.platform && (
                      <Badge variant="outline" className="text-xs">
                        {course.platform}
                      </Badge>
                    )}
                    {course.level && (
                      <Badge variant="outline" className="text-xs">
                        {course.level}
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Стоимость</span>
                    <span className="text-lg font-bold" data-testid={`text-course-price-${course.id}`}>
                      {course.price ? `${formatPrice(parseFloat(course.price))} ₽` : 'Бесплатно'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Purchase Section */}
        <Card className="sticky bottom-6 border-2 border-purple-500/30 shadow-2xl bg-background/95 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-baseline gap-4 flex-wrap">
                  <span className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent" data-testid="text-discounted-price">
                    {formatPrice(pkg.discountedPrice)} ₽
                  </span>
                  {pkg.discount > 0 && (
                    <span className="text-2xl text-muted-foreground line-through" data-testid="text-original-price">
                      {formatPrice(pkg.totalPrice)} ₽
                    </span>
                  )}
                </div>
                {user && (
                  <p className="text-sm text-muted-foreground">
                    Ваш баланс: <span className="font-semibold">{formatPrice(parseFloat(user.balance))} ₽</span>
                  </p>
                )}
              </div>

              <Button
                size="lg"
                className="gap-2 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 text-white shadow-lg hover:shadow-purple-500/50 transition-all duration-150 text-lg px-8 py-6"
                onClick={handlePurchase}
                disabled={purchaseMutation.isPending || !user || !canAfford}
                data-testid="button-purchase"
              >
                <ShoppingCart className="h-6 w-6" />
                {purchaseMutation.isPending ? "Обработка..." : "Купить подборку"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent data-testid="dialog-purchase-confirm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-6 w-6 text-purple-500" />
              Подтвердите покупку
            </DialogTitle>
            <DialogDescription>
              Проверьте детали покупки перед подтверждением
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Warning about already purchased courses */}
            {pkg.purchasedCourseIds && pkg.purchasedCourseIds.length > 0 && (
              <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-4 space-y-2" data-testid="warning-purchased-courses">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <div className="p-1.5 rounded-full bg-orange-500/20">
                      <Gem className="h-4 w-4 text-orange-500" />
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                      У вас уже есть {pkg.purchasedCourseIds.length} {pkg.purchasedCourseIds.length === 1 ? 'курс' : pkg.purchasedCourseIds.length < 5 ? 'курса' : 'курсов'} из этой подборки
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {pkg.purchasedCourseIds.length === 1 ? 'Этот курс не будет' : 'Эти курсы не будут'} дублироваться в библиотеке.
                      Вы получите только новые курсы из подборки.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Package Info */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-muted-foreground">Подборка</h4>
              <p className="font-medium" data-testid="text-dialog-package-name">{pkg.name}</p>
              <p className="text-sm text-muted-foreground">{pkg.courses.length} {pkg.courses.length === 1 ? 'курс' : pkg.courses.length < 5 ? 'курса' : 'курсов'}</p>
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
                <span className="text-muted-foreground">Полная стоимость:</span>
                <span className="line-through text-muted-foreground">{formatPrice(pkg.totalPrice)} ₽</span>
              </div>
              <div className="flex justify-between items-center text-green-600">
                <span>Скидка подборки ({pkg.discount}%):</span>
                <span className="font-semibold">-{formatPrice(pkg.totalPrice - pkg.discountedPrice)} ₽</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Цена подборки:</span>
                <span className={useFantiks ? "line-through text-muted-foreground" : "font-semibold"} data-testid="text-dialog-package-price">
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
              {user && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Баланс после покупки:</span>
                  <span className="font-semibold">{formatPrice(balance - priceWithDiscount)} ₽</span>
                </div>
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
                setConfirmDialogOpen(false);
                setUseFantiks(false);
              }}
              disabled={purchaseMutation.isPending}
              data-testid="button-cancel"
            >
              Отмена
            </Button>
            <Button
              onClick={() => purchaseMutation.mutate({ useFantiks })}
              disabled={!canAfford || purchaseMutation.isPending}
              className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600"
              data-testid="button-confirm"
            >
              <ShoppingCart className="h-4 w-4" />
              {purchaseMutation.isPending ? "Обработка..." : "Подтвердить покупку"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <SuccessDialog
        open={successDialogOpen}
        onOpenChange={setSuccessDialogOpen}
        title="Подборка успешно приобретена!"
        description={`Все курсы из подборки "${pkg.name}" добавлены в вашу библиотеку`}
        isVip={false}
        onGoToCourse={() => setLocation("/library")}
        onContinueShopping={handleBackToShop}
      />
    </div>
  );
}
