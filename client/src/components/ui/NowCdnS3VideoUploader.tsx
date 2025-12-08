import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface NowCdnUploaderProps {
    onFileSelect?: (file: File) => void;
    buttonText?: string;
    inputId: string;
    acceptedTypes?: string;
    className?: string;
}

export function NowCdnVideoUploader({
    onFileSelect,
    buttonText = "Выбрать видео",
    inputId,
    acceptedTypes,
    className,
}: NowCdnUploaderProps) {
    const [hasFile, setHasFile] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files?.length) {
            const file = files[0];
            onFileSelect?.(file);
            setHasFile(true);
            e.target.value = "";
        }
    };

    return (
        <div className={className}>
            <input
                type="file"
                id={inputId}
                className="hidden"
                accept={acceptedTypes || "video/*"}
                onChange={handleChange}
            />
            <label htmlFor={inputId}>
                <Button variant="outline" asChild>
                    <span className="flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        {hasFile ? "Видео выбрано ✓" : buttonText}
                    </span>
                </Button>
            </label>
        </div>
    );
}