// server/videoConverter.ts
import { spawn } from 'child_process';
import { createWriteStream, unlinkSync, existsSync, createReadStream } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import fetch from 'node-fetch';
import { db } from './db';
import { lessons } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { s3Client } from './s3Client';
import { GetObjectCommand, HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';

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
      if (!url.includes('nowcdn.co')) {
        url = 'https://p40911.nowcdn.co/' + url.replace(/^\/+/, '');
      }

      // КРИТИЧЕСКАЯ ПРОВЕРКА: есть ли имя файла?
      const filename = url.split('/').pop();
      if (!filename || filename.includes('?') || !filename.includes('.') || filename.length < 3) {
        throw new Error(`Invalid video URL — missing or invalid filename: ${url}`);
      }

      if (!url.startsWith('https://p40911.nowcdn.co/')) {
        throw new Error(`Invalid video URL domain: ${url}`);
      }

      console.log('[VideoConverter] Скачиваем видео:', url);
      await this.downloadFromYandexCloud(url, tempInput);

      const duration = await this.getDuration(tempInput);
      console.log(`[VideoConverter] Длительность: ${duration} мин`);

      console.log('[VideoConverter] Конвертируем...');
      await this.ffmpegConvert(tempInput, tempOutput);

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

    return `https://p40911.nowcdn.co/${key}`;
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

  private ffmpegConvert(input: string, output: string): Promise<void> {
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
        '-y',
        output
      ];

      const ffmpeg = spawn('/usr/bin/ffmpeg', args);
      ffmpeg.stderr.on('data', (data) => {
        const line = data.toString();
        if (line.includes('time=')) {
          console.log('[FFmpeg]', line.trim());
        }
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`FFmpeg exited with code ${code}`));
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