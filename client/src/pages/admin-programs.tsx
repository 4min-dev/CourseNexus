import { useState, useEffect, useMemo } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Plus, Edit, Trash2, Download, ChevronUp, ChevronDown, Upload, Image as ImageIcon, Search, LayoutGrid, Table as TableIcon, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import AdminLayout from "@/components/AdminLayout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ObjectUploader } from "@/components/ObjectUploader";

interface Program {
  id: string;
  title: string;
  description: string | null;
  category: string;
  imageUrl: string | null;
  isFree: boolean;
  price: string | null;
  fantikPrice: number | null;
  paymentType: string | null;
  downloadType: string;
  downloadUrl: string | null;
  isActive: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

type InsertProgram = Omit<Program, 'id' | 'createdAt' | 'updatedAt'>;

const CATEGORIES = [
  { value: "photo_editor", label: "Фоторедакторы" },
  { value: "video_editor", label: "Видеоредакторы" },
  { value: "telegram_bot", label: "Telegram боты" },
  { value: "spreadsheet", label: "Таблицы" },
  { value: "other", label: "Другое" },
];

const DOWNLOAD_TYPES = [
  { value: "torrent", label: "Торрент" },
  { value: "archive", label: "Архив" },
  { value: "link", label: "Прямая ссылка" },
];

const PROGRAMS_PER_PAGE = 20;

export default function AdminPrograms() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [deletingProgramId, setDeletingProgramId] = useState<string | null>(null);
  
  // Search & Filters
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [freeFilter, setFreeFilter] = useState<string>("all");
  
  // View & Pagination
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [currentPage, setCurrentPage] = useState(1);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data: programs, isLoading } = useQuery<Program[]>({
    queryKey: ["/api/admin/programs"],
  });

  // Filter and paginate programs
  const filteredPrograms = useMemo(() => {
    if (!programs) return [];
    
    let filtered = programs;
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.title.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
      );
    }
    
    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter(p => p.category === categoryFilter);
    }
    
    // Status filter
    if (statusFilter === "active") {
      filtered = filtered.filter(p => p.isActive);
    } else if (statusFilter === "inactive") {
      filtered = filtered.filter(p => !p.isActive);
    }
    
    // Free/Paid filter
    if (freeFilter === "free") {
      filtered = filtered.filter(p => p.isFree);
    } else if (freeFilter === "paid") {
      filtered = filtered.filter(p => !p.isFree);
    }
    
    return filtered;
  }, [programs, searchQuery, categoryFilter, statusFilter, freeFilter]);

  // Pagination
  const totalPrograms = filteredPrograms.length;
  const totalPages = Math.ceil(totalPrograms / PROGRAMS_PER_PAGE);
  const startIndex = (currentPage - 1) * PROGRAMS_PER_PAGE;
  const endIndex = startIndex + PROGRAMS_PER_PAGE;
  const paginatedPrograms = filteredPrograms.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const createMutation = useMutation({
    mutationFn: async (data: InsertProgram) => {
      return await apiRequest("POST", "/api/admin/programs", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/programs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Программа создана",
        description: "Программа успешно добавлена",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось создать программу",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertProgram> }) => {
      return await apiRequest("PUT", `/api/admin/programs/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/programs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      setEditingProgram(null);
      toast({
        title: "Программа обновлена",
        description: "Изменения сохранены",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить программу",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/admin/programs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/programs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      setDeletingProgramId(null);
      toast({
        title: "Программа удалена",
        description: "Программа успешно удалена",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось удалить программу",
        variant: "destructive",
      });
    },
  });

  const moveProgram = async (programId: string, direction: "up" | "down") => {
    if (!programs) return;
    
    const currentIndex = programs.findIndex(p => p.id === programId);
    if (currentIndex === -1) return;
    
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= programs.length) return;

    const currentProgram = programs[currentIndex];
    const targetProgram = programs[targetIndex];

    await updateMutation.mutateAsync({
      id: currentProgram.id,
      data: { displayOrder: targetProgram.displayOrder },
    });

    await updateMutation.mutateAsync({
      id: targetProgram.id,
      data: { displayOrder: currentProgram.displayOrder },
    });
  };

  const getCategoryLabel = (value: string) => {
    return CATEGORIES.find(c => c.value === value)?.label || value;
  };

  const getDownloadTypeLabel = (value: string) => {
    return DOWNLOAD_TYPES.find(t => t.value === value)?.label || value;
  };

  return (
    <AdminLayout
      breadcrumbs={[
        { label: "Админ панель", href: "/admin" },
        { label: "Программы" },
      ]}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Package className="h-8 w-8" />
              Управление программами
            </h1>
            <p className="text-muted-foreground mt-2">
              Добавляйте и редактируйте программы в магазине
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-program">
                <Plus className="mr-2 h-4 w-4" />
                Добавить программу
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Создать программу</DialogTitle>
                <DialogDescription>
                  Добавьте новую программу в магазин
                </DialogDescription>
              </DialogHeader>
              <ProgramForm
                onSubmit={(data) => createMutation.mutate(data)}
                onCancel={() => setIsCreateDialogOpen(false)}
                isPending={createMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Search and Filters */}
        <Card className="p-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск по названию или описанию..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-programs"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setViewMode("grid")}
                  data-testid="button-grid-view"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "table" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setViewMode("table")}
                  data-testid="button-table-view"
                >
                  <TableIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Фильтры:</span>
              </div>
              
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]" data-testid="select-category-filter">
                  <SelectValue placeholder="Категория" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все категории</SelectItem>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
                  <SelectValue placeholder="Статус" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  <SelectItem value="active">Активные</SelectItem>
                  <SelectItem value="inactive">Неактивные</SelectItem>
                </SelectContent>
              </Select>

              <Select value={freeFilter} onValueChange={setFreeFilter}>
                <SelectTrigger className="w-[150px]" data-testid="select-free-filter">
                  <SelectValue placeholder="Тип" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все типы</SelectItem>
                  <SelectItem value="free">Бесплатные</SelectItem>
                  <SelectItem value="paid">Платные</SelectItem>
                </SelectContent>
              </Select>

              <div className="text-sm text-muted-foreground">
                Найдено: {totalPrograms} программ
              </div>
            </div>
          </div>
        </Card>

        {isLoading ? (
          viewMode === "grid" ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-48 w-full" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Название</TableHead>
                    <TableHead>Категория</TableHead>
                    <TableHead>Тип</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[1, 2, 3].map((i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )
        ) : paginatedPrograms.length > 0 ? (
          <>
            {viewMode === "grid" ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedPrograms.map((program, index) => {
                  const globalIndex = startIndex + index;
                  return (
                    <Card key={program.id} className="flex flex-col">
                      <CardHeader className="pb-3">
                        {program.imageUrl ? (
                          <div className="relative h-48 w-full rounded-lg overflow-hidden mb-4 bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                            <img
                              src={program.imageUrl}
                              alt={program.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="relative h-48 w-full rounded-lg overflow-hidden mb-4 bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                            <Package className="h-16 w-16 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-xl" data-testid={`text-program-title-${program.id}`}>
                            {program.title}
                          </CardTitle>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => moveProgram(program.id, "up")}
                              disabled={globalIndex === 0}
                              data-testid={`button-move-up-${program.id}`}
                            >
                              <ChevronUp className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => moveProgram(program.id, "down")}
                              disabled={globalIndex === filteredPrograms.length - 1}
                              data-testid={`button-move-down-${program.id}`}
                            >
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="flex-1 flex flex-col gap-4">
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2">
                            <Badge variant={program.isActive ? "default" : "secondary"}>
                              {program.isActive ? "Активна" : "Неактивна"}
                            </Badge>
                            <Badge variant={program.isFree ? "default" : "secondary"}>
                              {program.isFree ? "Бесплатная" : "Платная"}
                            </Badge>
                            <Badge variant="outline">
                              {getCategoryLabel(program.category)}
                            </Badge>
                          </div>
                          {program.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {program.description}
                            </p>
                          )}
                          <div className="text-sm space-y-1">
                            <div className="flex items-center gap-2">
                              <Download className="h-4 w-4 text-muted-foreground" />
                              <span>{getDownloadTypeLabel(program.downloadType)}</span>
                            </div>
                            {!program.isFree && (
                              <div className="font-semibold space-y-1">
                                {program.paymentType === "money_only" && program.price && (
                                  <div>Цена: {program.price} ₽</div>
                                )}
                                {program.paymentType === "fantiks_only" && program.fantikPrice && (
                                  <div>Цена: {program.fantikPrice} 🎫</div>
                                )}
                                {program.paymentType === "both" && (
                                  <>
                                    {program.price && <div>Цена: {program.price} ₽</div>}
                                    {program.fantikPrice && <div>или {program.fantikPrice} 🎫</div>}
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2 mt-auto">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => setEditingProgram(program)}
                            data-testid={`button-edit-${program.id}`}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Изменить
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeletingProgramId(program.id)}
                            data-testid={`button-delete-${program.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Название</TableHead>
                      <TableHead>Категория</TableHead>
                      <TableHead>Тип</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Цена</TableHead>
                      <TableHead className="text-right">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPrograms.map((program) => (
                      <TableRow key={program.id}>
                        <TableCell className="font-medium" data-testid={`text-program-title-${program.id}`}>
                          {program.title}
                        </TableCell>
                        <TableCell>{getCategoryLabel(program.category)}</TableCell>
                        <TableCell>
                          <Badge variant={program.isFree ? "default" : "secondary"}>
                            {program.isFree ? "Бесплатная" : "Платная"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={program.isActive ? "default" : "secondary"}>
                            {program.isActive ? "Активна" : "Неактивна"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {!program.isFree ? (
                            program.paymentType === "money_only" && program.price ? (
                              `${program.price} ₽`
                            ) : program.paymentType === "fantiks_only" && program.fantikPrice ? (
                              `${program.fantikPrice} 🎫`
                            ) : program.paymentType === "both" ? (
                              <>
                                {program.price && `${program.price} ₽`}
                                {program.price && program.fantikPrice && " / "}
                                {program.fantikPrice && `${program.fantikPrice} 🎫`}
                              </>
                            ) : "—"
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingProgram(program)}
                              data-testid={`button-edit-${program.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setDeletingProgramId(program.id)}
                              data-testid={`button-delete-${program.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Страница {currentPage} из {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    data-testid="button-prev-page"
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Назад
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    data-testid="button-next-page"
                  >
                    Вперед
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <Card className="p-12">
            <div className="text-center space-y-4">
              <Package className="h-16 w-16 mx-auto text-muted-foreground" />
              <h3 className="text-xl font-semibold">Программ пока нет</h3>
              <p className="text-muted-foreground">
                Добавьте первую программу, нажав кнопку выше
              </p>
            </div>
          </Card>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingProgram} onOpenChange={(open) => !open && setEditingProgram(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Редактировать программу</DialogTitle>
            <DialogDescription>
              Обновите информацию о программе
            </DialogDescription>
          </DialogHeader>
          {editingProgram && (
            <ProgramForm
              program={editingProgram}
              onSubmit={(data) => updateMutation.mutate({ id: editingProgram.id, data })}
              onCancel={() => setEditingProgram(null)}
              isPending={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingProgramId} onOpenChange={(open) => !open && setDeletingProgramId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить программу?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Программа будет удалена из системы.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingProgramId && deleteMutation.mutate(deletingProgramId)}
              data-testid="button-confirm-delete"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}

function ProgramForm({ 
  program, 
  onSubmit, 
  onCancel, 
  isPending 
}: { 
  program?: Program | null; 
  onSubmit: (data: any) => void; 
  onCancel: () => void;
  isPending?: boolean;
}) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    title: program?.title || "",
    description: program?.description || "",
    category: program?.category || "other",
    imageUrl: program?.imageUrl || "",
    isFree: program?.isFree ?? true,
    price: program?.price || "0",
    fantikPrice: program?.fantikPrice || null,
    paymentType: program?.paymentType || "money_only",
    downloadType: program?.downloadType || "link",
    downloadUrl: program?.downloadUrl || "",
    displayOrder: program?.displayOrder ?? 0,
    isActive: program?.isActive ?? true,
  });

  const handleImageUpload = async (file: any) => {
    const response = await apiRequest("POST", "/api/objects/upload-public");
    const data = await response.json();
    return {
      method: "PUT" as const,
      url: data.uploadURL,
      headers: data.uploadHeaders,
    };
  };

  const handleImageComplete = async (result: any) => {
    try {
      const uploadedFile = result.successful?.[0];
      if (!uploadedFile) return;

      const uploadURL = uploadedFile.uploadURL;
      
      // Set public ACL and get normalized path
      const aclResponse = await apiRequest("PUT", "/api/objects/acl-public", { fileURL: uploadURL });
      const aclData = await aclResponse.json();
      const imageUrl = aclData.publicPath;
      
      setFormData(prev => ({ ...prev, imageUrl }));
    } catch (error) {
      console.error('Error processing image upload:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось обработать загрузку изображения",
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
        <Label htmlFor="title">Название программы</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          placeholder="Adobe Photoshop 2024"
          required
          data-testid="input-program-title"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Описание</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Описание программы..."
          rows={3}
          data-testid="input-program-description"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="category">Категория</Label>
          <Select
            value={formData.category}
            onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
          >
            <SelectTrigger id="category" data-testid="select-category">
              <SelectValue placeholder="Выберите категорию" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="downloadType">Тип загрузки</Label>
          <Select
            value={formData.downloadType}
            onValueChange={(value) => setFormData(prev => ({ ...prev, downloadType: value }))}
          >
            <SelectTrigger id="downloadType" data-testid="select-download-type">
              <SelectValue placeholder="Выберите тип" />
            </SelectTrigger>
            <SelectContent>
              {DOWNLOAD_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="downloadUrl">Ссылка для скачивания</Label>
        <Input
          id="downloadUrl"
          type="url"
          value={formData.downloadUrl}
          onChange={(e) => setFormData(prev => ({ ...prev, downloadUrl: e.target.value }))}
          placeholder="https://example.com/download"
          data-testid="input-download-url"
        />
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="isFree"
          checked={formData.isFree}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isFree: checked as boolean }))}
          data-testid="checkbox-is-free"
        />
        <Label htmlFor="isFree" className="cursor-pointer">
          Бесплатная программа
        </Label>
      </div>

      {!formData.isFree && (
        <>
          <div className="space-y-2">
            <Label htmlFor="paymentType">Тип оплаты</Label>
            <Select
              value={formData.paymentType}
              onValueChange={(value) => setFormData(prev => ({ ...prev, paymentType: value }))}
            >
              <SelectTrigger id="paymentType" data-testid="select-payment-type">
                <SelectValue placeholder="Выберите тип оплаты" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="money_only">Только деньгами</SelectItem>
                <SelectItem value="fantiks_only">Только фантиками</SelectItem>
                <SelectItem value="both">Деньгами или фантиками</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              При оплате деньгами пользователи могут получить скидку до 20% фантиками
            </p>
          </div>

          <div className={`grid gap-4 ${formData.paymentType === "both" ? "grid-cols-2" : "grid-cols-1"}`}>
            {formData.paymentType !== "fantiks_only" && (
              <div className="space-y-2">
                <Label htmlFor="price">Цена (₽)</Label>
                <Input
                  id="price"
                  type="text"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="0"
                  data-testid="input-price"
                />
              </div>
            )}

            {formData.paymentType !== "money_only" && (
              <div className="space-y-2">
                <Label htmlFor="fantikPrice">Цена в фантиках</Label>
                <Input
                  id="fantikPrice"
                  type="number"
                  value={formData.fantikPrice || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, fantikPrice: e.target.value ? parseInt(e.target.value) : null }))}
                  placeholder="100"
                  data-testid="input-fantik-price"
                />
              </div>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            За покупку программы пользователь получит 1% от цены в рублях бонусом
          </p>
        </>
      )}

      <div className="space-y-2">
        <Label>Изображение программы</Label>
        {formData.imageUrl && (
          <div className="relative h-48 w-full rounded-lg overflow-hidden mb-2 bg-gradient-to-br from-purple-500/20 to-pink-500/20">
            <img
              src={formData.imageUrl}
              alt="Preview"
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <ObjectUploader
          onGetUploadParameters={handleImageUpload}
          onComplete={handleImageComplete}
          buttonVariant="outline"
          data-testid="upload-program-image"
        >
          <ImageIcon className="mr-2 h-4 w-4" />
          Загрузить изображение
        </ObjectUploader>
        <p className="text-sm text-muted-foreground">
          Рекомендуется 800x600px
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="displayOrder">Порядок отображения</Label>
        <Input
          id="displayOrder"
          type="number"
          value={formData.displayOrder}
          onChange={(e) => setFormData(prev => ({ ...prev, displayOrder: parseInt(e.target.value) || 0 }))}
          data-testid="input-display-order"
        />
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="isActive"
          checked={formData.isActive}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked as boolean }))}
          data-testid="checkbox-is-active"
        />
        <Label htmlFor="isActive" className="cursor-pointer">
          Активна (видна пользователям)
        </Label>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
          Отмена
        </Button>
        <Button type="submit" disabled={isPending} data-testid="button-submit">
          {isPending ? "Сохранение..." : "Сохранить"}
        </Button>
      </DialogFooter>
    </form>
  );
}
