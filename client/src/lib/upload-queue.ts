// lib/upload-queue.ts
import { apiRequest } from "@/lib/queryClient";

type UploadTask = {
    lessonId: string;
    file: File;
    fileName: string;
    onProgress?: (percent: number) => void;
};

class UploadQueue {
    private queue: UploadTask[] = [];
    private isProcessing = false;

    add(task: UploadTask) {
        this.queue.push(task);
        this.processNext();
    }

    private async processNext() {
        if (this.isProcessing || this.queue.length === 0) return;

        this.isProcessing = true;
        const task = this.queue[0];

        try {
            // 1. Получаем presigned URL
            const presignRes = await fetch("/api/upload-presign", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fileName: task.file.name,
                    fileType: task.file.type || "video/mp4",
                }),
            });

            if (!presignRes.ok) throw new Error("Presign failed");

            const { uploadUrl, fileUrl } = await presignRes.json();

            // 2. Загружаем напрямую в Яндекс
            await new Promise<void>((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open("PUT", uploadUrl);
                xhr.setRequestHeader("Content-Type", task.file.tipo || "video/mp4");

                xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable) {
                        const percent = Math.round((e.loaded / e.total) * 100);
                        task.onProgress?.(percent);

                        // Обновляем прогресс в базе (опционально, каждые 5%)
                        if (percent % 5 === 0 || percent === 100) {
                            apiRequest("PUT", `/api/admin/lessons/${task.lessonId}`, {
                                uploadProgress: percent,
                            }).catch(() => { });
                        }
                    }
                };

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve();
                    } else {
                        reject(new Error(`Upload failed: ${xhr.status}`));
                    }
                };

                xhr.onerror = () => reject(new Error("Network error"));
                xhr.send(task.file);
            });

            // 3. Сообщаем бэкенду — видео загружено
            await apiRequest("POST", `/api/admin/lessons/${task.lessonId}/video`, {
                videoUrl: fileUrl,
                originalFileName: task.fileName,
            });
        } catch (error) {
            console.error("Upload failed for lesson", task.lessonId, error);
            await apiRequest("PUT", `/api/admin/lessons/${task.lessonId}`, {
                processingStatus: "failed",
                errorMessage: "Ошибка загрузки видео",
            });
        } finally {
            this.queue.shift();
            this.isProcessing = false;
            this.processNext(); // следующий!
        }
    }

    getQueueLength() {
        return this.queue.length;
    }
}

export const uploadQueue = new UploadQueue();