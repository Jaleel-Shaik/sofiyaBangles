import { apiClient } from './client';

export interface BusinessProfile {
  store_name: string;
  description: string;
  business_hours: string;
  address: string;
  whatsapp_number: string;
  email: string;
  phone_number: string;
  updated_at?: string;
}

export const getBusinessProfile = async (): Promise<BusinessProfile> => {
  const response = await apiClient.get('/settings/business-profile');
  return response.data.data;
};

export const updateBusinessProfile = async (data: Partial<BusinessProfile>): Promise<BusinessProfile> => {
  const response = await apiClient.put('/settings/business-profile', data);
  return response.data.data;
};
