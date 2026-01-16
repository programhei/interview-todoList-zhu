import api from './api';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done';
  parentTaskId?: string;
  creatorId: string;
  assigneeId?: string;
  teamId?: string;
  plannedFinishTime?: string;
  repeatType?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  repeatInterval?: number;
  repeatEndDate?: string;
  nextRepeatDate?: string;
  originalTaskId?: string;
  createdAt: string;
  updatedAt: string;
  creator?: any;
  assignee?: any;
  watchers?: any[];
  subTasks?: Task[];
  parentTask?: Task;
}

export interface CreateTaskDto {
  title: string;
  description?: string;
  status?: 'todo' | 'in_progress' | 'done';
  parentTaskId?: string;
  assigneeId?: string;
  teamId?: string;
  plannedFinishTime?: string;
  repeatType?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  repeatInterval?: number;
  repeatEndDate?: string;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  status?: 'todo' | 'in_progress' | 'done';
  assigneeId?: string;
  plannedFinishTime?: string;
}

export interface QueryTaskDto {
  startTime?: string;
  endTime?: string;
  creatorId?: string;
  assigneeId?: string;
  orderBy?: 'createdAt' | 'plannedFinishTime' | 'creatorId' | 'id';
  orderDirection?: 'ASC' | 'DESC';
}

export const taskService = {
  getAll: async (query?: QueryTaskDto): Promise<Task[]> => {
    const response = await api.get<Task[]>('/tasks', { params: query });
    return response.data;
  },

  getById: async (id: string): Promise<Task> => {
    const response = await api.get<Task>(`/tasks/${id}`);
    return response.data;
  },

  create: async (data: CreateTaskDto): Promise<Task> => {
    const response = await api.post<Task>('/tasks', data);
    return response.data;
  },

  update: async (id: string, data: UpdateTaskDto): Promise<Task> => {
    const response = await api.patch<Task>(`/tasks/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/tasks/${id}`);
  },

  assign: async (id: string, assigneeId: string): Promise<Task> => {
    const response = await api.post<Task>(`/tasks/${id}/assign`, { assigneeId });
    return response.data;
  },

  addWatcher: async (id: string, watcherId: string): Promise<Task> => {
    const response = await api.post<Task>(`/tasks/${id}/watchers`, { watcherId });
    return response.data;
  },

  removeWatcher: async (id: string, watcherId: string): Promise<Task> => {
    const response = await api.delete<Task>(`/tasks/${id}/watchers/${watcherId}`);
    return response.data;
  },
};
