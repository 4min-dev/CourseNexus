import {
  users,
  courses,
  purchases,
  favorites,
  referrals,
  tasks,
  userTasks,
  balanceTransactions,
  reviews,
  reviewVotes,
  courseSections,
  lessons,
  lessonProgress,
  siteSettings,
  vipPageContent,
  vipTiers,
  categories,
  subcategories,
  menuItems,
  courseFiles,
  courseSubcategories,
  infoBanners,
  coursePackages,
  packageCourses,
  landingContent,
  tradeInPageContent,
  courseViews,
  filterClicks,
  landingVisits,
  courseRequests,
  courseRequestVotes,
  notifications,
  awards,
  userAwards,
  type User,
  type UpsertUser,
  type Course,
  type InsertCourse,
  type Purchase,
  type InsertPurchase,
  type Favorite,
  type InsertFavorite,
  type Referral,
  type InsertReferral,
  type Task,
  type InsertTask,
  type UserTask,
  type InsertUserTask,
  type BalanceTransaction,
  type InsertBalanceTransaction,
  type Review,
  type InsertReview,
  type ReviewVote,
  type InsertReviewVote,
  type CourseSection,
  type InsertCourseSection,
  type Lesson,
  type InsertLesson,
  type LessonProgress,
  type InsertLessonProgress,
  type SiteSettings,
  type InsertSiteSettings,
  type VipPageContent,
  type InsertVipPageContent,
  type VipTier,
  type InsertVipTier,
  type Category,
  type InsertCategory,
  type Subcategory,
  type InsertSubcategory,
  type MenuItem,
  type InsertMenuItem,
  type CourseFile,
  type InsertCourseFile,
  type InfoBanner,
  type InsertInfoBanner,
  type CoursePackage,
  type InsertCoursePackage,
  type PackageCourse,
  type InsertPackageCourse,
  type LandingContent,
  type InsertLandingContent,
  type TradeInPageContent,
  type InsertTradeInPageContent,
  type LandingVisit,
  type InsertLandingVisit,
  type CourseRequest,
  type InsertCourseRequest,
  type CourseRequestVote,
  type InsertCourseRequestVote,
  type Notification,
  type InsertNotification,
  type Award,
  type InsertAward,
  type UserAward,
  type InsertUserAward,
  type FilterClick,
  type InsertFilterClick,
  partners,
  type Partner,
  type InsertPartner,
  programs,
  programPurchases,
  programReviews,
  programInstructions,
  type Program,
  type InsertProgram,
  type ProgramPurchase,
  type InsertProgramPurchase,
  type ProgramReview,
  type InsertProgramReview,
  type ProgramInstruction,
  type InsertProgramInstruction,
  telegramVerificationCodes,
  type TelegramVerificationCode,
  type InsertTelegramVerificationCode,
  pendingLessonNotifications,
  type PendingLessonNotification,
  type InsertPendingLessonNotification,
  engagementNotifications,
  type EngagementNotification,
  type InsertEngagementNotification,
  schedulerRuns,
  type SchedulerRun,
  type InsertSchedulerRun,
  chatConversations,
  chatMessages,
  chatTemplates,
  chatSettings,
  type ChatConversation,
  type InsertChatConversation,
  type ChatMessage,
  type InsertChatMessage,
  type ChatTemplate,
  type InsertChatTemplate,
  type ChatSettings,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, like, or, sql, getTableColumns, isNotNull, isNull, inArray, not, gte, lt, lte, SQL, arrayOverlaps } from "drizzle-orm";
import { randomUUID } from "crypto";
import { sendNotificationToTelegram } from "./telegram";
import { deleteFromCDNNow } from "./cdnnowStorage";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByTelegramId(telegramId: string): Promise<User | undefined>;
  getUserByReferralCode(referralCode: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createUserWithPassword(data: {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    referralCode: string;
    promoCode: string;
    referralDiscount?: number;
    landingVisitId?: string;
    registrationIp?: string;
    registrationCountry?: string;
    registrationCity?: string;
    registrationBrowser?: string;
    registrationDevice?: string;
    registrationOs?: string;
    registrationUserAgent?: string;
  }): Promise<User>;
  createUserWithTelegram(data: {
    telegramId: string;
    firstName: string;
    lastName?: string;
    telegramUsername?: string;
    profileImageUrl?: string;
    referralCode: string;
    promoCode: string;
    referralDiscount?: number;
    landingVisitId?: string;
    registrationIp?: string;
    registrationCountry?: string;
    registrationCity?: string;
    registrationBrowser?: string;
    registrationDevice?: string;
    registrationOs?: string;
    registrationUserAgent?: string;
  }): Promise<User>;
  updateUserProfile(userId: string, data: { phoneNumber?: string; telegramUsername?: string }): Promise<User>;
  updateUserReferralCode(userId: string, referralCode: string): Promise<User>;
  updateUserPassword(userId: string, passwordHash: string): Promise<User>;
  updateUserFantiks(userId: string, amount: number): Promise<void>;
  updateUserActivity(userId: string): Promise<void>;

  getCourses(filters?: { platform?: string; level?: string; year?: number; minPrice?: number; maxPrice?: number; minRating?: number; author?: string; search?: string; subcategoryId?: string; vipOnly?: boolean; excludeVipPackages?: boolean; excludePurchased?: string | null; forAdmin?: boolean }): Promise<Course[]>;
  getCourse(id: string): Promise<Course | undefined>;
  getCoursesByIds(ids: string[]): Promise<Course[]>;
  getTopCoursesByCategory(categoryId: string, platform?: string, limit?: number): Promise<Array<Course & { purchaseCount: number }>>;
  getFrequentlyBoughtTogether(courseId: string, limit?: number): Promise<Array<Course & { purchaseCount: number }>>;
  createCourse(course: InsertCourse): Promise<Course>;
  deleteCourse(id: string): Promise<void>;
  updateCourse(id: string, data: Partial<InsertCourse>): Promise<Course>;
  toggleCourseVisibility(id: string, field: 'hiddenInShop' | 'hiddenInLibrary'): Promise<Course>;


  getDistinctYears(platform?: string, level?: string, author?: string, minRating?: number): Promise<number[]>;
  getMaxPrice(platform?: string): Promise<number>;
  getDistinctAuthors(platform?: string, level?: string, year?: number, minRating?: number, search?: string): Promise<string[]>;
  getDistinctLevels(platform?: string, year?: number, author?: string, minRating?: number): Promise<string[]>;
  getAvailableRatings(platform?: string, level?: string, year?: number, author?: string): Promise<number[]>;


  trackFilterClick(data: { filterType: string; filterId?: string; filterValue: string; userId?: string }): Promise<void>;

  getCourseSubcategories(courseId: string): Promise<string[]>;
  addCourseSubcategory(courseId: string, subcategoryId: string): Promise<void>;
  removeCourseSubcategory(courseId: string, subcategoryId: string): Promise<void>;
  setCourseSubcategories(courseId: string, subcategoryIds: string[]): Promise<void>;

  getPurchases(userId: string): Promise<Purchase[]>;
  getPurchase(userId: string, courseId: string): Promise<Purchase | undefined>;
  getPurchasesByCourse(courseId: string): Promise<Purchase[]>;
  createPurchase(purchase: InsertPurchase): Promise<Purchase>;
  getLibrary(userId: string, filters?: { levelIds?: string[]; year?: number; minPrice?: number; maxPrice?: number; minRating?: number; author?: string; search?: string }): Promise<(Purchase & { course: Course })[]>;

  getFavorites(userId: string): Promise<(Favorite & { course: Course })[]>;
  getFavorite(userId: string, courseId: string): Promise<Favorite | undefined>;
  addFavorite(userId: string, courseId: string): Promise<Favorite>;
  removeFavorite(userId: string, courseId: string): Promise<void>;

  getReferralsByUser(userId: string): Promise<Referral[]>;
  getReferralForUser(userId: string): Promise<Referral | undefined>;
  getReferralStats(userId: string): Promise<{ count: number; totalEarnings: string }>;
  getReferralDetails(userId: string, dateFrom?: Date, dateTo?: Date): Promise<Array<{
    referral: Referral;
    user: Pick<User, 'id' | 'email' | 'firstName' | 'lastName' | 'telegramUsername'>;
    topups: Array<{
      date: Date | null;
      amount: string;
      referralBonus: string;
    }>;
    totalTopups: string;
    totalReferralEarnings: string;
  }>>;
  createReferral(referral: InsertReferral): Promise<Referral>;
  updateReferralEarnings(referralId: string, amount: number): Promise<void>;

  getTasks(): Promise<Task[]>;
  getTask(id: string): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  getUserTasks(userId: string): Promise<UserTask[]>;
  getUserTask(userId: string, taskId: string): Promise<UserTask | undefined>;
  claimTask(userId: string, taskId: string, fantiksEarned: number): Promise<UserTask>;

  addBalanceTransaction(transaction: InsertBalanceTransaction): Promise<BalanceTransaction>;
  updateUserBalance(userId: string, amount: number): Promise<void>;
  updateUserReferralBalance(userId: string, amount: number): Promise<void>;
  withdrawReferralBalance(userId: string, amount: number): Promise<{ amount: string }>;
  updateUserReferralPercent(userId: string, percent: number | null): Promise<User | undefined>;

  getReviewsByCourse(courseId: string): Promise<(Review & { user: Pick<User, 'id' | 'firstName' | 'lastName' | 'profileImageUrl'> & { selectedAward: string | null } })[]>;
  getUserReviewForCourse(userId: string, courseId: string): Promise<Review | undefined>;
  getReviewById(reviewId: string): Promise<Review | undefined>;
  createReview(review: InsertReview & { userId: string }): Promise<Review>;
  updateReview(reviewId: string, data: { rating?: number; comment?: string }): Promise<Review>;
  deleteReview(reviewId: string): Promise<void>;
  getCourseRatingStats(courseId: string): Promise<{ averageRating: number; totalReviews: number }>;
  updateCourseRating(courseId: string): Promise<void>;
  addReviewVote(vote: InsertReviewVote): Promise<ReviewVote>;
  removeReviewVote(reviewId: string, userId: string): Promise<void>;
  getUserReviewVote(reviewId: string, userId: string): Promise<ReviewVote | undefined>;
  getReviewVotesCount(reviewId: string): Promise<{ likes: number; dislikes: number }>;
  moderateReview(reviewId: string, status: 'approved' | 'rejected', moderatorId: string, comment?: string): Promise<Review>;
  getPendingReviews(): Promise<(Review & { user: Pick<User, 'id' | 'firstName' | 'lastName' | 'email'>; course: Pick<Course, 'id' | 'title'> })[]>;
  updateReviewAdminComment(reviewId: string, adminComment: string | null): Promise<Review>;

  getCourseSections(courseId: string): Promise<CourseSection[]>;
  getSectionById(sectionId: string): Promise<CourseSection | undefined>;
  createCourseSection(section: InsertCourseSection): Promise<CourseSection>;
  updateCourseSection(sectionId: string, data: Partial<InsertCourseSection>): Promise<CourseSection>;
  deleteCourseSection(sectionId: string): Promise<void>;

  getLessonsBySection(sectionId: string): Promise<Lesson[]>;
  getLessonByVideoUrl(videoUrl: string): Promise<Lesson | undefined>;
  getAllLessonsWithVideos(): Promise<Lesson[]>;
  getFirstLessonWithVideo(courseId: string): Promise<Lesson | undefined>;
  createLesson(lesson: InsertLesson): Promise<Lesson>;
  updateLesson(lessonId: string, data: Partial<InsertLesson>): Promise<Lesson>;
  deleteLesson(lessonId: string): Promise<void>;

  getUserProgress(userId: string, courseId: string): Promise<{ sections: (CourseSection & { lessons: (Lesson & { progress?: LessonProgress })[] })[], completionPercentage: number }>;
  updateLessonProgress(userId: string, lessonId: string, completed: boolean, watchedSeconds?: number): Promise<LessonProgress>;
  getCourseProgress(userId: string, courseId: string): Promise<{ completed: number, total: number, percentage: number }>;


  getAdminStats(): Promise<{ totalUsers: number; totalCourses: number; totalPurchases: number; totalRevenue: string }>;
  getAllUsers(): Promise<User[]>;
  getUsersAnalytics(): Promise<Array<{
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    balance: string;
    referralBalance: string;
    isOnline: boolean;
    lastActivityAt: Date | null;
    coursesPurchased: number;
    totalWatchTimeMinutes: number;
    createdAt: Date | null;
  }>>;
  getPlatformStats(): Promise<{
    totalUsers: number;
    usersOnline: number;
    totalRevenue: string;
    totalCourses: number;
    totalPurchases: number;
    totalWatchTimeMinutes: number;
    usersWithTelegram: number;
  }>;
  updateUserAdmin(userId: string, isAdmin: boolean): Promise<User | undefined>;
  updateUserBlocked(userId: string, isBlocked: boolean): Promise<User | undefined>;
  addUserBalance(userId: string, amount: number): Promise<User | undefined>;
  addBalanceToAllUsers(amount: number): Promise<number>;
  updateCourse(courseId: string, data: Partial<InsertCourse>): Promise<Course>;


  getSiteSettings(): Promise<SiteSettings | undefined>;
  updateSiteSettings(data: Partial<InsertSiteSettings>): Promise<SiteSettings>;

  getVipPageContent(): Promise<VipPageContent | undefined>;
  updateVipPageContent(data: Partial<InsertVipPageContent>): Promise<VipPageContent>;

  getVipTiers(): Promise<VipTier[]>;
  updateVipTier(tier: string, data: Partial<InsertVipTier>): Promise<VipTier>;

  getCategories(parentId?: string | null): Promise<Category[]>;
  getCategory(id: string): Promise<Category | undefined>;
  getSubcategory(id: string): Promise<Subcategory | undefined>;
  createCategory(category: InsertCategory & { slug: string; displayOrder?: number }): Promise<Category>;
  updateCategory(id: string, data: Partial<InsertCategory>): Promise<Category>;
  deleteCategory(id: string): Promise<void>;

  getSubcategories(categoryId?: string): Promise<Subcategory[]>;
  createSubcategory(subcategory: InsertSubcategory & { slug: string; displayOrder?: number }): Promise<Subcategory>;
  updateSubcategory(id: string, data: Partial<InsertSubcategory>): Promise<Subcategory>;
  deleteSubcategory(id: string): Promise<void>;

  getMenuItems(): Promise<MenuItem[]>;
  createMenuItem(menuItem: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: string, data: Partial<InsertMenuItem>): Promise<MenuItem>;
  deleteMenuItem(id: string): Promise<void>;

  getCourseFiles(courseId: string, moduleId?: string): Promise<CourseFile[]>;
  getCourseFileByUrl(fileUrl: string): Promise<CourseFile | undefined>;
  createCourseFile(courseFile: InsertCourseFile): Promise<CourseFile>;
  deleteCourseFile(id: string): Promise<void>;


  getCoursePackages(categoryId?: string | null): Promise<(CoursePackage & { courses: Course[]; totalPrice: number; discountedPrice: number })[]>;
  getAllCoursePackages(): Promise<(CoursePackage & { courses: Course[]; totalPrice: number; discountedPrice: number; purchaseCount?: number })[]>;
  getCoursePackage(id: string): Promise<(CoursePackage & { courses: Course[]; totalPrice: number; discountedPrice: number }) | undefined>;
  createCoursePackage(packageData: InsertCoursePackage): Promise<CoursePackage>;
  updateCoursePackage(id: string, data: Partial<InsertCoursePackage>): Promise<CoursePackage>;
  deleteCoursePackage(id: string): Promise<void>;
  addCourseToPackage(packageId: string, courseId: string, displayOrder?: number): Promise<PackageCourse>;
  removeCourseFromPackage(packageId: string, courseId: string): Promise<void>;
  getPackageCourses(packageId: string): Promise<Course[]>;
  updateCourseOrderInPackage(packageId: string, courseId: string, displayOrder: number): Promise<void>;
  getPackagesByCourse(courseId: string): Promise<(CoursePackage & { totalPrice: number; discountedPrice: number; courseCount: number })[]>;

  getLandingContent(): Promise<LandingContent | undefined>;
  updateLandingContent(data: Partial<InsertLandingContent>): Promise<LandingContent>;

  getTradeInContent(): Promise<TradeInPageContent | undefined>;
  updateTradeInContent(data: Partial<InsertTradeInPageContent>): Promise<TradeInPageContent>;


  trackCourseView(courseId: string, userId?: string | null): Promise<void>;
  getRevenueByDay(days: number): Promise<Array<{ date: string; revenue: string; purchases: number }>>;
  getTopCoursesByMetric(limit?: number): Promise<Array<{
    id: string;
    title: string;
    views: number;
    purchases: number;
    revenue: string;
    conversionRate: number;
    completionRate: number;
    avgWatchTime: number;
  }>>;
  getActiveUsersStats(): Promise<{
    dau: number;
    wau: number;
    mau: number;
    dailyData: Array<{ date: string; activeUsers: number }>;
  }>;
  getPurchaseFunnel(): Promise<{
    totalUsers: number;
    viewedCourses: number;
    addedToFavorites: number;
    purchased: number;
    viewToFavoriteRate: number;
    favoriteToPurchaseRate: number;
    viewToPurchaseRate: number;
  }>;
  getActivityHeatmap(): Promise<Array<{ hour: number; dayOfWeek: number; activityCount: number }>>;
  getReferralAnalytics(): Promise<{
    totalReferrals: number;
    activeReferrals: number;
    totalReferralRevenue: string;
    topReferrers: Array<{
      userId: string;
      name: string;
      referrals: number;
      revenue: string;
    }>;
  }>;
  getRegistrationTrends(days: number): Promise<Array<{ date: string; registrations: number }>>;
  getReferralTrends(days: number): Promise<Array<{ date: string; newReferrals: number; revenue: string }>>;
  getDetailedReferrers(): Promise<Array<{
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
  }>>;


  getRevenueMetrics(): Promise<{
    arpu: number;
    arppu: number;
    averageOrderValue: number;
    totalPayingUsers: number;
    revenueGrowthRate: number;
  }>;
  getMRRData(months: number): Promise<Array<{
    month: string;
    mrr: number;
    subscribers: number;
  }>>;


  getRetentionMetrics(): Promise<{
    retention7Day: number;
    retention30Day: number;
    churnRate: number;
  }>;
  getCohortAnalysis(months: number): Promise<Array<{
    cohort: string;
    totalUsers: number;
    retained: Record<string, number>;
  }>>;


  getEngagementMetrics(): Promise<{
    overallCompletionRate: number;
    averageCoursesPerUser: number;
    activeLearnersPercent: number;
  }>;


  createLandingVisit(visit: InsertLandingVisit): Promise<LandingVisit>;
  getLandingVisit(fingerprint: string): Promise<LandingVisit | undefined>;
  updateLandingVisitConversion(visitId: string, userId: string): Promise<void>;
  getLandingVisitStats(days: number): Promise<{
    totalVisits: number;
    uniqueVisitors: number;
    conversions: number;
    conversionRate: number;
    dailyVisits: Array<{ date: string; visits: number; conversions: number }>;
    topCountries: Array<{ country: string; count: number }>;
    topBrowsers: Array<{ browser: string; count: number }>;
    topDevices: Array<{ device: string; count: number }>;
    utmCampaigns?: Array<{ campaign: string; visits: number; conversions: number; conversionRate: number }>;
  }>;


  getCourseRequests(isAdmin: boolean, limit?: number, offset?: number): Promise<Array<CourseRequest & {
    user: Pick<User, 'id' | 'firstName' | 'lastName'> & { selectedAward: string | null };
    totalVotes: number;
    upvotes: number;
    downvotes: number;
  }>>;
  getCourseRequest(id: string): Promise<CourseRequest | undefined>;
  createCourseRequest(data: InsertCourseRequest): Promise<CourseRequest>;
  deleteCourseRequest(id: string): Promise<void>;
  voteForCourseRequest(requestId: string, userId: string, vote: number): Promise<CourseRequestVote>;
  getUserVoteForRequest(requestId: string, userId: string): Promise<CourseRequestVote | undefined>;
  checkUserRequestRateLimit(userId: string): Promise<{ allowed: boolean; count: number; timeUntilReset: number }>;
  moderateCourseRequest(requestId: string, moderatorId: string, approve: boolean): Promise<CourseRequest>;
  updateCourseRequestComment(requestId: string, adminComment: string | null): Promise<CourseRequest>;


  createNotification(data: InsertNotification): Promise<Notification>;
  createBroadcastNotification(title: string, message: string, imageUrl?: string): Promise<{ count: number }>;
  getUserNotifications(userId: string, limit?: number, offset?: number): Promise<Notification[]>;
  getUnreadNotificationsCount(userId: string): Promise<number>;
  markNotificationAsRead(notificationId: string, userId: string): Promise<void>;
  markAllNotificationsAsRead(userId: string): Promise<void>;
  deleteNotification(notificationId: string, userId: string): Promise<void>;


  getAwards(): Promise<(Award & { task?: Task | null })[]>;
  getAward(id: string): Promise<Award | undefined>;
  createAward(award: InsertAward): Promise<Award>;
  updateAward(id: string, data: Partial<InsertAward>): Promise<Award>;
  deleteAward(id: string): Promise<void>;
  getUserAwards(userId: string): Promise<(UserAward & { award: Award })[]>;
  addUserAward(userId: string, awardId: string): Promise<UserAward>;
  selectUserAward(userId: string, awardId: string | null): Promise<User>;


  getPartners(): Promise<Partner[]>;
  getPartner(id: string): Promise<Partner | undefined>;
  createPartner(partner: InsertPartner): Promise<Partner>;
  updatePartner(id: string, data: Partial<InsertPartner>): Promise<Partner>;
  deletePartner(id: string): Promise<void>;


  getPrograms(filters?: { category?: string; isFree?: boolean; search?: string }): Promise<Program[]>;
  getProgram(id: string): Promise<Program | undefined>;
  createProgram(program: InsertProgram): Promise<Program>;
  updateProgram(id: string, data: Partial<InsertProgram>): Promise<Program>;
  deleteProgram(id: string): Promise<void>;
  getProgramPurchases(userId: string): Promise<ProgramPurchase[]>;
  createProgramPurchase(purchase: InsertProgramPurchase): Promise<ProgramPurchase>;
  getProgramPurchase(userId: string, programId: string): Promise<ProgramPurchase | undefined>;


  getProgramReviews(programId: string): Promise<(ProgramReview & { user: Pick<User, 'id' | 'firstName' | 'lastName' | 'profileImageUrl'> & { selectedAward: string | null } })[]>;
  getUserProgramReview(userId: string, programId: string): Promise<ProgramReview | undefined>;
  getProgramReviewById(reviewId: string): Promise<ProgramReview | undefined>;
  createProgramReview(review: InsertProgramReview & { userId: string }): Promise<ProgramReview>;
  updateProgramReview(reviewId: string, data: { rating?: number; comment?: string }): Promise<ProgramReview>;
  deleteProgramReview(reviewId: string): Promise<void>;
  moderateProgramReview(reviewId: string, status: 'approved' | 'rejected', moderatorId: string, comment?: string): Promise<ProgramReview>;
  getPendingProgramReviews(): Promise<(ProgramReview & { user: Pick<User, 'id' | 'firstName' | 'lastName' | 'email'>; program: Pick<Program, 'id' | 'title'> })[]>;
  updateProgramReviewAdminComment(reviewId: string, adminComment: string | null): Promise<ProgramReview>;


  getProgramInstructions(programId: string): Promise<ProgramInstruction[]>;
  getProgramInstruction(id: string): Promise<ProgramInstruction | undefined>;
  createProgramInstruction(instruction: InsertProgramInstruction): Promise<ProgramInstruction>;
  updateProgramInstruction(id: string, data: Partial<InsertProgramInstruction>): Promise<ProgramInstruction>;
  deleteProgramInstruction(id: string): Promise<void>;


  createVerificationCode(data: InsertTelegramVerificationCode): Promise<TelegramVerificationCode>;
  getVerificationCode(code: string, userId?: string, email?: string): Promise<TelegramVerificationCode | undefined>;
  markVerificationCodeUsed(id: string): Promise<void>;
  cleanupExpiredCodes(): Promise<void>;
  updateUserTelegramChatId(userId: string, chatId: string | null, username?: string | null, firstName?: string | null, lastName?: string | null, telegramId?: string | null, phoneNumber?: string | null): Promise<User>;
  getUserByTelegramChatId(chatId: string): Promise<User | undefined>;


  getFilterPopularity(filterType?: string, days?: number): Promise<Array<{ filterId: string; filterValue: string; clickCount: number }>>;


  addOrUpdatePendingLessonNotification(courseId: string, lessonId: string): Promise<void>;
  getPendingLessonNotificationsToProcess(): Promise<PendingLessonNotification[]>;
  markPendingLessonNotificationAsProcessed(id: string): Promise<void>;


  getInactiveUsersForEngagement(notificationType: '1_week' | '2_weeks' | '1_month'): Promise<User[]>;
  createEngagementNotification(userId: string, notificationType: '1_week' | '2_weeks' | '1_month'): Promise<EngagementNotification>;
  hasReceivedEngagementNotification(userId: string, notificationType: '1_week' | '2_weeks' | '1_month'): Promise<boolean>;
  hasSentEngagementNotificationsToday(): Promise<boolean>;


  hasCompletedSchedulerRun(schedulerName: string, runDate: string): Promise<boolean>;
  getSchedulerRun(schedulerName: string, runDate: string): Promise<SchedulerRun | undefined>;
  createSchedulerRun(schedulerName: string, runDate: string): Promise<SchedulerRun>;
  updateSchedulerRunToRunning(id: string): Promise<void>;
  markSchedulerRunCompleted(id: string): Promise<void>;
  markSchedulerRunFailed(id: string, errorMessage: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0] as User | undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const referralCode = userData.referralCode || `REF${Date.now()}${Math.random().toString(36).substring(2, 7)}`.toUpperCase();
    const promoCode = userData.promoCode || `PROMO${Date.now()}${Math.random().toString(36).substring(2, 7)}`.toUpperCase();

    const result = await db
      .insert(users)
      .values({
        ...userData,
        referralCode,
        promoCode,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
        },
      })
      .returning() as unknown as Promise<User[]>;

    const user = (await result)[0]!;


    await import('./auth').then(m => m.autoCompleteWelcomeTask(user.id));

    return user;
  }

  async updateUserProfile(userId: string, data: { phoneNumber?: string; telegramUsername?: string }): Promise<User> {
    const result = await db
      .update(users)
      .set({
        phoneNumber: data.phoneNumber,
        telegramUsername: data.telegramUsername,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return result[0]! as User;
  }

  async updateUserReferralCode(userId: string, referralCode: string): Promise<User> {

    const existingUser = await db
      .select()
      .from(users)
      .where(and(
        eq(users.referralCode, referralCode),
        sql`${users.id} != ${userId}`
      ));

    if (existingUser.length > 0) {
      throw new Error('Этот промокод уже используется');
    }

    const result = await db
      .update(users)
      .set({
        referralCode,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    return result[0]! as User;
  }

  async updateUserPassword(userId: string, passwordHash: string): Promise<User> {
    const result = await db
      .update(users)
      .set({
        passwordHash,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    return result[0]! as User;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0] as User | undefined;
  }

  async getUserByTelegramId(telegramId: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.telegramId, telegramId));
    return result[0] as User | undefined;
  }

  async getUserByReferralCode(referralCode: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.referralCode, referralCode));
    return result[0] as User | undefined;
  }

  async createUserWithPassword(data: {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    referralCode: string;
    promoCode: string;
    referralDiscount?: number;
    landingVisitId?: string;
    registrationIp?: string;
    registrationCountry?: string;
    registrationCity?: string;
    registrationBrowser?: string;
    registrationDevice?: string;
    registrationOs?: string;
    registrationUserAgent?: string;
  }): Promise<User> {
    const result = await db
      .insert(users)
      .values({
        email: data.email,
        passwordHash: data.passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        referralCode: data.referralCode,
        promoCode: data.promoCode,
        referralDiscount: data.referralDiscount || 0,
        landingVisitId: data.landingVisitId,
        registrationIp: data.registrationIp,
        registrationCountry: data.registrationCountry,
        registrationCity: data.registrationCity,
        registrationBrowser: data.registrationBrowser,
        registrationDevice: data.registrationDevice,
        registrationOs: data.registrationOs,
        registrationUserAgent: data.registrationUserAgent,
      })
      .returning() as unknown as Promise<User[]>;
    return (await result)[0]!;
  }

  async createUserWithTelegram(data: {
    telegramId: string;
    firstName: string;
    lastName?: string;
    telegramUsername?: string;
    profileImageUrl?: string;
    referralCode: string;
    promoCode: string;
    referralDiscount?: number;
    landingVisitId?: string;
    registrationIp?: string;
    registrationCountry?: string;
    registrationCity?: string;
    registrationBrowser?: string;
    registrationDevice?: string;
    registrationOs?: string;
    registrationUserAgent?: string;
  }): Promise<User> {
    const result = await db
      .insert(users)
      .values({
        telegramId: data.telegramId,
        firstName: data.firstName,
        lastName: data.lastName,
        telegramUsername: data.telegramUsername,
        profileImageUrl: data.profileImageUrl,
        referralCode: data.referralCode,
        promoCode: data.promoCode,
        referralDiscount: data.referralDiscount || 0,
        landingVisitId: data.landingVisitId,
        registrationIp: data.registrationIp,
        registrationCountry: data.registrationCountry,
        registrationCity: data.registrationCity,
        registrationBrowser: data.registrationBrowser,
        registrationDevice: data.registrationDevice,
        registrationOs: data.registrationOs,
        registrationUserAgent: data.registrationUserAgent,
      })
      .returning() as unknown as Promise<User[]>;
    return (await result)[0]!;
  }

  async getDistinctYears(
    platformId?: string,
    level?: string,
    author?: string,
    minRating?: number
  ): Promise<number[]> {
    const conditions = [isNotNull(courses.year)]

    if (platformId) {
      conditions.push(sql`${courses.level} @> ARRAY[${platformId}]::text[]`)
    }

    if (level) {
      const levelIds = level.split(',').map(id => id.trim()).filter(Boolean)
      if (levelIds.length > 0) {
        const pgArray = `{${levelIds.map(id => `"${id}"`).join(',')}}`
        conditions.push(sql`${courses.level} @> ${pgArray}::text[]`)
      }
    }

    if (author) {
      conditions.push(eq(courses.authorName, author))
    }

    if (minRating !== undefined) {
      conditions.push(sql`CAST(${courses.rating} AS DECIMAL) >= ${minRating}`)
    }

    const result = await db
      .select({ year: courses.year })
      .from(courses)
      .where(and(...conditions))
      .groupBy(courses.year)

    return result
      .map(r => r.year)
      .filter((y): y is number => y !== null)
      .sort((a, b) => b - a)
  }

  async getCourses(filters = {}) {
    const conditions = []

    if (!filters.forAdmin) {
      conditions.push(eq(courses.hiddenInShop, false))
    }

    if (!filters.forAdmin && filters.excludePurchased) {
      conditions.push(eq(courses.hiddenInLibrary, false))
    }

    if (filters.levelIds && filters.levelIds.length > 0) {
      const ids = filters.levelIds.map(id => id.trim()).filter(Boolean)
      console.log('[DB] level filter ids:', ids)
      if (ids.length > 0) {
        const pgArrayLiteral = `{${ids.map(id => `"${id}"`).join(',')}}`
        console.log('[DB] level pg array:', pgArrayLiteral)
        conditions.push(sql`${courses.level} @> ${pgArrayLiteral}::text[]`)
      }
    }

    if (filters.subcategoryId) {
      console.log('[DB] subcategory filter id:', filters.subcategoryId)
      conditions.push(
        sql`EXISTS (
        SELECT 1 FROM ${courseSubcategories}
        WHERE course_id = ${courses}.id
        AND subcategory_id = ${filters.subcategoryId}
      )`
      )
    }

    if (filters.year) {
      conditions.push(eq(courses.year, filters.year))
    }

    if (filters.excludeCurrentYear) {
      conditions.push(sql`${courses.year} != ${filters.excludeCurrentYear}`)
    }

    if (filters.author) {
      conditions.push(eq(courses.authorName, filters.author))
    }

    if (filters.minPrice !== undefined) {
      conditions.push(sql`CAST(${courses.price} AS DECIMAL) >= ${filters.minPrice}`)
    }
    if (filters.maxPrice !== undefined) {
      conditions.push(sql`CAST(${courses.price} AS DECIMAL) <= ${filters.maxPrice}`)
    }

    if (filters.minRating !== undefined) {
      conditions.push(sql`CAST(${courses.rating} AS DECIMAL) >= ${filters.minRating}`)
    }

    if (filters.vipOnly) {
      conditions.push(eq(courses.isVipSubscription, true))
    }
    if (filters.excludeVipPackages) {
      conditions.push(eq(courses.isVipSubscription, false))
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase().trim()
      const words = searchLower.split(/\s+/).filter(w => w.length > 0)
      for (const word of words) {
        const pattern = `%${word}%`
        conditions.push(
          or(
            sql`LOWER(${courses.title}) LIKE ${pattern}`,
            sql`LOWER(${courses.description}) LIKE ${pattern}`,
            sql`LOWER(${courses.authorName}) LIKE ${pattern}`
          )
        )
      }
    }

    if (filters.excludePurchased) {
      conditions.push(
        sql`NOT EXISTS (
          SELECT 1 FROM ${purchases}
          WHERE ${purchases.courseId} = ${courses.id}
          AND ${purchases.userId} = ${filters.excludePurchased}
        )`
      )
    }

    let query = db
      .select({
        course: courses,
        previewVideoUrl: sql`(
        SELECT l.video_url
        FROM ${lessons} l
        INNER JOIN ${courseSections} cs ON l.section_id = cs.id
        WHERE cs.course_id = ${courses}.id
          AND l.video_url IS NOT NULL
        ORDER BY cs."order", l."order"
        LIMIT 1
      )`.as('preview_video_url')
      })
      .from(courses)
      .$dynamic()

    if (conditions.length > 0) {
      query = query.where(and(...conditions))
    }

    const finalTake = filters.take && filters.take > 0 ? filters.take : undefined
    const finalSkip = filters.skip ?? 0

    if (finalTake !== undefined) {
      query = query.limit(finalTake)
    }
    if (finalSkip > 0) {
      query = query.offset(finalSkip)
    }

    query = query.orderBy(desc(courses.createdAt))

    let total = 0
    if (filters.countTotal) {
      const countQuery = db
        .select({ count: sql`count(*)` })
        .from(courses)
        .$dynamic()

      if (conditions.length > 0) {
        countQuery.where(and(...conditions))
      }

      const [{ count }] = await countQuery
      total = Number(count)
    }

    const result = await query


    let coursesData = result.map(r => ({
      ...r.course,
      previewVideoUrl: r.previewVideoUrl
    }))

    if (coursesData.length > 0) {
      const courseIds = coursesData.map(c => c.id)

      const subcats = await db
        .select({
          courseId: courseSubcategories.courseId,
          subcategoryId: courseSubcategories.subcategoryId
        })
        .from(courseSubcategories)
        .where(inArray(courseSubcategories.courseId, courseIds))

      const subcatsMap = new Map()

      subcats.forEach(row => {
        if (!subcatsMap.has(row.courseId)) {
          subcatsMap.set(row.courseId, [])
        }
        subcatsMap.get(row.courseId).push(row.subcategoryId)
      })

      coursesData = coursesData.map(course => ({
        ...course,
        subcategoryIds: subcatsMap.get(course.id) || []
      }))
    }

    if (filters.countTotal) {
      return { courses: coursesData, total }
    }

    return coursesData
  }

  async getMaxPrice(platform?: string): Promise<number> {
    let query = db
      .select({
        maxPrice: sql<string>`MAX(CAST(${courses.price} AS DECIMAL))`.as('max_price')
      })
      .from(courses)
      .$dynamic()

    if (platform) {
      const platforms = platform.split(',').map(p => p.trim()).filter(Boolean)
      if (platforms.length > 0) {
        query = query.where(inArray(courses.platform, platforms))
      }
    }

    const [result] = await query
    const maxPrice = result?.maxPrice ? parseFloat(result.maxPrice) : 50000
    return isNaN(maxPrice) ? 50000 : maxPrice
  }

  async getDistinctAuthors(
    platformId?: string,
    level?: string,
    year?: number,
    minRating?: number,
    search?: string
  ): Promise<string[]> {
    const conditions = [isNotNull(courses.authorName)]

    if (platformId) {
      conditions.push(sql`${courses.level} @> ARRAY[${platformId}]::text[]`)
    }

    if (level) {
      const levelIds = level.split(',').map(id => id.trim()).filter(Boolean)
      if (levelIds.length > 0) {
        const pgArray = `{${levelIds.map(id => `"${id}"`).join(',')}}`
        conditions.push(sql`${courses.level} @> ${pgArray}::text[]`)
      }
    }

    if (year !== undefined) {
      conditions.push(eq(courses.year, year))
    }

    if (minRating !== undefined) {
      conditions.push(sql`CAST(${courses.rating} AS DECIMAL) >= ${minRating}`)
    }

    if (search) {
      conditions.push(like(courses.authorName, `%${search}%`))
    }

    const authorsWithClicks = await db
      .select({
        authorName: courses.authorName,
        clickCount: sql<number>`CAST(COUNT(DISTINCT ${filterClicks.id}) AS INTEGER)`.as('click_count')
      })
      .from(courses)
      .leftJoin(
        filterClicks,
        and(
          eq(filterClicks.filterType, 'author'),
          eq(filterClicks.filterValue, courses.authorName)
        )
      )
      .where(and(...conditions))
      .groupBy(courses.authorName)
      .orderBy(desc(sql`click_count`))

    return authorsWithClicks
      .map(r => r.authorName)
      .filter((a): a is string => a !== null && a !== '')
  }

  async getDistinctLevels(
    platform?: string,
    year?: number,
    author?: string,
    minRating?: number
  ): Promise<string[]> {
    const conditions = [isNotNull(courses.level)]

    if (platform) {
      const platforms = platform.split(',').map(p => p.trim()).filter(Boolean)
      if (platforms.length > 0) {
        conditions.push(inArray(courses.platform, platforms))
      }
    }

    if (year !== undefined) {
      conditions.push(eq(courses.year, year))
    }

    if (author) {
      conditions.push(eq(courses.authorName, author))
    }

    if (minRating !== undefined) {
      conditions.push(sql`CAST(${courses.rating} AS DECIMAL) >= ${minRating}`)
    }

    const result = await db.execute<{ level: string }>(sql`
    SELECT DISTINCT unnest(level) as level
    FROM courses
    WHERE ${sql.join(conditions, sql` AND `)}
    ORDER BY level
  `)

    return result.rows
      .map(r => r.level)
      .filter((l): l is string => l !== null && l !== '')
  }

  async getAvailableRatings(
    platform?: string,
    level?: string,
    year?: number,
    author?: string
  ): Promise<number[]> {
    const conditions = [isNotNull(courses.rating)]

    if (platform) {
      const platforms = platform.split(',').map(p => p.trim()).filter(Boolean)
      if (platforms.length > 0) {
        conditions.push(inArray(courses.platform, platforms))
      }
    }

    if (level) {
      conditions.push(sql`${courses.level} @> ARRAY[${level}]::text[]`)
    }

    if (year !== undefined) {
      conditions.push(eq(courses.year, year))
    }

    if (author) {
      conditions.push(eq(courses.authorName, author))
    }

    const result = await db.execute<{ rating: number }>(sql`
    SELECT DISTINCT FLOOR(CAST(${courses.rating} AS DECIMAL)) as rating
    FROM courses
    WHERE ${sql.join(conditions, sql` AND `)}
    AND CAST(${courses.rating} AS DECIMAL) >= 1
    ORDER BY rating DESC
  `)

    return result.rows
      .map(r => r.rating)
      .filter((r): r is number => r !== null && r >= 1 && r <= 5)
  }

  async trackFilterClick(data: { filterType: string; filterId?: string; filterValue: string; userId?: string }): Promise<void> {
    await db.insert(filterClicks).values({
      filterType: data.filterType,
      filterId: data.filterId || null,
      filterValue: data.filterValue,
      userId: data.userId || null,
    });
  }

  async getCourse(id: string): Promise<Course | undefined> {
    const [result] = await db
      .select({
        course: courses,
        subcategoryIds: sql<string[]>`(
          SELECT COALESCE(array_agg(subcategory_id), ARRAY[]::text[])
          FROM ${courseSubcategories}
          WHERE course_id = ${courses}.id
        )`.as('subcategory_ids'),
      })
      .from(courses)
      .where(eq(courses.id, id));

    if (!result) return undefined;
    return {
      ...result.course,
      subcategoryIds: result.subcategoryIds || [],
    };
  }

  async getCourseStats(courseId: string): Promise<{
    lessonCount: number;
    totalDurationMinutes: number;
    purchaseCount: number;
  }> {
    const [stats] = await db
      .select({
        lessonCount: sql<number>`CAST(COUNT(DISTINCT ${lessons.id}) AS INTEGER)`,
        totalDurationMinutes: sql<number>`CAST(COALESCE(SUM(${lessons.duration}), 0) AS INTEGER)`,
        purchaseCount: sql<number>`CAST(COUNT(DISTINCT ${purchases.id}) AS INTEGER)`,
      })
      .from(courseSections)
      .leftJoin(lessons, eq(lessons.sectionId, courseSections.id))
      .leftJoin(purchases, eq(purchases.courseId, courseId))
      .where(eq(courseSections.courseId, courseId));

    return stats || { lessonCount: 0, totalDurationMinutes: 0, purchaseCount: 0 };
  }

  async getCoursesByIds(ids: string[]): Promise<Course[]> {
    if (ids.length === 0) return [];
    const coursesData = await db
      .select()
      .from(courses)
      .where(inArray(courses.id, ids));
    return coursesData;
  }

  async getTopCoursesByCategory(categoryId: string, platformId?: string, limit: number = 5): Promise<Array<Course & { purchaseCount: number }>> {
    const categorySubcategories = await db
      .select({ id: subcategories.id })
      .from(subcategories)
      .where(eq(subcategories.categoryId, categoryId))

    if (categorySubcategories.length === 0) {
      return []
    }

    const subcategoryIds = categorySubcategories.map(s => s.id)

    const conditions = [
      inArray(courseSubcategories.subcategoryId, subcategoryIds)
    ]

    if (platformId) {
      conditions.push(sql`${courses.level} @> ARRAY[${platformId}]::text[]`)
    }

    const topCourses = await db
      .select({
        ...getTableColumns(courses),
        subcategoryIds: sql<string[]>`(
          SELECT COALESCE(array_agg(subcategory_id), ARRAY[]::text[])
          FROM ${courseSubcategories}
          WHERE course_id = ${courses}.id
        )`.as('subcategory_ids'),
        purchaseCount: sql<number>`CAST(COUNT(DISTINCT ${purchases.id}) AS INTEGER)`,
      })
      .from(courses)
      .innerJoin(courseSubcategories, eq(courses.id, courseSubcategories.courseId))
      .leftJoin(purchases, eq(courses.id, purchases.courseId))
      .where(and(...conditions))
      .groupBy(courses.id)
      .orderBy(desc(sql`COUNT(DISTINCT ${purchases.id})`), desc(courses.createdAt))
      .limit(limit)

    return topCourses.map((c: any) => ({
      ...c,
      subcategoryIds: c.subcategoryIds || [],
    }))
  }

  async getFrequentlyBoughtTogether(courseId: string, limit: number = 6): Promise<Array<Course & { purchaseCount: number }>> {
    const frequentlyBought = await db
      .select({
        ...getTableColumns(courses),
        purchaseCount: sql<number>`CAST(COUNT(DISTINCT ${purchases.userId}) AS INTEGER)`.as('purchase_count'),
      })
      .from(purchases)
      .innerJoin(courses, eq(purchases.courseId, courses.id))
      .where(
        and(
          inArray(purchases.userId, db.select({ userId: purchases.userId }).from(purchases).where(eq(purchases.courseId, courseId))),
          sql`${purchases.courseId} != ${courseId}`,
          sql`CAST(${courses.price} AS NUMERIC) > 0`
        )
      )
      .groupBy(courses.id)
      .orderBy(desc(sql`COUNT(DISTINCT ${purchases.userId})`), desc(courses.createdAt))
      .limit(limit);

    return frequentlyBought;
  }

  async createCourse(courseData: InsertCourse): Promise<Course> {
    const insertData = {
      ...courseData,
      price: typeof courseData.price === 'number' ? String(courseData.price) : courseData.price,
    };
    const [course] = await db.insert(courses).values(insertData).returning();
    return course;
  }

  async updateCourse(id: string, data: Partial<InsertCourse>): Promise<Course> {

    const currentCourse = data.thumbnailImage !== undefined ? await this.getCourse(id) : null;
    const oldThumbnail = currentCourse?.thumbnailImage;

    const updateData = {
      ...data,
      price: data.price !== undefined && typeof data.price === 'number' ? String(data.price) : data.price,
    };


    const [updated] = await db
      .update(courses)
      .set(updateData)
      .where(eq(courses.id, id))
      .returning();


    if (oldThumbnail && data.thumbnailImage !== undefined && oldThumbnail !== data.thumbnailImage) {
      try {
        const { ObjectStorageService } = await import('./objectStorage');
        const objectStorage = new ObjectStorageService();
        await objectStorage.deleteObjectEntity(oldThumbnail);
        console.log('[Storage] Deleted old thumbnail:', oldThumbnail);
      } catch (error) {

        console.error('[Storage] Failed to delete old thumbnail (non-fatal):', error);
      }
    }

    return updated;
  }

  async toggleCourseVisibility(id: string, field: 'hiddenInShop' | 'hiddenInLibrary'): Promise<Course> {
    const course = await this.getCourse(id);
    if (!course) {
      throw new Error('Course not found');
    }

    const newValue = !course[field];
    const [updated] = await db
      .update(courses)
      .set({ [field]: newValue })
      .where(eq(courses.id, id))
      .returning();

    return updated;
  }

  async deleteCourse(id: string): Promise<void> {
    console.log(`[DELETE COURSE] Начато удаление курса ID: ${id}`);

    const course = await this.getCourse(id);
    if (!course) {
      console.log(`[DELETE COURSE] Курс ${id} не найден`);
      return;
    }

    // Удаляем thumbnail
    if (course.thumbnailImage && course.thumbnailImage !== "") {
      await deleteFromCDNNow(course.thumbnailImage);
    }

    // Удаляем файлы курса
    const courseFilesData = await db
      .select()
      .from(courseFiles)
      .where(eq(courseFiles.courseId, id));

    for (const file of courseFilesData) {
      if (file.fileUrl) {
        await deleteFromCDNNow(file.fileUrl);
      }
    }

    // Удаляем видео уроков
    const sections = await this.getCourseSections(id);
    for (const section of sections) {
      const lessonsData = await this.getLessonsBySection(section.id);
      for (const lesson of lessonsData) {
        if (lesson.videoUrl) {
          await deleteFromCDNNow(lesson.videoUrl);
        }
      }
    }

    // Удаляем сам курс из БД
    await db.delete(courses).where(eq(courses.id, id));
    console.log(`[DELETE COURSE] Курс ${id} полностью удалён`);
  }

  async getCourseSubcategories(courseId: string): Promise<string[]> {
    const results = await db
      .select({ subcategoryId: courseSubcategories.subcategoryId })
      .from(courseSubcategories)
      .where(eq(courseSubcategories.courseId, courseId));
    return results.map(r => r.subcategoryId);
  }

  async addCourseSubcategory(courseId: string, subcategoryId: string): Promise<void> {
    await db
      .insert(courseSubcategories)
      .values({ courseId, subcategoryId })
      .onConflictDoNothing();
  }

  async removeCourseSubcategory(courseId: string, subcategoryId: string): Promise<void> {
    await db
      .delete(courseSubcategories)
      .where(
        and(
          eq(courseSubcategories.courseId, courseId),
          eq(courseSubcategories.subcategoryId, subcategoryId)
        )
      );
  }

  async setCourseSubcategories(courseId: string, subcategoryIds: string[]): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(courseSubcategories).where(eq(courseSubcategories.courseId, courseId));

      if (subcategoryIds.length > 0) {
        await tx.insert(courseSubcategories).values(
          subcategoryIds.map(subcategoryId => ({ courseId, subcategoryId }))
        );
      }
    });
  }

  async getPurchases(userId: string): Promise<Purchase[]> {
    return await db.select().from(purchases).where(eq(purchases.userId, userId));
  }

  async getPurchasesByCourse(courseId: string): Promise<Purchase[]> {
    return await db.select().from(purchases).where(eq(purchases.courseId, courseId));
  }

  async getPurchase(userId: string, courseId: string): Promise<Purchase | undefined> {
    const [purchase] = await db
      .select()
      .from(purchases)
      .where(and(eq(purchases.userId, userId), eq(purchases.courseId, courseId)));
    return purchase;
  }

  async createPurchase(purchaseData: InsertPurchase): Promise<Purchase> {
    const [purchase] = await db.insert(purchases).values(purchaseData).returning();
    return purchase;
  }

  async getFavorites(userId: string): Promise<(Favorite & { course: Course })[]> {

    const results = await db
      .select()
      .from(favorites)
      .innerJoin(courses, eq(favorites.courseId, courses.id))
      .where(
        and(
          eq(favorites.userId, userId),
          eq(courses.hiddenInLibrary, false)
        )
      )
      .orderBy(desc(favorites.createdAt));

    const favoritesData = results.map((result) => ({
      ...result.favorites,
      course: result.courses,
    }));

    // Attach subcategoryIds in one query (avoid N+1 requests from the client).
    if (favoritesData.length > 0) {
      const courseIds = favoritesData.map(f => f.course.id);
      const subcats = await db
        .select({
          courseId: courseSubcategories.courseId,
          subcategoryId: courseSubcategories.subcategoryId,
        })
        .from(courseSubcategories)
        .where(inArray(courseSubcategories.courseId, courseIds));

      const subcatsMap = new Map<string, string[]>();
      for (const row of subcats) {
        const arr = subcatsMap.get(row.courseId) ?? [];
        arr.push(row.subcategoryId);
        subcatsMap.set(row.courseId, arr);
      }

      return favoritesData.map(f => ({
        ...f,
        course: { ...f.course, subcategoryIds: subcatsMap.get(f.course.id) ?? [] },
      }));
    }

    return favoritesData;
  }

  async getFavorite(userId: string, courseId: string): Promise<Favorite | undefined> {
    const [favorite] = await db
      .select()
      .from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.courseId, courseId)));
    return favorite;
  }

  async addFavorite(userId: string, courseId: string): Promise<Favorite> {
    const [favorite] = await db
      .insert(favorites)
      .values({ userId, courseId })
      .onConflictDoNothing()
      .returning();
    return favorite;
  }

  async removeFavorite(userId: string, courseId: string): Promise<void> {
    await db
      .delete(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.courseId, courseId)));
  }

  async getLibrary(
    userId: string,
    filters?: {
      levelIds?: string[];
      year?: number;
      minPrice?: number;
      maxPrice?: number;
      minRating?: number;
      author?: string;
      search?: string;
    }
  ): Promise<(Purchase & { course: Course })[]> {

    const results = await db
      .select()
      .from(purchases)
      .innerJoin(courses, eq(purchases.courseId, courses.id))
      .where(
        and(
          eq(purchases.userId, userId),
          eq(courses.hiddenInLibrary, false)
        )
      )
      .orderBy(desc(purchases.purchaseDate));

    let filteredResults = results.map((result) => ({
      ...result.purchases,
      course: result.courses,
    }));

    if (filters) {
      filteredResults = filteredResults.filter((item) => {
        const course = item.course;

        if (filters.levelIds && filters.levelIds.length > 0) {
          const courseLevel = course.level || [];
          const hasAllMatches = filters.levelIds.every(id => courseLevel.includes(id));
          if (!hasAllMatches) return false;
        }

        if (filters.year && course.year !== filters.year) return false;

        const price = parseFloat(course.price || "0");
        if (filters.minPrice !== undefined && price < filters.minPrice) return false;
        if (filters.maxPrice !== undefined && price > filters.maxPrice) return false;

        if (filters.author && course.authorName !== filters.author) return false;

        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          const titleMatch = course.title?.toLowerCase().includes(searchLower);
          const descMatch = course.description?.toLowerCase().includes(searchLower);
          const authorMatch = course.authorName?.toLowerCase().includes(searchLower);

          if (!titleMatch && !descMatch && !authorMatch) return false;
        }

        return true;
      });
    }

    // Attach subcategoryIds in one query (avoid N+1 requests from the client).
    if (filteredResults.length > 0) {
      const courseIds = filteredResults.map(r => r.course.id);
      const subcats = await db
        .select({
          courseId: courseSubcategories.courseId,
          subcategoryId: courseSubcategories.subcategoryId,
        })
        .from(courseSubcategories)
        .where(inArray(courseSubcategories.courseId, courseIds));

      const subcatsMap = new Map<string, string[]>();
      for (const row of subcats) {
        const arr = subcatsMap.get(row.courseId) ?? [];
        arr.push(row.subcategoryId);
        subcatsMap.set(row.courseId, arr);
      }

      return filteredResults.map(r => ({
        ...r,
        course: { ...r.course, subcategoryIds: subcatsMap.get(r.course.id) ?? [] },
      }));
    }

    return filteredResults;
  }

  async getReferralsByUser(userId: string): Promise<Referral[]> {
    return await db
      .select()
      .from(referrals)
      .where(eq(referrals.referrerId, userId))
      .orderBy(desc(referrals.createdAt));
  }

  async getReferralForUser(userId: string): Promise<Referral | undefined> {
    const [referral] = await db
      .select()
      .from(referrals)
      .where(eq(referrals.referredUserId, userId))
      .limit(1);
    return referral;
  }

  async getReferralStats(userId: string): Promise<{ count: number; totalEarnings: string }> {
    const results = await db
      .select({
        count: sql<number>`count(*)::int`,
        totalEarnings: sql<string>`coalesce(sum(${referrals.earnings}), 0)`,
      })
      .from(referrals)
      .where(eq(referrals.referrerId, userId));

    return {
      count: results[0]?.count || 0,
      totalEarnings: results[0]?.totalEarnings || "0",
    };
  }

  async getReferralDetails(userId: string, dateFrom?: Date, dateTo?: Date): Promise<Array<{
    referral: Referral;
    user: Pick<User, 'id' | 'email' | 'firstName' | 'lastName' | 'telegramUsername'>;
    topups: Array<{
      date: Date | null;
      amount: string;
      referralBonus: string;
    }>;
    totalTopups: string;
    totalReferralEarnings: string;
  }>> {

    const conditions = [eq(referrals.referrerId, userId)];


    if (dateFrom) {
      conditions.push(sql`${referrals.createdAt} >= ${dateFrom}`);
    }
    if (dateTo) {
      conditions.push(sql`${referrals.createdAt} <= ${dateTo}`);
    }


    const referralsList = await db
      .select({
        referral: referrals,
        user: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          telegramUsername: users.telegramUsername,
        },
      })
      .from(referrals)
      .innerJoin(users, eq(referrals.referredUserId, users.id))
      .where(and(...conditions))
      .orderBy(desc(referrals.createdAt));


    const detailsPromises = referralsList.map(async ({ referral, user }) => {

      const topupTransactions = await db
        .select()
        .from(balanceTransactions)
        .where(
          and(
            eq(balanceTransactions.userId, referral.referredUserId),
            eq(balanceTransactions.type, 'topup')
          )
        )
        .orderBy(desc(balanceTransactions.createdAt));


      const referralBonusTransactions = await db
        .select()
        .from(balanceTransactions)
        .where(
          and(
            eq(balanceTransactions.userId, userId),
            eq(balanceTransactions.type, 'referral')
          )
        )
        .orderBy(desc(balanceTransactions.createdAt));


      const topupsWithBonuses = topupTransactions.map(topup => {


        const topupAmount = parseFloat(topup.amount);

        const matchingBonus = referralBonusTransactions.find(bonus => {

          const match = bonus.description?.match(/(\d+\.?\d*)\s*₽/);
          if (match) {
            const descAmount = parseFloat(match[1]);

            const timeDiff = bonus.createdAt && topup.createdAt
              ? Math.abs(bonus.createdAt.getTime() - topup.createdAt.getTime())
              : Infinity;
            return Math.abs(descAmount - topupAmount) < 0.01 && timeDiff < 5000;
          }
          return false;
        });

        return {
          date: topup.createdAt,
          amount: topup.amount,
          referralBonus: matchingBonus?.amount || "0",
        };
      });


      const totalTopups = topupsWithBonuses.reduce(
        (sum, t) => sum + parseFloat(t.amount),
        0
      ).toString();

      const totalReferralEarnings = topupsWithBonuses.reduce(
        (sum, t) => sum + parseFloat(t.referralBonus),
        0
      ).toString();

      return {
        referral,
        user,
        topups: topupsWithBonuses,
        totalTopups,
        totalReferralEarnings,
      };
    });

    return await Promise.all(detailsPromises);
  }

  async createReferral(referralData: InsertReferral): Promise<Referral> {
    const [referral] = await db.insert(referrals).values(referralData).returning();
    return referral;
  }

  async updateReferralEarnings(referralId: string, amount: number): Promise<void> {
    await db
      .update(referrals)
      .set({
        earnings: sql`COALESCE(${referrals.earnings}, 0) + ${amount}`,
        status: 'active' as const,
      })
      .where(eq(referrals.id, referralId));
  }

  async getTasks(): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(eq(tasks.isActive, true))
      .orderBy(desc(tasks.createdAt));
  }

  async getTask(id: string): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async createTask(taskData: InsertTask): Promise<Task> {
    const [task] = await db.insert(tasks).values(taskData).returning();
    return task;
  }

  async getUserTasks(userId: string): Promise<UserTask[]> {
    return await db.select().from(userTasks).where(eq(userTasks.userId, userId));
  }

  async getUserTask(userId: string, taskId: string): Promise<UserTask | undefined> {
    const [userTask] = await db
      .select()
      .from(userTasks)
      .where(and(eq(userTasks.userId, userId), eq(userTasks.taskId, taskId)));
    return userTask;
  }

  async claimTask(userId: string, taskId: string, fantiksEarned: number): Promise<UserTask> {

    const userTask = await db.transaction(async (tx) => {

      const [newUserTask] = await tx
        .insert(userTasks)
        .values({
          userId,
          taskId,
          fantiksEarned,
          rewardClaimed: true,
        })
        .returning();


      await tx
        .update(users)
        .set({
          fantiks: sql`${users.fantiks} + ${fantiksEarned}`,
        })
        .where(eq(users.id, userId));


      const [task] = await tx.select().from(tasks).where(eq(tasks.id, taskId));


      await tx.insert(balanceTransactions).values({
        userId,
        amount: fantiksEarned.toString(),
        type: "fantiks",
        description: `Награда за выполнение задания: ${task?.title || 'Задание'}`,
      });

      return newUserTask;
    });

    return userTask;
  }

  async addBalanceTransaction(transactionData: InsertBalanceTransaction): Promise<BalanceTransaction> {
    const [transaction] = await db.insert(balanceTransactions).values(transactionData).returning();
    return transaction;
  }

  async updateUserBalance(userId: string, amount: number): Promise<void> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new Error("User not found");

    const currentBalance = parseFloat(user.balance);
    const newBalance = (currentBalance + amount).toFixed(2);

    await db
      .update(users)
      .set({ balance: newBalance, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async updateUserFantiks(userId: string, amount: number): Promise<void> {
    await db
      .update(users)
      .set({
        fantiks: sql`${users.fantiks} + ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async updateUserActivity(userId: string): Promise<void> {
    await db
      .update(users)
      .set({
        lastActivityAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async updateUserReferralBalance(userId: string, amount: number): Promise<void> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new Error("User not found");

    const currentBalance = parseFloat(user.referralBalance || '0');
    const newBalance = (currentBalance + amount).toFixed(2);

    await db
      .update(users)
      .set({ referralBalance: newBalance, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async withdrawReferralBalance(userId: string, amount: number): Promise<{ amount: string }> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new Error("User not found");

    const currentBalance = parseFloat(user.referralBalance || '0');

    if (amount > currentBalance) {
      throw new Error("Insufficient referral balance");
    }

    const newBalance = (currentBalance - amount).toFixed(2);


    await db
      .update(users)
      .set({ referralBalance: newBalance, updatedAt: new Date() })
      .where(eq(users.id, userId));


    await this.addBalanceTransaction({
      userId,
      amount: `-${amount.toFixed(2)}`,
      type: "referral_payout",
      description: `Вывод реферального баланса: ${amount.toFixed(2)} ₽`,
    });

    return { amount: amount.toFixed(2) };
  }

  async getBalanceTransactions(userId: string, type?: string): Promise<BalanceTransaction[]> {
    const conditions = [eq(balanceTransactions.userId, userId)];

    if (type) {
      conditions.push(eq(balanceTransactions.type, type));
    }

    return await db
      .select()
      .from(balanceTransactions)
      .where(and(...conditions))
      .orderBy(desc(balanceTransactions.createdAt));
  }

  async updateUserReferralPercent(userId: string, percent: number | null): Promise<User | undefined> {
    const result = await db
      .update(users)
      .set({ referralBonusPercent: percent, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return result[0] as User | undefined;
  }

  async getReviewsByCourse(courseId: string): Promise<(Review & { user: Pick<User, 'id' | 'firstName' | 'lastName' | 'profileImageUrl'> & { selectedAward: string | null } })[]> {
    const reviewsData = await db
      .select({
        review: reviews,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
          selectedAward: awards.imageUrl,
        },
      })
      .from(reviews)
      .leftJoin(users, eq(reviews.userId, users.id))
      .leftJoin(awards, eq(users.selectedAwardId, awards.id))
      .where(and(
        eq(reviews.courseId, courseId),
        eq(reviews.status, 'approved')
      ))
      .orderBy(desc(reviews.createdAt));

    return reviewsData.map(({ review, user }) => ({
      ...review,
      user: user as Pick<User, 'id' | 'firstName' | 'lastName' | 'profileImageUrl'> & { selectedAward: string | null },
    }));
  }

  async getUserReviewForCourse(userId: string, courseId: string): Promise<Review | undefined> {
    const [review] = await db
      .select()
      .from(reviews)
      .where(and(eq(reviews.userId, userId), eq(reviews.courseId, courseId)));
    return review;
  }

  async getReviewById(reviewId: string): Promise<Review | undefined> {
    const [review] = await db
      .select()
      .from(reviews)
      .where(eq(reviews.id, reviewId));
    return review;
  }

  async createReview(reviewData: InsertReview & { userId: string }): Promise<Review> {
    const [review] = await db.insert(reviews).values(reviewData).returning();

    if (review.status === 'approved') {
      await this.updateCourseRating(review.courseId);
    }
    return review;
  }

  async updateReview(reviewId: string, data: { rating?: number; comment?: string }): Promise<Review> {
    const [review] = await db
      .update(reviews)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(reviews.id, reviewId))
      .returning();

    if (review.status === 'approved') {
      await this.updateCourseRating(review.courseId);
    }
    return review;
  }

  async deleteReview(reviewId: string): Promise<void> {

    const review = await this.getReviewById(reviewId);
    await db.delete(reviews).where(eq(reviews.id, reviewId));

    if (review) {
      await this.updateCourseRating(review.courseId);
    }
  }

  async getCourseRatingStats(courseId: string): Promise<{ averageRating: number; totalReviews: number }> {
    const result = await db
      .select({
        avg: sql<number>`CAST(AVG(${reviews.rating}) AS FLOAT)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(reviews)
      .where(and(
        eq(reviews.courseId, courseId),
        eq(reviews.status, 'approved')
      ));

    return {
      averageRating: result[0]?.avg || 0,
      totalReviews: result[0]?.count || 0,
    };
  }

  async updateCourseRating(courseId: string): Promise<void> {
    const stats = await this.getCourseRatingStats(courseId);
    await db
      .update(courses)
      .set({
        rating: stats.averageRating.toFixed(2),
        reviewsCount: stats.totalReviews,
      })
      .where(eq(courses.id, courseId));
  }

  async addReviewVote(voteData: InsertReviewVote): Promise<ReviewVote> {
    const [vote] = await db.insert(reviewVotes).values(voteData).returning();


    try {
      const review = await this.getReviewById(voteData.reviewId);
      if (review && review.userId !== voteData.userId) {
        const course = await this.getCourse(review.courseId);
        if (course) {
          const voteText = voteData.voteType === 'like' ? 'положительную' : 'отрицательную';
          await this.createNotification({
            userId: review.userId,
            type: 'review_reaction',
            title: 'Новая реакция на ваш отзыв',
            message: `Кто-то оставил ${voteText} реакцию на ваш отзыв к курсу "${course.title}".`,
            isRead: false,
            relatedId: review.id,
            relatedType: 'review',
          });
        }
      }
    } catch (notificationError) {
      console.error("[REVIEWS] Failed to create vote notification:", notificationError);
    }

    return vote;
  }

  async removeReviewVote(reviewId: string, userId: string): Promise<void> {
    await db.delete(reviewVotes).where(
      and(
        eq(reviewVotes.reviewId, reviewId),
        eq(reviewVotes.userId, userId)
      )
    );
  }

  async getUserReviewVote(reviewId: string, userId: string): Promise<ReviewVote | undefined> {
    const [vote] = await db
      .select()
      .from(reviewVotes)
      .where(and(
        eq(reviewVotes.reviewId, reviewId),
        eq(reviewVotes.userId, userId)
      ));
    return vote;
  }

  async getReviewVotesCount(reviewId: string): Promise<{ likes: number; dislikes: number }> {
    const result = await db
      .select({
        voteType: reviewVotes.voteType,
        count: sql<number>`COUNT(*)`,
      })
      .from(reviewVotes)
      .where(eq(reviewVotes.reviewId, reviewId))
      .groupBy(reviewVotes.voteType);

    const likesCount = result.find(r => r.voteType === 'like')?.count || 0;
    const dislikesCount = result.find(r => r.voteType === 'dislike')?.count || 0;

    return {
      likes: Number(likesCount),
      dislikes: Number(dislikesCount),
    };
  }

  async moderateReview(reviewId: string, status: 'approved' | 'rejected', moderatorId: string, comment?: string): Promise<Review> {
    const [review] = await db
      .update(reviews)
      .set({
        status,
        moderatedBy: moderatorId,
        moderatedAt: new Date(),
        moderationComment: comment || null,
      })
      .where(eq(reviews.id, reviewId))
      .returning();


    await this.updateCourseRating(review.courseId);


    if (status === 'approved') {
      try {
        const course = await this.getCourse(review.courseId);
        if (course) {
          await this.createNotification({
            userId: review.userId,
            type: 'review_approved',
            title: '✅ Ваш отзыв одобрен!',
            message: `Ваш отзыв на курс "${course.title}" прошел модерацию и теперь виден всем пользователям.`,
            isRead: false,
            relatedId: review.id,
            relatedType: 'review',
          });
        }
      } catch (notificationError) {
        console.error("[REVIEWS] Failed to create notification:", notificationError);
      }
    }

    return review;
  }

  async getPendingReviews(): Promise<(Review & { user: Pick<User, 'id' | 'firstName' | 'lastName' | 'email'>; course: Pick<Course, 'id' | 'title'> })[]> {
    const reviewsData = await db
      .select({
        review: reviews,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
        course: {
          id: courses.id,
          title: courses.title,
        },
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.userId, users.id))
      .innerJoin(courses, eq(reviews.courseId, courses.id))
      .where(eq(reviews.status, 'pending'))
      .orderBy(desc(reviews.createdAt));

    return reviewsData.map(({ review, user, course }) => ({
      ...review,
      user: user as Pick<User, 'id' | 'firstName' | 'lastName' | 'email'>,
      course: course as Pick<Course, 'id' | 'title'>,
    }));
  }

  async updateReviewAdminComment(reviewId: string, adminComment: string | null): Promise<Review> {
    const [review] = await db
      .update(reviews)
      .set({ adminComment })
      .where(eq(reviews.id, reviewId))
      .returning();
    return review;
  }


  async getCourseSections(courseId: string): Promise<CourseSection[]> {
    return await db
      .select()
      .from(courseSections)
      .where(eq(courseSections.courseId, courseId))
      .orderBy(courseSections.order);
  }

  async createCourseSection(sectionData: InsertCourseSection): Promise<CourseSection> {
    const [section] = await db.insert(courseSections).values(sectionData).returning();
    return section;
  }

  async updateCourseSection(sectionId: string, data: Partial<InsertCourseSection>): Promise<CourseSection> {
    const [section] = await db
      .update(courseSections)
      .set(data)
      .where(eq(courseSections.id, sectionId))
      .returning();
    return section;
  }

  async deleteCourseSection(sectionId: string): Promise<void> {
    await db.delete(courseSections).where(eq(courseSections.id, sectionId));
  }


  async getLesson(lessonId: string): Promise<Lesson | undefined> {
    const [lesson] = await db
      .select()
      .from(lessons)
      .where(eq(lessons.id, lessonId));
    return lesson;
  }

  async getLessonsBySection(sectionId: string): Promise<Lesson[]> {
    return await db
      .select()
      .from(lessons)
      .where(eq(lessons.sectionId, sectionId))
      .orderBy(lessons.order);
  }

  async getAllLessonsWithVideos(): Promise<Lesson[]> {
    return await db
      .select()
      .from(lessons)
      .where(isNotNull(lessons.videoUrl));
  }

  async getFirstLessonWithVideo(courseId: string): Promise<Lesson | undefined> {

    const [firstLesson] = await db
      .select()
      .from(lessons)
      .innerJoin(courseSections, eq(lessons.sectionId, courseSections.id))
      .where(
        and(
          eq(courseSections.courseId, courseId),
          isNotNull(lessons.videoUrl),
          eq(lessons.processingStatus, 'ready')
        )
      )
      .orderBy(courseSections.order, lessons.order)
      .limit(1);

    return firstLesson?.lessons;
  }

  async createLesson(lessonData: InsertLesson): Promise<Lesson> {
    const [lesson] = await db.insert(lessons).values(lessonData).returning();
    return lesson;
  }

  async updateLesson(lessonId: string, data: Partial<InsertLesson>): Promise<Lesson> {

    const currentLesson = data.videoUrl !== undefined ? await this.getLesson(lessonId) : null;
    const oldVideoUrl = currentLesson?.videoUrl;


    const isVideoRemoval = data.videoUrl === null || data.videoUrl === '';



    const updateData: any = { ...data };
    if (isVideoRemoval) {
      updateData.videoUrl = sql`NULL`;
      updateData.duration = 0;
      updateData.processingStatus = 'draft';
      updateData.uploadProgress = sql`NULL`;
      updateData.errorMessage = sql`NULL`;
    }


    const [updated] = await db
      .update(lessons)
      .set(updateData)
      .where(eq(lessons.id, lessonId))
      .returning();



    const shouldDeleteOldVideo = oldVideoUrl &&
      data.videoUrl !== undefined &&
      (isVideoRemoval || oldVideoUrl !== data.videoUrl);

    if (shouldDeleteOldVideo) {
      try {
        const { ObjectStorageService } = await import('./objectStorage');
        const objectStorage = new ObjectStorageService();
        await objectStorage.deleteObjectEntity(oldVideoUrl);
        console.log('[Storage] Deleted old video:', oldVideoUrl);
      } catch (error) {

        console.error('[Storage] Failed to delete old video (non-fatal):', error);
      }
    }

    return updated;
  }

  async deleteLesson(lessonId: string): Promise<void> {

    const lesson = await this.getLesson(lessonId);


    if (lesson?.videoUrl) {
      const { ObjectStorageService } = await import('./objectStorage');
      const objectStorage = new ObjectStorageService();
      await objectStorage.deleteObjectEntity(lesson.videoUrl);
    }

    await db.delete(lessons).where(eq(lessons.id, lessonId));
  }

  async getSectionById(sectionId: string): Promise<CourseSection | undefined> {
    const [section] = await db
      .select()
      .from(courseSections)
      .where(eq(courseSections.id, sectionId));
    return section;
  }

  async getLessonByVideoUrl(videoUrl: string): Promise<Lesson | undefined> {
    const [lesson] = await db
      .select()
      .from(lessons)
      .where(eq(lessons.videoUrl, videoUrl));
    return lesson;
  }

  async getCourseFileByUrl(fileUrl: string): Promise<CourseFile | undefined> {
    const [file] = await db
      .select()
      .from(courseFiles)
      .where(eq(courseFiles.fileUrl, fileUrl));
    return file;
  }


  async getUserProgress(userId: string, courseId: string): Promise<{ sections: (CourseSection & { lessons: (Lesson & { progress?: LessonProgress })[] })[], completionPercentage: number }> {

    const sectionsData = await this.getCourseSections(courseId);


    const sectionsWithLessons = await Promise.all(
      sectionsData.map(async (section) => {
        const lessonsData = await db
          .select({
            lesson: {
              id: lessons.id,
              sectionId: lessons.sectionId,
              title: lessons.title,
              description: lessons.description,
              videoUrl: lessons.videoUrl,
              order: lessons.order,
              duration: lessons.duration,
              processingStatus: lessons.processingStatus,
              uploadProgress: lessons.uploadProgress,
              errorMessage: lessons.errorMessage,
              uploadedBy: lessons.uploadedBy,
              createdAt: lessons.createdAt,
              conversionProgress: lessons.conversionProgress,
            },
            progress: lessonProgress
          })
          .from(lessons)
          .leftJoin(
            lessonProgress,
            and(
              eq(lessons.id, lessonProgress.lessonId),
              eq(lessonProgress.userId, userId)
            )
          )
          .where(eq(lessons.sectionId, section.id))
          .orderBy(lessons.order);

        const lessonsWithProgress = lessonsData.map(({ lesson, progress }) => ({
          ...lesson,
          progress: progress || undefined,
          conversionProgress: lesson.conversionProgress ?? 0
        }));

        return {
          ...section,
          lessons: lessonsWithProgress,
        };
      })
    );


    const totalLessons = sectionsWithLessons.reduce((acc, section) => acc + section.lessons.length, 0);
    const completedLessons = sectionsWithLessons.reduce(
      (acc, section) => acc + section.lessons.filter(l => l.progress?.completed).length,
      0
    );
    const completionPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    return {
      sections: sectionsWithLessons,
      completionPercentage,
    };
  }

  async updateLessonProgress(
    userId: string,
    lessonId: string,
    completed: boolean,
    watchedSeconds?: number,
    lastWatchedSeconds?: number
  ): Promise<LessonProgress> {
    const updateData: any = {
      completed,
      completedAt: completed ? new Date() : null,
      lastAccessedAt: new Date()
    }

    if (watchedSeconds !== undefined) {
      updateData.watchedSeconds = sql`${lessonProgress.watchedSeconds} + ${watchedSeconds}`
    }

    if (lastWatchedSeconds !== undefined) {
      updateData.lastWatchedSeconds = lastWatchedSeconds
    }

    const [progress] = await db
      .insert(lessonProgress)
      .values({
        userId,
        lessonId,
        completed,
        completedAt: completed ? new Date() : undefined,
        watchedSeconds: watchedSeconds ?? 0,
        lastWatchedSeconds: lastWatchedSeconds ?? 0
      })
      .onConflictDoUpdate({
        target: [lessonProgress.userId, lessonProgress.lessonId],
        set: updateData
      })
      .returning()

    return progress
  }

  async getCourseProgress(userId: string, courseId: string): Promise<{ completed: number, total: number, percentage: number }> {

    const sectionsData = await this.getCourseSections(courseId);


    const allLessons = await Promise.all(
      sectionsData.map(section => this.getLessonsBySection(section.id))
    );
    const flatLessons = allLessons.flat();
    const total = flatLessons.length;

    if (total === 0) {
      return { completed: 0, total: 0, percentage: 0 };
    }


    const lessonIds = flatLessons.map(l => l.id);
    const progressRecords = await db
      .select()
      .from(lessonProgress)
      .where(
        and(
          eq(lessonProgress.userId, userId),
          sql`${lessonProgress.lessonId} IN (${sql.raw(lessonIds.map(() => '?').join(','))})`,
        )
      );

    const completed = progressRecords.filter(p => p.completed).length;
    const percentage = Math.round((completed / total) * 100);

    return { completed, total, percentage };
  }

  async setLastViewedLesson(userId: string, courseId: string, lessonId: string) {
    await db
      .update(users)
      .set({
        lastViewedLessonId: lessonId,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
  }

  async getAdminStats(): Promise<{ totalUsers: number; totalCourses: number; totalPurchases: number; totalRevenue: string }> {
    const [userCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(users);
    const [courseCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(courses);
    const [purchaseCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(purchases);
    const [revenueResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(CAST(${purchases.price} AS DECIMAL)), 0)` })
      .from(purchases);

    return {
      totalUsers: userCount.count,
      totalCourses: courseCount.count,
      totalPurchases: purchaseCount.count,
      totalRevenue: revenueResult.total || '0',
    };
  }

  async getAllUsers(): Promise<User[]> {
    const result = await db.select().from(users).orderBy(desc(users.createdAt));
    return result as User[];
  }

  async getUsersAnalytics(): Promise<Array<{
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    telegramUsername: string | null;
    balance: string;
    referralBalance: string;
    isOnline: boolean;
    lastActivityAt: Date | null;
    coursesPurchased: number;
    totalPurchaseAmount: string;
    totalWatchTimeMinutes: number;
    createdAt: Date | null;
  }>> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);


    const usersData = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        telegramUsername: users.telegramUsername,
        balance: users.balance,
        referralBalance: users.referralBalance,
        lastActivityAt: users.lastActivityAt,
        createdAt: users.createdAt,
        coursesPurchased: sql<string>`COUNT(DISTINCT ${purchases.id})::text`,
        totalPurchaseAmount: sql<string>`(
          SELECT COALESCE(SUM(CAST(price AS DECIMAL)), 0)
          FROM ${purchases}
          WHERE ${purchases.userId} = ${users.id}
        )`,
        totalWatchSeconds: sql<string>`(
          SELECT COALESCE(SUM(watched_seconds), 0)::text
          FROM ${lessonProgress} 
          WHERE ${lessonProgress.userId} = ${users.id}
        )`,
      })
      .from(users)
      .leftJoin(purchases, eq(purchases.userId, users.id))
      .groupBy(users.id)
      .orderBy(desc(users.createdAt));

    return usersData.map(user => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      telegramUsername: user.telegramUsername,
      balance: user.balance,
      referralBalance: user.referralBalance,
      isOnline: user.lastActivityAt ? user.lastActivityAt > fiveMinutesAgo : false,
      lastActivityAt: user.lastActivityAt,
      coursesPurchased: Number(user.coursesPurchased),
      totalPurchaseAmount: user.totalPurchaseAmount,
      totalWatchTimeMinutes: Math.round(Number(user.totalWatchSeconds) / 60),
      createdAt: user.createdAt,
    }));
  }

  async getPlatformStats(): Promise<{
    totalUsers: number;
    usersOnline: number;
    totalRevenue: string;
    totalCourses: number;
    totalPurchases: number;
    totalWatchTimeMinutes: number;
    usersWithTelegram: number;
  }> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);


    const result = await db.execute<{
      total_users: string;
      users_online: string;
      total_courses: string;
      total_purchases: string;
      total_revenue: string;
      total_watch_seconds: string;
      users_with_telegram: string;
    }>(sql`
      SELECT
        (SELECT COUNT(*)::text FROM ${users}) as total_users,
        (SELECT COUNT(*)::text FROM ${users} WHERE ${users.lastActivityAt} > ${fiveMinutesAgo}) as users_online,
        (SELECT COUNT(*)::text FROM ${courses}) as total_courses,
        (SELECT COUNT(*)::text FROM ${purchases}) as total_purchases,
        (SELECT COALESCE(SUM(CAST(price AS DECIMAL)), 0)::text FROM ${purchases}) as total_revenue,
        (SELECT COALESCE(SUM(watched_seconds), 0)::text FROM ${lessonProgress}) as total_watch_seconds,
        (SELECT COUNT(*)::text FROM ${users} WHERE ${users.telegramChatId} IS NOT NULL) as users_with_telegram
    `);

    const stats = result.rows[0];

    return {
      totalUsers: Number(stats.total_users),
      usersOnline: Number(stats.users_online),
      totalRevenue: stats.total_revenue || '0',
      totalCourses: Number(stats.total_courses),
      totalPurchases: Number(stats.total_purchases),
      totalWatchTimeMinutes: Math.round(Number(stats.total_watch_seconds) / 60),
      usersWithTelegram: Number(stats.users_with_telegram),
    };
  }

  async updateUserAdmin(userId: string, isAdmin: boolean): Promise<User | undefined> {
    const result = await db.update(users).set({ isAdmin, updatedAt: new Date() }).where(eq(users.id, userId)).returning();
    return result[0] as User | undefined;
  }

  async updateUserBlocked(userId: string, isBlocked: boolean): Promise<User | undefined> {
    const result = await db.update(users).set({ isBlocked, updatedAt: new Date() }).where(eq(users.id, userId)).returning();
    return result[0] as User | undefined;
  }

  async addUserBalance(userId: string, amount: number): Promise<User | undefined> {
    const result = await db.update(users).set({
      balance: sql`${users.balance} + ${amount}`,
      updatedAt: new Date()
    }).where(eq(users.id, userId)).returning();
    return result[0] as User | undefined;
  }

  async addBalanceToAllUsers(amount: number): Promise<number> {
    const result = await db.update(users).set({
      balance: sql`${users.balance} + ${amount}`,
      updatedAt: new Date()
    });
    return result.rowCount || 0;
  }



  async getSiteSettings(): Promise<SiteSettings | undefined> {
    const [settings] = await db.select().from(siteSettings).orderBy(desc(siteSettings.updatedAt)).limit(1);
    return settings;
  }

  async updateSiteSettings(data: Partial<InsertSiteSettings>): Promise<SiteSettings> {

    const existing = await this.getSiteSettings();

    if (!existing) {
      throw new Error("Site settings not found. Please run seed script to initialize settings.");
    }


    const [updated] = await db
      .update(siteSettings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(siteSettings.id, existing.id))
      .returning();

    return updated;
  }

  async getVipPageContent(): Promise<VipPageContent | undefined> {
    const [content] = await db.select().from(vipPageContent).orderBy(desc(vipPageContent.updatedAt)).limit(1);
    return content;
  }

  async updateVipPageContent(data: Partial<InsertVipPageContent>): Promise<VipPageContent> {
    const existing = await this.getVipPageContent();

    if (!existing) {

      const [created] = await db
        .insert(vipPageContent)
        .values({
          pageTitle: data.pageTitle ?? "VIP Подписки",
          pageSubtitle: data.pageSubtitle ?? "Выберите подходящий тариф и получите эксклюзивный доступ к курсам, персональной поддержке и закрытым материалам для успешного обучения",
        })
        .returning();
      return created;
    }

    const [updated] = await db
      .update(vipPageContent)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(vipPageContent.id, existing.id))
      .returning();

    return updated;
  }

  async getVipTiers(): Promise<VipTier[]> {
    return await db.select().from(vipTiers).orderBy(vipTiers.displayOrder);
  }

  async updateVipTier(tier: string, data: Partial<InsertVipTier>): Promise<VipTier> {
    const [updated] = await db
      .update(vipTiers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(vipTiers.tier, tier))
      .returning();

    if (!updated) {
      throw new Error(`VIP tier ${tier} not found`);
    }

    return updated;
  }

  async getCategories(parentId?: string | null): Promise<Category[]> {

    const baseQuery = db
      .select({
        ...getTableColumns(categories),
        clickCount: sql<number>`CAST(COUNT(DISTINCT ${filterClicks.id}) AS INTEGER)`.as('click_count')
      })
      .from(categories)
      .leftJoin(
        filterClicks,
        and(
          eq(filterClicks.filterType, 'category'),
          eq(filterClicks.filterId, categories.id)
        )
      )
      .$dynamic();

    if (parentId === null) {

      const result = await baseQuery
        .where(isNull(categories.parentId))
        .groupBy(categories.id)
        .orderBy(desc(sql`click_count`));
      return result.map(({ clickCount, ...category }) => category);
    } else if (parentId) {

      const result = await baseQuery
        .where(eq(categories.parentId, parentId))
        .groupBy(categories.id)
        .orderBy(desc(sql`click_count`));
      return result.map(({ clickCount, ...category }) => category);
    }

    const result = await baseQuery
      .groupBy(categories.id)
      .orderBy(desc(sql`click_count`));
    return result.map(({ clickCount, ...category }) => category);
  }

  async getCategory(id: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category;
  }

  async createCategory(category: InsertCategory & { slug: string; displayOrder?: number }): Promise<Category> {
    const [created] = await db.insert(categories).values([category]).returning();
    return created;
  }

  async updateCategory(id: string, data: Partial<InsertCategory>): Promise<Category> {
    const [updated] = await db
      .update(categories)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning();
    return updated;
  }

  async getCategoryDeletionInfo(id: string): Promise<{ categoryCount: number; courseCount: number; childCategories: string[]; courses: string[] }> {

    const getAllChildIds = async (parentId: string): Promise<string[]> => {
      const children = await db
        .select()
        .from(categories)
        .where(eq(categories.parentId, parentId));

      let allIds = [parentId];
      for (const child of children) {
        const childIds = await getAllChildIds(child.id);
        allIds = [...allIds, ...childIds];
      }
      return allIds;
    };

    const categoryIds = await getAllChildIds(id);


    const categoriesData = await db
      .select({ name: categories.name })
      .from(categories)
      .where(inArray(categories.id, categoryIds));


    const subcategoriesData = await db
      .select()
      .from(subcategories)
      .where(inArray(subcategories.categoryId, categoryIds));

    const subcategoryIds = subcategoriesData.map(s => s.id);


    let coursesData: { courseId: string; title: string }[] = [];
    if (subcategoryIds.length > 0) {
      coursesData = await db
        .select({
          courseId: courseSubcategories.courseId,
          title: courses.title
        })
        .from(courseSubcategories)
        .innerJoin(courses, eq(courses.id, courseSubcategories.courseId))
        .where(inArray(courseSubcategories.subcategoryId, subcategoryIds))
        .groupBy(courseSubcategories.courseId, courses.title);
    }

    return {
      categoryCount: categoryIds.length,
      courseCount: coursesData.length,
      childCategories: categoriesData.map(c => c.name),
      courses: coursesData.map(c => c.title)
    };
  }

  async deleteCategory(id: string): Promise<void> {
    console.log(`[DELETE CATEGORY] Начато удаление категории ID: ${id}`);

    const getAllChildIds = async (parentId: string): Promise<string[]> => {
      console.log(`[DELETE CATEGORY] Поиск дочерних категорий для parentId: ${parentId}`);
      const children = await db
        .select()
        .from(categories)
        .where(eq(categories.parentId, parentId));

      let allIds = [parentId];
      for (const child of children) {
        console.log(`[DELETE CATEGORY] Найдена дочерняя категория: ${child.id} (${child.name})`);
        const childIds = await getAllChildIds(child.id);
        allIds = [...allIds, ...childIds];
      }
      return allIds;
    };

    const categoryIds = await getAllChildIds(id);
    console.log(`[DELETE CATEGORY] Всего категорий для обработки: ${categoryIds.length} (IDs: ${categoryIds.join(', ')})`);

    const subcategoriesData = await db
      .select()
      .from(subcategories)
      .where(inArray(subcategories.categoryId, categoryIds));

    console.log(`[DELETE CATEGORY] Найдено подкатегорий: ${subcategoriesData.length}`);
    const subcategoryIds = subcategoriesData.map(s => s.id);

    if (subcategoryIds.length > 0) {
      console.log(`[DELETE CATEGORY] Подкатегории для проверки курсов: ${subcategoryIds.join(', ')}`);

      const coursesData = await db
        .select({ courseId: courseSubcategories.courseId })
        .from(courseSubcategories)
        .where(inArray(courseSubcategories.subcategoryId, subcategoryIds))
        .groupBy(courseSubcategories.courseId);

      console.log(`[DELETE CATEGORY] Найдено курсов для удаления: ${coursesData.length}`);
      for (const { courseId } of coursesData) {
        console.log(`[DELETE CATEGORY] Удаляется курс ID: ${courseId}`);
        await this.deleteCourse(courseId);
        console.log(`[DELETE CATEGORY] Курс ${courseId} успешно удалён`);
      }
    } else {
      console.log(`[DELETE CATEGORY] Подкатегорий не найдено — курсы удалять не нужно`);
    }

    console.log(`[DELETE CATEGORY] Выполняется DELETE FROM categories WHERE id = ${id}`);
    await db.delete(categories).where(eq(categories.id, id));
    console.log(`[DELETE CATEGORY] Категория ${id} успешно удалена из БД`);
  }

  async getSubcategories(categoryId?: string): Promise<Subcategory[]> {

    const baseQuery = db
      .select({
        ...getTableColumns(subcategories),
        clickCount: sql<number>`CAST(COUNT(DISTINCT ${filterClicks.id}) AS INTEGER)`.as('click_count')
      })
      .from(subcategories)
      .leftJoin(
        filterClicks,
        and(
          eq(filterClicks.filterType, 'subcategory'),
          eq(filterClicks.filterId, subcategories.id)
        )
      )
      .$dynamic();

    if (categoryId) {
      const result = await baseQuery
        .where(eq(subcategories.categoryId, categoryId))
        .groupBy(subcategories.id)
        .orderBy(desc(sql`click_count`));
      return result.map(({ clickCount, ...subcategory }) => subcategory);
    }

    const result = await baseQuery
      .groupBy(subcategories.id)
      .orderBy(desc(sql`click_count`));
    return result.map(({ clickCount, ...subcategory }) => subcategory);
  }

  async getSubcategory(id: string): Promise<Subcategory | undefined> {
    const [row] = await db
      .select()
      .from(subcategories)
      .where(eq(subcategories.id, id));
    return row;
  }

  async createSubcategory(subcategory: InsertSubcategory & { slug: string; displayOrder?: number }): Promise<Subcategory> {
    const [created] = await db.insert(subcategories).values(subcategory).returning();
    return created;
  }

  async updateSubcategory(id: string, data: Partial<InsertSubcategory>): Promise<Subcategory> {
    const [updated] = await db
      .update(subcategories)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(subcategories.id, id))
      .returning();
    return updated;
  }

  async deleteSubcategory(id: string): Promise<void> {
    await db.delete(subcategories).where(eq(subcategories.id, id));
  }

  async getMenuItems(): Promise<MenuItem[]> {
    return await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.isActive, true))
      .orderBy(menuItems.displayOrder);
  }

  async createMenuItem(menuItem: InsertMenuItem): Promise<MenuItem> {
    const [created] = await db.insert(menuItems).values(menuItem).returning();
    return created;
  }

  async updateMenuItem(id: string, data: Partial<InsertMenuItem>): Promise<MenuItem> {
    const [updated] = await db
      .update(menuItems)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(menuItems.id, id))
      .returning();
    return updated;
  }

  async deleteMenuItem(id: string): Promise<void> {
    await db.delete(menuItems).where(eq(menuItems.id, id));
  }

  async getInfoBanners(): Promise<InfoBanner[]> {
    return await db
      .select()
      .from(infoBanners)
      .where(eq(infoBanners.isActive, true))
      .orderBy(infoBanners.displayOrder);
  }

  async getAllInfoBanners(): Promise<InfoBanner[]> {
    return await db
      .select()
      .from(infoBanners)
      .orderBy(infoBanners.displayOrder);
  }

  async createInfoBanner(banner: InsertInfoBanner): Promise<InfoBanner> {
    const [created] = await db.insert(infoBanners).values(banner).returning();
    return created;
  }

  async updateInfoBanner(id: string, data: Partial<InsertInfoBanner>): Promise<InfoBanner> {
    const [updated] = await db
      .update(infoBanners)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(infoBanners.id, id))
      .returning();
    return updated;
  }

  async deleteInfoBanner(id: string): Promise<void> {
    await db.delete(infoBanners).where(eq(infoBanners.id, id));
  }

  async getCourseFiles(courseId: string, lessonId?: string): Promise<CourseFile[]> {
    if (lessonId) {
      return await db
        .select()
        .from(courseFiles)
        .where(and(eq(courseFiles.courseId, courseId), eq(courseFiles.lessonId, lessonId)))
        .orderBy(courseFiles.displayOrder);
    }
    return await db
      .select()
      .from(courseFiles)
      .where(eq(courseFiles.courseId, courseId))
      .orderBy(courseFiles.displayOrder);
  }

  async createCourseFile(courseFile: InsertCourseFile): Promise<CourseFile> {
    const [created] = await db.insert(courseFiles).values(courseFile).returning();
    return created;
  }

  async deleteCourseFile(id: string): Promise<void> {

    const [file] = await db
      .select()
      .from(courseFiles)
      .where(eq(courseFiles.id, id));


    if (file?.fileUrl) {
      const { ObjectStorageService } = await import('./objectStorage');
      const objectStorage = new ObjectStorageService();
      await objectStorage.deleteObjectEntity(file.fileUrl);
    }

    await db.delete(courseFiles).where(eq(courseFiles.id, id));
  }


  async getCoursePackages(categoryId?: string | null, parentId?: string | null): Promise<(CoursePackage & { courses: Course[]; totalPrice: number; discountedPrice: number })[]> {
    let whereCondition = eq(coursePackages.isActive, true)

    let categoryWhere: SQL | undefined

    if (categoryId) {
      const [categoryInfo] = await db
        .select({ parentId: categories.parentId })
        .from(categories)
        .where(eq(categories.id, categoryId))

      const catParentId = categoryInfo?.parentId

      categoryWhere = or(
        sql`${categoryId} = ANY(${coursePackages.categoryIds})`,
        catParentId ? sql`${catParentId} = ANY(${coursePackages.categoryIds})` : sql`false`
      )
    } else if (parentId) {
      const childCategories = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.parentId, parentId))

      const childIds = childCategories.map(c => c.id)
      const targetIds = [...childIds, parentId]

      if (targetIds.length > 0) {
        categoryWhere = arrayOverlaps(coursePackages.categoryIds, targetIds)
      }
    }

    const emptyCondition = sql`cardinality(${coursePackages.categoryIds}) = 0`

    if (categoryId || parentId) {
      if (categoryWhere) {
        whereCondition = and(whereCondition, categoryWhere)
      }
      whereCondition = or(whereCondition, emptyCondition)
    } else {
      whereCondition = and(whereCondition, emptyCondition)
    }

    const packagesWithCourses = await db
      .select({
        package: getTableColumns(coursePackages),
        course: getTableColumns(courses),
        displayOrder: packageCourses.displayOrder,
      })
      .from(coursePackages)
      .leftJoin(packageCourses, eq(packageCourses.packageId, coursePackages.id))
      .leftJoin(courses, eq(courses.id, packageCourses.courseId))
      .where(whereCondition)
      .orderBy(coursePackages.displayOrder, packageCourses.displayOrder)

    const packagesMap = new Map<string, CoursePackage & { courses: Course[] }>()

    for (const row of packagesWithCourses) {
      if (!packagesMap.has(row.package.id)) {
        packagesMap.set(row.package.id, {
          ...row.package,
          courses: [],
        })
      }

      if (row.course) {
        packagesMap.get(row.package.id)!.courses.push(row.course)
      }
    }

    return Array.from(packagesMap.values()).map((pkg) => {
      const totalPrice = pkg.courses.reduce((sum, course) => {
        return sum + parseFloat(course.price || '0')
      }, 0)
      const discount = pkg.discount || 0
      const discountedPrice = totalPrice * (1 - discount / 100)

      return {
        ...pkg,
        totalPrice,
        discountedPrice,
      }
    })
  }

  async getCoursePackage(id: string): Promise<(CoursePackage & { courses: Course[]; totalPrice: number; discountedPrice: number }) | undefined> {
    const [pkg] = await db
      .select()
      .from(coursePackages)
      .where(eq(coursePackages.id, id));

    if (!pkg) return undefined;

    const courses = await this.getPackageCourses(pkg.id);
    const totalPrice = courses.reduce((sum, course) => {
      return sum + parseFloat(course.price || '0');
    }, 0);
    const discount = pkg.discount || 0;
    const discountedPrice = totalPrice * (1 - discount / 100);

    return {
      ...pkg,
      courses,
      totalPrice,
      discountedPrice,
    };
  }

  async createCoursePackage(packageData: InsertCoursePackage): Promise<CoursePackage> {
    const [created] = await db
      .insert(coursePackages)
      .values(packageData)
      .returning();
    return created;
  }

  async updateCoursePackage(id: string, data: Partial<InsertCoursePackage>): Promise<CoursePackage> {
    const [updated] = await db
      .update(coursePackages)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(coursePackages.id, id))
      .returning();
    return updated;
  }

  async deleteCoursePackage(id: string): Promise<void> {

    const [pkg] = await db
      .select()
      .from(coursePackages)
      .where(eq(coursePackages.id, id));


    if (pkg?.thumbnailUrl) {
      const { ObjectStorageService } = await import('./objectStorage');
      const objectStorage = new ObjectStorageService();
      await objectStorage.deleteObjectEntity(pkg.thumbnailUrl);
    }

    await db.delete(coursePackages).where(eq(coursePackages.id, id));
  }

  async addCourseToPackage(packageId: string, courseId: string, displayOrder = 0): Promise<PackageCourse> {
    const [created] = await db
      .insert(packageCourses)
      .values({ packageId, courseId, displayOrder })
      .returning();
    return created;
  }

  async removeCourseFromPackage(packageId: string, courseId: string): Promise<void> {
    await db
      .delete(packageCourses)
      .where(
        and(
          eq(packageCourses.packageId, packageId),
          eq(packageCourses.courseId, courseId)
        )
      );
  }

  async getPackageCourses(packageId: string): Promise<Course[]> {
    const results = await db
      .select({
        course: getTableColumns(courses),
      })
      .from(packageCourses)
      .innerJoin(courses, eq(packageCourses.courseId, courses.id))
      .where(eq(packageCourses.packageId, packageId))
      .orderBy(packageCourses.displayOrder);

    const coursesData = results.map((r) => r.course);

    // Attach subcategoryIds in one query (avoid N+1 requests from the client).
    if (coursesData.length > 0) {
      const courseIds = coursesData.map(c => c.id);
      const subcats = await db
        .select({
          courseId: courseSubcategories.courseId,
          subcategoryId: courseSubcategories.subcategoryId,
        })
        .from(courseSubcategories)
        .where(inArray(courseSubcategories.courseId, courseIds));

      const subcatsMap = new Map<string, string[]>();
      for (const row of subcats) {
        const arr = subcatsMap.get(row.courseId) ?? [];
        arr.push(row.subcategoryId);
        subcatsMap.set(row.courseId, arr);
      }

      return coursesData.map(c => ({
        ...c,
        subcategoryIds: subcatsMap.get(c.id) ?? [],
      }));
    }

    return coursesData;
  }

  async getAllCoursePackages(): Promise<(CoursePackage & { courses: Course[]; totalPrice: number; discountedPrice: number; purchaseCount?: number })[]> {
    const packages = await db
      .select()
      .from(coursePackages)
      .orderBy(coursePackages.displayOrder);

    const result = await Promise.all(
      packages.map(async (pkg) => {
        const courses = await this.getPackageCourses(pkg.id);
        const totalPrice = courses.reduce((sum, course) => {
          return sum + parseFloat(course.price || '0');
        }, 0);
        const discount = pkg.discount || 0;
        const discountedPrice = totalPrice * (1 - discount / 100);


        const packageCourseIds = courses.map(c => c.id);
        let purchaseCount = 0;

        if (packageCourseIds.length > 0) {

          const packagePurchases = await db
            .select()
            .from(balanceTransactions)
            .where(
              and(
                eq(balanceTransactions.type, 'purchase'),
                sql`${balanceTransactions.description} LIKE ${`%${pkg.name}%`}`
              )
            );
          purchaseCount = packagePurchases.length;
        }

        return {
          ...pkg,
          courses,
          totalPrice,
          discountedPrice,
          purchaseCount,
        };
      })
    );

    return result;
  }

  async updateCourseOrderInPackage(packageId: string, courseId: string, displayOrder: number): Promise<void> {
    await db
      .update(packageCourses)
      .set({ displayOrder })
      .where(
        and(
          eq(packageCourses.packageId, packageId),
          eq(packageCourses.courseId, courseId)
        )
      );
  }

  async getPackagesByCourse(courseId: string): Promise<(CoursePackage & { totalPrice: number; discountedPrice: number; courseCount: number })[]> {

    const packageIds = await db
      .select({ packageId: packageCourses.packageId })
      .from(packageCourses)
      .where(eq(packageCourses.courseId, courseId));

    if (packageIds.length === 0) {
      return [];
    }


    const packages = await db
      .select()
      .from(coursePackages)
      .where(
        and(
          inArray(coursePackages.id, packageIds.map(p => p.packageId)),
          eq(coursePackages.isActive, true)
        )
      )
      .orderBy(coursePackages.displayOrder);


    const result = await Promise.all(
      packages.map(async (pkg) => {
        const courses = await this.getPackageCourses(pkg.id);
        const totalPrice = courses.reduce((sum, course) => {
          return sum + parseFloat(course.price || '0');
        }, 0);
        const discount = pkg.discount || 0;
        const discountedPrice = totalPrice * (1 - discount / 100);
        const courseCount = courses.length;

        return {
          ...pkg,
          totalPrice,
          discountedPrice,
          courseCount,
        };
      })
    );

    return result;
  }

  async getLandingContent(): Promise<LandingContent | undefined> {
    const [content] = await db
      .select()
      .from(landingContent)
      .limit(1);

    return content;
  }

  async updateLandingContent(data: Partial<InsertLandingContent>): Promise<LandingContent> {

    const existing = await this.getLandingContent();

    if (!existing) {

      const [newContent] = await db
        .insert(landingContent)
        .values({} as any)
        .returning();
      return newContent;
    }


    const updateData: any = {
      ...data,
      updatedAt: new Date(),
    };

    const [updated] = await db
      .update(landingContent)
      .set(updateData)
      .where(eq(landingContent.id, existing.id))
      .returning();

    return updated;
  }

  async getTradeInContent(): Promise<TradeInPageContent | undefined> {
    const [content] = await db
      .select()
      .from(tradeInPageContent)
      .limit(1);

    return content;
  }

  async updateTradeInContent(data: Partial<InsertTradeInPageContent>): Promise<TradeInPageContent> {

    const existing = await this.getTradeInContent();

    if (!existing) {

      const [newContent] = await db
        .insert(tradeInPageContent)
        .values({} as any)
        .returning();
      return newContent;
    }


    const updateData: any = {
      ...data,
      updatedAt: new Date(),
    };

    const [updated] = await db
      .update(tradeInPageContent)
      .set(updateData)
      .where(eq(tradeInPageContent.id, existing.id))
      .returning();

    return updated;
  }


  async trackCourseView(courseId: string, userId?: string | null): Promise<void> {
    await db.insert(courseViews).values({
      courseId,
      userId: userId || null,
    });
  }

  async getRevenueByDay(days: number): Promise<Array<{ date: string; revenue: string; purchases: number }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const results = await db
      .select({
        date: sql<string>`DATE(${purchases.purchaseDate})::text`,
        revenue: sql<string>`COALESCE(SUM(CAST(${purchases.price} AS DECIMAL)), 0)`,
        purchaseCount: sql<string>`COUNT(*)::text`,
      })
      .from(purchases)
      .where(gte(purchases.purchaseDate, startDate))
      .groupBy(sql`DATE(${purchases.purchaseDate})`)
      .orderBy(sql`DATE(${purchases.purchaseDate})`);

    return results.map(r => ({
      date: r.date,
      revenue: r.revenue,
      purchases: Number(r.purchaseCount),
    }));
  }

  async getTopCoursesByMetric(limit: number = 10): Promise<Array<{
    id: string;
    title: string;
    views: number;
    purchases: number;
    revenue: string;
    conversionRate: number;
    completionRate: number;
    avgWatchTime: number;
  }>> {
    const coursesData = await db
      .select({
        id: courses.id,
        title: courses.title,
        uniqueViewers: sql<string>`COUNT(DISTINCT CASE WHEN ${courseViews.userId} IS NOT NULL THEN ${courseViews.userId} END)::text`,
        totalViewRecords: sql<string>`COUNT(DISTINCT ${courseViews.id})::text`,
        purchases: sql<string>`(SELECT COUNT(*) FROM ${purchases} WHERE ${purchases.courseId} = ${courses.id})::text`,
        revenue: sql<string>`(SELECT COALESCE(SUM(CAST(price AS DECIMAL)), 0) FROM ${purchases} WHERE ${purchases.courseId} = ${courses.id})`,
      })
      .from(courses)
      .leftJoin(courseViews, eq(courseViews.courseId, courses.id))
      .groupBy(courses.id, courses.title)
      .orderBy(desc(sql`(SELECT COUNT(*) FROM ${purchases} WHERE ${purchases.courseId} = ${courses.id})`))
      .limit(limit);

    if (coursesData.length === 0) {
      return [];
    }

    const courseIds = coursesData.map(c => c.id);


    const allSections = await db
      .select({
        id: courseSections.id,
        courseId: courseSections.courseId,
      })
      .from(courseSections)
      .where(inArray(courseSections.courseId, courseIds));


    const courseSectionsMap = new Map<string, string[]>();
    for (const section of allSections) {
      if (!courseSectionsMap.has(section.courseId)) {
        courseSectionsMap.set(section.courseId, []);
      }
      courseSectionsMap.get(section.courseId)!.push(section.id);
    }

    const allSectionIds = allSections.map(s => s.id);


    const lessonCounts = allSectionIds.length > 0
      ? await db
        .select({
          sectionId: lessons.sectionId,
          count: sql<string>`COUNT(*)::text`,
        })
        .from(lessons)
        .where(inArray(lessons.sectionId, allSectionIds))
        .groupBy(lessons.sectionId)
      : [];


    const sectionLessonCountMap = new Map<string, number>();
    for (const lc of lessonCounts) {
      sectionLessonCountMap.set(lc.sectionId, Number(lc.count));
    }


    const userCompletionStats = allSectionIds.length > 0
      ? await db
        .select({
          userId: lessonProgress.userId,
          sectionId: lessons.sectionId,
          completedLessons: sql<string>`COUNT(CASE WHEN ${lessonProgress.completed} = true THEN 1 END)::text`,
          totalWatchedSeconds: sql<string>`COALESCE(SUM(${lessonProgress.watchedSeconds}), 0)`,
          totalProgressRecords: sql<string>`COUNT(*)::text`,
        })
        .from(lessonProgress)
        .innerJoin(lessons, eq(lessons.id, lessonProgress.lessonId))
        .where(inArray(lessons.sectionId, allSectionIds))
        .groupBy(lessonProgress.userId, lessons.sectionId)
      : [];


    const userSectionCompletionMap = new Map<string, Map<string, { completed: number; totalWatchSeconds: number; progressCount: number }>>();
    for (const cs of userCompletionStats) {
      if (!userSectionCompletionMap.has(cs.userId)) {
        userSectionCompletionMap.set(cs.userId, new Map());
      }
      userSectionCompletionMap.get(cs.userId)!.set(cs.sectionId, {
        completed: Number(cs.completedLessons),
        totalWatchSeconds: Number(cs.totalWatchedSeconds),
        progressCount: Number(cs.totalProgressRecords),
      });
    }


    const sectionWatchStats = allSectionIds.length > 0
      ? await db
        .select({
          sectionId: lessons.sectionId,
          totalWatchedSeconds: sql<string>`COALESCE(SUM(${lessonProgress.watchedSeconds}), 0)`,
          totalProgressRecords: sql<string>`COUNT(*)::text`,
        })
        .from(lessonProgress)
        .innerJoin(lessons, eq(lessons.id, lessonProgress.lessonId))
        .where(inArray(lessons.sectionId, allSectionIds))
        .groupBy(lessons.sectionId)
      : [];


    const sectionWatchStatsMap = new Map<string, { totalWatchSeconds: number; progressCount: number }>();
    for (const ws of sectionWatchStats) {
      sectionWatchStatsMap.set(ws.sectionId, {
        totalWatchSeconds: Number(ws.totalWatchedSeconds),
        progressCount: Number(ws.totalProgressRecords),
      });
    }


    const enrichedData = coursesData.map((course) => {
      const uniqueViewers = Number(course.uniqueViewers);
      const totalViewRecords = Number(course.totalViewRecords);
      const purchasesNum = Number(course.purchases);


      const viewDenominator = uniqueViewers > 0 ? uniqueViewers : totalViewRecords;

      const displayViews = uniqueViewers > 0 ? uniqueViewers : totalViewRecords;

      const sectionIds = courseSectionsMap.get(course.id) || [];


      let totalLessons = 0;
      for (const sectionId of sectionIds) {
        totalLessons += sectionLessonCountMap.get(sectionId) || 0;
      }


      const userCompletionRates: number[] = [];
      const uniqueUsers = new Set<string>();


      for (const sectionId of sectionIds) {
        for (const [userId] of Array.from(userSectionCompletionMap)) {
          if (userSectionCompletionMap.get(userId)!.has(sectionId)) {
            uniqueUsers.add(userId);
          }
        }
      }


      for (const userId of Array.from(uniqueUsers)) {
        let userCompletedLessons = 0;
        const userSectionData = userSectionCompletionMap.get(userId)!;

        for (const sectionId of sectionIds) {
          const sectionCompletion = userSectionData.get(sectionId);
          if (sectionCompletion) {
            userCompletedLessons += sectionCompletion.completed;
          }
        }

        if (totalLessons > 0) {
          const userCompletionRate = (userCompletedLessons / totalLessons) * 100;
          userCompletionRates.push(userCompletionRate);
        }
      }


      const completionRate = userCompletionRates.length > 0
        ? userCompletionRates.reduce((sum, rate) => sum + rate, 0) / userCompletionRates.length
        : 0;


      let totalWatchedSeconds = 0;
      let totalProgressRecords = 0;

      for (const sectionId of sectionIds) {
        const watchStats = sectionWatchStatsMap.get(sectionId);
        if (watchStats) {
          totalWatchedSeconds += watchStats.totalWatchSeconds;
          totalProgressRecords += watchStats.progressCount;
        }
      }

      const avgWatchTimeSeconds = totalProgressRecords > 0 ? totalWatchedSeconds / totalProgressRecords : 0;
      const conversionRate = viewDenominator > 0 ? (purchasesNum / viewDenominator) * 100 : 0;

      return {
        id: course.id,
        title: course.title,
        views: displayViews,
        purchases: purchasesNum,
        revenue: course.revenue,
        conversionRate: Math.round(conversionRate * 100) / 100,
        completionRate: Math.round(completionRate * 100) / 100,
        avgWatchTime: Math.round(avgWatchTimeSeconds / 60),
      };
    });

    return enrichedData;
  }

  async getActiveUsersStats(): Promise<{
    dau: number;
    wau: number;
    mau: number;
    dailyData: Array<{ date: string; activeUsers: number }>;
  }> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);


    const [activeUsersResult] = await db
      .select({
        dau: sql<string>`COUNT(DISTINCT CASE WHEN ${users.lastActivityAt} IS NOT NULL AND ${users.lastActivityAt} >= ${oneDayAgo} THEN ${users.id} END)::text`,
        wau: sql<string>`COUNT(DISTINCT CASE WHEN ${users.lastActivityAt} IS NOT NULL AND ${users.lastActivityAt} >= ${oneWeekAgo} THEN ${users.id} END)::text`,
        mau: sql<string>`COUNT(DISTINCT CASE WHEN ${users.lastActivityAt} IS NOT NULL AND ${users.lastActivityAt} >= ${oneMonthAgo} THEN ${users.id} END)::text`,
      })
      .from(users);


    const dailyData = await db
      .select({
        date: sql<string>`DATE(${users.lastActivityAt})::text`,
        activeUsers: sql<string>`COUNT(DISTINCT ${users.id})::text`,
      })
      .from(users)
      .where(and(isNotNull(users.lastActivityAt), gte(users.lastActivityAt, oneMonthAgo)))
      .groupBy(sql`DATE(${users.lastActivityAt})`)
      .orderBy(sql`DATE(${users.lastActivityAt})`);

    return {
      dau: Number(activeUsersResult.dau),
      wau: Number(activeUsersResult.wau),
      mau: Number(activeUsersResult.mau),
      dailyData: dailyData.map(d => ({
        date: d.date,
        activeUsers: Number(d.activeUsers),
      })),
    };
  }

  async getPurchaseFunnel(): Promise<{
    totalUsers: number;
    viewedCourses: number;
    addedToFavorites: number;
    purchased: number;
    viewToFavoriteRate: number;
    favoriteToPurchaseRate: number;
    viewToPurchaseRate: number;
  }> {

    const result = await db.execute<{
      total_users: string;
      viewed_courses: string;
      added_to_favorites: string;
      purchased: string;
    }>(sql`
      SELECT
        (SELECT COUNT(*)::text FROM ${users}) as total_users,
        (SELECT COUNT(DISTINCT user_id)::text FROM ${courseViews} WHERE user_id IS NOT NULL) as viewed_courses,
        (SELECT COUNT(DISTINCT user_id)::text FROM ${favorites}) as added_to_favorites,
        (SELECT COUNT(DISTINCT user_id)::text FROM ${purchases}) as purchased
    `);

    const funnelResult = result.rows[0];

    const totalUsers = Number(funnelResult.total_users);
    const viewedCourses = Number(funnelResult.viewed_courses);
    const addedToFavorites = Number(funnelResult.added_to_favorites);
    const purchased = Number(funnelResult.purchased);

    const viewToFavoriteRate = viewedCourses > 0 ? (addedToFavorites / viewedCourses) * 100 : 0;
    const favoriteToPurchaseRate = addedToFavorites > 0 ? (purchased / addedToFavorites) * 100 : 0;
    const viewToPurchaseRate = viewedCourses > 0 ? (purchased / viewedCourses) * 100 : 0;

    return {
      totalUsers,
      viewedCourses,
      addedToFavorites,
      purchased,
      viewToFavoriteRate: Math.round(viewToFavoriteRate * 100) / 100,
      favoriteToPurchaseRate: Math.round(favoriteToPurchaseRate * 100) / 100,
      viewToPurchaseRate: Math.round(viewToPurchaseRate * 100) / 100,
    };
  }

  async getActivityHeatmap(): Promise<Array<{ hour: number; dayOfWeek: number; activityCount: number }>> {
    const results = await db
      .select({
        hour: sql<string>`EXTRACT(HOUR FROM ${users.lastActivityAt})::text`,
        dayOfWeek: sql<string>`EXTRACT(DOW FROM ${users.lastActivityAt})::text`,
        activityCount: sql<string>`COUNT(*)::text`,
      })
      .from(users)
      .where(sql`${users.lastActivityAt} IS NOT NULL`)
      .groupBy(
        sql`EXTRACT(HOUR FROM ${users.lastActivityAt})`,
        sql`EXTRACT(DOW FROM ${users.lastActivityAt})`
      )
      .orderBy(
        sql`EXTRACT(DOW FROM ${users.lastActivityAt})`,
        sql`EXTRACT(HOUR FROM ${users.lastActivityAt})`
      );

    return results.map(r => ({
      hour: Number(r.hour),
      dayOfWeek: Number(r.dayOfWeek),
      activityCount: Number(r.activityCount),
    }));
  }

  async getReferralAnalytics(): Promise<{
    totalReferrals: number;
    activeReferrals: number;
    totalReferralRevenue: string;
    topReferrers: Array<{
      userId: string;
      name: string;
      referrals: number;
      revenue: string;
    }>;
  }> {

    const [statsResult] = await db
      .select({
        total: sql<string>`COUNT(*)::text`,
        active: sql<string>`COUNT(CASE WHEN ${referrals.status} = 'active' THEN 1 END)::text`,
        revenue: sql<string>`COALESCE(SUM(CAST(${referrals.earnings} AS DECIMAL)), 0)`,
      })
      .from(referrals);

    const topReferrers = await db
      .select({
        userId: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        referralCount: sql<string>`COUNT(${referrals.id})::text`,
        totalRevenue: sql<string>`COALESCE(SUM(CAST(${referrals.earnings} AS DECIMAL)), 0)`,
      })
      .from(users)
      .innerJoin(referrals, eq(referrals.referrerId, users.id))
      .groupBy(users.id, users.firstName, users.lastName)
      .orderBy(sql`COALESCE(SUM(CAST(${referrals.earnings} AS DECIMAL)), 0) DESC`)
      .limit(10);

    return {
      totalReferrals: Number(statsResult.total || 0),
      activeReferrals: Number(statsResult.active || 0),
      totalReferralRevenue: statsResult.revenue || '0',
      topReferrers: topReferrers.map(r => ({
        userId: r.userId,
        name: `${r.firstName || ''} ${r.lastName || ''}`.trim(),
        referrals: Number(r.referralCount),
        revenue: r.totalRevenue,
      })),
    };
  }

  async getRegistrationTrends(days: number): Promise<Array<{ date: string; registrations: number }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const results = await db
      .select({
        date: sql<string>`DATE(${users.createdAt})::text`,
        registrations: sql<string>`COUNT(*)::text`,
      })
      .from(users)
      .where(gte(users.createdAt, startDate))
      .groupBy(sql`DATE(${users.createdAt})`)
      .orderBy(sql`DATE(${users.createdAt})`);

    return results.map(r => ({
      date: r.date,
      registrations: Number(r.registrations),
    }));
  }

  async getReferralTrends(days: number): Promise<Array<{ date: string; newReferrals: number; revenue: string }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const results = await db
      .select({
        date: sql<string>`DATE(${referrals.createdAt})::text`,
        newReferrals: sql<string>`COUNT(*)::text`,
        revenue: sql<string>`COALESCE(SUM(CAST(${referrals.earnings} AS DECIMAL)), 0)`,
      })
      .from(referrals)
      .where(gte(referrals.createdAt, startDate))
      .groupBy(sql`DATE(${referrals.createdAt})`)
      .orderBy(sql`DATE(${referrals.createdAt})`);

    return results.map(r => ({
      date: r.date,
      newReferrals: Number(r.newReferrals),
      revenue: r.revenue,
    }));
  }

  async getDetailedReferrers(): Promise<Array<{
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
  }>> {
    const results = await db
      .select({
        userId: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        telegramUsername: users.telegramUsername,
        totalReferrals: sql<string>`COUNT(${referrals.id})::text`,
        activeReferrals: sql<string>`COUNT(CASE WHEN ${referrals.status} = 'active' THEN 1 END)::text`,
        totalRevenue: sql<string>`COALESCE(SUM(CAST(${referrals.earnings} AS DECIMAL)), 0)`,
        firstReferralDate: sql<string>`MIN(${referrals.createdAt})::text`,
      })
      .from(users)
      .innerJoin(referrals, eq(referrals.referrerId, users.id))
      .groupBy(users.id, users.firstName, users.lastName, users.email, users.telegramUsername)
      .orderBy(sql`COALESCE(SUM(CAST(${referrals.earnings} AS DECIMAL)), 0) DESC`);

    return results.map(r => {
      const totalReferrals = Number(r.totalReferrals);
      const activeReferrals = Number(r.activeReferrals);
      const conversionRate = totalReferrals > 0 ? (activeReferrals / totalReferrals) * 100 : 0;
      const avgRevenue = totalReferrals > 0 ? (parseFloat(r.totalRevenue) / totalReferrals).toFixed(2) : '0';

      return {
        userId: r.userId,
        name: `${r.firstName || ''} ${r.lastName || ''}`.trim(),
        email: r.email,
        telegramUsername: r.telegramUsername,
        totalReferrals,
        activeReferrals,
        conversionRate: parseFloat(conversionRate.toFixed(2)),
        totalRevenue: r.totalRevenue,
        avgRevenuePerReferral: avgRevenue,
        firstReferralDate: r.firstReferralDate,
      };
    });
  }


  async getRevenueMetrics(): Promise<{
    arpu: number;
    arppu: number;
    averageOrderValue: number;
    totalPayingUsers: number;
    revenueGrowthRate: number;
  }> {

    const [totalUsersResult] = await db
      .select({ count: sql<string>`COUNT(*)::text` })
      .from(users);
    const totalUsers = Number(totalUsersResult.count);


    const [revenueResult] = await db
      .select({
        totalRevenue: sql<string>`COALESCE(SUM(CAST(${purchases.price} AS DECIMAL)), 0)`,
        payingUsers: sql<string>`COUNT(DISTINCT ${purchases.userId})::text`,
        totalPurchases: sql<string>`COUNT(*)::text`,
      })
      .from(purchases);

    const totalRevenue = parseFloat(revenueResult.totalRevenue);
    const payingUsers = Number(revenueResult.payingUsers);
    const totalPurchases = Number(revenueResult.totalPurchases);


    const arpu = totalUsers > 0 ? totalRevenue / totalUsers : 0;


    const arppu = payingUsers > 0 ? totalRevenue / payingUsers : 0;


    const averageOrderValue = totalPurchases > 0 ? totalRevenue / totalPurchases : 0;


    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const [currentPeriod] = await db
      .select({
        revenue: sql<string>`COALESCE(SUM(CAST(${purchases.price} AS DECIMAL)), 0)`,
      })
      .from(purchases)
      .where(gte(purchases.purchaseDate, thirtyDaysAgo));

    const [previousPeriod] = await db
      .select({
        revenue: sql<string>`COALESCE(SUM(CAST(${purchases.price} AS DECIMAL)), 0)`,
      })
      .from(purchases)
      .where(and(gte(purchases.purchaseDate, sixtyDaysAgo), lt(purchases.purchaseDate, thirtyDaysAgo)));

    const currentRevenue = parseFloat(currentPeriod.revenue);
    const previousRevenue = parseFloat(previousPeriod.revenue);

    const revenueGrowthRate = previousRevenue > 0
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
      : currentRevenue > 0 ? 100 : 0;

    return {
      arpu: Math.round(arpu * 100) / 100,
      arppu: Math.round(arppu * 100) / 100,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100,
      totalPayingUsers: payingUsers,
      revenueGrowthRate: Math.round(revenueGrowthRate * 100) / 100,
    };
  }

  async getMRRData(months: number): Promise<Array<{
    month: string;
    mrr: number;
    subscribers: number;
  }>> {
    const results = await db
      .select({
        month: sql<string>`TO_CHAR(${purchases.purchaseDate}, 'YYYY-MM')`,
        revenue: sql<string>`COALESCE(SUM(CAST(${purchases.price} AS DECIMAL)), 0)`,
        subscribers: sql<string>`COUNT(DISTINCT ${purchases.userId})::text`,
      })
      .from(purchases)
      .where(sql`${purchases.purchaseDate} >= NOW() - INTERVAL '${sql.raw(months.toString())} months'`)
      .groupBy(sql`TO_CHAR(${purchases.purchaseDate}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${purchases.purchaseDate}, 'YYYY-MM')`);

    return results.map(r => ({
      month: r.month,
      mrr: Math.round(parseFloat(r.revenue) * 100) / 100,
      subscribers: Number(r.subscribers),
    }));
  }


  async getRetentionMetrics(): Promise<{
    retention7Day: number;
    retention30Day: number;
    churnRate: number;
  }> {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);


    const [cohort7DayResult] = await db
      .select({ count: sql<string>`COUNT(*)::text` })
      .from(users)
      .where(and(gte(users.createdAt, fourteenDaysAgo), lt(users.createdAt, sevenDaysAgo)));


    const [retained7DayResult] = await db
      .select({ count: sql<string>`COUNT(*)::text` })
      .from(users)
      .where(and(
        gte(users.createdAt, fourteenDaysAgo),
        lt(users.createdAt, sevenDaysAgo),
        gte(users.lastActivityAt, sevenDaysAgo)
      ));


    const [cohort30DayResult] = await db
      .select({ count: sql<string>`COUNT(*)::text` })
      .from(users)
      .where(and(gte(users.createdAt, sixtyDaysAgo), lt(users.createdAt, thirtyDaysAgo)));


    const [retained30DayResult] = await db
      .select({ count: sql<string>`COUNT(*)::text` })
      .from(users)
      .where(and(
        gte(users.createdAt, sixtyDaysAgo),
        lt(users.createdAt, thirtyDaysAgo),
        gte(users.lastActivityAt, thirtyDaysAgo)
      ));

    const cohort7Day = Number(cohort7DayResult.count);
    const retained7Day = Number(retained7DayResult.count);
    const cohort30Day = Number(cohort30DayResult.count);
    const retained30Day = Number(retained30DayResult.count);

    const retention7DayRate = cohort7Day > 0 ? (retained7Day / cohort7Day) * 100 : 0;
    const retention30DayRate = cohort30Day > 0 ? (retained30Day / cohort30Day) * 100 : 0;


    const [totalActiveUsers] = await db
      .select({ count: sql<string>`COUNT(*)::text` })
      .from(users)
      .where(gte(users.lastActivityAt, thirtyDaysAgo));

    const [totalUsers] = await db
      .select({ count: sql<string>`COUNT(*)::text` })
      .from(users);

    const activeUsers = Number(totalActiveUsers.count);
    const allUsers = Number(totalUsers.count);
    const churnedUsers = allUsers - activeUsers;
    const churnRate = allUsers > 0 ? (churnedUsers / allUsers) * 100 : 0;

    return {
      retention7Day: Math.round(retention7DayRate * 100) / 100,
      retention30Day: Math.round(retention30DayRate * 100) / 100,
      churnRate: Math.round(churnRate * 100) / 100,
    };
  }

  async getCohortAnalysis(months: number): Promise<Array<{
    cohort: string;
    totalUsers: number;
    retained: Record<string, number>;
  }>> {

    const now = new Date();
    const cohortMonths: Date[] = [];


    for (let i = months - 1; i >= 0; i--) {
      cohortMonths.push(new Date(now.getFullYear(), now.getMonth() - i, 1));
    }


    const cohortData = await db
      .select({
        cohortMonth: sql<string>`TO_CHAR(DATE_TRUNC('month', ${users.createdAt}), 'YYYY-MM')`,
        totalUsers: sql<string>`COUNT(*)::text`,
        month0: sql<string>`COUNT(CASE WHEN ${users.lastActivityAt} >= DATE_TRUNC('month', NOW()) THEN 1 END)::text`,
        month1: sql<string>`COUNT(CASE WHEN ${users.lastActivityAt} >= DATE_TRUNC('month', NOW() - INTERVAL '1 month') THEN 1 END)::text`,
        month2: sql<string>`COUNT(CASE WHEN ${users.lastActivityAt} >= DATE_TRUNC('month', NOW() - INTERVAL '2 months') THEN 1 END)::text`,
        month3: sql<string>`COUNT(CASE WHEN ${users.lastActivityAt} >= DATE_TRUNC('month', NOW() - INTERVAL '3 months') THEN 1 END)::text`,
        month4: sql<string>`COUNT(CASE WHEN ${users.lastActivityAt} >= DATE_TRUNC('month', NOW() - INTERVAL '4 months') THEN 1 END)::text`,
        month5: sql<string>`COUNT(CASE WHEN ${users.lastActivityAt} >= DATE_TRUNC('month', NOW() - INTERVAL '5 months') THEN 1 END)::text`,
      })
      .from(users)
      .where(gte(users.createdAt, cohortMonths[cohortMonths.length - 1]))
      .groupBy(sql`DATE_TRUNC('month', ${users.createdAt})`)
      .orderBy(sql`DATE_TRUNC('month', ${users.createdAt}) DESC`);


    return cohortData.map(row => {
      const cohortDate = new Date(row.cohortMonth + '-01');
      const cohortLabel = cohortDate.toLocaleDateString('ru-RU', { year: 'numeric', month: 'short' });

      return {
        cohort: cohortLabel,
        totalUsers: Number(row.totalUsers),
        retained: {
          month0: Number(row.month0),
          month1: Number(row.month1),
          month2: Number(row.month2),
          month3: Number(row.month3),
          month4: Number(row.month4),
          month5: Number(row.month5),
        },
      };
    });
  }


  async getEngagementMetrics(): Promise<{
    overallCompletionRate: number;
    averageCoursesPerUser: number;
    activeLearnersPercent: number;
  }> {

    const [totalLessonsResult] = await db
      .select({
        totalLessons: sql<string>`COUNT(*)::text`,
      })
      .from(lessons);

    const [completedLessonsResult] = await db
      .select({
        completedLessons: sql<string>`COUNT(*)::text`,
      })
      .from(lessonProgress)
      .where(eq(lessonProgress.completed, true));

    const totalLessons = Number(totalLessonsResult.totalLessons);
    const completedLessons = Number(completedLessonsResult.completedLessons);

    const overallCompletionRate = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;


    const [coursesPerUserResult] = await db
      .select({
        totalPurchases: sql<string>`COUNT(*)::text`,
        uniqueUsers: sql<string>`COUNT(DISTINCT ${purchases.userId})::text`,
      })
      .from(purchases);

    const totalPurchases = Number(coursesPerUserResult.totalPurchases);
    const uniqueUsers = Number(coursesPerUserResult.uniqueUsers);

    const averageCoursesPerUser = uniqueUsers > 0 ? totalPurchases / uniqueUsers : 0;


    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [activeLearnersResult] = await db
      .select({
        count: sql<string>`COUNT(DISTINCT ${lessonProgress.userId})::text`,
      })
      .from(lessonProgress)
      .where(gte(lessonProgress.lastAccessedAt, thirtyDaysAgo));

    const [totalUsersResult] = await db
      .select({ count: sql<string>`COUNT(*)::text` })
      .from(users);

    const activeLearners = Number(activeLearnersResult.count);
    const totalUsers = Number(totalUsersResult.count);

    const activeLearnersPercent = totalUsers > 0 ? (activeLearners / totalUsers) * 100 : 0;

    return {
      overallCompletionRate: Math.round(overallCompletionRate * 100) / 100,
      averageCoursesPerUser: Math.round(averageCoursesPerUser * 100) / 100,
      activeLearnersPercent: Math.round(activeLearnersPercent * 100) / 100,
    };
  }


  async createLandingVisit(visit: InsertLandingVisit): Promise<LandingVisit> {
    const result = await db
      .insert(landingVisits)
      .values(visit)
      .returning() as unknown as Promise<LandingVisit[]>;
    return (await result)[0]!;
  }

  async getLandingVisit(fingerprint: string): Promise<LandingVisit | undefined> {
    const [visit] = await db
      .select()
      .from(landingVisits)
      .where(eq(landingVisits.fingerprint, fingerprint))
      .orderBy(desc(landingVisits.visitedAt))
      .limit(1);
    return visit;
  }

  async updateLandingVisitConversion(visitId: string, userId: string): Promise<void> {
    await db
      .update(landingVisits)
      .set({
        convertedToRegistration: true,
        userId,
        updatedAt: new Date(),
      })
      .where(eq(landingVisits.id, visitId));
  }

  async getLandingVisitStats(days: number): Promise<{
    totalVisits: number;
    uniqueVisitors: number;
    conversions: number;
    conversionRate: number;
    dailyVisits: Array<{ date: string; visits: number; conversions: number }>;
    topCountries: Array<{ country: string; count: number }>;
    topBrowsers: Array<{ browser: string; count: number }>;
    topDevices: Array<{ device: string; count: number }>;
    utmCampaigns?: Array<{ campaign: string; visits: number; conversions: number; conversionRate: number }>;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);


    const [stats] = await db
      .select({
        totalVisits: sql<string>`COUNT(*)::text`,
        uniqueVisitors: sql<string>`COUNT(DISTINCT ${landingVisits.fingerprint})::text`,
        conversions: sql<string>`COUNT(CASE WHEN ${landingVisits.convertedToRegistration} = true THEN 1 END)::text`,
      })
      .from(landingVisits)
      .where(gte(landingVisits.visitedAt, startDate));

    const totalVisits = Number(stats.totalVisits);
    const uniqueVisitors = Number(stats.uniqueVisitors);
    const conversions = Number(stats.conversions);
    const conversionRate = totalVisits > 0 ? (conversions / totalVisits) * 100 : 0;


    const dailyVisits = await db
      .select({
        date: sql<string>`TO_CHAR(DATE_TRUNC('day', ${landingVisits.visitedAt}), 'YYYY-MM-DD')`,
        visits: sql<string>`COUNT(*)::text`,
        conversions: sql<string>`COUNT(CASE WHEN ${landingVisits.convertedToRegistration} = true THEN 1 END)::text`,
      })
      .from(landingVisits)
      .where(gte(landingVisits.visitedAt, startDate))
      .groupBy(sql`DATE_TRUNC('day', ${landingVisits.visitedAt})`)
      .orderBy(sql`DATE_TRUNC('day', ${landingVisits.visitedAt}) ASC`);


    const topCountries = await db
      .select({
        country: sql<string>`COALESCE(${landingVisits.country}, 'Unknown')`,
        count: sql<string>`COUNT(*)::text`,
      })
      .from(landingVisits)
      .where(gte(landingVisits.visitedAt, startDate))
      .groupBy(sql`COALESCE(${landingVisits.country}, 'Unknown')`)
      .orderBy(desc(sql`COUNT(*)`))
      .limit(10);


    const topBrowsers = await db
      .select({
        browser: sql<string>`COALESCE(${landingVisits.browser}, 'Unknown')`,
        count: sql<string>`COUNT(*)::text`,
      })
      .from(landingVisits)
      .where(gte(landingVisits.visitedAt, startDate))
      .groupBy(sql`COALESCE(${landingVisits.browser}, 'Unknown')`)
      .orderBy(desc(sql`COUNT(*)`))
      .limit(10);


    const topDevices = await db
      .select({
        device: sql<string>`COALESCE(${landingVisits.device}, 'Unknown')`,
        count: sql<string>`COUNT(*)::text`,
      })
      .from(landingVisits)
      .where(gte(landingVisits.visitedAt, startDate))
      .groupBy(sql`COALESCE(${landingVisits.device}, 'Unknown')`)
      .orderBy(desc(sql`COUNT(*)`));


    const utmCampaignsData = await db
      .select({
        campaign: landingVisits.utmCampaign,
        visits: sql<string>`COUNT(*)::text`,
        conversions: sql<string>`COUNT(CASE WHEN ${landingVisits.convertedToRegistration} = true THEN 1 END)::text`,
      })
      .from(landingVisits)
      .where(
        and(
          gte(landingVisits.visitedAt, startDate),
          sql`${landingVisits.utmCampaign} IS NOT NULL`
        )
      )
      .groupBy(landingVisits.utmCampaign)
      .orderBy(desc(sql`COUNT(*)`))
      .limit(10);

    const utmCampaigns = utmCampaignsData.length > 0
      ? utmCampaignsData.map(row => {
        const visits = Number(row.visits);
        const conversions = Number(row.conversions);
        return {
          campaign: row.campaign || 'Unknown',
          visits,
          conversions,
          conversionRate: visits > 0 ? Math.round((conversions / visits) * 10000) / 100 : 0,
        };
      })
      : undefined;

    return {
      totalVisits,
      uniqueVisitors,
      conversions,
      conversionRate: Math.round(conversionRate * 100) / 100,
      dailyVisits: dailyVisits.map(row => ({
        date: row.date,
        visits: Number(row.visits),
        conversions: Number(row.conversions),
      })),
      topCountries: topCountries.map(row => ({
        country: row.country,
        count: Number(row.count),
      })),
      topBrowsers: topBrowsers.map(row => ({
        browser: row.browser,
        count: Number(row.count),
      })),
      topDevices: topDevices.map(row => ({
        device: row.device,
        count: Number(row.count),
      })),
      utmCampaigns,
    };
  }


  async getCourseRequests(isAdmin: boolean = false, limit: number = 10, offset: number = 0): Promise<Array<CourseRequest & {
    user: Pick<User, 'id' | 'firstName' | 'lastName'> & { selectedAward: string | null };
    totalVotes: number;
    upvotes: number;
    downvotes: number;
  }>> {
    const result = await db
      .select({
        request: courseRequests,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          selectedAward: awards.imageUrl,
        },
        totalVotes: sql<number>`COALESCE(SUM(${courseRequestVotes.vote}), 0)`,
        upvotes: sql<number>`COALESCE(SUM(CASE WHEN ${courseRequestVotes.vote} = 1 THEN 1 ELSE 0 END), 0)`,
        downvotes: sql<number>`COALESCE(SUM(CASE WHEN ${courseRequestVotes.vote} = -1 THEN 1 ELSE 0 END), 0)`,
      })
      .from(courseRequests)
      .leftJoin(users, eq(courseRequests.userId, users.id))
      .leftJoin(awards, eq(users.selectedAwardId, awards.id))
      .leftJoin(courseRequestVotes, eq(courseRequests.id, courseRequestVotes.requestId))
      .where(isAdmin ? undefined : eq(courseRequests.isApproved, true))
      .groupBy(courseRequests.id, users.id, users.firstName, users.lastName, awards.imageUrl)
      .orderBy(desc(sql`COALESCE(SUM(${courseRequestVotes.vote}), 0)`), desc(courseRequests.createdAt))
      .limit(limit)
      .offset(offset);

    return result.map(row => ({
      ...row.request,
      user: row.user as Pick<User, 'id' | 'firstName' | 'lastName'> & { selectedAward: string | null },
      totalVotes: Number(row.totalVotes),
      upvotes: Number(row.upvotes),
      downvotes: Number(row.downvotes),
    }));
  }

  async getCourseRequest(id: string): Promise<CourseRequest | undefined> {
    const [request] = await db
      .select()
      .from(courseRequests)
      .where(eq(courseRequests.id, id));
    return request;
  }

  async createCourseRequest(data: InsertCourseRequest): Promise<CourseRequest> {
    const [request] = await db
      .insert(courseRequests)
      .values(data)
      .returning();
    return request;
  }

  async deleteCourseRequest(id: string): Promise<void> {
    await db.delete(courseRequests).where(eq(courseRequests.id, id));
  }

  async voteForCourseRequest(requestId: string, userId: string, vote: number): Promise<CourseRequestVote> {

    const [existingVote] = await db
      .select()
      .from(courseRequestVotes)
      .where(and(
        eq(courseRequestVotes.requestId, requestId),
        eq(courseRequestVotes.userId, userId)
      ));

    if (existingVote) {

      if (existingVote.vote === vote) {
        await db.delete(courseRequestVotes).where(eq(courseRequestVotes.id, existingVote.id));
        return existingVote;
      }

      const [updated] = await db
        .update(courseRequestVotes)
        .set({ vote })
        .where(eq(courseRequestVotes.id, existingVote.id))
        .returning();
      return updated;
    }


    const [newVote] = await db
      .insert(courseRequestVotes)
      .values({ requestId, userId, vote })
      .returning();
    return newVote;
  }

  async getUserVoteForRequest(requestId: string, userId: string): Promise<CourseRequestVote | undefined> {
    const [vote] = await db
      .select()
      .from(courseRequestVotes)
      .where(and(
        eq(courseRequestVotes.requestId, requestId),
        eq(courseRequestVotes.userId, userId)
      ));
    return vote;
  }

  async checkUserRequestRateLimit(userId: string): Promise<{ allowed: boolean; count: number; timeUntilReset: number }> {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    const userRequests = await db
      .select()
      .from(courseRequests)
      .where(and(
        eq(courseRequests.userId, userId),
        gte(courseRequests.createdAt, thirtyMinutesAgo)
      ))
      .orderBy(courseRequests.createdAt);

    const count = userRequests.length;


    let timeUntilReset = 0;
    if (count >= 2 && userRequests[0]?.createdAt) {
      const oldestRequestTime = new Date(userRequests[0].createdAt).getTime();
      const resetTime = oldestRequestTime + 30 * 60 * 1000;
      timeUntilReset = Math.max(0, Math.ceil((resetTime - Date.now()) / 1000 / 60));
    }

    return {
      allowed: count < 2,
      count,
      timeUntilReset,
    };
  }

  async moderateCourseRequest(requestId: string, moderatorId: string, approve: boolean): Promise<CourseRequest> {
    const [updated] = await db
      .update(courseRequests)
      .set({
        isApproved: approve,
        moderatedBy: moderatorId,
        moderatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(courseRequests.id, requestId))
      .returning();

    return updated;
  }

  async updateCourseRequestComment(requestId: string, adminComment: string | null): Promise<CourseRequest> {
    const [updated] = await db
      .update(courseRequests)
      .set({
        adminComment,
        updatedAt: new Date(),
      })
      .where(eq(courseRequests.id, requestId))
      .returning();

    return updated;
  }

  async getPendingCourseRequests(): Promise<Array<CourseRequest & {
    user: Pick<User, 'id' | 'firstName' | 'lastName' | 'email'>;
    totalVotes: number;
    upvotes: number;
    downvotes: number;
  }>> {
    const requests = await db
      .select({
        request: courseRequests,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
      })
      .from(courseRequests)
      .leftJoin(users, eq(courseRequests.userId, users.id))
      .where(eq(courseRequests.isApproved, false))
      .orderBy(desc(courseRequests.createdAt));

    const requestsWithVotes = await Promise.all(
      requests.map(async ({ request, user }) => {
        const voteResults = await db
          .select({
            upvotes: sql<number>`count(case when ${courseRequestVotes.vote} = 1 then 1 end)::int`,
            downvotes: sql<number>`count(case when ${courseRequestVotes.vote} = -1 then 1 end)::int`,
          })
          .from(courseRequestVotes)
          .where(eq(courseRequestVotes.requestId, request.id));

        const votes = voteResults[0] || { upvotes: 0, downvotes: 0 };
        const totalVotes = votes.upvotes - votes.downvotes;

        return {
          ...request,
          user: {
            id: user?.id || '',
            firstName: user?.firstName || 'Deleted',
            lastName: user?.lastName || 'User',
            email: user?.email || '',
          },
          totalVotes,
          upvotes: votes.upvotes,
          downvotes: votes.downvotes,
        };
      })
    );

    return requestsWithVotes;
  }


  async createNotification(
    data: InsertNotification,
    options: { skipTelegram?: boolean } = {}
  ): Promise<Notification> {
    const [notification] = await db
      .insert(notifications)
      .values(data)
      .returning();

    if (!options.skipTelegram) {
      try {
        const user = await this.getUser(data.userId);
        if (user?.telegramChatId) {
          await sendNotificationToTelegram(
            user.telegramChatId,
            data.type,
            data.title,
            data.message
          );
          console.log(`[Notifications] Sent to Telegram for user ${data.userId}`);
        }
      } catch (error) {
        console.error('[Notifications] Failed to send to Telegram:', error);
      }
    }

    return notification;
  }

  async createBroadcastNotification(title: string, message: string, imageUrl?: string): Promise<{ count: number }> {
    const allUsers = await db.select({
      id: users.id,
      telegramChatId: users.telegramChatId
    }).from(users);

    if (allUsers.length === 0) {
      return { count: 0 };
    }

    const notificationData = allUsers.map(user => ({
      userId: user.id,
      type: 'admin_broadcast',
      title,
      message,
      imageUrl: imageUrl || null,
      isRead: false,
      relatedId: null,
      relatedType: null,
    }));

    await db.insert(notifications).values(notificationData);


    let telegramSentCount = 0;
    for (const user of allUsers) {
      if (user.telegramChatId) {
        try {
          await sendNotificationToTelegram(
            user.telegramChatId,
            'admin_broadcast',
            title,
            message,
            imageUrl
          );
          telegramSentCount++;

          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`[Broadcast] Failed to send to Telegram for user ${user.id}:`, error);
        }
      }
    }

    console.log(`[Broadcast] Sent ${telegramSentCount}/${allUsers.length} notifications to Telegram`);

    return { count: allUsers.length };
  }

  async getUserNotifications(userId: string, limit: number = 50, offset: number = 0): Promise<Notification[]> {
    const userNotifications = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);

    return userNotifications;
  }

  async getUnreadNotificationsCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ));

    return Number(result[0]?.count || 0);
  }

  async markNotificationAsRead(notificationId: string, userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId)
      ));
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ));
  }

  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    await db
      .delete(notifications)
      .where(and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId)
      ));
  }

  async getAwards(): Promise<(Award & { task?: Task | null })[]> {
    const result = await db
      .select({
        award: awards,
        task: tasks
      })
      .from(awards)
      .leftJoin(tasks, eq(awards.requiredTaskId, tasks.id))
      .where(eq(awards.isActive, true))
      .orderBy(awards.displayOrder, awards.rarity, awards.createdAt);

    return result.map(row => ({
      ...row.award,
      task: row.task
    }));
  }

  async getAward(id: string): Promise<Award | undefined> {
    const [award] = await db
      .select()
      .from(awards)
      .where(eq(awards.id, id));
    return award;
  }

  async createAward(award: InsertAward): Promise<Award> {
    const [newAward] = await db
      .insert(awards)
      .values({ ...award, id: randomUUID() })
      .returning();
    return newAward;
  }

  async updateAward(id: string, data: Partial<InsertAward>): Promise<Award> {
    const [updated] = await db
      .update(awards)
      .set(data)
      .where(eq(awards.id, id))
      .returning();
    return updated;
  }

  async deleteAward(id: string): Promise<void> {
    await db.delete(awards).where(eq(awards.id, id));
  }

  async getUserAwards(userId: string): Promise<(UserAward & { award: Award })[]> {
    const userAwardsWithDetails = await db
      .select()
      .from(userAwards)
      .innerJoin(awards, eq(userAwards.awardId, awards.id))
      .where(eq(userAwards.userId, userId))
      .orderBy(desc(userAwards.earnedAt));

    return userAwardsWithDetails.map((row) => ({
      ...row.user_awards,
      award: row.awards,
    }));
  }

  async addUserAward(userId: string, awardId: string): Promise<UserAward> {
    const [userAward] = await db
      .insert(userAwards)
      .values({
        id: randomUUID(),
        userId,
        awardId,
      })
      .onConflictDoNothing()
      .returning();
    return userAward;
  }

  async selectUserAward(userId: string, awardId: string | null): Promise<User> {
    const updated = await db
      .update(users)
      .set({ selectedAwardId: awardId })
      .where(eq(users.id, userId))
      .returning();
    return updated[0] as User;
  }


  async getPartners(): Promise<Partner[]> {
    const allPartners = await db
      .select()
      .from(partners)
      .where(eq(partners.isActive, true))
      .orderBy(partners.displayOrder);
    return allPartners;
  }

  async getPartner(id: string): Promise<Partner | undefined> {
    const result = await db
      .select()
      .from(partners)
      .where(eq(partners.id, id));
    return result[0] as Partner | undefined;
  }

  async createPartner(partner: InsertPartner): Promise<Partner> {
    const [newPartner] = await db
      .insert(partners)
      .values({
        id: randomUUID(),
        ...partner,
      })
      .returning();
    return newPartner!;
  }

  async updatePartner(id: string, data: Partial<InsertPartner>): Promise<Partner> {
    const [updated] = await db
      .update(partners)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(partners.id, id))
      .returning();
    return updated!;
  }

  async deletePartner(id: string): Promise<void> {
    await db.delete(partners).where(eq(partners.id, id));
  }


  async getPrograms(filters?: { category?: string; isFree?: boolean; search?: string }): Promise<Program[]> {
    let query = db.select().from(programs).where(eq(programs.isActive, true));

    const conditions = [eq(programs.isActive, true)];

    if (filters?.category) {
      conditions.push(eq(programs.category, filters.category));
    }

    if (filters?.isFree !== undefined) {
      conditions.push(eq(programs.isFree, filters.isFree));
    }

    if (filters?.search) {
      conditions.push(
        or(
          like(programs.title, `%${filters.search}%`),
          like(programs.description, `%${filters.search}%`)
        )!
      );
    }

    const allPrograms = await db
      .select()
      .from(programs)
      .where(and(...conditions))
      .orderBy(programs.displayOrder, desc(programs.createdAt));

    return allPrograms;
  }

  async getProgram(id: string): Promise<Program | undefined> {
    const result = await db
      .select()
      .from(programs)
      .where(eq(programs.id, id));
    return result[0] as Program | undefined;
  }

  async createProgram(program: InsertProgram): Promise<Program> {
    const [newProgram] = await db
      .insert(programs)
      .values({
        id: randomUUID(),
        ...program,
      })
      .returning();
    return newProgram!;
  }

  async updateProgram(id: string, data: Partial<InsertProgram>): Promise<Program> {
    const [updated] = await db
      .update(programs)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(programs.id, id))
      .returning();
    return updated!;
  }

  async deleteProgram(id: string): Promise<void> {
    await db.delete(programs).where(eq(programs.id, id));
  }

  async getProgramPurchases(userId: string): Promise<ProgramPurchase[]> {
    const userProgramPurchases = await db
      .select({
        id: programPurchases.id,
        userId: programPurchases.userId,
        programId: programPurchases.programId,
        price: programPurchases.price,
        purchaseDate: programPurchases.purchaseDate,
        program: programs,
      })
      .from(programPurchases)
      .leftJoin(programs, eq(programPurchases.programId, programs.id))
      .where(eq(programPurchases.userId, userId));
    return userProgramPurchases as any;
  }

  async createProgramPurchase(purchase: InsertProgramPurchase): Promise<ProgramPurchase> {
    const [newPurchase] = await db
      .insert(programPurchases)
      .values({
        id: randomUUID(),
        ...purchase,
      })
      .returning();
    return newPurchase!;
  }

  async getProgramPurchase(userId: string, programId: string): Promise<ProgramPurchase | undefined> {
    const result = await db
      .select()
      .from(programPurchases)
      .where(
        and(
          eq(programPurchases.userId, userId),
          eq(programPurchases.programId, programId)
        )
      );
    return result[0] as ProgramPurchase | undefined;
  }


  async getProgramReviews(programId: string): Promise<(ProgramReview & { user: Pick<User, 'id' | 'firstName' | 'lastName' | 'profileImageUrl'> & { selectedAward: string | null } })[]> {
    const reviewsData = await db
      .select({
        review: programReviews,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
          selectedAward: awards.imageUrl,
        },
      })
      .from(programReviews)
      .leftJoin(users, eq(programReviews.userId, users.id))
      .leftJoin(awards, eq(users.selectedAwardId, awards.id))
      .where(and(
        eq(programReviews.programId, programId),
        eq(programReviews.status, 'approved')
      ))
      .orderBy(desc(programReviews.createdAt));

    return reviewsData.map(({ review, user }) => ({
      ...review,
      user: user as Pick<User, 'id' | 'firstName' | 'lastName' | 'profileImageUrl'> & { selectedAward: string | null },
    }));
  }

  async getUserProgramReview(userId: string, programId: string): Promise<ProgramReview | undefined> {
    const [review] = await db
      .select()
      .from(programReviews)
      .where(and(eq(programReviews.userId, userId), eq(programReviews.programId, programId)));
    return review;
  }

  async getProgramReviewById(reviewId: string): Promise<ProgramReview | undefined> {
    const [review] = await db
      .select()
      .from(programReviews)
      .where(eq(programReviews.id, reviewId));
    return review;
  }

  async createProgramReview(reviewData: InsertProgramReview & { userId: string }): Promise<ProgramReview> {
    const [review] = await db.insert(programReviews).values(reviewData).returning();
    return review;
  }

  async updateProgramReview(reviewId: string, data: { rating?: number; comment?: string }): Promise<ProgramReview> {
    const [review] = await db
      .update(programReviews)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(programReviews.id, reviewId))
      .returning();
    return review;
  }

  async deleteProgramReview(reviewId: string): Promise<void> {
    await db.delete(programReviews).where(eq(programReviews.id, reviewId));
  }

  async moderateProgramReview(reviewId: string, status: 'approved' | 'rejected', moderatorId: string, comment?: string): Promise<ProgramReview> {
    const [review] = await db
      .update(programReviews)
      .set({
        status,
        moderatedBy: moderatorId,
        moderatedAt: new Date(),
        moderationComment: comment || null,
      })
      .where(eq(programReviews.id, reviewId))
      .returning();


    if (status === 'approved') {
      try {
        const program = await this.getProgram(review.programId);
        if (program) {
          await this.createNotification({
            userId: review.userId,
            type: 'review_approved',
            title: '✅ Ваш отзыв одобрен!',
            message: `Ваш отзыв на программу "${program.title}" прошел модерацию и теперь виден всем пользователям.`,
            isRead: false,
            relatedId: review.id,
            relatedType: 'program_review',
          });
        }
      } catch (notificationError) {
        console.error("[PROGRAM_REVIEWS] Failed to create notification:", notificationError);
      }
    }

    return review;
  }

  async getPendingProgramReviews(): Promise<(ProgramReview & { user: Pick<User, 'id' | 'firstName' | 'lastName' | 'email'>; program: Pick<Program, 'id' | 'title'> })[]> {
    const reviewsData = await db
      .select({
        review: programReviews,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
        program: {
          id: programs.id,
          title: programs.title,
        },
      })
      .from(programReviews)
      .innerJoin(users, eq(programReviews.userId, users.id))
      .innerJoin(programs, eq(programReviews.programId, programs.id))
      .where(eq(programReviews.status, 'pending'))
      .orderBy(desc(programReviews.createdAt));

    return reviewsData.map(({ review, user, program }) => ({
      ...review,
      user: user as Pick<User, 'id' | 'firstName' | 'lastName' | 'email'>,
      program: program as Pick<Program, 'id' | 'title'>,
    }));
  }

  async updateProgramReviewAdminComment(reviewId: string, adminComment: string | null): Promise<ProgramReview> {
    const [review] = await db
      .update(programReviews)
      .set({ adminComment })
      .where(eq(programReviews.id, reviewId))
      .returning();
    return review;
  }


  async getProgramInstructions(programId: string): Promise<ProgramInstruction[]> {
    return await db
      .select()
      .from(programInstructions)
      .where(eq(programInstructions.programId, programId))
      .orderBy(programInstructions.order);
  }

  async getProgramInstruction(id: string): Promise<ProgramInstruction | undefined> {
    const [instruction] = await db
      .select()
      .from(programInstructions)
      .where(eq(programInstructions.id, id));
    return instruction;
  }

  async createProgramInstruction(instructionData: InsertProgramInstruction): Promise<ProgramInstruction> {
    const [instruction] = await db
      .insert(programInstructions)
      .values({
        id: randomUUID(),
        ...instructionData,
      })
      .returning();
    return instruction;
  }

  async updateProgramInstruction(id: string, data: Partial<InsertProgramInstruction>): Promise<ProgramInstruction> {
    const [instruction] = await db
      .update(programInstructions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(programInstructions.id, id))
      .returning();
    return instruction;
  }

  async deleteProgramInstruction(id: string): Promise<void> {
    await db.delete(programInstructions).where(eq(programInstructions.id, id));
  }


  async createVerificationCode(data: InsertTelegramVerificationCode): Promise<TelegramVerificationCode> {
    const [code] = await db
      .insert(telegramVerificationCodes)
      .values(data)
      .returning();
    return code;
  }

  async getVerificationCode(code: string, userId?: string, email?: string): Promise<TelegramVerificationCode | undefined> {
    const conditions = [
      eq(telegramVerificationCodes.code, code),
      eq(telegramVerificationCodes.isUsed, false),
      gte(telegramVerificationCodes.expiresAt, new Date()),
    ];

    if (userId) {
      conditions.push(eq(telegramVerificationCodes.userId, userId));
    }
    if (email) {
      conditions.push(eq(telegramVerificationCodes.email, email));
    }

    const result = await db
      .select()
      .from(telegramVerificationCodes)
      .where(and(...conditions))
      .limit(1);

    return result[0];
  }

  async markVerificationCodeUsed(id: string): Promise<void> {
    await db
      .update(telegramVerificationCodes)
      .set({ isUsed: true })
      .where(eq(telegramVerificationCodes.id, id));
  }

  async cleanupExpiredCodes(): Promise<void> {
    await db
      .delete(telegramVerificationCodes)
      .where(lt(telegramVerificationCodes.expiresAt, new Date()));
  }

  async updateUserTelegramChatId(userId: string, chatId: string | null, username?: string | null, firstName?: string | null, lastName?: string | null, telegramId?: string | null, phoneNumber?: string | null): Promise<User> {
    const updateData: Partial<typeof users.$inferInsert> = {
      telegramChatId: chatId,
      updatedAt: new Date(),
    };

    if (username !== undefined) {
      updateData.telegramUsername = username;
    }

    if (firstName !== undefined) {
      updateData.telegramFirstName = firstName;
    }

    if (lastName !== undefined) {
      updateData.telegramLastName = lastName;
    }

    if (telegramId !== undefined) {
      updateData.telegramId = telegramId;
    }

    if (phoneNumber !== undefined) {
      updateData.phoneNumber = phoneNumber;
    }

    const result = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();

    if (!result[0]) {
      throw new Error(`User ${userId} not found or update failed`);
    }

    return result[0] as User;
  }

  async getUserByTelegramChatId(chatId: string): Promise<User | undefined> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.telegramChatId, chatId))
      .limit(1);

    return result[0] as User | undefined;
  }

  async getFilterPopularity(filterType?: string, days: number = 30): Promise<Array<{ filterId: string; filterValue: string; clickCount: number }>> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const conditions = [gte(filterClicks.clickedAt, cutoffDate)];

    if (filterType) {
      conditions.push(eq(filterClicks.filterType, filterType));
    }

    const result = await db
      .select({
        filterId: filterClicks.filterId,
        filterValue: filterClicks.filterValue,
        clickCount: sql<number>`count(*)::int`,
      })
      .from(filterClicks)
      .where(and(...conditions))
      .groupBy(filterClicks.filterId, filterClicks.filterValue)
      .orderBy(desc(sql`count(*)`));

    return result.map(r => ({
      filterId: r.filterId || '',
      filterValue: r.filterValue || '',
      clickCount: r.clickCount,
    }));
  }

  async addOrUpdatePendingLessonNotification(courseId: string, lessonId: string): Promise<void> {
    const scheduledFor = new Date();
    scheduledFor.setMinutes(scheduledFor.getMinutes() + 60)

    const existing = await db
      .select()
      .from(pendingLessonNotifications)
      .where(
        and(
          eq(pendingLessonNotifications.courseId, courseId),
          eq(pendingLessonNotifications.processed, false)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      const currentLessonIds = existing[0].lessonIds || [];
      if (!currentLessonIds.includes(lessonId)) {
        await db
          .update(pendingLessonNotifications)
          .set({
            lessonIds: [...currentLessonIds, lessonId],
          })
          .where(eq(pendingLessonNotifications.id, existing[0].id));
      }
    } else {
      await db.insert(pendingLessonNotifications).values({
        courseId,
        lessonIds: [lessonId],
        scheduledFor,
        processed: false,
      });
    }
  }

  async getPendingLessonNotificationsToProcess(): Promise<PendingLessonNotification[]> {
    const now = new Date();

    const result = await db
      .select()
      .from(pendingLessonNotifications)
      .where(
        and(
          eq(pendingLessonNotifications.processed, false),
          lte(pendingLessonNotifications.scheduledFor, now)
        )
      );

    return result as PendingLessonNotification[];
  }

  async markPendingLessonNotificationAsProcessed(id: string): Promise<void> {
    await db
      .update(pendingLessonNotifications)
      .set({ processed: true })
      .where(eq(pendingLessonNotifications.id, id));
  }


  async getInactiveUsersForEngagement(notificationType: '1_week' | '2_weeks' | '1_month'): Promise<User[]> {

    const now = new Date();
    let thresholdDate: Date;

    switch (notificationType) {
      case '1_week':
        thresholdDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '2_weeks':
        thresholdDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        break;
      case '1_month':
        thresholdDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }





    const result = await db
      .select()
      .from(users)
      .leftJoin(
        engagementNotifications,
        and(
          eq(engagementNotifications.userId, users.id),
          eq(engagementNotifications.notificationType, notificationType)
        )
      )
      .where(
        and(
          isNotNull(users.telegramChatId),
          lte(users.lastActivityAt, thresholdDate),
          isNull(engagementNotifications.id)
        )
      );

    return result.map(row => row.users);
  }

  async createEngagementNotification(userId: string, notificationType: '1_week' | '2_weeks' | '1_month'): Promise<EngagementNotification> {
    const result = await db
      .insert(engagementNotifications)
      .values({
        userId,
        notificationType,
      })
      .returning();

    return result[0];
  }

  async hasReceivedEngagementNotification(userId: string, notificationType: '1_week' | '2_weeks' | '1_month'): Promise<boolean> {
    const result = await db
      .select()
      .from(engagementNotifications)
      .where(
        and(
          eq(engagementNotifications.userId, userId),
          eq(engagementNotifications.notificationType, notificationType)
        )
      )
      .limit(1);

    return result.length > 0;
  }

  async hasSentEngagementNotificationsToday(): Promise<boolean> {

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const result = await db
      .select()
      .from(engagementNotifications)
      .where(gte(engagementNotifications.sentAt, todayStart))
      .limit(1);

    return result.length > 0;
  }


  async hasCompletedSchedulerRun(schedulerName: string, runDate: string): Promise<boolean> {
    const result = await db
      .select()
      .from(schedulerRuns)
      .where(
        and(
          eq(schedulerRuns.schedulerName, schedulerName),
          eq(schedulerRuns.runDate, runDate),
          eq(schedulerRuns.status, 'completed')
        )
      )
      .limit(1);

    return result.length > 0;
  }

  async getSchedulerRun(schedulerName: string, runDate: string): Promise<SchedulerRun | undefined> {
    const result = await db
      .select()
      .from(schedulerRuns)
      .where(
        and(
          eq(schedulerRuns.schedulerName, schedulerName),
          eq(schedulerRuns.runDate, runDate)
        )
      )
      .limit(1);

    return result[0];
  }

  async createSchedulerRun(schedulerName: string, runDate: string): Promise<SchedulerRun> {
    const result = await db
      .insert(schedulerRuns)
      .values({
        schedulerName,
        runDate,
        status: 'running',
      })
      .returning();

    return result[0];
  }

  async updateSchedulerRunToRunning(id: string): Promise<void> {
    await db
      .update(schedulerRuns)
      .set({
        status: 'running',
        startedAt: new Date(),
        completedAt: null,
        errorMessage: null,
      })
      .where(eq(schedulerRuns.id, id));
  }

  async markSchedulerRunCompleted(id: string): Promise<void> {
    await db
      .update(schedulerRuns)
      .set({
        status: 'completed',
        completedAt: new Date(),
      })
      .where(eq(schedulerRuns.id, id));
  }

  async markSchedulerRunFailed(id: string, errorMessage: string): Promise<void> {
    await db
      .update(schedulerRuns)
      .set({
        status: 'failed',
        completedAt: new Date(),
        errorMessage,
      })
      .where(eq(schedulerRuns.id, id));
  }

  async getChatConversationsByUser(userId: string): Promise<ChatConversation[]> {
    return db.select().from(chatConversations).where(eq(chatConversations.userId, userId)).orderBy(desc(chatConversations.lastMessageAt));
  }

  async getChatConversationsByGuest(guestToken: string): Promise<ChatConversation[]> {
    return db.select().from(chatConversations).where(eq(chatConversations.guestToken, guestToken)).orderBy(desc(chatConversations.lastMessageAt));
  }

  async getChatConversation(id: string): Promise<ChatConversation | undefined> {
    const [conv] = await db.select().from(chatConversations).where(eq(chatConversations.id, id));
    return conv;
  }

  async createChatConversation(data: Partial<InsertChatConversation> & { userId?: string | null }): Promise<ChatConversation> {
    const [conv] = await db.insert(chatConversations).values({
      userId: data.userId || null,
      subject: data.subject || null,
      status: data.status || 'open',
      priority: data.priority || 'normal',
      tags: data.tags || [],
      guestName: (data as any).guestName || null,
      guestToken: (data as any).guestToken || null,
    }).returning();
    return conv;
  }

  async linkGuestConversations(guestToken: string, userId: string): Promise<number> {
    const guestConvs = await db.select().from(chatConversations).where(eq(chatConversations.guestToken, guestToken));
    if (guestConvs.length === 0) return 0;

    const userConvs = await db.select().from(chatConversations)
      .where(and(eq(chatConversations.userId, userId), sql`${chatConversations.guestToken} IS NULL`))
      .orderBy(desc(chatConversations.lastMessageAt));

    if (userConvs.length > 0) {
      const targetConv = userConvs[0];
      for (const gc of guestConvs) {
        await db.update(chatMessages)
          .set({ conversationId: targetConv.id, senderId: userId })
          .where(eq(chatMessages.conversationId, gc.id));
        await db.delete(chatConversations).where(eq(chatConversations.id, gc.id));
      }
      const allMsgs = await db.select().from(chatMessages)
        .where(eq(chatMessages.conversationId, targetConv.id))
        .orderBy(desc(chatMessages.createdAt))
        .limit(1);
      if (allMsgs.length > 0) {
        await db.update(chatConversations).set({
          lastMessage: allMsgs[0].text.substring(0, 200),
          lastMessageAt: allMsgs[0].createdAt,
          updatedAt: new Date(),
        }).where(eq(chatConversations.id, targetConv.id));
      }
      return guestConvs.length;
    }

    const result = await db.update(chatConversations)
      .set({ userId, guestToken: null, guestName: null, updatedAt: new Date() })
      .where(eq(chatConversations.guestToken, guestToken))
      .returning();

    await db.update(chatMessages)
      .set({ senderId: userId })
      .where(and(
        sql`${chatMessages.senderId} IS NULL`,
        inArray(chatMessages.conversationId, result.map(c => c.id))
      ));

    return result.length;
  }

  async updateChatConversation(id: string, data: Partial<ChatConversation>): Promise<ChatConversation | undefined> {
    const [conv] = await db.update(chatConversations).set({ ...data, updatedAt: new Date() }).where(eq(chatConversations.id, id)).returning();
    return conv;
  }

  async getChatMessages(conversationId: string): Promise<ChatMessage[]> {
    return db.select().from(chatMessages).where(eq(chatMessages.conversationId, conversationId)).orderBy(chatMessages.createdAt);
  }

  async createChatMessage(data: InsertChatMessage): Promise<ChatMessage> {
    const [msg] = await db.insert(chatMessages).values(data).returning();
    await db.update(chatConversations).set({
      lastMessage: data.text.substring(0, 200),
      lastMessageAt: new Date(),
      updatedAt: new Date(),
      ...(data.role === 'client' ? { unreadAdmin: sql`${chatConversations.unreadAdmin} + 1` } : { unreadUser: sql`${chatConversations.unreadUser} + 1` }),
    }).where(eq(chatConversations.id, data.conversationId));
    return msg;
  }

  async markChatMessagesRead(conversationId: string, role: string): Promise<void> {
    const readerRole = role === 'admin' ? 'client' : 'admin';
    await db.update(chatMessages).set({ isRead: true }).where(and(eq(chatMessages.conversationId, conversationId), eq(chatMessages.role, readerRole)));
    if (role === 'admin') {
      await db.update(chatConversations).set({ unreadAdmin: 0 }).where(eq(chatConversations.id, conversationId));
    } else {
      await db.update(chatConversations).set({ unreadUser: 0 }).where(eq(chatConversations.id, conversationId));
    }
  }

  async getChatMessageById(id: string): Promise<ChatMessage | undefined> {
    const [msg] = await db.select().from(chatMessages).where(eq(chatMessages.id, id));
    return msg;
  }

  async updateChatMessageReactions(id: string, reactions: string[]): Promise<ChatMessage | undefined> {
    const [msg] = await db.update(chatMessages).set({ reactions }).where(eq(chatMessages.id, id)).returning();
    return msg;
  }

  async getAllChatConversations(filters?: { status?: string; priority?: string; assigneeId?: string }): Promise<any[]> {
    let query = db.select({
      conversation: chatConversations,
      userName: sql<string>`COALESCE((SELECT first_name || ' ' || last_name FROM users WHERE id = ${chatConversations.userId}), ${chatConversations.guestName}, 'Гость')`,
      userEmail: sql<string>`COALESCE((SELECT email FROM users WHERE id = ${chatConversations.userId}), '—')`,
      assigneeName: sql<string>`(SELECT first_name || ' ' || last_name FROM users WHERE id = ${chatConversations.assigneeId})`,
    }).from(chatConversations).orderBy(desc(chatConversations.lastMessageAt)).$dynamic();

    const conditions: SQL[] = [];
    if (filters?.status) conditions.push(eq(chatConversations.status, filters.status));
    if (filters?.priority) conditions.push(eq(chatConversations.priority, filters.priority));
    if (filters?.assigneeId) conditions.push(eq(chatConversations.assigneeId, filters.assigneeId));

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return query;
  }

  async getChatStats(): Promise<{ total: number; open: number; pending: number; resolved: number; unread: number }> {
    const [stats] = await db.select({
      total: sql<number>`count(*)::int`,
      open: sql<number>`count(*) filter (where status = 'open')::int`,
      pending: sql<number>`count(*) filter (where status = 'pending')::int`,
      resolved: sql<number>`count(*) filter (where status = 'resolved')::int`,
      unread: sql<number>`sum(unread_admin)::int`,
    }).from(chatConversations);
    return { total: stats.total || 0, open: stats.open || 0, pending: stats.pending || 0, resolved: stats.resolved || 0, unread: stats.unread || 0 };
  }

  async getChatTemplates(): Promise<ChatTemplate[]> {
    return db.select().from(chatTemplates).orderBy(desc(chatTemplates.uses));
  }

  async createChatTemplate(data: InsertChatTemplate): Promise<ChatTemplate> {
    const [tpl] = await db.insert(chatTemplates).values(data).returning();
    return tpl;
  }

  async updateChatTemplate(id: string, data: Partial<ChatTemplate>): Promise<ChatTemplate | undefined> {
    const [tpl] = await db.update(chatTemplates).set({ ...data, updatedAt: new Date() }).where(eq(chatTemplates.id, id)).returning();
    return tpl;
  }

  async deleteChatTemplate(id: string): Promise<void> {
    await db.delete(chatTemplates).where(eq(chatTemplates.id, id));
  }

  async incrementChatTemplateUses(id: string): Promise<void> {
    await db.update(chatTemplates).set({ uses: sql`${chatTemplates.uses} + 1` }).where(eq(chatTemplates.id, id));
  }

  async getChatSettings(): Promise<ChatSettings> {
    const [settings] = await db.select().from(chatSettings).limit(1);
    if (settings) return settings;
    const [created] = await db.insert(chatSettings).values({}).returning();
    return created;
  }

  async updateChatSettings(data: Partial<ChatSettings>): Promise<ChatSettings> {
    const existing = await this.getChatSettings();
    const [settings] = await db.update(chatSettings).set({ ...data, updatedAt: new Date() }).where(eq(chatSettings.id, existing.id)).returning();
    return settings!;
  }

  async getChatUserInfo(userId: string): Promise<any> {
    const [user] = await db.select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      balance: users.balance,
      fantiks: users.fantiks,
      createdAt: users.createdAt,
      city: users.registrationCity,
    }).from(users).where(eq(users.id, userId));
    if (!user) return null;
    const purchaseCount = await db.select({ count: sql<number>`count(*)::int` }).from(purchases).where(eq(purchases.userId, userId));
    return { ...user, purchases: purchaseCount[0]?.count || 0 };
  }
}

export const storage = new DatabaseStorage();