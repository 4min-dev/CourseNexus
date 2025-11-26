import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Gift, Users, Copy, Check, Trophy, Tag, Edit2, X, Percent, CreditCard, Info, PartyPopper, AlertTriangle, ExternalLink, Calendar, Zap, Star, Heart, ShoppingBag, MessageCircle, Target, Flame, Clock, Sparkles, Filter, UserPlus, User, Search, PlayCircle, ShoppingCart, BookOpen, Award, Megaphone, Edit, Feather, Bookmark, Play, Video, Tv, Film, GraduationCap, Package, Layers, TrendingUp, Briefcase, Gem, CheckCircle, Moon, Sunrise, Rocket, Compass } from "lucide-react";
import { Header } from "@/components/header";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { Task, UserTask } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useState } from "react";
import { Footer } from "@/components/footer";
import { formatPrice } from "@/lib/formatPrice";

interface SiteSettings {
  id: string;
  siteName: string;
  logoUrl: string | null;
  referralBonusPercent: number;
}

export default function Bonuses() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPromo, setCopiedPromo] = useState(false);
  const [isEditingPromo, setIsEditingPromo] = useState(false);
  const [newPromoCode, setNewPromoCode] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");

  const { data: referrals, isLoading: referralsLoading } = useQuery<{
    count: number;
    totalEarnings: number;
  }>({
    queryKey: ["/api/referrals"],
  });

  const { data: siteSettings } = useQuery<SiteSettings>({
    queryKey: ["/api/site-settings"],
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: userTasks } = useQuery<UserTask[]>({
    queryKey: ["/api/user-tasks"],
  });

  const { data: taskProgress } = useQuery<Record<string, { currentProgress: number; targetValue: number }>>({
    queryKey: ["/api/tasks/progress"],
    enabled: !!user,
  });

  const completedTaskIds = new Set(userTasks?.map((ut) => ut.taskId) || []);
  
  const getTaskIcon = (iconName: string) => {
    const icons: Record<string, any> = {
      'user-plus': UserPlus,
      'user': User,
      'search': Search,
      'calendar': Calendar,
      'calendar-check': Calendar,
      'play-circle': PlayCircle,
      'heart': Heart,
      'trending-up': TrendingUp,
      'zap': Zap,
      'shopping-bag': ShoppingBag,
      'shopping-cart': ShoppingCart,
      'book-open': BookOpen,
      'award': Award,
      'crown': Trophy,
      'users': Users,
      'megaphone': Megaphone,
      'star': Star,
      'sparkles': Sparkles,
      'message-circle': MessageCircle,
      'edit': Edit,
      'feather': Feather,
      'bookmark': Bookmark,
      'play': Play,
      'video': Video,
      'tv': Tv,
      'film': Film,
      'graduation-cap': GraduationCap,
      'package': Package,
      'tag': Tag,
      'layers': Layers,
      'clock': Clock,
      'briefcase': Briefcase,
      'gem': Gem,
      'check-circle': CheckCircle,
      'target': Target,
      'trophy': Trophy,
      'flame': Flame,
      'moon': Moon,
      'sunrise': Sunrise,
      'rocket': Rocket,
      'credit-card': CreditCard,
      'compass': Compass,
      'gift': Gift,
      'party-popper': PartyPopper,
    };
    return icons[iconName] || Trophy;
  };
  
  const getDifficultyColor = (difficulty: string) => {
    const colors: Record<string, string> = {
      'easy': 'text-chart-2',
      'medium': 'text-chart-3',
      'hard': 'text-chart-4',
      'expert': 'text-chart-5',
    };
    return colors[difficulty] || 'text-muted-foreground';
  };
  
  const getTypeInfo = (type: string) => {
    const typeInfo: Record<string, { label: string; color: string; icon: any }> = {
      'onboarding': { label: 'Вводные', color: 'bg-chart-2/10 border-chart-2/30 text-chart-2', icon: Star },
      'daily': { label: 'Ежедневные', color: 'bg-chart-3/10 border-chart-3/30 text-chart-3', icon: Calendar },
      'weekly': { label: 'Еженедельные', color: 'bg-chart-4/10 border-chart-4/30 text-chart-4', icon: Zap },
      'achievement': { label: 'Достижения', color: 'bg-chart-5/10 border-chart-5/30 text-chart-5', icon: Trophy },
    };
    return typeInfo[type] || { label: type, color: 'bg-muted', icon: Trophy };
  };
  
  const filteredTasks = tasks?.filter(task => selectedType === 'all' || task.type === selectedType) || [];
  
  const tasksByCategory = filteredTasks.reduce((acc, task) => {
    const category = task.category || 'general';
    if (!acc[category]) acc[category] = [];
    acc[category].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  const claimTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      await apiRequest("POST", `/api/tasks/${taskId}/claim`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Награда получена!",
        description: "Фантики добавлены на ваш счёт",
      });
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
        description: error.message || "Не удалось получить награду",
        variant: "destructive",
      });
    },
  });

  const referralLink = user?.referralCode
    ? `${window.location.origin}/register?ref=${user.referralCode}`
    : "";

  const promoCode = user?.referralCode || "";

  const referralPercent = user?.referralBonusPercent ?? siteSettings?.referralBonusPercent ?? 10;

  const handleCopyReferralLink = () => {
    if (referralLink) {
      navigator.clipboard.writeText(referralLink);
      setCopiedLink(true);
      toast({
        title: "Скопировано!",
        description: "Реферальная ссылка скопирована в буфер обмена",
      });
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleCopyPromoCode = () => {
    if (promoCode) {
      navigator.clipboard.writeText(promoCode);
      setCopiedPromo(true);
      toast({
        title: "Скопировано!",
        description: "Промокод скопирован в буфер обмена",
      });
      setTimeout(() => setCopiedPromo(false), 2000);
    }
  };

  const updatePromoCodeMutation = useMutation({
    mutationFn: async (code: string) => {
      await apiRequest("PUT", "/api/profile/referral-code", { referralCode: code });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setIsEditingPromo(false);
      setNewPromoCode("");
      toast({
        title: "Промокод обновлен!",
        description: "Ваш личный промокод успешно изменен",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить промокод",
        variant: "destructive",
      });
    },
  });

  const handleEditPromo = () => {
    setNewPromoCode(promoCode);
    setIsEditingPromo(true);
  };

  const handleCancelEdit = () => {
    setIsEditingPromo(false);
    setNewPromoCode("");
  };

  const handleSavePromo = () => {
    const code = newPromoCode.trim().toUpperCase();
    if (code.length < 4) {
      toast({
        title: "Ошибка",
        description: "Промокод должен содержать минимум 4 символа",
        variant: "destructive",
      });
      return;
    }
    if (code.length > 12) {
      toast({
        title: "Ошибка",
        description: "Промокод должен содержать максимум 12 символов",
        variant: "destructive",
      });
      return;
    }
    if (!/^[A-Z0-9]+$/.test(code)) {
      toast({
        title: "Ошибка",
        description: "Промокод должен содержать только заглавные буквы и цифры",
        variant: "destructive",
      });
      return;
    }
    updatePromoCodeMutation.mutate(code);
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Бонусы</h1>
            <p className="text-muted-foreground">
              Зарабатывайте награды и получайте бесплатные курсы
            </p>
          </div>

          {/* Referral Discount Info - only show if user has discount */}
          {user?.referralDiscount && user.referralDiscount > 0 && (
            <Card className="border-2 border-chart-4/30 bg-gradient-to-br from-chart-4/5 to-transparent">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Percent className="h-5 w-5 text-chart-4" />
                  Ваша реферальная скидка
                </CardTitle>
                <CardDescription>
                  Бонус за регистрацию по реферальной ссылке
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-chart-4/10 rounded-lg border border-chart-4/30">
                  <p className="text-xs text-muted-foreground mb-1">Скидка на первую покупку</p>
                  <p className="text-5xl font-bold text-chart-4" data-testid="text-referral-discount">
                    {user.referralDiscount}%
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <PartyPopper className="h-4 w-4 text-chart-4 shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground">
                      Поздравляем! Вы зарегистрировались по реферальной ссылке и получили скидку {user.referralDiscount}% на <span className="font-semibold text-foreground">первую покупку курса</span>.
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground ml-6">
                    Скидка применится автоматически при оформлении первого заказа.
                  </p>
                </div>

                <div className="p-3 bg-muted/50 rounded-lg border border-border">
                  <div className="flex items-center gap-2">
                    <Info className="h-3 w-3 text-muted-foreground shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      После первой покупки скидка обнулится
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-2 border-primary/20 min-w-0 w-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Реферальная система
                </CardTitle>
                <CardDescription>
                  Приведи друга — получи реальные деньги
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {referralsLoading ? (
                  <>
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Приглашено</p>
                        <p className="text-2xl font-bold" data-testid="text-referrals-count">
                          {referrals?.count || 0}
                        </p>
                      </div>
                      <div className="p-4 bg-chart-2/10 rounded-lg border border-chart-2/30">
                        <p className="text-xs text-muted-foreground mb-1">Реферальный баланс</p>
                        <p className="text-4xl font-bold text-chart-2" data-testid="text-referrals-earnings">
                          {formatPrice(parseFloat(user?.referralBalance || "0"))} ₽
                        </p>
                        <div className="flex items-center gap-1.5 mt-2">
                          <CreditCard className="h-3 w-3 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">
                            Выводятся на карту
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium">Ваша реферальная ссылка:</p>
                      <div className="flex gap-2 w-full min-w-0 max-w-full">
                        <div className="flex-1 px-3 py-2 bg-muted rounded-md text-sm overflow-hidden truncate min-w-0">
                          {referralLink || "Генерируется..."}
                        </div>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={handleCopyReferralLink}
                          disabled={!referralLink}
                          className="shrink-0"
                          data-testid="button-copy-referral"
                        >
                          {copiedLink ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium flex items-center gap-2">
                        <Tag className="h-4 w-4" />
                        Ваш личный промокод:
                      </p>
                      {isEditingPromo ? (
                        <div className="flex gap-2 w-full min-w-0 max-w-full">
                          <Input
                            value={newPromoCode}
                            onChange={(e) => setNewPromoCode(e.target.value.toUpperCase())}
                            placeholder="ABCD1234"
                            className="flex-1 font-mono min-w-0"
                            maxLength={12}
                            data-testid="input-edit-promo"
                          />
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={handleSavePromo}
                            disabled={updatePromoCodeMutation.isPending}
                            className="shrink-0"
                            data-testid="button-save-promo"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={handleCancelEdit}
                            disabled={updatePromoCodeMutation.isPending}
                            className="shrink-0"
                            data-testid="button-cancel-promo"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2 w-full min-w-0 max-w-full">
                          <div className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono overflow-hidden truncate min-w-0">
                            {promoCode || "Генерируется..."}
                          </div>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={handleCopyPromoCode}
                            disabled={!promoCode}
                            className="shrink-0"
                            data-testid="button-copy-promo"
                          >
                            {copiedPromo ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={handleEditPromo}
                            disabled={!promoCode}
                            className="shrink-0"
                            data-testid="button-edit-promo"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Промокод может содержать 4-12 символов (буквы и цифры)
                      </p>
                    </div>

                    <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                      <p className="text-sm text-muted-foreground break-words">
                        Вы получаете <span className="font-semibold text-primary">пожизненные {referralPercent}%</span> от пополнения баланса реферала, которого Вы привели. Ваш друг получает <span className="font-semibold text-chart-2">скидку 5%</span> на первую покупку при регистрации по вашей ссылке или промокоду.
                      </p>
                    </div>

                    <Link href="/referral-info">
                      <Button 
                        variant="outline" 
                        className="w-full gap-2"
                        data-testid="button-referral-info"
                      >
                        <Info className="h-4 w-4" />
                        Подробнее о реферальной системе
                      </Button>
                    </Link>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="border-2 border-chart-3/20 min-w-0 w-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5 text-chart-3" />
                  Система фантиков
                </CardTitle>
                <CardDescription>
                  Выполняй задания и получай награды
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-chart-3/10 rounded-lg border border-chart-3/30">
                  <p className="text-xs text-muted-foreground mb-1">Баланс фантиков</p>
                  <p className="text-4xl font-bold text-chart-3" data-testid="text-fantiks-balance">
                    {user?.fantiks || 0}
                  </p>
                </div>

                <div className="p-4 bg-chart-3/5 rounded-lg border border-chart-3/20">
                  <p className="text-sm text-muted-foreground mb-2">
                    Фантики — это бонусная валюта, которую можно потратить на прошлогодние курсы
                  </p>
                  <p className="text-lg font-semibold">
                    1 фантик = 1 рублю
                  </p>
                </div>

                <div className="space-y-3">
                  <p className="font-semibold">Как получить?</p>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>1. Покупать курсы</p>
                    <p>2. Звать друзей. 1 друг = 300 фантиков (даже если друг ничего не купил)</p>
                    <p>3. Выполнить задания</p>
                  </div>
                </div>

                <div className="p-3 bg-muted/50 rounded-lg border border-border">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">
                      Реферальная система и система фантиков — это разные системы, у каждой из них свой баланс
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Trophy className="h-6 w-6 text-chart-3" />
                Доступные задания
              </h2>
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant={selectedType === 'all' ? 'default' : 'outline'}
                  onClick={() => setSelectedType('all')}
                  data-testid="filter-all"
                >
                  Все
                </Button>
                <Button
                  size="sm"
                  variant={selectedType === 'onboarding' ? 'default' : 'outline'}
                  onClick={() => setSelectedType('onboarding')}
                  data-testid="filter-onboarding"
                >
                  <Star className="h-3 w-3 mr-1" />
                  Вводные
                </Button>
                <Button
                  size="sm"
                  variant={selectedType === 'daily' ? 'default' : 'outline'}
                  onClick={() => setSelectedType('daily')}
                  data-testid="filter-daily"
                >
                  <Calendar className="h-3 w-3 mr-1" />
                  Ежедневные
                </Button>
                <Button
                  size="sm"
                  variant={selectedType === 'weekly' ? 'default' : 'outline'}
                  onClick={() => setSelectedType('weekly')}
                  data-testid="filter-weekly"
                >
                  <Zap className="h-3 w-3 mr-1" />
                  Еженедельные
                </Button>
                <Button
                  size="sm"
                  variant={selectedType === 'achievement' ? 'default' : 'outline'}
                  onClick={() => setSelectedType('achievement')}
                  data-testid="filter-achievement"
                >
                  <Trophy className="h-3 w-3 mr-1" />
                  Достижения
                </Button>
              </div>
            </div>

            {tasksLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-6 w-1/2" />
                      <Skeleton className="h-4 w-3/4 mt-2" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-10 w-32" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredTasks && filteredTasks.length > 0 ? (
              <div className="space-y-4">
                {filteredTasks.map((task) => {
                  const isCompleted = completedTaskIds.has(task.id);
                  const userTask = userTasks?.find(ut => ut.taskId === task.id);
                  const taskProgressData = taskProgress?.[task.id];
                  const progress = taskProgressData?.currentProgress || userTask?.currentProgress || 0;
                  const target = taskProgressData?.targetValue || task.targetValue || 1;
                  const IconComponent = getTaskIcon(task.icon || 'trophy');
                  const typeInfo = getTypeInfo(task.type);
                  const difficultyColor = getDifficultyColor(task.difficulty || 'easy');
                  
                  return (
                    <Card key={task.id} className="hover-elevate transition-all" data-testid={`card-task-${task.id}`}>
                      <CardHeader>
                        <div className="flex flex-col gap-3">
                          <div className="flex gap-3 w-full">
                            <div className={`h-10 w-10 rounded-lg ${typeInfo.color} flex items-center justify-center shrink-0`}>
                              <IconComponent className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <CardTitle className="text-lg">{task.title}</CardTitle>
                                {task.isRepeatable && (
                                  <Badge variant="outline" className="text-xs">
                                    Повторяемое
                                  </Badge>
                                )}
                              </div>
                              <CardDescription className="mt-1">
                                {task.description}
                              </CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="bg-chart-3/10 border-chart-3/30 text-chart-3">
                              +{task.reward} фантиков
                            </Badge>
                            <Badge variant="outline" className={`text-xs ${difficultyColor}`}>
                              {task.difficulty === 'easy' && 'Легко'}
                              {task.difficulty === 'medium' && 'Средне'}
                              {task.difficulty === 'hard' && 'Сложно'}
                              {task.difficulty === 'expert' && 'Эксперт'}
                            </Badge>
                          </div>
                          {target > 1 && (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>Прогресс</span>
                                <span className="font-medium">{progress}/{target}</span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-chart-3 transition-all"
                                  style={{ width: `${Math.min((progress / target) * 100, 100)}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        {isCompleted ? (
                          <div className="flex items-center gap-2 text-chart-2">
                            <Check className="h-5 w-5" />
                            <span className="font-semibold">Выполнено</span>
                          </div>
                        ) : (
                          <Button
                            onClick={() => claimTaskMutation.mutate(task.id)}
                            disabled={claimTaskMutation.isPending}
                            data-testid={`button-claim-task-${task.id}`}
                          >
                            {claimTaskMutation.isPending ? "Обработка..." : "Выполнить"}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="p-12">
                <div className="text-center space-y-4">
                  <Trophy className="h-16 w-16 mx-auto text-muted-foreground" />
                  <h3 className="text-xl font-semibold">Нет доступных заданий</h3>
                  <p className="text-muted-foreground">
                    {selectedType !== 'all' ? 'Нет заданий в этой категории' : 'Новые задания скоро появятся'}
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
