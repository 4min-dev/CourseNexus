// server/videoConverter.ts
import { spawn } from 'child_process';
import { createWriteStream, unlinkSync, existsSync, createReadStream } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import fetch from 'node-fetch';
import { db, sql } from './db';
import { lessons } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { S3Client } from '@aws-sdk/client-s3';

export class VideoConverter {

  private getS3Client() {
    if (!process.env.CDNNOW_KEY || !process.env.CDNNOW_SECRET) {
      throw new Error("CDNNOW_KEY или CDNNOW_SECRET не установлены в окружении воркера!");
    }

    return new S3Client({
      region: "ru-central-1",
      endpoint: "https://s3.ru-central-1.nowcdn.co",
      credentials: {
        accessKeyId: process.env.CDNNOW_KEY!,
        secretAccessKey: process.env.CDNNOW_SECRET!,
      },
      forcePathStyle: true,
    });
  }

  async convertVideo(
    sourceUrl: string,
    lessonId: string,
    userId: string
  ): Promise<{ success: boolean; convertedUrl?: string; duration?: number; error?: string }> {
    const tempInput = join(tmpdir(), `input-${randomUUID()}.mp4`);
    const tempOutput = join(tmpdir(), `output-${randomUUID()}.mp4`);

    try {
      if (!sourceUrl || typeof sourceUrl !== 'string') {
        throw new Error('sourceUrl is missing or not a string');
      }

      // Нормализация URL
      let url = sourceUrl.trim();
      url = url.replace(/vkurse\/vkurse/g, 'vkurse');

      if (!url.startsWith('http')) {
        url = 'https://' + url;
      }
      if (!url.includes('cdn.go')) {
        url = 'https://cdn.go.vkurse.io/' + url.replace(/^\/+/, '');
      }

      // КРИТИЧЕСКАЯ ПРОВЕРКА: есть ли имя файла?
      const filename = url.split('/').pop();
      if (!filename || filename.includes('?') || !filename.includes('.') || filename.length < 3) {
        throw new Error(`Invalid video URL — missing or invalid filename: ${url}`);
      }

      console.log('[VideoConverter] Скачиваем видео:', url);
      await this.downloadFromYandexCloud(url, tempInput);

      const duration = await this.getDuration(tempInput);
      console.log(`[VideoConverter] Длительность: ${duration} мин`);

      console.log('[VideoConverter] Конвертируем...');
      await this.ffmpegConvert(tempInput, tempOutput, lessonId);

      // Загружаем конвертированное видео обратно в тот же бакет
      const convertedKey = `processed/${lessonId}-${Date.now()}.mp4`;
      const convertedUrl = await this.uploadToYandexCloud(tempOutput, convertedKey);

      // Обновляем урок
      await db.update(lessons).set({
        videoUrl: convertedUrl,
        duration,
        processingStatus: 'ready',
        uploadProgress: 100,
        errorMessage: null,
      }).where(eq(lessons.id, lessonId));

      console.log('[VideoConverter] Готово! URL:', convertedUrl);
      this.cleanup(tempInput, tempOutput);

      return { success: true, convertedUrl, duration };
    } catch (error: any) {
      console.log(error)
      console.error('[VideoConverter] Ошибка:', error.message);

      await db.update(lessons).set({
        processingStatus: 'failed',
        errorMessage: error.message || 'Ошибка конвертации',
      }).where(eq(lessons.id, lessonId));

      this.cleanup(tempInput, tempOutput);
      return { success: false, error: error.message };
    }
  }

  private async downloadFromYandexCloud(sourceUrl: string, outputPath: string) {
    console.log(sourceUrl)
    console.log('[VideoConverter] Скачиваем по HTTP:', sourceUrl);

    const response = await fetch(sourceUrl);

    if (!response.ok || !response.body) {
      throw new Error(`Не удалось скачать видео: ${response.status} ${response.statusText}`);
    }

    return new Promise((resolve, reject) => {
      const stream = createWriteStream(outputPath);
      response.body!.pipe(stream);
      stream.on('finish', resolve);
      stream.on('error', reject);
    });
  }

  private async uploadToYandexCloud(filePath: string, key: string) {
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');

    const s3 = this.getS3Client()

    await s3.send(new PutObjectCommand({
      Bucket: process.env.NOWCDN_BUCKET!,
      Key: key,
      Body: createReadStream(filePath),
      ContentType: 'video/mp4',
      ACL: 'public-read',
    }));

    return `https://cdn.go.vkurse.io/${key}`;
  }

  private getDuration(inputPath: string): Promise<number> {
    return new Promise((resolve) => {
      const ffprobe = spawn('/usr/bin/ffprobe', [
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        inputPath
      ]);

      let output = '';
      ffprobe.stdout.on('data', (d) => output += d.toString());
      ffprobe.on('close', () => {
        const seconds = parseFloat(output.trim()) || 60;
        resolve(Math.max(1, Math.ceil(seconds / 60)));
      });
      ffprobe.on('error', () => resolve(1));
    });
  }

  private ffmpegConvert(input: string, output: string, lessonId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = [
        '-i', input,
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '23',
        '-movflags', '+faststart',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
        '-threads', '4',
        '-progress', 'pipe:1',
        '-y',
        output
      ];

      const ffmpeg = spawn('cpulimit', [
        '-l', '180',
        '--',
        '/usr/bin/ffmpeg',
        ...args
      ]);

      let durationSec = 0;
      let lastProgress = -1;           // Чтобы не спамить одинаковыми значениями
      let lastUpdate = Date.now();
      const MIN_UPDATE_INTERVAL = 5000; // Обновляем не чаще, чем раз в 5 сек

      // 1. Получаем длительность из stderr
      ffmpeg.stderr.on('data', (data) => {
        const line = data.toString();
        const durationMatch = line.match(/Duration: (\d{2}):(\d{2}):(\d{2})\.\d+/);
        if (durationMatch && durationSec === 0) {
          const [h, m, s] = durationMatch.slice(1).map(Number);
          durationSec = h * 3600 + m * 60 + s;
          console.log(`[FFmpeg] Длительность видео: ${durationSec} сек (${lessonId})`);
        }

        // Опционально: логируем только ключевые строки
        if (line.includes('frame=') || line.includes('bitrate=')) {
          console.log(`[FFmpeg] ${line.trim()}`);
        }
      });

      // 2. Парсим прогресс из stdout (благодаря -progress pipe:1)
      let buffer = '';
      ffmpeg.stdout.on('data', async (data) => {
        buffer += data.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Последняя строка может быть неполной

        let currentSec = 0;

        for (const line of lines) {
          if (line.startsWith('out_time_ms=')) {
            const ms = parseInt(line.split('=')[1], 10);
            if (!isNaN(ms)) {
              currentSec = ms / 1_000_000;
            }
          }
        }

        if (durationSec > 0 && currentSec > 0) {
          const progress = Math.floor((currentSec / durationSec) * 100);
          const now = Date.now();

          // Обновляем только если:
          // - прогресс изменился хотя бы на 1%
          // - или прошло минимум 5 секунд
          if (progress > lastProgress && now - lastUpdate >= MIN_UPDATE_INTERVAL) {
            lastProgress = progress;
            lastUpdate = now;

            await db.execute(sql`
                        UPDATE lessons 
                        SET "conversionProgress" = ${progress}
                        WHERE id = ${lessonId}
                    `).catch(err => {
              console.error(`[GPU] Не удалось обновить прогресс для ${lessonId}:`, err.message);
            });

            console.log(`[GPU] Конвертация ${lessonId}: ${progress}%`);
          }
        }
      });

      // 3. Успешное завершение
      ffmpeg.on('close', async (code) => {
        if (code === 0) {
          // Финальное обновление на 100%
          await db.execute(sql`
                    UPDATE lessons 
                    SET "conversionProgress" = 100
                    WHERE id = ${lessonId}
                `).catch(() => { });

          console.log(`[GPU] Конвертация завершена успешно: ${lessonId}`);
          resolve();
        } else {
          reject(new Error(`FFmpeg завершился с кодом ${code}`));
        }
      });

      ffmpeg.on('error', (err) => {
        reject(err);
      });
    });
  }

  private cleanup(...paths: string[]) {
    paths.forEach(path => {
      if (existsSync(path)) {
        try { unlinkSync(path); } catch { }
      }
    });
  }
}