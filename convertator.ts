
import { spawn } from 'child_process';
import { createWriteStream, unlinkSync, existsSync, createReadStream } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import fetch from 'node-fetch';
import { db, sql } from './db'; // ← sql обязателен!
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import express from 'express';

const app = express();
app.use(express.json({ limit: '200mb' }));

class VideoConverter {
    private activeConversions = 0;
    private readonly MAX_CONCURRENT = 4;

    private getS3Client() {
        if (!process.env.CDNNOW_KEY || !process.env.CDNNOW_SECRET) {
            throw new Error("CDNNOW_KEY или CDNNOW_SECRET не установлены!");
        }
        return new S3Client({
            region: "ru-central-1",
            endpoint: "https://s3.ru-central-1.nowcdn.co",
            credentials: {
                accessKeyId: process.env.CDNNOW_KEY,
                secretAccessKey: process.env.CDNNOW_SECRET,
            },
            forcePathStyle: true,
        });
    }

    async convertVideo(sourceUrl: string, lessonId: string, userId: string) {
        while (this.activeConversions >= this.MAX_CONCURRENT) {
            console.log(`[GPU] Ожидание слота... Активно: ${this.activeConversions}/4`);
            await new Promise(r => setTimeout(r, 3000));
        }

        this.activeConversions++;
        console.log(`[GPU] Запуск ${lessonId} | Активно: ${this.activeConversions}/4`);

        const timeout = setTimeout(() => {
            console.error(`[GPU] ТАЙМАУТ 40 минут — освобождаем слот для ${lessonId}`);
            this.activeConversions--;
        }, 40 * 60 * 1000);

        const tempInput = join(tmpdir(), `input-${randomUUID()}.mp4`);
        const tempOutput = join(tmpdir(), `output-${randomUUID()}.mp4`);

        try {
            let url = sourceUrl.trim().replace(/vkurse\/vkurse/g, 'vkurse');
            if (!url.startsWith('http')) url = 'https://' + url;
            if (!url.includes('nowcdn.co')) url = 'https://p40911.nowcdn.co/' + url.replace(/^\/+/, '');

            await db.execute(sql`
        UPDATE lessons
        SET "processing_status" = 'processing', "conversionProgress" = 0
        WHERE id = ${lessonId}
      `);

            console.log('[GPU] Скачиваем:', url);
            await this.download(url, tempInput);

            // ПРОВЕРЯЕМ КОДЕК — главное нововведение!
            const codec = await this.getVideoCodec(tempInput);
            console.log(`[GPU] Обнаружен кодек: ${codec}`);

            let finalUrl: string;
            let duration: number;

            if (codec === 'h264' || codec === 'avc' || codec === 'avc1') {
                // Уже H.264 — НЕ перекодируем!
                console.log('[GPU] Видео уже в H.264 — пропускаем конвертацию');
                duration = await this.getDuration(tempInput);
                finalUrl = url; // возвращаем оригинальную ссылку

                await db.execute(sql`
          UPDATE lessons
          SET
            "video_url" = ${finalUrl},
            duration = ${duration},
            "processing_status" = 'ready',
            "upload_progress" = 100,
            "conversionProgress" = 100,
            "error_message" = NULL
          WHERE id = ${lessonId}
        `);

                console.log(`[GPU] ГОТОВО БЕЗ КОНВЕРТАЦИИ ${lessonId} → ${finalUrl}`);
                this.cleanup(tempInput);
                return { success: true, convertedUrl: finalUrl, duration };
            }

            // Если НЕ H.264 — конвертируем как раньше
            console.log('[GPU] Кодек не H.264 — начинаем перекодировку');
            duration = await this.getDuration(tempInput);
            console.log(`[GPU] Длительность: ${duration} мин`);

            await this.ffmpegConvert(tempInput, tempOutput, lessonId);

            const key = `processed/${lessonId}-${Date.now()}.mp4`;
            finalUrl = await this.upload(tempOutput, key);

            await db.execute(sql`
        UPDATE lessons
        SET
          "video_url" = ${finalUrl},
          duration = ${duration},
          "processing_status" = 'ready',
          "upload_progress" = 100,
          "conversionProgress" = 100,
          "error_message" = NULL
        WHERE id = ${lessonId}
      `);

            console.log(`[GPU] ГОТОВО (перекодировано) ${lessonId} → ${finalUrl}`);
            return { success: true, convertedUrl: finalUrl, duration };

        } catch (error: any) {
            console.error(`[GPU] ОШИБКА ${lessonId}:`, error.message);
            await db.execute(sql`
        UPDATE lessons
        SET
          "processing_status" = 'failed',
          "conversionProgress" = 0,
          "error_message" = ${error.message.slice(0, 500)}
        WHERE id = ${lessonId}
      `).catch(() => { });
            return { success: false, error: error.message };
        } finally {
            clearTimeout(timeout);
            this.cleanup(tempInput, tempOutput);
            this.activeConversions--;
            console.log(`[GPU] Завершено ${lessonId} | Активно: ${this.activeConversions}/4`);
        }
    }

    // НОВЫЙ МЕТОД — надёжно определяет кодек
    private getVideoCodec(path: string): Promise<string> {
        return new Promise((resolve) => {
            const ffprobe = spawn('/usr/bin/ffprobe', [
                '-v', 'error',
                '-select_streams', 'v:0',
                '-show_entries', 'stream=codec_name',
                '-of', 'csv=p=0:s=x',
                path
            ]);

            let output = '';
            let stderrOutput = '';

            ffprobe.stdout.on('data', (d) => output += d.toString());
            ffprobe.stderr.on('data', (d) => stderrOutput += d.toString());

            ffprobe.on('close', () => {
                if (output.trim()) {
                    const codec = output.trim().toLowerCase();
                    console.log(`[GPU] Кодек (stdout): ${codec}`);
                    return resolve(codec);
                }

                // Парсим stderr
                const match = stderrOutput.match(/Video: (\w+)/i);
                if (match) {
                    const codec = match[1].toLowerCase();
                    console.log(`[GPU] Кодек (stderr): ${codec}`);
                    return resolve(codec);
                }

                console.log('[GPU] Кодек не найден — будем считать, что нужен перекод');
                resolve('unknown');
            });

            ffprobe.on('error', () => resolve('unknown'));
        });
    }

    private async download(url: string, path: string) {
        const res = await fetch(url);
        if (!res.ok || !res.body) throw new Error(`Download failed: ${res.status}`);
        await new Promise((resolve, reject) => {
            const file = createWriteStream(path);
            res.body!.pipe(file);
            file.on('finish', resolve);
            file.on('error', reject);
        });
    }

    private async upload(filePath: string, key: string) {
        const s3 = this.getS3Client();
        await s3.send(new PutObjectCommand({
            Bucket: process.env.NOWCDN_BUCKET!,
            Key: key,
            Body: createReadStream(filePath),
            ContentType: 'video/mp4',
            ACL: 'public-read',
        }));
        return `https://p40911.nowcdn.co/${key}`;
    }

    private getDuration(path: string): Promise<number> {
        return new Promise(resolve => {
            const ffprobe = spawn('/usr/bin/ffprobe', [
                '-v', 'error',
                '-show_entries', 'format=duration',
                '-of', 'default=noprint_wrappers=1:nokey=1',
                path
            ]);
            let out = '';
            ffprobe.stdout.on('data', d => out += d);
            ffprobe.on('close', () => {
                const seconds = parseFloat(out.trim()) || 60;
                const minutes = Number((seconds / 60).toFixed(2));
                console.log(`[GPU] Длительность: ${seconds.toFixed(2)} сек → ${minutes} мин`);
                resolve(minutes);
            });
            ffprobe.on('error', () => resolve(10));
        });
    }

    private ffmpegConvert(input: string, output: string, lessonId: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const args = [
                '-i', input,
                '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
                '-movflags', '+faststart',
                '-c:a', 'aac', '-b:a', '128k',
                '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
                '-progress', 'pipe:1',
                '-y', output
            ];

            const ffmpeg = spawn('/usr/bin/ffmpeg', args);

            let durationSec = 0;
            let lastUpdate = Date.now();

            // Duration из stderr
            ffmpeg.stderr.on('data', data => {
                const line = data.toString();
                const match = line.match(/Duration: (\d{2}):(\d{2}):(\d{2})\.\d+/);
                if (match) {
                    const [h, m, s] = match.slice(1).map(Number);
                    durationSec = h * 3600 + m * 60 + s;
                    console.log(`[FFmpeg] Длительность видео: ${durationSec} сек`);
                }
                if (line.includes('frame=')) {
                    console.log('[FFmpeg]', line.trim());
                }
            });

            // Прогресс из stdout
            ffmpeg.stdout.on('data', async data => {
                const lines = data.toString().split('\n');
                let currentSec = 0;

                for (const line of lines) {
                    if (line.startsWith('out_time_ms=')) {
                        const ms = parseInt(line.split('=')[1]);
                        if (!isNaN(ms)) currentSec = ms / 1_000_000;
                    }
                }

                if (durationSec > 0 && currentSec > 0) {
                    const progress = Math.min(99, Math.floor((currentSec / durationSec) * 100));

                    if (Date.now() - lastUpdate > 3000) {
                        lastUpdate = Date.now();
                        await db.execute(sql`
              UPDATE lessons 
              SET "conversionProgress" = ${progress}
              WHERE id = ${lessonId}
            `).catch(err => {
                            console.error(`[GPU] Ошибка обновления прогресса: ${err.message}`);
                        });
                        console.log(`[GPU] Прогресс ${lessonId}: ${progress}%`);
                    }
                }
            });

            ffmpeg.on('close', async code => {
                if (code === 0) {
                    await db.execute(sql`
            UPDATE lessons SET "conversionProgress" = 100 WHERE id = ${lessonId}
          `).catch(() => { });
                    resolve();
                } else {
                    reject(new Error(`FFmpeg exited with code ${code}`));
                }
            });

            ffmpeg.on('error', reject);
        });
    }

    private cleanup(...paths: string[]) {
        paths.forEach(p => existsSync(p) && unlinkSync(p));
    }
}

const converter = new VideoConverter();

app.post('/convert', async (req, res) => {
    const { sourceUrl, lessonId, userId } = req.body;
    if (!sourceUrl || !lessonId) {
        return res.status(400).json({ success: false, error: 'sourceUrl и lessonId обязательны' });
    }
    console.log(`[GPU] Получена задача: ${lessonId}`);
    converter.convertVideo(sourceUrl, lessonId, userId || 'unknown').catch(() => { });
    res.json({ success: true, message: 'Задача принята' });
});

app.listen(3001, '0.0.0.0', () => {
    console.log('GPU-конвертер запущен — лимит 4 задачи, прогресс в % работает');
});
