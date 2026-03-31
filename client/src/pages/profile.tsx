import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Wallet, User as UserIcon, Phone, Send, Edit, Users, ChevronDown, ChevronRight, TrendingUp, TrendingDown, ShoppingCart, Info, Calendar, X } from "lucide-react";
import { Header } from "@/components/header";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { AwardIcon } from "@/components/award-icon";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Footer } from "@/components/footer";
import { formatPrice } from "@/lib/formatPrice";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import axios from "axios";
import { useLocation } from "wouter";

export default function Profile() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [, setLocation] = useLocation()
  const [topupAmount, setTopupAmount] = useState("")
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || "")
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [expandedRows, setExpandedRows] = useState(new Set())
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false)
  const [verificationCode, setVerificationCode] = useState("")
  const [isWaitingForContact, setIsWaitingForContact] = useState(false)
  const [showPaymentMethods, setShowPaymentMethods] = useState(false)
  const [paymentUrl, setPaymentUrl] = useState("")
  const pollingIntervalRef = useRef(null)

  const referralDetailsUrl = `/api/referrals/details${dateFrom || dateTo ? `?${new URLSearchParams(Object.entries({ dateFrom, dateTo }).filter(([_, v]) => v)).toString()}` : ''}`;

  const { data: referralDetails, isLoading: isLoadingReferrals } = useQuery({
    queryKey: [referralDetailsUrl],
    enabled: !!user,
  });

  // Query for site settings to get bot username
  const { data: siteSettings } = useQuery<{ telegramBotUsername: string }>({
    queryKey: ["/api/site-settings"],
  });

  const { data: referralTransactions, isLoading: isLoadingReferralTransactions } = useQuery({
    queryKey: ['/api/balance/transactions?type=referral'],
    enabled: !!user,
  });

  const { data: payoutTransactions, isLoading: isLoadingPayoutTransactions } = useQuery({
    queryKey: ['/api/balance/transactions?type=referral_payout'],
    enabled: !!user,
  });

  const { data: topupTransactions, isLoading: isLoadingTopupTransactions } = useQuery({
    queryKey: ['/api/balance/transactions?type=topup'],
    enabled: !!user,
  });

  const { data: purchaseTransactions, isLoading: isLoadingPurchaseTransactions } = useQuery({
    queryKey: ['/api/balance/transactions?type=purchase'],
    enabled: !!user,
  });

  const { data: refundTransactions, isLoading: isLoadingRefundTransactions } = useQuery({
    queryKey: ['/api/balance/transactions?type=refund'],
    enabled: !!user,
  });

  const { data: userAwards, isLoading: isLoadingUserAwards } = useQuery<any[]>({
    queryKey: ['/api/user/awards'],
    enabled: !!user,
  });

  const { data: allAwards } = useQuery<any[]>({
    queryKey: ['/api/awards'],
  });

  const topupMutation = useMutation({
    mutationFn: async (amount: number) => {
      await apiRequest("POST", "/api/balance/topup", { amount });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return Array.isArray(key) && key.some(k =>
            typeof k === 'string' && k.includes('/api/balance/transactions')
          );
        }
      });
      setTopupAmount("");
      toast({
        title: "Баланс пополнен!",
        description: "Средства добавлены на ваш счёт",
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
        description: error.message || "Не удалось пополнить баланс",
        variant: "destructive",
      });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { phoneNumber: string }) => {
      await apiRequest("PUT", "/api/profile", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setIsEditDialogOpen(false);
      toast({
        title: "Номер телефона обновлён!",
        description: "Ваши данные успешно сохранены",
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
        description: error.message || "Не удалось обновить профиль",
        variant: "destructive",
      });
    },
  });

  const selectAwardMutation = useMutation({
    mutationFn: async (awardId: string | null) => {
      await apiRequest("POST", "/api/user/awards/select", { awardId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/awards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/awards"] });
      toast({
        title: "Награда выбрана!",
        description: "Теперь она отображается как ваша аватарка",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось выбрать награду",
        variant: "destructive",
      });
    },
  });


  const verifyLinkingCodeMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest("POST", "/api/telegram/verify-linking-code", { code });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setIsLinkDialogOpen(false);
      setVerificationCode("");
      setIsWaitingForContact(false);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      toast({
        title: "Успешно!",
        description: "Telegram аккаунт успешно привязан",
      });
    },
    onError: (error: Error) => {
      // Check if error message indicates we need to wait for contact sharing
      const errorMessage = error.message || "";
      if (errorMessage.includes("поделиться номером телефона")) {
        setIsWaitingForContact(true);
        toast({
          title: "Почти готово!",
          description: "Теперь поделитесь номером телефона в Telegram боте. Привязка завершится автоматически.",
        });
      } else {
        toast({
          title: "Ошибка",
          description: errorMessage || "Не удалось проверить код",
          variant: "destructive",
        });
      }
    },
  });

  const unlinkTelegramMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/telegram/unlink");
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Успешно!",
        description: "Telegram аккаунт успешно отвязан",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось отвязать Telegram",
        variant: "destructive",
      });
    },
  });

  // Polling for automatic linking completion after contact sharing
  useEffect(() => {
    if (isWaitingForContact && !user?.telegramChatId) {
      // Start polling every 2 seconds
      pollingIntervalRef.current = setInterval(async () => {
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      }, 2000);
    } else if (isWaitingForContact && user?.telegramChatId) {
      // Linking completed!
      setIsWaitingForContact(false);
      setIsLinkDialogOpen(false);
      setVerificationCode("");
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      toast({
        title: "Успешно!",
        description: "Telegram аккаунт успешно привязан!",
      });
    }

    // Cleanup on unmount or when dialog closes
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [isWaitingForContact, user?.telegramChatId, queryClient, toast]);

  // Cleanup polling when dialog closes
  useEffect(() => {
    if (!isLinkDialogOpen) {
      setIsWaitingForContact(false);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }
  }, [isLinkDialogOpen]);

  const handleTopup = async () => {
    const params = new URLSearchParams()

    if (topupAmount) {
      params.set("amount", topupAmount)
    }

    setLocation(`/payment?${params.toString()}`)

    // toast({
    //   title: 'Оплата недоступна.',
    //   description: 'Для пополнения баланса свяжитесь с поддержкой в Telegram.',
    //   variant: "destructive"
    // })

    // const amount = parseFloat(topupAmount)
    // if (isNaN(amount) || amount <= 0) {
    //   toast({
    //     title: "Ошибка",
    //     description: "Введите корректную сумму",
    //     variant: "destructive"
    //   })
    //   return
    // }

    // try {
    //   const { data } = await axios.post('/api/payment/free-kassa/create', { amount })
    //   setPaymentUrl(data.paymentUrl)
    //   setShowPaymentMethods(true)
    // } catch (error) {
    //   toast({
    //     title: "Ошибка",
    //     description: "Не удалось создать платёж",
    //     variant: "destructive"
    //   })
    // }
  }

  const handleUpdateProfile = () => {
    updateProfileMutation.mutate({ phoneNumber });
  };

  const handleSelectAward = (awardId: string | null) => {
    selectAwardMutation.mutate(awardId);
  };

  const handleLinkTelegram = () => {
    setVerificationCode("");
    setIsLinkDialogOpen(true);
  };

  const handleUnlinkTelegram = () => {
    if (confirm("Вы уверены, что хотите отвязать Telegram?")) {
      unlinkTelegramMutation.mutate();
    }
  };

  const handleVerifyCode = () => {
    if (!verificationCode || verificationCode.length !== 4) {
      toast({
        title: "Ошибка",
        description: "Введите 4-значный код",
        variant: "destructive",
      });
      return;
    }
    verifyLinkingCodeMutation.mutate(verificationCode);
  };

  const isTelegramLinked = !!user?.telegramChatId;

  const balance = parseFloat(user?.balance || "0");
  const userInitials = `${user?.firstName?.[0] || ""}${user?.lastName?.[0] || ""}`.toUpperCase() || "U";
  const userName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : user?.email || "Пользователь";

  const presetAmounts = [500, 1000, 2000, 5000];

  const selectedAward = allAwards && user?.selectedAwardId && Array.isArray(allAwards)
    ? allAwards.find((award: any) => award.id === user.selectedAwardId)
    : null;

  // Combine purchases and refunds for the purchase history tab
  const purchases = Array.isArray(purchaseTransactions) ? purchaseTransactions : [];
  const refunds = Array.isArray(refundTransactions) ? refundTransactions : [];
  const allPurchaseHistory = [
    ...purchases.map((t: any) => ({ ...t, transactionType: 'purchase' })),
    ...refunds.map((t: any) => ({ ...t, transactionType: 'refund' }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto px-3 md:px-4 py-4 md:py-6 max-w-6xl">
          <div className="space-y-3">
            <div className="space-y-2">
              <h1 className="text-2xl md:text-3xl font-bold">Мой профиль</h1>
              <p className="text-sm md:text-base text-muted-foreground">
                Управление аккаунтом и балансом
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Card className="h-fit order-1 md:order-none md:col-start-1 md:row-start-1">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <UserIcon className="h-5 w-5" />
                    Личные данные
                  </CardTitle>
                  <CardDescription>
                    Управление профилем и Telegram аккаунтом
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    {selectedAward ? (
                      <AwardIcon emoji={selectedAward.imageUrl} rarity={selectedAward.rarity} size={64} />
                    ) : (
                      <Avatar className="h-14 w-14">
                        <AvatarImage src={user?.profileImageUrl || undefined} />
                        <AvatarFallback className="text-lg">{userInitials}</AvatarFallback>
                      </Avatar>
                    )}
                    <div>
                      <p className="font-semibold" data-testid="text-profile-name">{userName}</p>
                      <p className="text-xs text-muted-foreground" data-testid="text-profile-email">
                        {user?.email}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-border">
                    <div>
                      <Label className="text-xs text-muted-foreground">Телефон</Label>
                      <p className="text-sm font-medium" data-testid="text-profile-phone">
                        {user?.phoneNumber || "Не указан"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Telegram</Label>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium" data-testid="text-profile-telegram">
                          {user?.telegramUsername
                            ? (user.telegramUsername.startsWith('@') ? user.telegramUsername : `@${user.telegramUsername}`)
                            : "Не привязан"}
                        </p>
                        <Badge
                          variant={isTelegramLinked ? "default" : "secondary"}
                          data-testid="badge-telegram-status"
                          className="text-xs"
                        >
                          {isTelegramLinked ? "Привязан" : "Не привязан"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-border">
                    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full" size="sm" data-testid="button-edit-profile">
                          <Edit className="mr-2 h-4 w-4" />
                          Редактировать телефон
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Редактировать номер телефона</DialogTitle>
                          <DialogDescription>
                            Обновите ваш номер телефона
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="phone">Номер телефона</Label>
                            <div className="relative">
                              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="phone"
                                type="tel"
                                placeholder="+7 (999) 123-45-67"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                className="pl-10"
                                data-testid="input-phone"
                              />
                            </div>
                          </div>
                          <Button
                            className="w-full"
                            onClick={handleUpdateProfile}
                            disabled={updateProfileMutation.isPending}
                            data-testid="button-save-profile"
                          >
                            {updateProfileMutation.isPending ? "Сохранение..." : "Сохранить"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {isTelegramLinked ? (
                      <Button
                        variant="outline"
                        className="w-full"
                        size="sm"
                        onClick={handleUnlinkTelegram}
                        disabled={unlinkTelegramMutation.isPending}
                        data-testid="button-unlink-telegram"
                      >
                        <Send className="mr-2 h-4 w-4" />
                        {unlinkTelegramMutation.isPending ? "Отвязка..." : "Отвязать Telegram"}
                      </Button>
                    ) : (
                      <Button
                        variant="default"
                        className="w-full"
                        size="sm"
                        onClick={handleLinkTelegram}
                        data-testid="button-link-telegram"
                      >
                        <Send className="mr-2 h-4 w-4" />
                        Привязать Telegram
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-primary/20 order-2 md:order-none md:col-start-2 md:row-start-1 md:row-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-primary" />
                    Баланс
                  </CardTitle>
                  <CardDescription>
                    Пополните счёт для покупки курсов
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border border-primary/20">
                    <p className="text-sm text-muted-foreground mb-1">Текущий баланс</p>
                    <p className="text-4xl font-bold" data-testid="text-profile-balance">{formatPrice(balance)} ₽</p>
                  </div>

                  <div className="space-y-3">
                    <Label>Сумма пополнения</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {presetAmounts.map((amount) => (
                        <Button
                          key={amount}
                          variant="outline"
                          onClick={() => setTopupAmount(amount.toString())}
                          className={topupAmount === amount.toString() ? "border-primary" : ""}
                          data-testid={`button-preset-${amount}`}
                        >
                          {formatPrice(amount)} ₽
                        </Button>
                      ))}
                    </div>
                    <Input
                      type="number"
                      placeholder="Или введите сумму"
                      value={topupAmount}
                      onChange={(e) => setTopupAmount(e.target.value)}
                      min="1"
                      step="1"
                      data-testid="input-topup-amount"
                    />
                    <Button
                      className="w-full"
                      onClick={handleTopup}
                      data-testid="button-topup"
                    >
                      Перейти к оплате
                    </Button>
                  </div>

                  {/* {showPaymentMethods && (
                    <Card className="mt-6 border-primary/30">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Выберите способ оплаты</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Button
                          variant="outline"
                          className="w-full justify-start h-auto py-6"
                          onClick={() => window.open(paymentUrl, '_blank')}
                          data-testid="button-freekassa"
                        >
                          <div className="flex flex-col items-start">
                            <span className="font-medium text-base">FreeKassa</span>
                            <span className="text-sm text-muted-foreground">Банковские карты • СБП (QR) • Криптовалюта</span>
                          </div>
                        </Button>

                        <Button
                          variant="outline"
                          className="w-full justify-start h-auto py-6"
                          disabled
                        >
                          <div className="flex flex-col items-start">
                            <span className="font-medium text-base">ЮKassa</span>
                            <span className="text-sm text-muted-foreground">В разработке</span>
                          </div>
                        </Button>
                      </CardContent>
                    </Card>
                  )} */}

                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold mb-4">История операций</h3>
                    <Tabs defaultValue="topup" className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="topup" className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          Пополнения
                        </TabsTrigger>
                        <TabsTrigger value="purchase" className="flex items-center gap-2">
                          <ShoppingCart className="h-4 w-4" />
                          Покупки
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="topup" className="mt-4">
                        <Alert className="mb-4">
                          <Info className="h-4 w-4" />
                          <AlertDescription>
                            <strong>История пополнений баланса</strong>
                            <p className="text-sm mt-1">
                              Здесь отображаются все ваши пополнения основного баланса. Эти средства можно использовать для покупки курсов, VIP-пакетов и наборов. Баланс пополняется моментально после успешной оплаты.
                            </p>
                          </AlertDescription>
                        </Alert>
                        {isLoadingTopupTransactions ? (
                          <div className="text-center py-8 text-muted-foreground">
                            Загрузка...
                          </div>
                        ) : topupTransactions && Array.isArray(topupTransactions) && topupTransactions.length > 0 ? (
                          <ScrollArea className="h-[400px] border rounded-lg">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Дата</TableHead>
                                  <TableHead>Описание</TableHead>
                                  <TableHead className="text-right">Сумма</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {topupTransactions.map((transaction: any) => (
                                  <TableRow key={transaction.id} data-testid={`row-topup-${transaction.id}`}>
                                    <TableCell data-testid={`text-topup-date-${transaction.id}`}>
                                      {transaction.createdAt ? format(new Date(transaction.createdAt), "dd.MM.yyyy HH:mm") : "—"}
                                    </TableCell>
                                    <TableCell data-testid={`text-topup-description-${transaction.id}`}>
                                      {transaction.description || "Пополнение баланса"}
                                    </TableCell>
                                    <TableCell className="text-right font-semibold text-blue-600" data-testid={`text-topup-amount-${transaction.id}`}>
                                      +{formatPrice(parseFloat(transaction.amount))} ₽
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </ScrollArea>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            Пока нет пополнений
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="purchase" className="mt-4">
                        <Alert className="mb-4">
                          <Info className="h-4 w-4" />
                          <AlertDescription>
                            <strong>История покупок</strong>
                            <p className="text-sm mt-1">
                              Все ваши покупки курсов, VIP-пакетов и наборов отображаются здесь. Сумма списывается с основного баланса. Если применялась скидка (реферальная, фантики), указывается итоговая стоимость после всех скидок.
                            </p>
                          </AlertDescription>
                        </Alert>
                        {isLoadingPurchaseTransactions || isLoadingRefundTransactions ? (
                          <div className="text-center py-8 text-muted-foreground">
                            Загрузка...
                          </div>
                        ) : allPurchaseHistory.length > 0 ? (
                          <ScrollArea className="h-[400px] border rounded-lg">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Дата</TableHead>
                                  <TableHead>Описание</TableHead>
                                  <TableHead className="text-right">Сумма</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {allPurchaseHistory.map((transaction: any) => (
                                  <TableRow key={transaction.id} data-testid={`row-${transaction.transactionType}-${transaction.id}`}>
                                    <TableCell data-testid={`text-${transaction.transactionType}-date-${transaction.id}`}>
                                      {transaction.createdAt ? format(new Date(transaction.createdAt), "dd.MM.yyyy HH:mm") : "—"}
                                    </TableCell>
                                    <TableCell data-testid={`text-${transaction.transactionType}-description-${transaction.id}`}>
                                      {transaction.description || (transaction.transactionType === 'refund' ? 'Возврат' : 'Покупка')}
                                    </TableCell>
                                    <TableCell
                                      className={`text-right font-semibold ${transaction.transactionType === 'refund' ? 'text-green-600' : 'text-red-600'}`}
                                      data-testid={`text-${transaction.transactionType}-amount-${transaction.id}`}
                                    >
                                      {transaction.transactionType === 'refund' ? '+' : '-'}{formatPrice(parseFloat(transaction.amount))} ₽
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </ScrollArea>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            Пока нет покупок
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  </div>
                </CardContent>
              </Card>

              <Card className="h-fit order-3 md:order-none md:col-start-1 md:row-start-2">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    🏆 Все награды
                  </CardTitle>
                  <CardDescription>
                    Выполняй задания, зарабатывай награды и выбирай их как аватарку
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!allAwards || !Array.isArray(allAwards) ? (
                    <div className="text-sm text-muted-foreground text-center py-4">
                      Загрузка наград...
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[600px] overflow-y-auto overflow-x-visible hide-scrollbar px-2 py-2">
                      {/* Статистика */}
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="text-sm">
                          <span className="font-semibold">{userAwards?.length || 0}</span>
                          <span className="text-muted-foreground"> из {allAwards.length} наград</span>
                        </div>
                        <Badge variant="secondary">
                          {Math.round(((userAwards?.length || 0) / allAwards.length) * 100)}%
                        </Badge>
                      </div>

                      {/* Список наград по редкости */}
                      {['legendary', 'epic', 'rare', 'common'].map(rarity => {
                        const rarityAwards = allAwards.filter((a: any) => a.rarity === rarity);
                        if (rarityAwards.length === 0) return null;

                        const rarityLabels = {
                          legendary: '🌟 Легендарные',
                          epic: '💎 Эпические',
                          rare: '💠 Редкие',
                          common: '⭐ Обычные'
                        };

                        return (
                          <div key={rarity} className="space-y-2">
                            <h4 className="text-sm font-semibold">{rarityLabels[rarity as keyof typeof rarityLabels]}</h4>
                            <div className="space-y-2">
                              {rarityAwards.map((award: any) => {
                                const isEarned = userAwards?.some((ua: any) => ua.awardId === award.id);
                                const isSelected = user?.selectedAwardId === award.id;

                                return (
                                  <div
                                    key={award.id}
                                    className={`
                                    nft-award-container
                                    nft-award-${award.rarity}
                                    ${!isEarned ? 'nft-award-locked' : ''}
                                    ${isSelected ? 'nft-award-selected' : ''}
                                  `}
                                    data-testid={`award-${award.id}`}
                                  >
                                    {/* NFT Award Icon Display */}
                                    <div>
                                      <AwardIcon emoji={award.imageUrl} rarity={award.rarity} size={120} />
                                    </div>

                                    {/* Информация о награде */}
                                    <div className="mt-3 space-y-2">
                                      <div className="text-center">
                                        <h5 className={`font-bold text-base mb-1 ${!isEarned ? 'opacity-60' : ''}`}>
                                          {award.title}
                                        </h5>
                                        <p className={`text-xs ${!isEarned ? 'text-muted-foreground/60' : 'text-muted-foreground'}`}>
                                          {award.description}
                                        </p>
                                        {award.task && (
                                          <div className="flex items-center justify-center gap-1 text-xs text-primary mt-2 bg-primary/10 rounded px-2 py-1">
                                            <span className="font-medium">Задание:</span>
                                            <span>{award.task.title}</span>
                                          </div>
                                        )}
                                      </div>

                                      {/* Статусы */}
                                      <div className="flex justify-center gap-2">
                                        {!isEarned && (
                                          <Badge variant="outline" className="text-xs">🔒 Заблокирована</Badge>
                                        )}
                                        {isEarned && !isSelected && (
                                          <Badge variant="secondary" className="text-xs">✓ Получена</Badge>
                                        )}
                                      </div>

                                      {/* Кнопка выбора (только для заработанных) */}
                                      {isEarned && (
                                        <Button
                                          size="sm"
                                          variant={isSelected ? "outline" : "default"}
                                          onClick={() => handleSelectAward(isSelected ? null : award.id)}
                                          disabled={selectAwardMutation.isPending}
                                          className="w-full"
                                          data-testid={`button-select-award-${award.id}`}
                                        >
                                          {isSelected ? "✓ Выбрана" : "Выбрать как аватарку"}
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Мои рефералы
                    </CardTitle>
                    <CardDescription>
                      Подробная статистика по приглашённым пользователям
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground mb-1">Реферальный баланс</p>
                    <p className="text-2xl font-bold text-primary" data-testid="text-referral-balance">
                      {formatPrice(parseFloat(user?.referralBalance || "0"))} ₽
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Quick filters */}
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant="outline"
                    className="cursor-pointer hover-elevate active-elevate-2 px-3 py-1.5"
                    onClick={() => {
                      const today = new Date();
                      const weekAgo = new Date(today);
                      weekAgo.setDate(today.getDate() - 7);
                      setDateFrom(weekAgo.toISOString().split('T')[0]);
                      setDateTo(today.toISOString().split('T')[0]);
                    }}
                    data-testid="badge-filter-week"
                  >
                    Неделя
                  </Badge>
                  <Badge
                    variant="outline"
                    className="cursor-pointer hover-elevate active-elevate-2 px-3 py-1.5"
                    onClick={() => {
                      const today = new Date();
                      const monthAgo = new Date(today);
                      monthAgo.setMonth(today.getMonth() - 1);
                      setDateFrom(monthAgo.toISOString().split('T')[0]);
                      setDateTo(today.toISOString().split('T')[0]);
                    }}
                    data-testid="badge-filter-month"
                  >
                    Месяц
                  </Badge>
                  <Badge
                    variant="outline"
                    className="cursor-pointer hover-elevate active-elevate-2 px-3 py-1.5"
                    onClick={() => {
                      const today = new Date();
                      const yearAgo = new Date(today);
                      yearAgo.setFullYear(today.getFullYear() - 1);
                      setDateFrom(yearAgo.toISOString().split('T')[0]);
                      setDateTo(today.toISOString().split('T')[0]);
                    }}
                    data-testid="badge-filter-year"
                  >
                    Год
                  </Badge>
                  <Badge
                    variant="outline"
                    className="cursor-pointer hover-elevate active-elevate-2 px-3 py-1.5"
                    onClick={() => {
                      setDateFrom("");
                      setDateTo("");
                    }}
                    data-testid="badge-filter-all"
                  >
                    Всё время
                  </Badge>
                </div>

                {/* Date range filters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dateFrom" className="text-sm font-medium">Период с</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        id="dateFrom"
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="pl-10"
                        data-testid="input-date-from"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dateTo" className="text-sm font-medium">Период по</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        id="dateTo"
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="pl-10"
                        data-testid="input-date-to"
                      />
                    </div>
                  </div>
                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() => {
                        setDateFrom("");
                        setDateTo("");
                      }}
                      data-testid="button-reset-dates"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Сбросить
                    </Button>
                  </div>
                </div>

                <Alert className="mb-4">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Таблица рефералов</strong>
                    <p className="text-sm mt-1">
                      Здесь показаны все пользователи, зарегистрированные по вашей реферальной ссылке.
                      <br /><strong>Сумма пополнений</strong> — общая сумма, которую реферал пополнил за всё время.
                      <br /><strong>Реф. выплаты</strong> — ваш заработок с этого реферала (% от его пополнений согласно вашему тарифу).
                      <br /><strong>Последнее пополнение</strong> — дата самого свежего пополнения баланса рефералом.
                      <br />Нажмите на строку, чтобы увидеть историю всех пополнений.
                    </p>
                  </AlertDescription>
                </Alert>

                {isLoadingReferrals ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Загрузка...
                  </div>
                ) : referralDetails && Array.isArray(referralDetails) && referralDetails.length > 0 ? (
                  <>
                    <ScrollArea className="h-[600px] border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10"></TableHead>
                            <TableHead>Пользователь</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Telegram</TableHead>
                            <TableHead className="text-right">Сумма пополнений</TableHead>
                            <TableHead className="text-right">Реф. выплаты</TableHead>
                            <TableHead>Дата регистрации</TableHead>
                            <TableHead>Последнее пополнение</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {referralDetails.map((detail: any) => {
                            const userName = detail.user.firstName && detail.user.lastName
                              ? `${detail.user.firstName} ${detail.user.lastName}`
                              : "Пользователь";
                            const userEmail = detail.user.email || "—";
                            const telegram = detail.user.telegramUsername
                              ? (detail.user.telegramUsername.startsWith('@')
                                ? detail.user.telegramUsername
                                : `@${detail.user.telegramUsername}`)
                              : "—";
                            const isExpanded = expandedRows.has(detail.referral.id);
                            const hasTopups = detail.topups && detail.topups.length > 0;

                            // Find the latest topup date
                            const latestTopupDate = hasTopups
                              ? detail.topups
                                .filter((t: any) => t.date)
                                .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.date
                              : null;

                            const rows = [];

                            rows.push(
                              <TableRow
                                key={`main-${detail.referral.id}`}
                                data-testid={`row-referral-${detail.referral.id}`}
                                className={hasTopups ? "cursor-pointer hover-elevate" : ""}
                                onClick={() => {
                                  if (hasTopups) {
                                    setExpandedRows(prev => {
                                      const newSet = new Set(prev);
                                      if (prev.has(detail.referral.id)) {
                                        newSet.delete(detail.referral.id);
                                      } else {
                                        newSet.add(detail.referral.id);
                                      }
                                      return newSet;
                                    });
                                  }
                                }}
                              >
                                <TableCell>
                                  {hasTopups && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      data-testid={`button-expand-${detail.referral.id}`}
                                    >
                                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                    </Button>
                                  )}
                                </TableCell>
                                <TableCell className="font-medium" data-testid={`text-referral-name-${detail.referral.id}`}>
                                  {userName}
                                </TableCell>
                                <TableCell data-testid={`text-referral-email-${detail.referral.id}`}>
                                  <span className="text-sm text-muted-foreground">{userEmail}</span>
                                </TableCell>
                                <TableCell data-testid={`text-referral-telegram-${detail.referral.id}`}>
                                  {telegram}
                                </TableCell>
                                <TableCell className="text-right" data-testid={`text-referral-topups-${detail.referral.id}`}>
                                  {formatPrice(parseFloat(detail.totalTopups))} ₽
                                </TableCell>
                                <TableCell className="text-right font-semibold text-primary" data-testid={`text-referral-earnings-${detail.referral.id}`}>
                                  {formatPrice(parseFloat(detail.totalReferralEarnings))} ₽
                                </TableCell>
                                <TableCell data-testid={`text-referral-date-${detail.referral.id}`}>
                                  <span className="text-sm">{detail.referral.createdAt ? format(new Date(detail.referral.createdAt), "dd.MM.yyyy") : "—"}</span>
                                </TableCell>
                                <TableCell data-testid={`text-referral-last-topup-${detail.referral.id}`}>
                                  {latestTopupDate ? (
                                    <Badge variant="outline" className="text-xs">
                                      {format(new Date(latestTopupDate), "dd.MM.yyyy")}
                                    </Badge>
                                  ) : (
                                    <span className="text-sm text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            );

                            if (isExpanded && hasTopups) {
                              rows.push(
                                <TableRow key={`expanded-${detail.referral.id}`} data-testid={`row-expanded-${detail.referral.id}`}>
                                  <TableCell colSpan={8} className="bg-muted/30 p-0">
                                    <div className="p-4">
                                      <h4 className="text-sm font-semibold mb-3">История пополнений</h4>
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead>Дата пополнения</TableHead>
                                            <TableHead className="text-right">Сумма пополнения</TableHead>
                                            <TableHead className="text-right">Ваша выплата</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {detail.topups.map((topup: any, idx: number) => (
                                            <TableRow key={idx} data-testid={`row-topup-${detail.referral.id}-${idx}`}>
                                              <TableCell data-testid={`text-topup-date-${detail.referral.id}-${idx}`}>
                                                {topup.date ? format(new Date(topup.date), "dd.MM.yyyy HH:mm") : "—"}
                                              </TableCell>
                                              <TableCell className="text-right" data-testid={`text-topup-amount-${detail.referral.id}-${idx}`}>
                                                {formatPrice(parseFloat(topup.amount))} ₽
                                              </TableCell>
                                              <TableCell className="text-right font-semibold text-primary" data-testid={`text-topup-bonus-${detail.referral.id}-${idx}`}>
                                                {formatPrice(parseFloat(topup.referralBonus))} ₽
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            }

                            return rows;
                          })}
                          <TableRow className="font-bold bg-muted/50">
                            <TableCell colSpan={4}>ИТОГО ПО ВСЕМ РЕФЕРАЛАМ:</TableCell>
                            <TableCell className="text-right" data-testid="text-total-topups">
                              {formatPrice(referralDetails.reduce((sum: number, d: any) => sum + parseFloat(d.totalTopups), 0))} ₽
                            </TableCell>
                            <TableCell className="text-right text-primary" data-testid="text-total-earnings">
                              {formatPrice(referralDetails.reduce((sum: number, d: any) => sum + parseFloat(d.totalReferralEarnings), 0))} ₽
                            </TableCell>
                            <TableCell colSpan={2}></TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    У вас пока нет рефералов. Поделитесь своей реферальной ссылкой, чтобы начать зарабатывать!
                  </div>
                )}

                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">Реферальные операции</h3>
                  <Tabs defaultValue="earnings" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="earnings" className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Начисления
                      </TabsTrigger>
                      <TabsTrigger value="payouts" className="flex items-center gap-2">
                        <TrendingDown className="h-4 w-4" />
                        Выводы
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="earnings" className="mt-4">
                      <Alert className="mb-4">
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          <strong>История начислений</strong>
                          <p className="text-sm mt-1">
                            Все начисления на реферальный баланс. Вы получаете процент от каждого пополнения ваших рефералов согласно вашему реферальному тарифу. Средства зачисляются автоматически и моментально при пополнении баланса рефералом.
                          </p>
                        </AlertDescription>
                      </Alert>
                      {isLoadingReferralTransactions ? (
                        <div className="text-center py-8 text-muted-foreground">
                          Загрузка...
                        </div>
                      ) : referralTransactions && Array.isArray(referralTransactions) && referralTransactions.length > 0 ? (
                        <ScrollArea className="h-[400px] border rounded-lg">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Дата</TableHead>
                                <TableHead>Описание</TableHead>
                                <TableHead className="text-right">Сумма</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {referralTransactions.map((transaction: any) => (
                                <TableRow key={transaction.id} data-testid={`row-transaction-${transaction.id}`}>
                                  <TableCell data-testid={`text-transaction-date-${transaction.id}`}>
                                    {transaction.createdAt ? format(new Date(transaction.createdAt), "dd.MM.yyyy HH:mm") : "—"}
                                  </TableCell>
                                  <TableCell data-testid={`text-transaction-description-${transaction.id}`}>
                                    {transaction.description || "—"}
                                  </TableCell>
                                  <TableCell className="text-right font-semibold text-green-600" data-testid={`text-transaction-amount-${transaction.id}`}>
                                    +{formatPrice(parseFloat(transaction.amount))} ₽
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </ScrollArea>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          Пока нет начислений
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="payouts" className="mt-4">
                      <Alert className="mb-4">
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          <strong>История выводов</strong>
                          <p className="text-sm mt-1">
                            Журнал выводов средств с реферального баланса. Вывод осуществляется администратором по вашему запросу. После вывода средства поступают на указанные вами реквизиты, а реферальный баланс уменьшается на выведенную сумму.
                          </p>
                        </AlertDescription>
                      </Alert>
                      {isLoadingPayoutTransactions ? (
                        <div className="text-center py-8 text-muted-foreground">
                          Загрузка...
                        </div>
                      ) : payoutTransactions && Array.isArray(payoutTransactions) && payoutTransactions.length > 0 ? (
                        <ScrollArea className="h-[400px] border rounded-lg">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Дата</TableHead>
                                <TableHead>Описание</TableHead>
                                <TableHead className="text-right">Сумма</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {payoutTransactions.map((transaction: any) => (
                                <TableRow key={transaction.id} data-testid={`row-payout-${transaction.id}`}>
                                  <TableCell data-testid={`text-payout-date-${transaction.id}`}>
                                    {transaction.createdAt ? format(new Date(transaction.createdAt), "dd.MM.yyyy HH:mm") : "—"}
                                  </TableCell>
                                  <TableCell data-testid={`text-payout-description-${transaction.id}`}>
                                    {transaction.description || "—"}
                                  </TableCell>
                                  <TableCell className="text-right font-semibold text-orange-600" data-testid={`text-payout-amount-${transaction.id}`}>
                                    -{formatPrice(parseFloat(transaction.amount))} ₽
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </ScrollArea>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          Пока нет выводов
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />

      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen} data-testid="dialog-link-telegram">
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Привязка Telegram</DialogTitle>
            <DialogDescription>
              Получите код от бота и введите его ниже
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm whitespace-pre-line">
                1. Откройте Telegram и найдите бота <span className="font-semibold">@{siteSettings?.telegramBotUsername || 'proverka1323bot'}</span>{"\n"}2. Отправьте команду <code className="bg-muted px-1 py-0.5 rounded">/start</code>{"\n"}3. Бот пришлет вам 4-значный код{"\n"}4. Введите код ниже
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="verification-code">Код подтверждения</Label>
              <Input
                id="verification-code"
                placeholder="Введите 4-значный код"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                maxLength={4}
                data-testid="input-verification-code"
              />
              <p className="text-xs text-muted-foreground">
                Код действителен 10 минут
              </p>
            </div>
            <Button
              className="w-full"
              onClick={handleVerifyCode}
              disabled={verifyLinkingCodeMutation.isPending || verificationCode.length !== 4}
              data-testid="button-verify-code"
            >
              {verifyLinkingCodeMutation.isPending ? "Проверка..." : "Подтвердить"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
