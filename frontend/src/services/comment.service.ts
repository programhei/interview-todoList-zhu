import api from './api';

export interface Comment {
  id: string;
  content: string;
  taskId: string;
  userId: string;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface CreateCommentDto {
  content: string;
  taskId: string;
}

export const commentService = {
  getByTask: async (taskId: string): Promise<Comment[]> => {
    const response = await api.get<Comment[]>(`/comments/task/${taskId}`);
    return response.data;
  },

  create: async (data: CreateCommentDto): Promise<Comment> => {
    const response = await api.post<Comment>('/comments', data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/comments/${id}`);
  },
};
