import request from '../utils/request';

export const getInspectionTemplates = (params?: any) =>
  request.get('/inspections/templates/', { params });

export const createInspectionTemplate = (data: any) =>
  request.post('/inspections/templates/', data);

export const updateInspectionTemplate = (id: number, data: any) =>
  request.put(`/inspections/templates/${id}`, data);

export const deleteInspectionTemplate = (id: number) =>
  request.delete(`/inspections/templates/${id}`);

export const getInspectionTasks = (params?: any) =>
  request.get('/inspections/tasks/', { params });

export const createInspectionTask = (data: any) =>
  request.post('/inspections/tasks/', data);

export const runInspectionTask = (id: number) =>
  request.post(`/inspections/tasks/${id}/run`);

export const deleteInspectionTask = (id: number) =>
  request.delete(`/inspections/tasks/${id}`);
