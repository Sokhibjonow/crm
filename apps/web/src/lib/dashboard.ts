import { apiRequest } from './api';
import type { OrderStatus, PaymentStatus } from './orders';

export interface DashboardRecentOrder {
  id: string;
  number: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  total: string;
  createdAt: string;
  customer: { id: string; name: string } | null;
}

export interface DashboardTopProduct {
  id: string;
  name: string;
  sku: string | null;
  qty: number;
  revenue: string;
}

export interface DashboardSummary {
  ordersToday: number;
  revenueToday: string;
  pendingOrders: number;
  lowStockProducts: number;
  recentOrders: DashboardRecentOrder[];
  topProducts: DashboardTopProduct[];
}

export function getDashboardSummary(): Promise<DashboardSummary> {
  return apiRequest<DashboardSummary>('/dashboard/summary');
}
