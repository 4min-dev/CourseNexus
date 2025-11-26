import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { CheckCircle, XCircle, Star, Clock, ThumbsUp, ThumbsDown, MessageSquare } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ReviewWithUser {
  id: string;
  courseId: string;
  userId: string;
  rating: number;
  comment: string | null;
  status: string;
  createdAt: string;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
  };
  course: {
    id: string;
    title: string;
  };
}

interface CourseRequestWithUser {
  id: string;
  userId: string;
  title: string;
  description: string;
  isApproved: boolean;
  createdAt: string;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  };
  totalVotes: number;
  upvotes: number;
  downvotes: number;
}

interface ProgramReviewWithUser {
  id: string;
  programId: string;
  userId: string;
  rating: number;
  comment: string | null;
  status: string;
  createdAt: string;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
  };
  program: {
    id: string;
    title: string;
  };
}

export default function AdminModeration() {
  const { toast } = useToast();
  const [moderatingReview, setModeratingReview] = useState<ReviewWithUser | null>(null);
  const [moderationAction, setModerationAction] = useState<'approved' | 'rejected' | null>(null);
  const [moderationComment, setModerationComment] = useState("");

  const [moderatingProgramReview, setModeratingProgramReview] = useState<ProgramReviewWithUser | null>(null);
  const [programReviewAction, setProgramReviewAction] = useState<'approved' | 'rejected' | null>(null);
  const [programReviewComment, setProgramReviewComment] = useState("");

  const [moderatingRequest, setModeratingRequest] = useState<CourseRequestWithUser | null>(null);
  const [requestAction, setRequestAction] = useState<boolean | null>(null);

  const { data: pendingReviews, isLoading: reviewsLoading } = useQuery<ReviewWithUser[]>({
    queryKey: ["/api/admin/reviews/pending"],
    staleTime: 0,
    gcTime: 0,
  });

  const { data: pendingProgramReviews, isLoading: programReviewsLoading } = useQuery<ProgramReviewWithUser[]>({
    queryKey: ["/api/admin/program-reviews/pending"],
    staleTime: 0,
    gcTime: 0,
  });

  const { data: pendingRequests, isLoading: requestsLoading } = useQuery<CourseRequestWithUser[]>({
    queryKey: ["/api/admin/course-requests/pending"],
    staleTime: 0,
    gcTime: 0,
  });

  const moderateReviewMutation = useMutation({
    mutationFn: async ({ reviewId, status, comment }: { reviewId: string; status: 'approved' | 'rejected'; comment?: string }) => {
      await apiRequest("PATCH", `/api/admin/reviews/${reviewId}/moderate`, { status, comment });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reviews/pending"] });
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          return query.queryKey.some(
            (key) => typeof key === 'string' && (
              key === 'reviews' || 
              key === 'rating' ||
              key.includes('/reviews') || 
              key.includes('/rating')
            )
          );
        }
      });
      setModeratingReview(null);
      setModerationAction(null);
      setModerationComment("");
      toast({
        title: "Успешно",
        description: "Отзыв модерирован",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось модерировать отзыв",
        variant: "destructive",
      });
    },
  });

  const moderateProgramReviewMutation = useMutation({
    mutationFn: async ({ reviewId, status, comment }: { reviewId: string; status: 'approved' | 'rejected'; comment?: string }) => {
      await apiRequest("PATCH", `/api/admin/program-reviews/${reviewId}/moderate`, { status, comment });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/program-reviews/pending"] });
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          return query.queryKey.some(
            (key) => typeof key === 'string' && (
              key === 'program-reviews' || 
              key.includes('/program-reviews') ||
              key.includes('programs')
            )
          );
        }
      });
      setModeratingProgramReview(null);
      setProgramReviewAction(null);
      setProgramReviewComment("");
      toast({
        title: "Успешно",
        description: "Отзыв программы модерирован",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось модерировать отзыв программы",
        variant: "destructive",
      });
    },
  });

  const moderateRequestMutation = useMutation({
    mutationFn: async ({ requestId, approve }: { requestId: string; approve: boolean }) => {
      await apiRequest("POST", `/api/course-requests/${requestId}/moderate`, { approve });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/course-requests/pending"] });
      setModeratingRequest(null);
      setRequestAction(null);
      toast({
        title: "Успешно",
        description: "Запрос курса модерирован",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось модерировать запрос",
        variant: "destructive",
      });
    },
  });

  const handleModerateReview = (review: ReviewWithUser, action: 'approved' | 'rejected') => {
    if (action === 'approved') {
      // Одобрение без диалога
      moderateReviewMutation.mutate({
        reviewId: review.id,
        status: 'approved',
      });
    } else {
      // Отклонение с диалогом
      setModeratingReview(review);
      setModerationAction(action);
    }
  };

  const handleConfirmReviewModeration = () => {
    if (!moderatingReview || !moderationAction) return;

    moderateReviewMutation.mutate({
      reviewId: moderatingReview.id,
      status: moderationAction,
      comment: moderationComment.trim() || undefined,
    });
  };

  const handleModerateRequest = (request: CourseRequestWithUser, approve: boolean) => {
    if (approve) {
      // Одобрение без диалога
      moderateRequestMutation.mutate({
        requestId: request.id,
        approve: true,
      });
    } else {
      // Отклонение с диалогом
      setModeratingRequest(request);
      setRequestAction(approve);
    }
  };

  const handleModerateProgramReview = (review: ProgramReviewWithUser, action: 'approved' | 'rejected') => {
    if (action === 'approved') {
      moderateProgramReviewMutation.mutate({
        reviewId: review.id,
        status: 'approved',
      });
    } else {
      setModeratingProgramReview(review);
      setProgramReviewAction(action);
    }
  };

  const handleConfirmProgramReviewModeration = () => {
    if (!moderatingProgramReview || !programReviewAction) return;

    moderateProgramReviewMutation.mutate({
      reviewId: moderatingProgramReview.id,
      status: programReviewAction,
      comment: programReviewComment.trim() || undefined,
    });
  };

  const handleConfirmRequestModeration = () => {
    if (!moderatingRequest || requestAction === null) return;

    moderateRequestMutation.mutate({
      requestId: moderatingRequest.id,
      approve: requestAction,
    });
  };

  const StarRating = ({ value }: { value: number }) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= value
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Модерация</h1>
          <p className="text-muted-foreground">
            Просмотр и модерация отзывов курсов, программ и запросов курсов
          </p>
        </div>

        <Tabs defaultValue="reviews" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="reviews" data-testid="tab-reviews">
              Отзывы курсов {pendingReviews && pendingReviews.length > 0 && `(${pendingReviews.length})`}
            </TabsTrigger>
            <TabsTrigger value="program-reviews" data-testid="tab-program-reviews">
              Отзывы программ {pendingProgramReviews && pendingProgramReviews.length > 0 && `(${pendingProgramReviews.length})`}
            </TabsTrigger>
            <TabsTrigger value="requests" data-testid="tab-requests">
              Запросы курсов {pendingRequests && pendingRequests.length > 0 && `(${pendingRequests.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reviews" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Отзывы на модерации
                </CardTitle>
                <CardDescription>
                  {pendingReviews?.length || 0} отзывов ожидают модерации
                </CardDescription>
              </CardHeader>
              <CardContent>
                {reviewsLoading ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Загрузка...
                  </p>
                ) : pendingReviews && pendingReviews.length > 0 ? (
                  <div className="space-y-4">
                    {pendingReviews.map((review) => (
                      <Card key={review.id} data-testid={`review-pending-${review.id}`}>
                        <CardContent className="p-4">
                          <div className="space-y-4">
                            <div className="flex items-start gap-3">
                              <Avatar>
                                <AvatarImage src={review.user.profileImageUrl || undefined} />
                                <AvatarFallback>
                                  {review.user.firstName?.[0] || "U"}{review.user.lastName?.[0] || ""}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="space-y-1">
                                    <p className="font-medium">
                                      {review.user.firstName} {review.user.lastName}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      Курс: {review.course.title}
                                    </p>
                                  </div>
                                  <Badge variant="outline">
                                    <Clock className="h-3 w-3 mr-1" />
                                    На модерации
                                  </Badge>
                                </div>
                                <StarRating value={review.rating} />
                                {review.comment && (
                                  <p className="text-sm">{review.comment}</p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                  {new Date(review.createdAt).toLocaleString("ru-RU")}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex gap-2 pt-2 border-t">
                              <Button
                                size="sm"
                                onClick={() => handleModerateReview(review, 'approved')}
                                data-testid={`button-approve-${review.id}`}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Одобрить
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleModerateReview(review, 'rejected')}
                                data-testid={`button-reject-${review.id}`}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Отклонить
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Нет отзывов на модерации
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="program-reviews" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Отзывы программ на модерации
                </CardTitle>
                <CardDescription>
                  {pendingProgramReviews?.length || 0} отзывов ожидают модерации
                </CardDescription>
              </CardHeader>
              <CardContent>
                {programReviewsLoading ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Загрузка...
                  </p>
                ) : pendingProgramReviews && pendingProgramReviews.length > 0 ? (
                  <div className="space-y-4">
                    {pendingProgramReviews.map((review) => (
                      <Card key={review.id} data-testid={`program-review-pending-${review.id}`}>
                        <CardContent className="p-4">
                          <div className="space-y-4">
                            <div className="flex items-start gap-3">
                              <Avatar>
                                <AvatarImage src={review.user.profileImageUrl || undefined} />
                                <AvatarFallback>
                                  {review.user.firstName?.[0] || "U"}{review.user.lastName?.[0] || ""}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="space-y-1">
                                    <p className="font-medium">
                                      {review.user.firstName} {review.user.lastName}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      Программа: {review.program.title}
                                    </p>
                                  </div>
                                  <Badge variant="outline">
                                    <Clock className="h-3 w-3 mr-1" />
                                    На модерации
                                  </Badge>
                                </div>
                                <StarRating value={review.rating} />
                                {review.comment && (
                                  <p className="text-sm">{review.comment}</p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                  {new Date(review.createdAt).toLocaleString("ru-RU")}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex gap-2 pt-2 border-t">
                              <Button
                                size="sm"
                                onClick={() => handleModerateProgramReview(review, 'approved')}
                                data-testid={`button-approve-program-${review.id}`}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Одобрить
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleModerateProgramReview(review, 'rejected')}
                                data-testid={`button-reject-program-${review.id}`}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Отклонить
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Нет отзывов программ на модерации
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="requests" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Запросы курсов на модерации
                </CardTitle>
                <CardDescription>
                  {pendingRequests?.length || 0} запросов ожидают модерации
                </CardDescription>
              </CardHeader>
              <CardContent>
                {requestsLoading ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Загрузка...
                  </p>
                ) : pendingRequests && pendingRequests.length > 0 ? (
                  <div className="space-y-4">
                    {pendingRequests.map((request) => (
                      <Card key={request.id} data-testid={`request-pending-${request.id}`}>
                        <CardContent className="p-4">
                          <div className="space-y-4">
                            <div className="flex items-start gap-3">
                              <Avatar>
                                <AvatarFallback>
                                  {request.user.firstName?.[0] || "U"}{request.user.lastName?.[0] || ""}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="space-y-1">
                                    <p className="font-medium text-lg">
                                      {request.title}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      От: {request.user.firstName} {request.user.lastName}
                                    </p>
                                  </div>
                                  <Badge variant="outline">
                                    <Clock className="h-3 w-3 mr-1" />
                                    На модерации
                                  </Badge>
                                </div>
                                <p className="text-sm whitespace-pre-wrap">{request.description}</p>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <ThumbsUp className="h-3 w-3" />
                                    {request.upvotes}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <ThumbsDown className="h-3 w-3" />
                                    {request.downvotes}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="font-medium">Рейтинг:</span>
                                    {request.totalVotes > 0 ? `+${request.totalVotes}` : request.totalVotes}
                                  </div>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(request.createdAt).toLocaleString("ru-RU")}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex gap-2 pt-2 border-t">
                              <Button
                                size="sm"
                                onClick={() => handleModerateRequest(request, true)}
                                data-testid={`button-approve-request-${request.id}`}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Одобрить
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleModerateRequest(request, false)}
                                data-testid={`button-reject-request-${request.id}`}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Отклонить
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Нет запросов на модерации
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Review Moderation Dialog */}
      <Dialog open={!!moderatingReview} onOpenChange={() => {
        setModeratingReview(null);
        setModerationAction(null);
        setModerationComment("");
      }}>
        <DialogContent data-testid="dialog-moderate-review">
          <DialogHeader>
            <DialogTitle>
              {moderationAction === 'approved' ? 'Одобрить отзыв' : 'Отклонить отзыв'}
            </DialogTitle>
            <DialogDescription>
              {moderationAction === 'approved' 
                ? 'Отзыв будет опубликован и виден другим пользователям'
                : 'Отзыв будет скрыт. Укажите причину отклонения (опционально)'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Комментарий {moderationAction === 'rejected' && '(рекомендуется)'}</Label>
              <Textarea
                placeholder="Причина модерации..."
                value={moderationComment}
                onChange={(e) => setModerationComment(e.target.value)}
                rows={3}
                data-testid="textarea-moderation-comment"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setModeratingReview(null);
                setModerationAction(null);
                setModerationComment("");
              }}
              data-testid="button-cancel-moderation"
            >
              Отмена
            </Button>
            <Button
              onClick={handleConfirmReviewModeration}
              disabled={moderateReviewMutation.isPending}
              variant={moderationAction === 'approved' ? 'default' : 'destructive'}
              data-testid="button-confirm-moderation"
            >
              {moderateReviewMutation.isPending ? "Обработка..." : "Подтвердить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Program Review Moderation Dialog */}
      <Dialog open={!!moderatingProgramReview} onOpenChange={() => {
        setModeratingProgramReview(null);
        setProgramReviewAction(null);
        setProgramReviewComment("");
      }}>
        <DialogContent data-testid="dialog-moderate-program-review">
          <DialogHeader>
            <DialogTitle>
              {programReviewAction === 'approved' ? 'Одобрить отзыв программы' : 'Отклонить отзыв программы'}
            </DialogTitle>
            <DialogDescription>
              {programReviewAction === 'approved' 
                ? 'Отзыв будет опубликован и виден другим пользователям'
                : 'Отзыв будет скрыт. Укажите причину отклонения (опционально)'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Комментарий {programReviewAction === 'rejected' && '(рекомендуется)'}</Label>
              <Textarea
                placeholder="Причина модерации..."
                value={programReviewComment}
                onChange={(e) => setProgramReviewComment(e.target.value)}
                rows={3}
                data-testid="textarea-program-moderation-comment"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setModeratingProgramReview(null);
                setProgramReviewAction(null);
                setProgramReviewComment("");
              }}
              data-testid="button-cancel-program-moderation"
            >
              Отмена
            </Button>
            <Button
              onClick={handleConfirmProgramReviewModeration}
              disabled={moderateProgramReviewMutation.isPending}
              variant={programReviewAction === 'approved' ? 'default' : 'destructive'}
              data-testid="button-confirm-program-moderation"
            >
              {moderateProgramReviewMutation.isPending ? "Обработка..." : "Подтвердить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Course Request Moderation Dialog */}
      <Dialog open={!!moderatingRequest} onOpenChange={() => {
        setModeratingRequest(null);
        setRequestAction(null);
      }}>
        <DialogContent data-testid="dialog-moderate-request">
          <DialogHeader>
            <DialogTitle>
              {requestAction ? 'Одобрить запрос курса' : 'Отклонить запрос курса'}
            </DialogTitle>
            <DialogDescription>
              {requestAction 
                ? 'Запрос будет одобрен и другие пользователи смогут голосовать за него'
                : 'Запрос будет отклонен и удален из списка'}
            </DialogDescription>
          </DialogHeader>
          {moderatingRequest && (
            <div className="space-y-2">
              <div>
                <p className="text-sm font-medium">Название курса:</p>
                <p className="text-sm text-muted-foreground">{moderatingRequest.title}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Описание:</p>
                <p className="text-sm text-muted-foreground">{moderatingRequest.description}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setModeratingRequest(null);
                setRequestAction(null);
              }}
              data-testid="button-cancel-request-moderation"
            >
              Отмена
            </Button>
            <Button
              onClick={handleConfirmRequestModeration}
              disabled={moderateRequestMutation.isPending}
              variant={requestAction ? 'default' : 'destructive'}
              data-testid="button-confirm-request-moderation"
            >
              {moderateRequestMutation.isPending ? "Обработка..." : "Подтвердить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
