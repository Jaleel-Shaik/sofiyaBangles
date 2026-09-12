import { adminApi } from './admin';
import { authApi } from './auth';
import { superAdminApi } from './super-admin';
import { apiClient } from './client';

export const api = {
  admin: adminApi,
  auth: authApi,
  superAdmin: superAdminApi,
  client: apiClient,
};

export * from './types';
export default api;
