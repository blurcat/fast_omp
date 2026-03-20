import request from '../utils/request';

export const getJobTemplates = (params?: any) =>
  request.get('/jobs/templates/', { params });

export const createJobTemplate = (data: any) =>
  request.post('/jobs/templates/', data);

export const updateJobTemplate = (id: number, data: any) =>
  request.put(`/jobs/templates/${id}`, data);

export const deleteJobTemplate = (id: number) =>
  request.delete(`/jobs/templates/${id}`);

export const getJobExecutions = (params?: any) =>
  request.get('/jobs/executions/', { params });

export const createJobExecution = (data: any) =>
  request.post('/jobs/executions/', data);

export const getJobExecution = (id: number) =>
  request.get(`/jobs/executions/${id}`);
