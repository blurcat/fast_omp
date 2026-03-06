import request from '../utils/request';
import type { User } from '../types';

export interface UserParams {
  skip?: number;
  limit?: number;
}

export const getUsers = (params?: UserParams) => {
  return request.get<any, User[]>('/users/', { params });
};

export const createUser = (data: Partial<User> & { password?: string }) => {
  return request.post<any, User>('/users/', data);
};

export const updateUser = (id: number, data: Partial<User> & { password?: string }) => {
  return request.put<any, User>(`/users/${id}`, data);
};

export const deleteUser = (id: number) => {
  return request.delete<any, any>(`/users/${id}`);
};
