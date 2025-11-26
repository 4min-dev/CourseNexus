import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Edit, Save, X, Eye, AlertTriangle, Loader2 } from "lucide-react";
import { EditDialog, EditFieldDescriptor } from "@/components/EditDialog";
import {
  TradeInHero,
  TradeInHowItWorks,
  TradeInBenefits,
  TradeInCTA,
  TradeInFAQ
} from "@/components/trade-in-sections";
import type { TradeInPageContent } from "@shared/schema";

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
function buildFieldDescriptor(fieldPath: string[], content: TradeInPageContent): EditFieldDescriptor | null {
  const value = getValueFromPath(content, fieldPath);
  const field = fieldPath[0];
  
  // Hero Section Text Fields
  if (field === 'heroBadgeText') {
    return { fieldPath, label: 'Hero Badge текст', type: 'text', value, placeholder: 'Премиум программа обмена' };
  }
  if (field === 'heroTitle') {
    return { fieldPath, label: 'Заголовок Hero', type: 'text', value, placeholder: 'Trade-In' };
  }
  if (field === 'heroSubtitle') {
    return { fieldPath, label: 'Подзаголовок Hero', type: 'text', value, placeholder: 'Обменяйте старые курсы' };
  }
  if (field === 'heroDescription') {
    return { fieldPath, label: 'Описание Hero', type: 'textarea', value, placeholder: 'Превратите неактуальные знания...' };
  }
  if (field === 'heroButton') {
    return {
      fieldPath,
      label: 'Настройки кнопки Hero',
      type: 'object',
      value: {
        text: content.heroCtaPrimary,
        url: content.telegramUrl
      },
      objectFields: [
        { key: 'text', label: 'Текст кнопки', type: 'text' },
        { key: 'url', label: 'URL Telegram', type: 'url' },
      ],
    };
  }
  if (field === 'heroCtaPrimary') {
    return { fieldPath, label: 'Текст основной кнопки Hero', type: 'text', value, placeholder: 'Написать в Telegram' };
  }
  if (field === 'heroCtaSecondary') {
    return { fieldPath, label: 'Текст вторичной кнопки Hero', type: 'text', value, placeholder: 'Узнать подробнее' };
  }
  
  // Hero Images
  if (field === 'heroImage1Title') {
    return { fieldPath, label: 'Название изображения 1', type: 'text', value, placeholder: 'Выгодное партнёрство' };
  }
  if (field === 'heroImage1Description') {
    return { fieldPath, label: 'Описание изображения 1', type: 'text', value, placeholder: 'Обмен на взаимовыгодных условиях' };
  }
  if (field === 'heroImage2Title') {
    return { fieldPath, label: 'Название изображения 2', type: 'text', value, placeholder: 'Довольные клиенты' };
  }
  if (field === 'heroImage2Description') {
    return { fieldPath, label: 'Описание изображения 2', type: 'text', value, placeholder: 'Более 1000 успешных обменов' };
  }
  
  // How It Works Section
  if (field === 'howWorksBadgeText') {
    return { fieldPath, label: 'Badge текст "Как это работает"', type: 'text', value, placeholder: 'Как это работает' };
  }
  if (field === 'howWorksTitle') {
    return { fieldPath, label: 'Заголовок "Как это работает"', type: 'text', value, placeholder: 'Процесс обмена за 4 шага' };
  }
  if (field === 'howWorksSubtitle') {
    return { fieldPath, label: 'Подзаголовок "Как это работает"', type: 'textarea', value, placeholder: 'Простой и прозрачный процесс...' };
  }
  
  // Steps Array
  if (field === 'steps') {
    if (fieldPath.length === 1) {
      // Editing entire steps array
      return { fieldPath, label: 'Все шаги процесса', type: 'array', value };
    }
    if (fieldPath.length === 2) {
      // Editing a single step object
      const stepIndex = parseInt(fieldPath[1]);
      return {
        fieldPath,
        label: `Шаг ${stepIndex + 1}`,
        type: 'object',
        value,
        objectFields: [
          { key: 'title', label: 'Название шага', type: 'text' },
          { key: 'description', label: 'Описание шага', type: 'textarea' },
          { key: 'color', label: 'Цвет градиента (Tailwind classes)', type: 'text' },
        ],
      };
    }
    if (fieldPath.length === 3 && fieldPath[2] === 'icon') {
      return { fieldPath, label: 'Иконка шага', type: 'icon', value };
    }
    if (fieldPath.length === 3 && fieldPath[2] === 'title') {
      return { fieldPath, label: 'Название шага', type: 'text', value };
    }
    if (fieldPath.length === 3 && fieldPath[2] === 'description') {
      return { fieldPath, label: 'Описание шага', type: 'textarea', value };
    }
    if (fieldPath.length === 3 && fieldPath[2] === 'color') {
      return { fieldPath, label: 'Цвет градиента (Tailwind)', type: 'text', value, placeholder: 'from-purple-500 to-pink-500' };
    }
  }
  
  // Benefits Section
  if (field === 'benefitsBadgeText') {
    return { fieldPath, label: 'Badge текст преимуществ', type: 'text', value, placeholder: 'Преимущества' };
  }
  if (field === 'benefitsTitle') {
    return { fieldPath, label: 'Заголовок преимуществ', type: 'text', value, placeholder: 'Почему стоит обменять курсы с нами?' };
  }
  
  // Benefits Array
  if (field === 'benefits') {
    if (fieldPath.length === 1) {
      return { fieldPath, label: 'Все преимущества', type: 'array', value };
    }
    if (fieldPath.length === 2) {
      const benefitIndex = parseInt(fieldPath[1]);
      return {
        fieldPath,
        label: `Преимущество ${benefitIndex + 1}`,
        type: 'object',
        value,
        objectFields: [
          { key: 'title', label: 'Название', type: 'text' },
          { key: 'description', label: 'Описание', type: 'textarea' },
        ],
      };
    }
    if (fieldPath.length === 3 && fieldPath[2] === 'icon') {
      return { fieldPath, label: 'Иконка преимущества', type: 'icon', value };
    }
    if (fieldPath.length === 3 && fieldPath[2] === 'title') {
      return { fieldPath, label: 'Название преимущества', type: 'text', value };
    }
    if (fieldPath.length === 3 && fieldPath[2] === 'description') {
      return { fieldPath, label: 'Описание преимущества', type: 'textarea', value };
    }
  }
  
  // CTA Section
  if (field === 'ctaTitle') {
    return { fieldPath, label: 'Заголовок CTA', type: 'text', value, placeholder: 'Готовы обменять курсы?' };
  }
  if (field === 'ctaDescription') {
    return { fieldPath, label: 'Описание CTA', type: 'textarea', value, placeholder: 'Напишите нам в Telegram...' };
  }
  if (field === 'ctaButton') {
    return {
      fieldPath,
      label: 'Настройки кнопки CTA',
      type: 'object',
      value: {
        text: content.ctaButtonText,
        url: content.telegramUrl
      },
      objectFields: [
        { key: 'text', label: 'Текст кнопки', type: 'text' },
        { key: 'url', label: 'URL Telegram', type: 'url' },
      ],
    };
  }
  if (field === 'ctaButtonText') {
    return { fieldPath, label: 'Текст кнопки CTA', type: 'text', value, placeholder: 'Написать в Telegram' };
  }
  
  // Contact Info
  if (field === 'contactTelegram') {
    return { fieldPath, label: 'Telegram контакт', type: 'text', value, placeholder: '@vkurse_support' };
  }
  if (field === 'contactWorkingHours') {
    return { fieldPath, label: 'Часы работы', type: 'text', value, placeholder: 'Пн-Пт 10:00-19:00 (МСК)' };
  }
  
  // FAQ Section
  if (field === 'faqTitle') {
    return { fieldPath, label: 'Заголовок FAQ', type: 'text', value, placeholder: 'Условия обмена' };
  }
  if (field === 'faqSubtitle') {
    return { fieldPath, label: 'Подзаголовок FAQ', type: 'textarea', value, placeholder: 'Основные правила программы Trade-In' };
  }
  
  // FAQ Items Array
  if (field === 'faqItems') {
    if (fieldPath.length === 1) {
      return { 
        fieldPath, 
        label: 'Все вопросы FAQ', 
        type: 'array', 
        value,
        defaultArrayItem: { q: '', a: '' }
      };
    }
    if (fieldPath.length === 2) {
      const faqIndex = parseInt(fieldPath[1]);
      return {
        fieldPath,
        label: `FAQ ${faqIndex + 1}`,
        type: 'object',
        value,
        objectFields: [
          { key: 'q', label: 'Вопрос', type: 'text' },
          { key: 'a', label: 'Ответ', type: 'textarea' },
        ],
      };
    }
    if (fieldPath.length === 3 && fieldPath[2] === 'q') {
      return { fieldPath, label: 'Вопрос', type: 'text', value };
    }
    if (fieldPath.length === 3 && fieldPath[2] === 'a') {
      return { fieldPath, label: 'Ответ', type: 'textarea', value };
    }
  }
  
  // Telegram URL
  if (field === 'telegramUrl') {
    return { fieldPath, label: 'URL Telegram', type: 'url', value, placeholder: 'https://t.me/vkurse_support' };
  }
  
  return null;
}

export default function AdminTradeIn() {
  const { toast } = useToast();
  const [editMode, setEditMode] = useState(false);
  const [draftContent, setDraftContent] = useState<TradeInPageContent | null>(null);
  const [originalContent, setOriginalContent] = useState<TradeInPageContent | null>(null);
  const [currentDescriptor, setCurrentDescriptor] = useState<EditFieldDescriptor | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const { data: content, isLoading, isError, refetch } = useQuery<TradeInPageContent>({
    queryKey: ['/api/trade-in-content'],
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
      return apiRequest('PATCH', '/api/admin/trade-in-content', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trade-in-content'] });
      setIsDirty(false);
      toast({
        title: "Успешно сохранено",
        description: "Все изменения на странице Trade-In сохранены",
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
    
    // Handle composite button fields (text + url)
    if (fieldPath[0] === 'ctaButton') {
      const newContent = {
        ...draftContent,
        ctaButtonText: value.text,
        telegramUrl: value.url,
      };
      setDraftContent(newContent);
      setIsDirty(true);
      return;
    }
    
    if (fieldPath[0] === 'heroButton') {
      const newContent = {
        ...draftContent,
        heroCtaPrimary: value.text,
        telegramUrl: value.url,
      };
      setDraftContent(newContent);
      setIsDirty(true);
      return;
    }
    
    // Normal field update
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
    window.open('/trade-in', '_blank');
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
              Не удалось загрузить контент Trade-In страницы. Проверьте соединение с сервером.
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
              <h1 className="text-3xl font-bold tracking-tight" data-testid="title-trade-in-editor">
                Редактор Trade-In страницы
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
                Сохранить
              </Button>
            </div>
          </div>
          
          {/* Dirty Indicator */}
          {isDirty && (
            <div className="mt-3 flex items-center gap-2 text-sm text-amber-600 dark:text-amber-500">
              <AlertTriangle className="h-4 w-4" />
              <span>У вас есть несохраненные изменения</span>
            </div>
          )}
        </div>

        {/* Trade-In Page Content */}
        <div className="space-y-0 -mx-6">
          <TradeInHero content={draftContent} editMode={editMode} onEdit={handleEdit} />
          <TradeInHowItWorks content={draftContent} editMode={editMode} onEdit={handleEdit} />
          <TradeInBenefits content={draftContent} editMode={editMode} onEdit={handleEdit} />
          <TradeInCTA content={draftContent} editMode={editMode} onEdit={handleEdit} />
          <TradeInFAQ content={draftContent} editMode={editMode} onEdit={handleEdit} />
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
