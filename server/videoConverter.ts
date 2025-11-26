import { spawn } from 'child_process';
import { createWriteStream, createReadStream, unlinkSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { ObjectStorageService } from './objectStorage';
import { fetchObject } from './bunnyStorage';

export interface VideoConversionResult {
  success: boolean;
  convertedUrl?: string;
  error?: string;
  duration?: number;
}

export class VideoConverter {
  private objectStorage: ObjectStorageService;

  constructor() {
    this.objectStorage = new ObjectStorageService();
  }

  /**
   * Convert video to web-optimized MP4 format
   * @param sourceUrl - URL of the source video in Object Storage
   * @param userId - User ID for ACL ownership
   * @returns Conversion result with new URL
   */
  async convertVideo(sourceUrl: string, userId: string): Promise<VideoConversionResult> {
    const tempInputPath = join(tmpdir(), `input-${randomUUID()}.video`);
    const tempOutputPath = join(tmpdir(), `output-${randomUUID()}.mp4`);
    const startTime = Date.now();

    try {
      console.log('[VideoConverter] Starting conversion for:', sourceUrl);


      await this.downloadVideo(sourceUrl, tempInputPath);
      console.log('[VideoConverter] Downloaded to:', tempInputPath);


      const duration = await this.getDuration(tempInputPath);
      console.log(`[VideoConverter] Detected duration: ${duration} minutes`);


      const ffmpegStart = Date.now();
      await this.ffmpegConvert(tempInputPath, tempOutputPath);
      const ffmpegTime = ((Date.now() - ffmpegStart) / 1000).toFixed(1);
      console.log(`[VideoConverter] Converted video in ${ffmpegTime}s`);


      const convertedUrl = await this.uploadConvertedVideo(tempOutputPath, userId);
      console.log('[VideoConverter] Uploaded to:', convertedUrl);


      await this.deleteOriginalVideo(sourceUrl);
      console.log('[VideoConverter] Deleted original video:', sourceUrl);


      this.cleanup(tempInputPath, tempOutputPath);

      const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[VideoConverter] Total conversion time: ${totalTime}s`);

      return {
        success: true,
        convertedUrl,
        duration,
      };
    } catch (error) {
      console.error('[VideoConverter] Error:', error);
      this.cleanup(tempInputPath, tempOutputPath);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get video duration in minutes using ffprobe
   */
  private getDuration(inputPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const ffprobe = spawn('ffprobe', [
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        inputPath
      ]);

      let output = '';

      ffprobe.stdout.on('data', (data) => {
        output += data.toString();
      });

      ffprobe.stderr.on('data', (data) => {
        console.error('[VideoConverter] ffprobe stderr:', data.toString());
      });

      ffprobe.on('close', (code) => {
        if (code === 0) {
          const durationSeconds = parseFloat(output.trim());
          if (!isNaN(durationSeconds) && durationSeconds > 0) {
            const durationMinutes = Math.max(1, Math.ceil(durationSeconds / 60));
            console.log(`[VideoConverter] Duration from ffprobe: ${durationSeconds.toFixed(2)}s = ${durationMinutes} minutes`);
            resolve(durationMinutes);
          } else {
            console.warn('[VideoConverter] Invalid duration from ffprobe, defaulting to 1 minute');
            resolve(1);
          }
        } else {
          console.error('[VideoConverter] ffprobe failed, defaulting to 1 minute');
          resolve(1);
        }
      });

      ffprobe.on('error', (error) => {
        console.error('[VideoConverter] ffprobe spawn error:', error);
        resolve(1);
      });
    });
  }

  private async downloadVideo(sourceUrl: string, outputPath: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const file = await this.objectStorage.getObjectEntityFile(sourceUrl);
        const response = await fetchObject(file.path);
        if (!response.ok || !response.body) {
          throw new Error(`Failed to fetch source video: ${response.status}`);
        }
        const stream = response.body as any;
        const writeStream = createWriteStream(outputPath);

        stream.on('error', reject);
        writeStream.on('error', reject);
        writeStream.on('finish', resolve);

        stream.pipe(writeStream);
      } catch (error) {
        reject(error);
      }
    });
  }

  private ffmpegConvert(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {


























      const args = [
        '-i', inputPath,
        '-map', '0:v:0',
        '-map', '0:a:0?',
        '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
        '-movflags', '+faststart',
        '-c:v', 'libx264',
        '-profile:v', 'baseline',
        '-level', '3.1',
        '-preset', 'superfast',
        '-tune', 'zerolatency',
        '-b:v', '800k',
        '-maxrate', '1000k',
        '-bufsize', '2000k',
        '-g', '30',
        '-keyint_min', '15',
        '-sc_threshold', '0',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-ar', '44100',
        '-b:a', '96k',
        '-y',
        outputPath
      ];

      console.log('[VideoConverter] Running ffmpeg:', args.join(' '));

      const ffmpeg = spawn('ffmpeg', args);
      let lastProgress = '';

      ffmpeg.stderr.on('data', (data) => {
        const output = data.toString();


        const timeMatch = output.match(/time=(\d+):(\d+):(\d+)/);
        if (timeMatch) {
          const progress = `${timeMatch[1]}:${timeMatch[2]}:${timeMatch[3]}`;
          if (progress !== lastProgress) {
            console.log(`[VideoConverter] Progress: ${progress}`);
            lastProgress = progress;
          }
        }


        if (output.includes('error') || output.includes('Error')) {
          console.error('[VideoConverter] ffmpeg error:', output);
        }
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          console.log('[VideoConverter] ffmpeg conversion successful');
          resolve();
        } else {
          reject(new Error(`ffmpeg exited with code ${code}`));
        }
      });

      ffmpeg.on('error', (error) => {
        reject(new Error(`ffmpeg spawn error: ${error.message}`));
      });
    });
  }

  private async uploadConvertedVideo(filePath: string, userId: string): Promise<string> {
    const { uploadURL, headers } = await this.objectStorage.getObjectEntityUploadURL();
    const uploadHeaders = { ...(headers || {}), "Content-Type": "video/mp4" };

    const uploadResponse = await fetch(uploadURL, {
      method: "PUT",
      headers: uploadHeaders,
      body: createReadStream(filePath),
    });

    if (!uploadResponse.ok) {
      const text = await uploadResponse.text();
      throw new Error(`Failed to upload converted video to Bunny: ${uploadResponse.status} ${text}`);
    }

    const url = new URL(uploadURL);
    const objectId = url.pathname.split('/').pop();
    if (!objectId) {
      throw new Error('Unable to parse uploaded video id');
    }

    const privateDir = this.objectStorage
      .getPrivateObjectDir()
      .replace(/^\//, '');
    const storagePath = `${privateDir}/uploads/${objectId}`;

    const { setObjectAclPolicy } = await import('./objectAcl');
    await setObjectAclPolicy({ path: storagePath }, {
      owner: userId,
      visibility: 'private',
    });

    return `/objects/.private/uploads/${objectId}`;
  }

  private async deleteOriginalVideo(sourceUrl: string): Promise<void> {
    try {
      const file = await this.objectStorage.getObjectEntityFile(sourceUrl);
      await this.objectStorage.deleteObjectEntity(sourceUrl);
      console.log('[VideoConverter] Deleted original file from storage');
    } catch (error) {
      console.error('[VideoConverter] Failed to delete original video:', error);

    }
  }

  private cleanup(...paths: string[]) {
    for (const path of paths) {
      if (existsSync(path)) {
        try {
          unlinkSync(path);
          console.log('[VideoConverter] Cleaned up:', path);
        } catch (error) {
          console.error('[VideoConverter] Failed to cleanup:', path, error);
        }
      }
    }
  }
}
