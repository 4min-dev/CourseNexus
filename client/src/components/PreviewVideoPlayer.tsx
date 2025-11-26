import { useRef, useEffect, useState } from "react";

// ============================================================================
// Preview Video Player - контролируемый извне плеер для карточек товаров
// 
// ВАЖНО: Воспроизведение контролируется извне через проп shouldPlay
// (наведение на карточку в /shop управляется родительским компонентом)
// 
// Использует preload="metadata" + programmatic load() при hover для оптимального
// баланса между UX и bandwidth (избегает загрузки ВСЕХ preview видео сразу).
// БЕЗ crossOrigin для корректной cookie-based аутентификации.
// ============================================================================

interface PreviewVideoPlayerProps {
src: string;
poster?: string;
shouldPlay?: boolean; // Контроль воспроизведения извне
}


export default function PreviewVideoPlayer({ src, poster, shouldPlay = false }: PreviewVideoPlayerProps) {
const videoRef = useRef<HTMLVideoElement>(null);
const [isBuffering, setIsBuffering] = useState(false);
const [preloadMode, setPreloadMode] = useState<"metadata" | "auto">("metadata");
const isPlayingRef = useRef(false);

// Контроль воспроизведения при изменении shouldPlay
useEffect(() => {
const video = videoRef.current;
if (!video) return;

if (shouldPlay) {
isPlayingRef.current = true;
// Переключаем на агрессивную загрузку когда начинается воспроизведение
setPreloadMode("auto");
video.play().catch(() => {
isPlayingRef.current = false;
});
} else {
// Остановка и сброс
isPlayingRef.current = false;
video.pause();
video.currentTime = 0;
setIsBuffering(false);
}
}, [shouldPlay]);

// Обработка событий buffering для плавного воспроизведения
// ОПТИМИЗАЦИЯ: Добавляем listeners ТОЛЬКО когда видео должно играть (shouldPlay=true)
// Это предотвращает утечку памяти от сотен неактивных слушателей
useEffect(() => {
const video = videoRef.current;
if (!video || !shouldPlay) return; // Добавляем listeners только при активном воспроизведении

const handleWaiting = () => {
// Показываем индикатор только если видео играет
if (isPlayingRef.current && video.readyState < 3) {
setIsBuffering(true);
}
};

const handlePlaying = () => {
// Video is actually playing (buffering complete)
setIsBuffering(false);
};

const handleCanPlay = () => {
// Buffering complete
setIsBuffering(false);
};

const handleStalled = () => {
// Network stalled - do nothing in production
};

const handleError = () => {
setIsBuffering(false);
isPlayingRef.current = false;
};

const handleProgress = () => {
// Aggressive buffering - force browser to load more data ahead
if (!video || !isPlayingRef.current) return;
const buffered = video.buffered;
if (buffered.length === 0) return;
};

const handleEnded = () => {
// Loop manually - restart playback
if (isPlayingRef.current && video) {
video.currentTime = 0;
video.play().catch(() => {});
}
};

video.addEventListener('waiting', handleWaiting);
video.addEventListener('playing', handlePlaying);
video.addEventListener('canplay', handleCanPlay);
video.addEventListener('canplaythrough', handleCanPlay);
video.addEventListener('stalled', handleStalled);
video.addEventListener('error', handleError);
video.addEventListener('progress', handleProgress);
video.addEventListener('ended', handleEnded);

return () => {
video.removeEventListener('waiting', handleWaiting);
video.removeEventListener('playing', handlePlaying);
video.removeEventListener('canplay', handleCanPlay);
video.removeEventListener('canplaythrough', handleCanPlay);
video.removeEventListener('stalled', handleStalled);
video.removeEventListener('error', handleError);
video.removeEventListener('progress', handleProgress);
video.removeEventListener('ended', handleEnded);
};
}, [shouldPlay]); // Зависим от shouldPlay - добавляем/удаляем listeners динамически

return (
<div className="relative w-full h-full" style={{ pointerEvents: 'none' }}>
<video
ref={videoRef}
src={src}
className="w-full h-full object-cover"
playsInline
preload={preloadMode}
muted
controlsList="noremoteplayback"
disablePictureInPicture
poster={poster}
onContextMenu={(e) => e.preventDefault()}
onDragStart={(e) => e.preventDefault()}
style={{ pointerEvents: 'none' }}
/>

{/* Buffering индикатор */}
{isBuffering && (
<div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
</div>
)}
</div>
);
}