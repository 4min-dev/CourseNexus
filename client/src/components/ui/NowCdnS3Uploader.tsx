import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";

interface NowCdnUploaderProps {
    onUploadSuccess: (data: { fileName: string; fileUrl: string, fileSize: string | null }[]) => void;
    buttonText?: string;
    inputId: string;
    acceptedTypes?: string;
    className?: string;
    multiple?: boolean;
}

export function NowCdnUploader({
    onUploadSuccess,
    buttonText = "Загрузить файл",
    inputId,
    acceptedTypes,
    className,
    multiple = false,
}: NowCdnUploaderProps) {
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);

    const getPresignedUrl = async (file: File) => {
        const response = await fetch("/api/upload-presign", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                fileName: file.name,
                fileType: file.type || "application/octet-stream",
            }),
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || "Не удалось получить presigned URL");
        }

        return response.json(); // { uploadUrl, fileUrl, fileName }
    };

    const handleUpload = async (files: FileList | null) => {
        if (!files?.length) return;

        const fileArray = multiple ? Array.from(files) : [files[0]];
        setUploading(true);
        setProgress(0);

        const uploadedFiles: { fileName: string; fileUrl: string, fileSize: string | null }[] = [];
        let uploadedBytes = 0;
        const totalBytes = fileArray.reduce((sum, f) => sum + f.size, 0);

        try {
            for (const [index, file] of fileArray.entries()) {
                const { uploadUrl, fileUrl } = await getPresignedUrl(file);

                await new Promise<void>((resolve, reject) => {
                    const xhr = new XMLHttpRequest();

                    xhr.upload.onprogress = (e) => {
                        if (e.lengthComputable) {
                            // Считаем уже загруженные байты до этого файла
                            const previousBytes = fileArray
                                .slice(0, index)
                                .reduce((sum, f) => sum + f.size, 0);

                            const currentFileUploaded = e.loaded;
                            const totalUploadedSoFar = previousBytes + currentFileUploaded;

                            const percent = totalBytes > 0
                                ? Math.round((totalUploadedSoFar / totalBytes) * 100)
                                : 0;

                            setProgress(percent);
                        }
                    };

                    xhr.onload = () => {
                        if (xhr.status >= 200 && xhr.status < 300) {
                            resolve();
                        } else {
                            reject(new Error(`HTTP ${xhr.status}`));
                        }
                    };

                    xhr.onerror = () => reject(new Error("Сетевая ошибка"));
                    xhr.ontimeout = () => reject(new Error("Таймаут"));

                    xhr.open("PUT", uploadUrl);
                    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
                    xhr.send(file);
                });
                console.log('file', file)
                uploadedFiles.push({ fileName: file.name, fileUrl, fileSize: file.size });
            }

            onUploadSuccess(uploadedFiles);
        } catch (err: any) {
            alert(`Ошибка загрузки: ${err.message}`);
        } finally {
            setProgress(100);
            setTimeout(() => {
                setProgress(0);
                setUploading(false);
            }, 800);
        }
    };

    return (
        <div className={className}>
            <input
                type="file"
                id={inputId}
                className="hidden"
                accept={acceptedTypes}
                multiple={multiple}
                onChange={(e) => handleUpload(e.target.files)}
                disabled={uploading}
            />
            <label htmlFor={inputId}>
                <Button variant="outline" disabled={uploading} asChild>
                    <span className="flex items-center gap-2 cursor-pointer">
                        <Upload className="h-4 w-4" />
                        {uploading ? `Загрузка ${progress}%` : buttonText}
                    </span>
                </Button>
            </label>

            {uploading && <Progress value={progress} className="mt-2 w-full" />}
        </div>
    );
}