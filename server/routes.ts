import type { Express } from "express";
import { createServer, type Server } from "http";
import { randomUUID, createHash } from "crypto";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, updateUserActivityThrottled } from "./authSession";
import { insertCourseSchema, insertPurchaseSchema, insertTaskSchema, insertBalanceTransactionSchema, insertReviewSchema, insertCategorySchema, insertSubcategorySchema, insertMenuItemSchema, insertInfoBannerSchema, insertPartnerSchema, insertProgramSchema, insertProgramReviewSchema, insertProgramInstructionSchema, lessons, courseSections, purchases, courseFiles, courses, users, balanceTransactions, vipPackages, vipTiers, favorites, reviews, lessonProgress, referrals, awards, userAwards, partners, programs, programPurchases, programReviews, programInstructions, categories, subcategories as subcategoriesTable, type Course } from "@shared/schema";
import { z } from "zod";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission, StoredObject, getObjectAclPolicy, setObjectAclPolicy } from "./objectAcl";
import { db } from "./db";
import { eq, and, or, isNotNull, sql, inArray, gte } from "drizzle-orm";
import { extractVisitorMetadata, extractUtmParams } from "./visitor-metadata";
import { sendTelegramMessage, generateVerificationCode } from "./telegram";
import {
  verifyLinkingCode,
  deleteLinkingSession,
  create2FASession,
  verify2FACode
} from "./telegram-bot";
import { devAuthBypass } from "./middlewares/devAuthBypass";
import { buildStorageUrl } from "./bunnyStorage";
import { S3Client } from "@aws-sdk/client-s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import multer from "multer";
const upload = multer({ storage: multer.memoryStorage() });

const s3Client = new S3Client({
  region: "ru-central-1",
  endpoint: "https://storage.yandexcloud.net",
  credentials: {
    accessKeyId: process.env.NOWCDN_KEY!,
    secretAccessKey: process.env.NOWCDN_SECRET!,
  },
  forcePathStyle: false,
});

const metadataCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60000;


const popularityCache = new Map<string, { data: any; timestamp: number }>();
const POPULARITY_CACHE_TTL = 300000;


const telegram2faTokens = new Map<string, { userId: string; expiresAt: Date }>();


function transliterate(text: string): string {
  const map: Record<string, string> = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh', 'з': 'z',
    'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r',
    'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
    'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
    'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo', 'Ж': 'Zh', 'З': 'Z',
    'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M', 'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R',
    'С': 'S', 'Т': 'T', 'У': 'U', 'Ф': 'F', 'Х': 'H', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Sch',
    'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya'
  };

  return text.split('').map(char => map[char] || char).join('');
}

async function buildCourseUploadPathSegments(
  course: Course,
  options: {
    sectionId?: string;
    lessonId?: string;
    sectionTitle?: string;
    lessonTitle?: string;
  }
): Promise<string[]> {
  const pathSegments: string[] = [];

  const [primarySubcategoryId] = await storage.getCourseSubcategories(course.id);
  if (primarySubcategoryId) {
    const [subcategory] = await db
      .select({
        id: subcategoriesTable.id,
        name: subcategoriesTable.name,
        categoryId: subcategoriesTable.categoryId,
      })
      .from(subcategoriesTable)
      .where(eq(subcategoriesTable.id, primarySubcategoryId));

    if (subcategory?.categoryId) {
      const [category] = await db
        .select({ name: categories.name })
        .from(categories)
        .where(eq(categories.id, subcategory.categoryId));

      if (category?.name) {
        pathSegments.push(category.name);
      }
    }

    if (subcategory?.name) {
      pathSegments.push(subcategory.name);
    }
  }

  pathSegments.push(course.title);

  let resolvedSectionTitle = options.sectionTitle;
  if (options.sectionId) {
    const [section] = await db
      .select({ title: courseSections.title })
      .from(courseSections)
      .where(eq(courseSections.id, options.sectionId));

    if (section?.title) {
      resolvedSectionTitle = section.title;
    }
  }

  if (resolvedSectionTitle) {
    pathSegments.push(resolvedSectionTitle);
  }

  let resolvedLessonTitle = options.lessonTitle;
  if (options.lessonId) {
    const [lesson] = await db
      .select({ title: lessons.title })
      .from(lessons)
      .where(eq(lessons.id, options.lessonId));

    if (lesson?.title) {
      resolvedLessonTitle = lesson.title;
    }
  }

  if (resolvedLessonTitle) {
    pathSegments.push(resolvedLessonTitle);
  }

  return pathSegments;
}

function getCached<T>(key: string): T | null {
  const cached = metadataCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as T;
  }
  return null;
}

function setCache(key: string, data: any): void {
  metadataCache.set(key, { data, timestamp: Date.now() });
}

function clearCache(): void {
  metadataCache.clear();
}

function getCachedPopularity<T>(key: string): T | null {
  const cached = popularityCache.get(key);
  if (cached && Date.now() - cached.timestamp < POPULARITY_CACHE_TTL) {
    return cached.data as T;
  }
  return null;
}

function setCachePopularity(key: string, data: any): void {
  popularityCache.set(key, { data, timestamp: Date.now() });
}

function clearPopularityCache(): void {
  popularityCache.clear();
}


const isAdmin = async (req: any, res: any, next: any) => {
  if (process.env.AUTH_BYPASS === "true") {
    return next();
  }

  if (!req.user?.claims?.sub) {
    return res.status(401).json({ message: "Unauthorized" });
  }


  const user = await storage.getUser(req.user.claims.sub);

  if (!user) {
    return res.status(403).json({ message: "Forbidden: User not found" });
  }

  if (!user.isAdmin) {
    return res.status(403).json({ message: "Forbidden: Admin access required" });
  }

  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  app.use(devAuthBypass)
  await setupAuth(app);

  app.use((req: any, res, next) => {

    if (req.isAuthenticated && req.isAuthenticated()) {
      const user = req.user as any;
      const userId = user?.claims?.sub;

      if (userId) {

        updateUserActivityThrottled(userId);
      }
    }
    next();
  });

  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }



      const { recordUserLogin } = await import('./auth');
      recordUserLogin(userId).catch(err => {
        console.error('[Login Tracking] Failed to record user login:', err);

      });

      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.put('/api/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      const schema = z.object({
        phoneNumber: z.string().optional(),
      });
      const { phoneNumber } = schema.parse(req.body);

      const user = await storage.updateUserProfile(userId, {
        phoneNumber,
      });

      res.json(user);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.put('/api/profile/referral-code', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      const schema = z.object({
        referralCode: z.string()
          .min(4, 'Промокод должен содержать минимум 4 символа')
          .max(12, 'Промокод должен содержать максимум 12 символов')
          .regex(/^[A-Z0-9]+$/, 'Промокод должен содержать только заглавные буквы и цифры')
          .transform(val => val.toUpperCase()),
      });

      const { referralCode } = schema.parse(req.body);

      const user = await storage.updateUserReferralCode(userId, referralCode);

      res.json(user);
    } catch (error: any) {
      console.error("Error updating referral code:", error);
      if (error.message === 'Этот промокод уже используется') {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Не удалось обновить промокод" });
    }
  });

  app.post('/api/telegram/verify-linking-code', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      const schema = z.object({
        code: z.string().length(6),
      });

      const { code } = schema.parse(req.body);


      const session = verifyLinkingCode(code);

      if (!session) {
        return res.status(400).json({
          success: false,
          message: "Неверный код или код истек"
        });
      }


      const existingUser = await storage.getUserByTelegramChatId(session.chatId.toString());

      if (existingUser && existingUser.id !== userId) {
        console.log(`[Telegram] ChatId ${session.chatId} already linked to user ${existingUser.id}`);
        return res.status(400).json({
          success: false,
          message: "Этот Telegram аккаунт уже привязан к другому пользователю"
        });
      }


      await storage.updateUserTelegramChatId(
        userId,
        session.chatId.toString(),
        session.username || null,
        session.firstName || null,
        session.lastName || null,
        session.telegramId.toString(),
        null
      );


      deleteLinkingSession(code);

      console.log(`[Telegram] Successfully linked user ${userId} with chat_id ${session.chatId}`);


      try {
        await sendTelegramMessage(
          session.chatId,
          `✅ <b>Готово!</b>\n\nТвой Telegram успешно привязан к аккаунту! 🎉\n\n✅ Двухфакторная защита активна\n✅ Уведомления настроены\n\nДобро пожаловать! 🚀`
        );
      } catch (error) {
        console.error('[Telegram] Failed to send confirmation message:', error);
      }

      res.json({
        success: true,
        telegramUsername: session.username,
        telegramChatId: session.chatId.toString(),
        telegramFirstName: session.firstName,
        telegramLastName: session.lastName,
      });
    } catch (error: any) {
      console.error("Error verifying linking code:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: "Failed to verify linking code" });
    }
  });

  app.post('/api/telegram/unlink', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;


      await storage.updateUserTelegramChatId(userId, null, null, null, null, null, null);

      console.log(`[Telegram] Successfully unlinked user ${userId}`);

      res.json({
        success: true,
        message: "Telegram успешно отвязан"
      });
    } catch (error: any) {
      console.error("Error unlinking Telegram:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Не удалось отвязать Telegram"
      });
    }
  });

  app.post('/api/telegram/send-code', async (req: any, res) => {
    try {
      const schema = z.object({
        email: z.string().email(),
      });

      const { email } = schema.parse(req.body);
      const normalizedEmail = email.toLowerCase().trim();


      const user = await storage.getUserByEmail(normalizedEmail);

      if (!user) {
        return res.status(404).json({ success: false, message: "Пользователь не найден" });
      }

      if (!user.telegramChatId) {
        return res.status(400).json({ success: false, message: "Telegram аккаунт не привязан" });
      }


      const { sessionId, code } = create2FASession(normalizedEmail, parseInt(user.telegramChatId));


      const success = await sendTelegramMessage(
        user.telegramChatId,
        `🔐 <b>Код подтверждения для входа:</b>\n\n<code>${code}</code>\n\nПожалуйста, укажите этот код для авторизации на сайте.\nКод действителен 5 минут.`
      );

      if (success) {
        console.log(`[Telegram] Sent 2FA code to user ${user.id} (email: ${normalizedEmail})`);
        res.json({ success: true, sessionId });
      } else {
        console.error(`[Telegram] Failed to send 2FA code to user ${user.id}`);
        res.status(500).json({ success: false, message: "Не удалось отправить код" });
      }
    } catch (error: any) {
      console.error("Error sending telegram code:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: "Не удалось отправить код" });
    }
  });

  app.post('/api/telegram/verify-code', async (req: any, res) => {
    try {
      const schema = z.object({
        sessionId: z.string(),
        code: z.string().length(6),
      });

      const { sessionId, code } = schema.parse(req.body);


      const result = verify2FACode(sessionId, code);

      if (!result.valid) {
        console.log(`[Telegram] Invalid or expired 2FA code for session ${sessionId}`);
        return res.json({ valid: false });
      }

      console.log(`[Telegram] 2FA code validated for email ${result.email}`);


      const sessionToken = randomUUID();


      const normalizedEmail = result.email!.toLowerCase().trim();
      const user = await storage.getUserByEmail(normalizedEmail);

      if (!user) {
        return res.status(404).json({ valid: false, message: "Пользователь не найден" });
      }

      telegram2faTokens.set(sessionToken, {
        userId: user.id,
        expiresAt: new Date(Date.now() + 60 * 1000)
      });

      res.json({
        valid: true,
        sessionToken
      });
    } catch (error: any) {
      console.error("Error verifying telegram code:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ valid: false, message: error.message });
      }
      res.status(500).json({ valid: false, message: "Не удалось проверить код" });
    }
  });

  app.get('/api/courses', async (req: any, res) => {
    try {
      const { platform, level, year, minPrice, maxPrice, minRating, author, search, vipOnly, excludeVipPackages, excludePurchased } = req.query;


      const userId = req.user?.claims?.sub || null;

      const courses = await storage.getCourses({
        platform: platform as string | undefined,
        level: level as string | undefined,
        year: year ? parseInt(year as string) : undefined,
        minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
        minRating: minRating ? parseFloat(minRating as string) : undefined,
        author: author as string | undefined,
        search: search as string | undefined,
        vipOnly: vipOnly === 'true',
        excludeVipPackages: excludeVipPackages === 'true',
        excludePurchased: (excludePurchased === 'true' && userId) ? userId : null,
        forAdmin: false,
      });

      res.json(courses);
    } catch (error) {
      console.error("Error fetching courses:", error);
      res.status(500).json({ message: "Failed to fetch courses" });
    }
  });


  app.get('/api/courses-metadata/authors', async (req, res) => {
    try {
      const { platform, level, year, minRating, search } = req.query;
      const cacheKey = `authors:${platform || 'all'}:${level || 'all'}:${year || 'all'}:${minRating || 'all'}:${search || ''}`;


      if (!search) {
        const cached = getCached<string[]>(cacheKey);
        if (cached) {
          return res.json(cached);
        }
      }

      const authors = await storage.getDistinctAuthors(
        platform as string | undefined,
        level as string | undefined,
        year ? parseInt(year as string) : undefined,
        minRating ? parseFloat(minRating as string) : undefined,
        search as string | undefined
      );

      if (!search) {
        setCache(cacheKey, authors);
      }

      res.json(authors);
    } catch (error) {
      console.error("Error fetching authors:", error);
      res.status(500).json({ message: "Failed to fetch authors" });
    }
  });


  app.get('/api/courses-metadata/years', async (req, res) => {
    try {
      const { platform, level, author, minRating } = req.query;
      const cacheKey = `years:${platform || 'all'}:${level || 'all'}:${author || 'all'}:${minRating || 'all'}`;


      const cached = getCached<number[]>(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const years = await storage.getDistinctYears(
        platform as string | undefined,
        level as string | undefined,
        author as string | undefined,
        minRating ? parseFloat(minRating as string) : undefined
      );
      setCache(cacheKey, years);
      res.json(years);
    } catch (error) {
      console.error("Error fetching years:", error);
      res.status(500).json({ message: "Failed to fetch years" });
    }
  });


  app.get('/api/courses-metadata/levels', async (req, res) => {
    try {
      const { platform, year, author, minRating } = req.query;
      const cacheKey = `levels:${platform || 'all'}:${year || 'all'}:${author || 'all'}:${minRating || 'all'}`;


      const cached = getCached<string[]>(cacheKey);
      if (cached) {
        return res.json(cached);
      }


      const availableLevels = await storage.getDistinctLevels(
        platform as string | undefined,
        year ? parseInt(year as string) : undefined,
        author as string | undefined,
        minRating ? parseFloat(minRating as string) : undefined
      );

      setCache(cacheKey, availableLevels);
      res.json(availableLevels);
    } catch (error) {
      console.error("Error fetching levels:", error);
      res.status(500).json({ message: "Failed to fetch levels" });
    }
  });


  app.get('/api/courses-metadata/ratings', async (req, res) => {
    try {
      const { platform, level, year, author } = req.query;
      const cacheKey = `ratings:${platform || 'all'}:${level || 'all'}:${year || 'all'}:${author || 'all'}`;


      const cached = getCached<number[]>(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const availableRatings = await storage.getAvailableRatings(
        platform as string | undefined,
        level as string | undefined,
        year ? parseInt(year as string) : undefined,
        author as string | undefined
      );

      setCache(cacheKey, availableRatings);
      res.json(availableRatings);
    } catch (error) {
      console.error("Error fetching ratings:", error);
      res.status(500).json({ message: "Failed to fetch ratings" });
    }
  });


  app.get('/api/courses-metadata/max-price', async (req, res) => {
    try {
      const { platform } = req.query;
      const cacheKey = `max-price:${platform || 'all'}`;


      const cached = getCached<number>(cacheKey);
      if (cached !== null) {
        return res.json(cached);
      }

      const maxPrice = await storage.getMaxPrice(platform as string | undefined);
      setCache(cacheKey, maxPrice);
      res.json(maxPrice);
    } catch (error) {
      console.error("Error fetching max price:", error);
      res.status(500).json({ message: "Failed to fetch max price" });
    }
  });


  app.get('/api/categories/:categoryId/top-courses', async (req, res) => {
    try {
      const { categoryId } = req.params;
      const { platform, limit } = req.query;
      const cacheKey = `top-courses:${categoryId}:${platform || 'all'}:${limit || 5}`;


      const cached = getCached<any[]>(cacheKey);
      if (cached !== null) {
        return res.json(cached);
      }

      const topCourses = await storage.getTopCoursesByCategory(
        categoryId,
        platform as string | undefined,
        limit ? parseInt(limit as string) : 5
      );
      setCache(cacheKey, topCourses);
      res.json(topCourses);
    } catch (error) {
      console.error("Error fetching top courses:", error);
      res.status(500).json({ message: "Failed to fetch top courses" });
    }
  });

  app.get('/api/courses/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const course = await storage.getCourse(id);

      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }


      const userId = req.isAuthenticated?.() ? (req.user as any)?.claims?.sub : null;
      await storage.trackCourseView(id, userId).catch(err => {
        console.error("Failed to track course view:", err);

      });

      res.json(course);
    } catch (error) {
      console.error("Error fetching course:", error);
      res.status(500).json({ message: "Failed to fetch course" });
    }
  });


  app.get('/api/courses/:id/stats', async (req, res) => {
    try {
      const { id } = req.params;
      const stats = await storage.getCourseStats(id);


      res.setHeader('Cache-Control', 'public, max-age=300');
      res.json(stats);
    } catch (error) {
      console.error("Error fetching course stats:", error);
      res.status(500).json({ message: "Failed to fetch course stats" });
    }
  });


  app.get('/api/courses/:id/preview', async (req, res) => {
    try {
      const { id } = req.params;
      const previewLesson = await storage.getFirstLessonWithVideo(id);

      if (!previewLesson) {

        res.setHeader('Cache-Control', 'public, max-age=3600');
        return res.status(404).json({ message: "No preview available" });
      }


      res.setHeader('Cache-Control', 'public, max-age=300');
      res.json(previewLesson);
    } catch (error) {
      console.error("Error fetching preview lesson:", error);
      res.status(500).json({ message: "Failed to fetch preview lesson" });
    }
  });


  app.get('/api/courses/:courseId/packages', async (req, res) => {
    try {
      const { courseId } = req.params;
      const packages = await storage.getPackagesByCourse(courseId);
      res.json(packages);
    } catch (error) {
      console.error("Error fetching course packages:", error);
      res.status(500).json({ message: "Failed to fetch course packages" });
    }
  });


  app.get('/api/courses/:courseId/frequently-bought-together', async (req, res) => {
    try {
      const { courseId } = req.params;
      const limit = parseInt(req.query.limit as string) || 6;
      const frequentlyBought = await storage.getFrequentlyBoughtTogether(courseId, limit);


      res.setHeader('Cache-Control', 'public, max-age=600');
      res.json(frequentlyBought);
    } catch (error) {
      console.error("Error fetching frequently bought together:", error);
      res.status(500).json({ message: "Failed to fetch recommendations" });
    }
  });


  app.get('/api/courses/:courseId/sections', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { courseId } = req.params;


      const purchase = await storage.getPurchase(userId, courseId);
      if (!purchase) {
        return res.status(403).json({ message: "Course not purchased" });
      }

      const progressData = await storage.getUserProgress(userId, courseId);


      res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.json(progressData.sections);
    } catch (error) {
      console.error("Error fetching course sections:", error);
      res.status(500).json({ message: "Failed to fetch course sections" });
    }
  });


  app.get('/api/courses/:courseId/files', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { courseId } = req.params;
      const { lessonId } = req.query;


      const purchase = await storage.getPurchase(userId, courseId);
      if (!purchase) {
        return res.status(403).json({ message: "Course not purchased" });
      }

      const files = await storage.getCourseFiles(courseId, lessonId as string | undefined);
      res.json(files);
    } catch (error) {
      console.error("Error fetching course files:", error);
      res.status(500).json({ message: "Failed to fetch course files" });
    }
  });


  app.get('/api/courses/:courseId/progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { courseId } = req.params;


      const purchase = await storage.getPurchase(userId, courseId);
      if (!purchase) {
        return res.status(403).json({ message: "Course not purchased" });
      }

      const progress = await storage.getUserProgress(userId, courseId);
      res.json(progress);
    } catch (error) {
      console.error("Error fetching course progress:", error);
      res.status(500).json({ message: "Failed to fetch course progress" });
    }
  });


  app.post('/api/courses/:courseId/lessons/:lessonId/progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { courseId, lessonId } = req.params;

      const schema = z.object({
        completed: z.boolean(),
        watchedSeconds: z.number().int().min(0).optional(),
      });
      const { completed, watchedSeconds } = schema.parse(req.body);


      const purchase = await storage.getPurchase(userId, courseId);
      if (!purchase) {
        return res.status(403).json({ message: "Course not purchased" });
      }

      const progress = await storage.updateLessonProgress(userId, lessonId, completed, watchedSeconds);
      res.json(progress);
    } catch (error) {
      console.error("Error updating lesson progress:", error);
      res.status(500).json({ message: "Failed to update lesson progress" });
    }
  });

  app.get('/api/purchases', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const purchases = await storage.getPurchases(userId);
      res.json(purchases);
    } catch (error) {
      console.error("Error fetching purchases:", error);
      res.status(500).json({ message: "Failed to fetch purchases" });
    }
  });

  app.post('/api/purchases', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      const validatedData = insertPurchaseSchema.omit({ userId: true, price: true }).parse(req.body);
      const { courseId } = validatedData;
      const { useFantiks, payWithFantiks } = req.body;

      const existingPurchase = await storage.getPurchase(userId, courseId);
      if (existingPurchase) {
        return res.status(400).json({ message: "Course already purchased" });
      }

      const course = await storage.getCourse(courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const paymentType = course.paymentType || 'money_only';
      const fantikPrice = course.fantikPrice ? parseInt(String(course.fantikPrice)) : null;
      const moneyPrice = parseFloat(course.price || '0');
      const balance = parseFloat(user.balance || '0');
      const referralBalance = parseFloat(user.referralBalance || '0');
      const totalBalance = balance + referralBalance;
      const userFantiks = parseInt(String(user.fantiks || 0));


      let useFantiksForPayment = false;
      if (paymentType === 'fantiks_only') {
        useFantiksForPayment = true;
      } else if (paymentType === 'both' && payWithFantiks) {
        useFantiksForPayment = true;
      }


      if (useFantiksForPayment && !fantikPrice) {
        return res.status(400).json({ message: "Курс недоступен для покупки за фантики" });
      }
      if (!useFantiksForPayment && paymentType === 'fantiks_only') {
        return res.status(400).json({ message: "Курс можно купить только за фантики" });
      }

      let fantiksDiscount = 0;
      let finalFantikPrice = 0;
      let finalMoneyPrice = 0;
      let referralDiscount = 0;

      if (useFantiksForPayment) {

        finalFantikPrice = fantikPrice || 0;

        if (!course.isFree && userFantiks < finalFantikPrice) {
          return res.status(400).json({ message: "Недостаточно фантиков" });
        }
      } else {

        finalMoneyPrice = moneyPrice;


        if (useFantiks && userFantiks > 0 && !course.isFree) {
          const maxDiscount = finalMoneyPrice * 0.2;
          fantiksDiscount = Math.min(userFantiks, maxDiscount);
        }


        const userPurchases = await storage.getPurchases(userId);
        const isFirstPurchase = userPurchases.length === 0;

        if (isFirstPurchase && user.referralDiscount && user.referralDiscount > 0 && !course.isFree) {
          referralDiscount = finalMoneyPrice * (user.referralDiscount / 100);
        }

        finalMoneyPrice = Math.max(0, finalMoneyPrice - fantiksDiscount - referralDiscount);

        if (!course.isFree && totalBalance < finalMoneyPrice) {
          return res.status(400).json({ message: "Insufficient balance" });
        }
      }


      const result = await db.transaction(async (tx) => {

        const getVipLimits = (tier: string) => {
          const limits: Record<string, { current: number, previous: number, referralBonus: number }> = {
            'bronze': { current: 5, previous: 5, referralBonus: 0 },
            'silver': { current: 7, previous: 10, referralBonus: 0 },
            'gold': { current: 10, previous: 20, referralBonus: 2 },
            'diamond': { current: 20, previous: 30, referralBonus: 5 },
          };
          return limits[tier.toLowerCase()] || { current: 0, previous: 0, referralBonus: 0 };
        };


        if (course.isVipSubscription && course.vipTier) {
          const limits = getVipLimits(course.vipTier);

          if (!course.isFree) {

            if (fantiksDiscount > 0) {
              await tx
                .update(users)
                .set({
                  fantiks: sql`${users.fantiks} - ${fantiksDiscount}`,
                  updatedAt: new Date(),
                })
                .where(sql`${users.id} = ${userId}`);


              await tx.insert(balanceTransactions).values({
                userId,
                amount: (-fantiksDiscount).toString(),
                type: 'fantiks',
                description: `Скидка фантиками на VIP пакет: ${course.title}`,
              });
            }


            const balanceResult = await tx
              .update(users)
              .set({
                balance: sql`${users.balance} - ${finalMoneyPrice}`,
                updatedAt: new Date()
              })
              .where(and(
                sql`${users.id} = ${userId}`,
                sql`${users.balance} >= ${finalMoneyPrice}`
              ))
              .returning();

            if (balanceResult.length === 0) {
              throw new Error("Insufficient balance");
            }


            const purchaseDescription = fantiksDiscount > 0
              ? `Покупка VIP пакета: ${course.title} (со скидкой ${fantiksDiscount} фантиков)`
              : `Покупка VIP пакета: ${course.title}`;

            await tx.insert(balanceTransactions).values({
              userId,
              amount: (-finalMoneyPrice).toString(),
              type: "purchase",
              description: purchaseDescription,
            });
          }


          const [vipPackage] = await tx.insert(vipPackages).values({
            userId,
            tier: course.vipTier,
            currentYearLimit: limits.current,
            previousYearsLimit: limits.previous,
            referralBonusPercent: limits.referralBonus,
          }).returning();


          if (limits.referralBonus > 0) {

            const [currentUser] = await tx
              .select({ referralBonusPercent: users.referralBonusPercent })
              .from(users)
              .where(eq(users.id, userId));

            const currentBonus = parseInt(currentUser?.referralBonusPercent?.toString() || '0');
            const maxBonus = course.vipTier === 'gold' ? 40 : 45;
            const newBonus = Math.min(currentBonus + limits.referralBonus, maxBonus);

            await tx
              .update(users)
              .set({
                referralBonusPercent: newBonus,
                updatedAt: new Date(),
              })
              .where(sql`${users.id} = ${userId}`);
          }


          await tx
            .update(users)
            .set({
              fantiks: sql`${users.fantiks} + 100`,
              updatedAt: new Date(),
            })
            .where(sql`${users.id} = ${userId}`);

          await tx.insert(balanceTransactions).values({
            userId,
            amount: '100',
            type: 'fantiks',
            description: `Бонус за покупку VIP пакета: ${course.title}`,
          });

          return { type: 'vip', data: vipPackage };
        } else {


          const [newPurchase] = await tx.insert(purchases).values({
            userId,
            courseId,
            price: useFantiksForPayment ? (fantikPrice?.toString() || '0') : (course.price || '0'),
            paidFromBalance: "0",
            paidFromReferralBalance: "0",
            paidFantiks: 0,
          }).returning();

          let paidFromReferral = "0";
          let paidFromBalance = "0";
          let paidFantiks = 0;

          if (!course.isFree) {
            if (useFantiksForPayment) {

              paidFantiks = finalFantikPrice;

              if (finalFantikPrice > 0) {

                const fantiksResult = await tx
                  .update(users)
                  .set({
                    fantiks: sql`${users.fantiks} - ${finalFantikPrice}`,
                    updatedAt: new Date(),
                  })
                  .where(and(
                    eq(users.id, userId),
                    sql`${users.fantiks} >= ${finalFantikPrice}`
                  ))
                  .returning();

                if (fantiksResult.length === 0) {
                  throw new Error("Insufficient fantiks");
                }


                await tx.insert(balanceTransactions).values({
                  userId,
                  amount: (-finalFantikPrice).toString(),
                  type: 'fantiks',
                  description: `Покупка курса за фантики: ${course.title} (ID покупки: ${newPurchase.id})`,
                });
              }
            } else if (finalMoneyPrice > 0) {


              if (fantiksDiscount > 0) {
                await tx
                  .update(users)
                  .set({
                    fantiks: sql`${users.fantiks} - ${fantiksDiscount}`,
                    updatedAt: new Date(),
                  })
                  .where(sql`${users.id} = ${userId}`);


                await tx.insert(balanceTransactions).values({
                  userId,
                  amount: (-fantiksDiscount).toString(),
                  type: 'fantiks',
                  description: `Скидка фантиками на курс: ${course.title} (ID покупки: ${newPurchase.id})`,
                });
              }


              const fromReferral = Math.min(finalMoneyPrice, referralBalance);
              const fromBalance = finalMoneyPrice - fromReferral;

              paidFromReferral = fromReferral.toString();
              paidFromBalance = fromBalance.toString();

              if (fromReferral > 0) {
                const referralResult = await tx
                  .update(users)
                  .set({
                    referralBalance: sql`${users.referralBalance} - ${fromReferral}`,
                    updatedAt: new Date()
                  })
                  .where(and(
                    eq(users.id, userId),
                    sql`${users.referralBalance} >= ${fromReferral}`
                  ))
                  .returning();

                if (referralResult.length === 0) {
                  throw new Error("Insufficient referral balance");
                }

                await tx.insert(balanceTransactions).values({
                  userId,
                  amount: (-fromReferral).toString(),
                  type: 'purchase',
                  description: `Покупка курса: ${course.title} (с реферального баланса) (ID покупки: ${newPurchase.id})`,
                });
              }

              if (fromBalance > 0) {
                const balanceResult = await tx
                  .update(users)
                  .set({
                    balance: sql`${users.balance} - ${fromBalance}`,
                    updatedAt: new Date()
                  })
                  .where(and(
                    eq(users.id, userId),
                    sql`${users.balance} >= ${fromBalance}`
                  ))
                  .returning();

                if (balanceResult.length === 0) {
                  throw new Error("Insufficient balance");
                }

                let purchaseDescription = `Покупка курса: ${course.title}`;
                if (fantiksDiscount > 0) {
                  purchaseDescription += ` (со скидкой ${fantiksDiscount} фантиков)`;
                }
                if (referralDiscount > 0) {
                  purchaseDescription += ` (реферальная скидка ${user.referralDiscount}%)`;
                }
                purchaseDescription += ` (ID покупки: ${newPurchase.id})`;

                await tx.insert(balanceTransactions).values({
                  userId,
                  amount: (-fromBalance).toString(),
                  type: "purchase",
                  description: purchaseDescription,
                });
              }


              await tx
                .update(purchases)
                .set({
                  paidFromBalance,
                  paidFromReferralBalance: paidFromReferral,
                  paidFantiks,
                })
                .where(eq(purchases.id, newPurchase.id));
            }
          }


          await tx
            .update(users)
            .set({
              fantiks: sql`${users.fantiks} + 100`,
              updatedAt: new Date(),
            })
            .where(sql`${users.id} = ${userId}`);


          await tx.insert(balanceTransactions).values({
            userId,
            amount: '100',
            type: 'fantiks',
            description: `Бонус за покупку курса: ${course.title}`,
          });


          await tx
            .delete(favorites)
            .where(and(
              eq(favorites.userId, userId),
              eq(favorites.courseId, courseId)
            ));

          return { type: 'course', data: newPurchase };
        }
      });


      try {
        if (result.type === 'vip') {
          await storage.createNotification({
            userId,
            type: 'purchase_vip',
            title: '🎉 VIP подписка активирована!',
            message: `Вы успешно приобрели VIP пакет "${course.title}". Теперь вам доступны эксклюзивные курсы и бонусы!`,
            isRead: false,
            relatedId: course.vipTier,
            relatedType: 'vip',
          });
        } else {
          await storage.createNotification({
            userId,
            type: 'purchase_course',
            title: '✅ Курс куплен!',
            message: `Вы успешно приобрели курс "${course.title}". Приятного обучения!`,
            isRead: false,
            relatedId: courseId,
            relatedType: 'course',
          });
        }
      } catch (notificationError) {
        console.error("[PURCHASE] Failed to create notification:", notificationError);

      }

      res.json(result.data);
    } catch (error: any) {
      console.error("Error creating purchase:", error);
      if (error.message === "Insufficient balance") {
        return res.status(400).json({ message: "Insufficient balance" });
      }
      if (error.message === "Insufficient referral balance") {
        return res.status(400).json({ message: "Insufficient balance" });
      }
      if (error.message === "Insufficient fantiks") {
        return res.status(400).json({ message: "Недостаточно фантиков" });
      }
      res.status(500).json({ message: "Failed to create purchase" });
    }
  });

  app.get('/api/library', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;


      const filters: {
        platform?: string;
        level?: string;
        year?: number;
        minRating?: number;
        author?: string;
        search?: string;
      } = {};

      if (req.query.platform) filters.platform = req.query.platform;
      if (req.query.level) filters.level = req.query.level;
      if (req.query.year) filters.year = parseInt(req.query.year);
      if (req.query.minRating !== undefined) filters.minRating = parseFloat(req.query.minRating);
      if (req.query.author) filters.author = req.query.author;
      if (req.query.search) filters.search = req.query.search;

      const library = await storage.getLibrary(userId, filters);


      res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.json(library);
    } catch (error) {
      console.error("Error fetching library:", error);
      res.status(500).json({ message: "Failed to fetch library" });
    }
  });


  app.get('/api/library/new-count', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;


      const [purchasesResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(purchases)
        .where(and(
          eq(purchases.userId, userId),
          eq(purchases.viewedInLibrary, false)
        ));


      const [vipResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(vipPackages)
        .where(and(
          eq(vipPackages.userId, userId),
          eq(vipPackages.viewedInLibrary, false),
          eq(vipPackages.isActivated, false)
        ));

      const totalCount = (purchasesResult?.count || 0) + (vipResult?.count || 0);
      res.json({ count: totalCount });
    } catch (error) {
      console.error("Error fetching new library count:", error);
      res.status(500).json({ message: "Failed to fetch new library count" });
    }
  });


  app.post('/api/library/mark-viewed', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { purchaseIds, vipPackageIds } = req.body;


      if (purchaseIds && Array.isArray(purchaseIds) && purchaseIds.length > 0) {
        await db
          .update(purchases)
          .set({ viewedInLibrary: true })
          .where(and(
            eq(purchases.userId, userId),
            inArray(purchases.id, purchaseIds)
          ));
      }


      if (vipPackageIds && Array.isArray(vipPackageIds) && vipPackageIds.length > 0) {
        await db
          .update(vipPackages)
          .set({ viewedInLibrary: true })
          .where(and(
            eq(vipPackages.userId, userId),
            inArray(vipPackages.id, vipPackageIds)
          ));
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error marking library as viewed:", error);
      res.status(500).json({ message: "Failed to mark library as viewed" });
    }
  });


  app.get('/api/favorites', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const favorites = await storage.getFavorites(userId);
      res.json(favorites);
    } catch (error) {
      console.error("Error fetching favorites:", error);
      res.status(500).json({ message: "Failed to fetch favorites" });
    }
  });


  app.get('/api/favorites/:courseId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { courseId } = req.params;
      const favorite = await storage.getFavorite(userId, courseId);
      res.json({ isFavorite: !!favorite });
    } catch (error) {
      console.error("Error checking favorite:", error);
      res.status(500).json({ message: "Failed to check favorite" });
    }
  });


  app.post('/api/favorites/:courseId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { courseId } = req.params;

      const course = await storage.getCourse(courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      const favorite = await storage.addFavorite(userId, courseId);
      res.json(favorite);
    } catch (error) {
      console.error("Error adding favorite:", error);
      res.status(500).json({ message: "Failed to add favorite" });
    }
  });


  app.delete('/api/favorites/:courseId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { courseId } = req.params;
      await storage.removeFavorite(userId, courseId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing favorite:", error);
      res.status(500).json({ message: "Failed to remove favorite" });
    }
  });


  app.get('/api/vip-packages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      const packages = await db
        .select()
        .from(vipPackages)
        .where(and(
          eq(vipPackages.userId, userId),
          eq(vipPackages.isActivated, false)
        ));

      res.json(packages);
    } catch (error) {
      console.error("Error fetching VIP packages:", error);
      res.status(500).json({ message: "Failed to fetch VIP packages" });
    }
  });


  app.get('/api/vip-packages/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;

      const [vipPackage] = await db
        .select()
        .from(vipPackages)
        .where(and(
          eq(vipPackages.id, id),
          eq(vipPackages.userId, userId)
        ));

      if (!vipPackage) {
        return res.status(404).json({ message: "VIP package not found" });
      }

      res.json(vipPackage);
    } catch (error) {
      console.error("Error fetching VIP package:", error);
      res.status(500).json({ message: "Failed to fetch VIP package" });
    }
  });


  app.post('/api/vip-packages/:id/activate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id: packageId } = req.params;
      const { courseIds } = req.body;


      const schema = z.object({
        courseIds: z.array(z.string()).min(1, "At least one course must be selected"),
      });
      const validatedData = schema.parse({ courseIds });


      const [vipPackage] = await db
        .select()
        .from(vipPackages)
        .where(and(
          eq(vipPackages.id, packageId),
          eq(vipPackages.userId, userId),
          eq(vipPackages.isActivated, false)
        ));

      if (!vipPackage) {
        return res.status(404).json({ message: "VIP package not found or already activated" });
      }


      const currentYear = new Date().getFullYear();
      const selectedCourses = await storage.getCoursesByIds(validatedData.courseIds);

      const currentYearCourses = selectedCourses.filter((c: Course) => c.year === currentYear);
      const previousYearsCourses = selectedCourses.filter((c: Course) => c.year !== currentYear);


      if (currentYearCourses.length !== vipPackage.currentYearLimit) {
        return res.status(400).json({
          message: `Вы должны выбрать точно ${vipPackage.currentYearLimit} курсов ${currentYear} года`
        });
      }

      if (previousYearsCourses.length !== vipPackage.previousYearsLimit) {
        return res.status(400).json({
          message: `Вы должны выбрать точно ${vipPackage.previousYearsLimit} курсов прошлых лет`
        });
      }


      await db.transaction(async (tx) => {

        const existingPurchases = await tx
          .select({ courseId: purchases.courseId })
          .from(purchases)
          .where(
            and(
              eq(purchases.userId, userId),
              inArray(purchases.courseId, selectedCourses.map(c => c.id))
            )
          );

        const existingCourseIds = new Set(existingPurchases.map(p => p.courseId));


        for (const course of selectedCourses) {
          if (!existingCourseIds.has(course.id)) {
            await tx.insert(purchases).values({
              userId,
              courseId: course.id,
              price: '0',
            });
          }
        }


        await tx
          .update(vipPackages)
          .set({
            isActivated: true,
            currentYearSelected: currentYearCourses.length,
            previousYearsSelected: previousYearsCourses.length,
          })
          .where(eq(vipPackages.id, packageId));
      });

      res.json({ success: true, message: "VIP package activated successfully" });
    } catch (error: any) {
      console.error("Error activating VIP package:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to activate VIP package" });
    }
  });

  app.get('/api/referrals', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getReferralStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching referrals:", error);
      res.status(500).json({ message: "Failed to fetch referrals" });
    }
  });

  app.get('/api/referrals/details', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { dateFrom, dateTo } = req.query;

      const dateFromParsed = dateFrom ? new Date(dateFrom as string) : undefined;
      const dateToParsed = dateTo ? new Date(dateTo as string) : undefined;

      const details = await storage.getReferralDetails(userId, dateFromParsed, dateToParsed);
      res.json(details);
    } catch (error) {
      console.error("Error fetching referral details:", error);
      res.status(500).json({ message: "Failed to fetch referral details" });
    }
  });

  app.get('/api/balance/transactions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { type } = req.query;

      const transactions = await storage.getBalanceTransactions(userId, type as string | undefined);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching balance transactions:", error);
      res.status(500).json({ message: "Failed to fetch balance transactions" });
    }
  });

  app.get('/api/tasks', async (req, res) => {
    try {
      const tasks = await storage.getTasks();
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.get('/api/user-tasks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userTasks = await storage.getUserTasks(userId);
      res.json(userTasks);
    } catch (error) {
      console.error("Error fetching user tasks:", error);
      res.status(500).json({ message: "Failed to fetch user tasks" });
    }
  });


  app.get('/api/tasks/progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      console.log(`[TASK PROGRESS] Calculating progress for user ${userId}`);
      const allTasks = await storage.getTasks();
      console.log(`[TASK PROGRESS] Found ${allTasks.length} tasks`);

      const progressMap: Record<string, { currentProgress: number; targetValue: number }> = {};


      const manualVerificationTasks = [
        "добро пожаловать",
        "подписка на telegram"
      ];

      for (const task of allTasks) {
        try {
          const taskTitle = task.title.toLowerCase();
          const taskDescription = (task.description || '').toLowerCase();
          let currentProgress = 0;
          console.log(`[TASK PROGRESS] Processing task: ${task.title}`);


          if (manualVerificationTasks.some(t => taskTitle.includes(t.toLowerCase()))) {
            currentProgress = 0;
          }


          else if ((taskTitle.includes("потратьте") || taskDescription.includes("потратьте")) &&
            (taskTitle.includes("рубл") || taskDescription.includes("рубл"))) {
            const purchases = await storage.getPurchases(userId);
            currentProgress = purchases.reduce((sum, p) => sum + parseFloat(p.price), 0);
          } else if ((taskTitle.includes("курс") || taskDescription.includes("курс")) &&
            (taskTitle.includes("купите") || taskDescription.includes("купите") ||
              taskTitle.includes("покупка") || taskDescription.includes("покупка"))) {
            const purchases = await storage.getPurchases(userId);
            currentProgress = purchases.length;
          } else if ((taskTitle.includes("друг") || taskDescription.includes("друг")) &&
            (taskTitle.includes("купил") || taskDescription.includes("купил") ||
              taskTitle.includes("купит") || taskDescription.includes("купит"))) {

            const result = await db.execute(sql`
            SELECT DISTINCT r.referred_user_id
            FROM referrals r
            INNER JOIN purchases p ON p.user_id = r.referred_user_id
            WHERE r.referrer_id = ${userId}
          `);
            currentProgress = result.rows.length;
          } else if (taskTitle.includes("друг") || taskDescription.includes("друг") ||
            taskTitle.includes("пригласите") || taskDescription.includes("пригласите") ||
            task.category === "social") {
            const userReferrals = await db.select().from(referrals).where(eq(referrals.referrerId, userId));
            currentProgress = userReferrals.length;
          } else if (taskTitle.includes("отзыв") || taskDescription.includes("отзыв")) {
            const userReviews = await db.select().from(reviews).where(eq(reviews.userId, userId));
            currentProgress = userReviews.length;
          } else if ((taskTitle.includes("избранное") || taskDescription.includes("избранное")) &&
            (taskTitle.includes("сегодня") || taskDescription.includes("сегодня"))) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const result = await db.execute(sql`
            SELECT COUNT(*) as count
            FROM favorites
            WHERE user_id = ${userId}
            AND created_at >= ${today.toISOString()}
          `);
            currentProgress = parseInt(result.rows[0].count);
          } else if (taskTitle.includes("избранное") || taskDescription.includes("избранное") ||
            taskTitle.includes("желаний") || taskDescription.includes("желаний")) {
            const favorites = await storage.getFavorites(userId);
            currentProgress = favorites.length;
          } else if ((taskTitle.includes("урок") || taskDescription.includes("урок")) &&
            (taskTitle.includes("сегодня") || taskDescription.includes("сегодня") ||
              taskDescription.includes("за день") || taskDescription.includes("одного дня") ||
              taskDescription.includes("один день"))) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const result = await db.execute(sql`
            SELECT DISTINCT lesson_id 
            FROM lesson_progress 
            WHERE user_id = ${userId} 
            AND last_accessed_at >= ${today.toISOString()}
          `);
            currentProgress = result.rows.length;
          } else if ((taskTitle.includes("урок") || taskDescription.includes("урок")) &&
            (taskDescription.includes("за неделю") || taskDescription.includes("неделю"))) {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);

            const result = await db.execute(sql`
            SELECT DISTINCT lesson_id 
            FROM lesson_progress 
            WHERE user_id = ${userId} 
            AND last_accessed_at >= ${weekAgo.toISOString()}
          `);
            currentProgress = result.rows.length;
          } else if ((taskTitle.includes("урок") || taskDescription.includes("урок")) &&
            (taskTitle.includes("просмотрите") || taskDescription.includes("просмотрите"))) {
            const viewedLessons = await db
              .select({ lessonId: lessonProgress.lessonId })
              .from(lessonProgress)
              .where(eq(lessonProgress.userId, userId))
              .groupBy(lessonProgress.lessonId);
            currentProgress = viewedLessons.length;
          } else if ((taskTitle.includes("завершите") || taskDescription.includes("завершите")) &&
            (taskTitle.includes("курс") || taskDescription.includes("курс"))) {
            const result = await db.execute(sql`
            SELECT cs.course_id
            FROM lesson_progress lp
            INNER JOIN lessons l ON l.id = lp.lesson_id
            INNER JOIN course_sections cs ON cs.id = l.section_id
            WHERE lp.user_id = ${userId}
            GROUP BY cs.course_id
            HAVING COUNT(CASE WHEN lp.completed = true THEN 1 END) = COUNT(*)
            AND COUNT(*) > 0
          `);
            currentProgress = result.rows.length;
          } else if ((taskTitle.includes("подряд") || taskDescription.includes("подряд")) &&
            (taskTitle.includes("дн") || taskDescription.includes("дн"))) {


            const result = await db.execute(sql`
            SELECT DISTINCT DATE(activity_date) as date
            FROM (
              SELECT login_date as activity_date FROM user_logins WHERE user_id = ${userId}
              UNION
              SELECT last_accessed_at as activity_date FROM lesson_progress WHERE user_id = ${userId}
              UNION
              SELECT purchase_date as activity_date FROM purchases WHERE user_id = ${userId}
              UNION
              SELECT created_at as activity_date FROM reviews WHERE user_id = ${userId}
              UNION
              SELECT created_at as activity_date FROM favorites WHERE user_id = ${userId}
            ) activities
            ORDER BY date DESC
          `);


            let currentStreak = 0;
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            for (let i = 0; i < result.rows.length; i++) {
              const activityDate = new Date(result.rows[i].date);
              const expectedDate = new Date(today);
              expectedDate.setDate(expectedDate.getDate() - currentStreak);


              if (activityDate.toDateString() === expectedDate.toDateString()) {
                currentStreak++;
              } else if (activityDate < expectedDate) {

                break;
              }
            }

            currentProgress = currentStreak;
          } else if (taskTitle.includes("активный ученик") ||
            (taskDescription.includes("заходите") && taskDescription.includes("5 дней") && taskDescription.includes("неделю"))) {

            const result = await db.execute(sql`
            SELECT COUNT(DISTINCT DATE(login_date)) as count
            FROM user_logins
            WHERE user_id = ${userId}
            AND DATE(login_date) >= CURRENT_DATE - INTERVAL '6 days'
            AND DATE(login_date) <= CURRENT_DATE
          `);
            currentProgress = parseInt(result.rows[0]?.count || '0');
          } else if ((taskTitle.includes("дн") || taskDescription.includes("дн")) &&
            (taskTitle.includes("проведите") || taskDescription.includes("проведите") ||
              taskTitle.includes("платформ") || taskDescription.includes("платформ"))) {
            const user = await storage.getUser(userId);
            if (user?.createdAt) {
              const daysSinceRegistration = Math.floor(
                (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)
              );
              currentProgress = daysSinceRegistration;
            }
          } else if (taskTitle.includes("первые шаги") || taskDescription.includes("первые шаги")) {

            const user = await storage.getUser(userId);
            currentProgress = (user?.phoneNumber && user?.telegramUsername) ? 1 : 0;
          } else if (taskTitle.includes("исследователь") ||
            (taskDescription.includes("просмотрите") && taskDescription.includes("курс"))) {

            const result = await db.execute(sql`
            SELECT COUNT(DISTINCT course_id) as count
            FROM course_views
            WHERE user_id = ${userId}
          `);
            currentProgress = parseInt(result.rows[0]?.count || '0');
          } else if (taskTitle.includes("ежедневный вход") || taskDescription.includes("заходите на платформу каждый день")) {

            const result = await db.execute(sql`
            SELECT COUNT(*) as count
            FROM user_logins
            WHERE user_id = ${userId}
            AND DATE(login_date) = CURRENT_DATE
          `);
            currentProgress = parseInt(result.rows[0]?.count || '0') > 0 ? 1 : 0;
          } else if (taskTitle.includes("первооткрыватель") || taskDescription.includes("первооткрыватель") ||
            taskTitle.includes("первые 100") || taskDescription.includes("первые 100")) {

            const allUsers = await db.select({ id: users.id }).from(users).orderBy(users.createdAt);
            const userIndex = allUsers.findIndex(u => u.id === userId);
            currentProgress = userIndex >= 0 && userIndex < 100 ? 1 : 0;
          } else if (taskTitle.includes("ночной совёнок") || taskDescription.includes("ночной совёнок")) {

            const result = await db.execute(sql`
            SELECT COUNT(*) as count
            FROM lesson_progress
            WHERE user_id = ${userId}
            AND EXTRACT(HOUR FROM last_accessed_at) >= 0 
            AND EXTRACT(HOUR FROM last_accessed_at) < 6
          `);
            currentProgress = parseInt(result.rows[0].count) > 0 ? 1 : 0;
          } else if (taskTitle.includes("ранняя пташка") || taskDescription.includes("ранняя пташка")) {

            const result = await db.execute(sql`
            SELECT COUNT(*) as count
            FROM lesson_progress
            WHERE user_id = ${userId}
            AND EXTRACT(HOUR FROM last_accessed_at) >= 5 
            AND EXTRACT(HOUR FROM last_accessed_at) < 8
          `);
            currentProgress = parseInt(result.rows[0].count) > 0 ? 1 : 0;
          } else if (taskTitle.includes("марафонец") || taskDescription.includes("марафонец") ||
            (taskDescription.includes("10 уроков") && taskDescription.includes("одного дня"))) {

            const result = await db.execute(sql`
            SELECT DATE(last_accessed_at) as date, COUNT(DISTINCT lesson_id) as lesson_count
            FROM lesson_progress
            WHERE user_id = ${userId}
            GROUP BY DATE(last_accessed_at)
            ORDER BY lesson_count DESC
            LIMIT 1
          `);
            currentProgress = result.rows.length > 0 ? parseInt(result.rows[0].lesson_count || '0') : 0;
          }

          progressMap[task.id] = {
            currentProgress,
            targetValue: task.targetValue || 1
          };
        } catch (taskError) {
          console.error(`[TASK PROGRESS] Error processing task ${task.id} (${task.title}):`, taskError);

          progressMap[task.id] = {
            currentProgress: 0,
            targetValue: task.targetValue || 1
          };
        }
      }

      console.log(`[TASK PROGRESS] Successfully calculated progress for ${Object.keys(progressMap).length} tasks`);
      res.json(progressMap);
    } catch (error) {
      console.error("[TASK PROGRESS] Fatal error calculating task progress:", error);
      res.status(500).json({ message: "Failed to calculate task progress" });
    }
  });

  app.post('/api/tasks/:id/claim', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id: taskId } = req.params;


      const paramSchema = z.object({
        id: z.string().min(1, "Task ID is required"),
      });
      const { id: validatedTaskId } = paramSchema.parse({ id: taskId });

      const existingUserTask = await storage.getUserTask(userId, validatedTaskId);
      if (existingUserTask) {
        return res.status(400).json({ message: "Task already claimed" });
      }

      const task = await storage.getTask(validatedTaskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }


      const taskTitle = task.title.toLowerCase();
      const taskDescription = (task.description || '').toLowerCase();
      let currentProgress = 0;
      let isCompleted = false;


      const manualVerificationTasks = [
        "добро пожаловать",
        "подписка на telegram"
      ];

      if (!manualVerificationTasks.some(t => taskTitle.includes(t.toLowerCase()))) {


        if (taskTitle.includes("первые шаги") && taskDescription.includes("профиль")) {

          const user = await storage.getUser(userId);
          const hasPhone = user && user.phoneNumber && user.phoneNumber.trim() !== '';
          const hasTelegram = user && user.telegramUsername && user.telegramUsername.trim() !== '';
          currentProgress = (hasPhone && hasTelegram) ? 1 : 0;
          console.log(`[TASK VALIDATION] Первые шаги task for user ${userId}: phone=${hasPhone}, telegram=${hasTelegram}`);
        } else if ((taskTitle.includes("потратьте") || taskDescription.includes("потратьте")) &&
          (taskTitle.includes("рубл") || taskDescription.includes("рубл"))) {

          const purchases = await storage.getPurchases(userId);
          currentProgress = purchases.reduce((sum, p) => sum + parseFloat(p.price), 0);
        } else if ((taskTitle.includes("курс") || taskDescription.includes("курс")) &&
          (taskTitle.includes("купите") || taskDescription.includes("купите") ||
            taskTitle.includes("покупка") || taskDescription.includes("покупка"))) {

          const purchases = await storage.getPurchases(userId);
          currentProgress = purchases.length;
        } else if ((taskTitle.includes("друг") || taskDescription.includes("друг")) &&
          (taskTitle.includes("купил") || taskDescription.includes("купил") ||
            taskTitle.includes("купит") || taskDescription.includes("купит"))) {

          const result = await db.execute(sql`
            SELECT DISTINCT r.referred_user_id
            FROM referrals r
            INNER JOIN purchases p ON p.user_id = r.referred_user_id
            WHERE r.referrer_id = ${userId}
          `);
          console.log(`[TASK VALIDATION] Щедрый друг task for user ${userId}: found ${result.rows.length} referrals with purchases`);
          currentProgress = result.rows.length;
        } else if (taskTitle.includes("друг") || taskDescription.includes("друг") ||
          taskTitle.includes("пригласите") || taskDescription.includes("пригласите") ||
          task.category === "social") {

          const userReferrals = await db.select().from(referrals).where(eq(referrals.referrerId, userId));
          console.log(`[TASK VALIDATION] Referral task for user ${userId}: found ${userReferrals.length} referrals`);
          currentProgress = userReferrals.length;
        } else if (taskTitle.includes("отзыв") || taskDescription.includes("отзыв")) {

          const userReviews = await db.select().from(reviews).where(eq(reviews.userId, userId));
          currentProgress = userReviews.length;
        } else if ((taskTitle.includes("избранное") || taskDescription.includes("избранное")) &&
          (taskTitle.includes("сегодня") || taskDescription.includes("сегодня"))) {

          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const result = await db.execute(sql`
            SELECT COUNT(*) as count
            FROM favorites
            WHERE user_id = ${userId}
            AND created_at >= ${today.toISOString()}
          `);
          currentProgress = parseInt(result.rows[0].count);
        } else if (taskTitle.includes("избранное") || taskDescription.includes("избранное") ||
          taskTitle.includes("желаний") || taskDescription.includes("желаний")) {

          const favorites = await storage.getFavorites(userId);
          currentProgress = favorites.length;
        } else if ((taskTitle.includes("урок") || taskDescription.includes("урок")) &&
          (taskTitle.includes("сегодня") || taskDescription.includes("сегодня") ||
            taskDescription.includes("за день") || taskDescription.includes("одного дня") ||
            taskDescription.includes("один день"))) {

          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const result = await db.execute(sql`
            SELECT DISTINCT lesson_id 
            FROM lesson_progress 
            WHERE user_id = ${userId} 
            AND last_accessed_at >= ${today.toISOString()}
          `);
          currentProgress = result.rows.length;
        } else if ((taskTitle.includes("урок") || taskDescription.includes("урок")) &&
          (taskDescription.includes("за неделю") || taskDescription.includes("неделю"))) {

          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);

          const result = await db.execute(sql`
            SELECT DISTINCT lesson_id 
            FROM lesson_progress 
            WHERE user_id = ${userId} 
            AND last_accessed_at >= ${weekAgo.toISOString()}
          `);
          currentProgress = result.rows.length;
        } else if ((taskTitle.includes("урок") || taskDescription.includes("урок")) &&
          (taskTitle.includes("просмотрите") || taskDescription.includes("просмотрите"))) {

          const viewedLessons = await db
            .select({ lessonId: lessonProgress.lessonId })
            .from(lessonProgress)
            .where(eq(lessonProgress.userId, userId))
            .groupBy(lessonProgress.lessonId);
          currentProgress = viewedLessons.length;
        } else if ((taskTitle.includes("завершите") || taskDescription.includes("завершите")) &&
          (taskTitle.includes("курс") || taskDescription.includes("курс"))) {


          const result = await db.execute(sql`
            SELECT cs.course_id
            FROM course_sections cs
            INNER JOIN lessons l ON l.section_id = cs.id
            LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = ${userId}
            GROUP BY cs.course_id
            HAVING 
              COUNT(l.id) > 0
              AND COUNT(CASE WHEN lp.completed = true THEN 1 END) = COUNT(l.id)
          `);
          currentProgress = result.rows.length;
        } else if ((taskTitle.includes("подряд") || taskDescription.includes("подряд")) &&
          (taskTitle.includes("дн") || taskDescription.includes("дн"))) {


          const result = await db.execute(sql`
            SELECT DISTINCT DATE(activity_date) as date
            FROM (
              SELECT login_date as activity_date FROM user_logins WHERE user_id = ${userId}
              UNION
              SELECT last_accessed_at as activity_date FROM lesson_progress WHERE user_id = ${userId}
              UNION
              SELECT purchase_date as activity_date FROM purchases WHERE user_id = ${userId}
              UNION
              SELECT created_at as activity_date FROM reviews WHERE user_id = ${userId}
              UNION
              SELECT created_at as activity_date FROM favorites WHERE user_id = ${userId}
            ) activities
            ORDER BY date DESC
          `);


          let currentStreak = 0;
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          for (let i = 0; i < result.rows.length; i++) {
            const activityDate = new Date(result.rows[i].date);
            const expectedDate = new Date(today);
            expectedDate.setDate(expectedDate.getDate() - currentStreak);


            if (activityDate.toDateString() === expectedDate.toDateString()) {
              currentStreak++;
            } else if (activityDate < expectedDate) {

              break;
            }
          }

          currentProgress = currentStreak;
        } else if (taskTitle.includes("активный ученик") ||
          (taskDescription.includes("заходите") && taskDescription.includes("5 дней") && taskDescription.includes("неделю"))) {

          const result = await db.execute(sql`
            SELECT COUNT(DISTINCT DATE(login_date)) as count
            FROM user_logins
            WHERE user_id = ${userId}
            AND DATE(login_date) >= CURRENT_DATE - INTERVAL '6 days'
            AND DATE(login_date) <= CURRENT_DATE
          `);
          currentProgress = parseInt(result.rows[0]?.count || '0');
        } else if ((taskTitle.includes("дн") || taskDescription.includes("дн")) &&
          (taskTitle.includes("проведите") || taskDescription.includes("проведите") ||
            taskTitle.includes("платформ") || taskDescription.includes("платформ"))) {

          const user = await storage.getUser(userId);
          if (user?.createdAt) {
            const daysSinceRegistration = Math.floor(
              (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)
            );
            currentProgress = daysSinceRegistration;
          }
        } else if (taskTitle.includes("первые шаги") || taskDescription.includes("первые шаги")) {

          const user = await storage.getUser(userId);
          currentProgress = (user?.phoneNumber && user?.telegramUsername) ? 1 : 0;
        } else if (taskTitle.includes("исследователь") ||
          (taskDescription.includes("просмотрите") && taskDescription.includes("курс"))) {

          const result = await db.execute(sql`
            SELECT COUNT(DISTINCT course_id) as count
            FROM course_views
            WHERE user_id = ${userId}
          `);
          currentProgress = parseInt(result.rows[0]?.count || '0');
        } else if (taskTitle.includes("ежедневный вход") || taskDescription.includes("заходите на платформу каждый день")) {

          const result = await db.execute(sql`
            SELECT COUNT(*) as count
            FROM user_logins
            WHERE user_id = ${userId}
            AND DATE(login_date) = CURRENT_DATE
          `);
          currentProgress = parseInt(result.rows[0]?.count || '0') > 0 ? 1 : 0;
        } else if (taskTitle.includes("первооткрыватель") || taskDescription.includes("первооткрыватель") ||
          taskTitle.includes("первые 100") || taskDescription.includes("первые 100")) {

          const allUsers = await db.select({ id: users.id }).from(users).orderBy(users.createdAt);
          const userIndex = allUsers.findIndex(u => u.id === userId);
          currentProgress = userIndex >= 0 && userIndex < 100 ? 1 : 0;
        } else if (taskTitle.includes("ночной совёнок") || taskDescription.includes("ночной совёнок")) {

          const result = await db.execute(sql`
            SELECT COUNT(*) as count
            FROM lesson_progress
            WHERE user_id = ${userId}
            AND EXTRACT(HOUR FROM last_accessed_at) >= 0 
            AND EXTRACT(HOUR FROM last_accessed_at) < 6
          `);
          currentProgress = parseInt(result.rows[0].count) > 0 ? 1 : 0;
        } else if (taskTitle.includes("ранняя пташка") || taskDescription.includes("ранняя пташка")) {

          const result = await db.execute(sql`
            SELECT COUNT(*) as count
            FROM lesson_progress
            WHERE user_id = ${userId}
            AND EXTRACT(HOUR FROM last_accessed_at) >= 5 
            AND EXTRACT(HOUR FROM last_accessed_at) < 8
          `);
          currentProgress = parseInt(result.rows[0].count) > 0 ? 1 : 0;
        } else if (taskTitle.includes("марафонец") || taskDescription.includes("марафонец") ||
          (taskDescription.includes("10 уроков") && taskDescription.includes("одного дня"))) {

          const result = await db.execute(sql`
            SELECT DATE(last_accessed_at) as date, COUNT(DISTINCT lesson_id) as lesson_count
            FROM lesson_progress
            WHERE user_id = ${userId}
            GROUP BY DATE(last_accessed_at)
            ORDER BY lesson_count DESC
            LIMIT 1
          `);
          currentProgress = result.rows.length > 0 ? parseInt(result.rows[0].lesson_count || '0') : 0;
        }


        isCompleted = currentProgress >= task.targetValue;

        if (!isCompleted) {
          return res.status(400).json({
            message: `Задание не выполнено. Прогресс: ${currentProgress}/${task.targetValue}`,
            currentProgress,
            targetValue: task.targetValue
          });
        }
      }

      const userTask = await storage.claimTask(userId, validatedTaskId, task.reward);


      const relatedAwards = await db
        .select()
        .from(awards)
        .where(eq(awards.requiredTaskId, validatedTaskId));

      for (const award of relatedAwards) {
        try {

          const existingUserAward = await db
            .select()
            .from(userAwards)
            .where(
              and(
                eq(userAwards.userId, userId),
                eq(userAwards.awardId, award.id)
              )
            )
            .limit(1);

          if (existingUserAward.length === 0) {

            await storage.addUserAward(userId, award.id);
            console.log(`[AWARD] Automatically awarded "${award.title}" to user ${userId} for completing task "${task.title}"`);


            try {
              await storage.createNotification({
                userId,
                type: 'award_earned',
                title: '🏆 Получена награда!',
                message: `Вы получили награду "${award.title}" за выполнение задания "${task.title}"!`,
                relatedId: award.id,
              });
            } catch (notifError) {
              console.error('[AWARD] Error creating award notification:', notifError);
            }
          }
        } catch (awardError) {
          console.error(`[AWARD] Error awarding "${award.title}" to user ${userId}:`, awardError);
        }
      }

      res.json(userTask);
    } catch (error: any) {
      console.error("Error claiming task:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to claim task" });
    }
  });

  app.post('/api/balance/topup', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      const schema = z.object({
        amount: z.union([z.number(), z.string()]).transform(val => typeof val === 'number' ? val : parseFloat(val))
      });
      const validatedData = schema.parse(req.body);
      const amount = validatedData.amount;

      if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }

      await storage.updateUserBalance(userId, amount);
      await storage.addBalanceTransaction({
        userId,
        amount: amount.toString(),
        type: "topup",
        description: "Пополнение баланса",
      });


      const activeReferral = await storage.getReferralForUser(userId);

      if (activeReferral) {

        const referrer = await storage.getUser(activeReferral.referrerId);
        const settings = await storage.getSiteSettings();


        const bonusPercent = referrer?.referralBonusPercent ?? settings?.referralBonusPercent ?? 30;
        const referralBonus = (amount * bonusPercent) / 100;

        await storage.updateUserReferralBalance(activeReferral.referrerId, referralBonus);
        await storage.updateReferralEarnings(activeReferral.id, referralBonus);
        await storage.addBalanceTransaction({
          userId: activeReferral.referrerId,
          amount: referralBonus.toString(),
          type: "referral",
          description: `Реферальный бонус от пополнения баланса: ${amount.toFixed(2)} ₽`,
        });
      }

      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error topping up balance:", error);
      res.status(500).json({ message: "Failed to top up balance" });
    }
  });

  app.get('/api/admin/courses', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { platform, level, year, minPrice, maxPrice, minRating, author, search, subcategoryId, categoryId } = req.query;

      const courses = await storage.getCourses({
        platform: platform as string | undefined,
        level: level as string | undefined,
        year: year ? parseInt(year as string, 10) : undefined,
        minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
        minRating: minRating ? parseFloat(minRating as string) : undefined,
        author: author as string | undefined,
        search: search as string | undefined,
        subcategoryId: subcategoryId as string | undefined,

        categoryId: categoryId as string | undefined,
        forAdmin: true,
      } as any);

      res.json(courses);
    } catch (error) {
      console.error('Error fetching admin courses:', error);
      res.status(500).json({ message: 'Failed to fetch courses' });
    }
  });

  app.get('/api/admin/courses/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const course = await storage.getCourse(req.params.id);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      res.json(course);
    } catch (error) {
      console.error("Error fetching course:", error);
      res.status(500).json({ message: "Failed to fetch course" });
    }
  });

  app.post('/api/admin/courses', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const validatedData = insertCourseSchema.parse(req.body);
      const course = await storage.createCourse(validatedData);

      res.json(course);
    } catch (error: any) {
      console.error("Error creating course:", error);
      res.status(400).json({ message: error.message || "Failed to create course" });
    }
  });

  app.delete('/api/admin/courses/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {

      const paramSchema = z.object({
        id: z.string().min(1, "Course ID is required"),
      });
      const { id } = paramSchema.parse(req.params);

      await storage.deleteCourse(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting course:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to delete course" });
    }
  });

  app.post('/api/admin/tasks', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const validatedData = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(validatedData);

      res.json(task);
    } catch (error: any) {
      console.error("Error creating task:", error);
      res.status(400).json({ message: error.message || "Failed to create task" });
    }
  });


  app.get('/api/courses/:courseId/reviews', async (req: any, res) => {
    try {
      const { courseId } = req.params;
      const reviews = await storage.getReviewsByCourse(courseId);
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  app.get('/api/courses/:courseId/rating', async (req: any, res) => {
    try {
      const { courseId } = req.params;
      const stats = await storage.getCourseRatingStats(courseId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching rating stats:", error);
      res.status(500).json({ message: "Failed to fetch rating stats" });
    }
  });

  app.get('/api/reviews/my/:courseId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { courseId } = req.params;
      const review = await storage.getUserReviewForCourse(userId, courseId);
      res.json(review || null);
    } catch (error) {
      console.error("Error fetching user review:", error);
      res.status(500).json({ message: "Failed to fetch user review" });
    }
  });

  app.post('/api/reviews', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertReviewSchema.parse(req.body);


      const existingReview = await storage.getUserReviewForCourse(userId, validatedData.courseId);
      if (existingReview) {
        return res.status(400).json({ message: "You have already reviewed this course" });
      }


      const purchase = await storage.getPurchase(userId, validatedData.courseId);
      const course = await storage.getCourse(validatedData.courseId);

      if (!purchase && !course?.isFree) {
        return res.status(403).json({ message: "You must purchase this course before reviewing it" });
      }

      const review = await storage.createReview({
        ...validatedData,
        userId,
      });

      res.json(review);
    } catch (error: any) {
      console.error("Error creating review:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to create review" });
    }
  });

  app.put('/api/reviews/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;


      const paramSchema = z.object({
        id: z.string().min(1, "Review ID is required"),
      });
      paramSchema.parse({ id });


      const existingReview = await storage.getReviewById(id);
      if (!existingReview) {
        return res.status(404).json({ message: "Review not found" });
      }

      if (existingReview.userId !== userId) {
        return res.status(403).json({ message: "You can only edit your own reviews" });
      }

      const schema = z.object({
        rating: z.number().int().min(1).max(5).optional(),
        comment: z.string().min(10).max(1000).optional(),
      });
      const validatedData = schema.parse(req.body);

      const updated = await storage.updateReview(id, validatedData);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating review:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to update review" });
    }
  });

  app.delete('/api/reviews/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;


      const paramSchema = z.object({
        id: z.string().min(1, "Review ID is required"),
      });
      paramSchema.parse({ id });


      const existingReview = await storage.getReviewById(id);
      if (!existingReview) {
        return res.status(404).json({ message: "Review not found" });
      }

      if (existingReview.userId !== userId) {
        return res.status(403).json({ message: "You can only delete your own reviews" });
      }

      await storage.deleteReview(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting review:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to delete review" });
    }
  });


  app.post('/api/reviews/:id/vote', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id: reviewId } = req.params;

      const schema = z.object({
        voteType: z.enum(['like', 'dislike']),
      });
      const { voteType } = schema.parse(req.body);


      const review = await storage.getReviewById(reviewId);
      if (!review) {
        return res.status(404).json({ message: "Review not found" });
      }


      if (review.userId === userId) {
        return res.status(403).json({ message: "You cannot vote on your own review" });
      }


      const existingVote = await storage.getUserReviewVote(reviewId, userId);
      if (existingVote) {

        if (existingVote.voteType !== voteType) {
          await storage.removeReviewVote(reviewId, userId);
          await storage.addReviewVote({ reviewId, userId, voteType });
        }
      } else {

        await storage.addReviewVote({ reviewId, userId, voteType });
      }


      const voteCounts = await storage.getReviewVotesCount(reviewId);
      res.json(voteCounts);
    } catch (error: any) {
      console.error("Error voting on review:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to vote on review" });
    }
  });

  app.delete('/api/reviews/:id/vote', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id: reviewId } = req.params;

      await storage.removeReviewVote(reviewId, userId);


      const voteCounts = await storage.getReviewVotesCount(reviewId);
      res.json(voteCounts);
    } catch (error) {
      console.error("Error removing vote:", error);
      res.status(500).json({ message: "Failed to remove vote" });
    }
  });

  app.get('/api/reviews/:id/votes', async (req, res) => {
    try {
      const { id: reviewId } = req.params;

      const voteCounts = await storage.getReviewVotesCount(reviewId);
      res.json(voteCounts);
    } catch (error) {
      console.error("Error fetching vote counts:", error);
      res.status(500).json({ message: "Failed to fetch vote counts" });
    }
  });

  app.get('/api/reviews/:id/user-vote', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id: reviewId } = req.params;

      const vote = await storage.getUserReviewVote(reviewId, userId);
      res.json(vote || null);
    } catch (error) {
      console.error("Error fetching user vote:", error);
      res.status(500).json({ message: "Failed to fetch user vote" });
    }
  });


  app.get('/api/courses/:courseId/user-progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { courseId } = req.params;

      const userProgress = await storage.getUserProgress(userId, courseId);
      res.json(userProgress);
    } catch (error) {
      console.error("Error fetching user progress:", error);
      res.status(500).json({ message: "Failed to fetch user progress" });
    }
  });



  app.get('/api/admin/reviews/pending', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const pendingReviews = await storage.getPendingReviews();
      res.json(pendingReviews);
    } catch (error) {
      console.error("Error fetching pending reviews:", error);
      res.status(500).json({ message: "Failed to fetch pending reviews" });
    }
  });

  app.patch('/api/admin/reviews/:id/moderate', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const moderatorId = req.user.claims.sub;
      const { id: reviewId } = req.params;

      const schema = z.object({
        status: z.enum(['approved', 'rejected']),
        comment: z.string().optional(),
      });
      const { status, comment } = schema.parse(req.body);


      const review = await storage.getReviewById(reviewId);
      if (!review) {
        return res.status(404).json({ message: "Review not found" });
      }

      const moderated = await storage.moderateReview(reviewId, status, moderatorId, comment);
      res.json(moderated);
    } catch (error: any) {
      console.error("Error moderating review:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to moderate review" });
    }
  });

  app.patch('/api/reviews/:id/admin-comment', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id: reviewId } = req.params;

      const schema = z.object({
        adminComment: z.string().nullable(),
      });
      const { adminComment } = schema.parse(req.body);


      const review = await storage.getReviewById(reviewId);
      if (!review) {
        return res.status(404).json({ message: "Review not found" });
      }

      const updated = await storage.updateReviewAdminComment(reviewId, adminComment);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating review admin comment:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to update admin comment" });
    }
  });

  app.get('/api/admin/stats', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });


  app.get('/api/admin/analytics/users', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const usersData = await storage.getUsersAnalytics();


      const users = usersData.map(user => ({
        id: user.id,
        email: user.email || '',
        displayName: user.firstName && user.lastName
          ? `${user.firstName} ${user.lastName}`.trim()
          : user.firstName || user.lastName || null,
        telegramUsername: user.telegramUsername,
        profileImage: null,
        isOnline: user.isOnline,
        lastActivityAt: user.lastActivityAt,
        balance: parseFloat(user.balance),
        coursesPurchased: user.coursesPurchased,
        totalPurchaseAmount: user.totalPurchaseAmount,
        videoWatchMinutes: user.totalWatchTimeMinutes,
      }));

      res.json(users);
    } catch (error) {
      console.error("Error fetching users analytics:", error);
      res.status(500).json({ message: "Failed to fetch users analytics" });
    }
  });

  app.get('/api/admin/analytics/stats', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const stats = await storage.getPlatformStats();

      res.json({
        usersOnline: stats.usersOnline,
        totalUsers: stats.totalUsers,
        totalRevenue: parseFloat(stats.totalRevenue),
        totalWatchTimeMinutes: stats.totalWatchTimeMinutes,
        usersWithTelegram: stats.usersWithTelegram,
      });
    } catch (error) {
      console.error("Error fetching platform stats:", error);
      res.status(500).json({ message: "Failed to fetch platform stats" });
    }
  });


  app.get('/api/admin/analytics/revenue', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const data = await storage.getRevenueByDay(days);
      res.json(data);
    } catch (error) {
      console.error("Error fetching revenue analytics:", error);
      res.status(500).json({ message: "Failed to fetch revenue analytics" });
    }
  });

  app.get('/api/admin/analytics/top-courses', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const data = await storage.getTopCoursesByMetric(limit);
      res.json(data);
    } catch (error) {
      console.error("Error fetching top courses:", error);
      res.status(500).json({ message: "Failed to fetch top courses" });
    }
  });

  app.get('/api/admin/analytics/active-users', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const data = await storage.getActiveUsersStats();
      res.json(data);
    } catch (error) {
      console.error("Error fetching active users stats:", error);
      res.status(500).json({ message: "Failed to fetch active users stats" });
    }
  });

  app.get('/api/admin/analytics/funnel', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const data = await storage.getPurchaseFunnel();
      res.json(data);
    } catch (error) {
      console.error("Error fetching purchase funnel:", error);
      res.status(500).json({ message: "Failed to fetch purchase funnel" });
    }
  });

  app.get('/api/admin/analytics/activity-heatmap', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const data = await storage.getActivityHeatmap();
      res.json(data);
    } catch (error) {
      console.error("Error fetching activity heatmap:", error);
      res.status(500).json({ message: "Failed to fetch activity heatmap" });
    }
  });

  app.get('/api/admin/analytics/referrals', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const data = await storage.getReferralAnalytics();
      res.json(data);
    } catch (error) {
      console.error("Error fetching referral analytics:", error);
      res.status(500).json({ message: "Failed to fetch referral analytics" });
    }
  });

  app.get('/api/admin/analytics/landing-visits', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const stats = await storage.getLandingVisitStats(days);
      res.json(stats);
    } catch (error) {
      console.error("Error getting landing visit stats:", error);
      res.status(500).json({ message: "Failed to get landing visit stats" });
    }
  });

  app.get('/api/admin/analytics/registrations', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const data = await storage.getRegistrationTrends(days);
      res.json(data);
    } catch (error) {
      console.error("Error fetching registration trends:", error);
      res.status(500).json({ message: "Failed to fetch registration trends" });
    }
  });

  app.get('/api/admin/analytics/referral-trends', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const data = await storage.getReferralTrends(days);
      res.json(data);
    } catch (error) {
      console.error("Error fetching referral trends:", error);
      res.status(500).json({ message: "Failed to fetch referral trends" });
    }
  });

  app.get('/api/admin/analytics/referrers-detailed', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const data = await storage.getDetailedReferrers();
      res.json(data);
    } catch (error) {
      console.error("Error fetching detailed referrers:", error);
      res.status(500).json({ message: "Failed to fetch detailed referrers" });
    }
  });


  app.get('/api/admin/analytics/revenue-metrics', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const data = await storage.getRevenueMetrics();
      res.json(data);
    } catch (error) {
      console.error("Error fetching revenue metrics:", error);
      res.status(500).json({ message: "Failed to fetch revenue metrics" });
    }
  });

  app.get('/api/admin/analytics/mrr', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const months = parseInt(req.query.months as string) || 12;
      const data = await storage.getMRRData(months);
      res.json(data);
    } catch (error) {
      console.error("Error fetching MRR data:", error);
      res.status(500).json({ message: "Failed to fetch MRR data" });
    }
  });


  app.get('/api/admin/analytics/retention', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const data = await storage.getRetentionMetrics();
      res.json(data);
    } catch (error) {
      console.error("Error fetching retention metrics:", error);
      res.status(500).json({ message: "Failed to fetch retention metrics" });
    }
  });

  app.get('/api/admin/analytics/cohort', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const months = parseInt(req.query.months as string) || 6;
      const data = await storage.getCohortAnalysis(months);
      res.json(data);
    } catch (error) {
      console.error("Error fetching cohort analysis:", error);
      res.status(500).json({ message: "Failed to fetch cohort analysis" });
    }
  });


  app.get('/api/admin/analytics/engagement', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const data = await storage.getEngagementMetrics();
      res.json(data);
    } catch (error) {
      console.error("Error fetching engagement metrics:", error);
      res.status(500).json({ message: "Failed to fetch engagement metrics" });
    }
  });

  app.put('/api/admin/users/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const schema = z.object({
        balance: z.number().optional(),
        isAdmin: z.boolean().optional(),
      });
      const data = schema.parse(req.body);

      let user;
      if (data.isAdmin !== undefined) {
        user = await storage.updateUserAdmin(id, data.isAdmin);
      }
      if (data.balance !== undefined) {
        user = await storage.addUserBalance(id, data.balance);
      }

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(user);
    } catch (error: any) {
      console.error("Error updating user:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.message });
      }
      if (error.message === 'User not found') {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.put('/api/admin/courses/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;

      const updateSchema = insertCourseSchema.partial().extend({
        price: z.union([z.string(), z.number()]).transform(val => String(val)).optional(),
        year: z.union([z.string(), z.number()]).transform(val => Number(val)).optional(),
      });
      const courseData = updateSchema.parse(req.body);


      if (courseData.paymentType === 'fantiks_only') {
        courseData.price = '0';
      }

      const course = await storage.updateCourse(id, courseData);
      res.json(course);
    } catch (error: any) {
      console.error("Error updating course:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to update course" });
    }
  });


  app.patch('/api/admin/courses/:id/toggle-visibility', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const schema = z.object({
        field: z.enum(['hiddenInShop', 'hiddenInLibrary']),
      });
      const { field } = schema.parse(req.body);

      const course = await storage.toggleCourseVisibility(id, field);
      res.json(course);
    } catch (error: any) {
      console.error("Error toggling course visibility:", error);
      if (error.message === 'Course not found') {
        return res.status(404).json({ message: error.message });
      }
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to toggle visibility" });
    }
  });


  app.get('/api/admin/courses/:courseId/subcategories', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { courseId } = req.params;
      const subcategoryIds = await storage.getCourseSubcategories(courseId);
      res.json(subcategoryIds);
    } catch (error) {
      console.error("Error fetching course subcategories:", error);
      res.status(500).json({ message: "Failed to fetch course subcategories" });
    }
  });

  app.put('/api/admin/courses/:courseId/subcategories', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { courseId } = req.params;
      const schema = z.object({
        subcategoryIds: z.array(z.string()),
      });
      const { subcategoryIds } = schema.parse(req.body);

      await storage.setCourseSubcategories(courseId, subcategoryIds);
      res.json({ success: true, subcategoryIds });
    } catch (error: any) {
      console.error("Error updating course subcategories:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to update course subcategories" });
    }
  });


  app.get('/api/admin/courses/:courseId/sections', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { courseId } = req.params;
      const sections = await storage.getCourseSections(courseId);
      const sectionsWithLessons = await Promise.all(
        sections.map(async (section) => {
          const lessons = await storage.getLessonsBySection(section.id);
          return { ...section, lessons };
        })
      );


      res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.json(sectionsWithLessons);
    } catch (error) {
      console.error("Error fetching course sections:", error);
      res.status(500).json({ message: "Failed to fetch course sections" });
    }
  });

  app.post('/api/admin/courses/:courseId/sections', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { courseId } = req.params;
      const schema = z.object({
        title: z.string(),
        description: z.string().optional(),
        order: z.number(),
      });
      const sectionData = schema.parse(req.body);

      const section = await storage.createCourseSection({
        courseId,
        ...sectionData,
      });
      res.json(section);
    } catch (error: any) {
      console.error("Error creating section:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to create section" });
    }
  });

  app.put('/api/admin/sections/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const schema = z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        order: z.number().optional(),
      });
      const sectionData = schema.parse(req.body);

      const section = await storage.updateCourseSection(id, sectionData);
      res.json(section);
    } catch (error: any) {
      console.error("Error updating section:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to update section" });
    }
  });

  app.delete('/api/admin/sections/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteCourseSection(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting section:", error);
      res.status(500).json({ message: "Failed to delete section" });
    }
  });


  app.post('/api/admin/sections/:sectionId/lessons', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { sectionId } = req.params;
      const schema = z.object({
        title: z.string(),
        description: z.string().optional(),
        order: z.number(),
      });
      const lessonData = schema.parse(req.body);

      const lesson = await storage.createLesson({
        sectionId,
        ...lessonData,
      });
      res.json(lesson);
    } catch (error: any) {
      console.error("Error creating lesson:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to create lesson" });
    }
  });

  app.put('/api/admin/lessons/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const schema = z.object({
        title: z.string().optional(),
        description: z.string().optional(),

        duration: z.number().optional(),
        order: z.number().optional(),
        processingStatus: z.string().optional(),
        uploadProgress: z.number().optional(),
        errorMessage: z.string().optional(),
      });
      const lessonData = schema.parse(req.body);

      const lesson = await storage.updateLesson(id, lessonData);
      res.json(lesson);
    } catch (error: any) {
      console.error("Error updating lesson:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to update lesson" });
    }
  });

  app.delete('/api/admin/lessons/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteLesson(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting lesson:", error);
      res.status(500).json({ message: "Failed to delete lesson" });
    }
  });


  app.post('/api/admin/lessons/:id/video', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { videoUrl, originalFileName } = req.body;

      if (!videoUrl || !originalFileName) {
        return res.status(400).json({ message: "videoUrl and originalFileName are required" });
      }


      const userId = req.user.claims.sub;


      const { videoQueue } = await import('./videoQueue');


      await storage.updateLesson(id, {
        processingStatus: 'uploading',
        uploadProgress: 0
      });


      await videoQueue.addToQueue(id, videoUrl, originalFileName, userId);

      res.json({ success: true, status: 'queued' });
    } catch (error) {
      console.error("Error queuing video for processing:", error);
      res.status(500).json({ message: "Failed to queue video" });
    }
  });


  app.delete('/api/admin/lessons/:id/video', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;


      const lesson = await storage.getLesson(id);
      if (!lesson) {
        return res.status(404).json({ message: "Lesson not found" });
      }

      if (!lesson.videoUrl) {
        return res.status(400).json({ message: "Lesson has no video to delete" });
      }


      await storage.updateLesson(id, {
        videoUrl: '',
        duration: 0,
        processingStatus: undefined,
        uploadProgress: undefined,
        errorMessage: undefined
      });

      res.json({ success: true, message: "Video deleted successfully" });
    } catch (error) {
      console.error("Error deleting video:", error);
      res.status(500).json({ message: "Failed to delete video" });
    }
  });


  app.get('/api/admin/lessons/:id/status', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const lesson = await storage.getLesson(id);

      if (!lesson) {
        return res.status(404).json({ message: "Lesson not found" });
      }


      const { videoQueue } = await import('./videoQueue');
      const queuePosition = videoQueue.getQueuePosition(id);

      res.json({
        processingStatus: lesson.processingStatus,
        uploadProgress: lesson.uploadProgress,
        errorMessage: lesson.errorMessage,
        queuePosition: queuePosition > 0 ? queuePosition : null,
        queueLength: videoQueue.getQueueLength(),
      });
    } catch (error) {
      console.error("Error fetching lesson status:", error);
      res.status(500).json({ message: "Failed to fetch status" });
    }
  });


  app.post('/api/admin/videos/reprocess-all', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { videoQueue } = await import('./videoQueue');
      const currentUserId = req.user.claims.sub;


      const lessonsToReprocess = await db
        .select()
        .from(lessons)
        .where(
          and(
            isNotNull(lessons.videoUrl),
            or(
              eq(lessons.processingStatus, 'queued'),
              eq(lessons.processingStatus, 'failed')
            )
          )
        );

      console.log(`Reprocessing ${lessonsToReprocess.length} queued/failed videos`);


      for (const lesson of lessonsToReprocess) {
        if (lesson.videoUrl) {

          const userId = lesson.uploadedBy || currentUserId;


          if (!lesson.uploadedBy) {
            await db.update(lessons)
              .set({ uploadedBy: currentUserId })
              .where(eq(lessons.id, lesson.id));
            console.log(`[Mass Reprocess] Set uploadedBy=${currentUserId} for legacy lesson ${lesson.id}`);
          }

          await videoQueue.addToQueue(lesson.id, lesson.videoUrl, 'video.mp4', userId);
          console.log(`Added lesson ${lesson.id} (${lesson.title}) to queue`);
        }
      }

      res.json({
        success: true,
        queuedCount: lessonsToReprocess.length,
        queueLength: videoQueue.getQueueLength()
      });
    } catch (error) {
      console.error("Error reprocessing videos:", error);
      res.status(500).json({ message: "Failed to reprocess videos" });
    }
  });


  app.get('/api/admin/courses/:courseId/subcategories', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { courseId } = req.params;
      const subcategoryIds = await storage.getCourseSubcategories(courseId);


      const subcategoriesData = await Promise.all(
        subcategoryIds.map(async (subId) => {
          const subcategory = await storage.getSubcategory(subId);
          return subcategory ? {
            id: subcategory.id,
            categoryId: subcategory.categoryId,
            name: subcategory.name
          } : null;
        })
      );

      res.json(subcategoriesData.filter(Boolean));
    } catch (error) {
      console.error("Error fetching course subcategories:", error);
      res.status(500).json({ message: "Failed to fetch course subcategories" });
    }
  });

  app.put('/api/admin/courses/:courseId/subcategories', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { courseId } = req.params;
      const schema = z.object({
        subcategoryIds: z.array(z.string()),
      });
      const { subcategoryIds } = schema.parse(req.body);
      await storage.setCourseSubcategories(courseId, subcategoryIds);





      if (subcategoryIds.length > 0) {
        const subcategories = await Promise.all(
          subcategoryIds.map(id => storage.getSubcategory(id))
        );
        const levelNames = subcategories
          .filter((s): s is NonNullable<typeof s> => s !== null && s !== undefined && !!s.name)
          .map(s => s.name);

        if (levelNames.length > 0) {
          await storage.updateCourse(courseId, { level: levelNames });
        }
      }

      clearCache();
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error updating course subcategories:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to update course subcategories" });
    }
  });



  app.post('/api/objects/upload', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const uploadSchema = z.object({
        courseId: z.string().uuid().optional(),
        sectionId: z.string().uuid().optional(),
        lessonId: z.string().uuid().optional(),
        fileName: z.string().optional(),
        sectionTitle: z.string().optional(),
        lessonTitle: z.string().optional(),
      });

      const { courseId, sectionId, lessonId, fileName, sectionTitle, lessonTitle } = uploadSchema.parse(req.body || {});

      const objectStorageService = new ObjectStorageService();
      let pathSegments: string[] | undefined;

      if (courseId) {
        const course = await storage.getCourse(courseId);
        if (!course) {
          return res.status(404).json({ message: "Course not found" });
        }

        pathSegments = await buildCourseUploadPathSegments(course, {
          sectionId,
          lessonId,
          sectionTitle,
          lessonTitle,
        });
      }

      const { uploadURL, headers } = await objectStorageService.getObjectEntityUploadURL({
        pathSegments,
        fileName,
      });
      res.json({ uploadURL, uploadHeaders: headers });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to get upload URL" });
    }
  });



  app.post('/api/objects/upload-public', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const uploadSchema = z.object({
        courseId: z.string().uuid().optional(),
        sectionId: z.string().uuid().optional(),
        lessonId: z.string().uuid().optional(),
        fileName: z.string().optional(),
        sectionTitle: z.string().optional(),
        lessonTitle: z.string().optional(),
      });

      const { courseId, sectionId, lessonId, fileName, sectionTitle, lessonTitle } = uploadSchema.parse(req.body || {});

      const objectStorageService = new ObjectStorageService();
      let pathSegments: string[] | undefined;

      if (courseId) {
        const course = await storage.getCourse(courseId);
        if (!course) {
          return res.status(404).json({ message: "Course not found" });
        }

        pathSegments = await buildCourseUploadPathSegments(course, {
          sectionId,
          lessonId,
          sectionTitle,
          lessonTitle,
        });
      }

      const { uploadURL, headers } = await objectStorageService.getPublicObjectUploadURL({
        pathSegments,
        fileName,
      });
      res.json({ uploadURL, uploadHeaders: headers });
    } catch (error) {
      console.error("Error getting public upload URL:", error);
      res.status(500).json({ message: "Failed to get public upload URL" });
    }
  });


  app.put('/api/objects/acl-public', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { fileURL } = req.body;
      console.log('[ACL-PUBLIC] Request received:', { fileURL });

      if (!fileURL) {
        return res.status(400).json({ message: "fileURL is required" });
      }

      const objectStorageService = new ObjectStorageService();
      const publicPaths = objectStorageService.getPublicObjectSearchPaths();
      const publicPrefix = publicPaths[0].replace(/^\/+/, "");
      const url = new URL(fileURL);
      const normalizedPath = url.pathname.replace(/^\/+/, "");
      const relativePath = normalizedPath.startsWith(publicPrefix)
        ? normalizedPath.slice(publicPrefix.length).replace(/^\/+/, "")
        : normalizedPath;

      if (!relativePath) {
        return res.status(400).json({ message: "Invalid file URL" });
      }

      const objectPath = `${publicPrefix}/${relativePath}`;
      const file: StoredObject = { path: objectPath };

      await setObjectAclPolicy(file, {
        owner: req.user?.id || req.user?.claims?.sub,
        visibility: "public",
      });


      const publicPath = `/objects/public/${relativePath}`;
      console.log('[ACL-PUBLIC] Success:', { publicPath });

      return res.json({
        success: true,
        publicPath,
      });
    } catch (error: any) {
      console.error("Error setting public ACL:", error);
      console.error("Error stack:", error?.stack);
      return res.status(500).json({ message: "Failed to set public file permissions", error: error?.message });
    }
  });


  app.put('/api/objects/acl', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { fileURL, courseId } = req.body;

      if (!fileURL) {
        return res.status(400).json({ message: "fileURL is required" });
      }

      const userId = req.user?.id || req.user?.claims?.sub;
      const objectStorageService = new ObjectStorageService();

      let objectPath = fileURL;

      // Преобразуем локальный приватный путь в формат /objects/.private/...
      const privateDir = objectStorageService.getPrivateObjectDir();
      if (objectPath.startsWith(privateDir) || objectPath.startsWith("/private/")) {
        const relative = objectPath.replace(privateDir, "").replace(/^\/+/, "");
        objectPath = `/objects/.private/${relative}`;
      }

      // Устанавливаем ACL
      await objectStorageService.trySetObjectEntityAclPolicy(objectPath, {
        owner: userId,
        visibility: courseId ? "private" : "public",
      });

      const relativePath = objectPath.replace(/^\/objects\/\.private\//, "");
      const publicURL = buildStorageUrl(relativePath);

      res.json({
        success: true,
        objectPath: relativePath,
        publicURL,
      });
    } catch (error) {
      console.error("Error setting ACL:", error);
      res.status(500).json({ message: "Failed to set file permissions" });
    }
  });




  app.post('/api/objects/convert-video', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { videoUrl } = req.body;

      if (!videoUrl) {
        return res.status(400).json({ message: "videoUrl is required" });
      }

      const userId = req.user?.id || req.user?.claims?.sub;
      const { VideoConverter } = await import('./videoConverter');
      const converter = new VideoConverter();

      console.log('[API] Starting video conversion for:', videoUrl);


      const result = await converter.convertVideo(videoUrl, userId);

      if (result.success) {
        res.json({
          success: true,
          convertedUrl: result.convertedUrl,
          duration: result.duration,
        });
      } else {
        res.status(500).json({
          success: false,
          message: result.error || 'Video conversion failed',
        });
      }
    } catch (error) {
      console.error("Error converting video:", error);
      res.status(500).json({ message: "Failed to convert video" });
    }
  });


  app.post('/api/objects/convert-all-videos', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      console.log('[API] Starting bulk video conversion...');


      const lessonsWithVideos = await storage.getAllLessonsWithVideos();

      res.json({
        success: true,
        message: `Starting conversion of ${lessonsWithVideos.length} videos`,
        total: lessonsWithVideos.length,
      });


      const userId = req.user?.id || req.user?.claims?.sub;
      const { VideoConverter } = await import('./videoConverter');
      const converter = new VideoConverter();


      (async () => {
        let successCount = 0;
        let errorCount = 0;
        let skippedCount = 0;

        for (const lesson of lessonsWithVideos) {
          try {
            console.log(`\n📹 Converting video for lesson: ${lesson.title}`);
            console.log(`   Current URL: ${lesson.videoUrl}`);


            if (lesson.videoUrl?.includes('uploads/') && !lesson.videoUrl?.includes('.private')) {
              console.log('   ⏭️  Already converted (in uploads/), skipping');
              skippedCount++;
              continue;
            }


            const result = await converter.convertVideo(lesson.videoUrl!, userId);

            if (result.success && result.convertedUrl) {

              await storage.updateLesson(lesson.id, {
                videoUrl: result.convertedUrl,
                duration: result.duration || lesson.duration,
              });

              console.log(`   ✅ Converted successfully!`);
              console.log(`   New URL: ${result.convertedUrl}`);
              console.log(`   Duration: ${result.duration} min`);
              successCount++;
            } else {
              console.log(`   ❌ Conversion failed: ${result.error}`);
              errorCount++;
            }
          } catch (error) {
            console.error(`   ❌ Error converting video for lesson ${lesson.title}:`, error);
            errorCount++;
          }
        }

        console.log('\n📊 Bulk Conversion Complete:');
        console.log(`   ✅ Success: ${successCount}`);
        console.log(`   ❌ Failed: ${errorCount}`);
        console.log(`   ⏭️  Skipped: ${skippedCount}`);
        console.log(`   📝 Total: ${lessonsWithVideos.length}`);
      })();

    } catch (error) {
      console.error("Error starting bulk conversion:", error);
      res.status(500).json({ message: "Failed to start bulk conversion" });
    }
  });


  app.get('/objects/:objectPath(*)', async (req: any, res) => {
    const startTime = Date.now();
    try {
      const objectStorageService = new ObjectStorageService();
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      const userId = req.user?.claims?.sub;

      console.log(`[Video Request] ${req.path} User: ${userId || 'anonymous'} Range: ${req.headers.range || 'none'}`);
      console.log(`  Headers: User-Agent: ${req.headers['user-agent']?.substring(0, 50)}, Referer: ${req.headers.referer || 'none'}, Origin: ${req.headers.origin || 'none'}`);


      const aclPolicy = await getObjectAclPolicy(objectFile);


      if (aclPolicy) {

        if (aclPolicy.visibility === "public") {
          await objectStorageService.downloadObject(objectFile, res, 3600, req);
          const duration = Date.now() - startTime;
          console.log(`[Video Served] ${req.path} in ${duration}ms`);
          return;
        }


        if (!userId) {
          console.log(`[Video Denied] ${req.path} - Not authenticated`);
          return res.status(401).json({ message: "Authentication required to access this content" });
        }


        if (aclPolicy.owner === userId) {
          await objectStorageService.downloadObject(objectFile, res, 3600, req);
          console.log(`[Video Served] ${req.path} to owner in ${Date.now() - startTime}ms`);
          return;
        }





        const lessonWithPurchase = await db
          .select({
            lessonId: lessons.id,
            courseId: courseSections.courseId,
            sectionId: courseSections.id,
            sectionOrder: courseSections.order,
            lessonOrder: lessons.order,
            hasPurchase: purchases.id,
          })
          .from(lessons)
          .innerJoin(courseSections, eq(lessons.sectionId, courseSections.id))
          .leftJoin(purchases, and(
            eq(purchases.courseId, courseSections.courseId),
            eq(purchases.userId, userId)
          ))
          .where(eq(lessons.videoUrl, req.path))
          .limit(1);

        if (lessonWithPurchase.length > 0) {
          const lesson = lessonWithPurchase[0];


          const firstLessonWithVideo = await storage.getFirstLessonWithVideo(lesson.courseId);
          const isPreviewLesson = firstLessonWithVideo?.id === lesson.lessonId;


          if (isPreviewLesson) {
            await objectStorageService.downloadObject(objectFile, res, 3600, req);
            console.log(`[Video Served] ${req.path} - Preview lesson (authenticated) in ${Date.now() - startTime}ms`);
            return;
          }


          if (lesson.hasPurchase) {
            await objectStorageService.downloadObject(objectFile, res, 3600, req);
            console.log(`[Video Served] ${req.path} - Course purchased in ${Date.now() - startTime}ms`);
            return;
          }

          console.log(`[Video Denied] ${req.path} - Course not purchased`);
          return res.status(403).json({ message: "Course purchase required to access this video" });
        }


        const fileWithPurchase = await db
          .select({
            fileId: courseFiles.id,
            courseId: courseFiles.courseId,
            hasPurchase: purchases.id,
          })
          .from(courseFiles)
          .leftJoin(purchases, and(
            eq(purchases.courseId, courseFiles.courseId),
            eq(purchases.userId, userId)
          ))
          .where(eq(courseFiles.fileUrl, req.path))
          .limit(1);

        if (fileWithPurchase.length > 0) {
          const { hasPurchase } = fileWithPurchase[0];
          if (hasPurchase) {
            await objectStorageService.downloadObject(objectFile, res, 3600, req);
            console.log(`[File Served] ${req.path} - Course purchased in ${Date.now() - startTime}ms`);
            return;
          }

          console.log(`[File Denied] ${req.path} - Course not purchased`);
          return res.status(403).json({ message: "Course purchase required to access this file" });
        }
      }


      console.log(`[Access Denied] ${req.path} - No valid access method`);
      res.status(403).json({ message: "Access denied" });
    } catch (error) {
      console.error("Error serving file:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ message: "File not found" });
      }
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to serve file" });
      }
    }
  });


  app.get('/public-objects/:filePath(*)', async (req, res) => {
    try {
      const filePath = req.params.filePath;
      const objectStorageService = new ObjectStorageService();
      const file = await objectStorageService.searchPublicObject(filePath);

      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      await objectStorageService.downloadObject(file, res, 3600, req);
    } catch (error) {
      console.error("Error serving public file:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to serve file" });
      }
    }
  });


  app.get('/api/site-settings', async (req, res) => {
    try {
      const settings = await storage.getSiteSettings();
      res.json({
        siteName: settings?.siteName || "Курсы маркетплейсов",
        logoUrl: settings?.logoUrl || null,
        headerTitle: settings?.headerTitle || null,
        headerSubtitle: settings?.headerSubtitle || null,
        siteDescription: settings?.siteDescription || "Онлайн-курсы по маркетплейсам",
        supportEmail: settings?.supportEmail || "support@example.com",
        telegramBotUsername: settings?.telegramBotUsername || "",
        referralBonusPercent: settings?.referralBonusPercent ?? 30,
        require2FA: settings?.require2FA ?? 'disabled',
      });
    } catch (error) {
      console.error("Error fetching site settings:", error);
      res.status(500).json({ message: "Failed to fetch site settings" });
    }
  });


  app.get('/api/admin/settings', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const settings = await storage.getSiteSettings();
      res.json({
        siteName: settings?.siteName || "Маркетплейс Академия",
        siteDescription: settings?.siteDescription || "Онлайн-курсы по маркетплейсам",
        supportEmail: settings?.supportEmail || "support@example.com",
        telegramBotUsername: settings?.telegramBotUsername || "",
        telegramBotToken: settings?.telegramBotToken || "",
        referralBonusPercent: settings?.referralBonusPercent ?? 30,
        require2FA: settings?.require2FA ?? 'disabled',
      });
    } catch (error) {
      console.error("Error fetching admin settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.put('/api/admin/settings', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const schema = z.object({
        siteName: z.string().optional(),
        siteDescription: z.string().optional(),
        supportEmail: z.string().email().optional(),
        telegramBotUsername: z.string().optional(),
        telegramBotToken: z.string().optional(),
        referralBonusPercent: z.number().int().min(0).max(100).optional(),
        require2FA: z.enum(['disabled', 'optional', 'mandatory']).optional(),
      });
      const data = schema.parse(req.body);

      const settings = await storage.updateSiteSettings(data);
      res.json({
        siteName: settings.siteName,
        siteDescription: settings.siteDescription,
        supportEmail: settings.supportEmail,
        telegramBotUsername: settings.telegramBotUsername,
        telegramBotToken: settings.telegramBotToken,
        referralBonusPercent: settings.referralBonusPercent,
        require2FA: settings.require2FA,
      });
    } catch (error: any) {
      console.error("Error updating admin settings:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to update settings" });
    }
  });


  app.get('/api/vip-page-content', async (req, res) => {
    try {
      const content = await storage.getVipPageContent();
      res.json({
        pageTitle: content?.pageTitle || "VIP Подписки",
        pageSubtitle: content?.pageSubtitle || "Выберите подходящий тариф и получите эксклюзивный доступ к курсам, персональной поддержке и закрытым материалам для успешного обучения",
      });
    } catch (error) {
      console.error("Error fetching VIP page content:", error);
      res.status(500).json({ message: "Failed to fetch VIP page content" });
    }
  });

  app.put('/api/admin/vip-page-content', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const schema = z.object({
        pageTitle: z.string().min(1, "Page title is required").optional(),
        pageSubtitle: z.string().min(1, "Page subtitle is required").optional(),
      });
      const data = schema.parse(req.body);

      const content = await storage.updateVipPageContent(data);
      res.json(content);
    } catch (error: any) {
      console.error("Error updating VIP page content:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to update VIP page content" });
    }
  });


  app.get('/api/vip-tiers', async (req, res) => {
    try {
      const tiers = await storage.getVipTiers();
      res.json(tiers);
    } catch (error) {
      console.error("Error fetching VIP tiers:", error);
      res.status(500).json({ message: "Failed to fetch VIP tiers" });
    }
  });

  app.put('/api/admin/vip-tiers/:tier', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { tier } = req.params;
      const schema = z.object({
        displayName: z.string().min(1, "Display name is required").optional(),
        description: z.string().optional(),
        price: z.string().or(z.number()).optional(),
        features: z.array(z.string()).optional(),
        displayOrder: z.number().optional(),
      });
      const rawData = schema.parse(req.body);


      const data = {
        ...rawData,
        price: rawData.price !== undefined
          ? (typeof rawData.price === 'number' ? rawData.price.toString() : rawData.price)
          : undefined
      };

      const updatedTier = await storage.updateVipTier(tier, data);
      res.json(updatedTier);
    } catch (error: any) {
      console.error("Error updating VIP tier:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: error.message || "Failed to update VIP tier" });
    }
  });


  app.get('/api/categories', async (req, res) => {
    try {
      const { parentId } = req.query;
      const cacheKey = `categories:${parentId || 'all'}`;


      const cached = getCached(cacheKey);
      if (cached) {
        return res.json(cached);
      }


      const parentFilter = parentId === "null" ? null : parentId as string | undefined;
      const categories = await storage.getCategories(parentFilter);


      const popularityCacheKey = 'popularity:category:30';
      let popularity = getCachedPopularity<Array<{ filterId: string; filterValue: string; clickCount: number }>>(popularityCacheKey);

      if (!popularity) {
        popularity = await storage.getFilterPopularity('category', 30);
        setCachePopularity(popularityCacheKey, popularity);
      }


      const popularityMap = new Map<string, number>();
      popularity.forEach(p => {
        if (p.filterId) {
          popularityMap.set(p.filterId, p.clickCount);
        }
      });


      const sortedCategories = categories.sort((a, b) => {
        const aClicks = popularityMap.get(a.id) || 0;
        const bClicks = popularityMap.get(b.id) || 0;


        if (bClicks !== aClicks) {
          return bClicks - aClicks;
        }


        return a.displayOrder - b.displayOrder;
      });

      setCache(cacheKey, sortedCategories);
      res.json(sortedCategories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.get('/api/categories/:id', async (req, res) => {
    try {
      const category = await storage.getCategory(req.params.id);
      if (!category) return res.status(404).json({ message: "Category not found" });
      res.json(category);
    } catch (error) {
      console.error("Error fetching category:", error);
      res.status(500).json({ message: "Failed to fetch category" });
    }
  });

  app.post('/api/admin/categories', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const data = insertCategorySchema.parse(req.body);


      const nameEn = data.nameEn || transliterate(data.name);
      let baseSlug = nameEn.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');


      let slug = baseSlug;
      let counter = 1;
      let allCategories = await storage.getCategories();

      while (allCategories.some(cat => cat.slug === slug)) {
        counter++;
        slug = `${baseSlug}-${counter}`;
      }

      const categoryData = {
        ...data,
        nameEn,
        slug,
        displayOrder: data.order ?? 0,
      };
      const category = await storage.createCategory(categoryData);


      const levels = [
        { name: 'Для новичков', nameEn: 'Beginner', order: 0 },
        { name: 'Для опытных', nameEn: 'Intermediate', order: 1 },
        { name: 'Продвинутый', nameEn: 'Advanced', order: 2 },
      ];

      for (const level of levels) {

        const subcategorySlug = `${slug}-${level.nameEn.toLowerCase().replace(/\s+/g, '-')}`;
        await storage.createSubcategory({
          categoryId: category.id,
          name: level.name,
          nameEn: level.nameEn,
          slug: subcategorySlug,
          displayOrder: level.order,
        });
      }

      res.json(category);
    } catch (error: any) {
      console.error("Error creating category:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  app.put('/api/admin/categories/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const data = insertCategorySchema.partial().parse(req.body);
      const category = await storage.updateCategory(id, data);
      res.json(category);
    } catch (error: any) {
      console.error("Error updating category:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  app.patch('/api/admin/categories/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const data = insertCategorySchema.partial().parse(req.body);
      const category = await storage.updateCategory(id, data);
      res.json(category);
    } catch (error: any) {
      console.error("Error updating category:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  app.get('/api/admin/categories/:id/deletion-info', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const info = await storage.getCategoryDeletionInfo(id);
      res.json(info);
    } catch (error) {
      console.error("Error getting category deletion info:", error);
      res.status(500).json({ message: "Failed to get deletion info" });
    }
  });

  app.delete('/api/admin/categories/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteCategory(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(500).json({ message: "Failed to delete category" });
    }
  });


  app.get('/api/subcategories', async (req, res) => {
    try {
      const { categoryId } = req.query;
      const cacheKey = `subcategories:${categoryId || 'all'}`;


      const cached = getCached(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const subcategories = await storage.getSubcategories(categoryId as string | undefined);
      setCache(cacheKey, subcategories);
      res.json(subcategories);
    } catch (error) {
      console.error("Error fetching subcategories:", error);
      res.status(500).json({ message: "Failed to fetch subcategories" });
    }
  });

  app.get('/api/subcategories/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const subcategory = await storage.getSubcategory(id);
      if (!subcategory) return res.status(404).json({ message: 'Subcategory not found' });
      res.json(subcategory);
    } catch (error) {
      console.error('Error fetching subcategory:', error);
      res.status(500).json({ message: 'Failed to fetch subcategory' });
    }
  });

  app.post('/api/admin/subcategories', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const data = insertSubcategorySchema.parse(req.body);
      const slug = data.nameEn.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const subcategoryData = {
        ...data,
        slug,
        displayOrder: data.order ?? 0,
      };
      const subcategory = await storage.createSubcategory(subcategoryData);
      clearCache();
      res.json(subcategory);
    } catch (error: any) {
      console.error("Error creating subcategory:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to create subcategory" });
    }
  });

  app.put('/api/admin/subcategories/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const data = insertSubcategorySchema.partial().parse(req.body);
      const subcategory = await storage.updateSubcategory(id, data);
      clearCache();
      res.json(subcategory);
    } catch (error: any) {
      console.error("Error updating subcategory:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to update subcategory" });
    }
  });

  app.delete('/api/admin/subcategories/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteSubcategory(id);
      clearCache();
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting subcategory:", error);
      res.status(500).json({ message: "Failed to delete subcategory" });
    }
  });


  app.get('/api/menu-items', async (req, res) => {
    try {
      const cacheKey = 'menu-items';
      const cached = getCached(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const items = await storage.getMenuItems();
      setCache(cacheKey, items);
      res.json(items);
    } catch (error) {
      console.error("Error fetching menu items:", error);
      res.status(500).json({ message: "Failed to fetch menu items" });
    }
  });

  app.post('/api/admin/menu-items', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const data = insertMenuItemSchema.parse(req.body);
      const menuItemData = {
        ...data,
        displayOrder: data.order ?? 0,
      };
      const menuItem = await storage.createMenuItem(menuItemData);
      res.json(menuItem);
    } catch (error: any) {
      console.error("Error creating menu item:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to create menu item" });
    }
  });

  app.put('/api/admin/menu-items/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const data = insertMenuItemSchema.partial().parse(req.body);
      const menuItem = await storage.updateMenuItem(id, data);
      res.json(menuItem);
    } catch (error: any) {
      console.error("Error updating menu item:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to update menu item" });
    }
  });

  app.delete('/api/admin/menu-items/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteMenuItem(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting menu item:", error);
      res.status(500).json({ message: "Failed to delete menu item" });
    }
  });


  app.get('/api/info-banners', async (req, res) => {
    try {
      const cacheKey = 'info-banners';
      const cached = getCached(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const banners = await storage.getInfoBanners();
      setCache(cacheKey, banners);
      res.json(banners);
    } catch (error) {
      console.error("Error fetching info banners:", error);
      res.status(500).json({ message: "Failed to fetch info banners" });
    }
  });

  app.get('/api/admin/info-banners', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const banners = await storage.getAllInfoBanners();
      res.json(banners);
    } catch (error) {
      console.error("Error fetching all info banners:", error);
      res.status(500).json({ message: "Failed to fetch info banners" });
    }
  });

  app.post('/api/admin/info-banners', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const data = insertInfoBannerSchema.parse(req.body);
      const banner = await storage.createInfoBanner(data);
      res.json(banner);
    } catch (error: any) {
      console.error("Error creating info banner:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to create info banner" });
    }
  });

  app.put('/api/admin/info-banners/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const data = insertInfoBannerSchema.partial().parse(req.body);
      const banner = await storage.updateInfoBanner(id, data);
      res.json(banner);
    } catch (error: any) {
      console.error("Error updating info banner:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to update info banner" });
    }
  });

  app.delete('/api/admin/info-banners/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteInfoBanner(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting info banner:", error);
      res.status(500).json({ message: "Failed to delete info banner" });
    }
  });


  app.get('/api/landing-content', async (req, res) => {
    try {
      const content = await storage.getLandingContent();
      if (!content) {
        return res.status(404).json({ message: "Landing content not found" });
      }
      res.json(content);
    } catch (error) {
      console.error("Error fetching landing content:", error);
      res.status(500).json({ message: "Failed to fetch landing content" });
    }
  });

  app.patch('/api/admin/landing-content', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const content = await storage.updateLandingContent(req.body);
      res.json(content);
    } catch (error: any) {
      console.error("Error updating landing content:", error);
      res.status(500).json({ message: "Failed to update landing content" });
    }
  });


  app.get('/api/trade-in-content', async (req, res) => {
    try {
      const content = await storage.getTradeInContent();
      if (!content) {
        return res.status(404).json({ message: "Trade-In content not found" });
      }
      res.json(content);
    } catch (error) {
      console.error("Error fetching trade-in content:", error);
      res.status(500).json({ message: "Failed to fetch trade-in content" });
    }
  });

  app.patch('/api/admin/trade-in-content', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const content = await storage.updateTradeInContent(req.body);
      res.json(content);
    } catch (error: any) {
      console.error("Error updating trade-in content:", error);
      res.status(500).json({ message: "Failed to update trade-in content" });
    }
  });


  app.get('/api/courses/:courseId/files', isAuthenticated, async (req: any, res) => {
    try {
      const { courseId } = req.params;
      const { lessonId } = req.query;


      const purchase = await storage.getPurchase(req.user.claims.sub, courseId);
      if (!purchase) {
        return res.status(403).json({ message: "Purchase required to access course files" });
      }

      const files = await storage.getCourseFiles(courseId, lessonId as string | undefined);
      res.json(files);
    } catch (error) {
      console.error("Error fetching course files:", error);
      res.status(500).json({ message: "Failed to fetch course files" });
    }
  });


  app.get('/api/admin/course-files', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { courseId, lessonId } = req.query;

      if (!courseId) {
        return res.status(400).json({ message: "courseId is required" });
      }

      const files = await storage.getCourseFiles(courseId as string, lessonId as string | undefined);
      res.json(files);
    } catch (error) {
      console.error("Error fetching course files:", error);
      res.status(500).json({ message: "Failed to fetch course files" });
    }
  });

  app.post('/api/admin/course-files', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const schema = z.object({
        courseId: z.string(),
        lessonId: z.string().optional(),
        fileName: z.string(),
        fileUrl: z.string(),
        fileType: z.string(),
        fileSize: z.number().optional(),
        displayOrder: z.number().default(0),
      });
      const fileData = schema.parse(req.body);

      const courseFile = await storage.createCourseFile(fileData);
      res.json(courseFile);
    } catch (error: any) {
      console.error("Error creating course file:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to create course file" });
    }
  });

  app.delete('/api/admin/course-files/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteCourseFile(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting course file:", error);
      res.status(500).json({ message: "Failed to delete course file" });
    }
  });


  app.post('/api/landing/track-visit', async (req, res) => {
    try {
      const metadata = extractVisitorMetadata(req);
      const utmParams = extractUtmParams(req);


      const existingVisit = await storage.getLandingVisit(metadata.fingerprint);
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      if (existingVisit && existingVisit.visitedAt && existingVisit.visitedAt >= oneDayAgo) {

        return res.json({ visitId: existingVisit.id, returning: true });
      }


      const visit = await storage.createLandingVisit({
        fingerprint: metadata.fingerprint,
        sessionId: req.sessionID,
        ip: metadata.ip,
        country: metadata.country,
        city: metadata.city,
        browser: metadata.browser,
        device: metadata.device,
        os: metadata.os,
        userAgent: metadata.userAgent,
        referer: req.headers.referer || null,
        utmSource: utmParams.utmSource,
        utmMedium: utmParams.utmMedium,
        utmCampaign: utmParams.utmCampaign,
        convertedToRegistration: false,
      });

      res.json({ visitId: visit.id, returning: false });
    } catch (error: any) {
      console.error("Error tracking landing visit:", error);
      res.status(500).json({ message: "Failed to track visit" });
    }
  });


  const { registerUser, loginUser, loginOrRegisterWithTelegram, verifyTelegramAuth } = await import('./auth');

  app.post('/api/register', async (req, res) => {
    try {
      const schema = z.object({
        email: z.string().email(),
        password: z.string().min(6),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        referralCode: z.string().optional(),
        landingVisitId: z.string().uuid().optional(),
        telegramCode: z.string().optional(),
      });
      const data = schema.parse(req.body);


      const settings = await storage.getSiteSettings();
      if (settings?.require2FA === 'mandatory' && !data.telegramCode) {
        console.log('[Register] Mandatory 2FA enabled but no Telegram code provided');
        return res.status(400).json({
          message: "Для регистрации необходимо подключить Telegram. Пожалуйста, получите код через бота.",
          require2FA: true
        });
      }


      if (data.telegramCode) {
        const linkingData = verifyLinkingCode(data.telegramCode);
        if (!linkingData) {
          console.log('[Register] Invalid Telegram code provided');
          return res.status(400).json({
            message: "Неверный или истёкший код Telegram. Пожалуйста, получите новый код через бота.",
            require2FA: settings?.require2FA === 'mandatory'
          });
        }


        const existingUser = await storage.getUserByTelegramChatId(linkingData.chatId.toString());
        if (existingUser) {
          console.log(`[Register] Telegram chatId ${linkingData.chatId} already linked to user ${existingUser.id}`);
          return res.status(400).json({
            message: "Этот Telegram аккаунт уже привязан к другому пользователю.",
            require2FA: settings?.require2FA === 'mandatory'
          });
        }
      }


      const metadata = extractVisitorMetadata(req);

      const user = await registerUser({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        referralCodeUsed: data.referralCode,
        landingVisitId: data.landingVisitId,
        registrationIp: metadata.ip || undefined,
        registrationCountry: metadata.country || undefined,
        registrationCity: metadata.city || undefined,
        registrationBrowser: metadata.browser || undefined,
        registrationDevice: metadata.device || undefined,
        registrationOs: metadata.os || undefined,
        registrationUserAgent: metadata.userAgent || undefined,
      });


      if (data.telegramCode) {
        console.log(`[Register] User ${user.id} provided Telegram code - attempting to link`);
        try {
          const linkingData = verifyLinkingCode(data.telegramCode);

          if (linkingData) {

            const existingUser = await storage.getUserByTelegramChatId(linkingData.chatId.toString());

            if (existingUser && existingUser.id !== user.id) {
              console.log(`[Register] Telegram chatId ${linkingData.chatId} already linked to user ${existingUser.id}`);

              linkingData.verified = false;

            } else {

              await storage.updateUserTelegramChatId(
                user.id,
                linkingData.chatId.toString(),
                linkingData.username,
                linkingData.firstName,
                linkingData.lastName || null,
                linkingData.telegramId.toString(),
                null
              );

              console.log(`[Register] Successfully linked Telegram account for user ${user.id}`);

              user.telegramChatId = linkingData.chatId.toString();
              user.telegramUsername = linkingData.username;
              user.telegramFirstName = linkingData.firstName;
              user.telegramLastName = linkingData.lastName || null;
              user.telegramId = linkingData.telegramId.toString();


              try {
                await sendTelegramMessage(
                  linkingData.chatId,
                  `✅ <b>Готово!</b>\n\nТвой Telegram успешно привязан к аккаунту! 🎉\n\n✅ Двухфакторная защита активна\n✅ Уведомления настроены\n\nДобро пожаловать! 🚀`
                );
              } catch (error) {
                console.error('[Register] Failed to send Telegram confirmation message:', error);
              }
            }
          } else {
            console.log(`[Register] Invalid Telegram code provided for user ${user.id}`);
          }
        } catch (error) {
          console.error(`[Register] Error linking Telegram for user ${user.id}:`, error);

        }
      }

      req.login({ claims: { sub: user.id, email: user.email, first_name: user.firstName, last_name: user.lastName } }, (err) => {
        if (err) {
          return res.status(500).json({ message: "Failed to login after registration" });
        }
        res.json({ user, success: true });
      });
    } catch (error: any) {
      console.error("Error registering user:", error);
      res.status(400).json({ message: error.message || "Failed to register" });
    }
  });

  app.post('/api/auth/local', async (req, res) => {
    try {
      const schema = z.object({
        email: z.string().email(),
        password: z.string().min(1),
      });
      const { email, password } = schema.parse(req.body);

      const user = await loginUser(email, password);


      const settings = await storage.getSiteSettings();


      if (user.telegramChatId) {
        console.log(`[Auth] User ${user.id} has Telegram linked - sending 2FA code`);


        const { sessionId, code } = create2FASession(user.email!, parseInt(user.telegramChatId));


        const success = await sendTelegramMessage(
          user.telegramChatId,
          `🔐 <b>Код подтверждения для входа:</b>\n\n<code>${code}</code>\n\nПожалуйста, укажите этот код для авторизации на сайте.\nКод действителен 5 минут.`
        );

        if (!success) {
          console.error(`[Auth] Failed to send 2FA code to user ${user.id}`);
          return res.status(500).json({ message: "Не удалось отправить код подтверждения" });
        }

        console.log(`[Auth] 2FA code sent to user ${user.id}`);


        return res.json({
          requiresTwoFactor: true,
          sessionId,
          email: user.email
        });
      }


      req.login({ claims: { sub: user.id, email: user.email, first_name: user.firstName, last_name: user.lastName } }, (err) => {
        if (err) {
          return res.status(500).json({ message: "Failed to login" });
        }
        res.json({ user, success: true });
      });
    } catch (error: any) {
      console.error("Error logging in:", error);
      res.status(401).json({ message: "Invalid email or password" });
    }
  });

  app.post('/api/auth/telegram', async (req, res) => {
    try {
      const schema = z.object({
        id: z.string(),
        first_name: z.string(),
        last_name: z.string().optional(),
        username: z.string().optional(),
        photo_url: z.string().optional(),
        hash: z.string(),
        referralCode: z.string().optional(),
        landingVisitId: z.string().uuid().optional(),
      });
      const telegramData = schema.parse(req.body);

      const settings = await storage.getSiteSettings();
      const botToken = settings?.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN;

      if (!botToken) {
        return res.status(500).json({ message: "Telegram bot token not configured" });
      }

      const isValid = verifyTelegramAuth(telegramData, botToken);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid Telegram authentication" });
      }


      const metadata = extractVisitorMetadata(req);

      const user = await loginOrRegisterWithTelegram({
        id: telegramData.id,
        first_name: telegramData.first_name,
        last_name: telegramData.last_name,
        username: telegramData.username,
        photo_url: telegramData.photo_url,
      }, telegramData.referralCode, {
        landingVisitId: telegramData.landingVisitId,
        registrationIp: metadata.ip || undefined,
        registrationCountry: metadata.country || undefined,
        registrationCity: metadata.city || undefined,
        registrationBrowser: metadata.browser || undefined,
        registrationDevice: metadata.device || undefined,
        registrationOs: metadata.os || undefined,
        registrationUserAgent: metadata.userAgent || undefined,
      });

      req.login({ claims: { sub: user.id, email: user.email, first_name: user.firstName, last_name: user.lastName } }, (err) => {
        if (err) {
          return res.status(500).json({ message: "Failed to login" });
        }
        res.json({ user, success: true });
      });
    } catch (error: any) {
      console.error("Error with Telegram auth:", error);
      res.status(401).json({ message: error.message || "Telegram authentication failed" });
    }
  });

  app.post('/api/auth/telegram-2fa', async (req, res) => {
    try {
      const schema = z.object({
        sessionToken: z.string(),
      });
      const { sessionToken } = schema.parse(req.body);


      const tokenData = telegram2faTokens.get(sessionToken);
      if (!tokenData || tokenData.expiresAt < new Date()) {
        console.log(`[Telegram 2FA] Invalid or expired session token`);
        return res.status(401).json({ message: "Invalid or expired session token" });
      }


      telegram2faTokens.delete(sessionToken);

      const user = await storage.getUser(tokenData.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      console.log(`[Telegram 2FA] Successful login for user ${user.id}`);

      req.login({ claims: { sub: user.id, email: user.email, first_name: user.firstName, last_name: user.lastName } }, (err) => {
        if (err) {
          console.error("Error logging in with Telegram 2FA:", err);
          return res.status(500).json({ message: "Failed to login" });
        }

        console.log(`[Telegram 2FA] User ${user.id} logged in successfully`);
        res.json({ user, success: true });
      });
    } catch (error: any) {
      console.error("Error with Telegram 2FA login:", error);
      res.status(400).json({ message: error.message || "Failed to login" });
    }
  });

  app.post('/api/auth/request-password-reset', async (req, res) => {
    try {
      const schema = z.object({
        email: z.string().email(),
      });
      const { email } = schema.parse(req.body);
      const normalizedEmail = email.toLowerCase().trim();


      const user = await storage.getUserByEmail(normalizedEmail);
      if (!user) {
        console.log(`[Password Reset] User not found for email: ${email}`);
        return res.status(404).json({ message: "Пользователь с таким email не найден" });
      }


      if (!user.telegramChatId) {
        console.log(`[Password Reset] User ${user.id} has no Telegram linked`);
        return res.status(400).json({ message: "К вашему аккаунту не привязан Telegram. Пожалуйста, привяжите Telegram в профиле" });
      }


      const { createPasswordResetSession } = await import('./telegram-bot');
      const { sessionId, code } = createPasswordResetSession(user.id, user.email!, parseInt(user.telegramChatId));


      const { sendTelegramPhoto } = await import('./telegram');
      const appBaseUrl = (process.env.APP_BASE_URL || 'http://localhost:5000').replace(/\/$/, '');
      const resetLink = `${appBaseUrl}/reset-password?session=${sessionId}`;

      await sendTelegramPhoto(
        parseInt(user.telegramChatId),
        'attached_assets/bot_welcome_logo.png',
        `🔐 <b>Сброс пароля</b>\n\nВы запросили сброс пароля для аккаунта:\n\n📧 <code>${user.email}</code>\n\n<b>Код подтверждения:</b>\n\n🔐 <code>${code}</code>\n\n⏱️ Код действителен 10 минут.\n\n⚠️ Если вы не запрашивали сброс пароля, проигнорируйте это сообщение.`
      );

      console.log(`[Password Reset] Sent reset code to user ${user.id}`);
      res.json({ success: true, sessionId, message: "Код отправлен в Telegram" });
    } catch (error: any) {
      console.error("Error requesting password reset:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Неверный формат email" });
      }
      res.status(500).json({ message: "Ошибка при запросе сброса пароля" });
    }
  });

  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const schema = z.object({
        sessionId: z.string(),
        code: z.string().length(6),
        newPassword: z.string().min(6),
      });
      const { sessionId, code, newPassword } = schema.parse(req.body);


      const { verifyPasswordResetCode } = await import('./telegram-bot');
      const result = verifyPasswordResetCode(sessionId, code);

      if (!result.valid || !result.userId) {
        console.log(`[Password Reset] Invalid or expired code for session ${sessionId}`);
        return res.status(401).json({ message: "Неверный или истекший код подтверждения" });
      }


      const { hashPassword } = await import('./auth');
      const passwordHash = await hashPassword(newPassword);


      const user = await storage.updateUserPassword(result.userId, passwordHash);

      console.log(`[Password Reset] Successfully reset password for user ${user.id}`);
      res.json({ success: true, message: "Пароль успешно изменён" });
    } catch (error: any) {
      console.error("Error resetting password:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Неверные данные запроса" });
      }
      res.status(500).json({ message: "Ошибка при сбросе пароля" });
    }
  });


  app.get('/api/admin/users', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { search } = req.query;
      let users = await storage.getAllUsers();

      if (search && typeof search === 'string') {
        const searchLower = search.toLowerCase();
        users = users.filter(user =>
          (user.email || '').toLowerCase().includes(searchLower) ||
          (user.firstName || '').toLowerCase().includes(searchLower) ||
          (user.lastName || '').toLowerCase().includes(searchLower) ||
          (user.telegramUsername || '').toLowerCase().includes(searchLower)
        );
      }

      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.put('/api/admin/users/:userId/admin', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const schema = z.object({
        isAdmin: z.boolean(),
      });
      const { isAdmin: makeAdmin } = schema.parse(req.body);

      const user = await storage.updateUserAdmin(userId, makeAdmin);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(user);
    } catch (error: any) {
      console.error("Error updating user admin status:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data" });
      }
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.put('/api/admin/users/:userId/blocked', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const schema = z.object({
        isBlocked: z.boolean(),
      });
      const { isBlocked } = schema.parse(req.body);

      const user = await storage.updateUserBlocked(userId, isBlocked);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(user);
    } catch (error: any) {
      console.error("Error updating user blocked status:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data" });
      }
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.post('/api/admin/users/:userId/balance', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const schema = z.object({
        amount: z.number().refine(val => val !== 0, { message: "Amount cannot be zero" }),
      });
      const { amount } = schema.parse(req.body);

      const user = await storage.addUserBalance(userId, amount);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }


      await storage.addBalanceTransaction({
        userId,
        amount: amount.toString(),
        type: amount > 0 ? "topup" : "withdrawal",
        description: amount > 0 ? "Пополнение баланса администратором" : "Списание баланса администратором",
      });


      if (amount > 0) {
        const activeReferral = await storage.getReferralForUser(userId);

        if (activeReferral) {

          const referrer = await storage.getUser(activeReferral.referrerId);
          const settings = await storage.getSiteSettings();


          const bonusPercent = referrer?.referralBonusPercent ?? settings?.referralBonusPercent ?? 30;
          const referralBonus = (amount * bonusPercent) / 100;

          await storage.updateUserReferralBalance(activeReferral.referrerId, referralBonus);
          await storage.updateReferralEarnings(activeReferral.id, referralBonus);
          await storage.addBalanceTransaction({
            userId: activeReferral.referrerId,
            amount: referralBonus.toString(),
            type: "referral",
            description: `Реферальный бонус от пополнения баланса: ${amount.toFixed(2)} ₽`,
          });
        }
      }

      const updatedUser = await storage.getUser(userId);
      res.json(updatedUser);
    } catch (error: any) {
      console.error("Error adding balance:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid amount" });
      }
      res.status(500).json({ message: "Failed to add balance" });
    }
  });

  app.post('/api/admin/users/balance/all', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const schema = z.object({
        amount: z.number().refine(val => val !== 0, { message: "Amount cannot be zero" }),
      });
      const { amount } = schema.parse(req.body);


      const allUsers = await storage.getAllUsers();


      for (const user of allUsers) {

        await storage.addUserBalance(user.id, amount);


        await storage.addBalanceTransaction({
          userId: user.id,
          amount: amount.toString(),
          type: amount > 0 ? "topup" : "withdrawal",
          description: amount > 0 ? "Массовое пополнение баланса администратором" : "Массовое списание баланса администратором",
        });


        if (amount > 0) {
          const activeReferral = await storage.getReferralForUser(user.id);

          if (activeReferral) {

            const referrer = await storage.getUser(activeReferral.referrerId);
            const settings = await storage.getSiteSettings();


            const bonusPercent = referrer?.referralBonusPercent ?? settings?.referralBonusPercent ?? 30;
            const referralBonus = (amount * bonusPercent) / 100;

            await storage.updateUserReferralBalance(activeReferral.referrerId, referralBonus);
            await storage.updateReferralEarnings(activeReferral.id, referralBonus);
            await storage.addBalanceTransaction({
              userId: activeReferral.referrerId,
              amount: referralBonus.toString(),
              type: "referral",
              description: `Реферальный бонус от пополнения баланса: ${amount.toFixed(2)} ₽`,
            });
          }
        }
      }

      res.json({ updatedCount: allUsers.length, amount });
    } catch (error: any) {
      console.error("Error adding balance to all users:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid amount" });
      }
      res.status(500).json({ message: "Failed to add balance" });
    }
  });

  app.post('/api/admin/users/:userId/withdraw-referral', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const schema = z.object({
        amount: z.number().positive("Amount must be positive"),
      });
      const { amount } = schema.parse(req.body);

      const result = await storage.withdrawReferralBalance(userId, amount);
      res.json(result);
    } catch (error: any) {
      console.error("Error withdrawing referral balance:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid amount" });
      }
      res.status(500).json({ message: "Failed to withdraw referral balance" });
    }
  });

  app.put('/api/admin/users/:userId/referral-percent', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const schema = z.object({
        referralBonusPercent: z.number().int().min(0).max(100).nullable(),
      });
      const { referralBonusPercent } = schema.parse(req.body);

      const user = await storage.updateUserReferralPercent(userId, referralBonusPercent);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(user);
    } catch (error: any) {
      console.error("Error updating user referral percent:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid percentage" });
      }
      res.status(500).json({ message: "Failed to update referral percent" });
    }
  });


  app.get('/api/admin/users/:userId/purchases', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { userId } = req.params;

      const userPurchases = await db
        .select()
        .from(purchases)
        .where(eq(purchases.userId, userId))
        .orderBy(sql`${purchases.purchaseDate} DESC`);

      const purchasesWithCourses = await Promise.all(
        userPurchases.map(async (purchase) => {
          const course = await storage.getCourse(purchase.courseId);

          const purchasePrice = parseFloat(purchase.price || "0");
          const price = purchasePrice > 0 ? purchase.price : (course?.price || "0");
          return {
            ...purchase,
            price,
            course,
          };
        })
      );

      res.json(purchasesWithCourses);
    } catch (error) {
      console.error("Error fetching user purchases:", error);
      res.status(500).json({ message: "Failed to fetch user purchases" });
    }
  });


  app.get('/api/admin/users/:userId/vip-packages', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { userId } = req.params;

      const packages = await db
        .select({
          id: vipPackages.id,
          userId: vipPackages.userId,
          tier: vipPackages.tier,
          purchaseDate: vipPackages.purchaseDate,
          isActivated: vipPackages.isActivated,
          currentYearSelected: vipPackages.currentYearSelected,
          previousYearsSelected: vipPackages.previousYearsSelected,
          price: vipTiers.price,
        })
        .from(vipPackages)
        .leftJoin(vipTiers, eq(vipPackages.tier, vipTiers.tier))
        .where(eq(vipPackages.userId, userId))
        .orderBy(sql`${vipPackages.purchaseDate} DESC`);

      res.json(packages);
    } catch (error) {
      console.error("Error fetching user VIP packages:", error);
      res.status(500).json({ message: "Failed to fetch user VIP packages" });
    }
  });


  app.post('/api/admin/users/:userId/purchases/grant', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const schema = z.object({
        courseId: z.string(),
      });
      const { courseId } = schema.parse(req.body);


      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }


      const course = await storage.getCourse(courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }


      const [existingPurchase] = await db
        .select()
        .from(purchases)
        .where(and(
          eq(purchases.userId, userId),
          eq(purchases.courseId, courseId)
        ));

      if (existingPurchase) {
        return res.status(400).json({ message: "User already has this course" });
      }


      const [newPurchase] = await db
        .insert(purchases)
        .values({
          userId,
          courseId,
          price: course.price || "0",
          paidFromBalance: "0",
          paidFromReferralBalance: "0",
          purchaseDate: new Date(),
        })
        .returning();

      res.json({
        message: "Course granted successfully",
        purchase: newPurchase
      });
    } catch (error: any) {
      console.error("Error granting course:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data" });
      }
      res.status(500).json({ message: "Failed to grant course" });
    }
  });


  app.delete('/api/admin/users/:userId/purchases/:purchaseId', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { userId, purchaseId } = req.params;

      const [purchase] = await db
        .select()
        .from(purchases)
        .where(and(
          eq(purchases.id, purchaseId),
          eq(purchases.userId, userId)
        ));

      if (!purchase) {
        return res.status(404).json({ message: "Purchase not found" });
      }

      let refundAmount = parseFloat(purchase.price);
      let fromBalance = parseFloat(purchase.paidFromBalance || "0");
      let fromReferralBalance = parseFloat(purchase.paidFromReferralBalance || "0");


      if (fromBalance === 0 && fromReferralBalance === 0) {

        const searchPattern = `%ID покупки: ${purchaseId}%`;
        const purchaseTransactions = await db
          .select()
          .from(balanceTransactions)
          .where(and(
            eq(balanceTransactions.userId, userId),
            eq(balanceTransactions.type, 'purchase'),
            sql`${balanceTransactions.description} LIKE ${searchPattern}`
          ));


        for (const tx of purchaseTransactions) {
          const amount = Math.abs(parseFloat(tx.amount));
          if (tx.description.includes('реферального баланса')) {
            fromReferralBalance += amount;
          } else {
            fromBalance += amount;
          }
        }


        if (fromBalance === 0 && fromReferralBalance === 0 && refundAmount === 0) {
          const [course] = await db
            .select()
            .from(courses)
            .where(eq(courses.id, purchase.courseId));

          refundAmount = course ? parseFloat(course.price || '0') : 0;
          fromBalance = refundAmount;
        }

        refundAmount = fromBalance + fromReferralBalance;
      }

      await db.transaction(async (tx) => {
        await tx
          .delete(purchases)
          .where(eq(purchases.id, purchaseId));


        if (fromBalance > 0) {
          await tx
            .update(users)
            .set({
              balance: sql`${users.balance} + ${fromBalance}`,
            })
            .where(eq(users.id, userId));

          await tx.insert(balanceTransactions).values({
            userId,
            amount: fromBalance.toString(),
            type: "refund",
            description: `Возврат средств за курс на основной баланс (ID покупки: ${purchaseId})`,
          });
        }

        if (fromReferralBalance > 0) {
          await tx
            .update(users)
            .set({
              referralBalance: sql`${users.referralBalance} + ${fromReferralBalance}`,
            })
            .where(eq(users.id, userId));

          await tx.insert(balanceTransactions).values({
            userId,
            amount: fromReferralBalance.toString(),
            type: "refund",
            description: `Возврат средств за курс на реферальный баланс (ID покупки: ${purchaseId})`,
          });
        }
      });

      res.json({ success: true, refundAmount, fromBalance, fromReferralBalance });
    } catch (error) {
      console.error("Error refunding purchase:", error);
      res.status(500).json({ message: "Failed to refund purchase" });
    }
  });


  app.delete('/api/admin/users/:userId/vip-packages/:packageId', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { userId, packageId } = req.params;

      const [vipPackage] = await db
        .select()
        .from(vipPackages)
        .where(and(
          eq(vipPackages.id, packageId),
          eq(vipPackages.userId, userId)
        ));

      if (!vipPackage) {
        return res.status(404).json({ message: "VIP package not found" });
      }


      const [tierInfo] = await db
        .select()
        .from(vipTiers)
        .where(eq(vipTiers.tier, vipPackage.tier));

      const refundAmount = tierInfo && tierInfo.price ? parseFloat(tierInfo.price) : 0;

      await db.transaction(async (tx) => {
        if (vipPackage.isActivated) {
          const associatedPurchases = await tx
            .select()
            .from(purchases)
            .where(and(
              eq(purchases.userId, userId),
              eq(purchases.price, "0")
            ))
            .limit(vipPackage.currentYearSelected + vipPackage.previousYearsSelected);

          if (associatedPurchases.length > 0) {
            await tx
              .delete(purchases)
              .where(inArray(purchases.id, associatedPurchases.map(p => p.id)));
          }
        }

        await tx
          .delete(vipPackages)
          .where(eq(vipPackages.id, packageId));

        await tx
          .update(users)
          .set({
            balance: sql`${users.balance} + ${refundAmount}`,
          })
          .where(eq(users.id, userId));

        await tx.insert(balanceTransactions).values({
          userId,
          amount: refundAmount.toString(),
          type: "refund",
          description: `Возврат средств за VIP-пакет ${vipPackage.tier} (ID: ${packageId})`,
        });
      });

      res.json({ success: true, refundAmount });
    } catch (error) {
      console.error("Error refunding VIP package:", error);
      res.status(500).json({ message: "Failed to refund VIP package" });
    }
  });




  app.get('/api/packages', async (req, res) => {
    try {
      const categoryId = req.query.categoryId as string | undefined;
      const packages = await storage.getCoursePackages(categoryId);
      res.json(packages);
    } catch (error) {
      console.error("Error fetching course packages:", error);
      res.status(500).json({ message: "Failed to fetch course packages" });
    }
  });


  app.get('/api/packages/:id', async (req: any, res) => {
    try {
      const { id } = req.params;
      const pkg = await storage.getCoursePackage(id);

      if (!pkg) {
        return res.status(404).json({ message: "Package not found" });
      }


      let purchasedCourseIds: string[] = [];
      if (req.user?.claims?.sub) {
        const userId = req.user.claims.sub;
        const purchases = await storage.getPurchases(userId);
        const courseIds = pkg.courses.map(c => c.id);
        purchasedCourseIds = purchases
          .filter((p: { courseId: string }) => courseIds.includes(p.courseId))
          .map((p: { courseId: string }) => p.courseId);
      }

      res.json({
        ...pkg,
        purchasedCourseIds,
      });
    } catch (error) {
      console.error("Error fetching course package:", error);
      res.status(500).json({ message: "Failed to fetch course package" });
    }
  });


  app.get('/api/admin/packages', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const packages = await storage.getAllCoursePackages();
      res.json(packages);
    } catch (error) {
      console.error("Error fetching all course packages:", error);
      res.status(500).json({ message: "Failed to fetch course packages" });
    }
  });


  app.get('/api/admin/packages/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const pkg = await storage.getCoursePackage(id);

      if (!pkg) {
        return res.status(404).json({ message: "Package not found" });
      }

      res.json(pkg);
    } catch (error) {
      console.error("Error fetching course package:", error);
      res.status(500).json({ message: "Failed to fetch course package" });
    }
  });


  app.post('/api/admin/packages', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const schema = z.object({
        name: z.string().min(1, "Name is required"),
        description: z.string().optional(),
        thumbnailUrl: z.string().optional(),
        discount: z.number().int().min(0).max(100).default(0),
        categoryIds: z.array(z.string()).nullable().optional(),
        displayOrder: z.number().int().default(0),
        isActive: z.boolean().default(true),
      });

      const data = schema.parse(req.body);
      const pkg = await storage.createCoursePackage(data);

      res.json(pkg);
    } catch (error: any) {
      console.error("Error creating course package:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid package data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create course package" });
    }
  });


  app.put('/api/admin/packages/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const schema = z.object({
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        thumbnailUrl: z.string().nullable().optional(),
        discount: z.number().int().min(0).max(100).optional(),
        categoryIds: z.array(z.string()).nullable().optional(),
        displayOrder: z.number().int().optional(),
        isActive: z.boolean().optional(),
      });

      const data = schema.parse(req.body);
      const pkg = await storage.updateCoursePackage(id, data);

      res.json(pkg);
    } catch (error: any) {
      console.error("Error updating course package:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid package data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update course package" });
    }
  });


  app.delete('/api/admin/packages/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteCoursePackage(id);

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting course package:", error);
      res.status(500).json({ message: "Failed to delete course package" });
    }
  });


  app.post('/api/admin/packages/:id/courses', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`[PACKAGE] POST /api/admin/packages/${id}/courses - Body:`, req.body);

      const schema = z.object({
        courseId: z.string(),
        displayOrder: z.number().int().optional(),
      });

      const { courseId, displayOrder } = schema.parse(req.body);
      console.log(`[PACKAGE] Adding course ${courseId} to package ${id} with displayOrder ${displayOrder}`);

      const packageCourse = await storage.addCourseToPackage(id, courseId, displayOrder);
      console.log(`[PACKAGE] Successfully added course to package:`, packageCourse);

      res.json(packageCourse);
    } catch (error: any) {
      console.error("[PACKAGE] Error adding course to package:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to add course to package" });
    }
  });


  app.delete('/api/admin/packages/:id/courses/:courseId', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id, courseId } = req.params;
      await storage.removeCourseFromPackage(id, courseId);

      res.json({ success: true });
    } catch (error) {
      console.error("Error removing course from package:", error);
      res.status(500).json({ message: "Failed to remove course from package" });
    }
  });


  app.patch('/api/admin/packages/:id/courses/:courseId', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id, courseId } = req.params;
      console.log(`[PACKAGE] PATCH /api/admin/packages/${id}/courses/${courseId} - Body:`, req.body);

      const schema = z.object({
        displayOrder: z.number().int(),
      });

      const { displayOrder } = schema.parse(req.body);
      console.log(`[PACKAGE] Updating displayOrder to ${displayOrder} for course ${courseId} in package ${id}`);

      await storage.updateCourseOrderInPackage(id, courseId, displayOrder);
      console.log(`[PACKAGE] Successfully updated course displayOrder`);

      res.json({ success: true });
    } catch (error: any) {
      console.error("[PACKAGE] Error updating course in package:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid display order" });
      }
      res.status(500).json({ message: "Failed to update course" });
    }
  });


  app.post('/api/packages/:packageId/purchase', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { packageId } = req.params;
      const { useFantiks } = req.body;

      console.log(`[PACKAGE] Purchase attempt - User: ${userId}, Package: ${packageId}, useFantiks: ${useFantiks}`);


      const allPackageCourses = await storage.getPackageCourses(packageId);
      if (!allPackageCourses || allPackageCourses.length === 0) {
        return res.status(400).json({ message: "Package has no courses" });
      }

      console.log(`[PACKAGE] Package has ${allPackageCourses.length} courses:`, allPackageCourses.map((c: any) => c.id));
      console.log(`[PACKAGE] Course details:`, allPackageCourses.map((c: any) => ({ id: c.id, title: c.title, price: c.price })));


      const pkg = await storage.getCoursePackage(packageId);
      if (!pkg) {
        return res.status(404).json({ message: "Package not found" });
      }


      const userPurchases = await storage.getPurchases(userId);
      console.log(`[PACKAGE] User has ${userPurchases.length} purchases:`, userPurchases.map((p: any) => p.courseId));

      const purchasedCourseIds = new Set(userPurchases.map((p: any) => p.courseId));


      const unpurchasedCourses = allPackageCourses.filter((course: any) =>
        !purchasedCourseIds.has(course.id)
      );

      console.log(`[PACKAGE] Unpurchased courses: ${unpurchasedCourses.length}/${allPackageCourses.length}`);
      console.log(`[PACKAGE] Unpurchased course IDs:`, unpurchasedCourses.map((c: any) => c.id));

      if (unpurchasedCourses.length === 0) {
        return res.status(400).json({ message: "У вас уже есть все курсы из этой подборки" });
      }


      const totalOriginalPrice = allPackageCourses.reduce((sum, course) => {
        return sum + parseFloat(course.price || '0');
      }, 0);

      console.log(`[PACKAGE] Total original price (ALL courses): ${totalOriginalPrice}`);


      const discountPercent = pkg.discount || 0;
      const packageDiscount = totalOriginalPrice * (discountPercent / 100);
      const priceAfterPackageDiscount = totalOriginalPrice - packageDiscount;

      console.log(`[PACKAGE] Package discount (${discountPercent}%): ${packageDiscount}`);
      console.log(`[PACKAGE] Price after package discount: ${priceAfterPackageDiscount}`);


      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const balance = parseFloat(user.balance || '0');
      const fantiks = parseInt(String(user.fantiks || 0));


      let fantiksDiscount = 0;
      if (useFantiks && fantiks > 0) {
        const maxDiscount = priceAfterPackageDiscount * 0.2;
        fantiksDiscount = Math.min(fantiks, maxDiscount);
      }

      console.log(`[PACKAGE] Fantiks discount: ${fantiksDiscount}`);

      const finalPrice = Math.max(0, priceAfterPackageDiscount - fantiksDiscount);

      console.log(`[PACKAGE] Final price: ${finalPrice}`);

      if (balance < finalPrice) {
        return res.status(400).json({ message: "Insufficient balance" });
      }


      const result = await db.transaction(async (tx) => {

        if (fantiksDiscount > 0) {
          await tx
            .update(users)
            .set({
              fantiks: sql`${users.fantiks} - ${fantiksDiscount}`,
              updatedAt: new Date(),
            })
            .where(sql`${users.id} = ${userId}`);


          await tx.insert(balanceTransactions).values({
            userId,
            amount: (-fantiksDiscount).toString(),
            type: 'fantiks',
            description: `Скидка фантиками на подборку: ${pkg.name}`,
          });
        }


        if (finalPrice > 0) {
          const balanceResult = await tx
            .update(users)
            .set({
              balance: sql`${users.balance} - ${finalPrice}`,
              updatedAt: new Date()
            })
            .where(and(
              sql`${users.id} = ${userId}`,
              sql`${users.balance} >= ${finalPrice}`
            ))
            .returning();

          if (balanceResult.length === 0) {
            throw new Error("Insufficient balance");
          }


          const purchaseDescription = fantiksDiscount > 0
            ? `Покупка подборки: ${pkg.name} (со скидкой ${fantiksDiscount} фантиков)`
            : `Покупка подборки: ${pkg.name}`;

          await tx.insert(balanceTransactions).values({
            userId,
            amount: (-finalPrice).toString(),
            type: "purchase",
            description: purchaseDescription,
          });
        }


        for (const course of unpurchasedCourses) {
          if (!course) continue;


          let courseFinalPrice = 0;
          if (totalOriginalPrice > 0 && finalPrice > 0) {

            const courseOriginalPrice = parseFloat(course.price || '0');
            const coursePriceShare = courseOriginalPrice / totalOriginalPrice;
            courseFinalPrice = finalPrice * coursePriceShare;
          }


          console.log(`[PACKAGE] Creating purchase for course ${course.id} (${course.title}) - original: ${course.price}, final: ${courseFinalPrice.toFixed(2)}`);


          await tx.insert(purchases).values({
            userId,
            courseId: course.id,
            price: courseFinalPrice.toFixed(2),
          });


          await tx
            .delete(favorites)
            .where(and(
              eq(favorites.userId, userId),
              eq(favorites.courseId, course.id)
            ));
        }

        return { success: true };
      });


      try {
        await storage.createNotification({
          userId,
          type: 'purchase_package',
          title: '📦 Подборка куплена!',
          message: `Вы успешно приобрели подборку "${pkg.name}" (${unpurchasedCourses.length} курсов). Все курсы добавлены в вашу библиотеку!`,
          isRead: false,
          relatedId: packageId,
          relatedType: 'package',
        });
      } catch (notificationError) {
        console.error("[PACKAGE] Failed to create notification:", notificationError);

      }

      console.log(`[PACKAGE] Purchase successful for user ${userId}`);
      res.json(result);
    } catch (error: any) {
      console.error("[PACKAGE] Error purchasing package:", error);
      res.status(500).json({ message: error.message || "Failed to purchase package" });
    }
  });




  app.get('/api/course-requests', async (req: any, res) => {
    try {
      let isAdmin = false;


      if (req.user?.claims?.sub) {
        const user = await storage.getUser(req.user.claims.sub);
        isAdmin = user?.isAdmin || false;
      }


      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;


      if (limit < 1 || limit > 50) {
        return res.status(400).json({ message: "Invalid limit: must be between 1 and 50" });
      }
      if (offset < 0) {
        return res.status(400).json({ message: "Invalid offset: must be non-negative" });
      }

      const requests = await storage.getCourseRequests(isAdmin, limit, offset);
      res.json(requests);
    } catch (error: any) {
      console.error("[COURSE REQUESTS] Error getting requests:", error);
      res.status(500).json({ message: "Failed to get course requests" });
    }
  });


  app.get('/api/course-requests/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const request = await storage.getCourseRequest(id);

      if (!request) {
        return res.status(404).json({ message: "Course request not found" });
      }

      res.json(request);
    } catch (error: any) {
      console.error("[COURSE REQUESTS] Error getting request:", error);
      res.status(500).json({ message: "Failed to get course request" });
    }
  });


  app.post('/api/course-requests', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { title, description } = req.body;


      const rateLimit = await storage.checkUserRequestRateLimit(userId);
      if (!rateLimit.allowed) {
        return res.status(429).json({
          message: `Вы можете создать только 2 запроса в течение 30 минут. Попробуйте снова через ${rateLimit.timeUntilReset} минут.`,
          timeUntilReset: rateLimit.timeUntilReset,
          currentCount: rateLimit.count
        });
      }


      if (!title || !description) {
        return res.status(400).json({ message: "Title and description are required" });
      }

      if (title.length < 3 || title.length > 200) {
        return res.status(400).json({ message: "Title must be between 3 and 200 characters" });
      }

      if (description.length < 10 || description.length > 2000) {
        return res.status(400).json({ message: "Description must be between 10 and 2000 characters" });
      }

      const request = await storage.createCourseRequest({
        userId,
        title,
        description,
      });

      res.status(201).json(request);
    } catch (error: any) {
      console.error("[COURSE REQUESTS] Error creating request:", error);
      res.status(500).json({ message: "Failed to create course request" });
    }
  });


  app.delete('/api/course-requests/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;

      const request = await storage.getCourseRequest(id);

      if (!request) {
        return res.status(404).json({ message: "Course request not found" });
      }


      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }


      if (request.userId !== userId && !user.isAdmin) {
        return res.status(403).json({ message: "You can only delete your own requests" });
      }

      await storage.deleteCourseRequest(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("[COURSE REQUESTS] Error deleting request:", error);
      res.status(500).json({ message: "Failed to delete course request" });
    }
  });


  app.post('/api/course-requests/:id/vote', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      const { vote } = req.body;


      if (vote !== 1 && vote !== -1) {
        return res.status(400).json({ message: "Vote must be 1 (upvote) or -1 (downvote)" });
      }


      const request = await storage.getCourseRequest(id);
      if (!request) {
        return res.status(404).json({ message: "Course request not found" });
      }

      const voteResult = await storage.voteForCourseRequest(id, userId, vote);
      res.json(voteResult);
    } catch (error: any) {
      console.error("[COURSE REQUESTS] Error voting:", error);
      res.status(500).json({ message: "Failed to vote for course request" });
    }
  });


  app.get('/api/course-requests/:id/my-vote', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;

      const vote = await storage.getUserVoteForRequest(id, userId);
      res.json(vote || null);
    } catch (error: any) {
      console.error("[COURSE REQUESTS] Error getting user vote:", error);
      res.status(500).json({ message: "Failed to get user vote" });
    }
  });


  app.get('/api/admin/course-requests/pending', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;


      const user = await storage.getUser(userId);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Only admins can access pending course requests" });
      }

      const pendingRequests = await storage.getPendingCourseRequests();
      res.json(pendingRequests);
    } catch (error: any) {
      console.error("[COURSE REQUESTS] Error getting pending requests:", error);
      res.status(500).json({ message: "Failed to get pending course requests" });
    }
  });


  app.post('/api/course-requests/:id/moderate', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      const { approve } = req.body;


      const user = await storage.getUser(userId);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Only admins can moderate course requests" });
      }


      if (typeof approve !== 'boolean') {
        return res.status(400).json({ message: "approve must be a boolean" });
      }


      const request = await storage.getCourseRequest(id);
      if (!request) {
        return res.status(404).json({ message: "Course request not found" });
      }

      const moderated = await storage.moderateCourseRequest(id, userId, approve);


      if (approve && request.userId) {
        try {
          await storage.createNotification({
            userId: request.userId,
            type: 'sniper_approved',
            title: '✅ Ваш запрос одобрен!',
            message: `Ваш запрос на курс "${request.title}" был одобрен модератором. Теперь другие пользователи могут голосовать за него!`,
            isRead: false,
            relatedId: id,
            relatedType: 'course_request',
          });
        } catch (notificationError) {
          console.error("[COURSE REQUESTS] Failed to create notification:", notificationError);

        }
      }

      res.json(moderated);
    } catch (error: any) {
      console.error("[COURSE REQUESTS] Error moderating request:", error);
      res.status(500).json({ message: "Failed to moderate course request" });
    }
  });


  app.patch('/api/course-requests/:id/comment', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      const { adminComment } = req.body;


      const user = await storage.getUser(userId);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Only admins can update course request comments" });
      }


      const request = await storage.getCourseRequest(id);
      if (!request) {
        return res.status(404).json({ message: "Course request not found" });
      }

      const updated = await storage.updateCourseRequestComment(id, adminComment || null);
      res.json(updated);
    } catch (error: any) {
      console.error("[COURSE REQUESTS] Error updating comment:", error);
      res.status(500).json({ message: "Failed to update course request comment" });
    }
  });




  app.get('/api/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;

      const notifications = await storage.getUserNotifications(userId, limit, offset);
      res.json(notifications);
    } catch (error: any) {
      console.error("[NOTIFICATIONS] Error getting notifications:", error);
      res.status(500).json({ message: "Failed to get notifications" });
    }
  });


  app.get('/api/notifications/unread-count', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      const count = await storage.getUnreadNotificationsCount(userId);
      res.json({ count });
    } catch (error: any) {
      console.error("[NOTIFICATIONS] Error getting unread count:", error);
      res.status(500).json({ message: "Failed to get unread count" });
    }
  });


  app.patch('/api/notifications/:id/read', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;

      await storage.markNotificationAsRead(id, userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("[NOTIFICATIONS] Error marking as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });


  app.post('/api/notifications/mark-all-read', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      await storage.markAllNotificationsAsRead(userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("[NOTIFICATIONS] Error marking all as read:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });


  app.delete('/api/notifications/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;

      await storage.deleteNotification(id, userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("[NOTIFICATIONS] Error deleting notification:", error);
      res.status(500).json({ message: "Failed to delete notification" });
    }
  });


  app.post('/api/admin/notifications/broadcast', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }


      const broadcastSchema = z.object({
        title: z.string().min(1).max(200),
        message: z.string().min(1).max(1000),
        imageUrl: z.string().optional()
      });

      const validation = broadcastSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          message: "Invalid request data",
          errors: validation.error.errors
        });
      }

      const { title, message, imageUrl } = validation.data;

      const result = await storage.createBroadcastNotification(
        title,
        message,
        imageUrl && imageUrl !== "" ? imageUrl : undefined
      );

      console.log(`[NOTIFICATIONS] Broadcast notification sent to ${result.count} users by admin ${userId}${imageUrl ? ' (with image)' : ''}`);
      res.json(result);
    } catch (error: any) {
      console.error("[NOTIFICATIONS] Error creating broadcast notification:", error);
      res.status(500).json({ message: "Failed to create broadcast notification" });
    }
  });




  app.get('/api/awards', async (_req, res) => {
    try {
      const awards = await storage.getAwards();
      res.json(awards);
    } catch (error: any) {
      console.error("[AWARDS] Error getting awards:", error);
      res.status(500).json({ message: "Failed to get awards" });
    }
  });


  app.get('/api/user/awards', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userAwards = await storage.getUserAwards(userId);
      res.json(userAwards);
    } catch (error: any) {
      console.error("[AWARDS] Error getting user awards:", error);
      res.status(500).json({ message: "Failed to get user awards" });
    }
  });


  app.post('/api/user/awards/select', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { awardId } = req.body;


      if (awardId) {
        const userAwards = await storage.getUserAwards(userId);
        const hasAward = userAwards.some(ua => ua.awardId === awardId);

        if (!hasAward) {
          return res.status(403).json({ message: "You don't have this award" });
        }
      }

      const updatedUser = await storage.selectUserAward(userId, awardId);
      res.json(updatedUser);
    } catch (error: any) {
      console.error("[AWARDS] Error selecting award:", error);
      res.status(500).json({ message: "Failed to select award" });
    }
  });




  app.get('/api/partners', async (_req, res) => {
    try {
      const partners = await storage.getPartners();
      res.json(partners);
    } catch (error: any) {
      console.error("[PARTNERS] Error getting partners:", error);
      res.status(500).json({ message: "Failed to get partners" });
    }
  });


  app.get('/api/partners/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const partner = await storage.getPartner(id);

      if (!partner) {
        return res.status(404).json({ message: "Partner not found" });
      }


      if (!partner.isActive) {
        return res.status(404).json({ message: "Partner not found" });
      }

      res.json(partner);
    } catch (error: any) {
      console.error("[PARTNERS] Error getting partner:", error);
      res.status(500).json({ message: "Failed to get partner" });
    }
  });


  app.get('/api/admin/partners', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const allPartners = await db.select().from(partners).orderBy(partners.displayOrder);
      res.json(allPartners);
    } catch (error: any) {
      console.error("[PARTNERS] Error getting all partners:", error);
      res.status(500).json({ message: "Failed to get partners" });
    }
  });


  app.post('/api/admin/partners', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const validationResult = insertPartnerSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Invalid partner data",
          errors: validationResult.error.flatten()
        });
      }

      const partner = await storage.createPartner(validationResult.data);
      console.log(`[PARTNERS] Partner created: ${partner.id} by admin ${userId}`);
      res.json(partner);
    } catch (error: any) {
      console.error("[PARTNERS] Error creating partner:", error);
      res.status(500).json({ message: "Failed to create partner" });
    }
  });


  app.put('/api/admin/partners/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { id } = req.params;
      const updateSchema = insertPartnerSchema.partial();
      const validationResult = updateSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({
          message: "Invalid partner data",
          errors: validationResult.error.flatten()
        });
      }

      const partner = await storage.updatePartner(id, validationResult.data);
      console.log(`[PARTNERS] Partner updated: ${id} by admin ${userId}`);
      res.json(partner);
    } catch (error: any) {
      console.error("[PARTNERS] Error updating partner:", error);
      res.status(500).json({ message: "Failed to update partner" });
    }
  });


  app.delete('/api/admin/partners/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { id } = req.params;
      await storage.deletePartner(id);
      console.log(`[PARTNERS] Partner deleted: ${id} by admin ${userId}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error("[PARTNERS] Error deleting partner:", error);
      res.status(500).json({ message: "Failed to delete partner" });
    }
  });




  app.get('/api/programs', isAuthenticated, async (req: any, res) => {
    try {
      const { category, isFree, search } = req.query;

      const filters: any = {};
      if (category) filters.category = category as string;
      if (isFree !== undefined) filters.isFree = isFree === 'true';
      if (search) filters.search = search as string;

      const programs = await storage.getPrograms(filters);
      res.json(programs);
    } catch (error: any) {
      console.error("[PROGRAMS] Error getting programs:", error);
      res.status(500).json({ message: "Failed to get programs" });
    }
  });


  app.get('/api/programs/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const program = await storage.getProgram(id);

      if (!program) {
        return res.status(404).json({ message: "Program not found" });
      }

      if (!program.isActive) {
        return res.status(404).json({ message: "Program not found" });
      }

      res.json(program);
    } catch (error: any) {
      console.error("[PROGRAMS] Error getting program:", error);
      res.status(500).json({ message: "Failed to get program" });
    }
  });


  app.get('/api/program-purchases', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const purchases = await storage.getProgramPurchases(userId);
      res.json(purchases);
    } catch (error: any) {
      console.error("[PROGRAMS] Error getting program purchases:", error);
      res.status(500).json({ message: "Failed to get program purchases" });
    }
  });


  app.get('/api/programs/:programId/purchase', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { programId } = req.params;

      const purchase = await storage.getProgramPurchase(userId, programId);

      if (purchase) {
        res.json(purchase);
      } else {
        res.status(404).json({ message: "Purchase not found" });
      }
    } catch (error: any) {
      console.error("[PROGRAMS] Error checking program purchase:", error);
      res.status(500).json({ message: "Failed to check purchase" });
    }
  });


  app.post('/api/program-purchases', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;


      const schema = z.object({
        programId: z.string().uuid("Invalid program ID"),
        useFantiks: z.boolean().optional().default(false),
        payWithFantiks: z.boolean().optional().default(false),
      });

      const validatedData = schema.parse(req.body);
      const { programId, useFantiks, payWithFantiks } = validatedData;


      const program = await storage.getProgram(programId);
      if (!program) {
        return res.status(404).json({ message: "Program not found" });
      }


      const existingPurchase = await storage.getProgramPurchase(userId, programId);
      if (existingPurchase) {
        return res.status(400).json({ message: "Program already purchased" });
      }


      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const paymentType = program.paymentType || 'money_only';
      const fantikPrice = program.fantikPrice ? parseInt(String(program.fantikPrice)) : null;
      const moneyPrice = parseFloat(program.price || '0');
      const balance = parseFloat(user.balance || '0');
      const referralBalance = parseFloat(user.referralBalance || '0');
      const totalBalance = balance + referralBalance;
      const userFantiks = parseInt(String(user.fantiks || 0));


      let useFantiksForPayment = false;
      if (paymentType === 'fantiks_only') {
        useFantiksForPayment = true;
      } else if (paymentType === 'both' && payWithFantiks) {
        useFantiksForPayment = true;
      }


      if (useFantiksForPayment && !fantikPrice) {
        return res.status(400).json({ message: "Программа недоступна для покупки за фантики" });
      }
      if (!useFantiksForPayment && paymentType === 'fantiks_only') {
        return res.status(400).json({ message: "Программу можно купить только за фантики" });
      }

      let fantiksDiscount = 0;
      let finalFantikPrice = 0;
      let finalMoneyPrice = 0;
      let referralDiscount = 0;

      if (useFantiksForPayment) {

        finalFantikPrice = fantikPrice || 0;

        if (!program.isFree && userFantiks < finalFantikPrice) {
          return res.status(400).json({ message: "Недостаточно фантиков" });
        }
      } else {

        finalMoneyPrice = moneyPrice;


        if (useFantiks && userFantiks > 0 && !program.isFree) {
          const maxDiscount = finalMoneyPrice * 0.2;
          fantiksDiscount = Math.min(userFantiks, maxDiscount);
          finalMoneyPrice = Math.max(0, finalMoneyPrice - fantiksDiscount);
        }


        if (!program.isFree && totalBalance < finalMoneyPrice) {
          return res.status(400).json({ message: "Недостаточно средств" });
        }
      }


      const result = await db.transaction(async (tx) => {
        if (useFantiksForPayment) {

          if (!program.isFree && finalFantikPrice > 0) {
            await tx
              .update(users)
              .set({
                fantiks: sql`${users.fantiks} - ${finalFantikPrice}`,
                updatedAt: new Date(),
              })
              .where(eq(users.id, userId));


            await tx.insert(balanceTransactions).values({
              id: randomUUID(),
              userId,
              amount: (-finalFantikPrice).toString(),
              type: "fantiks",
              description: `Покупка программы за фантики: ${program.title}`,
            });
          }
        } else {


          if (!program.isFree && fantiksDiscount > 0) {
            await tx
              .update(users)
              .set({
                fantiks: sql`${users.fantiks} - ${fantiksDiscount}`,
                updatedAt: new Date(),
              })
              .where(eq(users.id, userId));


            await tx.insert(balanceTransactions).values({
              id: randomUUID(),
              userId,
              amount: (-fantiksDiscount).toString(),
              type: "fantiks",
              description: `Скидка фантиками на программу: ${program.title}`,
            });
          }


          if (!program.isFree && finalMoneyPrice > 0) {
            const referralBalance = parseFloat(user.referralBalance || '0');


            const fromReferral = Math.min(finalMoneyPrice, referralBalance);
            const fromBalance = finalMoneyPrice - fromReferral;

            if (fromReferral > 0) {
              await tx
                .update(users)
                .set({
                  referralBalance: sql`${users.referralBalance} - ${fromReferral}`,
                  updatedAt: new Date()
                })
                .where(eq(users.id, userId));
            }

            if (fromBalance > 0) {
              const balanceResult = await tx
                .update(users)
                .set({
                  balance: sql`${users.balance} - ${fromBalance}`,
                  updatedAt: new Date()
                })
                .where(and(
                  eq(users.id, userId),
                  sql`${users.balance} >= ${fromBalance}`
                ))
                .returning();

              if (balanceResult.length === 0) {
                throw new Error("Insufficient balance");
              }
            }


            const purchaseDescription = fantiksDiscount > 0
              ? `Покупка программы: ${program.title} (со скидкой ${fantiksDiscount}₽ фантиков)`
              : `Покупка программы: ${program.title}`;

            await tx.insert(balanceTransactions).values({
              id: randomUUID(),
              userId,
              amount: (-finalMoneyPrice).toString(),
              type: "purchase",
              description: purchaseDescription,
            });


            const bonusFantiks = Math.floor(moneyPrice * 0.01);
            if (bonusFantiks > 0) {
              await tx
                .update(users)
                .set({ fantiks: sql`${users.fantiks} + ${bonusFantiks}` })
                .where(eq(users.id, userId));
            }
          }
        }


        const [newPurchase] = await tx
          .insert(programPurchases)
          .values({
            id: randomUUID(),
            userId,
            programId,
            price: useFantiksForPayment ? "0" : finalMoneyPrice.toString(),
          })
          .returning();

        return newPurchase;
      });


      try {
        let notificationMessage = `Вы приобрели программу "${program.title}"`;
        if (useFantiksForPayment) {
          notificationMessage += ` за ${finalFantikPrice} фантиков`;
        } else if (fantiksDiscount > 0) {
          notificationMessage += ` со скидкой ${fantiksDiscount}₽ по Fantiks`;
        }

        await storage.createNotification({
          userId,
          title: "Программа успешно приобретена",
          message: notificationMessage,
          type: "purchase",
          isRead: false,
        });
      } catch (notifError) {
        console.error("[PROGRAMS] Failed to create notification:", notifError);
      }

      console.log(`[PROGRAMS] Program purchased: ${programId} by user ${userId}, fantiks: ${useFantiksForPayment}, price: ${useFantiksForPayment ? finalFantikPrice : finalMoneyPrice}`);
      res.json(result);
    } catch (error: any) {
      console.error("[PROGRAMS] Error purchasing program:", error);
      res.status(500).json({ message: error.message || "Failed to purchase program" });
    }
  });


  app.get('/api/admin/programs', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const allPrograms = await db.select().from(programs).orderBy(programs.displayOrder);
      res.json(allPrograms);
    } catch (error: any) {
      console.error("[PROGRAMS] Error getting all programs:", error);
      res.status(500).json({ message: "Failed to get programs" });
    }
  });


  app.post('/api/admin/programs', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const validationResult = insertProgramSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Invalid program data",
          errors: validationResult.error.flatten()
        });
      }

      const program = await storage.createProgram(validationResult.data);
      console.log(`[PROGRAMS] Program created: ${program.id} by admin ${userId}`);
      res.json(program);
    } catch (error: any) {
      console.error("[PROGRAMS] Error creating program:", error);
      res.status(500).json({ message: "Failed to create program" });
    }
  });


  app.put('/api/admin/programs/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { id } = req.params;
      const updateSchema = insertProgramSchema.partial();
      const validationResult = updateSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({
          message: "Invalid program data",
          errors: validationResult.error.flatten()
        });
      }

      const program = await storage.updateProgram(id, validationResult.data);
      console.log(`[PROGRAMS] Program updated: ${id} by admin ${userId}`);
      res.json(program);
    } catch (error: any) {
      console.error("[PROGRAMS] Error updating program:", error);
      res.status(500).json({ message: "Failed to update program" });
    }
  });


  app.delete('/api/admin/programs/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { id } = req.params;
      await storage.deleteProgram(id);
      console.log(`[PROGRAMS] Program deleted: ${id} by admin ${userId}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error("[PROGRAMS] Error deleting program:", error);
      res.status(500).json({ message: "Failed to delete program" });
    }
  });




  app.get('/api/programs/:programId/reviews', async (req, res) => {
    try {
      const { programId } = req.params;
      const reviews = await storage.getProgramReviews(programId);
      res.json(reviews);
    } catch (error: any) {
      console.error("[PROGRAM_REVIEWS] Error getting reviews:", error);
      res.status(500).json({ message: "Failed to get reviews" });
    }
  });


  app.post('/api/program-reviews', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validationResult = insertProgramReviewSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({
          message: "Invalid review data",
          errors: validationResult.error.flatten()
        });
      }


      const existingReview = await storage.getUserProgramReview(userId, validationResult.data.programId);
      if (existingReview) {
        return res.status(400).json({ message: "You have already reviewed this program" });
      }

      const review = await storage.createProgramReview({
        ...validationResult.data,
        userId,
      });

      console.log(`[PROGRAM_REVIEWS] Review created: ${review.id} for program ${review.programId} by user ${userId}`);
      res.json(review);
    } catch (error: any) {
      console.error("[PROGRAM_REVIEWS] Error creating review:", error);
      res.status(500).json({ message: "Failed to create review" });
    }
  });


  app.patch('/api/program-reviews/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const { rating, comment } = req.body;

      const review = await storage.getProgramReviewById(id);
      if (!review) {
        return res.status(404).json({ message: "Review not found" });
      }

      if (review.userId !== userId) {
        return res.status(403).json({ message: "You can only edit your own reviews" });
      }

      const updated = await storage.updateProgramReview(id, { rating, comment });
      console.log(`[PROGRAM_REVIEWS] Review updated: ${id} by user ${userId}`);
      res.json(updated);
    } catch (error: any) {
      console.error("[PROGRAM_REVIEWS] Error updating review:", error);
      res.status(500).json({ message: "Failed to update review" });
    }
  });


  app.delete('/api/program-reviews/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;

      const review = await storage.getProgramReviewById(id);
      if (!review) {
        return res.status(404).json({ message: "Review not found" });
      }

      if (review.userId !== userId) {
        return res.status(403).json({ message: "You can only delete your own reviews" });
      }

      await storage.deleteProgramReview(id);
      console.log(`[PROGRAM_REVIEWS] Review deleted: ${id} by user ${userId}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error("[PROGRAM_REVIEWS] Error deleting review:", error);
      res.status(500).json({ message: "Failed to delete review" });
    }
  });


  app.get('/api/admin/program-reviews/pending', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const pendingReviews = await storage.getPendingProgramReviews();
      res.json(pendingReviews);
    } catch (error: any) {
      console.error("[PROGRAM_REVIEWS] Error getting pending reviews:", error);
      res.status(500).json({ message: "Failed to get pending reviews" });
    }
  });


  app.patch('/api/admin/program-reviews/:id/moderate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { id } = req.params;
      const schema = z.object({
        status: z.enum(['approved', 'rejected']),
        comment: z.string().optional(),
      });
      const { status, comment } = schema.parse(req.body);

      const review = await storage.getProgramReviewById(id);
      if (!review) {
        return res.status(404).json({ message: "Review not found" });
      }

      const moderated = await storage.moderateProgramReview(id, status, userId, comment);
      console.log(`[PROGRAM_REVIEWS] Review ${status}: ${id} by admin ${userId}`);
      res.json(moderated);
    } catch (error: any) {
      console.error("[PROGRAM_REVIEWS] Error moderating review:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to moderate review" });
    }
  });


  app.patch('/api/program-reviews/:id/admin-comment', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { id } = req.params;
      const schema = z.object({
        adminComment: z.string().nullable(),
      });
      const { adminComment } = schema.parse(req.body);

      const review = await storage.getProgramReviewById(id);
      if (!review) {
        return res.status(404).json({ message: "Review not found" });
      }

      const updated = await storage.updateProgramReviewAdminComment(id, adminComment);
      console.log(`[PROGRAM_REVIEWS] Admin comment updated: ${id} by admin ${userId}`);
      res.json(updated);
    } catch (error: any) {
      console.error("[PROGRAM_REVIEWS] Error updating admin comment:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to update admin comment" });
    }
  });




  app.get('/api/programs/:programId/instructions', async (req, res) => {
    try {
      const { programId } = req.params;
      const instructions = await storage.getProgramInstructions(programId);
      res.json(instructions);
    } catch (error: any) {
      console.error("[PROGRAM_INSTRUCTIONS] Error getting instructions:", error);
      res.status(500).json({ message: "Failed to get instructions" });
    }
  });


  app.post('/api/admin/program-instructions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const validationResult = insertProgramInstructionSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Invalid instruction data",
          errors: validationResult.error.flatten()
        });
      }

      const instruction = await storage.createProgramInstruction(validationResult.data);
      console.log(`[PROGRAM_INSTRUCTIONS] Instruction created: ${instruction.id} by admin ${userId}`);
      res.json(instruction);
    } catch (error: any) {
      console.error("[PROGRAM_INSTRUCTIONS] Error creating instruction:", error);
      res.status(500).json({ message: "Failed to create instruction" });
    }
  });


  app.patch('/api/admin/program-instructions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { id } = req.params;
      const updateSchema = insertProgramInstructionSchema.partial();
      const validationResult = updateSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({
          message: "Invalid instruction data",
          errors: validationResult.error.flatten()
        });
      }

      const instruction = await storage.updateProgramInstruction(id, validationResult.data);
      console.log(`[PROGRAM_INSTRUCTIONS] Instruction updated: ${id} by admin ${userId}`);
      res.json(instruction);
    } catch (error: any) {
      console.error("[PROGRAM_INSTRUCTIONS] Error updating instruction:", error);
      res.status(500).json({ message: "Failed to update instruction" });
    }
  });


  app.delete('/api/admin/program-instructions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { id } = req.params;
      await storage.deleteProgramInstruction(id);
      console.log(`[PROGRAM_INSTRUCTIONS] Instruction deleted: ${id} by admin ${userId}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error("[PROGRAM_INSTRUCTIONS] Error deleting instruction:", error);
      res.status(500).json({ message: "Failed to delete instruction" });
    }
  });


  app.post('/api/analytics/filter-click', async (req: any, res) => {
    try {
      const { filterType, filterId, filterValue } = req.body;

      if (!filterType || !filterValue) {
        return res.status(400).json({ message: "filterType and filterValue are required" });
      }

      const userId = req.isAuthenticated?.() ? req.user?.claims?.sub : null;

      await storage.trackFilterClick({
        filterType,
        filterId: filterId || null,
        filterValue,
        userId: userId || null,
      });


      clearPopularityCache();


      clearCache();

      res.json({ success: true });
    } catch (error: any) {
      console.error("[ANALYTICS] Error tracking filter click:", error);

      res.json({ success: true });
    }
  });


  app.get('/api/analytics/filter-popularity', async (req: any, res) => {
    try {
      const filterType = req.query.filterType as string | undefined;
      const days = req.query.days ? parseInt(req.query.days as string, 10) : 30;

      if (isNaN(days) || days < 1) {
        return res.status(400).json({ message: "days must be a positive integer" });
      }

      const cacheKey = `popularity:${filterType || 'all'}:${days}`;


      const cached = getCachedPopularity<Array<{ filterId: string; filterValue: string; clickCount: number }>>(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const popularity = await storage.getFilterPopularity(filterType, days);
      setCachePopularity(cacheKey, popularity);
      res.json(popularity);
    } catch (error: any) {
      console.error("[ANALYTICS] Error getting filter popularity:", error);
      res.status(500).json({ message: "Failed to get filter popularity" });
    }
  });

  app.get("/api/debug-buckets", async (req, res) => {
    try {
      const { ListBucketsCommand } = await import("@aws-sdk/client-s3");
      const command = new ListBucketsCommand({});
      const response = await s3Client.send(command);
      res.json({ buckets: response.Buckets });
    } catch (err: any) {
      res.status(500).json({ error: err.message, code: err.Code });
    }
  });

  app.post(
    "/api/upload",
    upload.single("file"),
    async (req, res) => {
      try {
        if (!req.file) return res.status(400).json({ error: "No file" });

        const key = `${Date.now()}_${req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

        await s3Client.send(
          new PutObjectCommand({
            Bucket: process.env.NOWCDN_BUCKET!,
            Key: key,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
            ACL: "public-read",
          })
        );

        const url = `https://storage.yandexcloud.net/${process.env.NOWCDN_BUCKET}/${key}`;

        res.json({ url, fileName: req.file.originalname });
      } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
      }
    }
  );

  const httpServer = createServer(app);
  return httpServer;
}