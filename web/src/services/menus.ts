import request from '../utils/request';

export interface Menu {
  id: number;
  title: string;
  icon?: string;
  path?: string;
  order: number;
  parent_id?: number | null;
  children?: Menu[];
  created_at?: string;
  updated_at?: string;
}

export const getMenus = () => {
  return request.get<any, Menu[]>('/menus/');
};

export const createMenu = (data: Partial<Menu>) => {
  return request.post<any, Menu>('/menus/', data);
};

export const updateMenu = (id: number, data: Partial<Menu>) => {
  return request.put<any, Menu>(`/menus/${id}`, data);
};

export const deleteMenu = (id: number) => {
  return request.delete<any, any>(`/menus/${id}`);
};
