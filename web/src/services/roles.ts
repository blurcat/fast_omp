import request from '../utils/request';

export const getRoles = async (params?: any) => {
  return request('/roles/', {
    method: 'GET',
    params,
  });
};

export const createRole = async (data: any) => {
  return request('/roles/', {
    method: 'POST',
    data,
  });
};

export const updateRole = async (id: number, data: any) => {
  return request(`/roles/${id}`, {
    method: 'PUT',
    data,
  });
};

export const deleteRole = async (id: number) => {
  return request(`/roles/${id}`, {
    method: 'DELETE',
  });
};
