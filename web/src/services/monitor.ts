import request from '../utils/request';

export const getAlertChannels = (params?: any) =>
  request.get('/monitor/channels', { params });

export const createAlertChannel = (data: any) =>
  request.post('/monitor/channels', data);

export const updateAlertChannel = (id: number, data: any) =>
  request.put(`/monitor/channels/${id}`, data);

export const deleteAlertChannel = (id: number) =>
  request.delete(`/monitor/channels/${id}`);

export const getAlertRules = (params?: any) =>
  request.get('/monitor/rules', { params });

export const createAlertRule = (data: any) =>
  request.post('/monitor/rules', data);

export const updateAlertRule = (id: number, data: any) =>
  request.put(`/monitor/rules/${id}`, data);

export const deleteAlertRule = (id: number) =>
  request.delete(`/monitor/rules/${id}`);

export const getAlertEvents = (params?: any) =>
  request.get('/monitor/events', { params });

export const acknowledgeAlertEvent = (id: number) =>
  request.post(`/monitor/events/${id}/acknowledge`);

export const resolveAlertEvent = (id: number) =>
  request.post(`/monitor/events/${id}/resolve`);

export const getMetrics = (params?: any) =>
  request.get('/monitor/metrics', { params });

export const ingestMetric = (data: any) =>
  request.post('/monitor/metrics', data);

export const triggerEvaluation = () =>
  request.post('/monitor/metrics/evaluate');
