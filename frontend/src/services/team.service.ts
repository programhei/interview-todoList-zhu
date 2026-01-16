import api from './api';

export interface Team {
  id: string;
  name: string;
  description?: string;
  creatorId: string;
  createdAt: string;
  updatedAt: string;
  creator?: any;
  members?: Array<{
    id: string;
    userId: string;
    user: any;
  }>;
}

export interface CreateTeamDto {
  name: string;
  description?: string;
}

export const teamService = {
  getAll: async (): Promise<Team[]> => {
    const response = await api.get<Team[]>('/teams');
    return response.data;
  },

  getById: async (id: string): Promise<Team> => {
    const response = await api.get<Team>(`/teams/${id}`);
    return response.data;
  },

  create: async (data: CreateTeamDto): Promise<Team> => {
    const response = await api.post<Team>('/teams', data);
    return response.data;
  },

  update: async (id: string, data: Partial<CreateTeamDto>): Promise<Team> => {
    const response = await api.patch<Team>(`/teams/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/teams/${id}`);
  },

  addMember: async (id: string, memberId: string): Promise<Team> => {
    const response = await api.post<Team>(`/teams/${id}/members`, { memberId });
    return response.data;
  },

  removeMember: async (id: string, memberId: string): Promise<Team> => {
    const response = await api.delete<Team>(`/teams/${id}/members/${memberId}`);
    return response.data;
  },

  getMembers: async (id: string): Promise<Array<{ id: string; name: string; email: string }>> => {
    const response = await api.get<Array<{ id: string; name: string; email: string }>>(`/teams/${id}/members`);
    return response.data;
  },
};
