import { useState, useEffect, useMemo } from "react";
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
import { VipHeader, VipTiersGrid } from "@/components/vip-sections";

interface VipPageContent {
  pageTitle: string;
  pageSubtitle: string;
}

interface VipTier {
  id: string;
  tier: string;
  displayName: string;
  description?: string;
  price?: string;
  features: string[];
  displayOrder: number;
}

interface DraftContent {
  pageContent: VipPageContent;
  tiers: Record<string, VipTier>; // Keyed by tier name (bronze, silver, etc.)
}

// Helper to build field descriptors based on field path
function buildFieldDescriptor(fieldPath: string[], draftContent: DraftContent): EditFieldDescriptor | null {
  const field = fieldPath[0];

  // Page content fields
  if (field === 'pageTitle') {
    return {
      fieldPath,
      label: 'Заголовок страницы',
      type: 'text',
      value: draftContent.pageContent.pageTitle,
      placeholder: 'VIP Пакеты',
    };
  }

  if (field === 'pageSubtitle') {
    return {
      fieldPath,
      label: 'Подзаголовок страницы',
      type: 'textarea',
      value: draftContent.pageContent.pageSubtitle,
      placeholder: 'Выберите подходящий тариф...',
    };
  }

  // Tier fields
  if (field === 'tiers' && fieldPath.length >= 2) {
    const tierName = fieldPath[1]; // bronze, silver, gold, diamond
    const tier = draftContent.tiers[tierName];

    if (!tier) return null;

    const tierField = fieldPath[2];

    if (tierField === 'displayName') {
      return {
        fieldPath,
        label: `Название тарифа ${tierName}`,
        type: 'text',
        value: tier.displayName,
        placeholder: 'Название тарифа',
      };
    }

    if (tierField === 'description') {
      return {
        fieldPath,
        label: `Описание тарифа ${tierName}`,
        type: 'textarea',
        value: tier.description || '',
        placeholder: 'Описание тарифа',
      };
    }

    if (tierField === 'price') {
      return {
        fieldPath,
        label: `Цена тарифа ${tierName}`,
        type: 'number',
        value: tier.price ? parseInt(tier.price) : 0,
        placeholder: '0',
      };
    }

    if (tierField === 'features') {
      return {
        fieldPath,
        label: `Функции тарифа ${tierName}`,
        type: 'array',
        value: tier.features || [],
      };
    }
  }

  return null;
}

export default function AdminVipPage() {
  const { toast } = useToast();
  const [editMode, setEditMode] = useState(false);
  const [draftContent, setDraftContent] = useState<DraftContent | null>(null);
  const [editingField, setEditingField] = useState<EditFieldDescriptor | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Fetch page content
  const { data: pageContent, isLoading: isLoadingContent } = useQuery<VipPageContent>({
    queryKey: ["/api/vip-page-content"],
    placeholderData: {
      pageTitle: "VIP Пакеты",
      pageSubtitle: "Выберите подходящий тариф и получите эксклюзивный доступ к курсам, персональной поддержке и закрытым материалам для успешного обучения"
    }
  });

  // Fetch VIP tiers
  const { data: vipTiers, isLoading: isLoadingTiers } = useQuery<VipTier[]>({
    queryKey: ["/api/vip-tiers"],
  });

  // Initialize draft content when data loads
  useEffect(() => {
    if (pageContent && vipTiers && !draftContent) {
      const tiersMap: Record<string, VipTier> = {};
      vipTiers.forEach(tier => {
        tiersMap[tier.tier] = tier;
      });

      setDraftContent({
        pageContent: { ...pageContent },
        tiers: tiersMap,
      });
    }
  }, [pageContent, vipTiers, draftContent]);

  // Check if content has changed
  const hasChanges = useMemo(() => {
    if (!draftContent || !pageContent || !vipTiers) return false;

    // Check page content changes
    if (draftContent.pageContent.pageTitle !== pageContent.pageTitle ||
      draftContent.pageContent.pageSubtitle !== pageContent.pageSubtitle) {
      return true;
    }

    // Check tier changes
    for (const tier of vipTiers) {
      const draftTier = draftContent.tiers[tier.tier];
      if (!draftTier) continue;

      if (draftTier.displayName !== tier.displayName ||
        draftTier.description !== tier.description ||
        draftTier.price !== tier.price ||
        JSON.stringify(draftTier.features) !== JSON.stringify(tier.features)) {
        return true;
      }
    }

    return false;
  }, [draftContent, pageContent, vipTiers]);

  // Save page content mutation
  const savePageContentMutation = useMutation({
    mutationFn: async (data: VipPageContent) => {
      return apiRequest("PUT", "/api/admin/vip-page-content", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vip-page-content"] });
    },
  });

  // Save tier mutation
  const saveTierMutation = useMutation({
    mutationFn: async ({ tier, data }: { tier: string; data: Partial<VipTier> }) => {
      return apiRequest("PUT", `/api/admin/vip-tiers/${tier}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vip-tiers"] });
    },
  });

  // Handle save all changes
  const handleSave = async () => {
    if (!draftContent || !pageContent || !vipTiers) return;

    try {
      // Check what changed and save accordingly
      const pageContentChanged =
        draftContent.pageContent.pageTitle !== pageContent.pageTitle ||
        draftContent.pageContent.pageSubtitle !== pageContent.pageSubtitle;

      if (pageContentChanged) {
        await savePageContentMutation.mutateAsync(draftContent.pageContent);
      }

      // Save each modified tier
      for (const tier of vipTiers) {
        const draftTier = draftContent.tiers[tier.tier];
        if (!draftTier) continue;

        const tierChanged =
          draftTier.displayName !== tier.displayName ||
          draftTier.description !== tier.description ||
          draftTier.price !== tier.price ||
          JSON.stringify(draftTier.features) !== JSON.stringify(tier.features);

        if (tierChanged) {
          await saveTierMutation.mutateAsync({
            tier: tier.tier,
            data: {
              displayName: draftTier.displayName,
              description: draftTier.description,
              price: draftTier.price,
              features: draftTier.features,
            },
          });
        }
      }

      toast({
        title: "Успешно",
        description: "Контент VIP страницы сохранен",
      });

      setEditMode(false);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить изменения",
        variant: "destructive",
      });
    }
  };

  // Handle cancel
  const handleCancel = () => {
    if (pageContent && vipTiers) {
      const tiersMap: Record<string, VipTier> = {};
      vipTiers.forEach(tier => {
        tiersMap[tier.tier] = tier;
      });

      setDraftContent({
        pageContent: { ...pageContent },
        tiers: tiersMap,
      });
    }
    setEditMode(false);
  };

  // Handle field edit
  const handleFieldEdit = (fieldPath: string[], label: string) => {
    if (!draftContent) return;

    const descriptor = buildFieldDescriptor(fieldPath, draftContent);
    if (descriptor) {
      setEditingField(descriptor);
      setIsEditDialogOpen(true);
    }
  };

  // Handle save field edit
  const handleSaveFieldEdit = (fieldPath: string[], value: any) => {
    if (!draftContent) return;

    const field = fieldPath[0];

    if (field === 'pageTitle' || field === 'pageSubtitle') {
      setDraftContent({
        ...draftContent,
        pageContent: {
          ...draftContent.pageContent,
          [field]: value,
        },
      });
    } else if (field === 'tiers' && fieldPath.length >= 3) {
      const tierName = fieldPath[1];
      const tierField = fieldPath[2];

      setDraftContent({
        ...draftContent,
        tiers: {
          ...draftContent.tiers,
          [tierName]: {
            ...draftContent.tiers[tierName],
            [tierField]: tierField === 'price' ? String(value) : value,
          },
        },
      });
    }
  };

  const isLoading = isLoadingContent || isLoadingTiers;
  const isSaving = savePageContentMutation.isPending || saveTierMutation.isPending;

  if (isLoading || !draftContent) {
    return (
      <AdminLayout breadcrumbs={[{ label: "VIP Страница" }]}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  const displayContent = editMode && draftContent ? draftContent : {
    pageContent: pageContent || draftContent.pageContent,
    tiers: vipTiers ? Object.fromEntries(vipTiers.map(t => [t.tier, t])) : draftContent.tiers,
  };

  const tiersArray = Object.values(displayContent.tiers);

  return (
    <AdminLayout breadcrumbs={[{ label: "VIP Страница" }]}>
      <div className="space-y-6">
        {/* Header Controls */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-page-title">
              Редактор VIP страницы
            </h1>
            <p className="text-muted-foreground">
              Редактируйте контент VIP страницы в режиме реального времени
            </p>
          </div>

          <div className="flex items-center gap-3">
            {editMode && hasChanges && (
              <Badge variant="default" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                Есть несохраненные изменения
              </Badge>
            )}

            <div className="flex items-center gap-2">
              <Switch
                id="edit-mode"
                checked={editMode}
                onCheckedChange={setEditMode}
                disabled={isSaving}
                data-testid="switch-edit-mode"
              />
              <Label htmlFor="edit-mode" className="cursor-pointer">
                {editMode ? (
                  <span className="flex items-center gap-1">
                    <Edit className="h-4 w-4" />
                    Режим редактирования
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    Режим просмотра
                  </span>
                )}
              </Label>
            </div>

            {editMode && (
              <>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSaving || !hasChanges}
                  data-testid="button-cancel"
                >
                  <X className="h-4 w-4 mr-2" />
                  Отменить
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving || !hasChanges}
                  data-testid="button-save"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Сохранение...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Сохранить
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Preview/Editor */}
        <div className="border rounded-lg bg-background">
          <div className="p-8">
            <VipHeader
              pageTitle={displayContent.pageContent.pageTitle}
              pageSubtitle={displayContent.pageContent.pageSubtitle}
              editMode={editMode}
              onEdit={handleFieldEdit}
            />

            <VipTiersGrid
              vipTiers={tiersArray}
              editMode={editMode}
              onEdit={handleFieldEdit}
            />
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <EditDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        descriptor={editingField}
        onSave={handleSaveFieldEdit}
      />
    </AdminLayout>
  );
}
