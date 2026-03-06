import request from '../utils/request';
import type { Resource, ResourceParams } from '../types';

export const getAssets = (params?: ResourceParams) => {
  return request.get<any, Resource[]>('/assets/', { params });
};

export const createAsset = (data: Partial<Resource>) => {
  return request.post<any, Resource>('/assets/', data);
};

export const updateAsset = (id: number, data: Partial<Resource>) => {
  return request.put<any, Resource>(`/assets/${id}`, data);
};

export const deleteAsset = (id: number) => {
  return request.delete<any, any>(`/assets/${id}`);
};

export const getAssetStats = async () => {
  return request('/stats/summary', {
    method: 'GET',
  });
};
