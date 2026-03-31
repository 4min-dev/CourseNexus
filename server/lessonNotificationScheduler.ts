import { db } from './db'
import { storage } from './storage'
import { users, purchases } from '@shared/schema'
import { and, eq, isNotNull } from 'drizzle-orm'
import { sendTelegramMessage } from './telegram'

class LessonNotificationScheduler {
  private intervalId: NodeJS.Timeout | null = null
  private isProcessing = false

  start() {
    console.log('[LessonNotifications] Starting notification scheduler...')

    const now = new Date()
    const moscowOffset = 3 * 60
    const targetHour = 12
    const targetMinute = 0

    const nextRun = new Date(now)
    nextRun.setUTCHours(targetHour - moscowOffset / 60, targetMinute, 0, 0)

    if (nextRun < now) {
      nextRun.setUTCDate(nextRun.getUTCDate() + 1)
    }

    const delay = nextRun.getTime() - now.getTime()

    setTimeout(() => {
      this.processNotifications()
      this.intervalId = setInterval(() => {
        this.processNotifications()
      }, 24 * 60 * 60 * 1000)
    }, delay)

    this.processNotifications()
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
      console.log('[LessonNotifications] Notification scheduler stopped')
    }
  }

  public async processNotifications() {
    if (this.isProcessing) {
      console.log('[LessonNotifications] Already processing, skipping...')
      return
    }

    this.isProcessing = true

    try {
      const pendingNotifications = await storage.getPendingLessonNotificationsToProcess()

      if (pendingNotifications.length === 0) {
        console.log('[LessonNotifications] No pending notifications to process')
        return
      }

      console.log(`[LessonNotifications] Processing ${pendingNotifications.length} pending notifications`)

      for (const notification of pendingNotifications) {
        try {
          const course = await storage.getCourse(notification.courseId)
          if (!course) {
            console.error(`[LessonNotifications] Course ${notification.courseId} not found`)
            await storage.markPendingLessonNotificationAsProcessed(notification.id)
            continue
          }

          const lessonCount = notification.lessonIds.length

          const lessonWordLower = lessonCount === 1
            ? 'новый урок'
            : lessonCount < 5
              ? 'новых урока'
              : 'новых уроков'

          const lessonWordCapital = lessonCount === 1
            ? 'Новый урок'
            : lessonCount < 5
              ? 'Новых урока'
              : 'Новых уроков'

          const body = `В твоем курсе «${course.title}» только что ${lessonCount === 1 ? 'вышел' : 'вышло'} ${lessonCount} ${lessonWordLower}! 🔥\n\nСвежий контент уже ждёт тебя — не пропусти обновление.`

          const siteTitle = `${lessonWordCapital} в курсе`
          const siteMessage = body

          const coursePurchases = await storage.getPurchasesByCourse(notification.courseId)

          console.log(`[LessonNotifications] Sending site notifications to ${coursePurchases.length} users for course ${course.title}`)

          for (const purchase of coursePurchases) {
            await storage.createNotification(
              {
                userId: purchase.userId,
                type: 'new_lessons',
                title: siteTitle,
                message: siteMessage,
                relatedId: notification.courseId,
                relatedType: 'course',
                isRead: false
              },
              { skipTelegram: true }
            )
          }

          const telegramMessage = `${body}\n<a href="https://go.vkurse.io/library/${course.id}">Перейти к курсу и смотреть новые уроки</a>`

          const telegramRecipients = await db
            .select({
              userId: users.id,
              telegramChatId: users.telegramChatId
            })
            .from(users)
            .innerJoin(purchases, eq(purchases.userId, users.id))
            .where(
              and(
                eq(purchases.courseId, notification.courseId),
                isNotNull(users.telegramChatId)
              )
            )

          console.log(`[LessonNotifications] Found ${telegramRecipients.length} Telegram recipients for course ${course.title}`)

          for (const recipient of telegramRecipients) {
            if (!recipient.telegramChatId) continue

            try {
              const success = await sendTelegramMessage(recipient.telegramChatId, telegramMessage)

              if (success) {
                console.log(`[LessonNotify] Telegram sent to user ${recipient.userId} for course ${course.id}`)
              }

              await new Promise(resolve => setTimeout(resolve, 800))
            } catch (tgError) {
              console.error(`[LessonNotify] Failed to send Telegram to ${recipient.userId}:`, tgError)
            }
          }

          await storage.markPendingLessonNotificationAsProcessed(notification.id)
          console.log(`[LessonNotifications] Processed notification for course ${course.title} (${lessonCount} ${lessonWordLower})`)

        } catch (error) {
          console.error(`[LessonNotifications] Error processing notification ${notification.id}:`, error)
        }
      }
    } catch (globalError) {
      console.error('[LessonNotifications] Global error in processNotifications:', globalError)
    } finally {
      this.isProcessing = false
    }
  }
}

export const lessonNotificationScheduler = new LessonNotificationScheduler()