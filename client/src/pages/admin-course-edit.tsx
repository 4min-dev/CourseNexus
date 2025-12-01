import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation, useSearchParams } from "wouter";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import RichTextEditor from "@/components/RichTextEditor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, ArrowLeft, Save, Play, FileText, ChevronDown, ChevronRight, Upload, X, Edit, RefreshCw, Check, ChevronsUpDown, AlertCircle } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { NowCdnVideoUploader } from "@/components/ui/NowCdnS3VideoUploader";
import { uploadQueue } from "@/lib/upload-queue";
import { NowCdnUploader } from "@/components/ui/NowCdnS3Uploader";

interface Course {
  id: string;
  title: string;
  description: string | null;
  price: number;
  fantikPrice: number | null;
  paymentType: string;
  authorName: string;
  thumbnailImage: string | null;
  level: string[] | null;
  platform: string;
  year: number;
  isFree: boolean;
  hiddenInShop: boolean;
  hiddenInLibrary: boolean;
}

interface Lesson {
  id: string;
  sectionId: string;
  title: string;
  description: string | null;
  videoUrl: string | null;
  duration: number | null;
  order: number;
  processingStatus?: string;
  uploadProgress?: number;
  errorMessage?: string | null;
}

interface Section {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  order: number;
  lessons?: Lesson[];
}

interface CourseFile {
  id: string;
  courseId: string;
  lessonId: string | null;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize?: number | null;
  displayOrder: number;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
}

interface Subcategory {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
}

interface SubcategoryWithCategory extends Subcategory {
  category: Category;
}

// Levels are now loaded dynamically from the API

export default function AdminCourseEdit() {
  const { courseId } = useParams<{ courseId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isAddSectionDialogOpen, setIsAddSectionDialogOpen] = useState(false);
  const [isAddLessonDialogOpen, setIsAddLessonDialogOpen] = useState(false);
  const [isEditLessonDialogOpen, setIsEditLessonDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const didAutoExpandRef = useRef(false);

  const [authorComboboxOpen, setAuthorComboboxOpen] = useState(false);
  const [authorSearch, setAuthorSearch] = useState("");

  const [courseFormData, setCourseFormData] = useState({
    title: "",
    description: "",
    price: "",
    fantikPrice: "",
    paymentType: "money_only",
    authorName: "",
    thumbnailImage: "",
    level: "beginner",
    year: new Date().getFullYear().toString(),
    isFree: false,
    hiddenInShop: false,
    hiddenInLibrary: false,
  });

  const [sectionFormData, setSectionFormData] = useState({
    title: "",
    description: "",
  });

  const [lessonFormData, setLessonFormData] = useState({
    title: "",
    description: "",
    videoUrl: "",
    duration: 0,
  });

  const [uploadedVideo, setUploadedVideo] = useState<{
    fileName: string;
    fileUrl: string;
    duration: number;
  } | null>(null);

  // Track video upload promises and progress
  const [videoUploadPromise, setVideoUploadPromise] = useState<{
    promise: Promise<{ fileUrl: string; fileName: string }>;
    lessonSessionId: number;
  } | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadingLessonId, setUploadingLessonId] = useState<string | null>(null);

  // Track current lesson session to prevent stale uploads from overwriting new forms
  const [currentLessonSessionId, setCurrentLessonSessionId] = useState<number | null>(null);
  const lessonSessionCounterRef = useRef(0);

  const [uploadedFiles, setUploadedFiles] = useState<Array<{
    fileName: string;
    fileUrl: string;
    fileType: string;
  }>>([]);

  const [uploadedThumbnail, setUploadedThumbnail] = useState<{
    fileName: string;
    fileUrl: string;
  } | null>(null);

  const [selectedLevels, setSelectedLevels] = useState<any[]>([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([]);
  const [searchParams] = useSearchParams()
  const subcategoryId = searchParams.get('subcategoryId')
  const categoryId = searchParams.get('categoryId')
  const parentId = searchParams.get('parentId')

  // Fetch course
  const { data: course, isLoading: courseLoading } = useQuery<Course>({
    queryKey: ["/api/admin/courses", courseId],
    queryFn: async () => {
      const response = await fetch(`/api/admin/courses/${courseId}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch");
      return response.json();
    },
    enabled: !!courseId,
  });

  // Fetch sections with lessons
  const { data: sections, refetch: refetchSections } = useQuery<Section[]>({
    queryKey: ["/api/admin/courses", courseId, "sections"],
    queryFn: async () => {
      const response = await fetch(`/api/admin/courses/${courseId}/sections`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch");
      return response.json();
    },
    enabled: !!courseId,
  });

  // Auto-expand all sections to show lessons and their status (only on first load)
  useEffect(() => {
    if (sections && sections.length > 0 && !didAutoExpandRef.current) {
      const allSectionIds = sections.map(s => s.id);
      setExpandedSections(new Set(allSectionIds));
      didAutoExpandRef.current = true;
    }
  }, [sections]);

  // Fetch files for editing lesson
  const { data: lessonFiles, refetch: refetchLessonFiles } = useQuery<CourseFile[]>({
    queryKey: ["/api/admin/courses", courseId, "lesson-files", editingLesson?.id],
    queryFn: async () => {
      if (!editingLesson) return [];
      const response = await fetch(`/api/admin/course-files?courseId=${courseId}&lessonId=${editingLesson.id}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch");
      return response.json();
    },
    enabled: !!courseId && !!editingLesson,
  });

  // Fetch authors for autocomplete
  const { data: authors = [] } = useQuery<string[]>({
    queryKey: ["/api/courses-metadata/authors", authorSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (authorSearch) params.set('search', authorSearch);
      const response = await fetch(`/api/courses-metadata/authors?${params}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch");
      return response.json();
    },
  });

  // Fetch available levels dynamically
  const { data: availableLevels = [] } = useQuery<string[]>({
    queryKey: ["/api/courses-metadata/levels"],
    queryFn: async () => {
      const response = await fetch(`/api/courses-metadata/levels`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch");
      return response.json();
    },
  });

  // Fetch categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const response = await fetch(`/api/categories`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch");
      return response.json();
    },
  });

  const { data: subcategories = [] } = useQuery<Subcategory[]>({
    queryKey: ["/api/subcategories", categoryId],
    queryFn: async () => {
      if (!categoryId) return [];
      const res = await fetch(`/api/subcategories?categoryId=${categoryId}`, {
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to fetch subcategories");
      return res.json();
    },
    enabled: !!categoryId,
  });

  console.log('subcategories', subcategories)

  // Fetch all subcategories
  const { data: allSubcategories = [] } = useQuery<Subcategory[]>({
    queryKey: ["/api/subcategories"],
    queryFn: async () => {
      const response = await fetch(`/api/subcategories`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch");
      return response.json();
    },
  });

  // Fetch course subcategories
  const { data: courseSubcategoryIds = [] } = useQuery<string[]>({
    queryKey: ["/api/admin/courses", courseId, "subcategories"],
    queryFn: async () => {
      const response = await fetch(`/api/admin/courses/${courseId}/subcategories`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch");
      return response.json();
    },
    enabled: !!courseId,
  });

  // Load course data when fetched
  useEffect(() => {
    if (course) {
      setCourseFormData({
        title: course.title || "",
        description: course.description || "",
        price: String(course.price || ""),
        fantikPrice: String(course.fantikPrice || ""),
        paymentType: course.paymentType || "money_only",
        authorName: course.authorName || "",
        thumbnailImage: course.thumbnailImage || "",
        level: Array.isArray(course.level) ? course.level[0] || "" : course.level || "",
        year: String(course.year || new Date().getFullYear()),
        isFree: course.isFree || false,
        hiddenInShop: course.hiddenInShop || false,
        hiddenInLibrary: course.hiddenInLibrary || false,
      });

      // Set uploaded thumbnail if course already has an image
      if (course.thumbnailImage) {
        setUploadedThumbnail({
          fileName: course.thumbnailImage.split('/').pop() || "thumbnail",
          fileUrl: course.thumbnailImage,
        });
      }
    }
  }, [course]);

  useEffect(() => {
    if (!subcategoryId || !allSubcategories.length) return;

    const currentSubcat = allSubcategories.find(s => s.id === subcategoryId);
    if (!currentSubcat) return;

    const levelName = currentSubcat.name; // например "Для новичков"

    // Находим ВСЕ подкатегории с таким же именем (уровнем)
    const idsToSelect = allSubcategories
      .filter(sub => sub.name === levelName)
      .map(sub => sub.id);

    setSelectedLevels(prev => {
      // Если уже есть — не дублируем
      const newLevels = [...prev];
      idsToSelect.forEach(id => {
        if (!newLevels.includes(id)) {
          newLevels.push(id);
        }
      });
      return newLevels;
    });
  }, [subcategoryId, allSubcategories]);

  // Load selected subcategories when fetched
  useEffect(() => {
    if (courseSubcategoryIds && courseSubcategoryIds.length > 0) {
      setSelectedSubcategories(courseSubcategoryIds);
    }
  }, [courseSubcategoryIds]);

  // Poll for lesson status updates
  useEffect(() => {
    if (!sections || !courseId) return;

    // Find lessons that are being processed
    const processingLessons = sections.flatMap(s => s.lessons || [])
      .filter(l => l.processingStatus && ['uploading', 'queued', 'processing'].includes(l.processingStatus));

    if (processingLessons.length === 0) return;

    const interval = setInterval(() => {
      // Refetch sections to get updated status
      queryClient.invalidateQueries({ queryKey: ["/api/admin/courses", courseId, "sections"] });
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [sections, courseId]);

  // Update editingLesson when sections change (to show latest processing status)
  useEffect(() => {
    if (!editingLesson || !sections) return;

    const updatedLesson = sections
      .flatMap(s => s.lessons || [])
      .find(l => l.id === editingLesson.id);

    if (updatedLesson && updatedLesson.processingStatus !== editingLesson.processingStatus) {
      setEditingLesson(updatedLesson);
    }
  }, [sections, editingLesson]);

  const startBackgroundVideoUpload = async (lessonId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "video");

    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        setUploadProgress(percent);

        // Обновляем прогресс в базе (опционально, каждые 5%)
        if (percent % 5 === 0 || percent === 100) {
          apiRequest("PUT", `/api/admin/lessons/${lessonId}`, {
            uploadProgress: percent,
          }).catch(() => { });
        }
      }
    };

    xhr.onload = async () => {
      if (xhr.status === 200) {
        const { url } = JSON.parse(xhr.responseText);

        // Видео загружено → запускаем конвертацию
        await apiRequest("POST", `/api/admin/lessons/${lessonId}/video`, {
          videoUrl: url,
          originalFileName: file.name,
        });

        queryClient.invalidateQueries({ queryKey: ["/api/admin/courses", courseId, "sections"] });
        toast({ title: "Видео загружено и поставлено на обработку" });
      } else {
        await apiRequest("PUT", `/api/admin/lessons/${lessonId}`, {
          processingStatus: 'failed',
          errorMessage: 'Ошибка загрузки видео',
        });
        toast({ title: "Ошибка загрузки видео", variant: "destructive" });
      }
      setUploadProgress(0);
    };

    xhr.onerror = () => {
      apiRequest("PUT", `/api/admin/lessons/${lessonId}`, {
        processingStatus: 'failed',
        errorMessage: 'Сеть недоступна',
      });
      toast({ title: "Ошибка сети", variant: "destructive" });
    };

    xhr.open("POST", "/api/upload");
    xhr.send(formData);
  };

  // Update course mutation
  const updateCourseMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PUT", `/api/admin/courses/${courseId}`, data);
      return await response.json();
    },
    onSuccess: () => {
      toast({ title: "Курс обновлен" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/courses", courseId] });
    },
    onError: () => {
      toast({ title: "Ошибка при обновлении курса", variant: "destructive" });
    },
  });

  // Update course subcategories mutation
  const updateSubcategoriesMutation = useMutation({
    mutationFn: async (subcategoryIds: string[]) => {
      const response = await apiRequest("PUT", `/api/admin/courses/${courseId}/subcategories`, {
        subcategoryIds,
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({ title: "Подкатегории обновлены" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/courses", courseId, "subcategories"] });
    },
    onError: () => {
      toast({ title: "Ошибка при обновлении подкатегорий", variant: "destructive" });
    },
  });

  // Create section mutation
  const createSectionMutation = useMutation({
    mutationFn: async (data: { title: string; description?: string; order: number }) => {
      const response = await apiRequest("POST", `/api/admin/courses/${courseId}/sections`, data);
      return await response.json();
    },
    onSuccess: () => {
      toast({ title: "Модуль создан" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/courses", courseId, "sections"] });
      setIsAddSectionDialogOpen(false);
      setSectionFormData({ title: "", description: "" });
    },
    onError: () => {
      toast({ title: "Ошибка при создании модуля", variant: "destructive" });
    },
  });

  // Delete section mutation
  const deleteSectionMutation = useMutation({
    mutationFn: async (sectionId: string) => {
      return await apiRequest("DELETE", `/api/admin/sections/${sectionId}`);
    },
    onSuccess: () => {
      toast({ title: "Модуль удален" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/courses", courseId, "sections"] });
    },
    onError: () => {
      toast({ title: "Ошибка при удалении модуля", variant: "destructive" });
    },
  });

  const createLessonMutation = useMutation({
    mutationFn: async (data: { sectionId: string; title: string; description?: string; order: number }) => {
      const { sectionId, ...lessonData } = data;
      const response = await apiRequest("POST", `/api/admin/sections/${sectionId}/lessons`, lessonData);
      return await response.json();
    },
    onSuccess: async (newLesson: any) => {
      const lessonId = newLesson?.id;
      if (!lessonId) {
        toast({ title: "Урок создан, но ID не получен", variant: "destructive" });
        return;
      }

      toast({ title: "Урок создан" });

      // 1. Добавляем видео в очередь (если есть)
      if (videoFile) {
        try {
          await apiRequest("PUT", `/api/admin/lessons/${lessonId}`, {
            processingStatus: "uploading",
            uploadProgress: 0,
          });
        } catch (e) { /* игнорируем, но логируем */ }

        uploadQueue.add({
          lessonId,
          file: videoFile,
          fileName: videoFile.name,
          onProgress: (percent) => {
            apiRequest("PUT", `/api/admin/lessons/${lessonId}`, { uploadProgress: percent }).catch(() => { });
          },
        });

        toast({
          title: "Видео в очереди на загрузку",
          description: `Позиция в очереди: ${uploadQueue.getQueueLength()}`,
        });
      }

      // 2. Сохраняем прикреплённые файлы (PDF, ZIP и т.д.)
      if (uploadedFiles.length > 0) {
        for (const file of uploadedFiles) {
          createFileMutation.mutate({
            courseId: courseId!,
            lessonId: lessonId, // теперь у нас есть ID урока!
            fileName: file.fileName,
            fileUrl: file.fileUrl,
            fileType: file.fileType,
            displayOrder: 0,
          });
        }
        toast({ title: `Добавлено файлов: ${uploadedFiles.length}` });
      }

      // Обновляем UI
      queryClient.invalidateQueries({ queryKey: ["/api/admin/courses", courseId, "sections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/courses", courseId, "files"] });

      // Закрываем диалог и чистим форму
      setIsAddLessonDialogOpen(false);
      setLessonFormData({ title: "", description: "", videoUrl: "", duration: 0 });
      setVideoFile(null);
      setUploadedFiles([]);
      setUploadedVideo(null);
    },
    onError: (error) => {
      console.error("Ошибка создания урока:", error);
      toast({ title: "Ошибка при создании урока", variant: "destructive" });
    },
  });

  // Update lesson mutation
  const updateLessonMutation = useMutation({
    mutationFn: async (data: { lessonId: string; title: string; description?: string; videoUrl?: string | null; duration?: number }) => {
      const { lessonId, ...lessonData } = data;
      const response = await apiRequest("PUT", `/api/admin/lessons/${lessonId}`, lessonData);
      return await response.json();
    },
    onSuccess: async (updatedLesson: any) => {
      const videoPromise = videoUploadPromise;
      const filesToUpload = [...uploadedFiles];
      const lessonId = updatedLesson?.id; // Save lesson ID immediately

      // Set uploading lesson ID to show progress
      if (videoPromise) {
        setUploadingLessonId(lessonId);
      }

      // Close dialog and reset state immediately
      toast({ title: "Урок обновлен" });
      setIsEditLessonDialogOpen(false);
      setEditingLesson(null);
      setUploadedVideo(null);
      setUploadedFiles([]);
      setVideoUploadPromise(null);
      // Clear session ID to prevent stale uploads from updating UI
      setCurrentLessonSessionId(null);

      // Invalidate to show the updated lesson in the list
      queryClient.invalidateQueries({ queryKey: ["/api/admin/courses", courseId, "sections"] });

      // Process video in background (non-blocking)
      if (videoPromise) {
        // Update lesson status to uploading first
        apiRequest("PUT", `/api/admin/lessons/${lessonId}`, {
          processingStatus: 'uploading'
        }).catch(error => {
          console.error("Error updating lesson status to uploading:", error?.message || error);
          toast({ title: "Не удалось обновить статус урока", variant: "destructive" });
        });

        // Wait for video upload to complete
        videoPromise
          .then(async (videoInfo) => {
            // Clear uploading lesson ID and progress
            setUploadingLessonId(null);
            setUploadProgress(0);

            // Queue video for processing
            return apiRequest("POST", `/api/admin/lessons/${lessonId}/video`, {
              videoUrl: videoInfo.fileUrl,
              originalFileName: videoInfo.fileName,
            }).then(() => {
              // Refresh UI to show queued/processing status
              queryClient.invalidateQueries({ queryKey: ["/api/admin/courses", courseId, "sections"] });
            });
          })
          .catch(error => {
            console.error("Error processing video:", error);
            toast({ title: "Ошибка обработки видео", variant: "destructive" });

            // Clear uploading lesson ID and progress
            setUploadingLessonId(null);
            setUploadProgress(0);

            // Update lesson status to failed
            apiRequest("PUT", `/api/admin/lessons/${lessonId}`, {
              processingStatus: 'failed',
              errorMessage: 'Не удалось загрузить видео'
            })
              .then(() => {
                // Refresh UI to show failed status
                queryClient.invalidateQueries({ queryKey: ["/api/admin/courses", courseId, "sections"] });
              })
              .catch(err => console.error("Error updating lesson status to failed:", err?.message || err));
          });
      }

      // Create files in background (non-blocking)
      if (filesToUpload.length > 0 && lessonId) {
        for (const file of filesToUpload) {
          createFileMutation.mutate({
            courseId: courseId!,
            lessonId: lessonId,
            fileName: file.fileName,
            fileUrl: file.fileUrl,
            fileType: file.fileType,
            displayOrder: 0,
          });
        }
        queryClient.invalidateQueries({ queryKey: ["/api/admin/courses", courseId, "files"] });
      }
    },
    onError: () => {
      toast({ title: "Ошибка при обновлении урока", variant: "destructive" });
    },
  });

  // Delete lesson mutation
  const deleteLessonMutation = useMutation({
    mutationFn: async (lessonId: string) => {
      return await apiRequest("DELETE", `/api/admin/lessons/${lessonId}`);
    },
    onSuccess: () => {
      toast({ title: "Урок удален" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/courses", courseId, "sections"] });
    },
    onError: () => {
      toast({ title: "Ошибка при удалении урока", variant: "destructive" });
    },
  });

  // Delete video from lesson mutation
  const deleteVideoMutation = useMutation({
    mutationFn: async (lessonId: string) => {
      return await apiRequest("DELETE", `/api/admin/lessons/${lessonId}/video`);
    },
    onSuccess: () => {
      toast({ title: "Видео удалено из урока" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/courses", courseId, "sections"] });
      // Reset local state
      setUploadedVideo(null);
      if (editingLesson) {
        setLessonFormData({ ...lessonFormData, videoUrl: '', duration: 0 });
        // Update editingLesson to reflect deletion
        setEditingLesson({ ...editingLesson, videoUrl: null, duration: 0, processingStatus: undefined });
      }
    },
    onError: () => {
      toast({ title: "Ошибка при удалении видео", variant: "destructive" });
    },
  });

  // Create file mutation
  const createFileMutation = useMutation({
    mutationFn: async (data: { courseId: string; fileName: string; fileUrl: string; fileType: string; displayOrder: number; lessonId: string | null }) => {
      const response = await apiRequest("POST", "/api/admin/course-files", data);
      return await response.json();
    },
    onSuccess: () => {
      // File added successfully (used when creating/editing lessons)
    },
    onError: () => {
      toast({ title: "Ошибка при добавлении файла", variant: "destructive" });
    },
  });

  // Delete file mutation
  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      return await apiRequest("DELETE", `/api/admin/course-files/${fileId}`);
    },
    onSuccess: () => {
      toast({ title: "Файл удален" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/courses", courseId, "files"] });
    },
    onError: () => {
      toast({ title: "Ошибка при удалении файла", variant: "destructive" });
    },
  });

  // Mass convert all videos with faststart optimization
  const reprocessAllMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/objects/convert-all-videos");
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Конвертация запущена",
        description: `Начата конвертация ${data.total} видео с faststart оптимизацией. Процесс выполняется в фоновом режиме.`
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/courses", courseId, "sections"] });
    },
    onError: () => {
      toast({ title: "Ошибка при запуске конвертации", variant: "destructive" });
    },
  });

  const handleSaveBasicInfo = () => {
    updateCourseMutation.mutate({
      ...courseFormData,
      price: parseFloat(courseFormData.price) || 0,
      fantikPrice: courseFormData.fantikPrice ? parseInt(courseFormData.fantikPrice) : null,
      year: parseInt(courseFormData.year) || new Date().getFullYear(),
      level: selectedLevels.length > 0 ? selectedLevels : [],
    });
  };

  const handleAddSection = () => {
    const nextOrder = (sections?.length || 0) + 1;
    createSectionMutation.mutate({
      title: sectionFormData.title,
      description: sectionFormData.description || undefined,
      order: nextOrder,
    });
  };

  const handleOpenEditLesson = (lesson: Lesson) => {
    // Get the most up-to-date lesson data from sections (includes latest processingStatus)
    const currentLesson = sections
      ?.flatMap(s => s.lessons || [])
      .find(l => l.id === lesson.id) || lesson;

    setEditingLesson(currentLesson);
    setLessonFormData({
      title: currentLesson.title,
      description: currentLesson.description || "",
      videoUrl: currentLesson.videoUrl || "",
      duration: currentLesson.duration || 0,
    });
    // Don't copy existing video to uploadedVideo - it should only be for NEW uploads
    setUploadedVideo(null);
    setUploadedFiles([]);
    // Generate new session ID for edit dialog
    lessonSessionCounterRef.current += 1;
    setCurrentLessonSessionId(lessonSessionCounterRef.current);
    setIsEditLessonDialogOpen(true);
  };

  const handleEditLesson = async () => {
    if (!editingLesson) return;

    try {
      // Build update payload - only include video fields if a new video was uploaded
      const updateData: any = {
        lessonId: editingLesson.id,
        title: lessonFormData.title,
        description: lessonFormData.description || undefined,
      };

      // Only update video if a new one was uploaded (replacement)
      if (uploadedVideo) {
        updateData.videoUrl = uploadedVideo.fileUrl;
        updateData.duration = uploadedVideo.duration;
      }

      await updateLessonMutation.mutateAsync(updateData);

      // Create new files if any were uploaded
      if (uploadedFiles.length > 0) {
        for (const file of uploadedFiles) {
          await apiRequest("POST", "/api/admin/course-files", {
            courseId: courseId!,
            lessonId: editingLesson.id,
            fileName: file.fileName,
            fileUrl: file.fileUrl,
            fileType: file.fileType,
            displayOrder: 0,
          });
        }
        queryClient.invalidateQueries({ queryKey: ["/api/admin/courses", courseId, "files"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/courses", courseId, "lesson-files", editingLesson.id] });
      }
    } catch (error) {
      console.error("Error updating lesson:", error);
    }
  };

  const getFileType = (mimeType: string, fileName: string): string => {
    if (mimeType.includes('video')) return 'video';
    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) return 'document';
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z') || mimeType.includes('tar')) return 'archive';

    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext && ['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive';
    if (ext && ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv'].includes(ext)) return 'video';
    if (ext && ['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(ext)) return 'document';

    return 'other';
  };

  const removeUploadedFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  if (courseLoading) {
    return (
      <AdminLayout>
        <div className="p-6">Загрузка...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => {
              window.history.go(-1);
              setTimeout(() => window.location.reload(), 0);
            }}
            data-testid="button-back"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад
          </Button>
          <h1 className="text-2xl font-bold">Редактирование курса</h1>
        </div>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList>
            <TabsTrigger value="basic" data-testid="tab-basic">Основная информация</TabsTrigger>
            <TabsTrigger value="content" data-testid="tab-content">Содержание курса</TabsTrigger>
          </TabsList>

          <TabsContent value="basic">
            <Card>
              <CardHeader>
                <CardTitle>Основная информация</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Название курса</Label>
                  <Input
                    value={courseFormData.title}
                    onChange={(e) => setCourseFormData((prev) => ({ ...prev, title: e.target.value }))}
                    data-testid="input-title"
                  />
                </div>

                <div>
                  <Label>Описание</Label>
                  <RichTextEditor
                    content={courseFormData.description}
                    onChange={(content) => setCourseFormData((prev) => ({ ...prev, description: content }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Автор</Label>
                    <Popover open={authorComboboxOpen} onOpenChange={setAuthorComboboxOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={authorComboboxOpen}
                          className="w-full justify-between"
                          data-testid="button-author-combobox"
                        >
                          {courseFormData.authorName || "Выберите автора или введите новое имя"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0" align="start">
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Поиск автора..."
                            value={authorSearch}
                            onValueChange={setAuthorSearch}
                            data-testid="input-author-search"
                          />
                          <CommandList>
                            <CommandEmpty>
                              {authorSearch ? (
                                <div className="p-2 text-sm">
                                  <p className="text-muted-foreground mb-2">Автор не найден</p>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                    onClick={() => {
                                      setCourseFormData((prev) => ({ ...prev, authorName: authorSearch }));
                                      setAuthorComboboxOpen(false);
                                      setAuthorSearch("");
                                    }}
                                    data-testid="button-add-new-author"
                                  >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Добавить "{authorSearch}"
                                  </Button>
                                </div>
                              ) : (
                                <p className="p-2 text-sm text-muted-foreground">Начните вводить имя автора</p>
                              )}
                            </CommandEmpty>
                            <CommandGroup>
                              {authors.map((author) => (
                                <CommandItem
                                  key={author}
                                  value={author}
                                  onSelect={(currentValue) => {
                                    setCourseFormData((prev) => ({ ...prev, authorName: currentValue }));
                                    setAuthorComboboxOpen(false);
                                    setAuthorSearch("");
                                  }}
                                  data-testid={`option-author-${author}`}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      courseFormData.authorName === author ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {author}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="border rounded-md p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Изображение курса</Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Рекомендуемое разрешение: 1280×720 (16:9)
                        </p>
                      </div>
                      <NowCdnUploader
                        inputId="thumbnailUploader"
                        acceptedTypes="image/*"
                        onUploadSuccess={({ fileUrl, fileName }) => {
                          setUploadedThumbnail({ fileName, fileUrl });
                          setCourseFormData(prev => ({ ...prev, thumbnailImage: fileUrl }));
                        }}
                      />
                    </div>

                    {(uploadedThumbnail || courseFormData.thumbnailImage) && (
                      <div className="p-3 bg-muted rounded-md space-y-2">
                        <div className="relative aspect-video w-full bg-background rounded overflow-hidden">
                          <img
                            src={uploadedThumbnail?.fileUrl || courseFormData.thumbnailImage}
                            alt="Course thumbnail"
                            className="w-full h-full object-cover"
                            data-testid="img-thumbnail-preview"
                          />
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {uploadedThumbnail?.fileName || courseFormData.thumbnailImage.split('/').pop()}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setUploadedThumbnail(null);
                            setCourseFormData((prev) => ({ ...prev, thumbnailImage: "" }));
                          }}
                          className="w-full"
                          data-testid="button-remove-thumbnail"
                        >
                          <X className="mr-2 h-4 w-4" />
                          Удалить изображение
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Тип оплаты</Label>
                    <Select
                      value={courseFormData.paymentType}
                      onValueChange={(value) => setCourseFormData((prev) => ({ ...prev, paymentType: value }))}
                    >
                      <SelectTrigger data-testid="select-payment-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="money_only">Только деньги</SelectItem>
                        <SelectItem value="fantiks_only">Только фантики</SelectItem>
                        <SelectItem value="both">Деньги или фантики</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2 pt-8">
                    <Checkbox
                      id="isFree"
                      checked={courseFormData.isFree}
                      onCheckedChange={(checked) => setCourseFormData((prev) => ({ ...prev, isFree: checked === true }))}
                      data-testid="checkbox-free"
                    />
                    <Label htmlFor="isFree">Бесплатный курс</Label>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {(courseFormData.paymentType === 'money_only' || courseFormData.paymentType === 'both') && (
                    <div>
                      <Label>Цена (₽)</Label>
                      <Input
                        type="number"
                        value={courseFormData.price}
                        onChange={(e) => setCourseFormData((prev) => ({ ...prev, price: e.target.value }))}
                        data-testid="input-price"
                      />
                    </div>
                  )}

                  {(courseFormData.paymentType === 'fantiks_only' || courseFormData.paymentType === 'both') && (
                    <div>
                      <Label>Цена (фантики)</Label>
                      <Input
                        type="number"
                        value={courseFormData.fantikPrice}
                        onChange={(e) => setCourseFormData((prev) => ({ ...prev, fantikPrice: e.target.value }))}
                        data-testid="input-fantik-price"
                      />
                    </div>
                  )}

                  <div>
                    <Label>Год</Label>
                    <Input
                      type="number"
                      value={courseFormData.year}
                      onChange={(e) => setCourseFormData((prev) => ({ ...prev, year: e.target.value }))}
                      data-testid="input-year"
                    />
                  </div>
                </div>

                {(parseFloat(courseFormData.price) === 0 || courseFormData.price === "") && !courseFormData.isFree && courseFormData.paymentType !== 'fantiks_only' && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-destructive">
                      Для курса с нулевой ценой необходимо отметить чекбокс "Бесплатный курс"
                    </p>
                  </div>
                )}

                <div>
                  <Label className="mb-2 block">Настройки видимости</Label>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <Label htmlFor="hiddenInShop">Скрыт в магазине</Label>
                      <Switch
                        id="hiddenInShop"
                        checked={courseFormData.hiddenInShop}
                        onCheckedChange={(checked) => setCourseFormData((prev) => ({ ...prev, hiddenInShop: checked }))}
                        data-testid="switch-hidden-in-shop"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <Label htmlFor="hiddenInLibrary">Скрыт в библиотеке</Label>
                      <Switch
                        id="hiddenInLibrary"
                        checked={courseFormData.hiddenInLibrary}
                        onCheckedChange={(checked) => setCourseFormData((prev) => ({ ...prev, hiddenInLibrary: checked }))}
                        data-testid="switch-hidden-in-library"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="mb-2 block">Уровень</Label>
                  <div className="space-y-2">
                    {["Для новичков", "Для опытных", "Продвинутый", "Премиум"].map((levelName) => {
                      // Находим хотя бы одну подкатегорию с таким именем
                      const hasLevel = allSubcategories.some(sub => sub.name === levelName);

                      return (
                        <div key={levelName} className="flex items-center gap-2">
                          <Checkbox
                            id={`level-${levelName}`}
                            checked={allSubcategories.some(sub =>
                              sub.name === levelName && selectedLevels.includes(sub.id)
                            )}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                // Добавляем ВСЕ подкатегории с таким именем
                                const idsToAdd = allSubcategories
                                  .filter(sub => sub.name === levelName)
                                  .map(sub => sub.id);
                                setSelectedLevels(prev => [...new Set([...prev, ...idsToAdd])]);
                              } else {
                                // Убираем ВСЕ подкатегории с таким именем
                                const idsToRemove = allSubcategories
                                  .filter(sub => sub.name === levelName)
                                  .map(sub => sub.id);
                                setSelectedLevels(prev => prev.filter(id => !idsToRemove.includes(id)));
                              }
                            }}
                          />
                          <Label htmlFor={`level-${levelName}`} className="cursor-pointer">
                            {levelName}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="border rounded-md max-h-[400px] overflow-y-auto">
                  <div className="p-4 space-y-6">
                    {selectedLevels.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <AlertCircle className="h-8 w-8 mx-auto mb-3 opacity-50" />
                        <p>Сначала выберите хотя бы один уровень выше</p>
                      </div>
                    ) : (
                      categories
                        .filter(cat => !cat.parentId)
                        .map((parentCat) => {
                          const childCategories = categories.filter(cat => cat.parentId === parentCat.id);

                          const availableChildCats = childCategories.filter(childCat =>
                            allSubcategories.some(sub =>
                              sub.categoryId === childCat.id &&
                              selectedLevels.some(selectedId =>
                                allSubcategories.find(s => s.id === selectedId)?.name === sub.name
                              )
                            )
                          );

                          if (availableChildCats.length === 0) return null;

                          return (
                            <div key={parentCat.id} className="border-b last:border-b-0 pb-6 last:pb-0">
                              <div className="font-semibold text-sm mb-3 text-primary">
                                {parentCat.name}
                              </div>
                              <div className="space-y-3 pl-4">
                                {availableChildCats.map((childCat) => {
                                  // Все подкатегории этой категории, у которых имя совпадает с выбранными уровнями
                                  const relevantSubcats = allSubcategories.filter(sub =>
                                    sub.categoryId === childCat.id &&
                                    selectedLevels.some(selectedId =>
                                      allSubcategories.find(s => s.id === selectedId)?.name === sub.name
                                    )
                                  );

                                  const allSelected = relevantSubcats.every(sub =>
                                    selectedSubcategories.includes(sub.id)
                                  );
                                  const someSelected = relevantSubcats.some(sub =>
                                    selectedSubcategories.includes(sub.id)
                                  );

                                  const handleToggle = (checked: boolean) => {
                                    const subcatIds = relevantSubcats.map(s => s.id);
                                    setSelectedSubcategories(prev =>
                                      checked
                                        ? [...new Set([...prev, ...subcatIds])]
                                        : prev.filter(id => !subcatIds.includes(id))
                                    );
                                  };

                                  return (
                                    <div key={childCat.id} className="flex items-center gap-2">
                                      <Checkbox
                                        checked={allSelected}
                                        indeterminate={!allSelected && someSelected}
                                        onCheckedChange={handleToggle}
                                      />
                                      <Label className="flex items-center gap-2 cursor-pointer font-normal">
                                        {childCat.name}
                                        <span className="text-xs text-muted-foreground">
                                          ({relevantSubcats.map(s => s.name).join(', ')})
                                        </span>
                                      </Label>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>


                <Button
                  onClick={handleSaveBasicInfo}
                  disabled={
                    updateCourseMutation.isPending ||
                    ((parseFloat(courseFormData.price) === 0 || courseFormData.price === "") && !courseFormData.isFree && courseFormData.paymentType !== 'fantiks_only')
                  }
                  data-testid="button-save-basic"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Сохранить
                </Button>

                <Button
                  className="mt-4 ml-4"
                  variant="outline"
                  onClick={() => updateSubcategoriesMutation.mutate(selectedSubcategories)}
                  disabled={updateSubcategoriesMutation.isPending}
                  data-testid="button-save-subcategories"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {updateSubcategoriesMutation.isPending ? "Сохранение..." : "Сохранить подкатегории"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Модули и уроки</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => reprocessAllMutation.mutate()}
                      disabled={reprocessAllMutation.isPending}
                      data-testid="button-reprocess-all"
                    >
                      <RefreshCw className={`mr-2 h-4 w-4 ${reprocessAllMutation.isPending ? 'animate-spin' : ''}`} />
                      Переконвертировать все видео
                    </Button>
                    <Button
                      onClick={() => setIsAddSectionDialogOpen(true)}
                      data-testid="button-add-section"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Добавить модуль
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {!sections || sections.length === 0 ? (
                  <p className="text-muted-foreground">Нет модулей. Добавьте первый модуль.</p>
                ) : (
                  <div className="space-y-2">
                    {sections.map((section) => (
                      <div key={section.id} className="border rounded-md">
                        <div className="flex items-center justify-between p-4 bg-muted/50">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleSection(section.id)}
                              data-testid={`button-toggle-section-${section.id}`}
                            >
                              {expandedSections.has(section.id) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                            <div>
                              <h3 className="font-semibold">{section.title}</h3>
                              {section.description && (
                                <p className="text-sm text-muted-foreground">{section.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedSectionId(section.id);
                                setLessonFormData({ title: "", description: "", videoUrl: "", duration: 0 });
                                setUploadedVideo(null);
                                setUploadedFiles([]);
                                setVideoUploadPromise(null);
                                // Generate new session ID for this lesson dialog
                                lessonSessionCounterRef.current += 1;
                                setCurrentLessonSessionId(lessonSessionCounterRef.current);
                                setIsAddLessonDialogOpen(true);
                              }}
                              data-testid={`button-add-lesson-${section.id}`}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Добавить урок
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteSectionMutation.mutate(section.id)}
                              data-testid={`button-delete-section-${section.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {expandedSections.has(section.id) && (
                          <div className="p-4 space-y-2">
                            {!section.lessons || section.lessons.length === 0 ? (
                              <p className="text-sm text-muted-foreground">Нет уроков в этом модуле.</p>
                            ) : (
                              section.lessons.map((lesson) => (
                                <div
                                  key={lesson.id}
                                  className="flex items-center justify-between p-3 bg-background border rounded"
                                  data-testid={`lesson-${lesson.id}`}
                                >
                                  <div className="flex items-center gap-2 flex-1">
                                    <Play className="h-4 w-4 text-primary" />
                                    <div className="flex-1">
                                      <p className="font-medium">{lesson.title}</p>
                                      {lesson.description && (
                                        <p className="text-sm text-muted-foreground">{lesson.description}</p>
                                      )}
                                      {lesson.duration && (
                                        <p className="text-xs text-muted-foreground">{lesson.duration} мин</p>
                                      )}

                                      {/* Processing status indicator */}
                                      {lesson.processingStatus && lesson.processingStatus !== 'ready' && lesson.processingStatus !== 'draft' && (
                                        <div className="mt-2 space-y-1">
                                          {lesson.processingStatus === 'uploading' && (
                                            <p className="text-xs text-blue-500 flex items-center gap-1.5" data-testid={`status-uploading-${lesson.id}`}>
                                              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                                              <span>Загрузка видео...</span>
                                            </p>
                                          )}
                                          {lesson.processingStatus === 'queued' && (
                                            <p className="text-xs text-yellow-500" data-testid={`status-queued-${lesson.id}`}>⏳ В очереди на обработку...</p>
                                          )}
                                          {lesson.processingStatus === 'processing' && (
                                            <p className="text-xs text-purple-500" data-testid={`status-processing-${lesson.id}`}>🔄 Конвертация видео...</p>
                                          )}
                                          {lesson.processingStatus === 'failed' && (
                                            <p className="text-xs text-red-500" data-testid={`status-failed-${lesson.id}`}>❌ Ошибка: {lesson.errorMessage || 'Не удалось обработать видео'}</p>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleOpenEditLesson(lesson)}
                                      data-testid={`button-edit-lesson-${lesson.id}`}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => deleteLessonMutation.mutate(lesson.id)}
                                      data-testid={`button-delete-lesson-${lesson.id}`}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Section Dialog */}
      <Dialog open={isAddSectionDialogOpen} onOpenChange={setIsAddSectionDialogOpen}>
        <DialogContent data-testid="dialog-add-section">
          <DialogHeader>
            <DialogTitle>Добавить модуль</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Название модуля</Label>
              <Input
                value={sectionFormData.title}
                onChange={(e) => setSectionFormData({ ...sectionFormData, title: e.target.value })}
                data-testid="input-section-title"
              />
            </div>
            <div>
              <Label>Описание (необязательно)</Label>
              <Input
                value={sectionFormData.description}
                onChange={(e) => setSectionFormData({ ...sectionFormData, description: e.target.value })}
                data-testid="input-section-description"
              />
            </div>
            <Button
              onClick={handleAddSection}
              disabled={!sectionFormData.title || createSectionMutation.isPending}
              data-testid="button-submit-section"
            >
              Создать
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Lesson Dialog */}
      <Dialog open={isAddLessonDialogOpen} onOpenChange={(open) => {
        setIsAddLessonDialogOpen(open);
        if (!open) {
          // Clear all form data when dialog closes
          setLessonFormData({ title: "", description: "", videoUrl: "", duration: 0 });
          setUploadedVideo(null);
          setUploadedFiles([]);
          setVideoUploadPromise(null);
          setCurrentLessonSessionId(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-add-lesson">
          <DialogHeader>
            <DialogTitle>Добавить урок</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Название урока</Label>
              <Input
                value={lessonFormData.title}
                onChange={(e) => setLessonFormData({ ...lessonFormData, title: e.target.value })}
                data-testid="input-lesson-title"
              />
            </div>
            <div>
              <Label>Описание (необязательно)</Label>
              <Input
                value={lessonFormData.description}
                onChange={(e) => setLessonFormData({ ...lessonFormData, description: e.target.value })}
                data-testid="input-lesson-description"
              />
            </div>
            <div className="border rounded-md p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label>Видео урока (необязательно)</Label>
                <NowCdnVideoUploader
                  acceptedTypes="video/*"
                  buttonText="Выбрать видео"
                  inputId="video-upload"
                  onFileSelect={(file) => {
                    setVideoFile(file);
                    toast({ title: "Видео добавлено в очередь" });
                  }}
                />
              </div>

              {uploadedVideo && (
                <div className="p-3 bg-muted rounded-md space-y-2">
                  <div className="flex items-center gap-2">
                    <Play className="h-4 w-4 text-primary flex-shrink-0" />
                    <p className="text-sm font-medium truncate">{uploadedVideo.fileName}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Длительность (мин):</Label>
                    <Input
                      type="number"
                      value={uploadedVideo.duration || ''}
                      onChange={(e) => {
                        const newDuration = parseInt(e.target.value) || 0;
                        setUploadedVideo({ ...uploadedVideo, duration: newDuration });
                        setLessonFormData({ ...lessonFormData, duration: newDuration });
                      }}
                      className="h-8 w-24"
                      placeholder="0"
                      data-testid="input-video-duration"
                    />
                    {uploadedVideo.duration > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {uploadedVideo.duration === lessonFormData.duration ? '(авто)' : ''}
                      </span>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setUploadedVideo(null)}
                    className="mt-2"
                    data-testid="button-remove-video"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Отменить загрузку
                  </Button>
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <Label>Файлы урока</Label>
                <NowCdnUploader
                  acceptedTypes=".pdf,.doc,.docx,.zip,.rar,.txt"
                  buttonText="Загрузить файлы"
                  inputId="files-upload-input"
                  onUploadSuccess={({ fileName, fileUrl }) => {
                    const fileType = getFileType("", fileName);
                    setUploadedFiles(prev => [...prev, { fileName, fileUrl, fileType }]);
                  }}
                />
              </div>

              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  {uploadedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted rounded-md"
                      data-testid={`uploaded-file-${index}`}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileText className="h-4 w-4 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{file.fileName}</p>
                          <p className="text-xs text-muted-foreground">
                            Тип: {file.fileType === 'document' ? 'Документ' : file.fileType === 'video' ? 'Видео' : file.fileType === 'archive' ? 'Архив' : 'Другое'}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeUploadedFile(index)}
                        data-testid={`button-remove-file-${index}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {uploadedFiles.length === 0 && (
                <p className="text-sm text-muted-foreground">Файлы не загружены</p>
              )}
            </div>

            <Button
              onClick={() => {
                if (!lessonFormData.title) {
                  toast({ title: "Введите название урока", variant: "destructive" });
                  return;
                }
                const section = sections?.find(s => s.id === selectedSectionId);
                const nextOrder = (section?.lessons?.length || 0) + 1;
                createLessonMutation.mutate({
                  sectionId: selectedSectionId!,
                  title: lessonFormData.title,
                  description: lessonFormData.description || undefined,
                  order: nextOrder,
                });


              }}
              disabled={createLessonMutation.isPending}
            >
              {createLessonMutation.isPending ? "Создаём урок..." : "Создать урок"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Lesson Dialog */}
      <Dialog open={isEditLessonDialogOpen} onOpenChange={(open) => {
        setIsEditLessonDialogOpen(open);
        if (!open) {
          // Clear all form data when dialog closes
          setEditingLesson(null);
          setLessonFormData({ title: "", description: "", videoUrl: "", duration: 0 });
          setUploadedVideo(null);
          setUploadedFiles([]);
          setVideoUploadPromise(null);
          setCurrentLessonSessionId(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-edit-lesson">
          <DialogHeader>
            <DialogTitle>Редактировать урок</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Название урока</Label>
              <Input
                value={lessonFormData.title}
                onChange={(e) => setLessonFormData({ ...lessonFormData, title: e.target.value })}
                data-testid="input-edit-lesson-title"
              />
            </div>
            <div>
              <Label>Описание (необязательно)</Label>
              <Input
                value={lessonFormData.description}
                onChange={(e) => setLessonFormData({ ...lessonFormData, description: e.target.value })}
                data-testid="input-edit-lesson-description"
              />
            </div>
            <div className="border rounded-md p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label>Видео урока (необязательно)</Label>
                <NowCdnVideoUploader
                  acceptedTypes="video/*"
                  buttonText="Выбрать видео"
                  inputId="video-upload"
                  onFileSelect={(file) => {
                    setVideoFile(file);
                    toast({ title: "Видео добавлено в очередь" });
                  }}
                />
              </div>

              {/* Show processing status for video */}
              {editingLesson?.processingStatus && editingLesson.processingStatus !== 'ready' && editingLesson.processingStatus !== 'draft' && (
                <div className="p-3 bg-muted/50 rounded-md" data-testid="edit-lesson-video-status">
                  {editingLesson.processingStatus === 'uploading' && (
                    <p className="text-sm text-blue-500 flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                      <span>Загрузка видео...</span>
                    </p>
                  )}
                  {editingLesson.processingStatus === 'queued' && (
                    <p className="text-sm text-yellow-500 flex items-center gap-2">
                      <span className="animate-pulse">⏳</span> В очереди на обработку...
                    </p>
                  )}
                  {editingLesson.processingStatus === 'processing' && (
                    <p className="text-sm text-purple-500 flex items-center gap-2">
                      <span className="animate-spin">🔄</span> Конвертация видео...
                    </p>
                  )}
                  {editingLesson.processingStatus === 'failed' && (
                    <p className="text-sm text-red-500">
                      ❌ Ошибка: {editingLesson.errorMessage || 'Не удалось обработать видео'}
                    </p>
                  )}
                </div>
              )}

              {/* Show uploaded video OR existing video */}
              {(uploadedVideo || (editingLesson?.videoUrl && editingLesson.processingStatus === 'ready')) && (
                <div className="p-3 bg-muted rounded-md space-y-2">
                  <div className="flex items-center gap-2">
                    <Play className="h-4 w-4 text-primary flex-shrink-0" />
                    <p className="text-sm font-medium truncate">
                      {uploadedVideo
                        ? uploadedVideo.fileName
                        : editingLesson?.videoUrl?.split('/').pop() || 'video'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Длительность (мин):</Label>
                    <Input
                      type="number"
                      value={uploadedVideo ? uploadedVideo.duration : (editingLesson?.duration || 0)}
                      onChange={(e) => {
                        const newDuration = parseInt(e.target.value) || 0;
                        if (uploadedVideo) {
                          setUploadedVideo({ ...uploadedVideo, duration: newDuration });
                        }
                        setLessonFormData({ ...lessonFormData, duration: newDuration });
                      }}
                      className="h-8 w-24"
                      placeholder="0"
                      data-testid="input-edit-video-duration"
                      disabled={!uploadedVideo} // Only editable for new uploads
                    />
                    {(uploadedVideo?.duration || editingLesson?.duration) ? (
                      <span className="text-xs text-muted-foreground">
                        (авто)
                      </span>
                    ) : null}
                  </div>

                  {uploadedVideo ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setUploadedVideo(null)}
                      className="mt-2"
                      data-testid="button-cancel-upload-video"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Отменить загрузку
                    </Button>
                  ) : editingLesson?.videoUrl && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteVideoMutation.mutate(editingLesson.id)}
                      disabled={deleteVideoMutation.isPending}
                      className="mt-2"
                      data-testid="button-delete-edit-video"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {deleteVideoMutation.isPending ? "Удаление..." : "Удалить видео из урока"}
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <Label>Файлы урока</Label>
                <NowCdnUploader
                  acceptedTypes=".pdf,.doc,.docx,.zip,.rar,.txt"
                  buttonText="Загрузить файлы"
                  inputId="files-upload-input"
                  onUploadSuccess={({ fileName, fileUrl }) => {
                    const fileType = getFileType("", fileName);
                    setUploadedFiles(prev => [...prev, { fileName, fileUrl, fileType }]);
                  }}
                />
              </div>

              {lessonFiles && lessonFiles.length > 0 && (
                <div className="space-y-2 mb-3">
                  <p className="text-sm font-medium">Прикрепленные файлы:</p>
                  {lessonFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-md"
                      data-testid={`lesson-file-${file.id}`}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileText className="h-4 w-4 flex-shrink-0" />
                        <p className="text-sm font-medium truncate">{file.fileName}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          await deleteFileMutation.mutateAsync(file.id);
                          refetchLessonFiles();
                        }}
                        data-testid={`button-delete-lesson-file-${file.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Новые файлы (будут добавлены при сохранении):</p>
                  {uploadedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted rounded-md"
                      data-testid={`uploaded-file-edit-${index}`}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileText className="h-4 w-4 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{file.fileName}</p>
                          <p className="text-xs text-muted-foreground">
                            Тип: {file.fileType === 'document' ? 'Документ' : file.fileType === 'video' ? 'Видео' : file.fileType === 'archive' ? 'Архив' : 'Другое'}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeUploadedFile(index)}
                        data-testid={`button-remove-edit-file-${index}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {(!lessonFiles || lessonFiles.length === 0) && uploadedFiles.length === 0 && (
                <p className="text-sm text-muted-foreground">Файлы не загружены</p>
              )}
            </div>

            <Button
              onClick={handleEditLesson}
              disabled={!lessonFormData.title || updateLessonMutation.isPending}
              data-testid="button-submit-edit-lesson"
            >
              {updateLessonMutation.isPending ? "Сохранение..." : "Сохранить"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}