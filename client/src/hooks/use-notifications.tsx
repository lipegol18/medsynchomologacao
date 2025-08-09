import { useState, useEffect, useCallback } from "react";
import { 
  useQuery, 
  useMutation, 
  useQueryClient 
} from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export type Notification = {
  id: number;
  userId: number;
  message: string;
  type: "info" | "warning" | "success";
  read: boolean;
  link?: string;
  entityType?: string;
  entityId?: number;
  createdAt: string;
  updatedAt: string;
};

export const useNotifications = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  // Fetch notifications
  const { 
    data: notifications = [], 
    isLoading,
    error,
    refetch: refetchNotifications
  } = useQuery({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      if (!user) return [];
      try {
        const response = await fetch("/api/notifications", {
          method: "GET",
          headers: { "Content-Type": "application/json" }
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Error fetching notifications:", error);
        return [];
      }
    },
    enabled: !!user,
  });

  // Get unread count
  const { 
    data: unreadCountData,
    refetch: refetchUnreadCount
  } = useQuery({
    queryKey: ["/api/notifications/unread-count"],
    queryFn: async () => {
      if (!user) return { count: 0 };
      try {
        const response = await fetch("/api/notifications/unread-count", {
          method: "GET",
          headers: { "Content-Type": "application/json" }
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return { count: data?.count || 0 };
      } catch (error) {
        console.error("Error fetching unread count:", error);
        return { count: 0 };
      }
    },
    enabled: !!user,
    refetchInterval: 60000, // Recarregar a cada minuto
  });

  const unreadCount = unreadCountData?.count || 0;

  // Mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const res = await apiRequest("PATCH", `/api/notifications/${notificationId}/read`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: "Não foi possível marcar a notificação como lida",
        variant: "destructive",
      });
    },
  });

  // Mark all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/notifications/mark-all-read");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      toast({
        title: "Sucesso",
        description: "Todas as notificações foram marcadas como lidas",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: "Não foi possível marcar todas as notificações como lidas",
        variant: "destructive",
      });
    },
  });

  // Delete notification
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      await apiRequest("DELETE", `/api/notifications/${notificationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: "Não foi possível excluir a notificação",
        variant: "destructive",
      });
    },
  });

  // Toggle notification panel
  const toggleNotifications = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const closeNotifications = useCallback(() => {
    setIsOpen(false);
  }, []);

  const markAsRead = useCallback((id: number) => {
    markAsReadMutation.mutate(id);
  }, [markAsReadMutation]);

  const markAllAsRead = useCallback(() => {
    markAllAsReadMutation.mutate();
  }, [markAllAsReadMutation]);

  const deleteNotification = useCallback((id: number) => {
    deleteNotificationMutation.mutate(id);
  }, [deleteNotificationMutation]);

  return {
    notifications: Array.isArray(notifications) ? notifications : [],
    unreadCount,
    isOpen,
    isLoading,
    error,
    toggleNotifications,
    closeNotifications,
    markAsRead,
    markAllAsRead, 
    deleteNotification,
    refetchNotifications,
    refetchUnreadCount
  };
};