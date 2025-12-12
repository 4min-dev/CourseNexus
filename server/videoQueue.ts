import { db } from './db';
import { lessons } from '@shared/schema';
import { eq, or } from 'drizzle-orm';

const MAX_CONCURRENT = 4;

interface QueueItem {
  lessonId: string;
  videoUrl: string;
  userId: string;
}

class VideoProcessingQueue {
  private queue: QueueItem[] = [];
  private activeTasks = 0;
  private restoreInProgress = false;

  constructor() {
    this.restoreQueueFromDatabase();
  }

  async restoreQueueFromDatabase() {
    if (this.restoreInProgress) return;
    this.restoreInProgress = true;

    try {
      console.log('[VideoQueue] Восстановление очереди из базы...');

      const pending = await db
        .select({
          id: lessons.id,
          videoUrl: lessons.videoUrl,
          uploadedBy: lessons.uploadedBy,
          status: lessons.processingStatus,
        })
        .from(lessons)
        .where(
          or(
            eq(lessons.processingStatus, 'queued'),
            eq(lessons.processingStatus, 'processing')
          )
        );

      if (pending.length === 0) {
        console.log('[VideoQueue] Очередь пуста');
        return;
      }

      console.log(`[VideoQueue] Найдено ${pending.length} задач для восстановления`);

      // Очищаем старую очередь
      this.queue = [];

      for (const lesson of pending) {
        // Если был в processing — возвращаем в queued
        if (lesson.status === 'processing') {
          await db
            .update(lessons)
            .set({ processingStatus: 'queued' })
            .where(eq(lessons.id, lesson.id));
        }

        // Защита: если вдруг нет ссылки — скипаем
        if (!lesson.videoUrl || !lesson.uploadedBy) {
          console.warn(`[VideoQueue] Пропуск урока ${lesson.id} — нет videoUrl или uploadedBy`);
          continue;
        }

        this.queue.push({
          lessonId: lesson.id,
          videoUrl: lesson.videoUrl,
          userId: lesson.uploadedBy,
        });
      }

      console.log(`[VideoQueue] Восстановлено ${this.queue.length} задач`);
      this.tryProcessNext();
    } catch (error: any) {
      console.error('[VideoQueue] Ошибка восстановления:', error.message);
    } finally {
      this.restoreInProgress = false;
    }
  }

  async addToQueue(lessonId: string, videoUrl: string, userId: string) {
    const url = videoUrl.replace('vkurse/vkurse', 'vkurse').trim();

    if (!url) {
      console.error(`[VideoQueue] Пустая ссылка для урока ${lessonId}`);
      return;
    }

    // Проверяем текущийся статус
    const [current] = await db
      .select({ status: lessons.processingStatus })
      .from(lessons)
      .where(eq(lessons.id, lessonId))
      .limit(1);

    if (current?.status === 'ready') {
      console.log(`[VideoQueue] Урок ${lessonId} уже готов (ready) — пропускаем`);
      return;
    }

    if (['queued', 'processing'].includes(current?.status || '')) {
      console.log(`[VideoQueue] Урок ${lessonId} уже в очереди или обрабатывается`);
      return;
    }

    // Обновляем статус и данные
    await db
      .update(lessons)
      .set({
        processingStatus: 'queued',
        videoUrl: url,
        uploadedBy: userId,
        conversionProgress: 0,
        errorMessage: null,
      })
      .where(eq(lessons.id, lessonId));

    // Защита от дублей
    if (!this.queue.some(i => i.lessonId === lessonId)) {
      this.queue.push({ lessonId, videoUrl: url, userId });
      console.log(`[VideoQueue] Урок ${lessonId} добавлен в очередь (позиция: ${this.queue.length})`);
    }

    this.tryProcessNext();
  }

  private async tryProcessNext() {
    // Если лимит достигнут или очередь пуста — выходим
    if (this.activeTasks >= MAX_CONCURRENT || this.queue.length === 0) {
      return;
    }

    // Берём одну задачу
    this.activeTasks++;
    const item = this.queue.shift()!;

    // Запускаем и забыв (fire and forget), finally сам всё сделает
    this.processItem(item).finally(() => {
      this.activeTasks--;
      this.tryProcessNext(); // ← рекурсивно запускаем следующую
    });
  }

  private async processItem(item: QueueItem) {
    try {
      // КРИТИЧЕСКАЯ ПРОВЕРКА: если лимит уже достигнут — откатываемся
      if (this.activeTasks > MAX_CONCURRENT) {
        console.warn(`[VideoQueue] Превышен лимит задач (${this.activeTasks}/${MAX_CONCURRENT}). Отменяем обработку ${item.lessonId}`);

        // Возвращаем задачу обратно в очередь (в начало!)
        this.queue.unshift(item);
        this.activeTasks--; // потому что мы увеличили счётчик перед вызовом processItem
        return;
      }

      console.log(`Начинаем обработку (активно: ${this.activeTasks}): ${item.lessonId}`);

      const response = await fetch('http://192.144.59.161:3001/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceUrl: item.videoUrl,
          lessonId: item.lessonId,
          userId: item.userId,
        }),
        timeout: 30_000,
      });

      if (!response.ok) {
        throw new Error(`GPU сервер ответил ${response.status}`);
      }

      const ack = await response.json();
      if (!ack.success) {
        throw new Error(ack.error || 'GPU отказался принять задачу');
      }

      console.log(`Задача ${item.lessonId} успешно принята GPU`);


    } catch (error: any) {
      console.error(`[GPU] Ошибка обработки ${item.lessonId}:`, error.message);

      // Только если мы успели поставить processing — возвращаем в failed
      await db.update(lessons)
        .set({
          processingStatus: 'failed',
          errorMessage: error.message || 'Ошибка при отправке на обработку',
        })
        .where(eq(lessons.id, item.lessonId))
        .catch(() => { });

    } finally {
      // В любом случае уменьшаем счётчик и пробуем взять следующую
      this.activeTasks--;
      this.tryProcessNext();
    }
  }

  getQueueLength() {
    return this.queue.length;
  }

  getActiveCount() {
    return this.activeTasks;
  }

  getQueuePosition(lessonId: string) {
    const pos = this.queue.findIndex(i => i.lessonId === lessonId);
    return pos === -1 ? -1 : pos + 1;
  }
}

export const videoQueue = new VideoProcessingQueue()