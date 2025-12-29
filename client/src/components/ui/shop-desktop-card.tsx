import React, { useState } from 'react'
import { GlassCard } from '../GlassCard';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, BookOpen, Sparkles, Heart, Play, ArrowRight, Edit2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import PreviewVideoPlayer from '../PreviewVideoPlayer';
import { StarRating } from '../star-rating';
import { ViewingCounter } from '../viewing-counter';
import { CardFooter, CardHeader } from './card';
import { formatPrice } from '@/lib/formatPrice';
import { Category, Course, Subcategory, User } from '@shared/schema';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Section } from '@/pages/admin-course-edit';

type ShopDesktopCardProps = {
    course: Course,
    index: number,
    purchasedCourseIds: Set<string>,
    favoritedCourseIds: Set<string>,
    subcategories?: Subcategory[],
    categories?: Category[],
    user?: User,
    isAuthenticated: boolean,
    handleToggleFavorite: (courseId: string, e: React.MouseEvent) => void,
}

const ShopDesktopCard: React.FC<ShopDesktopCardProps> = ({
    course,
    index,
    purchasedCourseIds,
    favoritedCourseIds,
    subcategories,
    categories,
    user,
    isAuthenticated,
    handleToggleFavorite
}) => {

    const [hoveredCourseId, setHoveredCourseId] = useState<string | null>(null);
    const [location, setLocation] = useLocation();

    const isPurchased = purchasedCourseIds.has(course.id);
    const isFavorited = favoritedCourseIds.has(course.id);
    const price = parseFloat(course.price || "0");
    const hasPreviewVideo = !!(course as any).previewVideoUrl;
    const shouldPlayVideo = hoveredCourseId === course.id && hasPreviewVideo;
    const isAdmin = user && user.isAdmin;

    // Запрос подкатегорий только для этого курса
    const { data: subcategoryIds = [] } = useQuery<string[]>({
        queryKey: ["/api/admin/courses", course.id, "subcategories"],
        queryFn: async () => {
            const response = await fetch(`/api/admin/courses/${course.id}/subcategories`, {
                credentials: "include",
            });
            if (!response.ok) return [];
            return response.json();
        },
        staleTime: 5 * 60 * 1000,
        enabled: !!course.id,
    });

    // Запрос секций только для этого курса
    const { data: sections = [] } = useQuery<Section[]>({
        queryKey: ["/api/admin/courses", course.id, "sections"],
        queryFn: async () => {
            const response = await fetch(`/api/admin/courses/${course.id}/sections`, {
                credentials: "include",
            });
            if (!response.ok) throw new Error("Failed to fetch sections");
            return response.json();
        },
        staleTime: 5 * 60 * 1000,
        enabled: !!course.id,
    });

    // Платформы
    const platforms = React.useMemo(() => {
        if (!subcategoryIds.length || !subcategories || !categories) return [];

        const matchedSubs = subcategories.filter(sub =>
            subcategoryIds.includes(sub.id) && sub.isActive
        );

        const categoryIds = [...new Set(matchedSubs.map(sub => sub.categoryId))];

        return categories.filter(cat =>
            categoryIds.includes(cat.id) && cat.isActive
        );
    }, [subcategoryIds, subcategories, categories]);

    // Подкатегории (уровни)
    const selectedSubcategories = React.useMemo(() => {
        if (!subcategories) return [];
        return subcategories.filter(sub =>
            subcategoryIds.includes(sub.id) && sub.isActive
        );
    }, [subcategoryIds, subcategories]);

    const fallbackCategories = React.useMemo(() => {
        if (selectedSubcategories.length > 0 || !categories) return [];
        return categories.filter(cat =>
            course.level?.includes(cat.id) && cat.isActive
        );
    }, [selectedSubcategories.length, categories, course.level]);

    const allLevelBadges = selectedSubcategories.length > 0
        ? selectedSubcategories
        : fallbackCategories;

    return (
        <div
            key={course.id}
            className="relative h-full group min-h-[500px]"
            onMouseEnter={() => {
                if (hasPreviewVideo) {
                    setHoveredCourseId(course.id);
                }
            }}
            onMouseLeave={() => {
                if (hasPreviewVideo) {
                    setHoveredCourseId(null);
                }
            }}
        >
            <GlassCard
                variant="default"
                glowColor="purple"
                hover={true}
                className="overflow-visible flex flex-col h-full group-hover:md:absolute group-hover:md:top-0 group-hover:md:left-0 group-hover:md:w-[420px] group-hover:md:z-40 "
                data-testid={`card-course-${course.id}`}
            >
                <div
                    className="flex flex-col flex-1"
                    style={{
                        backfaceVisibility: 'hidden',
                        transform: 'translateZ(0)'
                    }}
                >
                    {/* Video/Thumbnail Section */}
                    <div
                        className="bg-gradient-to-br from-primary/10 to-primary/5 relative overflow-hidden aspect-video w-full group-hover:md:h-[236px] group-hover:md:aspect-auto"
                        style={{
                            backfaceVisibility: 'hidden',
                            transform: 'translateZ(0)'
                        }}
                    >
                        {isAdmin &&
                            <Button
                                size="icon"
                                variant="ghost"
                                className="!absolute top-3 left-3 !z-[1500] 
                     bg-white/40 
                     shadow-lg rounded-full"
                                onClick={() => {
                                    window.location.replace(`/admin/courses/${course.id}/edit?subcategoryId=null&categiryId=null&parentId=null&fromStore`)
                                }}
                            >
                                <Edit2 className="h-4 w-4" strokeWidth={2.2} />
                            </Button>
                        }

                        {/* Thumbnail Image - always visible, hidden only when video preview shows */}
                        {course.thumbnailImage ? (
                            <img
                                src={course.thumbnailImage}
                                alt={course.title}
                                className={`w-full h-full object-cover absolute inset-0 ${hasPreviewVideo ? 'group-hover:opacity-0' : ''
                                    }`}
                                style={{
                                    backfaceVisibility: 'hidden',
                                    transform: 'translateZ(0)',
                                    transition: 'opacity 20ms linear',
                                }}
                            />
                        ) : (
                            <div className={`w-full h-full flex items-center justify-center absolute inset-0 ${hasPreviewVideo ? 'group-hover:opacity-0' : ''
                                }`}>
                                <BookOpen className="h-16 w-16 text-primary/40 group-hover:text-primary/60" />
                            </div>
                        )}

                        {/* Preview Video - CSS hover controlled visibility, React controls playback */}
                        {hasPreviewVideo && (
                            <>
                                <div
                                    className="relative w-full h-full overflow-visible absolute inset-0 opacity-0 group-hover:opacity-100"
                                    style={{
                                        transition: 'opacity 20ms linear',
                                        pointerEvents: 'none',
                                    }}
                                >
                                    <PreviewVideoPlayer
                                        src={(course as any).previewVideoUrl}
                                        shouldPlay={shouldPlayVideo}
                                    />
                                </div>

                                {/* Free lesson button - outside overlay to remain clickable */}
                                <div className="absolute bottom-3 left-3 z-10 opacity-0 group-hover:opacity-100" style={{ transition: 'opacity 20ms linear' }}>
                                    <Button
                                        size="sm"
                                        className="bg-green-600 hover:bg-green-700 text-white shadow-lg"
                                        data-testid={`button-free-lesson-${course.id}`}
                                    >
                                        <Play className="h-3 w-3 mr-1" />
                                        БЕСПЛАТНЫЙ вводный урок
                                    </Button>
                                </div>
                            </>
                        )}



                        {/* Top right badges and favorite button */}
                        <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                            {isAuthenticated && !isPurchased && (
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className={`h-8 w-8 rounded-full shadow-lg ${isFavorited
                                        ? 'bg-red-500 hover:bg-red-600 text-white'
                                        : 'bg-white/90 hover:bg-white text-red-500'
                                        }`}
                                    onClick={(e) => handleToggleFavorite(course.id, e)}
                                    data-testid={`button-favorite-${course.id}`}
                                >
                                    <Heart className={`h-4 w-4 ${isFavorited ? 'fill-current' : ''}`} />
                                </Button>
                            )}
                            {course.isFree ? (
                                <Badge className="bg-green-600 text-white shadow-lg">
                                    Бесплатно
                                </Badge>
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

                    {/* Content Section */}
                    <CardHeader className="space-y-3 pb-4">
                        <h3
                            className="font-bold text-2xl group-hover:text-xl line-clamp-2"
                            data-testid={`text-course-title-${course.id}`}
                        >
                            <span>{course.title}</span>
                        </h3>

                        {/* Rating and viewing counter */}
                        <div className="flex items-center justify-between gap-2 flex_wrap">
                            <StarRating
                                rating={Number(course.rating || 0)}
                                reviewsCount={Number(course.reviewsCount || 0)}
                                size="sm"
                            />
                            <ViewingCounter value={course.reviewsCount} courseId={course.id} />
                            {isAdmin && (
                                <div className="flex items-center gap-2 text-sm font-medium flex-wrap">
                                    {sections.some(section =>
                                        section.lessons?.some(lesson => lesson.processingStatus === 'failed')
                                    ) && <span className="text-red-500" title="Есть уроки с ошибкой">Failed</span>}

                                    {sections.some(section =>
                                        section.lessons?.some(lesson => lesson.processingStatus === 'processing')
                                    ) && <span className="text-purple-500" title="Уроки в очереди">Processing</span>}

                                    {sections.some(section =>
                                        section.lessons?.some(lesson => lesson.processingStatus === 'queued')
                                    ) && <span className="text-orange-500" title="Уроки в очереди">In Queue</span>}

                                    {sections.length > 0 &&
                                        sections.some(section =>
                                            section.lessons?.some(lesson => lesson.processingStatus === 'ready')
                                        ) &&
                                        !sections.some(section =>
                                            section.lessons?.some(lesson =>
                                                ['queued', 'processing', 'uploading', 'failed'].includes(lesson.processingStatus)
                                            )
                                        ) && (
                                            <span className="text-green-500 font-medium" title="Все загруженные уроки готовы">
                                                Ready
                                            </span>
                                        )}
                                </div>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {platforms.map((platform) => (
                                <Badge key={platform.id} variant="outline" className="text-sm font-medium">
                                    {platform.name}
                                </Badge>
                            ))}

                            {/* Уровни — показываем уникальные по имени */}
                            {allLevelBadges.map(item => <Badge key={item.id} variant="outline">{item.name}</Badge>)}


                            {/* Год */}
                            {course.year && (
                                <Badge variant="outline" className="text-sm font-medium">
                                    {course.year}
                                </Badge>
                            )}
                        </div>

                        {course.description && (
                            <p className="text-base text-muted-foreground line-clamp-2 leading-relaxed">
                                <div
                                    className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground"
                                    data-testid="text-course-description"
                                    dangerouslySetInnerHTML={{ __html: course.description || '' }}
                                />
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

                    {/* Spacer to push footer to bottom */}
                    <div className="flex-1" />

                    <CardFooter className="flex flex-col gap-3 pt-0">
                        <div className="w-full px-1">
                            <span className="text-xs text-muted-foreground mb-2 block">Цена</span>
                            {course.isFree ? (
                                <span className="text-2xl font-bold text-foreground" data-testid={`text-course-price-${course.id}`}>
                                    Бесплатно
                                </span>
                            ) : course.paymentType === 'both' ? (
                                <div className="flex items-center gap-3">
                                    <div className="flex flex-col">
                                        <span className="text-2xl font-bold text-foreground" data-testid={`text-course-price-${course.id}`}>
                                            {formatPrice(price)} ₽
                                        </span>
                                    </div>
                                    <div className="h-10 w-px bg-gradient-to-b from-transparent via-border to-transparent" />
                                    <div className="flex flex-col">
                                        <span className="text-xl font-semibold text-purple-400" data-testid={`text-course-fantik-price-${course.id}`}>
                                            {course.fantikPrice && parseInt(course.fantikPrice.toString())} 🎫
                                        </span>
                                        <span className="text-xs text-purple-400/70">фантики</span>
                                    </div>
                                </div>
                            ) : course.paymentType === 'fantiks_only' && course.fantikPrice ? (
                                <div className="flex flex-col">
                                    <span className="text-2xl font-semibold text-purple-400" data-testid={`text-course-fantik-price-${course.id}`}>
                                        {parseInt(course.fantikPrice.toString())} 🎫
                                    </span>
                                    <span className="text-sm text-purple-400/70">фантики</span>
                                </div>
                            ) : (
                                <span className="text-2xl font-bold text-foreground" data-testid={`text-course-price-${course.id}`}>
                                    {formatPrice(price)} ₽
                                </span>
                            )}
                        </div>
                        <Button
                            className={`w-full relative overflow-hidden backdrop-blur-sm font-semibold shadow-lg transition-all duration-300 group ${isPurchased
                                ? 'bg-white/5 border-2 border-blue-500/30 text-white hover:shadow-blue-500/50'
                                : 'bg-white/5 border-2 border-purple-500/30 text-white hover:shadow-purple-500/50'
                                }`}
                            size="lg"
                            data-testid={`button-view-course-${course.id}`}
                            onClick={() => setLocation(`/course/${course.id}`)}
                        >
                            <div className={`absolute inset-0 transition-opacity duration-700 ${isPurchased
                                ? 'bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 opacity-0 group-hover:opacity-100'
                                : 'bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 opacity-0 group-hover:opacity-100'
                                }`} />
                            <span className="relative flex items-center justify-center">
                                {isPurchased ? (
                                    <>
                                        <ShoppingCart className="mr-2 h-4 w-4" />
                                        Открыть курс
                                    </>
                                ) : (
                                    <>
                                        <ArrowRight className="mr-2 h-4 w-4" />
                                        Подробнее
                                    </>
                                )}
                            </span>
                        </Button>
                    </CardFooter>
                </div>
            </GlassCard>
        </div>
    )
}

export default ShopDesktopCard
