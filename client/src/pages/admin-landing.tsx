import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Edit, Save, X, Eye, AlertTriangle, Loader2, AlertCircle } from "lucide-react";
import { EditDialog, EditFieldDescriptor } from "@/components/EditDialog";
import {
  LandingHeader,
  HeroSection,
  PriceSection,
  FreeFeaturesSection,
  PlatformFeaturesSection,
  EarningSection,
  StatsSection,
  CTASection,
} from "@/components/landing-sections";
import type { LandingContent } from "@shared/schema";

// Helper to get value from nested path
function getValueFromPath(obj: any, path: string[]): any {
  let current = obj;
  for (const key of path) {
    if (current === null || current === undefined) return undefined;
    current = current[key];
  }
  return current;
}

// Helper to set value at nested path
function setValueAtPath(obj: any, path: string[], value: any): any {
  if (path.length === 0) return value;
  
  const newObj = { ...obj };
  let current: any = newObj;
  
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (Array.isArray(current[key])) {
      current[key] = [...current[key]];
    } else if (typeof current[key] === 'object' && current[key] !== null) {
      current[key] = { ...current[key] };
    }
    current = current[key];
  }
  
  const lastKey = path[path.length - 1];
  if (Array.isArray(current)) {
    const index = parseInt(lastKey);
    current[index] = value;
  } else {
    current[lastKey] = value;
  }
  
  return newObj;
}

// Helper to build field descriptors based on field path
function buildFieldDescriptor(fieldPath: string[], content: LandingContent): EditFieldDescriptor | null {
  const value = getValueFromPath(content, fieldPath);
  const field = fieldPath[0];
  
  // Simple text fields
  if (field === 'heroTitle') {
    return {
      fieldPath,
      label: 'Заголовок Hero секции',
      type: 'text',
      value,
      placeholder: 'Введите заголовок...',
    };
  }
  
  if (field === 'heroSubtitle') {
    return {
      fieldPath,
      label: 'Подзаголовок Hero секции',
      type: 'textarea',
      value,
      placeholder: 'Введите подзаголовок...',
    };
  }
  
  if (field === 'heroCtaPrimary') {
    return {
      fieldPath,
      label: 'Текст основной кнопки',
      type: 'text',
      value,
      placeholder: 'Начать обучение бесплатно',
    };
  }
  
  if (field === 'heroCtaSecondary') {
    return {
      fieldPath,
      label: 'Текст вторичной кнопки',
      type: 'text',
      value,
      placeholder: 'Войти в аккаунт',
    };
  }
  
  // Video fields
  if (field === 'videoUrl') {
    return {
      fieldPath,
      label: 'URL видео',
      type: 'url',
      value,
      placeholder: 'https://www.youtube.com/watch?v=...',
    };
  }
  
  if (field === 'videoPosterUrl') {
    return {
      fieldPath,
      label: 'URL постера видео',
      type: 'url',
      value,
      placeholder: 'https://...',
    };
  }
  
  if (field === 'videoTitle') {
    return {
      fieldPath,
      label: 'Заголовок видео',
      type: 'text',
      value,
      placeholder: 'Обзор платформы',
    };
  }
  
  if (field === 'videoDescription') {
    return {
      fieldPath,
      label: 'Описание видео',
      type: 'textarea',
      value,
      placeholder: 'Смотрите презентацию...',
    };
  }
  
  // Price fields
  if (field === 'priceTitle') {
    return {
      fieldPath,
      label: 'Заголовок секции цен',
      type: 'text',
      value,
      placeholder: 'Экономия до 97%',
    };
  }
  
  if (field === 'priceSubtitle') {
    return {
      fieldPath,
      label: 'Подзаголовок секции цен',
      type: 'textarea',
      value,
      placeholder: 'Курсы премиум-спикеров...',
    };
  }
  
  if (field === 'priceOfficial') {
    return {
      fieldPath,
      label: 'Официальная цена (₽)',
      type: 'number',
      value,
      placeholder: '150000',
    };
  }
  
  if (field === 'priceOurs') {
    return {
      fieldPath,
      label: 'Наша цена (₽)',
      type: 'number',
      value,
      placeholder: '3000',
    };
  }
  
  // Free section fields
  if (field === 'freeTitle') {
    return {
      fieldPath,
      label: 'Заголовок бесплатных функций',
      type: 'text',
      value,
      placeholder: 'Начните обучение без вложений',
    };
  }
  
  if (field === 'freeSubtitle') {
    return {
      fieldPath,
      label: 'Подзаголовок бесплатных функций',
      type: 'textarea',
      value,
      placeholder: 'Мы дали доступ к бесплатным материалам...',
    };
  }
  
  // Features fields
  if (field === 'featuresTitle') {
    return {
      fieldPath,
      label: 'Заголовок функций платформы',
      type: 'text',
      value,
      placeholder: 'Всё необходимое для обучения',
    };
  }
  
  if (field === 'featuresSubtitle') {
    return {
      fieldPath,
      label: 'Подзаголовок функций платформы',
      type: 'textarea',
      value,
      placeholder: 'Мощная платформа с уникальными возможностями...',
    };
  }
  
  // Arrays
  if (field === 'heroBenefits') {
    return {
      fieldPath,
      label: 'Преимущества Hero секции',
      type: 'array',
      value,
    };
  }
  
  // Object arrays
  if (field === 'priceAdvantages') {
    if (fieldPath.length === 2) {
      // Editing the whole advantage object
      return {
        fieldPath,
        label: `Преимущество ${parseInt(fieldPath[1]) + 1}`,
        type: 'object',
        value,
        objectFields: [
          { key: 'title', label: 'Заголовок', type: 'text' },
          { key: 'description', label: 'Описание', type: 'textarea' },
        ],
      };
    }
  }
  
  if (field === 'freeFeatures') {
    if (fieldPath.length === 2) {
      // Editing the whole free feature object
      return {
        fieldPath,
        label: `Бесплатная функция ${parseInt(fieldPath[1]) + 1}`,
        type: 'object',
        value,
        objectFields: [
          { key: 'title', label: 'Заголовок', type: 'text' },
          { key: 'description', label: 'Описание', type: 'textarea' },
        ],
      };
    } else if (fieldPath.length === 3 && fieldPath[2] === 'title') {
      return {
        fieldPath,
        label: 'Заголовок функции',
        type: 'text',
        value,
        placeholder: 'Введите заголовок...',
      };
    } else if (fieldPath.length === 3 && fieldPath[2] === 'description') {
      return {
        fieldPath,
        label: 'Описание функции',
        type: 'textarea',
        value,
        placeholder: 'Введите описание...',
      };
    } else if (fieldPath.length === 4 && fieldPath[2] === 'points') {
      // Editing a single point in the points array
      return {
        fieldPath,
        label: `Пункт ${parseInt(fieldPath[3]) + 1}`,
        type: 'text',
        value,
        placeholder: 'Введите текст пункта...',
      };
    } else if (fieldPath.length === 3 && fieldPath[2] === 'points') {
      // Editing entire points array
      return {
        fieldPath,
        label: 'Пункты функции',
        type: 'array',
        value,
      };
    }
  }
  
  if (field === 'platformFeatures') {
    if (fieldPath.length === 2) {
      // Editing the whole platform feature object
      return {
        fieldPath,
        label: `Функция платформы ${parseInt(fieldPath[1]) + 1}`,
        type: 'object',
        value,
        objectFields: [
          { key: 'title', label: 'Заголовок', type: 'text' },
          { key: 'description', label: 'Описание', type: 'textarea' },
        ],
      };
    } else if (fieldPath.length === 3 && fieldPath[2] === 'icon') {
      return {
        fieldPath,
        label: 'Иконка функции',
        type: 'icon',
        value,
      };
    } else if (fieldPath.length === 3 && fieldPath[2] === 'title') {
      return {
        fieldPath,
        label: 'Заголовок функции',
        type: 'text',
        value,
        placeholder: 'Введите заголовок...',
      };
    } else if (fieldPath.length === 3 && fieldPath[2] === 'description') {
      return {
        fieldPath,
        label: 'Описание функции',
        type: 'textarea',
        value,
        placeholder: 'Введите описание...',
      };
    }
  }
  
  return null;
}

export default function AdminLanding() {
  const { toast } = useToast();
  const [editMode, setEditMode] = useState(false);
  const [draftContent, setDraftContent] = useState<LandingContent | null>(null);
  const [originalContent, setOriginalContent] = useState<LandingContent | null>(null);
  const [currentDescriptor, setCurrentDescriptor] = useState<EditFieldDescriptor | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const { data: content, isLoading, isError, refetch } = useQuery<LandingContent>({
    queryKey: ['/api/landing-content'],
  });

  // Initialize draft content when data loads
  useEffect(() => {
    if (content) {
      setDraftContent(JSON.parse(JSON.stringify(content)));
      setOriginalContent(JSON.parse(JSON.stringify(content)));
      setIsDirty(false);
    }
  }, [content]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('PATCH', '/api/admin/landing-content', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/landing-content'] });
      setIsDirty(false);
      toast({
        title: "Успешно сохранено",
        description: "Все изменения на лендинге сохранены",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить изменения",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (fieldPath: string[], label: string) => {
    if (!draftContent) return;
    
    const descriptor = buildFieldDescriptor(fieldPath, draftContent);
    if (descriptor) {
      setCurrentDescriptor(descriptor);
      setIsDialogOpen(true);
    }
  };

  const handleSaveField = (fieldPath: string[], value: any) => {
    if (!draftContent) return;
    
    const newContent = setValueAtPath(draftContent, fieldPath, value);
    setDraftContent(newContent);
    setIsDirty(true);
  };

  const handleSaveAll = () => {
    if (!draftContent) return;
    updateMutation.mutate(draftContent);
  };

  const handleCancel = () => {
    if (originalContent) {
      setDraftContent(JSON.parse(JSON.stringify(originalContent)));
      setIsDirty(false);
      toast({
        title: "Изменения отменены",
        description: "Все несохраненные изменения были отменены",
      });
    }
  };

  const handlePreview = () => {
    window.open('/', '_blank');
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (isError || !content || !draftContent) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center space-y-4 max-w-md p-8">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold">Ошибка загрузки</h2>
            <p className="text-muted-foreground">
              Не удалось загрузить контент лендинга. Проверьте соединение с сервером.
            </p>
            <Button onClick={() => refetch()} data-testid="button-retry">
              Повторить попытку
            </Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header Controls */}
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border p-4 -m-6 mb-0">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight" data-testid="title-landing-editor">
                Редактор лендинга
              </h1>
              <p className="text-muted-foreground">
                {editMode ? 'Нажмите на любой элемент для редактирования' : 'Включите режим редактирования для изменения контента'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Edit Mode Toggle */}
              <div className="flex items-center gap-2 bg-card px-4 py-2 rounded-lg border">
                <Edit className="h-4 w-4" />
                <Label htmlFor="edit-mode" className="cursor-pointer">
                  Режим редактирования
                </Label>
                <Switch
                  id="edit-mode"
                  checked={editMode}
                  onCheckedChange={setEditMode}
                  data-testid="switch-edit-mode"
                />
              </div>

              {/* Preview Button */}
              <Button
                variant="outline"
                onClick={handlePreview}
                data-testid="button-preview"
              >
                <Eye className="h-4 w-4 mr-2" />
                Предпросмотр
              </Button>

              {/* Cancel Button */}
              {isDirty && (
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={updateMutation.isPending}
                  data-testid="button-cancel"
                >
                  <X className="h-4 w-4 mr-2" />
                  Отменить
                </Button>
              )}

              {/* Save Button */}
              <Button
                onClick={handleSaveAll}
                disabled={!isDirty || updateMutation.isPending}
                data-testid="button-save"
              >
                {updateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Сохранить изменения
              </Button>
            </div>
          </div>

          {/* Unsaved Changes Indicator */}
          {isDirty && (
            <div className="mt-3 flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-4 w-4" />
              <span>У вас есть несохраненные изменения</span>
            </div>
          )}
        </div>

        {/* Landing Page Preview/Editor */}
        <div className="relative">
          {editMode && (
            <div className="mb-4 p-4 bg-primary/10 rounded-lg border border-primary/20">
              <div className="flex items-start gap-3">
                <Edit className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h3 className="font-semibold text-primary mb-1">
                    Режим редактирования активен
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Наведите курсор на любой элемент и нажмите, чтобы отредактировать его содержимое.
                    Изменения применяются локально до нажатия кнопки "Сохранить изменения".
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Full Landing Page Display */}
          <div className="border rounded-lg overflow-hidden shadow-sm">
            <LandingHeader editMode={editMode} onEdit={handleEdit} />
            <HeroSection content={draftContent} editMode={editMode} onEdit={handleEdit} />
            <PriceSection content={draftContent} editMode={editMode} onEdit={handleEdit} />
            <FreeFeaturesSection content={draftContent} editMode={editMode} onEdit={handleEdit} />
            <PlatformFeaturesSection content={draftContent} editMode={editMode} onEdit={handleEdit} />
            <EarningSection />
            <StatsSection />
            <CTASection />
          </div>
        </div>

        {/* Edit Dialog */}
        <EditDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          descriptor={currentDescriptor}
          onSave={handleSaveField}
        />
      </div>
    </AdminLayout>
  );
}
