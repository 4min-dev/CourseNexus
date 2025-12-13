import { useRef, useEffect } from "react";

interface PreviewVideoPlayerProps {
    src: string;
    poster?: string;
    shouldPlay?: boolean;
}

export default function PreviewVideoPlayer({
    src,
    poster,
    shouldPlay = false
}: PreviewVideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const hasLoadedRef = useRef(false);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        if (shouldPlay) {
            // preload включаем только один раз
            if (!hasLoadedRef.current) {
                video.preload = "auto";
                hasLoadedRef.current = true;
            }

            if (video.paused) {
                video.play().catch(() => { });
            }
        } else {
            video.pause();
            // НЕ сбрасываем currentTime
        }
    }, [shouldPlay]);

    return (
        <div className="relative w-full h-full pointer-events-none">
            <video
                ref={videoRef}
                src={src.replace("processed", "vkurse/processed")}
                poster={poster}
                className="w-full h-full object-cover"
                muted
                loop
                playsInline
                preload="metadata"
                disablePictureInPicture
                controlsList="noremoteplayback"
                onContextMenu={(e) => e.preventDefault()}
                onDragStart={(e) => e.preventDefault()}
            />
        </div>
    );
}
