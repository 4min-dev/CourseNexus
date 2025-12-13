// videoProcessingQueue.ts
import { db } from './db';
import { lessons } from '@shared/schema';
import { eq, or } from 'drizzle-orm';
import { VideoConverter } from './videoConverter';

const MAX_CONCURRENT = 3;

interface QueueItem {
  lessonId: string;
  videoUrl: string;
  userId: string;
}

class VideoProcessingQueue {
  private queue: QueueItem[] = [];
  private activeTasks = 0;
  private restoreInProgress = false;
  private converter: VideoConverter;

  constructor() {
    this.converter = new VideoConverter();
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
      this.queue = [];

      for (const lesson of pending) {
        if (lesson.status === 'processing') {
          await db
            .update(lessons)
            .set({ processingStatus: 'queued' })
            .where(eq(lessons.id, lesson.id));
        }

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

    const [current] = await db
      .select({ status: lessons.processingStatus })
      .from(lessons)
      .where(eq(lessons.id, lessonId))
      .limit(1);

    if (current?.status === 'ready') {
      console.log(`[VideoQueue] Урок ${lessonId} уже готов — пропускаем`);
      return;
    }

    if (['queued', 'processing'].includes(current?.status || '')) {
      console.log(`[VideoQueue] Урок ${lessonId} уже в очереди или обрабатывается`);
      return;
    }

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

    if (!this.queue.some(i => i.lessonId === lessonId)) {
      this.queue.push({ lessonId, videoUrl: url, userId });
      console.log(`[VideoQueue] Урок ${lessonId} добавлен в очередь (позиция: ${this.queue.length})`);
    }

    this.tryProcessNext();
  }

  private tryProcessNext() {
    if (this.activeTasks >= MAX_CONCURRENT || this.queue.length === 0) {
      return;
    }

    this.activeTasks++;
    const item = this.queue.shift()!;

    console.log(`[VideoQueue] Запуск конвертации (активно: ${this.activeTasks}/${MAX_CONCURRENT}): ${item.lessonId}`);


    db.update(lessons)
      .set({ processingStatus: 'processing' })
      .where(eq(lessons.id, item.lessonId))
      .catch(console.error);


    this.converter.convertVideo(item.videoUrl, item.lessonId, item.userId)
      .finally(() => {
        this.activeTasks--;
        console.log(`[VideoQueue] Завершена задача ${item.lessonId} (активно осталось: ${this.activeTasks})`);
        this.tryProcessNext();
      });
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

export const videoQueue = new VideoProcessingQueue();