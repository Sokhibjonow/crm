import { apiRequest } from './api';
import type { OrderStatus } from './orders';

export interface DailyRevenuePoint {
  date: string; // YYYY-MM-DD
  revenue: string;
  payments: number;
}

export interface StatusBreakdownRow {
  status: OrderStatus;
  count: number;
  total: string;
}

export interface StaffRow {
  userId: string | null;
  name: string | null;
  email: string | null;
  orders: number;
  revenue: string;
}

export interface TopCustomerRow {
  id: string;
  name: string;
  phone: string | null;
  orders: number;
  total: string;
}

export interface ReportsSummary {
  days: number;
  rangeStart: string;
  rangeEnd: string;
  totalRevenue: string;
  daily: DailyRevenuePoint[];
  statusBreakdown: StatusBreakdownRow[];
  staff: StaffRow[];
  topCustomers: TopCustomerRow[];
}

export function getReportsSummary(days: number): Promise<ReportsSummary> {
  return apiRequest<ReportsSummary>(`/reports/summary?days=${days}`);
}
