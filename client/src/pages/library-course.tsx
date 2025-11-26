import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { VideoPlayer } from "@/components/VideoPlayer";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CheckCircle2, Circle, Download, FileText, ArrowLeft } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Course, CourseSection, Lesson, CourseFile, LessonProgress, User } from "@shared/schema";
import { Link } from "wouter";
import { Footer } from "@/components/footer";

interface SectionWithLessons extends CourseSection {
  lessons: (Lesson & { progress?: LessonProgress })[];
}

// Helper function to extract plain text from HTML for preview
function stripHtml(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

// Helper function to convert URLs in text to clickable links
// Works only on text nodes, preserving existing HTML structure and attributes
function linkifyText(html: string): string {
  if (!html) return html;
  
  // Create a temporary DOM element to parse the HTML
  const temp = document.createElement('div');
  temp.innerHTML = html;
  
  // Regular expression to match URLs (non-global to avoid state leak)
  const urlRegex = /(https?:\/\/[^\s<]+)/;
  
  // Function to process text nodes recursively
  function processNode(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      // This is a text node, check for URLs
      const text = node.textContent || '';
      const parts: (string | HTMLAnchorElement)[] = [];
      let remaining = text;
      let match;
      
      // Split text by URLs and create anchor elements
      while ((match = remaining.match(urlRegex)) !== null) {
        const url = match[0];
        const index = match.index!;
        
        // Add text before the URL
        if (index > 0) {
          parts.push(remaining.substring(0, index));
        }
        
        // Create anchor element for the URL
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.className = 'text-primary hover:underline';
        link.textContent = url;
        parts.push(link);
        
        // Continue with remaining text
        remaining = remaining.substring(index + url.length);
      }
      
      // Add any remaining text
      if (remaining) {
        parts.push(remaining);
      }
      
      // Replace the text node with the new content if URLs were found
      if (parts.length > 0) {
        const parent = node.parentNode;
        if (parent) {
          parts.forEach(part => {
            if (typeof part === 'string') {
              parent.insertBefore(document.createTextNode(part), node);
            } else {
              parent.insertBefore(part, node);
            }
          });
          parent.removeChild(node);
        }
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      // Skip anchor tags to avoid nesting links
      if ((node as Element).tagName !== 'A') {
        // Process child nodes (iterate backwards to avoid issues with DOM mutations)
        const children = Array.from(node.childNodes);
        children.forEach(child => processNode(child));
      }
    }
  }
  
  // Process all nodes in the temporary element
  Array.from(temp.childNodes).forEach(child => processNode(child));
  
  return temp.innerHTML;
}

export default function LibraryCourse() {
  const [, params] = useRoute("/library/:id");
  const courseId = params?.id;
  const { toast } = useToast();
  const [selectedLesson, setSelectedLesson] = useState<(Lesson & { progress?: LessonProgress }) | null>(null);

  const { data: user } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  const { data: course, isLoading: courseLoading } = useQuery<Course>({
    queryKey: ["/api/courses", courseId],
    enabled: !!courseId,
  });

  const { data: sections, isLoading: sectionsLoading } = useQuery<SectionWithLessons[]>({
    queryKey: ["/api/courses", courseId, "sections"],
    enabled: !!courseId,
  });

  // Find first lesson as default for currentLesson
  const firstLesson = sections?.flatMap(s => s.lessons)[0];
  const currentLesson = selectedLesson || firstLesson;

  const { data: files = [] } = useQuery<CourseFile[]>({
    queryKey: [`/api/courses/${courseId}/files?lessonId=${currentLesson?.id}`],
    enabled: !!courseId && !!currentLesson,
  });

  const markCompleteMutation = useMutation({
    mutationFn: async ({ lessonId, completed, watchedSeconds }: { lessonId: string; completed: boolean; watchedSeconds?: number }) => {
      return apiRequest("POST", `/api/courses/${courseId}/lessons/${lessonId}/progress`, { completed, watchedSeconds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses", courseId, "sections"] });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить прогресс",
        variant: "destructive",
      });
    },
  });

  const saveProgressMutation = useMutation({
    mutationFn: async ({ lessonId, watchedSeconds }: { lessonId: string; watchedSeconds: number }) => {
      return apiRequest("POST", `/api/courses/${courseId}/lessons/${lessonId}/progress`, { 
        completed: false, 
        watchedSeconds 
      });
    },
    // Don't invalidate queries on auto-save to avoid unnecessary refetching
    // Progress is saved to database but UI updates only when marked complete
  });

  if (courseLoading || sectionsLoading) {
    return (
      <div className="min-h-screen bg-background overflow-x-hidden">
        <Header />
        <main className="container mx-auto px-4 py-6 max-w-7xl">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Skeleton className="aspect-video w-full" />
            </div>
            <div>
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!course || !sections) {
    return (
      <div className="min-h-screen bg-background overflow-x-hidden">
        <Header />
        <main className="container mx-auto px-4 py-6 max-w-7xl">
          <p>Курс не найден</p>
        </main>
      </div>
    );
  }

  // Calculate progress
  const allLessons = sections.flatMap(s => s.lessons);
  const completedLessons = allLessons.filter(l => l.progress?.completed);
  const completionPercentage = allLessons.length > 0 
    ? (completedLessons.length / allLessons.length) * 100 
    : 0;

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="mb-6">
          <Link href="/library">
            <Button variant="ghost" className="gap-2" data-testid="button-back-to-library">
              <ArrowLeft className="h-4 w-4" />
              Вернуться в библиотеку
            </Button>
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2" data-testid="text-course-title">{course.title}</h1>
          <p className="text-muted-foreground mb-4">Автор: {course.authorName}</p>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Прогресс курса</span>
                <span className="text-sm font-medium" data-testid="text-progress-percentage">
                  {Math.round(completionPercentage)}%
                </span>
              </div>
              <Progress value={completionPercentage} className="h-2" data-testid="progress-bar" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {currentLesson && (
              <Card>
                <CardHeader>
                  <CardTitle data-testid="text-current-lesson-title">{currentLesson.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {currentLesson.videoUrl && (
                    <VideoPlayer
                      src={currentLesson.videoUrl}
                      userEmail={user?.email ?? undefined}
                      initialTime={currentLesson.progress?.watchedSeconds || 0}
                      onProgressSave={(watchedSeconds) => {
                        saveProgressMutation.mutate({ lessonId: currentLesson.id, watchedSeconds });
                      }}
                      onComplete={() => {
                        const lesson = allLessons.find(l => l.id === currentLesson.id);
                        if (!lesson?.progress?.completed) {
                          markCompleteMutation.mutate({ 
                            lessonId: currentLesson.id, 
                            completed: true,
                            watchedSeconds: 0  // Reset position when completed
                          });
                        }
                      }}
                    />
                  )}

                  {currentLesson.description && (
                    <div className="space-y-2" data-testid="lesson-description">
                      <h3 className="text-lg font-semibold">Описание</h3>
                      <div 
                        className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_a]:text-primary [&_a]:hover:underline"
                        dangerouslySetInnerHTML={{ __html: linkifyText(currentLesson.description) }}
                      />
                    </div>
                  )}

                  {files.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold">Материалы урока</h3>
                      <div className="space-y-2">
                        {files.map((file) => (
                          <a
                            key={file.id}
                            href={file.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 rounded-lg border hover-elevate transition-all"
                            data-testid={`link-file-${file.id}`}
                          >
                            {file.fileType === "document" ? (
                              <FileText className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <Download className="h-5 w-5 text-muted-foreground" />
                            )}
                            <div className="flex-1">
                              <p className="font-medium">{file.fileName}</p>
                              {file.fileSize && (
                                <p className="text-sm text-muted-foreground">
                                  {(file.fileSize / 1024 / 1024).toFixed(2)} MB
                                </p>
                              )}
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Содержание курса</CardTitle>
                <CardDescription>
                  {completedLessons.length} из {allLessons.length} уроков завершено
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {sections.map((section) => (
                    <AccordionItem key={section.id} value={section.id}>
                      <AccordionTrigger
                        className="hover:no-underline"
                        data-testid={`accordion-section-${section.id}`}
                      >
                        <div className="flex items-center gap-2 text-left">
                          <div>
                            <p className="font-medium">{section.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {section.lessons.filter(l => l.progress?.completed).length} из {section.lessons.length} уроков
                            </p>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2 pl-2">
                          {section.lessons.map((lesson, index) => {
                            const isCurrentLesson = currentLesson?.id === lesson.id;
                            return (
                              <div
                                key={lesson.id}
                                className={`p-3 rounded-lg border space-y-2 transition-colors ${
                                  isCurrentLesson 
                                    ? 'border-primary bg-primary/5' 
                                    : 'border-border'
                                }`}
                                data-testid={`lesson-item-${lesson.id}`}
                              >
                                <div className="flex items-start gap-2">
                                  {lesson.progress?.completed ? (
                                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                  ) : (
                                    <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                                  )}
                                  <div className="flex-1">
                                    <p className={`font-medium ${isCurrentLesson ? 'text-primary' : ''}`}>
                                      {lesson.title}
                                    </p>
                                    {lesson.description && (
                                      <p className="text-sm text-muted-foreground line-clamp-2">
                                        {stripHtml(lesson.description)}
                                      </p>
                                    )}
                                    {lesson.duration && (
                                      <p className="text-sm text-muted-foreground">{lesson.duration} мин</p>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="flex gap-2">
                                  <Button
                                    variant={isCurrentLesson ? "default" : "outline"}
                                    size="sm"
                                    className="flex-1"
                                    onClick={() => setSelectedLesson(lesson)}
                                    data-testid={`button-watch-lesson-${lesson.id}`}
                                  >
                                    {isCurrentLesson ? 'Просматривается' : 'Смотреть урок'}
                                  </Button>
                                {lesson.progress?.completed ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="flex-1"
                                    onClick={() =>
                                      markCompleteMutation.mutate({ lessonId: lesson.id, completed: false })
                                    }
                                    disabled={markCompleteMutation.isPending}
                                    data-testid={`button-mark-incomplete-${lesson.id}`}
                                  >
                                    Отметить как непройденный
                                  </Button>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="flex-1"
                                    onClick={() =>
                                      markCompleteMutation.mutate({ lessonId: lesson.id, completed: true })
                                    }
                                    disabled={markCompleteMutation.isPending}
                                    data-testid={`button-mark-complete-${lesson.id}`}
                                  >
                                    Отметить как пройденный
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
