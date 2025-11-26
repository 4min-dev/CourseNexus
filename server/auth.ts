import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { storage } from './storage';
import { db } from './db';
import { users, balanceTransactions, tasks, userTasks, userLogins } from '@shared/schema';
import { sql, eq, and } from 'drizzle-orm';

const SALT_ROUNDS = 10;

// Функция для записи логина пользователя
export async function recordUserLogin(userId: string): Promise<void> {
  try {
    // Используем INSERT ... ON CONFLICT DO NOTHING для предотвращения дублирования
    await db.execute(sql`
      INSERT INTO user_logins (user_id, login_date)
      VALUES (${userId}, NOW())
      ON CONFLICT (user_id, DATE(login_date)) DO NOTHING
    `);
  } catch (error) {
    console.error('[Login Tracking] Error recording user login:', error);
  }
}

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

export function generateReferralCode(): string {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

export function generatePromoCode(): string {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

export async function autoCompleteWelcomeTask(userId: string): Promise<void> {
  try {
    const welcomeTask = await db.select().from(tasks).where(eq(tasks.title, "Добро пожаловать!")).limit(1);
    if (welcomeTask.length > 0) {
      // Проверь существует ли уже user_task (защита от дубликатов)
      const existing = await db.select().from(userTasks)
        .where(and(
          eq(userTasks.userId, userId),
          eq(userTasks.taskId, welcomeTask[0].id)
        ))
        .limit(1);
      
      if (existing.length === 0) {
        const task = welcomeTask[0];
        const fantiksReward = task.reward;
        
        // Выполнить все операции атомарно в транзакции
        await db.transaction(async (tx) => {
          // Создать запись о выполнении задания с начисленной наградой
          await tx.insert(userTasks).values({
            userId,
            taskId: task.id,
            currentProgress: 1,
            targetValue: 1,
            completedAt: new Date(),
            rewardClaimed: true,
            fantiksEarned: fantiksReward,
          });
          
          // Начислить фантики пользователю
          await tx
            .update(users)
            .set({
              fantiks: sql`${users.fantiks} + ${fantiksReward}`,
            })
            .where(eq(users.id, userId));
          
          // Залогировать начисление фантиков
          await tx.insert(balanceTransactions).values({
            userId,
            amount: fantiksReward.toString(),
            type: "fantiks",
            description: `Награда за выполнение задания: ${task.title}`,
          });
        });
      }
    }
  } catch (error) {
    console.log('Could not auto-complete welcome task:', error);
  }
}

export async function registerUser(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  referralCodeUsed?: string;
  landingVisitId?: string;
  registrationIp?: string;
  registrationCountry?: string;
  registrationCity?: string;
  registrationBrowser?: string;
  registrationDevice?: string;
  registrationOs?: string;
  registrationUserAgent?: string;
}) {
  const normalizedEmail = data.email.toLowerCase().trim();
  
  const existingUser = await storage.getUserByEmail(normalizedEmail);
  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  const passwordHash = await hashPassword(data.password);
  const referralCode = generateReferralCode();
  const promoCode = generatePromoCode();
  
  // Проверяем, приглашен ли пользователь рефералом
  let referrer = null;
  if (data.referralCodeUsed) {
    referrer = await storage.getUserByReferralCode(data.referralCodeUsed);
  }

  const user = await storage.createUserWithPassword({
    email: normalizedEmail,
    passwordHash,
    firstName: data.firstName,
    lastName: data.lastName,
    referralCode,
    promoCode,
    referralDiscount: referrer ? 5 : 0,
    landingVisitId: data.landingVisitId,
    registrationIp: data.registrationIp,
    registrationCountry: data.registrationCountry,
    registrationCity: data.registrationCity,
    registrationBrowser: data.registrationBrowser,
    registrationDevice: data.registrationDevice,
    registrationOs: data.registrationOs,
    registrationUserAgent: data.registrationUserAgent,
  });

  if (referrer) {
    await storage.createReferral({
      referrerId: referrer.id,
      referredUserId: user.id,
    });
    
    // Начислить 300 фантиков рефереру за регистрацию (атомарно)
    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({
          fantiks: sql`${users.fantiks} + 300`,
          updatedAt: new Date(),
        })
        .where(sql`${users.id} = ${referrer.id}`);
      
      await tx.insert(balanceTransactions).values({
        userId: referrer.id,
        amount: '300',
        type: 'fantiks',
        description: `Бонус за регистрацию реферала: ${user.firstName} ${user.lastName}`,
      });
    });
  }

  // Update landing visit conversion if landingVisitId is provided
  if (data.landingVisitId) {
    await storage.updateLandingVisitConversion(data.landingVisitId, user.id);
  }

  // Auto-complete "Добро пожаловать!" task for new user
  await autoCompleteWelcomeTask(user.id);

  return user;
}

export async function loginUser(email: string, password: string) {
  const normalizedEmail = email.toLowerCase().trim();
  
  const user = await storage.getUserByEmail(normalizedEmail);
  if (!user || !user.passwordHash) {
    throw new Error('Invalid email or password');
  }

  const isValid = await comparePassword(password, user.passwordHash);
  if (!isValid) {
    throw new Error('Invalid email or password');
  }

  // Записать вход пользователя для трекинга активности
  await recordUserLogin(user.id);

  return user;
}

export function verifyTelegramAuth(data: any, botToken: string): boolean {
  const checkString = Object.keys(data)
    .filter(key => key !== 'hash')
    .sort()
    .map(key => `${key}=${data[key]}`)
    .join('\n');

  const secretKey = crypto.createHash('sha256').update(botToken).digest();
  const hash = crypto.createHmac('sha256', secretKey).update(checkString).digest('hex');

  return hash === data.hash;
}

export async function loginOrRegisterWithTelegram(telegramData: {
  id: string;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}, referralCodeUsed?: string, visitorMetadata?: {
  landingVisitId?: string;
  registrationIp?: string;
  registrationCountry?: string;
  registrationCity?: string;
  registrationBrowser?: string;
  registrationDevice?: string;
  registrationOs?: string;
  registrationUserAgent?: string;
}) {
  let user = await storage.getUserByTelegramId(telegramData.id);

  if (!user) {
    const referralCode = generateReferralCode();
    const promoCode = generatePromoCode();
    
    // Проверяем, приглашен ли пользователь рефералом
    let referrer = null;
    if (referralCodeUsed) {
      referrer = await storage.getUserByReferralCode(referralCodeUsed);
    }
    
    user = await storage.createUserWithTelegram({
      telegramId: telegramData.id,
      firstName: telegramData.first_name,
      lastName: telegramData.last_name,
      telegramUsername: telegramData.username,
      profileImageUrl: telegramData.photo_url,
      referralCode,
      promoCode,
      referralDiscount: referrer ? 5 : 0,
      landingVisitId: visitorMetadata?.landingVisitId,
      registrationIp: visitorMetadata?.registrationIp,
      registrationCountry: visitorMetadata?.registrationCountry,
      registrationCity: visitorMetadata?.registrationCity,
      registrationBrowser: visitorMetadata?.registrationBrowser,
      registrationDevice: visitorMetadata?.registrationDevice,
      registrationOs: visitorMetadata?.registrationOs,
      registrationUserAgent: visitorMetadata?.registrationUserAgent,
    });

    if (referrer) {
      await storage.createReferral({
        referrerId: referrer.id,
        referredUserId: user.id,
      });
      
      // Начислить 300 фантиков рефереру за регистрацию (атомарно)
      const newUserFullName = `${user.firstName} ${user.lastName || ''}`;
      await db.transaction(async (tx) => {
        await tx
          .update(users)
          .set({
            fantiks: sql`${users.fantiks} + 300`,
            updatedAt: new Date(),
          })
          .where(sql`${users.id} = ${referrer.id}`);
        
        await tx.insert(balanceTransactions).values({
          userId: referrer.id,
          amount: '300',
          type: 'fantiks',
          description: `Бонус за регистрацию реферала: ${newUserFullName}`,
        });
      });
    }

    // Update landing visit conversion if landingVisitId is provided
    if (visitorMetadata?.landingVisitId) {
      await storage.updateLandingVisitConversion(visitorMetadata.landingVisitId, user.id);
    }

    // Auto-complete "Добро пожаловать!" task for new user
    await autoCompleteWelcomeTask(user.id);
  }

  // Записать вход пользователя для трекинга активности (для новых и существующих)
  await recordUserLogin(user.id);

  return user;
}
