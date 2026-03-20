import request from '../utils/request';

export const getChanges = (params?: any) =>
  request.get('/changes/', { params });

export const createChange = (data: any) =>
  request.post('/changes/', data);

export const updateChange = (id: number, data: any) =>
  request.put(`/changes/${id}`, data);

export const deleteChange = (id: number) =>
  request.delete(`/changes/${id}`);

export const submitChange = (id: number) =>
  request.post(`/changes/${id}/submit`);

export const approveChange = (id: number) =>
  request.post(`/changes/${id}/approve`);

export const rejectChange = (id: number, notes: string) =>
  request.post(`/changes/${id}/reject`, null, { params: { notes } });
