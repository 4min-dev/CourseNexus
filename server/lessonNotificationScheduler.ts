import { storage } from './storage';

class LessonNotificationScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private isProcessing = false;

  start() {
    console.log('[LessonNotifications] Starting notification scheduler...');
    
    this.intervalId = setInterval(async () => {
      await this.processNotifications();
    }, 5 * 60 * 1000);

    this.processNotifications();
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[LessonNotifications] Notification scheduler stopped');
    }
  }

  private async processNotifications() {
    if (this.isProcessing) {
      console.log('[LessonNotifications] Already processing, skipping...');
      return;
    }

    this.isProcessing = true;

    try {
      const pendingNotifications = await storage.getPendingLessonNotificationsToProcess();
      
      if (pendingNotifications.length === 0) {
        return;
      }

      console.log(`[LessonNotifications] Processing ${pendingNotifications.length} pending notifications`);

      for (const notification of pendingNotifications) {
        try {
          const course = await storage.getCourse(notification.courseId);
          if (!course) {
            console.error(`[LessonNotifications] Course ${notification.courseId} not found`);
            await storage.markPendingLessonNotificationAsProcessed(notification.id);
            continue;
          }

          const lessonCount = notification.lessonIds.length;
          const lessonWord = lessonCount === 1 
            ? 'урок' 
            : lessonCount < 5 
            ? 'урока' 
            : 'уроков';

          const title = `Новые ${lessonWord} в курсе`;
          const message = `В курсе "${course.title}" вышло ${lessonCount} ${lessonWord === 'урок' ? 'новый' : lessonCount < 5 ? 'новых' : 'новых'} ${lessonWord}!`;

          const purchases = await storage.getPurchasesByCourse(notification.courseId);
          
          console.log(`[LessonNotifications] Sending notifications to ${purchases.length} users for course ${course.title}`);

          for (const purchase of purchases) {
            await storage.createNotification({
              userId: purchase.userId,
              type: 'new_lessons',
              title,
              message,
              relatedId: notification.courseId,
              relatedType: 'course',
              isRead: false,
            });
          }

          await storage.markPendingLessonNotificationAsProcessed(notification.id);
          console.log(`[LessonNotifications] Processed notification for course ${course.title} (${lessonCount} ${lessonWord})`);
        } catch (error) {
          console.error(`[LessonNotifications] Error processing notification ${notification.id}:`, error);
        }
      }
    } catch (error) {
      console.error('[LessonNotifications] Error in processNotifications:', error);
    } finally {
      this.isProcessing = false;
    }
  }
}

export const lessonNotificationScheduler = new LessonNotificationScheduler();
