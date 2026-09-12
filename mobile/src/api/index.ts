import * as adminApi from './admin';
import * as authApi from './auth';
import * as categoriesApi from './categories';
import { apiClient } from './client';
import * as favoritesApi from './favorites';
import * as modelTypesApi from './modelTypes';
import * as ordersApi from './orders';
import * as productsApi from './products';
import * as settingsApi from './settings';
import * as sizesApi from './sizes';

export const api = {
  admin: adminApi,
  auth: authApi,
  categories: categoriesApi,
  client: apiClient,
  favorites: favoritesApi,
  modelTypes: modelTypesApi,
  orders: ordersApi,
  products: productsApi,
  settings: settingsApi,
  sizes: sizesApi,
};

export * from './endpoints';
export * from './client';
export * from './config';
export * from './errorBus';
export * from './errors';

export default api;
