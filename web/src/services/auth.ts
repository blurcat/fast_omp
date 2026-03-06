import request from '../utils/request';
import type { LoginParams, LoginResult, User } from '../types';

export const login = (data: LoginParams) => {
  // Convert JSON body to x-www-form-urlencoded for OAuth2
  const formData = new URLSearchParams();
  formData.append('username', data.username);
  formData.append('password', data.password);

  return request.post<any, LoginResult>('/auth/login', formData, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
};

export const getUserProfile = () => {
  return request.get<any, User>('/users/me');
};
