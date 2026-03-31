import { db } from './db'
import { courses, users, notifications } from '@shared/schema'
import { desc, gte, isNotNull } from 'drizzle-orm'
import { sendTelegramMessage } from './telegram'

// Простая функция для удаления HTML-тегов
function stripHtml(html: string | null | undefined): string {
    if (!html) return ''
    return html.replace(/<[^>]+>/g, '').trim()
}

export async function sendNewCoursesNotification() {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    const newCourses = await db
        .select({
            id: courses.id,
            title: courses.title,
            author_name: courses.authorName,
            description: courses.description
        })
        .from(courses)
        .where(gte(courses.createdAt, yesterday))
        .orderBy(desc(courses.createdAt))
        .limit(3)

    if (newCourses.length === 0) {
        console.log('[NewCourses] Нет новых курсов за последние 24 часа')
        return
    }

    let siteMessage = ''

    // Текст для Telegram с HTML-ссылкой в конце
    let telegramMessage = 'Новые курсы в продаже 🔥 горячие новинки:\n\n'

    newCourses.forEach((course, index) => {
        const num = index + 1
        const link = `https://vkurse.io/course/${course.id}`

        // Очищаем описание от тегов
        const cleanDesc = stripHtml(course.description)

        const courseLine = `${num}. ${course.title} — ${course.author_name || 'Автор'}\n${cleanDesc || 'Курс нового уровня'}\n${link}\n\n`

        siteMessage += courseLine
        telegramMessage += courseLine
    })

    telegramMessage += 'Не пропусти, пока цены стартовые → <a href="https://go.vkurse.io/shop">[Все новинки]</a>🚀'

    // 1. Отправка в Telegram
    const recipients = await db
        .select({ telegramChatId: users.telegramChatId })
        .from(users)
        .where(isNotNull(users.telegramChatId))

    console.log(`[NewCourses] Отправка ${recipients.length} получателям в Telegram`)

    for (const r of recipients) {
        if (!r.telegramChatId) continue

        try {
            await sendTelegramMessage(r.telegramChatId, telegramMessage)
            await new Promise(resolve => setTimeout(resolve, 600))
        } catch (err) {
            console.error(`[NewCourses] Ошибка отправки ${r.telegramChatId}:`, err)
        }
    }

    // 2. Уведомления на сайте — каждому пользователю
    const allUsers = await db
        .select({ id: users.id })
        .from(users)

    console.log(`[NewCourses] Создание уведомлений на сайте для ${allUsers.length} пользователей`)

    for (const user of allUsers) {
        try {
            await db.insert(notifications).values({
                userId: user.id,
                type: 'new_courses',
                title: 'Новые курсы в продаже 🔥',
                relatedId: null,
                relatedType: 'shop',
                message: siteMessage,
                isRead: false
            })
        } catch (err) {
            console.error(`[NewCourses] Ошибка создания уведомления для user ${user.id}:`, err)
        }
    }

    console.log('[NewCourses] Уведомление о новых курсах обработано')
}