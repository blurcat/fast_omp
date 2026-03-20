import request from '../utils/request';

export const getCredentials = (params?: any) =>
  request.get('/credentials/', { params });

export const createCredential = (data: any) =>
  request.post('/credentials/', data);

export const updateCredential = (id: number, data: any) =>
  request.put(`/credentials/${id}`, data);

export const deleteCredential = (id: number) =>
  request.delete(`/credentials/${id}`);
