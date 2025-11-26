import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Search, Shield, ShieldOff, Ban, CheckCircle, Coins, DollarSign, Users, ChevronLeft, ChevronRight, ShoppingCart, Trash2, Plus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatPrice } from "@/lib/formatPrice";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const USERS_PER_PAGE = 20;
const COURSES_PER_PAGE = 10;

interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  telegramId: string | null;
  telegramUsername: string | null;
  profileImageUrl: string | null;
  balance: string;
  referralBalance: string;
  referralBonusPercent: number | null;
  fantiks: number;
  isAdmin: boolean;
  isBlocked: boolean;
  createdAt: string;
}

export default function AdminUsers() {
  const { toast } = useToast();
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceAllAmount, setBalanceAllAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [referralPercent, setReferralPercent] = useState("");
  const [isBalanceDialogOpen, setIsBalanceDialogOpen] = useState(false);
  const [isBalanceAllDialogOpen, setIsBalanceAllDialogOpen] = useState(false);
  const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false);
  const [isReferralPercentDialogOpen, setIsReferralPercentDialogOpen] = useState(false);
  const [isPurchasesDialogOpen, setIsPurchasesDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: 'admin' | 'block', user: User } | null>(null);
  const [userToWithdraw, setUserToWithdraw] = useState<User | null>(null);
  const [userForReferralPercent, setUserForReferralPercent] = useState<User | null>(null);
  const [selectedUserForPurchases, setSelectedUserForPurchases] = useState<User | null>(null);
  const [isGrantCourseDialogOpen, setIsGrantCourseDialogOpen] = useState(false);
  const [selectedCourseToGrant, setSelectedCourseToGrant] = useState<string>("");
  const [courseSearchQuery, setCourseSearchQuery] = useState("");
  const [coursePage, setCoursePage] = useState(1);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch users with search
  const queryUrl = searchQuery 
    ? `/api/admin/users?search=${encodeURIComponent(searchQuery)}`
    : "/api/admin/users";
    
  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: [queryUrl],
    staleTime: 0,
    gcTime: 0,
  });

  // Separate admins and regular users
  const allAdmins = users?.filter(u => u.isAdmin) || [];
  const allRegularUsers = users?.filter(u => !u.isAdmin) || [];
  
  // Pagination calculations for regular users only
  const totalRegularUsers = allRegularUsers.length;
  const totalPages = Math.ceil(totalRegularUsers / USERS_PER_PAGE);
  const startIndex = (currentPage - 1) * USERS_PER_PAGE;
  const endIndex = startIndex + USERS_PER_PAGE;
  const paginatedRegularUsers = allRegularUsers.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Clamp currentPage when data changes to avoid empty pages
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // Mutations
  const toggleAdminMutation = useMutation({
    mutationFn: async ({ userId, isAdmin }: { userId: string; isAdmin: boolean }) => {
      return apiRequest("PUT", `/api/admin/users/${userId}/admin`, { isAdmin });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          Array.isArray(query.queryKey) && 
          typeof query.queryKey[0] === 'string' && 
          query.queryKey[0].startsWith('/api/admin/users')
      });
      toast({ title: "Успешно", description: "Статус администратора обновлён" });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось обновить статус", variant: "destructive" });
    },
  });

  const toggleBlockedMutation = useMutation({
    mutationFn: async ({ userId, isBlocked }: { userId: string; isBlocked: boolean }) => {
      return apiRequest("PUT", `/api/admin/users/${userId}/blocked`, { isBlocked });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          Array.isArray(query.queryKey) && 
          typeof query.queryKey[0] === 'string' && 
          query.queryKey[0].startsWith('/api/admin/users')
      });
      toast({ title: "Успешно", description: "Статус блокировки обновлён" });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось обновить статус", variant: "destructive" });
    },
  });

  const addBalanceMutation = useMutation({
    mutationFn: async ({ userId, amount }: { userId: string; amount: number }) => {
      return apiRequest("POST", `/api/admin/users/${userId}/balance`, { amount });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          Array.isArray(query.queryKey) && 
          typeof query.queryKey[0] === 'string' && 
          query.queryKey[0].startsWith('/api/admin/users')
      });
      toast({ title: "Успешно", description: "Баланс пополнен" });
      setIsBalanceDialogOpen(false);
      setBalanceAmount("");
      setSelectedUser(null);
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось пополнить баланс", variant: "destructive" });
    },
  });

  const addBalanceAllMutation = useMutation({
    mutationFn: async (amount: number) => {
      return apiRequest("POST", `/api/admin/users/balance/all`, { amount });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          Array.isArray(query.queryKey) && 
          typeof query.queryKey[0] === 'string' && 
          query.queryKey[0].startsWith('/api/admin/users')
      });
      toast({ 
        title: "Успешно", 
        description: `Баланс пополнен для ${data.updatedCount} пользователей` 
      });
      setIsBalanceAllDialogOpen(false);
      setBalanceAllAmount("");
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось пополнить баланс", variant: "destructive" });
    },
  });

  const withdrawReferralMutation = useMutation({
    mutationFn: async ({ userId, amount }: { userId: string; amount: number }) => {
      return apiRequest("POST", `/api/admin/users/${userId}/withdraw-referral`, { amount });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          Array.isArray(query.queryKey) && 
          typeof query.queryKey[0] === 'string' && 
          query.queryKey[0].startsWith('/api/admin/users')
      });
      const amount = data?.amount ? (typeof data.amount === 'string' ? parseFloat(data.amount) : data.amount) : 0;
      toast({ 
        title: "Успешно", 
        description: `Выведено ${formatPrice(amount)} ₽` 
      });
      setIsWithdrawDialogOpen(false);
      setWithdrawAmount("");
      setUserToWithdraw(null);
    },
    onError: (error: any) => {
      const message = error.message || "Не удалось вывести баланс";
      toast({ title: "Ошибка", description: message, variant: "destructive" });
    },
  });

  const setReferralPercentMutation = useMutation({
    mutationFn: async ({ userId, percent }: { userId: string; percent: number | null }) => {
      return apiRequest("PUT", `/api/admin/users/${userId}/referral-percent`, { referralBonusPercent: percent });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          Array.isArray(query.queryKey) && 
          typeof query.queryKey[0] === 'string' && 
          query.queryKey[0].startsWith('/api/admin/users')
      });
      toast({ title: "Успешно", description: "Реферальный процент обновлён" });
      setIsReferralPercentDialogOpen(false);
      setReferralPercent("");
      setUserForReferralPercent(null);
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось обновить процент", variant: "destructive" });
    },
  });

  const { data: userPurchases, isLoading: isLoadingPurchases } = useQuery({
    queryKey: selectedUserForPurchases ? [`/api/admin/users/${selectedUserForPurchases.id}/purchases`] : [],
    enabled: !!selectedUserForPurchases && isPurchasesDialogOpen,
    staleTime: 0,
  });

  const { data: userVipPackages, isLoading: isLoadingVipPackages } = useQuery({
    queryKey: selectedUserForPurchases ? [`/api/admin/users/${selectedUserForPurchases.id}/vip-packages`] : [],
    enabled: !!selectedUserForPurchases && isPurchasesDialogOpen,
    staleTime: 0,
  });

  const { data: allCourses, isLoading: isLoadingCourses } = useQuery<any[]>({
    queryKey: ['/api/courses'],
    enabled: isGrantCourseDialogOpen,
    staleTime: 0,
  });

  const refundPurchaseMutation = useMutation({
    mutationFn: async ({ userId, purchaseId }: { userId: string; purchaseId: string }) => {
      return apiRequest("DELETE", `/api/admin/users/${userId}/purchases/${purchaseId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          Array.isArray(query.queryKey) && 
          typeof query.queryKey[0] === 'string' && 
          (query.queryKey[0].startsWith('/api/admin/users') || query.queryKey[0].includes('/purchases'))
      });
      toast({ title: "Успешно", description: "Покупка отменена, баланс возвращён" });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось отменить покупку", variant: "destructive" });
    },
  });

  const refundVipPackageMutation = useMutation({
    mutationFn: async ({ userId, packageId }: { userId: string; packageId: string }) => {
      return apiRequest("DELETE", `/api/admin/users/${userId}/vip-packages/${packageId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          Array.isArray(query.queryKey) && 
          typeof query.queryKey[0] === 'string' && 
          (query.queryKey[0].startsWith('/api/admin/users') || query.queryKey[0].includes('/vip-packages'))
      });
      toast({ title: "Успешно", description: "VIP-пакет отменён, баланс возвращён" });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось отменить VIP-пакет", variant: "destructive" });
    },
  });

  const grantCourseMutation = useMutation({
    mutationFn: async ({ userId, courseId }: { userId: string; courseId: string }) => {
      return apiRequest("POST", `/api/admin/users/${userId}/purchases/grant`, { courseId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          Array.isArray(query.queryKey) && 
          typeof query.queryKey[0] === 'string' && 
          (query.queryKey[0].startsWith('/api/admin/users') || query.queryKey[0].includes('/purchases'))
      });
      toast({ title: "Успешно", description: "Курс успешно выдан пользователю" });
      setIsGrantCourseDialogOpen(false);
      setSelectedCourseToGrant("");
    },
    onError: (error: any) => {
      const message = error.message || "Не удалось выдать курс";
      toast({ title: "Ошибка", description: message, variant: "destructive" });
    },
  });

  const handleAddBalance = () => {
    if (!selectedUser) return;
    
    const trimmedAmount = balanceAmount.trim();
    if (!trimmedAmount) {
      toast({ title: "Ошибка", description: "Введите сумму", variant: "destructive" });
      return;
    }
    
    const amount = parseFloat(trimmedAmount);
    if (isNaN(amount)) {
      toast({ title: "Ошибка", description: "Введите число", variant: "destructive" });
      return;
    }
    
    if (amount === 0) {
      toast({ title: "Ошибка", description: "Сумма не может быть нулевой", variant: "destructive" });
      return;
    }
    
    addBalanceMutation.mutate({ userId: selectedUser.id, amount });
  };

  const handleAddBalanceAll = () => {
    const trimmedAmount = balanceAllAmount.trim();
    if (!trimmedAmount) {
      toast({ title: "Ошибка", description: "Введите сумму", variant: "destructive" });
      return;
    }
    
    const amount = parseFloat(trimmedAmount);
    if (isNaN(amount)) {
      toast({ title: "Ошибка", description: "Введите число", variant: "destructive" });
      return;
    }
    
    if (amount === 0) {
      toast({ title: "Ошибка", description: "Сумма не может быть нулевой", variant: "destructive" });
      return;
    }
    
    addBalanceAllMutation.mutate(amount);
  };

  const handleWithdrawReferral = () => {
    if (!userToWithdraw) return;
    
    const trimmedAmount = withdrawAmount.trim();
    if (!trimmedAmount) {
      toast({ title: "Ошибка", description: "Введите сумму", variant: "destructive" });
      return;
    }
    
    const amount = parseFloat(trimmedAmount);
    if (isNaN(amount)) {
      toast({ title: "Ошибка", description: "Введите число", variant: "destructive" });
      return;
    }
    
    if (amount <= 0) {
      toast({ title: "Ошибка", description: "Сумма должна быть положительной", variant: "destructive" });
      return;
    }

    const referralBalance = parseFloat(userToWithdraw.referralBalance || "0");
    if (amount > referralBalance) {
      toast({ title: "Ошибка", description: "Недостаточно средств на реферальном балансе", variant: "destructive" });
      return;
    }
    
    withdrawReferralMutation.mutate({ userId: userToWithdraw.id, amount });
  };

  const handleSetReferralPercent = () => {
    if (!userForReferralPercent) return;
    
    const trimmedPercent = referralPercent.trim();
    
    // Если поле пустое - сбрасываем на null (использовать общий процент)
    if (!trimmedPercent) {
      setReferralPercentMutation.mutate({ userId: userForReferralPercent.id, percent: null });
      return;
    }
    
    const percent = parseInt(trimmedPercent);
    if (isNaN(percent)) {
      toast({ title: "Ошибка", description: "Введите целое число", variant: "destructive" });
      return;
    }
    
    if (percent < 0 || percent > 100) {
      toast({ title: "Ошибка", description: "Процент должен быть от 0 до 100", variant: "destructive" });
      return;
    }
    
    setReferralPercentMutation.mutate({ userId: userForReferralPercent.id, percent });
  };

  const handleGrantCourse = () => {
    if (!selectedUserForPurchases || !selectedCourseToGrant) {
      toast({ title: "Ошибка", description: "Выберите курс", variant: "destructive" });
      return;
    }
    
    grantCourseMutation.mutate({ 
      userId: selectedUserForPurchases.id, 
      courseId: selectedCourseToGrant 
    });
  };

  // Filter courses that user doesn't already have
  const availableCoursesToGrant = allCourses?.filter((course: any) => {
    const hasCourse = (userPurchases as any[])?.some((purchase: any) => purchase.courseId === course.id);
    if (hasCourse) return false;
    
    // Apply search filter
    if (courseSearchQuery.trim()) {
      const query = courseSearchQuery.toLowerCase();
      const titleMatch = course.title?.toLowerCase().includes(query);
      const platformMatch = course.platform?.toLowerCase().includes(query);
      const categoryMatch = course.categoryName?.toLowerCase().includes(query);
      return titleMatch || platformMatch || categoryMatch;
    }
    
    return true;
  }) || [];

  // Pagination for courses
  const totalCourses = availableCoursesToGrant.length;
  const totalCoursePages = Math.ceil(totalCourses / COURSES_PER_PAGE);
  const courseStartIndex = (coursePage - 1) * COURSES_PER_PAGE;
  const courseEndIndex = courseStartIndex + COURSES_PER_PAGE;
  const paginatedCourses = availableCoursesToGrant.slice(courseStartIndex, courseEndIndex);

  // Reset course page when search changes
  useEffect(() => {
    setCoursePage(1);
  }, [courseSearchQuery]);

  const totalUsers = users?.length || 0;
  const allAdminCount = allAdmins.length;
  const allRegularCount = allRegularUsers.length;

  const renderUserCard = (user: User) => {
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "Без имени";
    const initials = fullName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

    return (
      <Card key={user.id} className="hover-elevate" data-testid={`card-user-${user.id}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user.profileImageUrl || undefined} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold truncate">{fullName}</h3>
                {user.isAdmin && <Badge variant="default"><Shield className="h-3 w-3 mr-1" />Админ</Badge>}
                {user.isBlocked && <Badge variant="destructive"><Ban className="h-3 w-3 mr-1" />Заблокирован</Badge>}
              </div>
              
              <div className="space-y-1 text-sm text-muted-foreground">
                {user.email && <p className="truncate">{user.email}</p>}
                {user.telegramUsername && <p>{user.telegramUsername.startsWith('@') ? user.telegramUsername : `@${user.telegramUsername}`}</p>}
                <div className="flex flex-col gap-0.5 mt-2">
                  <p className="flex items-center gap-1 text-xs">
                    💰 Обычный: {formatPrice(parseFloat(user.balance))} ₽
                  </p>
                  <p className="flex items-center gap-1 text-xs">
                    💳 Реферальный: {formatPrice(parseFloat(user.referralBalance || "0"))} ₽
                  </p>
                  <p className="flex items-center gap-1 text-xs">
                    🎫 Фантики: {user.fantiks || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 min-w-[180px]">
              <Button
                size="sm"
                variant={user.isAdmin ? "destructive" : "default"}
                onClick={() => setConfirmAction({ type: 'admin', user })}
                data-testid={`button-toggle-admin-${user.id}`}
                className="justify-start"
              >
                {user.isAdmin ? (
                  <>
                    <ShieldOff className="h-4 w-4 mr-2" />
                    Снять админа
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Назначить админом
                  </>
                )}
              </Button>

              <Button
                size="sm"
                variant={user.isBlocked ? "outline" : "destructive"}
                onClick={() => setConfirmAction({ type: 'block', user })}
                data-testid={`button-toggle-blocked-${user.id}`}
                className="justify-start"
              >
                {user.isBlocked ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Разблокировать
                  </>
                ) : (
                  <>
                    <Ban className="h-4 w-4 mr-2" />
                    Заблокировать
                  </>
                )}
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedUser(user);
                  setIsBalanceDialogOpen(true);
                }}
                data-testid={`button-add-balance-${user.id}`}
                className="justify-start"
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Пополнить
              </Button>

              {parseFloat(user.referralBalance || "0") > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setUserToWithdraw(user);
                    setWithdrawAmount(user.referralBalance || "0");
                    setIsWithdrawDialogOpen(true);
                  }}
                  data-testid={`button-withdraw-referral-${user.id}`}
                  className="justify-start"
                >
                  <Coins className="h-4 w-4 mr-2" />
                  Вывести реферальный
                </Button>
              )}

              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setUserForReferralPercent(user);
                  setReferralPercent(user.referralBonusPercent !== null ? user.referralBonusPercent.toString() : "");
                  setIsReferralPercentDialogOpen(true);
                }}
                data-testid={`button-set-referral-percent-${user.id}`}
                className="justify-start"
              >
                <Users className="h-4 w-4 mr-2" />
                Реферальный %
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedUserForPurchases(user);
                  setIsPurchasesDialogOpen(true);
                }}
                data-testid={`button-manage-purchases-${user.id}`}
                className="justify-start"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Покупки
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <AdminLayout breadcrumbs={[{ label: "Пользователи" }]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Управление пользователями</h1>
            <p className="text-muted-foreground">
              Всего: {users?.length || 0} • Админы: {allAdminCount} • Пользователи: {allRegularCount}
            </p>
          </div>
          
          <Dialog open={isBalanceAllDialogOpen} onOpenChange={setIsBalanceAllDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-balance-all">
                <Users className="mr-2 h-4 w-4" />
                Пополнить всем
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Пополнить баланс всем пользователям</DialogTitle>
                <DialogDescription>
                  Сумма будет добавлена к текущему балансу всех пользователей
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="balanceAll">Сумма (₽)</Label>
                  <Input
                    id="balanceAll"
                    type="number"
                    value={balanceAllAmount}
                    onChange={(e) => setBalanceAllAmount(e.target.value)}
                    placeholder="1000"
                    data-testid="input-balance-all"
                  />
                </div>
                <Button
                  onClick={handleAddBalanceAll}
                  disabled={addBalanceAllMutation.isPending}
                  className="w-full"
                  data-testid="button-confirm-balance-all"
                >
                  {addBalanceAllMutation.isPending ? "Пополнение..." : "Пополнить"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по имени, email, Telegram..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10"
              data-testid="input-search-users"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Загрузка...</div>
        ) : (
          <>
            {allAdmins.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Администраторы ({allAdmins.length})
                </h2>
                <div className="grid gap-4">
                  {allAdmins.map(renderUserCard)}
                </div>
              </div>
            )}

            {paginatedRegularUsers.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Пользователи ({paginatedRegularUsers.length})
                </h2>
                <div className="grid gap-4">
                  {paginatedRegularUsers.map(renderUserCard)}
                </div>
              </div>
            )}

            {users?.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                Пользователи не найдены
              </div>
            )}

            {allRegularUsers.length > 0 && (
              <div className="flex items-center justify-center gap-4 mt-8">
                {totalPages > 1 && (
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(p => p - 1)}
                    disabled={currentPage === 1}
                    data-testid="button-previous-page"
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Назад
                  </Button>
                )}
                <span className="text-sm text-muted-foreground" data-testid="text-page-info">
                  Страница {currentPage} из {totalPages || 1} • {totalRegularUsers} пользователей
                </span>
                {totalPages > 1 && (
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(p => p + 1)}
                    disabled={currentPage === totalPages}
                    data-testid="button-next-page"
                  >
                    Вперёд
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={isBalanceDialogOpen} onOpenChange={setIsBalanceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Пополнить баланс</DialogTitle>
            <DialogDescription>
              {selectedUser && `${[selectedUser.firstName, selectedUser.lastName].filter(Boolean).join(" ")} • Текущий баланс: ${formatPrice(parseFloat(selectedUser.balance))} ₽`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="balance">Сумма (₽)</Label>
              <Input
                id="balance"
                type="number"
                value={balanceAmount}
                onChange={(e) => setBalanceAmount(e.target.value)}
                placeholder="1000"
                data-testid="input-balance-amount"
              />
            </div>
            <Button
              onClick={handleAddBalance}
              disabled={addBalanceMutation.isPending}
              className="w-full"
              data-testid="button-confirm-balance"
            >
              {addBalanceMutation.isPending ? "Пополнение..." : "Пополнить"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === 'admin' 
                ? (confirmAction.user.isAdmin ? 'Снять права администратора?' : 'Назначить администратором?')
                : (confirmAction?.user.isBlocked ? 'Разблокировать пользователя?' : 'Заблокировать пользователя?')
              }
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction && (
                <div className="space-y-2">
                  <p>
                    <strong>{[confirmAction.user.firstName, confirmAction.user.lastName].filter(Boolean).join(" ") || "Пользователь"}</strong>
                  </p>
                  {confirmAction.user.email && <p className="text-sm">{confirmAction.user.email}</p>}
                  
                  {confirmAction.type === 'admin' && (
                    <p className="mt-4">
                      {confirmAction.user.isAdmin 
                        ? 'Пользователь потеряет доступ к административной панели и всем её функциям.'
                        : 'Пользователь получит полный доступ к административной панели, включая управление курсами, категориями и другими пользователями.'
                      }
                    </p>
                  )}
                  
                  {confirmAction.type === 'block' && (
                    <p className="mt-4">
                      {confirmAction.user.isBlocked
                        ? 'Пользователь сможет снова авторизоваться и использовать платформу.'
                        : 'Пользователь не сможет авторизоваться на платформе. Все его данные останутся сохранены.'
                      }
                    </p>
                  )}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-action">Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!confirmAction) return;
                
                if (confirmAction.type === 'admin') {
                  toggleAdminMutation.mutate({ 
                    userId: confirmAction.user.id, 
                    isAdmin: !confirmAction.user.isAdmin 
                  });
                } else {
                  toggleBlockedMutation.mutate({ 
                    userId: confirmAction.user.id, 
                    isBlocked: !confirmAction.user.isBlocked 
                  });
                }
                
                setConfirmAction(null);
              }}
              data-testid="button-confirm-action"
            >
              Подтвердить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isWithdrawDialogOpen} onOpenChange={setIsWithdrawDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Вывод реферального баланса</DialogTitle>
            <DialogDescription>
              {userToWithdraw && (
                <>
                  <p className="font-medium">
                    {[userToWithdraw.firstName, userToWithdraw.lastName].filter(Boolean).join(" ") || "Пользователь"}
                  </p>
                  {userToWithdraw.email && <p className="text-sm">{userToWithdraw.email}</p>}
                  <p className="mt-2">
                    Доступно для вывода: <span className="font-semibold">{formatPrice(parseFloat(userToWithdraw.referralBalance || "0"))} ₽</span>
                  </p>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="withdrawAmount">Сумма вывода (₽)</Label>
              <Input
                id="withdrawAmount"
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Введите сумму"
                data-testid="input-withdraw-amount"
              />
              <p className="text-xs text-muted-foreground">
                Эта сумма будет вычтена из реферального баланса пользователя
              </p>
            </div>
            <Button
              onClick={handleWithdrawReferral}
              disabled={withdrawReferralMutation.isPending}
              className="w-full"
              data-testid="button-confirm-withdraw"
            >
              {withdrawReferralMutation.isPending ? "Обработка..." : "Подтвердить вывод"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isReferralPercentDialogOpen} onOpenChange={setIsReferralPercentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Индивидуальный реферальный процент</DialogTitle>
            <DialogDescription>
              {userForReferralPercent && (
                <>
                  <p className="font-medium">
                    {[userForReferralPercent.firstName, userForReferralPercent.lastName].filter(Boolean).join(" ") || "Пользователь"}
                  </p>
                  {userForReferralPercent.email && <p className="text-sm">{userForReferralPercent.email}</p>}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="referralPercent">Процент (0-100)</Label>
              <Input
                id="referralPercent"
                type="number"
                min="0"
                max="100"
                value={referralPercent}
                onChange={(e) => setReferralPercent(e.target.value)}
                placeholder="Введите процент или оставьте пустым"
                data-testid="input-referral-percent"
              />
              <p className="text-xs text-muted-foreground">
                Оставьте поле пустым, чтобы использовать общий процент из настроек
              </p>
            </div>
            <Button
              onClick={handleSetReferralPercent}
              disabled={setReferralPercentMutation.isPending}
              className="w-full"
              data-testid="button-confirm-referral-percent"
            >
              {setReferralPercentMutation.isPending ? "Обработка..." : "Подтвердить"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isPurchasesDialogOpen} onOpenChange={setIsPurchasesDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Управление покупками</DialogTitle>
            <DialogDescription>
              {selectedUserForPurchases && (
                <>
                  <p className="font-medium">
                    {[selectedUserForPurchases.firstName, selectedUserForPurchases.lastName].filter(Boolean).join(" ") || "Пользователь"}
                  </p>
                  {selectedUserForPurchases.email && <p className="text-sm">{selectedUserForPurchases.email}</p>}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="courses" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="courses">Курсы</TabsTrigger>
              <TabsTrigger value="vip">VIP-пакеты</TabsTrigger>
            </TabsList>

            <TabsContent value="courses" className="space-y-4 mt-4">
              <Button
                variant="outline"
                onClick={() => setIsGrantCourseDialogOpen(true)}
                data-testid="button-grant-course"
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Выдать курс
              </Button>

              {isLoadingPurchases ? (
                <div className="text-center py-8 text-muted-foreground">Загрузка...</div>
              ) : !userPurchases || !Array.isArray(userPurchases) || userPurchases.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Нет покупок</div>
              ) : (
                <div className="space-y-3">
                  {(userPurchases as any[]).map((purchase: any) => (
                    <Card key={purchase.id} data-testid={`purchase-${purchase.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="font-semibold">{purchase.course?.title || "Курс не найден"}</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              Цена: {formatPrice(parseFloat(purchase.price))} ₽
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Дата: {new Date(purchase.purchaseDate).toLocaleDateString('ru-RU')}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              if (selectedUserForPurchases && confirm('Вы уверены, что хотите отменить эту покупку? Баланс будет возвращён пользователю.')) {
                                refundPurchaseMutation.mutate({
                                  userId: selectedUserForPurchases.id,
                                  purchaseId: purchase.id,
                                });
                              }
                            }}
                            disabled={refundPurchaseMutation.isPending}
                            data-testid={`button-refund-purchase-${purchase.id}`}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Возврат
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="vip" className="space-y-4 mt-4">
              {isLoadingVipPackages ? (
                <div className="text-center py-8 text-muted-foreground">Загрузка...</div>
              ) : !userVipPackages || !Array.isArray(userVipPackages) || userVipPackages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Нет VIP-пакетов</div>
              ) : (
                <div className="space-y-3">
                  {(userVipPackages as any[]).map((pkg: any) => {
                    const tierNames: Record<string, string> = {
                      'bronze': 'Бронзовый',
                      'silver': 'Серебряный',
                      'gold': 'Золотой',
                      'diamond': 'Бриллиантовый',
                    };
                    const price = parseFloat(pkg.price || "0");
                    const tierName = tierNames[pkg.tier] || pkg.tier;

                    return (
                      <Card key={pkg.id} data-testid={`vip-package-${pkg.id}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h4 className="font-semibold">{tierName} VIP-пакет</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                Цена: {formatPrice(price)} ₽
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Дата: {new Date(pkg.purchaseDate).toLocaleDateString('ru-RU')}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Статус: {pkg.isActivated ? 'Активирован' : 'Не активирован'}
                              </p>
                              {pkg.isActivated && (
                                <p className="text-sm text-muted-foreground">
                                  Выбрано курсов: {pkg.currentYearSelected} текущего года, {pkg.previousYearsSelected} прошлых лет
                                </p>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                if (selectedUserForPurchases && confirm(`Вы уверены, что хотите отменить этот VIP-пакет? ${pkg.isActivated ? 'Связанные курсы будут удалены. ' : ''}Баланс ${formatPrice(price)} ₽ будет возвращён пользователю.`)) {
                                  refundVipPackageMutation.mutate({
                                    userId: selectedUserForPurchases.id,
                                    packageId: pkg.id,
                                  });
                                }
                              }}
                              disabled={refundVipPackageMutation.isPending}
                              data-testid={`button-refund-vip-${pkg.id}`}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Возврат
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <Dialog open={isGrantCourseDialogOpen} onOpenChange={(open) => {
        setIsGrantCourseDialogOpen(open);
        if (!open) {
          setCourseSearchQuery("");
          setSelectedCourseToGrant("");
          setCoursePage(1);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Выдать курс пользователю</DialogTitle>
            <DialogDescription>
              {selectedUserForPurchases && (
                <>
                  <p className="font-medium">
                    {[selectedUserForPurchases.firstName, selectedUserForPurchases.lastName].filter(Boolean).join(" ") || "Пользователь"}
                  </p>
                  {selectedUserForPurchases.email && <p className="text-sm">{selectedUserForPurchases.email}</p>}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {isLoadingCourses ? (
              <div className="text-center py-4 text-muted-foreground">Загрузка курсов...</div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="courseSearch">Поиск курсов</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="courseSearch"
                      placeholder="Введите название курса, платформу или категорию..."
                      value={courseSearchQuery}
                      onChange={(e) => setCourseSearchQuery(e.target.value)}
                      className="pl-9"
                      data-testid="input-search-courses"
                    />
                  </div>
                </div>

                {availableCoursesToGrant.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {courseSearchQuery.trim() ? "Курсы не найдены" : "Все доступные курсы уже выданы этому пользователю"}
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Выберите курс</Label>
                        <span className="text-sm text-muted-foreground">
                          Всего курсов: {totalCourses} {totalCoursePages > 1 && `(стр. ${coursePage} из ${totalCoursePages})`}
                        </span>
                      </div>
                      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                        {paginatedCourses.map((course: any) => (
                          <Card
                            key={course.id}
                            className={`cursor-pointer transition-all ${
                              selectedCourseToGrant === course.id
                                ? "ring-2 ring-primary bg-accent"
                                : "hover-elevate"
                            }`}
                            onClick={() => setSelectedCourseToGrant(course.id)}
                            data-testid={`card-course-grant-${course.id}`}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-start gap-3">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-sm leading-tight mb-1">
                                    {course.title}
                                  </h4>
                                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                    {course.platform && (
                                      <Badge variant="secondary" className="text-xs">
                                        {course.platform}
                                      </Badge>
                                    )}
                                    {course.categoryName && (
                                      <Badge variant="outline" className="text-xs">
                                        {course.categoryName}
                                      </Badge>
                                    )}
                                    {course.year && (
                                      <Badge variant="outline" className="text-xs">
                                        {course.year}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="flex-shrink-0 text-right">
                                  <p className="font-semibold text-primary">
                                    {formatPrice(parseFloat(course.price))} ₽
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>

                    {totalCoursePages > 1 && (
                      <div className="flex items-center justify-between gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCoursePage(p => Math.max(1, p - 1))}
                          disabled={coursePage === 1}
                          data-testid="button-courses-prev-page"
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          Назад
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          Страница {coursePage} из {totalCoursePages}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCoursePage(p => Math.min(totalCoursePages, p + 1))}
                          disabled={coursePage === totalCoursePages}
                          data-testid="button-courses-next-page"
                        >
                          Вперёд
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    )}

                    <Button
                      onClick={handleGrantCourse}
                      disabled={!selectedCourseToGrant || grantCourseMutation.isPending}
                      className="w-full"
                      data-testid="button-confirm-grant-course"
                    >
                      {grantCourseMutation.isPending ? "Выдача..." : "Выдать курс"}
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
