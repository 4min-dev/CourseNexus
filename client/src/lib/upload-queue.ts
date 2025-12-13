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
        const fileSize = task.file.size;
        const MAX_SINGLE_SIZE = 5 * 1024 * 1024 * 1024; // 5 ГБ

        try {
            if (fileSize <= MAX_SINGLE_SIZE) {
                await this.singleUpload(task); // Старый single-part
            } else {
                await this.multipartUpload(task); // Новый multipart
            }
        } catch (error) {
            console.error("Upload failed for lesson", task.lessonId, error);
            await apiRequest("PUT", `/api/admin/lessons/${task.lessonId}`, {
                processingStatus: "failed",
                errorMessage: "Ошибка загрузки видео",
            });
        } finally {
            this.queue.shift();
            this.isProcessing = false;
            this.processNext();
        }
    }

    // Старый single-part (оставьте как есть, но вынесите в метод)
    private async singleUpload(task: UploadTask) {
        // Ваш текущий код: presign, XMLHttpRequest PUT, etc.
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

        await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open("PUT", uploadUrl);
            xhr.setRequestHeader("Content-Type", task.file.type || "video/mp4");

            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    const percent = Math.round((e.loaded / e.total) * 100);
                    task.onProgress?.(percent);
                    if (percent % 5 === 0 || percent === 100) {
                        apiRequest("PUT", `/api/admin/lessons/${task.lessonId}`, {
                            uploadProgress: percent,
                        }).catch(() => { });
                    }
                }
            };

            xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`)));
            xhr.onerror = () => reject(new Error("Network error"));
            xhr.send(task.file);
        });

        await apiRequest("POST", `/api/admin/lessons/${task.lessonId}/video`, {
            videoUrl: fileUrl,
            originalFileName: task.fileName,
        });
    }

    // Новый multipart
    private async multipartUpload(task: UploadTask) {
        const CHUNK_SIZE = 100 * 1024 * 1024; // 100 МБ
        const numParts = Math.ceil(task.file.size / CHUNK_SIZE);
        let uploadedBytes = 0;

        // 1. Start multipart
        const startRes = await fetch("/api/upload-multipart-start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                fileName: task.file.name,
                fileType: task.file.type || "video/mp4",
            }),
        });
        if (!startRes.ok) throw new Error("Multipart start failed");
        const { uploadId, fileUrl, key } = await startRes.json();

        // 2. Presign URLs для всех частей
        const partNumbers = Array.from({ length: numParts }, (_, i) => i + 1);
        const presignRes = await fetch("/api/upload-multipart-presign", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key, uploadId, partNumbers }),
        });
        if (!presignRes.ok) throw new Error("Presign parts failed");
        const { presignedUrls } = await presignRes.json();

        // 3. Загрузка частей (параллельно, но лимитируйте, чтобы не перегружать, e.g. Promise.all с чанками)
        const parts: { ETag: string; PartNumber: number }[] = [];
        const uploadPromises = presignedUrls.map(async (url: string, index: number) => {
            const start = index * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, task.file.size);
            const chunk = task.file.slice(start, end);

            const res = await fetch(url, {
                method: "PUT",
                body: chunk,
                headers: { "Content-Type": task.file.type || "video/mp4" },
            });
            if (!res.ok) throw new Error(`Part ${index + 1} failed: ${res.status}`);

            const eTag = res.headers.get("ETag")?.replace(/"/g, "") || ""; // Удаляем кавычки
            uploadedBytes += chunk.size;
            const percent = Math.round((uploadedBytes / task.file.size) * 100);
            task.onProgress?.(percent);
            if (percent % 5 === 0 || percent === 100) {
                apiRequest("PUT", `/api/admin/lessons/${task.lessonId}`, {
                    uploadProgress: percent,
                }).catch(() => { });
            }

            return { ETag: eTag, PartNumber: index + 1 };
        });

        parts.push(...await Promise.all(uploadPromises));

        // 4. Complete
        const completeRes = await fetch("/api/upload-multipart-complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key, uploadId, parts }),
        });
        if (!completeRes.ok) throw new Error("Complete multipart failed");

        // 5. Сообщить бэкенду (как в single)
        await apiRequest("POST", `/api/admin/lessons/${task.lessonId}/video`, {
            videoUrl: fileUrl,
            originalFileName: task.fileName,
        });
    }

    getQueueLength() {
        return this.queue.length;
    }
}

export const uploadQueue = new UploadQueue();