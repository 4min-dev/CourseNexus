import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";

interface ThumbnailUploaderProps {
    onComplete: (files: { fileName: string; fileUrl: string }[]) => void;
    setIsUploadingThumbnail: (value: boolean) => void;
}

export function PackageThumbnailUploader({
    onComplete,
    setIsUploadingThumbnail,
}: ThumbnailUploaderProps) {
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);

    const MAX_SIZE = 10 * 1024 * 1024; // 10 МБ

    const getPresignedUrl = async (file: File) => {
        const response = await fetch("/api/upload-presign", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                fileName: file.name,
                fileType: file.type || "image/jpeg",
            }),
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || "Не удалось получить URL для загрузки");
        }

        return response.json(); // { uploadUrl, fileUrl }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files?.length) return;
        console.log('files', files)
        const file = files[0];

        // Проверка размера
        if (file.size > MAX_SIZE) {
            alert("Файл слишком большой. Максимум 10 МБ.");
            return;
        }

        setUploading(true);
        setIsUploadingThumbnail(true);
        setProgress(0);

        try {
            const { uploadUrl, fileUrl } = await getPresignedUrl(file);

            await new Promise<void>((resolve, reject) => {
                const xhr = new XMLHttpRequest();

                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable) {
                        const percent = Math.round((event.loaded / event.total) * 100);
                        setProgress(percent);
                    }
                };

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve();
                    } else {
                        reject(new Error(`Ошибка загрузки: ${xhr.status}`));
                    }
                };

                xhr.onerror = () => reject(new Error("Сетевая ошибка"));
                xhr.ontimeout = () => reject(new Error("Таймаут загрузки"));

                xhr.open("PUT", uploadUrl);
                xhr.setRequestHeader("Content-Type", file.type || "image/jpeg");
                xhr.send(file);
            });

            // Успешно загружено
            onComplete([{ fileName: file.name, fileUrl }]);

            setProgress(100);
            setTimeout(() => {
                setProgress(0);
                setUploading(false);
                setIsUploadingThumbnail(false);
            }, 800);
        } catch (error: any) {
            console.error("[ThumbnailUpload] Ошибка:", error);
            alert(`Ошибка загрузки: ${error.message}`);
            setUploading(false);
            setIsUploadingThumbnail(false);
            setProgress(0);
        }
    };

    return (
        <div className="flex flex-col gap-2">
            <input
                type="file"
                id="thumbnail-upload"
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
                disabled={uploading}
            />

            <label htmlFor="thumbnail-upload">
                <Button variant="outline" disabled={uploading} asChild>
                    <span className="flex items-center gap-2 cursor-pointer">
                        <Upload className="h-4 w-4" />
                        {uploading ? `Загрузка ${progress}%` : "Загрузить обложку"}
                    </span>
                </Button>
            </label>

            {uploading && <Progress value={progress} className="w-full" />}
        </div>
    );
}