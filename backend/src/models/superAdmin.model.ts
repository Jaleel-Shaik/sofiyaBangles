import { PlatformCommissionSettings } from "./revenueLedger.model";
import { Product } from "./product.model";

export { PlatformCommissionSettings, Product };

/**
 * Pure Model Layer: SuperAdmin Dashboard & Analytics Interfaces.
 * This file contains strictly data schemas and types.
 * NO database calls are made here.
 */

export interface SalesAnalyticsQuery {
  period?: "today" | "yesterday" | "7d" | "30d" | "this_month" | "last_month" | "this_year" | "custom";
  fromDate?: string;
  toDate?: string;
  categoryId?: string;
  modelTypeId?: string;
  adminId?: string;
}

export interface SuperAdminKpiMetrics {
  totalProducts: number;
  activeProducts: number;
  productsSold: number;
  unitsSold: number;
  grossSales: number;
  netSales: number;
  totalRefunds: number;
  adminEarnings: number;
  superAdminEarnings: number;
  pendingOrders: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export interface SalesTrendDataPoint {
  date: string;
  grossSales: number;
  adminEarnings: number;
  superAdminEarnings: number;
  unitsSold: number;
  orderCount: number;
  gross_sales?: number;
  net_sales?: number;
  super_admin_share?: number;
  admin_share?: number;
  orders_count?: number;
}

export interface TopSellingProduct {
  product_id: string;
  product_name: string;
  category_name: string;
  image_url: string | null;
  units_sold: number;
  gross_revenue: number;
  super_admin_share: number;
  stock: number;
}

export interface CategoryPerformanceItem {
  category_id: string;
  category_name: string;
  units_sold: number;
  gross_revenue: number;
  super_admin_share: number;
}

export interface RecentSalesOrder {
  order_id: string;
  order_number: string;
  customer_name: string;
  created_at: string;
  items_count: number;
  total_amount: number;
  super_admin_share: number;
  admin_share: number;
  status: string;
}

export interface RecentAdminActivityItem {
  id: string;
  actor_id: string;
  actor_name: string;
  action: string;
  details: string;
  created_at: string;
}

export interface SuperAdminDashboardData {
  kpis: SuperAdminKpiMetrics;
  commission: PlatformCommissionSettings;
  salesTrend: SalesTrendDataPoint[];
  topSellingProducts: TopSellingProduct[];
  categoryPerformance: CategoryPerformanceItem[];
  recentSales: RecentSalesOrder[];
  recentActivity: RecentAdminActivityItem[];
}

export interface ProductAnalyticsDetail {
  product: Product;
  metrics: {
    units_sold: number;
    orders_count: number;
    gross_revenue: number;
    admin_share: number;
    super_admin_share: number;
    first_sale_date: string | null;
    last_sale_date: string | null;
    current_stock: number;
  };
  salesHistory: Array<{
    order_id: string;
    order_number: string;
    sale_date: string;
    quantity: number;
    unit_price: number;
    total_amount: number;
    admin_share: number;
    super_admin_share: number;
  }>;
  stockHistory: Array<{
    id: string;
    action: string;
    quantity_change: number;
    new_quantity: number;
    actor_id: string;
    created_at: string;
  }>;
}
