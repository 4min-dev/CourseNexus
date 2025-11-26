import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Package, Plus, BookOpen, Edit, Trash2, Check, X, GripVertical, ShoppingCart, Upload, Image as ImageIcon, ChevronUp, ChevronDown } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { formatPrice } from "@/lib/formatPrice";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { Course } from "@shared/schema";

interface CoursePackage {
  id: string;
  name: string;
  description: string | null;
  thumbnailUrl: string | null;
  discount: number;
  categoryIds: string[] | null;
  displayOrder: number;
  isActive: boolean;
  courses: Course[];
  totalPrice: number;
  discountedPrice: number;
  purchaseCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

// ВЫНЕСЕН ЗА ПРЕДЕЛЫ КОМПОНЕНТА - ЧТОБЫ НЕ ПЕРЕСОЗДАВАЛСЯ ПРИ КАЖДОМ РЕНДЕРЕ!
function PackageForm({ pkg, categories, onSubmit, onCancel }: { 
  pkg?: CoursePackage | null; 
  categories?: Array<{ id: string; name: string }>; 
  onSubmit: (data: any) => void; 
  onCancel: () => void;
}) {
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    name: pkg?.name || "",
    description: pkg?.description || "",
    thumbnailUrl: pkg?.thumbnailUrl || "",
    discount: pkg?.discount || 0,
    categoryIds: pkg?.categoryIds || [],
    displayOrder: pkg?.displayOrder || 0,
    isActive: pkg?.isActive ?? true,
  });
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  
  // Синхронизация formData при изменении pkg
  // Используем JSON.stringify для стабильной проверки изменений
  const pkgKey = pkg ? JSON.stringify({
    id: pkg.id,
    name: pkg.name,
    description: pkg.description,
    thumbnailUrl: pkg.thumbnailUrl,
    discount: pkg.discount,
    categoryIds: pkg.categoryIds,
    displayOrder: pkg.displayOrder,
    isActive: pkg.isActive
  }) : null;
  
  useEffect(() => {
    if (pkg) {
      setFormData({
        name: pkg.name || "",
        description: pkg.description || "",
        thumbnailUrl: pkg.thumbnailUrl || "",
        discount: pkg.discount || 0,
        categoryIds: pkg.categoryIds || [],
        displayOrder: pkg.displayOrder || 0,
        isActive: pkg.isActive ?? true,
      });
    }
  }, [pkgKey]); // Зависимость от полного ключа пакета

  const handleThumbnailUpload = async (result: any) => {
    console.log('[THUMBNAIL] Upload callback triggered', { result });
    try {
      const uploadedFile = result.successful[0];
      console.log('[THUMBNAIL] Uploaded file:', uploadedFile);
      if (!uploadedFile) {
        console.log('[THUMBNAIL] No uploaded file, returning');
        return;
      }

      const uploadURL = uploadedFile.uploadURL;
      console.log('[THUMBNAIL] Upload URL:', uploadURL);
      
      // Set public ACL and get normalized path
      console.log('[THUMBNAIL] Setting ACL...');
      const aclResponse = await fetch('/api/objects/acl-public', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileURL: uploadURL }),
      });

      console.log('[THUMBNAIL] ACL response status:', aclResponse.status);
      if (!aclResponse.ok) {
        throw new Error('Failed to set public ACL');
      }

      const aclData = await aclResponse.json();
      console.log('[THUMBNAIL] ACL data:', aclData);
      const thumbnailUrl = aclData.publicPath;
      console.log('[THUMBNAIL] Extracted public path:', thumbnailUrl);
      
      console.log('[THUMBNAIL] Current formData before update:', formData);
      setFormData(prev => {
        console.log('[THUMBNAIL] Previous formData in setter:', prev);
        const updated = { ...prev, thumbnailUrl };
        console.log('[THUMBNAIL] Updated formData:', updated);
        return updated;
      });
      setIsUploadingThumbnail(false);
      
      toast({
        title: "Обложка загружена",
        description: "Обложка подборки успешно загружена",
      });
      console.log('[THUMBNAIL] Upload complete!');
    } catch (error) {
      console.error("[THUMBNAIL] Error uploading thumbnail:", error);
      setIsUploadingThumbnail(false);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить обложку",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Название подборки</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Стартовый набор для новичков"
          required
          data-testid="input-package-name"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Описание</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Всё необходимое для старта на маркетплейсах"
          rows={3}
          data-testid="input-package-description"
        />
      </div>

      {/* Category Selection */}
      {categories && categories.length > 0 && (
        <div className="space-y-2">
          <Label>Категории (где отображать подборку)</Label>
          <div className="border rounded-lg p-4 space-y-2 max-h-48 overflow-y-auto">
            <div className="flex items-center gap-2 pb-2 border-b">
              <Checkbox
                id="all-categories"
                checked={!formData.categoryIds || formData.categoryIds.length === 0}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setFormData(prev => ({ ...prev, categoryIds: [] }));
                  }
                }}
                data-testid="checkbox-all-categories"
              />
              <Label htmlFor="all-categories" className="font-medium cursor-pointer">
                Все категории (глобальная подборка)
              </Label>
            </div>
            {categories.map((category) => (
              <div key={category.id} className="flex items-center gap-2">
                <Checkbox
                  id={`category-${category.id}`}
                  checked={formData.categoryIds?.includes(category.id) || false}
                  onCheckedChange={(checked) => {
                    setFormData(prev => ({
                      ...prev,
                      categoryIds: checked
                        ? [...(prev.categoryIds || []), category.id]
                        : (prev.categoryIds || []).filter(id => id !== category.id)
                    }));
                  }}
                  data-testid={`checkbox-category-${category.id}`}
                />
                <Label htmlFor={`category-${category.id}`} className="cursor-pointer">
                  {category.name}
                </Label>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Выберите категории, в которых будет отображаться эта подборка. Если ни одна не выбрана - подборка будет глобальной (отображаться везде).
          </p>
        </div>
      )}

      {/* Thumbnail Upload */}
      <div className="space-y-2">
        <Label>Обложка подборки</Label>
        <div className="flex items-start gap-4">
          {/* Preview */}
          {formData.thumbnailUrl && (
            <div className="relative w-48 h-32 rounded-lg overflow-hidden bg-gradient-to-br from-purple-900/20 to-pink-900/20 flex-shrink-0">
              <img 
                src={formData.thumbnailUrl}
                alt="Превью обложки"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-7 w-7"
                onClick={() => setFormData(prev => ({ ...prev, thumbnailUrl: "" }))}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          {/* Upload Button */}
          {!formData.thumbnailUrl && (
            <ObjectUploader
              maxNumberOfFiles={1}
              maxFileSize={10 * 1024 * 1024} // 10MB
              onGetUploadParameters={async () => {
                try {
                  const response = await fetch('/api/objects/upload-public', {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                  });
                  if (!response.ok) throw new Error('Failed to get public upload URL');
                  const data = await response.json();
                  console.log('[PackageUpload] Got upload URL:', data);
                  return { method: 'PUT' as const, url: data.uploadURL, headers: data.uploadHeaders };
                } catch (error) {
                  console.error('[PackageUpload] Error getting upload URL:', error);
                  toast({ 
                    title: "Ошибка", 
                    description: "Не удалось получить URL для загрузки", 
                    variant: "destructive" 
                  });
                  throw error;
                }
              }}
              onUploadStart={() => setIsUploadingThumbnail(true)}
              onComplete={handleThumbnailUpload}
              buttonVariant="outline"
            >
              <Upload className="h-4 w-4 mr-2" />
              Загрузить обложку
            </ObjectUploader>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Рекомендуемый размер: 800x500px. Максимум 10MB.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="discount">Скидка (%)</Label>
          <Input
            id="discount"
            type="number"
            value={formData.discount}
            onChange={(e) => setFormData(prev => ({ ...prev, discount: parseInt(e.target.value) || 0 }))}
            min="0"
            max="100"
            data-testid="input-package-discount"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="displayOrder">Порядок отображения</Label>
          <Input
            id="displayOrder"
            type="number"
            value={formData.displayOrder}
            onChange={(e) => setFormData(prev => ({ ...prev, displayOrder: parseInt(e.target.value) || 0 }))}
            min="0"
            data-testid="input-package-order"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isActive"
          checked={formData.isActive}
          onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
          className="h-4 w-4"
          data-testid="checkbox-package-active"
        />
        <Label htmlFor="isActive">Активна (видна пользователям)</Label>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
          Отмена
        </Button>
        <Button 
          type="submit" 
          className="bg-gradient-to-r from-purple-600 to-pink-600 text-white"
          data-testid="button-submit"
        >
          {pkg ? "Сохранить изменения" : "Создать подборку"}
        </Button>
      </DialogFooter>
    </form>
  );
}

// Interface for ManageCoursesDialog props
interface ManageCoursesDialogProps {
  packageId: string;
  initialPackage: CoursePackage;
  allCourses: Course[] | undefined;
  onClose: () => void;
  onSave: () => Promise<void>;
}

// ВЫНЕСЕН ЗА ПРЕДЕЛЫ КОМПОНЕНТА - ЧТОБЫ НЕ ПЕРЕСОЗДАВАЛСЯ ПРИ КАЖДОМ РЕНДЕРЕ!
function ManageCoursesDialog({ packageId, initialPackage, allCourses, onClose, onSave }: ManageCoursesDialogProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [showOrderManagement, setShowOrderManagement] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Track initial course IDs to detect changes (set once on mount)
  const initialCourseIds = useRef(new Set(initialPackage.courses.map(c => c.id)));
  
  // Local state for selected courses (independent of snapshot)
  const [localCourses, setLocalCourses] = useState<Course[]>(initialPackage.courses);
  const selectedCourseIds = new Set(localCourses.map(c => c.id));
  
  // Mutations (defined locally to avoid passing)
  const addCourseMutation = useMutation({
    mutationFn: async ({ packageId, courseId, displayOrder }: { packageId: string; courseId: string; displayOrder: number }) => {
      return await apiRequest("POST", `/api/admin/packages/${packageId}/courses`, { courseId, displayOrder });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось добавить курс",
        variant: "destructive",
      });
    },
  });

  const removeCourseMutation = useMutation({
    mutationFn: async ({ packageId, courseId }: { packageId: string; courseId: string }) => {
      return await apiRequest("DELETE", `/api/admin/packages/${packageId}/courses/${courseId}`);
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось удалить курс",
        variant: "destructive",
      });
    },
  });

  const updateCourseOrderMutation = useMutation({
    mutationFn: async ({ packageId, courseId, displayOrder }: { packageId: string; courseId: string; displayOrder: number }) => {
      return await apiRequest("PATCH", `/api/admin/packages/${packageId}/courses/${courseId}`, { displayOrder });
    },
  });
  
  // Sort selected courses by displayOrder
  const selectedCourses = [...localCourses].sort((a, b) => {
    const aOrder = localCourses.findIndex(c => c.id === a.id);
    const bOrder = localCourses.findIndex(c => c.id === b.id);
    return aOrder - bOrder;
  });
  
  const filteredCourses = allCourses?.filter(course => {
    const matchesSearch = !searchQuery || 
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.platform?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  }) || [];
  
  const handleToggleCourse = (courseId: string, isSelected: boolean) => {
    if (isSelected) {
      // Add course - update local state only (no API call)
      const courseToAdd = allCourses?.find(c => c.id === courseId);
      if (courseToAdd) {
        setLocalCourses(prev => [...prev, courseToAdd]);
      }
    } else {
      // Remove course - update local state only (no API call)
      setLocalCourses(prev => prev.filter(c => c.id !== courseId));
    }
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const course = selectedCourses[index];
    const prevCourse = selectedCourses[index - 1];
    
    // Update local state only - swap courses (no API call)
    setLocalCourses(prev => {
      const newCourses = [...prev];
      const courseIndex = newCourses.findIndex(c => c.id === course.id);
      const prevCourseIndex = newCourses.findIndex(c => c.id === prevCourse.id);
      [newCourses[courseIndex], newCourses[prevCourseIndex]] = [newCourses[prevCourseIndex], newCourses[courseIndex]];
      return newCourses;
    });
  };

  const handleMoveDown = (index: number) => {
    if (index === selectedCourses.length - 1) return;
    const course = selectedCourses[index];
    const nextCourse = selectedCourses[index + 1];
    
    // Update local state only - swap courses (no API call)
    setLocalCourses(prev => {
      const newCourses = [...prev];
      const courseIndex = newCourses.findIndex(c => c.id === course.id);
      const nextCourseIndex = newCourses.findIndex(c => c.id === nextCourse.id);
      [newCourses[courseIndex], newCourses[nextCourseIndex]] = [newCourses[nextCourseIndex], newCourses[courseIndex]];
      return newCourses;
    });
  };

  // NEW: Save all changes when closing dialog
  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      // Determine added and removed courses
      const currentCourseIds = new Set(localCourses.map(c => c.id));
      const addedCourseIds = Array.from(currentCourseIds).filter(id => !initialCourseIds.current.has(id));
      const removedCourseIds = Array.from(initialCourseIds.current).filter(id => !currentCourseIds.has(id));

      console.log('[Package Save] Adding courses:', addedCourseIds);
      console.log('[Package Save] Removing courses:', removedCourseIds);
      console.log('[Package Save] Total courses after save:', localCourses.length);

      // Add new courses
      for (let i = 0; i < addedCourseIds.length; i++) {
        const courseId = addedCourseIds[i];
        const course = localCourses.find(c => c.id === courseId);
        if (course) {
          const displayOrder = localCourses.indexOf(course);
          console.log(`[Package Save] Adding course ${courseId} at position ${displayOrder}`);
          await addCourseMutation.mutateAsync({ packageId, courseId, displayOrder });
        }
      }

      // Remove deleted courses
      for (const courseId of removedCourseIds) {
        console.log(`[Package Save] Removing course ${courseId}`);
        await removeCourseMutation.mutateAsync({ packageId, courseId });
      }

      // Update display order for all remaining courses
      for (let i = 0; i < localCourses.length; i++) {
        const course = localCourses[i];
        console.log(`[Package Save] Updating order for course ${course.id} to ${i}`);
        await updateCourseOrderMutation.mutateAsync({
          packageId,
          courseId: course.id,
          displayOrder: i,
        });
      }

      console.log('[Package Save] Invalidating cache...');
      // Invalidate cache to refresh data
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/packages"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/packages"] });

      console.log('[Package Save] All changes saved successfully');
      toast({
        title: "Изменения сохранены",
        description: "Все изменения успешно сохранены",
      });

      // Call parent's onSave and close
      await onSave();
      onClose();
    } catch (error: any) {
      console.error('[Package Save] Error:', error);
      toast({
        title: "Ошибка сохранения",
        description: error.message || "Не удалось сохранить изменения",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DialogContent className="max-w-4xl max-h-[80vh]">
      <DialogHeader>
        <DialogTitle>Управление курсами: {initialPackage.name}</DialogTitle>
        <DialogDescription>
          Выберите курсы для включения в подборку
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        {/* Selected Courses Count and Order Management Toggle */}
        <div className="flex items-center justify-between gap-2 p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-purple-400" />
            <span className="font-medium">
              Выбрано курсов: {localCourses.length}
            </span>
          </div>
          {localCourses.length > 1 && (
            <Button
              variant={showOrderManagement ? "default" : "outline"}
              size="sm"
              onClick={() => setShowOrderManagement(!showOrderManagement)}
              data-testid="button-toggle-order-management"
            >
              {showOrderManagement ? "Добавить курсы" : "Изменить порядок"}
            </Button>
          )}
        </div>

        {/* Order Management Section */}
        {showOrderManagement && localCourses.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Текущий порядок курсов</Label>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {selectedCourses.map((course, index) => (
                  <div
                    key={course.id}
                    className="p-4 rounded-lg border-2 border-purple-500/60 bg-purple-500/10"
                    data-testid={`ordered-course-${course.id}`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Order Number */}
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>

                      {/* Thumbnail */}
                      <div className="relative w-24 h-16 rounded-lg overflow-hidden bg-gradient-to-br from-purple-900/20 to-pink-900/20 flex-shrink-0">
                        {course.thumbnailImage ? (
                          <img 
                            src={course.thumbnailImage}
                            alt={course.title}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <BookOpen className="h-6 w-6 text-muted-foreground/30" />
                          </div>
                        )}
                      </div>

                      {/* Course Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm mb-1 line-clamp-1">
                          {course.title}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {course.platform && (
                            <Badge variant="outline" className="text-xs">
                              {course.platform}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Order Controls */}
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                          data-testid={`button-move-up-${course.id}`}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleMoveDown(index)}
                          disabled={index === selectedCourses.length - 1}
                          data-testid={`button-move-down-${course.id}`}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Search Bar */}
        {!showOrderManagement && (
          <>
            <div className="relative">
              <Input
                placeholder="Поиск курсов по названию или платформе..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
                data-testid="input-search-courses"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Courses Grid */}
            <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-2">
            {filteredCourses && filteredCourses.length > 0 ? (
              filteredCourses.map((course) => {
                const isSelected = selectedCourseIds.has(course.id);
                
                return (
                  <div
                    key={course.id}
                    className={`
                      p-4 rounded-lg border-2 transition-all
                      ${isSelected 
                        ? 'border-purple-500/60 bg-purple-500/10' 
                        : 'border-border hover:border-purple-500/30'
                      }
                    `}
                    data-testid={`course-item-${course.id}`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Checkbox */}
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          handleToggleCourse(course.id, !!checked);
                        }}
                        disabled={isSaving}
                        className="mt-1 cursor-pointer"
                        data-testid={`checkbox-course-${course.id}`}
                      />

                      {/* Thumbnail */}
                      <div className="relative w-32 h-20 rounded-lg overflow-hidden bg-gradient-to-br from-purple-900/20 to-pink-900/20 flex-shrink-0">
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
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm mb-1 line-clamp-2">
                          {course.title}
                        </h4>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {course.platform && (
                            <Badge variant="outline" className="text-xs">
                              {course.platform}
                            </Badge>
                          )}
                          {course.price && (
                            <span className="font-medium text-foreground">
                              {formatPrice(parseFloat(course.price))}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Drag Handle (visual only for now) */}
                      {isSelected && (
                        <div className="text-muted-foreground/30 cursor-grab">
                          <GripVertical className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Нет доступных курсов
              </div>
            )}
              </div>
            </ScrollArea>
          </>
        )}
      </div>

      <DialogFooter className="gap-2">
        <Button
          variant="outline"
          onClick={onClose}
          disabled={isSaving}
          data-testid="button-cancel-manage-courses"
        >
          Отменить
        </Button>
        <Button
          onClick={handleSaveChanges}
          disabled={isSaving}
          className="bg-gradient-to-r from-purple-600 to-pink-600"
          data-testid="button-save-manage-courses"
        >
          {isSaving ? "Сохранение..." : "Сохранить изменения"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

export default function AdminPackages() {
  const { toast } = useToast();
  const [editingPackage, setEditingPackage] = useState<CoursePackage | null>(null);
  const [deletePackageId, setDeletePackageId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  // NEW: Single dialog state with frozen snapshot
  const [dialogState, setDialogState] = useState<{ packageId: string; snapshot: CoursePackage } | null>(null);

  const { data: packages, isLoading } = useQuery<CoursePackage[]>({
    queryKey: ["/api/admin/packages"],
  });

  const { data: allCourses } = useQuery<Course[]>({
    queryKey: ["/api/courses"],
  });

  const { data: categories } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ["/api/categories"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; thumbnailUrl?: string; discount: number; categoryIds?: string[]; displayOrder: number; isActive: boolean }) => {
      return await apiRequest("POST", "/api/admin/packages", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/packages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/packages"] });
      setCreateDialogOpen(false);
      toast({
        title: "Подборка создана",
        description: "Новая подборка курсов успешно создана",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось создать подборку",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CoursePackage> }) => {
      return await apiRequest("PUT", `/api/admin/packages/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/packages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/packages"] });
      setEditingPackage(null);
      toast({
        title: "Подборка обновлена",
        description: "Изменения успешно сохранены",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить подборку",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/admin/packages/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/packages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/packages"] });
      setDeletePackageId(null);
      toast({
        title: "Подборка удалена",
        description: "Подборка успешно удалена",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось удалить подборку",
        variant: "destructive",
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return await apiRequest("PUT", `/api/admin/packages/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/packages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/packages"] });
      toast({
        title: "Статус изменен",
        description: "Статус подборки успешно изменен",
      });
    },
  });

  const addCourseMutation = useMutation({
    mutationFn: async ({ packageId, courseId, displayOrder }: { packageId: string; courseId: string; displayOrder: number }) => {
      return await apiRequest("POST", `/api/admin/packages/${packageId}/courses`, { courseId, displayOrder });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось добавить курс",
        variant: "destructive",
      });
    },
  });

  const removeCourseMutation = useMutation({
    mutationFn: async ({ packageId, courseId }: { packageId: string; courseId: string }) => {
      return await apiRequest("DELETE", `/api/admin/packages/${packageId}/courses/${courseId}`);
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось удалить курс",
        variant: "destructive",
      });
    },
  });

  const updateCourseOrderMutation = useMutation({
    mutationFn: async ({ packageId, courseId, displayOrder }: { packageId: string; courseId: string; displayOrder: number }) => {
      return await apiRequest("PATCH", `/api/admin/packages/${packageId}/courses/${courseId}`, { displayOrder });
    },
    // No automatic invalidation - handled manually in handleMoveUp/handleMoveDown
  });

  // NEW: Function to open dialog with frozen snapshot
  const openManageCoursesDialog = (pkg: CoursePackage) => {
    setDialogState({
      packageId: pkg.id,
      snapshot: JSON.parse(JSON.stringify(pkg)) // Deep clone to freeze snapshot
    });
  };

  // NEW: Function to update dialog snapshot after mutations (no longer needed with extracted component)
  const handleDialogSave = async () => {
    // Refresh packages after dialog save
    await queryClient.invalidateQueries({ queryKey: ["/api/admin/packages"] });
  };

  // Function to close dialog
  const closeManageCoursesDialog = () => {
    setDialogState(null);
  };

  return (
    <AdminLayout breadcrumbs={[{ label: "Подборки курсов" }]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Package className="h-8 w-8 text-purple-500" />
              Подборки курсов
            </h1>
            <p className="text-muted-foreground">
              Управление пакетами и подборками курсов
            </p>
          </div>
            
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                  data-testid="button-create-package"
                >
                  <Plus className="h-5 w-5" />
                  Создать подборку
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Создать новую подборку</DialogTitle>
                  <DialogDescription>
                    Заполните информацию о подборке. Курсы можно будет добавить позже.
                  </DialogDescription>
                </DialogHeader>
                <PackageForm
                  categories={categories}
                  onSubmit={(data) => createMutation.mutate(data)}
                  onCancel={() => setCreateDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>

          {/* Packages Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              <>
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-6 w-3/4" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Skeleton className="h-32 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                    </CardContent>
                  </Card>
                ))}
              </>
            ) : packages && packages.length > 0 ? (
              packages.map((pkg) => (
                <Card
                  key={pkg.id}
                  className="hover-elevate active-elevate-2 transition-all"
                  data-testid={`card-admin-package-${pkg.id}`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-xl" data-testid={`text-admin-package-name-${pkg.id}`}>
                        {pkg.name}
                      </CardTitle>
                      <div className="flex gap-2">
                        {pkg.discount > 0 && (
                          <Badge variant="destructive" data-testid={`badge-admin-discount-${pkg.id}`}>
                            -{pkg.discount}%
                          </Badge>
                        )}
                        <Badge 
                          variant={pkg.isActive ? "default" : "secondary"} 
                          className="cursor-pointer"
                          onClick={() => toggleActiveMutation.mutate({ id: pkg.id, isActive: !pkg.isActive })}
                          data-testid={`badge-admin-status-${pkg.id}`}
                        >
                          {pkg.isActive ? <Check className="h-3 w-3 mr-1" /> : <X className="h-3 w-3 mr-1" />}
                          {pkg.isActive ? "Активен" : "Неактивен"}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Thumbnail Preview */}
                    {pkg.thumbnailUrl && (
                      <div className="relative w-full h-40 rounded-lg overflow-hidden bg-gradient-to-br from-purple-900/20 to-pink-900/20">
                        <img 
                          src={pkg.thumbnailUrl}
                          alt={pkg.name}
                          className="absolute inset-0 w-full h-full object-cover"
                          data-testid={`img-package-thumbnail-${pkg.id}`}
                        />
                      </div>
                    )}

                    {pkg.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-admin-description-${pkg.id}`}>
                        {pkg.description}
                      </p>
                    )}

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                          <span data-testid={`text-admin-course-count-${pkg.id}`}>
                            {pkg.courses.length} курсов
                          </span>
                        </div>
                        {typeof pkg.purchaseCount !== 'undefined' && (
                          <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                            <ShoppingCart className="h-3 w-3" />
                            <span data-testid={`text-admin-purchase-count-${pkg.id}`}>
                              {pkg.purchaseCount} покупок
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t">
                        {pkg.discount > 0 ? (
                          <div className="space-y-1">
                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl font-bold" data-testid={`text-admin-discounted-price-${pkg.id}`}>
                                {formatPrice(pkg.discountedPrice)}
                              </span>
                              <span className="text-sm text-muted-foreground line-through" data-testid={`text-admin-original-price-${pkg.id}`}>
                                {formatPrice(pkg.totalPrice)}
                              </span>
                            </div>
                            <p className="text-xs text-green-500">
                              Экономия: {formatPrice(pkg.totalPrice - pkg.discountedPrice)}
                            </p>
                          </div>
                        ) : (
                          <span className="text-2xl font-bold" data-testid={`text-admin-price-${pkg.id}`}>
                            {formatPrice(pkg.totalPrice)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 pt-4">
                      {/* Manage Courses Button */}
                      <Button
                        className="w-full gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                        onClick={() => openManageCoursesDialog(pkg)}
                        data-testid={`button-manage-courses-${pkg.id}`}
                      >
                        <BookOpen className="h-4 w-4" />
                        Управление курсами
                      </Button>

                      {/* Edit and Delete Buttons */}
                      <div className="flex gap-2">
                        <Dialog open={editingPackage?.id === pkg.id} onOpenChange={(open) => !open && setEditingPackage(null)}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              className="flex-1"
                              onClick={() => setEditingPackage(pkg)}
                              data-testid={`button-edit-package-${pkg.id}`}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Изменить
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Редактировать подборку</DialogTitle>
                              <DialogDescription>
                                Изменить информацию о подборке
                              </DialogDescription>
                            </DialogHeader>
                            <PackageForm
                              pkg={pkg}
                              categories={categories}
                              onSubmit={(data) => updateMutation.mutate({ id: pkg.id, data })}
                              onCancel={() => setEditingPackage(null)}
                            />
                          </DialogContent>
                        </Dialog>

                        <Button
                          variant="destructive"
                          onClick={() => setDeletePackageId(pkg.id)}
                          data-testid={`button-delete-package-${pkg.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="col-span-full p-12">
                <div className="text-center space-y-4">
                  <Package className="h-16 w-16 mx-auto text-muted-foreground" />
                  <div>
                    <h3 className="text-xl font-semibold">Пока нет подборок</h3>
                    <p className="text-muted-foreground">
                      Создайте первую подборку курсов
                    </p>
                  </div>
                  <Button
                    className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                    onClick={() => setCreateDialogOpen(true)}
                    data-testid="button-create-first-package"
                  >
                    <Plus className="h-5 w-5" />
                    Создать подборку
                  </Button>
                </div>
              </Card>
            )}
          </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deletePackageId} onOpenChange={(open) => !open && setDeletePackageId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Удалить подборку?</AlertDialogTitle>
              <AlertDialogDescription>
                Это действие нельзя отменить. Подборка будет удалена навсегда.
                Курсы останутся в системе и не будут затронуты.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deletePackageId && deleteMutation.mutate(deletePackageId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Удалить
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Root-Level Manage Courses Dialog */}
        <Dialog open={Boolean(dialogState)} onOpenChange={(open) => !open && setDialogState(null)}>
          {dialogState && (
            <ManageCoursesDialog 
              packageId={dialogState.packageId} 
              initialPackage={dialogState.snapshot}
              allCourses={allCourses}
              onClose={closeManageCoursesDialog}
              onSave={handleDialogSave}
            />
          )}
        </Dialog>
      </div>
    </AdminLayout>
  );
}
