import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";
import { formatPrice } from "@/lib/formatPrice";
import { Pagination } from "@/components/pagination";

const COURSES_PER_PAGE = 10;

// Helper function to extract plain text from HTML for preview
function stripHtml(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

interface Course {
  id: string;
  title: string;
  description: string | null;
  price: number;
  authorName: string;
  thumbnailImage: string | null;
  level: string[] | null;
  year: number;
}

export default function AdminAllCourses() {
  const [currentPage, setCurrentPage] = useState(1);

  const { data: courses, isLoading } = useQuery<Course[]>({
    queryKey: ["/api/admin/courses"],
    queryFn: async () => {
      const response = await fetch("/api/admin/courses", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch");
      return response.json();
    },
  });

  // Reset to page 1 when courses data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [courses]);

  // Pagination calculations
  const totalCourses = courses?.length || 0;
  const totalPages = Math.ceil(totalCourses / COURSES_PER_PAGE);
  const startIndex = (currentPage - 1) * COURSES_PER_PAGE;
  const endIndex = startIndex + COURSES_PER_PAGE;
  const paginatedCourses = courses?.slice(startIndex, endIndex) || [];

  const getLevelName = (level: string | string[] | null) => {
    if (!level) return "";
    
    const names: Record<string, string> = {
      beginner: "Для новичков",
      intermediate: "Для опытных",
      advanced: "Продвинутый",
    };
    
    // Handle array of levels
    if (Array.isArray(level)) {
      return level.map(l => names[l] || l).join(", ");
    }
    
    // Handle single string level (backward compatibility)
    return names[level] || level;
  };

  const breadcrumbs = [
    { label: "Курсы" },
  ];

  return (
    <AdminLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold">Все курсы</h1>
            <p className="text-muted-foreground">
              {courses?.length || 0} курсов
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Загрузка...</div>
        ) : (
          <>
            <div className="grid gap-4">
              {paginatedCourses.map((course, idx) => {
              const raw: any = course as any;
              const core: any = raw.courses ?? raw;

              const title = core.title ?? "";
              const description = core.description ?? "";
              const instructor = core.instructor ?? core.authorName ?? "";
              const thumbnail = core.thumbnailUrl ?? core.thumbnailImage ?? null;
              const price = core.price !== undefined && core.price !== null ? Number(core.price) : null;
              const level = core.level ?? "";
              const year = core.year ?? "";
              const isFree = core.isFree ?? false;

              return (
                <Card
                  key={`${core.id ?? course.id}-${idx}`}
                  className="hover-elevate transition-all"
                  data-testid={`card-course-${core.id ?? course.id}`}
                >
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      {thumbnail && (
                        <img
                          src={thumbnail}
                          alt={title}
                          className="w-24 h-24 object-cover rounded"
                        />
                      )}

                      <div className="flex-1">
                        <h3 className="text-xl font-bold mb-1">{title}</h3>
                        {instructor && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {instructor}
                          </p>
                        )}
                        {description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {stripHtml(description)}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span>
                            {isFree ? "Бесплатно" : (price !== null ? `${formatPrice(price)} ₽` : "—")}
                          </span>
                          {level && (
                            <span className="text-muted-foreground">{getLevelName(level)}</span>
                          )}
                          {year && (
                            <span className="text-muted-foreground">{year}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          asChild
                          size="icon"
                          variant="ghost"
                          data-testid={`button-edit-course-${core.id ?? course.id}`}
                        >
                          <Link href={`/admin/courses/${core.id ?? course.id}/edit`}>
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalCourses}
              itemLabel="курсов"
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>
    </AdminLayout>
  );
}
