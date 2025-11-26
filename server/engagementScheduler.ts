import { storage } from './storage';
import { sendNotificationToTelegram } from './telegram';

// Креативные сообщения для разных периодов неактивности
const ENGAGEMENT_MESSAGES = {
  '1_week': [
    '👋 Привет! Давненько не виделись 😊\n\nУ нас появилось много интересных курсов! Заходи посмотреть, что нового 🎓',
    '🔥 Эй, соскучились!\n\nУже неделя прошла... Может, время освоить что-то новое? 💪',
    '✨ Ого, целая неделя без тебя!\n\nМы тут обновили каталог - зацени новинки! 🚀',
    '🎯 Привет! Ты где?\n\nЗа неделю столько всего произошло - новые курсы, акции... Заглядывай! 📚',
  ],
  '2_weeks': [
    '😢 Уже две недели без тебя...\n\nНам правда не хватает! Возвращайся, у нас есть что-то особенное для тебя 🎁',
    '🌟 Две недели - это серьёзно!\n\nДавай проверим, что ты пропустил? Может, найдёшь курс мечты! 💎',
    '💫 Скучаем! Где пропадаешь?\n\nУже 2 недели... Заходи скорее, покажем свежие материалы! 🎓',
    '🎪 Эй, ты ещё помнишь о нас?\n\nПрошло уже 2 недели, а мы всё ждём! Новые курсы не дадут заскучать 🔥',
  ],
  '1_month': [
    '😱 Целый месяц!\n\nМы реально соскучились... Что случилось? Может, вернёшься к нам? У нас столько нового! 🎁✨',
    '🚨 Месяц без тебя - это печально!\n\nНо мы не сдаёмся! Возвращайся, у нас куча крутых обновлений 🚀💪',
    '💔 Целый месяц прошёл...\n\nМы всё ещё здесь и ждём тебя! Новые курсы, новые возможности - заглядывай! 🌟',
    '⏰ 30 дней без тебя!\n\nЭто слишком долго! Давай вернёмся к обучению? Обещаем, будет интересно! 🎯📚',
  ],
};

class EngagementScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private readonly CHECK_INTERVAL = 10 * 60 * 1000; // Check every 10 minutes
  private readonly TARGET_HOUR_MOSCOW = 12; // 12:00 Moscow time
  private readonly MAX_RUN_DURATION_MS = 30 * 60 * 1000; // 30 minutes - consider run stale if older

  start() {
    console.log('[Engagement] Starting engagement notification scheduler (12:00 Moscow time)...');
    
    // Check every 10 minutes
    this.intervalId = setInterval(async () => {
      await this.checkAndProcess();
    }, this.CHECK_INTERVAL);

    // Check immediately on startup
    this.checkAndProcess();
  }

  private getMoscowTime(): Date {
    // Moscow is UTC+3
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const moscowTime = new Date(utc + (3600000 * 3)); // UTC+3
    return moscowTime;
  }

  private async checkAndProcess() {
    const moscowTime = this.getMoscowTime();
    const currentHour = moscowTime.getHours();

    // Check if it's 12:00 hour (12:00-12:59) in Moscow
    if (currentHour !== this.TARGET_HOUR_MOSCOW) {
      return;
    }

    // Get run date in YYYY-MM-DD format
    const runDate = moscowTime.toISOString().split('T')[0];

    // Check if we already completed this scheduler run today (persisted check, survives restarts)
    const alreadyCompleted = await storage.hasCompletedSchedulerRun('engagement_notifications', runDate);
    if (alreadyCompleted) {
      console.log('[Engagement] Scheduler run already completed today, skipping...');
      return;
    }

    console.log(`[Engagement] It's ${currentHour}:${moscowTime.getMinutes()} Moscow time - starting daily run...`);

    // Create or resume scheduler run record
    let schedulerRun;
    try {
      schedulerRun = await storage.createSchedulerRun('engagement_notifications', runDate);
    } catch (error: any) {
      // If unique constraint fails, check the existing run
      if (error.code === '23505') {
        const existingRun = await storage.getSchedulerRun('engagement_notifications', runDate);
        
        if (!existingRun) {
          console.error('[Engagement] Unique constraint violation but no existing run found');
          return;
        }

        // If already completed, another process finished it
        if (existingRun.status === 'completed') {
          console.log('[Engagement] Another process already completed this run');
          return;
        }

        // If failed or stuck in running state, attempt recovery
        if (existingRun.status === 'failed') {
          console.log('[Engagement] Found failed run from previous attempt, retrying...');
          await storage.updateSchedulerRunToRunning(existingRun.id);
          schedulerRun = existingRun;
        } else if (existingRun.status === 'running') {
          // Check if run is stale (older than MAX_RUN_DURATION_MS)
          const runAge = Date.now() - new Date(existingRun.startedAt!).getTime();
          if (runAge > this.MAX_RUN_DURATION_MS) {
            console.log(`[Engagement] Found stale run (${Math.round(runAge / 60000)} minutes old), recovering...`);
            await storage.updateSchedulerRunToRunning(existingRun.id);
            schedulerRun = existingRun;
          } else {
            console.log('[Engagement] Another process is currently running this scheduler');
            return;
          }
        } else {
          console.log('[Engagement] Existing run in unexpected state, skipping...');
          return;
        }
      } else {
        throw error;
      }
    }

    // Process notifications
    try {
      await this.processEngagementNotifications();
      
      // Mark run as completed
      await storage.markSchedulerRunCompleted(schedulerRun.id);
      console.log('[Engagement] Daily scheduler run completed successfully');
    } catch (error: any) {
      // Mark run as failed
      await storage.markSchedulerRunFailed(schedulerRun.id, error.message || 'Unknown error');
      console.error('[Engagement] Scheduler run failed:', error);
      throw error;
    }
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[Engagement] Engagement notification scheduler stopped');
    }
  }

  private async processEngagementNotifications() {
    if (this.isProcessing) {
      console.log('[Engagement] Already processing, skipping...');
      return;
    }

    this.isProcessing = true;

    try {
      // Process notification types in order of priority (highest inactivity first)
      // This ensures users get only ONE notification at their highest inactivity level
      const notificationTypes: Array<'1_month' | '2_weeks' | '1_week'> = ['1_month', '2_weeks', '1_week'];
      const processedUserIds = new Set<string>();

      for (const notificationType of notificationTypes) {
        await this.processNotificationType(notificationType, processedUserIds);
      }
    } catch (error) {
      console.error('[Engagement] Error in processEngagementNotifications:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processNotificationType(
    notificationType: '1_week' | '2_weeks' | '1_month',
    processedUserIds: Set<string>
  ) {
    try {
      const inactiveUsers = await storage.getInactiveUsersForEngagement(notificationType);
      
      if (inactiveUsers.length === 0) {
        console.log(`[Engagement] No inactive users found for ${notificationType}`);
        return;
      }

      console.log(`[Engagement] Found ${inactiveUsers.length} inactive users for ${notificationType}`);

      const messages = ENGAGEMENT_MESSAGES[notificationType];
      let sentCount = 0;
      
      for (const user of inactiveUsers) {
        try {
          // Skip if user was already processed at a higher inactivity level
          if (processedUserIds.has(user.id)) {
            console.log(`[Engagement] User ${user.id} already received notification at higher level, skipping`);
            continue;
          }

          // Skip if user doesn't have Telegram chat ID
          if (!user.telegramChatId) {
            console.log(`[Engagement] User ${user.id} has no Telegram chat ID, skipping`);
            continue;
          }

          // Select random message from the pool
          const randomMessage = messages[Math.floor(Math.random() * messages.length)];

          // Prepare title based on notification type
          const titles = {
            '1_week': '🌟 Мы скучаем!',
            '2_weeks': '💫 Давно не виделись',
            '1_month': '✨ Возвращайся к нам!'
          };

          // Send notification via Telegram
          await sendNotificationToTelegram(
            user.telegramChatId,
            'engagement',
            titles[notificationType],
            randomMessage
          );

          // Record that we sent this notification
          await storage.createEngagementNotification(user.id, notificationType);

          // Mark user as processed to prevent duplicate notifications
          processedUserIds.add(user.id);
          sentCount++;

          const userName = user.firstName || 'User';
          console.log(`[Engagement] Sent ${notificationType} notification to ${userName} (${user.id})`);

          // Small delay to avoid hitting Telegram rate limits
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`[Engagement] Error sending notification to user ${user.id}:`, error);
        }
      }

      console.log(`[Engagement] Processed ${notificationType}: sent ${sentCount} notifications out of ${inactiveUsers.length} eligible users`);
    } catch (error) {
      console.error(`[Engagement] Error processing ${notificationType}:`, error);
    }
  }
}

export const engagementScheduler = new EngagementScheduler();
