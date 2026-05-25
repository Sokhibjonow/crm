import { apiRequest } from './api';

export type StoreLocale = 'ru' | 'uz';

export interface Store {
  id: string;
  name: string;
  subscriptionPlan: 'STARTER' | 'PRO' | 'BUSINESS';
  currency: string;
  locale: StoreLocale;
  createdAt: string;
  updatedAt: string;
}

export interface StoreUpdateInput {
  name?: string;
  locale?: StoreLocale;
}

export function getStore(): Promise<Store> {
  return apiRequest<Store>('/stores/me');
}

export function updateStore(input: StoreUpdateInput): Promise<Store> {
  return apiRequest<Store>('/stores/me', { method: 'PATCH', body: input });
}
