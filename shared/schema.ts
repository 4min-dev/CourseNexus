import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import {
  index,
  uniqueIndex,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  decimal,
  boolean,
  unique,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";


export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);


export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  passwordHash: varchar("password_hash"),
  telegramId: varchar("telegram_id").unique(),
  telegramChatId: varchar("telegram_chat_id").unique(),
  telegramUsername: varchar("telegram_username"),
  telegramFirstName: varchar("telegram_first_name"),
  telegramLastName: varchar("telegram_last_name"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  selectedAwardId: varchar("selected_award_id"),
  phoneNumber: varchar("phone_number"),
  balance: decimal("balance", { precision: 10, scale: 2 }).default("0").notNull(),
  referralBalance: decimal("referral_balance", { precision: 10, scale: 2 }).default("0").notNull(),
  fantiks: integer("fantiks").default(0).notNull(),
  referralCode: varchar("referral_code").unique(),
  promoCode: varchar("promo_code").unique(),
  referralBonusPercent: integer("referral_bonus_percent"),
  referralDiscount: integer("referral_discount").default(0).notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  isBlocked: boolean("is_blocked").default(false).notNull(),
  lastViewedLessonId: varchar("last_viewed_lesson_id", { length: 36 }),
  require_2fa: boolean("require_2fa").default(false).notNull(),

  landingVisitId: varchar("landing_visit_id").references(() => landingVisits.id, { onDelete: 'set null' }),
  registrationIp: varchar("registration_ip"),
  registrationCountry: varchar("registration_country"),
  registrationCity: varchar("registration_city"),
  registrationBrowser: varchar("registration_browser"),
  registrationDevice: varchar("registration_device"),
  registrationOs: varchar("registration_os"),
  registrationUserAgent: text("registration_user_agent"),
  lastActivityAt: timestamp("last_activity_at").defaultNow(),
  lastReminderSent: timestamp("last_reminder_sent"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_users_last_activity").on(table.lastActivityAt),
  index("idx_users_created_at").on(table.createdAt),
  index("idx_users_landing_visit").on(table.landingVisitId),
]);

export const usersRelations = relations(users, ({ many, one }) => ({
  purchases: many(purchases),
  programPurchases: many(programPurchases),
  referralsGiven: many(referrals, { relationName: "referrer" }),
  referralsReceived: many(referrals, { relationName: "referred" }),
  userTasks: many(userTasks),
  userAwards: many(userAwards),
  balanceTransactions: many(balanceTransactions),
  reviews: many(reviews),
  programReviews: many(programReviews),
  reviewVotes: many(reviewVotes),
  lessonProgress: many(lessonProgress),
  vipPackages: many(vipPackages),
  favorites: many(favorites),
  courseRequests: many(courseRequests),
  courseRequestVotes: many(courseRequestVotes),
  notifications: many(notifications),
  userLogins: many(userLogins),
  telegramVerificationCodes: many(telegramVerificationCodes),
  engagementNotifications: many(engagementNotifications),
  landingVisit: one(landingVisits, {
    fields: [users.landingVisitId],
    references: [landingVisits.id],
  }),
  selectedAward: one(awards, {
    fields: [users.selectedAwardId],
    references: [awards.id],
  }),
}));


export const userLogins = pgTable("user_logins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  loginDate: timestamp("login_date").notNull().defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_user_logins_user_id").on(table.userId),
  index("idx_user_logins_date").on(table.loginDate),

  uniqueIndex("idx_user_logins_user_date").on(table.userId, sql`DATE(${table.loginDate})`),
]);

export const userLoginsRelations = relations(userLogins, ({ one }) => ({
  user: one(users, {
    fields: [userLogins.userId],
    references: [users.id],
  }),
}));

export type UserLogin = typeof userLogins.$inferSelect;
export type InsertUserLogin = typeof userLogins.$inferInsert;


export const telegramVerificationCodes = pgTable("telegram_verification_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }),
  email: varchar("email"),
  code: varchar("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isUsed: boolean("is_used").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_telegram_codes_user_id").on(table.userId),
  index("idx_telegram_codes_email").on(table.email),
  index("idx_telegram_codes_expires_at").on(table.expiresAt),
]);

export const telegramVerificationCodesRelations = relations(telegramVerificationCodes, ({ one }) => ({
  user: one(users, {
    fields: [telegramVerificationCodes.userId],
    references: [users.id],
  }),
}));

export type TelegramVerificationCode = typeof telegramVerificationCodes.$inferSelect;
export type InsertTelegramVerificationCode = typeof telegramVerificationCodes.$inferInsert;


export const landingVisits = pgTable("landing_visits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fingerprint: varchar("fingerprint").notNull(),
  sessionId: varchar("session_id"),
  ip: varchar("ip"),
  country: varchar("country"),
  city: varchar("city"),
  browser: varchar("browser"),
  device: varchar("device"),
  os: varchar("os"),
  userAgent: text("user_agent"),
  referer: text("referer"),
  utmSource: varchar("utm_source"),
  utmMedium: varchar("utm_medium"),
  utmCampaign: varchar("utm_campaign"),
  visitedAt: timestamp("visited_at").defaultNow(),
  convertedToRegistration: boolean("converted_to_registration").default(false).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_landing_visits_fingerprint").on(table.fingerprint),
  index("idx_landing_visits_visited_at").on(table.visitedAt),
  index("idx_landing_visits_converted").on(table.convertedToRegistration),
  index("idx_landing_visits_user_id").on(table.userId),
]);

export const landingVisitsRelations = relations(landingVisits, ({ one }) => ({
  user: one(users, {
    fields: [landingVisits.userId],
    references: [users.id],
  }),
}));


export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentId: varchar("parent_id").references((): AnyPgColumn => categories.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  nameEn: varchar("name_en", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  displayOrder: integer("display_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_categories_parent").on(table.parentId),
]);

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: "parent_category",
  }),
  children: many(categories, { relationName: "parent_category" }),
  subcategories: many(subcategories),
}));


export const subcategories = pgTable("subcategories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  categoryId: varchar("category_id").notNull().references(() => categories.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  nameEn: varchar("name_en", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  displayOrder: integer("display_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_subcategories_category").on(table.categoryId),
]);

export const subcategoriesRelations = relations(subcategories, ({ one, many }) => ({
  category: one(categories, {
    fields: [subcategories.categoryId],
    references: [categories.id],
  }),
  courseSubcategories: many(courseSubcategories),
}));


export const courses = pgTable("courses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  authorName: text("author_name"),
  authorBio: text("author_bio"),
  authorImage: text("author_image"),
  price: decimal("price", { precision: 10, scale: 2 }).default("0"),
  fantikPrice: integer("fantik_price"),
  paymentType: varchar("payment_type", { length: 20 }).default("money_only"),
  thumbnailImage: text("thumbnail_image"),
  platform: varchar("platform", { length: 50 }),
  level: text("level").array(),
  year: integer("year"),
  keywords: text("keywords").array(),
  isFree: boolean("is_free").default(false).notNull(),
  isVipSubscription: boolean("is_vip_subscription").default(false).notNull(),
  vipTier: varchar("vip_tier", { length: 20 }),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0"),
  reviewsCount: integer("reviews_count").default(0).notNull(),
  hasPreviewLesson: boolean("has_preview_lesson").default(false).notNull(),
  hiddenInShop: boolean("hidden_in_shop").default(false).notNull(),
  hiddenInLibrary: boolean("hidden_in_library").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_courses_platform").on(table.platform),
  index("idx_courses_year").on(table.year),
  index("idx_courses_vip").on(table.isVipSubscription),
  index("idx_courses_price").on(table.price),
  index("idx_courses_platform_vip").on(table.platform, table.isVipSubscription),
]);

export const coursesRelations = relations(courses, ({ many }) => ({
  purchases: many(purchases),
  reviews: many(reviews),
  sections: many(courseSections),
  courseSubcategories: many(courseSubcategories),
  favorites: many(favorites),
}));


export const courseSubcategories = pgTable("course_subcategories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: 'cascade' }),
  subcategoryId: varchar("subcategory_id").notNull().references(() => subcategories.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_course_subcategories_course").on(table.courseId),
  index("idx_course_subcategories_subcategory").on(table.subcategoryId),
]);

export const courseSubcategoriesRelations = relations(courseSubcategories, ({ one }) => ({
  course: one(courses, {
    fields: [courseSubcategories.courseId],
    references: [courses.id],
  }),
  subcategory: one(subcategories, {
    fields: [courseSubcategories.subcategoryId],
    references: [subcategories.id],
  }),
}));


export const purchases = pgTable("purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: 'cascade' }),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  paidFromBalance: decimal("paid_from_balance", { precision: 10, scale: 2 }).default("0").notNull(),
  paidFromReferralBalance: decimal("paid_from_referral_balance", { precision: 10, scale: 2 }).default("0").notNull(),
  paidFantiks: integer("paid_fantiks").default(0).notNull(),
  purchaseDate: timestamp("purchase_date").defaultNow(),
  viewedInLibrary: boolean("viewed_in_library").default(false).notNull(),
}, (table) => [

  uniqueIndex("idx_user_course_unique").on(table.userId, table.courseId),

  index("idx_purchases_user_id").on(table.userId),
  index("idx_purchases_course_id").on(table.courseId),
  index("idx_purchases_purchase_date").on(table.purchaseDate),
]);

export const purchasesRelations = relations(purchases, ({ one }) => ({
  user: one(users, {
    fields: [purchases.userId],
    references: [users.id],
  }),
  course: one(courses, {
    fields: [purchases.courseId],
    references: [courses.id],
  }),
}));


export const favorites = pgTable("favorites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [

  uniqueIndex("idx_user_course_favorite").on(table.userId, table.courseId),
  index("idx_favorites_user").on(table.userId),
  index("idx_favorites_course").on(table.courseId),
]);

export const favoritesRelations = relations(favorites, ({ one }) => ({
  user: one(users, {
    fields: [favorites.userId],
    references: [users.id],
  }),
  course: one(courses, {
    fields: [favorites.courseId],
    references: [courses.id],
  }),
}));


export const referrals = pgTable("referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referrerId: varchar("referrer_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  referredUserId: varchar("referred_user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: varchar("status", { length: 50 }).default("pending").notNull(),
  earnings: decimal("earnings", { precision: 10, scale: 2 }).default("0").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
}, (table) => [

  index("idx_referrals_referrer_id").on(table.referrerId),
  index("idx_referrals_referred_user_id").on(table.referredUserId),
  index("idx_referrals_created_at").on(table.createdAt),
  index("idx_referrals_status").on(table.status),
]);

export const referralsRelations = relations(referrals, ({ one }) => ({
  referrer: one(users, {
    fields: [referrals.referrerId],
    references: [users.id],
    relationName: "referrer",
  }),
  referredUser: one(users, {
    fields: [referrals.referredUserId],
    references: [users.id],
    relationName: "referred",
  }),
}));


export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  reward: integer("reward").notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  category: varchar("category", { length: 50 }).default("general").notNull(),
  difficulty: varchar("difficulty", { length: 20 }).default("easy").notNull(),
  requiredLevel: integer("required_level").default(1).notNull(),
  requiredTaskId: varchar("required_task_id").references((): AnyPgColumn => tasks.id),
  targetValue: integer("target_value").default(1).notNull(),
  icon: varchar("icon", { length: 50 }).default("trophy").notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
  isRepeatable: boolean("is_repeatable").default(false).notNull(),
  resetPeriod: varchar("reset_period", { length: 20 }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_tasks_type").on(table.type),
  index("idx_tasks_category").on(table.category),
  index("idx_tasks_difficulty").on(table.difficulty),
]);

export const tasksRelations = relations(tasks, ({ many }) => ({
  userTasks: many(userTasks),
}));


export const userTasks = pgTable("user_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  taskId: varchar("task_id").notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  currentProgress: integer("current_progress").default(0).notNull(),
  targetValue: integer("target_value").default(1).notNull(),
  completedAt: timestamp("completed_at"),
  rewardClaimed: boolean("reward_claimed").default(false).notNull(),
  fantiksEarned: integer("fantiks_earned").notNull(),
  lastResetAt: timestamp("last_reset_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_user_tasks_user").on(table.userId),
  index("idx_user_tasks_task").on(table.taskId),
  index("idx_user_tasks_user_task").on(table.userId, table.taskId),
]);

export const userTasksRelations = relations(userTasks, ({ one }) => ({
  user: one(users, {
    fields: [userTasks.userId],
    references: [users.id],
  }),
  task: one(tasks, {
    fields: [userTasks.taskId],
    references: [tasks.id],
  }),
}));


export const awards = pgTable("awards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url").notNull(),
  requiredTaskId: varchar("required_task_id").references(() => tasks.id, { onDelete: 'set null' }),
  rarity: varchar("rarity", { length: 20 }).default("common").notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_awards_rarity").on(table.rarity),
  index("idx_awards_task").on(table.requiredTaskId),
]);

export const awardsRelations = relations(awards, ({ one, many }) => ({
  requiredTask: one(tasks, {
    fields: [awards.requiredTaskId],
    references: [tasks.id],
  }),
  userAwards: many(userAwards),
}));


export const userAwards = pgTable("user_awards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  awardId: varchar("award_id").notNull().references(() => awards.id, { onDelete: 'cascade' }),
  earnedAt: timestamp("earned_at").defaultNow(),
}, (table) => [
  index("idx_user_awards_user").on(table.userId),
  index("idx_user_awards_award").on(table.awardId),
  unique("unique_user_award").on(table.userId, table.awardId),
]);

export const userAwardsRelations = relations(userAwards, ({ one }) => ({
  user: one(users, {
    fields: [userAwards.userId],
    references: [users.id],
  }),
  award: one(awards, {
    fields: [userAwards.awardId],
    references: [awards.id],
  }),
}));


export const balanceTransactions = pgTable('balance_transactions', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  externalId: varchar('external_id', { length: 255 }),
  currency: varchar('currency', { length: 10 }).notNull().default('RUB'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => [

  index("idx_balance_transactions_user_id").on(table.userId),
  index("idx_balance_transactions_created_at").on(table.createdAt),
  index("idx_balance_transactions_type").on(table.type),
]);

export const balanceTransactionsRelations = relations(balanceTransactions, ({ one }) => ({
  user: one(users, {
    fields: [balanceTransactions.userId],
    references: [users.id],
  }),
}));


export const reviews = pgTable("reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: 'cascade' }),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  moderatedBy: varchar("moderated_by").references(() => users.id, { onDelete: 'set null' }),
  moderatedAt: timestamp("moderated_at"),
  moderationComment: text("moderation_comment"),
  adminComment: text("admin_comment"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_reviews_course").on(table.courseId),
  index("idx_reviews_user_course").on(table.userId, table.courseId),
  index("idx_reviews_status").on(table.status),
]);

export const reviewsRelations = relations(reviews, ({ one, many }) => ({
  user: one(users, {
    fields: [reviews.userId],
    references: [users.id],
  }),
  course: one(courses, {
    fields: [reviews.courseId],
    references: [courses.id],
  }),
  moderator: one(users, {
    fields: [reviews.moderatedBy],
    references: [users.id],
  }),
  votes: many(reviewVotes),
}));


export const reviewVotes = pgTable("review_votes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reviewId: varchar("review_id").notNull().references(() => reviews.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  voteType: varchar("vote_type", { length: 10 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_review_votes_review").on(table.reviewId),
  unique("unique_review_vote").on(table.reviewId, table.userId),
]);

export const reviewVotesRelations = relations(reviewVotes, ({ one }) => ({
  review: one(reviews, {
    fields: [reviewVotes.reviewId],
    references: [reviews.id],
  }),
  user: one(users, {
    fields: [reviewVotes.userId],
    references: [users.id],
  }),
}));


export const courseSections = pgTable("course_sections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  description: text("description"),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_course_sections_course").on(table.courseId),
]);

export const courseSectionsRelations = relations(courseSections, ({ one, many }) => ({
  course: one(courses, {
    fields: [courseSections.courseId],
    references: [courses.id],
  }),
  lessons: many(lessons),
}));


export const lessons = pgTable("lessons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sectionId: varchar("section_id").notNull().references(() => courseSections.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  description: text("description"),
  videoUrl: text("video_url"),
  order: integer("order").notNull(),
  duration: integer("duration"),
  processingStatus: varchar("processing_status", { length: 50 }).default('draft').notNull(),
  uploadProgress: integer("upload_progress").default(0),
  conversionProgress: integer('conversionProgress').default(0),
  errorMessage: text("error_message"),
  uploadedBy: text("uploaded_by"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_lessons_section").on(table.sectionId),
]);

export const lessonsRelations = relations(lessons, ({ one, many }) => ({
  section: one(courseSections, {
    fields: [lessons.sectionId],
    references: [courseSections.id],
  }),
  progress: many(lessonProgress),
  files: many(courseFiles),
}));


export const lessonProgress = pgTable("lesson_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  lessonId: varchar("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
  completed: boolean("completed").default(false).notNull(),
  completedAt: timestamp("completed_at"),
  watchedSeconds: integer("watched_seconds").default(0),
  lastWatchedSeconds: integer("last_watched_seconds").default(0),
  lastAccessedAt: timestamp("last_accessed_at").defaultNow()
}, (table) => [
  index("idx_lesson_progress_user").on(table.userId),
  index("idx_lesson_progress_lesson").on(table.lessonId),
  unique("unique_user_lesson_progress").on(table.userId, table.lessonId)
])

export const lessonProgressRelations = relations(lessonProgress, ({ one }) => ({
  user: one(users, {
    fields: [lessonProgress.userId],
    references: [users.id],
  }),
  lesson: one(lessons, {
    fields: [lessonProgress.lessonId],
    references: [lessons.id],
  }),
}));


export const siteSettings = pgTable("site_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  logoUrl: text("logo_url"),
  siteName: text("site_name").notNull().default("Курсы маркетплейсов"),
  siteDescription: text("site_description").default("Онлайн-курсы по маркетплейсам"),
  supportEmail: text("support_email").default("support@example.com"),
  telegramBotUsername: text("telegram_bot_username").default(""),
  telegramBotToken: text("telegram_bot_token").default(""),
  headerTitle: text("header_title"),
  headerSubtitle: text("header_subtitle"),
  referralBonusPercent: integer("referral_bonus_percent").default(30).notNull(),
  require2FA: varchar("require_2fa").default("disabled").notNull(),
  skip2FAOnLogin: boolean("skip_2fa_on_login").default(false).notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});


export const vipPageContent = pgTable("vip_page_content", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pageTitle: text("page_title").notNull().default("VIP Подписки"),
  pageSubtitle: text("page_subtitle").notNull().default("Выберите подходящий тариф и получите эксклюзивный доступ к курсам, персональной поддержке и закрытым материалам для успешного обучения"),
  updatedAt: timestamp("updated_at").defaultNow(),
});


export const vipTiers = pgTable("vip_tiers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tier: varchar("tier", { length: 20 }).notNull().unique(),
  displayName: text("display_name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).default("0"),
  features: text("features").array().notNull().default(sql`ARRAY[]::text[]`),
  displayOrder: integer("display_order").default(0).notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});


export const vipPackages = pgTable("vip_packages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  tier: varchar("tier", { length: 20 }).notNull(),
  purchaseDate: timestamp("purchase_date").defaultNow(),
  isActivated: boolean("is_activated").default(false).notNull(),
  currentYearLimit: integer("current_year_limit").notNull(),
  previousYearsLimit: integer("previous_years_limit").notNull(),
  currentYearSelected: integer("current_year_selected").default(0).notNull(),
  previousYearsSelected: integer("previous_years_selected").default(0).notNull(),
  referralBonusPercent: integer("referral_bonus_percent").default(0),
  viewedInLibrary: boolean("viewed_in_library").default(false).notNull(),
}, (table) => [
  index("idx_vip_packages_user").on(table.userId),
]);

export const vipPackagesRelations = relations(vipPackages, ({ one }) => ({
  user: one(users, {
    fields: [vipPackages.userId],
    references: [users.id],
  }),
}));


export const menuItems = pgTable("menu_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  label: text("label").notNull(),
  href: text("href"),
  parentId: varchar("parent_id").references((): any => menuItems.id, { onDelete: 'cascade' }),
  displayOrder: integer("display_order").default(0).notNull(),
  isExternal: boolean("is_external").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});


export const courseFiles = pgTable("course_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: 'cascade' }),
  lessonId: varchar("lesson_id").references(() => lessons.id, { onDelete: 'cascade' }),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  fileType: varchar("file_type", { length: 50 }).notNull(),
  fileSize: integer("file_size"),
  displayOrder: integer("display_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_course_files_course").on(table.courseId),
  index("idx_course_files_lesson").on(table.lessonId),
]);

export const courseFilesRelations = relations(courseFiles, ({ one }) => ({
  course: one(courses, {
    fields: [courseFiles.courseId],
    references: [courses.id],
  }),
  lesson: one(lessons, {
    fields: [courseFiles.lessonId],
    references: [lessons.id],
  }),
}));


export const infoBanners = pgTable("info_banners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  message: text("message").notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});


export const coursePackages = pgTable("course_packages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  thumbnailUrl: text("thumbnail_url"),
  discount: integer("discount").default(0).notNull(),
  categoryIds: text("category_ids").array(),
  displayOrder: integer("display_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});


export const packageCourses = pgTable("package_courses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  packageId: varchar("package_id").notNull().references(() => coursePackages.id, { onDelete: 'cascade' }),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: 'cascade' }),
  displayOrder: integer("display_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_package_courses_package").on(table.packageId),
  index("idx_package_courses_course").on(table.courseId),
  unique("unique_package_course").on(table.packageId, table.courseId),
]);

export const coursePackagesRelations = relations(coursePackages, ({ many }) => ({
  packageCourses: many(packageCourses),
}));

export const packageCoursesRelations = relations(packageCourses, ({ one }) => ({
  package: one(coursePackages, {
    fields: [packageCourses.packageId],
    references: [coursePackages.id],
  }),
  course: one(courses, {
    fields: [packageCourses.courseId],
    references: [courses.id],
  }),
}));


export const insertCourseSchema = createInsertSchema(courses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  authorName: z.string().optional(),
  price: z.string().or(z.number()).optional(),
  fantikPrice: z.number().int().positive().optional().nullable(),
  paymentType: z.enum(['money_only', 'fantiks_only', 'both']).optional(),
  platform: z.string().optional(),
  level: z.array(z.string()).optional(),
  year: z.number().optional(),
  isVipSubscription: z.boolean().optional(),
  vipTier: z.enum(['bronze', 'silver', 'gold', 'diamond']).optional(),
});

export const insertCourseSubcategorySchema = createInsertSchema(courseSubcategories).omit({
  id: true,
  createdAt: true,
});

export const insertPurchaseSchema = createInsertSchema(purchases).omit({
  id: true,
  purchaseDate: true,
});

export const insertFavoriteSchema = createInsertSchema(favorites).omit({
  id: true,
  createdAt: true,
});

export const insertReferralSchema = createInsertSchema(referrals).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
});

export const insertUserTaskSchema = createInsertSchema(userTasks).omit({
  id: true,
  completedAt: true,
});

export const insertAwardSchema = createInsertSchema(awards).omit({
  id: true,
  createdAt: true,
});

export const insertUserAwardSchema = createInsertSchema(userAwards).omit({
  id: true,
  earnedAt: true,
});

export const insertBalanceTransactionSchema = createInsertSchema(balanceTransactions).omit({
  id: true,
  createdAt: true,
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  userId: true,
  status: true,
  moderatedBy: true,
  moderatedAt: true,
  moderationComment: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  rating: z.number().int().min(1).max(5),
  comment: z.union([
    z.string().max(1000, "Review must be less than 1000 characters"),
    z.literal("")
  ]).optional(),
});

export const insertReviewVoteSchema = createInsertSchema(reviewVotes).omit({
  id: true,
  createdAt: true,
});

export const insertCourseSectionSchema = createInsertSchema(courseSections).omit({
  id: true,
  createdAt: true,
});

export const insertLessonSchema = createInsertSchema(lessons).omit({
  id: true,
  createdAt: true,
});

export const insertLessonProgressSchema = createInsertSchema(lessonProgress).omit({
  id: true,
  completedAt: true,
  lastAccessedAt: true,
});

export const insertSiteSettingsSchema = createInsertSchema(siteSettings).omit({
  id: true,
  updatedAt: true,
}).extend({
  require2FA: z.enum(['disabled', 'optional', 'mandatory']).default('disabled'),
});

export const insertVipPageContentSchema = createInsertSchema(vipPageContent).omit({
  id: true,
  updatedAt: true,
});

export const insertVipTierSchema = createInsertSchema(vipTiers).omit({
  id: true,
  updatedAt: true,
});

export const insertVipPackageSchema = createInsertSchema(vipPackages).omit({
  id: true,
  purchaseDate: true,
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  slug: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  order: z.number().optional(),
  nameEn: z.string().optional(),
});

export const insertSubcategorySchema = createInsertSchema(subcategories).omit({
  id: true,
  slug: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  order: z.number().optional(),
});

export const insertMenuItemSchema = createInsertSchema(menuItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  order: z.number().optional(),
});

export const insertCourseFileSchema = createInsertSchema(courseFiles).omit({
  id: true,
  createdAt: true,
});

export const insertInfoBannerSchema = createInsertSchema(infoBanners).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCoursePackageSchema = createInsertSchema(coursePackages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPackageCourseSchema = createInsertSchema(packageCourses).omit({
  id: true,
  createdAt: true,
});


export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type Course = typeof courses.$inferSelect & {
  previewVideoUrl?: string | null;
  subcategoryIds?: string[];
};

export type InsertCourseSubcategory = z.infer<typeof insertCourseSubcategorySchema>;
export type CourseSubcategory = typeof courseSubcategories.$inferSelect;

export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;
export type Purchase = typeof purchases.$inferSelect;

export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;
export type Favorite = typeof favorites.$inferSelect;

export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type Referral = typeof referrals.$inferSelect;

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

export type InsertUserTask = z.infer<typeof insertUserTaskSchema>;
export type UserTask = typeof userTasks.$inferSelect;

export type InsertAward = z.infer<typeof insertAwardSchema>;
export type Award = typeof awards.$inferSelect;

export type InsertUserAward = z.infer<typeof insertUserAwardSchema>;
export type UserAward = typeof userAwards.$inferSelect;

export type InsertBalanceTransaction = z.infer<typeof insertBalanceTransactionSchema>;
export type BalanceTransaction = typeof balanceTransactions.$inferSelect;

export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviews.$inferSelect;

export type InsertReviewVote = z.infer<typeof insertReviewVoteSchema>;
export type ReviewVote = typeof reviewVotes.$inferSelect;

export type InsertCourseSection = z.infer<typeof insertCourseSectionSchema>;
export type CourseSection = typeof courseSections.$inferSelect;

export type InsertLesson = z.infer<typeof insertLessonSchema>;
export type Lesson = typeof lessons.$inferSelect;

export type InsertLessonProgress = z.infer<typeof insertLessonProgressSchema>;
export type LessonProgress = typeof lessonProgress.$inferSelect;

export type InsertSiteSettings = z.infer<typeof insertSiteSettingsSchema>;
export type SiteSettings = typeof siteSettings.$inferSelect;

export type InsertVipPageContent = z.infer<typeof insertVipPageContentSchema>;
export type VipPageContent = typeof vipPageContent.$inferSelect;

export type InsertVipTier = z.infer<typeof insertVipTierSchema>;
export type VipTier = typeof vipTiers.$inferSelect;

export type InsertVipPackage = z.infer<typeof insertVipPackageSchema>;
export type VipPackage = typeof vipPackages.$inferSelect;

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

export type InsertSubcategory = z.infer<typeof insertSubcategorySchema>;
export type Subcategory = typeof subcategories.$inferSelect;

export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;
export type MenuItem = typeof menuItems.$inferSelect;

export type InsertCourseFile = z.infer<typeof insertCourseFileSchema>;
export type CourseFile = typeof courseFiles.$inferSelect;

export type InsertInfoBanner = z.infer<typeof insertInfoBannerSchema>;
export type InfoBanner = typeof infoBanners.$inferSelect;

export type InsertCoursePackage = z.infer<typeof insertCoursePackageSchema>;
export type CoursePackage = typeof coursePackages.$inferSelect;

export type InsertPackageCourse = z.infer<typeof insertPackageCourseSchema>;
export type PackageCourse = typeof packageCourses.$inferSelect;


export const landingContent = pgTable("landing_content", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),


  heroTitle: text("hero_title").notNull().default("Обучение для успешной работы в любых сферах"),
  heroSubtitle: text("hero_subtitle").notNull().default("Профессиональные курсы по маркетплейсам, бизнесу, IT, маркетингу и другим направлениям. Учитесь у экспертов, получайте реальные результаты и зарабатывайте!"),
  heroBenefits: jsonb("hero_benefits").$type<string[]>().notNull().default([
    "Экономия до 97% от официальной стоимости!",
    "Курсы топовых спикеров за доступную цену",
    "Бесплатные вводные уроки из ВСЕХ курсов",
    "Реферальная программа - зарабатывай 30-45%"
  ]),
  heroCtaPrimary: text("hero_cta_primary").notNull().default("Начать обучение бесплатно"),
  heroCtaSecondary: text("hero_cta_secondary").notNull().default("Войти в аккаунт"),


  videoTitle: text("video_title").notNull().default("Обзор платформы"),
  videoDescription: text("video_description").notNull().default("Смотрите презентацию и узнайте, как начать развиваться в любой сфере уже сегодня"),
  videoUrl: text("video_url"),
  videoPosterUrl: text("video_poster_url"),


  priceTitle: text("price_title").notNull().default("Экономия до 97%"),
  priceSubtitle: text("price_subtitle").notNull().default("Курсы премиум-спикеров, которые официально стоят примерно 150 000 ₽, к примеру у нас цена будет составлять около 3 000 ₽"),
  priceOfficial: integer("price_official").notNull().default(150000),
  priceOurs: integer("price_ours").notNull().default(3000),
  priceAdvantages: jsonb("price_advantages").$type<{ title: string, description: string }[]>().notNull().default([
    { title: "Топовые спикеры", description: "Курсы от самых известных и популярных экспертов рынка" },
    { title: "Доступные цены", description: "Получите доступ к премиум-контенту за копейки" },
    { title: "Максимальная выгода", description: "То же качество обучения - в 30 раз дешевле" }
  ]),


  freeTitle: text("free_title").notNull().default("Начните обучение без вложений"),
  freeSubtitle: text("free_subtitle").notNull().default("Мы дали доступ к бесплатным материалам, чтобы вы могли оценить качество обучения"),
  freeFeatures: jsonb("free_features").$type<{
    title: string,
    description: string,
    points: string[]
  }[]>().notNull().default([
    {
      title: "Бесплатные вводные уроки",
      description: "Каждый курс имеет бесплатный вводный урок",
      points: [
        "Смотрите вводные уроки из ВСЕХ курсов без ограничений",
        "Оцените качество материалов и стиль преподавания",
        "Выберите то, что подходит именно вам"
      ]
    },
    {
      title: "100% бесплатные курсы",
      description: "Полноценные курсы без необходимости платить!",
      points: [
        "Доступны полные курсы по всем направлениям",
        "В любой категории курсов есть актуальный материал, за который не нужно платить",
        "Без скрытых платежей и ограничений"
      ]
    }
  ]),


  featuresTitle: text("features_title").notNull().default("Всё необходимое для обучения"),
  featuresSubtitle: text("features_subtitle").notNull().default("Мощная платформа с уникальными возможностями для эффективного обучения"),
  platformFeatures: jsonb("platform_features").$type<{
    title: string,
    description: string,
    icon: string
  }[]>().notNull().default([
    {
      title: "Магазин курсов",
      description: "Огромный каталог курсов по любым направлениям: маркетплейсы, бизнес, IT, маркетинг, дизайн и многое другое. Фильтры по категориям, уровням и годам.",
      icon: "ShoppingBag"
    },
    {
      title: "Личная библиотека",
      description: "Все купленные курсы в одном месте. Удобный доступ к урокам, прогресс обучения и закладки любимых курсов.",
      icon: "BookOpen"
    },
    {
      title: "VIP пакеты",
      description: "Эксклюзивный доступ к десяткам премиум-курсов. 4 тарифа с разным количеством курсов на выбор.",
      icon: "Crown"
    },
    {
      title: "Программа Trade-In",
      description: "Обменивайте свои курсы на новые. Получайте дополнительные бонусы при обмене премиум-курсов.",
      icon: "RefreshCcw"
    },
    {
      title: "Система бонусов",
      description: "Зарабатывайте фантики за активность на платформе и получайте скидки на покупки. Чем активнее вы учитесь, тем больше экономите!",
      icon: "Gift"
    },
    {
      title: "Реферальная программа",
      description: "Приглашайте друзей и зарабатывайте от 30% до 45% с их пополнений. Ваши друзья получают скидку 5% на первую покупку!",
      icon: "Users"
    }
  ]),

  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertLandingContentSchema = createInsertSchema(landingContent).omit({
  id: true,
  updatedAt: true,
});

export type InsertLandingContent = z.infer<typeof insertLandingContentSchema>;
export type LandingContent = typeof landingContent.$inferSelect;


export const tradeInPageContent = pgTable("trade_in_page_content", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),


  heroBadgeText: text("hero_badge_text").notNull().default("Премиум программа обмена"),
  heroTitle: text("hero_title").notNull().default("Trade-In"),
  heroSubtitle: text("hero_subtitle").notNull().default("Обменяйте старые курсы"),
  heroDescription: text("hero_description").notNull().default("Превратите неактуальные знания в современные навыки. Принимаем курсы любых тематик и обмениваем на курсы из нашего каталога."),
  heroCtaPrimary: text("hero_cta_primary").notNull().default("Написать в Telegram"),
  heroCtaSecondary: text("hero_cta_secondary").notNull().default("Узнать подробнее"),


  heroImage1Title: text("hero_image1_title").notNull().default("Выгодное партнёрство"),
  heroImage1Description: text("hero_image1_description").notNull().default("Обмен на взаимовыгодных условиях"),
  heroImage2Title: text("hero_image2_title").notNull().default("Довольные клиенты"),
  heroImage2Description: text("hero_image2_description").notNull().default("Более 1000 успешных обменов"),


  howWorksBadgeText: text("how_works_badge_text").notNull().default("Как это работает"),
  howWorksTitle: text("how_works_title").notNull().default("Процесс обмена за 4 шага"),
  howWorksSubtitle: text("how_works_subtitle").notNull().default("Простой и прозрачный процесс обмена ваших курсов"),


  steps: jsonb("steps").$type<{ icon: string, title: string, description: string, color: string }[]>().notNull().default([
    { icon: "MessageCircle", title: "Свяжитесь с нами", description: "Напишите нам в Telegram о курсах, которые хотите обменять", color: "from-purple-500 to-pink-500" },
    { icon: "TrendingUp", title: "Оценка курсов", description: "Мы оценим ваши курсы и предложим лучшие варианты обмена", color: "from-pink-500 to-orange-500" },
    { icon: "RefreshCw", title: "Выберите новый курс", description: "Выберите любой курс из нашего каталога для обмена", color: "from-orange-500 to-yellow-500" },
    { icon: "CheckCircle", title: "Получите доступ", description: "Мгновенный доступ к новому курсу после подтверждения", color: "from-yellow-500 to-green-500" }
  ]),


  benefitsBadgeText: text("benefits_badge_text").notNull().default("Преимущества"),
  benefitsTitle: text("benefits_title").notNull().default("Почему стоит обменять курсы с нами?"),


  benefits: jsonb("benefits").$type<{ icon: string, title: string, description: string }[]>().notNull().default([
    { icon: "Gift", title: "Выгодный обмен", description: "Получите до 60% стоимости при обмене старых курсов" },
    { icon: "Clock", title: "Быстрая обработка", description: "Оценка и обмен в течение 24 часов" },
    { icon: "Shield", title: "Гарантия качества", description: "Все новые курсы проверены и актуальны" },
    { icon: "Users", title: "Более 1000 обменов", description: "Присоединяйтесь к довольным клиентам" }
  ]),


  ctaTitle: text("cta_title").notNull().default("Готовы обменять курсы?"),
  ctaDescription: text("cta_description").notNull().default("Напишите нам в Telegram, и наши специалисты помогут вам подобрать идеальный вариант обмена"),
  ctaButtonText: text("cta_button_text").notNull().default("Написать в Telegram"),


  contactTelegram: text("contact_telegram").notNull().default("@vkurse_support"),
  contactWorkingHours: text("contact_working_hours").notNull().default("Пн-Пт 10:00-19:00 (МСК)"),


  faqTitle: text("faq_title").notNull().default("Условия обмена"),
  faqSubtitle: text("faq_subtitle").notNull().default("Основные правила программы Trade-In"),


  faqItems: jsonb("faq_items").$type<{ q: string, a: string }[]>().notNull().default([
    { q: "Какие курсы можно обменять?", a: "Вы можете обменять любые онлайн-курсы любой тематики (маркетинг, дизайн, программирование, бизнес и др.), купленные на других платформах. Курсы должны быть актуальными (не старше 2 лет)." },
    { q: "Как определяется стоимость обмена?", a: "Стоимость определяется индивидуально на основе актуальности курса, автора, популярности темы. В среднем вы получаете до 60% от рыночной стоимости курса." },
    { q: "Сколько времени занимает обмен?", a: "Оценка курса занимает до 24 часов. После согласования условий доступ к новому курсу предоставляется мгновенно." },
    { q: "Можно ли обменять несколько курсов сразу?", a: "Да, вы можете обменять любое количество курсов. При обмене 3+ курсов действуют специальные условия с повышенным процентом возврата." }
  ]),


  telegramUrl: text("telegram_url").notNull().default("https://t.me/yourchannel"),

  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTradeInPageContentSchema = createInsertSchema(tradeInPageContent).omit({
  id: true,
  updatedAt: true,
});

export type InsertTradeInPageContent = z.infer<typeof insertTradeInPageContentSchema>;
export type TradeInPageContent = typeof tradeInPageContent.$inferSelect;


export const courseViews = pgTable("course_views", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }),
  viewedAt: timestamp("viewed_at").defaultNow(),
}, (table) => [
  index("idx_course_views_course").on(table.courseId),
  index("idx_course_views_user").on(table.userId),
  index("idx_course_views_date").on(table.viewedAt),
]);

export const courseViewsRelations = relations(courseViews, ({ one }) => ({
  course: one(courses, {
    fields: [courseViews.courseId],
    references: [courses.id],
  }),
  user: one(users, {
    fields: [courseViews.userId],
    references: [users.id],
  }),
}));

export type CourseView = typeof courseViews.$inferSelect;
export type InsertCourseView = typeof courseViews.$inferInsert;


export const filterClicks = pgTable("filter_clicks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  filterType: varchar("filter_type", { length: 50 }).notNull(),
  filterId: varchar("filter_id"),
  filterValue: varchar("filter_value", { length: 255 }),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }),
  clickedAt: timestamp("clicked_at").defaultNow(),
}, (table) => [
  index("idx_filter_clicks_type").on(table.filterType),
  index("idx_filter_clicks_filter_id").on(table.filterId),
  index("idx_filter_clicks_filter_value").on(table.filterValue),
  index("idx_filter_clicks_date").on(table.clickedAt),

  index("idx_filter_clicks_type_value").on(table.filterType, table.filterValue),
]);

export const filterClicksRelations = relations(filterClicks, ({ one }) => ({
  user: one(users, {
    fields: [filterClicks.userId],
    references: [users.id],
  }),
}));

export type FilterClick = typeof filterClicks.$inferSelect;
export type InsertFilterClick = typeof filterClicks.$inferInsert;


export const insertLandingVisitSchema = createInsertSchema(landingVisits).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type LandingVisit = typeof landingVisits.$inferSelect;
export type InsertLandingVisit = z.infer<typeof insertLandingVisitSchema>;


export const courseRequests = pgTable("course_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  isApproved: boolean("is_approved").default(false).notNull(),
  moderatedBy: varchar("moderated_by").references(() => users.id, { onDelete: 'set null' }),
  moderatedAt: timestamp("moderated_at"),
  adminComment: text("admin_comment"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_course_requests_user").on(table.userId),
  index("idx_course_requests_created").on(table.createdAt),
  index("idx_course_requests_approved").on(table.isApproved),
  index("idx_course_requests_moderated").on(table.moderatedBy),
]);

export const courseRequestsRelations = relations(courseRequests, ({ one, many }) => ({
  user: one(users, {
    fields: [courseRequests.userId],
    references: [users.id],
  }),
  votes: many(courseRequestVotes),
}));

export const insertCourseRequestSchema = createInsertSchema(courseRequests, {
  title: z.string().min(3, "Название должно содержать минимум 3 символа").max(200, "Название слишком длинное"),
  description: z.string().min(10, "Описание должно содержать минимум 10 символов").max(2000, "Описание слишком длинное"),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CourseRequest = typeof courseRequests.$inferSelect;
export type InsertCourseRequest = z.infer<typeof insertCourseRequestSchema>;


export const courseRequestVotes = pgTable("course_request_votes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requestId: varchar("request_id").notNull().references(() => courseRequests.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  vote: integer("vote").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_course_request_votes_request").on(table.requestId),
  index("idx_course_request_votes_user").on(table.userId),
  unique("unique_user_vote_per_request").on(table.requestId, table.userId),
]);

export const courseRequestVotesRelations = relations(courseRequestVotes, ({ one }) => ({
  request: one(courseRequests, {
    fields: [courseRequestVotes.requestId],
    references: [courseRequests.id],
  }),
  user: one(users, {
    fields: [courseRequestVotes.userId],
    references: [users.id],
  }),
}));

export const insertCourseRequestVoteSchema = createInsertSchema(courseRequestVotes, {
  vote: z.number().int().min(-1).max(1).refine(val => val === 1 || val === -1, "Vote должен быть 1 или -1"),
}).omit({
  id: true,
  createdAt: true,
});

export type CourseRequestVote = typeof courseRequestVotes.$inferSelect;
export type InsertCourseRequestVote = z.infer<typeof insertCourseRequestVoteSchema>;


export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: varchar("type", { length: 50 }).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  imageUrl: text("image_url"),
  isRead: boolean("is_read").default(false).notNull(),
  relatedId: varchar("related_id"),
  relatedType: varchar("related_type", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_notifications_user").on(table.userId),
  index("idx_notifications_created").on(table.createdAt),
  index("idx_notifications_is_read").on(table.isRead),
  index("idx_notifications_type").on(table.type),
]);

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;


export const pendingLessonNotifications = pgTable("pending_lesson_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: 'cascade' }),
  lessonIds: text("lesson_ids").array().notNull(),
  scheduledFor: timestamp("scheduled_for").notNull(),
  processed: boolean("processed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_pending_lesson_notifications_scheduled").on(table.scheduledFor),
  index("idx_pending_lesson_notifications_processed").on(table.processed),
  index("idx_pending_lesson_notifications_course").on(table.courseId),
]);

export const pendingLessonNotificationsRelations = relations(pendingLessonNotifications, ({ one }) => ({
  course: one(courses, {
    fields: [pendingLessonNotifications.courseId],
    references: [courses.id],
  }),
}));

export const insertPendingLessonNotificationSchema = createInsertSchema(pendingLessonNotifications).omit({
  id: true,
  createdAt: true,
});

export type PendingLessonNotification = typeof pendingLessonNotifications.$inferSelect;
export type InsertPendingLessonNotification = z.infer<typeof insertPendingLessonNotificationSchema>;


export const partners = pgTable("partners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").notNull(),
  services: text("services").notNull(),
  contactUrl: varchar("contact_url", { length: 500 }).notNull(),
  logoUrl: varchar("logo_url", { length: 500 }),
  coverImageUrl: varchar("cover_image_url", { length: 500 }),
  displayOrder: integer("display_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_partners_display_order").on(table.displayOrder),
  index("idx_partners_is_active").on(table.isActive),
]);

export const insertPartnerSchema = createInsertSchema(partners).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Partner = typeof partners.$inferSelect;
export type InsertPartner = z.infer<typeof insertPartnerSchema>;


export const programs = pgTable("programs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  imageUrl: varchar("image_url", { length: 500 }),
  downloadUrl: varchar("download_url", { length: 1000 }).notNull(),
  downloadType: varchar("download_type", { length: 50 }).notNull(),
  version: varchar("version", { length: 50 }),
  size: varchar("size", { length: 100 }),
  requirements: text("requirements"),
  isFree: boolean("is_free").default(true).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).default("0"),
  fantikPrice: integer("fantik_price"),
  paymentType: varchar("payment_type", { length: 20 }).default("money_only"),
  displayOrder: integer("display_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_programs_category").on(table.category),
  index("idx_programs_is_active").on(table.isActive),
  index("idx_programs_display_order").on(table.displayOrder),
]);

export const programsRelations = relations(programs, ({ many }) => ({
  programPurchases: many(programPurchases),
  programReviews: many(programReviews),
  programInstructions: many(programInstructions),
}));

export const insertProgramSchema = createInsertSchema(programs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Program = typeof programs.$inferSelect;
export type InsertProgram = z.infer<typeof insertProgramSchema>;


export const programPurchases = pgTable("program_purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  programId: varchar("program_id").notNull().references(() => programs.id, { onDelete: 'cascade' }),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  purchaseDate: timestamp("purchase_date").defaultNow(),
}, (table) => [
  uniqueIndex("idx_user_program_unique").on(table.userId, table.programId),
  index("idx_program_purchases_user_id").on(table.userId),
  index("idx_program_purchases_program_id").on(table.programId),
  index("idx_program_purchases_purchase_date").on(table.purchaseDate),
]);

export const programPurchasesRelations = relations(programPurchases, ({ one }) => ({
  user: one(users, {
    fields: [programPurchases.userId],
    references: [users.id],
  }),
  program: one(programs, {
    fields: [programPurchases.programId],
    references: [programs.id],
  }),
}));

export const insertProgramPurchaseSchema = createInsertSchema(programPurchases).omit({
  id: true,
  purchaseDate: true,
});

export type ProgramPurchase = typeof programPurchases.$inferSelect;
export type InsertProgramPurchase = z.infer<typeof insertProgramPurchaseSchema>;


export const programReviews = pgTable("program_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  programId: varchar("program_id").notNull().references(() => programs.id, { onDelete: 'cascade' }),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  moderatedBy: varchar("moderated_by").references(() => users.id, { onDelete: 'set null' }),
  moderatedAt: timestamp("moderated_at"),
  moderationComment: text("moderation_comment"),
  adminComment: text("admin_comment"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_program_reviews_program").on(table.programId),
  index("idx_program_reviews_user_program").on(table.userId, table.programId),
  index("idx_program_reviews_status").on(table.status),
]);

export const programReviewsRelations = relations(programReviews, ({ one }) => ({
  user: one(users, {
    fields: [programReviews.userId],
    references: [users.id],
  }),
  program: one(programs, {
    fields: [programReviews.programId],
    references: [programs.id],
  }),
  moderator: one(users, {
    fields: [programReviews.moderatedBy],
    references: [users.id],
  }),
}));

export const insertProgramReviewSchema = createInsertSchema(programReviews).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  moderatedBy: true,
  moderatedAt: true,
  moderationComment: true,
  status: true,
});

export type ProgramReview = typeof programReviews.$inferSelect;
export type InsertProgramReview = z.infer<typeof insertProgramReviewSchema>;


export const programInstructions = pgTable("program_instructions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  programId: varchar("program_id").notNull().references(() => programs.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  order: integer("order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_program_instructions_program").on(table.programId),
  index("idx_program_instructions_order").on(table.programId, table.order),
]);

export const programInstructionsRelations = relations(programInstructions, ({ one }) => ({
  program: one(programs, {
    fields: [programInstructions.programId],
    references: [programs.id],
  }),
}));

export const insertProgramInstructionSchema = createInsertSchema(programInstructions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type ProgramInstruction = typeof programInstructions.$inferSelect;
export type InsertProgramInstruction = z.infer<typeof insertProgramInstructionSchema>;


export const engagementNotifications = pgTable("engagement_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  notificationType: varchar("notification_type", { length: 20 }).notNull(),
  sentAt: timestamp("sent_at").defaultNow(),
}, (table) => [
  index("idx_engagement_notifications_user").on(table.userId),
  index("idx_engagement_notifications_type").on(table.notificationType),
  index("idx_engagement_notifications_sent_at").on(table.sentAt),

  uniqueIndex("idx_engagement_user_type_unique").on(table.userId, table.notificationType),
]);

export const engagementNotificationsRelations = relations(engagementNotifications, ({ one }) => ({
  user: one(users, {
    fields: [engagementNotifications.userId],
    references: [users.id],
  }),
}));

export const insertEngagementNotificationSchema = createInsertSchema(engagementNotifications).omit({
  id: true,
  sentAt: true,
});

export type EngagementNotification = typeof engagementNotifications.$inferSelect;
export type InsertEngagementNotification = z.infer<typeof insertEngagementNotificationSchema>;


export const schedulerRuns = pgTable("scheduler_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schedulerName: varchar("scheduler_name", { length: 50 }).notNull(),
  runDate: varchar("run_date", { length: 10 }).notNull(),
  status: varchar("status", { length: 20 }).notNull(),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  errorMessage: text("error_message"),
}, (table) => [
  index("idx_scheduler_runs_name_date").on(table.schedulerName, table.runDate),
  uniqueIndex("idx_scheduler_run_unique").on(table.schedulerName, table.runDate),
]);

export const insertSchedulerRunSchema = createInsertSchema(schedulerRuns).omit({
  id: true,
  startedAt: true,
  completedAt: true,
});

export type SchedulerRun = typeof schedulerRuns.$inferSelect;
export type InsertSchedulerRun = z.infer<typeof insertSchedulerRunSchema>;


export const chatConversations = pgTable("chat_conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }),
  assigneeId: varchar("assignee_id").references(() => users.id),
  status: varchar("status", { length: 20 }).notNull().default("open"),
  priority: varchar("priority", { length: 20 }).notNull().default("normal"),
  subject: text("subject"),
  lastMessage: text("last_message"),
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  unreadAdmin: integer("unread_admin").default(0).notNull(),
  unreadUser: integer("unread_user").default(0).notNull(),
  tags: text("tags").array().default(sql`ARRAY[]::text[]`),
  note: text("note"),
  guestName: varchar("guest_name", { length: 100 }),
  guestToken: varchar("guest_token", { length: 64 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_chat_conv_user").on(table.userId),
  index("idx_chat_conv_assignee").on(table.assigneeId),
  index("idx_chat_conv_status").on(table.status),
  index("idx_chat_conv_guest").on(table.guestToken),
]);

export const chatConversationsRelations = relations(chatConversations, ({ one, many }) => ({
  user: one(users, {
    fields: [chatConversations.userId],
    references: [users.id],
  }),
  assignee: one(users, {
    fields: [chatConversations.assigneeId],
    references: [users.id],
    relationName: "assignee",
  }),
  messages: many(chatMessages),
}));

export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => chatConversations.id, { onDelete: 'cascade' }),
  senderId: varchar("sender_id").references(() => users.id, { onDelete: 'cascade' }),
  role: varchar("role", { length: 10 }).notNull(),
  text: text("text").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  reactions: jsonb("reactions").$type<string[]>().default([]),
  fileUrl: text("file_url"),
  fileName: text("file_name"),
  fileType: varchar("file_type", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_chat_msg_conv").on(table.conversationId),
  index("idx_chat_msg_sender").on(table.senderId),
]);

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  conversation: one(chatConversations, {
    fields: [chatMessages.conversationId],
    references: [chatConversations.id],
  }),
  sender: one(users, {
    fields: [chatMessages.senderId],
    references: [users.id],
  }),
}));

export const chatTemplates = pgTable("chat_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: varchar("category", { length: 50 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  text: text("text").notNull(),
  uses: integer("uses").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const chatSettings = pgTable("chat_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  greeting: text("greeting").notNull().default("Добрый день! Чем могу помочь?"),
  awayMessage: text("away_message").notNull().default("Мы сейчас не в сети. Ответим в ближайшее время."),
  autoAssign: boolean("auto_assign").default(true).notNull(),
  workingHours: boolean("working_hours").default(true).notNull(),
  botEnabled: boolean("bot_enabled").default(false).notNull(),
  telegramBotToken: text("telegram_bot_token"),
  telegramChatId: text("telegram_chat_id"),
  telegramEnabled: boolean("telegram_enabled").default(false).notNull(),
  telegramNotifyNewConversation: boolean("telegram_notify_new_conversation").default(true).notNull(),
  telegramNotifyNewMessage: boolean("telegram_notify_new_message").default(true).notNull(),
  telegramNotifyPurchase: boolean("telegram_notify_purchase").default(true).notNull(),
  telegramNotifyTopup: boolean("telegram_notify_topup").default(true).notNull(),
  telegramNotifyReview: boolean("telegram_notify_review").default(true).notNull(),
  telegramNotifyCourseRequest: boolean("telegram_notify_course_request").default(true).notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertChatConversationSchema = createInsertSchema(chatConversations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({ id: true, createdAt: true });
export const insertChatTemplateSchema = createInsertSchema(chatTemplates).omit({ id: true, createdAt: true, updatedAt: true });

export type ChatConversation = typeof chatConversations.$inferSelect;
export type InsertChatConversation = z.infer<typeof insertChatConversationSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatTemplate = typeof chatTemplates.$inferSelect;
export type InsertChatTemplate = z.infer<typeof insertChatTemplateSchema>;
export type ChatSettings = typeof chatSettings.$inferSelect;
