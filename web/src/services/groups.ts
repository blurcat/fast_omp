import request from '../utils/request';

export interface AssetGroup {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  resources?: any[];
}

export const getAssetGroups = (params?: any) => {
  return request.get<any, AssetGroup[]>('/asset-groups/', { params });
};

export const getAssetGroup = (id: number) => {
  return request.get<any, AssetGroup>(`/asset-groups/${id}`);
};

export const createAssetGroup = (data: Partial<AssetGroup>) => {
  return request.post<any, AssetGroup>('/asset-groups/', data);
};

export const updateAssetGroup = (id: number, data: Partial<AssetGroup>) => {
  return request.put<any, AssetGroup>(`/asset-groups/${id}`, data);
};

export const deleteAssetGroup = (id: number) => {
  return request.delete<any, any>(`/asset-groups/${id}`);
};

export const addAssetToGroup = (groupId: number, resourceId: number) => {
  return request.post<any, AssetGroup>(`/asset-groups/${groupId}/resources/${resourceId}`);
};

export const removeAssetFromGroup = (groupId: number, resourceId: number) => {
  return request.delete<any, AssetGroup>(`/asset-groups/${groupId}/resources/${resourceId}`);
};
