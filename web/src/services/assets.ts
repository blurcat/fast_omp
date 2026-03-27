import request from '../utils/request';
import type { Resource, ResourceParams } from '../types';

export const getAssets = (params?: ResourceParams) => {
  return request.get<any, { items: Resource[]; total: number }>('/assets/', { params });
};

export const batchDeleteAssets = (ids: number[]) => {
  return Promise.all(ids.map(id => request.delete<any, any>(`/assets/${id}`)));
};

export const testAssetConnection = (id: number, port?: number) =>
  request.post<any, {
    success: boolean;
    host: string;
    port: number;
    method: string;
    credential_name?: string;
    output?: string;
    error?: string;
    warning?: string;
  }>(`/assets/${id}/test-connection`, port ? { port } : {});

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
