import request from '../utils/request';

export interface ResourcePermission {
  id: number;
  user_id: number;
  resource_id?: number;
  group_id?: number;
  permission: 'read' | 'write';
  created_at: string;
  updated_at: string;
}

export const getPermissions = (params?: { user_id?: number, skip?: number, limit?: number }) => {
  return request.get<any, ResourcePermission[]>('/permissions/', { params });
};

export const grantPermission = (data: {
  user_id: number;
  resource_id?: number;
  group_id?: number;
  permission: 'read' | 'write';
}) => {
  return request.post<any, ResourcePermission>('/permissions/', data);
};

export const revokePermission = (id: number) => {
  return request.delete<any, any>(`/permissions/${id}`);
};
