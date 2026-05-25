import { apiRequest } from './api';

export interface Customer {
  id: string;
  storeId: string;
  name: string;
  phone: string | null;
  telegram: string | null;
  notes: string | null;
  tags: string[];
  totalSpent: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerListResult {
  items: Customer[];
  total: number;
  page: number;
  take: number;
}

export interface CustomerInput {
  name: string;
  phone?: string;
  telegram?: string;
  notes?: string;
  tags?: string[];
}

export interface ListCustomersParams {
  q?: string;
  page?: number;
  take?: number;
}

export function listCustomers(params: ListCustomersParams = {}): Promise<CustomerListResult> {
  const search = new URLSearchParams();
  if (params.q) search.set('q', params.q);
  if (params.page) search.set('page', String(params.page));
  if (params.take) search.set('take', String(params.take));
  const qs = search.toString();
  return apiRequest<CustomerListResult>(`/customers${qs ? `?${qs}` : ''}`);
}

export function getCustomer(id: string): Promise<Customer> {
  return apiRequest<Customer>(`/customers/${id}`);
}

export function createCustomer(input: CustomerInput): Promise<Customer> {
  return apiRequest<Customer>('/customers', { method: 'POST', body: input });
}

export function updateCustomer(id: string, input: CustomerInput): Promise<Customer> {
  return apiRequest<Customer>(`/customers/${id}`, { method: 'PATCH', body: input });
}

export function deleteCustomer(id: string): Promise<void> {
  return apiRequest<void>(`/customers/${id}`, { method: 'DELETE' });
}
