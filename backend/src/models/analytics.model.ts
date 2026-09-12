import { OverviewAnalytics, ProductsByCategory } from "../shared/types";

export { OverviewAnalytics, ProductsByCategory };

export interface RecentSignup {
  id: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
}

export interface AnalyticsQueryFilters {
  category_id?: string;
  model_type_id?: string;
}
