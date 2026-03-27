import request from '../utils/request';

export interface AssetType {
  id: number;
  name: string;
  value: string;
  description?: string;
  is_builtin: boolean;
  created_at: string;
  updated_at: string;
}

export const getAssetTypes = (params?: { name?: string }) =>
  request.get<any, AssetType[]>('/asset-types/', { params });

export const createAssetType = (data: { name: string; value: string; description?: string }) =>
  request.post<any, AssetType>('/asset-types/', data);

export const updateAssetType = (id: number, data: { name?: string; description?: string }) =>
  request.put<any, AssetType>(`/asset-types/${id}`, data);

export const deleteAssetType = (id: number) =>
  request.delete<any, any>(`/asset-types/${id}`);
