import { API_ENDPOINTS } from "./endpoints";
import { apiClient } from './client';

export interface BusinessProfile {
  store_name: string;
  description: string;
  business_hours: string;
  address: string;
  whatsapp_number: string;
  email: string;
  phone_number: string;
  logo_url?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  updated_at?: string;
}

export const getBusinessProfile = async (): Promise<BusinessProfile> => {
  const response = await apiClient.get(API_ENDPOINTS.SETTINGS.BUSINESS_PROFILE);
  return response.data.data;
};

export const updateBusinessProfile = async (data: Partial<BusinessProfile>): Promise<BusinessProfile> => {
  const response = await apiClient.put(API_ENDPOINTS.SETTINGS.BUSINESS_PROFILE, data);
  return response.data.data;
};
