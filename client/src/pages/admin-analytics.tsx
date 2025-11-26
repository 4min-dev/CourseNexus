import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Activity, Users, DollarSign, BookOpen, Clock, Video, TrendingUp, UserCheck, Gift, ChevronLeft, ChevronRight, Search, HelpCircle, Info } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface UserAnalytics {
  id: string;
  email: string;
  displayName: string | null;
  telegramUsername: string | null;
  profileImage: string | null;
  isOnline: boolean;
  lastActivityAt: string | null;
  balance: number;
  coursesPurchased: number;
  totalPurchaseAmount: string;
  videoWatchMinutes: number;
}

interface PlatformStats {
  usersOnline: number;
  totalUsers: number;
  totalRevenue: number;
  totalWatchTimeMinutes: number;
  usersWithTelegram: number;
}

interface RevenueDataPoint {
  date: string;
  revenue: string;
  purchases: number;
}

interface TopCourse {
  id: string;
  title: string;
  views: number;
  purchases: number;
  revenue: string;
  conversionRate: number;
  completionRate: number;
  avgWatchTime: number;
}

interface ActiveUsersStats {
  dau: number;
  wau: number;
  mau: number;
  dailyData: Array<{ date: string; activeUsers: number }>;
}

interface PurchaseFunnel {
  totalUsers: number;
  viewedCourses: number;
  addedToFavorites: number;
  purchased: number;
  viewToFavoriteRate: number;
  favoriteToPurchaseRate: number;
  viewToPurchaseRate: number;
}

interface ActivityHeatmapPoint {
  hour: number;
  dayOfWeek: number;
  activityCount: number;
}

interface ReferralAnalytics {
  totalReferrals: number;
  activeReferrals: number;
  totalReferralRevenue: string;
  topReferrers: Array<{
    userId: string;
    name: string;
    referrals: number;
    revenue: string;
  }>;
}

interface ReferralTrend {
  date: string;
  newReferrals: number;
  revenue: string;
}

interface DetailedReferrer {
  userId: string;
  name: string;
  email: string | null;
  telegramUsername: string | null;
  totalReferrals: number;
  activeReferrals: number;
  conversionRate: number;
  totalRevenue: string;
  avgRevenuePerReferral: string;
  firstReferralDate: string | null;
}

interface RevenueMetrics {
  arpu: number;
  arppu: number;
  averageOrderValue: number;
  totalPayingUsers: number;
  revenueGrowthRate: number;
}

interface MRRDataPoint {
  month: string;
  mrr: number;
  subscribers: number;
}

interface RetentionMetrics {
  retention7Day: number;
  retention30Day: number;
  churnRate: number;
}

interface CohortData {
  cohort: string;
  totalUsers: number;
  retained: Record<string, number>;
}

interface EngagementMetrics {
  overallCompletionRate: number;
  averageCoursesPerUser: number;
  activeLearnersPercent: number;
}

interface RegistrationTrend {
  date: string;
  registrations: number;
}

interface LandingVisitStats {
  totalVisits: number;
  uniqueVisitors: number;
  conversions: number;
  conversionRate: number;
  topCountries: Array<{ country: string; count: number }>;
  topBrowsers: Array<{ browser: string; count: number }>;
  topDevices: Array<{ device: string; count: number }>;
  dailyVisits: Array<{ date: string; visits: number; conversions: number }>;
  utmCampaigns?: Array<{ campaign: string; visits: number; conversions: number; conversionRate: number }>;
}

interface MetricCardProps {
  title: string;
  value: React.ReactNode;
  description?: string;
  icon: React.ReactNode;
  tooltip: string;
  testId?: string;
  loading?: boolean;
}

function MetricCard({ title, value, description, icon, tooltip, testId, loading }: MetricCardProps) {
  return (
    <Card data-testid={testId} className="hover-elevate transition-all duration-200">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <UITooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-[300px]">
              <p className="text-xs">{tooltip}</p>
            </TooltipContent>
          </UITooltip>
        </div>
        {icon}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-8 w-24 animate-pulse bg-muted rounded" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminAnalytics() {
  // Global filters for all analytics
  const [timePeriod, setTimePeriod] = useState<number>(30);
  const [topCoursesLimit, setTopCoursesLimit] = useState<number>(10);
  
  // User table specific filters
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [activityPeriod, setActivityPeriod] = useState<string>("all");
  const USERS_PER_PAGE = 50;

  // Referral analytics specific filters
  const [referralTrendsPeriod, setReferralTrendsPeriod] = useState<number>(30);
  const [referrersSearchQuery, setReferrersSearchQuery] = useState("");
  const [referrersCurrentPage, setReferrersCurrentPage] = useState(1);
  const REFERRERS_PER_PAGE = 20;

  const { data: users, isLoading: usersLoading } = useQuery<UserAnalytics[]>({
    queryKey: ['/api/admin/analytics/users'],
  });

  // Filter and sort users
  const sortedUsers = useMemo(() => {
    if (!users) return [];
    
    let filtered = [...users];
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(user => 
        user.displayName?.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.telegramUsername?.toLowerCase().includes(query)
      );
    }
    
    // Apply activity period filter
    if (activityPeriod !== "all") {
      const now = new Date();
      filtered = filtered.filter(user => {
        if (!user.lastActivityAt) return activityPeriod === "inactive";
        
        const lastActivity = new Date(user.lastActivityAt);
        const diffMs = now.getTime() - lastActivity.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        
        switch (activityPeriod) {
          case "today":
            return diffDays < 1;
          case "7days":
            return diffDays < 7;
          case "30days":
            return diffDays < 30;
          case "inactive":
            return diffDays >= 30;
          default:
            return true;
        }
      });
    }
    
    // Sort: online first, then offline
    return filtered.sort((a, b) => {
      if (a.isOnline === b.isOnline) return 0;
      return a.isOnline ? -1 : 1;
    });
  }, [users, searchQuery, activityPeriod]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activityPeriod]);

  // Paginate users
  const totalPages = Math.ceil((sortedUsers?.length || 0) / USERS_PER_PAGE);
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * USERS_PER_PAGE;
    const endIndex = startIndex + USERS_PER_PAGE;
    return sortedUsers.slice(startIndex, endIndex);
  }, [sortedUsers, currentPage]);

  const { data: stats, isLoading: statsLoading } = useQuery<PlatformStats>({
    queryKey: ['/api/admin/analytics/stats'],
  });

  const { data: revenueData, isLoading: revenueLoading } = useQuery<RevenueDataPoint[]>({
    queryKey: ['/api/admin/analytics/revenue', timePeriod],
    queryFn: async () => {
      const response = await fetch(`/api/admin/analytics/revenue?days=${timePeriod}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch revenue data');
      return response.json();
    },
  });

  const { data: activeUsersData, isLoading: activeUsersLoading } = useQuery<ActiveUsersStats>({
    queryKey: ['/api/admin/analytics/active-users'],
  });

  const { data: topCourses, isLoading: topCoursesLoading } = useQuery<TopCourse[]>({
    queryKey: ['/api/admin/analytics/top-courses', topCoursesLimit],
    queryFn: async () => {
      const response = await fetch(`/api/admin/analytics/top-courses?limit=${topCoursesLimit}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch top courses');
      return response.json();
    },
  });

  const { data: funnelData, isLoading: funnelLoading } = useQuery<PurchaseFunnel>({
    queryKey: ['/api/admin/analytics/funnel'],
  });

  const { data: heatmapData, isLoading: heatmapLoading } = useQuery<ActivityHeatmapPoint[]>({
    queryKey: ['/api/admin/analytics/activity-heatmap'],
  });

  const { data: referralData, isLoading: referralLoading } = useQuery<ReferralAnalytics>({
    queryKey: ['/api/admin/analytics/referrals'],
  });

  const { data: referralTrendsData, isLoading: referralTrendsLoading } = useQuery<ReferralTrend[]>({
    queryKey: ['/api/admin/analytics/referral-trends', referralTrendsPeriod],
    queryFn: async () => {
      const response = await fetch(`/api/admin/analytics/referral-trends?days=${referralTrendsPeriod}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch referral trends');
      return response.json();
    },
  });

  const { data: detailedReferrers, isLoading: detailedReferrersLoading } = useQuery<DetailedReferrer[]>({
    queryKey: ['/api/admin/analytics/referrers-detailed'],
  });

  // Registration trends (NEW!)
  const [registrationPeriod, setRegistrationPeriod] = useState<number>(30);
  const { data: registrationData, isLoading: registrationLoading } = useQuery<RegistrationTrend[]>({
    queryKey: ['/api/admin/analytics/registrations', registrationPeriod],
    queryFn: async () => {
      const response = await fetch(`/api/admin/analytics/registrations?days=${registrationPeriod}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch registration trends');
      return response.json();
    },
  });

  // Revenue Metrics
  const { data: revenueMetrics, isLoading: revenueMetricsLoading } = useQuery<RevenueMetrics>({
    queryKey: ['/api/admin/analytics/revenue-metrics'],
  });

  const [mrrPeriod, setMrrPeriod] = useState<number>(12);
  const { data: mrrData, isLoading: mrrLoading } = useQuery<MRRDataPoint[]>({
    queryKey: ['/api/admin/analytics/mrr', mrrPeriod],
    queryFn: async () => {
      const response = await fetch(`/api/admin/analytics/mrr?months=${mrrPeriod}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch MRR data');
      return response.json();
    },
  });

  // Retention Metrics
  const { data: retentionMetrics, isLoading: retentionLoading } = useQuery<RetentionMetrics>({
    queryKey: ['/api/admin/analytics/retention'],
  });

  const [cohortPeriod, setCohortPeriod] = useState<number>(6);
  const { data: cohortData, isLoading: cohortLoading } = useQuery<CohortData[]>({
    queryKey: ['/api/admin/analytics/cohort', cohortPeriod],
    queryFn: async () => {
      const response = await fetch(`/api/admin/analytics/cohort?months=${cohortPeriod}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch cohort analysis');
      return response.json();
    },
  });

  // Engagement Metrics
  const { data: engagementMetrics, isLoading: engagementLoading } = useQuery<EngagementMetrics>({
    queryKey: ['/api/admin/analytics/engagement'],
  });

  // Landing Visit Stats
  const { data: landingVisitStats, isLoading: landingStatsLoading } = useQuery<LandingVisitStats>({
    queryKey: [`/api/admin/analytics/landing-visits?days=${timePeriod}`],
  });

  // Filter and paginate detailed referrers
  const filteredReferrers = useMemo(() => {
    if (!detailedReferrers) return [];
    
    if (!referrersSearchQuery.trim()) return detailedReferrers;
    
    const query = referrersSearchQuery.toLowerCase().trim();
    return detailedReferrers.filter(referrer =>
      referrer.name.toLowerCase().includes(query) ||
      referrer.email?.toLowerCase().includes(query) ||
      referrer.telegramUsername?.toLowerCase().includes(query)
    );
  }, [detailedReferrers, referrersSearchQuery]);

  // Reset page when search changes
  useEffect(() => {
    setReferrersCurrentPage(1);
  }, [referrersSearchQuery]);

  const referrersTotalPages = Math.ceil((filteredReferrers?.length || 0) / REFERRERS_PER_PAGE);
  const paginatedReferrers = useMemo(() => {
    const startIndex = (referrersCurrentPage - 1) * REFERRERS_PER_PAGE;
    const endIndex = startIndex + REFERRERS_PER_PAGE;
    return filteredReferrers.slice(startIndex, endIndex);
  }, [filteredReferrers, referrersCurrentPage]);

  const formatLastSeen = (lastActivityAt: string | null) => {
    if (!lastActivityAt) return "Никогда";
    
    const date = new Date(lastActivityAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Только что";
    if (diffMins < 60) return `${diffMins} мин назад`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} ч назад`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} д назад`;
    
    return date.toLocaleDateString('ru-RU');
  };

  const formatWatchTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} мин`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours} ч ${mins} мин`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return `${num.toLocaleString('ru-RU')} ₽`;
  };

  const getDayName = (dayOfWeek: number) => {
    const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    return days[dayOfWeek];
  };

  const getHeatmapColor = (count: number, maxCount: number) => {
    if (count === 0) return 'hsl(var(--muted))';
    const intensity = count / maxCount;
    if (intensity < 0.2) return 'hsl(var(--primary) / 0.2)';
    if (intensity < 0.4) return 'hsl(var(--primary) / 0.4)';
    if (intensity < 0.6) return 'hsl(var(--primary) / 0.6)';
    if (intensity < 0.8) return 'hsl(var(--primary) / 0.8)';
    return 'hsl(var(--primary))';
  };

  const getPeriodLabel = (days: number) => {
    if (days === 7) return '7 дней';
    if (days === 30) return '30 дней';
    if (days === 90) return '90 дней';
    if (days === 365) return '365 дней';
    return `${days} дней`;
  };

  return (
    <TooltipProvider delayDuration={200}>
      <AdminLayout breadcrumbs={[{ label: "Аналитика" }]}>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold" data-testid="title-analytics">Аналитика платформы</h1>
            <p className="text-muted-foreground">Подробная статистика пользователей, активности и выручки</p>
          </div>

        {/* Global Filters */}
        <Card data-testid="card-global-filters">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Период:</span>
                <Select value={timePeriod.toString()} onValueChange={(val) => setTimePeriod(parseInt(val))}>
                  <SelectTrigger className="w-[140px]" data-testid="select-time-period">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 дней</SelectItem>
                    <SelectItem value="30">30 дней</SelectItem>
                    <SelectItem value="90">90 дней</SelectItem>
                    <SelectItem value="365">365 дней</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Топ курсов:</span>
                <Select value={topCoursesLimit.toString()} onValueChange={(val) => setTopCoursesLimit(parseInt(val))}>
                  <SelectTrigger className="w-[100px]" data-testid="select-top-courses-limit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="ml-auto text-xs text-muted-foreground">
                Период влияет на график дохода. Лимит курсов - на топ курсов.
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dashboard Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Онлайн сейчас"
            value={<span data-testid="text-users-online">{stats?.usersOnline || 0}</span>}
            description={`из ${stats?.totalUsers || 0} пользователей`}
            icon={<Activity className="h-4 w-4 text-muted-foreground" />}
            tooltip="Количество пользователей, активных в последние 5 минут. Пользователь считается онлайн если выполнил любое действие (просмотр курса, видео, навигация) за последние 5 минут."
            testId="card-users-online"
            loading={statsLoading}
          />

          <MetricCard
            title="Всего пользователей"
            value={<span data-testid="text-total-users">{stats?.totalUsers || 0}</span>}
            icon={<Users className="h-4 w-4 text-muted-foreground" />}
            tooltip="Общее количество зарегистрированных пользователей на платформе за все время. Включает всех пользователей независимо от активности."
            testId="card-total-users"
            loading={statsLoading}
          />

          <MetricCard
            title="Общая выручка"
            value={<span data-testid="text-total-revenue">{(stats?.totalRevenue || 0).toLocaleString('ru-RU')} ₽</span>}
            icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
            tooltip="Суммарная выручка от всех покупок курсов и VIP-пакетов за все время работы платформы. Рассчитывается как сумма всех успешных транзакций."
            testId="card-total-revenue"
            loading={statsLoading}
          />

          <MetricCard
            title="Всего просмотрено"
            value={<span data-testid="text-total-watch-time">{formatWatchTime(stats?.totalWatchTimeMinutes || 0)}</span>}
            description={`${(stats?.totalWatchTimeMinutes || 0).toLocaleString('ru-RU')} минут`}
            icon={<Video className="h-4 w-4 text-muted-foreground" />}
            tooltip="Общее время просмотра видеоуроков всеми пользователями. Учитывается фактическое время воспроизведения видео. Полезно для оценки вовлеченности аудитории."
            testId="card-total-watch-time"
            loading={statsLoading}
          />
        </div>

        {/* Security & Engagement Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Подключен 2FA"
            value={<span data-testid="text-users-with-telegram">{stats?.usersWithTelegram || 0}</span>}
            description={`${stats?.totalUsers ? Math.round((stats.usersWithTelegram / stats.totalUsers) * 100) : 0}% от всех пользователей`}
            icon={<UserCheck className="h-4 w-4 text-muted-foreground" />}
            tooltip="Количество пользователей, подключивших Telegram для двухфакторной аутентификации (2FA). 2FA повышает безопасность аккаунтов и позволяет получать уведомления."
            testId="card-users-with-telegram"
            loading={statsLoading}
          />
        </div>

        {/* Revenue Chart */}
        <Card data-testid="card-revenue-chart">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>Доход по дням</CardTitle>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-[300px]">
                  <p className="text-xs">График показывает ежедневную выручку от покупок курсов. Помогает отслеживать тренды продаж и сезонность. Фильтр периода влияет только на этот график.</p>
                </TooltipContent>
              </UITooltip>
            </div>
            <CardDescription>
              Динамика выручки за последние {getPeriodLabel(timePeriod)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {revenueLoading ? (
              <div className="h-80 animate-pulse bg-muted rounded" />
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={revenueData?.map(d => ({
                  ...d,
                  revenueNum: parseFloat(d.revenue),
                  dateFormatted: formatDate(d.date),
                }))}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="dateFormatted" 
                    className="text-xs"
                    data-testid="chart-revenue-xaxis"
                  />
                  <YAxis 
                    className="text-xs"
                    tickFormatter={(value) => `${value.toLocaleString('ru-RU')} ₽`}
                    data-testid="chart-revenue-yaxis"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                    labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
                    formatter={(value: number) => [`${value.toLocaleString('ru-RU')} ₽`, 'Доход']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenueNum" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                    data-testid="line-revenue"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Registrations Chart - NEW! */}
        <Card data-testid="card-registrations-chart">
          <CardHeader>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle>Регистрации пользователей</CardTitle>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-[300px]">
                      <p className="text-xs">График показывает динамику регистраций новых пользователей. Помогает отслеживать рост пользовательской базы и эффективность маркетинга.</p>
                    </TooltipContent>
                  </UITooltip>
                </div>
                <CardDescription>
                  Тренд регистраций за последние {getPeriodLabel(registrationPeriod)}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Период:</span>
                <Select 
                  value={registrationPeriod.toString()} 
                  onValueChange={(val) => setRegistrationPeriod(parseInt(val))}
                >
                  <SelectTrigger className="w-[120px]" data-testid="select-registration-period">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 дней</SelectItem>
                    <SelectItem value="30">30 дней</SelectItem>
                    <SelectItem value="90">90 дней</SelectItem>
                    <SelectItem value="180">180 дней</SelectItem>
                    <SelectItem value="365">365 дней</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {registrationLoading ? (
              <div className="h-80 animate-pulse bg-muted rounded" />
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={registrationData?.map(d => ({
                  ...d,
                  dateFormatted: formatDate(d.date),
                }))}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="dateFormatted" 
                    className="text-xs"
                    data-testid="chart-registrations-xaxis"
                  />
                  <YAxis 
                    className="text-xs"
                    data-testid="chart-registrations-yaxis"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                    labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
                    formatter={(value: number) => [value, 'Регистрации']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="registrations" 
                    stroke="hsl(var(--chart-2))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--chart-2))' }}
                    data-testid="line-registrations"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Revenue Analytics Section - NEW! */}
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold" data-testid="title-monetization">Монетизация</h2>
            <p className="text-muted-foreground">Детальная аналитика выручки и платежей</p>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard
              title="ARPU"
              value={<span data-testid="text-arpu">{formatCurrency(revenueMetrics?.arpu || 0)}</span>}
              description="Средний доход на пользователя"
              icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
              tooltip="Average Revenue Per User - средний доход на одного пользователя платформы. Рассчитывается как общая выручка / всего пользователей. Ключевая метрика монетизации."
              testId="card-arpu"
              loading={revenueMetricsLoading}
            />

            <MetricCard
              title="ARPPU"
              value={<span data-testid="text-arppu">{formatCurrency(revenueMetrics?.arppu || 0)}</span>}
              description="Средний доход на платящего"
              icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
              tooltip="Average Revenue Per Paying User - средний доход на одного платящего пользователя. Рассчитывается как общая выручка / количество платящих пользователей."
              testId="card-arppu"
              loading={revenueMetricsLoading}
            />

            <MetricCard
              title="Средний чек"
              value={<span data-testid="text-avg-order">{formatCurrency(revenueMetrics?.averageOrderValue || 0)}</span>}
              description={`${revenueMetrics?.totalPayingUsers || 0} платящих`}
              icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
              tooltip="Средняя стоимость одной покупки. Рассчитывается как общая выручка / количество покупок. Помогает оптимизировать ценообразование."
              testId="card-avg-order"
              loading={revenueMetricsLoading}
            />

            <MetricCard
              title="Рост выручки"
              value={
                <span 
                  data-testid="text-revenue-growth"
                  className={
                    (revenueMetrics?.revenueGrowthRate || 0) >= 0 
                      ? "text-green-600 dark:text-green-400" 
                      : "text-red-600 dark:text-red-400"
                  }
                >
                  {(revenueMetrics?.revenueGrowthRate || 0) >= 0 ? '+' : ''}
                  {revenueMetrics?.revenueGrowthRate.toFixed(1)}%
                </span>
              }
              description="За последние 30 дней"
              icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
              tooltip="Процентный рост выручки за последние 30 дней по сравнению с предыдущими 30 днями. Положительное значение - рост, отрицательное - снижение."
              testId="card-revenue-growth"
              loading={revenueMetricsLoading}
            />
          </div>
        </div>

        {/* Retention & Engagement Analytics - NEW! */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card data-testid="card-retention-metrics">
            <CardHeader>
              <CardTitle>Удержание пользователей</CardTitle>
              <CardDescription>Retention Rate и Churn Rate</CardDescription>
            </CardHeader>
            <CardContent>
              {retentionLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 animate-pulse bg-muted rounded" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-muted-foreground">7-Day Retention</span>
                      <UITooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[300px]">
                          <p className="text-xs">Процент пользователей, зарегистрированных 7-14 дней назад, которые были активны в последние 7 дней.</p>
                        </TooltipContent>
                      </UITooltip>
                    </div>
                    <span className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-retention-7day">
                      {retentionMetrics?.retention7Day.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-muted-foreground">30-Day Retention</span>
                      <UITooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[300px]">
                          <p className="text-xs">Процент пользователей, зарегистрированных 30-60 дней назад, которые были активны в последние 30 дней.</p>
                        </TooltipContent>
                      </UITooltip>
                    </div>
                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400" data-testid="text-retention-30day">
                      {retentionMetrics?.retention30Day.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-muted-foreground">Churn Rate</span>
                      <UITooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[300px]">
                          <p className="text-xs">Процент пользователей, неактивных 30+ дней. Чем ниже - тем лучше удержание.</p>
                        </TooltipContent>
                      </UITooltip>
                    </div>
                    <span className="text-2xl font-bold text-orange-600 dark:text-orange-400" data-testid="text-churn-rate">
                      {retentionMetrics?.churnRate.toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-engagement-metrics">
            <CardHeader>
              <CardTitle>Вовлеченность</CardTitle>
              <CardDescription>Метрики активности студентов</CardDescription>
            </CardHeader>
            <CardContent>
              {engagementLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 animate-pulse bg-muted rounded" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-muted-foreground">Завершение курсов</span>
                      <UITooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[300px]">
                          <p className="text-xs">Общий процент завершенных уроков по всем курсам. Показатель качества контента и удержания учащихся.</p>
                        </TooltipContent>
                      </UITooltip>
                    </div>
                    <span className="text-2xl font-bold text-primary" data-testid="text-overall-completion">
                      {engagementMetrics?.overallCompletionRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-muted-foreground">Курсов на пользователя</span>
                      <UITooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[300px]">
                          <p className="text-xs">Среднее количество купленных курсов на одного платящего пользователя.</p>
                        </TooltipContent>
                      </UITooltip>
                    </div>
                    <span className="text-2xl font-bold" data-testid="text-avg-courses">
                      {engagementMetrics?.averageCoursesPerUser.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-muted-foreground">Активные студенты</span>
                      <UITooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[300px]">
                          <p className="text-xs">Процент пользователей, учившихся в последние 30 дней (имеют прогресс по урокам).</p>
                        </TooltipContent>
                      </UITooltip>
                    </div>
                    <span className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-active-learners">
                      {engagementMetrics?.activeLearnersPercent.toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Active Users Chart */}
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard
              title="DAU (Daily Active Users)"
              value={<span data-testid="text-dau">{activeUsersData?.dau || 0}</span>}
              description="активных за сутки"
              icon={<Users className="h-4 w-4 text-muted-foreground" />}
              tooltip="Количество уникальных пользователей, активных за последние 24 часа. Ключевая метрика ежедневной вовлеченности пользователей."
              testId="card-dau"
              loading={activeUsersLoading}
            />

            <MetricCard
              title="WAU (Weekly Active Users)"
              value={<span data-testid="text-wau">{activeUsersData?.wau || 0}</span>}
              description="активных за неделю"
              icon={<UserCheck className="h-4 w-4 text-muted-foreground" />}
              tooltip="Количество уникальных пользователей, активных за последние 7 дней. Показатель еженедельной вовлеченности."
              testId="card-wau"
              loading={activeUsersLoading}
            />

            <MetricCard
              title="MAU (Monthly Active Users)"
              value={<span data-testid="text-mau">{activeUsersData?.mau || 0}</span>}
              description="активных за месяц"
              icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
              tooltip="Количество уникальных пользователей, активных за последние 30 дней. Показатель месячной аудитории и ретеншна."
              testId="card-mau"
              loading={activeUsersLoading}
            />
          </div>

          <Card data-testid="card-active-users-chart">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>Активные пользователи</CardTitle>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-[300px]">
                    <p className="text-xs">График показывает количество уникальных активных пользователей по дням за последние 30 дней. Позволяет отслеживать динамику вовлеченности.</p>
                  </TooltipContent>
                </UITooltip>
              </div>
              <CardDescription>
                Динамика активных пользователей по дням
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeUsersLoading ? (
                <div className="h-80 animate-pulse bg-muted rounded" />
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={activeUsersData?.dailyData?.map(d => ({
                    ...d,
                    dateFormatted: formatDate(d.date),
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="dateFormatted" 
                      className="text-xs"
                      data-testid="chart-active-users-xaxis"
                    />
                    <YAxis 
                      className="text-xs"
                      data-testid="chart-active-users-yaxis"
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                      }}
                      labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
                      formatter={(value: number) => [value, 'Активные пользователи']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="activeUsers" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))' }}
                      data-testid="line-active-users"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Courses Table */}
        <Card data-testid="card-top-courses">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>Топ-{topCoursesLimit} курсов</CardTitle>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-[300px]">
                  <p className="text-xs">Топ курсов с детальной статистикой: просмотры (открытия страницы курса), покупки, выручка, конверсия (% от просмотров к покупкам), завершение (% завершенных уроков), среднее время просмотра видео.</p>
                </TooltipContent>
              </UITooltip>
            </div>
            <CardDescription>
              Самые популярные курсы по метрикам за все время
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topCoursesLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 animate-pulse bg-muted rounded" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <div className="flex items-center gap-1">
                          Название
                          <UITooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[300px]">
                              <p className="text-xs">Название курса. Клик открывает страницу редактирования курса.</p>
                            </TooltipContent>
                          </UITooltip>
                        </div>
                      </TableHead>
                      <TableHead className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          Просмотры
                          <UITooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[300px]">
                              <p className="text-xs">Общее количество просмотров страницы курса за все время. Включает как зарегистрированных, так и анонимных пользователей.</p>
                            </TooltipContent>
                          </UITooltip>
                        </div>
                      </TableHead>
                      <TableHead className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          Покупки
                          <UITooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[300px]">
                              <p className="text-xs">Количество уникальных покупок этого курса. Каждый пользователь учитывается только один раз, независимо от количества покупок.</p>
                            </TooltipContent>
                          </UITooltip>
                        </div>
                      </TableHead>
                      <TableHead className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          Доход
                          <UITooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[300px]">
                              <p className="text-xs">Суммарная выручка от всех продаж этого курса за все время работы платформы. Рассчитывается как сумма всех успешных транзакций по курсу.</p>
                            </TooltipContent>
                          </UITooltip>
                        </div>
                      </TableHead>
                      <TableHead className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          Конверсия
                          <UITooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[300px]">
                              <p className="text-xs">Процент пользователей, купивших курс после просмотра страницы курса. Рассчитывается как (покупки / просмотры × 100%). Высокая конверсия (&gt;5%) указывает на привлекательность курса.</p>
                            </TooltipContent>
                          </UITooltip>
                        </div>
                      </TableHead>
                      <TableHead className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          Завершение
                          <UITooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[300px]">
                              <p className="text-xs">Процент уроков, отмеченных как завершенные всеми студентами курса. Рассчитывается по всем записям прогресса. Показатель качества и удержания учащихся.</p>
                            </TooltipContent>
                          </UITooltip>
                        </div>
                      </TableHead>
                      <TableHead className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          Ср. время
                          <UITooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[300px]">
                              <p className="text-xs">Среднее время просмотра видеоуроков курса. Взвешенное среднее по всем записям прогресса (сумма просмотренных секунд / количество записей). Показатель вовлеченности студентов.</p>
                            </TooltipContent>
                          </UITooltip>
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topCourses?.map((course) => (
                      <TableRow key={course.id} data-testid={`row-course-${course.id}`}>
                        <TableCell className="font-medium" data-testid={`text-course-title-${course.id}`}>
                          {course.title}
                        </TableCell>
                        <TableCell className="text-right" data-testid={`text-course-views-${course.id}`}>
                          {course.views.toLocaleString('ru-RU')}
                        </TableCell>
                        <TableCell className="text-right" data-testid={`text-course-purchases-${course.id}`}>
                          {course.purchases.toLocaleString('ru-RU')}
                        </TableCell>
                        <TableCell className="text-right" data-testid={`text-course-revenue-${course.id}`}>
                          {formatCurrency(course.revenue)}
                        </TableCell>
                        <TableCell className="text-right" data-testid={`text-course-conversion-${course.id}`}>
                          {course.conversionRate.toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-right" data-testid={`text-course-completion-${course.id}`}>
                          {course.completionRate.toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground" data-testid={`text-course-watch-time-${course.id}`}>
                          {Math.round(course.avgWatchTime)} мин
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            
            {!topCoursesLoading && (!topCourses || topCourses.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                Данных пока нет
              </div>
            )}
          </CardContent>
        </Card>

        {/* Purchase Funnel + Referral Analytics */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <Card data-testid="card-purchase-funnel">
              <CardHeader>
                <CardTitle>Воронка покупок</CardTitle>
                <CardDescription>
                  Путь пользователя от просмотра до покупки
                </CardDescription>
              </CardHeader>
              <CardContent>
                {funnelLoading ? (
                  <div className="h-96 animate-pulse bg-muted rounded" />
                ) : (
                  <div className="space-y-4">
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart
                        data={[
                          { stage: 'Всего пользователей', count: funnelData?.totalUsers || 0, rate: 100, tooltip: 'Общее количество зарегистрированных пользователей' },
                          { stage: 'Просмотрели курсы', count: funnelData?.viewedCourses || 0, rate: funnelData?.viewToFavoriteRate ? (funnelData.viewToFavoriteRate * 100) : 0, tooltip: 'Пользователи, открывшие хотя бы одну страницу курса' },
                          { stage: 'Добавили в избранное', count: funnelData?.addedToFavorites || 0, rate: funnelData?.favoriteToPurchaseRate ? (funnelData.favoriteToPurchaseRate * 100) : 0, tooltip: 'Пользователи, сохранившие курс в избранное' },
                          { stage: 'Купили', count: funnelData?.purchased || 0, rate: funnelData?.viewToPurchaseRate ? (funnelData.viewToPurchaseRate * 100) : 0, tooltip: 'Пользователи, совершившие покупку курса' },
                        ]}
                        layout="vertical"
                        margin={{ left: 120 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" className="text-xs" data-testid="chart-funnel-xaxis" />
                        <YAxis type="category" dataKey="stage" className="text-xs" width={110} data-testid="chart-funnel-yaxis" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--popover))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '6px',
                          }}
                          labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
                          formatter={(value: number, name: string, props: any) => {
                            const rate = props.payload.rate;
                            return [`${value.toLocaleString('ru-RU')} (${rate.toFixed(1)}%)`, 'Пользователи'];
                          }}
                        />
                        <Bar 
                          dataKey="count" 
                          fill="hsl(var(--primary))" 
                          radius={[0, 4, 4, 0]}
                          data-testid="bar-funnel"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                    
                    <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                      <div>
                        <div className="flex items-center gap-1">
                          <p className="text-xs text-muted-foreground">Просмотр → Избранное</p>
                          <UITooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[300px]">
                              <p className="text-xs">Процент пользователей, добавивших курс в избранное после просмотра. Рассчитывается как (добавили в избранное / просмотрели курсы × 100%).</p>
                            </TooltipContent>
                          </UITooltip>
                        </div>
                        <p className="text-lg font-bold" data-testid="text-funnel-view-to-favorite">
                          {((funnelData?.viewToFavoriteRate || 0) * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          <p className="text-xs text-muted-foreground">Избранное → Покупка</p>
                          <UITooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[300px]">
                              <p className="text-xs">Процент пользователей, купивших курс после добавления в избранное. Рассчитывается как (купили / добавили в избранное × 100%).</p>
                            </TooltipContent>
                          </UITooltip>
                        </div>
                        <p className="text-lg font-bold" data-testid="text-funnel-favorite-to-purchase">
                          {((funnelData?.favoriteToPurchaseRate || 0) * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          <p className="text-xs text-muted-foreground">Общая конверсия</p>
                          <UITooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[300px]">
                              <p className="text-xs">Общий процент конверсии от просмотра до покупки. Рассчитывается как (купили / просмотрели курсы × 100%).</p>
                            </TooltipContent>
                          </UITooltip>
                        </div>
                        <p className="text-lg font-bold" data-testid="text-funnel-total-conversion">
                          {((funnelData?.viewToPurchaseRate || 0) * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            <Card data-testid="card-referral-analytics">
              <CardHeader>
                <CardTitle>Реферальная программа</CardTitle>
                <CardDescription>
                  Статистика привлечения пользователей
                </CardDescription>
              </CardHeader>
              <CardContent>
                {referralLoading ? (
                  <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-12 animate-pulse bg-muted rounded" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-muted-foreground">Всего рефералов</span>
                          <UITooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[300px]">
                              <p className="text-xs">Общее количество приглашенных пользователей (зарегистрировавшихся по реферальной ссылке)</p>
                            </TooltipContent>
                          </UITooltip>
                        </div>
                        <span className="text-lg font-bold" data-testid="text-referral-total">
                          {referralData?.totalReferrals || 0}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-muted-foreground">Активных</span>
                          <UITooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[300px]">
                              <p className="text-xs">Рефералы, совершившие хотя бы одну покупку</p>
                            </TooltipContent>
                          </UITooltip>
                        </div>
                        <span className="text-lg font-bold" data-testid="text-referral-active">
                          {referralData?.activeReferrals || 0}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pb-3 border-b">
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-muted-foreground">Общий доход</span>
                          <UITooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[300px]">
                              <p className="text-xs">Суммарная выручка от покупок приглашенных пользователей</p>
                            </TooltipContent>
                          </UITooltip>
                        </div>
                        <span className="text-lg font-bold text-primary" data-testid="text-referral-revenue">
                          {formatCurrency(referralData?.totalReferralRevenue || '0')}
                        </span>
                      </div>
                    </div>

                    {referralData?.topReferrers && referralData.topReferrers.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                          <Gift className="h-4 w-4" />
                          Топ-5 реферреров
                        </h4>
                        <div className="space-y-2">
                          {referralData.topReferrers.slice(0, 5).map((referrer, index) => (
                            <div 
                              key={referrer.userId} 
                              className="flex items-center justify-between text-sm"
                              data-testid={`row-referrer-${referrer.userId}`}
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <Badge variant="secondary" className="shrink-0">
                                  {index + 1}
                                </Badge>
                                <span className="truncate" data-testid={`text-referrer-name-${referrer.userId}`}>
                                  {referrer.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <span className="text-xs text-muted-foreground" data-testid={`text-referrer-count-${referrer.userId}`}>
                                  {referrer.referrals}
                                </span>
                                <span className="text-xs font-medium" data-testid={`text-referrer-revenue-${referrer.userId}`}>
                                  {formatCurrency(referrer.revenue)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Activity Heatmap */}
        <Card data-testid="card-activity-heatmap">
          <CardHeader>
            <CardTitle>Тепловая карта активности</CardTitle>
            <CardDescription>
              Активность пользователей по дням недели и времени суток
            </CardDescription>
          </CardHeader>
          <CardContent>
            {heatmapLoading ? (
              <div className="h-96 animate-pulse bg-muted rounded" />
            ) : (
              <div className="overflow-x-auto">
                <div className="inline-block min-w-full">
                  {(() => {
                    const maxCount = Math.max(...(heatmapData?.map(d => d.activityCount) || [1]));
                    const heatmapMatrix: { [key: string]: number } = {};
                    heatmapData?.forEach(point => {
                      heatmapMatrix[`${point.dayOfWeek}-${point.hour}`] = point.activityCount;
                    });

                    return (
                      <div className="space-y-1">
                        <div className="flex gap-1 mb-2">
                          <div className="w-12"></div>
                          {Array.from({ length: 24 }, (_, hour) => (
                            <div 
                              key={hour} 
                              className="flex-1 text-xs text-center text-muted-foreground min-w-[2rem]"
                            >
                              {hour}
                            </div>
                          ))}
                        </div>
                        {[0, 1, 2, 3, 4, 5, 6].map(day => (
                          <div key={day} className="flex gap-1" data-testid={`heatmap-row-${day}`}>
                            <div className="w-12 text-xs flex items-center text-muted-foreground">
                              {getDayName(day)}
                            </div>
                            {Array.from({ length: 24 }, (_, hour) => {
                              const count = heatmapMatrix[`${day}-${hour}`] || 0;
                              return (
                                <div
                                  key={hour}
                                  className="flex-1 min-w-[2rem] h-8 rounded-sm transition-colors"
                                  style={{ backgroundColor: getHeatmapColor(count, maxCount) }}
                                  title={`${getDayName(day)} ${hour}:00 - ${count} активностей`}
                                  data-testid={`heatmap-cell-${day}-${hour}`}
                                />
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
                <div className="flex items-center gap-4 mt-4 pt-4 border-t">
                  <span className="text-xs text-muted-foreground">Активность:</span>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: 'hsl(var(--muted))' }} />
                    <span className="text-xs text-muted-foreground">Нет</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: 'hsl(var(--primary) / 0.4)' }} />
                    <span className="text-xs text-muted-foreground">Средняя</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: 'hsl(var(--primary))' }} />
                    <span className="text-xs text-muted-foreground">Высокая</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card data-testid="card-users-table">
          <CardHeader>
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle>Пользователи</CardTitle>
                  <CardDescription>
                    Детальная информация о пользователях и их активности. Активные пользователи отображаются вверху.
                  </CardDescription>
                </div>
              </div>
              
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Поиск по имени, email, Telegram..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-users"
                  />
                </div>
                
                <Select value={activityPeriod} onValueChange={setActivityPeriod}>
                  <SelectTrigger className="w-[200px]" data-testid="select-activity-period">
                    <SelectValue placeholder="Все пользователи" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все пользователи</SelectItem>
                    <SelectItem value="today">Активны сегодня</SelectItem>
                    <SelectItem value="7days">Активны за 7 дней</SelectItem>
                    <SelectItem value="30days">Активны за 30 дней</SelectItem>
                    <SelectItem value="inactive">Неактивны 30+ дней</SelectItem>
                  </SelectContent>
                </Select>
                
                {!usersLoading && sortedUsers && sortedUsers.length > USERS_PER_PAGE && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      Страница {currentPage} из {totalPages} ({sortedUsers.length} всего)
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        data-testid="button-prev-page"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        data-testid="button-next-page"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 animate-pulse bg-muted rounded" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Пользователь</TableHead>
                      <TableHead>Telegram</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Последняя активность</TableHead>
                      <TableHead className="text-right">Баланс</TableHead>
                      <TableHead className="text-right">Курсов куплено</TableHead>
                      <TableHead className="text-right">Сумма покупок</TableHead>
                      <TableHead className="text-right">Время просмотра</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedUsers?.map((user) => (
                      <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.profileImage || undefined} />
                              <AvatarFallback>
                                {user.displayName?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-medium" data-testid={`text-username-${user.id}`}>
                                {user.displayName || user.email}
                              </span>
                              {user.displayName && (
                                <span className="text-xs text-muted-foreground">
                                  {user.email}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell data-testid={`text-telegram-${user.id}`}>
                          {user.telegramUsername ? (
                            <a 
                              href={`https://t.me/${user.telegramUsername.replace('@', '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline flex items-center gap-1"
                            >
                              {user.telegramUsername.startsWith('@') ? user.telegramUsername : `@${user.telegramUsername}`}
                            </a>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={user.isOnline ? "default" : "secondary"}
                            data-testid={`badge-status-${user.id}`}
                          >
                            {user.isOnline ? (
                              <span className="flex items-center gap-1">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                                </span>
                                Онлайн
                              </span>
                            ) : (
                              "Оффлайн"
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground" data-testid={`text-last-seen-${user.id}`}>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatLastSeen(user.lastActivityAt)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right" data-testid={`text-balance-${user.id}`}>
                          {user.balance.toLocaleString('ru-RU')} ₽
                        </TableCell>
                        <TableCell className="text-right" data-testid={`text-courses-${user.id}`}>
                          <div className="flex items-center justify-end gap-1">
                            <BookOpen className="h-3 w-3 text-muted-foreground" />
                            {user.coursesPurchased}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium" data-testid={`text-purchase-amount-${user.id}`}>
                          <div className="flex items-center justify-end gap-1">
                            <DollarSign className="h-3 w-3 text-muted-foreground" />
                            {formatCurrency(user.totalPurchaseAmount)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground" data-testid={`text-watch-time-${user.id}`}>
                          {formatWatchTime(user.videoWatchMinutes)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            
            {!usersLoading && (!sortedUsers || sortedUsers.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                Пользователей не найдено
              </div>
            )}
          </CardContent>
        </Card>

        {/* Landing Visitor Tracking Section */}
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold" data-testid="title-landing-tracking">Отслеживание посетителей и конверсия регистрации</h2>
            <p className="text-muted-foreground">Аналитика посещений целевой страницы и регистраций</p>
          </div>

          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard
              title="Всего посещений"
              value={<span data-testid="text-total-visits">{(landingVisitStats?.totalVisits || 0).toLocaleString('ru-RU')}</span>}
              icon={<Activity className="h-4 w-4 text-muted-foreground" />}
              tooltip="Общее количество посещений целевой страницы за выбранный период. Каждый переход на страницу регистрации считается как одно посещение, включая повторные посещения одного пользователя."
              testId="card-total-visits"
              loading={landingStatsLoading}
            />

            <MetricCard
              title="Уникальные посетители"
              value={<span data-testid="text-unique-visitors">{(landingVisitStats?.uniqueVisitors || 0).toLocaleString('ru-RU')}</span>}
              icon={<Users className="h-4 w-4 text-muted-foreground" />}
              tooltip="Количество уникальных пользователей, посетивших целевую страницу. Определяется по IP-адресу и User Agent браузера, исключая повторные посещения."
              testId="card-unique-visitors"
              loading={landingStatsLoading}
            />

            <MetricCard
              title="Конверсии"
              value={<span data-testid="text-conversions">{(landingVisitStats?.conversions || 0).toLocaleString('ru-RU')}</span>}
              description="завершенных регистраций"
              icon={<UserCheck className="h-4 w-4 text-muted-foreground" />}
              tooltip="Количество успешных регистраций новых пользователей, которые перешли с целевой страницы и завершили процесс создания аккаунта."
              testId="card-conversions"
              loading={landingStatsLoading}
            />

            <MetricCard
              title="Коэффициент конверсии"
              value={
                <span 
                  data-testid="text-conversion-rate"
                  className={
                    (landingVisitStats?.conversionRate || 0) >= 5 
                      ? "text-green-600 dark:text-green-400" 
                      : (landingVisitStats?.conversionRate || 0) >= 2
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-orange-600 dark:text-orange-400"
                  }
                >
                  {(landingVisitStats?.conversionRate || 0).toFixed(2)}%
                </span>
              }
              description="посетителей регистрируются"
              icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
              tooltip="Процент посетителей целевой страницы, которые завершили регистрацию. Рассчитывается как (Конверсии / Всего посещений) × 100. Высокое значение (>5%) указывает на эффективную целевую страницу."
              testId="card-conversion-rate"
              loading={landingStatsLoading}
            />
          </div>

          {/* Daily Visits and Conversions Chart */}
          <Card data-testid="card-landing-daily-chart">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>Посещения и конверсии по дням</CardTitle>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-[300px]">
                    <p className="text-xs">График показывает ежедневное количество посещений целевой страницы и успешных регистраций. Помогает отследить эффективность маркетинговых кампаний и найти пики активности.</p>
                  </TooltipContent>
                </UITooltip>
              </div>
              <CardDescription>
                Динамика за последние {getPeriodLabel(timePeriod)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {landingStatsLoading ? (
                <div className="h-80 animate-pulse bg-muted rounded" />
              ) : landingVisitStats && landingVisitStats.dailyVisits && landingVisitStats.dailyVisits.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={landingVisitStats.dailyVisits.map(d => ({
                    ...d,
                    dateFormatted: formatDate(d.date),
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="dateFormatted" 
                      className="text-xs"
                      data-testid="chart-landing-daily-xaxis"
                    />
                    <YAxis 
                      className="text-xs"
                      data-testid="chart-landing-daily-yaxis"
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                      }}
                      labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
                    />
                    <Bar 
                      dataKey="visits" 
                      fill="hsl(var(--primary))" 
                      name="Посещения"
                      data-testid="bar-visits"
                    />
                    <Bar 
                      dataKey="conversions" 
                      fill="hsl(var(--chart-2))" 
                      name="Конверсии"
                      data-testid="bar-conversions"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  Нет данных за выбранный период
                </div>
              )}
            </CardContent>
          </Card>

          {/* Demographics Tables */}
          <div className="grid gap-4 md:grid-cols-3">
            {/* Top Countries */}
            <Card data-testid="card-top-countries">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">Топ страны</CardTitle>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-[300px]">
                      <p className="text-xs">Географическое распределение посетителей по странам. Определяется по IP-адресу посетителя.</p>
                    </TooltipContent>
                  </UITooltip>
                </div>
                <CardDescription>По количеству посещений</CardDescription>
              </CardHeader>
              <CardContent>
                {landingStatsLoading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-8 animate-pulse bg-muted rounded" />
                    ))}
                  </div>
                ) : landingVisitStats && landingVisitStats.topCountries && landingVisitStats.topCountries.length > 0 ? (
                  <div className="space-y-2">
                    {landingVisitStats.topCountries.slice(0, 5).map((item, index) => (
                      <div 
                        key={item.country} 
                        className="flex items-center justify-between"
                        data-testid={`row-country-${index}`}
                      >
                        <span className="text-sm font-medium" data-testid={`text-country-${index}`}>
                          {item.country}
                        </span>
                        <Badge variant="secondary" data-testid={`badge-country-visits-${index}`}>
                          {item.count.toLocaleString('ru-RU')}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    Нет данных
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Browsers */}
            <Card data-testid="card-top-browsers">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">Топ браузеры</CardTitle>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-[300px]">
                      <p className="text-xs">Распределение посетителей по используемым браузерам. Помогает оптимизировать совместимость сайта.</p>
                    </TooltipContent>
                  </UITooltip>
                </div>
                <CardDescription>По количеству посещений</CardDescription>
              </CardHeader>
              <CardContent>
                {landingStatsLoading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-8 animate-pulse bg-muted rounded" />
                    ))}
                  </div>
                ) : landingVisitStats && landingVisitStats.topBrowsers && landingVisitStats.topBrowsers.length > 0 ? (
                  <div className="space-y-2">
                    {landingVisitStats.topBrowsers.slice(0, 5).map((item, index) => (
                      <div 
                        key={item.browser} 
                        className="flex items-center justify-between"
                        data-testid={`row-browser-${index}`}
                      >
                        <span className="text-sm font-medium" data-testid={`text-browser-${index}`}>
                          {item.browser}
                        </span>
                        <Badge variant="secondary" data-testid={`badge-browser-visits-${index}`}>
                          {item.count.toLocaleString('ru-RU')}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    Нет данных
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Devices */}
            <Card data-testid="card-top-devices">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">Топ устройства</CardTitle>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-[300px]">
                      <p className="text-xs">Распределение посетителей по типу устройства (Мобильное, Десктоп, Планшет). Помогает понять предпочтения аудитории.</p>
                    </TooltipContent>
                  </UITooltip>
                </div>
                <CardDescription>По количеству посещений</CardDescription>
              </CardHeader>
              <CardContent>
                {landingStatsLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-8 animate-pulse bg-muted rounded" />
                    ))}
                  </div>
                ) : landingVisitStats && landingVisitStats.topDevices && landingVisitStats.topDevices.length > 0 ? (
                  <div className="space-y-2">
                    {landingVisitStats.topDevices.map((item, index) => (
                      <div 
                        key={item.device} 
                        className="flex items-center justify-between"
                        data-testid={`row-device-${index}`}
                      >
                        <span className="text-sm font-medium" data-testid={`text-device-${index}`}>
                          {item.device}
                        </span>
                        <Badge variant="secondary" data-testid={`badge-device-visits-${index}`}>
                          {item.count.toLocaleString('ru-RU')}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    Нет данных
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* UTM Campaigns Table */}
          {landingVisitStats && landingVisitStats.utmCampaigns && landingVisitStats.utmCampaigns.length > 0 && (
            <Card data-testid="card-utm-campaigns">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>UTM кампании</CardTitle>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-[300px]">
                      <p className="text-xs">Анализ эффективности маркетинговых кампаний по UTM меткам. Показывает количество посещений и конверсий для каждой кампании.</p>
                    </TooltipContent>
                  </UITooltip>
                </div>
                <CardDescription>Эффективность маркетинговых кампаний</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Кампания</TableHead>
                        <TableHead className="text-right">Посещения</TableHead>
                        <TableHead className="text-right">Конверсии</TableHead>
                        <TableHead className="text-right">Конверсия %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {landingVisitStats.utmCampaigns.map((campaign, index) => {
                        const conversionRate = campaign.visits > 0 
                          ? (campaign.conversions / campaign.visits) * 100 
                          : 0;
                        return (
                          <TableRow key={campaign.campaign} data-testid={`row-campaign-${index}`}>
                            <TableCell className="font-medium" data-testid={`text-campaign-${index}`}>
                              {campaign.campaign}
                            </TableCell>
                            <TableCell className="text-right" data-testid={`text-campaign-visits-${index}`}>
                              {campaign.visits.toLocaleString('ru-RU')}
                            </TableCell>
                            <TableCell className="text-right" data-testid={`text-campaign-conversions-${index}`}>
                              {campaign.conversions.toLocaleString('ru-RU')}
                            </TableCell>
                            <TableCell className="text-right" data-testid={`text-campaign-rate-${index}`}>
                              <span className={
                                conversionRate >= 5 
                                  ? "text-green-600 dark:text-green-400 font-medium" 
                                  : conversionRate >= 2
                                    ? "text-blue-600 dark:text-blue-400"
                                    : "text-muted-foreground"
                              }>
                                {conversionRate.toFixed(2)}%
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Extended Referral Analytics */}
        <Card data-testid="card-referral-trends">
          <CardHeader>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <CardTitle>Динамика реферальной программы</CardTitle>
                <CardDescription>
                  Новые рефералы и доход по дням
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Период:</span>
                <Select 
                  value={referralTrendsPeriod.toString()} 
                  onValueChange={(val) => setReferralTrendsPeriod(parseInt(val))}
                >
                  <SelectTrigger className="w-[120px]" data-testid="select-referral-trends-period">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 дней</SelectItem>
                    <SelectItem value="30">30 дней</SelectItem>
                    <SelectItem value="90">90 дней</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {referralTrendsLoading ? (
              <div className="h-80 animate-pulse bg-muted rounded" />
            ) : referralTrendsData && referralTrendsData.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={referralTrendsData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={formatDate}
                      className="text-xs"
                    />
                    <YAxis yAxisId="left" className="text-xs" />
                    <YAxis yAxisId="right" orientation="right" className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px'
                      }}
                      labelFormatter={(label) => formatDate(label)}
                      formatter={(value: any, name: string) => {
                        if (name === 'revenue') {
                          return [formatCurrency(value), 'Доход'];
                        }
                        return [value, 'Новые рефералы'];
                      }}
                    />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="newReferrals" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                      name="Новые рефералы"
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="hsl(var(--chart-2))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--chart-2))', r: 4 }}
                      name="Доход"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Нет данных за выбранный период
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detailed Referrers Table */}
        <Card data-testid="card-detailed-referrers">
          <CardHeader>
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle>Детальная статистика реферов</CardTitle>
                  <CardDescription>
                    Полная информация по всем рефереrам с метриками эффективности
                  </CardDescription>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Поиск по имени, email, Telegram..."
                    value={referrersSearchQuery}
                    onChange={(e) => setReferrersSearchQuery(e.target.value)}
                    className="pl-8"
                    data-testid="input-search-referrers"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {detailedReferrersLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 animate-pulse bg-muted rounded" />
                ))}
              </div>
            ) : paginatedReferrers && paginatedReferrers.length > 0 ? (
              <>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Реферер</TableHead>
                        <TableHead>Контакты</TableHead>
                        <TableHead className="text-right">Всего приглашено</TableHead>
                        <TableHead className="text-right">Активных</TableHead>
                        <TableHead className="text-right">Конверсия</TableHead>
                        <TableHead className="text-right">Общий доход</TableHead>
                        <TableHead className="text-right">Средний доход</TableHead>
                        <TableHead className="text-right">Первый реферал</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedReferrers.map((referrer) => (
                        <TableRow key={referrer.userId} data-testid={`row-referrer-detailed-${referrer.userId}`}>
                          <TableCell className="font-medium" data-testid={`text-referrer-detailed-name-${referrer.userId}`}>
                            {referrer.name || 'Без имени'}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1 text-xs">
                              {referrer.email && (
                                <span className="text-muted-foreground truncate max-w-[200px]">
                                  {referrer.email}
                                </span>
                              )}
                              {referrer.telegramUsername && (
                                <a
                                  href={`https://t.me/${referrer.telegramUsername}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline"
                                  data-testid={`link-telegram-${referrer.userId}`}
                                >
                                  @{referrer.telegramUsername}
                                </a>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right" data-testid={`text-total-referrals-${referrer.userId}`}>
                            <Badge variant="secondary">{referrer.totalReferrals}</Badge>
                          </TableCell>
                          <TableCell className="text-right" data-testid={`text-active-referrals-${referrer.userId}`}>
                            <Badge variant="default">{referrer.activeReferrals}</Badge>
                          </TableCell>
                          <TableCell className="text-right" data-testid={`text-conversion-rate-${referrer.userId}`}>
                            <span className={referrer.conversionRate >= 50 ? "text-green-600 dark:text-green-400 font-medium" : ""}>
                              {referrer.conversionRate.toFixed(1)}%
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-medium text-primary" data-testid={`text-total-revenue-${referrer.userId}`}>
                            {formatCurrency(referrer.totalRevenue)}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground" data-testid={`text-avg-revenue-${referrer.userId}`}>
                            {formatCurrency(referrer.avgRevenuePerReferral)}
                          </TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">
                            {referrer.firstReferralDate 
                              ? new Date(referrer.firstReferralDate).toLocaleDateString('ru-RU')
                              : '—'
                            }
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination for Referrers */}
                {referrersTotalPages > 1 && (
                  <div className="flex items-center justify-between pt-4">
                    <div className="text-sm text-muted-foreground">
                      Страница {referrersCurrentPage} из {referrersTotalPages} ({filteredReferrers.length} всего)
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setReferrersCurrentPage(p => Math.max(1, p - 1))}
                        disabled={referrersCurrentPage === 1}
                        data-testid="button-referrers-prev-page"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Назад
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setReferrersCurrentPage(p => Math.min(referrersTotalPages, p + 1))}
                        disabled={referrersCurrentPage === referrersTotalPages}
                        data-testid="button-referrers-next-page"
                      >
                        Вперед
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {referrersSearchQuery ? 'Рефереры не найдены' : 'Нет данных о рефереrах'}
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </AdminLayout>
    </TooltipProvider>
  );
}
