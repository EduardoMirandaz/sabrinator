import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '@/services/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell, Check, CheckCheck, ChevronRight, Undo2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Notification } from '@/types';

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'delta_detected':
      return <AlertCircle className="w-5 h-5 text-secondary" />;
    case 'user_confirmed':
      return <Check className="w-5 h-5 text-green-600" />;
    case 'user_reversed':
      return <Undo2 className="w-5 h-5 text-secondary" />;
    case 'reminder':
      return <Bell className="w-5 h-5 text-muted-foreground" />;
    default:
      return <Bell className="w-5 h-5" />;
  }
};

const Notifications: React.FC = () => {
  const queryClient = useQueryClient();
  
  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
  });

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const unreadCount = notifications?.filter(n => !n.read).length || 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifications</h1>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
          >
            <CheckCheck className="w-4 h-4 mr-2" />
            Mark all read
          </Button>
        )}
      </div>

      {notifications && notifications.length > 0 ? (
        <div className="space-y-3">
          {notifications.map((notification, index) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link
                to={notification.eventId ? `/event/${notification.eventId}` : '#'}
                onClick={() => {
                  if (!notification.read) {
                    markReadMutation.mutate(notification.id);
                  }
                }}
              >
                <Card className={cn(
                  'transition-all hover:shadow-card',
                  !notification.read && 'border-l-4 border-l-secondary bg-secondary/5'
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'font-medium text-sm',
                          !notification.read && 'text-foreground',
                          notification.read && 'text-muted-foreground'
                        )}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground/60 mt-2">
                          {new Date(notification.timestamp).toLocaleString('en-US', {
                            timeZone: 'America/Sao_Paulo',
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </p>
                      </div>
                      {notification.eventId && (
                        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      ) : (
        <Card className="gradient-card">
          <CardContent className="p-8 text-center">
            <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No notifications yet</p>
            <p className="text-xs text-muted-foreground/60 mt-2">
              You'll be notified when eggs are taken
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Notifications;
