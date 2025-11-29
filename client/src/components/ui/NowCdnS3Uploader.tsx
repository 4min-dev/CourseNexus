import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";

interface NowCdnUploaderProps {
    onUploadSuccess: (data: { fileName: string; fileUrl: string }) => void;
    buttonText?: string;
    inputId: string,
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

    const handleUpload = async (files: FileList | null) => {
        if (!files?.length) return;
        setUploading(true);
        setProgress(0);

        for (const file of multiple ? files : [files[0]]) {
            const formData = new FormData();
            formData.append("file", file);

            try {
                const xhr = new XMLHttpRequest();

                xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable) {
                        const percent = Math.round((e.loaded / e.total) * 100);
                        setProgress(percent);
                    }
                };

                await new Promise((resolve, reject) => {
                    xhr.onload = () => {
                        if (xhr.status === 200) {
                            const data = JSON.parse(xhr.responseText);
                            onUploadSuccess({ fileName: data.fileName, fileUrl: data.url });
                            resolve(null);
                        } else {
                            reject(new Error("Upload failed"));
                        }
                    };
                    xhr.onerror = reject;
                    xhr.open("POST", "/api/upload");
                    xhr.send(formData);
                });
            } catch (err) {
                alert("Ошибка загрузки файла: " + file.name);
            }
        }

        setProgress(100);
        setTimeout(() => {
            setProgress(0);
            setUploading(false);
        }, 800);
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