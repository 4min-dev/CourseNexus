import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Package, Download, Link as LinkIcon, Search, X, Filter, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";

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

interface ProgramPurchase {
  id: string;
  userId: string;
  programId: string;
  price: string;
  purchasedAt: Date;
}

const CATEGORIES = [
  { value: "photo_editor", label: "Фоторедакторы" },
  { value: "video_editor", label: "Видеоредакторы" },
  { value: "telegram_bot", label: "Telegram боты" },
  { value: "spreadsheet", label: "Таблицы" },
  { value: "other", label: "Другое" },
];

const DOWNLOAD_TYPES = {
  torrent: { label: "Торрент", icon: Package },
  archive: { label: "Архив", icon: Package },
  link: { label: "Прямая ссылка", icon: LinkIcon },
};

export default function ProgramsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showFreeOnly, setShowFreeOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();

  // Fetch programs
  const { data: programs = [], isLoading: programsLoading } = useQuery<Program[]>({
    queryKey: ['/api/programs', selectedCategory, showFreeOnly, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory) params.append('category', selectedCategory);
      if (showFreeOnly) params.append('isFree', 'true');
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      
      const url = `/api/programs${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch programs');
      return response.json();
    },
  });

  // Fetch user's purchases
  const { data: purchases = [] } = useQuery<ProgramPurchase[]>({
    queryKey: ['/api/program-purchases'],
    enabled: !!user,
  });

  // Programs are already filtered by the API, no need for client-side filtering
  const filteredPrograms = programs;

  const isPurchased = (programId: string) => {
    return purchases.some(p => p.programId === programId);
  };

  const getCategoryLabel = (value: string) => {
    return CATEGORIES.find(c => c.value === value)?.label || value;
  };

  return (
    <div className="min-h-screen flex flex-col bg-background overflow-x-hidden">
      <Header />

      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-purple-600/20 via-pink-600/20 to-orange-600/20 border-b border-border/50">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent" />
        <div className="container mx-auto px-4 py-8 md:py-12 relative">
          <div className="max-w-3xl">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-3 md:mb-4">
              Магазин Программ
            </h1>
            <p className="text-base md:text-lg lg:text-xl text-muted-foreground">
              Полезные инструменты для работы с курсами: редакторы, боты, таблицы и многое другое
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 md:py-8 flex-1">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar - Filters */}
          <aside className={`
            lg:w-64 flex-shrink-0
            ${sidebarOpen ? 'block' : 'hidden lg:block'}
          `}>
            <Card className="p-6 sticky top-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-semibold text-lg">Фильтры</h2>
                <Button
                  size="icon"
                  variant="ghost"
                  className="lg:hidden"
                  onClick={() => setSidebarOpen(false)}
                  data-testid="button-close-sidebar"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Search */}
              <div className="mb-6">
                <label className="text-sm font-medium mb-2 block">Поиск</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Найти программу..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                    data-testid="input-search"
                  />
                </div>
              </div>

              {/* Category Filter */}
              <div className="mb-6">
                <label className="text-sm font-medium mb-3 block">Категория</label>
                <div className="space-y-2">
                  <Button
                    variant={selectedCategory === null ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setSelectedCategory(null)}
                    data-testid="button-category-all"
                  >
                    Все категории
                  </Button>
                  {CATEGORIES.map((category) => (
                    <Button
                      key={category.value}
                      variant={selectedCategory === category.value ? "default" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => setSelectedCategory(category.value)}
                      data-testid={`button-category-${category.value}`}
                    >
                      {category.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Free Only Toggle */}
              <div className="mb-4">
                <Button
                  variant={showFreeOnly ? "default" : "outline"}
                  className="w-full"
                  onClick={() => setShowFreeOnly(!showFreeOnly)}
                  data-testid="button-free-only"
                >
                  {showFreeOnly ? "Показать все" : "Только бесплатные"}
                </Button>
              </div>

              {/* Clear Filters */}
              {(selectedCategory || showFreeOnly || searchQuery) && (
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setSelectedCategory(null);
                    setShowFreeOnly(false);
                    setSearchQuery("");
                  }}
                  data-testid="button-clear-filters"
                >
                  Сбросить фильтры
                </Button>
              )}
            </Card>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {/* Mobile Filter Toggle */}
            <div className="lg:hidden mb-4">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setSidebarOpen(true)}
                data-testid="button-open-sidebar"
              >
                <Filter className="h-4 w-4 mr-2" />
                Фильтры
              </Button>
            </div>

            {/* Results Count */}
            <div className="mb-4 md:mb-6 flex items-center justify-between">
              <p className="text-sm md:text-base text-muted-foreground" data-testid="text-results-count">
                Найдено программ: {filteredPrograms.length}
              </p>
            </div>

            {/* Programs Grid */}
            {programsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="h-96 animate-pulse bg-muted" />
                ))}
              </div>
            ) : filteredPrograms.length === 0 ? (
              <Card className="p-8 md:p-12 text-center">
                <Package className="h-12 w-12 md:h-16 md:w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg md:text-xl font-semibold mb-2">Программы не найдены</h3>
                <p className="text-sm md:text-base text-muted-foreground">
                  Попробуйте изменить фильтры или поисковый запрос
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {filteredPrograms.map((program) => {
                  const purchased = isPurchased(program.id);
                  const canDownload = program.isFree || purchased;
                  const DownloadIcon = DOWNLOAD_TYPES[program.downloadType as keyof typeof DOWNLOAD_TYPES]?.icon || Download;

                  return (
                    <Link href={`/program/${program.id}`} key={program.id}>
                      <Card
                        className="flex flex-col overflow-hidden transition-all duration-300 h-full cursor-pointer group hover:shadow-lg no-default-hover-elevate no-default-active-elevate"
                        data-testid={`card-program-${program.id}`}
                      >
                        {/* Image */}
                        <div className="relative h-48 overflow-hidden bg-muted">
                          {program.imageUrl ? (
                            <img
                              src={program.imageUrl}
                              alt={program.title}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                              <Package className="h-16 w-16 text-muted-foreground" />
                            </div>
                          )}
                          
                          {/* Category Badge */}
                          <div className="absolute top-3 left-3">
                            <Badge variant="secondary" className="backdrop-blur-sm bg-background/80">
                              {getCategoryLabel(program.category)}
                            </Badge>
                          </div>

                          {/* Free Badge */}
                          {program.isFree && (
                            <div className="absolute top-3 right-3">
                              <Badge className="bg-green-500/90 hover:bg-green-500">
                                Бесплатно
                              </Badge>
                            </div>
                          )}

                          {/* Purchased Badge */}
                          {purchased && (
                            <div className="absolute bottom-3 right-3">
                              <Badge className="bg-blue-500/90">
                                Куплена
                              </Badge>
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="p-4 md:p-6 flex-1 flex flex-col">
                          <h3 className="text-lg md:text-xl font-semibold mb-2" data-testid={`text-program-title-${program.id}`}>
                            {program.title}
                          </h3>
                          
                          {program.description && (
                            <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                              {program.description}
                            </p>
                          )}

                          <div className="mt-auto space-y-3">
                            {/* Download Type */}
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <DownloadIcon className="h-4 w-4" />
                              <span>
                                {DOWNLOAD_TYPES[program.downloadType as keyof typeof DOWNLOAD_TYPES]?.label || program.downloadType}
                              </span>
                            </div>

                            {/* Price & Action */}
                            <div className="flex items-center justify-between gap-3">
                              {!program.isFree && (
                                <div className="flex flex-col gap-1">
                                  {program.paymentType === 'fantiks_only' && program.fantikPrice ? (
                                    <div className="text-2xl font-bold text-purple-500">
                                      {program.fantikPrice} 🎫
                                    </div>
                                  ) : program.paymentType === 'both' && program.fantikPrice ? (
                                    <>
                                      <div className="text-2xl font-bold">
                                        {program.price || "0"} ₽
                                      </div>
                                      <div className="text-sm text-purple-500 font-medium">
                                        или {program.fantikPrice} 🎫
                                      </div>
                                    </>
                                  ) : (
                                    <div className="text-2xl font-bold">
                                      {program.price || "0"} ₽
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              <div className={`flex items-center gap-2 text-sm font-medium text-primary ${program.isFree ? 'w-full justify-center' : 'ml-auto'}`}>
                                Подробнее
                                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      </div>

      <Footer />
    </div>
  );
}
