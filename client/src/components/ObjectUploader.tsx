import { useState, useRef } from "react";
import type { ReactNode } from "react";
import Uppy from "@uppy/core";
import XHRUpload from "@uppy/xhr-upload";
import type { UploadResult } from "@uppy/core";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onGetUploadParameters: (file?: any) => Promise<{
    method: "PUT";
    url: string;
    headers?: Record<string, string>;
  }>;
  onComplete?: (
    result: UploadResult<Record<string, unknown>, Record<string, unknown>>
  ) => void;
  onUploadStart?: (uploadPromise: Promise<UploadResult<Record<string, unknown>, Record<string, unknown>>>) => void;
  onProgress?: (progress: number, fileName: string) => void;
  buttonClassName?: string;
  buttonVariant?: "default" | "outline" | "ghost" | "secondary";
  children: ReactNode;
}

/**
 * File upload component that uses presigned URLs for direct-to-storage uploads
 * Supports files of any size (up to 10GB+) without server memory constraints
 */
export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10737418240, // 10GB default
  onGetUploadParameters,
  onComplete,
  onUploadStart,
  onProgress,
  buttonClassName,
  buttonVariant = "default",
  children,
}: ObjectUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");

  // Store resolve/reject for upload promise
  const uploadPromiseResolverRef = useRef<{
    resolve: (value: UploadResult<Record<string, unknown>, Record<string, unknown>>) => void;
    reject: (reason?: any) => void;
  } | null>(null);

  const [uppy] = useState(() => {
    const uppyInstance = new Uppy({
      restrictions: {
        maxNumberOfFiles,
        maxFileSize,
      },
      autoProceed: true,
      id: `uppy-${Math.random().toString(36).substr(2, 9)}`,
    })
      .use(XHRUpload, {
        method: "PUT",
        formData: false,
        getUploadURL: (file) => file.meta.uploadURL,
        headers: (file) => file.meta.headers || {},
      })
      .on("upload", (data: any) => {
        setIsUploading(true);
        setUploadProgress(0);
        if (data?.fileIDs && data.fileIDs.length > 0) {
          const file = uppyInstance.getFile(data.fileIDs[0]);
          if (file?.name) {
            setUploadedFileName(file.name);
          }
        }

        // Create upload promise and call onUploadStart
        if (onUploadStart) {
          const uploadPromise = new Promise<UploadResult<Record<string, unknown>, Record<string, unknown>>>((resolve, reject) => {
            uploadPromiseResolverRef.current = { resolve, reject };
          });
          onUploadStart(uploadPromise);
        }
      })
      .on("upload-progress", (file, progress) => {
        if (file && progress.bytesUploaded && progress.bytesTotal) {
          const percentage = Math.round((progress.bytesUploaded / progress.bytesTotal) * 100);
          setUploadProgress(percentage);
          onProgress?.(percentage, file.name || "");
        }
      })
      .on("upload-success", () => {
        setUploadProgress(100);
      })
      .on("complete", (result) => {
        setIsUploading(false);
        setUploadProgress(0);
        setUploadedFileName("");

        // Resolve the upload promise
        if (uploadPromiseResolverRef.current) {
          uploadPromiseResolverRef.current.resolve(result);
          uploadPromiseResolverRef.current = null;
        }

        onComplete?.(result);
      })
      .on("restriction-failed", (file, error) => {
        console.error('Restriction failed:', error);
        const fileSizeMB = file && file.size ? (file.size / 1024 / 1024).toFixed(2) : 'unknown';
        const maxSizeMB = (maxFileSize / 1024 / 1024).toFixed(0);
        setIsUploading(false);
        setUploadProgress(0);
        setUploadedFileName("");

        // Reject the upload promise
        if (uploadPromiseResolverRef.current) {
          uploadPromiseResolverRef.current.reject(new Error('Restriction failed'));
          uploadPromiseResolverRef.current = null;
        }

        toast({
          title: "Файл не подходит",
          description: `Размер: ${fileSizeMB} МБ. Максимум: ${maxSizeMB} МБ`,
          variant: "destructive"
        });
      })
      .on("error", (error) => {
        console.error('Upload error:', error);
        setIsUploading(false);
        setUploadProgress(0);
        setUploadedFileName("");

        // Reject the upload promise
        if (uploadPromiseResolverRef.current) {
          uploadPromiseResolverRef.current.reject(error);
          uploadPromiseResolverRef.current = null;
        }

        toast({ title: "Ошибка загрузки", variant: "destructive" });
      });

    return uppyInstance;
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Clear any existing files in Uppy before adding new ones
    uppy.cancelAll();
    const existingFiles = uppy.getFiles();
    existingFiles.forEach(file => {
      uppy.removeFile(file.id);
    });

    Array.from(files).forEach(async (file) => {
      try {
        const params = await onGetUploadParameters(file);

        uppy.addFile({
          name: file.name,
          type: file.type,
          data: file,
          meta: {
            uploadURL: params.url,
            headers: params.headers,
          },
        });
      } catch (err) {
        console.error("Error adding file:", err);
        toast({
          title: "Ошибка",
          description: "Не удалось подготовить файл к загрузке",
          variant: "destructive",
        });
      }
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
        accept="*/*"
        multiple={maxNumberOfFiles > 1}
      />
      <Button
        onClick={() => fileInputRef.current?.click()}
        className={buttonClassName}
        variant={buttonVariant}
        data-testid="button-upload-file"
        type="button"
        disabled={isUploading}
      >
        {children}
      </Button>
      {isUploading && (
        <div className="space-y-1" data-testid="upload-progress-container">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground truncate max-w-[200px]" data-testid="upload-filename">
              {uploadedFileName}
            </span>
            <span className="text-muted-foreground" data-testid="upload-percentage">
              {uploadProgress}%
            </span>
          </div>
          <Progress value={uploadProgress} data-testid="upload-progress-bar" />
        </div>
      )}
    </div>
  );
}
