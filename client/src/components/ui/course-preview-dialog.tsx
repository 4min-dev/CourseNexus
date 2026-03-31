import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BookOpen, ArrowRight } from "lucide-react";
import type { Course } from "@shared/schema";
import { formatPrice } from "@/lib/formatPrice";
import { StarRating } from "@/components/star-rating";
import { ViewingCounter } from "@/components/viewing-counter";

interface CoursePreviewDialogProps {
    course: Course | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CoursePreviewDialog({ course, open, onOpenChange }: CoursePreviewDialogProps) {
    if (!course) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[95vw] sm:max-w-[500px] max-h-[90vh] overflow-y-auto" data-testid="dialog-course-preview">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold pr-8">{course.title}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 max-md:space-y-2">
                    <div className="relative aspect-video overflow-hidden rounded-lg bg-gradient-to-br from-purple-900/20 to-pink-900/20">
                        {course.thumbnailImage ? (
                            <img
                                src={course.thumbnailImage}
                                alt={course.title}
                                className="absolute inset-0 w-full h-full object-cover"
                            />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <BookOpen className="h-16 w-16 text-muted-foreground/30" />
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-between gap-4 max-md:gap-2">
                        <StarRating
                            rating={Number(course.rating || 0)}
                            reviewsCount={Number(course.reviewsCount || 0)}
                        />
                        <ViewingCounter value={course.reviewsCount} courseId={course.id} />
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {course.platform && (
                            <Badge variant="outline" className="text-sm">
                                {course.platform}
                            </Badge>
                        )}
                        {course.year && (
                            <Badge variant="outline" className="text-sm">
                                {course.year}
                            </Badge>
                        )}
                    </div>

                    {course.description && (
                        <div className="space-y-2">
                            <h4 className="font-semibold text-sm text-muted-foreground">Описание</h4>
                            <div
                                className="prose prose-sm dark:prose-invert max-w-none text-foreground leading-relaxed text-sm"
                                dangerouslySetInnerHTML={{ __html: course.description }}
                            />
                        </div>
                    )}

                    {course.authorName && (
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                            <Avatar className="h-10 w-10 border-2 border-primary/20">
                                <AvatarImage src={course.authorImage || undefined} />
                                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                    {course.authorName[0] || "?"}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                                <span className="text-xs text-muted-foreground">Автор</span>
                                <span className="text-sm font-medium">{course.authorName}</span>
                            </div>
                        </div>
                    )}

                    {course.price && (
                        <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                            <span className="text-sm text-muted-foreground">Цена курса</span>
                            <span className="text-2xl font-bold">
                                {formatPrice(parseFloat(course.price))}
                            </span>
                        </div>
                    )}

                    <Button
                        className="w-full gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg"
                        size="lg"
                        onClick={() => {
                            onOpenChange(false);
                            window.location.href = `/course/${course.id}`;
                        }}
                        data-testid="button-view-full-course"
                    >
                        <ArrowRight className="h-5 w-5" />
                        Перейти к курсу
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
