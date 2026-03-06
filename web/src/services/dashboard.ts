import request from '../utils/request';

export const getDashboardStats = async () => {
  return request('/stats/summary', {
    method: 'GET',
  });
};
