import api from './api';

export enum NotificationType {
  DUE_SOON = 'due_soon',
  OVERDUE = 'overdue',
  ASSIGNED = 'assigned',
  COMMENTED = 'commented',
  REPEAT_CREATED = 'repeat_created',
}

export interface Notification {
  id: string;
  userId: string;
  taskId: string | null;
  type: NotificationType;
  message: string;
  read: boolean;
  createdAt: string;
  task?: {
    id: string;
    title: string;
  };
}

export const notificationService = {
  getAll: async (unreadOnly?: boolean): Promise<Notification[]> => {
    const response = await api.get<Notification[]>('/notifications', {
      params: unreadOnly ? { unreadOnly: true } : {},
    });
    return response.data;
  },

  getUnreadCount: async (): Promise<number> => {
    const response = await api.get<{ count: number }>('/notifications/unread-count');
    return response.data.count;
  },

  markAsRead: async (id: string): Promise<Notification> => {
    const response = await api.post<Notification>(`/notifications/${id}/read`);
    return response.data;
  },

  markAllAsRead: async (): Promise<void> => {
    await api.post('/notifications/mark-all-read');
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/notifications/${id}`);
  },
};
