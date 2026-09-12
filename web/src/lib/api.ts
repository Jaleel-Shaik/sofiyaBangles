import { adminApi } from './api/admin';
import { authApi } from './api/auth';
import { superAdminApi } from './api/super-admin';
import { apiClient } from './api/client';

export const api = {
  admin: adminApi,
  auth: authApi,
  superAdmin: superAdminApi,
  client: apiClient,
};

export * from './api/types';
export * from './api/endpoints';
export * from './api/client';
export * from './api/auth';
export * from './api/admin';
export * from './api/super-admin';

export default api;
