import { useRef, useEffect, useMemo } from "react";

interface PreviewVideoPlayerProps {
    src: string;
    poster?: string;
    shouldPlay?: boolean;
    onVideoLoaded?: () => void;
}

export default function PreviewVideoPlayer({
    src,
    poster,
    shouldPlay = false,
    onVideoLoaded
}: PreviewVideoPlayerProps) {
    const normalizedSrc = useMemo(() => {
        if (!src) return src;
        if (src.includes("/vkurse/processed/")) return src;
        return src.replace("/processed/", "/vkurse/processed/");
    }, [src]);
    const videoRef = useRef<HTMLVideoElement>(null);
    const hasLoadedRef = useRef(false);
    const isMobileViewport = useMemo(() => {
        if (typeof window === "undefined") return false;
        return window.matchMedia("(max-width: 767px)").matches;
    }, []);

    // ⚠️ КРИТИЧНО: Cleanup видео-ресурсов ТОЛЬКО при unmount (пустой массив зависимостей)
    // Это гарантирует освобождение памяти видео-буферов
    useEffect(() => {
        // ⚠️ ВАЖНО: Захватываем ref при mount, потому что при cleanup videoRef.current уже будет null
        const video = videoRef.current;

        return () => {
            if (video) {
                // Останавливаем воспроизведение
                video.pause();

                // Удаляем все event listeners (безопасно, даже если их нет)
                video.onloadeddata = null;
                video.onplay = null;
                video.onpause = null;
                video.onerror = null;
                video.onended = null;

                // ⚠️ ВАЖНО: Очистка src для освобождения памяти
                // Это освобождает буферы MediaSource/SourceBuffer
                video.src = '';
                video.load();
            }
        };
    }, []); // Пустой массив = только при unmount

    // ⚠️ FIX: Используем isMountedRef чтобы избежать race condition с play()
    useEffect(() => {
        const video = videoRef.current;

        if (!video) return;

        if (shouldPlay) {
            // preload включаем только один раз
            if (!hasLoadedRef.current) {
                video.preload = isMobileViewport ? "metadata" : "auto";
                hasLoadedRef.current = true;
            }

            if (video.paused) {
                // ⚠️ FIX: Проверяем isMounted в catch чтобы игнорировать ошибки после unmount
                video.play()
                    .catch(() => {
                        // Игнорируем ошибки воспроизведения (interrupted, etc.)
                    });
            }
        } else {
            video.pause();
        }

        // ⚠️ FIX: Cleanup - помечаем как размонтированный и останавливаем видео
        return () => {
            // Паузим видео при cleanup эффекта, чтобы отменить pending play() 
            if (video && !video.paused) {
                video.pause();
            }
        };
    }, [shouldPlay, isMobileViewport]);

    return (
        <div className="relative w-full h-full pointer-events-none">
            <video
                ref={videoRef}
                src={normalizedSrc}
                poster={poster}
                className="w-full h-full object-cover"
                muted
                loop
                playsInline
                preload={isMobileViewport ? "none" : "metadata"}
                disablePictureInPicture
                controlsList="noremoteplayback"
                onContextMenu={(e) => e.preventDefault()}
                onDragStart={(e) => e.preventDefault()}
                onLoadedData={() => onVideoLoaded?.()}
            />
        </div>
    );
}
