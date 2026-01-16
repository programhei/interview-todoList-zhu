import api from './api';

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export const userService = {
  getList: async (): Promise<User[]> => {
    const response = await api.get<User[]>('/users/list');
    return response.data;
  },

  getProfile: async (): Promise<User> => {
    const response = await api.get<User>('/users/profile');
    return response.data;
  },
};
