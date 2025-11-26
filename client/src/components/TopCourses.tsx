import { useQuery } from "@tanstack/react-query";
import { Trophy, Star, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/formatPrice";
import { StarRating } from "@/components/star-rating";
import type { Course } from "@shared/schema";
import { Link } from "wouter";

interface TopCoursesProps {
  categoryId: string;
  platform?: string;
  limit?: number;
  title?: string;
}

type TopCourse = Course & { purchaseCount: number };

export function TopCourses({ categoryId, platform, limit = 5, title = "🔥 Популярные курсы" }: TopCoursesProps) {
  const { data: topCourses, isLoading } = useQuery<TopCourse[]>({
    queryKey: ["/api/categories", categoryId, "top-courses", { platform, limit }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (platform) params.append("platform", platform);
      if (limit) params.append("limit", limit.toString());
      const url = `/api/categories/${categoryId}/top-courses${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4" data-testid="top-courses-loading">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="grid gap-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!topCourses || topCourses.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4" data-testid="top-courses-section">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full blur-md opacity-50" />
          <div className="relative bg-gradient-to-r from-yellow-500 to-orange-500 p-2 rounded-full">
            <Trophy className="h-5 w-5 text-white" />
          </div>
        </div>
        <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 bg-clip-text text-transparent">
          {title}
        </h2>
      </div>

      {/* Top Courses Grid */}
      <div className="grid gap-3">
        {topCourses.map((course, index) => (
          <Link 
            key={course.id} 
            href={`/course/${course.id}`}
            data-testid={`top-course-${course.id}`}
          >
            <Card className="group relative overflow-hidden hover-elevate active-elevate-2 cursor-pointer transition-all duration-200">
              {/* Rank Badge */}
              <div className="absolute top-3 left-3 z-10">
                <Badge 
                  className={`
                    text-sm font-bold px-2.5 py-1
                    ${index === 0 ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white' : ''}
                    ${index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-500 text-white' : ''}
                    ${index === 2 ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white' : ''}
                    ${index > 2 ? 'bg-muted text-muted-foreground' : ''}
                  `}
                >
                  #{index + 1}
                </Badge>
              </div>

              <div className="flex gap-4 p-4">
                {/* Thumbnail */}
                <div className="relative w-32 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                  {course.thumbnailImage ? (
                    <img
                      src={course.thumbnailImage}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      data-testid={`img-top-course-${course.id}`}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500/10 to-pink-500/10">
                      <TrendingUp className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Course Info */}
                <div className="flex-1 min-w-0 space-y-2">
                  <h3 className="font-semibold text-base line-clamp-1 group-hover:text-purple-500 transition-colors">
                    {course.title}
                  </h3>
                  
                  {/* Author and Year */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {course.authorName && (
                      <span className="line-clamp-1">{course.authorName}</span>
                    )}
                    {course.authorName && course.year && <span>•</span>}
                    {course.year && <span>{course.year}</span>}
                  </div>

                  {/* Description */}
                  {course.description && (
                    <div 
                      className="text-xs text-muted-foreground line-clamp-2 prose prose-xs dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: course.description }}
                    />
                  )}
                  
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Rating */}
                    {course.rating !== null && parseFloat(course.rating as string) > 0 && (
                      <div className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                        <span className="text-sm font-medium">{parseFloat(course.rating as string).toFixed(1)}</span>
                        {course.reviewsCount > 0 && (
                          <span className="text-xs text-muted-foreground">({course.reviewsCount})</span>
                        )}
                      </div>
                    )}

                    {/* Level */}
                    {course.level && (
                      <Badge variant="secondary" className="text-xs">
                        {course.level}
                      </Badge>
                    )}

                    {/* Price */}
                    <span className="text-sm font-bold text-purple-600 dark:text-purple-400 ml-auto">
                      {formatPrice(parseInt(course.price || "0"))} ₽
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
