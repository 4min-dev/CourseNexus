import { useState } from "react";
import { createPortal } from "react-dom";
import { useIsMobile } from "@/hooks/useIsMobile";;
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BookOpen, Sparkles, Gem, ArrowRight } from "lucide-react";
import type { Course } from "@shared/schema";
import { formatPrice } from "@/lib/formatPrice";
import { StarRating } from "@/components/star-rating";
import { ViewingCounter } from "@/components/viewing-counter";
import starterPackageImg from "@assets/generated_images/Starter_package_illustration_bundle_1c8f4d88.png";
import professionalPackageImg from "@assets/generated_images/Professional_package_illustration_levels_de5bc7a2.png";
import premiumPackageImg from "@assets/generated_images/Premium_package_illustration_orbit_4879daf5.png";


interface CoursePackage {
    id: string;
    name: string;
    description: string | null;
    thumbnailUrl: string | null;
    discount: number;
    displayOrder: number;
    isActive: boolean;
    courses: Course[];
    totalPrice: number;
    discountedPrice: number;
}

function PackageCard({ pkg, idx }: { pkg: CoursePackage; idx: number }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [hoveredCourse, setHoveredCourse] = useState<string | null>(null);
    const [previewCourse, setPreviewCourse] = useState<Course | null>(null);
    const packageImages = [starterPackageImg, professionalPackageImg, premiumPackageImg];
    const packageImage = pkg.thumbnailUrl || packageImages[idx % packageImages.length];

    // Use shared mobile detection hook - prevents memory leaks from multiple resize listeners
    const isMobile = useIsMobile();

    // Toggle expansion on mobile (touch devices)
    const handleMobileToggle = (e: React.MouseEvent) => {
        // Only toggle if clicking on the card itself, not interactive elements
        const target = e.target as HTMLElement;
        if (target.closest('button') || target.closest('a')) {
            return;
        }

        if (isMobile) {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
        }
    };

    const handleCardClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;

        // Не реагируем, если клик по кнопке, ссылке или интерактивному элементу
        if (target.closest('button') || target.closest('a') || target.closest('[role="dialog"]')) {
            return;
        }

        e.stopPropagation();
        setIsExpanded(prev => !prev); // toggle
    };

    // Закрытие при клике на бэкдроп (только на мобильных)
    const handleBackdropClick = () => {
        setIsExpanded(false);
    };

    return (
        <div
            className={`group relative ${idx === 0 ? 'md:col-span-2 lg:col-span-1' : ''}`}
            onClick={handleCardClick}
            data-testid={`card-package-${pkg.id}`}
            style={{
                zIndex: isExpanded ? 50 : 'auto',
                position: 'relative'
            }}
        >
            {/* Glassmorphism Card - GPU optimized via global CSS */}
            <div
                className={`
          relative overflow-visible rounded-2xl h-full
          bg-gradient-to-br from-background/40 via-background/60 to-background/40
          backdrop-blur-md border-2 border-purple-500/20
          transition-[transform,box-shadow,border-color] duration-200 ease-out
          flex flex-col
          transform-gpu scale-100
          ${isExpanded ? 'scale-[1.02] shadow-2xl shadow-purple-500/30 border-purple-500/40' : 'hover-elevate active-elevate-2 md:active:scale-100'}
        `}
                style={{
                    backdropFilter: 'blur(8px) saturate(140%)',
                    WebkitBackdropFilter: 'blur(8px) saturate(140%)',
                    transformOrigin: 'center center',
                }}
            >
                {/* Animated gradient border effect */}
                <div
                    className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-pink-500/20 to-orange-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-100 pointer-events-none"
                />

                {/* Discount Badge - Floating */}
                {pkg.discount > 0 && (
                    <div className="absolute top-6 right-6 z-20">
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-red-500 rounded-full blur-md opacity-40" />
                            <Badge
                                className="relative bg-gradient-to-r from-orange-600 to-red-600 text-white border-0 text-lg px-5 py-2.5 shadow-lg font-bold"
                                data-testid={`badge-discount-${pkg.id}`}
                            >
                                <Sparkles className="h-4 w-4 mr-1.5" />
                                -{pkg.discount}%
                            </Badge>
                        </div>
                    </div>
                )}

                {/* Hero Image with Parallax */}
                <div className="relative h-64 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-600/30 via-pink-600/20 to-orange-600/30" />
                    <img
                        src={packageImage}
                        alt={pkg.name}
                        className={`
              absolute inset-0 w-full h-full object-cover transition-transform duration-150 ease-out
              transform-gpu scale-100
              ${isExpanded ? 'scale-[1.03]' : ''}
            `}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />

                    {/* Package Title Overlay */}
                    <div className="absolute bottom-6 left-6 right-6">
                        <h3 className="text-3xl font-bold text-white drop-shadow-lg" data-testid={`text-package-name-${pkg.id}`}>
                            {pkg.name}
                        </h3>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4 flex-1 flex flex-col min-h-[280px] max-md:px-4 max-md:space-y-2">
                    {/* Description */}
                    {pkg.description && (
                        <p className="text-muted-foreground leading-relaxed line-clamp-3 break-words" data-testid={`text-package-description-${pkg.id}`}>
                            {pkg.description}
                        </p>
                    )}

                    {/* Stats Row */}
                    <div className="flex flex-wrap items-center gap-6 text-sm max-md:gap-3">
                        <div className="flex flex-wrap items-center gap-2 max-md:gap-1">
                            <div className="p-2 rounded-lg bg-purple-500/10">
                                <BookOpen className="h-4 w-4 text-purple-400" />
                            </div>
                            <span className="font-medium" data-testid={`text-course-count-${pkg.id}`}>
                                {pkg.courses.length} {pkg.courses.length === 1 ? 'курс' : 'курса'}
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 max-md:gap-1">
                            <div className="p-2 rounded-lg bg-green-500/10">
                                <Gem className="h-4 w-4 text-green-400" />
                            </div>
                            <span className="font-medium text-green-500">
                                Экономия {formatPrice(pkg.totalPrice - pkg.discountedPrice)}
                            </span>
                        </div>
                    </div>

                    {/* Pricing Section */}
                    <div className="pt-4 border-t border-border/50 mt-auto">
                        <div className="flex flex-col gap-4 max-md:gap-2">
                            <div className="space-y-1">
                                {pkg.discount > 0 ? (
                                    <>
                                        <div className="flex flex-wrap items-baseline gap-3 max-md:gap-2">
                                            <span className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent" data-testid={`text-discounted-price-${pkg.id}`}>
                                                {formatPrice(pkg.discountedPrice)}
                                            </span>
                                            <span className="text-lg text-muted-foreground line-through" data-testid={`text-original-price-${pkg.id}`}>
                                                {formatPrice(pkg.totalPrice)}
                                            </span>
                                        </div>
                                    </>
                                ) : (
                                    <span className="text-4xl font-bold" data-testid={`text-price-${pkg.id}`}>
                                        {formatPrice(pkg.totalPrice)}
                                    </span>
                                )}
                            </div>

                            <Button
                                className="w-full relative overflow-hidden backdrop-blur-sm bg-white/5 border-2 border-purple-500/30 text-white shadow-lg hover:shadow-purple-500/50 transition-all duration-300 font-semibold group"
                                size="lg"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    window.location.href = `/package/${pkg.id}`;
                                }}
                                data-testid={`button-view-package-${pkg.id}`}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                                <span className="relative flex items-center justify-center gap-2">
                                    <ArrowRight className="h-5 w-5" />
                                    Изучить подробнее
                                </span>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile backdrop - rendered via Portal to escape carousel */}
            {isExpanded && isMobile && createPortal(
                <div
                    className="fixed inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
                    style={{ zIndex: 9998 }}
                    onClick={() => {
                        console.log('[PackageCard] Backdrop clicked, closing overlay');
                        setIsExpanded(false);
                    }}
                />,
                document.body
            )}

            {/* Expandable Course Grid - Absolutely positioned overlay on desktop, Portal on mobile */}
            {isExpanded && pkg.courses && pkg.courses.length > 0 && (
                isMobile ? createPortal(
                    <div
                        className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-h-[70vh] overflow-y-auto scrollbar-hide bg-background/95 backdrop-blur-lg rounded-2xl border-2 border-purple-500/20 p-4 shadow-2xl shadow-purple-500/20 animate-in fade-in duration-300"
                        style={{
                            zIndex: 9999,
                            transform: 'translateY(-50%) translateZ(0)'
                        }}
                        onClick={(e) => {
                            // Prevent closing when clicking inside expanded area on mobile
                            e.stopPropagation();
                        }}
                    >
                        <div className="grid grid-cols-2 gap-3">
                            {pkg.courses.map((course) => (
                                <div
                                    key={course.id}
                                    className="group/course relative cursor-pointer"
                                    onClick={() => setPreviewCourse(course)}
                                    data-testid={`mini-course-card-${course.id}`}
                                >
                                    {/* Course Mini Card */}
                                    <div
                                        className="relative overflow-hidden rounded-xl border border-border/50 transition-all duration-200 ease-out"
                                        style={{
                                            transform: 'translateZ(0)',
                                            transformOrigin: 'center center'
                                        }}
                                    >
                                        {/* Course Thumbnail */}
                                        <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-purple-900/20 to-pink-900/20">
                                            {course.thumbnailImage ? (
                                                <img
                                                    src={course.thumbnailImage}
                                                    alt={course.title}
                                                    className="absolute inset-0 w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <BookOpen className="h-8 w-8 text-muted-foreground/30" />
                                                </div>
                                            )}
                                        </div>
                                        {/* Course Info */}
                                        <div className="p-2 bg-background">
                                            <p className="text-xs font-semibold line-clamp-2">
                                                {course.title}
                                            </p>
                                            {course.price && (
                                                <p className="text-xs text-purple-400 mt-1">
                                                    {formatPrice(parseFloat(course.price))}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>,
                    document.body
                ) : (
                    <div
                        className="absolute left-0 right-0 top-full slide-in-from-top-4 bg-background/95 backdrop-blur-lg rounded-2xl border-2 border-purple-500/20 p-4 shadow-2xl shadow-purple-500/20 animate-in fade-in duration-300"
                        style={{
                            zIndex: 100,
                            transform: 'translateZ(0)',
                            marginTop: '-2px'
                        }}
                        onMouseEnter={() => setIsExpanded(true)}
                        onMouseLeave={() => {
                            setIsExpanded(false);
                            setHoveredCourse(null);
                        }}
                    >
                        <div className="grid grid-cols-2 gap-3">
                            {pkg.courses.map((course) => (
                                <div
                                    key={course.id}
                                    className="group/course relative cursor-pointer"
                                    onMouseEnter={() => setHoveredCourse(course.id)}
                                    onMouseLeave={() => setHoveredCourse(null)}
                                    onClick={() => setPreviewCourse(course)}
                                    data-testid={`mini-course-card-${course.id}`}
                                >
                                    {/* Course Mini Card */}
                                    <div
                                        className={`
                      relative overflow-hidden rounded-xl border
                      transition-all duration-200 ease-out
                      ${hoveredCourse === course.id
                                                ? 'border-purple-500/60 shadow-lg shadow-purple-500/20 scale-105 z-10'
                                                : 'border-border/50'
                                            }
                    `}
                                        style={{
                                            transform: 'translateZ(0)',
                                            transformOrigin: 'center center'
                                        }}
                                    >
                                        {/* Course Thumbnail */}
                                        <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-purple-900/20 to-pink-900/20">
                                            {course.thumbnailImage ? (
                                                <img
                                                    src={course.thumbnailImage}
                                                    alt={course.title}
                                                    className="absolute inset-0 w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <BookOpen className="h-8 w-8 text-muted-foreground/30" />
                                                </div>
                                            )}
                                            {/* Hover Overlay */}
                                            <div className={`
                        absolute inset-0 bg-gradient-to-t from-background via-background/90 to-transparent
                        transition-opacity duration-75 ease-out
                        ${hoveredCourse === course.id ? 'opacity-100' : 'opacity-0'}
                      `}>
                                                <div className="absolute bottom-2 left-2 right-2">
                                                    <p className="text-xs font-semibold text-white line-clamp-2">
                                                        {course.title}
                                                    </p>
                                                    {course.price && (
                                                        <p className="text-xs text-purple-300 mt-1">
                                                            {formatPrice(parseFloat(course.price))}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            )}

            {/* Course Preview Dialog */}
            <Dialog open={!!previewCourse} onOpenChange={(open) => !open && setPreviewCourse(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-course-preview">
                    {previewCourse && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-bold pr-8">{previewCourse.title}</DialogTitle>
                            </DialogHeader>

                            <div className="space-y-4 max-md:space-y-2">
                                {/* Course Thumbnail */}
                                <div className="relative aspect-video overflow-hidden rounded-lg bg-gradient-to-br from-purple-900/20 to-pink-900/20">
                                    {previewCourse.thumbnailImage ? (
                                        <img
                                            src={previewCourse.thumbnailImage}
                                            alt={previewCourse.title}
                                            className="absolute inset-0 w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <BookOpen className="h-16 w-16 text-muted-foreground/30" />
                                        </div>
                                    )}
                                </div>

                                {/* Rating and Stats */}
                                <div className="flex items-center justify-between gap-4 max-md:gap-2">
                                    <StarRating
                                        rating={Number(previewCourse.rating || 0)}
                                        reviewsCount={Number(previewCourse.reviewsCount || 0)}
                                    />
                                    <ViewingCounter value={previewCourse.reviewsCount} courseId={previewCourse.id} />
                                </div>

                                {/* Badges */}
                                <div className="flex flex-wrap gap-2">
                                    {previewCourse.platform && (
                                        <Badge variant="outline" className="text-sm">
                                            {previewCourse.platform}
                                        </Badge>
                                    )}
                                    {previewCourse.level && (
                                        <Badge variant="outline" className="text-sm">
                                            {previewCourse.level}
                                        </Badge>
                                    )}
                                    {previewCourse.year && (
                                        <Badge variant="outline" className="text-sm">
                                            {previewCourse.year}
                                        </Badge>
                                    )}
                                </div>

                                {/* Description */}
                                {previewCourse.description && (
                                    <div className="space-y-2">
                                        <h4 className="font-semibold text-sm text-muted-foreground">Описание</h4>
                                        <div
                                            className="prose prose-sm dark:prose-invert max-w-none text-foreground leading-relaxed text-sm"
                                            dangerouslySetInnerHTML={{ __html: previewCourse.description }}
                                        />
                                    </div>
                                )}

                                {/* Author */}
                                {previewCourse.authorName && (
                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                                        <Avatar className="h-10 w-10 border-2 border-primary/20">
                                            <AvatarImage src={previewCourse.authorImage || undefined} />
                                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                                {previewCourse.authorName[0] || "?"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col">
                                            <span className="text-xs text-muted-foreground">Автор</span>
                                            <span className="text-sm font-medium">{previewCourse.authorName}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Price */}
                                {previewCourse.price && (
                                    <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                                        <span className="text-sm text-muted-foreground">Цена курса</span>
                                        <span className="text-2xl font-bold">
                                            {formatPrice(parseFloat(previewCourse.price))}
                                        </span>
                                    </div>
                                )}

                                {/* View Course Button */}
                                <Button
                                    className="w-full gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg"
                                    size="lg"
                                    onClick={() => {
                                        setPreviewCourse(null);
                                        window.location.href = `/course/${previewCourse.id}`;
                                    }}
                                    data-testid="button-view-full-course"
                                >
                                    <ArrowRight className="h-5 w-5" />
                                    Перейти к курсу
                                </Button>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default PackageCard
