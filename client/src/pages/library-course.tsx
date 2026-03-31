import { useEffect, useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useRoute } from "wouter"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { VideoPlayer } from "@/components/VideoPlayer"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { CheckCircle2, Circle, Download, FileText, ArrowLeft } from "lucide-react"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"
import type { Course, CourseSection, Lesson, CourseFile, LessonProgress, User } from "@shared/schema"
import { Link } from "wouter"
import { Footer } from "@/components/footer"
import { formatFileSize } from "@/lib/formatFileSize"
import { getFileIcon } from "@/lib/getFileIcon"
import { fetchLinkMeta } from "@/lib/fetchLinkMeta"
import { isImageFile } from "@/lib/isImageFile"
import { LessonLightbox } from "@/components/ui/lesson-lightbox"
import { useIsMobile } from "@/hooks/useIsMobile"

interface SectionWithLessons extends CourseSection {
  lessons: (Lesson & { progress?: LessonProgress })[]
}

function stripHtml(html) {
  const tmp = document.createElement("div")
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ""
}

function LinkCard({ url }: { url: string }) {
  const [meta, setMeta] = useState<any>(null)
  const isMobileDevice = useIsMobile()

  useEffect(() => {
    fetchLinkMeta(url).then(setMeta).catch(() => setMeta(null))
  }, [url])

  const accent =
    meta?.type === "youtube" ? "#FF0000" :
      meta?.type === "google-sheets" ? "#0F9D58" :
        meta?.type === "google-docs" ? "#4285F4" :
          meta?.type === "figma" ? "#A259FF" :
            meta?.type === "notion" ? "#888888" :
              meta?.type === "github" ? "#58a6ff" :
                "#6C5CE7"

  const domain = new URL(url).hostname.replace(/^www\./, "")

  if (!meta) return <Skeleton className="h-24 w-full rounded-xl" />

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex rounded-xl border border-border/60 bg-[#15171c] hover:bg-[#1b1d24] transition-all duration-200 overflow-hidden relative my-4 transform hover:translate-y-[-2px]"
      style={{ "--accent": accent } as React.CSSProperties}
    >
      <div className="w-[3px] bg-[var(--accent)] flex-shrink-0" />

      <div className="flex-1 px-[13px] py-[11px] min-w-0">
        <div className="flex items-center gap-[5px] mb-1">
          {meta?.favicon && (
            <img
              src={meta.favicon}
              alt=""
              className="w-[14px] h-[14px] rounded-[3px] flex-shrink-0"
              onError={e => e.currentTarget.style.display = "none"}
            />
          )}
          <span className="text-[11.5px] font-medium text-[var(--accent)] truncate">
            {meta?.siteName || domain}
          </span>
        </div>

        {meta?.title ? (
          <p className="text-[13.5px] font-semibold text-[#e0e3f0] mb-[3px] truncate leading-tight">
            {meta.title}
          </p>
        ) : (
          <p className="text-[13.5px] font-semibold text-[#e0e3f0] mb-[3px] truncate leading-tight">
            Страница на {domain}
          </p>
        )}

        <p className="text-[12px] text-[#6a6c7e] leading-[1.45] line-clamp-2 mb-[5px]">
          {meta?.description || `Материал с сайта ${domain}`}
        </p>

        {(meta?.image && !isMobileDevice) && (
          <img
            src={meta.image}
            alt=""
            className="w-full h-[150px] object-cover"
          />
        )}

        <span className="text-[11px] text-[#3d3f52] block truncate">
          {domain}
        </span>
      </div>

      {(meta?.image && isMobileDevice) && (
        <div className="w-[68px] flex-shrink-0 overflow-hidden">
          <img
            src={meta.image}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      )}
    </a>
  )
}

function linkifyDescriptionText(html) {
  if (!html) return html

  const temp = document.createElement("div")
  temp.innerHTML = html

  const urlRegex = /(https?:\/\/[^\s<>()[\]{}"']+)/

  function processNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || ""
      const parts = []
      let remaining = text
      let match

      while ((match = remaining.match(urlRegex)) !== null) {
        const fullMatch = match[0]
        const url = fullMatch.replace(/[.,!?;:'")}\]]+$/, "")
        const index = match.index

        if (index > 0) {
          parts.push(remaining.substring(0, index))
        }

        const link = document.createElement("a")
        link.href = url
        link.target = "_blank"
        link.rel = "noopener noreferrer"
        link.className = "!text-[#60a5fa] hover:underline"
        link.textContent = url
        parts.push(link)

        remaining = remaining.substring(index + fullMatch.length)
      }

      if (remaining) parts.push(remaining)

      if (parts.length > 0) {
        const parent = node.parentNode
        if (parent) {
          parts.forEach(part => {
            if (typeof part === "string") {
              parent.insertBefore(document.createTextNode(part), node)
            } else {
              parent.insertBefore(part, node)
            }
          })
          parent.removeChild(node)
        }
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.tagName !== "A") {
        const children = Array.from(node.childNodes)
        children.forEach(child => processNode(child))
      }
    }
  }

  Array.from(temp.childNodes).forEach(child => processNode(child))
  return temp.innerHTML
}


function linkifyText(text: string) {
  if (!text) return null

  const urlRegex = /(https?:\/\/[^\s]+)/g
  const parts = text.split(urlRegex)

  return parts.map((part, index) => {
    if (urlRegex.test(part)) {
      const url = part.trim()
      return <LinkCard key={index} url={url} />
    }

  })
}

export default function LibraryCourse() {
  const [, params] = useRoute("/library/:id")
  const courseId = params?.id
  const { toast } = useToast()
  const [selectedLesson, setSelectedLesson] = useState(null)
  const [openSectionId, setOpenSectionId] = useState<string | undefined>(undefined)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const { data: user } = useQuery({ queryKey: ["/api/auth/user"] })

  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ["/api/courses", courseId],
    enabled: !!courseId
  })

  const { data: sections, isLoading: sectionsLoading } = useQuery({
    queryKey: ["/api/courses", courseId, "sections"],
    enabled: !!courseId
  })

  const firstLesson = sections?.flatMap(s => s.lessons)[0]
  const currentLesson = selectedLesson || firstLesson

  const { data: files = [] } = useQuery({
    queryKey: [`/api/courses/${courseId}/files?lessonId=${currentLesson?.id}`],
    enabled: !!courseId && !!currentLesson
  })

  const { data: lastViewedLessonId } = useQuery({
    queryKey: ["/api/courses", courseId, "last-viewed"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", `/api/courses/${courseId}/last-viewed`)
        return res.json().then(res => res.lessonId) || null
      } catch (err) {
        console.error("Ошибка получения последнего урока:", err)
        return null
      }
    },
    enabled: !!courseId && !!user,
    staleTime: 0,
    cacheTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true
  })

  const markCompleteMutation = useMutation({
    mutationFn: async ({ lessonId, completed, watchedSeconds }) =>
      apiRequest("POST", `/api/courses/${courseId}/lessons/${lessonId}/progress`, { completed, watchedSeconds }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/courses", courseId, "sections"] }),
    onError: () => toast({ title: "Ошибка", description: "Не удалось обновить прогресс", variant: "destructive" })
  })

  const saveProgressMutation = useMutation({
    mutationFn: async ({ lessonId, watchedSeconds }) =>
      apiRequest("POST", `/api/courses/${courseId}/lessons/${lessonId}/progress`, {
        watchedSeconds,
        lastWatchedSeconds: watchedSeconds
      })
  })

  useEffect(() => {
    if (!sections) return

    let targetLessonId = lastViewedLessonId

    if (!targetLessonId && firstLesson) {
      targetLessonId = firstLesson.id
    }

    if (!targetLessonId) return

    const lesson = sections
      .flatMap(s => s.lessons)
      .find(l => l.id === targetLessonId)

    if (lesson) {
      setSelectedLesson(lesson)

      const section = sections.find(s =>
        s.lessons.some(l => l.id === lesson.id)
      )

      if (section) {
        setOpenSectionId(section.id.toString())
      }
    }
  }, [sections, lastViewedLessonId, firstLesson])

  const handleSelectLesson = async (lesson) => {
    setSelectedLesson(lesson)

    const section = sections?.find(s =>
      s.lessons.some(l => l.id === lesson.id)
    )

    if (section) {
      setOpenSectionId(section.id.toString())
    }

    try {
      await apiRequest("POST", `/api/courses/${courseId}/last-viewed`, { lessonId: lesson.id })
      queryClient.setQueryData(["/api/courses", courseId, "last-viewed"], lesson.id)
      await queryClient.invalidateQueries({ queryKey: ["/api/courses", courseId, "last-viewed"] })
      await queryClient.refetchQueries({ queryKey: ["/api/courses", courseId, "last-viewed"] })
    } catch (err) {
      console.error("Ошибка сохранения последнего урока:", err)
      toast({ title: "Ошибка", description: "Не удалось сохранить последний урок", variant: "destructive" })
    }
  }

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
    )
  }

  if (!course || !sections) {
    return (
      <div className="min-h-screen bg-background overflow-x-hidden">
        <Header />
        <main className="container mx-auto px-4 py-6 max-w-7xl">
          <p>Курс не найден</p>
        </main>
      </div>
    )
  }

  const allLessons = sections.flatMap(s => s.lessons)
  const completedLessons = allLessons.filter(l => l.progress?.completed)
  const completionPercentage = allLessons.length > 0 ? (completedLessons.length / allLessons.length) * 100 : 0

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
                <CardContent className="space-y-6" key={currentLesson.id}>
                  {currentLesson.videoUrl && (
                    <div>
                      <VideoPlayer
                        className="lg:max-h-[415px]"
                        key={currentLesson.id}
                        src={currentLesson.videoUrl}
                        userEmail={user?.email}
                        initialTime={currentLesson.progress?.lastWatchedSeconds || 0}
                        onProgressSave={(watchedSeconds) => {
                          const safeSeconds = (isNaN(watchedSeconds) || watchedSeconds < 0)
                            ? 0
                            : Math.floor(watchedSeconds);

                          saveProgressMutation.mutate({
                            lessonId: currentLesson.id,
                            watchedSeconds: safeSeconds,
                            lastWatchedSeconds: safeSeconds
                          })
                        }}
                        onProgress={(currentTime, duration) => {
                          if (duration && currentTime >= duration - 120) {
                            if (!currentLesson.progress?.completed) {
                              markCompleteMutation.mutate({
                                lessonId: currentLesson.id,
                                completed: true,
                                watchedSeconds: Math.floor(currentTime)
                              })
                            }
                          }
                        }}
                        onComplete={() => {
                          if (!currentLesson.progress?.completed) {
                            markCompleteMutation.mutate({
                              lessonId: currentLesson.id,
                              completed: true,
                              watchedSeconds: 0
                            })
                          }
                        }}
                      />
                    </div>
                  )}


                  {currentLesson.description && (
                    <div className="space-y-2" data-testid="lesson-description">
                      <h3 className="text-lg font-semibold">Описание</h3>
                      <div
                        className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_a]:text-primary [&_a]:hover:underline break-words"
                        dangerouslySetInnerHTML={{ __html: linkifyDescriptionText(currentLesson.description) }}
                      />
                    </div>
                  )}


                  {currentLesson.description && (
                    <div className="space-y-2" data-testid="lesson-description" key={currentLesson.id}>
                      <div className="text-muted-foreground text-sm leading-relaxed break-words">
                        {linkifyText(currentLesson.description)}
                      </div>
                    </div>
                  )}

                  {files.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Материалы урока</h3>

                      {(() => {
                        const images = files.filter(f => isImageFile(f.fileName))
                        if (images.length === 0) return null

                        return (
                          <>
                            <div className="grid grid-cols-2 gap-[5px] mt-2">
                              {images.map((file, i) => (
                                <button
                                  key={file.id}
                                  onClick={() => setLightboxIndex(i)}
                                  className="aspect-video rounded-lg overflow-hidden border border-white/10 bg-[#15171c] relative transition transform hover:scale-[1.03] hover:border-primary hover:shadow-lg"
                                >
                                  <img
                                    src={file.fileUrl}
                                    alt={file.fileName}
                                    loading="lazy"
                                    className="w-full h-full object-cover pointer-events-none"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                                </button>
                              ))}
                            </div>

                            {lightboxIndex !== null && (
                              <LessonLightbox
                                images={images}
                                startIndex={lightboxIndex}
                                onClose={() => setLightboxIndex(null)}
                              />
                            )}
                          </>
                        )
                      })()}

                      <div className="space-y-2">
                        {files
                          .filter(f => !isImageFile(f.fileName))
                          .map(file => (
                            <a
                              key={file.id}
                              href={file.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              download
                              className="group flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/60 hover:border-border transition-all duration-200"
                            >
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background/80 text-muted-foreground group-hover:text-foreground text-xl">
                                {getFileIcon(file.fileName)}
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="font-medium truncate">{file.fileName}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {formatFileSize(file.fileSize)}
                                </p>
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
                <Accordion
                  type="single"
                  collapsible
                  className="w-full"
                  value={openSectionId}
                  onValueChange={setOpenSectionId}
                >
                  {sections.map(section => {
                    const isSectionCompleted = section.lessons.length > 0 &&
                      section.lessons.every(lesson => lesson.progress?.completed)

                    return (
                      <AccordionItem key={section.id} value={section.id.toString()} className={isSectionCompleted ? '!border-none' : ''}>
                        <AccordionTrigger
                          className={`hover:no-underline transition-colors p-3 rounded-lg border border-transparent space-y-2  ${isSectionCompleted
                            ? "border-primary bg-primary/5 text-primary"
                            : ""
                            }`}
                          data-testid={`accordion-section-${section.id}`}
                        >
                          <div className="flex items-center gap-3 text-left w-full">
                            {isSectionCompleted ? (
                              <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                            ) : (
                              <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                            )}

                            <div>
                              <p className={`font-medium ${isSectionCompleted ? "text-primary" : ""}`}>
                                {section.title}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {section.lessons.filter(l => l.progress?.completed).length} из {section.lessons.length} уроков
                              </p>
                            </div>
                          </div>
                        </AccordionTrigger>

                        <AccordionContent>
                          <div className="space-y-2 pl-2 mt-2">
                            {section.lessons.map(lesson => {
                              const isCurrentLesson = currentLesson?.id === lesson.id
                              return (
                                <div
                                  key={lesson.id}
                                  className={`p-3 rounded-lg border space-y-2 transition-colors ${isCurrentLesson || lesson.progress?.completed
                                    ? "border-primary bg-primary/5"
                                    : "border-border"
                                    }`}
                                  data-testid={`lesson-item-${lesson.id}`}
                                >
                                  <div className="flex items-start gap-2">
                                    {lesson.progress?.completed ? (
                                      <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                    ) : (
                                      <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                                    )}
                                    <div className="flex-1 min-w-0 overflow-hidden">
                                      <p className={`font-medium ${isCurrentLesson ? "text-primary" : ""}`}>
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
                                      onClick={() => handleSelectLesson(lesson)}
                                      data-testid={`button-watch-lesson-${lesson.id}`}
                                    >
                                      {isCurrentLesson ? "Просматривается" : "Смотреть урок"}
                                    </Button>
                                    {lesson.progress?.completed ? (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => markCompleteMutation.mutate({ lessonId: lesson.id, completed: false })}
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
                                        onClick={() => markCompleteMutation.mutate({ lessonId: lesson.id, completed: true })}
                                        disabled={markCompleteMutation.isPending}
                                        data-testid={`button-mark-complete-${lesson.id}`}
                                      >
                                        Отметить как пройденный
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )
                  })}
                </Accordion>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}