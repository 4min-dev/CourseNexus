import { lazy, Suspense } from "react";
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { AuthGuard } from "@/components/auth-guard";
import { useSEO } from "@/hooks/useSEO";

// Критичные страницы - загружаются сразу
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Register from "@/pages/register";
import ResetPassword from "@/pages/reset-password";
import Shop from "@/pages/shop";
import Library from "@/pages/library";

// Lazy-loaded страницы - загружаются по требованию
const CourseDetail = lazy(() => import("@/pages/course-detail"));
const LibraryCourse = lazy(() => import("@/pages/library-course"));
const Favorites = lazy(() => import("@/pages/favorites"));
const VipCourseSelect = lazy(() => import("@/pages/vip-course-select"));
const Bonuses = lazy(() => import("@/pages/bonuses"));
const ReferralInfo = lazy(() => import("@/pages/referral-info"));
const Profile = lazy(() => import("@/pages/profile"));
const Vip = lazy(() => import("@/pages/vip"));
const TradeIn = lazy(() => import("@/pages/trade-in"));
const PackagePurchase = lazy(() => import("@/pages/package-purchase"));
const SniperPage = lazy(() => import("@/pages/sniper"));
const NotificationsPage = lazy(() => import("@/pages/notifications"));
const Partners = lazy(() => import("@/pages/partners"));
const PartnerDetail = lazy(() => import("@/pages/partner-detail"));
const Programs = lazy(() => import("@/pages/programs"));
const ProgramDetail = lazy(() => import("@/pages/program-detail"));
const Help = lazy(() => import("@/pages/help"));
const LogoDemo = lazy(() => import("@/pages/logo-demo"));

// Admin страницы - lazy loaded
const AdminCategories = lazy(() => import("@/pages/admin-categories"));
const AdminSubcategories = lazy(() => import("@/pages/admin-subcategories"));
const AdminCourses = lazy(() => import("@/pages/admin-courses"));
const AdminAllCourses = lazy(() => import("@/pages/admin-all-courses"));
const AdminCourseEdit = lazy(() => import("@/pages/admin-course-edit"));
const AdminMenu = lazy(() => import("@/pages/admin-menu"));
const AdminSettings = lazy(() => import("@/pages/admin-settings"));
const AdminUsers = lazy(() => import("@/pages/admin-users"));
const AdminAnalytics = lazy(() => import("@/pages/admin-analytics"));
const AdminVip = lazy(() => import("@/pages/admin-vip"));
const AdminInfoBanners = lazy(() => import("@/pages/admin-info-banners"));
const AdminPackages = lazy(() => import("@/pages/admin-packages"));
const AdminLanding = lazy(() => import("@/pages/admin-landing"));
const AdminTradeIn = lazy(() => import("@/pages/admin-trade-in"));
const AdminNotifications = lazy(() => import("@/pages/admin-notifications"));
const AdminModeration = lazy(() => import("@/pages/admin-moderation"));
const AdminPartners = lazy(() => import("@/pages/admin-partners"));
const AdminPrograms = lazy(() => import("@/pages/admin-programs"));

// Loading fallback компонент
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center space-y-4">
      <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
      <p className="text-muted-foreground">Загрузка...</p>
    </div>
  </div>
);

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={isAuthenticated ? () => <Redirect to="/shop" /> : Landing} />
      <Route path="/login" component={isAuthenticated ? () => <Redirect to="/shop" /> : Login} />
      <Route path="/register" component={isAuthenticated ? () => <Redirect to="/shop" /> : Register} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/logo-demo">{() => <Suspense fallback={<PageLoader />}><LogoDemo /></Suspense>}</Route>

      {/* Protected routes with AuthGuard */}
      <Route path="/shop">
        {() => <AuthGuard><Shop /></AuthGuard>}
      </Route>
      <Route path="/course/:id">
        {() => <Suspense fallback={<PageLoader />}><AuthGuard><CourseDetail /></AuthGuard></Suspense>}
      </Route>
      <Route path="/library">
        {() => <AuthGuard><Library /></AuthGuard>}
      </Route>
      <Route path="/library/vip-select/:packageId">
        {() => <Suspense fallback={<PageLoader />}><AuthGuard><VipCourseSelect /></AuthGuard></Suspense>}
      </Route>
      <Route path="/library/:id">
        {() => <Suspense fallback={<PageLoader />}><AuthGuard><LibraryCourse /></AuthGuard></Suspense>}
      </Route>
      <Route path="/favorites">
        {() => <Suspense fallback={<PageLoader />}><AuthGuard><Favorites /></AuthGuard></Suspense>}
      </Route>
      <Route path="/bonuses">
        {() => <Suspense fallback={<PageLoader />}><AuthGuard><Bonuses /></AuthGuard></Suspense>}
      </Route>
      <Route path="/referral-info">
        {() => <Suspense fallback={<PageLoader />}><AuthGuard><ReferralInfo /></AuthGuard></Suspense>}
      </Route>
      <Route path="/profile">
        {() => <Suspense fallback={<PageLoader />}><AuthGuard><Profile /></AuthGuard></Suspense>}
      </Route>
      <Route path="/vip">
        {() => <Suspense fallback={<PageLoader />}><AuthGuard><Vip /></AuthGuard></Suspense>}
      </Route>
      <Route path="/trade-in">
        {() => <Suspense fallback={<PageLoader />}><AuthGuard><TradeIn /></AuthGuard></Suspense>}
      </Route>
      <Route path="/package/:packageId">
        {() => <Suspense fallback={<PageLoader />}><AuthGuard><PackagePurchase /></AuthGuard></Suspense>}
      </Route>
      <Route path="/sniper">
        {() => <Suspense fallback={<PageLoader />}><AuthGuard><SniperPage /></AuthGuard></Suspense>}
      </Route>
      <Route path="/notifications">
        {() => <Suspense fallback={<PageLoader />}><AuthGuard><NotificationsPage /></AuthGuard></Suspense>}
      </Route>
      <Route path="/partners/:id">
        {() => <Suspense fallback={<PageLoader />}><PartnerDetail /></Suspense>}
      </Route>
      <Route path="/partners">
        {() => <Suspense fallback={<PageLoader />}><Partners /></Suspense>}
      </Route>
      <Route path="/programs">
        {() => <Suspense fallback={<PageLoader />}><AuthGuard><Programs /></AuthGuard></Suspense>}
      </Route>
      <Route path="/program/:id">
        {() => <Suspense fallback={<PageLoader />}><AuthGuard><ProgramDetail /></AuthGuard></Suspense>}
      </Route>
      <Route path="/help">
        {() => <Suspense fallback={<PageLoader />}><AuthGuard><Help /></AuthGuard></Suspense>}
      </Route>

      {/* Admin routes with AuthGuard and Lazy Loading */}
      <Route path="/admin">
        {() => <AuthGuard><Redirect to="/admin/categories" /></AuthGuard>}
      </Route>
      <Route path="/admin/categories">
        {() => <Suspense fallback={<PageLoader />}><AuthGuard><AdminCategories /></AuthGuard></Suspense>}
      </Route>
      <Route path="/admin/categories/:categoryId/subcategories">
        {() => <Suspense fallback={<PageLoader />}><AuthGuard><AdminSubcategories /></AuthGuard></Suspense>}
      </Route>
      <Route path="/admin/categories/:categoryId/subcategories/:subcategoryId/courses">
        {() => <Suspense fallback={<PageLoader />}><AuthGuard><AdminCourses /></AuthGuard></Suspense>}
      </Route>
      <Route path="/admin/courses">
        {() => <Suspense fallback={<PageLoader />}><AuthGuard><AdminAllCourses /></AuthGuard></Suspense>}
      </Route>
      <Route path="/admin/courses/:courseId/edit">
        {() => <Suspense fallback={<PageLoader />}><AuthGuard><AdminCourseEdit /></AuthGuard></Suspense>}
      </Route>
      <Route path="/admin/users">
        {() => <Suspense fallback={<PageLoader />}><AuthGuard><AdminUsers /></AuthGuard></Suspense>}
      </Route>
      <Route path="/admin/analytics">
        {() => <Suspense fallback={<PageLoader />}><AuthGuard><AdminAnalytics /></AuthGuard></Suspense>}
      </Route>
      <Route path="/admin/menu">
        {() => <Suspense fallback={<PageLoader />}><AuthGuard><AdminMenu /></AuthGuard></Suspense>}
      </Route>
      <Route path="/admin/settings">
        {() => <Suspense fallback={<PageLoader />}><AuthGuard><AdminSettings /></AuthGuard></Suspense>}
      </Route>
      <Route path="/admin/vip">
        {() => <Suspense fallback={<PageLoader />}><AuthGuard><AdminVip /></AuthGuard></Suspense>}
      </Route>
      <Route path="/admin/info-banners">
        {() => <Suspense fallback={<PageLoader />}><AuthGuard><AdminInfoBanners /></AuthGuard></Suspense>}
      </Route>
      <Route path="/admin/packages">
        {() => <Suspense fallback={<PageLoader />}><AuthGuard><AdminPackages /></AuthGuard></Suspense>}
      </Route>
      <Route path="/admin/landing">
        {() => <Suspense fallback={<PageLoader />}><AuthGuard><AdminLanding /></AuthGuard></Suspense>}
      </Route>
      <Route path="/admin/trade-in">
        {() => <Suspense fallback={<PageLoader />}><AuthGuard><AdminTradeIn /></AuthGuard></Suspense>}
      </Route>
      <Route path="/admin/notifications">
        {() => <Suspense fallback={<PageLoader />}><AuthGuard><AdminNotifications /></AuthGuard></Suspense>}
      </Route>
      <Route path="/admin/moderation">
        {() => <Suspense fallback={<PageLoader />}><AuthGuard><AdminModeration /></AuthGuard></Suspense>}
      </Route>
      <Route path="/admin/partners">
        {() => <Suspense fallback={<PageLoader />}><AuthGuard><AdminPartners /></AuthGuard></Suspense>}
      </Route>
      <Route path="/admin/programs">
        {() => <Suspense fallback={<PageLoader />}><AuthGuard><AdminPrograms /></AuthGuard></Suspense>}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

// SEO Manager component
function SEOManager() {
  useSEO();
  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SEOManager />
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
