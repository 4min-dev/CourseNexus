// lib/upload-queue.ts
import { apiRequest } from "@/lib/queryClient";

type UploadTask = {
    lessonId: string;
    file: File;
    fileName: string;
    onProgress?: (percent: number) => void;
};

const PART_SIZE = 50 * 1024 * 1024;

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

        let lastSentProgress = -1;
        let lastSentTime = 0;
        const MIN_INTERVAL = 3000;

        // Сюда будем складывать реально загруженные байты
        let uploadedBytes = 0;

        const sendProgress = (percent: number) => {
            const now = Date.now();
            const rounded = Math.round(percent);

            if (
                rounded > lastSentProgress &&
                (rounded === 100 || now - lastSentTime > MIN_INTERVAL)
            ) {
                lastSentProgress = rounded;
                lastSentTime = now;

                apiRequest("PUT", `/api/admin/lessons/${task.lessonId}`, {
                    uploadProgress: rounded,
                }).catch(() => { });

                task.onProgress?.(rounded);
            }
        };

        try {
            const initRes = await fetch("/api/upload-presign-multipart", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fileName: task.file.name,
                    fileType: task.file.type || "video/mp4",
                    fileSize: task.file.size,
                }),
            });

            if (!initRes.ok) throw new Error("Не удалось начать загрузку");
            const { uploadId, key, fileUrl } = await initRes.json();

            const totalParts = Math.ceil(task.file.size / PART_SIZE);

            const partsRes = await fetch("/api/upload-presign-multipart", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "get-parts", uploadId, parts: totalParts, key }),
            });

            const { urls } = await partsRes.json();

            // Загружаем все части параллельно
            const uploadedParts = await Promise.all(
                urls.map(async (url: string, i: number) => {
                    const start = i * PART_SIZE;
                    const end = Math.min(start + PART_SIZE, task.file.size);
                    const blob = task.file.slice(start, end);

                    return new Promise<{ ETag: string; PartNumber: number }>((resolve, reject) => {
                        const xhr = new XMLHttpRequest();
                        xhr.open("PUT", url);

                        xhr.upload.onprogress = (e) => {
                            if (e.lengthComputable) {
                                // Вот правильный расчёт!
                                const currentlyUploaded = uploadedBytes + e.loaded;
                                const percent = (currentlyUploaded / task.file.size) * 100;
                                sendProgress(percent);
                            }
                        };

                        xhr.onload = () => {
                            if (xhr.status >= 200 && xhr.status < 300) {
                                // Только после успешной загрузки части — добавляем её размер
                                uploadedBytes += blob.size;
                                const etag = xhr.getResponseHeader("ETag") || "";
                                resolve({ ETag: etag.replace(/"/g, ""), PartNumber: i + 1 });
                            } else {
                                reject(new Error(`Часть ${i + 1}: ${xhr.status}`));
                            }
                        };

                        xhr.onerror = () => reject(new Error("Сеть упала"));
                        xhr.send(blob);
                    });
                })
            );

            // Завершаем
            await fetch("/api/upload-presign-multipart", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "complete",
                    uploadId,
                    parts: uploadedParts,
                    key,
                }),
            });

            // Финальные 100%
            sendProgress(100);
            await apiRequest("POST", `/api/admin/lessons/${task.lessonId}/video`, {
                videoUrl: fileUrl,
                originalFileName: task.file.name,
            });

        } catch (error: any) {
            console.error("Upload failed:", error);
            await apiRequest("PUT", `/api/admin/lessons/${task.lessonId}`, {
                processingStatus: "failed",
                errorMessage: error.message || "Ошибка загрузки видео",
            });
        } finally {
            this.queue.shift();
            this.isProcessing = false;
            this.processNext();
        }
    }

    getQueueLength() {
        return this.queue.length;
    }
}

export const uploadQueue = new UploadQueue();