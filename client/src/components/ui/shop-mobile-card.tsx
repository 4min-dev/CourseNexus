import React, { useRef, useEffect, useState } from 'react'
import { GlassCard } from '../GlassCard';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, BookOpen, Sparkles, Heart, Play, ArrowRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import PreviewVideoPlayer from '../PreviewVideoPlayer';
import { StarRating } from '../star-rating';
import { ViewingCounter } from '../viewing-counter';
import { CardFooter, CardHeader } from './card';
import { formatPrice } from '@/lib/formatPrice';
import { Category, Course, Subcategory } from '@shared/schema';
import { useQuery } from '@tanstack/react-query';
import { cn, htmlToText } from '@/lib/utils';
import { useLocation } from 'wouter';
import { TagsMarquee } from './tags-marquee';




type ShopMobileCardProps = {
    course: Course,
    index: number,
    purchasedCourseIds: Set<string>,
    favoritedCourseIds: Set<string>,
    subcategories?: Subcategory[],
    categories?: Category[],
    isActive: boolean,
    isAuthenticated: boolean,
    handleToggleFavorite: (courseId: string, e: React.MouseEvent) => void,
    priority?: boolean,
    isScrolling?: boolean,
    disablePreviewVideo?: boolean,
}

const ShopMobileCard: React.FC<ShopMobileCardProps> = ({
    course,
    index,
    purchasedCourseIds,
    favoritedCourseIds,
    subcategories,
    categories,
    isActive,
    isAuthenticated,
    handleToggleFavorite,
    priority,
    isScrolling = false,
    disablePreviewVideo = false,
}) => {

    const subcategoryIds = course.subcategoryIds || [];

    const [location, setLocation] = useLocation();



    const isPurchased = purchasedCourseIds.has(course.id);
    const isFavorited = favoritedCourseIds.has(course.id);
    const price = parseFloat(course.price || "0");
    const hasPreviewVideo = !disablePreviewVideo && !!(course as any).previewVideoUrl;

    const [isInView, setIsInView] = useState(true);
    const cardRootRef = useRef<HTMLDivElement | null>(null);
    const shouldPlayVideo = isActive && !isScrolling && hasPreviewVideo && isInView;

    // ✅ ОПТИМИЗАЦИЯ: Lazy loading видео - рендерим только после первой активации
    const [hasBeenActive, setHasBeenActive] = useState(false);

    // ✅ НОВОЕ: Отслеживаем загрузку видео, чтобы показывать изображение пока видео грузится
    const [isVideoReady, setIsVideoReady] = useState(false);

    // ✅ RETRY: Счётчик попыток загрузки изображения
    const [imageRetryCount, setImageRetryCount] = useState(0);
    const [imageError, setImageError] = useState(false);
    const MAX_IMAGE_RETRIES = 3;

    // Генерируем src с cache-busting при retry
    const imageSrc = React.useMemo(() => {
        if (!course.thumbnailImage) return '';
        if (imageRetryCount === 0) return course.thumbnailImage;
        // Добавляем параметр для обхода кэша при retry
        const separator = course.thumbnailImage.includes('?') ? '&' : '?';
        return `${course.thumbnailImage}${separator}_retry=${imageRetryCount}`;
    }, [course.thumbnailImage, imageRetryCount]);

    // Обработчик ошибки загрузки изображения
    const handleImageError = React.useCallback(() => {
        if (imageRetryCount < MAX_IMAGE_RETRIES) {
            // Retry с задержкой
            setTimeout(() => {
                setImageRetryCount(prev => prev + 1);
            }, 1000);
        } else {
            setImageError(true);
        }
    }, [imageRetryCount]);

    // Сброс retry при смене курса
    useEffect(() => {
        setImageRetryCount(0);
        setImageError(false);
    }, [course.id]);

    useEffect(() => {
        if (isActive && !hasBeenActive) {
            setHasBeenActive(true);
        }
    }, [isActive, hasBeenActive]);

    // Reset isVideoReady когда меняется курс
    useEffect(() => {
        setIsVideoReady(false);
    }, [course.id]);

    // Платформы (родительские категории из подкатегорий)
    const platforms = React.useMemo(() => {
        if (!subcategoryIds.length || !subcategories || !categories) return [];

        const matchedSubs = subcategories.filter(sub =>
            subcategoryIds.includes(sub.id) && sub.isActive
        );

        const categoryIds = Array.from(new Set(matchedSubs.map(sub => sub.categoryId)));

        return categories.filter(cat =>
            categoryIds.includes(cat.id) && cat.isActive
        );
    }, [subcategoryIds, subcategories, categories]);

    // Подкатегории (уровни) — те, что привязаны напрямую
    const selectedSubcategories = React.useMemo(() => {
        if (!subcategories) return [];
        return subcategories.filter(sub =>
            subcategoryIds.includes(sub.id) && sub.isActive
        );
    }, [subcategoryIds, subcategories]);

    // Если нет подкатегорий — показываем родительские из course.level
    const fallbackCategories = React.useMemo(() => {
        if (selectedSubcategories.length > 0 || !categories) return [];
        return categories.filter(cat =>
            course.level?.includes(cat.id) && cat.isActive
        );
    }, [selectedSubcategories.length, categories, course.level]);

    const allLevelBadges = selectedSubcategories.length > 0
        ? selectedSubcategories
        : fallbackCategories;

    useEffect(() => {
        if (typeof IntersectionObserver === 'undefined') return;
        if (!cardRootRef.current) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsInView(entry.isIntersecting);
            },
            {
                threshold: 0.05,
                rootMargin: '120px 0px'
            }
        );

        observer.observe(cardRootRef.current);
        return () => observer.disconnect();
    }, []);

    const allItems = React.useMemo(() => {

        const items: Array<{ id?: string; name: string }> = [];

        platforms.forEach(p => items.push({ id: p.id, name: p.name }))
        allLevelBadges.forEach(l => items.push({ id: l.id, name: l.name }))
        if (course.year) {
            items.push({ name: String(course.year) })
        }

        return items;
    }, [platforms, allLevelBadges, course.year]);

    return (
        <div key={course.id} className="h-full" ref={cardRootRef}>
            <GlassCard
                variant="default"
                glowColor="blue"
                hover={false}
                isActive={isActive}
                className="flex flex-col h-full w-full overflow-hidden transition-all duration-300"
                data-testid={`card-course-${course.id}`}
            >
                <div className="flex flex-col flex-1" style={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }}>
                    {/* Video/Thumbnail Section */}
                    <div className="bg-gradient-to-br from-primary/10 to-primary/5 relative overflow-hidden aspect-video w-full"
                        style={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }}>
                        {/* Thumbnail */}
                        {course.thumbnailImage && !imageError ? (
                            <img
                                src={imageSrc}
                                alt={course.title}
                                loading={priority ? "eager" : "lazy"}
                                {...({ fetchpriority: priority ? "high" : "auto" } as any)}
                                decoding="async"
                                onError={handleImageError}
                                className={`w-full h-full object-cover absolute inset-0 transition-opacity duration-300 ${isVideoReady && isActive ? 'opacity-0 z-0' : 'opacity-100 z-20'
                                    }`}
                                style={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }}
                            />
                        ) : (
                            <div className={`w-full h-full flex items-center justify-center absolute inset-0 transition-opacity duration-300 ${isVideoReady && isActive ? 'opacity-0 z-0' : 'opacity-100 z-20'
                                }`}>
                                <BookOpen className="h-16 w-16 text-primary/40" />
                            </div>
                        )}

                        {/* Preview Video - lazy loaded only after first activation */}
                        {hasBeenActive && hasPreviewVideo && (
                            <>
                                <div
                                    className="relative w-full h-full overflow-visible absolute inset-0 animate-in fade-in duration-300"
                                    style={{ pointerEvents: 'none' }}
                                >
                                    <PreviewVideoPlayer
                                        src={(course as any).previewVideoUrl}
                                        shouldPlay={shouldPlayVideo}
                                        onVideoLoaded={() => setIsVideoReady(true)}
                                    />
                                </div>

                                <div className="absolute bottom-3 left-3 z-10 animate-in fade-in duration-300">
                                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white shadow-lg">
                                        <Play className="h-3 w-3 mr-1" />
                                        Вводный урок
                                    </Button>
                                </div>
                            </>
                        )}

                        {/* Top right badges */}
                        <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                            {isAuthenticated && !isPurchased && (
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className={`h-8 w-8 rounded-full shadow-lg ${isFavorited
                                        ? 'bg-red-500 hover:bg-red-600 text-white'
                                        : 'bg-white/90 hover:bg-white text-red-500'
                                        }`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleFavorite(course.id, e);
                                    }}
                                    data-testid={`button-favorite-${course.id}`}
                                >
                                    <Heart className={`h-4 w-4 ${isFavorited ? 'fill-current' : ''}`} />
                                </Button>
                            )}
                            {course.isFree ? (
                                <Badge className="bg-green-600 text-white shadow-lg">Бесплатно</Badge>
                            ) : isPurchased ? (
                                <Badge className="bg-blue-600 text-white shadow-lg">
                                    <ShoppingCart className="h-3 w-3 mr-1" />
                                    Куплен
                                </Badge>
                            ) : (course.paymentType === 'fantiks_only' || course.paymentType === 'both') ? (
                                <Badge className="bg-amber-600 text-white shadow-lg font-semibold px-3 py-1.5">
                                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                                    Оплата фантиками
                                </Badge>
                            ) : null}
                        </div>
                    </div>

                    {/* Content */}
                    <CardHeader className="space-y-3 pb-4">
                        <h3
                            className="font-bold text-2xl leading-tight line-clamp-2 min-h-[3.5rem]"
                            data-testid={`text-course-title-${course.id}`}
                        >
                            {course.title}
                        </h3>

                        <div className="flex items-center justify-between gap-2">
                            <StarRating rating={Number(course.rating || 0)} reviewsCount={Number(course.reviewsCount || 0)} size="sm" />
                            <ViewingCounter value={course.reviewsCount} courseId={course.id} />
                        </div>

                        <TagsMarquee
                            items={allItems}
                            isPaused={!isInView}
                            repeatCount={3}
                            itemClassName="mx-1.5 bg-background/80"
                        />


                        {course.description && (
                            <p className="text-base text-muted-foreground line-clamp-5 leading-relaxed">
                                {htmlToText(course.description)}
                            </p>
                        )}

                        <div className="flex items-center gap-2">
                            <Avatar className="h-9 w-9 border-2 border-primary/20">
                                <AvatarImage src={course.authorImage || undefined} />
                                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                    {course.authorName?.[0] || "?"}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                                <span className="text-xs text-muted-foreground">Автор</span>
                                <span className="text-base font-medium">{course.authorName || "Неизвестен"}</span>
                            </div>
                        </div>
                    </CardHeader>

                    <div className="flex-1" />

                    <CardFooter className="flex flex-col gap-3 pt-0">
                        <div className="w-full px-1">
                            <span className="text-xs text-muted-foreground mb-2 block">Цена</span>
                            {/* ... цена без изменений ... */}
                            {course.isFree ? (
                                <span className="text-2xl font-bold text-foreground">Бесплатно</span>
                            ) : course.paymentType === 'both' ? (
                                // ... остальной код цены без изменений
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl font-bold text-foreground">{formatPrice(price)} ₽</span>
                                    <div className="h-10 w-px bg-gradient-to-b from-transparent via-border to-transparent" />
                                    <div className="flex flex-col">
                                        <span className="text-xl font-semibold text-purple-400">
                                            {course.fantikPrice && parseInt(course.fantikPrice.toString())} 🎫
                                        </span>
                                        <span className="text-xs text-purple-400/70">фантики</span>
                                    </div>
                                </div>
                            ) : /* остальные варианты */ (
                                <span className="text-2xl font-bold text-foreground">{formatPrice(price)} ₽</span>
                            )}
                        </div>

                        <Button
                            className={`w-full relative overflow-hidden backdrop-blur-sm font-semibold shadow-lg transition-all duration-300 group ${isPurchased
                                ? 'bg-white/5 border-2 border-blue-500/30 text-white hover:shadow-blue-500/50'
                                : 'bg-white/5 border-2 border-purple-500/30 text-white hover:shadow-purple-500/50'
                                }`}
                            size="lg"
                            onClick={() => setLocation(`/course/${course.id}`)}
                        >
                            <div className={`absolute inset-0 transition-opacity duration-700 ${isPurchased
                                ? 'bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 opacity-0 group-hover:opacity-100'
                                : 'bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 opacity-0 group-hover:opacity-100'
                                }`} />
                            <span className="relative flex items-center justify-center">
                                {isPurchased ? (
                                    <> <ShoppingCart className="mr-2 h-4 w-4" /> Открыть курс </>
                                ) : (
                                    <> <ArrowRight className="mr-2 h-4 w-4" /> Подробнее </>
                                )}
                            </span>
                        </Button>
                    </CardFooter>
                </div>
            </GlassCard>
        </div>
    )
}

export default React.memo(ShopMobileCard)