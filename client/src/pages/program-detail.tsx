import { useRoute, Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, Package, Download, Star, ThumbsUp, ThumbsDown, 
  Edit, Trash2, AlertCircle, BookOpen, ShoppingCart, Wallet, Gift 
} from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { formatPrice } from "@/lib/formatPrice";

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

interface ProgramInstruction {
  id: string;
  programId: string;
  step: number;
  title: string;
  content: string;
  createdAt: Date;
}

interface ProgramReview {
  id: string;
  programId: string;
  userId: string;
  rating: number;
  comment: string | null;
  status: "pending" | "approved" | "rejected";
  moderatorId: string | null;
  moderatorComment: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
    selectedAward: string | null;
  };
}

const CATEGORIES: Record<string, string> = {
  photo_editor: "Фоторедакторы",
  video_editor: "Видеоредакторы",
  telegram_bot: "Telegram боты",
  spreadsheet: "Таблицы",
  other: "Другое",
};

const DOWNLOAD_TYPES: Record<string, string> = {
  torrent: "Торрент",
  archive: "Архив",
  link: "Прямая ссылка",
};

export default function ProgramDetail() {
  const [, params] = useRoute("/program/:id");
  const programId = params?.id;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [useFantiks, setUseFantiks] = useState(false);
  const [payWithFantiks, setPayWithFantiks] = useState(false);

  const { data: program, isLoading: programLoading } = useQuery<Program>({
    queryKey: ["/api/programs", programId],
    enabled: !!programId,
  });

  const { data: instructions, isLoading: instructionsLoading } = useQuery<ProgramInstruction[]>({
    queryKey: ["/api/programs", programId, "instructions"],
    enabled: !!programId,
  });

  const { data: userPurchase } = useQuery({
    queryKey: ["/api/programs", programId, "purchase"],
    enabled: !!programId && !!user,
    queryFn: async () => {
      const res = await fetch(`/api/programs/${programId}/purchase`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });

  const isPurchased = !!userPurchase;
  const canDownload = program?.isFree || isPurchased;

  // Balance and Fantiks calculation
  const balance = parseFloat(user?.balance || "0") + parseFloat(user?.referralBalance || "0");
  const fantiks = user?.fantiks || 0;
  const price = parseFloat(program?.price || "0");
  const paymentType = program?.paymentType || 'money_only';
  const fantikPrice = program?.fantikPrice || null;
  
  // Determine if full fantik payment is possible
  const canPayWithFantiks = paymentType !== 'money_only' && fantikPrice !== null;
  const mustPayWithFantiks = paymentType === 'fantiks_only';
  
  // Calculate price based on payment method
  let finalPrice = 0;
  let fantiksToUse = 0;
  let canAfford = false;
  
  if (mustPayWithFantiks || payWithFantiks) {
    // Full payment with fantiks
    finalPrice = fantikPrice || 0;
    canAfford = fantiks >= finalPrice;
  } else {
    // Payment with money (possibly with fantiks discount)
    finalPrice = price;
    if (useFantiks && fantiks > 0) {
      const maxFantiksDiscount = price * 0.2;
      fantiksToUse = Math.min(fantiks, maxFantiksDiscount);
      finalPrice = Math.max(0, price - fantiksToUse);
    }
    canAfford = balance >= finalPrice;
  }

  const purchaseMutation = useMutation({
    mutationFn: async (params: { useFantiks: boolean; payWithFantiks: boolean }) => {
      return apiRequest("POST", "/api/program-purchases", {
        programId,
        useFantiks: params.useFantiks,
        payWithFantiks: params.payWithFantiks
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/programs", programId, "purchase"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setShowPurchaseDialog(false);
      setUseFantiks(false);
      setPayWithFantiks(false);
      toast({
        title: "Покупка успешна",
        description: "Теперь вы можете скачать программу",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось купить программу",
        variant: "destructive",
      });
    },
  });

  const handleDownload = () => {
    if (!program?.downloadUrl) {
      toast({
        title: "Ошибка",
        description: "Ссылка для скачивания не найдена",
        variant: "destructive",
      });
      return;
    }

    if (!canDownload) {
      setShowPurchaseDialog(true);
      return;
    }

    window.open(program.downloadUrl, "_blank");
  };

  if (programLoading) {
    return (
      <div className="min-h-screen bg-background overflow-x-hidden">
        <Header />
        <main className="container mx-auto px-4 py-6 max-w-7xl">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Skeleton className="aspect-video w-full mb-6" />
              <Skeleton className="h-96 w-full" />
            </div>
            <div>
              <Skeleton className="h-96 w-full" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!program) {
    return (
      <div className="min-h-screen bg-background overflow-x-hidden">
        <Header />
        <main className="container mx-auto px-4 py-6 max-w-7xl">
          <Card className="p-12 text-center">
            <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2" data-testid="text-not-found-title">Программа не найдена</h3>
            <p className="text-muted-foreground mb-4" data-testid="text-not-found-message">
              Программа не существует или была удалена
            </p>
            <Link href="/programs">
              <Button data-testid="button-back-to-programs">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Вернуться к программам
              </Button>
            </Link>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Back Button */}
        <div
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 hover-elevate px-2 py-1 rounded-md transition-all cursor-pointer"
          onClick={() => setLocation("/programs")}
          data-testid="link-back-to-programs"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад к программам
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Program Info & Tabs */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-xl border-2 border-border bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-orange-500/10">
              <div className="p-8">
                <div className="flex items-start gap-4 mb-6">
                  {program.imageUrl ? (
                    <div className="relative h-24 w-24 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                      <img
                        src={program.imageUrl}
                        alt={program.title}
                        className="w-full h-full object-cover"
                        data-testid="img-program-icon"
                      />
                    </div>
                  ) : (
                    <div className="relative h-24 w-24 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                      <Package className="h-12 w-12 text-muted-foreground" data-testid="icon-program-placeholder" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h1 className="text-4xl font-bold tracking-tight mb-2" data-testid="text-program-title">
                      {program.title}
                    </h1>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" data-testid="badge-category">
                        {CATEGORIES[program.category] || program.category}
                      </Badge>
                      <Badge variant={program.isFree ? "default" : "secondary"} data-testid="badge-type">
                        {program.isFree ? "Бесплатная" : "Платная"}
                      </Badge>
                      {isPurchased && (
                        <Badge variant="default" className="bg-green-500" data-testid="badge-purchased">
                          Куплена
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {program.description && (
                  <p className="text-lg text-muted-foreground leading-relaxed" data-testid="text-program-description">
                    {program.description}
                  </p>
                )}
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="info" data-testid="tab-info">
                  <Package className="h-4 w-4 mr-2" />
                  Информация
                </TabsTrigger>
                <TabsTrigger value="instructions" data-testid="tab-instructions">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Инструкции
                </TabsTrigger>
                <TabsTrigger value="reviews" data-testid="tab-reviews">
                  <Star className="h-4 w-4 mr-2" />
                  Отзывы
                </TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>О программе</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Категория</p>
                        <p className="font-medium" data-testid="text-info-category">{CATEGORIES[program.category] || program.category}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Тип загрузки</p>
                        <p className="font-medium" data-testid="text-info-download-type">{DOWNLOAD_TYPES[program.downloadType] || program.downloadType}</p>
                      </div>
                      {!program.isFree && program.price && (
                        <div>
                          <p className="text-sm text-muted-foreground">Цена</p>
                          <p className="font-medium text-lg" data-testid="text-info-price">{formatPrice(parseFloat(program.price))} ₽</p>
                        </div>
                      )}
                    </div>
                    {program.description && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Описание</p>
                        <p className="text-muted-foreground" data-testid="text-info-description">{program.description}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="instructions" className="mt-6">
                <InstructionsSection
                  programId={programId!}
                  instructions={instructions || []}
                  isLoading={instructionsLoading}
                />
              </TabsContent>

              <TabsContent value="reviews" className="mt-6">
                <ReviewsSection
                  programId={programId!}
                  isPurchased={canDownload}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Right: Purchase Card */}
          <div className="lg:col-span-1">
            <Card className="sticky top-20">
              {program.imageUrl && (
                <div className="relative aspect-video w-full overflow-hidden">
                  <img
                    src={program.imageUrl}
                    alt={program.title}
                    className="w-full h-full object-cover"
                    data-testid="img-program-card"
                  />
                </div>
              )}

              <CardHeader>
                <div className="flex flex-col gap-2">
                  {program.isFree ? (
                    <h3 className="text-3xl font-bold text-green-500" data-testid="text-price">
                      Бесплатно
                    </h3>
                  ) : paymentType === 'fantiks_only' && fantikPrice ? (
                    <h3 className="text-3xl font-bold text-purple-500" data-testid="text-price">
                      {fantikPrice} 🎫
                    </h3>
                  ) : paymentType === 'both' && fantikPrice ? (
                    <>
                      <h3 className="text-3xl font-bold" data-testid="text-price">
                        {formatPrice(parseFloat(program.price || "0"))} ₽
                      </h3>
                      <p className="text-lg text-purple-500 font-semibold" data-testid="text-fantik-price">
                        или {fantikPrice} 🎫
                      </p>
                    </>
                  ) : (
                    <h3 className="text-3xl font-bold" data-testid="text-price">
                      {formatPrice(parseFloat(program.price || "0"))} ₽
                    </h3>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {isPurchased ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-green-500" data-testid="text-purchased-status">
                      <Download className="h-5 w-5" />
                      <span className="font-semibold">Программа приобретена</span>
                    </div>
                    <Button
                      className="w-full text-lg py-6"
                      onClick={handleDownload}
                      data-testid="button-download"
                    >
                      <Download className="mr-2 h-5 w-5" />
                      Скачать
                    </Button>
                  </div>
                ) : program.isFree ? (
                  <Button
                    className="w-full text-lg py-6"
                    onClick={handleDownload}
                    data-testid="button-download"
                  >
                    <Download className="mr-2 h-5 w-5" />
                    Скачать бесплатно
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Wallet className="h-4 w-4" />
                        Баланс
                      </span>
                      <span className="font-semibold" data-testid="text-balance">
                        {formatPrice(balance)} ₽
                      </span>
                    </div>
                    {fantiks > 0 && (
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Gift className="h-4 w-4" />
                          Fantiks
                        </span>
                        <span className="font-semibold" data-testid="text-fantiks">
                          {fantiks} ₽
                        </span>
                      </div>
                    )}
                    <Button
                      className="w-full text-lg py-6"
                      onClick={() => setShowPurchaseDialog(true)}
                      disabled={purchaseMutation.isPending}
                      data-testid="button-purchase"
                    >
                      {purchaseMutation.isPending ? (
                        "Обработка..."
                      ) : (
                        <>
                          <ShoppingCart className="mr-2 h-5 w-5" />
                          Купить программу
                        </>
                      )}
                    </Button>
                  </div>
                )}

                <div className="text-sm text-muted-foreground space-y-1">
                  <p data-testid="text-card-download-type">• Тип: {DOWNLOAD_TYPES[program.downloadType]}</p>
                  <p data-testid="text-card-category">• Категория: {CATEGORIES[program.category]}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />

      {/* Purchase Confirmation Dialog */}
      <Dialog open={showPurchaseDialog} onOpenChange={setShowPurchaseDialog}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-purchase-confirmation">
          <DialogHeader>
            <DialogTitle>Подтверждение покупки</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Программа:</p>
              <p className="font-semibold" data-testid="text-dialog-program-title">{program?.title}</p>
            </div>

            {!program?.isFree && canPayWithFantiks && !mustPayWithFantiks && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Способ оплаты:</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant={!payWithFantiks ? "default" : "outline"}
                    className="w-full"
                    onClick={() => {
                      setPayWithFantiks(false);
                      setUseFantiks(false);
                    }}
                    data-testid="button-pay-with-money"
                  >
                    <Wallet className="mr-2 h-4 w-4" />
                    Деньгами
                  </Button>
                  <Button
                    variant={payWithFantiks ? "default" : "outline"}
                    className="w-full"
                    onClick={() => {
                      setPayWithFantiks(true);
                      setUseFantiks(false);
                    }}
                    data-testid="button-pay-with-fantiks"
                  >
                    <Gift className="mr-2 h-4 w-4" />
                    Фантиками
                  </Button>
                </div>
              </div>
            )}

            {!program?.isFree && !payWithFantiks && !mustPayWithFantiks && fantiks > 0 && (
              <div className="flex items-center space-x-2 p-3 rounded-lg bg-muted/50">
                <Checkbox 
                  id="useFantiks" 
                  checked={useFantiks}
                  onCheckedChange={(checked) => setUseFantiks(checked as boolean)}
                  data-testid="checkbox-use-fantiks"
                />
                <Label 
                  htmlFor="useFantiks" 
                  className="text-sm font-medium leading-none cursor-pointer"
                  data-testid="label-use-fantiks"
                >
                  Использовать Fantiks (до 20% скидки)
                </Label>
              </div>
            )}

            <div className="space-y-2 p-4 rounded-lg bg-muted/30">
              {mustPayWithFantiks || payWithFantiks ? (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Цена в фантиках:</span>
                    <span className="font-semibold text-purple-500" data-testid="text-dialog-fantik-price-value">
                      {fantikPrice} 🎫
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-sm text-muted-foreground">Ваши фантики:</span>
                    <span className="font-semibold" data-testid="text-dialog-user-fantiks">
                      {fantiks} 🎫
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Цена:</span>
                    <span className={useFantiks ? "line-through text-muted-foreground" : "font-semibold"} data-testid="text-dialog-original-price">
                      {formatPrice(price)} ₽
                    </span>
                  </div>

                  {useFantiks && fantiksToUse > 0 && (
                    <>
                      <div className="flex justify-between items-center text-green-600">
                        <span className="text-sm">Скидка Fantiks:</span>
                        <span className="font-semibold" data-testid="text-dialog-fantiks-discount">
                          -{formatPrice(fantiksToUse)} ₽
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t">
                        <span className="font-semibold">Итого:</span>
                        <span className="font-bold text-lg" data-testid="text-dialog-final-price">
                          {formatPrice(finalPrice)} ₽
                        </span>
                      </div>
                    </>
                  )}

                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-sm text-muted-foreground">Баланс:</span>
                    <span className="font-semibold" data-testid="text-dialog-balance">
                      {formatPrice(balance)} ₽
                    </span>
                  </div>
                </>
              )}

              {!canAfford && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <span data-testid="text-insufficient-balance">
                    {mustPayWithFantiks || payWithFantiks ? "Недостаточно фантиков" : "Недостаточно средств"}
                  </span>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowPurchaseDialog(false);
                setUseFantiks(false);
                setPayWithFantiks(false);
              }}
              data-testid="button-dialog-cancel"
            >
              Отмена
            </Button>
            <Button
              onClick={() => purchaseMutation.mutate({ useFantiks, payWithFantiks: mustPayWithFantiks || payWithFantiks })}
              disabled={!canAfford || purchaseMutation.isPending}
              data-testid="button-dialog-confirm"
            >
              {purchaseMutation.isPending ? "Обработка..." : "Подтвердить покупку"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InstructionsSection({
  programId,
  instructions,
  isLoading,
}: {
  programId: string;
  instructions: ProgramInstruction[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Инструкции</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!instructions || instructions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Инструкции</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground" data-testid="text-no-instructions">
              Инструкции пока не добавлены
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const sortedInstructions = [...instructions].sort((a, b) => a.step - b.step);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Инструкции по использованию</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sortedInstructions.map((instruction) => (
          <div
            key={instruction.id}
            className="p-4 border border-border rounded-lg space-y-2 hover-elevate transition-all"
            data-testid={`instruction-${instruction.id}`}
          >
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                {instruction.step}
              </div>
              <h4 className="font-semibold text-lg" data-testid={`instruction-title-${instruction.id}`}>
                {instruction.title}
              </h4>
            </div>
            <p className="text-muted-foreground pl-10" data-testid={`instruction-content-${instruction.id}`}>
              {instruction.content}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ReviewsSection({
  programId,
  isPurchased,
}: {
  programId: string;
  isPurchased: boolean;
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [hoverRating, setHoverRating] = useState(0);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState(0);
  const [editComment, setEditComment] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: reviews, isLoading: reviewsLoading } = useQuery<ProgramReview[]>({
    queryKey: ["/api/programs", programId, "reviews"],
    queryFn: async () => {
      const res = await fetch(`/api/programs/${programId}/reviews`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch reviews");
      return res.json();
    },
  });

  const { data: ratingStats } = useQuery<{ averageRating: number; totalReviews: number }>({
    queryKey: ["/api/programs", programId, "rating"],
    queryFn: async () => {
      const res = await fetch(`/api/programs/${programId}/rating`, { credentials: "include" });
      if (!res.ok) return { averageRating: 0, totalReviews: 0 };
      return res.json();
    },
  });

  const { data: myReview } = useQuery<ProgramReview | null>({
    queryKey: ["/api/program-reviews/my", programId],
    queryFn: async () => {
      const res = await fetch(`/api/program-reviews/my/${programId}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!user,
  });

  const createReviewMutation = useMutation({
    mutationFn: async (data: { programId: string; rating: number; comment?: string }) => {
      await apiRequest("POST", `/api/program-reviews`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/programs", programId, "reviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/programs", programId, "rating"] });
      queryClient.invalidateQueries({ queryKey: ["/api/program-reviews/my", programId] });
      setRating(0);
      setComment("");
      toast({
        title: "Отзыв добавлен",
        description: "Ваш отзыв отправлен на модерацию",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось добавить отзыв",
        variant: "destructive",
      });
    },
  });

  const updateReviewMutation = useMutation({
    mutationFn: async ({ reviewId, rating, comment }: { reviewId: string; rating: number; comment?: string }) => {
      await apiRequest("PUT", `/api/program-reviews/${reviewId}`, { rating, comment });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/programs", programId, "reviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/programs", programId, "rating"] });
      queryClient.invalidateQueries({ queryKey: ["/api/program-reviews/my", programId] });
      setEditingReviewId(null);
      toast({
        title: "Отзыв обновлен",
        description: "Ваши изменения сохранены",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить отзыв",
        variant: "destructive",
      });
    },
  });

  const deleteReviewMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      await apiRequest("DELETE", `/api/program-reviews/${reviewId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/programs", programId, "reviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/programs", programId, "rating"] });
      queryClient.invalidateQueries({ queryKey: ["/api/program-reviews/my", programId] });
      toast({
        title: "Отзыв удален",
        description: "Ваш отзыв был успешно удален",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось удалить отзыв",
        variant: "destructive",
      });
    },
  });

  const voteReviewMutation = useMutation({
    mutationFn: async ({ reviewId, voteType }: { reviewId: string; voteType: 'like' | 'dislike' }) => {
      await apiRequest("POST", `/api/program-reviews/${reviewId}/vote`, { voteType });
    },
    onSuccess: (_, { reviewId }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/program-reviews", reviewId, "votes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/program-reviews", reviewId, "user-vote"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось проголосовать",
        variant: "destructive",
      });
    },
  });

  const unvoteReviewMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      await apiRequest("DELETE", `/api/program-reviews/${reviewId}/vote`, {});
    },
    onSuccess: (_, reviewId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/program-reviews", reviewId, "votes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/program-reviews", reviewId, "user-vote"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось отменить голос",
        variant: "destructive",
      });
    },
  });

  const handleSubmitReview = () => {
    if (rating === 0) {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, поставьте оценку",
        variant: "destructive",
      });
      return;
    }

    createReviewMutation.mutate({
      programId,
      rating,
      comment: comment.trim() || undefined,
    });
  };

  const handleEditReview = (review: ProgramReview) => {
    setEditingReviewId(review.id);
    setEditRating(review.rating);
    setEditComment(review.comment || "");
  };

  const handleCancelEdit = () => {
    setEditingReviewId(null);
    setEditRating(0);
    setEditComment("");
  };

  const handleSaveEdit = (reviewId: string) => {
    if (editRating === 0) {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, поставьте оценку",
        variant: "destructive",
      });
      return;
    }

    updateReviewMutation.mutate({
      reviewId,
      rating: editRating,
      comment: editComment.trim() || undefined,
    });
  };

  const handleDeleteReview = (reviewId: string) => {
    if (confirm("Вы уверены, что хотите удалить свой отзыв?")) {
      deleteReviewMutation.mutate(reviewId);
    }
  };

  const StarRating = ({
    value,
    onHover,
    onClick,
    interactive = true,
  }: {
    value: number;
    onHover?: (rating: number) => void;
    onClick?: (rating: number) => void;
    interactive?: boolean;
  }) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-6 w-6 ${
              star <= value
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground"
            } ${interactive ? "cursor-pointer hover:scale-110 transition-transform" : ""}`}
            onMouseEnter={() => interactive && onHover?.(star)}
            onMouseLeave={() => interactive && onHover?.(0)}
            onClick={() => interactive && onClick?.(star)}
            data-testid={`star-${star}`}
          />
        ))}
      </div>
    );
  };

  const ReviewItem = ({ review }: { review: ProgramReview }) => {
    const isOwnReview = user?.id === review.userId;
    const isEditing = editingReviewId === review.id;
    const [editHoverRating, setEditHoverRating] = useState(0);

    const { data: voteCounts } = useQuery<{ likes: number; dislikes: number }>({
      queryKey: ["/api/program-reviews", review.id, "votes"],
      queryFn: async () => {
        const res = await fetch(`/api/program-reviews/${review.id}/votes`, { credentials: "include" });
        if (!res.ok) return { likes: 0, dislikes: 0 };
        return res.json();
      },
    });

    const { data: userVote } = useQuery<{ voteType: 'like' | 'dislike' } | null>({
      queryKey: ["/api/program-reviews", review.id, "user-vote"],
      queryFn: async () => {
        const res = await fetch(`/api/program-reviews/${review.id}/user-vote`, { credentials: "include" });
        if (!res.ok) return null;
        return res.json();
      },
      enabled: !!user && !isOwnReview,
    });

    const handleVote = (voteType: 'like' | 'dislike') => {
      if (!user) {
        toast({
          title: "Требуется авторизация",
          description: "Войдите, чтобы голосовать",
          variant: "destructive",
        });
        return;
      }

      if (userVote?.voteType === voteType) {
        unvoteReviewMutation.mutate(review.id);
      } else {
        voteReviewMutation.mutate({ reviewId: review.id, voteType });
      }
    };

    return (
      <div
        key={review.id}
        className="p-4 border border-border rounded-lg space-y-3 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5 hover-elevate transition-all"
        data-testid={`review-${review.id}`}
      >
        <div className="flex items-start gap-3">
          <Avatar className="border-2 border-purple-500/30" data-testid={`avatar-reviewer-${review.id}`}>
            <AvatarImage src={review.user.profileImageUrl || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-purple-500/20 to-pink-500/20">
              {review.user.firstName?.[0] || "U"}{review.user.lastName?.[0] || ""}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium" data-testid={`text-review-author-${review.id}`}>
                  {review.user.firstName} {review.user.lastName}
                </p>
                {review.status === "pending" && (
                  <Badge variant="outline" className="text-xs" data-testid={`badge-pending-${review.id}`}>
                    <AlertCircle className="h-3 w-3 mr-1" />
                    На модерации
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground" data-testid={`text-review-date-${review.id}`}>
                {review.createdAt ? new Date(review.createdAt).toLocaleDateString("ru-RU") : ""}
              </p>
            </div>

            {isEditing ? (
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block" data-testid={`label-edit-rating-${review.id}`}>Ваша оценка</label>
                  <StarRating
                    value={editHoverRating || editRating}
                    onHover={setEditHoverRating}
                    onClick={setEditRating}
                  />
                </div>
                <Textarea
                  placeholder="Ваш комментарий..."
                  value={editComment}
                  onChange={(e) => setEditComment(e.target.value)}
                  rows={4}
                  data-testid={`textarea-edit-comment-${review.id}`}
                />
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleSaveEdit(review.id)}
                    disabled={updateReviewMutation.isPending || editRating === 0}
                    data-testid={`button-save-edit-${review.id}`}
                  >
                    {updateReviewMutation.isPending ? "Сохранение..." : "Сохранить"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancelEdit}
                    data-testid={`button-cancel-edit-${review.id}`}
                  >
                    Отмена
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <StarRating value={review.rating} interactive={false} />
                {review.comment && (
                  <p className="text-sm text-muted-foreground" data-testid={`text-review-comment-${review.id}`}>
                    {review.comment}
                  </p>
                )}
              </>
            )}

            {/* Moderator Comment */}
            {review.moderatorComment && (
              <div className="mt-3 p-3 border border-purple-500/30 rounded-lg bg-purple-500/5" data-testid={`moderator-comment-${review.id}`}>
                <Badge variant="outline" className="text-xs border-purple-500/30 bg-purple-500/5 text-purple-600 dark:text-purple-400 mb-2">
                  Комментарий модератора
                </Badge>
                <p className="text-sm text-muted-foreground">{review.moderatorComment}</p>
              </div>
            )}
          </div>
        </div>

        {!isEditing && (
          <div className="flex items-center justify-between pt-3 border-t border-border/50">
            {/* Vote Buttons */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleVote('like')}
                disabled={isOwnReview}
                className={userVote?.voteType === 'like' ? 'text-green-500' : ''}
                data-testid={`button-like-${review.id}`}
              >
                <ThumbsUp className="h-4 w-4 mr-1" />
                {voteCounts?.likes || 0}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleVote('dislike')}
                disabled={isOwnReview}
                className={userVote?.voteType === 'dislike' ? 'text-red-500' : ''}
                data-testid={`button-dislike-${review.id}`}
              >
                <ThumbsDown className="h-4 w-4 mr-1" />
                {voteCounts?.dislikes || 0}
              </Button>
            </div>

            {/* Edit/Delete Buttons */}
            {isOwnReview && (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditReview(review)}
                  data-testid={`button-edit-review-${review.id}`}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteReview(review.id)}
                  data-testid={`button-delete-review-${review.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const approvedReviews = reviews?.filter(r => r.status === "approved") || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-6 w-6" />
          Отзывы
          {ratingStats && ratingStats.totalReviews > 0 && (
            <span className="text-sm font-normal text-muted-foreground" data-testid="text-rating-stats">
              ({ratingStats.averageRating.toFixed(1)} / 5.0 • {ratingStats.totalReviews} {ratingStats.totalReviews === 1 ? "отзыв" : "отзывов"})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Create Review Form */}
        {isPurchased && !myReview && user && (
          <div className="p-4 border border-border rounded-lg space-y-4 bg-muted/30">
            <h4 className="font-semibold" data-testid="text-new-review-heading">Оставить отзыв</h4>
            <div>
              <label className="text-sm text-muted-foreground mb-2 block" data-testid="label-new-rating">Ваша оценка</label>
              <StarRating
                value={hoverRating || rating}
                onHover={setHoverRating}
                onClick={setRating}
              />
            </div>
            <Textarea
              placeholder="Ваш комментарий (необязательно)..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              data-testid="textarea-new-comment"
            />
            <Button
              onClick={handleSubmitReview}
              disabled={createReviewMutation.isPending || rating === 0}
              data-testid="button-submit-review"
            >
              {createReviewMutation.isPending ? "Отправка..." : "Отправить отзыв"}
            </Button>
          </div>
        )}

        {!isPurchased && user && (
          <div className="p-4 border border-border rounded-lg bg-muted/30 text-center">
            <p className="text-muted-foreground" data-testid="text-purchase-required">
              Приобретите или скачайте программу, чтобы оставить отзыв
            </p>
          </div>
        )}

        {/* Reviews List */}
        <div className="space-y-4">
          {reviewsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : approvedReviews.length > 0 ? (
            approvedReviews.map((review) => <ReviewItem key={review.id} review={review} />)
          ) : (
            <div className="text-center py-8">
              <Star className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground" data-testid="text-no-reviews">
                Отзывов пока нет. Будьте первым!
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
