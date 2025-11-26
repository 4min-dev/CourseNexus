import { useState, useRef, useEffect } from "react";
import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ThumbsUp, ThumbsDown, Target, Send, Trash2, Clock, TrendingUp, CheckCircle2, XCircle, Crosshair } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import sniperImage from '@assets/generated_images/Influencer_in_sniper_crosshair_2bdcbb43.png';
import { AwardIcon } from "@/components/award-icon";

interface CourseRequest {
  id: string;
  userId: string;
  title: string;
  description: string;
  isApproved: boolean;
  moderatedBy: string | null;
  moderatedAt: string | null;
  adminComment: string | null;
  createdAt: string;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    selectedAward: string | null;
  };
  totalVotes: number;
  upvotes: number;
  downvotes: number;
}

export default function SniperPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deleteRequestId, setDeleteRequestId] = useState<string | null>(null);
  const [editingComments, setEditingComments] = useState<Record<string, string>>({});
  const [isEditingComment, setIsEditingComment] = useState<Record<string, boolean>>({});

  const { 
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading 
  } = useInfiniteQuery<CourseRequest[]>({
    queryKey: ['/api/course-requests'],
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages, lastPageParam) => {
      if (!lastPage || !Array.isArray(lastPage) || lastPage.length < 10) {
        return undefined;
      }
      return (lastPageParam as number) + 10;
    },
    queryFn: async ({ pageParam = 0 }) => {
      const response = await fetch(`/api/course-requests?limit=10&offset=${pageParam}`);
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json();
    }
  });

  const { data: allAwards } = useQuery({
    queryKey: ['/api/awards'],
  });

  const requests = data?.pages.flat() ?? [];
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const createRequestMutation = useMutation({
    mutationFn: async (data: { title: string; description: string }) => {
      return await apiRequest('POST', '/api/course-requests', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/course-requests'] });
      toast({
        title: "Заявка создана",
        description: "Ваша заявка на курс успешно добавлена!",
      });
      setTitle("");
      setDescription("");
    },
    onError: (error: any) => {
      const errorData = error?.body;
      
      if (error?.status === 429) {
        const timeUntilReset = errorData?.timeUntilReset || 30;
        toast({
          title: "Превышен лимит запросов",
          description: `Вы можете создать только 2 запроса в течение 30 минут. Попробуйте снова через ${timeUntilReset} минут.`,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Ошибка",
        description: error.message || "Не удалось создать заявку",
        variant: "destructive",
      });
    },
  });

  const deleteRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      return await apiRequest('DELETE', `/api/course-requests/${requestId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/course-requests'] });
      toast({
        title: "Заявка удалена",
        description: "Заявка успешно удалена",
      });
      setDeleteRequestId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось удалить заявку",
        variant: "destructive",
      });
    },
  });

  const voteMutation = useMutation({
    mutationFn: async ({ requestId, vote }: { requestId: string; vote: number }) => {
      return await apiRequest('POST', `/api/course-requests/${requestId}/vote`, { vote });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/course-requests'] });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось проголосовать",
        variant: "destructive",
      });
    },
  });

  const moderateMutation = useMutation({
    mutationFn: async ({ requestId, approve }: { requestId: string; approve: boolean }) => {
      return await apiRequest('POST', `/api/course-requests/${requestId}/moderate`, { approve });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/course-requests'] });
      toast({
        title: variables.approve ? "Заявка одобрена" : "Заявка отклонена",
        description: variables.approve 
          ? "Заявка теперь видна всем пользователям" 
          : "Заявка была отклонена и удалена",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось модерировать заявку",
        variant: "destructive",
      });
    },
  });

  const updateCommentMutation = useMutation({
    mutationFn: async ({ requestId, adminComment }: { requestId: string; adminComment: string }) => {
      return await apiRequest('PATCH', `/api/course-requests/${requestId}/comment`, { adminComment });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/course-requests'] });
      setEditingComments((prev) => {
        const newState = { ...prev };
        delete newState[variables.requestId];
        return newState;
      });
      setIsEditingComment((prev) => {
        const newState = { ...prev };
        delete newState[variables.requestId];
        return newState;
      });
      toast({
        title: "Комментарий сохранен",
        description: "Комментарий админа успешно обновлен",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить комментарий",
        variant: "destructive",
      });
    },
  });

  const handleCreateRequest = () => {
    if (!title.trim() || !description.trim()) {
      toast({
        title: "Ошибка",
        description: "Заполните все поля",
        variant: "destructive",
      });
      return;
    }

    if (title.length < 3 || title.length > 200) {
      toast({
        title: "Ошибка",
        description: "Название должно быть от 3 до 200 символов",
        variant: "destructive",
      });
      return;
    }

    if (description.length < 10 || description.length > 2000) {
      toast({
        title: "Ошибка",
        description: "Описание должно быть от 10 до 2000 символов",
        variant: "destructive",
      });
      return;
    }

    createRequestMutation.mutate({ title, description });
  };

  const handleVote = (requestId: string, vote: number) => {
    if (!user) {
      toast({
        title: "Требуется авторизация",
        description: "Для голосования необходимо войти в систему",
        variant: "destructive",
      });
      return;
    }
    voteMutation.mutate({ requestId, vote });
  };

  const handleModerate = (requestId: string, approve: boolean) => {
    moderateMutation.mutate({ requestId, approve });
  };

  const handleDelete = (requestId: string) => {
    setDeleteRequestId(requestId);
  };

  const confirmDelete = () => {
    if (deleteRequestId) {
      deleteRequestMutation.mutate(deleteRequestId);
    }
  };

  const getUserInitials = (request: CourseRequest) => {
    if (request.user.firstName || request.user.lastName) {
      const firstName = request.user.firstName || '';
      const lastName = request.user.lastName || '';
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'UN';
    }
    return 'UN';
  };

  const getUserName = (request: CourseRequest) => {
    const firstName = request.user.firstName || '';
    const lastName = request.user.lastName || '';
    if (firstName || lastName) {
      return `${firstName} ${lastName}`.trim();
    }
    return 'Аноним';
  };

  useEffect(() => {
    if (!loadMoreRef.current || !hasNextPage || isFetchingNextPage) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );
    
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const sortedRequests = [...requests].sort((a, b) => b.totalVotes - a.totalVotes);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Header />
      
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="relative overflow-hidden rounded-xl mb-12 bg-gradient-to-br from-purple-600/20 via-pink-600/20 to-purple-600/20 border-2 border-primary/30">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-pink-600/10" />
          <div className="relative grid md:grid-cols-2 gap-8 p-8 md:p-12">
            <div className="flex flex-col justify-center space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/30 w-fit">
                <Crosshair className="h-5 w-5 text-primary" />
                <span className="text-sm font-semibold text-primary">Режим охоты активирован</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl font-bold leading-tight" data-testid="text-hero-title">
                Мы сольём то, что вам нужно!
              </h1>
              
              <p className="text-lg text-muted-foreground leading-relaxed" data-testid="text-hero-description">
                Увидели курс инфоблогера, который хотите изучить? Не можете найти нужный материал? 
                Просто сообщите нам - и мы возьмём его на прицел! 🎯
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-lg bg-primary/20 mt-0.5">
                    <Target className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">Предложите курс</p>
                    <p className="text-sm text-muted-foreground">Укажите автора и название курса, который хотите увидеть</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-lg bg-primary/20 mt-0.5">
                    <ThumbsUp className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">Голосуйте за идеи</p>
                    <p className="text-sm text-muted-foreground">Поддержите интересные предложения других пользователей</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-lg bg-primary/20 mt-0.5">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">Получите доступ</p>
                    <p className="text-sm text-muted-foreground">Популярные запросы попадают в наш каталог первыми</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-pink-500/30 blur-3xl opacity-50" />
                <img
                  src={sniperImage}
                  alt="Инфоблогер в прицеле"
                  className="relative rounded-xl shadow-2xl max-w-full h-auto"
                  data-testid="img-hero-sniper"
                />
              </div>
            </div>
          </div>
        </div>

        {user ? (
          <Card className="mb-8 border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Send className="h-6 w-6 text-primary" />
                Предложить новый курс
              </CardTitle>
              <CardDescription className="text-base">
                Расскажите нам, какой курс вы хотите увидеть на платформе
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-base font-semibold">Название курса / Автор</Label>
                  <Input
                    id="title"
                    placeholder='Например: "Курс по SMM от Игоря Манна" или "Продвижение в TikTok - Максим Спиридонов"'
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={200}
                    className="text-base h-11"
                    data-testid="input-request-title"
                  />
                  <p className="text-sm text-muted-foreground">
                    {title.length}/200 символов
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-base font-semibold">Подробное описание</Label>
                  <Textarea
                    id="description"
                    placeholder="Опишите подробно: что должно быть в курсе, какие темы он должен охватывать, почему этот курс важен для вас. Чем подробнее описание - тем выше шансы, что мы найдём этот курс!"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={2000}
                    rows={6}
                    className="text-base"
                    data-testid="input-request-description"
                  />
                  <p className="text-sm text-muted-foreground">
                    {description.length}/2000 символов
                  </p>
                </div>
                <Button
                  onClick={handleCreateRequest}
                  disabled={createRequestMutation.isPending}
                  size="lg"
                  className="w-full sm:w-auto"
                  data-testid="button-submit-request"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {createRequestMutation.isPending ? "Отправка..." : "Отправить предложение"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-8 border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="py-12">
              <div className="text-center space-y-4">
                <Target className="h-16 w-16 mx-auto text-primary/50" />
                <div className="space-y-2">
                  <p className="text-xl font-semibold">
                    Войдите, чтобы предлагать курсы
                  </p>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    После авторизации вы сможете предлагать курсы и голосовать за предложения других пользователей
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10">
            <TrendingUp className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-3xl font-bold">Предложения сообщества</h2>
            <p className="text-sm text-muted-foreground">Отсортировано по количеству голосов</p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-20 bg-muted rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : sortedRequests.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="py-20 text-center">
              <Target className="h-20 w-20 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-xl font-semibold text-muted-foreground mb-2">
                Пока нет предложений
              </p>
              <p className="text-muted-foreground">
                {user ? "Станьте первым, кто предложит курс!" : "Войдите, чтобы предложить первый курс!"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-5">
            {sortedRequests.map((request) => {
              const isPending = !request.isApproved;
              const showModeration = user?.isAdmin && isPending;
              const selectedAwardData = request.user.selectedAward && allAwards && Array.isArray(allAwards)
                ? allAwards.find((award: any) => award.imageUrl === request.user.selectedAward)
                : null;
              
              return (
                <Card 
                  key={request.id} 
                  className={`hover-elevate transition-all ${
                    isPending 
                      ? 'border-2 border-amber-500/50 bg-gradient-to-br from-amber-500/10 to-transparent' 
                      : 'border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent'
                  }`}
                  data-testid={`card-request-${request.id}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        {request.user.selectedAward ? (
                          <AwardIcon emoji={request.user.selectedAward} rarity={selectedAwardData?.rarity || 'common'} size={48} />
                        ) : (
                          <Avatar className="h-12 w-12 border-2 border-primary/20">
                            <AvatarFallback className="text-sm font-semibold bg-gradient-to-br from-primary/20 to-primary/10">
                              {getUserInitials(request)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-start gap-2 flex-wrap">
                            <CardTitle className="text-xl" data-testid={`text-request-title-${request.id}`}>
                              {request.title}
                            </CardTitle>
                            {isPending && user?.isAdmin && (
                              <Badge variant="secondary" className="bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 gap-1 shrink-0" data-testid={`badge-pending-${request.id}`}>
                                <Clock className="h-3 w-3" />
                                Ожидает проверки модератора
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                            <span className="font-medium" data-testid={`text-request-author-${request.id}`}>
                              {getUserName(request)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {formatDistanceToNow(new Date(request.createdAt), {
                                addSuffix: true,
                                locale: ru,
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <Badge 
                        variant={request.totalVotes > 0 ? "default" : request.totalVotes < 0 ? "destructive" : "secondary"}
                        className="text-2xl px-5 py-2 font-bold shrink-0 shadow-md"
                        data-testid={`badge-vote-score-${request.id}`}
                      >
                        {request.totalVotes > 0 ? '+' : ''}{request.totalVotes}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <CardDescription className="text-base leading-relaxed whitespace-pre-wrap" data-testid={`text-request-description-${request.id}`}>
                      {request.description}
                    </CardDescription>
                    
                    {(request.adminComment || user?.isAdmin) && (
                      <div className="pt-4 border-t space-y-3">
                        {user?.isAdmin ? (
                          <>
                            {request.adminComment && !isEditingComment[request.id] ? (
                              <div className="bg-purple-500/5 p-3 rounded-md border border-purple-500/20">
                                <div className="flex items-center justify-between mb-2">
                                  <Badge variant="outline" className="bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-400">
                                    Комментарий админа
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setEditingComments(prev => ({ ...prev, [request.id]: request.adminComment ?? '' }));
                                      setIsEditingComment(prev => ({ ...prev, [request.id]: true }));
                                    }}
                                    className="h-7 text-xs"
                                    data-testid={`button-edit-admin-comment-${request.id}`}
                                  >
                                    Редактировать
                                  </Button>
                                </div>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap" data-testid={`text-admin-comment-${request.id}`}>
                                  {request.adminComment}
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-400">
                                    Комментарий админа
                                  </Badge>
                                </div>
                                <Textarea
                                  value={editingComments[request.id] ?? request.adminComment ?? ''}
                                  onChange={(e) => setEditingComments(prev => ({ ...prev, [request.id]: e.target.value }))}
                                  placeholder="Добавьте комментарий к этому предложению..."
                                  className="min-h-[80px]"
                                  data-testid={`textarea-admin-comment-${request.id}`}
                                />
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      const comment = editingComments[request.id] ?? request.adminComment ?? '';
                                      updateCommentMutation.mutate({ requestId: request.id, adminComment: comment });
                                    }}
                                    disabled={updateCommentMutation.isPending}
                                    data-testid={`button-save-comment-${request.id}`}
                                  >
                                    {updateCommentMutation.isPending ? "Сохранение..." : "Сохранить комментарий"}
                                  </Button>
                                  {isEditingComment[request.id] && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setEditingComments(prev => {
                                          const newState = { ...prev };
                                          delete newState[request.id];
                                          return newState;
                                        });
                                        setIsEditingComment(prev => {
                                          const newState = { ...prev };
                                          delete newState[request.id];
                                          return newState;
                                        });
                                      }}
                                      data-testid={`button-cancel-comment-${request.id}`}
                                    >
                                      Отмена
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          request.adminComment && (
                            <div className="space-y-2">
                              <Badge variant="outline" className="bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-400">
                                Комментарий админа
                              </Badge>
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-purple-500/5 p-3 rounded-md border border-purple-500/20" data-testid={`text-admin-comment-${request.id}`}>
                                {request.adminComment}
                              </p>
                            </div>
                          )
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between pt-4 border-t gap-4 flex-wrap">
                      <div className="flex items-center gap-5 text-sm">
                        <span className="flex items-center gap-2 text-muted-foreground" data-testid={`text-upvotes-${request.id}`}>
                          <ThumbsUp className="h-4 w-4 text-green-600" />
                          <span className="font-semibold text-base">{request.upvotes}</span>
                        </span>
                        <span className="flex items-center gap-2 text-muted-foreground" data-testid={`text-downvotes-${request.id}`}>
                          <ThumbsDown className="h-4 w-4 text-red-600" />
                          <span className="font-semibold text-base">{request.downvotes}</span>
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-wrap">
                        {showModeration && (
                          <>
                            <Button
                              variant="default"
                              size="default"
                              onClick={() => handleModerate(request.id, true)}
                              disabled={moderateMutation.isPending}
                              className="bg-green-600 hover:bg-green-700 gap-2"
                              data-testid={`button-approve-${request.id}`}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              Одобрить
                            </Button>
                            <Button
                              variant="destructive"
                              size="default"
                              onClick={() => handleModerate(request.id, false)}
                              disabled={moderateMutation.isPending}
                              className="gap-2"
                              data-testid={`button-reject-${request.id}`}
                            >
                              <XCircle className="h-4 w-4" />
                              Отклонить
                            </Button>
                          </>
                        )}
                        
                        {user && (
                          <>
                            <Button
                              variant="outline"
                              size="default"
                              onClick={() => handleVote(request.id, 1)}
                              disabled={voteMutation.isPending}
                              className="gap-2 border-green-600/30 hover:bg-green-600/10"
                              data-testid={`button-upvote-${request.id}`}
                            >
                              <ThumbsUp className="h-4 w-4" />
                              За
                            </Button>
                            <Button
                              variant="outline"
                              size="default"
                              onClick={() => handleVote(request.id, -1)}
                              disabled={voteMutation.isPending}
                              className="gap-2 border-red-600/30 hover:bg-red-600/10"
                              data-testid={`button-downvote-${request.id}`}
                            >
                              <ThumbsDown className="h-4 w-4" />
                              Против
                            </Button>
                            
                            {(user.id === request.userId || user.isAdmin) && (
                              <Button
                                variant="destructive"
                                size="icon"
                                onClick={() => handleDelete(request.id)}
                                disabled={deleteRequestMutation.isPending}
                                data-testid={`button-delete-${request.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {hasNextPage && (
              <div ref={loadMoreRef} className="py-8 text-center" data-testid="div-load-more">
                {isFetchingNextPage && (
                  <div className="text-muted-foreground">Загрузка...</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteRequestId} onOpenChange={() => setDeleteRequestId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить заявку?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Заявка будет удалена навсегда.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
