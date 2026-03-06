import request from '../utils/request';
import type { AuditLog } from '../types';

export const getAuditLogs = (params?: {
  current?: number;
  pageSize?: number;
  username?: string;
  action?: string;
  target_type?: string;
  ip_address?: string;
}) => {
  const { current = 1, pageSize = 20, ...rest } = params || {};
  return request.get<any, AuditLog[]>('/audit/logs', {
    params: {
      skip: (current - 1) * pageSize,
      limit: pageSize,
      ...rest,
    },
  });
};
