import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Bell, BellOff, Check, Trash2, ShoppingBag, Gift, Crosshair, Sparkles, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { Link } from "wouter";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Notification {
  id: string;
  userId: string;
  type: 'purchase_course' | 'purchase_package' | 'purchase_vip' | 'sniper_approved';
  title: string;
  message: string;
  isRead: boolean;
  relatedId: string | null;
  relatedType: string | null;
  createdAt: string;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [deleteNotificationId, setDeleteNotificationId] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [allNotifications, setAllNotifications] = useState<Notification[]>([]);
  const ITEMS_PER_PAGE = 10;

  // Fetch notifications with pagination
  const { data: notificationsData, isLoading } = useQuery<Notification[]>({
    queryKey: ['/api/notifications', offset],
    queryFn: async () => {
      const response = await fetch(`/api/notifications?limit=${ITEMS_PER_PAGE}&offset=${offset}`);
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json();
    }
  });

  // Accumulate notifications when new data arrives
  useEffect(() => {
    if (notificationsData && notificationsData.length > 0) {
      if (offset === 0) {
        // First page - replace all
        setAllNotifications(notificationsData);
      } else {
        // Subsequent pages - deduplicate and append new items
        setAllNotifications(prev => {
          const existingIds = new Set(prev.map(n => n.id));
          const newItems = notificationsData.filter(n => !existingIds.has(n.id));
          return [...prev, ...newItems];
        });
      }
    }
  }, [notificationsData, offset]);

  const notifications = allNotifications;
  const hasMore = notificationsData && notificationsData.length >= ITEMS_PER_PAGE;

  const handleLoadMore = () => {
    setOffset(prev => prev + ITEMS_PER_PAGE);
  };


  // Mark notification as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      return await apiRequest('PATCH', `/api/notifications/${notificationId}/read`);
    },
    onSuccess: (_, notificationId) => {
      // Optimistically update local state
      setAllNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: "Не удалось пометить уведомление как прочитанное",
        variant: "destructive",
      });
    },
  });

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      return await apiRequest('DELETE', `/api/notifications/${notificationId}`);
    },
    onSuccess: (_, notificationId) => {
      // Optimistically update local state
      setAllNotifications(prev => prev.filter(n => n.id !== notificationId));
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
      toast({
        title: "Уведомление удалено",
        description: "Уведомление успешно удалено",
      });
      setDeleteNotificationId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить уведомление",
        variant: "destructive",
      });
    },
  });

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'purchase_course':
        return <ShoppingBag className="h-5 w-5 text-blue-500" />;
      case 'purchase_package':
        return <Gift className="h-5 w-5 text-purple-500" />;
      case 'purchase_vip':
        return <Sparkles className="h-5 w-5 text-yellow-500" />;
      case 'sniper_approved':
        return <Crosshair className="h-5 w-5 text-green-500" />;
      default:
        return <Bell className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getNotificationLink = (notification: Notification) => {
    if (!notification.relatedId || !notification.relatedType) return null;

    switch (notification.relatedType) {
      case 'course':
        return `/library/${notification.relatedId}`;
      case 'package':
        return `/package/${notification.relatedId}`;
      case 'course_request':
        return `/sniper`;
      default:
        return null;
    }
  };

  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;
  const readNotifications = notifications?.filter(n => n.isRead) || [];
  const unreadNotifications = notifications?.filter(n => !n.isRead) || [];

  // Handle scroll to load more

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 flex flex-col overflow-hidden">
        <div className="max-w-4xl mx-auto w-full flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3" data-testid="heading-notifications">
                <Bell className="h-8 w-8 text-primary" />
                Уведомления
              </h1>
              <p className="text-muted-foreground mt-1">
                {unreadCount > 0 ? `У вас ${unreadCount} непрочитанных уведомлений` : 'Все уведомления прочитаны'}
              </p>
            </div>
          </div>

          {/* Scrollable content area */}
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6">
              {/* Empty State */}
              {!isLoading && (!notifications || notifications.length === 0) && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <BellOff className="h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Нет уведомлений</h3>
                    <p className="text-muted-foreground text-center">
                      У вас пока нет уведомлений. Они будут появляться здесь при покупках и других важных событиях.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Unread Notifications */}
              {unreadNotifications.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    Непрочитанные
                    <Badge variant="destructive" className="rounded-full">
                      {unreadNotifications.length}
                    </Badge>
                  </h2>
              {unreadNotifications.map((notification) => {
                const link = getNotificationLink(notification);
                return (
                  <Card 
                    key={notification.id} 
                    className="border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
                    data-testid={`notification-unread-${notification.id}`}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="mt-1">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg force-wrap">
                              {notification.title}
                            </CardTitle>
                            <CardDescription className="mt-1 force-wrap">
                              {notification.message}
                            </CardDescription>
                            <p className="text-xs text-muted-foreground mt-2">
                              {formatDistanceToNow(new Date(notification.createdAt), { 
                                addSuffix: true,
                                locale: ru 
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {link && (
                            <Link href={link}>
                              <Button 
                                variant="outline" 
                                size="sm"
                                data-testid={`button-view-${notification.id}`}
                              >
                                Перейти
                              </Button>
                            </Link>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsReadMutation.mutate(notification.id)}
                            disabled={markAsReadMutation.isPending}
                            data-testid={`button-mark-read-${notification.id}`}
                            title="Пометить как прочитанное"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteNotificationId(notification.id)}
                            data-testid={`button-delete-${notification.id}`}
                            title="Удалить"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Read Notifications */}
          {readNotifications.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-muted-foreground">
                Прочитанные
              </h2>
              {readNotifications.map((notification) => {
                const link = getNotificationLink(notification);
                return (
                  <Card 
                    key={notification.id}
                    className="opacity-60 hover:opacity-100 transition-opacity"
                    data-testid={`notification-read-${notification.id}`}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="mt-1">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg force-wrap">
                              {notification.title}
                            </CardTitle>
                            <CardDescription className="mt-1 force-wrap">
                              {notification.message}
                            </CardDescription>
                            <p className="text-xs text-muted-foreground mt-2">
                              {formatDistanceToNow(new Date(notification.createdAt), { 
                                addSuffix: true,
                                locale: ru 
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {link && (
                            <Link href={link}>
                              <Button 
                                variant="outline" 
                                size="sm"
                                data-testid={`button-view-${notification.id}`}
                              >
                                Перейти
                              </Button>
                            </Link>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteNotificationId(notification.id)}
                            data-testid={`button-delete-${notification.id}`}
                            title="Удалить"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          )}

              {/* Loading State */}
              {isLoading && offset === 0 && (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="animate-pulse">
                      <CardHeader>
                        <div className="h-6 bg-muted rounded w-1/3 mb-2" />
                        <div className="h-4 bg-muted rounded w-2/3" />
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              )}

              {/* Load More Button */}
              {hasMore && !isLoading && (
                <div className="flex justify-center py-6">
                  <Button 
                    onClick={handleLoadMore}
                    variant="outline"
                    data-testid="button-load-more"
                  >
                    Загрузить ещё
                  </Button>
                </div>
              )}

              {/* Loading more indicator */}
              {isLoading && offset > 0 && (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteNotificationId} onOpenChange={() => setDeleteNotificationId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить уведомление?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Уведомление будет удалено навсегда.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteNotificationId) {
                  deleteNotificationMutation.mutate(deleteNotificationId);
                }
              }}
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
