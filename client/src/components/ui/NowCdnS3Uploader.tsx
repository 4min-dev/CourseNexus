// components/ui/NowCdnS3Uploader.tsx (или где он у тебя лежит)
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";

interface NowCdnUploaderProps {
    onUploadSuccess: (data: { fileName: string; fileUrl: string }) => void;
    onFileSelect?: (file: File) => void;        // НОВОЕ
    onProgress?: (percent: number) => void;     // НОВОЕ
    buttonText?: string;
    inputId: string;
    acceptedTypes?: string;
    className?: string;
    multiple?: boolean;
}

export function NowCdnUploader({
    onUploadSuccess,
    onFileSelect,
    onProgress,
    buttonText = "Загрузить файл",
    inputId,
    acceptedTypes,
    className,
    multiple = false,
}: NowCdnUploaderProps) {
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);

    const handleFileChange = (files: FileList | null) => {
        if (!files?.length) return;

        // Вызываем сразу при выборе файла
        if (onFileSelect && files[0]) {
            onFileSelect(files[0]);
        }

        // Если multiple — можно обработать несколько, но пока берём первый
        const file = files[0];
        if (!file) return;

        setUploading(true);
        setProgress(0);

        const formData = new FormData();
        formData.append("file", file);

        const xhr = new XMLHttpRequest();

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                setProgress(percent);
                onProgress?.(percent);
            }
        };

        xhr.onload = () => {
            if (xhr.status === 200) {
                const data = JSON.parse(xhr.responseText);
                onUploadSuccess({ fileName: data.fileName, fileUrl: data.url });
            } else {
                alert("Ошибка загрузки");
            }
            setProgress(100);
            setTimeout(() => {
                setProgress(0);
                setUploading(false);
            }, 800);
        };

        xhr.onerror = () => {
            alert("Ошибка сети");
            setUploading(false);
        };

        xhr.open("POST", "/api/upload");
        xhr.send(formData);
    };

    return (
        <div className={className}>
            <input
                type="file"
                id={inputId}
                className="hidden"
                accept={acceptedTypes}
                multiple={multiple}
                onChange={(e) => handleFileChange(e.target.files)}
                disabled={uploading}
            />
            <label htmlFor={inputId}>
                <Button variant="outline" disabled={uploading} asChild>
                    <span className="flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        {uploading ? `Загрузка ${progress}%` : buttonText}
                    </span>
                </Button>
            </label>
            {uploading && <Progress value={progress} className="mt-2" />}
        </div>
    );
}