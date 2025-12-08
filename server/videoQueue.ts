import { VideoConverter } from './videoConverter';
import { db } from './db';
import { lessons, courseSections } from '@shared/schema';
import { eq, and, isNotNull } from 'drizzle-orm';

interface QueueItem {
  lessonId: string;
  videoUrl: string;
  originalFileName: string;
  userId: string;
}

class VideoProcessingQueue {
  private queue: QueueItem[] = [];
  private isProcessing = false;
  private converter: VideoConverter;
  private restoreInProgress = false;

  constructor() {
    this.converter = new VideoConverter();
    this.restoreQueueFromDatabase();
  }

  public async restoreQueueFromDatabase() {
    if (this.restoreInProgress) return;
    this.restoreInProgress = true;

    try {
      console.log('[VideoQueue] Restoring queue from database...');

      const { or } = await import('drizzle-orm');


      const lessonsToRestore = await db
        .select()
        .from(lessons)
        .where(

          and(
            isNotNull(lessons.videoUrl),
            or(
              eq(lessons.processingStatus, 'queued'),
              eq(lessons.processingStatus, 'processing')
            )
          )

        );

      if (lessonsToRestore.length > 0) {
        console.log(`[VideoQueue] Found ${lessonsToRestore.length} videos to restore`);


        for (const lesson of lessonsToRestore) {
          if (lesson.processingStatus === 'processing') {
            await db.update(lessons)
              .set({ processingStatus: 'queued' })
              .where(eq(lessons.id, lesson.id));
            console.log(`[VideoQueue] Reset crashed lesson ${lesson.id} from processing to queued`);
          }


          if (!lesson.uploadedBy) {
            console.warn(`[VideoQueue] Skipping lesson ${lesson.id} - missing uploadedBy field. Use mass reprocess endpoint to fix.`);

            await db.update(lessons)
              .set({
                processingStatus: 'failed',
                errorMessage: 'Missing uploadedBy - use mass reprocess to fix'
              })
              .where(eq(lessons.id, lesson.id));
            continue;
          }

          this.queue.push({
            lessonId: lesson.id,
            videoUrl: lesson.videoUrl,
            originalFileName: 'video.mp4',
            userId: lesson.uploadedBy
          });
        }

        console.log(`[VideoQueue] Restored ${this.queue.length} videos to queue`);

        if (!this.isProcessing) {
          this.processNext();
        }
      } else {
        console.log('[VideoQueue] No queued/processing videos found');
      }
    } catch (error) {
      console.error('[VideoQueue] Failed to restore queue:', error);
    } finally {
      this.restoreInProgress = false;
    }
  }

  async addToQueue(lessonId: string, videoUrl: string, originalFileName: string, userId: string) {
    console.log(`Adding lesson ${lessonId} to video processing queue`);

    this.queue.push({ lessonId, videoUrl, originalFileName, userId });

    const clearedVideoUrl = videoUrl.replace('vkurse/vkurse', 'vkurse')

    await db.update(lessons)
      .set({
        processingStatus: 'queued',
        uploadProgress: 0,
        uploadedBy: userId,
        videoUrl: clearedVideoUrl
      })
      .where(eq(lessons.id, lessonId));

    if (!this.isProcessing) {
      setImmediate(() => this.processNext());
    }
  }

  private async processNext() {
    if (this.isProcessing || this.queue.length === 0) {
      if (this.queue.length === 0) this.isProcessing = false;
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift()!;

      try {
        await db.update(lessons)
          .set({ processingStatus: 'processing' })
          .where(eq(lessons.id, item.lessonId));

        await this.converter.convertVideo(item.videoUrl, item.lessonId, item.userId);
      } catch (error) {
        console.error(`[VideoQueue] Error processing ${item.lessonId}:`, error);
        await db.update(lessons)
          .set({
            processingStatus: 'failed',
            errorMessage: error instanceof Error ? error.message : String(error)
          })
          .where(eq(lessons.id, item.lessonId));
      }
    }

    this.isProcessing = false;
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  getQueuePosition(lessonId: string): number {
    const index = this.queue.findIndex(item => item.lessonId === lessonId);
    return index === -1 ? -1 : index + 1;
  }
}


export const videoQueue = new VideoProcessingQueue();
